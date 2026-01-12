import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Search, ChevronRight, Lock, Package, Save, FileText, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { categoryHierarchy, itemTypes, items, brands, suppliers } from '../../services/api'
import DynamicSpecificationForm from '../specifications/DynamicSpecificationForm'
import { itemSpecificationApi, specificationApi } from '../../services/specificationApi'
import { colourApi, sizeApi } from '../../services/variantApi'
import ImageUploadField from '../ImageUploadField'

// Generate next SKU
const generateSKU = (itemType = 'FG', sequence = 1) => {
  const prefix = itemType.substring(0, 2).toUpperCase()
  return `${prefix}${String(sequence).padStart(5, '0')}`
}

export default function ItemCreateForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  variant = 'modal', 
  item = null, 
  initialItemType, 
  onCancel,
  purpose = 'full' // 'full' for Item Master page (with opening stock), 'pr' for Purchase Request (no opening stock)
}) {
  // Edit mode detection - if item has no SKU/item_code, it's a copy operation (create mode)
  const isEditMode = !!item && !!item.sku && !!item.item_code
  // PR mode - simplified creation without opening stock
  const isPRMode = purpose === 'pr'
  const isFullMode = purpose === 'full'

  // Loading states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
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
    storageUom: 'PCS',
    purchaseUom: 'PCS',
  })
  
  // Form data
  const [formData, setFormData] = useState({
    uid: '',  // Unique Identifier - immutable, auto-generated
    sku: '',  // SKU - can change based on item attributes
    itemName: '',
    opening_stock: 0,
    image_id: null,
    image_url: null,
    image_name: null,
    thumbnail_url: null,
    // BASE64 image data
    image_base64: null,
    image_type: null,
    image_size: null,
  })

  // Specifications data
  const [specifications, setSpecifications] = useState({
    colour_code: null,
    size_code: null,
    uom_code: null,
    vendor_code: null,
    brand_code: null,
    supplier_code: null,
    custom_field_values: {}
  })

  // Specification configuration (includes group info)
  const [specificationConfig, setSpecificationConfig] = useState(null)

  // Draft save functionality
  const saveDraft = () => {
    const draftData = {
      formData,
      specifications,
      autoFilledData,
      selectedCategory,
      selectedSubCategory,
      selectedDivision,
      selectedClass,
      selectedSubClass,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('itemMasterDraft', JSON.stringify(draftData));
    console.log('[DRAFT] Saved draft to localStorage');
  };

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      const draft = localStorage.getItem('itemMasterDraft');
      if (draft && !isEditMode && !item) {
        try {
          const draftData = JSON.parse(draft);
          setFormData(draftData.formData || formData);
          setSpecifications(draftData.specifications || specifications);
          if (draftData.autoFilledData) setAutoFilledData(draftData.autoFilledData);
          if (draftData.selectedCategory) setSelectedCategory(draftData.selectedCategory);
          if (draftData.selectedSubCategory) setSelectedSubCategory(draftData.selectedSubCategory);
          if (draftData.selectedDivision) setSelectedDivision(draftData.selectedDivision);
          if (draftData.selectedClass) setSelectedClass(draftData.selectedClass);
          if (draftData.selectedSubClass) setSelectedSubClass(draftData.selectedSubClass);
          toast.success('Draft restored!');
          console.log('[DRAFT] Loaded draft from localStorage');
        } catch (error) {
          console.error('[DRAFT] Error loading draft:', error);
        }
      }
    };
    if (isOpen) {
      loadDraft();
    }
  }, [isOpen]);

  // Clear draft after successful submission
  const clearDraft = () => {
    localStorage.removeItem('itemMasterDraft');
    console.log('[DRAFT] Cleared draft from localStorage');
  };
  
  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      fetchItemTypes()

      // If editing an existing item, populate form with item data
      if (isEditMode && item) {
        console.log('[EDIT MODE] Loading item:', item.item_code, item)
        console.log('[EDIT MODE] Image data:', {
          has_base64: !!item.image_base64,
          has_url: !!item.image_url,
          image_type: item.image_type,
          image_size: item.image_size
        })

        // Check if item has old format SKU (no hyphens) - needs regeneration
        const currentSku = item.sku || item.item_code
        const hasOldSku = !currentSku.includes('-')

        setFormData({
          uid: item.uid || '',  // UID is immutable, load from item
          sku: currentSku,  // SKU can change based on item attributes
          itemName: item.item_name,
          opening_stock: item.opening_stock || 0,
          image_id: item.image_id,
          image_url: item.image_url,
          image_name: item.image_name,
          thumbnail_url: item.thumbnail_url,
          image_base64: item.image_base64,
          image_type: item.image_type,
          image_size: item.image_size,
        })

        // Set autoFilledData from item's existing data
        const itemTypeCode = item.sku_type_code || (currentSku.includes('-') ? currentSku.split('-')[0] : currentSku.substring(0, 2).toUpperCase()) || 'FG'
        setAutoFilledData({
          itemType: itemTypeCode,
          itemTypeName: itemTypeCode, // Will be updated when itemTypesList loads
          hsnCode: item.hsn_code || '',
          gstRate: item.gst_rate || 5,
          defaultUom: item.uom || 'PCS',
          storageUom: item.storage_uom || 'PCS',
          purchaseUom: item.purchase_uom || 'PCS',
        })
        console.log('[EDIT MODE] Set autoFilledData with itemType:', itemTypeCode)

        // Load category hierarchy with proper async handling to ensure dropdowns are populated
        const loadCategoryHierarchy = async () => {
          try {
            // Set Level 1 (Category)
            const cat = item.category_code ? { code: item.category_code, name: item.category_name } : null
            if (cat) {
              setSelectedCategory(cat)

              // Fetch and set Level 2 (Sub-Category) if exists
              if (item.sub_category_code) {
                const subCatsResponse = await categoryHierarchy.getSubCategories({
                  category_code: item.category_code,
                  is_active: true
                })
                const subCats = subCatsResponse.data || []
                setSubCategories(subCats)

                const subCat = subCats.find(sc => sc.code === item.sub_category_code) ||
                               { code: item.sub_category_code, name: item.sub_category_name }
                setSelectedSubCategory(subCat)

                // Fetch and set Level 3 (Division) if exists
                if (item.division_code) {
                  const divsResponse = await categoryHierarchy.getDivisions({
                    category_code: item.category_code,
                    sub_category_code: item.sub_category_code,
                    is_active: true
                  })
                  const divs = divsResponse.data || []
                  setDivisions(divs)

                  const div = divs.find(d => d.code === item.division_code) ||
                              { code: item.division_code, name: item.division_name }
                  setSelectedDivision(div)

                  // Fetch and set Level 4 (Class) if exists
                  if (item.class_code) {
                    const classesResponse = await categoryHierarchy.getClasses({
                      category_code: item.category_code,
                      sub_category_code: item.sub_category_code,
                      division_code: item.division_code,
                      is_active: true
                    })
                    const clss = classesResponse.data || []
                    setClasses(clss)

                    const cls = clss.find(c => c.code === item.class_code) ||
                                { code: item.class_code, name: item.class_name }
                    setSelectedClass(cls)

                    // Fetch and set Level 5 (Sub-Class) if exists
                    if (item.sub_class_code) {
                      const subClassesResponse = await categoryHierarchy.getSubClasses({
                        category_code: item.category_code,
                        sub_category_code: item.sub_category_code,
                        division_code: item.division_code,
                        class_code: item.class_code,
                        is_active: true
                      })
                      const subClss = subClassesResponse.data || []
                      setSubClasses(subClss)

                      const subCls = subClss.find(sc => sc.code === item.sub_class_code) ||
                                     { code: item.sub_class_code, name: item.sub_class_name }
                      setSelectedSubClass(subCls)
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('[EDIT MODE] Error loading category hierarchy:', error)
            // Fallback: set values directly without fetching dropdowns
            const cat = item.category_code ? { code: item.category_code, name: item.category_name } : null
            if (cat) setSelectedCategory(cat)
            const subCat = item.sub_category_code ? { code: item.sub_category_code, name: item.sub_category_name } : null
            if (subCat) setSelectedSubCategory(subCat)
            const div = item.division_code ? { code: item.division_code, name: item.division_name } : null
            if (div) setSelectedDivision(div)
            const cls = item.class_code ? { code: item.class_code, name: item.class_name } : null
            if (cls) setSelectedClass(cls)
            const subCls = item.sub_class_code ? { code: item.sub_class_code, name: item.sub_class_name } : null
            if (subCls) setSelectedSubClass(subCls)
          }
        }
        loadCategoryHierarchy()
        
        // Load existing specifications for the item
        const loadSpecifications = async () => {
          try {
            const specsResponse = await itemSpecificationApi.get(item.item_code || item.sku)
            if (specsResponse.data) {
              console.log('[EDIT MODE] Loading specifications from API:', specsResponse.data)
              setSpecifications({
                colour_code: specsResponse.data.colour_code || '',
                size_code: specsResponse.data.size_code || '',
                uom_code: specsResponse.data.uom_code || '',
                vendor_code: specsResponse.data.vendor_code || '',
                brand_code: specsResponse.data.brand_code || '',
                supplier_code: specsResponse.data.supplier_code || '',
                custom_field_values: specsResponse.data.custom_field_values || {}
              })
            }
          } catch (specError) {
            console.log('[EDIT MODE] No specifications found from API, checking item directly:', specError.message)
            // Fallback: check if item has specifications directly
            const directSpecs = {
              colour_code: item.color_id || item.colour_code || '',
              size_code: item.size_id || item.size_code || '',
              uom_code: item.uom_code || '',
              vendor_code: item.vendor_code || '',
              brand_code: item.brand_id || item.brand_code || '',
              supplier_code: item.supplier_id || item.supplier_code || '',
              custom_field_values: {}
            }
            console.log('[EDIT MODE] Using specifications from item object:', directSpecs)
            setSpecifications(directSpecs)
          }

          // Also set initial color/size names from item if available
          if (item.color_name) {
            setSpecColorName(item.color_name)
            console.log('[EDIT MODE] Set initial color name:', item.color_name)
          }
          if (item.size_name) {
            setSpecSizeName(item.size_name)
            console.log('[EDIT MODE] Set initial size name:', item.size_name)
          }
        }
        loadSpecifications()
        
        // If old format SKU, regenerate it with proper format
        if (hasOldSku) {
          const typeCode = item.item_code.substring(0, 2).toUpperCase()
          const deepestCat = item.sub_class_code || item.class_code || item.division_code || item.sub_category_code || item.category_code || 'GNRL'
          const catCode = deepestCat.substring(0, 4).toUpperCase()
          
          // Extract sequence from old item_code
          const numericPart = item.item_code.replace(/[^\d]/g, '')
          const sequence = parseInt(numericPart) || 1
          const sequenceLetter = String.fromCharCode(65 + Math.floor((sequence - 1) / 10000))
          const sequenceNum = ((sequence - 1) % 10000) + 1
          const sequenceCode = `${sequenceLetter}${String(sequenceNum).padStart(4, '0')}`
          
          const newSku = `${typeCode}-${catCode}-${sequenceCode}-0000-00`
          console.log(`[EDIT] Regenerating old SKU: ${item.item_code} -> ${newSku}`)
          
          setFormData(prev => ({ ...prev, sku: newSku }))
        }
      } else if (!isEditMode && item) {
        // COPY MODE - item is passed but SKU/item_code are empty
        console.log('[COPY MODE] Copying item:', item.item_name, 'Original codes:', {
          sku: item.sku,
          item_code: item.item_code,
          original_sku: item.original_sku,
          original_item_code: item.original_item_code
        })
        console.log('[COPY MODE] isEditMode =', isEditMode, 'item exists =', !!item)
        
        // Set form data with copied item info but NO SKU/item_code
        setFormData({
          sku: '',  // Will be generated
          itemName: item.item_name,
          stockUom: item.uom || 'PCS',
          purchaseUom: 'PCS',
          conversionFactor: 1,
          opening_stock: 0,  // Reset opening stock for copy
          image_id: item.image_id,
          image_url: item.image_url,
          image_name: item.image_name,
          thumbnail_url: item.thumbnail_url,
          image_base64: item.image_base64,
          image_type: item.image_type,
          image_size: item.image_size,
        })
        console.log('[COPY MODE] Set formData with empty SKU')

        // Load category hierarchy with proper async handling to ensure dropdowns are populated
        const loadCopyModeHierarchy = async () => {
          try {
            // Set Level 1 (Category)
            const cat = item.category_code ? { code: item.category_code, name: item.category_name } : null
            if (cat) {
              setSelectedCategory(cat)

              // Fetch and set Level 2 (Sub-Category) if exists
              if (item.sub_category_code) {
                const subCatsResponse = await categoryHierarchy.getSubCategories({
                  category_code: item.category_code,
                  is_active: true
                })
                const subCats = subCatsResponse.data || []
                setSubCategories(subCats)

                const subCat = subCats.find(sc => sc.code === item.sub_category_code) ||
                               { code: item.sub_category_code, name: item.sub_category_name }
                setSelectedSubCategory(subCat)

                // Fetch and set Level 3 (Division) if exists
                if (item.division_code) {
                  const divsResponse = await categoryHierarchy.getDivisions({
                    category_code: item.category_code,
                    sub_category_code: item.sub_category_code,
                    is_active: true
                  })
                  const divs = divsResponse.data || []
                  setDivisions(divs)

                  const div = divs.find(d => d.code === item.division_code) ||
                              { code: item.division_code, name: item.division_name }
                  setSelectedDivision(div)

                  // Fetch and set Level 4 (Class) if exists
                  if (item.class_code) {
                    const classesResponse = await categoryHierarchy.getClasses({
                      category_code: item.category_code,
                      sub_category_code: item.sub_category_code,
                      division_code: item.division_code,
                      is_active: true
                    })
                    const clss = classesResponse.data || []
                    setClasses(clss)

                    const cls = clss.find(c => c.code === item.class_code) ||
                                { code: item.class_code, name: item.class_name }
                    setSelectedClass(cls)

                    // Fetch and set Level 5 (Sub-Class) if exists
                    if (item.sub_class_code) {
                      const subClassesResponse = await categoryHierarchy.getSubClasses({
                        category_code: item.category_code,
                        sub_category_code: item.sub_category_code,
                        division_code: item.division_code,
                        class_code: item.class_code,
                        is_active: true
                      })
                      const subClss = subClassesResponse.data || []
                      setSubClasses(subClss)

                      const subCls = subClss.find(sc => sc.code === item.sub_class_code) ||
                                     { code: item.sub_class_code, name: item.sub_class_name }
                      setSelectedSubClass(subCls)
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('[COPY MODE] Error loading category hierarchy:', error)
            // Fallback: set values directly
            const cat = item.category_code ? { code: item.category_code, name: item.category_name } : null
            if (cat) setSelectedCategory(cat)
            const subCat = item.sub_category_code ? { code: item.sub_category_code, name: item.sub_category_name } : null
            if (subCat) setSelectedSubCategory(subCat)
            const div = item.division_code ? { code: item.division_code, name: item.division_name } : null
            if (div) setSelectedDivision(div)
            const cls = item.class_code ? { code: item.class_code, name: item.class_name } : null
            if (cls) setSelectedClass(cls)
            const subCls = item.sub_class_code ? { code: item.sub_class_code, name: item.sub_class_name } : null
            if (subCls) setSelectedSubClass(subCls)
          }
        }
        loadCopyModeHierarchy()

        // Determine item type - try sku_type_code first, then extract from original SKU/item_code
        let itemTypeCode = 'FG'
        if (item.sku_type_code) {
          itemTypeCode = item.sku_type_code
        } else if (item.original_sku && item.original_sku.includes('-')) {
          itemTypeCode = item.original_sku.split('-')[0]
        } else if (item.original_item_code && item.original_item_code.includes('-')) {
          itemTypeCode = item.original_item_code.split('-')[0]
        } else if (item.original_sku && item.original_sku.length >= 2) {
          itemTypeCode = item.original_sku.substring(0, 2)
        } else if (item.original_item_code && item.original_item_code.length >= 2) {
          itemTypeCode = item.original_item_code.substring(0, 2)
        }
        
        // Determine category code (use deepest level available)
        const deepestCat = item.sub_class_code || item.class_code || item.division_code || item.sub_category_code || item.category_code
        
        // Generate new SKU based on copied item's type and category
        console.log(`[COPY MODE] Generating new SKU for type: ${itemTypeCode}, category: ${deepestCat}`)
        if (deepestCat) {
          fetchNextSku(itemTypeCode, deepestCat)
        } else {
          fetchNextSku(itemTypeCode)
        }
      } else {
        // Create mode - new item from scratch
        fetchNextSku('FG')
      }
    }
  }, [isOpen, isEditMode, item])
  
  // Set initial item type when provided (from PR form)
  useEffect(() => {
    if (initialItemType && !isEditMode) {
      // Find the item type in the list and set it
      const foundItemType = itemTypesList.find(it => it.code === initialItemType)
      if (foundItemType) {
        setAutoFilledData(prev => ({
          ...prev,
          itemType: foundItemType.code,
          itemTypeName: foundItemType.name
        }))
      }
    }
  }, [initialItemType, itemTypesList, isEditMode])
  
  // Fetch next available SKU with colour and size - generates full hierarchical format with specifications
  const fetchNextSku = async (itemTypeCode, categoryCode = null, colorName = null, sizeName = null) => {
    try {
      const typeCode = itemTypeCode.substring(0, 2).toUpperCase()
      const catCode = categoryCode ? categoryCode.substring(0, 4).toUpperCase() : 'GNRL'

      // Try to use the new API endpoint that includes colour and size
      try {
        const params = new URLSearchParams({
          item_type_code: typeCode,
          category_code: catCode,
        })
        if (colorName) params.append('color', colorName)
        if (sizeName) params.append('size', sizeName)

        const response = await api.get(`/items/generate-full-sku?${params.toString()}`)
        const data = response.data

        console.log(`[SKU] Generated full SKU with specs: ${data.sku} (uid: ${data.uid})`)

        setFormData(prev => ({
          ...prev,
          sku: data.sku,
          uid: data.uid || prev.uid,  // Store UID preview
        }))
        return
      } catch (apiError) {
        console.warn('[SKU] Full SKU API failed, using fallback:', apiError.message)
      }

      // Fallback: Get the next sequence number from backend
      const response = await items.getNextSku(typeCode)
      const sequence = response.data.sequence || 1

      // Generate full SKU format: FM-ABCD-A0000-COLR-SZ
      const sequenceLetter = String.fromCharCode(65 + Math.floor((sequence - 1) / 10000))
      const sequenceNum = ((sequence - 1) % 10000) + 1
      const sequenceCode = `${sequenceLetter}${String(sequenceNum).padStart(4, '0')}`

      // Generate variant codes from colour and size
      const colorCode = colorName ? colorName.substring(0, 4).toUpperCase().padEnd(4, '0') : '0000'
      const sizeCode = sizeName ? sizeName.substring(0, 2).toUpperCase().padEnd(2, '0') : '00'

      // Build full SKU with colour and size
      const fullSku = `${typeCode}-${catCode}-${sequenceCode}-${colorCode}-${sizeCode}`

      // Generate UID preview: [ItemType 2][Category 2][Counter 4]
      const uidPreview = `${typeCode}${catCode.substring(0, 2)}0001`

      console.log(`[SKU] Generated full SKU: ${fullSku} (type=${typeCode}, cat=${catCode}, seq=${sequence})`)

      setFormData(prev => ({
        ...prev,
        sku: fullSku,
        uid: prev.uid || uidPreview,
      }))
    } catch (error) {
      console.error(`[SKU] Error fetching next SKU: ${error.message}`)
      // Fallback: still generate full format
      const typeCode = itemTypeCode.substring(0, 2).toUpperCase()
      const catCode = categoryCode ? categoryCode.substring(0, 4).toUpperCase() : 'GNRL'
      const colorCode = colorName ? colorName.substring(0, 4).toUpperCase().padEnd(4, '0') : '0000'
      const sizeCode = sizeName ? sizeName.substring(0, 2).toUpperCase().padEnd(2, '0') : '00'
      const fallbackSku = `${typeCode}-${catCode}-A0001-${colorCode}-${sizeCode}`
      console.log(`[SKU] Using fallback SKU: ${fallbackSku}`)
      setFormData(prev => ({
        ...prev,
        sku: fallbackSku
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

  // Update itemTypeName in autoFilledData when itemTypesList loads (for edit mode)
  useEffect(() => {
    if (itemTypesList.length > 0 && autoFilledData.itemType && autoFilledData.itemTypeName === autoFilledData.itemType) {
      // Find the full name for the item type code
      const foundType = itemTypesList.find(t => t.value === autoFilledData.itemType || t.code === autoFilledData.itemType)
      if (foundType) {
        setAutoFilledData(prev => ({
          ...prev,
          itemTypeName: foundType.name || foundType.label || prev.itemTypeName
        }))
        console.log('[ITEM TYPE] Updated itemTypeName from list:', foundType.name || foundType.label)
      }
    }
  }, [itemTypesList, autoFilledData.itemType])

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

      // Reset all selections first
      setSelectedCategory(null)
      setSelectedSubCategory(null)
      setSelectedDivision(null)
      setSelectedClass(null)
      setSelectedSubClass(null)

      // Find and set Level 1 (Category)
      const category = categories.find(c => c.code === result.category_code) ||
                      (result.level === 1 ? result.data : null)

      if (!category) {
        toast.error('Category not found')
        return
      }

      setSelectedCategory(category)
      await updateAutoFilledData(category)

      // If search result is at level 1, fetch sub-categories but don't auto-select
      if (result.level === 1) {
        const subCatsResponse = await categoryHierarchy.getSubCategories({
          category_code: category.code,
          is_active: true
        })
        setSubCategories(subCatsResponse.data || [])
        toast.success(`âœ“ Selected: ${result.path}`, { duration: 3000 })
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
          setSelectedSubCategory(subCat)

          // If search result is at level 2, fetch divisions but don't auto-select
          if (result.level === 2) {
            const divsResponse = await categoryHierarchy.getDivisions({
              category_code: category.code,
              sub_category_code: subCat.code,
              is_active: true
            })
            setDivisions(divsResponse.data || [])
            toast.success(`âœ“ Selected: ${result.path}`, { duration: 3000 })
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
              setSelectedDivision(div)

              // If search result is at level 3, fetch classes but don't auto-select
              if (result.level === 3) {
                const classesResponse = await categoryHierarchy.getClasses({
                  category_code: category.code,
                  sub_category_code: subCat.code,
                  division_code: div.code,
                  is_active: true
                })
                setClasses(classesResponse.data || [])
                toast.success(`âœ“ Selected: ${result.path}`, { duration: 3000 })
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
                  setSelectedClass(cls)

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
                    toast.success(`âœ“ Selected: ${result.path}`, { duration: 3000 })
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
                      setSelectedSubClass(subCls)
                    }
                  }
                }
              }
            }
          }
        }
      }

      toast.success(`âœ“ Selected: ${result.path}`, { duration: 3000 })
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
  const updateAutoFilledData = async (category) => {
    try {
      // Fetch full category data including storage_uom and purchase_uom
      const fullCategoryResponse = await categoryHierarchy.getCategory(category.code)
      const fullCategory = fullCategoryResponse.data || category
      
      const itemType = itemTypesList.find(t => t.value === fullCategory.item_type)
      
      setAutoFilledData({
        itemType: fullCategory.item_type || 'FG',
        itemTypeName: itemType?.name || fullCategory.item_type || 'Finished Goods',
        hsnCode: fullCategory.default_hsn_code || '',
        gstRate: fullCategory.default_gst_rate || 5,
        defaultUom: fullCategory.default_uom || 'PCS',
        storageUom: fullCategory.storage_uom || 'PCS',
        purchaseUom: fullCategory.purchase_uom || 'PCS',
      })

      // Fetch next available SKU for this item type (ONLY in create mode)
      if (!isEditMode) {
        // Get the deepest level category code for SKU generation
        const categoryCode = fullCategory.code
        fetchNextSku(fullCategory.item_type || 'FG', categoryCode)
      }

      // Update stock UOM
      setFormData(prev => ({
        ...prev,
        stockUom: fullCategory.default_uom || 'PCS',
      }))
    } catch (error) {
      console.error('Error fetching full category data:', error)
      // Fallback to the provided category object
      const itemType = itemTypesList.find(t => t.value === category.item_type)
      setAutoFilledData({
        itemType: category.item_type || 'FG',
        itemTypeName: itemType?.name || category.item_type || 'Finished Goods',
        hsnCode: category.default_hsn_code || '',
        gstRate: category.default_gst_rate || 5,
        defaultUom: category.default_uom || 'PCS',
        storageUom: category.storage_uom || 'PCS',
        purchaseUom: category.purchase_uom || 'PCS',
      })
    }
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

  // Get the most specific category code for specifications
  const effectiveCategoryCode = useMemo(() => {
    // Use the deepest level category that's been selected
    if (selectedSubClass) return selectedSubClass.code
    if (selectedClass) return selectedClass.code
    if (selectedDivision) return selectedDivision.code
    if (selectedSubCategory) return selectedSubCategory.code
    if (selectedCategory) return selectedCategory.code
    return null
  }, [selectedCategory, selectedSubCategory, selectedDivision, selectedClass, selectedSubClass])

  // Fetch specification configuration for the effective category
  useEffect(() => {
    const fetchSpecificationConfig = async () => {
      if (effectiveCategoryCode) {
        try {
          const response = await specificationApi.get(effectiveCategoryCode);
          setSpecificationConfig(response.data);
          console.log('[SPEC CONFIG] Loaded for category:', effectiveCategoryCode, response.data);
        } catch (error) {
          console.log('[SPEC CONFIG] No configuration found for category:', effectiveCategoryCode);
          setSpecificationConfig(null);
        }
      }
    };
    fetchSpecificationConfig();
  }, [effectiveCategoryCode])

  // Track colour and size names for SKU generation
  const [specColorName, setSpecColorName] = useState(null)
  const [specSizeName, setSpecSizeName] = useState(null)

  // Update colour name when colour_code changes
  useEffect(() => {
    const fetchColorName = async () => {
      if (specifications.colour_code) {
        try {
          const colorRes = await colourApi.get(specifications.colour_code)
          if (colorRes.data) {
            setSpecColorName(colorRes.data.colour_name)
          }
        } catch (error) {
          console.warn('Failed to fetch color name for SKU:', error)
        }
      } else {
        setSpecColorName(null)
      }
    }
    fetchColorName()
  }, [specifications.colour_code])

  // Update size name when size_code changes
  useEffect(() => {
    const fetchSizeName = async () => {
      if (specifications.size_code) {
        try {
          const sizeRes = await sizeApi.get(specifications.size_code)
          if (sizeRes.data) {
            setSpecSizeName(sizeRes.data.size_name)
          }
        } catch (error) {
          console.warn('Failed to fetch size name for SKU:', error)
        }
      } else {
        setSpecSizeName(null)
      }
    }
    fetchSizeName()
  }, [specifications.size_code])

  // Regenerate full SKU whenever category, colour, or size changes
  useEffect(() => {
    if (!isEditMode && effectiveCategoryCode && autoFilledData.itemType) {
      // Use the deepest level category code for SKU generation with colour and size
      const itemTypeCode = autoFilledData.itemType
      console.log(`[SKU] Regenerating SKU - category: ${effectiveCategoryCode}, color: ${specColorName}, size: ${specSizeName}`)
      fetchNextSku(itemTypeCode, effectiveCategoryCode, specColorName, specSizeName)
    }
  }, [effectiveCategoryCode, isEditMode, autoFilledData.itemType, specColorName, specSizeName])

  // Handle BASE64 image upload
  const handleImageChange = (file, base64Data, imageType) => {
    setFormData({
      ...formData,
      image_base64: base64Data,
      image_type: imageType,
      image_size: file?.size || null,
      image_name: file?.name || null
    })
  }

  // Fetch names from specification codes
  const fetchSpecificationNames = async () => {
    const names = {
      color_name: '',
      size_name: '',
      uom_name: '',
      brand_name: '',
      supplier_name: '',
    };

    try {
      // Fetch color name if color_code is specified
      if (specifications.colour_code) {
        try {
          const colorRes = await colourApi.get(specifications.colour_code);
          if (colorRes.data) {
            names.color_name = colorRes.data.colour_name;
          }
        } catch (error) {
          console.warn('Failed to fetch color name:', error);
        }
      }

      // Fetch size name if size_code is specified
      if (specifications.size_code) {
        try {
          const sizeRes = await sizeApi.get(specifications.size_code);
          if (sizeRes.data) {
            names.size_name = sizeRes.data.size_name;
          }
        } catch (error) {
          console.warn('Failed to fetch size name:', error);
        }
      }

      // Fetch brand name if brand_code is specified
      if (specifications.brand_code) {
        try {
          const brandRes = await brands.get(specifications.brand_code);
          if (brandRes.data) {
            names.brand_name = brandRes.data.brand_name;
          }
        } catch (error) {
          console.warn('Failed to fetch brand name:', error);
        }
      }

      // Fetch supplier name if supplier_code is specified
      if (specifications.supplier_code) {
        try {
          const supplierRes = await suppliers.get(specifications.supplier_code);
          if (supplierRes.data) {
            names.supplier_name = supplierRes.data.supplier_name;
          }
        } catch (error) {
          console.warn('Failed to fetch supplier name:', error);
        }
      }
      
    } catch (error) {
      console.error('Error fetching specification names:', error);
    }

    return names;
  };

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
    
    console.log('[SUBMIT] Mode:', isEditMode ? 'EDIT' : 'CREATE', 'SKU:', formData.sku, 'Item:', formData.itemName)

    setSaving(true)

    try {
      // Only check for duplicates in create mode
      if (!isEditMode) {
        console.log('[SUBMIT] Checking if SKU exists:', formData.sku)
        const checkResponse = await items.checkExists(formData.sku)
        if (checkResponse.data && checkResponse.data.length > 0) {
          const existingItem = checkResponse.data[0]
          if (existingItem.item_code === formData.sku) {
            toast.error(`Item already exists: ${existingItem.item_code} - ${existingItem.item_name}`, {
              duration: 5000,
              icon: 'âš ï¸',
            })
            setSaving(false)
            return
          }
        }
      }

      // Fetch specification names (color_name, size_name, etc.)
      const specNames = await fetchSpecificationNames();

      const payload = {
        item_code: formData.sku,
        item_name: formData.itemName,
        item_description: '',
        // SKU Fields (send the full SKU and its components)
        sku: formData.sku,
        sku_type_code: formData.sku ? formData.sku.split('-')[0] : null,
        sku_category_code: formData.sku ? formData.sku.split('-')[1] : null,
        sku_sequence: formData.sku ? formData.sku.split('-')[2] : null,
        sku_variant1: formData.sku ? formData.sku.split('-')[3] : null,
        sku_variant2: formData.sku ? formData.sku.split('-')[4] : null,
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
        // Specification fields
        color_id: specifications.colour_code || null,
        color_name: specNames.color_name || null,
        size_id: specifications.size_code || null,
        size_name: specNames.size_name || null,
        brand_id: specifications.brand_code || null,
        brand_name: specNames.brand_name || null,
        supplier_id: specifications.supplier_code || null,
        supplier_name: specNames.supplier_name || null,
        uom: autoFilledData.defaultUom || 'PCS',  // Use category's default UOM
        hsn_code: autoFilledData.hsnCode,
        gst_rate: autoFilledData.gstRate,
        inventory_type: 'stocked',
        cost_price: 0,
        selling_price: 0,
        mrp: 0,
        opening_stock: parseFloat(formData.opening_stock) || 0,
        // BASE64 image data (preferred approach)
        image_base64: formData.image_base64,
        image_type: formData.image_type,
        image_size: formData.image_size,
        image_name: formData.image_name,
        // Legacy file server fields (for backwards compatibility)
        image_id: formData.image_id,
        image_url: formData.image_url,
        thumbnail_url: formData.thumbnail_url,
      }

      // Create or update based on mode
      let response
      if (isEditMode) {
        console.log('[UPDATE] Item code:', formData.sku)
        console.log('[UPDATE] Payload:', {
          ...payload,
          image_base64: payload.image_base64 ? `${payload.image_base64.substring(0, 50)}...` : null,
          has_image: !!payload.image_base64
        })
        response = await items.update(formData.sku, payload)
        
        // Save specifications on update as well
        const hasSpecifications = specifications.colour_code ||
                                  specifications.size_code ||
                                  specifications.uom_code ||
                                  specifications.vendor_code ||
                                  specifications.brand_code ||
                                  specifications.supplier_code ||
                                  Object.keys(specifications.custom_field_values || {}).length > 0;

        if (hasSpecifications && effectiveCategoryCode) {
          try {
            console.log('[UPDATE] Saving specifications:', {
              itemCode: formData.sku,
              categoryCode: effectiveCategoryCode,
              specifications: specifications
            });
            await itemSpecificationApi.createOrUpdate(
              formData.sku,
              effectiveCategoryCode,
              specifications
            );
            console.log('[UPDATE] Specifications saved successfully')
          } catch (specError) {
            console.error('Error saving specifications:', specError);
            console.error('Error response:', specError.response?.data);
            toast.error(`Item updated but specifications could not be saved: ${specError.response?.data?.detail || specError.message}`, { duration: 4000 });
          }
        }
        
        toast.success('Item updated successfully!')
      } else {
        response = await api.post('/items/', payload)

        // Save specifications if any are filled (only on create)
        const hasSpecifications = specifications.colour_code ||
                                  specifications.size_code ||
                                  specifications.uom_code ||
                                  specifications.vendor_code ||
                                  specifications.brand_code ||
                                  specifications.supplier_code ||
                                  Object.keys(specifications.custom_field_values || {}).length > 0;

        if (hasSpecifications && effectiveCategoryCode) {
          try {
            await itemSpecificationApi.createOrUpdate(
              formData.sku,
              effectiveCategoryCode,
              specifications
            );
          } catch (specError) {
            console.error('Error saving specifications:', specError);
            toast.error('Item created but specifications could not be saved', { duration: 4000 });
          }
        }

        toast.success(isDraft ? 'Item saved as draft!' : 'Item created successfully!')

        // Clear draft after successful creation
        clearDraft();

        // Fetch next SKU for the same item type (only on create)
        await fetchNextSku(autoFilledData.itemType || 'FG')
      }

      if (!isEditMode) resetForm()
      
      // Call onSuccess callback with created/updated item data if provided
      if (onSuccess && response?.data) {
        onSuccess(response.data)
      } else {
        onSuccess?.()
      }
      
      // Close modal if onCancel is provided (from PR form), otherwise use onClose
      if (onCancel) {
        onCancel()
      } else {
        onClose()
      }
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
      opening_stock: 0,
      image_id: null,
      image_url: null,
      image_name: null,
      thumbnail_url: null,
      image_base64: null,
      image_type: null,
      image_size: null,
    })
    setSearchTerm('')
  }

  if (!isOpen) return null

  // Panel variant: render inline without overlay
  if (variant === 'panel') {
    return (
      <div className="bg-white rounded-xl shadow-md w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {isEditMode ? 'Edit Item' : (isPRMode ? 'Add Line Item' : 'Create New Item')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              title="Quick Search Categories"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">

          {/* Full Screen Search Overlay */}
          {showSearch && (
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
                      onClick={() => {
                        setShowSearch(false)
                        setSearchTerm('')
                        setShowSearchResults(false)
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="p-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => {
                          if (searchResults.length > 0) setShowSearchResults(true)
                        }}
                        placeholder="Search categories by name or code (Level 1-5)..."
                        className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>

                    {/* Search Results */}
                    {showSearchResults && (
                      <div className="mt-4 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                        {searching && (
                          <div className="p-6 text-center text-gray-500">
                            <div className="animate-spin inline-block w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                            <span className="ml-3 text-base">Searching...</span>
                          </div>
                        )}

                        {!searching && searchResults.length === 0 && (
                          <div className="p-6 text-center text-gray-500">
                            <AlertCircle className="w-6 h-6 inline-block mb-2" />
                            <div className="text-base">No categories found</div>
                            <p className="text-sm mt-1">Try a different search term</p>
                          </div>
                        )}

                        {!searching && searchResults.length > 0 && (
                          <>
                            <div className="p-3 bg-blue-50 border-b-2 border-blue-200 text-sm font-semibold text-blue-800">
                              Found {searchResults.length} categor{searchResults.length > 1 ? 'ies' : 'y'} - Click to auto-select
                            </div>
                            {searchResults.map((result) => (
                              <div
                                key={result.id}
                                onClick={() => {
                                  handleSelectCategoryHierarchy(result)
                                  setShowSearch(false)
                                }}
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
            </div>
          )}

          {/* Step 1: Category Hierarchy */}
          {/* Reuse same content below */}
          {/* The rest of the form content remains identical */}
          {/* Category hierarchy, auto-filled, item details, UOM, specifications */}
          {/* We simply continue rendering the exact content as in modal variant */}
          {/* Step 1: Category Hierarchy */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
              Select item category <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              {/* Level 1 - always visible */}
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
                  {/* Include selected category if not in list (for edit mode timing) */}
                  {selectedCategory && !categories.find(c => c.code === selectedCategory.code) && (
                    <option key={selectedCategory.code} value={selectedCategory.code}>
                      {selectedCategory.name}
                    </option>
                  )}
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 2 - visible when sub-categories exist OR selectedSubCategory is set (edit mode) */}
              {(subCategories.length > 0 || selectedSubCategory) && (
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
                    {/* Include selected sub-category if not in list (for edit mode timing) */}
                    {selectedSubCategory && !subCategories.find(c => c.code === selectedSubCategory.code) && (
                      <option key={selectedSubCategory.code} value={selectedSubCategory.code}>
                        {selectedSubCategory.name}
                      </option>
                    )}
                    {subCategories.map(subCat => (
                      <option key={subCat.code} value={subCat.code}>
                        {subCat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 3 - visible when divisions exist OR selectedDivision is set (edit mode) */}
              {(divisions.length > 0 || selectedDivision) && (
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
                    {/* Include selected division if not in list (for edit mode timing) */}
                    {selectedDivision && !divisions.find(d => d.code === selectedDivision.code) && (
                      <option key={selectedDivision.code} value={selectedDivision.code}>
                        {selectedDivision.name}
                      </option>
                    )}
                    {divisions.map(div => (
                      <option key={div.code} value={div.code}>
                        {div.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 4 - visible when classes exist OR selectedClass is set (edit mode) */}
              {(classes.length > 0 || selectedClass) && (
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
                    {/* Include selected class if not in list (for edit mode timing) */}
                    {selectedClass && !classes.find(c => c.code === selectedClass.code) && (
                      <option key={selectedClass.code} value={selectedClass.code}>
                        {selectedClass.name}
                      </option>
                    )}
                    {classes.map(cls => (
                      <option key={cls.code} value={cls.code}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 5 - visible when sub-classes exist OR selectedSubClass is set (edit mode) */}
              {(subClasses.length > 0 || selectedSubClass) && (
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
                    {/* Include selected sub-class if not in list (for edit mode timing) */}
                    {selectedSubClass && !subClasses.find(c => c.code === selectedSubClass.code) && (
                      <option key={selectedSubClass.code} value={selectedSubClass.code}>
                        {selectedSubClass.name}
                      </option>
                    )}
                    {subClasses.map(subCls => (
                      <option key={subCls.code} value={subCls.code}>
                        {subCls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Path Display */}
            {hierarchyPath && (
              <div className="bg-blue-50 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-blue-600 font-medium">ðŸ“ Path:</span>
                <span className="text-blue-800">{hierarchyPath}</span>
              </div>
            )}
          </div>

          {/* Step 2: Item Details */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
              ITEM DETAILS
            </h3>

            {/* Card-like Layout: Image on Left, Details on Right */}
            <div className="flex gap-4 items-start">
              {/* Left: Image Section */}
              <div className="flex-shrink-0" style={{ width: '220px' }}>
                <ImageUploadField
                  onImageChange={handleImageChange}
                  currentImage={formData.image_base64 ? `data:${formData.image_type};base64,${formData.image_base64}` : null}
                />
              </div>

              {/* Right: Item Type, UID, SKU and Item Name */}
              <div className="flex-1 space-y-3">
                {/* Item Type - Fixed from Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Item Type</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={autoFilledData.itemType ? `${autoFilledData.itemType} - ${autoFilledData.itemTypeName}` : ''}
                      readOnly
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed text-sm"
                    />
                    <Lock className="absolute right-3 top-2.5 w-4 h-4 text-green-600" />
                  </div>
                </div>

                {/* UID - Unique Identifier (Immutable) */}
                {(isEditMode || formData.uid) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      <span className="flex items-center gap-2">
                        <span>Unique ID (UID)</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isEditMode ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isEditMode ? 'Cannot be changed' : 'Auto-generated'}
                        </span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.uid}
                        readOnly
                        placeholder={!isEditMode ? 'Will be generated on save' : ''}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg font-mono text-sm font-semibold cursor-not-allowed ${
                          isEditMode
                            ? 'border-amber-300 bg-amber-50 text-amber-900'
                            : 'border-blue-300 bg-blue-50 text-blue-900'
                        }`}
                      />
                      <Lock className={`absolute right-3 top-2.5 w-4 h-4 ${isEditMode ? 'text-amber-500' : 'text-blue-500'}`} />
                    </div>
                    {!isEditMode && (
                      <p className="text-xs text-gray-500 mt-1">Format: [ItemType][Category][Counter] e.g., FGRN0001</p>
                    )}
                  </div>
                )}

                {/* SKU - Stock Keeping Unit (Can change based on item attributes) */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    <span className="flex items-center gap-2">
                      <span>SKU (Stock Keeping Unit)</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isEditMode ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {isEditMode ? 'Updates with changes' : 'Auto-generated'}
                      </span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.sku}
                      readOnly
                      className="w-full px-3 py-2 pr-10 border border-gray-300 bg-gray-50 text-gray-900 rounded-lg font-mono text-sm font-semibold cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    SKU is generated based on item type, category, and sequence
                  </p>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* UOM Display from Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Storage UOM</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={autoFilledData.storageUom || 'PCS'}
                        readOnly
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed text-sm"
                      />
                      <Lock className="absolute right-3 top-2.5 w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">From category</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Purchase UOM</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={autoFilledData.purchaseUom || 'PCS'}
                        readOnly
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed text-sm"
                      />
                      <Lock className="absolute right-3 top-2.5 w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">From category</p>
                  </div>
                </div>

                {/* Opening Stock - Only show for full mode */}
                {isFullMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      {isEditMode ? 'Current Stock' : 'Opening Stock'}
                      <span className="text-xs text-gray-500 ml-2">
                        {isEditMode ? '(Inventory quantity)' : '(Initial inventory quantity)'}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.opening_stock}
                      onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Unit: {autoFilledData.storageUom || 'PCS'}</p>
                  </div>
                )}

                {/* Created Date (Edit Mode) */}
                {isEditMode && item?.created_at && (
                  <div className="text-xs text-gray-500 mt-2">
                    Created: {new Date(item.created_at).toLocaleString()}
                    {item.updated_at && ` | Last Updated: ${new Date(item.updated_at).toLocaleString()}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Step 3: Specifications */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">3</span>
              SPECIFICATIONS
              <span className="text-sm text-gray-500 font-normal">(Based on Category Configuration)</span>
            </h3>

            <DynamicSpecificationForm key={`spec-${isEditMode ? formData.sku : "new"}-${specifications.colour_code || ""}-${specifications.size_code || ""}`} categoryCode={effectiveCategoryCode}
              initialValues={specifications}
              onSpecificationsChange={setSpecifications}
              onSaveDraft={saveDraft}
              showTitle={false}
            />
          </div>
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
          {isFullMode && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="px-5 py-2.5 border border-blue-600 rounded-lg text-blue-600 hover:bg-blue-50 font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Save as Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving || !selectedCategory || !formData.itemName.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? (isEditMode ? 'Updating...' : (isPRMode ? 'Adding...' : 'Creating...')) : (isEditMode ? 'Update' : (isPRMode ? 'Add' : 'Create'))}
          </button>
        </div>
      </div>
    )
  }

  // Default modal variant
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {isEditMode ? 'Edit Item' : (isPRMode ? 'Add Line Item' : 'Create New Item')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              title="Quick Search Categories"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">

          {/* Full Screen Search Overlay */}
          {showSearch && (
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
                      onClick={() => {
                        setShowSearch(false)
                        setSearchTerm('')
                        setShowSearchResults(false)
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="p-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => {
                          if (searchResults.length > 0) setShowSearchResults(true)
                        }}
                        placeholder="Search categories by name or code (Level 1-5)..."
                        className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>

                    {/* Search Results */}
                    {showSearchResults && (
                      <div className="mt-4 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                        {searching && (
                          <div className="p-6 text-center text-gray-500">
                            <div className="animate-spin inline-block w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                            <span className="ml-3 text-base">Searching...</span>
                          </div>
                        )}

                        {!searching && searchResults.length === 0 && (
                          <div className="p-6 text-center text-gray-500">
                            <AlertCircle className="w-6 h-6 inline-block mb-2" />
                            <div className="text-base">No categories found</div>
                            <p className="text-sm mt-1">Try a different search term</p>
                          </div>
                        )}

                        {!searching && searchResults.length > 0 && (
                          <>
                            <div className="p-3 bg-blue-50 border-b-2 border-blue-200 text-sm font-semibold text-blue-800">
                              Found {searchResults.length} categor{searchResults.length > 1 ? 'ies' : 'y'} - Click to auto-select
                            </div>
                            {searchResults.map((result) => (
                              <div
                                key={result.id}
                                onClick={() => {
                                  handleSelectCategoryHierarchy(result)
                                  setShowSearch(false)
                                }}
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
            </div>
          )}

          {/* Step 1: Category Hierarchy */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
              Select item category <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              {/* Level 1 - always visible */}
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
                  {/* Include selected category if not in list (for edit mode timing) */}
                  {selectedCategory && !categories.find(c => c.code === selectedCategory.code) && (
                    <option key={selectedCategory.code} value={selectedCategory.code}>
                      {selectedCategory.name}
                    </option>
                  )}
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 2 - visible when sub-categories exist OR selectedSubCategory is set (edit mode) */}
              {(subCategories.length > 0 || selectedSubCategory) && (
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
                    {/* Include selected sub-category if not in list (for edit mode timing) */}
                    {selectedSubCategory && !subCategories.find(c => c.code === selectedSubCategory.code) && (
                      <option key={selectedSubCategory.code} value={selectedSubCategory.code}>
                        {selectedSubCategory.name}
                      </option>
                    )}
                    {subCategories.map(subCat => (
                      <option key={subCat.code} value={subCat.code}>
                        {subCat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 3 - visible when divisions exist OR selectedDivision is set (edit mode) */}
              {(divisions.length > 0 || selectedDivision) && (
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
                    {/* Include selected division if not in list (for edit mode timing) */}
                    {selectedDivision && !divisions.find(d => d.code === selectedDivision.code) && (
                      <option key={selectedDivision.code} value={selectedDivision.code}>
                        {selectedDivision.name}
                      </option>
                    )}
                    {divisions.map(div => (
                      <option key={div.code} value={div.code}>
                        {div.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 4 - visible when classes exist OR selectedClass is set (edit mode) */}
              {(classes.length > 0 || selectedClass) && (
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
                    {/* Include selected class if not in list (for edit mode timing) */}
                    {selectedClass && !classes.find(c => c.code === selectedClass.code) && (
                      <option key={selectedClass.code} value={selectedClass.code}>
                        {selectedClass.name}
                      </option>
                    )}
                    {classes.map(cls => (
                      <option key={cls.code} value={cls.code}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 5 - visible when sub-classes exist OR selectedSubClass is set (edit mode) */}
              {(subClasses.length > 0 || selectedSubClass) && (
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
                    {/* Include selected sub-class if not in list (for edit mode timing) */}
                    {selectedSubClass && !subClasses.find(c => c.code === selectedSubClass.code) && (
                      <option key={selectedSubClass.code} value={selectedSubClass.code}>
                        {selectedSubClass.name}
                      </option>
                    )}
                    {subClasses.map(subCls => (
                      <option key={subCls.code} value={subCls.code}>
                        {subCls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Path Display */}
            {hierarchyPath && (
              <div className="bg-blue-50 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-blue-600 font-medium">ðŸ“ Path:</span>
                <span className="text-blue-800">{hierarchyPath}</span>
              </div>
            )}
          </div>

          {/* Step 2: Item Details */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
              ITEM DETAILS
            </h3>

            {/* Card-like Layout: Image on Left, Details on Right */}
            <div className="flex gap-4 items-start">
              {/* Left: Image Section */}
              <div className="flex-shrink-0" style={{ width: '220px' }}>
                <ImageUploadField
                  onImageChange={handleImageChange}
                  currentImage={formData.image_base64 ? `data:${formData.image_type};base64,${formData.image_base64}` : null}
                />
              </div>

              {/* Right: Item Type, UID, SKU and Item Name */}
              <div className="flex-1 space-y-3">
                {/* Item Type - Fixed from Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Item Type</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={autoFilledData.itemType ? `${autoFilledData.itemType} - ${autoFilledData.itemTypeName}` : ''}
                      readOnly
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed text-sm"
                    />
                    <Lock className="absolute right-3 top-2.5 w-4 h-4 text-green-600" />
                  </div>
                </div>

                {/* UID - Unique Identifier (Immutable) */}
                {(isEditMode || formData.uid) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      <span className="flex items-center gap-2">
                        <span>Unique ID (UID)</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isEditMode ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isEditMode ? 'Cannot be changed' : 'Auto-generated'}
                        </span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.uid}
                        readOnly
                        placeholder={!isEditMode ? 'Will be generated on save' : ''}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg font-mono text-sm font-semibold cursor-not-allowed ${
                          isEditMode
                            ? 'border-amber-300 bg-amber-50 text-amber-900'
                            : 'border-blue-300 bg-blue-50 text-blue-900'
                        }`}
                      />
                      <Lock className={`absolute right-3 top-2.5 w-4 h-4 ${isEditMode ? 'text-amber-500' : 'text-blue-500'}`} />
                    </div>
                    {!isEditMode && (
                      <p className="text-xs text-gray-500 mt-1">Format: [ItemType][Category][Counter] e.g., FGRN0001</p>
                    )}
                  </div>
                )}

                {/* SKU - Stock Keeping Unit (Can change based on item attributes) */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    <span className="flex items-center gap-2">
                      <span>SKU (Stock Keeping Unit)</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isEditMode ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {isEditMode ? 'Updates with changes' : 'Auto-generated'}
                      </span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.sku}
                      readOnly
                      className="w-full px-3 py-2 pr-10 border border-gray-300 bg-gray-50 text-gray-900 rounded-lg font-mono text-sm font-semibold cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    SKU is generated based on item type, category, and sequence
                  </p>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    placeholder="e.g., Men's Round Neck Cotton T-Shirt"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* UOM Display from Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Storage UOM</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={autoFilledData.storageUom || 'PCS'}
                        readOnly
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed text-sm"
                      />
                      <Lock className="absolute right-3 top-2.5 w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">From category</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Purchase UOM</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={autoFilledData.purchaseUom || 'PCS'}
                        readOnly
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-green-50 text-gray-700 cursor-not-allowed text-sm"
                      />
                      <Lock className="absolute right-3 top-2.5 w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">From category</p>
                  </div>
                </div>

                {/* Opening Stock - Only show for full mode */}
                {isFullMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      {isEditMode ? 'Current Stock' : 'Opening Stock'}
                      <span className="text-xs text-gray-500 ml-2">
                        {isEditMode ? '(Inventory quantity)' : '(Initial inventory quantity)'}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.opening_stock}
                      onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Unit: {autoFilledData.storageUom || 'PCS'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Step 3: Specifications */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">3</span>
              SPECIFICATIONS
              <span className="text-sm text-gray-500 font-normal">(Based on Category Configuration)</span>
            </h3>

            <DynamicSpecificationForm key={`spec-${isEditMode ? formData.sku : "new"}-${specifications.colour_code || ""}-${specifications.size_code || ""}`} categoryCode={effectiveCategoryCode}
              initialValues={specifications}
              onSpecificationsChange={setSpecifications}
              onSaveDraft={saveDraft}
              showTitle={false}
            />
          </div>
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
          {isFullMode && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="px-5 py-2.5 border border-blue-600 rounded-lg text-blue-600 hover:bg-blue-50 font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Save as Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving || !selectedCategory || !formData.itemName.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? (isEditMode ? 'Updating...' : (isPRMode ? 'Adding...' : 'Creating...')) : (isEditMode ? 'Update' : (isPRMode ? 'Add' : 'Create'))}
          </button>
        </div>
      </div>
    </div>
  )
}








