const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { getClientInfo } = require("../utils/helpers");

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please login.",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id)
        .select("+twoFactorSecret +activeSessions")
        .populate("assignedEntities", "name type");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User no longer exists",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message:
            "Your account has been deactivated. Please contact administrator.",
        });
      }

      // Check if user is locked
      if (user.accountLocked) {
        const minutesRemaining = Math.ceil(
          (user.lockoutUntil - Date.now()) / 60000
        );
        return res.status(401).json({
          success: false,
          message: `Account is locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`,
        });
      }

      // Check if password was changed after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          message: "Password was recently changed. Please login again.",
        });
      }

      // Check session validity and update last activity
      const sessionIndex = user.activeSessions.findIndex(
        (s) => s.token === token
      );
      if (sessionIndex === -1) {
        return res.status(401).json({
          success: false,
          message: "Session expired or invalid. Please login again.",
        });
      }

      const session = user.activeSessions[sessionIndex];

      // Check if session expired
      if (session.expiresAt < Date.now()) {
        // Remove expired session
        user.activeSessions.splice(sessionIndex, 1);
        await user.save();

        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }

      // Check session timeout (30 minutes inactivity)
      const sessionTimeoutMs =
        (parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30) * 60 * 1000;
      const timeSinceLastActivity =
        Date.now() - new Date(session.lastActivity).getTime();

      if (timeSinceLastActivity > sessionTimeoutMs) {
        // Remove inactive session
        user.activeSessions.splice(sessionIndex, 1);
        await user.save();

        return res.status(401).json({
          success: false,
          message: "Session timed out due to inactivity. Please login again.",
        });
      }

      // Update last activity
      session.lastActivity = Date.now();
      await user.save();

      // Attach user to request
      req.user = user;
      req.token = token;

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

// Require 2FA verification
exports.require2FA = async (req, res, next) => {
  if (req.user.twoFactorEnabled && !req.user.twoFactorVerified) {
    return res.status(403).json({
      success: false,
      message: "2FA verification required",
      requires2FA: true,
    });
  }
  next();
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const clientInfo = getClientInfo(req);

      // Log unauthorized access attempt
      AuditLog.log({
        user: req.user._id,
        userName: req.user.username,
        action: "view",
        resource: req.baseUrl.split("/").pop() || "unknown",
        description: `Unauthorized access attempt to ${req.method} ${req.originalUrl}`,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: "failure",
        errorMessage: "Insufficient permissions",
      });

      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

// Check entity access
exports.checkEntityAccess = (entityField = "entity") => {
  return async (req, res, next) => {
    try {
      // Super admin and admin have access to all entities
      if (["super_admin", "admin"].includes(req.user.role)) {
        return next();
      }

      // Get entity ID from request
      let entityId =
        req.params[entityField] ||
        req.body[entityField] ||
        req.query[entityField];

      // If no entity specified and user has assigned entities, allow (will be filtered later)
      if (!entityId) {
        return next();
      }

      // Check if user has access to this entity
      const hasAccess = req.user.assignedEntities.some(
        (e) => e._id.toString() === entityId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this entity",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error checking entity access",
        error: error.message,
      });
    }
  };
};

// Validate edit window (24 hours for employees)
exports.validateEditWindow = (model, idField = "id") => {
  return async (req, res, next) => {
    try {
      // Super admin, admin, and manager can edit anytime
      if (["super_admin", "admin", "manager"].includes(req.user.role)) {
        return next();
      }

      // For employees, check 24-hour window
      if (req.user.role === "employee") {
        const recordId = req.params[idField];
        const record = await model.findById(recordId);

        if (!record) {
          return res.status(404).json({
            success: false,
            message: "Record not found",
          });
        }

        // Check if record was created by this user
        if (
          record.createdBy &&
          record.createdBy.toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "You can only edit records created by you",
          });
        }

        // Check 24-hour window
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (record.createdAt < twentyFourHoursAgo) {
          return res.status(403).json({
            success: false,
            message:
              "Edit window expired. Records can only be edited within 24 hours of creation.",
          });
        }
      }

      // Observer cannot edit
      if (req.user.role === "observer") {
        return res.status(403).json({
          success: false,
          message: "Observers have read-only access",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error validating edit permissions",
        error: error.message,
      });
    }
  };
};

module.exports = exports;
