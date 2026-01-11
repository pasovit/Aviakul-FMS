const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    // What action was performed
    action: {
      type: String,
      enum: [
        "create",
        "update",
        "delete",
        "view",
        "export",
        "login",
        "logout",
        "login_failed",
        "password_change",
        "2fa_enabled",
        "2fa_disabled",
        "2fa_verified",
        "approve",
        "reject",
        "send",
        "cancel",
        "import",
        "bulk_update",
        "bulk_delete",
      ],
      required: true,
    },
    // What resource/model was affected
    resource: {
      type: String,
      enum: [
        "user",
        "entity",
        "bank_account",
        "transaction",
        "client",
        "invoice",
        "loan",
        "payment",
        "report",
        "settings",
        "auth",
      ],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Details of the change
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    // Context
    description: {
      type: String,
      required: true,
    },
    // Request metadata
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    // Related entity (for entity-scoped actions)
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
    },
    // Status of the action
    status: {
      type: String,
      enum: ["success", "failure", "pending"],
      default: "success",
    },
    errorMessage: {
      type: String,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // For recent logs
auditLogSchema.index({ ip: 1 });

// Prevent modification of audit logs
auditLogSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(new Error("Audit logs cannot be modified"));
  }
  next();
});

// Static method to create audit log
auditLogSchema.statics.log = async function (data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw error to prevent breaking the main operation
    return null;
  }
};

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
