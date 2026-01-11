import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login, requires2FA, setRequires2FA } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    totpToken: "",
  });
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData);

      if (result.requires2FA) {
        setShow2FA(true);
        toast.info("Please enter your 2FA code");
      } else {
        toast.success("Login successful!");
        navigate("/dashboard");
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Aviakul Finance ERP</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {(show2FA || requires2FA) && (
            <div className="form-group">
              <label htmlFor="totpToken" className="form-label">
                2FA Code
              </label>
              <input
                type="text"
                id="totpToken"
                name="totpToken"
                className="form-control"
                value={formData.totpToken}
                onChange={handleChange}
                placeholder="Enter 6-digit code"
                maxLength="6"
                required
                disabled={loading}
                autoComplete="one-time-code"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-center">
            Default credentials: <strong>superadmin</strong> /{" "}
            <strong>Admin@123456</strong>
          </p>
          <p
            className="text-center"
            style={{ fontSize: "0.75rem", color: "var(--danger-color)" }}
          >
            ⚠️ Change password after first login!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
