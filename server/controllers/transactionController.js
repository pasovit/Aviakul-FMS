const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const BankAccount = require("../models/BankAccount");
const Entity = require("../models/Entity");
const { logAction } = require("../middleware/audit");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");

// @desc    Get all transactions with filters
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const {
      entity,
      bankAccount,
      type,
      category,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = "transactionDate",
      sortOrder = "desc",
    } = req.query;

    // Build query based on user role
    let query = {};

    // Entity-scoped access for non-admin users
    if (req.user.role === "employee" || req.user.role === "observer") {
      if (req.user.assignedEntities && req.user.assignedEntities.length > 0) {
        query.entity = { $in: req.user.assignedEntities };
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          pagination: {},
          data: [],
        });
      }
    }

    // Apply filters
    if (entity) query.entity = entity;
    if (bankAccount) query.bankAccount = bankAccount;
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    // Search in party name, invoice number, reference number
    if (search) {
      query.$or = [
        { partyName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
        { referenceNumber: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Count total documents
    const total = await Transaction.countDocuments(query);

    // Execute query with pagination
    const transactions = await Transaction.find(query)
      .populate("entity", "name type")
      .populate("bankAccount", "accountName accountNumber bankName")
      .populate("transferToAccount", "accountName accountNumber bankName")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")
      .populate("category", "name")
      .populate("subCategory", "name")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limitNum);

    // Pagination info
    const pagination = {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalRecords: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1,
    };

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("entity", "name type pan gstin")
      .populate("bankAccount", "accountName accountNumber bankName ifscCode")
      .populate("transferToAccount", "accountName accountNumber bankName")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email")
      .populate("reconciledBy", "firstName lastName");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Check entity access
    if (req.user.role === "employee" || req.user.role === "observer") {
      if (
        !req.user.assignedEntities.includes(transaction.entity._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this entity",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private (Admin+)
exports.createTransaction = async (req, res, next) => {
  try {
    const {
      entity,
      bankAccount,
      type,
      status,
      totalAmount,
      transferToAccount,
    } = req.body;

    if (!entity || !bankAccount || !type || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(entity)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bankAccount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bank account ID",
      });
    }

    const entityDoc = await Entity.findById(entity);
    if (!entityDoc) {
      return res.status(404).json({
        success: false,
        message: "Entity not found",
      });
    }

    const bankAccountDoc = await BankAccount.findById(bankAccount);
    if (!bankAccountDoc) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    if (bankAccountDoc.entity.toString() !== entity) {
      return res.status(400).json({
        success: false,
        message: "Bank account does not belong to this entity",
      });
    }

    if (type === "transfer") {
      if (!transferToAccount) {
        return res.status(400).json({
          success: false,
          message: "Transfer account is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(transferToAccount)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transfer account ID",
        });
      }

      const transferAccountDoc = await BankAccount.findById(transferToAccount);

      if (!transferAccountDoc) {
        return res.status(404).json({
          success: false,
          message: "Transfer account not found",
        });
      }
    }

    ["subCategory", "transferToAccount"].forEach((field) => {
      if (
        !req.body[field] ||
        req.body[field] === "" ||
        !mongoose.Types.ObjectId.isValid(req.body[field])
      ) {
        delete req.body[field];
      }
    });

    if (Number(totalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total amount must be greater than 0",
      });
    }

    req.body.createdBy = req.user._id;

    const transaction = await Transaction.create(req.body);

    if (status === "paid" || status === "reconciled") {
      const amountChange =
        type === "income" ? transaction.totalAmount : -transaction.totalAmount;

      await bankAccountDoc.updateBalance(amountChange);

      if (type === "transfer" && req.body.transferToAccount) {
        const transferAccountDoc = await BankAccount.findById(
          req.body.transferToAccount,
        );

        await transferAccountDoc.updateBalance(transaction.totalAmount);
      }
    }

    await transaction.populate("entity", "name type");
    await transaction.populate("bankAccount", "accountName accountNumber");
    await transaction.populate("createdBy", "firstName lastName");

    await logAction({
      user: req.user._id,
      action: "create",
      resource: "Transaction",
      resourceId: transaction._id,
      entity: transaction.entity._id,
      changes: { after: transaction },
      req,
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private (Admin+)
exports.updateTransaction = async (req, res, next) => {
  try {
    let transaction = await Transaction.findById(req.params.id)
      .populate("bankAccount")
      .populate("transferToAccount");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Store old values for audit
    const oldValues = transaction.toObject();
    const oldStatus = transaction.status;
    const oldAmount = transaction.totalAmount;
    const oldType = transaction.type;

    // If status is changing to/from paid/reconciled, update balances
    const newStatus = req.body.status || transaction.status;
    const newAmount = req.body.totalAmount || transaction.totalAmount;
    const newType = req.body.type || transaction.type;

    // Reverse old balance effect if status was paid/reconciled
    if (oldStatus === "paid" || oldStatus === "reconciled") {
      const reverseAmount = oldType === "income" ? -oldAmount : oldAmount;
      await transaction.bankAccount.updateBalance(reverseAmount);

      if (oldType === "transfer" && transaction.transferToAccount) {
        await transaction.transferToAccount.updateBalance(-oldAmount);
      }
    }

    // Update transaction
    req.body.updatedBy = req.user._id;

    transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("entity", "name type")
      .populate("bankAccount", "accountName accountNumber")
      .populate("transferToAccount", "accountName accountNumber")
      .populate("updatedBy", "firstName lastName");

    // Apply new balance effect if status is paid/reconciled
    if (newStatus === "paid" || newStatus === "reconciled") {
      const bankAccount = await BankAccount.findById(
        transaction.bankAccount._id,
      );
      const amountChange = newType === "income" ? newAmount : -newAmount;
      await bankAccount.updateBalance(amountChange);

      if (newType === "transfer" && transaction.transferToAccount) {
        const transferAccount = await BankAccount.findById(
          transaction.transferToAccount._id,
        );
        await transferAccount.updateBalance(newAmount);
      }
    }

    // Log action
    await logAction({
      user: req.user._id,
      action: "update",
      resource: "Transaction",
      resourceId: transaction._id,
      entity: transaction.entity._id,
      changes: { before: oldValues, after: transaction },
      req,
    });

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private (Admin+)
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("bankAccount")
      .populate("transferToAccount");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Reverse balance if transaction was paid/reconciled
    if (transaction.status === "paid" || transaction.status === "reconciled") {
      const reverseAmount =
        transaction.type === "income"
          ? -transaction.totalAmount
          : transaction.totalAmount;

      await transaction.bankAccount.updateBalance(reverseAmount);

      if (transaction.type === "transfer" && transaction.transferToAccount) {
        await transaction.transferToAccount.updateBalance(
          -transaction.totalAmount,
        );
      }
    }

    // Delete the transaction
    await transaction.deleteOne();

    // Log action
    await logAction({
      user: req.user._id,
      action: "delete",
      resource: "Transaction",
      resourceId: transaction._id,
      entity: transaction.entity,
      changes: { before: transaction },
      req,
    });

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update transaction status (mark paid/cancel)
// @route   POST /api/transactions/bulk-update
// @access  Private (Admin+)
exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const { transactionIds, status } = req.body;

    if (
      !transactionIds ||
      !Array.isArray(transactionIds) ||
      transactionIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction IDs array is required",
      });
    }

    if (!["paid", "cancelled", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updatedTransactions = [];
    const errors = [];

    for (const id of transactionIds) {
      try {
        const transaction = await Transaction.findById(id).populate(
          "bankAccount transferToAccount",
        );

        if (!transaction) {
          errors.push({ id, error: "Transaction not found" });
          continue;
        }

        const oldStatus = transaction.status;

        // Reverse old balance effect
        if (oldStatus === "paid" || oldStatus === "reconciled") {
          const reverseAmount =
            transaction.type === "income"
              ? -transaction.totalAmount
              : transaction.totalAmount;
          await transaction.bankAccount.updateBalance(reverseAmount);

          if (
            transaction.type === "transfer" &&
            transaction.transferToAccount
          ) {
            await transaction.transferToAccount.updateBalance(
              -transaction.totalAmount,
            );
          }
        }

        // Update status
        transaction.status = status;
        transaction.updatedBy = req.user._id;
        await transaction.save();

        // Apply new balance effect if paid
        if (status === "paid") {
          const amountChange =
            transaction.type === "income"
              ? transaction.totalAmount
              : -transaction.totalAmount;
          await transaction.bankAccount.updateBalance(amountChange);

          if (
            transaction.type === "transfer" &&
            transaction.transferToAccount
          ) {
            await transaction.transferToAccount.updateBalance(
              transaction.totalAmount,
            );
          }
        }

        updatedTransactions.push(transaction);

        // Log action
        await logAction({
          user: req.user._id,
          action: "bulk_update",
          resource: "Transaction",
          resourceId: transaction._id,
          entity: transaction.entity,
          changes: { before: { status: oldStatus }, after: { status } },
          req,
        });
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated ${updatedTransactions.length} transactions`,
      updated: updatedTransactions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export transactions to Excel
// @route   GET /api/transactions/export
// @access  Private
exports.exportToExcel = async (req, res, next) => {
  try {
    const { entity, startDate, endDate, type, status } = req.query;

    // Build query
    let query = {};

    if (req.user.role === "employee" || req.user.role === "observer") {
      if (req.user.assignedEntities && req.user.assignedEntities.length > 0) {
        query.entity = { $in: req.user.assignedEntities };
      } else {
        return res.status(400).json({
          success: false,
          message: "No entities assigned",
        });
      }
    }

    if (entity) query.entity = entity;
    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .populate("entity", "name")
      .populate("bankAccount", "accountName accountNumber")
      .sort({ transactionDate: -1 });

    // Prepare data for Excel
    const excelData = transactions.map((t) => ({
      Date: t.transactionDate.toISOString().split("T")[0],
      Entity: t.entity.name,
      "Bank Account": t.bankAccount.accountName,
      Type: t.type.toUpperCase(),
      Category: t.category,
      "Party Name": t.partyName,
      "Party PAN": t.partyPAN || "",
      "Party GSTIN": t.partyGSTIN || "",
      Amount: t.amount,
      CGST: t.gstDetails.cgst,
      SGST: t.gstDetails.sgst,
      IGST: t.gstDetails.igst,
      "Total GST": t.gstDetails.totalGST,
      "TDS Section": t.tdsDetails.section || "",
      "TDS Rate": t.tdsDetails.rate,
      "TDS Amount": t.tdsDetails.amount,
      "Total Amount": t.totalAmount,
      "Payment Method": t.paymentMethod.toUpperCase(),
      "Reference Number": t.referenceNumber || "",
      "Invoice Number": t.invoiceNumber || "",
      "Invoice Date": t.invoiceDate
        ? t.invoiceDate.toISOString().split("T")[0]
        : "",
      Status: t.status.toUpperCase(),
      Notes: t.notes || "",
    }));

    // Create workbook and worksheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Entity
      { wch: 20 }, // Bank Account
      { wch: 10 }, // Type
      { wch: 15 }, // Category
      { wch: 25 }, // Party Name
      { wch: 12 }, // Party PAN
      { wch: 18 }, // Party GSTIN
      { wch: 12 }, // Amount
      { wch: 10 }, // CGST
      { wch: 10 }, // SGST
      { wch: 10 }, // IGST
      { wch: 12 }, // Total GST
      { wch: 12 }, // TDS Section
      { wch: 10 }, // TDS Rate
      { wch: 12 }, // TDS Amount
      { wch: 12 }, // Total Amount
      { wch: 15 }, // Payment Method
      { wch: 20 }, // Reference Number
      { wch: 20 }, // Invoice Number
      { wch: 12 }, // Invoice Date
      { wch: 12 }, // Status
      { wch: 30 }, // Notes
    ];

    xlsx.utils.book_append_sheet(wb, ws, "Transactions");

    // Generate buffer
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    // Send file
    const filename = `transactions_${Date.now()}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// GET /transactions/export/csv
exports.exportCSV = async (req, res) => {
  try {
    // Fetch data
    const transactions = await Transaction.find({})
      .populate("entity", "name")
      .populate("bankAccount", "accountName")
      .lean();

    // Validate data
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found to export",
      });
    }

    const fields = [
      { label: "Date", value: "transactionDate" },
      { label: "Entity", value: "entity.name" },
      { label: "Bank Account", value: "bankAccount.accountName" },
      { label: "Type", value: "type" },
      { label: "Category", value: "category" },
      { label: "Party Name", value: "partyName" },
      { label: "Amount", value: "amount" },
      { label: "CGST", value: "gstDetails.cgst" },
      { label: "SGST", value: "gstDetails.sgst" },
      { label: "IGST", value: "gstDetails.igst" },
      { label: "Total Amount", value: "totalAmount" },
      { label: "Status", value: "status" },
    ];

    // Convert to CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(transactions);

    // Send file
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions_${Date.now()}.csv`,
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("CSV Export Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export transactions",
    });
  }
};

// @desc    Import transactions from Excel - Preview
// @route   POST /api/transactions/import/preview
// @access  Private (Admin+)
exports.importPreview = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    // Validate and prepare data
    const validRows = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (header is row 1)
      const rowErrors = [];

      // Required field validation
      if (!row["Date"]) rowErrors.push("Date is required");
      if (!row["Entity"]) rowErrors.push("Entity is required");
      if (!row["Bank Account"]) rowErrors.push("Bank Account is required");
      if (!row["Type"]) rowErrors.push("Type is required");
      if (!row["Category"]) rowErrors.push("Category is required");
      if (!row["Party Name"]) rowErrors.push("Party Name is required");
      if (!row["Amount"]) rowErrors.push("Amount is required");

      // Type validation
      if (
        row["Type"] &&
        !["income", "expense", "transfer"].includes(row["Type"].toLowerCase())
      ) {
        rowErrors.push("Type must be income, expense, or transfer");
      }

      // Status validation
      if (
        row["Status"] &&
        !["pending", "paid", "cancelled"].includes(row["Status"].toLowerCase())
      ) {
        rowErrors.push("Status must be pending, paid, or cancelled");
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors });
      } else {
        validRows.push({
          ...row,
          rowNumber: rowNum,
        });
      }
    }

    // Store file path temporarily for later import
    const tempFilePath = req.file.path;

    res.status(200).json({
      success: true,
      totalRows: data.length,
      validRows: validRows.length,
      invalidRows: errors.length,
      preview: validRows.slice(0, 10), // First 10 valid rows
      errors: errors.slice(0, 20), // First 20 errors
      tempFilePath: path.basename(tempFilePath),
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
    }
    next(error);
  }
};

// @desc    Import transactions from Excel - Commit
// @route   POST /api/transactions/import/commit
// @access  Private (Admin+)
exports.importCommit = async (req, res) => {
  try {
    const { tempFilePath } = req.body;

    if (!tempFilePath) {
      return res.status(400).json({
        success: false,
        message: "Temp file path missing",
      });
    }

    const filePath = path.join(__dirname, "../uploads", tempFilePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const bulkInsert = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        if (!row["Entity"] || !row["Amount"]) continue;

        const entity = await Entity.findOne({ name: row["Entity"] });
        if (!entity) throw new Error("Entity not found");

        const bankAccount = await BankAccount.findOne({
          entity: entity._id,
          accountName: row["Bank Account"],
        });

        if (!bankAccount) throw new Error("Bank account not found");

        // DUPLICATE CHECK
        const exists = await Transaction.findOne({
          entity: entity._id,
          bankAccount: bankAccount._id,
          transactionDate: new Date(row["Date"]),
          amount: Number(row["Amount"]),
          type: row["Type"].toLowerCase(),
        });

        if (exists) {
          skipped.push({
            row: i + 2,
            reason: "Duplicate transaction",
          });
          continue;
        }

        bulkInsert.push({
          entity: entity._id,
          bankAccount: bankAccount._id,
          transactionDate: new Date(row["Date"]),
          type: row["Type"].toLowerCase(),
          category: row["Category"],
          partyName: row["Party Name"],
          amount: Number(row["Amount"]),
          gstDetails: {
            cgst: Number(row["CGST"] || 0),
            sgst: Number(row["SGST"] || 0),
            igst: Number(row["IGST"] || 0),
          },
          totalAmount:
            Number(row["Amount"]) +
            Number(row["CGST"] || 0) +
            Number(row["SGST"] || 0) +
            Number(row["IGST"] || 0),
          status: row["Status"] || "pending",
          createdBy: req.user._id,
        });
      } catch (err) {
        skipped.push({
          row: i + 2,
          reason: err.message,
        });
      }
    }

    // 🚀 FAST INSERT
    if (bulkInsert.length > 0) {
      await Transaction.insertMany(bulkInsert, { ordered: false });
    }

    fs.unlinkSync(filePath);

    return res.json({
      success: true,
      imported: bulkInsert.length,
      skipped: skipped.length,
      skippedRows: skipped,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
