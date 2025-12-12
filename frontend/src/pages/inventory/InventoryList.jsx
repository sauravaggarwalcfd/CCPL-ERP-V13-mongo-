export default function InventoryList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input type="text" placeholder="Search by SKU..." className="px-4 py-2 border border-gray-300 rounded-lg" />
        <select className="px-4 py-2 border border-gray-300 rounded-lg">
          <option>All Warehouses</option>
        </select>
        <select className="px-4 py-2 border border-gray-300 rounded-lg">
          <option>All Status</option>
          <option>In Stock</option>
          <option>Low Stock</option>
          <option>Out of Stock</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No inventory data available</p>
        <p className="text-sm text-gray-400 mt-2">Inventory tracking coming soon</p>
      </div>
    </div>
  )
}
