const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const vendorController = require("../controllers/vendorController");

// All routes require authentication
router.use(protect);

// Vendor CRUD routes
router.get("/", vendorController.getVendors);
router.get("/outstanding", vendorController.getVendorOutstanding);
router.get("/:id", vendorController.getVendor);
router.post("/", vendorController.createVendor);
router.put("/:id", vendorController.updateVendor);
router.delete("/:id", vendorController.deleteVendor);

module.exports = router;
