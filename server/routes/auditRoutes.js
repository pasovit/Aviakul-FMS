const express = require("express");
const router = express.Router();
const { getAuditLogs, getAuditLog } = require("../controllers/auditController");
const { protect, authorize } = require("../middleware/auth");

// All routes require authentication and specific roles
router.use(protect);
router.use(authorize("super_admin", "admin", "manager"));

router.get("/", getAuditLogs);
router.get("/:id", getAuditLog);

module.exports = router;
