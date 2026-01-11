const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      required: [true, "Entity is required"],
      index: true,
    },
    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: [100, "Account name cannot exceed 100 characters"],
    },
    accountType: {
      type: String,
      enum: {
        values: ["savings", "current", "od", "cc", "cash"],
        message: "{VALUE} is not a valid account type",
      },
      required: [true, "Account type is required"],
      index: true,
    },
    accountNumber: {
      type: String,
      trim: true,
      sparse: true, // Allows null for cash accounts
      validate: {
        validator: function (v) {
          // Cash accounts don't need account numbers
          if (this.accountType === "cash") return true;
          // Other accounts should have account numbers
          return v && v.length >= 9 && v.length <= 18;
        },
        message: "Account number must be between 9 and 18 characters",
      },
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, "Bank name cannot exceed 100 characters"],
      required: function () {
        return this.accountType !== "cash";
      },
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (this.accountType === "cash") return true;
          if (!v) return false;
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: "Invalid IFSC code format",
      },
      required: function () {
        return this.accountType !== "cash";
      },
    },
    branchName: {
      type: String,
      trim: true,
      maxlength: [100, "Branch name cannot exceed 100 characters"],
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR", "USD", "EUR", "GBP"],
      uppercase: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
      required: [true, "Opening balance is required"],
    },
    openingBalanceDate: {
      type: Date,
      default: () => new Date("2024-01-01"),
      required: [true, "Opening balance date is required"],
    },
    currentBalance: {
      type: Number,
      default: function () {
        return this.openingBalance;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
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
  }
);

// Compound indexes for efficient queries
bankAccountSchema.index({ entity: 1, isActive: 1 });
bankAccountSchema.index({ entity: 1, accountType: 1 });
bankAccountSchema.index({ accountNumber: 1, ifscCode: 1 });

// Virtual for identifying cash accounts
bankAccountSchema.virtual("isCashAccount").get(function () {
  return this.accountType === "cash";
});

// Virtual for balance status
bankAccountSchema.virtual("balanceStatus").get(function () {
  if (this.accountType === "od" || this.accountType === "cc") {
    return this.currentBalance < 0 ? "overdrawn" : "available";
  }
  return this.currentBalance >= 0 ? "positive" : "negative";
});

// Instance method to update balance
bankAccountSchema.methods.updateBalance = function (amount) {
  this.currentBalance += amount;
  return this.save();
};

// Static method to get accounts by entity
bankAccountSchema.statics.getByEntity = function (entityId) {
  return this.find({ entity: entityId, isActive: true })
    .populate("entity", "name type")
    .sort({ accountName: 1 });
};

// Static method to get total balances by entity
bankAccountSchema.statics.getTotalBalanceByEntity = function (entityId) {
  return this.aggregate([
    {
      $match: {
        entity: mongoose.Types.ObjectId(entityId),
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$currency",
        totalBalance: { $sum: "$currentBalance" },
        accountCount: { $sum: 1 },
      },
    },
  ]);
};

// Pre-save hook to track changes
bankAccountSchema.pre("save", function (next) {
  if (this.isModified("currentBalance") && !this.isNew) {
    // Balance changes will be tracked via Transaction model
  }
  next();
});

// Ensure virtuals are included in JSON
bankAccountSchema.set("toJSON", { virtuals: true });
bankAccountSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("BankAccount", bankAccountSchema);
