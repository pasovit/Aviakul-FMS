const express = require("express");
const router = express.Router();

const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  bulkDeleteInvoices,
  bulkCancelInvoices,
  getAgingReport,
  getInvoiceSummary,
  exportCSV,
} = require("../controllers/invoiceController");

const { protect, authorize } = require("../middleware/auth");
const { auditMiddleware } = require("../middleware/audit");

router.use(protect);

// Public
router.get("/", auditMiddleware, getInvoices);
router.get("/aging-report", auditMiddleware, getAgingReport);
router.get("/summary", auditMiddleware, getInvoiceSummary);
router.get("/export/csv", auditMiddleware, exportCSV);

//  BULK ROUTES
router.post(
  "/bulk-delete",
  authorize("admin", "super_admin"),
  auditMiddleware,
  bulkDeleteInvoices
);

router.put(
  "/bulk-cancel",
  authorize("admin", "super_admin"),
  auditMiddleware,
  bulkCancelInvoices
);

// CRUD
router.get("/:id", auditMiddleware, getInvoice);

router.post(
  "/",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  createInvoice
);

router.put(
  "/:id",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  updateInvoice
);

router.delete(
  "/:id",
  authorize("admin", "super_admin"),
  auditMiddleware,
  deleteInvoice
);

module.exports = router;