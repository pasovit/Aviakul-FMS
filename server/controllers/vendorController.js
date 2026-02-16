const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");
const Entity = require("../models/Entity");
const {logAction} = require("../middleware/audit");

exports.createVendor = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // ===== ROLE CHECK =====
    if (["employee", "observer"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to create vendor",
      });
    }

    const {
      entity,
      name,
      address,
      pan,
      gstin,
      paymentTerms,
      customPaymentDays,
    } = req.body;

    // ===== REQUIRED FIELD VALIDATION =====
    if (!entity || !mongoose.Types.ObjectId.isValid(entity)) {
      return res.status(400).json({
        success: false,
        message: "Valid entity is required",
      });
    }

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vendor name is required",
      });
    }

    if (
      !address ||
      !address.line1 ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete address is required",
      });
    }

    // ===== ENTITY EXISTS CHECK =====
    const entityExists = await Entity.findById(entity);
    if (!entityExists) {
      return res.status(404).json({
        success: false,
        message: "Entity not found",
      });
    }

    // ===== DUPLICATE NAME CHECK =====
    const existingVendor = await Vendor.findOne({
      entity,
      name: name.trim(),
      isActive: true,
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this name already exists for this entity",
      });
    }

    // ===== PAN UNIQUE CHECK =====
    if (pan) {
      const existingPAN = await Vendor.findOne({
        entity,
        pan,
        isActive: true,
      });

      if (existingPAN) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this PAN already exists",
        });
      }
    }

    // ===== GST UNIQUE CHECK =====
    if (gstin) {
      const existingGST = await Vendor.findOne({
        entity,
        gstin,
        isActive: true,
      });

      if (existingGST) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this GSTIN already exists",
        });
      }
    }

    // ===== CUSTOM PAYMENT VALIDATION =====
    if (paymentTerms === "custom" && !customPaymentDays) {
      return res.status(400).json({
        success: false,
        message: "Custom payment days are required",
      });
    }

    // ===== REMOVE UNSAFE FIELDS =====
    delete req.body.vendorCode;
    delete req.body.currentOutstanding;
    delete req.body.createdBy;

    const vendor = new Vendor({
      ...req.body,
      createdBy: userId,
    });

    await vendor.save();

    await logAction(
      userId,
      "CREATE",
      "Vendor",
      vendor._id,
      null,
      vendor.toObject(),
      req,
    );

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

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

exports.updateVendor = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (["employee", "observer"].includes(userRole)) {
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

    // ===== BLOCK CRITICAL FIELD MODIFICATION =====
    if (req.body.currentOutstanding !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Outstanding balance cannot be modified directly",
      });
    }

    if (req.body.vendorCode) {
      return res.status(400).json({
        success: false,
        message: "Vendor code cannot be modified",
      });
    }

    if (
      req.body.entity &&
      req.body.entity.toString() !== vendor.entity.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Entity cannot be changed",
      });
    }

    // ===== DUPLICATE NAME CHECK (IF CHANGED) =====
    if (req.body.name && req.body.name !== vendor.name) {
      const duplicate = await Vendor.findOne({
        entity: vendor.entity,
        name: req.body.name,
        _id: { $ne: vendor._id },
        isActive: true,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this name already exists",
        });
      }
    }

    // ===== PAN DUPLICATE CHECK =====
    if (req.body.pan && req.body.pan !== vendor.pan) {
      const duplicatePAN = await Vendor.findOne({
        entity: vendor.entity,
        pan: req.body.pan,
        _id: { $ne: vendor._id },
        isActive: true,
      });

      if (duplicatePAN) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this PAN already exists",
        });
      }
    }

    // ===== GST DUPLICATE CHECK =====
    if (req.body.gstin && req.body.gstin !== vendor.gstin) {
      const duplicateGST = await Vendor.findOne({
        entity: vendor.entity,
        gstin: req.body.gstin,
        _id: { $ne: vendor._id },
        isActive: true,
      });

      if (duplicateGST) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this GSTIN already exists",
        });
      }
    }

    // ===== CUSTOM PAYMENT VALIDATION =====
    if (req.body.paymentTerms === "custom" && !req.body.customPaymentDays) {
      return res.status(400).json({
        success: false,
        message: "Custom payment days are required",
      });
    }

    Object.assign(vendor, req.body, { updatedBy: userId });

    await vendor.save();

    await logAction(
      userId,
      "UPDATE",
      "Vendor",
      vendor._id,
      oldData,
      vendor.toObject(),
      req,
    );

    res.json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Update Vendor Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
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
      req,
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
