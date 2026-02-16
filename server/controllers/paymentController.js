const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Vendor = require("../models/Vendor");
const BankAccount = require("../models/BankAccount");
const { logAction } = require("../middleware/audit");
const mongoose = require("mongoose");
const { Parser } = require("json2csv");

// Get all payments with filters
exports.getPayments = async (req, res) => {
  try {
    const {
      paymentType,
      status,
      paymentMode,
      isReconciled,
      search,
      page = 1,
      limit = 50,
    } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    // Build query
    let query = {};

    // Apply entity-scoped access
    if (userRole === "employee" || userRole === "observer") {
      query.entity = userEntity;
    } else if (req.query.entity) {
      query.entity = req.query.entity;
    }

    if (paymentType) query.paymentType = paymentType;
    if (status) query.status = status;
    if (paymentMode) query.paymentMode = paymentMode;
    if (isReconciled !== undefined)
      query.isReconciled = isReconciled === "true";
    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: "i" } },
        { referenceNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(query);

    const payments = await Payment.find(query)
      .populate("entity", "name")
      .populate("customer", "name customerCode")
      .populate("vendor", "name vendorCode")
      .populate("bankAccount", "accountName accountNumber")
      .populate("createdBy", "name email")
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: payments.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

// Get single payment by ID
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("entity", "name")
      .populate("customer", "name customerCode email phone")
      .populate("vendor", "name vendorCode email phone")
      .populate("bankAccount", "accountName accountNumber bankName")
      .populate("allocations.invoice", "invoiceNumber invoiceDate totalAmount")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check entity access
    const userRole = req.user.role;
    const userEntity = req.user.entity?.toString();
    if (
      (userRole === "employee" || userRole === "observer") &&
      payment.entity.toString() !== userEntity
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this payment",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: error.message,
    });
  }
};

// Create new payment
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to create payment",
      });
    }

    const {
      entity,
      paymentType,
      customer,
      vendor,
      paymentDate,
      amount,
      paymentMode,
      bankAccount,
      tdsDeducted,
      allocations,
    } = req.body;

    // ================= REQUIRED FIELD VALIDATIONS =================

    if (!entity)
      return res
        .status(400)
        .json({ success: false, message: "Entity is required" });

    if (!paymentType)
      return res
        .status(400)
        .json({ success: false, message: "Payment type is required" });

    if (!paymentDate)
      return res
        .status(400)
        .json({ success: false, message: "Payment date is required" });

    if (!paymentMode)
      return res
        .status(400)
        .json({ success: false, message: "Payment mode is required" });

    if (!amount || amount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });

    if (tdsDeducted && tdsDeducted < 0)
      return res
        .status(400)
        .json({ success: false, message: "TDS cannot be negative" });

    // ================= CUSTOMER / VENDOR VALIDATION =================

    if (paymentType === "received") {
      if (!customer)
        return res.status(400).json({
          success: false,
          message: "Customer is required for received payment",
        });
      if (vendor)
        return res.status(400).json({
          success: false,
          message: "Vendor should not be provided for received payment",
        });
    }

    if (paymentType === "made") {
      if (!vendor)
        return res.status(400).json({
          success: false,
          message: "Vendor is required for made payment",
        });
      if (customer)
        return res.status(400).json({
          success: false,
          message: "Customer should not be provided for made payment",
        });
    }

    // ================= BANK VALIDATION =================

    if (paymentMode !== "cash" && !bankAccount) {
      return res.status(400).json({
        success: false,
        message: "Bank account is required for non-cash payments",
      });
    }

    // ================= PREVENT MANUAL FIELDS =================

    delete req.body.allocatedAmount;
    delete req.body.unallocatedAmount;
    delete req.body.isReconciled;
    delete req.body.reconciledDate;

    // ================= GENERATE PAYMENT NUMBER =================

    if (!req.body.paymentNumber) {
      req.body.paymentNumber = await Payment.generatePaymentNumber(
        entity,
        paymentType,
        new Date(paymentDate),
      );
    }
    if (req.body.vendor === "") req.body.vendor = undefined;
    if (req.body.customer === "") req.body.customer = undefined;
    if (req.body.bankAccount === "") req.body.bankAccount = undefined;

    const payment = await Payment.create({
      ...req.body,
      createdBy: userId,
    });

    // ================= UPDATE BANK BALANCE =================

    if (payment.status === "cleared" && payment.bankAccount) {
      const account = await BankAccount.findById(payment.bankAccount);
      if (account) {
        const effect =
          payment.paymentType === "received" ? payment.amount : -payment.amount;

        await account.updateBalance(effect);
      }
    }

    await logAction(
      userId,
      "CREATE",
      "Payment",
      payment._id,
      null,
      payment.toObject(),
      req,
    );

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: payment,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create payment",
    });
  }
};

// Update payment
exports.updatePayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to update payment",
      });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot update cancelled payment",
      });
    }

    const oldData = payment.toObject();
    const oldStatus = payment.status;
    const oldAmount = payment.amount;

    // ============= PROTECTED FIELDS =============

    delete req.body.entity;
    delete req.body.paymentType;
    delete req.body.allocatedAmount;
    delete req.body.unallocatedAmount;
    delete req.body.isReconciled;
    delete req.body.reconciledDate;
    delete req.body.createdBy;

    // ============= AMOUNT CHANGE VALIDATION =============

    if (
      req.body.amount &&
      req.body.amount !== oldAmount &&
      payment.allocations.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot change amount after allocations exist",
      });
    }

    Object.assign(payment, req.body, { updatedBy: userId });

    await payment.save();

    // ============= BANK BALANCE UPDATE LOGIC =============

    if (payment.bankAccount) {
      const account = await BankAccount.findById(payment.bankAccount);
      if (account) {
        const oldEffect =
          payment.paymentType === "received" ? oldAmount : -oldAmount;

        const newEffect =
          payment.paymentType === "received" ? payment.amount : -payment.amount;

        // Reverse old cleared effect
        if (oldStatus === "cleared") {
          await account.updateBalance(-oldEffect);
        }

        // Apply new cleared effect
        if (payment.status === "cleared") {
          await account.updateBalance(newEffect);
        }
      }
    }

    await logAction(
      userId,
      "UPDATE",
      "Payment",
      payment._id,
      oldData,
      payment.toObject(),
      req,
    );

    res.json({
      success: true,
      message: "Payment updated successfully",
      data: payment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to update payment",
      error: error.message,
    });
  }
};

// Delete payment (cancel)
exports.deletePayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can delete payments
    if (userRole !== "admin" && userRole !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to delete payment",
      });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Cannot delete if allocated to invoices
    if (payment.allocations && payment.allocations.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete payment with invoice allocations. Remove allocations first.",
      });
    }

    const oldData = payment.toObject();

    // Reverse bank balance if cleared
    if (payment.status === "cleared" && payment.bankAccount) {
      const account = await BankAccount.findById(payment.bankAccount);
      if (account) {
        const amount =
          payment.paymentType === "received" ? -payment.amount : payment.amount;
        await account.updateBalance(amount);
      }
    }

    payment.status = "cancelled";
    payment.updatedBy = userId;
    await payment.save();

    await logAction(
      userId,
      "DELETE",
      "Payment",
      payment._id,
      oldData,
      { status: "cancelled" },
      req,
    );

    res.json({
      success: true,
      message: "Payment cancelled successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete payment",
      error: error.message,
    });
  }
};

// Allocate payment to invoice
exports.allocatePayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to allocate payment",
      });
    }

    const { invoiceId, amount } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot allocate cancelled payment",
      });
    }

    await payment.allocateToInvoice(invoiceId, amount);

    await logAction(
      userId,
      "UPDATE",
      "Payment",
      payment._id,
      null,
      { action: "allocate", invoiceId, amount },
      req,
    );

    res.json({
      success: true,
      message: "Payment allocated successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error allocating payment:", error);
    res.status(400).json({
      success: false,
      message: "Failed to allocate payment",
      error: error.message,
    });
  }
};

// Get unallocated payments
exports.getUnallocatedPayments = async (req, res) => {
  try {
    const { paymentType } = req.query;
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    let query = {
      status: { $ne: "cancelled" },
      $expr: { $gt: ["$unallocatedAmount", 0] },
    };

    if (userRole === "employee" || userRole === "observer") {
      query.entity = userEntity;
    } else if (req.query.entity) {
      query.entity = req.query.entity;
    }

    if (paymentType) query.paymentType = paymentType;

    const payments = await Payment.find(query)
      .populate("customer", "name customerCode")
      .populate("vendor", "name vendorCode")
      .select(
        "paymentNumber paymentDate amount allocatedAmount unallocatedAmount paymentType",
      )
      .sort({ paymentDate: -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching unallocated payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unallocated payments",
      error: error.message,
    });
  }
};

// Get payment summary
exports.getPaymentSummary = async (req, res) => {
  try {
    const { paymentType, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    let match = {};

    if (userRole === "employee" || userRole === "observer") {
      match.entity = userEntity;
    } else if (req.query.entity) {
      match.entity = mongoose.Types.ObjectId(req.query.entity);
    }

    if (paymentType) match.paymentType = paymentType;
    match.status = { $ne: "cancelled" };

    if (startDate && endDate) {
      match.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalAllocated: { $sum: "$allocatedAmount" },
          totalUnallocated: { $sum: "$unallocatedAmount" },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);

    const overall = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalAllocated: { $sum: "$allocatedAmount" },
          totalUnallocated: { $sum: "$unallocatedAmount" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        byMode: summary,
        overall: overall[0] || {
          totalPayments: 0,
          totalAmount: 0,
          totalAllocated: 0,
          totalUnallocated: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payment summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment summary",
      error: error.message,
    });
  }
};

exports.exportPaymentsCSV = async (req, res) => {
  try {
    const { entity, paymentType, status, paymentMethod, search } = req.query;

    const userRole = req.user.role;
    const userEntity = req.user.entity;

    let query = {};

    // Entity restriction
    if (userRole === "employee" || userRole === "observer") {
      query.entity = userEntity;
    } else if (entity) {
      query.entity = entity;
    }

    if (paymentType) query.paymentType = paymentType;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: "i" } },
        { partyName: { $regex: search, $options: "i" } },
        { referenceNumber: { $regex: search, $options: "i" } },
      ];
    }

    const payments = await Payment.find(query)
      .populate("entity", "name")
      .populate("bankAccount", "accountName accountNumber")
      .sort({ paymentDate: -1 });

    const data = payments.map((p) => ({
      Payment_No: p.paymentNumber,
      Type: p.paymentType === "payment_received" ? "Received" : "Made",
      Entity: p.entity?.name || "",
      Party: p.partyName || "",
      Date: p.paymentDate?.toISOString().split("T")[0],
      Amount: p.amount,
      Allocated:
        p.allocations?.reduce((sum, a) => sum + a.allocatedAmount, 0) || 0,
      Unallocated:
        p.amount -
        (p.allocations?.reduce((sum, a) => sum + a.allocatedAmount, 0) || 0),
      Method: p.paymentMethod,
      Status: p.status,
      Reference: p.referenceNumber || "",
      Bank:
        p.bankAccount?.accountName + " - " + p.bankAccount?.accountNumber || "",
      Created_At: p.createdAt?.toISOString().split("T")[0],
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payments_${Date.now()}.csv`,
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("Payment CSV Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export payments",
      error: error.message,
    });
  }
};
