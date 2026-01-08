import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Search, Package, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { specificationApi } from '../../services/specificationApi'

export default function PurchaseRequestForm({ pr, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [brands, setBrands] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

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
  }, [pr])

  // Refresh filters when suppliers or brands are loaded (for edit mode)
  useEffect(() => {
    const refreshFilters = async () => {
      if (lineItems.length > 0 && suppliers.length > 0 && brands.length > 0) {
        const filtersMap = {}
        for (const item of lineItems) {
          if (item.item_category && !lineItemFilters[item.item_code]) {
            try {
              const filters = await fetchCategoryFilters(item.item_category, item.item_code)
              filtersMap[item.item_code] = filters
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
      // Filter loading is handled by the useEffect that watches lineItems/suppliers/brands
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

  const handleSearch = (value) => {
    setSearchTerm(value)
    if (value.length >= 2) {
      setSearching(true)
      const filtered = items.filter(item =>
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
  const fetchCategoryFilters = async (categoryCode, itemCode) => {
    try {
      // Get the deepest category code (could be sub_class, class, division, sub_category, or category)
      const effectiveCategoryCode = categoryCode

      if (!effectiveCategoryCode) {
        // No category - show all suppliers/brands
        return { filteredSuppliers: suppliers, filteredBrands: brands, hasFilters: false }
      }

      // Fetch category specifications
      const specResponse = await specificationApi.get(effectiveCategoryCode)
      const specs = specResponse.data

      if (!specs) {
        return { filteredSuppliers: suppliers, filteredBrands: brands, hasFilters: false }
      }

      let filteredSuppliers = [...suppliers]
      let filteredBrands = [...brands]
      let hasFilters = false

      // Filter suppliers based on category supplier groups
      const supplierGroups = specs.specifications?.supplier?.groups || specs.specifications?.vendor?.groups || []
      if (supplierGroups.length > 0) {
        hasFilters = true
        filteredSuppliers = suppliers.filter(s => {
          // Check if supplier belongs to any of the configured groups
          const supplierGroupsList = s.supplier_groups || (s.supplier_group ? [s.supplier_group] : [])
          return supplierGroupsList.some(g => supplierGroups.includes(g))
        })
      }

      // Filter brands based on category brand groups
      const brandGroups = specs.specifications?.brand?.groups || []
      if (brandGroups.length > 0) {
        hasFilters = true
        filteredBrands = brands.filter(b => {
          // Check if brand belongs to any of the configured groups
          const brandGroupsList = b.brand_groups || (b.brand_group ? [b.brand_group] : [])
          return brandGroupsList.some(g => brandGroups.includes(g))
        })
      }

      return { filteredSuppliers, filteredBrands, hasFilters }
    } catch (error) {
      console.log('No category specifications found for:', categoryCode)
      // If no specifications found, return all suppliers/brands
      return { filteredSuppliers: suppliers, filteredBrands: brands, hasFilters: false }
    }
  }

  const addLineItem = async (item) => {
    // Check if already added
    if (lineItems.find(li => li.item_code === item.item_code)) {
      toast.error('Item already added')
      return
    }

    // Get the deepest category code from item
    const effectiveCategoryCode = item.sub_class_code || item.class_code || item.division_code ||
                                   item.sub_category_code || item.category_code || ''

    const newItem = {
      line_number: lineItems.length + 1,
      uid: item.uid || null,  // Unique Identifier (immutable)
      item_code: item.item_code,
      sku: item.sku || item.item_code,  // SKU (can change)
      item_name: item.item_name,
      item_description: item.description || '',
      item_category: effectiveCategoryCode,
      quantity: 1,
      unit: item.uom || 'PCS',
      estimated_unit_rate: item.purchase_price || null,
      required_date: formData.required_by_date || null,
      suggested_supplier_code: null,
      suggested_supplier_name: null,
      suggested_brand_code: null,
      suggested_brand_name: null,
      notes: '',
    }

    // Fetch category-specific suppliers/brands filters
    const filters = await fetchCategoryFilters(effectiveCategoryCode, item.item_code)

    setLineItemFilters(prev => ({
      ...prev,
      [item.item_code]: filters
    }))

    setLineItems([...lineItems, newItem])
    setSearchTerm('')
    setSearchResults([])

    if (filters.hasFilters) {
      const supplierCount = filters.filteredSuppliers.length
      const brandCount = filters.filteredBrands.length
      toast.success(`Item added. Filtered to ${supplierCount} supplier(s) and ${brandCount} brand(s) based on category.`, { duration: 3000 })
    }
  }

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems]
    updated[index][field] = value
    
    // Recalculate estimated_amount if rate or quantity changes
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
    // Renumber line items
    updated.forEach((item, i) => {
      item.line_number = i + 1
    })
    setLineItems(updated)

    // Clean up filters for removed item
    if (removedItem?.item_code) {
      setLineItemFilters(prev => {
        const newFilters = { ...prev }
        delete newFilters[removedItem.item_code]
        return newFilters
      })
    }
  }

  // Helper function to get filtered suppliers for a line item
  const getFilteredSuppliers = (itemCode) => {
    const filters = lineItemFilters[itemCode]
    return filters?.filteredSuppliers || suppliers
  }

  // Helper function to get filtered brands for a line item
  const getFilteredBrands = (itemCode) => {
    const filters = lineItemFilters[itemCode]
    return filters?.filteredBrands || brands
  }

  // Check if line item has category-based filters
  const hasLineItemFilters = (itemCode) => {
    return lineItemFilters[itemCode]?.hasFilters || false
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
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

    setLoading(true)
    try {
      const payload = {
        ...formData,
        items: lineItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          item_description: item.item_description,
          item_category: item.item_category,
          quantity: parseFloat(item.quantity) || 0,
          unit: item.unit,
          estimated_unit_rate: item.estimated_unit_rate ? parseFloat(item.estimated_unit_rate) : null,
          required_date: item.required_date || null,
          suggested_supplier_code: item.suggested_supplier_code,
          suggested_supplier_name: item.suggested_supplier_name,
          suggested_brand_code: item.suggested_brand_code,
          suggested_brand_name: item.suggested_brand_name,
          notes: item.notes,
        }))
      }

      if (pr) {
        // Update existing PR
        await api.put(`/purchase/purchase-requests/${pr.pr_code}`, payload)
        toast.success('Purchase Request updated successfully')
      } else {
        // Create new PR
        await api.post('/purchase/purchase-requests', payload)
        toast.success('Purchase Request created successfully')
      }
      
      onSuccess()
    } catch (error) {
      console.error('Error saving PR:', error)
      toast.error(error.response?.data?.detail || 'Failed to save Purchase Request')
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
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
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

          {/* Item Search & Add */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Line Items</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search items by code or name..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.item_code}
                      onClick={() => addLineItem(item)}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    >
                      <Package className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.uid && (
                            <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              {item.uid}
                            </span>
                          )}
                          <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {item.sku || item.item_code}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mt-0.5">{item.item_name}</div>
                      </div>
                      <Plus className="w-4 h-4 text-blue-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            {lineItems.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">UID / SKU</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item Name</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-16">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-40">Supplier</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-36">Brand</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Est. Rate</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Est. Amt</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lineItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-500">{item.line_number}</td>
                        <td className="px-3 py-2">
                          {item.uid && (
                            <div className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mb-1" title="Unique ID (immutable)">
                              {item.uid}
                            </div>
                          )}
                          <div className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded" title="SKU (Stock Keeping Unit)">
                            {item.sku || item.item_code}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium">{item.item_name}</div>
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
                          <div className="relative">
                            <select
                              value={item.suggested_supplier_code || ''}
                              onChange={(e) => {
                                const filteredSuppliers = getFilteredSuppliers(item.item_code);
                                const supplier = filteredSuppliers.find(s => s.supplier_code === e.target.value);
                                updateLineItem(index, 'suggested_supplier_code', e.target.value);
                                updateLineItem(index, 'suggested_supplier_name', supplier?.supplier_name || '');
                              }}
                              className={`w-full px-2 py-1 border rounded text-sm ${hasLineItemFilters(item.item_code) ? 'border-blue-300 bg-blue-50' : ''}`}
                              title={hasLineItemFilters(item.item_code) ? 'Filtered by category' : ''}
                            >
                              <option value="">Select Supplier</option>
                              {getFilteredSuppliers(item.item_code).map(s => (
                                <option key={s.supplier_code} value={s.supplier_code}>
                                  {s.supplier_name}
                                </option>
                              ))}
                            </select>
                            {hasLineItemFilters(item.item_code) && getFilteredSuppliers(item.item_code).length === 0 && (
                              <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                No suppliers in category
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <select
                              value={item.suggested_brand_code || ''}
                              onChange={(e) => {
                                const filteredBrands = getFilteredBrands(item.item_code);
                                const brand = filteredBrands.find(b => b.brand_code === e.target.value);
                                updateLineItem(index, 'suggested_brand_code', e.target.value);
                                updateLineItem(index, 'suggested_brand_name', brand?.brand_name || '');
                              }}
                              className={`w-full px-2 py-1 border rounded text-sm ${hasLineItemFilters(item.item_code) ? 'border-blue-300 bg-blue-50' : ''}`}
                              title={hasLineItemFilters(item.item_code) ? 'Filtered by category' : ''}
                            >
                              <option value="">Select Brand</option>
                              {getFilteredBrands(item.item_code).map(b => (
                                <option key={b.brand_code} value={b.brand_code}>
                                  {b.brand_name}
                                </option>
                              ))}
                            </select>
                            {hasLineItemFilters(item.item_code) && getFilteredBrands(item.item_code).length === 0 && (
                              <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                No brands in category
                              </div>
                            )}
                          </div>
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
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                <p className="text-sm">Search and add items above</p>
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
    </div>
  )
}
