/**
 * Purchase Request API Service
 * Handles all API calls for Purchase Requests
 */

import api from './api';

export const purchaseRequestApi = {
  // List all purchase requests with optional filters
  list: (params = {}) => api.get('/purchase/purchase-requests', { params }),

  // Get single purchase request by code
  get: (prCode) => api.get(`/purchase/purchase-requests/${prCode}`),

  // Create new purchase request
  create: (data) => api.post('/purchase/purchase-requests', data),

  // Update existing purchase request (only DRAFT)
  update: (prCode, data) => api.put(`/purchase/purchase-requests/${prCode}`, data),

  // Submit purchase request for approval
  submit: (prCode) => api.put(`/purchase/purchase-requests/${prCode}/submit`),

  // Approve purchase request
  approve: (prCode, approvalData = {}) => 
    api.put(`/purchase/purchase-requests/${prCode}/approve`, approvalData),

  // Reject purchase request
  reject: (prCode, rejectionData) => 
    api.put(`/purchase/purchase-requests/${prCode}/reject`, rejectionData),

  // Delete/Cancel purchase request
  delete: (prCode) => api.delete(`/purchase/purchase-requests/${prCode}`),

  // Get statistics summary
  getStats: () => api.get('/purchase/purchase-requests/stats/summary'),

  // Convert approved PR to PO (auto-create)
  convertToPO: (prCode) => api.post(`/purchase/purchase-requests/${prCode}/convert-to-po`),

  // Preview PR to PO conversion
  previewConversion: (prCode) => api.get(`/purchase/purchase-requests/${prCode}/conversion-preview`),
  
  // Mark PR as converted to PO (after manual PO creation)
  markConverted: (prCode, poNumber) => api.put(`/purchase/purchase-requests/${prCode}/mark-converted`, { po_number: poNumber }),
};

export default purchaseRequestApi;
