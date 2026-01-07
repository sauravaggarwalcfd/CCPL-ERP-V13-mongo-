import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, ChevronRight, ChevronDown, Edit2, Edit3, Trash2, Eye,
  Package, Users, Layers, Tag, Hash, Shirt, RefreshCw, List,
  FolderTree, Settings, X, Check, AlertCircle, Filter, GripVertical
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLayout } from '../context/LayoutContext'
import { categoryHierarchy, itemTypes, suppliers, brands } from '../services/api'
import { colourApi, sizeApi, uomApi } from '../services/variantApi'
import { specificationApi } from '../services/specificationApi'
import GroupSelector from '../components/common/GroupSelector'
import SpecificationSection from '../components/specifications/SpecificationSection'

// Level Configuration
const LEVELS = [
  { level: 1, name: 'Level 1', key: 'categories', codeField: 'category_code', nameField: 'category_name', icon: Package, color: '#10b981', example: 'Apparel, Fabrics, Accessories' },
  { level: 2, name: 'Level 2', key: 'sub-categories', codeField: 'sub_category_code', nameField: 'sub_category_name', icon: Users, color: '#3b82f6', example: 'Men, Women, Kids' },
  { level: 3, name: 'Level 3', key: 'divisions', codeField: 'division_code', nameField: 'division_name', icon: Layers, color: '#8b5cf6', example: 'Topwear, Bottomwear' },
  { level: 4, name: 'Level 4', key: 'classes', codeField: 'class_code', nameField: 'class_name', icon: Tag, color: '#ec4899', example: 'T-Shirts, Jeans, Shirts' },
  { level: 5, name: 'Level 5', key: 'sub-classes', codeField: 'sub_class_code', nameField: 'sub_class_name', icon: Hash, color: '#f59e0b', example: 'Round Neck, V-Neck, Polo' },
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
  item_type: '',
  level_names: {
    l1: 'Category',
    l2: 'Sub-Category',
    l3: 'Division',
    l4: 'Class',
    l5: 'Sub-Class'
  },
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

// Default Item Type Form
const DEFAULT_ITEM_TYPE_FORM = {
  type_code: '',
  type_name: '',
  description: '',
  color_code: '#10b981',
  icon: 'Package',
  allow_purchase: true,
  allow_sale: false,
  track_inventory: true,
  require_quality_check: false,
  default_uom: 'PCS',
  sort_order: 0,
}

export default function ItemCategoryMaster() {
  const { setTitle } = useLayout()
  // Data state
  const [treeData, setTreeData] = useState([])
  const [listData, setListData] = useState([])
  const [allItemsData, setAllItemsData] = useState([]) // Unfiltered data for counts
  const [itemTypesList, setItemTypesList] = useState([])
  const [loading, setLoading] = useState(true)
  // Which level name is being edited inline
  const [editingLevel, setEditingLevel] = useState(null)
  // refs for inline inputs so we can focus after enabling edit
  const inputRefs = useRef({})

  // Auto-focus the inline input when editingLevel changes
  useEffect(() => {
    if (!editingLevel) return
    const el = inputRefs.current[editingLevel]
    if (el) {
      try { el.focus(); el.select && el.select() } catch (e) {}
    }
  }, [editingLevel])

  // Save level names to server when editing an existing Level 1 category
  const saveLevelNames = async () => {
    // Only persist when editing an existing category (panelMode === 'edit') and it's a Level 1 item
    if (panelMode === 'edit' && formData.level === 1 && formData.code) {
      try {
        await categoryHierarchy.update('categories', formData.code, {
          level_names: formData.level_names
        })
        toast.success('Level names updated')
      } catch (err) {
        console.error('Failed to save level names:', err)
        toast.error('Failed to save level names')
      }
    }
  }
  // View state
  const [viewMode, setViewMode] = useState('tree') // 'tree', 'list', 'types'
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  
  // Panel state (replaces modal)
  const [showPanel, setShowPanel] = useState(false)
  const [panelMode, setPanelMode] = useState('create') // 'create', 'edit'
  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  
  // Preview panel state
  const [showPreviewPanel, setShowPreviewPanel] = useState(false)
  const [previewPanelData, setPreviewPanelData] = useState(null)
  
  // Item Type Panel state
  const [showItemTypePanel, setShowItemTypePanel] = useState(false)
  const [itemTypeFormData, setItemTypeFormData] = useState(DEFAULT_ITEM_TYPE_FORM)
  const [itemTypeMode, setItemTypeMode] = useState('create')

  // Success animation state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Legacy modal support (keeping for compatibility)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  
  // Dropdown options
  const [categoryOptions, setCategoryOptions] = useState([])
  const [subCategoryOptions, setSubCategoryOptions] = useState([])
  const [divisionOptions, setDivisionOptions] = useState([])
  const [classOptions, setClassOptions] = useState([])

  // Parent category level names (for inheritance)
  const [parentLevelNames, setParentLevelNames] = useState(null)
  
  // Hierarchy path for displaying actual category names in form
  const [hierarchyPath, setHierarchyPath] = useState([])
  // e.g. [{ level: 1, code: 'TRM', name: 'Trims & Accessories' }, { level: 2, code: 'BTN', name: 'Buttons' }]
  

  // Specifications configuration state
  const [variantGroups, setVariantGroups] = useState({
    colour: [],
    size: [],
    uom: [],
    vendor: [],
    brand: [],
    supplier_group: []
  })
  const [specifications, setSpecifications] = useState({
    colour: { enabled: false, required: false, groups: [] },
    size: { enabled: false, required: false, groups: [] },
    uom: { enabled: false, required: false, groups: [] },
    vendor: { enabled: false, required: false, groups: [] },
    brand: { enabled: false, required: false, groups: [] },
    supplier_group: { enabled: false, required: false, groups: [] }
  })
  const [customFields, setCustomFields] = useState([])

  // Panel resize state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50) // percentage
  const [isResizing, setIsResizing] = useState(false)

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showMoveConfirm, setShowMoveConfirm] = useState(false)
  const [pendingMoveData, setPendingMoveData] = useState(null)



  // Fetch data
  const fetchTree = useCallback(async () => {
    try {
      setLoading(true)
      const response = await categoryHierarchy.getTree()
      
      if (response.data) {
        setTreeData(response.data)
        
        // Auto-expand first level
        const firstLevelCodes = response.data.map(c => c.code)
        setExpandedNodes(new Set(firstLevelCodes))
      } else {
        setTreeData([])
      }
    } catch (error) {
      console.error('Fetch tree error:', error)
      
      // Only show error toast if it's a real network/server error, not client-side
      if (error.response?.status >= 500 || !error.response) {
        toast.error('Failed to load categories - Backend server issue')
      } else if (error.response?.status === 404) {
        toast.error('Category endpoints not found')
      } else {
        toast.error('Failed to load categories')
      }
      
      // Keep existing data to avoid blank state
      setTreeData([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchList = useCallback(async () => {
    try {
      let allItems = []
      
      // Fetch all levels with better error handling
      try {
        const [cats, subCats, divs, classes, subClasses] = await Promise.all([
          categoryHierarchy.getCategories().catch(err => ({ data: [] })),
          categoryHierarchy.getSubCategories().catch(err => ({ data: [] })),
          categoryHierarchy.getDivisions().catch(err => ({ data: [] })),
          categoryHierarchy.getClasses().catch(err => ({ data: [] })),
          categoryHierarchy.getSubClasses().catch(err => ({ data: [] })),
        ])
        
        allItems = [
          ...(cats.data || []),
          ...(subCats.data || []),
          ...(divs.data || []),
          ...(classes.data || []),
          ...(subClasses.data || []),
        ]
      } catch (error) {
        console.error('Error fetching category levels:', error)
        // If all levels fail, keep empty list
        allItems = []
      }
      
      // Store unfiltered data for accurate counts
      setAllItemsData(allItems)
      
      // Debug: Log the data to see what we're getting
      console.log('All items fetched:', allItems.length)
      console.log('Level breakdown:', {
        'Level 1': allItems.filter(i => i.level === 1).length,
        'Level 2': allItems.filter(i => i.level === 2).length,
        'Level 3': allItems.filter(i => i.level === 3).length,
        'Level 4': allItems.filter(i => i.level === 4).length,
        'Level 5': allItems.filter(i => i.level === 5).length,
      })
      console.log('Sample item:', allItems[0])
      
      // Apply filters for display
      let filteredItems = [...allItems]
      
      // Filter by search
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filteredItems = filteredItems.filter(i => 
          i.name?.toLowerCase().includes(term) || 
          i.code?.toLowerCase().includes(term) ||
          i.path_name?.toLowerCase().includes(term)
        )
      }
      
      // Filter by level
      if (filterLevel) {
        filteredItems = filteredItems.filter(i => i.level === parseInt(filterLevel))
      }
      
      setListData(filteredItems)
    } catch (error) {
      console.error('Fetch list error:', error)
      // Don't show error toast here - fetchTree already handles it
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

  const fetchVariantGroups = useCallback(async () => {
    try {
      // Fetch colour groups, size groups, UOM groups, brand groups, and supplier groups in parallel
      const [colourGroupsRes, sizeGroupsRes, uomGroupsRes, brandGroupsRes, supplierGroupsRes] = await Promise.all([
        colourApi.getGroups().catch(() => ({ data: [] })),
        sizeApi.getGroups().catch(() => ({ data: [] })),
        uomApi.getGroups().catch(() => ({ data: [] })),
        brands.groups.list().catch(() => ({ data: [] })),
        suppliers.groups.list().catch(() => ({ data: [] }))
      ])

      const colourGroups = colourGroupsRes.data || []
      const sizeGroups = sizeGroupsRes.data || []
      const uomGroups = uomGroupsRes.data || []
      const brandGroups = brandGroupsRes.data || []
      const supplierGroups = supplierGroupsRes.data || []

      // Organize groups by variant type
      const organized = {
        // Map colour groups to consistent format
        colour: colourGroups.map(g => ({
          id: g._id || g.id,
          group_code: g.group_code || g.code || g,
          group_name: g.group_name || g.name || g,
          code: g.group_code || g.code || g,
          name: g.group_name || g.name || g
        })),
        // Map size groups to consistent format
        size: sizeGroups.map(g => ({
          id: g._id || g.id,
          group_code: g.group_code || g.code || g,
          group_name: g.group_name || g.name || g,
          code: g.group_code || g.code || g,
          name: g.group_name || g.name || g
        })),
        // Map UOM groups to consistent format
        uom: uomGroups.map(g => ({
          id: g._id || g.id,
          group_code: g.group_code || g.code || g,
          group_name: g.group_name || g.name || g,
          code: g.group_code || g.code || g,
          name: g.group_name || g.name || g
        })),
        // Map brand groups to consistent format
        brand: brandGroups.map(g => ({
          id: g._id || g.id,
          group_code: g.group_code || g.code,
          group_name: g.group_name || g.name,
          code: g.group_code || g.code,
          name: g.group_name || g.name
        })),
        // Map supplier groups to consistent format
        supplier_group: supplierGroups.map(g => ({
          id: g._id || g.id,
          group_code: g.group_code || g.code,
          group_name: g.group_name || g.name,
          code: g.group_code || g.code,
          name: g.group_name || g.name
        })),
        // Legacy vendor mapping (also uses supplier groups now)
        vendor: supplierGroups.map(g => ({
          id: g._id || g.id,
          group_code: g.group_code || g.code,
          group_name: g.group_name || g.name,
          code: g.group_code || g.code,
          name: g.group_name || g.name
        }))
      }

      setVariantGroups(organized)
    } catch (error) {
      console.error('Fetch variant groups error:', error)
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
    setTitle('Item Category Master')
    fetchTree()
    fetchList()
    fetchItemTypes()
    fetchVariantGroups()
  }, [fetchTree, fetchList, fetchItemTypes, fetchVariantGroups, setTitle])

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

  // Helper function to find a node by code in tree data
  const findNodeByCode = (code, nodes = treeData) => {
    for (const node of nodes) {
      if (node.code === code) return node
      if (node.children?.length) {
        const found = findNodeByCode(code, node.children)
        if (found) return found
      }
    }
    return null
  }

  // Helper function to build hierarchy path from a node
  const buildHierarchyPath = (node) => {
    const path = []
    if (node) {
      const pathCodes = node.path?.split('/') || []
      
      for (let i = 0; i < pathCodes.length; i++) {
        const code = pathCodes[i]
        // For the last item (current node), use node.name directly
        // For parent items, try to find them in tree data to get their names
        const isCurrentNode = i === pathCodes.length - 1
        let name = code // fallback to code
        
        if (isCurrentNode) {
          name = node.name
        } else {
          // Look up parent node in tree data
          const parentNode = findNodeByCode(code)
          if (parentNode) {
            name = parentNode.name
          }
        }
        
        path.push({
          level: i + 1,
          code: code,
          name: name
        })
      }
    }
    return path
  }

  // Modal handlers
  const openCreateModal = async (parentNode = null) => {
    const newForm = { ...DEFAULT_FORM }
    let newHierarchyPath = []

    if (parentNode) {
      // Build hierarchy path from parent node
      newHierarchyPath = buildHierarchyPath(parentNode)
      
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

    // If creating a sub-level, fetch parent category to get level_names
    if (newForm.level > 1 && newForm.category_code) {
      try {
        const res = await categoryHierarchy.getCategory(newForm.category_code)
        if (res.data && res.data.level_names) {
          newForm.level_names = res.data.level_names
        }
      } catch (error) {
        console.error('Failed to fetch parent category level names:', error)
      }
    }

    setHierarchyPath(newHierarchyPath)
    setFormData(newForm)
    setFormErrors({})
    setPanelMode('create')
    setShowPanel(true)
    setShowItemTypePanel(false)

    // Reset specifications state
    setSpecifications({
      colour: { enabled: false, required: false, groups: [] },
      size: { enabled: false, required: false, groups: [] },
      uom: { enabled: false, required: false, groups: [] },
      vendor: { enabled: false, required: false, groups: [] },
      brand: { enabled: false, required: false, groups: [] },
      supplier_group: { enabled: false, required: false, groups: [] }
    })
    setCustomFields([])

    // Fetch dropdown options
    fetchDropdownOptions(newForm.level, newForm)
  }

  const openEditModal = async (item) => {
    // Extract parent codes from path if not directly available
    const pathParts = item.path?.split('/') || []

    // For items at different levels, extract parent codes from path
    let categoryCode = item.category_code || ''
    let subCategoryCode = item.sub_category_code || ''
    let divisionCode = item.division_code || ''
    let classCode = item.class_code || ''

    // If parent codes not directly available, extract from path
    if (item.level >= 2 && !categoryCode && pathParts[0]) {
      categoryCode = pathParts[0]
    }
    if (item.level >= 3 && !subCategoryCode && pathParts[1]) {
      subCategoryCode = pathParts[1]
    }
    if (item.level >= 4 && !divisionCode && pathParts[2]) {
      divisionCode = pathParts[2]
    }
    if (item.level >= 5 && !classCode && pathParts[3]) {
      classCode = pathParts[3]
    }

    let levelNames = item.level_names || {
      l1: 'Category',
      l2: 'Sub-Category',
      l3: 'Division',
      l4: 'Class',
      l5: 'Sub-Class'
    }

    // If editing a sub-level, fetch parent category to get level_names
    if (item.level > 1 && categoryCode) {
      try {
        const res = await categoryHierarchy.getCategory(categoryCode)
        if (res.data && res.data.level_names) {
          levelNames = res.data.level_names
        }
      } catch (error) {
        console.error('Failed to fetch parent category level names:', error)
      }
    }

    const editFormData = {
      level: item.level,
      code: item.code,
      name: item.name,
      description: item.description || '',
      category_code: categoryCode,
      sub_category_code: subCategoryCode,
      division_code: divisionCode,
      class_code: classCode,
      item_type: item.item_type || '',
      level_names: levelNames,
      has_color: item.has_color ?? true,
      has_size: item.has_size ?? true,
      has_fabric: item.has_fabric ?? false,
      has_brand: item.has_brand ?? true,
      default_hsn_code: item.default_hsn_code || '',
      default_gst_rate: item.default_gst_rate || 5.0,
      icon: item.icon || 'Package',
      color_code: item.color_code || '#10b981',
      sort_order: item.sort_order || 0,
    }

    // Build hierarchy path for editing - include current item
    const editHierarchyPath = buildHierarchyPath(item)
    setHierarchyPath(editHierarchyPath)

    setFormData(editFormData)
    setFormErrors({})
    setPanelMode('edit')
    setShowPanel(true)
    setShowItemTypePanel(false)

    // Load existing specifications for editing
    try {
      const specsResponse = await specificationApi.get(item.code.toUpperCase())
      const specsData = specsResponse.data
      if (specsData && specsData.specifications) {
        // Map the API response to the local state format
        const specs = specsData.specifications
        setSpecifications({
          colour: specs.colour ? { 
            enabled: specs.colour.enabled || false, 
            required: specs.colour.required || false, 
            groups: specs.colour.groups || [] 
          } : { enabled: false, required: false, groups: [] },
          size: specs.size ? { 
            enabled: specs.size.enabled || false, 
            required: specs.size.required || false, 
            groups: specs.size.groups || [] 
          } : { enabled: false, required: false, groups: [] },
          uom: specs.uom ? { 
            enabled: specs.uom.enabled || false, 
            required: specs.uom.required || false, 
            groups: specs.uom.groups || [] 
          } : { enabled: false, required: false, groups: [] },
          vendor: specs.vendor ? { 
            enabled: specs.vendor.enabled || false, 
            required: specs.vendor.required || false, 
            groups: specs.vendor.groups || [] 
          } : { enabled: false, required: false, groups: [] },
          brand: specs.brand ? { 
            enabled: specs.brand.enabled || false, 
            required: specs.brand.required || false, 
            groups: specs.brand.groups || [] 
          } : { enabled: false, required: false, groups: [] },
          supplier_group: specs.supplier_group || specs.supplier ? { 
            enabled: (specs.supplier_group?.enabled || specs.supplier?.enabled) || false, 
            required: (specs.supplier_group?.required || specs.supplier?.required) || false, 
            groups: (specs.supplier_group?.groups || specs.supplier?.groups) || [] 
          } : { enabled: false, required: false, groups: [] }
        })
        setCustomFields(specsData.custom_fields || [])
        console.log('Loaded specifications for category:', item.code, specsData.specifications)
      } else {
        // Reset to defaults if no specifications data
        setSpecifications({
          colour: { enabled: false, required: false, groups: [] },
          size: { enabled: false, required: false, groups: [] },
          uom: { enabled: false, required: false, groups: [] },
          vendor: { enabled: false, required: false, groups: [] },
          brand: { enabled: false, required: false, groups: [] },
          supplier_group: { enabled: false, required: false, groups: [] }
        })
        setCustomFields([])
      }
    } catch (error) {
      // If no specifications exist yet, reset to defaults
      console.log('No existing specifications found for category:', item.code, error.message)
      setSpecifications({
        colour: { enabled: false, required: false, groups: [] },
        size: { enabled: false, required: false, groups: [] },
        uom: { enabled: false, required: false, groups: [] },
        vendor: { enabled: false, required: false, groups: [] },
        brand: { enabled: false, required: false, groups: [] },
        supplier_group: { enabled: false, required: false, groups: [] }
      })
      setCustomFields([])
    }

    // Fetch dropdown options with the extracted parent codes
    await fetchDropdownOptions(item.level, editFormData)
  }

  // Item Type handlers
  const openItemTypeCreate = () => {
    setItemTypeFormData(DEFAULT_ITEM_TYPE_FORM)
    setItemTypeMode('create')
    setShowItemTypePanel(true)
    setShowPanel(false)
  }

  const openItemTypeEdit = (type) => {
    setItemTypeFormData({
      type_code: type.value,
      type_name: type.name,
      description: type.description || '',
      color_code: type.color || '#10b981',
      icon: type.icon || 'Package',
      allow_purchase: type.allow_purchase ?? true,
      allow_sale: type.allow_sale ?? false,
      track_inventory: type.track_inventory ?? true,
      require_quality_check: type.require_quality_check ?? false,
      default_uom: type.default_uom || 'PCS',
      sort_order: type.sort_order || 0,
    })
    setItemTypeMode('edit')
    setShowItemTypePanel(true)
    setShowPanel(false)
  }

  const handleItemTypeSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        type_code: itemTypeFormData.type_code.toUpperCase(),
        type_name: itemTypeFormData.type_name,
        description: itemTypeFormData.description || '',
        color_code: itemTypeFormData.color_code,
        icon: itemTypeFormData.icon,
        allow_purchase: itemTypeFormData.allow_purchase,
        allow_sale: itemTypeFormData.allow_sale,
        track_inventory: itemTypeFormData.track_inventory,
        require_quality_check: itemTypeFormData.require_quality_check,
        default_uom: itemTypeFormData.default_uom,
        sort_order: itemTypeFormData.sort_order,
      }

      if (itemTypeMode === 'create') {
        await itemTypes.create(payload)
        setSuccessMessage('Item Type created successfully!')
      } else {
        await itemTypes.update(itemTypeFormData.type_code, payload)
        setSuccessMessage('Item Type updated successfully!')
      }

      // Close panel and show success animation
      setShowItemTypePanel(false)

      // Small delay to ensure smooth transition
      setTimeout(() => {
        setShowSuccessAnimation(true)
      }, 100)

      // Refresh list immediately, then hide animation
      await fetchItemTypes()

      setTimeout(() => {
        setShowSuccessAnimation(false)
      }, 2000)
    } catch (error) {
      // Handle both string and array error formats
      let message = 'Operation failed'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation errors
          message = error.response.data.detail.map(err => err.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail
        }
      }
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleItemTypeDelete = async (type) => {
    if (!window.confirm(`Are you sure you want to delete "${type.name}" (${type.value})?\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      await itemTypes.delete(type.value)
      toast.success('Item Type deleted successfully!')
      fetchItemTypes()
    } catch (error) {
      // Handle both string and array error formats
      let message = 'Delete failed'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation errors
          message = error.response.data.detail.map(err => err.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail
        }
      }
      toast.error(message)
    }
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
    
    // Clear hierarchy path when level changes
    setHierarchyPath([])

    await fetchDropdownOptions(level, {})
  }

  const handleParentChange = async (field, value) => {
    const newData = { ...formData, [field]: value }

    // Clear dependent fields
    if (field === 'category_code') {
      newData.sub_category_code = ''
      newData.division_code = ''
      newData.class_code = ''

      // Fetch parent category's level_names and update hierarchy path
      if (value) {
        try {
          const response = await categoryHierarchy.getOne('categories', value)
          if (response.data?.level_names) {
            setParentLevelNames(response.data.level_names)
          }
          // Update hierarchy path with selected parent
          if (response.data) {
            const parentNode = response.data
            setHierarchyPath([{
              level: 1,
              code: parentNode.code || value,
              name: parentNode.name || value
            }])
          }
        } catch (error) {
          console.error('Failed to fetch category level names:', error)
          // Still update hierarchy path with code as fallback
          const foundNode = findNodeByCode(value)
          if (foundNode) {
            setHierarchyPath([{
              level: 1,
              code: value,
              name: foundNode.name
            }])
          }
        }
      } else {
        setHierarchyPath([])
      }
    } else if (field === 'sub_category_code') {
      newData.division_code = ''
      newData.class_code = ''
      
      // Update hierarchy path for L3
      if (value && newData.category_code) {
        try {
          // Get L1 parent name
          const l1Node = findNodeByCode(newData.category_code)
          // Get L2 parent name
          const l2Node = findNodeByCode(value)
          
          const newPath = []
          if (l1Node) {
            newPath.push({ level: 1, code: newData.category_code, name: l1Node.name })
          }
          if (l2Node) {
            newPath.push({ level: 2, code: value, name: l2Node.name })
          }
          setHierarchyPath(newPath)
        } catch (error) {
          console.error('Failed to build hierarchy path for L3:', error)
        }
      }
    } else if (field === 'division_code') {
      newData.class_code = ''
      
      // Update hierarchy path for L4
      if (value && newData.category_code && newData.sub_category_code) {
        try {
          // Get L1 parent name
          const l1Node = findNodeByCode(newData.category_code)
          // Get L2 parent name
          const l2Node = findNodeByCode(newData.sub_category_code)
          // Get L3 parent name
          const l3Node = findNodeByCode(value)
          
          const newPath = []
          if (l1Node) {
            newPath.push({ level: 1, code: newData.category_code, name: l1Node.name })
          }
          if (l2Node) {
            newPath.push({ level: 2, code: newData.sub_category_code, name: l2Node.name })
          }
          if (l3Node) {
            newPath.push({ level: 3, code: value, name: l3Node.name })
          }
          setHierarchyPath(newPath)
        } catch (error) {
          console.error('Failed to build hierarchy path for L4:', error)
        }
      }
    } else if (field === 'class_code') {
      // Update hierarchy path for L5
      if (value && newData.category_code && newData.sub_category_code && newData.division_code) {
        try {
          // Get all parent names
          const l1Node = findNodeByCode(newData.category_code)
          const l2Node = findNodeByCode(newData.sub_category_code)
          const l3Node = findNodeByCode(newData.division_code)
          const l4Node = findNodeByCode(value)
          
          const newPath = []
          if (l1Node) {
            newPath.push({ level: 1, code: newData.category_code, name: l1Node.name })
          }
          if (l2Node) {
            newPath.push({ level: 2, code: newData.sub_category_code, name: l2Node.name })
          }
          if (l3Node) {
            newPath.push({ level: 3, code: newData.division_code, name: l3Node.name })
          }
          if (l4Node) {
            newPath.push({ level: 4, code: value, name: l4Node.name })
          }
          setHierarchyPath(newPath)
        } catch (error) {
          console.error('Failed to build hierarchy path for L5:', error)
        }
      }
    }

    setFormData(newData)
    await fetchDropdownOptions(formData.level, newData)
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.item_type) {
      errors.item_type = 'Item Type is required'
    }

    if (!formData.code || formData.code.length < 2 || formData.code.length > 4) {
      errors.code = 'Code must be 2-4 characters'
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
        item_type: formData.item_type,
        icon: formData.icon,
        color_code: formData.color_code,
        sort_order: formData.sort_order,
      }
      
      // Add level-specific fields for Level 1
      if (formData.level === 1) {
        payload.level_names = formData.level_names
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
      
      if (panelMode === 'create') {
        await categoryHierarchy.create(levelConfig.key, payload)
        setSuccessMessage(`${levelConfig.name} created successfully!`)
      } else {
        await categoryHierarchy.update(levelConfig.key, formData.code, payload)
        setSuccessMessage(`${levelConfig.name} updated successfully!`)
      }

      // Update parent category level_names if we are at a sub-level
      if (formData.level > 1 && formData.category_code) {
        try {
          await categoryHierarchy.update('categories', formData.category_code, {
            level_names: formData.level_names
          })
        } catch (err) {
          console.error('Failed to update parent category level names:', err)
        }
      }

      // Save specifications configuration for all category levels (both create and edit)
      try {
        const specsPayload = {
          category_code: formData.code.toUpperCase(),
          category_name: formData.name,
          category_level: formData.level,
          specifications: {
            colour: specifications.colour.enabled ? {
              enabled: specifications.colour.enabled,
              required: specifications.colour.required,
              groups: specifications.colour.groups
            } : undefined,
            size: specifications.size.enabled ? {
              enabled: specifications.size.enabled,
              required: specifications.size.required,
              groups: specifications.size.groups
            } : undefined,
            uom: specifications.uom.enabled ? {
              enabled: specifications.uom.enabled,
              required: specifications.uom.required,
              groups: specifications.uom.groups
            } : undefined,
            vendor: specifications.vendor.enabled ? {
              enabled: specifications.vendor.enabled,
              required: specifications.vendor.required,
              groups: specifications.vendor.groups
            } : undefined,
            brand: specifications.brand.enabled ? {
              enabled: specifications.brand.enabled,
              required: specifications.brand.required,
              groups: specifications.brand.groups
            } : undefined,
            supplier_group: specifications.supplier_group.enabled ? {
              enabled: specifications.supplier_group.enabled,
              required: specifications.supplier_group.required,
              groups: specifications.supplier_group.groups
            } : undefined,
          },
          custom_fields: customFields
        }

        await specificationApi.createOrUpdate(formData.code.toUpperCase(), specsPayload)
        console.log('Saved specifications for category:', formData.code, 'at level', formData.level)
      } catch (error) {
        console.error('Error saving specifications:', error)
        toast.error(`Category ${panelMode === 'create' ? 'created' : 'updated'} but specifications failed to save`)
      }

      // Close panel and show success animation
      setShowPanel(false)

      // Small delay to ensure smooth transition
      setTimeout(() => {
        setShowSuccessAnimation(true)
      }, 100)

      // Refresh data immediately
      await fetchTree()
      await fetchList()

      // Hide animation after delay
      setTimeout(() => {
        setShowSuccessAnimation(false)
      }, 2000)
    } catch (error) {
      // Handle both string and array error formats
      let message = 'Operation failed'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation errors
          message = error.response.data.detail.map(err => err.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail
        }
      }
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
      // Handle both string and array error formats
      let message = 'Delete failed'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation errors
          message = error.response.data.detail.map(err => err.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail
        }
      }
      toast.error(message)
    }
  }

  // Panel resize handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return

      const mainContainer = document.querySelector('.flex.flex-1.overflow-hidden.relative')
      if (!mainContainer) return

      const containerRect = mainContainer.getBoundingClientRect()
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Constrain between 30% and 70%
      if (newWidth >= 30 && newWidth <= 70) {
        setLeftPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }
  }, [isResizing])

  // Drag and Drop handlers
  const canDrop = useCallback((draggedNode, targetNode) => {
    if (!draggedNode || !targetNode) return false

    // Can't drop on itself
    if (draggedNode.code === targetNode.code) return false

    // Can't drop Level 1 items (categories can't be moved)
    if (draggedNode.level === 1) return false

    // Can't drop on a descendant of itself
    const isDescendant = (node, potentialAncestor) => {
      if (node.code === potentialAncestor.code) return true
      if (!potentialAncestor.children) return false
      return potentialAncestor.children.some(child => isDescendant(node, child))
    }
    if (isDescendant(targetNode, draggedNode)) return false

    // Target must be one level above the dragged item
    // Level 2 can only be dropped on Level 1
    // Level 3 can only be dropped on Level 2, etc.
    if (targetNode.level !== draggedNode.level - 1) return false

    return true
  }, [])

  const handleDragStart = useCallback((e, node) => {
    if (node.level === 1) {
      e.preventDefault()
      return
    }

    setDraggedItem(node)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.code)
  }, [])

  const handleDragOver = useCallback((e, node) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedItem) {
      return
    }

    setDropTarget(node)

    if (!canDrop(draggedItem, node)) {
      e.dataTransfer.dropEffect = 'none'
      return
    }

    e.dataTransfer.dropEffect = 'move'
  }, [draggedItem, canDrop])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback((e, targetNode) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedItem || !canDrop(draggedItem, targetNode)) {
      toast.error('Invalid drop: Cannot move here!')
      setDraggedItem(null)
      setDropTarget(null)
      setIsDragging(false)
      return
    }

    // Show confirmation modal
    setPendingMoveData({ draggedItem, targetNode })
    setShowMoveConfirm(true)
    setDraggedItem(null)
    setDropTarget(null)
    setIsDragging(false)
  }, [draggedItem, canDrop])

  const executeMoveItem = useCallback(async () => {
    if (!pendingMoveData) return

    const { draggedItem, targetNode } = pendingMoveData

    try {
      // Prepare the update payload based on the level
      const levelConfig = LEVELS[draggedItem.level - 1]
      const payload = {
        [levelConfig.codeField]: draggedItem.code,
        [levelConfig.nameField]: draggedItem.name,
        description: draggedItem.description || null,
        item_type: draggedItem.item_type,
        icon: draggedItem.icon,
        color_code: draggedItem.color_code,
        sort_order: draggedItem.sort_order,
      }

      // Update parent references based on target node's level and path
      if (draggedItem.level >= 2) {
        // For Level 2: parent is the target (Level 1)
        if (draggedItem.level === 2) {
          payload.category_code = targetNode.code
        }
        // For Level 3: parent is target (Level 2), also need the category
        else if (draggedItem.level === 3) {
          const pathParts = targetNode.path?.split('/') || []
          payload.category_code = pathParts[0] || targetNode.category_code
          payload.sub_category_code = targetNode.code
        }
        // For Level 4: parent is target (Level 3)
        else if (draggedItem.level === 4) {
          const pathParts = targetNode.path?.split('/') || []
          payload.category_code = pathParts[0] || targetNode.category_code
          payload.sub_category_code = pathParts[1] || targetNode.sub_category_code
          payload.division_code = targetNode.code
        }
        // For Level 5: parent is target (Level 4)
        else if (draggedItem.level === 5) {
          const pathParts = targetNode.path?.split('/') || []
          payload.category_code = pathParts[0] || targetNode.category_code
          payload.sub_category_code = pathParts[1] || targetNode.sub_category_code
          payload.division_code = pathParts[2] || targetNode.division_code
          payload.class_code = targetNode.code
        }
      }

      // Call the API to update
      await categoryHierarchy.update(levelConfig.key, draggedItem.code, payload)

      toast.success(`${draggedItem.name} moved successfully!`)

      // Refresh the tree
      fetchTree()
      fetchList()
    } catch (error) {
      // Handle both string and array error formats
      let message = 'Failed to move item'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation errors
          message = error.response.data.detail.map(err => err.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail
        }
      }
      toast.error(message)
    } finally {
      setShowMoveConfirm(false)
      setPendingMoveData(null)
    }
  }, [pendingMoveData, fetchTree, fetchList])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDropTarget(null)
    setIsDragging(false)
  }, [])



  // Individual category click - directly open edit
  const handleCategoryClick = (category) => {
    // Directly open edit modal instead of preview
    openEditModal(category)
  }

  const closePreviewPanel = () => {
    setShowPreviewPanel(false)
    setPreviewPanelData(null)
  }



  // Render tree node
  const renderTreeNode = (node, depth = 0) => {
    const hasChildren = node.children?.length > 0
    const isExpanded = expandedNodes.has(node.code)
    const levelConfig = LEVELS[node.level - 1]
    const IconComponent = levelConfig?.icon || Package

    const isBeingDragged = draggedItem?.code === node.code
    const isValidDropTarget = draggedItem && canDrop(draggedItem, node)
    const isCurrentDropTarget = dropTarget?.code === node.code

    return (
      <div key={node.code}>
        <div
          draggable={node.level > 1}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          onDragEnd={handleDragEnd}
          className={`flex items-center py-2 px-3 border-b group transition-all ${
            isBeingDragged
              ? 'opacity-50 bg-gray-100'
              : isCurrentDropTarget && isValidDropTarget
              ? 'bg-emerald-100 border-emerald-500 border-2 scale-105'
              : isCurrentDropTarget && !isValidDropTarget
              ? 'bg-red-100 border-red-500 border-2'
              : isValidDropTarget && isDragging
              ? 'bg-emerald-50 hover:bg-emerald-100'
              : isDragging && !isValidDropTarget
              ? 'bg-red-50 opacity-50'
              : 'hover:bg-gray-50'
          } ${node.level > 1 ? 'cursor-move' : 'cursor-pointer'}`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Drag Handle - Only for Level 2-5 */}
          {node.level > 1 && (
            <div className="mr-1 text-gray-400 group-hover:text-gray-600 cursor-move">
              <GripVertical size={16} />
            </div>
          )}

          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.code)
              }}
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
          <div 
            className="flex-1 min-w-0 cursor-pointer hover:bg-blue-50 rounded p-1 transition-colors"
            onClick={() => handleCategoryClick(node)}
            title="Click to edit category"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{node.name}</span>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">
                {node.code}
              </span>
              {/* SKU Category Code badge for Level 1-5 */}
              {node.sku_category_code && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono font-bold" title="SKU Category Code">
                  SKU: {node.sku_category_code}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {levelConfig?.name}
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
    <div className="flex flex-col h-full">
      {/* Sticky Top Bar */}
      <div className="bg-white p-4 border-b flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
        {/* View Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition text-sm font-medium ${
              viewMode === 'tree' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderTree size={18} /> Tree
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition text-sm font-medium ${
              viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List size={18} /> List
          </button>
          <button
            onClick={() => setViewMode('types')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition text-sm font-medium ${
              viewMode === 'types' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings size={18} /> Item Types
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={() => openCreateModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition shadow-sm"
        >
          <Plus size={20} />
          Add Category
        </button>
      </div>

      {/* Main Content - Fixed Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Tree/List/Types View */}
        <div className="w-1/2 overflow-auto p-6 border-r bg-gray-50">
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
                  <option key={l.level} value={l.level}>{l.name}</option>
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SKU Prefix</th>
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
                      <tr 
                        key={`${item.level}-${item.code}`} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openEditModal(item)}
                      >
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
                        <td className="px-4 py-3">
                          {item.level === 5 && item.sku_prefix ? (
                            <span className="font-mono text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded">
                              {item.sku_prefix}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
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
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
            <div className="border-b p-4 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Item Types</h2>
                <p className="text-sm text-gray-500">10 types for complete apparel manufacturing workflow</p>
              </div>
              <button
                onClick={openItemTypeCreate}
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition"
              >
                <Plus size={18} /> Add New Item Type
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-4">
              {itemTypesList.map((type) => (
                <div
                  key={type.value}
                  className="border rounded-lg p-4 hover:shadow-md transition group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: type.color }}
                    >
                      <Package size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
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
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openItemTypeEdit(type)}
                        className="p-2 hover:bg-blue-100 rounded text-blue-600"
                        title="Edit Item Type"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleItemTypeDelete(type)}
                        className="p-2 hover:bg-red-100 rounded text-red-600"
                        title="Delete Item Type"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Counts */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Category Statistics</h3>
          <div className="grid grid-cols-5 gap-3">
            {LEVELS.map((level) => {
              const IconComponent = level.icon
              // Count items at this level from unfiltered data
              const count = allItemsData.filter(item => item.level === level.level).length
              return (
                <div 
                  key={level.level} 
                  className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-gray-100 hover:border-gray-200 transition"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: level.color }}
                  >
                    <IconComponent size={18} className="text-white" />
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{level.name}</div>
                  <div className="text-2xl font-bold text-gray-800">{count}</div>
                </div>
              )
            })}
          </div>
        </div>
        </div>
        {/* End Left Panel */}

        {/* Right Panel - Always visible Edit/Add Area */}
        <div className="w-1/2 bg-white overflow-auto">
          {/* Show Form Panel when editing/creating category */}
          {showPanel ? (
            <>
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold">
                    {panelMode === 'create' 
                      ? hierarchyPath.length > 0 
                        ? `Add ${LEVELS[formData.level - 1]?.name || 'Category'} under ${hierarchyPath[hierarchyPath.length - 1]?.name}`
                        : 'Create New Category'
                      : `Edit: ${formData.name || 'Category'}`
                    }
                  </h2>
                  {panelMode === 'edit' && (
                    <p className="text-emerald-100 text-sm">
                      {hierarchyPath.map(h => h.name).join(' > ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-white/20 rounded transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <form onSubmit={handleSubmit} className="p-4 text-sm">
              {/* Step 1: Select Item Type */}
              <div className={`mb-6 p-4 rounded-lg border-2 ${
                formErrors.item_type 
                  ? 'bg-red-50 border-red-300' 
                  : panelMode === 'edit' && formData.item_type
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-blue-50 border-blue-200'
              }`}>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Step 1: Select Item Type <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {itemTypesList.map((type) => {
                    const isSelected = formData.item_type === type.value
                    const isEditMode = panelMode === 'edit'
                    
                    return (
                      <label
                        key={type.value}
                        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? isEditMode
                              ? 'border-emerald-500 bg-emerald-100 shadow-md ring-2 ring-emerald-200'
                              : 'border-blue-500 bg-blue-100 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                        }`}
                      >
                        <input
                          type="radio"
                          name="item_type"
                          value={type.value}
                          checked={isSelected}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, item_type: e.target.value }))
                            setFormErrors(prev => ({ ...prev, item_type: null }))
                          }}
                          className="sr-only"
                        />
                        <span 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {type.value}
                        </span>
                        <span className="text-xs text-gray-600">{type.name}</span>
                        {isSelected && (
                          <div className="flex items-center gap-1 ml-1">
                            <Check size={16} className={isEditMode ? "text-emerald-600" : "text-blue-600"} />
                            {isEditMode && (
                              <span className="text-[10px] font-semibold text-emerald-700">ACTIVE</span>
                            )}
                          </div>
                        )}
                      </label>
                    )
                  })}
                </div>
                {formErrors.item_type && (
                  <p className="text-red-500 text-xs mt-2">{formErrors.item_type}</p>
                )}
              </div>

              {/* Step 2: Category Hierarchy */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Step 2: Category Hierarchy
                </label>
                
                {/* Show existing hierarchy path (parent levels) */}
                {hierarchyPath.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {hierarchyPath.map((item, index) => {
                      const levelConfig = LEVELS[item.level - 1]
                      const IconComponent = levelConfig?.icon || Package
                      // For editing, show all levels including current
                      // For creating, show only parent levels (exclude current level being created)
                      const isCurrentEditLevel = panelMode === 'edit' && item.level === formData.level
                      
                      return (
                        <div
                          key={item.code}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                            isCurrentEditLevel
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: levelConfig?.color }}
                          >
                            <IconComponent size={16} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <span className="text-gray-500">L{item.level}</span>
                              <span className="text-gray-400">-</span>
                              <span className="text-gray-900">{item.name}</span>
                            </div>
                          </div>
                          {isCurrentEditLevel && (
                            <Check size={20} className="text-emerald-600" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* For creating new category - show the level being created */}
                {panelMode === 'create' && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50`}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: LEVELS[formData.level - 1]?.color }}
                    >
                      {(() => {
                        const IconComponent = LEVELS[formData.level - 1]?.icon || Package
                        return <IconComponent size={16} className="text-white" />
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <span className="text-emerald-700">L{formData.level}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-emerald-700">{formData.name || <span className="italic text-gray-400">Enter name below...</span>}</span>
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-1 rounded font-medium">Creating</span>
                  </div>
                )}

                {/* Level selector - always shown when creating */}
                {panelMode === 'create' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Select category level:</p>
                    <div className="flex flex-wrap gap-2">
                      {LEVELS.map((level) => (
                        <button
                          key={level.level}
                          type="button"
                          onClick={() => handleLevelChange(level.level)}
                          className={`px-3 py-1.5 text-sm rounded-lg border-2 transition ${
                            formData.level === level.level
                              ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          L{level.level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Select Parent Hierarchy - Always shown when level > 1 */}
              {panelMode === 'create' && formData.level > 1 && (
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Step 3: Select Parent Hierarchy
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
                          className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
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
                          disabled={!formData.category_code}
                          className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
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
                          disabled={!formData.sub_category_code}
                          className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
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
                          disabled={!formData.division_code}
                          className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
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

              {/* Step 3/4: Basic Information */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {panelMode === 'create' && formData.level > 1 ? 'Step 4' : 'Step 3'}: Basic Information
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Apparel"
                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Code <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-400 ml-1">(2-4 characters)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().slice(0, 4) }))}
                      disabled={panelMode === 'edit'}
                      placeholder="e.g., APRL"
                      maxLength={4}
                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase ${
                        formErrors.code ? 'border-red-500' : 'border-gray-300'
                      } ${panelMode === 'edit' ? 'bg-gray-100' : ''}`}
                    />
                    {formErrors.code && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>
                    )}
                  </div>
                </div>

                {/* SKU Code Preview - Always shows */}
                <div className="mt-4 p-2 bg-emerald-50 border border-emerald-300 rounded-lg">
                  <label className="block text-sm text-emerald-600 mb-1">
                    SKU Code <span className="text-emerald-400">(Auto-Generated)</span>
                  </label>
                  <div className="font-mono text-lg font-bold text-emerald-700">
                    {formData.item_type}-{formData.code || '____'}
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">
                    Format: ItemType(2)-Code(4)
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    placeholder="Optional description..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
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
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  {formData.level === 1 && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Default GST %</label>
                      <select
                        value={formData.default_gst_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_gst_rate: parseFloat(e.target.value) }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

              {/* Specifications Configuration (Available for ALL Levels) */}
              <SpecificationSection
                specifications={specifications}
                setSpecifications={setSpecifications}
                variantGroups={variantGroups}
                customFields={customFields}
                setCustomFields={setCustomFields}
                categoryCode={formData.code}
              />

              {/* Panel Footer */}
              <div className="border-t pt-4 mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPanel(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
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
                        {panelMode === 'create' ? 'Create' : 'Update'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
            </>
          ) : showItemTypePanel ? (
            <>
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {itemTypeMode === 'create' ? 'Create New Item Type' : 'Edit Item Type'}
                </h2>
                <button
                  onClick={() => setShowItemTypePanel(false)}
                  className="p-1 hover:bg-white/20 rounded transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <form onSubmit={handleItemTypeSubmit} className="p-4 text-sm">
              {/* Basic Information */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Basic Information
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Code <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-400 ml-1">(2 characters)</span>
                    </label>
                    <input
                      type="text"
                      value={itemTypeFormData.type_code}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, type_code: e.target.value.toUpperCase().slice(0, 2) }))}
                      disabled={itemTypeMode === 'edit'}
                      placeholder="e.g., FG"
                      maxLength={2}
                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase ${
                        itemTypeMode === 'edit' ? 'bg-gray-100' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemTypeFormData.type_name}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, type_name: e.target.value }))}
                      placeholder="e.g., Finished Goods"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea
                    value={itemTypeFormData.description}
                    onChange={(e) => setItemTypeFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    placeholder="Optional description..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Settings
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemTypeFormData.allow_purchase}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, allow_purchase: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Purchase</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemTypeFormData.allow_sale}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, allow_sale: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Sale</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemTypeFormData.track_inventory}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, track_inventory: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Track Inventory</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemTypeFormData.require_quality_check}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, require_quality_check: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Require Quality Check</span>
                  </label>
                </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Color</label>
                    <input
                      type="color"
                      value={itemTypeFormData.color_code}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, color_code: e.target.value }))}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Default UOM</label>
                    <select
                      value={itemTypeFormData.default_uom}
                      onChange={(e) => setItemTypeFormData(prev => ({ ...prev, default_uom: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PCS">PCS - Pieces</option>
                      <option value="KG">KG - Kilograms</option>
                      <option value="MTR">MTR - Meters</option>
                      <option value="LTR">LTR - Liters</option>
                      <option value="DOZ">DOZ - Dozen</option>
                      <option value="SET">SET - Set</option>
                      <option value="ROLL">ROLL - Roll</option>
                      <option value="BOX">BOX - Box</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="border-t pt-4 mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowItemTypePanel(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        {itemTypeMode === 'create' ? 'Create' : 'Update'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
            </>
          ) : (
            /* Default Empty State - No panel active */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <FolderTree size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Category Selected</h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                Click on a category from the tree or list view to edit it, or create a new category.
              </p>
              <button
                onClick={() => openCreateModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition shadow-sm"
              >
                <Plus size={20} />
                Create New Category
              </button>
            </div>
          )}
        </div>
        {/* End Right Panel */}

        {/* Legacy Preview Panel - Hidden but kept for backwards compatibility */}
        {false && showPreviewPanel && (
          <div className="w-1/2 border-l bg-white overflow-auto">
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package size={24} />
                  <div>
                    <h2 className="text-xl font-bold">{previewPanelData?.name || 'Category'} Details</h2>
                    <p className="text-emerald-100 text-sm">{previewPanelData?.code} • Level {previewPanelData?.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      closePreviewPanel()
                      openEditModal(previewPanelData)
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={closePreviewPanel}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-6 space-y-6">
              {previewPanelData && (
                <>
                  {/* Basic Information */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Code:</label>
                        <p className="font-mono bg-gray-100 px-3 py-1 rounded text-sm mt-1">{previewPanelData.code}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Name:</label>
                        <p className="font-medium mt-1">{previewPanelData.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Level:</label>
                        <p className="text-gray-700 mt-1">{previewPanelData.level} - {LEVELS[previewPanelData.level - 1]?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status:</label>
                        <span className={`inline-block px-3 py-1 rounded text-sm mt-1 ${
                          previewPanelData.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {previewPanelData.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {previewPanelData.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Description:</label>
                          <p className="text-gray-700 text-sm mt-1 bg-gray-50 p-3 rounded">{previewPanelData.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hierarchy Information */}
                  <div className="bg-white border rounded-lg p-4">
                    <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Hierarchy Information</h5>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Full Path:</label>
                        <p className="text-gray-700 text-sm mt-1 font-mono bg-gray-50 p-2 rounded">{previewPanelData.path_name || previewPanelData.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Children Count:</label>
                          <p className="text-lg font-bold text-blue-600 mt-1">{previewPanelData.child_count || 0}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Items Count:</label>
                          <p className="text-lg font-bold text-green-600 mt-1">{previewPanelData.item_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuration Settings */}
                  <div className="bg-white border rounded-lg p-4">
                    <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Configuration Settings</h5>
                    <div className="space-y-3">
                      {previewPanelData.item_type && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Item Type:</label>
                          <p className="text-gray-700 mt-1">{previewPanelData.item_type}</p>
                        </div>
                      )}
                      {previewPanelData.default_hsn_code && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Default HSN Code:</label>
                          <p className="font-mono bg-gray-100 px-2 py-1 rounded text-sm mt-1">{previewPanelData.default_hsn_code}</p>
                        </div>
                      )}
                      {previewPanelData.default_gst_rate && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Default GST Rate:</label>
                          <p className="text-gray-700 mt-1">{previewPanelData.default_gst_rate}%</p>
                        </div>
                      )}
                      {previewPanelData.sku_prefix && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">SKU Prefix:</label>
                          <p className="font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm mt-1">{previewPanelData.sku_prefix}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features & Capabilities */}
                  {(previewPanelData.has_color || previewPanelData.has_size || previewPanelData.has_fabric || previewPanelData.has_brand) && (
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-semibold text-gray-800 border-b pb-2 mb-4">Features & Capabilities</h5>
                      <div className="flex flex-wrap gap-2">
                        {previewPanelData.has_color && (
                          <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">Color Variants</span>
                        )}
                        {previewPanelData.has_size && (
                          <span className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">Size Variants</span>
                        )}
                        {previewPanelData.has_fabric && (
                          <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">Fabric Options</span>
                        )}
                        {previewPanelData.has_brand && (
                          <span className="bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full">Brand Support</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {/* End Main Content Flex Container */}

      {/* Move Confirmation Modal */}
      {showMoveConfirm && pendingMoveData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Confirm Hierarchy Move
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  You are about to reorganize the category hierarchy. This action will:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
                  <li>Change the parent-child relationship</li>
                  <li>Update all related paths and references</li>
                  <li>Affect the entire subtree of items</li>
                  <li>Update the hierarchy structure immediately</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Move Details:</span>
              </div>
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 min-w-[80px]">Moving:</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{pendingMoveData.draggedItem.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono">{pendingMoveData.draggedItem.code}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {LEVELS[pendingMoveData.draggedItem.level - 1]?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 min-w-[80px]">New Parent:</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{pendingMoveData.targetNode.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono">{pendingMoveData.targetNode.code}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {LEVELS[pendingMoveData.targetNode.level - 1]?.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={executeMoveItem}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <GripVertical className="w-4 h-4" />
                Confirm Move
              </button>
              <button
                onClick={() => {
                  setShowMoveConfirm(false)
                  setPendingMoveData(null)
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Modal */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-scaleIn">
            <div className="flex flex-col items-center">
              {/* Animated Checkmark */}
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center animate-bounceIn shadow-lg">
                  <Check size={48} className="text-white animate-checkmark" strokeWidth={3} />
                </div>
                {/* Ripple effect */}
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
              </div>

              {/* Success Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Success!
              </h3>
              <p className="text-gray-600 text-center mb-6">
                {successMessage}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                <div className="bg-gradient-to-r from-green-400 to-emerald-600 h-full animate-progress"></div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
