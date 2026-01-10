import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Eye, Check, X, Search, Filter, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function PurchaseOrders() {
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchPOs()
  }, [statusFilter])

  const fetchPOs = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter

      const response = await api.get('/purchase/purchase-orders', { params })
      setPos(response.data || [])
    } catch (error) {
      console.error('Error fetching POs:', error)
      toast.error('Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (poCode) => {
    try {
      await api.put(`/purchase/purchase-orders/${poCode}/approve`)
      toast.success('Purchase Order approved')
      fetchPOs()
    } catch (error) {
      console.error('Error approving PO:', error)
      toast.error(error.response?.data?.detail || 'Failed to approve PO')
    }
  }

  const handleCancel = async (poCode) => {
    if (!window.confirm('Are you sure you want to cancel this PO?')) return

    try {
      await api.delete(`/purchase/purchase-orders/${poCode}`)
      toast.success('Purchase Order cancelled')
      fetchPOs()
    } catch (error) {
      console.error('Error cancelling PO:', error)
      toast.error(error.response?.data?.detail || 'Failed to cancel PO')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
      FULLY_RECEIVED: 'bg-emerald-100 text-emerald-800',
      CLOSED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const filteredPOs = pos.filter(po =>
    po.po_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-sm text-gray-500">Manage purchase orders</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/purchase-orders/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create PO
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by PO code or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="FULLY_RECEIVED">Fully Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <button
            onClick={fetchPOs}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No purchase orders found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PO Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPOs.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-blue-600">{po.po_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{po.vendor_name}</p>
                      <p className="text-xs text-gray-500">{po.vendor_code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{po.line_items?.length || 0} items</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(po.total_amount || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(po.status)}`}>
                      {po.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">
                      {po.created_at ? new Date(po.created_at).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => navigate(`/purchase/po/${po.po_code}`)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(po.status === 'DRAFT' || po.status === 'SUBMITTED') && (
                        <button
                          onClick={() => handleApprove(po.po_code)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {po.status === 'DRAFT' && (
                        <button
                          onClick={() => handleCancel(po.po_code)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
