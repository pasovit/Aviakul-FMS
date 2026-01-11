const Entity = require("../models/Entity");
const { getPagination, buildPaginationResponse } = require("../utils/helpers");

// @desc    Get all entities
// @route   GET /api/entities
// @access  Private
exports.getEntities = async (req, res) => {
  try {
    const { page, limit, type, search, isActive } = req.query;
    const { skip, limit: limitNum, page: pageNum } = getPagination(page, limit);

    // Build query
    let query = {};

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Non-admin users can only see their assigned entities
    if (!["super_admin", "admin"].includes(req.user.role)) {
      query._id = { $in: req.user.assignedEntities.map((e) => e._id) };
    }

    // Get entities
    const entities = await Entity.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Entity.countDocuments(query);

    res.status(200).json({
      success: true,
      ...buildPaginationResponse(entities, total, pageNum, limitNum),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching entities",
      error: error.message,
    });
  }
};

// @desc    Get entity by ID
// @route   GET /api/entities/:id
// @access  Private
exports.getEntity = async (req, res) => {
  try {
    const entity = await Entity.findById(req.params.id);

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: "Entity not found",
      });
    }

    // Check access
    if (!["super_admin", "admin"].includes(req.user.role)) {
      const hasAccess = req.user.assignedEntities.some(
        (e) => e._id.toString() === entity._id.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this entity",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { entity },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching entity",
      error: error.message,
    });
  }
};

// @desc    Create entity
// @route   POST /api/entities
// @access  Private (Super Admin, Admin only)
exports.createEntity = async (req, res) => {
  try {
    const entity = await Entity.create(req.body);

    res.status(201).json({
      success: true,
      message: "Entity created successfully",
      data: { entity },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating entity",
      error: error.message,
    });
  }
};

// @desc    Update entity
// @route   PUT /api/entities/:id
// @access  Private (Super Admin, Admin only)
exports.updateEntity = async (req, res) => {
  try {
    const entity = await Entity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: "Entity not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Entity updated successfully",
      data: { entity },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating entity",
      error: error.message,
    });
  }
};

// @desc    Delete entity
// @route   DELETE /api/entities/:id
// @access  Private (Super Admin only)
exports.deleteEntity = async (req, res) => {
  try {
    const entity = await Entity.findByIdAndDelete(req.params.id);

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: "Entity not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Entity deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting entity",
      error: error.message,
    });
  }
};

module.exports = exports;
