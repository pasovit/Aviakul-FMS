const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const invoiceController = require("../controllers/invoiceController");

// All routes require authentication
router.use(protect);

// Invoice CRUD routes
router.get("/", invoiceController.getInvoices);
router.get("/aging-report", invoiceController.getAgingReport);
router.get("/summary", invoiceController.getInvoiceSummary);
router.get("/:id", invoiceController.getInvoice);
router.post("/", invoiceController.createInvoice);
router.put("/:id", invoiceController.updateInvoice);
router.delete("/:id", invoiceController.deleteInvoice);

module.exports = router;
