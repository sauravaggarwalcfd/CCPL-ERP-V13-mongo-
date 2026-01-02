import { useState, useEffect } from 'react'
import { Package, Plus, Check, Search, RefreshCw, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function GoodsReceipt() {
  const [grs, setGrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pos, setPos] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [receivedItems, setReceivedItems] = useState([])

  useEffect(() => {
    fetchGRs()
    fetchPOs()
  }, [])

  const fetchGRs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/purchase/goods-receipts')
      setGrs(response.data || [])
    } catch (error) {
      console.error('Error fetching GRs:', error)
      toast.error('Failed to load goods receipts')
    } finally {
      setLoading(false)
    }
  }

  const fetchPOs = async () => {
    try {
      const response = await api.get('/purchase/purchase-orders', { params: { status: 'APPROVED' } })
      setPos(response.data || [])
    } catch (error) {
      console.error('Error fetching POs:', error)
    }
  }

  const handlePOSelect = (po) => {
    setSelectedPO(po)
    const items = (po.line_items || []).map(item => ({
      item_code: item.item_code,
      item_name: item.item_name,
      ordered_qty: item.quantity,
      received_qty: item.quantity,
      damaged_qty: 0,
      accepted_qty: item.quantity
    }))
    setReceivedItems(items)
  }

  const handleCreateGR = async () => {
    if (!selectedPO) {
      toast.error('Please select a Purchase Order')
      return
    }

    try {
      const payload = {
        po_code: selectedPO.po_code,
        vendor_code: selectedPO.vendor_code,
        vendor_name: selectedPO.vendor_name,
        received_items: receivedItems
      }

      await api.post('/purchase/goods-receipts', payload)
      toast.success('Goods Receipt created successfully')
      setShowCreateModal(false)
      setSelectedPO(null)
      setReceivedItems([])
      fetchGRs()
    } catch (error) {
      console.error('Error creating GR:', error)
      toast.error(error.response?.data?.detail || 'Failed to create Goods Receipt')
    }
  }

  const handleComplete = async (grCode) => {
    try {
      await api.put(`/purchase/goods-receipts/${grCode}/complete`)
      toast.success('Goods Receipt completed')
      fetchGRs()
    } catch (error) {
      console.error('Error completing GR:', error)
      toast.error(error.response?.data?.detail || 'Failed to complete GR')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-blue-100 text-blue-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const filteredGRs = grs.filter(gr =>
    gr.gr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gr.po_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gr.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Goods Receipt</h1>
            <p className="text-sm text-gray-500">Receive items from vendors</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create GR
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by GR code, PO code, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={fetchGRs}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : filteredGRs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No goods receipts found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GR Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PO Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredGRs.map((gr) => (
                <tr key={gr.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-green-600">{gr.gr_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-blue-600">{gr.po_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900">{gr.vendor_name || gr.vendor_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{gr.invoice_number || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{gr.received_items?.length || 0} items</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(gr.status)}`}>
                      {gr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">
                      {gr.created_at ? new Date(gr.created_at).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {gr.status === 'PENDING' && (
                        <button
                          onClick={() => handleComplete(gr.gr_code)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                          title="Complete"
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

      {/* Create GR Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4">
              <h2 className="text-xl font-bold">Create Goods Receipt</h2>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* PO Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Purchase Order</label>
                <select
                  value={selectedPO?.po_code || ''}
                  onChange={(e) => {
                    const po = pos.find(p => p.po_code === e.target.value)
                    handlePOSelect(po)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a PO...</option>
                  {pos.map(po => (
                    <option key={po.po_code} value={po.po_code}>
                      {po.po_code} - {po.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Table */}
              {selectedPO && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items to Receive</h3>
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Item Code</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Item Name</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Ordered</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Received</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Damaged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {receivedItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono text-sm">{item.item_code}</td>
                          <td className="px-3 py-2">{item.item_name}</td>
                          <td className="px-3 py-2 text-right">{item.ordered_qty}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.received_qty}
                              onChange={(e) => {
                                const newItems = [...receivedItems]
                                newItems[idx].received_qty = parseFloat(e.target.value) || 0
                                newItems[idx].accepted_qty = newItems[idx].received_qty - newItems[idx].damaged_qty
                                setReceivedItems(newItems)
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.damaged_qty}
                              onChange={(e) => {
                                const newItems = [...receivedItems]
                                newItems[idx].damaged_qty = parseFloat(e.target.value) || 0
                                newItems[idx].accepted_qty = newItems[idx].received_qty - newItems[idx].damaged_qty
                                setReceivedItems(newItems)
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
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
                  setSelectedPO(null)
                  setReceivedItems([])
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGR}
                disabled={!selectedPO}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Goods Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
