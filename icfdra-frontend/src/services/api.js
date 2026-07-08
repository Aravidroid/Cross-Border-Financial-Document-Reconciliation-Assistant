import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.icfdra.example.com/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('icfdra_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('icfdra_user')
      localStorage.removeItem('icfdra_token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// ─── Invoice Service ──────────────────────────────────────────────────────────
export const invoiceService = {
  list: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  upload: (formData, onProgress) =>
    api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }),
  approve: (id, notes) => api.post(`/invoices/${id}/approve`, { notes }),
  reject: (id, reason) => api.post(`/invoices/${id}/reject`, { reason }),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  getHistory: (params) => api.get('/invoices/upload-history', { params }),
  getAuditLogs: (params) => api.get('/invoices/audit-logs', { params }),
}

// ─── Analytics Service ────────────────────────────────────────────────────────
export const analyticsService = {
  getSummary: () => api.get('/analytics/summary'),
  getCurrencyDistribution: () => api.get('/analytics/currency-distribution'),
  getMonthlyTrend: (months = 6) => api.get('/analytics/monthly-trend', { params: { months } }),
  getVendorSpending: () => api.get('/analytics/vendor-spending'),
  getRiskDistribution: () => api.get('/analytics/risk-distribution'),
  getFXExposure: () => api.get('/analytics/fx-exposure'),
}

// ─── Audit Service ────────────────────────────────────────────────────────────
export const auditService = {
  getLogs: (params) => api.get('/audit/logs', { params }),
  export: (format = 'csv', params) =>
    api.get('/audit/export', { params: { format, ...params }, responseType: 'blob' }),
}

// ─── Search Service ───────────────────────────────────────────────────────────
export const searchService = {
  semanticSearch: (query, limit = 10) =>
    api.post('/search/semantic', { query, limit }),
  getSuggestions: (query) => api.get('/search/suggestions', { params: { q: query } }),
}

// ─── Auth Service ─────────────────────────────────────────────────────────────
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
}

// ─── Settings Service ─────────────────────────────────────────────────────────
export const settingsService = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  generateApiKey: () => api.post('/settings/api-keys'),
  revokeApiKey: (keyId) => api.delete(`/settings/api-keys/${keyId}`),
  getApiKeys: () => api.get('/settings/api-keys'),
}

export default api
