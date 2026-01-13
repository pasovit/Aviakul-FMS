import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUniversity,
  FaWallet,
  FaSearch,
} from "react-icons/fa";
import { bankAccountAPI, entityAPI } from "../services/api";
import "./BankAccounts.css";

const BankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterType, setFilterType] = useState("");

  const [formData, setFormData] = useState({
    entity: "",
    accountName: "",
    accountType: "savings",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    branchName: "",
    currency: "INR",
    openingBalance: 0,
    openingBalanceDate: "2024-01-01",
    notes: "",
  });

  useEffect(() => {
    fetchAccounts();
    fetchEntities();
  }, [filterEntity, filterType, searchTerm]);

  const fetchAccounts = async () => {
    try {
      const params = {};
      if (filterEntity) params.entity = filterEntity;
      if (filterType) params.accountType = filterType;
      if (searchTerm) params.search = searchTerm;

      const response = await bankAccountAPI.getAll(params);
      setAccounts(response.data.data);
      console.log(response.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchEntities = async () => {
    try {
      const response = await entityAPI.getAll();
      setEntities(response.data.data);
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      entity: "",
      accountName: "",
      accountType: "savings",
      accountNumber: "",
      bankName: "",
      ifscCode: "",
      branchName: "",
      currency: "INR",
      openingBalance: 0,
      openingBalanceDate: "2024-01-01",
      notes: "",
    });
    setEditingAccount(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Convert cash account specifics
      const submitData = { ...formData };
      if (formData.accountType === "cash") {
        delete submitData.accountNumber;
        delete submitData.ifscCode;
        delete submitData.bankName;
        delete submitData.branchName;
      }

      if (editingAccount) {
        await bankAccountAPI.update(editingAccount._id, submitData);
        toast.success("Account updated successfully");
      } else {
        await bankAccountAPI.create(submitData);
        toast.success("Account created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save account");
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      entity: account.entity._id,
      accountName: account.accountName,
      accountType: account.accountType,
      accountNumber: account.accountNumber || "",
      bankName: account.bankName || "",
      ifscCode: account.ifscCode || "",
      branchName: account.branchName || "",
      currency: account.currency,
      openingBalance: account.openingBalance,
      openingBalanceDate: account.openingBalanceDate.split("T")[0],
      notes: account.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm("Are you sure you want to deactivate this account?")) {
      return;
    }

    try {
      const {data} = await bankAccountAPI.delete(accountId);
      console.log(data)
      toast.success("Account deactivated successfully");
      fetchAccounts();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to deactivate account"
      );
    }
  };

  const formatCurrency = (amount, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getAccountTypeIcon = (type) => {
    if (type === "cash") return <FaWallet />;
    return <FaUniversity />;
  };

  const getAccountTypeLabel = (type) => {
    const labels = {
      savings: "Savings",
      current: "Current",
      od: "Overdraft",
      cc: "Credit Card",
      cash: "Cash",
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="loading">Loading accounts...</div>;
  }

  return (
    <div className="bank-accounts-page">
      <div className="page-header">
        <div>
          <h1>Bank Accounts</h1>
          <p>Manage bank accounts and cash balances</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> Add Account
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="filter-select"
        >
          <option value="">All Entities</option>
          {entities.map((entity) => (
            <option key={entity._id} value={entity._id}>
              {entity.name}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="savings">Savings</option>
          <option value="current">Current</option>
          <option value="od">Overdraft</option>
          <option value="cc">Credit Card</option>
          <option value="cash">Cash</option>
        </select>
      </div>

      <div className="accounts-grid">
        {accounts.map((account) => (
          <div key={account._id} className="account-card">
            <div className="account-header">
              <div className="account-icon">
                {getAccountTypeIcon(account.accountType)}
              </div>
              <div className="account-info">
                <h3>{account.accountName}</h3>
                <span className="entity-badge">{account.entity?.name}</span>
              </div>
              <span className={`type-badge ${account.accountType}`}>
                {getAccountTypeLabel(account.accountType)}
              </span>
            </div>

            <div className="account-details">
              {account.accountNumber && (
                <div className="detail-row">
                  <span className="label">Account Number:</span>
                  <span className="value">{account.accountNumber}</span>
                </div>
              )}
              {account.bankName && (
                <div className="detail-row">
                  <span className="label">Bank:</span>
                  <span className="value">{account.bankName}</span>
                </div>
              )}
              {account.ifscCode && (
                <div className="detail-row">
                  <span className="label">IFSC:</span>
                  <span className="value">{account.ifscCode}</span>
                </div>
              )}
            </div>

            <div className="account-balance">
              <span className="balance-label">Current Balance</span>
              <span
                className={`balance-amount ${
                  account.currentBalance < 0 ? "negative" : "positive"
                }`}
              >
                {formatCurrency(account.currentBalance, account.currency)}
              </span>
            </div>

            <div className="account-actions">
              <button
                className="btn-icon"
                onClick={() => handleEdit(account)}
                title="Edit"
              >
                <FaEdit />
              </button>
              <button
                className="btn-icon danger"
                onClick={() => handleDelete(account._id)}
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="empty-state">
          <FaUniversity size={48} />
          <p>No bank accounts found</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Add Your First Account
          </button>
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAccount ? "Edit Account" : "Add Bank Account"}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="account-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Entity *</label>
                  <select
                    name="entity"
                    value={formData.entity}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Entity</option>
                    {entities.map((entity) => (
                      <option key={entity._id} value={entity._id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Type *</label>
                  <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                    <option value="od">Overdraft</option>
                    <option value="cc">Credit Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Account Name *</label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleInputChange}
                  placeholder="e.g., HDFC Savings Account"
                  required
                />
              </div>

              {formData.accountType !== "cash" && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Account Number *</label>
                      <input
                        type="text"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        placeholder="Enter account number"
                        required={formData.accountType !== "cash"}
                      />
                    </div>

                    <div className="form-group">
                      <label>IFSC Code *</label>
                      <input
                        type="text"
                        name="ifscCode"
                        value={formData.ifscCode}
                        onChange={handleInputChange}
                        placeholder="e.g., HDFC0001234"
                        required={formData.accountType !== "cash"}
                        style={{ textTransform: "uppercase" }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Bank Name *</label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        placeholder="e.g., HDFC Bank"
                        required={formData.accountType !== "cash"}
                      />
                    </div>

                    <div className="form-group">
                      <label>Branch Name</label>
                      <input
                        type="text"
                        name="branchName"
                        value={formData.branchName}
                        onChange={handleInputChange}
                        placeholder="e.g., Connaught Place"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Opening Balance Date</label>
                  <input
                    type="date"
                    name="openingBalanceDate"
                    value={formData.openingBalanceDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Opening Balance *</label>
                <input
                  type="number"
                  name="openingBalance"
                  value={formData.openingBalance}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAccount ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;
