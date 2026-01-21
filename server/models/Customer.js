const mongoose = require("mongoose");
const Counter = require("./Counter");

const customerSchema = new mongoose.Schema(
  {
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
      required: [true, "Entity is required"],
      index: true,
    },
    customerCode: {
      type: String,
      required: [true, "Customer code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [200, "Customer name cannot exceed 200 characters"],
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
      match: [
        /^\+?[1-9]\d{9,14}$/,
        "Phone number must be a valid international number",
      ],
    },

    alternatePhone: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{9,14}$/, "Alternate phone number must be valid"],
    },

    pan: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
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
          if (!v) return true;
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            v,
          );
        },
        message: "Invalid GSTIN format",
      },
      index: true,
    },
    billingAddress: {
      line1: {
        type: String,
        required: [true, "Billing address line 1 is required"],
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
    shippingAddresses: [
      {
        label: {
          type: String,
          default: "Default",
          trim: true,
        },
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: String,
        country: {
          type: String,
          default: "India",
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    category: {
      type: String,
      enum: [
        "retail",
        "wholesale",
        "distributor",
        "corporate",
        "government",
        "individual",
        "other",
      ],
      default: "other",
      index: true,
    },
    creditTerms: {
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
    customCreditDays: {
      type: Number,
      min: [0, "Custom credit days cannot be negative"],
      max: [365, "Custom credit days cannot exceed 365"],
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
    tdsApplicable: {
      type: Boolean,
      default: false,
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
  },
);

// Compound indexes
customerSchema.index({ entity: 1, isActive: 1 });
customerSchema.index({ entity: 1, category: 1 });
customerSchema.index({ name: "text" });

// Virtual for credit days
customerSchema.virtual("creditDays").get(function () {
  const termDays = {
    immediate: 0,
    net_7: 7,
    net_15: 15,
    net_30: 30,
    net_45: 45,
    net_60: 60,
    net_90: 90,
    custom: this.customCreditDays || 0,
  };
  return termDays[this.creditTerms] || 0;
});

// Virtual for credit utilization
customerSchema.virtual("creditUtilization").get(function () {
  if (this.creditLimit === 0) return 0;
  return (this.currentOutstanding / this.creditLimit) * 100;
});

// Virtual for available credit
customerSchema.virtual("availableCredit").get(function () {
  return Math.max(0, this.creditLimit - this.currentOutstanding);
});

// // Static method to generate customer code
// customerSchema.statics.generateCustomerCode = async function (entityId) {
//   const count = await this.countDocuments({ entity: entityId });
//   return `CUS-${String(count + 1).padStart(5, "0")}`;
// };

// Static method to update outstanding balance
customerSchema.statics.updateOutstanding = async function (customerId, amount) {
  return this.findByIdAndUpdate(
    customerId,
    { $inc: { currentOutstanding: amount } },
    { new: true },
  );
};

// Pre-save hook to generate customer code
customerSchema.pre("validate", async function (next) {
  if (!this.isNew) return next();

  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { name: "customer", year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.customerCode = `CUS-${year}-${String(counter.seq).padStart(4, "0")}`;

  // Auto create default shipping address
  if (this.shippingAddresses.length === 0) {
    this.shippingAddresses.push({
      label: "Default",
      line1: this.billingAddress.line1,
      line2: this.billingAddress.line2,
      city: this.billingAddress.city,
      state: this.billingAddress.state,
      pincode: this.billingAddress.pincode,
      country: this.billingAddress.country,
      isDefault: true,
    });
  }

  next();
});


// Ensure virtuals are included in JSON
customerSchema.set("toJSON", { virtuals: true });
customerSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Customer", customerSchema);
