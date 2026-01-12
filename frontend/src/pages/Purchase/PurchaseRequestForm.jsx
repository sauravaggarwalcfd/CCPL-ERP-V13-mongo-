import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Search, Package, AlertCircle, ChevronRight, Edit2, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { categoryHierarchy, itemTypes as itemTypesApi } from '../../services/api'
import { specificationApi } from '../../services/specificationApi'
import DynamicSpecificationForm from '../../components/specifications/DynamicSpecificationForm'

export default function PurchaseRequestForm({ pr, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [brands, setBrands] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [itemTypes, setItemTypes] = useState([])
  const [selectedItemType, setSelectedItemType] = useState('')
  const [editingItemCode, setEditingItemCode] = useState(null)
  const [showLineItemForm, setShowLineItemForm] = useState(false)
  
  // Search functionality for line item form
  const [lineItemSearchTerm, setLineItemSearchTerm] = useState('')
  const [lineItemSearchResults, setLineItemSearchResults] = useState([])
  const [showLineItemSearch, setShowLineItemSearch] = useState(false)
  const [showLineItemSearchResults, setShowLineItemSearchResults] = useState(false)
  const lineItemSearchTimeoutRef = useRef(null)
  
  // Image for line item
  const [lineItemImage, setLineItemImage] = useState(null)
  const [lineItemImageBase64, setLineItemImageBase64] = useState(null)

  // Category hierarchy for line item form
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [divisions, setDivisions] = useState([])
  const [classes, setClasses] = useState([])
  const [subClasses, setSubClasses] = useState([])

  // Selected hierarchy for new line item
  const [lineItemCategory, setLineItemCategory] = useState(null)
  const [lineItemSubCategory, setLineItemSubCategory] = useState(null)
  const [lineItemDivision, setLineItemDivision] = useState(null)
  const [lineItemClass, setLineItemClass] = useState(null)
  const [lineItemSubClass, setLineItemSubClass] = useState(null)

  // Line item form data
  const [lineItemFormData, setLineItemFormData] = useState({
    item_name: '',
    item_description: '',
    quantity: 1,
    unit: 'PCS',
    estimated_unit_rate: '',
    required_date: '',
    notes: '',
  })

  // Line item specifications
  const [lineItemSpecs, setLineItemSpecs] = useState({
    colour_code: null,
    size_code: null,
    uom_code: null,
    brand_code: null,
    supplier_code: null,
    custom_field_values: {}
  })

  // Store filtered suppliers/brands per line item (based on category groups)
  const [lineItemFilters, setLineItemFilters] = useState({})

  const [formData, setFormData] = useState({
    pr_date: new Date().toISOString().split('T')[0],
    department: '',
    priority: 'NORMAL',
    required_by_date: '',
    purpose: '',
    justification: '',
    notes: '',
  })

  const [lineItems, setLineItems] = useState([])

  useEffect(() => {
    if (pr) {
      // Edit mode - load existing PR data
      loadPRDetails()
    }
    fetchItems()
    fetchSuppliers()
    fetchBrands()
    fetchItemTypes()
    fetchCategories()
  }, [pr])

  // Refresh filters when suppliers or brands are loaded (for edit mode)
  useEffect(() => {
    const refreshFilters = async () => {
      if (lineItems.length > 0 && suppliers.length > 0 && brands.length > 0) {
        const filtersMap = {}
        for (const item of lineItems) {
          if (item.item_category && !lineItemFilters[item.id || item.item_code]) {
            try {
              const filters = await fetchCategoryFilters(item.item_category, item.id || item.item_code)
              filtersMap[item.id || item.item_code] = filters
            } catch (err) {
              // Ignore errors
            }
          }
        }
        if (Object.keys(filtersMap).length > 0) {
          setLineItemFilters(prev => ({ ...prev, ...filtersMap }))
        }
      }
    }
    refreshFilters()
  }, [lineItems.length, suppliers.length, brands.length])

  // Fetch sub-categories when category changes
  useEffect(() => {
    const fetchSubCategories = async () => {
      if (lineItemCategory?.code) {
        try {
          const response = await categoryHierarchy.getSubCategories({
            category_code: lineItemCategory.code,
            is_active: true
          })
          setSubCategories(response.data || [])
        } catch (error) {
          console.error('Error fetching sub-categories:', error)
          setSubCategories([])
        }
      } else {
        setSubCategories([])
      }
      setLineItemSubCategory(null)
      setDivisions([])
      setLineItemDivision(null)
      setClasses([])
      setLineItemClass(null)
      setSubClasses([])
      setLineItemSubClass(null)
    }
    fetchSubCategories()
  }, [lineItemCategory])

  // Update unit when category is selected (UOM is fixed from category)
  useEffect(() => {
    if (lineItemCategory) {
      setLineItemFormData(prev => ({
        ...prev,
        unit: lineItemCategory.purchase_uom || lineItemCategory.default_uom || 'PCS'
      }))
    }
  }, [lineItemCategory?.code])

  // Fetch divisions when sub-category changes
  useEffect(() => {
    const fetchDivisions = async () => {
      if (lineItemCategory?.code && lineItemSubCategory?.code) {
        try {
          const response = await categoryHierarchy.getDivisions({
            category_code: lineItemCategory.code,
            sub_category_code: lineItemSubCategory.code,
            is_active: true
          })
          setDivisions(response.data || [])
        } catch (error) {
          console.error('Error fetching divisions:', error)
          setDivisions([])
        }
      } else {
        setDivisions([])
      }
      setLineItemDivision(null)
      setClasses([])
      setLineItemClass(null)
      setSubClasses([])
      setLineItemSubClass(null)
    }
    fetchDivisions()
  }, [lineItemSubCategory])

  // Fetch classes when division changes
  useEffect(() => {
    const fetchClasses = async () => {
      if (lineItemCategory?.code && lineItemSubCategory?.code && lineItemDivision?.code) {
        try {
          const response = await categoryHierarchy.getClasses({
            category_code: lineItemCategory.code,
            sub_category_code: lineItemSubCategory.code,
            division_code: lineItemDivision.code,
            is_active: true
          })
          setClasses(response.data || [])
        } catch (error) {
          console.error('Error fetching classes:', error)
          setClasses([])
        }
      } else {
        setClasses([])
      }
      setLineItemClass(null)
      setSubClasses([])
      setLineItemSubClass(null)
    }
    fetchClasses()
  }, [lineItemDivision])

  // Fetch sub-classes when class changes
  useEffect(() => {
    const fetchSubClasses = async () => {
      if (lineItemCategory?.code && lineItemSubCategory?.code && lineItemDivision?.code && lineItemClass?.code) {
        try {
          const response = await categoryHierarchy.getSubClasses({
            category_code: lineItemCategory.code,
            sub_category_code: lineItemSubCategory.code,
            division_code: lineItemDivision.code,
            class_code: lineItemClass.code,
            is_active: true
          })
          setSubClasses(response.data || [])
        } catch (error) {
          console.error('Error fetching sub-classes:', error)
          setSubClasses([])
        }
      } else {
        setSubClasses([])
      }
      setLineItemSubClass(null)
    }
    fetchSubClasses()
  }, [lineItemClass])

  // Get effective category code (deepest level)
  const getEffectiveCategoryCode = () => {
    return lineItemSubClass?.code || lineItemClass?.code || lineItemDivision?.code ||
           lineItemSubCategory?.code || lineItemCategory?.code || ''
  }

  // Get category hierarchy path for display
  const getHierarchyPath = () => {
    const parts = []
    if (lineItemCategory) parts.push(lineItemCategory.name)
    if (lineItemSubCategory) parts.push(lineItemSubCategory.name)
    if (lineItemDivision) parts.push(lineItemDivision.name)
    if (lineItemClass) parts.push(lineItemClass.name)
    if (lineItemSubClass) parts.push(lineItemSubClass.name)
    return parts.join(' > ')
  }

  const loadPRDetails = async () => {
    try {
      const response = await api.get(`/purchase/purchase-requests/${pr.pr_code}`)
      const data = response.data
      setFormData({
        pr_date: data.pr_date || new Date().toISOString().split('T')[0],
        department: data.department || '',
        priority: data.priority || 'NORMAL',
        required_by_date: data.required_by_date || '',
        purpose: data.purpose || '',
        justification: data.justification || '',
        notes: data.notes || '',
      })
      setLineItems(data.items || [])
    } catch (error) {
      console.error('Error loading PR details:', error)
      toast.error('Failed to load PR details')
    }
  }

  const fetchItems = async () => {
    try {
      const response = await api.get('/items', { params: { is_active: true, limit: 1000 } })
      setItems(response.data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers', { params: { is_active: true } })
      setSuppliers(response.data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchBrands = async () => {
    try {
      const response = await api.get('/brands', { params: { is_active: true } })
      setBrands(response.data || [])
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const fetchItemTypes = async () => {
    try {
      const response = await api.itemTypes.getAll()
      const types = Array.isArray(response.data) ? response.data : response.data.data || []
      const mappedTypes = types.map(t => ({
        code: t.type_code || t.code,
        name: t.type_name || t.name
      }))
      setItemTypes(mappedTypes)
    } catch (error) {
      console.error('Error fetching item types:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await categoryHierarchy.getCategories({ is_active: true })
      setCategories(response.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Handle hierarchy selection from search
  const handleSelectLineItemHierarchy = async (result) => {
    try {
      setShowLineItemSearch(false)
      setLineItemSearchResults([])
      setLineItemSearchTerm('')

      // Reset all selections first
      setLineItemCategory(null)
      setLineItemSubCategory(null)
      setLineItemDivision(null)
      setLineItemClass(null)
      setLineItemSubClass(null)

      // Find and set Level 1 (Category)
      const category = categories.find(c => c.code === result.category_code) ||
                      (result.level === 1 ? result.data : null)

      if (!category) {
        toast.error('Category not found')
        return
      }

      setLineItemCategory(category)

      // If search result is at level 1, fetch sub-categories but don't auto-select
      if (result.level === 1) {
        const subCatsResponse = await categoryHierarchy.getSubCategories({
          category_code: category.code,
          is_active: true
        })
        setSubCategories(subCatsResponse.data || [])
        toast.success(`✓ Selected: ${result.path}`, { duration: 3000 })
        return
      }

      // If level >= 2, fetch and select sub-category
      // For level 2, the result itself IS the sub-category, so use result.code
      // For levels 3+, the sub_category_code is stored in the result
      const subCategoryCode = result.level === 2 ? result.code : result.sub_category_code
      if (result.level >= 2 && subCategoryCode) {
        const subCatsResponse = await categoryHierarchy.getSubCategories({
          category_code: category.code,
          is_active: true
        })
        const subCats = subCatsResponse.data || []
        setSubCategories(subCats)

        const subCat = subCats.find(sc => sc.code === subCategoryCode)
        if (subCat) {
          setLineItemSubCategory(subCat)

          // If search result is at level 2, fetch divisions but don't auto-select
          if (result.level === 2) {
            const divsResponse = await categoryHierarchy.getDivisions({
              category_code: category.code,
              sub_category_code: subCat.code,
              is_active: true
            })
            setDivisions(divsResponse.data || [])
            toast.success(`✓ Selected: ${result.path}`, { duration: 3000 })
            return
          }

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
              setLineItemDivision(div)

              // If search result is at level 3, fetch classes but don't auto-select
              if (result.level === 3) {
                const classesResponse = await categoryHierarchy.getClasses({
                  category_code: category.code,
                  sub_category_code: subCat.code,
                  division_code: div.code,
                  is_active: true
                })
                setClasses(classesResponse.data || [])
                toast.success(`✓ Selected: ${result.path}`, { duration: 3000 })
                return
              }

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
                  setLineItemClass(cls)

                  // If search result is at level 4, fetch sub-classes but don't auto-select
                  if (result.level === 4) {
                    const subClassesResponse = await categoryHierarchy.getSubClasses({
                      category_code: category.code,
                      sub_category_code: subCat.code,
                      division_code: div.code,
                      class_code: cls.code,
                      is_active: true
                    })
                    setSubClasses(subClassesResponse.data || [])
                    toast.success(`✓ Selected: ${result.path}`, { duration: 3000 })
                    return
                  }

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
                      setLineItemSubClass(subCls)
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
      console.error('Error selecting category hierarchy:', error)
      toast.error('Error selecting category')
    }
  }

  // Filter items based on selected item type
  const getFilteredItems = () => {
    if (!selectedItemType) {
      return items
    }
    return items.filter(item => item.item_type === selectedItemType)
  }

  const handleItemCreated = async (newItem) => {
    // Close the line item form after adding
    setShowLineItemForm(false)
  }

  const handleItemUpdated = async (updatedItem) => {
    // Refresh items list
    await fetchItems()
    
    // Update the line item with new item data if it was edited
    if (editingItemCode && updatedItem) {
      const lineItemIndex = lineItems.findIndex(li => li.item_code === editingItemCode)
      if (lineItemIndex >= 0) {
        updateLineItem(lineItemIndex, 'item_name', updatedItem.item_name || updatedItem.itemName)
        updateLineItem(lineItemIndex, 'uom', updatedItem.uom || updatedItem.stockUom)
        updateLineItem(lineItemIndex, 'hsn_code', updatedItem.hsn_code || '')
        updateLineItem(lineItemIndex, 'gst_rate', updatedItem.gst_rate || 0)
      }
    }
    
    setEditingItemCode(null)
    toast.success('Line item updated')
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
    if (value.length >= 2) {
      setSearching(true)
      const filteredItems = getFilteredItems()
      const filtered = filteredItems.filter(item =>
        item.item_code?.toLowerCase().includes(value.toLowerCase()) ||
        item.item_name?.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10)
      setSearchResults(filtered)
      setSearching(false)
    } else {
      setSearchResults([])
    }
  }

  // Fetch category specifications and filter suppliers/brands
  const fetchCategoryFilters = async (categoryCode, itemId) => {
    try {
      if (!categoryCode) {
        return { filteredSuppliers: suppliers, filteredBrands: brands, hasFilters: false }
      }

      const specResponse = await specificationApi.get(categoryCode)
      const specs = specResponse.data

      if (!specs) {
        return { filteredSuppliers: suppliers, filteredBrands: brands, hasFilters: false }
      }

      let filteredSuppliers = [...suppliers]
      let filteredBrands = [...brands]
      let hasFilters = false

      const supplierGroups = specs.specifications?.supplier?.groups || specs.specifications?.vendor?.groups || []
      if (supplierGroups.length > 0) {
        hasFilters = true
        filteredSuppliers = suppliers.filter(s => {
          const supplierGroupsList = s.supplier_groups || (s.supplier_group ? [s.supplier_group] : [])
          return supplierGroupsList.some(g => supplierGroups.includes(g))
        })
      }

      const brandGroups = specs.specifications?.brand?.groups || []
      if (brandGroups.length > 0) {
        hasFilters = true
        filteredBrands = brands.filter(b => {
          const brandGroupsList = b.brand_groups || (b.brand_group ? [b.brand_group] : [])
          return brandGroupsList.some(g => brandGroups.includes(g))
        })
      }

      return { filteredSuppliers, filteredBrands, hasFilters }
    } catch (error) {
      console.log('No category specifications found for:', categoryCode)
      return { filteredSuppliers: suppliers, filteredBrands: brands, hasFilters: false }
    }
  }

  // Add line item from search (existing item)
  const addLineItemFromSearch = async (item) => {
    if (lineItems.find(li => li.item_code === item.item_code)) {
      toast.error('Item already added')
      return
    }

    const effectiveCategoryCode = item.sub_class_code || item.class_code || item.division_code ||
                                   item.sub_category_code || item.category_code || ''

    const newItem = {
      id: `li_${Date.now()}`,
      line_number: lineItems.length + 1,
      uid: item.uid || null,
      item_code: item.item_code,
      sku: item.sku || item.item_code,
      item_name: item.item_name,
      item_description: item.description || '',
      item_category: effectiveCategoryCode,
      category_path: item.category_name || '',
      quantity: 1,
      unit: item.uom || 'PCS',
      estimated_unit_rate: item.purchase_price || null,
      required_date: formData.required_by_date || null,
      suggested_supplier_code: null,
      suggested_supplier_name: null,
      suggested_brand_code: null,
      suggested_brand_name: null,
      colour_code: item.color_id || null,
      colour_name: item.color_name || null,
      size_code: item.size_id || null,
      size_name: item.size_name || null,
      notes: '',
      is_new_item: false,
    }

    const filters = await fetchCategoryFilters(effectiveCategoryCode, newItem.id)
    setLineItemFilters(prev => ({
      ...prev,
      [newItem.id]: filters
    }))

    setLineItems([...lineItems, newItem])
    setSearchTerm('')
    setSearchResults([])

    if (filters.hasFilters) {
      toast.success(`Item added. Filtered to ${filters.filteredSuppliers.length} supplier(s) and ${filters.filteredBrands.length} brand(s).`, { duration: 3000 })
    }
  }

  // Reset line item form
  const resetLineItemForm = () => {
    setLineItemCategory(null)
    setLineItemSubCategory(null)
    setLineItemDivision(null)
    setLineItemClass(null)
    setLineItemSubClass(null)
    setSubCategories([])
    setDivisions([])
    setClasses([])
    setSubClasses([])
    setLineItemFormData({
      item_name: '',
      item_description: '',
      quantity: 1,
      unit: 'PCS',
      estimated_unit_rate: '',
      required_date: formData.required_by_date || '',
      notes: '',
    })
    setLineItemSpecs({
      colour_code: null,
      size_code: null,
      uom_code: null,
      brand_code: null,
      supplier_code: null,
      custom_field_values: {}
    })
    setLineItemImage(null)
    setLineItemImageBase64(null)
    setLineItemSearchTerm('')
    setLineItemSearchResults([])
  }

  // Add line item from form (new item with category and specs)
  const addLineItemFromForm = async () => {
    if (!lineItemCategory) {
      toast.error('Please select at least a category')
      return
    }

    if (!lineItemFormData.item_name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    if (!lineItemFormData.quantity || lineItemFormData.quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    const effectiveCategoryCode = getEffectiveCategoryCode()
    const hierarchyPath = getHierarchyPath()

    const newItem = {
      id: `li_${Date.now()}`,
      line_number: lineItems.length + 1,
      uid: null,
      item_code: null, // Will be generated if item is created later
      sku: null,
      item_name: lineItemFormData.item_name,
      item_description: lineItemFormData.item_description,
      item_category: effectiveCategoryCode,
      category_path: hierarchyPath,
      category_code: lineItemCategory?.code,
      category_name: lineItemCategory?.name,
      sub_category_code: lineItemSubCategory?.code,
      sub_category_name: lineItemSubCategory?.name,
      division_code: lineItemDivision?.code,
      division_name: lineItemDivision?.name,
      class_code: lineItemClass?.code,
      class_name: lineItemClass?.name,
      sub_class_code: lineItemSubClass?.code,
      sub_class_name: lineItemSubClass?.name,
      quantity: parseFloat(lineItemFormData.quantity) || 1,
      unit: lineItemFormData.unit || 'PCS',
      estimated_unit_rate: lineItemFormData.estimated_unit_rate ? parseFloat(lineItemFormData.estimated_unit_rate) : null,
      required_date: lineItemFormData.required_date || formData.required_by_date || null,
      suggested_supplier_code: lineItemSpecs.supplier_code,
      suggested_supplier_name: suppliers.find(s => s.code === lineItemSpecs.supplier_code)?.name || null,
      suggested_brand_code: lineItemSpecs.brand_code,
      suggested_brand_name: brands.find(b => b.code === lineItemSpecs.brand_code)?.name || null,
      colour_code: lineItemSpecs.colour_code,
      colour_name: null, // Will be filled when displayed
      size_code: lineItemSpecs.size_code,
      size_name: null,
      uom_code: lineItemSpecs.uom_code,
      specifications: lineItemSpecs,
      notes: lineItemFormData.notes,
      is_new_item: true,
    }

    const filters = await fetchCategoryFilters(effectiveCategoryCode, newItem.id)
    setLineItemFilters(prev => ({
      ...prev,
      [newItem.id]: filters
    }))

    setLineItems([...lineItems, newItem])
    setShowLineItemForm(false)
    resetLineItemForm()
    toast.success('Line item added')
  }

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems]
    updated[index][field] = value

    if (field === 'quantity' || field === 'estimated_unit_rate') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(updated[index].quantity) || 0
      const rate = field === 'estimated_unit_rate' ? parseFloat(value) || 0 : parseFloat(updated[index].estimated_unit_rate) || 0
      updated[index].estimated_amount = qty * rate
    }

    setLineItems(updated)
  }

  const removeLineItem = (index) => {
    const removedItem = lineItems[index]
    const updated = lineItems.filter((_, i) => i !== index)
    updated.forEach((item, i) => {
      item.line_number = i + 1
    })
    setLineItems(updated)

    if (removedItem?.id) {
      setLineItemFilters(prev => {
        const newFilters = { ...prev }
        delete newFilters[removedItem.id]
        return newFilters
      })
    }
  }

  const getFilteredSuppliers = (itemId) => {
    const filters = lineItemFilters[itemId]
    return filters?.filteredSuppliers || suppliers
  }

  const getFilteredBrands = (itemId) => {
    const filters = lineItemFilters[itemId]
    return filters?.filteredBrands || brands
  }

  const hasLineItemFilters = (itemId) => {
    return lineItemFilters[itemId]?.hasFilters || false
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLineItemFormChange = (e) => {
    const { name, value } = e.target
    setLineItemFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (lineItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    // Validate each line item has required fields
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i]
      if (!item.item_name || item.item_name.trim() === '') {
        toast.error(`Item ${i + 1}: Item name is required`)
        return
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        toast.error(`Item ${i + 1}: Quantity must be greater than 0`)
        return
      }
    }

    setLoading(true)
    try {
      const payload = {
        pr_date: formData.pr_date || null,
        department: formData.department || null,
        priority: formData.priority || 'NORMAL',
        required_by_date: formData.required_by_date || null,
        purpose: formData.purpose || null,
        justification: formData.justification || null,
        notes: formData.notes || null,
        items: lineItems.map(item => {
          // Build specifications object - only include keys that have values
          const specifications = {}
          if (item.colour_code) specifications.colour_code = item.colour_code
          if (item.size_code) specifications.size_code = item.size_code
          if (item.uom_code) specifications.uom_code = item.uom_code
          if (item.specifications?.supplier_code) specifications.supplier_code = item.specifications.supplier_code
          if (item.specifications?.brand_code) specifications.brand_code = item.specifications.brand_code
          if (item.specifications?.custom_field_values) specifications.custom_field_values = item.specifications.custom_field_values

          return {
            item_code: item.item_code || null,
            item_name: item.item_name || '',
            item_description: item.item_description || '',
            item_category: item.item_category || null,
            category_path: item.category_path || '',
            category_code: item.category_code || null,
            sub_category_code: item.sub_category_code || null,
            division_code: item.division_code || null,
            class_code: item.class_code || null,
            sub_class_code: item.sub_class_code || null,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || 'PCS',
            estimated_unit_rate: item.estimated_unit_rate ? parseFloat(item.estimated_unit_rate) : null,
            required_date: item.required_date && item.required_date !== '' ? item.required_date : null,
            colour_code: item.colour_code || null,
            size_code: item.size_code || null,
            uom_code: item.uom_code || null,
            suggested_supplier_code: item.suggested_supplier_code || null,
            suggested_supplier_name: item.suggested_supplier_name || null,
            suggested_brand_code: item.suggested_brand_code || null,
            suggested_brand_name: item.suggested_brand_name || null,
            specifications: specifications,
            notes: item.notes || '',
            is_new_item: item.is_new_item || false,
          }
        })
      }

      console.log('PR Payload:', payload)

      if (pr) {
        await api.put(`/purchase/purchase-requests/${pr.pr_code}`, payload)
        toast.success('Purchase Request updated successfully')
      } else {
        await api.post('/purchase/purchase-requests', payload)
        toast.success('Purchase Request created successfully')
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving PR:', error)
      console.error('Error response:', error.response?.data)

      // Show detailed validation errors if available
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(e => `${e.field}: ${e.message}`).join('\n')
        toast.error(`Validation Error:\n${errorMessages}`, { duration: 5000 })
      } else {
        toast.error(error.response?.data?.detail || 'Failed to save Purchase Request')
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const rate = parseFloat(item.estimated_unit_rate) || 0
      return sum + (qty * rate)
    }, 0)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {pr ? 'Edit Purchase Request' : 'Create Purchase Request'}
            </h2>
            <p className="text-sm text-gray-500">
              {pr ? `Editing ${pr.pr_code}` : 'Fill in the details below'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PR Date
              </label>
              <input
                type="date"
                name="pr_date"
                value={formData.pr_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Production, Stores"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required By Date
              </label>
              <input
                type="date"
                name="required_by_date"
                value={formData.required_by_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose
              </label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Brief purpose of the request"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Justification
            </label>
            <textarea
              name="justification"
              value={formData.justification}
              onChange={handleChange}
              rows="2"
              placeholder="Explain why these items are needed"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Line Items Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingItemCode(null)
                  setShowLineItemForm(true)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </button>
            </div>

            {/* Line Items Table */}
            {lineItems.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item / Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Specifications</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-16">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-36">Supplier</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-32">Brand</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Est. Rate</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Est. Amt</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lineItems.map((item, index) => (
                      <tr key={item.id || index} className={item.is_new_item ? 'bg-blue-50' : ''}>
                        <td className="px-3 py-2 text-sm text-gray-500">{item.line_number}</td>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium">{item.item_name}</div>
                          {item.item_code && (
                            <div className="flex items-center gap-1 mt-1">
                              {item.uid && (
                                <span className="font-mono text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  {item.uid}
                                </span>
                              )}
                              <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {item.sku || item.item_code}
                              </span>
                            </div>
                          )}
                          {item.category_path && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <ChevronRight className="w-3 h-3" />
                              {item.category_path}
                            </div>
                          )}
                          {item.is_new_item && (
                            <span className="text-xs text-blue-600 font-medium">New Item</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {item.colour_code && (
                              <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">
                                {item.colour_name || item.colour_code}
                              </span>
                            )}
                            {item.size_code && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                {item.size_name || item.size_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                            min="1"
                            className="w-full px-2 py-1 border rounded text-right text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.suggested_supplier_code || ''}
                            onChange={(e) => {
                              const filteredSuppliers = getFilteredSuppliers(item.id)
                              const supplier = filteredSuppliers.find(s => s.supplier_code === e.target.value)
                              updateLineItem(index, 'suggested_supplier_code', e.target.value)
                              updateLineItem(index, 'suggested_supplier_name', supplier?.supplier_name || '')
                            }}
                            className={`w-full px-2 py-1 border rounded text-sm ${hasLineItemFilters(item.id) ? 'border-blue-300 bg-blue-50' : ''}`}
                          >
                            <option value="">Select</option>
                            {getFilteredSuppliers(item.id).map(s => (
                              <option key={s.supplier_code} value={s.supplier_code}>
                                {s.supplier_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.suggested_brand_code || ''}
                            onChange={(e) => {
                              const filteredBrands = getFilteredBrands(item.id)
                              const brand = filteredBrands.find(b => b.brand_code === e.target.value)
                              updateLineItem(index, 'suggested_brand_code', e.target.value)
                              updateLineItem(index, 'suggested_brand_name', brand?.brand_name || '')
                            }}
                            className={`w-full px-2 py-1 border rounded text-sm ${hasLineItemFilters(item.id) ? 'border-blue-300 bg-blue-50' : ''}`}
                          >
                            <option value="">Select</option>
                            {getFilteredBrands(item.id).map(b => (
                              <option key={b.brand_code} value={b.brand_code}>
                                {b.brand_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.estimated_unit_rate || ''}
                            onChange={(e) => updateLineItem(index, 'estimated_unit_rate', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 border rounded text-right text-sm"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-medium">
                          {((parseFloat(item.quantity) || 0) * (parseFloat(item.estimated_unit_rate) || 0)).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => setEditingItemCode(item.item_code)}
                              className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                              title="Edit item details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="8" className="px-3 py-2 text-sm font-medium text-right">
                        Total Estimated:
                      </td>
                      <td className="px-3 py-2 text-sm font-bold text-right">
                        {calculateTotal().toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg border-dashed text-gray-500">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No items added yet</p>
                <p className="text-sm">Click "Add New Line Item" or search for existing items</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || lineItems.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (pr ? 'Update PR' : 'Create PR')}
            </button>
          </div>
        </form>
      </div>

      {/* Add Line Item Form Modal */}
      {showLineItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">
                {editingItemCode ? 'Edit Line Item' : 'Add Line Item'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowLineItemForm(false)
                  setEditingItemCode(null)
                  resetLineItemForm()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Full Screen Search Overlay */}
              {showLineItemSearch && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                  <div className="w-full max-w-3xl">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Search className="w-6 h-6" />
                          <h3 className="text-base font-semibold">Quick Search Categories</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLineItemSearch(false)
                            setLineItemSearchResults([])
                            setLineItemSearchTerm('')
                          }}
                          className="p-2 hover:bg-white/20 rounded-lg transition"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Search Input */}
                      <div className="p-6 border-b">
                        <input
                          type="text"
                          placeholder="Search categories by name or code (Level 1-5)..."
                          value={lineItemSearchTerm}
                          onChange={(e) => {
                            const searchValue = e.target.value
                            setLineItemSearchTerm(searchValue)
                            
                            if (lineItemSearchTimeoutRef.current) {
                              clearTimeout(lineItemSearchTimeoutRef.current)
                            }
                            
                            if (searchValue.trim().length >= 2) {
                              lineItemSearchTimeoutRef.current = setTimeout(async () => {
                                try {
                                  console.log('[SEARCH] Searching for:', searchValue)
                                  const searchLower = searchValue.toLowerCase()
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

                                  console.log('[SEARCH] Results found:', results.length)
                                  setLineItemSearchResults(results.slice(0, 10))
                                  setShowLineItemSearchResults(results.length > 0)
                                } catch (error) {
                                  console.error('Error searching categories:', error)
                                  setLineItemSearchResults([])
                                  setShowLineItemSearchResults(false)
                                }
                              }, 300)
                            } else {
                              setLineItemSearchResults([])
                              setShowLineItemSearchResults(false)
                            }
                          }}
                          onFocus={() => {
                            if (lineItemSearchResults.length > 0) setShowLineItemSearchResults(true)
                          }}
                          autoFocus
                          className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Results */}
                      {showLineItemSearchResults && (
                        <div className="mt-4 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                          {lineItemSearchResults.length === 0 && (
                            <div className="p-6 text-center text-gray-500">
                              <AlertCircle className="w-6 h-6 inline-block mb-2" />
                              <div className="text-base">No categories found</div>
                              <p className="text-sm mt-1">Try a different search term</p>
                            </div>
                          )}

                          {lineItemSearchResults.length > 0 && (
                            <>
                              <div className="p-3 bg-blue-50 border-b-2 border-blue-200 text-sm font-semibold text-blue-800">
                                Found {lineItemSearchResults.length} categor{lineItemSearchResults.length > 1 ? 'ies' : 'y'} - Click to auto-select
                              </div>
                              {lineItemSearchResults.map((result) => (
                                <div
                                  key={result.id}
                                  onClick={() => handleSelectLineItemHierarchy(result)}
                                  className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{result.name}</span>
                                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                          {result.code}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        {result.path}
                                      </div>
                                    </div>
                                    <div className="ml-3">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                        {result.levelName}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Category Selection */}
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                    Select Item Category <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLineItemSearch(true)}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full flex items-center gap-1 transition"
                  >
                    <Search className="w-3 h-3" />
                    Search
                  </button>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Level 1 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Level 1 *</label>
                    <select
                      value={lineItemCategory?.code || ''}
                      onChange={(e) => {
                        const cat = categories.find(c => c.code === e.target.value)
                        setLineItemCategory(cat || null)
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select</option>
                      {categories.map(cat => (
                        <option key={cat.code} value={cat.code}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Level 2 */}
                  {subCategories.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Level 2</label>
                      <select
                        value={lineItemSubCategory?.code || ''}
                        onChange={(e) => {
                          const subCat = subCategories.find(c => c.code === e.target.value)
                          setLineItemSubCategory(subCat || null)
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select</option>
                        {subCategories.map(subCat => (
                          <option key={subCat.code} value={subCat.code}>{subCat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Level 3 */}
                  {divisions.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Level 3</label>
                      <select
                        value={lineItemDivision?.code || ''}
                        onChange={(e) => {
                          const div = divisions.find(d => d.code === e.target.value)
                          setLineItemDivision(div || null)
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select</option>
                        {divisions.map(div => (
                          <option key={div.code} value={div.code}>{div.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Level 4 */}
                  {classes.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Level 4</label>
                      <select
                        value={lineItemClass?.code || ''}
                        onChange={(e) => {
                          const cls = classes.find(c => c.code === e.target.value)
                          setLineItemClass(cls || null)
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select</option>
                        {classes.map(cls => (
                          <option key={cls.code} value={cls.code}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Level 5 */}
                  {subClasses.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Level 5</label>
                      <select
                        value={lineItemSubClass?.code || ''}
                        onChange={(e) => {
                          const subCls = subClasses.find(c => c.code === e.target.value)
                          setLineItemSubClass(subCls || null)
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select</option>
                        {subClasses.map(subCls => (
                          <option key={subCls.code} value={subCls.code}>{subCls.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Path Display */}
                {getHierarchyPath() && (
                  <div className="mt-3 bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                    <span className="text-blue-600 font-medium">Path:</span>
                    <span className="text-blue-800">{getHierarchyPath()}</span>
                  </div>
                )}
              </div>

              {/* Step 2: Item Details */}
              <div>
                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  Item Details
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="item_name"
                      value={lineItemFormData.item_name}
                      onChange={handleLineItemFormChange}
                      placeholder="Enter item name"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      name="item_description"
                      value={lineItemFormData.item_description}
                      onChange={handleLineItemFormChange}
                      placeholder="Brief description"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={lineItemFormData.quantity}
                      onChange={handleLineItemFormChange}
                      min="1"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={lineItemFormData.unit}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Fixed from category</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Rate
                    </label>
                    <input
                      type="number"
                      name="estimated_unit_rate"
                      value={lineItemFormData.estimated_unit_rate}
                      onChange={handleLineItemFormChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {/* Image Upload */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <ImageIcon className="w-4 h-4" />
                    Image (Optional)
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          setLineItemImage(file)
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setLineItemImageBase64(reader.result)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {lineItemImageBase64 && (
                      <div className="w-20 h-20 rounded-lg border-2 border-blue-200 overflow-hidden">
                        <img src={lineItemImageBase64} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Specifications */}
              {lineItemCategory && (
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                    Specifications
                  </h4>

                  <DynamicSpecificationForm
                    key={`pr-spec-${getEffectiveCategoryCode()}`}
                    categoryCode={getEffectiveCategoryCode()}
                    initialValues={lineItemSpecs}
                    onSpecificationsChange={setLineItemSpecs}
                    showTitle={false}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={lineItemFormData.notes}
                  onChange={handleLineItemFormChange}
                  rows="2"
                  placeholder="Any notes for this item..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowLineItemForm(false)
                    resetLineItemForm()
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addLineItemFromForm}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add Line Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
