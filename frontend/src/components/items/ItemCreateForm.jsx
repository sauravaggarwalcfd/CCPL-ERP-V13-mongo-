import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Search, ChevronRight, Lock, Package, Save, FileText, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { categoryHierarchy, itemTypes, items } from '../../services/api'
import DynamicSpecificationForm from '../specifications/DynamicSpecificationForm'
import { itemSpecificationApi } from '../../services/specificationApi'

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
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef(null)

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

  // Specifications data
  const [specifications, setSpecifications] = useState({
    colour_code: null,
    size_code: null,
    uom_code: null,
    vendor_code: null,
    custom_field_values: {}
  })
  
  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      fetchItemTypes()
      // Fetch initial SKU for default item type
      fetchNextSku('FG')
    }
  }, [isOpen])
  
  // Fetch next available SKU from backend
  const fetchNextSku = async (itemTypePrefix) => {
    try {
      const prefix = itemTypePrefix.substring(0, 2).toUpperCase()
      const response = await items.getNextSku(prefix)
      setFormData(prev => ({
        ...prev,
        sku: response.data.next_sku
      }))
    } catch (error) {
      console.error('Error fetching next SKU:', error)
      // Fallback to simple generation if API fails
      setFormData(prev => ({
        ...prev,
        sku: generateSKU(itemTypePrefix, 1)
      }))
    }
  }

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

  // Search for categories and hierarchy levels (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchTerm.trim().length >= 2) {
      setSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const searchLower = searchTerm.toLowerCase()
          const results = []

          // Search Categories (Level 1)
          const matchingCategories = categories.filter(c =>
            c.name.toLowerCase().includes(searchLower) ||
            c.code.toLowerCase().includes(searchLower)
          )
          matchingCategories.forEach(c => {
            results.push({
              id: c.id,
              level: 1,
              levelName: 'Level 1',
              code: c.code,
              name: c.name,
              path: c.name,
              data: c
            })
          })

          // Search Sub-Categories (Level 2)
          const subCatsResponse = await categoryHierarchy.getSubCategories({ is_active: true })
          const allSubCategories = subCatsResponse.data || []
          const matchingSubCats = allSubCategories.filter(sc =>
            sc.name.toLowerCase().includes(searchLower) ||
            sc.code.toLowerCase().includes(searchLower)
          )
          matchingSubCats.forEach(sc => {
            const cat = categories.find(c => c.code === sc.category_code)
            results.push({
              id: sc.id,
              level: 2,
              levelName: 'Level 2',
              code: sc.code,
              name: sc.name,
              path: `${cat?.name || sc.category_code} > ${sc.name}`,
              category_code: sc.category_code,
              data: sc
            })
          })

          // Search Divisions (Level 3)
          const divsResponse = await categoryHierarchy.getDivisions({ is_active: true })
          const allDivisions = divsResponse.data || []
          const matchingDivs = allDivisions.filter(d =>
            d.name.toLowerCase().includes(searchLower) ||
            d.code.toLowerCase().includes(searchLower)
          )
          matchingDivs.forEach(d => {
            results.push({
              id: d.id,
              level: 3,
              levelName: 'Level 3',
              code: d.code,
              name: d.name,
              path: d.path_name || `${d.category_code} > ${d.sub_category_code} > ${d.name}`,
              category_code: d.category_code,
              sub_category_code: d.sub_category_code,
              data: d
            })
          })

          // Search Classes (Level 4)
          const classesResponse = await categoryHierarchy.getClasses({ is_active: true })
          const allClasses = classesResponse.data || []
          const matchingClasses = allClasses.filter(cls =>
            cls.name.toLowerCase().includes(searchLower) ||
            cls.code.toLowerCase().includes(searchLower)
          )
          matchingClasses.forEach(cls => {
            results.push({
              id: cls.id,
              level: 4,
              levelName: 'Level 4',
              code: cls.code,
              name: cls.name,
              path: cls.path_name || `${cls.category_code} > ${cls.sub_category_code} > ${cls.division_code} > ${cls.name}`,
              category_code: cls.category_code,
              sub_category_code: cls.sub_category_code,
              division_code: cls.division_code,
              data: cls
            })
          })

          // Search Sub-Classes (Level 5)
          const subClassesResponse = await categoryHierarchy.getSubClasses({ is_active: true })
          const allSubClasses = subClassesResponse.data || []
          const matchingSubClasses = allSubClasses.filter(sc =>
            sc.name.toLowerCase().includes(searchLower) ||
            sc.code.toLowerCase().includes(searchLower)
          )
          matchingSubClasses.forEach(sc => {
            results.push({
              id: sc.id,
              level: 5,
              levelName: 'Level 5',
              code: sc.code,
              name: sc.name,
              path: sc.path_name || `Full hierarchy path`,
              category_code: sc.category_code,
              sub_category_code: sc.sub_category_code,
              division_code: sc.division_code,
              class_code: sc.class_code,
              data: sc
            })
          })

          setSearchResults(results.slice(0, 10)) // Limit to 10 results
          setShowSearchResults(true)
        } catch (error) {
          console.error('Error searching categories:', error)
          setSearchResults([])
        } finally {
          setSearching(false)
        }
      }, 300)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
      setSearching(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, categories])

  // Auto-select category hierarchy from search result
  const handleSelectCategoryHierarchy = async (result) => {
    try {
      setShowSearchResults(false)
      setSearchTerm('')

      // Find and set Level 1 (Category)
      const category = categories.find(c => c.code === result.category_code) ||
                      (result.level === 1 ? result.data : null)

      if (!category) {
        toast.error('Category not found')
        return
      }

      setSelectedCategory(category)
      updateAutoFilledData(category)

      // If level >= 2, fetch and select sub-category
      if (result.level >= 2 && result.sub_category_code) {
        const subCatsResponse = await categoryHierarchy.getSubCategories({
          category_code: category.code,
          is_active: true
        })
        const subCats = subCatsResponse.data || []
        setSubCategories(subCats)

        const subCat = subCats.find(sc => sc.code === result.sub_category_code)
        if (subCat) {
          setSelectedSubCategory(subCat)

          // If level >= 3, fetch and select division
          if (result.level >= 3 && result.division_code) {
            const divsResponse = await categoryHierarchy.getDivisions({
              category_code: category.code,
              sub_category_code: subCat.code,
              is_active: true
            })
            const divs = divsResponse.data || []
            setDivisions(divs)

            const div = divs.find(d => d.code === result.division_code)
            if (div) {
              setSelectedDivision(div)

              // If level >= 4, fetch and select class
              if (result.level >= 4 && result.class_code) {
                const classesResponse = await categoryHierarchy.getClasses({
                  category_code: category.code,
                  sub_category_code: subCat.code,
                  division_code: div.code,
                  is_active: true
                })
                const clss = classesResponse.data || []
                setClasses(clss)

                const cls = clss.find(c => c.code === result.class_code)
                if (cls) {
                  setSelectedClass(cls)

                  // If level === 5, fetch and select sub-class
                  if (result.level === 5 && result.data) {
                    const subClassesResponse = await categoryHierarchy.getSubClasses({
                      category_code: category.code,
                      sub_category_code: subCat.code,
                      division_code: div.code,
                      class_code: cls.code,
                      is_active: true
                    })
                    const subClss = subClassesResponse.data || []
                    setSubClasses(subClss)

                    const subCls = subClss.find(sc => sc.code === result.data.code)
                    if (subCls) {
                      setSelectedSubClass(subCls)
                    }
                  }
                }
              }
            }
          }
        }
      }

      toast.success(`✓ Selected: ${result.path}`, { duration: 3000 })
    } catch (error) {
      console.error('Error selecting hierarchy:', error)
      toast.error('Failed to select hierarchy')
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
    
    // Fetch next available SKU for this item type
    fetchNextSku(category.item_type || 'FG')
    
    // Update stock UOM
    setFormData(prev => ({
      ...prev,
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
      // Check if item already exists
      const checkResponse = await items.checkExists(formData.sku)
      if (checkResponse.data && checkResponse.data.length > 0) {
        const existingItem = checkResponse.data[0]
        if (existingItem.item_code === formData.sku) {
          toast.error(`Item already exists: ${existingItem.item_code} - ${existingItem.item_name}`, {
            duration: 5000,
            icon: '⚠️',
          })
          setSaving(false)
          return
        }
      }

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

      // Save specifications if any are filled
      const hasSpecifications = specifications.colour_code ||
                                specifications.size_code ||
                                specifications.uom_code ||
                                specifications.vendor_code ||
                                Object.keys(specifications.custom_field_values || {}).length > 0;

      if (hasSpecifications && selectedCategory) {
        try {
          await itemSpecificationApi.createOrUpdate(
            formData.sku,
            selectedCategory.code,
            specifications
          );
        } catch (specError) {
          console.error('Error saving specifications:', specError);
          // Don't fail the whole operation if specifications fail
          toast.error('Item created but specifications could not be saved', { duration: 4000 });
        }
      }

      toast.success(isDraft ? 'Item saved as draft!' : 'Item created successfully!')

      // Fetch next SKU for the same item type
      await fetchNextSku(autoFilledData.itemType || 'FG')

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
      sku: '',
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
              QUICK SEARCH CATEGORIES (Auto-Select Hierarchy)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true)
                }}
                placeholder="🔍 Search categories by name or code (Level 1-5)..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {searching && (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="ml-2">Searching...</span>
                    </div>
                  )}

                  {!searching && searchResults.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      <AlertCircle className="w-5 h-5 inline-block mb-1" />
                      <div>No categories found</div>
                    </div>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <>
                      <div className="p-2 bg-blue-50 border-b border-gray-200 text-sm font-medium text-blue-800">
                        Found {searchResults.length} categor{searchResults.length > 1 ? 'ies' : 'y'} - Click to auto-select
                      </div>
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => handleSelectCategoryHierarchy(result)}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{result.name}</span>
                                <span className="text-xs text-gray-500 font-mono">({result.code})</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {result.path}
                              </div>
                            </div>
                            <div className="ml-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {result.levelName}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="p-2 bg-gray-50 text-center">
                        <button
                          onClick={() => {
                            setShowSearchResults(false)
                            setSearchTerm('')
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
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
              {/* Level 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Level 1</label>
                <select
                  value={selectedCategory?.code || ''}
                  onChange={(e) => {
                    const cat = categories.find(c => c.code === e.target.value)
                    setSelectedCategory(cat || null)
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Level 1</option>
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Level 2</label>
                <select
                  value={selectedSubCategory?.code || ''}
                  onChange={(e) => {
                    const subCat = subCategories.find(c => c.code === e.target.value)
                    setSelectedSubCategory(subCat || null)
                  }}
                  disabled={!selectedCategory}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Level 2</option>
                  {subCategories.map(subCat => (
                    <option key={subCat.code} value={subCat.code}>
                      {subCat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 3 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Level 3</label>
                <select
                  value={selectedDivision?.code || ''}
                  onChange={(e) => {
                    const div = divisions.find(d => d.code === e.target.value)
                    setSelectedDivision(div || null)
                  }}
                  disabled={!selectedSubCategory}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Level 3</option>
                  {divisions.map(div => (
                    <option key={div.code} value={div.code}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Level 4 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Level 4</label>
                <select
                  value={selectedClass?.code || ''}
                  onChange={(e) => {
                    const cls = classes.find(c => c.code === e.target.value)
                    setSelectedClass(cls || null)
                  }}
                  disabled={!selectedDivision}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Level 4</option>
                  {classes.map(cls => (
                    <option key={cls.code} value={cls.code}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 5 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Level 5</label>
                <select
                  value={selectedSubClass?.code || ''}
                  onChange={(e) => {
                    const subCls = subClasses.find(c => c.code === e.target.value)
                    setSelectedSubClass(subCls || null)
                  }}
                  disabled={!selectedClass}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Level 5</option>
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

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Step 4: Specifications */}
          {selectedCategory && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">4</span>
                SPECIFICATIONS
                <span className="text-sm text-gray-500 font-normal">(Based on Category Configuration)</span>
              </h3>

              <DynamicSpecificationForm
                categoryCode={selectedCategory?.code}
                onSpecificationsChange={setSpecifications}
                showTitle={false}
              />
            </div>
          )}
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
