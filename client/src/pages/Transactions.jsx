import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { deleteWithConfirm } from "../utils/deleteWithConfirm";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaUpload,
  FaSearch,
  FaFilter,
  FaCog,
} from "react-icons/fa";
import {
  transactionAPI,
  bankAccountAPI,
  entityAPI,
  categoryAPI,
  subCategoryAPI,
} from "../services/api";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [tempFile, setTempFile] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const [newSubCategory, setNewSubCategory] = useState("");
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState("");

  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);

  const [activeTab, setActiveTab] = useState("category");

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
    fetchCategories();
  }, [filters]);

  const fetchCategories = async () => {
    const res = await categoryAPI.getAll();
    setCategories(res.data.data);
  };

  const fetchSubCategories = async (categoryId) => {
    const res = await subCategoryAPI.getByCategory(categoryId);
    setSubCategories(res.data.data);
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionAPI.getAll(filters);
      console.log(response);
      setTransactions(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch transactions",
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

    if (isSubmitting) return;

    try {
      if (
        !formData.entity ||
        !formData.bankAccount ||
        !formData.transactionDate ||
        !formData.type ||
        !formData.category ||
        !formData.partyName ||
        !formData.amount
      ) {
        toast.error("Please fill all mandatory fields");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(true);

      const amount = Number(formData.amount) || 0;
      const cgst = Number(formData.cgst) || 0;
      const sgst = Number(formData.sgst) || 0;
      const igst = Number(formData.igst) || 0;
      const tds = Number(formData.tdsAmount) || 0;

       if (amount <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }


      const totalAmount = amount + cgst + sgst + igst - tds;

      if (totalAmount < 1) {
        toast.error("Total amount must be greater than 0");
        return;
      }

      const submitData = {
        ...formData,
        amount,
        gstDetails: { cgst, sgst, igst },
        tdsDetails: {
          section: formData.tdsSection,
          rate: formData.tdsRate,
          amount: tds,
        },
        totalAmount,
      };

      if (editingTransaction) {
        await transactionAPI.update(editingTransaction._id, submitData);
        toast.success("Transaction updated successfully");
      } else {
        await transactionAPI.create(submitData);
        toast.success("Transaction created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save transaction",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await deleteWithConfirm({
        title: "Are you sure?",
        text: "This transaction will be permanently deleted!",
        confirmText: "Delete",
        apiCall: () => transactionAPI.delete(id),
        onSuccess: fetchTransactions,
      });
    } finally {
      setIsSubmitting(false);
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
        error.response?.data?.message || "Failed to update transactions",
      );
    }
  };

  // const handleExport = async () => {
  //   try {
  //     const response = await transactionAPI.exportToExcel(filters);
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.setAttribute("download", `transactions_${Date.now()}.xlsx`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     toast.success("Transactions exported successfully");
  //   } catch (error) {
  //     toast.error("Failed to export transactions");
  //   }
  // };

  const handleExportCSV = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const response = await transactionAPI.exportAll({
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions_${Date.now()}.csv`;
      link.click();

      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setIsSubmitting(false);
    }
  };

  //import
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsSubmitting(true);

      // ✅ PREVIEW API
      const res = await transactionAPI.importPreview(formData);

      console.log(res);

      setImportPreview(res.data.preview);
      setImportErrors(res.data.errors || []);
      setTempFile(res.data.tempFilePath);
      setShowImportModal(true);

      toast.success("File uploaded. Review before importing.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to import file");
    } finally {
      setIsSubmitting(false);
      e.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);

      const res = await transactionAPI.importCommit({
        tempFilePath: tempFile,
      });

      toast.success(
        `Imported: ${res.data.imported}, Skipped: ${res.data.skipped}`,
      );

      setShowImportModal(false);
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.message || "Import failed");
    } finally {
      setIsSubmitting(false);
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
      received: "badge-info",
    };
    return badges[status] || "badge-secondary";
  };

  const getTypeBadge = (type) => {
    const badges = {
      income: "badge-success",
      expense: "badge-danger",
      loan: "badge-danger",
      refund: "badge-info",
    };
    return badges[type] || "badge-secondary";
  };

  const handleSaveCategory = async (id) => {
    if (!newCategory.trim()) return;

    await categoryAPI.update(id, { name: newCategory });
    setEditingCategory(null);
    setNewCategory("");
    fetchCategories();
  };

  const handleSaveSubCategory = async (id) => {
    if (!newSubCategory.trim()) return;

    await subCategoryAPI.update(id, {
      name: newSubCategory,
    });

    setEditingSubCategory(null);
    setNewSubCategory("");
    fetchSubCategories(selectedCategoryForSub);
  };

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div
      className={`transactions-page ${isSubmitting ? "transactions-disabled" : ""}`}
    >
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>Manage all financial transactions</p>
        </div>
        <div className="header-actions">
          <button
            className="transaction-show-filters"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filters
          </button>
          <label className="transaction-import">
            <FaUpload /> Import CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleImportCSV}
            />
          </label>

          <button className="transaction-export" onClick={handleExportCSV}>
            <FaFileExcel /> Export CSV
          </button>
          {/* 
          <button className="transaction-export" onClick={handleExport}>
            <FaFileExcel /> Export.xlsx
          </button> */}
          <button
            className="add-transaction"
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
                          selectedIds.filter((id) => id !== txn._id),
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
                <td>{txn.category?.name}</td>
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
                  <button className="btn-icon" onClick={() => handleEdit(txn)}>
                    <FiEdit />
                  </button>
                  <button
                    className="btn-icon danger"
                    title="Delete"
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
                    <option value="loan">Loan</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Category *
                    <FaCog
                      style={{ marginLeft: 8, cursor: "pointer" }}
                      onClick={() => setShowCategoryModal(true)}
                    />
                  </label>

                  <select
                    name="category"
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        category: e.target.value,
                        subCategory: "",
                      });
                      fetchSubCategories(e.target.value);
                    }}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sub Category</label>
                  <select
                    name="subCategory"
                    value={formData.subCategory || ""}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Sub Category</option>
                    {subCategories.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
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
                  <label>Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="received">Received</option>
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
                <button
                  type="submit"
                  className="transaction-create"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : editingTransaction
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showImportModal && (
        <div className="transaction-modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Import Preview</h3>
              <button onClick={() => setShowImportModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <p>
                <b>Valid Rows:</b> {importPreview.length}
              </p>
              <p>
                <b>Errors:</b> {importErrors.length}
              </p>

              {importErrors.length > 0 && (
                <div className="error-box">
                  {importErrors.map((e, i) => (
                    <div key={i}>
                      Row {e.row}: {e.error}
                    </div>
                  ))}
                </div>
              )}

              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entity</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Party</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, i) => (
                    <tr key={i}>
                      <td>{row.Date}</td>
                      <td>{row.Entity}</td>
                      <td>{row.Type}</td>
                      <td>{row.Amount}</td>
                      <td>{row["Party Name"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </button>
              <button
                className="transaction-import"
                disabled={isSubmitting}
                onClick={handleConfirmImport}
              >
                {isSubmitting ? "Importing..." : "Confirm Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            {/* HEADER */}
            <div className="settings-modal-header">
              <h3>Manage Categories</h3>
              <button onClick={() => setShowCategoryModal(false)}>×</button>
            </div>

            {/* TABS */}
            <div className="tab-header">
              <button
                className={activeTab === "category" ? "active" : ""}
                onClick={() => setActiveTab("category")}
              >
                Categories
              </button>

              <button
                disabled={!selectedCategory}
                className={activeTab === "sub" ? "active" : ""}
              >
                Sub Categories
              </button>
            </div>

            <div className="settings-modal-body">
              {/* ================= CATEGORY TAB ================= */}
              {activeTab === "category" && (
                <>
                  <div className="add-box">
                    <input
                      placeholder="New Category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <button
                      onClick={async () => {
                        await categoryAPI.create({ name: newCategory });
                        setNewCategory("");
                        fetchCategories();
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  {categories.map((cat) => (
                    <div className="row" key={cat._id}>
                      {editingCategory === cat._id ? (
                        <div className="edit-row">
                          <input
                            className="edit-input"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveCategory(cat._id);
                            }}
                          />

                          <button
                            className="edit-save-btn"
                            onClick={() => handleSaveCategory(cat._id)}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{cat.name}</span>
                          <div className="actions">
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditingCategory(cat._id);
                                setNewCategory(cat.name);
                              }}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="sub"
                              onClick={() => {
                                setSelectedCategory(cat);
                                fetchSubCategories(cat._id);
                                setActiveTab("sub");
                              }}
                            >
                              Sub
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={async () => {
                                await categoryAPI.delete(cat._id);
                                fetchCategories();
                              }}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* ================= SUB CATEGORY TAB ================= */}
              {activeTab === "sub" && selectedCategory && (
                <>
                  <div className="transaction-subcategory-header">
                    <div>
                      <h4>Sub Categories</h4>
                      <p>
                        Category: <b>{selectedCategory.name}</b>
                      </p>
                    </div>
                    <button
                      className="back-btn"
                      onClick={() => {
                        setActiveTab("category");
                        setSelectedCategory(null);
                      }}
                    >
                      ← Back
                    </button>
                  </div>

                  <div className="add-box">
                    <input
                      placeholder="New Sub Category"
                      value={newSubCategory}
                      onChange={(e) => setNewSubCategory(e.target.value)}
                    />
                    <button
                      onClick={async () => {
                        await subCategoryAPI.create({
                          name: newSubCategory,
                          category: selectedCategory._id,
                        });
                        setNewSubCategory("");
                        fetchSubCategories(selectedCategory._id);
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  {subCategories.map((sub) => (
                    <div className="row" key={sub._id}>
                      {editingSubCategory === sub._id ? (
                        <div className="edit-row">
                          <input
                            className="edit-input"
                            value={newSubCategory}
                            onChange={(e) => setNewSubCategory(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveSubCategory(sub._id);
                            }}
                          />

                          <button
                            className="edit-save-btn"
                            onClick={() => handleSaveSubCategory(sub._id)}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{sub.name}</span>
                          <div className="actions">
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditingSubCategory(sub._id);
                                setNewSubCategory(sub.name);
                              }}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={() =>
                                subCategoryAPI
                                  .delete(sub._id)
                                  .then(() =>
                                    fetchSubCategories(selectedCategory._id),
                                  )
                              }
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
