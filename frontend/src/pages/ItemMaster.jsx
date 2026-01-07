import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Filter, Download, Edit2, Trash2, Eye, X, Archive, RotateCcw, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLayout } from '../context/LayoutContext'
import ItemCreateForm from '../components/items/ItemCreateForm'
import { items as itemsApi, categoryHierarchy, files } from '../services/api'

export default function ItemMaster() {
  const { setTitle } = useLayout()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [loading, setLoading] = useState(true)
  // Sidebar panel (replaces modals)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState('none') // 'none' | 'create' | 'view' | 'edit' | 'bin' | 'preview'
  const [sidebarWidth, setSidebarWidth] = useState(420) // px, adjustable on drag
  const [isResizing, setIsResizing] = useState(false)
  const [lastX, setLastX] = useState(0)
  // Legacy modal flags (kept for compatibility but no longer used)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBinModal, setShowBinModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [binItems, setBinItems] = useState([])

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewType, setPreviewType] = useState('') // 'items', 'categories', 'filters'

  // Fetch categories on mount
  useEffect(() => {
    setTitle('Item Master')
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
      const itemsData = response.data || []
      console.log('[ITEMS] Fetched items:', itemsData.length)
      if (itemsData.length > 0) {
        console.log('[ITEMS] First item:', itemsData[0])
        console.log('[ITEMS] Has BASE64 image:', !!itemsData[0].image_base64)
      }
      setItems(itemsData)
    } catch (error) {
      toast.error('Failed to fetch items')
      console.error(error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Sidebar width resize handlers
  useEffect(() => {
    function onMouseMove(e) {
      if (!isResizing) return
      const delta = e.clientX - lastX
      setLastX(e.clientX)
      setSidebarWidth(prev => {
        const next = Math.max(320, Math.min(720, prev + delta))
        return next
      })
    }
    function onMouseUp() {
      if (isResizing) setIsResizing(false)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isResizing, lastX])

  // Refresh items list when the sidebar/panel closes (so quantities reflect recent edits)
  const prevSidebarOpenRef = useRef(sidebarOpen)
  useEffect(() => {
    if (prevSidebarOpenRef.current && !sidebarOpen) {
      // panel just closed
      fetchItems()
    }
    prevSidebarOpenRef.current = sidebarOpen
  }, [sidebarOpen])

  const startResize = (e) => {
    setIsResizing(true)
    setLastX(e.clientX)
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

  // Preview functionality
  const handleSectionPreview = (type) => {
    let data = null
    let title = ''

    switch (type) {
      case 'items':
        data = filteredItems
        title = 'Items Overview Preview'
        break
      case 'categories':
        data = categories
        title = 'Categories Preview'
        break
      case 'filters':
        data = {
          totalItems: items.length,
          filteredItems: filteredItems.length,
          selectedCategory,
          selectedSubCategory,
          searchTerm,
          categories: categories.length,
          subCategories: subCategories.length
        }
        title = 'Filters & Statistics Preview'
        break
      default:
        return
    }

    setPreviewType(type)
    setPreviewData(data)
    setSidebarView('preview')
    setSidebarOpen(true)
  }

  // Item preview functionality
  const handleItemPreview = (item) => {
    const data = {
      item_code: item.item_code,
      item_name: item.item_name,
      category: item.category_name,
      sub_category: item.sub_category_name,
      size: item.size_name,
      color: item.color_name,
      selling_price: item.selling_price,
      mrp: item.mrp,
      material: item.material,
      weight: item.weight,
      description: item.description || 'No description available'
    }
    
    setSelectedItem(item)
    setPreviewType('item_detail')
    setPreviewData(data)
    setSidebarView('preview')
    setSidebarOpen(true)
  }

  const closePreview = () => {
    setPreviewData(null)
    setPreviewType('')
    setSidebarOpen(false)
    setSidebarView('none')
  }

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
    setSelectedSubCategory('')
  }

  const handleViewItem = (item) => {
    setSelectedItem(item)
    setSidebarView('view')
    setSidebarOpen(true)
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setSidebarView('edit')
    setSidebarOpen(true)
  }

  const handleCopyItem = (item) => {
    // Create a copy of the item without the ID and codes, open in create mode
    // Keep original codes for reference to extract item type
    const copiedItem = {
      ...item,
      _id: undefined, // Remove MongoDB ID
      id: undefined, // Remove any ID field
      item_name: `${item.item_name} (Copy)`,
      original_sku: item.sku, // Keep original for type extraction
      original_item_code: item.item_code, // Keep original for type extraction
      sku: '', // Will be auto-generated
      item_code: '', // Will be auto-generated
    }
    console.log('[COPY] Creating copy from item:', item.item_code, 'Type code:', item.sku_type_code)
    setSelectedItem(copiedItem)
    setSidebarView('create')
    setSidebarOpen(true)
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
    <div className="flex flex-col h-full">
      {/* Top Bar - Filters & Actions */}
      <div className="bg-white p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-10">
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
          <div className="relative w-full sm:min-w-64 sm:w-auto">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:min-w-48 sm:w-auto">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.code} value={cat.code}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:min-w-48 sm:w-auto">
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              disabled={!selectedCategory}
              className="w-full px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">All Sub-Categories</option>
              {subCategories.map(subcat => (
                <option key={subcat.code} value={subcat.code}>
                  {subcat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSidebarView('create'); setSidebarOpen(true) }}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition whitespace-nowrap text-sm sm:text-base"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" /> 
            <span className="hidden xs:inline">Add Item</span>
            <span className="xs:hidden">Add</span>
          </button>
          <button
            onClick={handleOpenBin}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition"
            title="View Deleted Items (Bin)"
          >
            <Archive size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Items List */}
        <div className={`flex-1 overflow-auto p-2 sm:p-4 transition-all duration-300 ${sidebarOpen ? 'hidden lg:block lg:w-1/2' : 'w-full'}`}>
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
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Image</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Item</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">Category</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">Stock</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b hover:bg-blue-50 transition cursor-pointer"
                        onClick={() => handleViewItem(item)}
                        title="Click to view item details"
                      >
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          {item.image_base64 || item.thumbnail_url || item.image_url ? (
                            <img
                              src={
                                item.image_base64
                                  ? `data:${item.image_type || 'image/jpeg'};base64,${item.image_base64}`
                                  : files.getThumbnailUrl(item.thumbnail_url) || files.getFileUrl(item.image_url)
                              }
                              alt={item.item_name}
                              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border border-gray-200"
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23f3f4f6" width="48" height="48"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="10" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No img</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-1.5 sm:px-2 py-0.5 rounded inline-block w-fit" title="Stock Keeping Unit">
                              {item.sku || item.item_code}
                            </span>
                            <span className="font-bold text-gray-900 text-sm sm:text-base">{item.item_name}</span>
                            {item.color_name && <span className="text-xs text-gray-500">{item.color_name}</span>}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm hidden md:table-cell">
                          <div className="flex flex-col gap-1 text-gray-700">
                            {item.category_name && <div>L1 - {item.category_name}</div>}
                            {item.sub_category_name && <div>L2 - {item.sub_category_name}</div>}
                            {item.division_name && <div>L3 - {item.division_name}</div>}
                            {item.class_name && <div>L4 - {item.class_name}</div>}
                            {item.sub_class_name && <div>L5 - {item.sub_class_name}</div>}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-center">
                          <div className="font-semibold text-gray-900">{item.quantity ?? item.current_stock ?? 0}</div>
                          <p className="text-xs text-gray-600">Avail</p>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewItem(item)
                              }}
                              className="p-1.5 sm:p-2 hover:bg-blue-100 rounded text-blue-600 transition" 
                              title="View"
                            >
                              <Eye size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditItem(item)
                              }}
                              className="p-1.5 sm:p-2 hover:bg-orange-100 rounded text-orange-600 transition" 
                              title="Edit"
                            >
                              <Edit2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(item)
                              }}
                              className="p-2 hover:bg-red-100 rounded text-red-600 transition" 
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyItem(item)
                              }}
                              className="p-2 hover:bg-green-100 rounded text-green-600 transition" 
                              title="Copy this item"
                            >
                              <Plus size={16} />
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

        {/* Right Panel: Sidebar Form */}
        {sidebarOpen && (
          <div className="fixed lg:static inset-0 lg:w-1/2 border-l bg-gray-50 overflow-auto p-2 sm:p-4 transition-all duration-300 shadow-xl z-20">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 h-full overflow-hidden">
              {/* Mobile close button */}
              <div className="lg:hidden sticky top-0 bg-white z-10 p-3 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">{sidebarView === 'create' ? 'Add Item' : sidebarView === 'edit' ? 'Edit Item' : 'Item Details'}</h3>
                <button
                  onClick={() => { setSidebarOpen(false); setSidebarView('none') }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              
              {sidebarView === 'create' && (
                <ItemCreateForm
                  isOpen={true}
                  onClose={() => { setSidebarOpen(false); setSidebarView('none') }}
                  onSuccess={fetchItems}
                  variant="panel"
                />
              )}
              {sidebarView === 'edit' && selectedItem && (
                <ItemCreateForm
                  isOpen={true}
                  onClose={() => { setSidebarOpen(false); setSidebarView('none') }}
                  onSuccess={fetchItems}
                  item={selectedItem}
                  variant="panel"
                />
              )}
              {sidebarView === 'view' && selectedItem && (
                <div className="bg-white rounded-lg w-full h-full overflow-y-auto flex flex-col">
                  <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Item Details</h2>
                    <button onClick={() => { setSidebarOpen(false); setSidebarView('none') }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Header with Image and Basic Info */}
                    <div className="flex gap-6 items-start">
                      <div className="w-28 h-28 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {selectedItem.image_base64 || selectedItem.image_url ? (
                          <img
                            src={
                              selectedItem.image_base64
                                ? `data:${selectedItem.image_type || 'image/jpeg'};base64,${selectedItem.image_base64}`
                                : selectedItem.image_url
                            }
                            alt={selectedItem.item_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">image</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-mono text-gray-700 tracking-wide">
                          {selectedItem.sku || selectedItem.item_code}
                        </p>
                        <h3 className="text-xl font-bold text-gray-900 mt-1">{selectedItem.item_name}</h3>
                        <div className="mt-2 flex items-center gap-3 text-sm">
                          <span className="text-gray-600 font-medium">
                            {selectedItem.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-gray-600">
                            {selectedItem.item_type_name || selectedItem.item_type || 'Finished Goods'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="flex gap-8 pt-4 border-t">
                      {/* Left Column - Category Hierarchy */}
                      <div className="flex-1 space-y-1">
                        {selectedItem.category_name && (
                          <p className="text-gray-800">L1- {selectedItem.category_name}</p>
                        )}
                        {selectedItem.sub_category_name && (
                          <p className="text-gray-800">L2- {selectedItem.sub_category_name}</p>
                        )}
                        {selectedItem.division_name && (
                          <p className="text-gray-800">L3- {selectedItem.division_name}</p>
                        )}
                        {selectedItem.class_name && (
                          <p className="text-gray-800">L4- {selectedItem.class_name}</p>
                        )}
                        {selectedItem.sub_class_name && (
                          <p className="text-gray-800">L5- {selectedItem.sub_class_name}</p>
                        )}
                      </div>

                      {/* Right Column - Specification (from Category Config) */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-3">Specification</h4>
                        <div className="space-y-2 text-sm">
                          {/* Variant 1: Colour */}
                          {selectedItem.color_name && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">V1</span>
                              <span className="text-gray-600">Colour:</span>
                              <span className="font-medium text-gray-900">{selectedItem.color_name}</span>
                            </div>
                          )}

                          {/* Variant 2: Size or UOM */}
                          {(selectedItem.size_name || selectedItem.uom) && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">V2</span>
                              <span className="text-gray-600">{selectedItem.size_name ? 'Size:' : 'UOM:'}</span>
                              <span className="font-medium text-gray-900">{selectedItem.size_name || selectedItem.uom}</span>
                            </div>
                          )}

                          {/* Variant 3: Supplier */}
                          {selectedItem.supplier_name && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">V3</span>
                              <span className="text-gray-600">Supplier:</span>
                              <span className="font-medium text-gray-900">{selectedItem.supplier_name}</span>
                            </div>
                          )}

                          {/* Show if no variants set */}
                          {!selectedItem.color_name && !selectedItem.size_name && !selectedItem.uom && !selectedItem.supplier_name && (
                            <p className="text-gray-400 italic">No specifications set</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
                    <button onClick={() => { setSidebarOpen(false); setSidebarView('none') }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Close</button>
                  </div>
                </div>
              )}
              {sidebarView === 'preview' && (
                  <div className="bg-white rounded-lg w-full h-full overflow-y-auto flex flex-col">
                    <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {(previewType === 'items' || previewType === 'item_detail') && <Eye size={18} className="text-blue-600" />}
                        {previewType === 'categories' && <Filter size={18} className="text-green-600" />}
                        {previewType === 'filters' && <Search size={18} className="text-purple-600" />}
                        {previewType !== 'item_detail' ? (
                          <h2 className="text-base font-semibold text-gray-800">
                            {previewType === 'items' && 'Items Overview Preview'}
                            {previewType === 'categories' && 'Categories Preview'}
                            {previewType === 'filters' && 'Filters & Statistics Preview'}
                          </h2>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-semibold text-gray-800">Item Preview</span>
                            <span className="text-gray-400">•</span>
                            <span className="font-medium text-gray-900 truncate max-w-[180px]">{previewData?.item_name}</span>
                            <span className="text-gray-500 font-mono text-xs">{previewData?.item_code}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={closePreview} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>

                    <div className="flex-1 p-4 overflow-auto">
                      {previewType === 'items' && (
                        <div className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <h4 className="font-semibold text-blue-800 text-sm mb-1">Items Overview</h4>
                            <p className="text-blue-700 text-sm">
                              Total Items: {previewData?.length || 0} | 
                              Complete inventory overview
                            </p>
                          </div>
                          {previewData && previewData.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                              {previewData.slice(0, 6).map((item, index) => (
                                <div key={index} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                      <Eye size={14} className="text-blue-600 mt-1" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 truncate">{item.item_name}</h5>
                                      <p className="text-sm text-gray-600 font-mono">{item.item_code}</p>
                                      <p className="text-xs text-gray-500">{item.category_name}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm font-semibold text-green-600">₹{item.selling_price?.toFixed(2)}</span>
                                        {item.size_name && (
                                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">{item.size_name}</span>
                                        )}
                                        {item.color_name && (
                                          <span className="bg-pink-100 text-pink-700 text-xs px-2 py-1 rounded">{item.color_name}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {previewData.length > 6 && (
                                <div className="col-span-full text-center py-4 text-gray-500">
                                  ... and {previewData.length - 6} more items
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Eye size={30} className="mx-auto mb-3 text-gray-300" />
                              <p>No items available</p>
                            </div>
                          )}
                        </div>
                      )}

                      {previewType === 'categories' && (
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                            <h4 className="font-semibold text-green-800 text-sm mb-1">Categories Overview</h4>
                            <p className="text-green-700 text-sm">
                              Total Categories: {previewData?.length || 0} | 
                              All available item categories
                            </p>
                          </div>
                          {previewData && previewData.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                              {previewData.map((category, index) => (
                                <div key={index} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                  <div className="text-center">
                                    <Filter size={18} className="mx-auto text-green-600 mb-2" />
                                    <h5 className="font-medium text-gray-900 mb-1">{category.name}</h5>
                                    <p className="text-sm text-gray-600 font-mono">{category.code}</p>
                                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-2">
                                      Active
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Filter size={30} className="mx-auto mb-3 text-gray-300" />
                              <p>No categories available</p>
                            </div>
                          )}
                        </div>
                      )}

                      {previewType === 'filters' && (
                        <div className="space-y-4">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                            <h4 className="font-semibold text-purple-800 text-sm mb-1">Filter Statistics & Overview</h4>
                            <p className="text-purple-700 text-sm">
                              Current filtering status and search results
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white border rounded-lg p-4 shadow-sm">
                              <div className="text-center">
                                <Search size={20} className="mx-auto text-purple-600 mb-2" />
                                <h5 className="font-semibold text-gray-900 mb-1">Search Results</h5>
                                <p className="text-2xl font-bold text-purple-600">{previewData?.filteredItems || 0}</p>
                                <p className="text-sm text-gray-500">out of {previewData?.totalItems || 0} total</p>
                                {previewData?.searchTerm && (
                                  <p className="text-xs text-gray-400 mt-1">Search: "{previewData.searchTerm}"</p>
                                )}
                              </div>
                            </div>

                            <div className="bg-white border rounded-lg p-4 shadow-sm">
                              <div className="text-center">
                                <Filter size={20} className="mx-auto text-blue-600 mb-2" />
                                <h5 className="font-semibold text-gray-900 mb-1">Category Filter</h5>
                                <p className="text-lg font-medium text-blue-600">
                                  {previewData?.selectedCategory || 'All Categories'}
                                </p>
                                <p className="text-sm text-gray-500">{previewData?.categories || 0} total categories</p>
                                {previewData?.selectedSubCategory && (
                                  <p className="text-xs text-gray-400 mt-1">Sub: {previewData.selectedSubCategory}</p>
                                )}
                              </div>
                            </div>

                            <div className="bg-white border rounded-lg p-4 shadow-sm">
                              <div className="text-center">
                                <Plus size={20} className="mx-auto text-green-600 mb-2" />
                                <h5 className="font-semibold text-gray-900 mb-1">Sub-Categories</h5>
                                <p className="text-2xl font-bold text-green-600">{previewData?.subCategories || 0}</p>
                                <p className="text-sm text-gray-500">available options</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 border rounded-lg p-4">
                            <h5 className="font-medium text-gray-900 mb-3">Current Filter Status</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Search Term:</span>
                                <span className="font-medium">{previewData?.searchTerm || 'None'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Selected Category:</span>
                                <span className="font-medium">{previewData?.selectedCategory || 'All'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Selected Sub-Category:</span>
                                <span className="font-medium">{previewData?.selectedSubCategory || 'All'}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600">Filtered Results:</span>
                                <span className="font-bold text-purple-600">{previewData?.filteredItems || 0} items</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewType === 'item_detail' && (
                        <div className="space-y-4">
                          {previewData && (
                            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                              <div className="p-3">
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-3">
                                    <h5 className="font-semibold text-gray-800 border-b pb-2">Basic Information</h5>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600">Item Code:</label>
                                      <p className="font-mono bg-gray-100 px-3 py-1 rounded text-xs">{previewData.item_code}</p>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600">Item Name:</label>
                                      <p className="font-medium">{previewData.item_name}</p>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600">Description:</label>
                                      <p className="text-gray-700 text-xs">{previewData.description}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h5 className="font-semibold text-gray-800 border-b pb-2">Category Details</h5>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600">Category:</label>
                                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full ml-2">
                                        {previewData.category}
                                      </span>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600">Sub-Category:</label>
                                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full ml-2">
                                        {previewData.sub_category}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h5 className="font-semibold text-gray-800 border-b pb-2">Attributes & Pricing</h5>
                                    {previewData.size && (
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Size:</label>
                                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded ml-2">
                                          {previewData.size}
                                        </span>
                                      </div>
                                    )}
                                    {previewData.color && (
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Color:</label>
                                        <span className="inline-block px-3 py-1 bg-pink-100 text-pink-800 text-sm rounded ml-2">
                                          {previewData.color}
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      <label className="text-xs font-medium text-gray-600">Selling Price:</label>
                                      <p className="text-lg font-bold text-green-600">₹{previewData.selling_price?.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600">MRP:</label>
                                      <p className="text-gray-700 text-sm">₹{previewData.mrp?.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                                {(previewData.material || previewData.weight) && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h5 className="font-semibold text-gray-800 mb-3">Additional Details</h5>
                                    <div className="grid grid-cols-1 gap-3">
                                      {previewData.material && (
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Material:</label>
                                          <p className="text-gray-700 text-sm">{previewData.material}</p>
                                        </div>
                                      )}
                                      {previewData.weight && (
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Weight:</label>
                                          <p className="text-gray-700 text-sm">{previewData.weight}g</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center">
                      <p className="text-sm text-gray-600">Preview generated at {new Date().toLocaleTimeString()}</p>
                      <div className="flex items-center gap-2">
                        {previewType === 'item_detail' && selectedItem && (
                          <button onClick={() => setSidebarView('edit')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                        )}
                        <button onClick={closePreview} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close Preview</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Sidebar replaces Add Item Modal */}

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
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600">SKU</label>
                  <p className="text-indigo-700 font-mono bg-indigo-50 px-3 py-1 rounded inline-block mt-1">
                    {selectedItem.sku || selectedItem.item_code}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Item Name</label>
                  <p className="text-gray-900 mt-1 font-semibold">{selectedItem.item_name}</p>
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

      {/* Section Preview Modal removed; preview now renders in sidebar */}
    </div>
  )
}
