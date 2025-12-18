import { useState, useEffect, useMemo } from 'react'
import { X, Search, ChevronRight, Lock, Package, Save, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { categoryHierarchy, itemTypes } from '../../services/api'

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
  // Loading states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  
  // Hierarchy data
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [divisions, setDivisions] = useState([])
  const [classes, setClasses] = useState([])
  const [subClasses, setSubClasses] = useState([])
  const [itemTypesList, setItemTypesList] = useState([])
  
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
  
  // SKU sequence (would come from backend in production)
  const [skuSequence, setSkuSequence] = useState(1)

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      fetchItemTypes()
      // Generate initial SKU
      setFormData(prev => ({
        ...prev,
        sku: generateSKU('FG', skuSequence)
      }))
    }
  }, [isOpen])

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await categoryHierarchy.getCategories({ is_active: true })
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  // Fetch item types
  const fetchItemTypes = async () => {
    try {
      const response = await itemTypes.getDropdown()
      setItemTypesList(response.data || [])
    } catch (error) {
      console.error('Error fetching item types:', error)
    }
  }

  // Fetch sub-categories when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory.code)
      updateAutoFilledData(selectedCategory)
    } else {
      setSubCategories([])
      setSelectedSubCategory(null)
    }
  }, [selectedCategory])

  // Fetch divisions when sub-category changes
  useEffect(() => {
    if (selectedSubCategory) {
      fetchDivisions(selectedCategory?.code, selectedSubCategory.code)
    } else {
      setDivisions([])
      setSelectedDivision(null)
    }
  }, [selectedSubCategory])

  // Fetch classes when division changes
  useEffect(() => {
    if (selectedDivision) {
      fetchClasses(selectedCategory?.code, selectedSubCategory?.code, selectedDivision.code)
    } else {
      setClasses([])
      setSelectedClass(null)
    }
  }, [selectedDivision])

  // Fetch sub-classes when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSubClasses(
        selectedCategory?.code,
        selectedSubCategory?.code,
        selectedDivision?.code,
        selectedClass.code
      )
    } else {
      setSubClasses([])
      setSelectedSubClass(null)
    }
  }, [selectedClass])

  const fetchSubCategories = async (categoryCode) => {
    try {
      const response = await categoryHierarchy.getSubCategories({ category_code: categoryCode, is_active: true })
      setSubCategories(response.data || [])
    } catch (error) {
      console.error('Error fetching sub-categories:', error)
    }
  }

  const fetchDivisions = async (categoryCode, subCategoryCode) => {
    try {
      const response = await categoryHierarchy.getDivisions({ 
        category_code: categoryCode,
        sub_category_code: subCategoryCode,
        is_active: true 
      })
      setDivisions(response.data || [])
    } catch (error) {
      console.error('Error fetching divisions:', error)
    }
  }

  const fetchClasses = async (categoryCode, subCategoryCode, divisionCode) => {
    try {
      const response = await categoryHierarchy.getClasses({ 
        category_code: categoryCode,
        sub_category_code: subCategoryCode,
        division_code: divisionCode,
        is_active: true 
      })
      setClasses(response.data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchSubClasses = async (categoryCode, subCategoryCode, divisionCode, classCode) => {
    try {
      const response = await categoryHierarchy.getSubClasses({ 
        category_code: categoryCode,
        sub_category_code: subCategoryCode,
        division_code: divisionCode,
        class_code: classCode,
        is_active: true 
      })
      setSubClasses(response.data || [])
    } catch (error) {
      console.error('Error fetching sub-classes:', error)
    }
  }

  // Update auto-filled data based on category selection
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

  // Handle form submission
  const handleSubmit = async (isDraft = false) => {
    if (!selectedCategory) {
      toast.error('Please select at least a Category')
      return
    }
    if (!formData.itemName.trim()) {
      toast.error('Please enter an Item Name')
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

      const response = await api.post('/items/', payload)

      toast.success(isDraft ? 'Item saved as draft!' : 'Item created successfully!')
      setSkuSequence(prev => prev + 1)
      resetForm()
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to create item')
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
    setSubCategories([])
    setDivisions([])
    setClasses([])
    setSubClasses([])
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
  }

  // Get UOM name
  const getUomName = (code) => {
    const uom = UOM_OPTIONS.find(u => u.code === code)
    return uom ? `${uom.code} - ${uom.name}` : code
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
          {/* Quick Search */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4" />
              QUICK SEARCH (Search & Auto-Fill)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search by Category, SKU, Code, Name..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-300" />

          {/* Step 1: Category Hierarchy */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
              SELECT CATEGORY HIERARCHY <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={selectedCategory?.code || ''}
                  onChange={(e) => {
                    const cat = categories.find(c => c.code === e.target.value)
                    setSelectedCategory(cat || null)
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Category */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sub-Category</label>
                <select
                  value={selectedSubCategory?.code || ''}
                  onChange={(e) => {
                    const subCat = subCategories.find(c => c.code === e.target.value)
                    setSelectedSubCategory(subCat || null)
                  }}
                  disabled={!selectedCategory}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Sub-Category</option>
                  {subCategories.map(subCat => (
                    <option key={subCat.code} value={subCat.code}>
                      {subCat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Division</label>
                <select
                  value={selectedDivision?.code || ''}
                  onChange={(e) => {
                    const div = divisions.find(d => d.code === e.target.value)
                    setSelectedDivision(div || null)
                  }}
                  disabled={!selectedSubCategory}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Division</option>
                  {divisions.map(div => (
                    <option key={div.code} value={div.code}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
                <select
                  value={selectedClass?.code || ''}
                  onChange={(e) => {
                    const cls = classes.find(c => c.code === e.target.value)
                    setSelectedClass(cls || null)
                  }}
                  disabled={!selectedDivision}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.code} value={cls.code}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Class */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sub-Class</label>
                <select
                  value={selectedSubClass?.code || ''}
                  onChange={(e) => {
                    const subCls = subClasses.find(c => c.code === e.target.value)
                    setSelectedSubClass(subCls || null)
                  }}
                  disabled={!selectedClass}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Sub-Class</option>
                  {subClasses.map(subCls => (
                    <option key={subCls.code} value={subCls.code}>
                      {subCls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Path Display */}
            {hierarchyPath && (
              <div className="bg-blue-50 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-blue-600 font-medium">📍 Path:</span>
                <span className="text-blue-800">{hierarchyPath}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Auto-filled from Category */}
          {selectedCategory && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase mb-3">
                Auto-filled from Category:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Item Type</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={autoFilledData.itemType ? `${autoFilledData.itemType} - ${autoFilledData.itemTypeName}` : ''}
                      readOnly
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed"
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
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed"
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
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed"
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
              ITEM DETAILS
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SKU (Auto) */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">SKU (Auto)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.sku}
                    readOnly
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-mono cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                </div>
              </div>

              {/* Item Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  placeholder="Men's Round Neck Cotton T-Shirt"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Step 3: Units of Measure */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">3</span>
              UNITS OF MEASURE <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stock UOM */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Stock UOM <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.stockUom}
                  onChange={(e) => setFormData({ ...formData, stockUom: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Purchase UOM <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purchaseUom}
                  onChange={(e) => {
                    const newPurchaseUom = e.target.value
                    const stockUomData = UOM_OPTIONS.find(u => u.code === formData.stockUom)
                    const purchaseUomData = UOM_OPTIONS.find(u => u.code === newPurchaseUom)
                    
                    // Auto-calculate conversion factor for common conversions
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                <label className="block text-sm font-medium text-gray-600 mb-1">Conversion Factor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.conversionFactor}
                    onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })}
                    className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
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
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-5 py-2.5 border border-blue-600 rounded-lg text-blue-600 hover:bg-blue-50 font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving || !selectedCategory || !formData.itemName.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
