import { useState, useEffect } from 'react'
import { Package, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function InventoryDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const response = await api.get('/inventory/dashboard')
      setDashboard(response.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      toast.error('Failed to load inventory dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-500">Overview of your inventory status</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard?.total_items || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Stock Qty */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Stock Qty</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard?.total_stock_qty?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Reserved Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Reserved Stock</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard?.total_reserved?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {dashboard?.low_stock_count || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Low Stock Alerts
            </h2>
          </div>
          <div className="p-6">
            {dashboard?.low_stock_items && dashboard.low_stock_items.length > 0 ? (
              <div className="space-y-4">
                {dashboard.low_stock_items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.item_code}</p>
                      <p className="text-sm text-gray-500">{item.item_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {item.current_stock} / {item.minimum_stock}
                      </p>
                      <p className="text-xs text-red-500">
                        Shortage: {item.shortage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>All items have sufficient stock</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Recent Movements
            </h2>
          </div>
          <div className="p-6">
            {dashboard?.recent_movements && dashboard.recent_movements.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recent_movements.map((movement, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {movement.movement_type === 'IN' ? (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <ArrowDownRight className="w-4 h-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <ArrowUpRight className="w-4 h-4 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{movement.item_code}</p>
                        <p className="text-xs text-gray-500">{movement.item_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent movements</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
