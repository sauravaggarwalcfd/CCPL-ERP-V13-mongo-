import { useState, useEffect } from 'react'
import { useLayout } from '../context/LayoutContext'
import { Check, X, Eye, Package } from 'lucide-react'
import { items } from '../services/api'
import { purchaseRequestApi } from '../services/purchaseRequestApi'
import toast from 'react-hot-toast'

export default function Approvals() {
  const { setTitle } = useLayout()
  const [loading, setLoading] = useState(true)
  const [pendingPRs, setPendingPRs] = useState([])
  const [selectedPR, setSelectedPR] = useState(null)
  const [approving, setApproving] = useState(false)
  const [itemDetails, setItemDetails] = useState({})

  useEffect(() => {
    setTitle('Manage Approvals')
    fetchPendingApprovals()
  }, [setTitle])

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true)
      const res = await purchaseRequestApi.list()
      const allPrs = res?.data || res || []
      
      // Ensure it's an array
      const prsArray = Array.isArray(allPrs) ? allPrs : []
      
      const pending = prsArray.filter(
        (pr) => pr?.approval_status === 'pending' || pr?.status === 'pending' || pr?.status === 'SUBMITTED'
      )
      setPendingPRs(pending)

      // Fetch item details for all items in pending PRs
      const itemCodes = new Set()
      pending.forEach((pr) => {
        if (pr?.line_items && Array.isArray(pr.line_items)) {
          pr.line_items.forEach((line) => {
            if (line?.item_code) itemCodes.add(line.item_code)
          })
        }
      })

      if (itemCodes.size > 0) {
        try {
          const itemsRes = await items.getAll()
          const itemList = itemsRes?.data || itemsRes || []
          const itemMap = {}
          itemList.forEach((item) => {
            itemMap[item.item_code] = item
          })
          setItemDetails(itemMap)
        } catch (e) {
          console.warn('Error fetching item details:', e)
        }
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error)
      toast.error('Failed to load pending approvals')
      setPendingPRs([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (pr) => {
    if (!selectedPR) return
    try {
      setApproving(true)
      // Update PR status to approved
      await purchaseRequestApi.approve(pr.pr_code, {
        approval_status: 'approved',
        status: 'approved',
      })
      toast.success(`Purchase Request ${pr.pr_code} approved`)
      fetchPendingApprovals()
      setSelectedPR(null)
    } catch (error) {
      toast.error('Failed to approve: ' + (error.response?.data?.detail || error.message))
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (pr) => {
    if (!window.confirm(`Are you sure you want to reject ${pr.pr_code}?`)) return
    try {
      setApproving(true)
      await purchaseRequestApi.reject(pr.pr_code, {
        approval_status: 'rejected',
        status: 'rejected',
      })
      toast.success(`Purchase Request ${pr.pr_code} rejected`)
      fetchPendingApprovals()
      setSelectedPR(null)
    } catch (error) {
      toast.error('Failed to reject: ' + (error.response?.data?.detail || error.message))
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Loading approvals...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Approvals</h1>
        <p className="text-gray-600 mt-2">Review and approve pending purchase requests</p>
      </div>

      {pendingPRs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">All approvals are up to date!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending PRs List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <h2 className="text-lg font-semibold">Pending Approvals</h2>
              <p className="text-blue-100 text-sm mt-1">{pendingPRs.length} items</p>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {pendingPRs.map((pr) => (
                <div
                  key={pr.pr_code}
                  onClick={() => setSelectedPR(pr)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedPR?.pr_code === pr.pr_code ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="font-semibold text-gray-900">{pr.pr_code}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Supplier: {pr.supplier_name || pr.supplier_id || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Items: {pr.line_items?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(pr.pr_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details Panel */}
          {selectedPR ? (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                  <h3 className="text-2xl font-bold">{selectedPR.pr_code}</h3>
                  <p className="text-blue-100 mt-2">Review and approve this purchase request</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase">PR Date</label>
                      <p className="mt-1 text-gray-900">
                        {new Date(selectedPR.pr_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Supplier</label>
                      <p className="mt-1 text-gray-900">{selectedPR.supplier_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Status</label>
                      <p className="mt-1">
                        <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          Pending Approval
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Notes</label>
                      <p className="mt-1 text-gray-900">{selectedPR.notes || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      Line Items
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedPR.line_items && selectedPR.line_items.length > 0 ? (
                        selectedPR.line_items.map((item, idx) => {
                          const itemMaster = itemDetails[item.item_code]
                          return (
                            <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-semibold text-gray-900">{item.item_name}</p>
                                  <p className="text-sm text-gray-600">{item.item_code}</p>
                                </div>
                                <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded text-sm font-semibold">
                                  {item.quantity} {item.uom || 'PCS'}
                                </span>
                              </div>
                              {itemMaster && (
                                <div className="text-xs text-gray-600 mt-2">
                                  <p>Category: {itemMaster.category_name || 'N/A'}</p>
                                  <p>HSN: {itemMaster.hsn_code || 'N/A'}</p>
                                </div>
                              )}
                              <div className="mt-2 pt-2 border-t text-sm">
                                <p className="text-gray-700">
                                  Est. Rate: ₹{item.estimated_unit_rate || 0} | Total: ₹{(item.quantity * (item.estimated_unit_rate || 0)).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-gray-500">No items in this request</p>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{selectedPR.line_items?.reduce((sum, item) => sum + (item.quantity * (item.estimated_unit_rate || 0)), 0).toFixed(2) || 0}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t pt-6 flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedPR)}
                      disabled={approving}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                    >
                      <Check className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedPR)}
                      disabled={approving}
                      className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-8 flex items-center justify-center">
              <div className="text-center">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a purchase request to review</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
