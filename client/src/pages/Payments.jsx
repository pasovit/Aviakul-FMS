import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaMoneyBillWave,
  FaLink,
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
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    entity: "",
    paymentType: "",
    status: "",
    paymentMethod: "",
  });

  const [formData, setFormData] = useState({
    entity: "",
    paymentType: "payment_received",
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "bank_transfer",
    bankAccount: "",
    referenceNumber: "",
    party: "",
    partyName: "",
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
    { value: "bank_transfer", label: "Bank Transfer" },
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
    fetchPayments();
    fetchEntities();
    fetchBankAccounts();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getAll({
        ...filters,
        search: searchTerm,
      });
      setPayments(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch payments");
      console.error(error);
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
        paymentType === "payment_received"
          ? "sales_invoice"
          : "purchase_invoice";
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleOpenModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        entity: payment.entity._id || payment.entity,
        paymentType: payment.paymentType,
        paymentDate: payment.paymentDate.split("T")[0],
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        bankAccount: payment.bankAccount?._id || payment.bankAccount || "",
        referenceNumber: payment.referenceNumber || "",
        party: payment.party || "",
        partyName: payment.partyName || "",
        notes: payment.notes || "",
        chequeNumber: payment.chequeNumber || "",
        chequeDate: payment.chequeDate?.split("T")[0] || "",
        upiId: payment.upiId || "",
      });
    } else {
      setEditingPayment(null);
      setFormData({
        entity: "",
        paymentType: "payment_received",
        paymentDate: new Date().toISOString().split("T")[0],
        amount: "",
        paymentMethod: "bank_transfer",
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

    try {
      // Validation
      if (!formData.entity || !formData.amount || !formData.paymentMethod) {
        toast.error("Please fill all required fields");
        return;
      }

      if (formData.paymentMethod === "bank_transfer" && !formData.bankAccount) {
        toast.error("Please select a bank account");
        return;
      }

      if (
        formData.paymentMethod === "cheque" &&
        (!formData.chequeNumber || !formData.chequeDate)
      ) {
        toast.error("Please enter cheque details");
        return;
      }

      if (formData.paymentMethod === "upi" && !formData.upiId) {
        toast.error("Please enter UPI ID");
        return;
      }

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

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
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) {
      return;
    }

    try {
      await paymentAPI.delete(id);
      toast.success("Payment deleted successfully");
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete payment");
      console.error(error);
    }
  };

  const handleOpenAllocationModal = async (payment) => {
    try {
      await fetchUnallocatedInvoices(
        payment.entity._id || payment.entity,
        payment.paymentType
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
        (inv) => inv._id === invoice._id
      );

      if (isSelected) {
        return {
          ...prev,
          selectedInvoices: prev.selectedInvoices.filter(
            (inv) => inv._id !== invoice._id
          ),
          allocations: prev.allocations.filter(
            (alloc) => alloc.invoice !== invoice._id
          ),
        };
      } else {
        const unallocatedAmount =
          prev.payment.amount -
          prev.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
        const amountToAllocate = Math.min(
          unallocatedAmount,
          invoice.outstandingAmount
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
    setAllocationData((prev) => ({
      ...prev,
      allocations: prev.allocations.map((alloc) =>
        alloc.invoice === invoiceId
          ? { ...alloc, allocatedAmount: parseFloat(amount) || 0 }
          : alloc
      ),
    }));
  };

  const handleSaveAllocation = async () => {
    try {
      const totalAllocated = allocationData.allocations.reduce(
        (sum, a) => sum + a.allocatedAmount,
        0
      );

      if (totalAllocated > allocationData.payment.amount) {
        toast.error("Total allocated amount cannot exceed payment amount");
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
      toast.error(
        error.response?.data?.message || "Failed to allocate payment"
      );
      console.error(error);
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

  return (
    <div className="payments-page">
      <div className="page-header">
        <h1>Payments</h1>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Add Payment
        </button>
      </div>

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by reference number, party name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary btn-sm">
            Search
          </button>
        </form>

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
                {entity.entityName}
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
            <option value="payment_received">Payment Received</option>
            <option value="payment_made">Payment Made</option>
          </select>

          <select
            className="filter-select"
            value={filters.paymentMethod}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))
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
                          payment.paymentType === "payment_received"
                            ? "received"
                            : "made"
                        }`}
                      >
                        {payment.paymentType === "payment_received"
                          ? "Received"
                          : "Made"}
                      </span>
                    </td>
                    <td>{payment.partyName || "-"}</td>
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
                        (m) => m.value === payment.paymentMethod
                      )?.label || payment.paymentMethod}
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
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDelete(payment._id)}
                        title="Delete"
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
                    <label>Entity *</label>
                    <select
                      name="entity"
                      value={formData.entity}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Entity</option>
                      {entities.map((entity) => (
                        <option key={entity._id} value={entity._id}>
                          {entity.entityName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Type *</label>
                    <select
                      name="paymentType"
                      value={formData.paymentType}
                      onChange={handleChange}
                      required
                    >
                      <option value="payment_received">Payment Received</option>
                      <option value="payment_made">Payment Made</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      name="paymentDate"
                      value={formData.paymentDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount *</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Method *</label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
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

                  {formData.paymentMethod === "bank_transfer" && (
                    <div className="form-group">
                      <label>Bank Account *</label>
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

                  {formData.paymentMethod === "cheque" && (
                    <>
                      <div className="form-group">
                        <label>Cheque Number *</label>
                        <input
                          type="text"
                          name="chequeNumber"
                          value={formData.chequeNumber}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Cheque Date *</label>
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

                  {formData.paymentMethod === "upi" && (
                    <div className="form-group">
                      <label>UPI ID *</label>
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

                  <div className="form-group">
                    <label>Party Name</label>
                    <input
                      type="text"
                      name="partyName"
                      value={formData.partyName}
                      onChange={handleChange}
                      placeholder="Customer / Vendor Name"
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
                <button type="submit" className="btn-primary">
                  {editingPayment ? "Update" : "Create"} Payment
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
                        0
                      )
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
                          0
                        )
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
                          (inv) => inv._id === invoice._id
                        );
                        const allocation = allocationData.allocations.find(
                          (a) => a.invoice === invoice._id
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
                                invoice.invoiceDate
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
                                      e.target.value
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
                className="btn-primary"
                onClick={handleSaveAllocation}
                disabled={allocationData.allocations.length === 0}
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
