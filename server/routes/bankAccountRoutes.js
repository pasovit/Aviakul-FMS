const express = require("express");
const {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getBalanceSummary,
} = require("../controllers/bankAccountController");
const { protect, authorize } = require("../middleware/auth");
const { auditMiddleware } = require("../middleware/audit");

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Public routes (all authenticated users)
router.get("/", auditMiddleware, getBankAccounts);
router.get("/summary/balances", auditMiddleware, getBalanceSummary);
router.get("/:id", auditMiddleware, getBankAccount);

// Admin+ routes
router.post(
  "/",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  createBankAccount
);
router.put(
  "/:id",
  authorize("admin", "manager", "super_admin"),
  auditMiddleware,
  updateBankAccount
);
router.delete(
  "/:id",
  authorize("admin", "super_admin"),
  auditMiddleware,
  deleteBankAccount
);

module.exports = router;
