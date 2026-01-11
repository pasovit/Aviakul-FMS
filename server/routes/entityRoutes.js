const express = require("express");
const router = express.Router();
const {
  getEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
} = require("../controllers/entityController");
const { protect, authorize } = require("../middleware/auth");
const { auditMiddleware } = require("../middleware/audit");

// All routes require authentication
router.use(protect);

router.get("/", getEntities);
router.get("/:id", getEntity);

// Admin only
router.post(
  "/",
  authorize("super_admin", "admin"),
  auditMiddleware,
  createEntity
);

router.put(
  "/:id",
  authorize("super_admin", "admin"),
  auditMiddleware,
  updateEntity
);

// Super admin only
router.delete("/:id", authorize("super_admin"), auditMiddleware, deleteEntity);

module.exports = router;
