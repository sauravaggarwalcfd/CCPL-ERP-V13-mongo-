import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Search, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function PurchaseRequestForm({ pr, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [brands, setBrands] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  
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

  const addLineItem = (item) => {
    // Check if already added
    if (lineItems.find(li => li.item_code === item.item_code)) {
      toast.error('Item already added')
      return
    }

    const newItem = {
      line_number: lineItems.length + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      item_description: item.description || '',
      item_category: item.category_code || '',
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

    setLineItems([...lineItems, newItem])
    setSearchTerm('')
    setSearchResults([])
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
    const updated = lineItems.filter((_, i) => i !== index)
    // Renumber line items
    updated.forEach((item, i) => {
      item.line_number = i + 1
    })
    setLineItems(updated)
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
                      <div>
                        <div className="font-medium">{item.item_code}</div>
                        <div className="text-sm text-gray-500">{item.item_name}</div>
                      </div>
                      <Plus className="w-4 h-4 ml-auto text-blue-600" />
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
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
                          <div className="text-sm font-medium">{item.item_name}</div>
                          <div className="text-xs text-gray-500">{item.item_code}</div>
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
                              const supplier = suppliers.find(s => s.supplier_code === e.target.value);
                              updateLineItem(index, 'suggested_supplier_code', e.target.value);
                              updateLineItem(index, 'suggested_supplier_name', supplier?.supplier_name || '');
                            }}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Select Supplier</option>
                            {suppliers.map(s => (
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
                              const brand = brands.find(b => b.brand_code === e.target.value);
                              updateLineItem(index, 'suggested_brand_code', e.target.value);
                              updateLineItem(index, 'suggested_brand_name', brand?.brand_name || '');
                            }}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Select Brand</option>
                            {brands.map(b => (
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
                      <td colSpan="7" className="px-3 py-2 text-sm font-medium text-right">
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
