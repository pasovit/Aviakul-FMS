const AuditLog = require("../models/AuditLog");
const { getPagination, buildPaginationResponse } = require("../utils/helpers");

// @desc    Get audit logs
// @route   GET /api/audit
// @access  Private (Super Admin, Admin, Manager)
exports.getAuditLogs = async (req, res) => {
  try {
    const { page, limit, action, resource, userId, startDate, endDate } =
      req.query;
    const { skip, limit: limitNum, page: pageNum } = getPagination(page, limit);

    // Build query
    let query = {};

    if (action) {
      query.action = action;
    }

    if (resource) {
      query.resource = resource;
    }

    if (userId) {
      query.user = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Non-admin users can only see logs for their assigned entities
    if (!["super_admin", "admin", "manager"].includes(req.user.role)) {
      query.entity = { $in: req.user.assignedEntities.map((e) => e._id) };
    }

    const logs = await AuditLog.find(query)
      .populate("user", "username email")
      .populate("entity", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      ...buildPaginationResponse(logs, total, pageNum, limitNum),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching audit logs",
      error: error.message,
    });
  }
};

// @desc    Get audit log by ID
// @route   GET /api/audit/:id
// @access  Private (Super Admin, Admin, Manager)
exports.getAuditLog = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate("user", "username email")
      .populate("entity", "name");

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { log },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching audit log",
      error: error.message,
    });
  }
};

module.exports = exports;
