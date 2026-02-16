import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { deleteWithConfirm } from "../utils/deleteWithConfirm";
import RequiredStar from "../components/RequiredStar";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaMoneyBillWave,
  FaLink,
  FaFileExport,
} from "react-icons/fa";
import {
  paymentAPI,
  invoiceAPI,
  bankAccountAPI,
  entityAPI,
  customerAPI,
  vendorAPI,
} from "../services/api";
import "./Payments.css";

const Payments = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [filters, setFilters] = useState({
    entity: "",
    paymentType: "",
    status: "",
    paymentMode: "",
    search: "",
  });

  const [formData, setFormData] = useState({
    entity: "",
    paymentType: "received",
    customer: "",
    vendor: "",
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMode: "cash",
    bankAccount: "",
    referenceNumber: "",
    notes: "",
    chequeNumber: "",
    chequeDate: "",
    upiId: "",
  });

  const [allocationData, setAllocationData] = useState({
    payment: null,
    selectedInvoices: [],
    allocations: [],
  });
  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "cheque", label: "Cheque" },
    { value: "neft", label: "NEFT" },
    { value: "rtgs", label: "RTGS" },
    { value: "imps", label: "IMPS" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
  ];

  const statusOptions = [
    { value: "pending", label: "Pending", color: "#ffc107" },
    { value: "cleared", label: "Cleared", color: "#28a745" },
    { value: "failed", label: "Failed", color: "#dc3545" },
    { value: "cancelled", label: "Cancelled", color: "#6c757d" },
  ];

  useEffect(() => {
    fetchEntities();
    fetchBankAccounts();
    fetchCustomers();
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getAll(filters);
      console.log(response.data.data);
      setPayments(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch payments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll({ isActive: "true" });
      setCustomers(response.data.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await vendorAPI.getAll({ isActive: "true" });
      setVendors(response.data.data);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    }
  };
  const fetchEntities = async () => {
    try {
      const response = await entityAPI.getAll();
      console.log(response.data.data);
      setEntities(response.data.data);
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await bankAccountAPI.getAll({ isActive: "true" });
      setBankAccounts(response.data.data);
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
    }
  };

  const fetchUnallocatedInvoices = async (entity, paymentType) => {
    try {
      const invoiceType =
        paymentType === "received" ? "sales_invoice" : "purchase_invoice";
      const response = await invoiceAPI.getAll({
        entity,
        invoiceType,
        status: "sent,overdue,partially_paid",
      });
      setInvoices(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch invoices");
      console.error(error);
    }
  };

  const handleOpenModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        entity: payment.entity._id || payment.entity,
        paymentType: payment.paymentType,
        paymentDate: payment.paymentDate.split("T")[0],
        customer: payment.customer?._id || payment.customer || "",
        vendor: payment.vendor?._id || payment.vendor || "",
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        bankAccount: payment.bankAccount?._id || payment.bankAccount || "",
        referenceNumber: payment.referenceNumber || "",
        notes: payment.notes || "",
        chequeNumber: payment.chequeNumber || "",
        chequeDate: payment.chequeDate?.split("T")[0] || "",
        upiId: payment.upiId || "",
      });
    } else {
      setEditingPayment(null);
      setFormData({
        entity: "",
        paymentType: "received",
        customer: "",
        vendor: "",
        paymentDate: new Date().toISOString().split("T")[0],
        amount: "",
        paymentMode: "cash",
        bankAccount: "",
        referenceNumber: "",
        party: "",
        partyName: "",
        notes: "",
        chequeNumber: "",
        chequeDate: "",
        upiId: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPayment(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (!formData.entity) {
        toast.error("Entity is required");
        return;
      }

      if (!formData.paymentType) {
        toast.error("Payment type is required");
        return;
      }

      if (!formData.paymentDate) {
        toast.error("Payment date is required");
        return;
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }

      if (!formData.paymentMode) {
        toast.error("Payment method is required");
        return;
      }

      if (formData.paymentType === "received" && !formData.customer) {
        toast.error("Customer is required");
        return;
      }

      if (formData.paymentType === "made" && !formData.vendor) {
        toast.error("Vendor is required");
        return;
      }

      if (formData.paymentMode !== "cash" && !formData.bankAccount) {
        toast.error("Bank account is required for non-cash payments");
        return;
      }

      if (formData.paymentMode === "cheque") {
        if (!formData.chequeNumber) {
          toast.error("Cheque number is required");
          return;
        }
        if (!formData.chequeDate) {
          toast.error("Cheque date is required");
          return;
        }
      }

      if (formData.paymentMode === "upi" && !formData.upiId) {
        toast.error("UPI ID is required");
        return;
      }

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (!payload.customer) delete payload.customer;
      if (!payload.vendor) delete payload.vendor;
      if (!payload.bankAccount) delete payload.bankAccount;

      // Remove optional empty fields
      if (!payload.chequeNumber) delete payload.chequeNumber;
      if (!payload.chequeDate) delete payload.chequeDate;
      if (!payload.upiId) delete payload.upiId;
      if (!payload.referenceNumber) delete payload.referenceNumber;
      if (!payload.notes) delete payload.notes;

      if (editingPayment) {
        await paymentAPI.update(editingPayment._id, payload);
        toast.success("Payment updated successfully");
      } else {
        await paymentAPI.create(payload);
        toast.success("Payment created successfully");
      }

      handleCloseModal();
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save payment");
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
        text: "This payment will be permanently deleted!",
        confirmText: "Delete",
        apiCall: () => paymentAPI.delete(id),
        onSuccess: fetchPayments,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAllocationModal = async (payment) => {
    try {
      await fetchUnallocatedInvoices(
        payment.entity._id || payment.entity,
        payment.paymentType,
      );

      setAllocationData({
        payment,
        selectedInvoices: [],
        allocations:
          payment.allocations?.map((a) => ({
            invoice: a.invoice._id || a.invoice,
            invoiceNumber: a.invoice.invoiceNumber,
            outstandingAmount: a.invoice.outstandingAmount,
            allocatedAmount: a.allocatedAmount,
          })) || [],
      });

      setShowAllocationModal(true);
    } catch (error) {
      toast.error("Failed to open allocation modal");
      console.error(error);
    }
  };

  const handleCloseAllocationModal = () => {
    setShowAllocationModal(false);
    setAllocationData({
      payment: null,
      selectedInvoices: [],
      allocations: [],
    });
  };

  const handleInvoiceSelection = (invoice) => {
    setAllocationData((prev) => {
      const isSelected = prev.selectedInvoices.some(
        (inv) => inv._id === invoice._id,
      );

      if (isSelected) {
        return {
          ...prev,
          selectedInvoices: prev.selectedInvoices.filter(
            (inv) => inv._id !== invoice._id,
          ),
          allocations: prev.allocations.filter(
            (alloc) => alloc.invoice !== invoice._id,
          ),
        };
      } else {
        const unallocatedAmount =
          prev.payment.amount -
          prev.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
        const amountToAllocate = Math.min(
          unallocatedAmount,
          invoice.outstandingAmount,
        );

        return {
          ...prev,
          selectedInvoices: [...prev.selectedInvoices, invoice],
          allocations: [
            ...prev.allocations,
            {
              invoice: invoice._id,
              invoiceNumber: invoice.invoiceNumber,
              outstandingAmount: invoice.outstandingAmount,
              allocatedAmount: amountToAllocate,
            },
          ],
        };
      }
    });
  };

  const handleAllocationAmountChange = (invoiceId, amount) => {
    if (parseFloat(amount) < 0) return;

    setAllocationData((prev) => ({
      ...prev,
      allocations: prev.allocations.map((alloc) =>
        alloc.invoice === invoiceId
          ? { ...alloc, allocatedAmount: parseFloat(amount) || 0 }
          : alloc,
      ),
    }));
  };

  const handleSaveAllocation = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const totalAllocated = allocationData.allocations.reduce(
        (sum, a) => sum + a.allocatedAmount,
        0,
      );

      if (totalAllocated > allocationData.payment.amount) {
        toast.error("Allocated amount exceeds payment");
        return;
      }

      await paymentAPI.allocatePayment(allocationData.payment._id, {
        allocations: allocationData.allocations.map((a) => ({
          invoice: a.invoice,
          allocatedAmount: a.allocatedAmount,
        })),
      });

      toast.success("Payment allocated successfully");
      handleCloseAllocationModal();
      fetchPayments();
    } catch (error) {
      toast.error("Failed to allocate payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return (
      <span
        className="status-badge"
        style={{ background: statusOption?.color || "#6c757d" }}
      >
        {statusOption?.label || status}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getUnallocatedAmount = (payment) => {
    const allocated =
      payment.allocations?.reduce((sum, a) => sum + a.allocatedAmount, 0) || 0;
    return payment.amount - allocated;
  };

  const handleExport = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const response = await paymentAPI.exportCSV(filters);

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();

      toast.success("Payments exported successfully");
    } catch {
      toast.error("Failed to export payments");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`payments-page ${isSubmitting ? "disabled" : ""}`}>
      <div className="page-header">
        <h1>Payments</h1>

        <div className="page-actions">
          <button
            className="payment-export-button"
            onClick={handleExport}
            disabled={isSubmitting}
          >
            <FaFileExport /> Export CSV
          </button>

          <button className="add-payment" onClick={() => handleOpenModal()}>
            <FaPlus /> Add Payment
          </button>
        </div>
      </div>

      <div className="filters-section">
        <form className="search-form">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="search"
              className="search-input"
              placeholder="Search by reference number, party name..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>

          <div className="filter-controls">
            <select
              className="filter-select"
              value={filters.entity}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, entity: e.target.value }))
              }
            >
              <option value="">All Entities</option>
              {entities.map((entity) => (
                <option key={entity._id} value={entity._id}>
                  {entity.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filters.paymentType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, paymentType: e.target.value }))
              }
            >
              <option value="">All Types</option>
              <option value="received">Payment Received</option>
              <option value="made">Payment Made</option>
            </select>

            <select
              className="filter-select"
              value={filters.paymentMode}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentMode: e.target.value,
                }))
              }
            >
              <option value="">All Methods</option>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">All Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading">Loading payments...</div>
      ) : (
        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Payment Number</th>
                <th>Date</th>
                <th>Type</th>
                <th>Party</th>
                <th>Amount</th>
                <th>Unallocated</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>
                      <div className="payment-number">
                        <FaMoneyBillWave />
                        {payment.paymentNumber}
                      </div>
                    </td>
                    <td>
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className={`type-badge ${
                          payment.paymentType === "received"
                            ? "received"
                            : "made"
                        }`}
                      >
                        {payment.paymentType === "received"
                          ? "Received"
                          : "Made"}
                      </span>
                    </td>
                    <td>
                      {payment.paymentType === "received"
                        ? payment.customer?.name
                        : payment.vendor?.name}
                    </td>

                    <td className="amount">{formatCurrency(payment.amount)}</td>
                    <td className="amount">
                      <span
                        className={
                          getUnallocatedAmount(payment) > 0
                            ? "unallocated"
                            : "allocated"
                        }
                      >
                        {formatCurrency(getUnallocatedAmount(payment))}
                      </span>
                    </td>
                    <td>
                      {paymentMethods.find(
                        (m) => m.value === payment.paymentMode,
                      )?.label || payment.paymentMode}
                    </td>
                    <td>{getStatusBadge(payment.status)}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenAllocationModal(payment)}
                        title="Allocate to Invoices"
                      >
                        <FaLink />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenModal(payment)}
                        disabled={isSubmitting}
                      >
                        <FaEdit />
                      </button>

                      <button
                        className="btn-icon danger"
                        onClick={() => handleDelete(payment._id)}
                        disabled={isSubmitting}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPayment ? "Edit Payment" : "New Payment"}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                &times;
              </button>
            </div>

            <form className="payment-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Payment Details</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Entity <RequiredStar />
                    </label>
                    <select
                      name="entity"
                      value={formData.entity}
                      onChange={handleChange}
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
                    <label>
                      Payment Type <RequiredStar />
                    </label>
                    <select
                      name="paymentType"
                      value={formData.paymentType}
                      onChange={handleChange}
                      disabled={editingPayment}
                      required
                    >
                      <option value="received">Payment Received</option>
                      <option value="made">Payment Made</option>
                    </select>
                  </div>
                </div>
                {formData.paymentType === "received" && (
                  <div className="form-group">
                    <label>
                      Customer <RequiredStar />
                    </label>
                    <select
                      name="customer"
                      value={formData.customer}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.paymentType === "made" && (
                  <div className="form-group">
                    <label>
                      Vendor <RequiredStar />
                    </label>
                    <select
                      name="vendor"
                      value={formData.vendor || ""}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Payment Date <RequiredStar />
                    </label>
                    <input
                      type="date"
                      name="paymentDate"
                      value={formData.paymentDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Amount <RequiredStar />
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Payment Method <RequiredStar />
                    </label>
                    <select
                      name="paymentMode"
                      value={formData.paymentMode}
                      onChange={handleChange}
                      required
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.paymentMode !== "cash" && (
                    <div className="form-group">
                      <label>
                        Bank Account <RequiredStar />
                      </label>
                      <select
                        name="bankAccount"
                        value={formData.bankAccount}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Bank Account</option>
                        {bankAccounts.map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.accountName} - {account.accountNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.paymentMode === "cheque" && (
                    <>
                      <div className="form-group">
                        <label>
                          Cheque Number <RequiredStar />
                        </label>
                        <input
                          type="text"
                          name="chequeNumber"
                          value={formData.chequeNumber}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Cheque Date <RequiredStar />
                        </label>
                        <input
                          type="date"
                          name="chequeDate"
                          value={formData.chequeDate}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </>
                  )}

                  {formData.paymentMode === "upi" && (
                    <div className="form-group">
                      <label>
                        UPI ID <RequiredStar />
                      </label>
                      <input
                        type="text"
                        name="upiId"
                        value={formData.upiId}
                        onChange={handleChange}
                        placeholder="user@upi"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      name="referenceNumber"
                      value={formData.referenceNumber}
                      onChange={handleChange}
                      placeholder="Transaction ID / Reference"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payments-create"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : editingPayment
                      ? "Update"
                      : "Create"}{" "}
                  Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocationModal && (
        <div className="modal-overlay" onClick={handleCloseAllocationModal}>
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                Allocate Payment - {allocationData.payment?.paymentNumber}
              </h2>
              <button
                className="close-btn"
                onClick={handleCloseAllocationModal}
              >
                &times;
              </button>
            </div>

            <div className="allocation-form">
              <div className="payment-summary">
                <div className="summary-item">
                  <span className="label">Payment Amount:</span>
                  <span className="value">
                    {formatCurrency(allocationData.payment?.amount || 0)}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Total Allocated:</span>
                  <span className="value">
                    {formatCurrency(
                      allocationData.allocations.reduce(
                        (sum, a) => sum + a.allocatedAmount,
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Unallocated:</span>
                  <span className="value unallocated">
                    {formatCurrency(
                      allocationData.payment?.amount -
                        allocationData.allocations.reduce(
                          (sum, a) => sum + a.allocatedAmount,
                          0,
                        ),
                    )}
                  </span>
                </div>
              </div>

              <div className="invoices-list">
                <h3>Available Invoices</h3>
                <table className="allocation-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>Select</th>
                      <th>Invoice Number</th>
                      <th>Date</th>
                      <th>Outstanding</th>
                      <th>Allocate Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          No outstanding invoices found
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => {
                        const isSelected = allocationData.selectedInvoices.some(
                          (inv) => inv._id === invoice._id,
                        );
                        const allocation = allocationData.allocations.find(
                          (a) => a.invoice === invoice._id,
                        );

                        return (
                          <tr
                            key={invoice._id}
                            className={isSelected ? "selected" : ""}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleInvoiceSelection(invoice)}
                              />
                            </td>
                            <td>{invoice.invoiceNumber}</td>
                            <td>
                              {new Date(
                                invoice.invoiceDate,
                              ).toLocaleDateString()}
                            </td>
                            <td className="amount">
                              {formatCurrency(invoice.outstandingAmount)}
                            </td>
                            <td>
                              {isSelected && (
                                <input
                                  type="number"
                                  value={allocation?.allocatedAmount || 0}
                                  onChange={(e) =>
                                    handleAllocationAmountChange(
                                      invoice._id,
                                      e.target.value,
                                    )
                                  }
                                  step="0.01"
                                  min="0"
                                  max={invoice.outstandingAmount}
                                  style={{ width: "150px" }}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {allocationData.allocations.length > 0 && (
                <div className="existing-allocations">
                  <h3>Current Allocations</h3>
                  <table className="allocation-table">
                    <thead>
                      <tr>
                        <th>Invoice Number</th>
                        <th>Outstanding</th>
                        <th>Allocated Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationData.allocations.map((allocation, index) => (
                        <tr key={index}>
                          <td>{allocation.invoiceNumber}</td>
                          <td className="amount">
                            {formatCurrency(allocation.outstandingAmount)}
                          </td>
                          <td className="amount allocated">
                            {formatCurrency(allocation.allocatedAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCloseAllocationModal}
              >
                Cancel
              </button>
              <button
                className="payments-create"
                onClick={handleSaveAllocation}
                disabled={
                  isSubmitting || allocationData.allocations.length === 0
                }
              >
                Save Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
