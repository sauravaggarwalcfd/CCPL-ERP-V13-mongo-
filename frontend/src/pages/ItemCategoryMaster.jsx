import { useState, useEffect, useCallback } from 'react'
import { 
  Plus, Search, ChevronRight, ChevronDown, Edit2, Trash2, Eye,
  Package, Users, Layers, Tag, Hash, Shirt, RefreshCw, List,
  FolderTree, Settings, X, Check, AlertCircle, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import { categoryHierarchy, itemTypes } from '../services/api'

// Level Configuration
const LEVELS = [
  { level: 1, name: 'Category', key: 'categories', codeField: 'category_code', nameField: 'category_name', icon: Package, color: '#10b981', example: 'Apparel, Fabrics, Accessories' },
  { level: 2, name: 'Sub-Category', key: 'sub-categories', codeField: 'sub_category_code', nameField: 'sub_category_name', icon: Users, color: '#3b82f6', example: 'Men, Women, Kids' },
  { level: 3, name: 'Division', key: 'divisions', codeField: 'division_code', nameField: 'division_name', icon: Layers, color: '#8b5cf6', example: 'Topwear, Bottomwear' },
  { level: 4, name: 'Class', key: 'classes', codeField: 'class_code', nameField: 'class_name', icon: Tag, color: '#ec4899', example: 'T-Shirts, Jeans, Shirts' },
  { level: 5, name: 'Sub-Class', key: 'sub-classes', codeField: 'sub_class_code', nameField: 'sub_class_name', icon: Hash, color: '#f59e0b', example: 'Round Neck, V-Neck, Polo' },
]

const DEFAULT_FORM = {
  level: 1,
  code: '',
  name: '',
  description: '',
  category_code: '',
  sub_category_code: '',
  division_code: '',
  class_code: '',
  applicable_item_types: ['FGDS'],
  has_color: true,
  has_size: true,
  has_fabric: false,
  has_brand: true,
  default_hsn_code: '',
  default_gst_rate: 5.0,
  icon: 'Package',
  color_code: '#10b981',
  sort_order: 0,
}

export default function ItemCategoryMaster() {
  // Data state
  const [treeData, setTreeData] = useState([])
  const [listData, setListData] = useState([])
  const [itemTypesList, setItemTypesList] = useState([])
  const [loading, setLoading] = useState(true)
  
  // View state
  const [viewMode, setViewMode] = useState('tree') // 'tree', 'list', 'types'
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  
  // Dropdown options
  const [categoryOptions, setCategoryOptions] = useState([])
  const [subCategoryOptions, setSubCategoryOptions] = useState([])
  const [divisionOptions, setDivisionOptions] = useState([])
  const [classOptions, setClassOptions] = useState([])

  // Fetch data
  const fetchTree = useCallback(async () => {
    try {
      setLoading(true)
      const response = await categoryHierarchy.getTree()
      setTreeData(response.data || [])
      
      // Auto-expand first level
      const firstLevelCodes = (response.data || []).map(c => c.code)
      setExpandedNodes(new Set(firstLevelCodes))
    } catch (error) {
      console.error('Fetch tree error:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchList = useCallback(async () => {
    try {
      let allItems = []
      
      // Fetch all levels
      const [cats, subCats, divs, classes, subClasses] = await Promise.all([
        categoryHierarchy.getCategories(),
        categoryHierarchy.getSubCategories(),
        categoryHierarchy.getDivisions(),
        categoryHierarchy.getClasses(),
        categoryHierarchy.getSubClasses(),
      ])
      
      allItems = [
        ...(cats.data || []),
        ...(subCats.data || []),
        ...(divs.data || []),
        ...(classes.data || []),
        ...(subClasses.data || []),
      ]
      
      // Filter by search
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        allItems = allItems.filter(i => 
          i.name?.toLowerCase().includes(term) || 
          i.code?.toLowerCase().includes(term) ||
          i.path_name?.toLowerCase().includes(term)
        )
      }
      
      // Filter by level
      if (filterLevel) {
        allItems = allItems.filter(i => i.level === parseInt(filterLevel))
      }
      
      setListData(allItems)
    } catch (error) {
      console.error('Fetch list error:', error)
    }
  }, [searchTerm, filterLevel])

  const fetchItemTypes = useCallback(async () => {
    try {
      const response = await itemTypes.getDropdown()
      setItemTypesList(response.data || [])
    } catch (error) {
      console.error('Fetch item types error:', error)
    }
  }, [])

  // Fetch dropdown options
  const fetchDropdownOptions = useCallback(async (level, parentCodes = {}) => {
    try {
      if (level >= 1) {
        const cats = await categoryHierarchy.getDropdown(1)
        setCategoryOptions(cats.data || [])
      }
      
      if (level >= 2 && parentCodes.category_code) {
        const subCats = await categoryHierarchy.getDropdown(2, parentCodes.category_code)
        setSubCategoryOptions(subCats.data || [])
      } else {
        setSubCategoryOptions([])
      }
      
      if (level >= 3 && parentCodes.sub_category_code) {
        const divs = await categoryHierarchy.getDropdown(3, null, parentCodes.sub_category_code)
        setDivisionOptions(divs.data || [])
      } else {
        setDivisionOptions([])
      }
      
      if (level >= 4 && parentCodes.division_code) {
        const cls = await categoryHierarchy.getDropdown(4, null, null, parentCodes.division_code)
        setClassOptions(cls.data || [])
      } else {
        setClassOptions([])
      }
    } catch (error) {
      console.error('Fetch dropdown error:', error)
    }
  }, [])

  useEffect(() => {
    fetchTree()
    fetchList()
    fetchItemTypes()
  }, [fetchTree, fetchList, fetchItemTypes])

  useEffect(() => {
    fetchList()
  }, [searchTerm, filterLevel, fetchList])

  // Tree handlers
  const toggleNode = (code) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedNodes(newExpanded)
  }

  const expandAll = () => {
    const allCodes = new Set()
    const traverse = (nodes) => {
      nodes.forEach(n => {
        allCodes.add(n.code)
        if (n.children?.length) traverse(n.children)
      })
    }
    traverse(treeData)
    setExpandedNodes(allCodes)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  // Modal handlers
  const openCreateModal = (parentNode = null) => {
    const newForm = { ...DEFAULT_FORM }
    
    if (parentNode) {
      // Pre-fill parent info
      newForm.level = parentNode.level + 1
      if (parentNode.level >= 1) newForm.category_code = parentNode.code
      if (parentNode.level >= 2) newForm.sub_category_code = parentNode.code
      if (parentNode.level >= 3) newForm.division_code = parentNode.code
      if (parentNode.level >= 4) newForm.class_code = parentNode.code
      
      // Inherit from parent path
      const pathParts = parentNode.path?.split('/') || []
      if (pathParts[0]) newForm.category_code = pathParts[0]
      if (pathParts[1]) newForm.sub_category_code = pathParts[1]
      if (pathParts[2]) newForm.division_code = pathParts[2]
      if (pathParts[3]) newForm.class_code = pathParts[3]
    }
    
    setFormData(newForm)
    setFormErrors({})
    setModalMode('create')
    setShowModal(true)
    
    // Fetch dropdown options
    fetchDropdownOptions(newForm.level, newForm)
  }

  const openEditModal = async (item) => {
    setFormData({
      level: item.level,
      code: item.code,
      name: item.name,
      description: item.description || '',
      category_code: item.category_code || '',
      sub_category_code: item.sub_category_code || '',
      division_code: item.division_code || '',
      class_code: item.class_code || '',
      applicable_item_types: item.applicable_item_types || ['FGDS'],
      has_color: item.has_color ?? true,
      has_size: item.has_size ?? true,
      has_fabric: item.has_fabric ?? false,
      has_brand: item.has_brand ?? true,
      default_hsn_code: item.default_hsn_code || '',
      default_gst_rate: item.default_gst_rate || 5.0,
      icon: item.icon || 'Package',
      color_code: item.color_code || '#10b981',
      sort_order: item.sort_order || 0,
    })
    setFormErrors({})
    setModalMode('edit')
    setShowModal(true)
    
    await fetchDropdownOptions(item.level, item)
  }

  // Form handlers
  const handleLevelChange = async (level) => {
    setFormData(prev => ({
      ...prev,
      level,
      category_code: '',
      sub_category_code: '',
      division_code: '',
      class_code: '',
    }))
    
    await fetchDropdownOptions(level, {})
  }

  const handleParentChange = async (field, value) => {
    const newData = { ...formData, [field]: value }
    
    // Clear dependent fields
    if (field === 'category_code') {
      newData.sub_category_code = ''
      newData.division_code = ''
      newData.class_code = ''
    } else if (field === 'sub_category_code') {
      newData.division_code = ''
      newData.class_code = ''
    } else if (field === 'division_code') {
      newData.class_code = ''
    }
    
    setFormData(newData)
    await fetchDropdownOptions(formData.level, newData)
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.code || formData.code.length !== 4) {
      errors.code = 'Code must be exactly 4 characters'
    } else if (!/^[A-Za-z0-9]+$/.test(formData.code)) {
      errors.code = 'Code must be alphanumeric only'
    }
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    
    if (formData.level >= 2 && !formData.category_code) {
      errors.category_code = 'Category is required'
    }
    if (formData.level >= 3 && !formData.sub_category_code) {
      errors.sub_category_code = 'Sub-Category is required'
    }
    if (formData.level >= 4 && !formData.division_code) {
      errors.division_code = 'Division is required'
    }
    if (formData.level >= 5 && !formData.class_code) {
      errors.class_code = 'Class is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix form errors')
      return
    }
    
    setSaving(true)
    
    try {
      const levelConfig = LEVELS[formData.level - 1]
      const payload = {
        [levelConfig.codeField]: formData.code.toUpperCase(),
        [levelConfig.nameField]: formData.name,
        description: formData.description || null,
        icon: formData.icon,
        color_code: formData.color_code,
        sort_order: formData.sort_order,
      }
      
      // Add level-specific fields
      if (formData.level === 1) {
        payload.applicable_item_types = formData.applicable_item_types
        payload.has_color = formData.has_color
        payload.has_size = formData.has_size
        payload.has_fabric = formData.has_fabric
        payload.has_brand = formData.has_brand
        payload.default_hsn_code = formData.default_hsn_code || null
        payload.default_gst_rate = formData.default_gst_rate
      }
      
      // Add parent references
      if (formData.level >= 2) payload.category_code = formData.category_code
      if (formData.level >= 3) payload.sub_category_code = formData.sub_category_code
      if (formData.level >= 4) payload.division_code = formData.division_code
      if (formData.level >= 5) payload.class_code = formData.class_code
      
      if (modalMode === 'create') {
        await categoryHierarchy.create(levelConfig.key, payload)
        toast.success(`${levelConfig.name} created successfully!`)
      } else {
        await categoryHierarchy.update(levelConfig.key, formData.code, payload)
        toast.success(`${levelConfig.name} updated successfully!`)
      }
      
      setShowModal(false)
      fetchTree()
      fetchList()
    } catch (error) {
      const message = error.response?.data?.detail || 'Operation failed'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const levelConfig = LEVELS[item.level - 1]
    
    if (!window.confirm(`Are you sure you want to deactivate "${item.name}"?`)) {
      return
    }
    
    try {
      await categoryHierarchy.delete(levelConfig.key, item.code)
      toast.success(`${levelConfig.name} deactivated`)
      fetchTree()
      fetchList()
    } catch (error) {
      const message = error.response?.data?.detail || 'Delete failed'
      toast.error(message)
    }
  }

  // Render tree node
  const renderTreeNode = (node, depth = 0) => {
    const hasChildren = node.children?.length > 0
    const isExpanded = expandedNodes.has(node.code)
    const levelConfig = LEVELS[node.level - 1]
    const IconComponent = levelConfig?.icon || Package
    
    return (
      <div key={node.code}>
        <div 
          className="flex items-center py-2 px-3 hover:bg-gray-50 border-b cursor-pointer group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.code)}
              className="p-1 hover:bg-gray-200 rounded mr-2 transition"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-7" />
          )}
          
          {/* Icon */}
          <div 
            className="w-8 h-8 rounded flex items-center justify-center mr-3"
            style={{ backgroundColor: node.color_code || levelConfig?.color }}
          >
            <IconComponent size={16} className="text-white" />
          </div>
          
          {/* Name and Code */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{node.name}</span>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">
                {node.code}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Level {node.level}: {levelConfig?.name}
              {node.child_count > 0 && ` • ${node.child_count} children`}
              {node.item_count > 0 && ` • ${node.item_count} items`}
            </div>
          </div>
          
          {/* Status */}
          {!node.is_active && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded mr-2">
              Inactive
            </span>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            {node.level < 5 && (
              <button
                onClick={() => openCreateModal(node)}
                className="p-1.5 hover:bg-green-100 rounded text-green-600"
                title="Add Child"
              >
                <Plus size={14} />
              </button>
            )}
            <button
              onClick={() => openEditModal(node)}
              className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => handleDelete(node)}
              className="p-1.5 hover:bg-red-100 rounded text-red-600"
              title="Deactivate"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Item Category Master</h1>
            <p className="text-emerald-100 mt-1">5-Level Hierarchy: Category → Sub-Category → Division → Class → Sub-Class</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  viewMode === 'tree' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white/10'
                }`}
              >
                <FolderTree size={18} /> Tree
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  viewMode === 'list' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white/10'
                }`}
              >
                <List size={18} /> List
              </button>
              <button
                onClick={() => setViewMode('types')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  viewMode === 'types' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white/10'
                }`}
              >
                <Settings size={18} /> Item Types
              </button>
            </div>
            
            <button
              onClick={() => openCreateModal()}
              className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition"
            >
              <Plus size={20} /> Add New
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tree View */}
        {viewMode === 'tree' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Tree Toolbar */}
            <div className="border-b p-4 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
                >
                  Collapse All
                </button>
              </div>
              <button
                onClick={() => fetchTree()}
                className="p-2 hover:bg-gray-200 rounded transition"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>
            
            {/* Tree Content */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-500">Loading hierarchy...</p>
              </div>
            ) : treeData.length === 0 ? (
              <div className="p-12 text-center">
                <FolderTree size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No categories found</p>
                <button
                  onClick={() => openCreateModal()}
                  className="mt-4 text-emerald-600 hover:underline"
                >
                  Create your first category
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {treeData.map(node => renderTreeNode(node))}
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Filters */}
            <div className="border-b p-4 flex items-center gap-4 bg-gray-50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, code, or path..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Levels</option>
                {LEVELS.map(l => (
                  <option key={l.level} value={l.level}>Level {l.level}: {l.name}</option>
                ))}
              </select>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Level</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Path</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {listData.map((item) => {
                    const levelConfig = LEVELS[item.level - 1]
                    const IconComponent = levelConfig?.icon || Package
                    
                    return (
                      <tr key={`${item.level}-${item.code}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded flex items-center justify-center"
                              style={{ backgroundColor: levelConfig?.color }}
                            >
                              <IconComponent size={14} className="text-white" />
                            </div>
                            <span className="text-sm">{levelConfig?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.path_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 hover:bg-blue-100 rounded text-blue-600"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 hover:bg-red-100 rounded text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {listData.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  No items found matching your criteria
                </div>
              )}
            </div>
          </div>
        )}

        {/* Item Types View */}
        {viewMode === 'types' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="border-b p-4 bg-gray-50">
              <h2 className="text-lg font-semibold">Item Types</h2>
              <p className="text-sm text-gray-500">10 types for complete apparel manufacturing workflow</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-4">
              {itemTypesList.map((type) => (
                <div 
                  key={type.value}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: type.color }}
                    >
                      <Package size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{type.value}</span>
                        <span className="text-gray-600">{type.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {type.allow_purchase && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Purchase</span>
                        )}
                        {type.allow_sale && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Sale</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level Legend */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Hierarchy Levels</h3>
          <div className="flex flex-wrap gap-4">
            {LEVELS.map((level) => {
              const IconComponent = level.icon
              return (
                <div key={level.level} className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: level.color }}
                  >
                    <IconComponent size={14} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">L{level.level}: {level.name}</div>
                    <div className="text-xs text-gray-500">{level.example}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {modalMode === 'create' ? 'Create New Category' : 'Edit Category'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-white/20 rounded transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Select Level */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Step 1: Select Level
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {LEVELS.map((level) => {
                    const IconComponent = level.icon
                    return (
                      <label
                        key={level.level}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                          formData.level === level.level
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${modalMode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="level"
                          value={level.level}
                          checked={formData.level === level.level}
                          onChange={() => handleLevelChange(level.level)}
                          disabled={modalMode === 'edit'}
                          className="sr-only"
                        />
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: level.color }}
                        >
                          <IconComponent size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Level {level.level}: {level.name}</div>
                          <div className="text-xs text-gray-500">{level.example}</div>
                        </div>
                        {formData.level === level.level && (
                          <Check size={20} className="text-emerald-600" />
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Step 2: Select Parent Hierarchy */}
              {formData.level > 1 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Step 2: Select Parent Hierarchy
                  </label>
                  
                  <div className="space-y-3">
                    {/* Category (for Level 2+) */}
                    {formData.level >= 2 && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.category_code}
                          onChange={(e) => handleParentChange('category_code', e.target.value)}
                          disabled={modalMode === 'edit'}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            formErrors.category_code ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Category</option>
                          {categoryOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {formErrors.category_code && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.category_code}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Sub-Category (for Level 3+) */}
                    {formData.level >= 3 && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Sub-Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.sub_category_code}
                          onChange={(e) => handleParentChange('sub_category_code', e.target.value)}
                          disabled={modalMode === 'edit' || !formData.category_code}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            formErrors.sub_category_code ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Sub-Category</option>
                          {subCategoryOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Division (for Level 4+) */}
                    {formData.level >= 4 && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Division <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.division_code}
                          onChange={(e) => handleParentChange('division_code', e.target.value)}
                          disabled={modalMode === 'edit' || !formData.sub_category_code}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            formErrors.division_code ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Division</option>
                          {divisionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Class (for Level 5) */}
                    {formData.level >= 5 && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Class <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.class_code}
                          onChange={(e) => handleParentChange('class_code', e.target.value)}
                          disabled={modalMode === 'edit' || !formData.division_code}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            formErrors.class_code ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Class</option>
                          {classOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Basic Information */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Step {formData.level > 1 ? '3' : '2'}: Basic Information
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Code <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-400 ml-1">(4 characters)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().slice(0, 4) }))}
                      disabled={modalMode === 'edit'}
                      placeholder="e.g., APRL"
                      maxLength={4}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase ${
                        formErrors.code ? 'border-red-500' : 'border-gray-300'
                      } ${modalMode === 'edit' ? 'bg-gray-100' : ''}`}
                    />
                    {formErrors.code && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Apparel"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Level 1 specific: Item Types */}
              {formData.level === 1 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Applicable Item Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {itemTypesList.map((type) => (
                      <label
                        key={type.value}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                          formData.applicable_item_types.includes(type.value)
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.applicable_item_types.includes(type.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                applicable_item_types: [...prev.applicable_item_types, type.value]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                applicable_item_types: prev.applicable_item_types.filter(t => t !== type.value)
                              }))
                            }
                          }}
                          className="sr-only"
                        />
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-sm font-medium">{type.value}</span>
                        <span className="text-xs text-gray-500">{type.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Display Settings
                </label>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Color</label>
                    <input
                      type="color"
                      value={formData.color_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, color_code: e.target.value }))}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  {formData.level === 1 && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Default GST %</label>
                      <select
                        value={formData.default_gst_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_gst_rate: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="border-t p-4 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="text-red-500">*</span> Required fields
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      {modalMode === 'create' ? 'Create' : 'Update'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
