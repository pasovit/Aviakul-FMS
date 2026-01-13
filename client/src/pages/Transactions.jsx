import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaUpload,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import { transactionAPI, bankAccountAPI, entityAPI } from "../services/api";
import "./Transactions.css";
import { FiEdit } from "react-icons/fi";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [entities, setEntities] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({});

  const [filters, setFilters] = useState({
    entity: "",
    bankAccount: "",
    type: "",
    category: "",
    status: "",
    startDate: "",
    endDate: "",
    search: "",
    page: 1,
    limit: 20,
  });

  const [formData, setFormData] = useState({
    entity: "",
    bankAccount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    type: "expense",
    category: "",
    partyName: "",
    partyPAN: "",
    partyGSTIN: "",
    amount: "",
    cgst: 0,
    sgst: 0,
    igst: 0,
    tdsSection: "",
    tdsRate: 0,
    tdsAmount: 0,
    totalAmount: 10,
    paymentMethod: "neft",
    referenceNumber: "",
    invoiceNumber: "",
    invoiceDate: "",
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    fetchTransactions();
    fetchEntities();
    fetchBankAccounts();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionAPI.getAll(filters);
      setTransactions(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEntities = async () => {
    try {
      const response = await entityAPI.getAll();
      setEntities(response.data.data);
    } catch (error) {
      console.error("Failed to fetch entities");
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await bankAccountAPI.getAll();
      setBankAccounts(response.data.data);
    } catch (error) {
      console.error("Failed to fetch bank accounts");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
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
      bankAccount: "",
      transactionDate: new Date().toISOString().split("T")[0],
      type: "expense",
      category: "",
      partyName: "",
      partyPAN: "",
      partyGSTIN: "",
      amount: "",
      cgst: 0,
      sgst: 0,
      igst: 0,
      tdsSection: "",
      tdsRate: 0,
      tdsAmount: 0,
      totalAmount: 0,
      paymentMethod: "neft",
      referenceNumber: "",
      invoiceNumber: "",
      invoiceDate: "",
      status: "pending",
      notes: "",
    });
    setEditingTransaction(null);
  };

  // ** ADDED: handle edit action
const handleEdit = (transaction) => {
  setEditingTransaction(transaction);

  setFormData({
    entity: transaction.entity?._id || "",
    bankAccount: transaction.bankAccount?._id || "",
    transactionDate: transaction.transactionDate.split("T")[0],
    type: transaction.type,
    category: transaction.category,
    partyName: transaction.partyName || "",
    partyPAN: transaction.partyPAN || "",
    partyGSTIN: transaction.partyGSTIN || "",
    amount: transaction.amount,
    cgst: transaction.gstDetails?.cgst || 0,
    sgst: transaction.gstDetails?.sgst || 0,
    igst: transaction.gstDetails?.igst || 0,
    tdsSection: transaction.tdsDetails?.section || "",
    tdsRate: transaction.tdsDetails?.rate || 0,
    tdsAmount: transaction.tdsDetails?.amount || 0,
    totalAmount: transaction.totalAmount,
    paymentMethod: transaction.paymentMethod,
    referenceNumber: transaction.referenceNumber || "",
    invoiceNumber: transaction.invoiceNumber || "",
    invoiceDate: transaction.invoiceDate
      ? transaction.invoiceDate.split("T")[0]
      : "",
    status: transaction.status,
    notes: transaction.notes || "",
  });

  setShowModal(true);
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        gstDetails: {
          cgst: parseFloat(formData.cgst) || 0,
          sgst: parseFloat(formData.sgst) || 0,
          igst: parseFloat(formData.igst) || 0,
        },
        tdsDetails: {
          section: formData.tdsSection,
          rate: parseFloat(formData.tdsRate) || 0,
          amount: parseFloat(formData.tdsAmount) || 0,
        },
        amount: parseFloat(formData.amount),
      };

      if (editingTransaction) {
        await transactionAPI.update(editingTransaction._id, submitData);
        toast.success("Transaction updated successfully");
      } else {
        console.log(submitData);
        await transactionAPI.create(submitData);
        toast.success("Transaction created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save transaction"
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      await transactionAPI.delete(id);
      toast.success("Transaction deleted successfully");
      fetchTransactions();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete transaction"
      );
    }
  };

  const handleBulkUpdate = async (status) => {
    if (selectedIds.length === 0) {
      toast.warning("Please select transactions first");
      return;
    }

    try {
      await transactionAPI.bulkUpdateStatus({
        transactionIds: selectedIds,
        status,
      });
      toast.success(`${selectedIds.length} transactions marked as ${status}`);
      setSelectedIds([]);
      fetchTransactions();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update transactions"
      );
    }
  };

  const handleExport = async () => {
    try {
      const response = await transactionAPI.exportToExcel(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `transactions_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Transactions exported successfully");
    } catch (error) {
      toast.error("Failed to export transactions");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "badge-pending",
      paid: "badge-success",
      cancelled: "badge-danger",
      reconciled: "badge-info",
    };
    return badges[status] || "badge-secondary";
  };

  const getTypeBadge = (type) => {
    const badges = {
      income: "badge-success",
      expense: "badge-danger",
      transfer: "badge-info",
    };
    return badges[type] || "badge-secondary";
  };

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div className="transactions-page">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>Manage all financial transactions</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filters
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <FaFileExcel /> Export
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Add Transaction
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <input
              type="text"
              name="search"
              placeholder="Search..."
              value={filters.search}
              onChange={handleFilterChange}
            />
            <select
              name="entity"
              value={filters.entity}
              onChange={handleFilterChange}
            >
              <option value="">All Entities</option>
              {entities.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
              <option value="reconciled">Reconciled</option>
            </select>
            <input
              type="date"
              name="startDate"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
            <input
              type="date"
              name="endDate"
              placeholder="End Date"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedIds.length} selected</span>
          <button
            className="btn btn-sm"
            onClick={() => handleBulkUpdate("paid")}
          >
            Mark Paid
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handleBulkUpdate("cancelled")}
          >
            Cancel
          </button>
          <button className="btn btn-sm" onClick={() => setSelectedIds([])}>
            Clear
          </button>
        </div>
      )}

      <div className="transactions-table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(transactions.map((t) => t._id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th>Date</th>
              <th>Entity</th>
              <th>Type</th>
              <th>Category</th>
              <th>Party</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(txn._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, txn._id]);
                      } else {
                        setSelectedIds(
                          selectedIds.filter((id) => id !== txn._id)
                        );
                      }
                    }}
                  />
                </td>
                <td>{formatDate(txn.transactionDate)}</td>
                <td>{txn.entity?.name}</td>
                <td>
                  <span className={`badge ${getTypeBadge(txn.type)}`}>
                    {txn.type}
                  </span>
                </td>
                <td>{txn.category}</td>
                <td>{txn.partyName}</td>
                <td
                  className={
                    txn.type === "expense"
                      ? "amount-negative"
                      : "amount-positive"
                  }
                >
                  {formatCurrency(txn.totalAmount)}
                </td>
                <td>
                  <span className={`badge ${getStatusBadge(txn.status)}`}>
                    {txn.status}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="btn-icon"  onClick={() => handleEdit(txn)}>
                    <FiEdit />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(txn._id)}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={!pagination.hasPrev}
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Previous
          </button>
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            disabled={!pagination.hasNext}
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Next
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
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </h2>
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

            <form onSubmit={handleSubmit} className="transaction-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Entity *</label>
                  <select
                    name="entity"
                    value={formData.entity}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Entity</option>
                    {entities.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Bank Account *</label>
                  <select
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Account</option>
                    {bankAccounts
                      .filter((a) => a.entity._id === formData.entity)
                      .map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.accountName}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="transactionDate"
                    value={formData.transactionDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Party Name *</label>
                  <input
                    type="text"
                    name="partyName"
                    value={formData.partyName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="neft">NEFT</option>
                    <option value="rtgs">RTGS</option>
                    <option value="imps">IMPS</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
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
                  {editingTransaction ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
