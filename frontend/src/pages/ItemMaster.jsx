import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Download, Edit2, Trash2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

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

  // Form state
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    item_description: '',
    category_id: '',
    sub_category_id: '',
    color_id: '',
    size_id: '',
    brand_id: '',
    uom: 'PCS',
    inventory_type: 'stocked',
    cost_price: 0,
    selling_price: 0,
    mrp: 0,
    hsn_code: '',
    gst_rate: 5,
    min_stock_level: 10,
    max_stock_level: 100,
    reorder_point: 20,
    reorder_quantity: 50,
    material: '',
    weight: '',
    care_instructions: '',
    barcode: '',
  })

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

  const getToken = () => localStorage.getItem('access_token')

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/items/categories', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const data = await response.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch categories')
      console.error(error)
    }
  }

  const fetchSubCategories = async (categoryId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/items/sub-categories?category_id=${categoryId}`,
        { headers: { 'Authorization': `Bearer ${getToken()}` } }
      )
      const data = await response.json()
      setSubCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setSubCategories([])
    }
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      let url = 'http://127.0.0.1:8000/api/items/items'
      const params = []
      
      if (selectedCategory) params.push(`category_id=${selectedCategory}`)
      if (selectedSubCategory) params.push(`sub_category_id=${selectedSubCategory}`)
      
      if (params.length > 0) url += '?' + params.join('&')

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const data = await response.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch items')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
    setSelectedSubCategory('')
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    
    if (!formData.item_code || !formData.item_name || !formData.category_id || !formData.sub_category_id) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/items/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...formData,
          cost_price: parseFloat(formData.cost_price),
          selling_price: parseFloat(formData.selling_price),
          mrp: parseFloat(formData.mrp),
          gst_rate: parseFloat(formData.gst_rate),
          min_stock_level: parseInt(formData.min_stock_level),
          max_stock_level: parseInt(formData.max_stock_level),
          reorder_point: parseInt(formData.reorder_point),
          reorder_quantity: parseInt(formData.reorder_quantity),
          weight: formData.weight ? parseFloat(formData.weight) : null,
        })
      })

      if (response.ok) {
        toast.success('Item created successfully!')
        setShowAddModal(false)
        setFormData({
          item_code: '', item_name: '', item_description: '',
          category_id: '', sub_category_id: '',
          color_id: '', size_id: '', brand_id: '',
          uom: 'PCS', inventory_type: 'stocked',
          cost_price: 0, selling_price: 0, mrp: 0,
          hsn_code: '', gst_rate: 5,
          min_stock_level: 10, max_stock_level: 100,
          reorder_point: 20, reorder_quantity: 50,
          material: '', weight: '', care_instructions: '', barcode: '',
        })
        fetchItems()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to create item')
      }
    } catch (error) {
      toast.error('Error creating item')
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
                    <option key={cat.id} value={cat.category_id}>
                      {cat.category_name}
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
                    <option key={subcat.id} value={subcat.sub_category_id}>
                      {subcat.sub_category_name}
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

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
              <h2 className="text-2xl font-bold">Add New Item</h2>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              {/* Item Code & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.item_code}
                    onChange={(e) => setFormData({...formData, item_code: e.target.value})}
                    placeholder="TSHRT-M-BLUE-001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                    placeholder="Men's T-Shirt - Blue (M)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Category & Sub-Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => {
                      setFormData({...formData, category_id: e.target.value, sub_category_id: ''})
                      if (e.target.value) fetchSubCategories(e.target.value)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.category_id}>{cat.category_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category *</label>
                  <select
                    required
                    value={formData.sub_category_id}
                    onChange={(e) => setFormData({...formData, sub_category_id: e.target.value})}
                    disabled={!formData.category_id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Sub-Category</option>
                    {subCategories.map(subcat => (
                      <option key={subcat.id} value={subcat.sub_category_id}>{subcat.sub_category_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attributes */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size ID</label>
                  <input
                    type="text"
                    value={formData.size_id}
                    onChange={(e) => setFormData({...formData, size_id: e.target.value})}
                    placeholder="M"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color ID</label>
                  <input
                    type="text"
                    value={formData.color_id}
                    onChange={(e) => setFormData({...formData, color_id: e.target.value})}
                    placeholder="BLUE"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand ID</label>
                  <input
                    type="text"
                    value={formData.brand_id}
                    onChange={(e) => setFormData({...formData, brand_id: e.target.value})}
                    placeholder="BRAND"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({...formData, mrp: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description & Material */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    placeholder="100% Cotton"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    placeholder="150"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Stock Levels */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
                  <input
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({...formData, max_stock_level: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  Create Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
