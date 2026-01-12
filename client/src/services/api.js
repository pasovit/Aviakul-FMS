import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  changePassword: (data) => api.post("/auth/change-password", data),
  setup2FA: () => api.post("/auth/2fa/setup"),
  verify2FA: (token) => api.post("/auth/2fa/verify", { token }),
  disable2FA: (data) => api.post("/auth/2fa/disable", data),
};

// Entity API calls
export const entityAPI = {
  getAll: (params) => api.get("/entities", { params }),
  getById: (id) => api.get(`/entities/${id}`),
  create: (data) => api.post("/entities", data),
  update: (id, data) => api.put(`/entities/${id}`, data),
  delete: (id) => api.delete(`/entities/${id}`),
};

// Audit API calls
export const auditAPI = {
  getLogs: (params) => api.get("/audit", { params }),
  getLogById: (id) => api.get(`/audit/${id}`),
};

// Bank Account API calls
export const bankAccountAPI = {
  getAll: (params) => api.get("/bank-accounts", { params }),
  getById: (id) => api.get(`/bank-accounts/${id}`),
  create: (data) => api.post("/bank-accounts", data),
  update: (id, data) => api.put(`/bank-accounts/${id}`, data),
  delete: (id) => api.delete(`/bank-accounts/${id}`),
  getBalanceSummary: (params) =>
    api.get("/bank-accounts/summary/balances", { params }),
};

// Transaction API calls
export const transactionAPI = {
  getAll: (params) => api.get("/transactions", { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post("/transactions", data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  bulkUpdateStatus: (data) => api.post("/transactions/bulk-update", data),
  exportToExcel: (params) =>
    api.get("/transactions/export", {
      params,
      responseType: "blob",
    }),
  importPreview: (formData) =>
    api.post("/transactions/import/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  importCommit: (data) => api.post("/transactions/import/commit", data),
};

// Dashboard API calls
export const dashboardAPI = {
  getStats: (params) => api.get("/dashboard/stats", { params }),
  getCategoryBreakdown: (params) =>
    api.get("/dashboard/category-breakdown", { params }),
  getMonthlyTrends: (params) =>
    api.get("/dashboard/monthly-trends", { params }),
  getEntitySummary: (params) =>
    api.get("/dashboard/entity-summary", { params }),
  getARAPSummary: (params) => api.get("/dashboard/ar-ap-summary", { params }),
};

// Vendor API calls
export const vendorAPI = {
  getAll: (params) => api.get("/vendors", { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post("/vendors", data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  getOutstanding: (params) => api.get("/vendors/outstanding", { params }),
};

// Customer API calls
export const customerAPI = {
  getAll: (params) => api.get("/customers", { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getOutstanding: (params) => api.get("/customers/outstanding", { params }),
  addShippingAddress: (id, data) =>
    api.post(`/customers/${id}/shipping-address`, data),
};

// Invoice API calls
export const invoiceAPI = {
  getAll: (params) => api.get("/invoices", { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post("/invoices", data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  getAgingReport: (params) => api.get("/invoices/aging-report", { params }),
  getSummary: (params) => api.get("/invoices/summary", { params }),
};

// Payment API calls
export const paymentAPI = {
  getAll: (params) => api.get("/payments", { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post("/payments", data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  allocate: (id, data) => api.post(`/payments/${id}/allocate`, data),
  getUnallocated: (params) => api.get("/payments/unallocated", { params }),
  getSummary: (params) => api.get("/payments/summary", { params }),
};

export default api;
