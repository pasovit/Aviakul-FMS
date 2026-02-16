const mongoose = require("mongoose");
const Counter = require("./Counter");

const invoiceLineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than 0"],
    },
    unit: {
      type: String,
      default: "nos",
      trim: true,
    },
    rate: {
      type: Number,
      required: [true, "Rate is required"],
      min: [0, "Rate cannot be negative"],
    },
    amount: {
      type: Number,
      required: true,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, "Tax rate cannot be negative"],
      max: [100, "Tax rate cannot exceed 100%"],
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      required: [true, "Entity is required"],
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    invoiceType: {
      type: String,
      enum: ["sales", "purchase"],
      required: [true, "Invoice type is required"],
      index: true,
    },
    // For sales invoices
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },
    // For purchase invoices
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    invoiceDate: {
      type: Date,
      required: [true, "Invoice date is required"],
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      index: true,
    },
    lineItems: {
      type: [invoiceLineItemSchema],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one line item is required",
      },
    },
    subtotal: {
      type: Number,
      min: [0, "Subtotal cannot be negative"],
    },
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
    totalTax: {
      type: Number,
      default: 0,
    },
    tdsAmount: {
      type: Number,
      default: 0,
      min: [0, "TDS amount cannot be negative"],
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      min: [0, "Total amount cannot be negative"],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount paid cannot be negative"],
    },
    amountDue: {
      type: Number,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid"],
      default: "unpaid",
      index: true,
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    termsAndConditions: {
      type: String,
      maxlength: [2000, "Terms cannot exceed 2000 characters"],
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
    // Aging fields
    daysOverdue: {
      type: Number,
      default: 0,
    },
    agingBucket: {
      type: String,
      enum: ["current", "1-30", "31-60", "61-90", "90+"],
      default: "current",
      index: true,
    },
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciledDate: Date,
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
  }
);

// Compound indexes
invoiceSchema.index({ entity: 1, invoiceType: 1, status: 1 });
invoiceSchema.index({ entity: 1, customer: 1 });
invoiceSchema.index({ entity: 1, vendor: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ invoiceDate: 1 });

// Virtual for overdue status
invoiceSchema.virtual("isOverdue").get(function () {
  return (
    this.status !== "paid" &&
    this.status !== "cancelled" &&
    new Date() > this.dueDate
  );
});

// Pre-save hook to calculate line item totals
invoiceLineItemSchema.pre("save", function (next) {
  this.amount = this.quantity * this.rate;
  this.taxAmount = (this.amount * this.taxRate) / 100;
  this.totalAmount = this.amount + this.taxAmount;
  next();
});

// Pre-save hook for invoice calculations
invoiceSchema.pre("save", function (next) {
  // Calculate line item totals
  this.lineItems.forEach((item) => {
    item.amount = item.quantity * item.rate;
    item.taxAmount = (item.amount * item.taxRate) / 100;
    item.totalAmount = item.amount + item.taxAmount;
  });

  // Calculate subtotal
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Calculate total tax
  this.totalTax = this.cgst + this.sgst + this.igst;

  // Calculate total amount
  this.totalAmount =
    this.subtotal + this.totalTax - this.tdsAmount + this.roundOff;

  // Calculate amount due
  this.amountDue = this.totalAmount - this.amountPaid;

  // Update payment status based on amount paid
  if (this.amountPaid === 0) {
    this.paymentStatus = "unpaid";
  } else if (this.amountPaid >= this.totalAmount) {
    this.paymentStatus = "paid";
    this.status = "paid";
  } else {
    this.paymentStatus = "partially_paid";
    if (this.status === "draft" || this.status === "pending") {
      this.status = "partially_paid";
    }
  }

  // Calculate days overdue and aging bucket
  const today = new Date();
  if (
    this.dueDate < today &&
    this.status !== "paid" &&
    this.status !== "cancelled"
  ) {
    this.daysOverdue = Math.floor(
      (today - this.dueDate) / (1000 * 60 * 60 * 24)
    );
    this.status = "overdue";

    // Set aging bucket
    if (this.daysOverdue <= 30) {
      this.agingBucket = "1-30";
    } else if (this.daysOverdue <= 60) {
      this.agingBucket = "31-60";
    } else if (this.daysOverdue <= 90) {
      this.agingBucket = "61-90";
    } else {
      this.agingBucket = "90+";
    }
  } else {
    this.daysOverdue = 0;
    this.agingBucket = "current";
  }

  next();
});


invoiceSchema.pre("validate", async function (next) {
  if (!this.isNew) return next();

  const year = new Date(this.invoiceDate).getFullYear();
  const prefix = this.invoiceType === "sales" ? "SI" : "PI";

  const counter = await Counter.findOneAndUpdate(
    {
      name: `invoice_${this.invoiceType}`,
      year,
    },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.invoiceNumber = `${prefix}-${year}-${String(counter.seq).padStart(4, "0")}`;

  next();
});


// Static method to update payment
invoiceSchema.statics.recordPayment = async function (
  invoiceId,
  paymentAmount
) {
  const invoice = await this.findById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  invoice.amountPaid += paymentAmount;
  await invoice.save();

  return invoice;
};

// Static method to get aging report
invoiceSchema.statics.getAgingReport = async function (entityId, invoiceType) {
  return this.aggregate([
    {
      $match: {
        entity: mongoose.Types.ObjectId(entityId),
        invoiceType: invoiceType,
        status: { $nin: ["paid", "cancelled"] },
      },
    },
    {
      $group: {
        _id: "$agingBucket",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amountDue" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Ensure virtuals are included in JSON
invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
