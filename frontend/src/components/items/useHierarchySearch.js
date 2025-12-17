import { useState, useCallback, useRef } from 'react'
import { categoryHierarchy } from '../../services/api'

/**
 * Custom hook for managing category hierarchy search and cascading dropdowns
 * Handles: search across all levels, cascading dropdowns, reverse-fill logic
 */
export const useHierarchySearch = () => {
  // Cache for fetched data (prevent refetching)
  const cache = useRef({
    categories: null,
    subCategories: {},
    divisions: {},
    classes: {},
    subClasses: {},
  })

  // State
  const [allCategoriesData, setAllCategoriesData] = useState([])
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [divisions, setDivisions] = useState([])
  const [classes, setClasses] = useState([])
  const [subClasses, setSubClasses] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Fetch all categories (top level)
  const fetchAllCategories = useCallback(async (forceRefresh = false) => {
    if (cache.current.categories && !forceRefresh) {
      setCategories(cache.current.categories)
      return cache.current.categories
    }

    try {
      const response = await categoryHierarchy.getCategories({ is_active: true })
      const data = response.data || []
      cache.current.categories = data
      setAllCategoriesData(data)
      setCategories(data)
      return data
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  }, [])

  // Fetch sub-categories for a specific category
  const fetchSubCategories = useCallback(async (categoryCode) => {
    if (!categoryCode) {
      setSubCategories([])
      return []
    }

    const cacheKey = `sub_${categoryCode}`
    if (cache.current.subCategories[cacheKey]) {
      setSubCategories(cache.current.subCategories[cacheKey])
      return cache.current.subCategories[cacheKey]
    }

    try {
      const response = await categoryHierarchy.getSubCategories({
        category_code: categoryCode,
        is_active: true,
      })
      const data = response.data || []
      cache.current.subCategories[cacheKey] = data
      setSubCategories(data)
      return data
    } catch (error) {
      console.error('Error fetching sub-categories:', error)
      setSubCategories([])
      return []
    }
  }, [])

  // Fetch divisions for a specific sub-category
  const fetchDivisions = useCallback(async (categoryCode, subCategoryCode) => {
    if (!categoryCode || !subCategoryCode) {
      setDivisions([])
      return []
    }

    const cacheKey = `div_${categoryCode}_${subCategoryCode}`
    if (cache.current.divisions[cacheKey]) {
      setDivisions(cache.current.divisions[cacheKey])
      return cache.current.divisions[cacheKey]
    }

    try {
      const response = await categoryHierarchy.getDivisions({
        category_code: categoryCode,
        sub_category_code: subCategoryCode,
        is_active: true,
      })
      const data = response.data || []
      cache.current.divisions[cacheKey] = data
      setDivisions(data)
      return data
    } catch (error) {
      console.error('Error fetching divisions:', error)
      setDivisions([])
      return []
    }
  }, [])

  // Fetch classes for a specific division
  const fetchClasses = useCallback(async (categoryCode, subCategoryCode, divisionCode) => {
    if (!categoryCode || !subCategoryCode || !divisionCode) {
      setClasses([])
      return []
    }

    const cacheKey = `cls_${categoryCode}_${subCategoryCode}_${divisionCode}`
    if (cache.current.classes[cacheKey]) {
      setClasses(cache.current.classes[cacheKey])
      return cache.current.classes[cacheKey]
    }

    try {
      const response = await categoryHierarchy.getClasses({
        category_code: categoryCode,
        sub_category_code: subCategoryCode,
        division_code: divisionCode,
        is_active: true,
      })
      const data = response.data || []
      cache.current.classes[cacheKey] = data
      setClasses(data)
      return data
    } catch (error) {
      console.error('Error fetching classes:', error)
      setClasses([])
      return []
    }
  }, [])

  // Fetch sub-classes for a specific class
  const fetchSubClasses = useCallback(async (categoryCode, subCategoryCode, divisionCode, classCode) => {
    if (!categoryCode || !subCategoryCode || !divisionCode || !classCode) {
      setSubClasses([])
      return []
    }

    const cacheKey = `subcls_${categoryCode}_${subCategoryCode}_${divisionCode}_${classCode}`
    if (cache.current.subClasses[cacheKey]) {
      setSubClasses(cache.current.subClasses[cacheKey])
      return cache.current.subClasses[cacheKey]
    }

    try {
      const response = await categoryHierarchy.getSubClasses({
        category_code: categoryCode,
        sub_category_code: subCategoryCode,
        division_code: divisionCode,
        class_code: classCode,
        is_active: true,
      })
      const data = response.data || []
      cache.current.subClasses[cacheKey] = data
      setSubClasses(data)
      return data
    } catch (error) {
      console.error('Error fetching sub-classes:', error)
      setSubClasses([])
      return []
    }
  }, [])

  /**
   * CRITICAL: Search across ALL 5 levels and return formatted results
   * This loads all data once, then filters locally (faster & better UX)
   */
  const searchAllLevels = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 1) {
      return []
    }

    setSearchLoading(true)
    try {
      const searchLower = searchTerm.toLowerCase()
      const results = []

      // Fetch all level data in parallel
      const [catsRes, subCatsRes, divsRes, clsRes, subClsRes] = await Promise.all([
        categoryHierarchy.getCategories({ is_active: true }),
        categoryHierarchy.getSubCategories({ is_active: true }),
        categoryHierarchy.getDivisions({ is_active: true }),
        categoryHierarchy.getClasses({ is_active: true }),
        categoryHierarchy.getSubClasses({ is_active: true }),
      ])

      // LEVEL 1: Categories
      (catsRes.data || []).forEach(cat => {
        if (
          cat.name.toLowerCase().includes(searchLower) ||
          cat.code.toLowerCase().includes(searchLower)
        ) {
          results.push({
            ...cat,
            level: 1,
            levelName: 'Category',
            fullPath: cat.name,
            displayText: `${cat.code} - ${cat.name}`,
          })
        }
      })

      // LEVEL 2: Sub-Categories (with parent info)
      (subCatsRes.data || []).forEach(subCat => {
        if (
          subCat.name.toLowerCase().includes(searchLower) ||
          subCat.code.toLowerCase().includes(searchLower)
        ) {
          results.push({
            ...subCat,
            level: 2,
            levelName: 'Sub-Category',
            fullPath: `${subCat.category_name} > ${subCat.name}`,
            displayText: `${subCat.code} - ${subCat.name}`,
          })
        }
      })

      // LEVEL 3: Divisions
      (divsRes.data || []).forEach(div => {
        if (
          div.name.toLowerCase().includes(searchLower) ||
          div.code.toLowerCase().includes(searchLower)
        ) {
          results.push({
            ...div,
            level: 3,
            levelName: 'Division',
            fullPath: `${div.category_name} > ${div.sub_category_name} > ${div.name}`,
            displayText: `${div.code} - ${div.name}`,
          })
        }
      })

      // LEVEL 4: Classes
      (clsRes.data || []).forEach(cls => {
        if (
          cls.name.toLowerCase().includes(searchLower) ||
          cls.code.toLowerCase().includes(searchLower)
        ) {
          results.push({
            ...cls,
            level: 4,
            levelName: 'Class',
            fullPath: `${cls.category_name} > ${cls.sub_category_name} > ${cls.division_name} > ${cls.name}`,
            displayText: `${cls.code} - ${cls.name}`,
          })
        }
      })

      // LEVEL 5: Sub-Classes
      (subClsRes.data || []).forEach(subCls => {
        if (
          subCls.name.toLowerCase().includes(searchLower) ||
          subCls.code.toLowerCase().includes(searchLower)
        ) {
          results.push({
            ...subCls,
            level: 5,
            levelName: 'Sub-Class',
            fullPath: `${subCls.category_name} > ${subCls.sub_category_name} > ${subCls.division_name} > ${subCls.class_name} > ${subCls.name}`,
            displayText: `${subCls.code} - ${subCls.name}`,
          })
        }
      })

      // Sort by level first, then by relevance (code match > name match)
      results.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level
        const aIsCodeMatch = a.code.toLowerCase().includes(searchLower)
        const bIsCodeMatch = b.code.toLowerCase().includes(searchLower)
        if (aIsCodeMatch && !bIsCodeMatch) return -1
        if (!aIsCodeMatch && bIsCodeMatch) return 1
        return a.name.localeCompare(b.name)
      })

      return results.slice(0, 20) // Limit to 20 results
    } catch (error) {
      console.error('Search error:', error)
      return []
    } finally {
      setSearchLoading(false)
    }
  }, [])

  /**
   * CRITICAL: Reverse-fill logic
   * When user selects a lower-level item (e.g., Sub-Class),
   * automatically populate all parent levels above it
   */
  const reverseFillHierarchy = useCallback(async (selectedItem) => {
    const hierarchy = {
      category: null,
      subCategory: null,
      division: null,
      class: null,
      subClass: null,
    }

    try {
      // Handle each level
      switch (selectedItem.level) {
        case 1: // Category selected
          hierarchy.category = selectedItem
          await fetchSubCategories(selectedItem.code)
          break

        case 2: // Sub-Category selected
          hierarchy.subCategory = selectedItem
          hierarchy.category = await findCategoryByCode(selectedItem.category_code)
          if (hierarchy.category) {
            await fetchSubCategories(hierarchy.category.code)
            await fetchDivisions(hierarchy.category.code, selectedItem.code)
          }
          break

        case 3: // Division selected
          hierarchy.division = selectedItem
          hierarchy.subCategory = await findSubCategoryByCode(selectedItem.sub_category_code)
          hierarchy.category = await findCategoryByCode(selectedItem.category_code)
          
          if (hierarchy.category && hierarchy.subCategory) {
            await fetchSubCategories(hierarchy.category.code)
            await fetchDivisions(hierarchy.category.code, hierarchy.subCategory.code)
            await fetchClasses(hierarchy.category.code, hierarchy.subCategory.code, selectedItem.code)
          }
          break

        case 4: // Class selected
          hierarchy.class = selectedItem
          hierarchy.division = await findDivisionByCode(selectedItem.division_code)
          hierarchy.subCategory = await findSubCategoryByCode(selectedItem.sub_category_code)
          hierarchy.category = await findCategoryByCode(selectedItem.category_code)
          
          if (hierarchy.category && hierarchy.subCategory && hierarchy.division) {
            await fetchSubCategories(hierarchy.category.code)
            await fetchDivisions(hierarchy.category.code, hierarchy.subCategory.code)
            await fetchClasses(hierarchy.category.code, hierarchy.subCategory.code, hierarchy.division.code)
            await fetchSubClasses(
              hierarchy.category.code,
              hierarchy.subCategory.code,
              hierarchy.division.code,
              selectedItem.code
            )
          }
          break

        case 5: // Sub-Class selected
          hierarchy.subClass = selectedItem
          hierarchy.class = await findClassByCode(selectedItem.class_code)
          hierarchy.division = await findDivisionByCode(selectedItem.division_code)
          hierarchy.subCategory = await findSubCategoryByCode(selectedItem.sub_category_code)
          hierarchy.category = await findCategoryByCode(selectedItem.category_code)
          
          if (hierarchy.category && hierarchy.subCategory && hierarchy.division && hierarchy.class) {
            await fetchSubCategories(hierarchy.category.code)
            await fetchDivisions(hierarchy.category.code, hierarchy.subCategory.code)
            await fetchClasses(
              hierarchy.category.code,
              hierarchy.subCategory.code,
              hierarchy.division.code
            )
            await fetchSubClasses(
              hierarchy.category.code,
              hierarchy.subCategory.code,
              hierarchy.division.code,
              hierarchy.class.code
            )
          }
          break
      }

      return hierarchy
    } catch (error) {
      console.error('Error in reverse fill:', error)
      return hierarchy
    }
  }, [fetchSubCategories, fetchDivisions, fetchClasses, fetchSubClasses])

  // Helper functions to find items by code
  const findCategoryByCode = useCallback(async (code) => {
    let cats = categories
    if (!cats || cats.length === 0) {
      cats = await fetchAllCategories()
    }
    return cats.find(c => c.code === code)
  }, [categories, fetchAllCategories])

  const findSubCategoryByCode = useCallback((code) => {
    return subCategories.find(s => s.code === code)
  }, [subCategories])

  const findDivisionByCode = useCallback((code) => {
    return divisions.find(d => d.code === code)
  }, [divisions])

  const findClassByCode = useCallback((code) => {
    return classes.find(c => c.code === code)
  }, [classes])

  return {
    // States
    categories,
    subCategories,
    divisions,
    classes,
    subClasses,
    searchLoading,
    
    // Methods
    fetchAllCategories,
    fetchSubCategories,
    fetchDivisions,
    fetchClasses,
    fetchSubClasses,
    searchAllLevels,
    reverseFillHierarchy,
  }
}