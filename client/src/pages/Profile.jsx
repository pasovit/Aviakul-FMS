import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { FiShield, FiLock, FiUser } from "react-icons/fi";
import "./Profile.css";

const Profile = () => {
  const { user, changePassword, setup2FA, verify2FA, disable2FA, updateUser } =
    useAuth();
  const [activeTab, setActiveTab] = useState("info");

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA state
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [disableData, setDisableData] = useState({
    password: "",
    token: "",
  });

  // Handle password change
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle 2FA setup
  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const data = await setup2FA();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      toast.success("Scan the QR code with Google Authenticator");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to setup 2FA");
    } finally {
      setTwoFALoading(false);
    }
  };

  // Handle 2FA verification
  const handleVerify2FA = async (e) => {
    e.preventDefault();

    if (!totpToken || totpToken.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setTwoFALoading(true);
    try {
      await verify2FA(totpToken);
      toast.success("2FA enabled successfully");
      setQrCode(null);
      setSecret(null);
      setTotpToken("");
      await updateUser();
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid verification code");
    } finally {
      setTwoFALoading(false);
    }
  };

  // Handle 2FA disable
  const handleDisable2FA = async (e) => {
    e.preventDefault();

    setTwoFALoading(true);
    try {
      await disable2FA(disableData);
      toast.success("2FA disabled successfully");
      setDisableData({ password: "", token: "" });
      await updateUser();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to disable 2FA");
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile Settings</h1>
        <p className="text-muted">Manage your account settings and security</p>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          <FiUser /> Account Info
        </button>
        <button
          className={`tab-btn ${activeTab === "password" ? "active" : ""}`}
          onClick={() => setActiveTab("password")}
        >
          <FiLock /> Change Password
        </button>
        <button
          className={`tab-btn ${activeTab === "2fa" ? "active" : ""}`}
          onClick={() => setActiveTab("2fa")}
        >
          <FiShield /> Two-Factor Auth
        </button>
      </div>

      <div className="profile-content">
        {/* Account Info Tab */}
        {activeTab === "info" && (
          <div className="card">
            <h2 className="card-title">Account Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Username</label>
                <div className="info-value">{user?.username}</div>
              </div>
              <div className="info-item">
                <label>Email</label>
                <div className="info-value">{user?.email}</div>
              </div>
              <div className="info-item">
                <label>Full Name</label>
                <div className="info-value">{user?.fullName || "Not set"}</div>
              </div>
              <div className="info-item">
                <label>Phone</label>
                <div className="info-value">{user?.phone || "Not set"}</div>
              </div>
              <div className="info-item">
                <label>Role</label>
                <div className="info-value">
                  <span className="badge badge-info">
                    {user?.role?.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <label>2FA Status</label>
                <div className="info-value">
                  {user?.twoFactorEnabled ? (
                    <span className="badge badge-success">Enabled</span>
                  ) : (
                    <span className="badge badge-warning">Disabled</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Tab */}
        {activeTab === "password" && (
          <div className="card">
            <h2 className="card-title">Change Password</h2>
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword" className="form-label">
                  Current Password
                </label> 
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  className="form-control"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  className="form-control"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  disabled={passwordLoading}
                  minLength="8"
                />
                <small className="form-text">
                  Must be at least 8 characters with uppercase, lowercase,
                  number, and special character
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-control"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  disabled={passwordLoading}
                />
              </div>

              <button
                type="submit"
                className="Change-password"
                disabled={passwordLoading}
              >
                {passwordLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        )}

        {/* 2FA Tab */}
        {activeTab === "2fa" && (
          <div className="card">
            <h2 className="card-title">Two-Factor Authentication</h2>

            {!user?.twoFactorEnabled ? (
              // Enable 2FA
              <div className="twofa-setup">
                <div className="alert alert-info">
                  <strong>Enhance your account security</strong>
                  <p>
                    Two-factor authentication adds an extra layer of security to
                    your account.
                  </p>
                </div>

                {!qrCode ? (
                  <button
                    onClick={handleSetup2FA}
                    className="two-factor-auth"
                    disabled={twoFALoading}
                  >
                    {twoFALoading ? "Setting up..." : "Enable 2FA"}
                  </button>
                ) : (
                  <div className="qr-setup">
                    <h3>Scan QR Code</h3>
                    <p>Scan this QR code with Google Authenticator app:</p>
                    <div className="qr-code">
                      <img src={qrCode} alt="QR Code" />
                    </div>
                    <p className="text-muted">
                      Or enter this secret key manually:
                    </p>
                    <code className="secret-code">{secret}</code>

                    <form onSubmit={handleVerify2FA} className="verify-form">
                      <div className="form-group">
                        <label htmlFor="totpToken" className="form-label">
                          Enter 6-digit code from app
                        </label>
                        <input
                          type="text"
                          id="totpToken"
                          className="form-control"
                          value={totpToken}
                          onChange={(e) => setTotpToken(e.target.value)}
                          maxLength="6"
                          placeholder="000000"
                          required
                          disabled={twoFALoading}
                        />
                      </div>
                      <button
                        type="submit"
                        className="two-factor-auth"
                        disabled={twoFALoading}
                      >
                        {twoFALoading ? "Verifying..." : "Verify and Enable"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              // Disable 2FA
              <div className="twofa-disable">
                <div className="alert alert-success">
                  <strong>2FA is currently enabled</strong>
                  <p>
                    Your account is protected with two-factor authentication.
                  </p>
                </div>

                <h3>Disable 2FA</h3>
                <p className="text-muted">
                  Enter your password and current 2FA code to disable:
                </p>

                <form onSubmit={handleDisable2FA} className="disable-form">
                  <div className="form-group">
                    <label htmlFor="disablePassword" className="form-label">
                      Password
                    </label>
                    <input
                      type="password"
                      id="disablePassword"
                      className="form-control"
                      value={disableData.password}
                      onChange={(e) =>
                        setDisableData({
                          ...disableData,
                          password: e.target.value,
                        })
                      }
                      required
                      disabled={twoFALoading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="disableToken" className="form-label">
                      2FA Code
                    </label>
                    <input
                      type="text"
                      id="disableToken"
                      className="form-control"
                      value={disableData.token}
                      onChange={(e) =>
                        setDisableData({
                          ...disableData,
                          token: e.target.value,
                        })
                      }
                      maxLength="6"
                      required
                      disabled={twoFALoading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={twoFALoading}
                  >
                    {twoFALoading ? "Disabling..." : "Disable 2FA"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
