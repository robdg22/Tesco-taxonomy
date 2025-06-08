"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ArrowRight, RotateCcw, Loader2, ChevronRight, ChevronDown, Copy, Save } from "lucide-react"
import Link from "next/link"
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
}

export default function TaxonomyTestPage() {
  const [originalData, setOriginalData] = useState<TaxonomyItem[] | null>(null)
  const [editedData, setEditedData] = useState<CategoryWithParent[] | null>(null)
  const [loadingOriginal, setLoadingOriginal] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingParents, setEditingParents] = useState<Record<string, string>>({})
  const [editingRanks, setEditingRanks] = useState<Record<string, number>>({})
  const [editingNames, setEditingNames] = useState<Record<string, string>>({})
  const [editingImages, setEditingImages] = useState<Record<string, string>>({})
  const [newCategoryName, setNewCategoryName] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [savingOnline, setSavingOnline] = useState(false)
  const [loadingOnline, setLoadingOnline] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState<'none' | 'saved' | 'error'>('none')

  useEffect(() => {
    // Try to load from online API first, then fallback to localStorage
    loadFromOnline()
  }, [])

  const loadFromOnline = async () => {
    setLoadingOnline(true)
    try {
      const response = await fetch('/api/taxonomy')
      const result = await response.json()
      
      if (response.ok && result.data?.taxonomy) {
        const withParentIds = addParentIds(result.data.taxonomy)
        setEditedData(withParentIds)
        setOnlineStatus('saved')
        console.log("Online taxonomy loaded:", result.data.taxonomy)
        return
      }
    } catch (error) {
      console.error("Error loading online taxonomy:", error)
    }
    
    // Fallback to localStorage
    try {
      const existing = localStorage.getItem('customTaxonomy')
      if (existing && existing !== 'null') {
        const parsed = JSON.parse(existing)
        setEditedData(addParentIds(parsed))
        console.log("localStorage taxonomy loaded as fallback")
      }
    } catch (error) {
      console.error("Error loading localStorage taxonomy:", error)
    }
    
    setLoadingOnline(false)
  }

  const addParentIds = (categories: TaxonomyItem[], parentId?: string): CategoryWithParent[] => {
    return categories.map(category => ({
      ...category,
      parentId,
      children: category.children ? addParentIds(category.children, category.id) : []
    }))
  }

  const loadOriginalTaxonomy = async () => {
    setLoadingOriginal(true)
    try {
      const variables = {
        storeId: "3060",
        categoryId: null,
        style: "thumbnail",
        includeInspirationEvents: false,
      }
      const result = await graphqlRequest<GetTaxonomyResponse>(TAXONOMY_QUERY, variables)
      if (result.data?.taxonomy) {
        setOriginalData(result.data.taxonomy)
        const withParentIds = addParentIds(result.data.taxonomy)
        setEditedData(withParentIds)
        console.log("Original taxonomy loaded:", result.data.taxonomy)
      }
    } catch (error) {
      console.error("Failed to load original taxonomy:", error)
    } finally {
      setLoadingOriginal(false)
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
    setEditingParents(prev => ({
      ...prev,
      [categoryId]: newParentId
    }))
  }

  const updateRank = (categoryId: string, newRank: number) => {
    setEditingRanks(prev => ({
      ...prev,
      [categoryId]: newRank
    }))
  }

  const updateName = (categoryId: string, newName: string) => {
    setEditingNames(prev => ({
      ...prev,
      [categoryId]: newName
    }))
  }

  const updateImageUrl = (categoryId: string, newImageUrl: string) => {
    setEditingImages(prev => ({
      ...prev,
      [categoryId]: newImageUrl
    }))
  }

  const getCurrentImageUrl = (category: CategoryWithParent): string => {
    // Try to get the first image URL from the category's images
    if (category.images && category.images.length > 0) {
      const imageStyle = category.images[0]
      if (imageStyle.images && imageStyle.images.length > 0) {
        return imageStyle.images[0].url || ""
      }
    }
    return ""
  }

  const generateCategoryId = (name: string): string => {
    // Generate a simple ID based on name + timestamp
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
    return `${cleanName}_${timestamp}`
  }

  const createNewRootCategory = () => {
    if (!newCategoryName.trim() || !editedData) return

    const newCategory: CategoryWithParent = {
      id: generateCategoryId(newCategoryName),
      name: newCategoryName.trim(),
      label: newCategoryName.trim(),
      pageType: "category",
      images: [],
      children: [],
      parentId: undefined
    }

    // Insert at position 1 (beginning of array)
    const newData = [newCategory, ...editedData]
    setEditedData(newData)
    setHasChanges(true)
    setNewCategoryName("")
    console.log("Created new root category:", newCategory)
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
    const newParentId = editingParents[categoryId]
    if (!newParentId || !editedData) return

    // Find and remove category from current location
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

    // Find target parent and add category
    const findAndAddToParent = (categories: CategoryWithParent[], targetParentId: string, categoryToAdd: CategoryWithParent): boolean => {
      for (const category of categories) {
        if (category.id === targetParentId) {
          if (!category.children) category.children = []
          categoryToAdd.parentId = targetParentId
          ;(category.children as CategoryWithParent[]).push(categoryToAdd)
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

    const newData = JSON.parse(JSON.stringify(editedData)) // Deep clone
    const categoryToMove = findAndRemoveCategory(newData)
    
    if (categoryToMove) {
      if (newParentId === "root") {
        // Move to root level
        categoryToMove.parentId = undefined
        newData.push(categoryToMove)
      } else {
        // Move to specific parent
        findAndAddToParent(newData, newParentId, categoryToMove)
      }
      
      setEditedData(newData)
      setHasChanges(true)
      
      // Clear the editing state
      setEditingParents(prev => {
        const newState = { ...prev }
        delete newState[categoryId]
        return newState
      })
    }
  }

  const applyRankChange = (categoryId: string) => {
    const newRank = editingRanks[categoryId]
    if (!newRank || !editedData) return

    // Find the category and its siblings
    const findCategoryAndSiblings = (categories: CategoryWithParent[], targetId: string): { category: CategoryWithParent, siblings: CategoryWithParent[], parentArray: CategoryWithParent[] } | null => {
      // Check if it's in the current level
      const index = categories.findIndex(cat => cat.id === targetId)
      if (index !== -1) {
        return { category: categories[index], siblings: categories, parentArray: categories }
      }
      
      // Check children
      for (const category of categories) {
        if (category.children) {
          const result = findCategoryAndSiblings(category.children as CategoryWithParent[], targetId)
          if (result) return result
        }
      }
      return null
    }

    const newData = JSON.parse(JSON.stringify(editedData)) // Deep clone
    const result = findCategoryAndSiblings(newData, categoryId)
    
    if (result) {
      const { category, siblings } = result
      const currentIndex = siblings.findIndex(cat => cat.id === categoryId)
      const newIndex = Math.max(0, Math.min(newRank - 1, siblings.length - 1))
      
      if (currentIndex !== newIndex) {
        // Remove from current position
        siblings.splice(currentIndex, 1)
        // Insert at new position
        siblings.splice(newIndex, 0, category)
        
        setEditedData(newData)
        setHasChanges(true)
      }
      
      // Clear the editing state
      setEditingRanks(prev => {
        const newState = { ...prev }
        delete newState[categoryId]
        return newState
      })
    }
  }

  const applyNameChange = (categoryId: string) => {
    const newName = editingNames[categoryId]
    if (!newName || !editedData) return

    // Find and update the category name
    const updateCategoryName = (categories: CategoryWithParent[]): boolean => {
      for (const category of categories) {
        if (category.id === categoryId) {
          category.name = newName.trim()
          category.label = newName.trim()
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

    const newData = JSON.parse(JSON.stringify(editedData)) // Deep clone
    if (updateCategoryName(newData)) {
      setEditedData(newData)
      setHasChanges(true)
      
      // Clear the editing state
      setEditingNames(prev => {
        const newState = { ...prev }
        delete newState[categoryId]
        return newState
      })
    }
  }

  const applyImageChange = (categoryId: string) => {
    const newImageUrl = editingImages[categoryId]
    if (newImageUrl === undefined || !editedData) return

    // Find and update the category image
    const updateCategoryImage = (categories: CategoryWithParent[]): boolean => {
      for (const category of categories) {
        if (category.id === categoryId) {
          // Update or create image structure
          if (newImageUrl.trim()) {
            category.images = [{
              style: "thumbnail",
              images: [{
                type: "default",
                url: newImageUrl.trim(),
                region: "",
                title: category.name
              }]
            }]
          } else {
            // Clear images if empty URL
            category.images = []
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

    const newData = JSON.parse(JSON.stringify(editedData)) // Deep clone
    if (updateCategoryImage(newData)) {
      setEditedData(newData)
      setHasChanges(true)
      
      // Clear the editing state
      setEditingImages(prev => {
        const newState = { ...prev }
        delete newState[categoryId]
        return newState
      })
    }
  }

  const saveChanges = async () => {
    if (editedData) {
      // Remove parentId before saving (it's just for editing)
      const cleanData = JSON.parse(JSON.stringify(editedData))
      const removeParentIds = (categories: any[]) => {
        categories.forEach(category => {
          delete category.parentId
          if (category.children) {
            removeParentIds(category.children)
          }
        })
      }
      removeParentIds(cleanData)
      
      // Save to localStorage as backup
      localStorage.setItem('customTaxonomy', JSON.stringify(cleanData))
      setHasChanges(false)
      console.log("Custom taxonomy saved to localStorage:", cleanData)
    }
  }

  const saveOnline = async () => {
    if (!editedData) return
    
    setSavingOnline(true)
    setOnlineStatus('none')
    
    try {
      // Remove parentId before saving
      const cleanData = JSON.parse(JSON.stringify(editedData))
      const removeParentIds = (categories: any[]) => {
        categories.forEach(category => {
          delete category.parentId
          if (category.children) {
            removeParentIds(category.children)
          }
        })
      }
      removeParentIds(cleanData)
      
      const response = await fetch('/api/taxonomy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taxonomy: cleanData }),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Also save to localStorage as backup
        localStorage.setItem('customTaxonomy', JSON.stringify(cleanData))
        setHasChanges(false)
        setOnlineStatus('saved')
        console.log("Custom taxonomy saved online:", result)
      } else {
        setOnlineStatus('error')
        console.error("Failed to save online:", result.error)
      }
    } catch (error) {
      setOnlineStatus('error')
      console.error("Error saving online:", error)
    } finally {
      setSavingOnline(false)
    }
  }

  const saveAndTest = async () => {
    await saveOnline()
    // Open prototype in new tab
    window.open('/taxonomy-prototype-4', '_blank')
  }

  const resetToOriginal = () => {
    if (originalData) {
      const withParentIds = addParentIds(originalData)
      setEditedData(withParentIds)
      setHasChanges(false)
      setEditingParents({})
      setEditingRanks({})
      setEditingNames({})
      setEditingImages({})
      setNewCategoryName("")
    }
  }

  const renderCategory = (category: CategoryWithParent, level: number = 0, siblings: CategoryWithParent[] = []) => {
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren = category.children && category.children.length > 0
    const isEditingParent = editingParents[category.id] !== undefined
    const isEditingRank = editingRanks[category.id] !== undefined
    const isEditingName = editingNames[category.id] !== undefined
    const isEditingImage = editingImages[category.id] !== undefined
    const currentRank = getCurrentRank(category.id, siblings)
    const currentImageUrl = getCurrentImageUrl(category)

    return (
      <div key={category.id} className="border rounded-lg mb-2">
        <div className="p-3 bg-gray-50">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(category.id)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            {/* Category Image Preview */}
            <div className="w-12 h-12 bg-gray-200 rounded border flex-shrink-0 overflow-hidden">
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
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </div>
            
            <div className="flex-1">
              {/* Editable Category Name */}
              {isEditingName ? (
                <div className="flex items-center gap-1 mb-1">
                  <Input
                    value={editingNames[category.id]}
                    onChange={(e) => updateName(category.id, e.target.value)}
                    className="h-7 text-sm font-medium"
                    onKeyPress={(e) => e.key === 'Enter' && applyNameChange(category.id)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyNameChange(category.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="font-medium cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                  onClick={() => updateName(category.id, category.name)}
                >
                  {category.name}
                </div>
              )}
              
              {/* Editable Image URL */}
              {isEditingImage ? (
                <div className="flex items-center gap-1 mb-1">
                  <Input
                    value={editingImages[category.id]}
                    onChange={(e) => updateImageUrl(category.id, e.target.value)}
                    placeholder="Image URL"
                    className="h-6 text-xs"
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
              ) : (
                <div 
                  className="text-xs text-gray-500 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                  onClick={() => updateImageUrl(category.id, currentImageUrl)}
                >
                  {currentImageUrl ? "Click to edit image URL" : "Click to add image URL"}
                </div>
              )}
              
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span>ID: {category.id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(category.id)}
                  className="h-4 w-4 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Rank/Position Control */}
              <div className="text-sm">
                <span className="text-gray-500">Rank:</span>
                {isEditingRank ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      min="1"
                      max={siblings.length}
                      value={editingRanks[category.id]}
                      onChange={(e) => updateRank(category.id, parseInt(e.target.value) || 1)}
                      className="h-6 text-xs w-16"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyRankChange(category.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs bg-gray-200 px-1 rounded">
                      {currentRank}/{siblings.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateRank(category.id, currentRank)}
                      className="h-4 w-4 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Parent Control */}
              <div className="text-sm">
                <span className="text-gray-500">Parent:</span>
                {isEditingParent ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      value={editingParents[category.id]}
                      onChange={(e) => updateParentId(category.id, e.target.value)}
                      placeholder="Parent ID or 'root'"
                      className="h-6 text-xs w-32"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyParentChange(category.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs bg-gray-200 px-1 rounded">
                      {category.parentId || "root"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateParentId(category.id, category.parentId || "root")}
                      className="h-4 w-4 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="p-3 pt-0">
            {(category.children as CategoryWithParent[]).map(child => 
              renderCategory(child, level + 1, category.children as CategoryWithParent[])
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Taxonomy Editor</h1>
        <p className="text-muted-foreground">
          Reorganize the taxonomy by copying category IDs and pasting them as parent IDs
        </p>
      </div>

      {/* Load Original Data */}
      <Card>
        <CardHeader>
          <CardTitle>Load Taxonomy Data</CardTitle>
          <CardDescription>
            Load the original Tesco taxonomy to start editing, or load your saved online taxonomy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={loadOriginalTaxonomy}
              disabled={loadingOriginal}
              className="flex items-center space-x-2"
              variant="outline"
            >
              {loadingOriginal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{loadingOriginal ? "Loading..." : "Load API Taxonomy"}</span>
            </Button>
            
            <Button 
              onClick={loadFromOnline}
              disabled={loadingOnline}
              className="flex items-center space-x-2"
            >
              {loadingOnline ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{loadingOnline ? "Loading..." : "Load Online Taxonomy"}</span>
            </Button>
          </div>
          
          {originalData && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ API taxonomy loaded with {originalData.length} top-level categories
              </p>
            </div>
          )}
          
          {onlineStatus === 'saved' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                ☁️ Online taxonomy is available
              </p>
            </div>
          )}
          
          {onlineStatus === 'error' && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                ❌ Error with online taxonomy - using localStorage backup
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      {editedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Taxonomy Structure</span>
              <div className="flex gap-2">
                {hasChanges && (
                  <>
                    <Button onClick={saveChanges} variant="outline" size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      Save Local
                    </Button>
                    <Button 
                      onClick={saveOnline} 
                      size="sm"
                      disabled={savingOnline}
                    >
                      {savingOnline ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Online
                    </Button>
                    <Button 
                      onClick={saveAndTest} 
                      size="sm"
                      disabled={savingOnline}
                    >
                      {savingOnline ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Online & Test
                    </Button>
                  </>
                )}
                <Button onClick={resetToOriginal} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Click the chevron to expand categories. Copy category IDs and paste them as parent IDs to reorganize.
              {onlineStatus === 'saved' && <span className="text-blue-600"> • Synced online ☁️</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* New Category Creation */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={handleNewCategoryKeyPress}
                  placeholder="Type category name and press Enter to create new root category"
                  className="flex-1"
                />
                <Button
                  onClick={createNewRootCategory}
                  disabled={!newCategoryName.trim()}
                  size="sm"
                >
                  Create
                </Button>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Creates a new category at rank 1 with auto-generated ID
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {editedData.map(category => renderCategory(category, 0, editedData))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Link */}
      {editedData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Test Your Changes</CardTitle>
            <CardDescription className="text-blue-700">
              {hasChanges ? "Save your changes and test them in the prototype" : "Test the current taxonomy in the prototype"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasChanges && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ You have unsaved changes. Click "Save and Test" above to save them before testing.
                </p>
              </div>
            )}
            <Link href="/taxonomy-prototype-4">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center space-x-2">
                <span>Test Reorganized Taxonomy</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Back to Home */}
      <div className="pt-4">
        <Link href="/">
          <Button variant="outline">
            ← Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
} 