import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { deleteWithConfirm } from "../utils/deleteWithConfirm";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import RequiredStar from "../components/RequiredStar";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { customerAPI, entityAPI } from "../services/api";
import "./Customers.css";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    entity: "",
    category: "",
    isActive: "true",
    search: "",
  });

  const [formData, setFormData] = useState({
    entity: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    alternatePhone: "",
    pan: "",
    gstin: "",
    billingAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
    category: "other",
    creditTerms: "net_30",
    customCreditDays: "",
    creditLimit: 0,
    tdsApplicable: false,
    tdsSection: "",
    tdsRate: 0,
    notes: "",
  });

  const categories = [
    { value: "retail", label: "Retail" },
    { value: "wholesale", label: "Wholesale" },
    { value: "distributor", label: "Distributor" },
    { value: "corporate", label: "Corporate" },
    { value: "government", label: "Government" },
    { value: "individual", label: "Individual" },
    { value: "other", label: "Other" },
  ];

  const creditTermsOptions = [
    { value: "immediate", label: "Immediate" },
    { value: "net_7", label: "Net 7 Days" },
    { value: "net_15", label: "Net 15 Days" },
    { value: "net_30", label: "Net 30 Days" },
    { value: "net_45", label: "Net 45 Days" },
    { value: "net_60", label: "Net 60 Days" },
    { value: "net_90", label: "Net 90 Days" },
    { value: "custom", label: "Custom" },
  ];

  const tdsOptions = [
    { value: "", label: "Not Applicable" },
    { value: "194A", label: "194A - Interest" },
    { value: "194C", label: "194C - Contractor" },
    { value: "194H", label: "194H - Commission" },
    { value: "194I", label: "194I - Rent" },
    { value: "194J", label: "194J - Professional Fees" },
    { value: "194Q", label: "194Q - Purchase of Goods" },
    { value: "Other", label: "Other" },
  ];

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchCustomers();
    }, 500);

    return () => clearTimeout(delay);
  }, [filters]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getAll(filters);
      setCustomers(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch customers");
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

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        entity: customer.entity._id || customer.entity,
        name: customer.name,
        contactPerson: customer.contactPerson || "",
        email: customer.email || "",
        phone: customer.phone || "",
        alternatePhone: customer.alternatePhone || "",
        pan: customer.pan || "",
        gstin: customer.gstin || "",
        billingAddress: customer.billingAddress || {
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
          country: "India",
        },
        category: customer.category || "other",
        creditTerms: customer.creditTerms || "net_30",
        customCreditDays: customer.customCreditDays || "",
        creditLimit: customer.creditLimit || 0,
        tdsApplicable: customer.tdsApplicable || false,
        tdsSection: customer.tdsSection || "",
        tdsRate: customer.tdsRate || 0,
        notes: customer.notes || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        entity: "",
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        alternatePhone: "",
        pan: "",
        gstin: "",
        billingAddress: {
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
          country: "India",
        },
        category: "other",
        creditTerms: "net_30",
        customCreditDays: "",
        creditLimit: 0,
        tdsApplicable: false,
        tdsSection: "",
        tdsRate: 0,
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "creditTerms") {
      if (value !== "custom") {
        setFormData((prev) => ({
          ...prev,
          creditTerms: value,
          customCreditDays: "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          creditTerms: value,
        }));
      }
      return;
    }

    // Handle nested fields
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (
      !formData.entity ||
      !formData.name ||
      !formData.billingAddress.line1 ||
      !formData.billingAddress.city ||
      !formData.billingAddress.state ||
      !formData.billingAddress.pincode
    ) {
      return toast.error("Please fill all mandatory fields");
    }
    const phoneRegex = /^\+[1-9]\d{9,14}$/;

    if (
      formData.phone &&
      formData.phone.length > 4 &&
      !phoneRegex.test(formData.phone)
    ) {
      return toast.error("Invalid phone number format");
    }

    if (
      formData.alternatePhone &&
      formData.alternatePhone.length > 4 &&
      !phoneRegex.test(formData.alternatePhone)
    ) {
      return toast.error("Invalid alternate phone number format");
    }

    try {
      setIsSubmitting(true);

      const cleanData = { ...formData };

      if (!cleanData.pan) delete cleanData.pan;
      if (!cleanData.gstin) delete cleanData.gstin;
      if (!cleanData.notes) delete cleanData.notes;
     
      const phoneDigits = formData.phone?.replace(/\D/g, "") || "";
      const altPhoneDigits = formData.alternatePhone?.replace(/\D/g, "") || "";

     
      if (!phoneDigits || phoneDigits.length < 10) {
        cleanData.phone = null;
      }

      if (!altPhoneDigits || altPhoneDigits.length < 10) {
        cleanData.alternatePhone = null;
      }

      if (editingCustomer) {
        await customerAPI.update(editingCustomer._id, cleanData);
        toast.success("Customer updated successfully");
      } else {
        await customerAPI.create(cleanData);
        toast.success("Customer created successfully");
      }

      handleCloseModal();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    deleteWithConfirm({
      title: "Are you sure?",
      text: "This customer will be permanently deleted!",
      confirmText: "Delete",
      apiCall: () => customerAPI.delete(id),
      onSuccess: fetchCustomers,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCreditUtilizationColor = (utilization) => {
    if (utilization >= 90) return "#dc3545";
    if (utilization >= 75) return "#fd7e14";
    if (utilization >= 50) return "#ffc107";
    return "#28a745";
  };

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>Customers</h1>
        <button
          className="add-customer"
          onClick={() => handleOpenModal()}
          disabled={isSubmitting}
        >
          <FaPlus size={12}/> Add Customer
        </button>
      </div>

      <div className="filters-section">
        <form className="search-form">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="search"
              placeholder="Search by name, code, or contact person..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="search-input"
            />
          </div>

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
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filters.isActive}
              onChange={(e) =>
                setFilters({ ...filters, isActive: e.target.value })
              }
              className="filter-select"
            >
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
              <option value="">All Status</option>
            </select>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading">Loading customers...</div>
      ) : (
        <div className="customers-grid">
          {customers.map((customer) => (
            <div key={customer._id} className="customer-card">
              <div className="customer-header">
                <div>
                  <h3>{customer.name}</h3>
                  <span className="customer-code">{customer.customerCode}</span>
                  <span className={`category-badge ${customer.category}`}>
                    {categories.find((c) => c.value === customer.category)
                      ?.label || customer.category}
                  </span>
                </div>
                <div className="customer-actions">
                  <button
                    onClick={() => handleOpenModal(customer)}
                    className="btn-icon"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(customer._id)}
                    className="btn-icon danger"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="customer-details">
                <div className="detail-row">
                  <span className="label">Contact:</span>
                  <span>{customer.contactPerson || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span>{customer.phone || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span>{customer.email || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Credit Terms:</span>
                  <span>
                    {
                      creditTermsOptions.find(
                        (p) => p.value === customer.creditTerms,
                      )?.label
                    }
                  </span>
                </div>
                {customer.shippingAddresses &&
                  customer.shippingAddresses.length > 0 && (
                    <div className="detail-row">
                      <span className="label">
                        <FaMapMarkerAlt /> Shipping Addresses:
                      </span>
                      <span>{customer.shippingAddresses.length}</span>
                    </div>
                  )}
              </div>

              <div className="customer-financial">
                <div className="financial-item">
                  <span className="label">Credit Limit:</span>
                  <span className="amount">
                    {formatCurrency(customer.creditLimit)}
                  </span>
                </div>
                <div className="financial-item">
                  <span className="label">Outstanding:</span>
                  <span className="amount outstanding">
                    {formatCurrency(customer.currentOutstanding)}
                  </span>
                </div>
                {customer.creditLimit > 0 && (
                  <div className="credit-utilization">
                    <div className="utilization-bar">
                      <div
                        className="utilization-fill"
                        style={{
                          width: `${Math.min(
                            customer.creditUtilization,
                            100,
                          )}%`,
                          backgroundColor: getCreditUtilizationColor(
                            customer.creditUtilization,
                          ),
                        }}
                      />
                    </div>
                    <span className="utilization-text">
                      {customer.creditUtilization.toFixed(1)}% utilized
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCustomer ? "Edit Customer" : "Add New Customer"}</h2>
              <button onClick={handleCloseModal} className="close-btn">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="customer-form">
              <div className="form-section">
                <h3>Basic Information</h3>
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
                      Customer Name <RequiredStar />
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      maxLength="200"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      maxLength="100"
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <PhoneInput
                      defaultCountry="in"
                      value={formData.phone}
                      onChange={(value) =>
                        handleChange({
                          target: {
                            name: "phone",
                            value: value,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Alternate Phone</label>
                    <PhoneInput
                      defaultCountry="in"
                      value={formData.alternatePhone}
                      onChange={(value) =>
                        handleChange({
                          target: {
                            name: "alternatePhone",
                            value: value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Tax Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>PAN</label>
                    <input
                      type="text"
                      name="pan"
                      value={formData.pan}
                      onChange={handleChange}
                      pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                      placeholder="ABCDE1234F"
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>

                  <div className="form-group">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                      placeholder="22ABCDE1234F1Z5"
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="tdsApplicable"
                      checked={formData.tdsApplicable}
                      onChange={handleChange}
                    />
                    <span>TDS Applicable</span>
                  </label>
                </div>

                {formData.tdsApplicable && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>TDS Section</label>
                      <select
                        name="tdsSection"
                        value={formData.tdsSection}
                        onChange={handleChange}
                      >
                        {tdsOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>TDS Rate (%)</label>
                      <input
                        type="number"
                        name="tdsRate"
                        value={formData.tdsRate}
                        onChange={handleChange}
                        min="0"
                        max="30"
                        step="0.1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>Billing Address</h3>
                <div className="form-group">
                  <label>
                    Address Line 1 <RequiredStar />
                  </label>
                  <input
                    type="text"
                    name="billingAddress.line1"
                    value={formData.billingAddress.line1}
                    onChange={handleChange}
                    required
                    maxLength="200"
                  />
                </div>

                <div className="form-group">
                  <label>Address Line 2</label>
                  <input
                    type="text"
                    name="billingAddress.line2"
                    value={formData.billingAddress.line2}
                    onChange={handleChange}
                    maxLength="200"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      City <RequiredStar />
                    </label>
                    <input
                      type="text"
                      name="billingAddress.city"
                      value={formData.billingAddress.city}
                      onChange={handleChange}
                      required
                      maxLength="100"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      State <RequiredStar />
                    </label>
                    <input
                      type="text"
                      name="billingAddress.state"
                      value={formData.billingAddress.state}
                      onChange={handleChange}
                      required
                      maxLength="100"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Pincode <RequiredStar />
                    </label>
                    <input
                      type="text"
                      name="billingAddress.pincode"
                      value={formData.billingAddress.pincode}
                      onChange={handleChange}
                      required
                      pattern="[0-9]{6}"
                      placeholder="6-digit pincode"
                    />
                  </div>

                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      name="billingAddress.country"
                      value={formData.billingAddress.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Credit Terms</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Credit Terms</label>
                    <select
                      name="creditTerms"
                      value={formData.creditTerms}
                      onChange={handleChange}
                    >
                      {creditTermsOptions.map((term) => (
                        <option key={term.value} value={term.value}>
                          {term.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.creditTerms === "custom" && (
                    <div className="form-group">
                      <label>
                        Custom Days <RequiredStar />
                      </label>
                      <input
                        type="number"
                        name="customCreditDays"
                        value={formData.customCreditDays}
                        onChange={handleChange}
                        min="0"
                        max="365"
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Credit Limit</label>
                    <input
                      type="number"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleChange}
                      min="0"
                      step="1000"
                    />
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
                    rows="3"
                    maxLength="1000"
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
                  className="btn customer-create"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : editingCustomer
                      ? "Update Customer"
                      : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
