import { useState, useEffect } from 'react'
import { Plus, ChevronRight, ChevronDown, Trash2, FolderTree, FolderOpen, Folder, Move, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ItemCategoryHierarchy() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [editMode, setEditMode] = useState(false)

  const [inventoryClasses, setInventoryClasses] = useState([])
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterClass, setFilterClass] = useState('all')

  // Drag and Drop State
  const [draggedNode, setDraggedNode] = useState(null)
  const [dragOverNode, setDragOverNode] = useState(null)
  const [isDragValid, setIsDragValid] = useState(false)
  const [showMoveWarning, setShowMoveWarning] = useState(false)
  const [pendingMove, setPendingMove] = useState(null)

  const [formData, setFormData] = useState({
    category_name: '',
    category_code: '',
    description: '',
    parent_category_id: null,
    parent_category_name: null,
    level: 1,
    inventory_class: null,
    selected_uoms: [],
    waste_percentage: 0,
    reorder_point: null,
    lead_time_days: null,
    preferred_supplier_id: null,
    preferred_supplier_name: '',
    standard_cost: null,
    requires_batch_tracking: false,
    requires_expiry_tracking: false,
    quality_check_required: false,
    storage_requirements: '',
    handling_instructions: '',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchCategories()
    fetchEnums()
  }, [])

  const getToken = () => localStorage.getItem('access_token')

  const fetchEnums = async () => {
    try {
      const [classesRes, uomRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/items/enums/inventory-classes', {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        }),
        fetch('http://127.0.0.1:8000/api/items/enums/units-of-measure', {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
      ])
      
      setInventoryClasses(await classesRes.json())
      setUnitsOfMeasure(await uomRes.json())
    } catch (error) {
      console.error('Failed to fetch enums', error)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://127.0.0.1:8000/api/items/categories?limit=1000', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const data = await response.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch categories')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      category_name: '',
      category_code: '',
      description: '',
      parent_category_id: null,
      parent_category_name: null,
      level: 1,
      inventory_class: null,
      selected_uoms: [],
      waste_percentage: 0,
      reorder_point: null,
      lead_time_days: null,
      preferred_supplier_id: null,
      preferred_supplier_name: '',
      standard_cost: null,
      requires_batch_tracking: false,
      requires_expiry_tracking: false,
      quality_check_required: false,
      storage_requirements: '',
      handling_instructions: '',
      sort_order: 0,
      is_active: true,
    })
    setEditMode(false)
    setSelectedCategory(null)
  }

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.inventory_class) {
      toast.error('Inventory Class is required')
      return
    }
    
    if (!formData.selected_uoms || formData.selected_uoms.length === 0) {
      toast.error('At least one Unit of Measure is required')
      return
    }
    
    // Validate category code (max 4 alphabets)
    if (formData.category_code && !/^[A-Z]{1,4}$/.test(formData.category_code)) {
      toast.error('Category code must be 1-4 uppercase letters only')
      return
    }
    
    // Check if inventory class changed for parent with children
    if (editMode && selectedCategory) {
      const hasChildren = categories.some(cat => cat.parent_category_id === selectedCategory.category_id)
      if (hasChildren && selectedCategory.inventory_class !== formData.inventory_class) {
        if (!window.confirm('Changing inventory class will affect all sub-categories. Do you want to continue?')) {
          return
        }
      }
    }

    try {
      // Check for duplicate category code
      if (!editMode || formData.category_code !== selectedCategory?.category_code) {
        const isDuplicate = categories.some(cat => 
          cat.category_code === formData.category_code && cat.category_id !== selectedCategory?.category_id
        )
        if (isDuplicate) {
          toast.error('Category code already exists. Please use a unique code.')
          return
        }
      }

      const categoryData = {
        category_id: formData.category_code || formData.category_name.substring(0, 4).toUpperCase(),
        category_name: formData.category_name.toUpperCase(),
        category_code: formData.category_code.toUpperCase(),
        description: formData.description,
        parent_category_id: formData.parent_category_id,
        parent_category_name: formData.parent_category_name,
        level: formData.level,
        inventory_class: formData.inventory_class,
        selected_uoms: formData.selected_uoms,
        waste_percentage: formData.waste_percentage,
        reorder_point: formData.reorder_point,
        lead_time_days: formData.lead_time_days,
        preferred_supplier_id: formData.preferred_supplier_id,
        preferred_supplier_name: formData.preferred_supplier_name,
        standard_cost: formData.standard_cost,
        requires_batch_tracking: formData.requires_batch_tracking,
        requires_expiry_tracking: formData.requires_expiry_tracking,
        quality_check_required: formData.quality_check_required,
        storage_requirements: formData.storage_requirements,
        handling_instructions: formData.handling_instructions,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      }

      if (editMode && selectedCategory) {
        const response = await fetch(`http://127.0.0.1:8000/api/items/categories/${selectedCategory.category_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(categoryData)
        })

        if (response.ok) {
          toast.success('Category updated successfully!')
          resetForm()
          fetchCategories()
        } else {
          const error = await response.json()
          toast.error(error.detail || 'Failed to update category')
        }
      } else {
        const response = await fetch('http://127.0.0.1:8000/api/items/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(categoryData)
        })

        if (response.ok) {
          toast.success('Category created successfully!')
          resetForm()
          fetchCategories()
        } else {
          const error = await response.json()
          toast.error(error.detail || 'Failed to create category')
        }
      }
    } catch (error) {
      toast.error('Error saving category')
      console.error(error)
    }
  }

  const handleEditCategory = (category) => {
    setSelectedCategory(category)
    setEditMode(true)
    setFormData({
      category_name: category.category_name,
      category_code: category.category_code,
      description: category.description || '',
      parent_category_id: category.parent_category_id,
      parent_category_name: category.parent_category_name || '',
      level: category.level,
      inventory_class: category.inventory_class,
      selected_uoms: category.selected_uoms || [],
      waste_percentage: category.waste_percentage || 0,
      reorder_point: category.reorder_point,
      lead_time_days: category.lead_time_days,
      preferred_supplier_id: category.preferred_supplier_id,
      preferred_supplier_name: category.preferred_supplier_name || '',
      standard_cost: category.standard_cost,
      requires_batch_tracking: category.requires_batch_tracking || false,
      requires_expiry_tracking: category.requires_expiry_tracking || false,
      quality_check_required: category.quality_check_required || false,
      storage_requirements: category.storage_requirements || '',
      handling_instructions: category.handling_instructions || '',
      sort_order: category.sort_order || 0,
      is_active: category.is_active !== false,
    })
  }

  const handleAddNewCategory = () => {
    resetForm()
  }

  const handleAddChildCategory = (parentCategory) => {
    resetForm()
    const newLevel = parentCategory.level + 1
    setFormData({
      ...formData,
      parent_category_id: parentCategory.category_id,
      parent_category_name: parentCategory.category_name,
      level: newLevel,
      inventory_class: parentCategory.inventory_class,
      selected_uoms: parentCategory.selected_uoms || [],
    })
    toast.success(`Adding Level ${newLevel} category under "${parentCategory.category_name}"`)
  }

  const toggleNode = (categoryId) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleDeleteCategory = async (category, e) => {
    e?.stopPropagation()
    
    if (!window.confirm(`Are you sure you want to delete "${category.category_name}"?`)) {
      return
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/items/categories/${category.category_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (response.ok) {
        toast.success('Category deleted successfully!')
        if (selectedCategory?.category_id === category.category_id) {
          resetForm()
        }
        fetchCategories()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to delete category')
      }
    } catch (error) {
      toast.error('Error deleting category')
      console.error(error)
    }
  }

  const buildTree = () => {
    const categoryMap = {}
    const tree = []

    categories.forEach(cat => {
      categoryMap[cat.category_id] = { ...cat, children: [] }
    })

    categories.forEach(cat => {
      if (cat.parent_category_id && categoryMap[cat.parent_category_id]) {
        categoryMap[cat.parent_category_id].children.push(categoryMap[cat.category_id])
      } else {
        tree.push(categoryMap[cat.category_id])
      }
    })

    return tree
  }

  const filterCategories = (tree) => {
    if (!searchTerm && filterStatus === 'all' && filterClass === 'all') return tree

    const filterNode = (node) => {
      const matchesSearch = !searchTerm || 
        node.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.category_code.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && node.is_active !== false) ||
        (filterStatus === 'inactive' && node.is_active === false)
      
      const matchesClass = filterClass === 'all' || node.inventory_class === filterClass

      const filteredChildren = node.children.map(filterNode).filter(Boolean)

      if (matchesSearch && matchesStatus && matchesClass) {
        return { ...node, children: filteredChildren }
      } else if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }

      return null
    }

    return tree.map(filterNode).filter(Boolean)
  }

  // Drag and Drop Helper Functions
  const isDescendant = (parentId, childId) => {
    if (parentId === childId) return true

    const checkDescendants = (nodeId) => {
      const children = categories.filter(cat => cat.parent_category_id === nodeId)
      for (const child of children) {
        if (child.category_id === childId) return true
        if (checkDescendants(child.category_id)) return true
      }
      return false
    }

    return checkDescendants(parentId)
  }

  const canDropOn = (draggedNode, targetNode) => {
    if (!draggedNode || !targetNode) return false
    if (draggedNode.category_id === targetNode.category_id) return false
    if (isDescendant(draggedNode.category_id, targetNode.category_id)) return false
    return true
  }

  const handleDragStart = (e, node) => {
    e.stopPropagation()
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget)

    // Add visual feedback
    e.currentTarget.style.opacity = '0.5'
    toast.success(`Dragging: ${node.category_name}`, { duration: 1500 })
  }

  const handleDragOver = (e, node) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode) return

    const isValid = canDropOn(draggedNode, node)
    setDragOverNode(node)
    setIsDragValid(isValid)

    e.dataTransfer.dropEffect = isValid ? 'move' : 'none'
  }

  const handleDragLeave = (e) => {
    e.stopPropagation()
    setDragOverNode(null)
    setIsDragValid(false)
  }

  const handleDrop = (e, targetNode) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode || !canDropOn(draggedNode, targetNode)) {
      toast.error('Invalid drop: Cannot move a parent into its own child!')
      resetDragState()
      return
    }

    // Show warning modal
    setPendingMove({
      source: draggedNode,
      target: targetNode
    })
    setShowMoveWarning(true)
    resetDragState()
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    resetDragState()
  }

  const resetDragState = () => {
    setDraggedNode(null)
    setDragOverNode(null)
    setIsDragValid(false)
  }

  const confirmMove = async () => {
    if (!pendingMove) return

    const { source, target } = pendingMove

    try {
      const updateData = {
        ...source,
        parent_category_id: target.category_id,
        parent_category_name: target.category_name,
        level: target.level + 1
      }

      const response = await fetch(`http://127.0.0.1:8000/api/items/categories/${source.category_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        toast.success(`Moved "${source.category_name}" under "${target.category_name}"`)
        setShowMoveWarning(false)
        setPendingMove(null)
        fetchCategories()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to move category')
      }
    } catch (error) {
      toast.error('Error moving category')
      console.error(error)
    }
  }

  const cancelMove = () => {
    setShowMoveWarning(false)
    setPendingMove(null)
  }

  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.category_id)
    const isSelected = selectedCategory?.category_id === node.category_id
    const isInactive = node.is_active === false

    // Drag and Drop styling
    const isDragging = draggedNode?.category_id === node.category_id
    const isDraggedOver = dragOverNode?.category_id === node.category_id
    const dropZoneClass = isDraggedOver
      ? (isDragValid ? 'bg-green-200 border-2 border-green-500 scale-105' : 'bg-red-200 border-2 border-red-500')
      : ''

    return (
      <div key={node.category_id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          onDragEnd={handleDragEnd}
          className={`group flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-green-50 transition-all ${
            isSelected ? 'bg-green-100 border-l-4 border-green-600' : ''
          } ${isInactive ? 'opacity-50' : ''} ${dropZoneClass} ${isDragging ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleEditCategory(node)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.category_id)
              }}
              className="p-0.5 hover:bg-green-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-600" />
              ) : (
                <ChevronRight size={16} className="text-gray-600" />
              )}
            </button>
          ) : (
            <span className="w-5"></span>
          )}
          
          {hasChildren ? (
            isExpanded ? <FolderOpen size={16} className="text-green-600" /> : <Folder size={16} className="text-green-600" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-green-200 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          )}

          {/* Drag indicator */}
          <Move size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-gray-900 truncate">{node.category_name}</div>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                L{node.level}
              </span>
              {hasChildren && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {node.children.length}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 font-mono">{node.category_code}</div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleAddChildCategory(node)
              }}
              className="p-1 hover:bg-green-200 rounded text-green-600"
              title="Add Child"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => handleDeleteCategory(node, e)}
              className="p-1 hover:bg-red-100 rounded text-red-600"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const tree = filterCategories(buildTree())

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50">
      {/* Left Sidebar - Category Tree */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <FolderTree size={24} />
            <div>
              <h2 className="text-lg font-bold">Multi-Level Category Tree</h2>
              <p className="text-xs text-green-100">{categories.length} categories • Unlimited depth</p>
              <p className="text-xs text-green-200 flex items-center gap-1 mt-1">
                <Move size={12} />
                Drag & drop to reorganize
              </p>
            </div>
          </div>
          
          <button
            onClick={handleAddNewCategory}
            className="w-full bg-white text-green-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-green-50 transition"
          >
            <Plus size={18} /> New Root Category
          </button>
        </div>

        <div className="p-3 border-b bg-gray-50">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
          />
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Types</option>
              {inventoryClasses.map(ic => (
                <option key={ic.value} value={ic.value}>{ic.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading categories...</div>
          ) : tree.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderTree size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No categories found</p>
              <p className="text-xs mt-1">Create your first category to get started</p>
            </div>
          ) : (
            <div className="py-2">
              {tree.map(node => renderTreeNode(node))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Edit Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <h1 className="text-2xl font-bold">
            {editMode ? `Edit Category: ${selectedCategory?.category_name}` : 'Create New Category'}
          </h1>
          <p className="text-green-100 text-sm mt-1">
            {editMode 
              ? `Level ${selectedCategory?.level} • Update category details below` 
              : formData.parent_category_id 
                ? `Creating Level ${formData.level} category under "${formData.parent_category_name}"`
                : 'Creating root level category (Level 1)'
            }
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSaveCategory} className="bg-white rounded-lg shadow-md p-6 max-w-4xl">
            {formData.parent_category_id && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Parent Category:</span> {formData.parent_category_name}
                  <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded">
                    Will create as Level {formData.level}
                  </span>
                </p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Code (Max 4 Letters)
                  </label>
                  <input
                    type="text"
                    value={formData.category_code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase()
                      setFormData({ ...formData, category_code: value })
                    }}
                    disabled={editMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 uppercase"
                    placeholder="e.g., FABR"
                    maxLength="4"
                  />
                  <p className="text-xs text-gray-500 mt-1">Only alphabets allowed, auto-uppercase</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                    placeholder="e.g., COTTON FABRICS"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-saved in uppercase</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="2"
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Inventory Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inventory Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.inventory_class || ''}
                    onChange={(e) => setFormData({ ...formData, inventory_class: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">-- Select --</option>
                    {inventoryClasses.map(ic => (
                      <option key={ic.value} value={ic.value}>{ic.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units of Measure (Multiple) <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto">
                    {unitsOfMeasure.map(uom => (
                      <label key={uom.value} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.selected_uoms?.includes(uom.value)}
                          onChange={(e) => {
                            const newUoms = e.target.checked
                              ? [...(formData.selected_uoms || []), uom.value]
                              : formData.selected_uoms.filter(u => u !== uom.value)
                            setFormData({ ...formData, selected_uoms: newUoms })
                          }}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{uom.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {formData.selected_uoms?.length || 0} UOM(s)
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waste %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.waste_percentage || ''}
                    onChange={(e) => setFormData({ ...formData, waste_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                  <input
                    type="number"
                    value={formData.reorder_point || ''}
                    onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={formData.lead_time_days || ''}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.standard_cost || ''}
                    onChange={(e) => setFormData({ ...formData, standard_cost: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_batch_tracking}
                    onChange={(e) => setFormData({ ...formData, requires_batch_tracking: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Requires Batch Tracking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_expiry_tracking}
                    onChange={(e) => setFormData({ ...formData, requires_expiry_tracking: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Requires Expiry Tracking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.quality_check_required}
                    onChange={(e) => setFormData({ ...formData, quality_check_required: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Quality Check Required</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Supplier Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Supplier ID</label>
                  <input
                    type="text"
                    value={formData.preferred_supplier_id || ''}
                    onChange={(e) => setFormData({ ...formData, preferred_supplier_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="SUP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Supplier Name</label>
                  <input
                    type="text"
                    value={formData.preferred_supplier_name || ''}
                    onChange={(e) => setFormData({ ...formData, preferred_supplier_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Supplier Company Name"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Storage & Handling</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Requirements</label>
                  <textarea
                    value={formData.storage_requirements || ''}
                    onChange={(e) => setFormData({ ...formData, storage_requirements: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="2"
                    placeholder="e.g., Store in cool, dry place. Temperature: 15-25°C"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handling Instructions</label>
                  <textarea
                    value={formData.handling_instructions || ''}
                    onChange={(e) => setFormData({ ...formData, handling_instructions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="2"
                    placeholder="e.g., Handle with care. Avoid folding."
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Is Active</span>
                <span className="text-xs text-gray-500">Enable this category for use</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                {editMode ? 'Update Category' : 'Create Category'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                {editMode ? 'Cancel Edit' : 'Reset Form'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Move Warning Modal */}
      {showMoveWarning && pendingMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Confirm Category Move
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  You are about to move a category in the hierarchy. This action will:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
                  <li>Change the parent-child relationship</li>
                  <li>Update the level of the moved category</li>
                  <li>Potentially affect all child categories</li>
                  <li>Update the category structure immediately</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Move className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Move Details:</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Moving:</span>
                  <span className="font-medium text-gray-900">{pendingMove.source.category_name}</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">L{pendingMove.source.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">New Parent:</span>
                  <span className="font-medium text-gray-900">{pendingMove.target.category_name}</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">L{pendingMove.target.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">New Level:</span>
                  <span className="font-medium text-green-700">Level {pendingMove.target.level + 1}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmMove}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Move className="w-4 h-4" />
                Confirm Move
              </button>
              <button
                onClick={cancelMove}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded-lg font-medium transition"
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
