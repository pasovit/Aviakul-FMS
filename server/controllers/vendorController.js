const Vendor = require("../models/Vendor");
const { logAction } = require("../middleware/audit");

// Get all vendors with filters
exports.getVendors = async (req, res) => {
  try {
    const { category, isActive, search } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    // Build query
    let query = {};

    // Apply entity-scoped access for non-admins
    if (userRole === "employee" || userRole === "observer") {
      query.entity = userEntity;
    } else if (req.query.entity) {
      query.entity = req.query.entity;
    }

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { vendorCode: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query)
      .populate("entity", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message,
    });
  }
};

// Get single vendor by ID
exports.getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .populate("entity", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Check entity access
    const userRole = req.user.role;
    const userEntity = req.user.entity?.toString();
    if (
      (userRole === "employee" || userRole === "observer") &&
      vendor.entity.toString() !== userEntity
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this vendor",
      });
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor",
      error: error.message,
    });
  }
};

// Create new vendor
exports.createVendor = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin and accountant can create vendors
    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to create vendor",
      });
    }

    // Check for duplicate vendor name
    const existingVendor = await Vendor.findOne({
      entity: req.body.entity,
      name: req.body.name,
      isActive: true,
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this name already exists for this entity",
      });
    }

    const vendor = await Vendor.create({
      ...req.body,
      createdBy: userId,
    });

    await logAction(
      userId,
      "CREATE",
      "Vendor",
      vendor._id,
      null,
      vendor.toObject(),
      req
    );

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Error creating vendor:", error);
    res.status(400).json({
      success: false,
      message: "Failed to create vendor",
      error: error.message,
    });
  }
};

// Update vendor
exports.updateVendor = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin and accountant can update vendors
    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to update vendor",
      });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const oldData = vendor.toObject();

    // Prevent changing currentOutstanding directly
    if (
      req.body.currentOutstanding !== undefined &&
      req.body.currentOutstanding !== vendor.currentOutstanding
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot directly modify outstanding balance. Use invoice/payment operations.",
      });
    }

    // Update vendor
    Object.assign(vendor, req.body, { updatedBy: userId });
    await vendor.save();

    await logAction(
      userId,
      "UPDATE",
      "Vendor",
      vendor._id,
      oldData,
      vendor.toObject(),
      req
    );

    res.json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(400).json({
      success: false,
      message: "Failed to update vendor",
      error: error.message,
    });
  }
};

// Delete vendor (soft delete)
exports.deleteVendor = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can delete vendors
    if (userRole !== "admin" && userRole !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to delete vendor",
      });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Check for outstanding balance
    if (vendor.currentOutstanding > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete vendor with outstanding balance. Clear all dues first.",
      });
    }

    const oldData = vendor.toObject();
    vendor.isActive = false;
    vendor.updatedBy = userId;
    await vendor.save();

    await logAction(
      userId,
      "DELETE",
      "Vendor",
      vendor._id,
      oldData,
      { isActive: false },
      req
    );

    res.json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete vendor",
      error: error.message,
    });
  }
};

// Get vendor outstanding summary
exports.getVendorOutstanding = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    let match = { isActive: true };

    if (userRole === "employee" || userRole === "observer") {
      match.entity = userEntity;
    } else if (req.query.entity) {
      match.entity = require("mongoose").Types.ObjectId(req.query.entity);
    }

    const summary = await Vendor.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$category",
          totalVendors: { $sum: 1 },
          totalOutstanding: { $sum: "$currentOutstanding" },
          totalCreditLimit: { $sum: "$creditLimit" },
          averageOutstanding: { $avg: "$currentOutstanding" },
        },
      },
      {
        $sort: { totalOutstanding: -1 },
      },
    ]);

    const overall = await Vendor.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalVendors: { $sum: 1 },
          activeVendors: { $sum: { $cond: ["$isActive", 1, 0] } },
          totalOutstanding: { $sum: "$currentOutstanding" },
          totalCreditLimit: { $sum: "$creditLimit" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        byCategory: summary,
        overall: overall[0] || {
          totalVendors: 0,
          activeVendors: 0,
          totalOutstanding: 0,
          totalCreditLimit: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching vendor outstanding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor outstanding summary",
      error: error.message,
    });
  }
};
