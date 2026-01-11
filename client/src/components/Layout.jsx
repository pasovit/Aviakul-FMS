import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiHome, FiUser, FiLogOut, FiSettings } from "react-icons/fi";
import {
  FaUniversity,
  FaExchangeAlt,
  FaTruck,
  FaUsers,
  FaFileInvoice,
  FaMoneyBillWave,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "./Layout.css";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  const navItems = [
    { path: "/dashboard", icon: <FiHome />, label: "Dashboard" },
    { path: "/bank-accounts", icon: <FaUniversity />, label: "Bank Accounts" },
    { path: "/transactions", icon: <FaExchangeAlt />, label: "Transactions" },
    { path: "/vendors", icon: <FaTruck />, label: "Vendors" },
    { path: "/customers", icon: <FaUsers />, label: "Customers" },
    { path: "/invoices", icon: <FaFileInvoice />, label: "Invoices" },
    { path: "/payments", icon: <FaMoneyBillWave />, label: "Payments" },
    { path: "/profile", icon: <FiUser />, label: "Profile" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Aviakul FMS</h2>
          <p className="user-info">{user?.fullName || user?.username}</p>
          <span className="user-role">{user?.role?.replace("_", " ")}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-item logout-btn">
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
