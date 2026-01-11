const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { getClientInfo } = require("../utils/helpers");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "24h",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private (Super Admin or Admin only)
exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      firstName,
      lastName,
      phone,
      assignedEntities,
    } = req.body;

    // Check if requester has permission
    if (req.user.role === "admin" && role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Admins cannot create Super Admin users",
      });
    }

    if (req.user.role === "admin" && role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins cannot create other Admin users",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role,
      firstName,
      lastName,
      phone,
      assignedEntities: assignedEntities || [],
    });

    // Log action
    const clientInfo = getClientInfo(req);
    await AuditLog.log({
      user: req.user._id,
      userName: req.user.username,
      action: "create",
      resource: "user",
      resourceId: user._id,
      description: `Created new user: ${username} with role: ${role}`,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password, totpToken } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username and password",
      });
    }

    // Get user with password
    const user = await User.findOne({ username: username.toLowerCase() })
      .select("+password +twoFactorSecret +activeSessions")
      .populate("assignedEntities", "name type");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (user.accountLocked) {
      const minutesRemaining = Math.ceil(
        (user.lockoutUntil - Date.now()) / 60000
      );

      const clientInfo = getClientInfo(req);
      await AuditLog.log({
        user: user._id,
        userName: user.username,
        action: "login_failed",
        resource: "auth",
        description: `Login attempt on locked account`,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: "failure",
        errorMessage: "Account locked",
      });

      return res.status(401).json({
        success: false,
        message: `Account is locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message:
          "Your account has been deactivated. Please contact administrator.",
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      // Increment login attempts
      await user.incLoginAttempts();

      const clientInfo = getClientInfo(req);
      await AuditLog.log({
        user: user._id,
        userName: user.username,
        action: "login_failed",
        resource: "auth",
        description: `Failed login attempt - invalid password`,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: "failure",
        errorMessage: "Invalid password",
      });

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // If 2FA is enabled, verify token
    if (user.twoFactorEnabled) {
      if (!totpToken || totpToken.trim() === "") {
        return res.status(200).json({
          success: true,
          requires2FA: true,
          message: "2FA verification required",
        });
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: totpToken,
        window: 2,
      });

      if (!verified) {
        await user.incLoginAttempts();

        const clientInfo = getClientInfo(req);
        await AuditLog.log({
          user: user._id,
          userName: user.username,
          action: "login_failed",
          resource: "auth",
          description: `Failed login attempt - invalid 2FA token`,
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          status: "failure",
          errorMessage: "Invalid 2FA token",
        });

        return res.status(401).json({
          success: false,
          message: "Invalid 2FA token",
        });
      }
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = generateToken(user._id);

    // Create session
    const clientInfo = getClientInfo(req);
    const jwtExpiry = process.env.JWT_EXPIRE || "24h";
    const expiryHours = parseInt(jwtExpiry.replace("h", ""));

    const session = {
      token,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + expiryHours * 60 * 60 * 1000,
    };

    // Clean up expired sessions and add new one
    user.activeSessions = user.activeSessions.filter(
      (s) => s.expiresAt > Date.now()
    );
    user.activeSessions.push(session);

    // Update last login
    user.lastLogin = Date.now();
    user.lastLoginIP = clientInfo.ip;
    user.lastLoginUserAgent = clientInfo.userAgent;

    await user.save();

    // Log successful login
    await AuditLog.log({
      user: user._id,
      userName: user.username,
      action: "login",
      resource: "auth",
      description: `Successful login`,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          twoFactorEnabled: user.twoFactorEnabled,
          assignedEntities: user.assignedEntities,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Remove current session
    const user = await User.findById(req.user._id).select("+activeSessions");
    user.activeSessions = user.activeSessions.filter(
      (s) => s.token !== req.token
    );
    await user.save();

    // Log logout
    const clientInfo = getClientInfo(req);
    await AuditLog.log({
      user: req.user._id,
      userName: req.user.username,
      action: "logout",
      resource: "auth",
      description: "User logged out",
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging out",
      error: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "assignedEntities",
      "name type"
    );

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select(
      "+password +activeSessions"
    );

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;

    // Invalidate all sessions except current
    user.activeSessions = user.activeSessions.filter(
      (s) => s.token === req.token
    );

    await user.save();

    // Log action
    const clientInfo = getClientInfo(req);
    await AuditLog.log({
      user: req.user._id,
      userName: req.user.username,
      action: "password_change",
      resource: "auth",
      description: "Password changed successfully",
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
    });

    res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Other sessions have been logged out.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};

// @desc    Setup 2FA
// @route   POST /api/auth/2fa/setup
// @access  Private
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+twoFactorSecret");

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.APP_NAME} (${user.email})`,
    });

    // Save secret (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      message: "2FA setup initiated. Scan QR code with Google Authenticator.",
      data: {
        qrCode,
        secret: secret.base32,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error setting up 2FA",
      error: error.message,
    });
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Please provide verification token",
      });
    }

    const user = await User.findById(req.user._id).select("+twoFactorSecret");

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: "Please setup 2FA first",
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token",
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    // Log action
    const clientInfo = getClientInfo(req);
    await AuditLog.log({
      user: req.user._id,
      userName: req.user.username,
      action: "2fa_enabled",
      resource: "auth",
      description: "2FA enabled successfully",
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying 2FA",
      error: error.message,
    });
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
exports.disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: "Please provide password and current 2FA token",
      });
    }

    const user = await User.findById(req.user._id).select(
      "+password +twoFactorSecret"
    );

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: "Invalid 2FA token",
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    // Log action
    const clientInfo = getClientInfo(req);
    await AuditLog.log({
      user: req.user._id,
      userName: req.user.username,
      action: "2fa_disabled",
      resource: "auth",
      description: "2FA disabled",
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error disabling 2FA",
      error: error.message,
    });
  }
};

module.exports = exports;
