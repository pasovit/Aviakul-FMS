const AuditLog = require("../models/AuditLog");
const { getClientInfo } = require("../utils/helpers");

// Middleware to log all actions
const auditMiddleware = async (req, res, next) => {
  // Store original send function
  const originalSend = res.send;

  // Override send function
  res.send = function (data) {
    // Log the action
    if (req.user && res.statusCode < 400) {
      const clientInfo = getClientInfo(req);

      const logData = {
        user: req.user._id,
        userName: req.user.username,
        action: req.method.toLowerCase(),
        resource: req.baseUrl.split("/").pop() || req.path.split("/")[1],
        resourceId: req.params.id || req.body._id,
        description: `${req.method} ${req.originalUrl}`,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: res.statusCode < 400 ? "success" : "failure",
      };

      // Add entity context if available
      if (req.body.entity) {
        logData.entity = req.body.entity;
      }

      // Add changes for update operations
      if (req.method === "PUT" && req.body) {
        logData.changes = {
          after: req.body,
        };
      }

      AuditLog.log(logData);
    }

    // Call original send
    originalSend.call(this, data);
  };

  next();
};

// Log specific action (use in controllers)
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
      metadata,
      status: "success",
    };

    // Add entity context if available
    if (metadata.entity) {
      logData.entity = metadata.entity;
    }

    // Add changes if available
    if (metadata.changes) {
      logData.changes = metadata.changes;
    }

    await AuditLog.log(logData);
  } catch (error) {
    console.error("Audit logging error:", error);
  }
};

module.exports = {
  auditMiddleware,
  logAction,
};
