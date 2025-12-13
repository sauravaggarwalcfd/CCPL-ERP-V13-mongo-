import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Don't include credentials in CORS requests (tokens go in headers)
  withCredentials: false
})

// Request interceptor to add Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          // No refresh token available, redirect to login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(error)
        }

        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        })
        
        // Store new tokens
        localStorage.setItem('access_token', response.data.access_token)
        localStorage.setItem('refresh_token', response.data.refresh_token)
        localStorage.setItem('token_expires_at', 
          new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
        )
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('token_expires_at')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    // Handle 403 Forbidden - likely insufficient permissions
    if (error.response?.status === 403) {
      console.error('Insufficient permissions:', error.response.data?.detail)
    }
    
    // Handle 423 Locked - account is locked
    if (error.response?.status === 423) {
      console.error('Account is locked:', error.response.data?.detail)
    }
    
    return Promise.reject(error)
  }
)

// Service methods for API operations
export const suppliers = {
  list: (params) => api.get('/suppliers', { params }),
  create: (data) => api.post('/suppliers', data),
  get: (id) => api.get(`/suppliers/${id}`),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
}

export const purchaseOrders = {
  list: (params) => api.get('/purchase-orders', { params }),
  create: (data) => api.post('/purchase-orders', data),
  get: (id) => api.get(`/purchase-orders/${id}`),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  confirm: (id) => api.post(`/purchase-orders/${id}/confirm`),
  receive: (id, items) => api.post(`/purchase-orders/${id}/receive`, { items }),
}

export const customers = {
  list: (params) => api.get('/customers', { params }),
  create: (data) => api.post('/customers', data),
  get: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  orders: (id) => api.get(`/customers/${id}/orders`),
}

export const saleOrders = {
  list: (params) => api.get('/sale-orders', { params }),
  create: (data) => api.post('/sale-orders', data),
  get: (id) => api.get(`/sale-orders/${id}`),
  confirm: (id) => api.post(`/sale-orders/${id}/confirm`),
  fulfill: (id) => api.post(`/sale-orders/${id}/fulfill`),
  cancel: (id) => api.delete(`/sale-orders/${id}`),
}

export const transfers = {
  list: (params) => api.get('/transfers', { params }),
  create: (data) => api.post('/transfers', data),
  get: (id) => api.get(`/transfers/${id}`),
  approve: (id) => api.post(`/transfers/${id}/approve`),
  ship: (id) => api.post(`/transfers/${id}/ship`),
  receive: (id, items) => api.post(`/transfers/${id}/receive`, { items }),
  cancel: (id) => api.delete(`/transfers/${id}`),
}

export const inventory = {
  list: (params) => api.get('/inventory', { params }),

  get: (id) => api.get(`/inventory/${id}`),
}

export const reports = {
  stockCurrent: (params) => api.get('/reports/stock/current', { params }),
  stockLow: (params) => api.get('/reports/stock/low', { params }),
  stockMovements: (params) => api.get('/reports/stock/movements', { params }),
  salesSummary: (params) => api.get('/reports/sales/summary', { params }),
  salesByProduct: (params) => api.get('/reports/sales/by-product', { params }),
  purchasesSummary: (params) => api.get('/reports/purchases/summary', { params }),
}

export const products = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
}

export const warehouses = {
  list: (params) => api.get('/warehouses', { params }),
  get: (id) => api.get(`/warehouses/${id}`),
}

export default api
