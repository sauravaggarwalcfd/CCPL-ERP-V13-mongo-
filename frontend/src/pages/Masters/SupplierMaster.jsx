import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, X, Truck, AlertTriangle, ChevronLeft, ChevronRight, Filter, Settings, ChevronDown, ChevronUp, LayoutGrid, List, UserPlus, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { suppliers } from '../../services/api'

const PAYMENT_TERMS = ['Net 30', 'Net 60', 'Advance', 'COD']

export default function SupplierMaster() {
  const [supplierList, setSupplierList] = useState([])
  const [supplierGroups, setSupplierGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // View mode: 'list' (table) or 'grouped'
  const [viewMode, setViewMode] = useState('grouped')
  const [collapsedGroups, setCollapsedGroups] = useState({})

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20

  // Form data
  const [formData, setFormData] = useState({
    supplier_code: '',
    supplier_name: '',
    supplier_groups: [], // Multiple groups support
    supplier_group_code: '', // Legacy - kept for backward compatibility
    country: '',
    city: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    gst_number: '',
    bank_account: '',
    payment_terms: 'Net 30',
    is_active: true,
  })

  // Add to group modal state
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false)
  const [addToGroupTarget, setAddToGroupTarget] = useState(null) // Group code to add items to
  const [selectedSuppliersForGroup, setSelectedSuppliersForGroup] = useState([])

  // Group form data
  const [groupFormData, setGroupFormData] = useState({
    group_code: '',
    group_name: '',
    description: '',
  })
  const [editingGroup, setEditingGroup] = useState(null)

  // Form validation errors
  const [errors, setErrors] = useState({})

  // Get unique cities for filter dropdown
  const [cities, setCities] = useState([])

  useEffect(() => {
    fetchSuppliers()
    fetchSupplierGroups()
  }, [currentPage, searchTerm, filterCity, selectedGroup])

  useEffect(() => {
    // Extract unique cities from supplier list
    const uniqueCities = [...new Set(supplierList.map(s => s.city).filter(Boolean))]
    setCities(uniqueCities.sort())
  }, [supplierList])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * itemsPerPage
      const params = {
        skip,
        limit: itemsPerPage,
      }

      if (searchTerm) {
        params.search = searchTerm
      }

      if (filterCity) {
        params.city = filterCity
      }

      if (selectedGroup) {
        params.supplier_group_code = selectedGroup
      }

      const response = await suppliers.list(params)
      setSupplierList(response.data.items || response.data || [])
      setTotalItems(response.data.total || response.data.length || 0)
    } catch (error) {
      toast.error('Failed to fetch suppliers')
      console.error(error)
      setSupplierList([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSupplierGroups = async () => {
    try {
      const response = await suppliers.groups.list()
      setSupplierGroups(response.data || [])
    } catch (error) {
      console.error('Failed to fetch supplier groups:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      supplier_code: '',
      supplier_name: '',
      supplier_groups: [], // Multiple groups
      supplier_group_code: '', // Legacy
      country: '',
      city: '',
      contact_person: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      gst_number: '',
      bank_account: '',
      payment_terms: 'Net 30',
      is_active: true,
    })
    setErrors({})
    setSelectedSupplier(null)
  }

  const handleCreate = () => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier)
    setModalMode('edit')
    setFormData({
      supplier_code: supplier.supplier_code || '',
      supplier_name: supplier.supplier_name || '',
      supplier_groups: supplier.supplier_groups || [], // Multiple groups
      supplier_group_code: supplier.supplier_group_code || '', // Legacy
      country: supplier.country || '',
      city: supplier.city || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      address: supplier.address || '',
      gst_number: supplier.gst_number || '',
      bank_account: supplier.bank_account || '',
      payment_terms: supplier.payment_terms || 'Net 30',
      is_active: supplier.is_active !== undefined ? supplier.is_active : true,
    })
    setErrors({})
    setShowModal(true)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.supplier_code.trim()) {
      newErrors.supplier_code = 'Supplier code is required'
    } else if (!/^[A-Z]{3}-[0-9]{3}$/.test(formData.supplier_code.toUpperCase())) {
      newErrors.supplier_code = 'Supplier code must be 3 letters, hyphen, 3 digits (e.g., SUP-001)'
    }

    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'Supplier name is required'
    }

    if (formData.supplier_groups.length === 0 && !formData.supplier_group_code) {
      newErrors.supplier_groups = 'At least one supplier group is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://'
    }

    if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
      newErrors.gst_number = 'Invalid GST number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix validation errors')
      return
    }

    try {
      const submitData = {
        ...formData,
        supplier_code: formData.supplier_code.toUpperCase(),
        gst_number: formData.gst_number.toUpperCase(),
        // Set legacy field for backward compatibility (first group)
        supplier_group_code: formData.supplier_groups.length > 0 ? formData.supplier_groups[0] : formData.supplier_group_code,
      }

      if (modalMode === 'create') {
        await suppliers.create(submitData)
        toast.success('Supplier created successfully')
      } else {
        await suppliers.update(selectedSupplier.supplier_code, submitData)
        toast.success('Supplier updated successfully')
      }

      setShowModal(false)
      resetForm()
      fetchSuppliers()
      setCurrentPage(1)
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Operation failed'
      toast.error(errorMessage)
      console.error(error)
    }
  }

  const handleDeleteClick = (supplier) => {
    setDeleteTarget(supplier)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await suppliers.delete(deleteTarget.supplier_code)
      toast.success('Supplier deleted successfully')
      setShowDeleteModal(false)
      setDeleteTarget(null)
      fetchSuppliers()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed')
      console.error(error)
    }
  }

  // Group Management Functions
  const handleCreateGroup = () => {
    setEditingGroup(null)
    setGroupFormData({ group_code: '', group_name: '', description: '' })
    setShowGroupModal(true)
  }

  const handleEditGroup = (group) => {
    setEditingGroup(group)
    setGroupFormData({
      group_code: group.group_code,
      group_name: group.group_name,
      description: group.description || '',
    })
  }

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete group "${group.group_name}"? Suppliers in this group will become ungrouped.`)) return

    try {
      await suppliers.groups.delete(group.group_code)
      toast.success('Group deleted successfully')
      fetchSupplierGroups()
    } catch (error) {
      toast.error('Failed to delete group')
    }
  }

  const handleGroupSubmit = async (e) => {
    e.preventDefault()

    if (!groupFormData.group_code || !groupFormData.group_name) {
      toast.error('Please fill required fields')
      return
    }

    try {
      if (editingGroup) {
        await suppliers.groups.update(editingGroup.group_code, groupFormData)
        toast.success('Group updated successfully')
      } else {
        await suppliers.groups.create({
          ...groupFormData,
          group_code: groupFormData.group_code.toUpperCase().replace(/\s+/g, '_'),
          is_active: true
        })
        toast.success('Group created successfully')
      }
      setEditingGroup(null)
      setGroupFormData({ group_code: '', group_name: '', description: '' })
      fetchSupplierGroups()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save group')
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterChange = (type, value) => {
    if (type === 'city') {
      setFilterCity(value)
    } else if (type === 'group') {
      setSelectedGroup(value)
    }
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilterCity('')
    setSelectedGroup('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const activeFiltersCount = [filterCity, selectedGroup].filter(Boolean).length

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Group suppliers by supplier_groups (multiple groups - supplier can appear in multiple groups)
  const groupedSuppliers = supplierList.reduce((acc, supplier) => {
    const groups = supplier.supplier_groups && supplier.supplier_groups.length > 0 
      ? supplier.supplier_groups 
      : (supplier.supplier_group_code ? [supplier.supplier_group_code] : ['UNGROUPED'])
    
    groups.forEach(group => {
      if (!acc[group]) acc[group] = []
      acc[group].push(supplier)
    })
    return acc
  }, {})

  // Get group name from code
  const getGroupName = (groupCode) => {
    if (groupCode === 'UNGROUPED') return 'Ungrouped'
    const group = supplierGroups.find(g => g.group_code === groupCode)
    return group ? group.group_name : groupCode
  }

  // Toggle group collapse
  const toggleGroup = (groupCode) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupCode]: !prev[groupCode]
    }))
  }

  // Handle opening Add to Group modal
  const handleOpenAddToGroup = (groupCode, e) => {
    e.stopPropagation() // Prevent group collapse toggle
    setAddToGroupTarget(groupCode)
    setSelectedSuppliersForGroup([])
    setShowAddToGroupModal(true)
  }

  // Handle adding suppliers to group
  const handleAddSuppliersToGroup = async () => {
    if (!addToGroupTarget || selectedSuppliersForGroup.length === 0) {
      toast.error('Please select at least one supplier')
      return
    }

    try {
      // Update each selected supplier to include the new group
      for (const supplierCode of selectedSuppliersForGroup) {
        const supplier = supplierList.find(s => s.supplier_code === supplierCode)
        if (supplier) {
          const currentGroups = supplier.supplier_groups || (supplier.supplier_group_code ? [supplier.supplier_group_code] : [])
          if (!currentGroups.includes(addToGroupTarget)) {
            const updatedGroups = [...currentGroups, addToGroupTarget]
            await suppliers.update(supplierCode, {
              ...supplier,
              supplier_groups: updatedGroups,
              supplier_group_code: updatedGroups[0] // Keep legacy field updated
            })
          }
        }
      }
      
      toast.success(`Added ${selectedSuppliersForGroup.length} supplier(s) to group`)
      setShowAddToGroupModal(false)
      setAddToGroupTarget(null)
      setSelectedSuppliersForGroup([])
      fetchSuppliers()
    } catch (error) {
      toast.error('Failed to add suppliers to group')
      console.error(error)
    }
  }

  // Get suppliers not in target group (for Add to Group modal)
  const getSuppliersNotInGroup = (groupCode) => {
    return supplierList.filter(supplier => {
      const groups = supplier.supplier_groups || (supplier.supplier_group_code ? [supplier.supplier_group_code] : [])
      return !groups.includes(groupCode)
    })
  }

  // Toggle supplier selection for adding to group
  const toggleSupplierForGroup = (supplierCode) => {
    setSelectedSuppliersForGroup(prev => 
      prev.includes(supplierCode) 
        ? prev.filter(c => c !== supplierCode)
        : [...prev, supplierCode]
    )
  }

  // Handle creating new supplier for a specific group
  const handleCreateForGroup = (groupCode) => {
    resetForm()
    setFormData(prev => ({
      ...prev,
      supplier_groups: [groupCode],
      supplier_group_code: groupCode
    }))
    setModalMode('create')
    setShowModal(true)
    setShowAddToGroupModal(false)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Truck size={32} />
              <div>
                <h1 className="text-2xl font-bold">Supplier Master</h1>
                <p className="text-sm text-blue-100">
                  {totalItems} suppliers in {supplierGroups.length} groups
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowGroupModal(true)}
              className="bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-white/30 transition"
            >
              <Settings size={20} /> Manage Groups
            </button>
            <button
              onClick={handleCreate}
              className="bg-white text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-blue-50 transition"
            >
              <Plus size={20} /> New Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-4 border-b bg-white space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search suppliers by code or name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 font-medium transition ${
              activeFiltersCount > 0
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'hover:bg-gray-50 border-gray-300'
            }`}
          >
            <Filter size={20} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-2 flex items-center gap-1 transition ${
                viewMode === 'grouped'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Grouped View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 flex items-center gap-1 transition ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                value={filterCity}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Group</label>
              <select
                value={selectedGroup}
                onChange={(e) => handleFilterChange('group', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Groups</option>
                {supplierGroups.map(group => (
                  <option key={group.group_code} value={group.group_code}>{group.group_name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading suppliers...</p>
          </div>
        ) : supplierList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No suppliers found</p>
            <p className="text-sm mt-1">
              {searchTerm || filterCity || selectedGroup
                ? 'Try adjusting your search or filters'
                : 'Create your first supplier to get started'}
            </p>
          </div>
        ) : viewMode === 'grouped' ? (
          /* Grouped View */
          <div className="p-4 space-y-4">
            {Object.keys(groupedSuppliers).map(groupCode => {
              const items = groupedSuppliers[groupCode]
              const isCollapsed = collapsedGroups[groupCode]
              const groupName = getGroupName(groupCode)

              return (
                <div key={groupCode} className="bg-white rounded-lg border overflow-hidden shadow-sm">
                  {/* Group Header */}
                  <div
                    className="bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-3 border-b cursor-pointer hover:from-blue-100 hover:to-sky-100 transition-colors"
                    onClick={() => toggleGroup(groupCode)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight size={20} className="text-blue-600" />
                        ) : (
                          <ChevronDown size={20} className="text-blue-600" />
                        )}
                        <h3 className="font-semibold text-gray-900">{groupName}</h3>
                        <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          {items.length}
                        </span>
                      </div>
                      {/* Add to Group Button */}
                      <button
                        onClick={(e) => handleOpenAddToGroup(groupCode, e)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition"
                        title={`Add supplier to ${groupName}`}
                      >
                        <UserPlus size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Group Items */}
                  {!isCollapsed && (
                    <div className="p-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {items.map(supplier => (
                        <div
                          key={`${groupCode}-${supplier.supplier_code}`}
                          className="p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                  {supplier.supplier_code}
                                </span>
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  supplier.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {supplier.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-2">{supplier.supplier_name}</h4>
                              <div className="space-y-1 text-sm text-gray-600">
                                {supplier.city && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">{supplier.city}{supplier.country ? `, ${supplier.country}` : ''}</span>
                                  </div>
                                )}
                                {supplier.contact_person && (
                                  <div className="text-gray-500">Contact: {supplier.contact_person}</div>
                                )}
                                {supplier.phone && (
                                  <div className="text-gray-500">Phone: {supplier.phone}</div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="inline-flex px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                                    {supplier.payment_terms || 'Net 30'}
                                  </span>
                                  {supplier.gst_number && (
                                    <span className="text-xs text-gray-400">GST: {supplier.gst_number}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(supplier) }}
                                className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(supplier) }}
                                className="p-1.5 hover:bg-red-100 rounded text-red-600 transition"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* List/Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Group</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">City</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Payment</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-blue-900">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-blue-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {supplierList.map((supplier) => (
                  <tr key={supplier.supplier_code} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {supplier.supplier_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{supplier.supplier_name}</div>
                        {supplier.gst_number && (
                          <div className="text-xs text-gray-500">GST: {supplier.gst_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {supplierGroups.find(g => g.group_code === supplier.supplier_group_code)?.group_name || supplier.supplier_group_code || 'Ungrouped'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {supplier.city && <div>{supplier.city}</div>}
                        {supplier.country && <div className="text-xs text-gray-500">{supplier.country}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.contact_person || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {supplier.payment_terms}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        supplier.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(supplier)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-600 transition"
                          title="Delete"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} suppliers
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2">...</span>
                }
                return null
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Create New Supplier' : 'Edit Supplier'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Supplier Code & Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.supplier_code}
                      onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value.toUpperCase() })}
                      disabled={modalMode === 'edit'}
                      maxLength={7}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                        modalMode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''
                      } ${errors.supplier_code ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="e.g., SUP-001"
                      required
                    />
                    {errors.supplier_code && (
                      <p className="text-xs text-red-500 mt-1">{errors.supplier_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.supplier_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., ABC Textiles Ltd."
                      required
                    />
                    {errors.supplier_name && (
                      <p className="text-xs text-red-500 mt-1">{errors.supplier_name}</p>
                    )}
                  </div>
                </div>

                {/* Supplier Groups (Multiple Selection) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier Groups <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Select one or more)</span>
                  </label>
                  <div className={`border rounded-lg p-3 ${errors.supplier_groups ? 'border-red-500' : 'border-gray-300'}`}>
                    <div className="flex flex-wrap gap-2">
                      {supplierGroups.map(group => {
                        const isSelected = formData.supplier_groups.includes(group.group_code)
                        return (
                          <button
                            key={group.group_code}
                            type="button"
                            onClick={() => {
                              const newGroups = isSelected
                                ? formData.supplier_groups.filter(g => g !== group.group_code)
                                : [...formData.supplier_groups, group.group_code]
                              setFormData({ ...formData, supplier_groups: newGroups })
                              if (newGroups.length > 0) {
                                setErrors(prev => ({ ...prev, supplier_groups: null }))
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1 ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected && <Check size={14} />}
                            {group.group_name}
                          </button>
                        )
                      })}
                    </div>
                    {formData.supplier_groups.length > 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        {formData.supplier_groups.length} group(s) selected
                      </p>
                    )}
                  </div>
                  {errors.supplier_groups && (
                    <p className="text-xs text-red-500 mt-1">{errors.supplier_groups}</p>
                  )}
                </div>

                {/* Payment Terms & Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PAYMENT_TERMS.map(term => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., India"
                    />
                  </div>
                </div>

                {/* City & Contact Person */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Mumbai"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full address"
                  />
                </div>

                {/* Contact Person & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., contact@supplier.com"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Phone & Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., +91-1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.website ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., https://www.supplier.com"
                    />
                    {errors.website && (
                      <p className="text-xs text-red-500 mt-1">{errors.website}</p>
                    )}
                  </div>
                </div>

                {/* GST Number & Bank Account */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                      maxLength={15}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                        errors.gst_number ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 22AAAAA0000A1Z5"
                    />
                    {errors.gst_number && (
                      <p className="text-xs text-red-500 mt-1">{errors.gst_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1234567890"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Active Supplier
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {modalMode === 'create' ? 'Create Supplier' : 'Update Supplier'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Manager Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-blue-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">Manage Supplier Groups</h2>
              <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-blue-100 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* List Section */}
              <div className="flex-1 overflow-y-auto p-4 border-r">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Existing Groups</h3>
                  <button
                    onClick={handleCreateGroup}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> New Group
                  </button>
                </div>

                <div className="space-y-2">
                  {supplierGroups.map(group => (
                    <div
                      key={group.group_code}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        editingGroup?.group_code === group.group_code
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div onClick={() => handleEditGroup(group)} className="flex-1">
                          <div className="font-medium text-gray-900">{group.group_name}</div>
                          <div className="text-xs text-gray-500">{group.group_code}</div>
                          {group.description && (
                            <div className="text-xs text-gray-400 mt-1">{group.description}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(group)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {supplierGroups.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">No groups found</div>
                  )}
                </div>
              </div>

              {/* Form Section */}
              <div className="w-full md:w-80 p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-700 mb-4">
                  {editingGroup ? 'Edit Group' : 'Add New Group'}
                </h3>
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Code</label>
                    <input
                      type="text"
                      value={groupFormData.group_code}
                      onChange={e => setGroupFormData({...groupFormData, group_code: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                      disabled={!!editingGroup}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="e.g. TEXTILE_SUPPLIERS"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input
                      type="text"
                      value={groupFormData.group_name}
                      onChange={e => setGroupFormData({...groupFormData, group_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Textile Suppliers"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={groupFormData.description}
                      onChange={e => setGroupFormData({...groupFormData, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      {editingGroup ? 'Update' : 'Create'}
                    </button>
                    {editingGroup && (
                      <button
                        type="button"
                        onClick={handleCreateGroup}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the supplier <span className="font-semibold">"{deleteTarget.supplier_name}"</span>?
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteTarget(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Group Modal */}
      {showAddToGroupModal && addToGroupTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Suppliers to Group</h3>
                <p className="text-sm text-gray-500">
                  Adding to: <span className="font-medium text-blue-600">{getGroupName(addToGroupTarget)}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddToGroupModal(false)
                  setAddToGroupTarget(null)
                  setSelectedSuppliersForGroup([])
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {/* Create New Option */}
              <button
                onClick={() => handleCreateForGroup(addToGroupTarget)}
                className="w-full mb-4 p-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Create New Supplier for this Group
              </button>

              {/* Existing Suppliers List */}
              <p className="text-sm font-medium text-gray-700 mb-2">Or add existing suppliers:</p>
              <div className="space-y-2 max-h-60 overflow-auto">
                {getSuppliersNotInGroup(addToGroupTarget).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    All suppliers are already in this group
                  </p>
                ) : (
                  getSuppliersNotInGroup(addToGroupTarget).map(supplier => (
                    <label
                      key={supplier.supplier_code}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        selectedSuppliersForGroup.includes(supplier.supplier_code)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSuppliersForGroup.includes(supplier.supplier_code)}
                        onChange={() => toggleSupplierForGroup(supplier.supplier_code)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{supplier.supplier_name}</p>
                        <p className="text-xs text-gray-500">{supplier.supplier_code} • {supplier.city || 'No city'}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={handleAddSuppliersToGroup}
                disabled={selectedSuppliersForGroup.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Add {selectedSuppliersForGroup.length > 0 ? `(${selectedSuppliersForGroup.length})` : ''} to Group
              </button>
              <button
                onClick={() => {
                  setShowAddToGroupModal(false)
                  setAddToGroupTarget(null)
                  setSelectedSuppliersForGroup([])
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
