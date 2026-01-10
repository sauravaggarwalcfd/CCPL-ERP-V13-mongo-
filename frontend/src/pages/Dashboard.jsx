import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import { Box, AlertTriangle, ShoppingCart, CheckCircle, Package, Plus } from 'lucide-react'
import { items, purchaseOrders } from '../services/api'
import { purchaseRequestApi } from '../services/purchaseRequestApi'
import ApprovalBox from '../components/dashboard/ApprovalBox'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { setTitle } = useLayout()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockAlerts: 0,
    pendingPos: 0,
    pendingApprovals: 0,
  })

  useEffect(() => {
    setTitle('Dashboard')
    fetchDashboardStats()
  }, [setTitle])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Fetch data with error handling
      let allItems = []
      let allPos = []
      let allPrs = []
      
      try {
        const itemsRes = await items.getAll()
        allItems = itemsRes?.data || itemsRes || []
      } catch (e) {
        console.warn('Error fetching items:', e)
      }
      
      try {
        const posRes = await purchaseOrders.getAll()
        allPos = posRes?.data || posRes || []
      } catch (e) {
        console.warn('Error fetching POs:', e)
      }
      
      try {
        const prsRes = await purchaseRequestApi.list()
        allPrs = prsRes?.data || prsRes || []
      } catch (e) {
        console.warn('Error fetching PRs:', e)
      }

      // Ensure arrays
      if (!Array.isArray(allItems)) allItems = []
      if (!Array.isArray(allPos)) allPos = []
      if (!Array.isArray(allPrs)) allPrs = []

      // Calculate stats with safe fallbacks
      const lowStockCount = allItems.filter(
        (item) => {
          const qty = item.opening_stock || item.quantity || 0
          const minStock = item.min_stock_level || 10
          return qty > 0 && qty <= minStock
        }
      ).length

      const pendingPoCount = allPos.filter((po) => 
        po.status === 'PENDING' || po.status === 'pending' || po.status === 'SUBMITTED'
      ).length
      
      const pendingApprovalCount = allPrs.filter((pr) => 
        pr.approval_status === 'pending' || pr.status === 'pending' || pr.status === 'SUBMITTED'
      ).length

      setStats({
        totalItems: allItems.length,
        lowStockAlerts: lowStockCount,
        pendingPos: pendingPoCount,
        pendingApprovals: pendingApprovalCount,
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      toast.error('Failed to load dashboard data')
      // Set default stats
      setStats({
        totalItems: 0,
        lowStockAlerts: 0,
        pendingPos: 0,
        pendingApprovals: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>
  }

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your inventory system.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalItems}
          color="bg-blue-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Alerts"
          value={stats.lowStockAlerts}
          color="bg-yellow-500"
        />
        <StatCard
          icon={ShoppingCart}
          label="Pending POs"
          value={stats.pendingPos}
          color="bg-purple-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Pending Approvals"
          value={stats.pendingApprovals}
          color="bg-green-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/purchase/purchase-requests')}
              className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-medium transition text-left flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Create Purchase Indent
            </button>
            <button
              onClick={() => navigate('/purchase/purchase-orders')}
              className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-medium transition text-left flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Create Purchase Order
            </button>
            <button
              onClick={() => navigate('/purchase/goods-receipt')}
              className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-medium transition text-left flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              New GRN
            </button>
            <button
              onClick={() => navigate('/purchase/purchase-returns')}
              className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-medium transition text-left flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Issue Material
            </button>
            <button
              onClick={() => navigate('/approvals')}
              className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 text-green-900 rounded-lg font-bold transition text-left flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5" />
              Manage Approvals
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="flex items-center justify-center h-40 text-gray-500">
            <p>No recent activity to display</p>
          </div>
        </div>
      </div>

      {/* Approvals Section */}
      <div className="mb-8">
        <ApprovalBox />
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Item Master */}
        <div
          onClick={() => navigate('/item-master')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg hover:scale-105 transition cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Box className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Item Master</h3>
          </div>
          <p className="text-gray-600">Manage items, categories, and inventory details</p>
        </div>

        {/* Purchase Orders */}
        <div
          onClick={() => navigate('/purchase/purchase-orders')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg hover:scale-105 transition cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
          </div>
          <p className="text-gray-600">Create and manage purchase orders</p>
        </div>

        {/* Stock Management */}
        <div
          onClick={() => navigate('/inventory')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg hover:scale-105 transition cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Stock Management</h3>
          </div>
          <p className="text-gray-600">Handle stock inward, transfers, and adjustments</p>
        </div>
      </div>
    </div>
  )
}
