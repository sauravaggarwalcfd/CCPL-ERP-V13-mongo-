import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, X, Package, AlertTriangle, ChevronLeft, ChevronRight, Settings, FolderPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { brands } from '../../services/api'

const BRAND_CATEGORIES = ['Textile', 'Trim', 'Button', 'Accessory']

export default function BrandMaster() {
  const [brandList, setBrandList] = useState([])
  const [brandGroups, setBrandGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20

  // Form data
  const [formData, setFormData] = useState({
    brand_code: '',
    brand_name: '',
    brand_category: 'Textile',
    brand_group: '',
    country: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    is_active: true,
  })

  // Group form data
  const [groupFormData, setGroupFormData] = useState({
    group_code: '',
    group_name: '',
    description: '',
  })
  const [editingGroup, setEditingGroup] = useState(null)

  // Form validation errors
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchBrands()
    fetchBrandGroups()
  }, [currentPage, searchTerm, selectedGroup])

  const fetchBrands = async () => {
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

      if (selectedGroup && selectedGroup !== 'all') {
        params.brand_group = selectedGroup
      }

      const response = await brands.list(params)
      setBrandList(response.data.items || response.data || [])
      setTotalItems(response.data.total || response.data.length || 0)
    } catch (error) {
      toast.error('Failed to fetch brands')
      console.error(error)
      setBrandList([])
    } finally {
      setLoading(false)
    }
  }

  const fetchBrandGroups = async () => {
    try {
      const response = await brands.getGroups()
      setBrandGroups(response.data || [])
    } catch (error) {
      console.error('Failed to fetch brand groups:', error)
      // Mock data for now
      setBrandGroups([
        { group_code: 'TEXTILE_BRANDS', group_name: 'Textile Brands', description: 'Brands for textile products' },
        { group_code: 'ACCESSORY_BRANDS', group_name: 'Accessory Brands', description: 'Brands for accessories' },
        { group_code: 'PREMIUM_BRANDS', group_name: 'Premium Brands', description: 'High-end premium brands' },
      ])
    }
  }

  const resetForm = () => {
    setFormData({
      brand_code: '',
      brand_name: '',
      brand_category: 'Textile',
      brand_group: brandGroups.length > 0 ? brandGroups[0].group_code : '',
      country: '',
      contact_person: '',
      email: '',
      phone: '',
      website: '',
      is_active: true,
    })
    setErrors({})
    setSelectedBrand(null)
  }

  const handleCreate = () => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }

  const handleEdit = (brand) => {
    setSelectedBrand(brand)
    setModalMode('edit')
    setFormData({
      brand_code: brand.brand_code || '',
      brand_name: brand.brand_name || '',
      brand_category: brand.brand_category || 'Textile',
      brand_group: brand.brand_group || '',
      country: brand.country || '',
      contact_person: brand.contact_person || '',
      email: brand.email || '',
      phone: brand.phone || '',
      website: brand.website || '',
      is_active: brand.is_active !== undefined ? brand.is_active : true,
    })
    setErrors({})
    setShowModal(true)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.brand_code.trim()) {
      newErrors.brand_code = 'Brand code is required'
    } else if (!/^[A-Z]{2}-\d{3}$/.test(formData.brand_code.toUpperCase())) {
      newErrors.brand_code = 'Brand code must be in format XX-000 (e.g., BR-001)'
    }

    if (!formData.brand_name.trim()) {
      newErrors.brand_name = 'Brand name is required'
    }

    if (!formData.brand_group) {
      newErrors.brand_group = 'Brand group is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://'
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
        brand_code: formData.brand_code.toUpperCase(),
      }

      if (modalMode === 'create') {
        await brands.create(submitData)
        toast.success('Brand created successfully')
      } else {
        await brands.update(selectedBrand.brand_code, submitData)
        toast.success('Brand updated successfully')
      }

      setShowModal(false)
      resetForm()
      fetchBrands()
      setCurrentPage(1)
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Operation failed'
      toast.error(errorMessage)
      console.error(error)
    }
  }

  const handleDeleteClick = (brand) => {
    setDeleteTarget(brand)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await brands.delete(deleteTarget.brand_code)
      toast.success('Brand deleted successfully')
      setShowDeleteModal(false)
      setDeleteTarget(null)
      fetchBrands()
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
    if (!window.confirm(`Delete group "${group.group_name}"? Brands in this group will become ungrouped.`)) return

    try {
      await brands.deleteGroup(group.group_code)
      toast.success('Group deleted successfully')
      fetchBrandGroups()
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
        await brands.updateGroup(editingGroup.group_code, groupFormData)
        toast.success('Group updated successfully')
      } else {
        await brands.createGroup({
          ...groupFormData,
          group_code: groupFormData.group_code.toUpperCase().replace(/\s+/g, '_'),
          is_active: true
        })
        toast.success('Group created successfully')
      }
      setEditingGroup(null)
      setGroupFormData({ group_code: '', group_name: '', description: '' })
      fetchBrandGroups()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save group')
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Group brands by brand_group
  const groupedBrands = brandList.reduce((acc, brand) => {
    const group = brand.brand_group || 'UNGROUPED'
    if (!acc[group]) acc[group] = []
    acc[group].push(brand)
    return acc
  }, {})

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Package size={32} />
              <div>
                <h1 className="text-2xl font-bold">Brand Master</h1>
                <p className="text-sm text-pink-100">
                  {totalItems} brands in {brandGroups.length} groups
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
              className="bg-white text-pink-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-pink-50 transition"
            >
              <Plus size={20} /> New Brand
            </button>
          </div>
        </div>
      </div>

      {/* Search and Group Filter Bar */}
      <div className="p-4 border-b bg-white">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search brands by code or name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="all">All Groups</option>
            {brandGroups.map(group => (
              <option key={group.group_code} value={group.group_code}>
                {group.group_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
            <p>Loading brands...</p>
          </div>
        ) : brandList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No brands found</p>
            <p className="text-sm mt-1">Create your first brand to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-pink-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-pink-900">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-pink-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-pink-900">Group</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-pink-900">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-pink-900">Country</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-pink-900">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-pink-900">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-pink-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {brandList.map((brand) => (
                  <tr key={brand.brand_code} className="hover:bg-pink-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {brand.brand_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{brand.brand_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-800">
                        {brandGroups.find(g => g.group_code === brand.brand_group)?.group_name || brand.brand_group || 'Ungrouped'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {brand.brand_category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{brand.country || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{brand.contact_person || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        brand.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(brand)}
                          className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(brand)}
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} brands
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
                          ? 'bg-pink-600 text-white'
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

      {/* Create/Edit Brand Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Create New Brand' : 'Edit Brand'}
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
                {/* Brand Code & Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.brand_code}
                      onChange={(e) => setFormData({ ...formData, brand_code: e.target.value.toUpperCase() })}
                      disabled={modalMode === 'edit'}
                      maxLength={10}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 uppercase ${
                        modalMode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''
                      } ${errors.brand_code ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="e.g., NIKE"
                      required
                    />
                    {errors.brand_code && (
                      <p className="text-xs text-red-500 mt-1">{errors.brand_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.brand_name}
                      onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.brand_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Nike Inc."
                      required
                    />
                    {errors.brand_name && (
                      <p className="text-xs text-red-500 mt-1">{errors.brand_name}</p>
                    )}
                  </div>
                </div>

                {/* Brand Group & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.brand_group}
                      onChange={(e) => setFormData({ ...formData, brand_group: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.brand_group ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">-- Select Group --</option>
                      {brandGroups.map(group => (
                        <option key={group.group_code} value={group.group_code}>{group.group_name}</option>
                      ))}
                    </select>
                    {errors.brand_group && (
                      <p className="text-xs text-red-500 mt-1">{errors.brand_group}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Category
                    </label>
                    <select
                      value={formData.brand_category}
                      onChange={(e) => setFormData({ ...formData, brand_category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      {BRAND_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="e.g., USA"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., contact@brand.com"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., +1-234-567-8900"
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.website ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., https://www.brand.com"
                    />
                    {errors.website && (
                      <p className="text-xs text-red-500 mt-1">{errors.website}</p>
                    )}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Active Brand
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {modalMode === 'create' ? 'Create Brand' : 'Update Brand'}
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
            <div className="px-6 py-4 border-b flex items-center justify-between bg-pink-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">Manage Brand Groups</h2>
              <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-pink-100 rounded-full transition">
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
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> New Group
                  </button>
                </div>

                <div className="space-y-2">
                  {brandGroups.map(group => (
                    <div
                      key={group.group_code}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        editingGroup?.group_code === group.group_code
                          ? 'bg-pink-50 border-pink-200'
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
                  {brandGroups.length === 0 && (
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
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100"
                      placeholder="e.g. PREMIUM_BRANDS"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input
                      type="text"
                      value={groupFormData.group_name}
                      onChange={e => setGroupFormData({...groupFormData, group_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g. Premium Brands"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={groupFormData.description}
                      onChange={e => setGroupFormData({...groupFormData, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      rows="3"
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition"
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
              Are you sure you want to delete the brand <span className="font-semibold">"{deleteTarget.brand_name}"</span>?
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
    </div>
  )
}
