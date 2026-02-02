import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { deleteWithConfirm } from "../utils/deleteWithConfirm";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFileInvoice,
  FaFileExport,
} from "react-icons/fa";
import { invoiceAPI, customerAPI, vendorAPI, entityAPI } from "../services/api";
import "./Invoices.css";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    entity: "",
    invoiceType: "",
    status: "",
    agingBucket: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    entity: "",
    invoiceType: "sales",
    customer: "",
    vendor: "",
    gstType: "cgst_sgst",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    lineItems: [
      { description: "", quantity: 1, unit: "nos", rate: 0, taxRate: 18 },
    ],
    cgst: 0,
    sgst: 0,
    igst: 0,
    tdsAmount: 0,
    roundOff: 0,
    notes: "",
    termsAndConditions: "",
  });

  const statusOptions = [
    { value: "draft", label: "Draft", color: "#67849d" },
    { value: "pending", label: "Pending", color: "#ffc107" },
    { value: "partially_paid", label: "Partially Paid", color: "#17a2b8" },
    { value: "paid", label: "Paid", color: "#28a745" },
    { value: "overdue", label: "Overdue", color: "#dc3545" },
    { value: "cancelled", label: "Cancelled", color: "#6c757d" },
  ];

  const agingBuckets = [
    { value: "current", label: "Current" },
    { value: "1-30", label: "1-30 Days" },
    { value: "31-60", label: "31-60 Days" },
    { value: "61-90", label: "61-90 Days" },
    { value: "90+", label: "90+ Days" },
  ];

  useEffect(() => {
    fetchInvoices();
    fetchEntities();
    fetchCustomers();
    fetchVendors();
  }, [filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getAll({
        ...filters,
        search: searchTerm,
      });
      setInvoices(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch invoices");
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const calculateDueDate = (invoiceDate, type, partyId) => {
    const date = new Date(invoiceDate);
    let days = 30; // default

    if (type === "sales" && partyId) {
      const customer = customers.find((c) => c._id === partyId);
      if (customer) days = customer.creditDays || 30;
    } else if (type === "purchase" && partyId) {
      const vendor = vendors.find((v) => v._id === partyId);
      if (vendor) days = vendor.paymentDays || 30;
    }

    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  const handleOpenModal = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        entity: invoice.entity._id || invoice.entity,
        invoiceType: invoice.invoiceType,
        customer: invoice.customer?._id || invoice.customer || "",
        vendor: invoice.vendor?._id || invoice.vendor || "",
        gstType: "cgst_sgst",
        invoiceDate: invoice.invoiceDate.split("T")[0],
        dueDate: invoice.dueDate.split("T")[0],
        lineItems: invoice.lineItems || [
          { description: "", quantity: 1, unit: "nos", rate: 0, taxRate: 18 },
        ],
        cgst: invoice.cgst || 0,
        sgst: invoice.sgst || 0,
        igst: invoice.igst || 0,
        tdsAmount: invoice.tdsAmount || 0,
        roundOff: invoice.roundOff || 0,
        notes: invoice.notes || "",
        termsAndConditions: invoice.termsAndConditions || "",
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        entity: "",
        invoiceType: "sales",
        customer: "",
        vendor: "",
        gstType: "cgst_sgst",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        lineItems: [
          { description: "", quantity: 1, unit: "nos", rate: 0, taxRate: 18 },
        ],
        cgst: 0,
        sgst: 0,
        igst: 0,
        tdsAmount: 0,
        roundOff: 0,
        notes: "",
        termsAndConditions: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate due date when invoice date or party changes
      if (name === "invoiceDate" || name === "customer" || name === "vendor") {
        const partyId =
          name === "customer"
            ? value
            : name === "vendor"
              ? value
              : prev.invoiceType === "sales"
                ? prev.customer
                : prev.vendor;
        updated.dueDate = calculateDueDate(
          updated.invoiceDate,
          updated.invoiceType,
          partyId,
        );
      }

      // Clear party selection when invoice type changes
      if (name === "invoiceType") {
        updated.customer = "";
        updated.vendor = "";
        updated.dueDate = calculateDueDate(updated.invoiceDate, value, "");
      }

      if (name === "gstType") {
        updated.cgst = 0;
        updated.sgst = 0;
        updated.igst = 0;
      }

      return updated;
    });
  };

  const handleLineItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.lineItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, lineItems: items };
    });
  };

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { description: "", quantity: 1, unit: "nos", rate: 0, taxRate: 18 },
      ],
    }));
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length > 1) {
      setFormData((prev) => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index),
      }));
    }
  };

  // const calculateTotals = () => {
  //   const subtotal = formData.lineItems.reduce((sum, item) => {
  //     return sum + item.quantity * item.rate;
  //   }, 0);

  //   const taxTotal = formData.lineItems.reduce((sum, item) => {
  //     return sum + (item.quantity * item.rate * item.taxRate) / 100;
  //   }, 0);

  //   const total = subtotal + taxTotal - formData.tdsAmount + formData.roundOff;

  //   return { subtotal, taxTotal, total };
  // };

  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0,
    );

    const taxFromItems = formData.lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.rate * item.taxRate) / 100,
      0,
    );

    const gstAmount =
      formData.gstType === "igst"
        ? Number(formData.igst)
        : Number(formData.cgst) + Number(formData.sgst);

    const total =
      subtotal +
      taxFromItems +
      gstAmount -
      Number(formData.tdsAmount || 0) +
      Number(formData.roundOff || 0);

    return { subtotal, taxTotal: taxFromItems + gstAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    try {
      if (
        !formData.entity ||
        !formData.invoiceType ||
        !formData.invoiceDate ||
        !formData.dueDate
      ) {
        toast.error("Please fill all mandatory invoice fields");
        return;
      }

      if (formData.invoiceType === "sales" && !formData.customer) {
        toast.error("Customer is required for sales invoice");
        return;
      }

      if (formData.invoiceType === "purchase" && !formData.vendor) {
        toast.error("Vendor is required for purchase invoice");
        return;
      }

      if (!formData.lineItems || formData.lineItems.length === 0) {
        toast.error("At least one line item is required");
        return;
      }

      for (const item of formData.lineItems) {
        if (!item.description || item.quantity <= 0 || item.rate < 0) {
          toast.error("Please fill all required line item fields");
          return;
        }
      }

      setIsSubmitting(true);

      const payload = { ...formData };

      if (payload.invoiceType === "sales") delete payload.vendor;
      if (payload.invoiceType === "purchase") delete payload.customer;

      if (editingInvoice) {
        const cleanData = { ...payload };

        if (!cleanData.notes) delete cleanData.notes;
        if (!cleanData.termsAndConditions) delete cleanData.termsAndConditions;

        await invoiceAPI.update(editingInvoice._id, cleanData);
        toast.success("Invoice updated successfully");
      } else {
        await invoiceAPI.create(payload);
        toast.success("Invoice created successfully");
      }

      handleCloseModal();
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const response = await invoiceAPI.exportCSV({
        ...filters,
        search: searchTerm,
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();

      toast.success("Invoice exported successfully");
    } catch {
      toast.error("Failed to export invoices");
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
        text: "This invoice will be cancelled!",
        confirmText: "Cancel Invoice",
        apiCall: () => invoiceAPI.delete(id),
        onSuccess: fetchInvoices,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    return statusOptions.find((s) => s.value === status)?.color || "#6c757d";
  };

  const { subtotal, taxTotal, total } = calculateTotals();

  return (
    <div className={`invoices-page ${isSubmitting ? "disabled" : ""}`}>
      <div className="page-header">
        <h1>Invoices</h1>

        <div className="page-actions">
          <button
            className="invoice-export-button"
            onClick={handleExport}
            disabled={isSubmitting}
          >
            <FaFileExport /> Export CSV
          </button>

          <button className="add-invoice" onClick={() => handleOpenModal()}>
            <FaPlus /> Create Invoice
          </button>
        </div>
      </div>

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          {/* <button type="submit" className="invoice-search">
            Search
          </button> */}
          <div className="filter-controls">
            <select
              value={filters.entity}
              onChange={(e) =>
                setFilters({ ...filters, entity: e.target.value })
              }
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
              value={filters.invoiceType}
              onChange={(e) =>
                setFilters({ ...filters, invoiceType: e.target.value })
              }
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="sales">Sales</option>
              <option value="purchase">Purchase</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="filter-select"
            >
              <option value="">All Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.agingBucket}
              onChange={(e) =>
                setFilters({ ...filters, agingBucket: e.target.value })
              }
              className="filter-select"
            >
              <option value="">All Aging</option>
              {agingBuckets.map((bucket) => (
                <option key={bucket.value} value={bucket.value}>
                  {bucket.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading">Loading invoices...</div>
      ) : (
        <div className="invoices-table-wrapper">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Type</th>
                <th>Party</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Aging</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id}>
                  <td>
                    <span className="invoice-number">
                      <FaFileInvoice /> {invoice.invoiceNumber}
                    </span>
                  </td>
                  <td>
                    <span className={`type-badge ${invoice.invoiceType}`}>
                      {invoice.invoiceType === "sales" ? "Sales" : "Purchase"}
                    </span>
                  </td>
                  <td>
                    {invoice.invoiceType === "sales"
                      ? invoice.customer?.name
                      : invoice.vendor?.name}
                  </td>
                  <td>{formatDate(invoice.invoiceDate)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td className="invoice-amount">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                  <td className="invoice-amount paid">
                    {formatCurrency(invoice.amountPaid)}
                  </td>
                  <td className="invoice-amount due">
                    {formatCurrency(invoice.amountDue)}
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(invoice.status),
                      }}
                    >
                      {
                        statusOptions.find((s) => s.value === invoice.status)
                          ?.label
                      }
                    </span>
                  </td>
                  <td>
                    <span className={`aging-badge ${invoice.agingBucket}`}>
                      {invoice.agingBucket === "current"
                        ? "Current"
                        : invoice.agingBucket}
                    </span>
                  </td>
                  <td>
                    <div className="invoice-actions-cell">
                      {invoice.status !== "paid" &&
                      invoice.status !== "cancelled" ? (
                        <>
                          <button
                            onClick={() => handleOpenModal(invoice)}
                            className="btn-icon"
                            disabled={isSubmitting}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>

                          <button
                            title="Delete"
                            onClick={() => handleDelete(invoice._id)}
                            className="btn-icon danger"
                            disabled={isSubmitting}
                          >
                            <FaTrash />
                          </button>
                        </>
                      ) : (
                        <span className="no-actions">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</h2>
              <button onClick={handleCloseModal} className="close-btn">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="invoice-form">
              <div className="form-section">
                <h3>Invoice Details</h3>
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
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Invoice Type *</label>
                    <select
                      name="invoiceType"
                      value={formData.invoiceType}
                      onChange={handleChange}
                      required
                    >
                      <option value="sales">Sales Invoice</option>
                      <option value="purchase">Purchase Invoice</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  {formData.invoiceType === "sales" ? (
                    <div className="form-group">
                      <label>Customer *</label>
                      <select
                        name="customer"
                        value={formData.customer}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Customer</option>
                        {customers.map((customer) => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name} ({customer.customerCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Vendor *</label>
                      <select
                        name="vendor"
                        value={formData.vendor}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map((vendor) => (
                          <option key={vendor._id} value={vendor._id}>
                            {vendor.name} ({vendor.vendorCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Invoice Date *</label>
                    <input
                      type="date"
                      name="invoiceDate"
                      value={formData.invoiceDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>Line Items</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="btn-secondary btn-sm"
                  >
                    <FaPlus /> Add Item
                  </button>
                </div>

                <div className="line-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Description</th>
                        <th style={{ width: "10%" }}>Qty</th>
                        <th style={{ width: "10%" }}>Unit</th>
                        <th style={{ width: "15%" }}>Rate</th>
                        <th style={{ width: "10%" }}>Tax %</th>
                        <th style={{ width: "15%" }}>Amount</th>
                        <th style={{ width: "5%" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.lineItems.map((item, index) => {
                        const amount = item.quantity * item.rate;
                        const taxAmount = (amount * item.taxRate) / 100;
                        const totalAmount = amount + taxAmount;

                        return (
                          <tr key={index}>
                            <td>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="Item description"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "quantity",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                min="0.01"
                                step="0.01"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                placeholder="nos"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "rate",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                step="0.01"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.taxRate}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "taxRate",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                max="100"
                                step="0.01"
                              />
                            </td>
                            <td className="amount-cell">
                              {formatCurrency(totalAmount)}
                            </td>
                            <td>
                              {formData.lineItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLineItem(index)}
                                  className="btn-icon danger"
                                  title="Remove"
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-section">
                <div className="invoice-totals">
                  <div className="totals-left">
                    <div className="form-row">
                      <div className="form-group">
                        <label>GST Type</label>
                        <select
                          name="gstType"
                          value={formData.gstType}
                          onChange={handleChange}
                        >
                          <option value="cgst_sgst">CGST + SGST</option>
                          <option value="igst">IGST</option>
                        </select>
                      </div>
                    </div>

                    {/* GST Inputs */}
                    {formData.gstType === "cgst_sgst" && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>CGST</label>
                          <input
                            type="number"
                            name="cgst"
                            value={formData.cgst}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="form-group">
                          <label>SGST</label>
                          <input
                            type="number"
                            name="sgst"
                            value={formData.sgst}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}

                    {formData.gstType === "igst" && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>IGST</label>
                          <input
                            type="number"
                            name="igst"
                            value={formData.igst}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group">
                        <label>TDS Amount</label>
                        <input
                          type="number"
                          name="tdsAmount"
                          value={formData.tdsAmount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group">
                        <label>Round Off</label>
                        <input
                          type="number"
                          name="roundOff"
                          value={formData.roundOff}
                          onChange={handleChange}
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="totals-right">
                    <div className="total-row">
                      <span className="label">Subtotal:</span>
                      <span className="value">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="total-row">
                      <span className="label">Tax:</span>
                      <span className="value">{formatCurrency(taxTotal)}</span>
                    </div>
                    <div className="total-row grand-total">
                      <span className="label">Grand Total:</span>
                      <span className="value">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    maxLength="1000"
                    placeholder="Internal notes..."
                  />
                </div>
                <div className="form-group">
                  <label>Terms & Conditions</label>
                  <textarea
                    name="termsAndConditions"
                    value={formData.termsAndConditions}
                    onChange={handleChange}
                    rows="3"
                    maxLength="2000"
                    placeholder="Terms and conditions for the invoice..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="invoice-create"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : editingInvoice
                      ? "Update"
                      : "Create"}{" "}
                  Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
