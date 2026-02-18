const mongoose = require("mongoose");

const paymentAllocationSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    invoiceNumber: String,
    allocatedAmount: {
      type: Number,
      required: true,
      min: [0, "Allocated amount cannot be negative"],
    },
    allocationDate: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const paymentSchema = new mongoose.Schema(
  {
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      required: [true, "Entity is required"],
      index: true,
    },
    paymentNumber: {
      type: String,
      required: [true, "Payment number is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    paymentType: {
      type: String,
      enum: ["received", "made"],
      required: [true, "Payment type is required"],
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
      set: (v) => (v === "" ? undefined : v),
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
      set: (v) => (v === "" ? undefined : v),
    },

    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      index: true,
      set: (v) => (v === "" ? undefined : v),
    },

    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    paymentMode: {
      type: String,
      enum: ["cash", "cheque", "neft", "rtgs", "imps", "upi", "card", "other"],
      required: [true, "Payment mode is required"],
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [100, "Reference number cannot exceed 100 characters"],
    },
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    allocations: {
      type: [paymentAllocationSchema],
      validate: {
        validator: function (v) {
          if (!v || v.length === 0) return true;
          const totalAllocated = v.reduce(
            (sum, a) => sum + a.allocatedAmount,
            0,
          );
          return Math.abs(totalAllocated - this.amount) < 0.01;
        },
        message: "Total allocated amount must equal payment amount",
      },
    },
    allocatedAmount: {
      type: Number,
      default: 0,
      min: [0, "Allocated amount cannot be negative"],
    },
    unallocatedAmount: {
      type: Number,
      default: 0,
    },
    tdsDeducted: {
      type: Number,
      default: 0,
      min: [0, "TDS amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "cleared", "bounced", "cancelled"],
      default: "pending",
      index: true,
    },
    isReconciled: {
      type: Boolean,
      default: false,
      index: true,
    },
    reconciledDate: Date,
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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

// Compound indexes
paymentSchema.index({ entity: 1, paymentType: 1, status: 1 });
paymentSchema.index({ entity: 1, customer: 1 });
paymentSchema.index({ entity: 1, vendor: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ entity: 1, isReconciled: 1 });

// Virtual for fully allocated status
paymentSchema.virtual("isFullyAllocated").get(function () {
  return Math.abs(this.unallocatedAmount) < 0.01;
});

// Pre-save hook to calculate allocated and unallocated amounts
paymentSchema.pre("save", function (next) {
  if (this.allocations && this.allocations.length > 0) {
    this.allocatedAmount = this.allocations.reduce(
      (sum, a) => sum + a.allocatedAmount,
      0,
    );
  } else {
    this.allocatedAmount = 0;
  }

  this.unallocatedAmount = this.amount - this.allocatedAmount;

  // If payment is fully allocated and cleared, mark as reconciled
  if (
    this.status === "cleared" &&
    Math.abs(this.unallocatedAmount) < 0.01 &&
    !this.isReconciled
  ) {
    this.isReconciled = true;
    this.reconciledDate = new Date();
  }

  next();
});

// Static method to generate payment number
paymentSchema.statics.generatePaymentNumber = async function (
  entityId,
  paymentType,
  paymentDate,
) {
  const year = paymentDate.getFullYear();
  const month = String(paymentDate.getMonth() + 1).padStart(2, "0");
  const prefix = paymentType === "received" ? "PR" : "PM";

  const count = await this.countDocuments({
    entity: entityId,
    paymentType: paymentType,
    paymentDate: {
      $gte: new Date(year, paymentDate.getMonth(), 1),
      $lt: new Date(year, paymentDate.getMonth() + 1, 1),
    },
  });

  return `${prefix}${year}${month}${String(count + 1).padStart(4, "0")}`;
};

// Instance method to allocate to invoice
paymentSchema.methods.allocateToInvoice = async function (invoiceId, amount) {
  const Invoice = mongoose.model("Invoice");
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) throw new Error("Invoice not found");

  // Validate invoice type matches payment type
  if (this.paymentType === "received" && invoice.invoiceType !== "sales") {
    throw new Error("Cannot allocate received payment to purchase invoice");
  }
  if (this.paymentType === "made" && invoice.invoiceType !== "purchase") {
    throw new Error("Cannot allocate made payment to sales invoice");
  }

  // Check if enough unallocated amount
  if (amount > this.unallocatedAmount) {
    throw new Error("Insufficient unallocated amount");
  }

  // Check if invoice has enough outstanding amount
  if (amount > invoice.amountDue) {
    throw new Error("Amount exceeds invoice outstanding");
  }

  // Add allocation
  this.allocations.push({
    invoice: invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    allocatedAmount: amount,
    allocationDate: new Date(),
  });

  // Update invoice payment
  await Invoice.recordPayment(invoiceId, amount);

  // Save payment
  await this.save();

  return this;
};

// Static method to get payment summary
paymentSchema.statics.getPaymentSummary = async function (
  entityId,
  paymentType,
  startDate,
  endDate,
) {
  const match = {
    entity: mongoose.Types.ObjectId(entityId),
    paymentType: paymentType,
    status: { $ne: "cancelled" },
  };

  if (startDate && endDate) {
    match.paymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return this.aggregate([
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
};

// Ensure virtuals are included in JSON
paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Payment", paymentSchema);
