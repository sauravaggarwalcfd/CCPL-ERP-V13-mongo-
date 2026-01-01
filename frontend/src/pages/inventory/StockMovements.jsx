import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, RefreshCw, Search, Filter } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function StockMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    fetchMovements()
  }, [filterType])

  const fetchMovements = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType) params.append('movement_type', filterType)
      params.append('limit', '100')

      const response = await api.get(`/inventory/stock-movements/list?${params.toString()}`)
      setMovements(response.data)
    } catch (error) {
      console.error('Error fetching movements:', error)
      toast.error('Failed to load stock movements')
    } finally {
      setLoading(false)
    }
  }

  const filteredMovements = movements.filter(m =>
    m.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getMovementTypeStyle = (type) => {
    switch (type) {
      case 'IN':
        return 'bg-green-100 text-green-800'
      case 'OUT':
        return 'bg-red-100 text-red-800'
      case 'ADJUSTMENT':
        return 'bg-yellow-100 text-yellow-800'
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800'
      case 'ISSUE':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-gray-500">Track all inventory movements</p>
        </div>
        <button
          onClick={fetchMovements}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
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
                placeholder="Search by item code, name, or reference..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ISSUE">Issue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No stock movements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Movement ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-900">
                        {movement.movement_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{movement.item_code}</p>
                        <p className="text-sm text-gray-500">{movement.item_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getMovementTypeStyle(movement.movement_type)}`}>
                        {movement.movement_type === 'IN' && <ArrowDownRight className="w-3 h-3" />}
                        {movement.movement_type === 'OUT' && <ArrowUpRight className="w-3 h-3" />}
                        {movement.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm">
                        <span className="text-gray-400">{movement.balance_before}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium text-gray-900">{movement.balance_after}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {movement.reference_number && (
                          <p className="text-sm text-gray-900">{movement.reference_number}</p>
                        )}
                        {movement.remarks && (
                          <p className="text-xs text-gray-500">{movement.remarks}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {movement.created_at ? new Date(movement.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
