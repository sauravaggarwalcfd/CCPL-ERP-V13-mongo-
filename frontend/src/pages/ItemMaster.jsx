import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Download, Edit2, Trash2, Eye, X, Archive, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import ItemCreateForm from '../components/items/ItemCreateForm'
import ItemEditForm from '../components/items/ItemEditForm'
import { items as itemsApi, categoryHierarchy } from '../services/api'

export default function ItemMaster() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBinModal, setShowBinModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [binItems, setBinItems] = useState([])

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [])

  // Fetch sub-categories when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory)
    } else {
      setSubCategories([])
      fetchItems()
    }
  }, [selectedCategory])

  // Fetch items when filters change
  useEffect(() => {
    fetchItems()
  }, [selectedCategory, selectedSubCategory])

  const fetchCategories = async () => {
    try {
      const response = await categoryHierarchy.getCategories({ is_active: true })
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }

  const fetchSubCategories = async (categoryCode) => {
    try {
      const response = await categoryHierarchy.getSubCategories({ 
        category_code: categoryCode,
        is_active: true 
      })
      setSubCategories(response.data || [])
    } catch (error) {
      console.error(error)
      setSubCategories([])
    }
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      const params = {}
      
      if (selectedCategory) params.category_code = selectedCategory
      if (selectedSubCategory) params.sub_category_code = selectedSubCategory
      
      const response = await itemsApi.list(params)
      setItems(response.data || [])
    } catch (error) {
      toast.error('Failed to fetch items')
      console.error(error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchBinItems = async () => {
    try {
      const response = await itemsApi.bin.list()
      setBinItems(response.data || [])
    } catch (error) {
      toast.error('Failed to fetch bin items')
      console.error(error)
      setBinItems([])
    }
  }

  const handleOpenBin = () => {
    fetchBinItems()
    setShowBinModal(true)
  }

  const handleRestoreItem = async (itemCode) => {
    try {
      await itemsApi.bin.restore(itemCode)
      toast.success('Item restored successfully')
      fetchBinItems()
      fetchItems()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to restore item')
      console.error(error)
    }
  }

  const handlePermanentDelete = async (itemCode) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete "${itemCode}"?\n\nThis action CANNOT be undone!\nThe SKU will be available for reuse.`)) {
      return
    }

    try {
      await itemsApi.bin.permanentDelete(itemCode)
      toast.success('Item permanently deleted. SKU is now available for reuse.')
      fetchBinItems()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete item')
      console.error(error)
    }
  }

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
    setSelectedSubCategory('')
  }

  const handleViewItem = (item) => {
    setSelectedItem(item)
    setShowViewModal(true)
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setShowEditModal(true)
  }

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete item "${item.item_name}" (${item.item_code})?`)) {
      return
    }

    try {
      await itemsApi.delete(item.item_code)
      toast.success('Item deleted successfully')
      fetchItems()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete item')
      console.error(error)
    }
  }

  const filteredItems = items.filter(item =>
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-lg">
          <h1 className="text-3xl font-bold">Item Master</h1>
          <p className="text-blue-100 mt-1">Manage items, categories, and inventory</p>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Category Filter */}
              <div>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">All Sub-Categories</option>
                  {subCategories.map(subcat => (
                    <option key={subcat.code} value={subcat.code}>
                      {subcat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition flex-1"
                >
                  <Plus size={20} /> Add Item
                </button>
                <button
                  onClick={handleOpenBin}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition"
                  title="View Deleted Items (Bin)"
                >
                  <Archive size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No items found</p>
                <p className="text-sm mt-2">Create your first item using the "Add Item" button</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item Code</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Sub-Category</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Size | Color</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Selling Price</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm bg-blue-50 px-3 py-1 rounded text-blue-700">
                            {item.item_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.item_name}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.material && `${item.material} • ${item.weight}g`}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            {item.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                            {item.sub_category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {item.size_name && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">{item.size_name}</span>}
                            {item.color_name && <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded">{item.color_name}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-gray-900">₹{item.selling_price.toFixed(2)}</div>
                          <p className="text-xs text-gray-500">MRP: ₹{item.mrp.toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleViewItem(item)}
                              className="p-2 hover:bg-blue-100 rounded text-blue-600 transition" 
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => handleEditItem(item)}
                              className="p-2 hover:bg-orange-100 rounded text-orange-600 transition" 
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item)}
                              className="p-2 hover:bg-red-100 rounded text-red-600 transition" 
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-gray-600 text-sm">Total Items</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{filteredItems.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-gray-600 text-sm">Total Categories</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{categories.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-gray-600 text-sm">Total Sub-Categories</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{subCategories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal - New Enhanced Form */}
      <ItemCreateForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchItems}
      />

      {/* View Item Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Item Details</h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Item Code</label>
                  <p className="text-gray-900 mt-1">{selectedItem.item_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Item Name</label>
                  <p className="text-gray-900 mt-1">{selectedItem.item_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Item Type</label>
                  <p className="text-gray-900 mt-1">{selectedItem.item_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <p className="text-gray-900 mt-1">{selectedItem.category_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Sub-Category</label>
                  <p className="text-gray-900 mt-1">{selectedItem.sub_category_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Division</label>
                  <p className="text-gray-900 mt-1">{selectedItem.division_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Class</label>
                  <p className="text-gray-900 mt-1">{selectedItem.class_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Sub-Class</label>
                  <p className="text-gray-900 mt-1">{selectedItem.sub_class_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Brand</label>
                  <p className="text-gray-900 mt-1">{selectedItem.brand || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Model</label>
                  <p className="text-gray-900 mt-1">{selectedItem.model || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Size</label>
                  <p className="text-gray-900 mt-1">{selectedItem.size || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Color</label>
                  <p className="text-gray-900 mt-1">{selectedItem.color || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Unit</label>
                  <p className="text-gray-900 mt-1">{selectedItem.unit || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">GST Rate</label>
                  <p className="text-gray-900 mt-1">{selectedItem.gst_rate || 0}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Purchase Price</label>
                  <p className="text-gray-900 mt-1">₹{selectedItem.purchase_price?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Selling Price</label>
                  <p className="text-gray-900 mt-1">₹{selectedItem.selling_price?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">MRP</label>
                  <p className="text-gray-900 mt-1">₹{selectedItem.mrp?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">HSN/SAC</label>
                  <p className="text-gray-900 mt-1">{selectedItem.hsn_sac || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p className="text-gray-900 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedItem.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedItem.status?.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
              
              {selectedItem.description && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1">{selectedItem.description}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      <ItemEditForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={fetchItems}
        item={selectedItem}
      />

      {/* Bin Modal */}
      {showBinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Archive size={24} className="text-gray-600" />
                  Recycle Bin
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Items deleted will be automatically removed after 10 days
                </p>
              </div>
              <button 
                onClick={() => setShowBinModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {binItems.length === 0 ? (
                <div className="text-center py-12">
                  <Archive size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">Bin is empty</p>
                  <p className="text-gray-400 text-sm mt-2">Deleted items will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deleted Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Days in Bin</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {binItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.item_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.category_name}
                            {item.sub_category_name && ` > ${item.sub_category_name}`}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(item.deleted_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`font-medium ${
                              item.days_in_bin > 7 ? 'text-red-600' : 
                              item.days_in_bin > 5 ? 'text-orange-600' : 
                              'text-gray-600'
                            }`}>
                              {item.days_in_bin} {item.days_in_bin === 1 ? 'day' : 'days'}
                            </span>
                            {item.days_in_bin > 10 && (
                              <span className="ml-2 text-xs text-red-500">(Cannot restore)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              {item.can_restore && (
                                <button
                                  onClick={() => handleRestoreItem(item.item_code)}
                                  className="p-2 hover:bg-green-100 rounded text-green-600 transition"
                                  title="Restore Item"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => handlePermanentDelete(item.item_code)}
                                className="p-2 hover:bg-red-100 rounded text-red-600 transition"
                                title="Permanently Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total items in bin: <span className="font-semibold">{binItems.length}</span>
              </div>
              <button
                onClick={() => setShowBinModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
