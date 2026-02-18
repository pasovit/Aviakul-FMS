const mongoose = require("mongoose");
const Counter = require("./Counter");

const transactionSchema = new mongoose.Schema(
  {
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      required: [true, "Entity is required"],
      index: true,
    },
    transactionCode: {
      type: String,
      unique: true,
      index: true,
    },

    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: [true, "Bank account is required"],
      index: true,
    },
    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required"],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ["income", "expense", "loan", "refund"],
        message: "{VALUE} is not a valid transaction type",
      },
      required: [true, "Transaction type is required"],
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      index: true,
      default: null,
    },

    partyName: {
      type: String,
      required: [true, "Party name is required"],
      trim: true,
      maxlength: [200, "Party name cannot exceed 200 characters"],
    },
    partyPAN: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: "Invalid PAN format",
      },
    },
    partyGSTIN: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            v,
          );
        },
        message: "Invalid GSTIN format",
      },
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    gstDetails: {
      cgst: {
        type: Number,
        default: 0,
        min: [0, "CGST cannot be negative"],
      },
      sgst: {
        type: Number,
        default: 0,
        min: [0, "SGST cannot be negative"],
      },
      igst: {
        type: Number,
        default: 0,
        min: [0, "IGST cannot be negative"],
      },
      totalGST: {
        type: Number,
        default: 0,
        min: [0, "Total GST cannot be negative"],
      },
    },
    tdsDetails: {
      section: {
        type: String,
        enum: ["", "194A", "194C", "194H", "194I", "194J", "194Q", "Other"],
        default: "",
      },
      rate: {
        type: Number,
        default: 0,
        min: [0, "TDS rate cannot be negative"],
        max: [30, "TDS rate cannot exceed 30%"],
      },
      amount: {
        type: Number,
        default: 0,
        min: [0, "TDS amount cannot be negative"],
      },
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [1, "Total amount must be greater than 0"],
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "cheque", "neft", "rtgs", "imps", "upi", "card", "other"],
      default: "neft",
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [100, "Reference number cannot exceed 100 characters"],
    },
    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: [50, "Invoice number cannot exceed 50 characters"],
    },
    invoiceDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "paid", "cancelled", "reconciled", "received"],
        message: "{VALUE} is not a valid status",
      },
      default: "pending",
      required: true,
      index: true,
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // For transfer transactions
    transferToAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    linkedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    isReconciled: {
      type: Boolean,
      default: false,
      index: true,
    },
    reconciledDate: {
      type: Date,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
transactionSchema.index({ entity: 1, transactionDate: -1 });
transactionSchema.index({ entity: 1, status: 1, transactionDate: -1 });
transactionSchema.index({ bankAccount: 1, transactionDate: -1 });
transactionSchema.index({ category: 1, transactionDate: -1 });
transactionSchema.index({ subCategory: 1, transactionDate: -1 });
transactionSchema.index({ type: 1, transactionDate: -1 });
transactionSchema.index({ status: 1, transactionDate: -1 });
transactionSchema.index({ transactionDate: -1 });
transactionSchema.index({
  partyName: "text",
  invoiceNumber: "text",
  referenceNumber: "text",
  notes: "text",
});

// Virtual for net amount (amount after GST and TDS)
transactionSchema.virtual("netAmount").get(function () {
  if (this.type === "income") {
    return this.amount - this.tdsDetails.amount;
  }
  return this.amount;
});

// Virtual for amount with GST
transactionSchema.virtual("amountWithGST").get(function () {
  return this.amount + this.gstDetails.totalGST;
});

// Pre-save middleware to calculate total amount
transactionSchema.pre("validate", function (next) {
  // Calculate total GST
  this.gstDetails.totalGST =
    this.gstDetails.cgst + this.gstDetails.sgst + this.gstDetails.igst;

  // Calculate total amount based on transaction type
  if (this.type === "income") {
    this.totalAmount =
      this.amount + this.gstDetails.totalGST - this.tdsDetails.amount;
  } else if (this.type === "expense") {
    this.totalAmount = this.amount + this.gstDetails.totalGST;
  } else if (this.type === "loan") {
    this.totalAmount = this.amount;
  } else if (this.type === "refund") {
    this.totalAmount = this.amount;
  }

  next();
});

// Static method to get transactions by entity with filters
transactionSchema.statics.getByFilters = function (filters, options = {}) {
  const query = this.find(filters);

  // Populate references
  query.populate("entity", "name type");
  query.populate("bankAccount", "accountName accountNumber bankName");
  query.populate("transferToAccount", "accountName accountNumber bankName");
  query.populate("category", "name");
  query.populate("subCategory", "name");

  query.populate("createdBy", "firstName lastName");
  query.populate("updatedBy", "firstName lastName");

  // Sorting
  const sortField = options.sortBy || "transactionDate";
  const sortOrder = options.sortOrder === "asc" ? 1 : -1;
  query.sort({ [sortField]: sortOrder });

  // Pagination
  if (options.page && options.limit) {
    const skip = (options.page - 1) * options.limit;
    query.skip(skip).limit(options.limit);
  }

  return query;
};

// Static method to get summary by entity
transactionSchema.statics.getSummaryByEntity = function (
  entityId,
  startDate,
  endDate,
) {
  const matchStage = {
    entity: mongoose.Types.ObjectId(entityId),
    status: { $in: ["paid", "reconciled"] },
  };

  if (startDate && endDate) {
    matchStage.transactionDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method for category-wise breakdown
transactionSchema.statics.getCategoryBreakdown = function (
  entityId,
  type,
  startDate,
  endDate,
) {
  const matchStage = {
    entity: mongoose.Types.ObjectId(entityId),
    type: type,
    status: { $in: ["paid", "reconciled"] },
  };

  if (startDate && endDate) {
    matchStage.transactionDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

transactionSchema.pre("validate", async function (next) {
  if (!this.isNew) return next();

  try {
    const year = new Date(this.transactionDate).getFullYear();

    const counter = await Counter.findOneAndUpdate(
      {
        name: "transaction",
        year,
      },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    this.transactionCode = `TRX-${year}-${String(counter.seq).padStart(4, "0")}`;

    next();
  } catch (error) {
    next(error);
  }
});

// Ensure virtuals are included in JSON
transactionSchema.set("toJSON", { virtuals: true });
transactionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Transaction", transactionSchema);
