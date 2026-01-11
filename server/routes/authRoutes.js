const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

// Public routes
router.post("/login", login);

// Protected routes
router.use(protect); // All routes below require authentication

router.get("/me", getMe);
router.post("/logout", logout);
router.post("/change-password", changePassword);

// 2FA routes
router.post("/2fa/setup", setup2FA);
router.post("/2fa/verify", verify2FA);
router.post("/2fa/disable", disable2FA);

// Admin routes
router.post("/register", authorize("super_admin", "admin"), register);

module.exports = router;
