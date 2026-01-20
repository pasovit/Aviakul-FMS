const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Vendor = require("../models/Vendor");
const { logAction } = require("../middleware/audit");
const mongoose = require("mongoose");

const { Parser } = require("json2csv");

// Get all invoices with filters
exports.getInvoices = async (req, res) => {
  try {
    const {
      invoiceType,
      status,
      paymentStatus,
      agingBucket,
      search,
      page = 1,
      limit = 50,
    } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    // Build query
    let query = {};

    // Apply entity-scoped access
    if (userRole === "employee" || userRole === "observer") {
      query.entity = userEntity;
    } else if (req.query.entity) {
      query.entity = req.query.entity;
    }

    if (invoiceType) query.invoiceType = invoiceType;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (agingBucket) query.agingBucket = agingBucket;
    if (search) {
      query.$or = [{ invoiceNumber: { $regex: search, $options: "i" } }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Invoice.countDocuments(query);

    const invoices = await Invoice.find(query)
      .populate("entity", "name")
      .populate("customer", "name customerCode")
      .populate("vendor", "name vendorCode")
      .populate("createdBy", "name email")
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: invoices.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: invoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
};

// Get single invoice by ID
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("entity", "name")
      .populate("customer", "name customerCode email phone billingAddress")
      .populate("vendor", "name vendorCode email phone address")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Check entity access
    const userRole = req.user.role;
    const userEntity = req.user.entity?.toString();
    if (
      (userRole === "employee" || userRole === "observer") &&
      invoice.entity.toString() !== userEntity
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this invoice",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
};

// Create new invoice
exports.createInvoice = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin and accountant can create invoices
    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to create invoice",
      });
    }

    const { invoiceType, customer, vendor, entity } = req.body;

    // Validate customer/vendor based on invoice type
    if (invoiceType === "sales" && !customer) {
      return res.status(400).json({
        success: false,
        message: "Customer is required for sales invoice",
      });
    }
    if (invoiceType === "purchase" && !vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required for purchase invoice",
      });
    }

    // Generate invoice number if not provided
    if (!req.body.invoiceNumber) {
      const invoiceDate = req.body.invoiceDate
        ? new Date(req.body.invoiceDate)
        : new Date();
      req.body.invoiceNumber = await Invoice.generateInvoiceNumber(
        entity,
        invoiceType,
        invoiceDate
      );
    }

    // Create invoice
    const invoice = await Invoice.create({
      ...req.body,
      createdBy: userId,
    });

    // Update customer/vendor outstanding
    if (invoiceType === "sales" && customer) {
      await Customer.updateOutstanding(customer, invoice.amountDue);
    } else if (invoiceType === "purchase" && vendor) {
      await Vendor.updateOutstanding(vendor, invoice.amountDue);
    }

    await logAction(
      userId,
      "CREATE",
      "Invoice",
      invoice._id,
      null,
      invoice.toObject(),
      req
    );

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(400).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message,
    });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin and accountant can update invoices
    if (userRole === "employee" || userRole === "observer") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to update invoice",
      });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Cannot update paid or cancelled invoices
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${invoice.status} invoice`,
      });
    }

    const oldData = invoice.toObject();
    const oldAmountDue = invoice.amountDue;

    // Update invoice
    Object.assign(invoice, req.body, { updatedBy: userId });
    await invoice.save();

    // Adjust customer/vendor outstanding if amount changed
    const amountChange = invoice.amountDue - oldAmountDue;
    if (amountChange !== 0) {
      if (invoice.invoiceType === "sales" && invoice.customer) {
        await Customer.updateOutstanding(invoice.customer, amountChange);
      } else if (invoice.invoiceType === "purchase" && invoice.vendor) {
        await Vendor.updateOutstanding(invoice.vendor, amountChange);
      }
    }

    await logAction(
      userId,
      "UPDATE",
      "Invoice",
      invoice._id,
      oldData,
      invoice.toObject(),
      req
    );

    res.json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(400).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message,
    });
  }
};

// Delete invoice (cancel)
exports.deleteInvoice = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can delete invoices
    if (userRole !== "admin" && userRole !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to delete invoice",
      });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Cannot delete paid invoices
    if (invoice.amountPaid > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete invoice with payments. Reverse payments first.",
      });
    }

    const oldData = invoice.toObject();

    // Update customer/vendor outstanding
    if (invoice.invoiceType === "sales" && invoice.customer) {
      await Customer.updateOutstanding(invoice.customer, -invoice.amountDue);
    } else if (invoice.invoiceType === "purchase" && invoice.vendor) {
      await Vendor.updateOutstanding(invoice.vendor, -invoice.amountDue);
    }

    invoice.status = "cancelled";
    invoice.updatedBy = userId;
    await invoice.save();

    await logAction(
      userId,
      "DELETE",
      "Invoice",
      invoice._id,
      oldData,
      { status: "cancelled" },
      req
    );

    res.json({
      success: true,
      message: "Invoice cancelled successfully",
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
};

// Get aging report
exports.getAgingReport = async (req, res) => {
  try {
    const { invoiceType } = req.query;
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    if (!invoiceType) {
      return res.status(400).json({
        success: false,
        message: "Invoice type (sales/purchase) is required",
      });
    }

    let entityId = req.query.entity;
    if (userRole === "employee" || userRole === "observer") {
      entityId = userEntity;
    }

    const report = await Invoice.aggregate([
      {
        $match: {
          entity: mongoose.Types.ObjectId(entityId),
          invoiceType: invoiceType,
          status: { $nin: ["paid", "cancelled"] },
        },
      },
      {
        $group: {
          _id: "$agingBucket",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amountDue" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get overdue invoices details
    const overdueInvoices = await Invoice.find({
      entity: entityId,
      invoiceType: invoiceType,
      status: "overdue",
    })
      .populate(invoiceType === "sales" ? "customer" : "vendor", "name")
      .select(
        "invoiceNumber invoiceDate dueDate amountDue daysOverdue agingBucket"
      )
      .sort({ daysOverdue: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        summary: report,
        topOverdueInvoices: overdueInvoices,
      },
    });
  } catch (error) {
    console.error("Error generating aging report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate aging report",
      error: error.message,
    });
  }
};

// Get invoice summary
exports.getInvoiceSummary = async (req, res) => {
  try {
    const { invoiceType, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const userEntity = req.user.entity;

    let match = {};

    if (userRole === "employee" || userRole === "observer") {
      match.entity = userEntity;
    } else if (req.query.entity) {
      match.entity = mongoose.Types.ObjectId(req.query.entity);
    }

    if (invoiceType) match.invoiceType = invoiceType;

    if (startDate && endDate) {
      match.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$amountPaid" },
          totalDue: { $sum: "$amountDue" },
        },
      },
    ]);

    const overall = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$amountPaid" },
          totalDue: { $sum: "$amountDue" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        byStatus: summary,
        overall: overall[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalDue: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching invoice summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice summary",
      error: error.message,
    });
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const { invoiceType, status, agingBucket, search, entity } = req.query;

    const userRole = req.user.role;
    const userEntity = req.user.entity;

    let query = {};

    // Entity access control
    if (userRole === "employee" || userRole === "observer") {
      query.entity = userEntity;
    } else if (entity) {
      query.entity = entity;
    }

    if (invoiceType) query.invoiceType = invoiceType;
    if (status) query.status = status;
    if (agingBucket) query.agingBucket = agingBucket;

    if (search) {
      query.$or = [{ invoiceNumber: { $regex: search, $options: "i" } }];
    }

    const invoices = await Invoice.find(query)
      .populate("entity", "name")
      .populate("customer", "name customerCode")
      .populate("vendor", "name vendorCode")
      .sort({ invoiceDate: -1 });

    const data = invoices.map((inv) => ({
      Invoice_No: inv.invoiceNumber,
      Type: inv.invoiceType,
      Entity: inv.entity?.name || "",
      Party:
        inv.invoiceType === "sales" ? inv.customer?.name : inv.vendor?.name,
      Invoice_Date: inv.invoiceDate?.toISOString().split("T")[0],
      Due_Date: inv.dueDate?.toISOString().split("T")[0],
      Subtotal: inv.subtotal || 0,
      Tax: inv.taxAmount || 0,
      Total: inv.totalAmount,
      Paid: inv.amountPaid,
      Due: inv.amountDue,
      Status: inv.status,
      Aging: inv.agingBucket,
      Created_At: inv.createdAt?.toISOString().split("T")[0],
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoices_${Date.now()}.csv`
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("CSV Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export invoices",
      error: error.message,
    });
  }
};
