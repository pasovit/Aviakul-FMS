import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dashboardAPI } from "../services/api";
import { toast } from "react-toastify";
import "./Dashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [arapStats, setArapStats] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchARAPStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchARAPStats = async () => {
    try {
      const response = await dashboardAPI.getARAPSummary();
      setArapStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch AR/AP stats:", error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getTotalBalance = () => {
    if (!stats || !stats.balances) return 0;
    return stats.balances.INR?.total || 0;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {user?.fullName || user?.username}!</h1>
        <p className="text-muted">Financial Management System</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#dbeafe" }}>
            <span style={{ color: "#1e40af" }}>₹</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Balance</p>
            <h3 className="stat-value">{formatCurrency(getTotalBalance())}</h3>
            <p className="stat-change positive">
              {stats?.accounts?.length || 0} accounts
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#d1fae5" }}>
            <span style={{ color: "#065f46" }}>↑</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Income</p>
            <h3 className="stat-value">
              {formatCurrency(stats?.transactions?.income || 0)}
            </h3>
            <p className="stat-change positive">This period</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#fee2e2" }}>
            <span style={{ color: "#991b1b" }}>↓</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Expenses</p>
            <h3 className="stat-value">
              {formatCurrency(stats?.transactions?.expense || 0)}
            </h3>
            <p className="stat-change">This period</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "#fef3c7" }}>
            <span style={{ color: "#92400e" }}>📊</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Net Position</p>
            <h3 className="stat-value">
              {formatCurrency(stats?.transactions?.net || 0)}
            </h3>
            <p className="stat-change">
              {stats?.pendingCount || 0} pending txns
            </p>
          </div>
        </div>
      </div>

      {/* AR/AP Summary */}
      {arapStats && (
        <div className="stats-grid" style={{ marginTop: "24px" }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: "#dcfce7" }}>
              <span style={{ color: "#166534" }}>📥</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Accounts Receivable</p>
              <h3 className="stat-value">
                {formatCurrency(arapStats.accountsReceivable?.total || 0)}
              </h3>
              <p
                className="stat-change"
                style={{
                  color:
                    arapStats.accountsReceivable?.overdueCount > 0
                      ? "#dc3545"
                      : "#28a745",
                }}
              >
                {arapStats.accountsReceivable?.overdueCount || 0} overdue
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: "#fee2e2" }}>
              <span style={{ color: "#991b1b" }}>📤</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Accounts Payable</p>
              <h3 className="stat-value">
                {formatCurrency(arapStats.accountsPayable?.total || 0)}
              </h3>
              <p
                className="stat-change"
                style={{
                  color:
                    arapStats.accountsPayable?.overdueCount > 0
                      ? "#dc3545"
                      : "#28a745",
                }}
              >
                {arapStats.accountsPayable?.overdueCount || 0} overdue
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: "#fef3c7" }}>
              <span style={{ color: "#92400e" }}>⚠️</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Overdue</p>
              <h3 className="stat-value">
                {formatCurrency(
                  (arapStats.accountsReceivable?.overdue || 0) +
                    (arapStats.accountsPayable?.overdue || 0)
                )}
              </h3>
              <p className="stat-change">
                AR: {formatCurrency(arapStats.accountsReceivable?.overdue || 0)}{" "}
                | AP: {formatCurrency(arapStats.accountsPayable?.overdue || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Overdue Tables */}
      {arapStats &&
        (arapStats.topOverdueCustomers?.length > 0 ||
          arapStats.topOverdueVendors?.length > 0) && (
          <div className="overdue-section">
            {arapStats.topOverdueCustomers?.length > 0 && (
              <div className="card">
                <h2 className="card-title">Top Overdue Customers</h2>
                <div className="transactions-list">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ textAlign: "left", padding: "0.75rem" }}>
                          Customer
                        </th>
                        <th style={{ textAlign: "right", padding: "0.75rem" }}>
                          Outstanding
                        </th>
                        <th style={{ textAlign: "center", padding: "0.75rem" }}>
                          Invoices
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {arapStats.topOverdueCustomers.map((item, index) => (
                        <tr
                          key={index}
                          style={{ borderBottom: "1px solid #f0f0f0" }}
                        >
                          <td style={{ padding: "0.75rem" }}>
                            {item.customer.name}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              color: "#dc3545",
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(item.outstanding)}
                          </td>
                          <td
                            style={{ padding: "0.75rem", textAlign: "center" }}
                          >
                            <span className="badge">{item.invoiceCount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {arapStats.topOverdueVendors?.length > 0 && (
              <div className="card">
                <h2 className="card-title">Top Overdue Vendors</h2>
                <div className="transactions-list">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ textAlign: "left", padding: "0.75rem" }}>
                          Vendor
                        </th>
                        <th style={{ textAlign: "right", padding: "0.75rem" }}>
                          Outstanding
                        </th>
                        <th style={{ textAlign: "center", padding: "0.75rem" }}>
                          Invoices
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {arapStats.topOverdueVendors.map((item, index) => (
                        <tr
                          key={index}
                          style={{ borderBottom: "1px solid #f0f0f0" }}
                        >
                          <td style={{ padding: "0.75rem" }}>
                            {item.vendor.name}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              color: "#dc3545",
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(item.outstanding)}
                          </td>
                          <td
                            style={{ padding: "0.75rem", textAlign: "center" }}
                          >
                            <span className="badge">{item.invoiceCount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      {stats?.recentTransactions && stats.recentTransactions.length > 0 && (
        <div className="card">
          <h2 className="card-title">Recent Transactions</h2>
          <div className="transactions-list">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem" }}>
                    Date
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem" }}>
                    Entity
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem" }}>
                    Party
                  </th>
                  <th style={{ textAlign: "right", padding: "0.75rem" }}>
                    Amount
                  </th>
                  <th style={{ textAlign: "center", padding: "0.75rem" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions.slice(0, 5).map((txn) => (
                  <tr
                    key={txn._id}
                    style={{ borderBottom: "1px solid #f0f0f0" }}
                  >
                    <td style={{ padding: "0.75rem" }}>
                      {new Date(txn.transactionDate).toLocaleDateString(
                        "en-IN"
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{txn.entity?.name}</td>
                    <td style={{ padding: "0.75rem" }}>{txn.partyName}</td>
                    <td
                      style={{
                        padding: "0.75rem",
                        textAlign: "right",
                        fontWeight: 600,
                        color: txn.type === "income" ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {formatCurrency(txn.totalAmount)}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.85rem",
                          backgroundColor:
                            txn.status === "paid" ? "#d4edda" : "#fff3cd",
                          color: txn.status === "paid" ? "#155724" : "#856404",
                        }}
                      >
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <div className="card">
          <h2 className="card-title">
            Phase 0 - Authentication & Foundation ✅
          </h2>
          <div className="features-list">
            <div className="feature-item completed">
              <span className="feature-icon">✓</span>
              <div>
                <h4>User Authentication</h4>
                <p>JWT-based authentication with secure login/logout</p>
              </div>
            </div>
            <div className="feature-item completed">
              <span className="feature-icon">✓</span>
              <div>
                <h4>Two-Factor Authentication</h4>
                <p>TOTP-based 2FA with Google Authenticator support</p>
              </div>
            </div>
            <div className="feature-item completed">
              <span className="feature-icon">✓</span>
              <div>
                <h4>Role-Based Access Control</h4>
                <p>5 roles: Super Admin, Admin, Manager, Employee, Observer</p>
              </div>
            </div>
            <div className="feature-item completed">
              <span className="feature-icon">✓</span>
              <div>
                <h4>Audit Logging</h4>
                <p>Complete audit trail for all actions</p>
              </div>
            </div>
            <div className="feature-item completed">
              <span className="feature-icon">✓</span>
              <div>
                <h4>Entity Management</h4>
                <p>7 companies + 2 individuals pre-seeded</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Coming in Future Phases</h2>
          <div className="phases-list">
            <div className="phase-item">
              <h4>Phase 1 - Transactions & Bank Accounts</h4>
              <p>Bank accounts, transactions, bulk import/export</p>
            </div>
            <div className="phase-item">
              <h4>Phase 2 - Clients & Payables/Receivables</h4>
              <p>Client master, aging reports, payment tracking</p>
            </div>
            <div className="phase-item">
              <h4>Phase 3 - Invoice Management</h4>
              <p>Multi-type invoices, GST, PDF generation, email</p>
            </div>
            <div className="phase-item">
              <h4>Phase 4 - Loan Management</h4>
              <p>Loans with daily interest accrual, repayments</p>
            </div>
            <div className="phase-item">
              <h4>Phase 5 - Reports & Hardening</h4>
              <p>Financial reports, exports, security hardening</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Your Account Information</h3>
        <div className="account-info">
          <div className="info-row">
            <span className="info-label">Username:</span>
            <span className="info-value">{user?.username}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Role:</span>
            <span className="info-value">
              <span className="badge badge-info">
                {user?.role?.replace("_", " ").toUpperCase()}
              </span>
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">2FA Status:</span>
            <span className="info-value">
              {user?.twoFactorEnabled ? (
                <span className="badge badge-success">Enabled</span>
              ) : (
                <span className="badge badge-warning">Disabled</span>
              )}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Assigned Entities:</span>
            <span className="info-value">
              {user?.assignedEntities?.length || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
