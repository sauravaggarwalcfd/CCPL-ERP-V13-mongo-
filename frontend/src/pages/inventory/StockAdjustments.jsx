import { useState, useEffect } from 'react'
import { Wrench, RefreshCw, Search, Plus, X } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ADJUSTMENT_REASONS = [
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'AUDIT', label: 'Audit' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'OTHER', label: 'Other' },
]

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    item_code: '',
    adjusted_stock: '',
    reason: 'CORRECTION',
    remarks: ''
  })

  useEffect(() => {
    fetchAdjustments()
  }, [])

  const fetchAdjustments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/inventory/stock-adjustments/list?limit=100')
      setAdjustments(response.data)
    } catch (error) {
      console.error('Error fetching adjustments:', error)
      toast.error('Failed to load stock adjustments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.item_code || formData.adjusted_stock === '') {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      await api.post('/inventory/stock-adjustments/create', {
        item_code: formData.item_code,
        adjusted_stock: parseFloat(formData.adjusted_stock),
        reason: formData.reason,
        remarks: formData.remarks
      })
      toast.success('Stock adjustment created successfully')
      setShowModal(false)
      setFormData({ item_code: '', adjusted_stock: '', reason: 'CORRECTION', remarks: '' })
      fetchAdjustments()
    } catch (error) {
      console.error('Error creating adjustment:', error)
      toast.error(error.response?.data?.detail || 'Failed to create adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAdjustments = adjustments.filter(a =>
    a.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.adjustment_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getReasonStyle = (reason) => {
    switch (reason) {
      case 'DAMAGE':
        return 'bg-red-100 text-red-800'
      case 'LOSS':
        return 'bg-orange-100 text-orange-800'
      case 'CORRECTION':
        return 'bg-blue-100 text-blue-800'
      case 'AUDIT':
        return 'bg-purple-100 text-purple-800'
      case 'EXPIRED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
          <p className="text-gray-500">Manage stock corrections and adjustments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAdjustments}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Adjustment
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by item code, name, or adjustment ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No stock adjustments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Adjustment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Previous Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Adjusted Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAdjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-900">
                        {adjustment.adjustment_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{adjustment.item_code}</p>
                        <p className="text-sm text-gray-500">{adjustment.item_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {adjustment.previous_stock}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {adjustment.adjusted_stock}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${adjustment.adjustment_quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adjustment.adjustment_quantity >= 0 ? '+' : ''}{adjustment.adjustment_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getReasonStyle(adjustment.reason)}`}>
                        {adjustment.reason}
                      </span>
                      {adjustment.remarks && (
                        <p className="text-xs text-gray-500 mt-1">{adjustment.remarks}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {adjustment.created_at ? new Date(adjustment.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Stock Adjustment</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., RM00001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.adjusted_stock}
                  onChange={(e) => setFormData({ ...formData, adjusted_stock: e.target.value })}
                  placeholder="Enter new stock quantity"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ADJUSTMENT_REASONS.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Add any notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
