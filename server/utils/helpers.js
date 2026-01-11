// Get client IP and user agent
exports.getClientInfo = (req) => {
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    "unknown";

  const userAgent = req.headers["user-agent"] || "unknown";

  return { ip, userAgent };
};

// Generate random string
exports.generateRandomString = (length = 32) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Format currency (INR)
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format date
exports.formatDate = (date, format = "DD/MM/YYYY") => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  if (format === "DD/MM/YYYY") {
    return `${day}/${month}/${year}`;
  } else if (format === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  } else if (format === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  }
  return date;
};

// Validate PAN number
exports.validatePAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

// Validate GSTIN
exports.validateGSTIN = (gstin) => {
  const gstinRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

// Validate email
exports.validateEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Calculate pagination
exports.getPagination = (page = 1, limit = 20) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  return { skip, limit: limitNum, page: pageNum };
};

// Build pagination response
exports.buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

// Calculate GST
exports.calculateGST = (amount, gstRate = 18, isIntraState = true) => {
  const gstAmount = (amount * gstRate) / 100;

  if (isIntraState) {
    // CGST + SGST
    return {
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: 0,
      totalGst: gstAmount,
      totalAmount: amount + gstAmount,
    };
  } else {
    // IGST
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      totalGst: gstAmount,
      totalAmount: amount + gstAmount,
    };
  }
};

// Calculate TDS
exports.calculateTDS = (amount, tdsRate) => {
  const tdsAmount = (amount * tdsRate) / 100;
  return {
    tdsAmount,
    netAmount: amount - tdsAmount,
  };
};

// Sanitize object (remove undefined, null, empty strings)
exports.sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
};

// Generate invoice number
exports.generateInvoiceNumber = (prefix, sequenceNumber, year) => {
  const paddedNumber = String(sequenceNumber).padStart(4, "0");
  return `${prefix}/${year}/${paddedNumber}`;
};

// Check if date is overdue
exports.isOverdue = (dueDate) => {
  return new Date(dueDate) < new Date();
};

// Calculate days overdue
exports.getDaysOverdue = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// Get aging bucket
exports.getAgingBucket = (dueDate) => {
  const daysOverdue = exports.getDaysOverdue(dueDate);

  if (daysOverdue === 0) return "current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  return "60+";
};

// Round to 2 decimals
exports.round = (number, decimals = 2) => {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

module.exports = exports;
