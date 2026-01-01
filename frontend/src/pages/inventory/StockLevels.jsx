import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Search, Package } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function StockLevels() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  useEffect(() => {
    fetchStockLevels()
  }, [showLowStockOnly])

  const fetchStockLevels = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (showLowStockOnly) params.append('low_stock_only', 'true')

      const response = await api.get(`/inventory/stock-levels/list?${params.toString()}`)
      setItems(response.data)
    } catch (error) {
      console.error('Error fetching stock levels:', error)
      toast.error('Failed to load stock levels')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item =>
    item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockStatus = (item) => {
    if (item.current_stock <= item.minimum_stock) {
      return { label: 'Critical', color: 'bg-red-100 text-red-800', icon: 'text-red-500' }
    }
    if (item.current_stock <= item.reorder_point) {
      return { label: 'Low', color: 'bg-yellow-100 text-yellow-800', icon: 'text-yellow-500' }
    }
    if (item.current_stock >= item.maximum_stock) {
      return { label: 'Overstock', color: 'bg-blue-100 text-blue-800', icon: 'text-blue-500' }
    }
    return { label: 'Normal', color: 'bg-green-100 text-green-800', icon: 'text-green-500' }
  }

  const getStockPercentage = (item) => {
    if (item.maximum_stock === 0) return 0
    return Math.min(100, Math.round((item.current_stock / item.maximum_stock) * 100))
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Levels</h1>
          <p className="text-gray-500">Monitor inventory levels and alerts</p>
        </div>
        <button
          onClick={fetchStockLevels}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by item code or name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show low stock only</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{showLowStockOnly ? 'All items have sufficient stock' : 'No stock level data found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Min Level
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Max Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Level
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item)
                  const percentage = getStockPercentage(item)

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.is_low_stock && (
                            <AlertTriangle className={`w-5 h-5 ${status.icon}`} />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{item.item_code}</p>
                            <p className="text-sm text-gray-500">{item.item_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold ${item.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.current_stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {item.minimum_stock}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {item.reorder_point}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {item.maximum_stock}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {item.shortage > 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            Shortage: {item.shortage}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percentage <= 25 ? 'bg-red-500' :
                                  percentage <= 50 ? 'bg-yellow-500' :
                                  percentage <= 75 ? 'bg-blue-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
