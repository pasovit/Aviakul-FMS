const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const customerController = require("../controllers/customerController");

// All routes require authentication
router.use(protect);

// Customer CRUD routes
router.get("/", customerController.getCustomers);
router.get("/outstanding", customerController.getCustomerOutstanding);
router.get("/:id", customerController.getCustomer);
router.post("/", customerController.createCustomer);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);
router.post("/:id/shipping-address", customerController.addShippingAddress);

module.exports = router;
