import { useState, useEffect } from 'react'
import { Truck, RefreshCw, Search, Plus, X, Check, XCircle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    item_code: '',
    quantity: '',
    from_location: '',
    to_location: '',
    remarks: ''
  })

  useEffect(() => {
    fetchTransfers()
  }, [filterStatus])

  const fetchTransfers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      params.append('limit', '100')

      const response = await api.get(`/inventory/stock-transfers/list?${params.toString()}`)
      setTransfers(response.data)
    } catch (error) {
      console.error('Error fetching transfers:', error)
      toast.error('Failed to load stock transfers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.item_code || !formData.quantity) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      await api.post('/inventory/stock-transfers/create', {
        item_code: formData.item_code,
        quantity: parseFloat(formData.quantity),
        from_location: formData.from_location || null,
        to_location: formData.to_location || null,
        remarks: formData.remarks
      })
      toast.success('Stock transfer created successfully')
      setShowModal(false)
      setFormData({ item_code: '', quantity: '', from_location: '', to_location: '', remarks: '' })
      fetchTransfers()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast.error(error.response?.data?.detail || 'Failed to create transfer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async (transferId) => {
    if (!confirm('Are you sure you want to complete this transfer?')) return

    try {
      await api.post(`/inventory/stock-transfers/${transferId}/complete`)
      toast.success('Transfer completed successfully')
      fetchTransfers()
    } catch (error) {
      console.error('Error completing transfer:', error)
      toast.error(error.response?.data?.detail || 'Failed to complete transfer')
    }
  }

  const handleCancel = async (transferId) => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return

    try {
      await api.post(`/inventory/stock-transfers/${transferId}/cancel`)
      toast.success('Transfer cancelled')
      fetchTransfers()
    } catch (error) {
      console.error('Error cancelling transfer:', error)
      toast.error(error.response?.data?.detail || 'Failed to cancel transfer')
    }
  }

  const filteredTransfers = transfers.filter(t =>
    t.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.transfer_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
          <p className="text-gray-500">Transfer stock between locations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTransfers}
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
            New Transfer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by item code, name, or transfer ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No stock transfers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Transfer ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-900">
                        {transfer.transfer_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{transfer.item_code}</p>
                        <p className="text-sm text-gray-500">{transfer.item_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {transfer.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transfer.from_warehouse_name || transfer.from_location || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transfer.to_warehouse_name || transfer.to_location || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(transfer.status)}`}>
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transfer.requested_at ? new Date(transfer.requested_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {transfer.status === 'PENDING' && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleComplete(transfer.transfer_id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Complete Transfer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancel(transfer.transfer_id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Cancel Transfer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Stock Transfer</h2>
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
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Enter quantity to transfer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Location
                  </label>
                  <input
                    type="text"
                    value={formData.from_location}
                    onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                    placeholder="Source location"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Location
                  </label>
                  <input
                    type="text"
                    value={formData.to_location}
                    onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                    placeholder="Destination location"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  {submitting ? 'Creating...' : 'Create Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
