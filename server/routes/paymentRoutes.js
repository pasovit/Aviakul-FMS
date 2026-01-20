const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const paymentController = require("../controllers/paymentController");

// All routes require authentication
router.use(protect);

// Payment CRUD routes
router.get("/", paymentController.getPayments);
router.get("/unallocated", paymentController.getUnallocatedPayments);
router.get("/summary", paymentController.getPaymentSummary);
router.get("/:id", paymentController.getPayment);
router.post("/", paymentController.createPayment);
router.put("/:id", paymentController.updatePayment);
router.delete("/:id", paymentController.deletePayment);
router.post("/:id/allocate", paymentController.allocatePayment);
router.get("/export/csv", paymentController.exportPaymentsCSV);


module.exports = router;
