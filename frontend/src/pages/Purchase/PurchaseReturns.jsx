import { useState, useEffect } from 'react'
import { RotateCcw, Plus, Check, Search, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function PurchaseReturns() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [grs, setGrs] = useState([])
  const [selectedGR, setSelectedGR] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState('')

  useEffect(() => {
    fetchReturns()
    fetchGRs()
  }, [])

  const fetchReturns = async () => {
    try {
      setLoading(true)
      const response = await api.get('/purchase/purchase-returns')
      setReturns(response.data || [])
    } catch (error) {
      console.error('Error fetching returns:', error)
      toast.error('Failed to load purchase returns')
    } finally {
      setLoading(false)
    }
  }

  const fetchGRs = async () => {
    try {
      const response = await api.get('/purchase/goods-receipts', { params: { status: 'COMPLETED' } })
      setGrs(response.data || [])
    } catch (error) {
      console.error('Error fetching GRs:', error)
    }
  }

  const handleGRSelect = (gr) => {
    setSelectedGR(gr)
    const items = (gr.received_items || []).map(item => ({
      item_code: item.item_code,
      item_name: item.item_name,
      received_qty: item.accepted_qty || item.received_qty,
      return_qty: 0,
      reason: '',
      unit_price: item.unit_price || 0
    }))
    setReturnItems(items)
  }

  const handleCreateReturn = async () => {
    if (!selectedGR) {
      toast.error('Please select a Goods Receipt')
      return
    }

    const itemsToReturn = returnItems.filter(item => item.return_qty > 0)
    if (itemsToReturn.length === 0) {
      toast.error('Please enter return quantity for at least one item')
      return
    }

    const totalAmount = itemsToReturn.reduce((sum, item) => sum + (item.return_qty * item.unit_price), 0)

    try {
      const payload = {
        po_code: selectedGR.po_code,
        gr_code: selectedGR.gr_code,
        vendor_code: selectedGR.vendor_code,
        vendor_name: selectedGR.vendor_name,
        returned_items: itemsToReturn,
        total_return_amount: totalAmount,
        return_reason: returnReason
      }

      await api.post('/purchase/purchase-returns', payload)
      toast.success('Purchase Return created successfully')
      setShowCreateModal(false)
      setSelectedGR(null)
      setReturnItems([])
      setReturnReason('')
      fetchReturns()
    } catch (error) {
      console.error('Error creating return:', error)
      toast.error(error.response?.data?.detail || 'Failed to create Purchase Return')
    }
  }

  const handleApprove = async (prCode) => {
    try {
      await api.put(`/purchase/purchase-returns/${prCode}/approve`)
      toast.success('Purchase Return approved')
      fetchReturns()
    } catch (error) {
      console.error('Error approving return:', error)
      toast.error(error.response?.data?.detail || 'Failed to approve return')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      PROCESSED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const filteredReturns = returns.filter(ret =>
    ret.pr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.po_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Returns</h1>
            <p className="text-sm text-gray-500">Manage returns to vendors</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create Return
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by return code, PO code, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={fetchReturns}
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No purchase returns found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Return Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PO Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Debit Note</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-orange-600">{ret.pr_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-blue-600">{ret.po_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900">{ret.vendor_name || ret.vendor_code}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(ret.total_return_amount || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{ret.debit_note_number || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(ret.status)}`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">
                      {ret.created_at ? new Date(ret.created_at).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {ret.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprove(ret.pr_code)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
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

      {/* Create Return Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-orange-600 text-white px-6 py-4">
              <h2 className="text-xl font-bold">Create Purchase Return</h2>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* GR Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Goods Receipt</label>
                <select
                  value={selectedGR?.gr_code || ''}
                  onChange={(e) => {
                    const gr = grs.find(g => g.gr_code === e.target.value)
                    handleGRSelect(gr)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a GR...</option>
                  {grs.map(gr => (
                    <option key={gr.gr_code} value={gr.gr_code}>
                      {gr.gr_code} - PO: {gr.po_code} - {gr.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Return Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Reason</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Enter reason for return..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
              </div>

              {/* Items Table */}
              {selectedGR && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items to Return</h3>
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Item Code</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Item Name</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Received</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Return Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {returnItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono text-sm">{item.item_code}</td>
                          <td className="px-3 py-2">{item.item_name}</td>
                          <td className="px-3 py-2 text-right">{item.received_qty}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              max={item.received_qty}
                              value={item.return_qty}
                              onChange={(e) => {
                                const newItems = [...returnItems]
                                newItems[idx].return_qty = Math.min(parseFloat(e.target.value) || 0, item.received_qty)
                                setReturnItems(newItems)
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => {
                                const newItems = [...returnItems]
                                newItems[idx].reason = e.target.value
                                setReturnItems(newItems)
                              }}
                              placeholder="Reason"
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setSelectedGR(null)
                  setReturnItems([])
                  setReturnReason('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReturn}
                disabled={!selectedGR}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
