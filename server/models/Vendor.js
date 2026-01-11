const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      required: [true, "Entity is required"],
      index: true,
    },
    vendorCode: {
      type: String,
      required: [true, "Vendor code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
      maxlength: [200, "Vendor name cannot exceed 200 characters"],
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, "Contact person name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Invalid email format",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Alternate phone must be 10 digits"],
    },
    pan: {
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
      index: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            v
          );
        },
        message: "Invalid GSTIN format",
      },
      index: true,
    },
    address: {
      line1: {
        type: String,
        required: [true, "Address line 1 is required"],
        trim: true,
        maxlength: [200, "Address line 1 cannot exceed 200 characters"],
      },
      line2: {
        type: String,
        trim: true,
        maxlength: [200, "Address line 2 cannot exceed 200 characters"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
        maxlength: [100, "City cannot exceed 100 characters"],
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
        maxlength: [100, "State cannot exceed 100 characters"],
      },
      pincode: {
        type: String,
        required: [true, "Pincode is required"],
        trim: true,
        match: [/^[0-9]{6}$/, "Pincode must be 6 digits"],
      },
      country: {
        type: String,
        default: "India",
        trim: true,
      },
    },
    category: {
      type: String,
      enum: [
        "raw_material",
        "services",
        "utilities",
        "office_supplies",
        "transport",
        "professional",
        "other",
      ],
      default: "other",
      index: true,
    },
    paymentTerms: {
      type: String,
      enum: [
        "immediate",
        "net_7",
        "net_15",
        "net_30",
        "net_45",
        "net_60",
        "net_90",
        "custom",
      ],
      default: "net_30",
      index: true,
    },
    customPaymentDays: {
      type: Number,
      min: [0, "Custom payment days cannot be negative"],
      max: [365, "Custom payment days cannot exceed 365"],
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, "Credit limit cannot be negative"],
    },
    currentOutstanding: {
      type: Number,
      default: 0,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: {
        type: String,
        uppercase: true,
        validate: {
          validator: function (v) {
            if (!v) return true;
            return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
          },
          message: "Invalid IFSC code format",
        },
      },
      branchName: String,
    },
    tdsSection: {
      type: String,
      enum: ["", "194A", "194C", "194H", "194I", "194J", "194Q", "Other"],
      default: "",
    },
    tdsRate: {
      type: Number,
      default: 0,
      min: [0, "TDS rate cannot be negative"],
      max: [30, "TDS rate cannot exceed 30%"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
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

// Compound indexes
vendorSchema.index({ entity: 1, isActive: 1 });
vendorSchema.index({ entity: 1, category: 1 });
vendorSchema.index({ name: "text" });

// Virtual for payment days
vendorSchema.virtual("paymentDays").get(function () {
  const termDays = {
    immediate: 0,
    net_7: 7,
    net_15: 15,
    net_30: 30,
    net_45: 45,
    net_60: 60,
    net_90: 90,
    custom: this.customPaymentDays || 0,
  };
  return termDays[this.paymentTerms] || 0;
});

// Virtual for credit utilization percentage
vendorSchema.virtual("creditUtilization").get(function () {
  if (this.creditLimit === 0) return 0;
  return (this.currentOutstanding / this.creditLimit) * 100;
});

// Virtual for available credit
vendorSchema.virtual("availableCredit").get(function () {
  return Math.max(0, this.creditLimit - this.currentOutstanding);
});

// Static method to generate vendor code
vendorSchema.statics.generateVendorCode = async function (entityId) {
  const count = await this.countDocuments({ entity: entityId });
  return `VEN${String(count + 1).padStart(5, "0")}`;
};

// Static method to update outstanding balance
vendorSchema.statics.updateOutstanding = async function (vendorId, amount) {
  return this.findByIdAndUpdate(
    vendorId,
    { $inc: { currentOutstanding: amount } },
    { new: true }
  );
};

// Pre-save hook to generate vendor code
vendorSchema.pre("save", async function (next) {
  if (this.isNew && !this.vendorCode) {
    this.vendorCode = await this.constructor.generateVendorCode(this.entity);
  }
  next();
});

// Ensure virtuals are included in JSON
vendorSchema.set("toJSON", { virtuals: true });
vendorSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Vendor", vendorSchema);
