import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Download, Edit2, Trash2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import ItemCreateForm from '../components/items/ItemCreateForm'
import api, { categoryHierarchy } from '../services/api'

export default function ItemMaster() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

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
    }
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await categoryHierarchy.getCategories({ is_active: true })
      setCategories(Array.isArray(response.data) ? response.data : [])
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
      setSubCategories(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching sub-categories:', error)
      setSubCategories([])
    }
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await api.get('/items/', {
        params: {
          category_code: selectedCategory || undefined,
          sub_category_code: selectedSubCategory || undefined,
          is_active: true
        }
      })
      setItems(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (e) => {
    const selectedCode = e.target.value
    setSelectedCategory(selectedCode)
    setSelectedSubCategory('')
    if (selectedCode) {
      fetchSubCategories(selectedCode)
    } else {
      setSubCategories([])
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
                    <option key={cat.id} value={cat.code}>
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
                    <option key={subcat.id} value={subcat.code}>
                      {subcat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition"
              >
                <Plus size={20} /> Add Item
              </button>
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
                            <button className="p-2 hover:bg-blue-100 rounded text-blue-600 transition" title="View">
                              <Eye size={16} />
                            </button>
                            <button className="p-2 hover:bg-orange-100 rounded text-orange-600 transition" title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button className="p-2 hover:bg-red-100 rounded text-red-600 transition" title="Delete">
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
    </div>
  )
}
