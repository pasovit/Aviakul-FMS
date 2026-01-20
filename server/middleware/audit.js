const AuditLog = require("../models/AuditLog");
const { getClientInfo } = require("../utils/helpers");

/**
 * HTTP method → Audit action mapping
 * Must match AuditLog.action enum
 */
const ACTION_MAP = {
  get: "view",
  post: "create",
  put: "update",
  patch: "update",
  delete: "delete",
};

/**
 * API resource → Audit resource mapping
 * Must match AuditLog.resource enum
 */
const RESOURCE_MAP = {
  auth: "auth",
  users: "user",
  entities: "entity",
  "bank-accounts": "bank_account",
  transactions: "transaction",
  invoices: "invoice",
  payments: "payment",
  vendors: "client",
  customers: "client",
  dashboard: "report",
  settings: "settings",
};

/**
 * Global audit middleware
 * Logs all successful API actions
 */
const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    try {
      if (!req.user || res.statusCode >= 400) {
        return originalSend.call(this, data);
      }

      const clientInfo = getClientInfo(req);

      const method = req.method.toLowerCase();
      const rawResource =
        req.baseUrl?.split("/").pop() || req.path.split("/")[1];

      const action = ACTION_MAP[method] || "view";
      const resource = RESOURCE_MAP[rawResource] || "report";

      const logData = {
        user: req.user._id,
        userName: req.user.username,
        action,
        resource,
        resourceId: req.params?.id || req.body?._id,
        description: `${req.method} ${req.originalUrl}`,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: "success",
      };

      // Entity context
      if (req.body?.entity) {
        logData.entity = req.body.entity;
      }

      // Track updates
      if (["put", "patch"].includes(method) && req.body) {
        logData.changes = {
          after: req.body,
        };
      }

      // Fire and forget (never block API)
      AuditLog.log(logData);
    } catch (error) {
      console.error("Audit logging failed:", error.message);
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Manual audit logging (use inside controllers)
 */
const logAction = async (
  req,
  action,
  resource,
  resourceId,
  description,
  metadata = {}
) => {
  try {
    if (!req.user) return;

    const clientInfo = getClientInfo(req);

    const logData = {
      user: req.user._id,
      userName: req.user.username,
      action,
      resource,
      resourceId,
      description,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
      metadata,
    };

    if (metadata.entity) {
      logData.entity = metadata.entity;
    }

    if (metadata.changes) {
      logData.changes = metadata.changes;
    }

    await AuditLog.log(logData);
  } catch (error) {
    console.error("Manual audit log failed:", error.message);
  }
};

module.exports = {
  auditMiddleware,
  logAction,
};
