"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RotateCcw, Loader2, ChevronRight, ChevronDown, Copy, Save, Hash, Image, EyeOff, Eye, ExternalLink, Undo, Plus, Trash2, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, TaxonomyItem } from "@/types/tesco"

const TAXONOMY_QUERY = `
  query GetTaxonomy(
    $storeId: ID
    $includeInspirationEvents: Boolean
    $style: String
    $categoryId: String
  ) {
    taxonomy(
      storeId: $storeId
      includeInspirationEvents: $includeInspirationEvents
      categoryId: $categoryId
    ) {
      id
      name
      label
      pageType
      images(style: $style) {
        style
        images {
          type
          url
          region
          title
        }
      }
      children {
        id
        name
        label
        pageType
        images(style: $style) {
          style
          images {
            type
            url
            region
            title
          }
        }
        children {
          id
          name
          label
          pageType
          images(style: $style) {
            style
            images {
              type
                url
              region
              title
            }
          }
          children {
            id
            name
            label
            pageType
            images(style: $style) {
              style
              images {
                type
                url
                region
                title
              }
            }
          }
        }
      }
    }
  }
`

interface CategoryWithParent extends TaxonomyItem {
  parentId?: string
  hidden?: boolean
}

interface SavedTaxonomy {
  id: string
  name: string
  data: TaxonomyItem[]
  createdAt: string
  isActive: boolean
}

export default function TaxonomyTestPage() {
  const router = useRouter()
  const [originalData, setOriginalData] = useState<TaxonomyItem[] | null>(null)
  const [editedData, setEditedData] = useState<CategoryWithParent[] | null>(null)
  const [loadingReset, setLoadingReset] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingParents, setEditingParents] = useState<Record<string, string>>({})
  const [editingRanks, setEditingRanks] = useState<Record<string, number>>({})
  const [editingNames, setEditingNames] = useState<Record<string, string>>({})
  const [editingImages, setEditingImages] = useState<Record<string, string>>({})
  const [newCategoryName, setNewCategoryName] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingReset, setPendingReset] = useState(false)
  const [selectedPrototype, setSelectedPrototype] = useState<string>("")
  const [history, setHistory] = useState<CategoryWithParent[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Multi-taxonomy state
  const [savedTaxonomies, setSavedTaxonomies] = useState<SavedTaxonomy[]>([])
  const [currentTaxonomyId, setCurrentTaxonomyId] = useState<string>("")
  const [newTaxonomyName, setNewTaxonomyName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Pin code protection
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)

  const CORRECT_PIN = "2430"

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput === CORRECT_PIN) {
      setIsAuthenticated(true)
      setPinError(false)
      // Store authentication in sessionStorage (expires when browser closes)
      sessionStorage.setItem('taxonomyEditorAuth', 'true')
    } else {
      setPinError(true)
      setPinInput("")
      setTimeout(() => setPinError(false), 2000)
    }
  }

  const handlePinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePinSubmit(e as any)
    }
  }

  useEffect(() => {
    // Check if already authenticated in this session
    const isAuth = sessionStorage.getItem('taxonomyEditorAuth') === 'true'
    if (isAuth) {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      // Clean up storage first to prevent quota issues
      cleanupOldTaxonomies()
      loadSavedTaxonomies()
      loadFromOnline()
    }
  }, [isAuthenticated])

  // Show pin entry screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Taxonomy Editor</h1>
              <p className="text-gray-600">Enter PIN to access</p>
            </div>
            
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyPress={handlePinKeyPress}
                  placeholder="Enter 4-digit PIN"
                  className={`text-center text-lg tracking-widest ${pinError ? 'border-red-500' : ''}`}
                  maxLength={4}
                  autoFocus
                />
                {pinError && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    Incorrect PIN. Please try again.
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={pinInput.length !== 4}
              >
                Access Editor
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                className="text-sm"
              >
                ← Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const prototypes = [
    { value: "/taxonomy-prototype-1", label: "Prototype 1 - Basic Tesco API" },
    { value: "/taxonomy-prototype-2", label: "Prototype 2 - SuperDept → Dept Tabs → Aisle Products" },
    { value: "/taxonomy-prototype-3", label: "Prototype 3 - SuperDept → Dept Tabs → Aisle Grid" },
    { value: "/taxonomy-prototype-4", label: "Prototype 4 - Custom Taxonomy (P1 Base)" },
    { value: "/taxonomy-prototype-5", label: "Prototype 5 - Custom Taxonomy (P2 Base)" },
    { value: "/taxonomy-prototype-6", label: "Prototype 6 - Custom Taxonomy (P3 Base)" }
  ]

  const handleGoToPrototype = () => {
    if (selectedPrototype) {
      router.push(selectedPrototype)
    }
  }

  const saveToHistory = (data: CategoryWithParent[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(data)))
    
    // Keep only last 20 states to prevent memory issues
    if (newHistory.length > 20) {
      newHistory.shift()
    } else {
      setHistoryIndex(historyIndex + 1)
    }
    
    setHistory(newHistory)
  }

  const updateEditedDataWithHistory = (newData: CategoryWithParent[]) => {
    if (editedData) {
      saveToHistory(editedData)
    }
    setEditedData(newData)
    setHasChanges(true)
  }

  const handleUndo = () => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const previousState = JSON.parse(JSON.stringify(history[historyIndex]))
      setEditedData(previousState)
      setHistoryIndex(historyIndex - 1)
      setHasChanges(true)
      
      // Clear any active editing states
      setEditingParents({})
      setEditingRanks({})
      setEditingNames({})
      setEditingImages({})
    }
  }

  const canUndo = historyIndex >= 0

  // Storage management utilities
  const getStorageSize = () => {
    let total = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return total
  }

  const getStorageSizeFormatted = () => {
    const bytes = getStorageSize()
    return `${(bytes / 1024).toFixed(1)}KB`
  }

  const cleanupOldTaxonomies = () => {
    try {
      // Remove any old storage format data
      localStorage.removeItem('savedTaxonomies')
      localStorage.removeItem('editedTaxonomy')
      
      // Clean up any orphaned taxonomy keys (not in index)
      const indexData = localStorage.getItem('taxonomyIndex')
      if (indexData) {
        const taxonomyIndex = JSON.parse(indexData)
        const validIds = new Set(taxonomyIndex.map((t: any) => t.id))
        
        const keysToRemove = []
        for (let key in localStorage) {
          if (key.startsWith('taxonomy_')) {
            const id = key.replace('taxonomy_', '')
            if (!validIds.has(id)) {
              keysToRemove.push(key)
            }
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key)
          console.log(`Cleaned up orphaned taxonomy: ${key}`)
        })
        
        if (keysToRemove.length > 0) {
          console.log(`Cleaned up ${keysToRemove.length} orphaned taxonomies`)
        }
      }
    } catch (error) {
      console.error("Error during cleanup:", error)
    }
  }

  const checkStorageQuota = (dataSize: number) => {
    const currentSize = getStorageSize()
    const estimatedNewSize = currentSize + dataSize
    const quotaLimit = 5 * 1024 * 1024 // 5MB typical localStorage limit
    
    console.log(`Storage check: Current ${(currentSize / 1024).toFixed(1)}KB, Adding ${(dataSize / 1024).toFixed(1)}KB, Estimated ${(estimatedNewSize / 1024).toFixed(1)}KB`)
    
    if (estimatedNewSize > quotaLimit * 0.9) { // 90% threshold
      console.warn("Approaching storage quota limit")
      cleanupOldTaxonomies()
      return false
    }
    return true
  }

  const saveTaxonomyToCollection = (name: string, makeActive: boolean = true) => {
    if (!editedData) return

    const removeParentIds = (categories: any[]): any[] => {
      return categories.map(category => ({
        ...category,
        parentId: undefined,
        children: category.children ? removeParentIds(category.children) : []
      }))
    }

    const cleanedData = removeParentIds(editedData)
    const newTaxonomy: SavedTaxonomy = {
      id: Date.now().toString(),
      name: name.trim(),
      data: cleanedData,
      createdAt: new Date().toISOString(),
      isActive: makeActive
    }

    try {
      // Check storage quota before saving
      const taxonomyDataSize = JSON.stringify(newTaxonomy).length
      if (!checkStorageQuota(taxonomyDataSize)) {
        alert(`Storage quota exceeded. Current usage: ${getStorageSizeFormatted()}. Please delete some taxonomies to free up space.`)
        return
      }

      // Save individual taxonomy to its own localStorage key
      const taxonomyKey = `taxonomy_${newTaxonomy.id}`
      localStorage.setItem(taxonomyKey, JSON.stringify(newTaxonomy))
      
      // Update the taxonomy index (just metadata, not the full data)
      const updatedTaxonomies = savedTaxonomies.map(t => ({
        ...t,
        isActive: makeActive ? false : t.isActive
      }))
      
      // Add new taxonomy metadata to index
      const newTaxonomyMeta = {
        id: newTaxonomy.id,
        name: newTaxonomy.name,
        createdAt: newTaxonomy.createdAt,
        isActive: newTaxonomy.isActive
      }
      updatedTaxonomies.push(newTaxonomyMeta as SavedTaxonomy)

      // Save taxonomy index (lightweight metadata only)
      localStorage.setItem('taxonomyIndex', JSON.stringify(updatedTaxonomies))
      setSavedTaxonomies(updatedTaxonomies as SavedTaxonomy[])
      
      if (makeActive) {
        setCurrentTaxonomyId(newTaxonomy.id)
        // Only save the ACTIVE taxonomy to online API (respects 4.5MB limit)
        saveToOnlineAPI(cleanedData)
      }
      
      setHasChanges(false)
      setShowSaveDialog(false)
      setNewTaxonomyName("")
      
      console.log(`Successfully saved taxonomy: ${name} (${(taxonomyDataSize / 1024).toFixed(1)}KB). Total storage: ${getStorageSizeFormatted()}`)
      
    } catch (error) {
      console.error("Error saving taxonomy:", error)
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert(`Storage quota exceeded. Current usage: ${getStorageSizeFormatted()}. Please delete some taxonomies to free up space.`)
        cleanupOldTaxonomies()
      } else {
        alert("Failed to save taxonomy. Please try again.")
      }
    }
  }

  const loadSavedTaxonomies = () => {
    try {
      const indexData = localStorage.getItem('taxonomyIndex')
      if (indexData) {
        const taxonomyIndex = JSON.parse(indexData)
        
        // Load full data for each taxonomy from individual storage
        const fullTaxonomies = taxonomyIndex.map((meta: any) => {
          try {
            const taxonomyData = localStorage.getItem(`taxonomy_${meta.id}`)
            if (taxonomyData) {
              return JSON.parse(taxonomyData)
            }
            return null
          } catch (error) {
            console.error(`Error loading taxonomy ${meta.id}:`, error)
            return null
          }
        }).filter(Boolean)
        
        setSavedTaxonomies(fullTaxonomies)
        
        // Find active taxonomy
        const activeTaxonomy = fullTaxonomies.find((t: SavedTaxonomy) => t.isActive)
        if (activeTaxonomy) {
          setCurrentTaxonomyId(activeTaxonomy.id)
        }
        
        console.log(`Loaded ${fullTaxonomies.length} saved taxonomies`)
      }
    } catch (error) {
      console.error("Error loading saved taxonomies:", error)
      // Clear corrupted data
      try {
        localStorage.removeItem('taxonomyIndex')
        console.log("Cleared corrupted taxonomy index")
      } catch (clearError) {
        console.error("Could not clear corrupted data:", clearError)
      }
    }
  }

  const loadTaxonomy = (taxonomyId: string) => {
    const taxonomy = savedTaxonomies.find(t => t.id === taxonomyId)
    if (taxonomy) {
      const withParentIds = addParentIds(taxonomy.data)
      setEditedData(withParentIds)
      setCurrentTaxonomyId(taxonomyId)
      setHasChanges(false)
      
      // Clear history when switching taxonomies
      setHistory([])
      setHistoryIndex(-1)
    }
  }

  const setActiveTaxonomy = async (taxonomyId: string) => {
    try {
      // Update all taxonomies to set new active status
      const updatedTaxonomies = savedTaxonomies.map(t => ({
        ...t,
        isActive: t.id === taxonomyId
      }))
      
      // Save each updated taxonomy individually
      for (const taxonomy of updatedTaxonomies) {
        const taxonomyKey = `taxonomy_${taxonomy.id}`
        localStorage.setItem(taxonomyKey, JSON.stringify(taxonomy))
      }
      
      // Update index
      const taxonomyIndex = updatedTaxonomies.map(t => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        isActive: t.isActive
      }))
      localStorage.setItem('taxonomyIndex', JSON.stringify(taxonomyIndex))
      setSavedTaxonomies(updatedTaxonomies)
      
      // Save ONLY the active taxonomy to online API (respects blob limit)
      const activeTaxonomy = updatedTaxonomies.find(t => t.isActive)
      if (activeTaxonomy) {
        await saveToOnlineAPI(activeTaxonomy.data)
      }
      
      console.log(`Set taxonomy ${taxonomyId} as active`)
    } catch (error) {
      console.error("Error setting active taxonomy:", error)
      alert("Failed to save active taxonomy setting.")
    }
  }

  const deleteTaxonomy = (taxonomyId: string) => {
    try {
      // Remove individual taxonomy from localStorage
      localStorage.removeItem(`taxonomy_${taxonomyId}`)
      
      // Update index
      const updatedTaxonomies = savedTaxonomies.filter(t => t.id !== taxonomyId)
      const taxonomyIndex = updatedTaxonomies.map(t => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        isActive: t.isActive
      }))
      localStorage.setItem('taxonomyIndex', JSON.stringify(taxonomyIndex))
      setSavedTaxonomies(updatedTaxonomies)
      
      if (currentTaxonomyId === taxonomyId) {
        setCurrentTaxonomyId("")
        setEditedData(null)
      }
      
      console.log(`Deleted taxonomy ${taxonomyId}`)
    } catch (error) {
      console.error("Error deleting taxonomy:", error)
      alert("Failed to delete taxonomy.")
    }
  }

  const saveToOnlineAPI = async (taxonomyData: TaxonomyItem[]) => {
    try {
      const response = await fetch('/api/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxonomy: taxonomyData })
      })
      return response.ok
    } catch (error) {
      console.error("Error saving to online API:", error)
      return false
    }
  }

  const loadFromOnline = async () => {
    try {
      const response = await fetch('/api/taxonomy')
      const result = await response.json()
      
      if (response.ok && result.data?.taxonomy) {
        const withParentIds = addParentIds(result.data.taxonomy)
        setEditedData(withParentIds)
        console.log("Loaded online taxonomy:", withParentIds.length, "categories")
      } else {
        // Try localStorage fallback
        const customTaxonomyData = localStorage.getItem('customTaxonomy')
        if (customTaxonomyData) {
          const parsedData = JSON.parse(customTaxonomyData)
          const withParentIds = addParentIds(parsedData)
          setEditedData(withParentIds)
          console.log("Loaded from localStorage:", withParentIds.length, "categories")
        } else {
          // If no data available, load from API as fallback
          console.log("No data found, loading from API...")
          await loadAPITaxonomy()
        }
      }
    } catch (error) {
      console.error("Error loading online taxonomy:", error)
      // Try localStorage fallback
      const customTaxonomyData = localStorage.getItem('customTaxonomy')
      if (customTaxonomyData) {
        const parsedData = JSON.parse(customTaxonomyData)
        const withParentIds = addParentIds(parsedData)
        setEditedData(withParentIds)
        console.log("Loaded from localStorage after error:", withParentIds.length, "categories")
      } else {
        // If no data available, load from API as fallback
        console.log("No data found after error, loading from API...")
        await loadAPITaxonomy()
      }
    }
  }

  const loadAPITaxonomy = async () => {
    try {
      const variables = {
        storeId: "3060",
        categoryId: null,
        style: "thumbnail",
        includeInspirationEvents: false,
      }
      const result = await graphqlRequest<GetTaxonomyResponse>(TAXONOMY_QUERY, variables)
      if (result.data?.taxonomy) {
        const withParentIds = addParentIds(result.data.taxonomy)
        setEditedData(withParentIds)
        console.log("Loaded API taxonomy as fallback:", withParentIds.length, "categories")
      }
    } catch (error) {
      console.error("Error loading API taxonomy:", error)
    }
  }

  const addParentIds = (categories: TaxonomyItem[], parentId?: string): CategoryWithParent[] => {
    return categories.map(category => ({
      ...category,
      parentId,
      children: category.children ? addParentIds(category.children, category.id) : []
    }))
  }

  const resetToAPI = async () => {
    setLoadingReset(true)
    try {
      const variables = {
        storeId: "3060",
        categoryId: null,
        style: "thumbnail",
        includeInspirationEvents: false,
      }
      const result = await graphqlRequest<GetTaxonomyResponse>(TAXONOMY_QUERY, variables)
      if (result.data?.taxonomy) {
        const withParentIds = addParentIds(result.data.taxonomy)
        setOriginalData(result.data.taxonomy)
        setEditedData(withParentIds)
        setPendingReset(true)
        setHasChanges(true)
      }
    } catch (error) {
      console.error("Error loading API taxonomy:", error)
    } finally {
      setLoadingReset(false)
    }
  }

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const updateParentId = (categoryId: string, newParentId: string) => {
    setEditingParents(prev => ({ ...prev, [categoryId]: newParentId }))
    setHasChanges(true)
  }

  const updateRank = (categoryId: string, newRank: number) => {
    setEditingRanks(prev => ({ ...prev, [categoryId]: newRank }))
    setHasChanges(true)
  }

  const updateName = (categoryId: string, newName: string) => {
    setEditingNames(prev => ({ ...prev, [categoryId]: newName }))
    setHasChanges(true)
  }

  const updateImageUrl = (categoryId: string, newImageUrl: string) => {
    setEditingImages(prev => ({ ...prev, [categoryId]: newImageUrl }))
    setHasChanges(true)
  }

  const getCurrentImageUrl = (category: CategoryWithParent): string => {
    if (editingImages[category.id]) {
      return editingImages[category.id]
    }
    return category.images?.[0]?.images?.[0]?.url || ""
  }

  const generateCategoryId = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const createNewRootCategory = () => {
    if (!newCategoryName.trim() || !editedData) return

    const newCategory: CategoryWithParent = {
      id: generateCategoryId(newCategoryName),
      name: newCategoryName.trim(),
      label: newCategoryName.trim(),
      pageType: "category",
      images: [],
      children: []
    }

    updateEditedDataWithHistory([newCategory, ...editedData])
    setNewCategoryName("")
  }

  const handleNewCategoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      createNewRootCategory()
    }
  }

  const getCurrentRank = (categoryId: string, categories: CategoryWithParent[]): number => {
    return categories.findIndex(cat => cat.id === categoryId) + 1
  }

  const applyParentChange = (categoryId: string) => {
    if (!editedData || !editingParents[categoryId]) return

    const newParentId = editingParents[categoryId]
    
    const findAndRemoveCategory = (categories: CategoryWithParent[]): CategoryWithParent | null => {
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === categoryId) {
          return categories.splice(i, 1)[0]
        }
        if (categories[i].children) {
          const found = findAndRemoveCategory(categories[i].children as CategoryWithParent[])
          if (found) return found
        }
      }
      return null
    }

    const findAndAddToParent = (categories: CategoryWithParent[], targetParentId: string, categoryToAdd: CategoryWithParent): boolean => {
      if (targetParentId === "root") {
        categories.push({ ...categoryToAdd, parentId: undefined })
        return true
      }
      
      for (const category of categories) {
        if (category.id === targetParentId) {
          if (!category.children) category.children = []
          ;(category.children as CategoryWithParent[]).push({ ...categoryToAdd, parentId: targetParentId })
          return true
        }
        if (category.children) {
          if (findAndAddToParent(category.children as CategoryWithParent[], targetParentId, categoryToAdd)) {
            return true
          }
        }
      }
      return false
    }

    const newData = JSON.parse(JSON.stringify(editedData))
    const categoryToMove = findAndRemoveCategory(newData)
    
    if (categoryToMove && findAndAddToParent(newData, newParentId, categoryToMove)) {
      updateEditedDataWithHistory(newData)
      delete editingParents[categoryId]
      setEditingParents(prev => {
        const newState = { ...prev }
        delete newState[categoryId]
        return newState
      })
    }
  }

  const applyRankChange = (categoryId: string) => {
    if (!editedData || editingRanks[categoryId] === undefined) return

    const newRank = editingRanks[categoryId]
    
    const findCategoryAndSiblings = (categories: CategoryWithParent[], targetId: string): { category: CategoryWithParent, siblings: CategoryWithParent[], parentArray: CategoryWithParent[] } | null => {
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === targetId) {
          return { category: categories[i], siblings: categories, parentArray: categories }
        }
        if (categories[i].children) {
          const result = findCategoryAndSiblings(categories[i].children as CategoryWithParent[], targetId)
          if (result) return result
        }
      }
      return null
    }

    const newData = JSON.parse(JSON.stringify(editedData))
    const result = findCategoryAndSiblings(newData, categoryId)
    
    if (result) {
      const { category, siblings } = result
      const currentIndex = siblings.findIndex(cat => cat.id === categoryId)
      const targetIndex = Math.max(0, Math.min(newRank - 1, siblings.length - 1))
      
      if (currentIndex !== -1 && targetIndex !== currentIndex) {
        siblings.splice(currentIndex, 1)
        siblings.splice(targetIndex, 0, category)
        updateEditedDataWithHistory(newData)
      }
    }
    
    setEditingRanks(prev => {
      const newState = { ...prev }
      delete newState[categoryId]
      return newState
    })
  }

  const applyNameChange = (categoryId: string) => {
    if (!editedData || !editingNames[categoryId]) return

    const newName = editingNames[categoryId]
    
    const updateCategoryName = (categories: CategoryWithParent[]): boolean => {
      for (const category of categories) {
        if (category.id === categoryId) {
          category.name = newName
          category.label = newName
          return true
        }
        if (category.children) {
          if (updateCategoryName(category.children as CategoryWithParent[])) {
            return true
          }
        }
      }
      return false
    }

    const newData = JSON.parse(JSON.stringify(editedData))
    if (updateCategoryName(newData)) {
      updateEditedDataWithHistory(newData)
      setEditingNames(prev => {
        const newState = { ...prev }
        delete newState[categoryId]
        return newState
      })
    }
  }

  const applyImageChange = (categoryId: string) => {
    if (!editedData || !editingImages[categoryId]) return

    const newImageUrl = editingImages[categoryId]
    
    const updateCategoryImage = (categories: CategoryWithParent[]): boolean => {
      for (const category of categories) {
        if (category.id === categoryId) {
          if (!category.images) category.images = []
          if (category.images.length === 0) {
            category.images.push({
              style: "thumbnail",
              images: []
            })
          }
          if (category.images[0].images.length === 0) {
            category.images[0].images.push({
              type: "image",
              url: newImageUrl,
              region: "default",
              title: category.name
            })
          } else {
            category.images[0].images[0].url = newImageUrl
          }
          return true
        }
        if (category.children) {
          if (updateCategoryImage(category.children as CategoryWithParent[])) {
            return true
          }
        }
      }
      return false
    }

    const newData = JSON.parse(JSON.stringify(editedData))
    if (updateCategoryImage(newData)) {
      updateEditedDataWithHistory(newData)
      setEditingImages(prev => {
        const newState = { ...prev }
        delete newState[categoryId]
        return newState
      })
    }
  }

  const saveChanges = async () => {
    if (!editedData) return
    
    if (currentTaxonomyId) {
      // Update existing taxonomy
      setSaving(true)
      try {
        const removeParentIds = (categories: any[]): any[] => {
          return categories.map(category => ({
            ...category,
            parentId: undefined,
            children: category.children ? removeParentIds(category.children) : []
          }))
        }

        const cleanedData = removeParentIds(editedData)
        
        // Update the current taxonomy using individual storage
        const updatedTaxonomies = savedTaxonomies.map(t => 
          t.id === currentTaxonomyId 
            ? { ...t, data: cleanedData }
            : t
        )
        
        // Save the updated taxonomy individually
        const updatedTaxonomy = updatedTaxonomies.find(t => t.id === currentTaxonomyId)
        if (updatedTaxonomy) {
          // Check storage quota before saving
          const taxonomyDataSize = JSON.stringify(updatedTaxonomy).length
          if (!checkStorageQuota(taxonomyDataSize)) {
            alert(`Storage quota exceeded. Current usage: ${getStorageSizeFormatted()}. Please delete some taxonomies to free up space.`)
            return
          }

          const taxonomyKey = `taxonomy_${currentTaxonomyId}`
          localStorage.setItem(taxonomyKey, JSON.stringify(updatedTaxonomy))
          
          // Update the taxonomy index (lightweight metadata only)
          const taxonomyIndex = updatedTaxonomies.map(t => ({
            id: t.id,
            name: t.name,
            createdAt: t.createdAt,
            isActive: t.isActive
          }))
          localStorage.setItem('taxonomyIndex', JSON.stringify(taxonomyIndex))
        }
        
        setSavedTaxonomies(updatedTaxonomies)
        
        // If this is the active taxonomy, also save to online API
        const currentTaxonomy = updatedTaxonomies.find(t => t.id === currentTaxonomyId)
        if (currentTaxonomy?.isActive) {
          await saveToOnlineAPI(cleanedData)
        }
        
        setHasChanges(false)
        setPendingReset(false)
        
        console.log(`Successfully updated taxonomy: ${currentTaxonomy?.name} (${(JSON.stringify(cleanedData).length / 1024).toFixed(1)}KB). Total storage: ${getStorageSizeFormatted()}`)
        
      } catch (error) {
        console.error("Error saving taxonomy:", error)
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          alert(`Storage quota exceeded. Current usage: ${getStorageSizeFormatted()}. Please delete some taxonomies to free up space.`)
          cleanupOldTaxonomies()
        } else {
          alert("Failed to save taxonomy. Please try again.")
        }
      } finally {
        setSaving(false)
      }
    } else {
      // Show save dialog for new taxonomy
      setShowSaveDialog(true)
    }
  }

  const toggleCategoryVisibility = (categoryId: string) => {
    if (!editedData) return

    const toggleVisibility = (categories: CategoryWithParent[]): boolean => {
      for (const category of categories) {
        if (category.id === categoryId) {
          category.hidden = !category.hidden
          return true
        }
        if (category.children) {
          if (toggleVisibility(category.children as CategoryWithParent[])) {
            return true
          }
        }
      }
      return false
    }

    const newData = JSON.parse(JSON.stringify(editedData))
    if (toggleVisibility(newData)) {
      updateEditedDataWithHistory(newData)
    }
  }

  const renderCategory = (category: CategoryWithParent, level: number = 0, siblings: CategoryWithParent[] = []) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const currentRank = getCurrentRank(category.id, siblings)
    const isEditingParent = editingParents[category.id] !== undefined
    const isEditingRank = editingRanks[category.id] !== undefined
    const isEditingName = editingNames[category.id] !== undefined
    const isEditingImage = editingImages[category.id] !== undefined
    const currentImageUrl = getCurrentImageUrl(category)

    return (
      <div key={category.id} className={`border border-gray-200 rounded-md mb-1 ${category.hidden ? 'opacity-50 bg-gray-50' : ''}`}>
        <div className="p-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(category.id)}
                className="h-6 w-6 p-0 flex-shrink-0"
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                ) : null}
              </Button>
              
              {/* Image Thumbnail */}
              <div 
                className="w-8 h-8 bg-gray-200 rounded border flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-300"
                onClick={() => updateImageUrl(category.id, currentImageUrl)}
                title={currentImageUrl ? "Click to edit image URL" : "Click to add image URL"}
              >
                {currentImageUrl ? (
                  <img 
                    src={currentImageUrl} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Image className="h-3 w-3" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingNames[category.id]}
                      onChange={(e) => updateName(category.id, e.target.value)}
                      className="h-6 text-sm font-medium"
                      onKeyPress={(e) => e.key === 'Enter' && applyNameChange(category.id)}
                      onBlur={() => applyNameChange(category.id)}
                    />
                  </div>
                ) : (
                  <span 
                    className="font-medium truncate cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                    onClick={() => updateName(category.id, category.name)}
                  >
                    {category.name}
                  </span>
                )}
                <code className="text-xs bg-gray-100 px-1 rounded font-mono">{category.id}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(category.id)}
                  className="h-5 w-5 p-0 flex-shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Rank Control */}
              {isEditingRank ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="1"
                    max={siblings.length}
                    value={editingRanks[category.id]}
                    onChange={(e) => updateRank(category.id, parseInt(e.target.value) || 1)}
                    className="h-6 w-12 text-xs"
                    onKeyPress={(e) => e.key === 'Enter' && applyRankChange(category.id)}
                    onBlur={() => applyRankChange(category.id)}
                  />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateRank(category.id, currentRank)}
                  className="h-6 px-1 text-xs text-gray-500 hover:bg-gray-100"
                >
                  <Hash className="h-3 w-3 mr-1" />
                  {currentRank}
                </Button>
              )}

              {/* Hide/Show Control */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCategoryVisibility(category.id)}
                className="h-6 w-6 p-0 flex-shrink-0"
                title={category.hidden ? "Show category" : "Hide category"}
              >
                {category.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              
              {/* Parent ID Control */}
              {!isEditingParent && (
                <Input
                  placeholder="Parent ID"
                  className="h-6 w-24 text-xs"
                  onFocus={() => updateParentId(category.id, category.parentId || "root")}
                />
              )}
              
              {isEditingParent && (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingParents[category.id]}
                    onChange={(e) => updateParentId(category.id, e.target.value)}
                    className="h-6 w-24 text-xs"
                    onKeyPress={(e) => e.key === 'Enter' && applyParentChange(category.id)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyParentChange(category.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Image URL editing row */}
          {isEditingImage && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={editingImages[category.id]}
                onChange={(e) => updateImageUrl(category.id, e.target.value)}
                placeholder="Image URL"
                className="h-6 text-xs flex-1"
                onKeyPress={(e) => e.key === 'Enter' && applyImageChange(category.id)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyImageChange(category.id)}
                className="h-6 w-6 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="px-2 pb-2">
            {(category.children as CategoryWithParent[]).map(child => 
              renderCategory(child, level + 1, category.children as CategoryWithParent[])
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-shrink-0 border-b bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Taxonomy Editor</h1>
            
            {/* Storage Status */}
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Storage: {getStorageSizeFormatted()}
            </div>
            
            {/* Taxonomy Selection */}
            <div className="flex items-center gap-2">
              <Select value={currentTaxonomyId} onValueChange={(value) => {
                if (value === "create-new") {
                  setShowSaveDialog(true)
                  setNewTaxonomyName("")
                } else {
                  loadTaxonomy(value)
                }
              }}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="Select taxonomy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-new">
                    <div className="flex items-center gap-2">
                      <Plus className="h-3 w-3 text-blue-600" />
                      <span className="text-blue-600">Create new...</span>
                    </div>
                  </SelectItem>
                  {savedTaxonomies.length > 0 && (
                    <>
                      <div className="h-px bg-gray-200 my-1" />
                      {savedTaxonomies.map((taxonomy) => (
                        <SelectItem key={taxonomy.id} value={taxonomy.id}>
                          <div className="flex items-center gap-2">
                            {taxonomy.isActive && <Check className="h-3 w-3 text-green-600" />}
                            <span>{taxonomy.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {currentTaxonomyId && (
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => setActiveTaxonomy(currentTaxonomyId)}
                    size="sm"
                    variant="outline"
                    disabled={savedTaxonomies.find(t => t.id === currentTaxonomyId)?.isActive}
                    title="Set as active taxonomy for prototypes 4-6"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => deleteTaxonomy(currentTaxonomyId)}
                    size="sm"
                    variant="outline"
                    title="Delete taxonomy"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Go to Menu */}
            <div className="flex items-center gap-2">
              <Select value={selectedPrototype} onValueChange={setSelectedPrototype}>
                <SelectTrigger className="w-64 h-8 text-sm">
                  <SelectValue placeholder="Go to prototype..." />
                </SelectTrigger>
                <SelectContent>
                  {prototypes.map((prototype) => (
                    <SelectItem key={prototype.value} value={prototype.value}>
                      {prototype.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleGoToPrototype}
                disabled={!selectedPrototype}
                size="sm"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Go
              </Button>
            </div>

            {pendingReset && (
              <Alert className="py-1 px-2">
                <AlertDescription className="text-xs">
                  Reset to API taxonomy - click Save to apply
                </AlertDescription>
              </Alert>
            )}
            {hasChanges && (
              <Button 
                onClick={saveChanges} 
                size="sm"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            )}
            <Button 
              onClick={handleUndo}
              variant="outline" 
              size="sm"
              disabled={!canUndo}
              title={`Undo (${history.length} actions available)`}
            >
              <Undo className="h-4 w-4 mr-1" />
              Undo
            </Button>
            <Button 
              onClick={resetToAPI} 
              variant="outline" 
              size="sm"
              disabled={loadingReset}
            >
              {loadingReset ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Reset
            </Button>
          </div>
        </div>
        
        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Input
                value={newTaxonomyName}
                onChange={(e) => setNewTaxonomyName(e.target.value)}
                placeholder="Enter taxonomy name..."
                className="flex-1 h-8"
                onKeyPress={(e) => e.key === 'Enter' && newTaxonomyName.trim() && saveTaxonomyToCollection(newTaxonomyName)}
              />
              <Button
                onClick={() => saveTaxonomyToCollection(newTaxonomyName)}
                disabled={!newTaxonomyName.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                onClick={() => setShowSaveDialog(false)}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              This will be saved as a new taxonomy and set as active for prototypes 4-6
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {editedData ? (
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-3 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={handleNewCategoryKeyPress}
                  placeholder="Create new category"
                  className="flex-1 h-8"
                />
                <Button
                  onClick={createNewRootCategory}
                  disabled={!newCategoryName.trim()}
                  size="sm"
                >
                  Create
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {editedData.map(category => renderCategory(category, 0, editedData))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">Loading taxonomy data...</p>
              <Button onClick={resetToAPI} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Load API Taxonomy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
