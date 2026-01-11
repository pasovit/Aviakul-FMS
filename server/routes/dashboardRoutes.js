const express = require("express");
const {
  getDashboardStats,
  getCategoryBreakdown,
  getMonthlyTrends,
  getEntitySummary,
  getARAPSummary,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");
const { auditMiddleware } = require("../middleware/audit");

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Dashboard routes
router.get("/stats", auditMiddleware, getDashboardStats);
router.get("/category-breakdown", auditMiddleware, getCategoryBreakdown);
router.get("/monthly-trends", auditMiddleware, getMonthlyTrends);
router.get("/entity-summary", auditMiddleware, getEntitySummary);
router.get("/ar-ap-summary", auditMiddleware, getARAPSummary);

module.exports = router;
