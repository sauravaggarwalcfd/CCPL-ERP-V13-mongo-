import { useState, useEffect } from 'react'
import { 
  FileText, Plus, Eye, Check, X, Search, Filter, RefreshCw, 
  Edit2, Trash2, Send, AlertCircle, Clock, CheckCircle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import PurchaseRequestForm from './PurchaseRequestForm'

export default function PurchaseRequests() {
  const [prs, setPrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPR, setEditingPR] = useState(null)
  const [viewingPR, setViewingPR] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchPRs()
    fetchStats()
  }, [statusFilter, priorityFilter])

  const fetchPRs = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter

      const response = await api.get('/purchase/purchase-requests', { params })
      setPrs(response.data || [])
    } catch (error) {
      console.error('Error fetching PRs:', error)
      toast.error('Failed to load purchase requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/purchase/purchase-requests/stats/summary')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSubmit = async (prCode) => {
    try {
      await api.put(`/purchase/purchase-requests/${prCode}/submit`)
      toast.success('Purchase Request submitted for approval')
      fetchPRs()
      fetchStats()
    } catch (error) {
      console.error('Error submitting PR:', error)
      toast.error(error.response?.data?.detail || 'Failed to submit PR')
    }
  }

  const handleApprove = async (prCode) => {
    try {
      await api.put(`/purchase/purchase-requests/${prCode}/approve`, {})
      toast.success('Purchase Request approved')
      fetchPRs()
      fetchStats()
    } catch (error) {
      console.error('Error approving PR:', error)
      toast.error(error.response?.data?.detail || 'Failed to approve PR')
    }
  }

  const handleReject = async (prCode) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    try {
      await api.put(`/purchase/purchase-requests/${prCode}/reject`, { rejection_reason: reason })
      toast.success('Purchase Request rejected')
      fetchPRs()
      fetchStats()
    } catch (error) {
      console.error('Error rejecting PR:', error)
      toast.error(error.response?.data?.detail || 'Failed to reject PR')
    }
  }

  const handleDelete = async (prCode) => {
    if (!window.confirm('Are you sure you want to cancel this Purchase Request?')) return

    try {
      await api.delete(`/purchase/purchase-requests/${prCode}`)
      toast.success('Purchase Request cancelled')
      fetchPRs()
      fetchStats()
    } catch (error) {
      console.error('Error deleting PR:', error)
      toast.error(error.response?.data?.detail || 'Failed to cancel PR')
    }
  }

  const handleEdit = (pr) => {
    setEditingPR(pr)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingPR(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    fetchPRs()
    fetchStats()
  }

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-orange-100 text-orange-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'DRAFT': return <Clock className="w-3 h-3" />
      case 'SUBMITTED': return <Send className="w-3 h-3" />
      case 'APPROVED': return <CheckCircle className="w-3 h-3" />
      case 'REJECTED': return <XCircle className="w-3 h-3" />
      case 'CONVERTED': return <Check className="w-3 h-3" />
      default: return <AlertCircle className="w-3 h-3" />
    }
  }

  const getPriorityBadge = (priority) => {
    const styles = {
      LOW: 'bg-gray-100 text-gray-600',
      NORMAL: 'bg-blue-50 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600',
    }
    return styles[priority] || 'bg-gray-100 text-gray-600'
  }

  const filteredPRs = prs.filter(pr =>
    pr.pr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pr.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pr.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
            <p className="text-sm text-gray-500">Create and manage purchase requests</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create PR
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Draft</p>
            <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Pending</p>
            <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Converted</p>
            <p className="text-2xl font-bold text-purple-600">{stats.converted}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by PR code, requester, or purpose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CONVERTED">Converted</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <button
            onClick={fetchPRs}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* PR List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No purchase requests found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Create your first purchase request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PR Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPRs.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{pr.pr_code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pr.pr_date ? new Date(pr.pr_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{pr.requested_by_name || pr.requested_by}</div>
                      {pr.department && (
                        <div className="text-xs text-gray-500">{pr.department}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {pr.purpose || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{pr.total_items} items</div>
                      <div className="text-xs text-gray-500">Qty: {pr.total_quantity}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(pr.priority)}`}>
                        {pr.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(pr.status)}`}>
                        {getStatusIcon(pr.status)}
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingPR(pr)}
                          className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {pr.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => handleEdit(pr)}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSubmit(pr.pr_code)}
                              className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Submit for Approval"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(pr.pr_code)}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {pr.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleApprove(pr.pr_code)}
                              className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(pr.pr_code)}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <PurchaseRequestForm
          pr={editingPR}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* View Modal */}
      {viewingPR && (
        <PurchaseRequestView
          pr={viewingPR}
          onClose={() => setViewingPR(null)}
        />
      )}
    </div>
  )
}

// View Component
function PurchaseRequestView({ pr, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetails()
  }, [pr.pr_code])

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/purchase/purchase-requests/${pr.pr_code}`)
      setDetails(response.data)
    } catch (error) {
      console.error('Error fetching PR details:', error)
      toast.error('Failed to load PR details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-orange-100 text-orange-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Purchase Request Details</h2>
            <p className="text-sm text-gray-500">{pr.pr_code}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : details ? (
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium">{details.pr_date ? new Date(details.pr_date).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Requester</p>
                <p className="font-medium">{details.requested_by_name || details.requested_by}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium">{details.department || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(details.status)}`}>
                  {details.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <p className="font-medium">{details.priority}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Required By</p>
                <p className="font-medium">{details.required_by_date ? new Date(details.required_by_date).toLocaleDateString() : '-'}</p>
              </div>
            </div>

            {details.purpose && (
              <div>
                <p className="text-xs text-gray-500">Purpose</p>
                <p className="font-medium">{details.purpose}</p>
              </div>
            )}

            {details.justification && (
              <div>
                <p className="text-xs text-gray-500">Justification</p>
                <p className="font-medium">{details.justification}</p>
              </div>
            )}

            {/* Items Table */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Line Items ({details.total_items})</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Est. Rate</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Est. Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {details.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm text-gray-500">{item.line_number}</td>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium">{item.item_name}</div>
                          <div className="text-xs text-gray-500">{item.item_code}</div>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm">{item.unit}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.estimated_unit_rate?.toFixed(2) || '-'}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.estimated_amount?.toFixed(2) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="5" className="px-3 py-2 text-sm font-medium text-right">Total:</td>
                      <td className="px-3 py-2 text-sm font-bold text-right">{details.estimated_total?.toFixed(2) || '-'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Approval/Rejection Info */}
            {details.status === 'APPROVED' && details.approved_by && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-800">Approved by {details.approved_by_name || details.approved_by}</p>
                <p className="text-xs text-green-600">{details.approved_date ? new Date(details.approved_date).toLocaleString() : ''}</p>
                {details.approval_notes && <p className="text-sm text-green-700 mt-1">{details.approval_notes}</p>}
              </div>
            )}

            {details.status === 'REJECTED' && details.rejected_by && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800">Rejected by {details.rejected_by_name || details.rejected_by}</p>
                <p className="text-xs text-red-600">{details.rejected_date ? new Date(details.rejected_date).toLocaleString() : ''}</p>
                {details.rejection_reason && <p className="text-sm text-red-700 mt-1">Reason: {details.rejection_reason}</p>}
              </div>
            )}

            {details.notes && (
              <div>
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm">{details.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">No details available</div>
        )}
      </div>
    </div>
  )
}
