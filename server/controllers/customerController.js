const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Entity = require("../models/Entity");
const {logAction} = require("../middleware/audit");

// Create new customer
exports.createCustomer = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Permission check
    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to create customer",
      });
    }

    const {
      entity,
      name,
      billingAddress,
      creditTerms,
      customCreditDays,
    } = req.body;

    // Required field validation
    if (
      !entity ||
      !name ||
      !billingAddress?.line1 ||
      !billingAddress?.city ||
      !billingAddress?.state ||
      !billingAddress?.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Mandatory fields are missing",
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(entity)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity ID",
      });
    }

    // Check entity exists
    const entityExists = await Entity.findById(entity);
    if (!entityExists) {
      return res.status(404).json({
        success: false,
        message: "Entity not found",
      });
    }

    // Custom credit validation
    if (creditTerms === "custom" && (!customCreditDays || customCreditDays < 0)) {
      return res.status(400).json({
        success: false,
        message: "Valid custom credit days required",
      });
    }

    // Duplicate name check
    const existingCustomer = await Customer.findOne({
      entity,
      name,
      isActive: true,
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this name already exists for this entity",
      });
    }

    const customer = await Customer.create({
      ...req.body,
      createdBy: userId,
    });

    await logAction(
      userId,
      "CREATE",
      "Customer",
      customer._id,
      null,
      customer.toObject(),
      req
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create Customer Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create customer",
    });
  }
};

// Get all customers with filters
exports.getCustomers = async (req, res) => {
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
        { customerCode: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(query)
      .populate("entity", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

// Get single customer by ID
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("entity", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check entity access
    const userRole = req.user.role;
    const userEntity = req.user.entity?.toString();
    if (
      (userRole === "employee" || userRole === "observer") &&
      customer.entity.toString() !== userEntity
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this customer",
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};



// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Permission check
    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to update customer",
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const oldData = customer.toObject();

    // Prevent protected field modification
    if (req.body.customerCode) {
      return res.status(400).json({
        success: false,
        message: "Customer code cannot be modified",
      });
    }

    if (
      req.body.entity &&
      req.body.entity.toString() !== customer.entity.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Entity cannot be changed",
      });
    }

    if (
      req.body.currentOutstanding !== undefined &&
      req.body.currentOutstanding !== customer.currentOutstanding
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot directly modify outstanding balance. Use invoice/payment operations.",
      });
    }

    // Custom credit validation
    if (
      req.body.creditTerms === "custom" &&
      (!req.body.customCreditDays || req.body.customCreditDays < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid custom credit days required",
      });
    }

    // Duplicate name check (if name is changing)
    if (req.body.name && req.body.name !== customer.name) {
      const duplicate = await Customer.findOne({
        entity: customer.entity,
        name: req.body.name,
        _id: { $ne: customer._id },
        isActive: true,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Customer with this name already exists",
        });
      }
    }

    // Assign updates
    Object.assign(customer, req.body, { updatedBy: userId });

    // Final required field validation
    if (
      !customer.entity ||
      !customer.name ||
      !customer.billingAddress?.line1 ||
      !customer.billingAddress?.city ||
      !customer.billingAddress?.state ||
      !customer.billingAddress?.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Mandatory fields cannot be empty",
      });
    }

    await customer.save();

    await logAction(
      userId,
      "UPDATE",
      "Customer",
      customer._id,
      oldData,
      customer.toObject(),
      req
    );

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update Customer Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update customer",
    });
  }
};


// Delete customer (soft delete)
exports.deleteCustomer = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can delete customers
    if (userRole !== "admin" && userRole !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to delete customer",
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check for outstanding balance
    if (customer.currentOutstanding > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete customer with outstanding balance. Clear all dues first.",
      });
    }

    const oldData = customer.toObject();
    customer.isActive = false;
    customer.updatedBy = userId;
    await customer.save();

    await logAction(
      userId,
      "DELETE",
      "Customer",
      customer._id,
      oldData,
      { isActive: false },
      req,
    );

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

// Get customer outstanding summary
exports.getCustomerOutstanding = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    let match = { isActive: true };

    if (userRole === "employee" || userRole === "observer") {
      match.entity = userEntity;
    } else if (req.query.entity) {
      match.entity = require("mongoose").Types.ObjectId(req.query.entity);
    }

    const summary = await Customer.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$category",
          totalCustomers: { $sum: 1 },
          totalOutstanding: { $sum: "$currentOutstanding" },
          totalCreditLimit: { $sum: "$creditLimit" },
          averageOutstanding: { $avg: "$currentOutstanding" },
        },
      },
      {
        $sort: { totalOutstanding: -1 },
      },
    ]);

    const overall = await Customer.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          activeCustomers: { $sum: { $cond: ["$isActive", 1, 0] } },
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
          totalCustomers: 0,
          activeCustomers: 0,
          totalOutstanding: 0,
          totalCreditLimit: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching customer outstanding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer outstanding summary",
      error: error.message,
    });
  }
};

// Add shipping address to customer
exports.addShippingAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to modify customer",
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // If this is set as default, unset others
    if (req.body.isDefault) {
      customer.shippingAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    customer.shippingAddresses.push(req.body);
    customer.updatedBy = userId;
    await customer.save();

    await logAction(
      userId,
      "UPDATE",
      "Customer",
      customer._id,
      null,
      { action: "add_shipping_address", address: req.body },
      req,
    );

    res.json({
      success: true,
      message: "Shipping address added successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Error adding shipping address:", error);
    res.status(400).json({
      success: false,
      message: "Failed to add shipping address",
      error: error.message,
    });
  }
};
