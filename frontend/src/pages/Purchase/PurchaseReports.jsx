import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, AlertTriangle, Users, Package, CreditCard, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function PurchaseReports() {
  const [summary, setSummary] = useState(null)
  const [pendingPOs, setPendingPOs] = useState([])
  const [outstandingBills, setOutstandingBills] = useState(null)
  const [vendorPerformance, setVendorPerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const [summaryRes, poRes, billsRes, vendorRes] = await Promise.all([
        api.get('/purchase/reports/purchase-summary'),
        api.get('/purchase/reports/pending-po'),
        api.get('/purchase/reports/outstanding-bills'),
        api.get('/purchase/reports/vendor-performance')
      ])

      setSummary(summaryRes.data)
      setPendingPOs(poRes.data.orders || [])
      setOutstandingBills(billsRes.data)
      setVendorPerformance(vendorRes.data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Reports</h1>
            <p className="text-sm text-gray-500">Analytics and insights</p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total POs</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.total_purchase_orders || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total PO Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary?.total_po_value || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Goods Receipts</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.total_goods_receipts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Pending Bills</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.pending_bills_count || 0}</p>
              <p className="text-xs text-red-600">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summary?.pending_bills_value || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b">
          <div className="flex gap-1 p-2">
            {[
              { id: 'summary', label: 'PO Status', icon: Package },
              { id: 'pending', label: 'Pending POs', icon: AlertTriangle },
              { id: 'bills', label: 'Outstanding Bills', icon: CreditCard },
              { id: 'vendors', label: 'Vendor Performance', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* PO Status Breakdown */}
          {activeTab === 'summary' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Purchase Order Status Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-700">{summary?.po_status_breakdown?.draft || 0}</p>
                  <p className="text-sm text-gray-500">Draft</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{summary?.po_status_breakdown?.approved || 0}</p>
                  <p className="text-sm text-gray-500">Approved</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{summary?.po_status_breakdown?.received || 0}</p>
                  <p className="text-sm text-gray-500">Received</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending POs */}
          {activeTab === 'pending' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Pending Purchase Orders ({pendingPOs.length})</h3>
              {pendingPOs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pending purchase orders</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">PO Code</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Vendor</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Delivery Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingPOs.map((po, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-blue-600">{po.po_code}</td>
                        <td className="px-4 py-2">{po.vendor_name}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(po.total_amount)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            {po.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Outstanding Bills */}
          {activeTab === 'bills' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Outstanding Bills</h3>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Outstanding</p>
                  <p className="text-xl font-bold text-red-600">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(outstandingBills?.total_outstanding || 0)}
                  </p>
                </div>
              </div>

              {/* Categorized Bills */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Overdue</h4>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{outstandingBills?.overdue?.length || 0}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Due Soon (7 days)</h4>
                  <p className="text-2xl font-bold text-yellow-600">{outstandingBills?.due_soon?.length || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Upcoming</h4>
                  <p className="text-2xl font-bold text-green-600">{outstandingBills?.upcoming?.length || 0}</p>
                </div>
              </div>

              {outstandingBills?.all_bills?.length > 0 && (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Bill Code</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Vendor</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Pending</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {outstandingBills.all_bills.map((bill, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-purple-600">{bill.bill_code}</td>
                        <td className="px-4 py-2">{bill.vendor_name}</td>
                        <td className="px-4 py-2 text-right font-semibold text-red-600">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.pending_amount)}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Vendor Performance */}
          {activeTab === 'vendors' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Vendor Performance</h3>
              {vendorPerformance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No vendor data available</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Vendor</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total Orders</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Completed</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total Value</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Avg Order</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Returns</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendorPerformance.map((vendor, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{vendor.vendor_name}</p>
                            <p className="text-xs text-gray-500">{vendor.vendor_code}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">{vendor.total_orders}</td>
                        <td className="px-4 py-2 text-right text-green-600">{vendor.completed_orders}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(vendor.total_value)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(vendor.average_order_value)}
                        </td>
                        <td className="px-4 py-2 text-right text-orange-600">{vendor.returns_count}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`font-semibold ${vendor.completion_rate >= 80 ? 'text-green-600' : vendor.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vendor.completion_rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
