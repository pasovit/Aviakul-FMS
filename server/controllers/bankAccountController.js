const BankAccount = require("../models/BankAccount");
const Entity = require("../models/Entity");
const { logAction } = require("../middleware/audit");

// @desc    Get all bank accounts with filters
// @route   GET /api/bank-accounts
// @access  Private
exports.getBankAccounts = async (req, res, next) => {
  try {
    const { entity, accountType, search } = req.query;

    // Build query based on user role
    let query = { isActive: true };

    // Entity-scoped access for non-admin users
    if (req.user.role === "employee" || req.user.role === "observer") {
      if (req.user.assignedEntities && req.user.assignedEntities.length > 0) {
        query.entity = { $in: req.user.assignedEntities };
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    // Apply filters
    if (entity) {
      query.entity = entity;
    }

    if (accountType) {
      query.accountType = accountType;
    }

    // Search by account name or account number
    if (search) {
      query.$or = [
        { accountName: { $regex: search, $options: "i" } },
        { accountNumber: { $regex: search, $options: "i" } },
        { bankName: { $regex: search, $options: "i" } },
      ];
    }

    const bankAccounts = await BankAccount.find(query)
      .populate("entity", "name type")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")
      .sort({ accountName: 1 });

    res.status(200).json({
      success: true,
      count: bankAccounts.length,
      data: bankAccounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bank account
// @route   GET /api/bank-accounts/:id
// @access  Private
exports.getBankAccount = async (req, res, next) => {
  try {
    const bankAccount = await BankAccount.findById(req.params.id)
      .populate("entity", "name type pan gstin")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName");

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    // Check entity access
    if (req.user.role === "employee" || req.user.role === "observer") {
      if (
        !req.user.assignedEntities.includes(bankAccount.entity._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this entity",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: bankAccount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new bank account
// @route   POST /api/bank-accounts
// @access  Private (Admin+)
exports.createBankAccount = async (req, res, next) => {
  try {
    const {
      entity:Entity,
      accountName,
      accountType,
      accountNumber,
      bankName,
      ifscCode,
      openingBalance,
      openingBalanceDate,
    } = req.body;

    // Basic required fields
    if (!Entity || !accountName || !accountType) {
      return res.status(400).json({
        success: false,
        message: "Entity, account name and account type are required",
      });
    }

    // Opening balance validation
    if (openingBalance === undefined || openingBalance === null) {
      return res.status(400).json({
        success: false,
        message: "Opening balance is required",
      });
    }

    // If not cash, validate bank fields
    if (accountType !== "cash") {
      if (!accountNumber || !bankName || !ifscCode) {
        return res.status(400).json({
          success: false,
          message:
            "Account number, bank name and IFSC code are required for bank accounts",
        });
      }
    }

    // Check if entity exists
    const entity = await Entity.findById(req.body.entity);
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: "Entity not found",
      });
    }

    // Check for duplicate account number (if not cash)
    if (req.body.accountType !== "cash" && req.body.accountNumber) {
      const existingAccount = await BankAccount.findOne({
        accountNumber: req.body.accountNumber,
        ifscCode: req.body.ifscCode,
      });

      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message:
            "Bank account with this account number and IFSC already exists",
        });
      }
    }

    // Set createdBy
    req.body.createdBy = req.user._id;

    const bankAccount = await BankAccount.create(req.body);

    // Populate before returning
    await bankAccount.populate("entity", "name type");
    await bankAccount.populate("createdBy", "firstName lastName");

    // Log action
    await logAction({
      user: req.user._id,
      action: "create",
      resource: "BankAccount",
      resourceId: bankAccount._id,
      entity: bankAccount.entity._id,
      changes: { after: bankAccount },
      req,
    });

    res.status(201).json({
      success: true,
      data: bankAccount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bank account
// @route   PUT /api/bank-accounts/:id
// @access  Private (Admin+)
exports.updateBankAccount = async (req, res, next) => {
  try {
    const bankAccount = await BankAccount.findById(req.params.id);

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    const oldValues = bankAccount.toObject();

    //Prevent changing entity
    if (req.body.entity && req.body.entity.toString() !== bankAccount.entity.toString()) {
      return res.status(400).json({
        success: false,
        message: "Entity cannot be changed once created",
      });
    }

    //Prevent direct currentBalance update
    delete req.body.currentBalance;

    // Validate accountType logic
    const accountType = req.body.accountType || bankAccount.accountType;

    if (accountType !== "cash") {
      const accountNumber = req.body.accountNumber ?? bankAccount.accountNumber;
      const bankName = req.body.bankName ?? bankAccount.bankName;
      const ifscCode = req.body.ifscCode ?? bankAccount.ifscCode;

      if (!accountNumber || !bankName || !ifscCode) {
        return res.status(400).json({
          success: false,
          message:
            "Account number, bank name and IFSC code are required for non-cash accounts",
        });
      }
    } else {
      // If converting to cash → clear bank fields
      req.body.accountNumber = undefined;
      req.body.bankName = undefined;
      req.body.ifscCode = undefined;
    }

    // Prevent negative opening balance
    if (req.body.openingBalance !== undefined && req.body.openingBalance < 0) {
      return res.status(400).json({
        success: false,
        message: "Opening balance cannot be negative",
      });
    }

    req.body.updatedBy = req.user._id;

    const updated = await BankAccount.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("entity", "name type")
      .populate("updatedBy", "firstName lastName");

    await logAction({
      user: req.user._id,
      action: "update",
      resource: "BankAccount",
      resourceId: updated._id,
      entity: updated.entity._id,
      changes: { before: oldValues, after: updated },
      req,
    });

    res.status(200).json({
      success: true,
      data: updated,
    });

  } catch (error) {
    next(error);
  }
};


// @desc    Delete bank account (soft delete)
// @route   DELETE /api/bank-accounts/:id
// @access  Private (Admin+)
exports.deleteBankAccount = async (req, res, next) => {
  try {
    const bankAccount = await BankAccount.findById(req.params.id);

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    // Check if account has transactions
    // In Phase 2, we'll add this check with Transaction model

    // Soft delete
    bankAccount.isActive = false;
    bankAccount.updatedBy = req.user._id;
    await bankAccount.save();

    // Log action
    await logAction({
      user: req.user._id,
      action: "delete",
      resource: "BankAccount",
      resourceId: bankAccount._id,
      entity: bankAccount.entity,
      changes: { before: bankAccount },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Bank account deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get account balances summary
// @route   GET /api/bank-accounts/summary/balances
// @access  Private
exports.getBalanceSummary = async (req, res, next) => {
  try {
    const { entity } = req.query;

    // Build match criteria based on role
    let matchCriteria = { isActive: true };

    if (req.user.role === "employee" || req.user.role === "observer") {
      if (req.user.assignedEntities && req.user.assignedEntities.length > 0) {
        matchCriteria.entity = { $in: req.user.assignedEntities };
      } else {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
    }

    if (entity) {
      matchCriteria.entity = entity;
    }

    const summary = await BankAccount.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            entity: "$entity",
            currency: "$currency",
          },
          totalBalance: { $sum: "$currentBalance" },
          accountCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "entities",
          localField: "_id.entity",
          foreignField: "_id",
          as: "entityInfo",
        },
      },
      {
        $unwind: "$entityInfo",
      },
      {
        $project: {
          entity: {
            _id: "$entityInfo._id",
            name: "$entityInfo.name",
            type: "$entityInfo.type",
          },
          currency: "$_id.currency",
          totalBalance: 1,
          accountCount: 1,
        },
      },
      {
        $sort: { "entity.name": 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
