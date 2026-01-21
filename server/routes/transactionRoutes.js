const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkUpdateStatus,
  exportToExcel,
  importPreview,
  importCommit,
  exportCSV
} = require("../controllers/transactionController");
const { protect, authorize } = require("../middleware/auth");
const { auditMiddleware } = require("../middleware/audit");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "import-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv" // CSV
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel or CSV files are allowed"), false);
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Apply authentication to all routes
router.use(protect);

// Public routes (all authenticated users)
router.get("/", auditMiddleware, getTransactions);
router.get("/export", auditMiddleware, exportToExcel);
router.get("/:id", auditMiddleware, getTransaction);
router.get("/export/csv",auditMiddleware,exportCSV);

// Admin+ routes
router.post(
  "/",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  createTransaction
);
router.put(
  "/:id",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  updateTransaction
);
router.delete(
  "/:id",
  authorize("admin", "super_admin"),
  auditMiddleware,
  deleteTransaction
);

// Bulk operations
router.post(
  "/bulk-update",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  bulkUpdateStatus
);

// Import/Export
router.post(
  "/import/preview",
  authorize("admin", "manager", "super_admin"),
  upload.single("file"),
  importPreview
);
router.post(
  "/import/commit",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  importCommit
);

module.exports = router;
