import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import {
  Plus, Trash2, Save, X, Calculator, Package, User, MapPin,
  CreditCard, FileText, Calendar, ArrowLeft, Search, AlertCircle, ChevronRight, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { purchaseOrders, suppliers, items as itemsAPI, categoryHierarchy } from '../services/api'
import { purchaseRequestApi } from '../services/purchaseRequestApi'

const PurchaseOrderForm = () => {
  const { setTitle } = useLayout()
  const navigate = useNavigate()
  const location = useLocation()
  const { poNumber } = useParams()
  const isEditMode = !!poNumber
  
  // Check if coming from PR conversion
  const fromPR = location.state?.fromPR || false
  const prCode = location.state?.prCode || null
  const prData = location.state?.prData || null

  useEffect(() => {
    if (fromPR && prCode) {
      setTitle(`Create PO from PR: ${prCode}`)
    } else {
      setTitle(isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order')
    }
  }, [setTitle, isEditMode, fromPR, prCode])

  // Form state
  const [formData, setFormData] = useState({
    po_date: new Date().toISOString().split('T')[0],
    indent_number: '',
    supplier_code: '',
    delivery_location: '',
    delivery_method: 'COURIER',
    lead_time_days: 15,
    payment_terms: 'NET 30',
    payment_method: 'BANK_TRANSFER',
    currency: 'INR',
    cost_center: '',
    project_code: '',
    department: '',
    sample_attached: false,
    remarks: '',
    terms_and_conditions: ''
  })

  const [lineItems, setLineItems] = useState([])
  const [suppliersList, setSuppliersList] = useState([])
  const [itemsList, setItemsList] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Category hierarchy for line items
  const [categories, setCategories] = useState([])
  const [lineItemCategories, setLineItemCategories] = useState({}) // per line item
  const [lineItemSubCategories, setLineItemSubCategories] = useState({})
  const [lineItemDivisions, setLineItemDivisions] = useState({})
  const [lineItemClasses, setLineItemClasses] = useState({})
  const [lineItemSubClasses, setLineItemSubClasses] = useState({})
  
  // Search for categories in line items
  const [showLineItemSearch, setShowLineItemSearch] = useState(null) // lineItemId
  const [lineItemSearchTerm, setLineItemSearchTerm] = useState('')
  const [lineItemSearchResults, setLineItemSearchResults] = useState([])
  const [showLineItemSearchResults, setShowLineItemSearchResults] = useState(false)
  const lineItemSearchTimeoutRef = useRef(null)

  // Item search for line items (search from Item Master)
  const [showItemSearch, setShowItemSearch] = useState(null) // lineItemId for item search
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  const [itemSearchResults, setItemSearchResults] = useState([])
  const itemSearchTimeoutRef = useRef(null)

  // Calculated summary
  const [summary, setSummary] = useState({
    subtotal: 0,
    total_discount: 0,
    total_taxable: 0,
    total_gst: 0,
    grand_total: 0
  })

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryHierarchy.getCategories({ is_active: true })
        setCategories(response.data || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await suppliers.list()
        if (response && response.data) {
          // Handle both array and paginated response formats
          const supplierData = Array.isArray(response.data)
            ? response.data
            : (response.data.data || response.data.items || [])
          setSuppliersList(supplierData)
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error)
        // Set empty array to prevent form from breaking
        setSuppliersList([])
        const errorMsg = 'Backend server not available. Please start the server first.'
        setLoadError(errorMsg)
        // Don't show toast error for initial load failures
      }
    }
    fetchSuppliers()
  }, [])

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await itemsAPI.list()
        if (response && response.data) {
          // Handle both array and paginated response formats
          const itemData = Array.isArray(response.data)
            ? response.data
            : (response.data.data || response.data.items || [])
          setItemsList(itemData)
        }
      } catch (error) {
        console.error('Error fetching items:', error)
        // Set empty array to prevent form from breaking
        setItemsList([])
        const errorMsg = 'Backend server not available. Please start the server first.'
        setLoadError(errorMsg)
        // Don't show toast error for initial load failures
      }
    }
    fetchItems()
  }, [])

  // Pre-fill data from Purchase Request if coming from PR conversion
  useEffect(() => {
    if (fromPR && prData) {
      console.log('Pre-filling PO form from PR:', prData)
      
      // Get first supplier from PR items (if items exist)
      const prItems = prData.items || []
      const firstSupplierCode = prItems.find(item => item.suggested_supplier_code)?.suggested_supplier_code || ''
      
      // Set form data
      setFormData(prev => ({
        ...prev,
        indent_number: prCode || '',
        supplier_code: firstSupplierCode,
        delivery_location: prData.delivery_location || '',
        remarks: `Created from Purchase Request: ${prCode}`,
        department: prData.department || ''
      }))
      
      // Convert PR line items to PO line items
      const poLineItems = prItems
        .filter(item => item.is_approved !== false) // Include approved items
        .map((item, idx) => ({
          id: Date.now() + idx,
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          item_description: item.item_description || '',
          item_category: item.item_category || '',
          quantity: item.approved_quantity || item.quantity || 1,
          unit: item.unit || 'PCS',
          unit_rate: item.estimated_unit_rate || 0,
          discount_percent: 0,
          hsn_code: item.hsn_code || '',
          gst_percent: 18,
          expected_delivery_date: item.required_date || '',
          inspection_required: false,
          quality_specs: '',
          notes: item.notes || ''
        }))
      
      if (poLineItems.length > 0) {
        setLineItems(poLineItems)
        toast.success(`Loaded ${poLineItems.length} items from PR ${prCode}`)
      }
    }
  }, [fromPR, prData, prCode])

  // Calculate line item amounts
  const calculateLineItem = (item) => {
    const lineAmount = item.quantity * item.unit_rate
    const discountAmount = lineAmount * (item.discount_percent / 100)
    const taxableAmount = lineAmount - discountAmount
    const gstAmount = taxableAmount * (item.gst_percent / 100)
    const netAmount = taxableAmount + gstAmount

    return {
      ...item,
      line_amount: lineAmount,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      gst_amount: gstAmount,
      net_amount: netAmount
    }
  }

  // Recalculate summary
  useEffect(() => {
    const calculatedItems = lineItems.map(calculateLineItem)

    const subtotal = calculatedItems.reduce((sum, item) => sum + item.line_amount, 0)
    const totalDiscount = calculatedItems.reduce((sum, item) => sum + item.discount_amount, 0)
    const totalTaxable = calculatedItems.reduce((sum, item) => sum + item.taxable_amount, 0)
    const totalGst = calculatedItems.reduce((sum, item) => sum + item.gst_amount, 0)
    const grandTotal = Math.round(totalTaxable + totalGst)

    setSummary({
      subtotal: subtotal.toFixed(2),
      total_discount: totalDiscount.toFixed(2),
      total_taxable: totalTaxable.toFixed(2),
      total_gst: totalGst.toFixed(2),
      grand_total: grandTotal
    })
  }, [lineItems])

  // Add new line item
  const addLineItem = () => {
    const newItemId = Date.now()
    const newItem = {
      id: newItemId,
      item_code: '',
      item_name: '',
      item_description: '',
      item_category: '',
      quantity: 1,
      unit: 'PCS',
      storage_uom: 'PCS',
      uom_conversion_factor: 1.0,
      unit_rate: 0,
      discount_percent: 0,
      hsn_code: '',
      gst_percent: 18,
      expected_delivery_date: '',
      inspection_required: false,
      quality_specs: '',
      notes: ''
    }
    setLineItems([...lineItems, newItem])
    
    // Initialize state objects for this line item
    setLineItemCategories(prev => ({ ...prev, [newItemId]: null }))
    setLineItemSubCategories(prev => ({ ...prev, [newItemId]: [] }))
    setLineItemDivisions(prev => ({ ...prev, [newItemId]: [] }))
    setLineItemClasses(prev => ({ ...prev, [newItemId]: [] }))
    setLineItemSubClasses(prev => ({ ...prev, [newItemId]: [] }))
  }

  // Handle hierarchy selection from search - EXACT SAME LOGIC AS ItemCreateForm/PurchaseRequestForm
  const handleSelectLineItemHierarchy = async (lineItemId, result) => {
    try {
      setShowLineItemSearch(null)
      setLineItemSearchResults([])
      setLineItemSearchTerm('')

      // Reset selections for this line item
      setLineItemCategories(prev => ({ ...prev, [lineItemId]: null }))
      setLineItemSubCategories(prev => ({ ...prev, [lineItemId]: null }))
      setLineItemDivisions(prev => ({ ...prev, [lineItemId]: null }))
      setLineItemClasses(prev => ({ ...prev, [lineItemId]: null }))
      setLineItemSubClasses(prev => ({ ...prev, [lineItemId]: null }))

      // Find and set Level 1 (Category)
      const category = categories.find(c => c.code === result.category_code) ||
                      (result.level === 1 ? result.data : null)

      if (!category) {
        toast.error('Category not found')
        return
      }

      setLineItemCategories(prev => ({ ...prev, [lineItemId]: category }))

      // If search result is at level 1, fetch sub-categories but don't auto-select
      if (result.level === 1) {
        const subCatsResponse = await categoryHierarchy.getSubCategories({
          category_code: category.code,
          is_active: true
        })
        setLineItemSubCategories(prev => ({
          ...prev,
          [lineItemId]: subCatsResponse.data || []
        }))
        toast.success(`✓ Selected: ${result.path}`, { duration: 3000 })
        return
      }

      // If level >= 2, fetch and select sub-category
      const subCategoryCode = result.level === 2 ? result.code : result.sub_category_code
      if (result.level >= 2 && subCategoryCode) {
        const subCatsResponse = await categoryHierarchy.getSubCategories({
          category_code: category.code,
          is_active: true
        })
        const subCats = subCatsResponse.data || []
        setLineItemSubCategories(prev => ({
          ...prev,
          [lineItemId]: subCats
        }))

        const subCat = subCats.find(sc => sc.code === subCategoryCode)
        if (subCat) {
          setLineItemSubCategories(prev => ({
            ...prev,
            [lineItemId]: [subCat, ...subCats.filter(sc => sc.code !== subCat.code)]
          }))

          // If search result is at level 2, fetch divisions but don't auto-select
          if (result.level === 2) {
            const divsResponse = await categoryHierarchy.getDivisions({
              category_code: category.code,
              sub_category_code: subCat.code,
              is_active: true
            })
            setLineItemDivisions(prev => ({
              ...prev,
              [lineItemId]: divsResponse.data || []
            }))
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
            setLineItemDivisions(prev => ({
              ...prev,
              [lineItemId]: divs
            }))

            const div = divs.find(d => d.code === result.division_code)
            if (div) {
              setLineItemDivisions(prev => ({
                ...prev,
                [lineItemId]: [div, ...divs.filter(d => d.code !== div.code)]
              }))

              // If search result is at level 3, fetch classes but don't auto-select
              if (result.level === 3) {
                const classesResponse = await categoryHierarchy.getClasses({
                  category_code: category.code,
                  sub_category_code: subCat.code,
                  division_code: div.code,
                  is_active: true
                })
                setLineItemClasses(prev => ({
                  ...prev,
                  [lineItemId]: classesResponse.data || []
                }))
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
                setLineItemClasses(prev => ({
                  ...prev,
                  [lineItemId]: clss
                }))

                const cls = clss.find(c => c.code === result.class_code)
                if (cls) {
                  setLineItemClasses(prev => ({
                    ...prev,
                    [lineItemId]: [cls, ...clss.filter(c => c.code !== cls.code)]
                  }))

                  // If search result is at level 4, fetch sub-classes but don't auto-select
                  if (result.level === 4) {
                    const subClassesResponse = await categoryHierarchy.getSubClasses({
                      category_code: category.code,
                      sub_category_code: subCat.code,
                      division_code: div.code,
                      class_code: cls.code,
                      is_active: true
                    })
                    setLineItemSubClasses(prev => ({
                      ...prev,
                      [lineItemId]: subClassesResponse.data || []
                    }))
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
                    setLineItemSubClasses(prev => ({
                      ...prev,
                      [lineItemId]: subClss
                    }))

                    const subCls = subClss.find(sc => sc.code === result.data.code)
                    if (subCls) {
                      setLineItemSubClasses(prev => ({
                        ...prev,
                        [lineItemId]: [subCls, ...subClss.filter(sc => sc.code !== subCls.code)]
                      }))
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

  // Remove line item
  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  // Update line item
  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Handle item selection from dropdown
  const handleItemSelect = (id, itemCode) => {
    const selectedItem = itemsList.find(i => i.code === itemCode)
    if (selectedItem) {
      updateLineItem(id, 'item_code', selectedItem.code)
      updateLineItem(id, 'item_name', selectedItem.name)
      updateLineItem(id, 'item_description', selectedItem.description || '')
      updateLineItem(id, 'hsn_code', selectedItem.hsn_code || '')
      updateLineItem(id, 'gst_percent', selectedItem.gst_rate || 18)
      updateLineItem(id, 'unit', selectedItem.unit || 'PCS')
    }
  }

  // Handle item search from Item Master
  const handleItemSearch = (searchValue) => {
    setItemSearchTerm(searchValue)

    if (itemSearchTimeoutRef.current) {
      clearTimeout(itemSearchTimeoutRef.current)
    }

    if (searchValue.trim().length >= 2) {
      itemSearchTimeoutRef.current = setTimeout(() => {
        const searchLower = searchValue.toLowerCase()
        const results = itemsList.filter(item =>
          (item.item_code?.toLowerCase().includes(searchLower)) ||
          (item.code?.toLowerCase().includes(searchLower)) ||
          (item.item_name?.toLowerCase().includes(searchLower)) ||
          (item.name?.toLowerCase().includes(searchLower)) ||
          (item.sku?.toLowerCase().includes(searchLower))
        ).slice(0, 10)
        setItemSearchResults(results)
      }, 300)
    } else {
      setItemSearchResults([])
    }
  }

  // Handle selecting an item from search results
  const handleSelectItemFromSearch = async (lineItemId, selectedItem) => {
    // Fetch current UOM settings from item's category (sub-class)
    let categoryUom = {
      purchase_uom: selectedItem.purchase_uom || selectedItem.uom || 'PCS',
      storage_uom: selectedItem.storage_uom || selectedItem.uom || 'PCS',
      uom_conversion_factor: selectedItem.uom_conversion_factor || 1.0
    }

    // Try to fetch latest UOM from the item's category (sub-class level 5)
    const subClassCode = selectedItem.sub_class_code
    if (subClassCode) {
      try {
        const response = await categoryHierarchy.getSubClasses()
        if (response?.data) {
          const subClass = response.data.find(sc => sc.code === subClassCode)
          if (subClass) {
            categoryUom = {
              purchase_uom: subClass.purchase_uom || 'PCS',
              storage_uom: subClass.storage_uom || 'PCS',
              uom_conversion_factor: subClass.uom_conversion_factor || 1.0
            }
          }
        }
      } catch (error) {
        console.error('Error fetching category UOM:', error)
        // Fall back to item's stored UOM
      }
    }

    // Update the line item with selected item data
    // UOM is locked to category's purchase_uom, cannot be changed
    setLineItems(lineItems.map(item => {
      if (item.id === lineItemId) {
        return {
          ...item,
          item_code: selectedItem.item_code || selectedItem.code || selectedItem.sku,
          item_name: selectedItem.item_name || selectedItem.name,
          item_description: selectedItem.description || selectedItem.item_description || '',
          hsn_code: selectedItem.hsn_code || '',
          gst_percent: selectedItem.gst_rate || selectedItem.gst_percent || 18,
          // UOM - locked to category's purchase_uom, cannot be changed
          unit: categoryUom.purchase_uom,
          storage_uom: categoryUom.storage_uom,
          uom_conversion_factor: categoryUom.uom_conversion_factor,
          unit_rate: selectedItem.purchase_price || selectedItem.unit_rate || 0
        }
      }
      return item
    }))

    // Close search modal
    setShowItemSearch(null)
    setItemSearchTerm('')
    setItemSearchResults([])
    toast.success(`Selected: ${selectedItem.item_name || selectedItem.name}`)
  }

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.supplier_code) {
      toast.error('Please select a supplier')
      return
    }

    if (lineItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    if (lineItems.some(item => !item.item_code || item.quantity <= 0 || item.unit_rate <= 0)) {
      toast.error('Please fill all item details correctly')
      return
    }

    if (!formData.delivery_location) {
      toast.error('Please enter delivery location')
      return
    }

    setSaving(true)

    try {
      const payload = {
        ...formData,
        items: lineItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          item_description: item.item_description,
          item_category: item.item_category,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          storage_uom: item.storage_uom || 'PCS',
          uom_conversion_factor: parseFloat(item.uom_conversion_factor || 1.0),
          unit_rate: parseFloat(item.unit_rate),
          discount_percent: parseFloat(item.discount_percent || 0),
          hsn_code: item.hsn_code,
          gst_percent: parseFloat(item.gst_percent || 0),
          expected_delivery_date: item.expected_delivery_date || null,
          inspection_required: item.inspection_required,
          quality_specs: item.quality_specs,
          notes: item.notes
        }))
      }

      if (isEditMode) {
        await purchaseOrders.update(poNumber, payload)
        toast.success('Purchase Order updated successfully')
      } else {
        const response = await purchaseOrders.create(payload)
        const newPoNumber = response.data.po_number
        
        // If created from PR, mark the PR as converted
        if (fromPR && prCode) {
          try {
            await purchaseRequestApi.markConverted(prCode, newPoNumber)
          } catch (err) {
            console.warn('Failed to mark PR as converted:', err)
            // Don't block PO creation if this fails
          }
        }
        
        toast.success(`Purchase Order ${newPoNumber} created successfully`)
        navigate(`/purchase-orders/${newPoNumber}`)
      }
    } catch (error) {
      console.error('Error saving PO:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to save Purchase Order'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  // Show error state if load failed
  if (loadError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <X size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Form</h2>
            <p className="text-gray-600 mb-4">{loadError}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/purchase-orders')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Top Bar */}
      <div className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => navigate('/purchase-orders')}
             className="p-2 hover:bg-gray-100 rounded-full transition"
           >
              <ArrowLeft size={20} className="text-gray-600" />
           </button>
           <div>
             <h1 className="text-xl font-bold text-gray-900">
               {fromPR ? `Create PO from ${prCode}` : (isEditMode ? `Edit PO #${poNumber}` : 'New Purchase Order')}
             </h1>
             <p className="text-xs text-gray-500">
               {fromPR 
                 ? 'Review and create purchase order from approved PR' 
                 : (isEditMode ? 'Update purchase order details' : 'Create a new purchase order')}
             </p>
           </div>
           {fromPR && (
             <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
               From PR: {prCode}
             </span>
           )}
        </div>

        <div className="flex items-center gap-2">
           <button 
             type="button"
             onClick={() => navigate('/purchase-orders')}
             className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
           >
             Cancel
           </button>
           <button
             onClick={handleSubmit}
             disabled={saving || lineItems.length === 0}
             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
           >
             {saving ? (
               <>
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                 Saving...
               </>
             ) : (
               <>
                 <Save size={18} />
                 {isEditMode ? 'Update PO' : 'Create PO'}
               </>
             )}
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X size={20} />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                <X size={18} />
              </button>
            </div>
          )}

          {/* Load Error Display */}
          {loadError && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Package size={20} />
                <div>
                  <p className="font-medium">Unable to load required data</p>
                  <p className="text-sm mt-1">{loadError}</p>
                  <p className="text-sm mt-1">Please ensure the backend server is running on port 8000.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
        {/* PO Header Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">PO Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.po_date}
                onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indent Number
              </label>
              <input
                type="text"
                value={formData.indent_number}
                onChange={(e) => setFormData({ ...formData, indent_number: e.target.value })}
                placeholder="INDENT-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplier_code}
                onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Supplier</option>
                {suppliersList.map((supplier) => (
                  <option key={supplier.id} value={supplier.supplier_code}>
                    {supplier.supplier_name} ({supplier.supplier_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            </div>
            
            {/* Quick Add from Existing Items Dropdown */}
            <select
              value=""
              onChange={async (e) => {
                if (e.target.value) {
                  const selectedItem = itemsList.find(item => item.item_code === e.target.value)
                  if (selectedItem) {
                    // Fetch current UOM settings from item's category (sub-class)
                    let categoryUom = {
                      purchase_uom: selectedItem.purchase_uom || selectedItem.uom || 'PCS',
                      storage_uom: selectedItem.storage_uom || selectedItem.uom || 'PCS',
                      uom_conversion_factor: selectedItem.uom_conversion_factor || 1.0
                    }

                    // Try to fetch latest UOM from the item's category (sub-class level 5)
                    const subClassCode = selectedItem.sub_class_code
                    if (subClassCode) {
                      try {
                        const response = await categoryHierarchy.getSubClasses()
                        if (response?.data) {
                          const subClass = response.data.find(sc => sc.code === subClassCode)
                          if (subClass) {
                            categoryUom = {
                              purchase_uom: subClass.purchase_uom || 'PCS',
                              storage_uom: subClass.storage_uom || 'PCS',
                              uom_conversion_factor: subClass.uom_conversion_factor || 1.0
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error fetching category UOM:', error)
                      }
                    }

                    // Add item to line items with category UOM
                    const newLineItem = {
                      id: Date.now(),
                      item_code: selectedItem.item_code,
                      item_name: selectedItem.item_name,
                      item_description: selectedItem.description || selectedItem.item_description || '',
                      category_code: selectedItem.category_code,
                      quantity: 1,
                      unit: categoryUom.purchase_uom,
                      storage_uom: categoryUom.storage_uom,
                      uom_conversion_factor: categoryUom.uom_conversion_factor,
                      unit_rate: selectedItem.purchase_price || selectedItem.cost_price || 0,
                      discount_percent: 0,
                      hsn_code: selectedItem.hsn_code || '',
                      gst_percent: selectedItem.gst_rate || selectedItem.gst_percent || 18,
                      notes: ''
                    }
                    setLineItems([...lineItems, newLineItem])
                    toast.success(`Added: ${selectedItem.item_name}`)
                    // Reset dropdown
                    e.target.value = ''
                  }
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-xs"
            >
              <option value="">Search and select an item...</option>
              {itemsList.map(item => (
                <option key={item.item_code} value={item.item_code}>
                  {item.item_name} ({item.item_code})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition whitespace-nowrap"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>

          {lineItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package size={48} className="mx-auto mb-2 text-gray-400" />
              <p>No items added yet. Click "Add Item" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 relative">
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {/* Category Search + Hierarchy Selection */}
                    <div className="md:col-span-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowLineItemSearch(item.id)}
                          className="w-full text-left flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-500 transition"
                        >
                          <span className="text-sm">
                            {lineItemCategories[item.id]?.name || 'Select Category'}
                          </span>
                          <Search size={16} className="text-gray-400" />
                        </button>
                      </div>

                      {/* Search Modal */}
                      {showLineItemSearch === item.id && (
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
                                    setShowLineItemSearch(null)
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
                                          onClick={() => handleSelectLineItemHierarchy(item.id, result)}
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

                      {/* Level 2 */}
                      {(lineItemSubCategories[item.id] || []).length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Level 2</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Select</option>
                            {(lineItemSubCategories[item.id] || []).map(subCat => (
                              <option key={subCat.code} value={subCat.code}>{subCat.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Level 3 */}
                      {(lineItemDivisions[item.id] || []).length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Level 3</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Select</option>
                            {(lineItemDivisions[item.id] || []).map(div => (
                              <option key={div.code} value={div.code}>{div.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Item Search & Details */}
                    <div className="md:col-span-3 space-y-3">
                      {/* Item Search Button */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Search Item <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowItemSearch(item.id)}
                          className="w-full text-left flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-500 transition bg-white"
                        >
                          <span className="text-sm truncate">
                            {item.item_code ? `${item.item_code} - ${item.item_name}` : 'Click to search items...'}
                          </span>
                          <Search size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                        </button>
                      </div>

                      {/* Item Search Modal */}
                      {showItemSearch === item.id && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                          <div className="w-full max-w-3xl">
                            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                              {/* Header */}
                              <div className="bg-gradient-to-r from-green-600 to-green-800 text-white px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Package className="w-6 h-6" />
                                  <h3 className="text-base font-semibold">Search Items from Item Master</h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowItemSearch(null)
                                    setItemSearchResults([])
                                    setItemSearchTerm('')
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
                                  placeholder="Search by item code, name, or SKU..."
                                  value={itemSearchTerm}
                                  onChange={(e) => handleItemSearch(e.target.value)}
                                  autoFocus
                                  className="w-full px-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                              </div>

                              {/* Results */}
                              <div className="max-h-96 overflow-y-auto">
                                {itemSearchTerm.length < 2 ? (
                                  <div className="p-6 text-center text-gray-500">
                                    <Search className="w-8 h-8 inline-block mb-2 text-gray-400" />
                                    <div className="text-base">Type at least 2 characters to search</div>
                                  </div>
                                ) : itemSearchResults.length === 0 ? (
                                  <div className="p-6 text-center text-gray-500">
                                    <AlertCircle className="w-8 h-8 inline-block mb-2 text-gray-400" />
                                    <div className="text-base">No items found</div>
                                    <p className="text-sm mt-1">Try a different search term</p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="p-3 bg-green-50 border-b-2 border-green-200 text-sm font-semibold text-green-800">
                                      Found {itemSearchResults.length} item{itemSearchResults.length > 1 ? 's' : ''} - Click to select
                                    </div>
                                    {itemSearchResults.map((result) => (
                                      <div
                                        key={result.id || result.item_code || result.code}
                                        onClick={() => handleSelectItemFromSearch(item.id, result)}
                                        className="p-4 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-gray-900">
                                                {result.item_name || result.name}
                                              </span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1 flex items-center gap-3">
                                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                {result.item_code || result.code || result.sku}
                                              </span>
                                              {result.hsn_code && (
                                                <span className="text-xs">HSN: {result.hsn_code}</span>
                                              )}
                                              {(result.uom || result.unit) && (
                                                <span className="text-xs">UOM: {result.uom || result.unit}</span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="ml-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                              Select
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Item Code (read-only after selection) */}
                      {item.item_code && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Item Code
                          </label>
                          <input
                            type="text"
                            value={item.item_code}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                          />
                        </div>
                      )}

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Name
                        </label>
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => updateLineItem(item.id, 'item_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quantity and other fields */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                        min="0.01"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Unit - Locked to item's purchase UOM */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                        <Lock className="w-3 h-3 text-gray-400" />
                        Unit
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={item.unit || 'PCS'}
                          readOnly
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                          title="UOM is set by item category and cannot be changed"
                        />
                        <Lock className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">From item</p>
                    </div>

                    {/* Unit Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.unit_rate}
                        onChange={(e) => updateLineItem(item.id, 'unit_rate', e.target.value)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Discount % */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Disc. %
                      </label>
                      <input
                        type="number"
                        value={item.discount_percent}
                        onChange={(e) => updateLineItem(item.id, 'discount_percent', e.target.value)}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Additional Fields Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HSN Code
                      </label>
                      <input
                        type="text"
                        value={item.hsn_code}
                        onChange={(e) => updateLineItem(item.id, 'hsn_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST %
                      </label>
                      <input
                        type="number"
                        value={item.gst_percent}
                        onChange={(e) => updateLineItem(item.id, 'gst_percent', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Delivery
                      </label>
                      <input
                        type="date"
                        value={item.expected_delivery_date}
                        onChange={(e) => updateLineItem(item.id, 'expected_delivery_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={item.inspection_required}
                          onChange={(e) => updateLineItem(item.id, 'inspection_required', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Inspection Required
                      </label>
                    </div>
                  </div>

                  {/* Calculated Amounts Display */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <span className="ml-1 font-medium">₹{calculateLineItem(item).line_amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Discount:</span>
                        <span className="ml-1 font-medium">₹{calculateLineItem(item).discount_amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Taxable:</span>
                        <span className="ml-1 font-medium">₹{calculateLineItem(item).taxable_amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">GST:</span>
                        <span className="ml-1 font-medium">₹{calculateLineItem(item).gst_amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-1 font-semibold text-blue-600">₹{calculateLineItem(item).net_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {lineItems.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={20} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900">Order Summary</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Subtotal</div>
                  <div className="text-lg font-semibold text-gray-900">₹{summary.subtotal}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Discount</div>
                  <div className="text-lg font-semibold text-red-600">-₹{summary.total_discount}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Taxable</div>
                  <div className="text-lg font-semibold text-gray-900">₹{summary.total_taxable}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total GST</div>
                  <div className="text-lg font-semibold text-gray-900">₹{summary.total_gst}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Grand Total</div>
                  <div className="text-2xl font-bold text-blue-600">₹{summary.grand_total.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delivery Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Delivery Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.delivery_location}
                onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                placeholder="Warehouse A"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Method
              </label>
              <select
                value={formData.delivery_method}
                onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="COURIER">Courier</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="PICKUP">Pickup</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead Time (Days)
              </label>
              <input
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="NET 30">NET 30</option>
                <option value="NET 45">NET 45</option>
                <option value="NET 60">NET 60</option>
                <option value="COD">COD</option>
                <option value="ADVANCE">Advance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Center
                </label>
                <input
                  type="text"
                  value={formData.cost_center}
                  onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Code
                </label>
                <input
                  type="text"
                  value={formData.project_code}
                  onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.sample_attached}
                  onChange={(e) => setFormData({ ...formData, sample_attached: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Sample Attached
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

      </form>
        </div>
      </div>
    </div>
  )
}

export default PurchaseOrderForm
