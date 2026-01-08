import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  FileText,
  ShoppingCart,
  Truck,
  Receipt,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { purchaseRequestApi } from '../../services/purchaseRequestApi'
import { purchaseOrders } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * ApprovalBox - Dashboard component showing pending approvals by category
 */
export default function ApprovalBox() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [approvalStats, setApprovalStats] = useState({
    pr: { pending: 0, approved: 0, rejected: 0 },
    po: { pending: 0, approved: 0, rejected: 0 }
  })

  useEffect(() => {
    fetchApprovalStats()
  }, [])

  const fetchApprovalStats = async () => {
    try {
      setLoading(true)

      // Fetch PR stats
      const prStatsRes = await purchaseRequestApi.getStats()
      const prStats = prStatsRes.data

      // Fetch PO stats - get submitted (pending) POs
      let poStats = { pending: 0, approved: 0 }
      try {
        const poSubmittedRes = await purchaseOrders.list({ status: 'SUBMITTED', limit: 1000 })
        const poApprovedRes = await purchaseOrders.list({ status: 'APPROVED', limit: 1000 })
        poStats.pending = poSubmittedRes.data?.items?.length || poSubmittedRes.data?.length || 0
        poStats.approved = poApprovedRes.data?.items?.length || poApprovedRes.data?.length || 0
      } catch (e) {
        console.log('PO stats not available')
      }

      setApprovalStats({
        pr: {
          pending: prStats.submitted || 0,
          approved: prStats.approved || 0,
          rejected: prStats.rejected || 0
        },
        po: poStats
      })
    } catch (error) {
      console.error('Error fetching approval stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const approvalCategories = [
    {
      id: 'pr',
      name: 'Purchase Requests',
      icon: FileText,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      pending: approvalStats.pr.pending,
      path: '/purchase/purchase-requests?status=SUBMITTED',
      description: 'PR awaiting approval'
    },
    {
      id: 'po',
      name: 'Purchase Orders',
      icon: ShoppingCart,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      pending: approvalStats.po.pending,
      path: '/purchase/purchase-orders?status=SUBMITTED',
      description: 'PO awaiting approval'
    },
    {
      id: 'grn',
      name: 'Goods Receipt',
      icon: Truck,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      pending: 0,
      path: '/inventory/grn',
      description: 'GRN pending verification'
    },
    {
      id: 'invoice',
      name: 'Invoices',
      icon: Receipt,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      pending: 0,
      path: '/accounting/invoices',
      description: 'Invoices for approval'
    }
  ]

  const totalPending = approvalCategories.reduce((sum, cat) => sum + cat.pending, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="text-indigo-600" size={24} />
          <h2 className="text-lg font-semibold text-gray-800">Approvals Needed</h2>
        </div>
        {totalPending > 0 && (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
            <AlertCircle size={14} />
            {totalPending} Pending
          </span>
        )}
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {approvalCategories.map((category) => {
          const Icon = category.icon
          const hasPending = category.pending > 0

          return (
            <button
              key={category.id}
              onClick={() => navigate(category.path)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md hover:scale-[1.02] text-left
                ${hasPending
                  ? `${category.lightColor} ${category.borderColor}`
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
            >
              {/* Pending Badge */}
              {hasPending && (
                <span className={`absolute -top-2 -right-2 w-6 h-6 ${category.color} text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm`}>
                  {category.pending}
                </span>
              )}

              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg ${hasPending ? category.color : 'bg-gray-400'} flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
              </div>

              {/* Content */}
              <h3 className={`font-medium text-sm ${hasPending ? category.textColor : 'text-gray-500'}`}>
                {category.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {hasPending ? `${category.pending} ${category.description}` : 'No pending items'}
              </p>

              {/* Arrow indicator on hover */}
              <ChevronRight
                size={16}
                className={`absolute bottom-3 right-3 ${hasPending ? category.textColor : 'text-gray-400'} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
            </button>
          )
        })}
      </div>

      {/* Quick Stats Row */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-yellow-600">
              <Clock size={14} />
              <span>{approvalStats.pr.pending + approvalStats.po.pending} Pending</span>
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 size={14} />
              <span>{approvalStats.pr.approved + approvalStats.po.approved} Approved Today</span>
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle size={14} />
              <span>{approvalStats.pr.rejected} Rejected</span>
            </span>
          </div>
          <button
            onClick={() => navigate('/purchase/purchase-requests')}
            className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
