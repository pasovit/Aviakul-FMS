const mongoose = require("mongoose");

const entitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Entity name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    type: {
      type: String,
      enum: ["company", "individual", "ngo", "llp", "partnership"],
      required: [true, "Entity type is required"],
    },
    businessType: {
      type: String,
      enum: [
        "private_limited",
        "public_limited",
        "llp",
        "ngo",
        "sole_proprietorship",
        "individual",
      ],
      required: true,
    },
    // Registration Details
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        "Please provide a valid PAN number",
      ],
      unique: true,
      sparse: true, // Allow null values
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Please provide a valid GSTIN",
      ],
      unique: true,
      sparse: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    // NGO Specific
    is80GEligible: {
      type: Boolean,
      default: false,
    },
    registrationDate: {
      type: Date,
    },
    // Contact Information
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    // Business Details
    industry: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    // Logo/Branding
    logo: {
      type: String, // URL or file path
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Financial Year
    financialYearStart: {
      type: Number, // Month (1-12)
      default: 4, // April
    },
    // Bank Accounts (will be a separate collection but reference here)
    defaultBankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    // Metadata
    notes: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
entitySchema.index({ name: 1 });
entitySchema.index({ type: 1 });
entitySchema.index({ pan: 1 });
entitySchema.index({ gstin: 1 });
entitySchema.index({ isActive: 1 });

// Virtual for display name
entitySchema.virtual("displayName").get(function () {
  return this.name;
});

// Transform output
entitySchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    return ret;
  },
});

const Entity = mongoose.model("Entity", entitySchema);

module.exports = Entity;
