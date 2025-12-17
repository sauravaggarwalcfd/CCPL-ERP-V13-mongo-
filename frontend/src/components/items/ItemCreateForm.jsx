import { useState, useEffect, useMemo } from 'react'
import { X, Search, ChevronRight, Lock, Package, Save, FileText, AlertCircle, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { itemTypes } from '../../services/api'
import { useHierarchySearch } from './useHierarchySearch'

// UOM Options
const UOM_OPTIONS = [
  { code: 'PCS', name: 'Pieces', conversionBase: 1 },
  { code: 'DOZ', name: 'Dozen', conversionBase: 12 },
  { code: 'PKT', name: 'Packet', conversionBase: 1 },
  { code: 'BOX', name: 'Box', conversionBase: 1 },
  { code: 'KG', name: 'Kilogram', conversionBase: 1 },
  { code: 'GM', name: 'Gram', conversionBase: 0.001 },
  { code: 'MTR', name: 'Meter', conversionBase: 1 },
  { code: 'CM', name: 'Centimeter', conversionBase: 0.01 },
  { code: 'LTR', name: 'Liter', conversionBase: 1 },
  { code: 'ML', name: 'Milliliter', conversionBase: 0.001 },
  { code: 'SET', name: 'Set', conversionBase: 1 },
  { code: 'PAIR', name: 'Pair', conversionBase: 2 },
]

// Generate next SKU
const generateSKU = (itemType = 'FG', sequence = 1) => {
  const prefix = itemType.substring(0, 2).toUpperCase()
  return `${prefix}${String(sequence).padStart(5, '0')}`
}

export default function ItemCreateForm({ isOpen, onClose, onSuccess }) {
  // Use the custom hierarchy hook
  const {
    categories,
    subCategories,
    divisions,
    classes,
    subClasses,
    searchLoading,
    fetchAllCategories,
    fetchSubCategories,
    fetchDivisions,
    fetchClasses,
    fetchSubClasses,
    searchAllLevels,
    reverseFillHierarchy,
  } = useHierarchySearch()

  // Loading & UI states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  
  // Selected hierarchy
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState(null)
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedSubClass, setSelectedSubClass] = useState(null)
  
  // Auto-filled values from category
  const [autoFilledData, setAutoFilledData] = useState({
    itemType: '',
    itemTypeName: '',
    hsnCode: '',
    gstRate: 5,
    defaultUom: 'PCS',
  })
  
  // Form data
  const [formData, setFormData] = useState({
    sku: '',
    itemName: '',
    stockUom: 'PCS',
    purchaseUom: 'PCS',
    conversionFactor: 1,
  })
  
  // Item types list
  const [itemTypesList, setItemTypesList] = useState([])
  
  // SKU sequence
  const [skuSequence, setSkuSequence] = useState(1)

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      initializeForm()
    }
  }, [isOpen])

  const initializeForm = async () => {
    try {
      setLoading(true)
      // Fetch item types
      const typesRes = await itemTypes.getDropdown()
      setItemTypesList(typesRes.data || [])
      
      // Fetch categories
      await fetchAllCategories(true) // Force refresh
      
      // Generate initial SKU
      setFormData(prev => ({
        ...prev,
        sku: generateSKU('FG', skuSequence)
      }))
    } catch (error) {
      console.error('Error initializing form:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  // Handle category change
  const handleCategoryChange = async (categoryCode) => {
    const category = categories.find(c => c.code === categoryCode)
    setSelectedCategory(category || null)
    setSelectedSubCategory(null)
    setSelectedDivision(null)
    setSelectedClass(null)
    setSelectedSubClass(null)
    
    if (category) {
      updateAutoFilledData(category)
      await fetchSubCategories(categoryCode)
    }
  }

  // Handle sub-category change (WITH REVERSE FILL)
  const handleSubCategoryChange = async (subCategoryCode) => {
    const subCat = subCategories.find(s => s.code === subCategoryCode)
    setSelectedSubCategory(subCat || null)
    setSelectedDivision(null)
    setSelectedClass(null)
    setSelectedSubClass(null)
    
    if (subCat && selectedCategory) {
      await fetchDivisions(selectedCategory.code, subCategoryCode)
    }
  }

  // Handle division change
  const handleDivisionChange = async (divisionCode) => {
    const div = divisions.find(d => d.code === divisionCode)
    setSelectedDivision(div || null)
    setSelectedClass(null)
    setSelectedSubClass(null)
    
    if (div && selectedCategory && selectedSubCategory) {
      await fetchClasses(selectedCategory.code, selectedSubCategory.code, divisionCode)
    }
  }

  // Handle class change
  const handleClassChange = async (classCode) => {
    const cls = classes.find(c => c.code === classCode)
    setSelectedClass(cls || null)
    setSelectedSubClass(null)
    
    if (cls && selectedCategory && selectedSubCategory && selectedDivision) {
      await fetchSubClasses(
        selectedCategory.code,
        selectedSubCategory.code,
        selectedDivision.code,
        classCode
      )
    }
  }

  // Handle sub-class change
  const handleSubClassChange = (subClassCode) => {
    const subCls = subClasses.find(s => s.code === subClassCode)
    setSelectedSubClass(subCls || null)
  }

  // Update auto-filled data based on category
  const updateAutoFilledData = (category) => {
    const itemType = itemTypesList.find(t => t.value === category.item_type)
    
    setAutoFilledData({
      itemType: category.item_type || 'FG',
      itemTypeName: itemType?.name || category.item_type || 'Finished Goods',
      hsnCode: category.default_hsn_code || '',
      gstRate: category.default_gst_rate || 5,
      defaultUom: category.default_uom || 'PCS',
    })
    
    // Update SKU with new item type
    setFormData(prev => ({
      ...prev,
      sku: generateSKU(category.item_type || 'FG', skuSequence),
      stockUom: category.default_uom || 'PCS',
    }))
  }

  // Build hierarchy path
  const hierarchyPath = useMemo(() => {
    const parts = []
    if (selectedCategory) parts.push(selectedCategory.name)
    if (selectedSubCategory) parts.push(selectedSubCategory.name)
    if (selectedDivision) parts.push(selectedDivision.name)
    if (selectedClass) parts.push(selectedClass.name)
    if (selectedSubClass) parts.push(selectedSubClass.name)
    return parts.join(' > ')
  }, [selectedCategory, selectedSubCategory, selectedDivision, selectedClass, selectedSubClass])

  // Handle search with debounce
  const handleSearch = async (term) => {
    setSearchTerm(term)
    
    if (term.length < 1) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    const results = await searchAllLevels(term)
    setSearchResults(results)
    setShowSearchDropdown(true)
  }

  // Handle search result selection with REVERSE FILL
  const handleSelectSearchResult = async (result) => {
    try {
      const hierarchy = await reverseFillHierarchy(result)
      
      // Set all hierarchy levels
      if (hierarchy.category) setSelectedCategory(hierarchy.category)
      if (hierarchy.subCategory) setSelectedSubCategory(hierarchy.subCategory)
      if (hierarchy.division) setSelectedDivision(hierarchy.division)
      if (hierarchy.class) setSelectedClass(hierarchy.class)
      if (hierarchy.subClass) setSelectedSubClass(hierarchy.subClass)
      
      // Update auto-filled data
      if (hierarchy.category) {
        updateAutoFilledData(hierarchy.category)
      }
      
      // Clear search
      setSearchTerm('')
      setShowSearchDropdown(false)
      setSearchResults([])
      
      toast.success(`✅ Selected: ${result.fullPath}`)
    } catch (error) {
      console.error('Selection error:', error)
      toast.error('Failed to select category')
    }
  }

  // Handle form submission
  const handleSubmit = async (isDraft = false) => {
    if (!selectedCategory) {
      toast.error('❌ Please select at least a Category')
      return
    }
    if (!formData.itemName.trim()) {
      toast.error('❌ Please enter an Item Name')
      return
    }

    setSaving(true)
    
    try {
      const payload = {
        item_code: formData.sku,
        item_name: formData.itemName,
        item_description: '',
        category_code: selectedCategory?.code,
        category_name: selectedCategory?.name,
        sub_category_code: selectedSubCategory?.code || null,
        sub_category_name: selectedSubCategory?.name || null,
        division_code: selectedDivision?.code || null,
        division_name: selectedDivision?.name || null,
        class_code: selectedClass?.code || null,
        class_name: selectedClass?.name || null,
        sub_class_code: selectedSubClass?.code || null,
        sub_class_name: selectedSubClass?.name || null,
        uom: formData.stockUom,
        hsn_code: autoFilledData.hsnCode,
        gst_rate: autoFilledData.gstRate,
        inventory_type: 'stocked',
        cost_price: 0,
        selling_price: 0,
        mrp: 0,
      }

      await api.post('/items/', payload)

      toast.success(isDraft ? '💾 Item saved as draft!' : '✅ Item created successfully!')
      setSkuSequence(prev => prev + 1)
      resetForm()
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || '❌ Failed to create item')
      console.error('Error creating item:', error)
    } finally {
      setSaving(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setSelectedCategory(null)
    setSelectedSubCategory(null)
    setSelectedDivision(null)
    setSelectedClass(null)
    setSelectedSubClass(null)
    setAutoFilledData({
      itemType: '',
      itemTypeName: '',
      hsnCode: '',
      gstRate: 5,
      defaultUom: 'PCS',
    })
    setFormData({
      sku: generateSKU('FG', skuSequence + 1),
      itemName: '',
      stockUom: 'PCS',
      purchaseUom: 'PCS',
      conversionFactor: 1,
    })
    setSearchTerm('')
    setSearchResults([])
    setShowSearchDropdown(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <h2 className="text-xl font-bold">Create New Item</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Search - FIXED VERSION */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-300">
            <label className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3">
              <Search className="w-4 h-4" />
              🔍 QUICK SEARCH (Search & Auto-Fill All Levels)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-blue-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchTerm.length > 0 && setShowSearchDropdown(true)}
                placeholder="🔍 Type to search (Category, Sub-Category, Division, Class, etc.)"
                className="w-full pl-10 pr-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
              
              {/* Loading indicator */}
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}
              
              {/* Search Results Dropdown - FIXED */}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-300 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Searching all levels...</p>
                    </div>
                  ) : searchResults.length === 0 && searchTerm.length > 0 ? (
                    <div className="p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">No matching categories found for "{searchTerm}"</p>
                      <p className="text-xs text-gray-500 mt-1">Try searching by code or different name</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      Start typing to search across all 5 levels...
                    </div>
                  ) : (
                    <div className="divide-y">
                      {searchResults.map((result, idx) => (
                        <button
                          key={`${result.level}-${result.code}-${idx}`}
                          onClick={() => handleSelectSearchResult(result)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-start gap-3 group"
                        >
                          {/* Level Badge */}
                          <div className="flex-shrink-0">
                            <span className="inline-block w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
                              L{result.level}
                            </span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{result.name}</span>
                              <span className="text-xs bg-gray-200 px-2.5 py-0.5 rounded-full font-mono text-gray-700 flex-shrink-0 font-bold">
                                {result.code}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                                {result.levelName}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              📍 {result.fullPath}
                            </div>
                          </div>
                          
                          {/* Arrow */}
                          <ChevronRight className="text-blue-400 group-hover:text-blue-600 flex-shrink-0 w-5 h-5 mt-1" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-blue-700 mt-2">💡 Tip: Search auto-fills all levels. e.g., search "Cotton" and select result to fill entire path.</p>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-300" />

          {/* Step 1: Category Hierarchy - FIXED CASCADING */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</span>
              SELECT CATEGORY HIERARCHY <span className="text-red-500">*</span>
            </h3>
            
            {/* All dropdowns in one section */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {/* Category Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📦 Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCategory?.code || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.code} • {cat.name}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check size={14} /> Selected: {selectedCategory.name}
                  </p>
                )}
              </div>

              {/* Sub-Category Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📂 Sub-Category
                </label>
                <select
                  value={selectedSubCategory?.code || ''}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select Sub-Category --</option>
                  {subCategories.map(subCat => (
                    <option key={subCat.code} value={subCat.code}>
                      {subCat.code} • {subCat.name}
                    </option>
                  ))}
                </select>
                {!selectedCategory && (
                  <p className="text-xs text-gray-500 mt-1">Select Category first</p>
                )}
                {selectedSubCategory && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check size={14} /> Selected: {selectedSubCategory.name}
                  </p>
                )}
              </div>

              {/* Division Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🎯 Division
                </label>
                <select
                  value={selectedDivision?.code || ''}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  disabled={!selectedSubCategory}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select Division --</option>
                  {divisions.map(div => (
                    <option key={div.code} value={div.code}>
                      {div.code} • {div.name}
                    </option>
                  ))}
                </select>
                {!selectedSubCategory && (
                  <p className="text-xs text-gray-500 mt-1">Select Sub-Category first</p>
                )}
                {selectedDivision && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check size={14} /> Selected: {selectedDivision.name}
                  </p>
                )}
              </div>

              {/* Class Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🏷️ Class
                </label>
                <select
                  value={selectedClass?.code || ''}
                  onChange={(e) => handleClassChange(e.target.value)}
                  disabled={!selectedDivision}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(cls => (
                    <option key={cls.code} value={cls.code}>
                      {cls.code} • {cls.name}
                    </option>
                  ))}
                </select>
                {!selectedDivision && (
                  <p className="text-xs text-gray-500 mt-1">Select Division first</p>
                )}
                {selectedClass && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check size={14} /> Selected: {selectedClass.name}
                  </p>
                )}
              </div>

              {/* Sub-Class Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ✨ Sub-Class
                </label>
                <select
                  value={selectedSubClass?.code || ''}
                  onChange={(e) => handleSubClassChange(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select Sub-Class --</option>
                  {subClasses.map(subCls => (
                    <option key={subCls.code} value={subCls.code}>
                      {subCls.code} • {subCls.name}
                    </option>
                  ))}
                </select>
                {!selectedClass && (
                  <p className="text-xs text-gray-500 mt-1">Select Class first</p>
                )}
                {selectedSubClass && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check size={14} /> Selected: {selectedSubClass.name}
                  </p>
                )}
              </div>
            </div>

            {/* Path Display */}
            {hierarchyPath && (
              <div className="bg-blue-100 rounded-lg px-4 py-3 flex items-start gap-2 mt-4 border border-blue-300">
                <span className="text-blue-600 font-bold text-lg">📍</span>
                <div>
                  <p className="text-xs text-blue-600 font-semibold">Current Path:</p>
                  <p className="text-blue-900 font-medium">{hierarchyPath}</p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-300" />

          {/* Auto-filled from Category */}
          {selectedCategory && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">
                ✅ Auto-filled from Category:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Item Type</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={autoFilledData.itemType ? `${autoFilledData.itemType} - ${autoFilledData.itemTypeName}` : ''}
                      readOnly
                      className="w-full px-3 py-2.5 pr-10 border border-green-300 rounded-lg bg-green-50 text-green-900 font-semibold cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">HSN Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={autoFilledData.hsnCode || 'Not Set'}
                      readOnly
                      className="w-full px-3 py-2.5 pr-10 border border-green-300 rounded-lg bg-green-50 text-green-900 font-semibold cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">GST Rate</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={`${autoFilledData.gstRate}%`}
                      readOnly
                      className="w-full px-3 py-2.5 pr-10 border border-green-300 rounded-lg bg-green-50 text-green-900 font-semibold cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Step 2: Item Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</span>
              ITEM DETAILS
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SKU (Auto) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">SKU (Auto)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.sku}
                    readOnly
                    className="w-full px-3 py-2.5 pr-10 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-mono font-bold cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                </div>
              </div>

              {/* Item Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  placeholder="e.g., Men's Round Neck Cotton T-Shirt"
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Step 3: Units of Measure */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">3</span>
              UNITS OF MEASURE <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stock UOM */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Stock UOM <span className="text-red-500">*</span></label>
                <select
                  value={formData.stockUom}
                  onChange={(e) => setFormData({ ...formData, stockUom: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  {UOM_OPTIONS.map(uom => (
                    <option key={uom.code} value={uom.code}>
                      {uom.code} - {uom.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase UOM */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Purchase UOM <span className="text-red-500">*</span></label>
                <select
                  value={formData.purchaseUom}
                  onChange={(e) => {
                    const newPurchaseUom = e.target.value
                    const purchaseUomData = UOM_OPTIONS.find(u => u.code === newPurchaseUom)
                    
                    let conversionFactor = 1
                    if (newPurchaseUom === 'DOZ' && formData.stockUom === 'PCS') {
                      conversionFactor = 12
                    } else if (newPurchaseUom === 'PAIR' && formData.stockUom === 'PCS') {
                      conversionFactor = 2
                    } else if (newPurchaseUom === 'KG' && formData.stockUom === 'GM') {
                      conversionFactor = 1000
                    } else if (newPurchaseUom === 'LTR' && formData.stockUom === 'ML') {
                      conversionFactor = 1000
                    } else if (newPurchaseUom === 'MTR' && formData.stockUom === 'CM') {
                      conversionFactor = 100
                    }
                    
                    setFormData({ 
                      ...formData, 
                      purchaseUom: newPurchaseUom,
                      conversionFactor 
                    })
                  }}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  {UOM_OPTIONS.map(uom => (
                    <option key={uom.code} value={uom.code}>
                      {uom.code} - {uom.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conversion Factor */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Conversion Factor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.conversionFactor}
                    onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })}
                    className="w-24 px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                  <span className="text-sm text-gray-600 font-medium">
                    1 {formData.purchaseUom} = {formData.conversionFactor} {formData.stockUom}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-bold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-5 py-2.5 border-2 border-blue-600 rounded-lg text-blue-600 hover:bg-blue-50 font-bold transition flex items-center gap-2 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving || !selectedCategory || !formData.itemName.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create Item'}
          </button>
        </div>
      </div>
    </div>
  )
}