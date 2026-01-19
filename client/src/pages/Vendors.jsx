import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { vendorAPI, entityAPI } from "../services/api";
import { deleteWithConfirm } from "../utils/deleteWithConfirm";
import "./Vendors.css";

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    entity: "",
    category: "",
    isActive: "true",
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
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
    category: "other",
    paymentTerms: "net_30",
    customPaymentDays: "",
    creditLimit: 0,
    bankDetails: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      ifscCode: "",
      branchName: "",
    },
    tdsSection: "",
    tdsRate: 0,
    notes: "",
  });

  const categories = [
    { value: "raw_material", label: "Raw Material" },
    { value: "services", label: "Services" },
    { value: "utilities", label: "Utilities" },
    { value: "office_supplies", label: "Office Supplies" },
    { value: "transport", label: "Transport" },
    { value: "professional", label: "Professional" },
    { value: "other", label: "Other" },
  ];

  const paymentTermsOptions = [
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
    fetchVendors();
    fetchEntities();
  }, [filters]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getAll({
        ...filters,
        search: searchTerm,
      });
      setVendors(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch vendors");
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleOpenModal = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        entity: vendor.entity._id || vendor.entity,
        name: vendor.name,
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        alternatePhone: vendor.alternatePhone || "",
        pan: vendor.pan || "",
        gstin: vendor.gstin || "",
        address: vendor.address || {
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
          country: "India",
        },
        category: vendor.category || "other",
        paymentTerms: vendor.paymentTerms || "net_30",
        customPaymentDays: vendor.customPaymentDays || "",
        creditLimit: vendor.creditLimit || 0,
        bankDetails: vendor.bankDetails || {
          accountName: "",
          accountNumber: "",
          bankName: "",
          ifscCode: "",
          branchName: "",
        },
        tdsSection: vendor.tdsSection || "",
        tdsRate: vendor.tdsRate || 0,
        notes: vendor.notes || "",
      });
    } else {
      setEditingVendor(null);
      setFormData({
        entity: "",
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        alternatePhone: "",
        pan: "",
        gstin: "",
        address: {
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
          country: "India",
        },
        category: "other",
        paymentTerms: "net_30",
        customPaymentDays: "",
        creditLimit: 0,
        bankDetails: {
          accountName: "",
          accountNumber: "",
          bankName: "",
          ifscCode: "",
          branchName: "",
        },
        tdsSection: "",
        tdsRate: 0,
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVendor(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

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
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingVendor) {
        await vendorAPI.update(editingVendor._id, formData);
        toast.success("Vendor updated successfully");
      } else {
        await vendorAPI.create(formData);
        toast.success("Vendor created successfully");
      }
      handleCloseModal();
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save vendor");
      console.error(error);
    }
  };

const handleDelete = (id) => {
  deleteWithConfirm({
    title: "Are you sure?",
    text: "This vendor will be permanently deleted!",
    confirmText: "Delete",
    apiCall: () => vendorAPI.delete(id),
    onSuccess: fetchVendors,
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
    <div className="vendors-page">
      <div className="page-header">
        <h1>Vendors</h1>
        <button className="add-vendor" onClick={() => handleOpenModal()}>
          <FaPlus /> Add Vendor
        </button>
      </div>

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, code, or contact person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          {/* <button type="submit" className="vendor-search">
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
        <div className="loading">Loading vendors...</div>
      ) : (
        <div className="vendors-grid">
          {vendors.map((vendor) => (
            <div key={vendor._id} className="vendor-card">
              <div className="vendor-header">
                <div>
                  <h3>{vendor.name}</h3>
                  <span className="vendor-code">{vendor.vendorCode}</span>
                  <span className={`category-badge ${vendor.category}`}>
                    {categories.find((c) => c.value === vendor.category)
                      ?.label || vendor.category}
                  </span>
                </div>
                <div className="vendor-actions">
                  <button
                    onClick={() => handleOpenModal(vendor)}
                    className="btn-icon"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(vendor._id)}
                    className="btn-icon btn-danger"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="vendor-details">
                <div className="detail-row">
                  <span className="label">Contact:</span>
                  <span>{vendor.contactPerson || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Phone:</span>
                  <span>{vendor.phone || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span>{vendor.email || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Payment Terms:</span>
                  <span>
                    {
                      paymentTermsOptions.find(
                        (p) => p.value === vendor.paymentTerms
                      )?.label
                    }
                  </span>
                </div>
              </div>

              <div className="vendor-financial">
                <div className="financial-item">
                  <span className="label">Credit Limit:</span>
                  <span className="amount">
                    {formatCurrency(vendor.creditLimit)}
                  </span>
                </div>
                <div className="financial-item">
                  <span className="label">Outstanding:</span>
                  <span className="amount outstanding">
                    {formatCurrency(vendor.currentOutstanding)}
                  </span>
                </div>
                {vendor.creditLimit > 0 && (
                  <div className="credit-utilization">
                    <div className="utilization-bar">
                      <div
                        className="utilization-fill"
                        style={{
                          width: `${Math.min(vendor.creditUtilization, 100)}%`,
                          backgroundColor: getCreditUtilizationColor(
                            vendor.creditUtilization
                          ),
                        }}
                      />
                    </div>
                    <span className="utilization-text">
                      {vendor.creditUtilization.toFixed(1)}% utilized
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
              <h2>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</h2>
              <button onClick={handleCloseModal} className="close-btn">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="vendor-form">
              <div className="form-section">
                <h3>Basic Information</h3>
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
                    <label>Vendor Name *</label>
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
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      pattern="[0-9]{10}"
                      placeholder="10-digit number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Alternate Phone</label>
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={handleChange}
                      pattern="[0-9]{10}"
                      placeholder="10-digit number"
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
              </div>

              <div className="form-section">
                <h3>Address</h3>
                <div className="form-group">
                  <label>Address Line 1 *</label>
                  <input
                    type="text"
                    name="address.line1"
                    value={formData.address.line1}
                    onChange={handleChange}
                    required
                    maxLength="200"
                  />
                </div>

                <div className="form-group">
                  <label>Address Line 2</label>
                  <input
                    type="text"
                    name="address.line2"
                    value={formData.address.line2}
                    onChange={handleChange}
                    maxLength="200"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleChange}
                      required
                      maxLength="100"
                    />
                  </div>

                  <div className="form-group">
                    <label>State *</label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleChange}
                      required
                      maxLength="100"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Pincode *</label>
                    <input
                      type="text"
                      name="address.pincode"
                      value={formData.address.pincode}
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
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Payment Terms & Credit</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Terms</label>
                    <select
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={handleChange}
                    >
                      {paymentTermsOptions.map((term) => (
                        <option key={term.value} value={term.value}>
                          {term.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.paymentTerms === "custom" && (
                    <div className="form-group">
                      <label>Custom Days</label>
                      <input
                        type="number"
                        name="customPaymentDays"
                        value={formData.customPaymentDays}
                        onChange={handleChange}
                        min="0"
                        max="365"
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
                <h3>Bank Details (Optional)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Account Name</label>
                    <input
                      type="text"
                      name="bankDetails.accountName"
                      value={formData.bankDetails.accountName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Account Number</label>
                    <input
                      type="text"
                      name="bankDetails.accountNumber"
                      value={formData.bankDetails.accountNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      name="bankDetails.bankName"
                      value={formData.bankDetails.bankName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      name="bankDetails.ifscCode"
                      value={formData.bankDetails.ifscCode}
                      onChange={handleChange}
                      pattern="[A-Z]{4}0[A-Z0-9]{6}"
                      placeholder="ABCD0123456"
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Branch Name</label>
                  <input
                    type="text"
                    name="bankDetails.branchName"
                    value={formData.bankDetails.branchName}
                    onChange={handleChange}
                  />
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
                <button type="submit" className="vendor-create">
                  {editingVendor ? "Update" : "Create"} Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
