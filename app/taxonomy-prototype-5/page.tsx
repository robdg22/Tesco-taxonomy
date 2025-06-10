"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, GetCategoryProductsResponse, TaxonomyItem } from "@/types/tesco" // Removed FilterInput import
import { SuperDepartmentGrid } from "@/components/taxonomy-prototype-2/super-department-grid"
import { DepartmentTabs } from "@/components/taxonomy-prototype-2/department-tabs"
import { DepartmentTabsContent } from "@/components/taxonomy-prototype-2/department-tabs-content"
import { NavigationHeader } from "@/components/taxonomy-prototype-2/navigation-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { AisleProductListingWithTabs } from "@/components/taxonomy-prototype-2/aisle-product-listing-with-tabs"
import { AisleShelfTabs } from "@/components/taxonomy-prototype-2/aisle-shelf-tabs"
import { Button } from "@/components/ui/button" // Import Button for special offers

type NavigationLevel =
  | "superDepartmentGrid"
  | "departmentTabs"
  | "aisleProductsWithTabs"
  | "shelfProducts"
  | "offersProducts" // Added offersProducts

// Dynamic helper functions for taxonomy level detection
const findCategoryById = (categories: TaxonomyItem[], targetId: string): TaxonomyItem | null => {
  for (const category of categories) {
    if (category.id === targetId) {
      return category
    }
    if (category.children) {
      const found = findCategoryById(category.children, targetId)
      if (found) return found
    }
  }
  return null
}

const shouldShowTabsForChildren = (children: TaxonomyItem[]): boolean => {
  if (children.length <= 1) return false
  return children.some(child => child.children && child.children.length > 0)
}

const getTabChildren = (category: TaxonomyItem): TaxonomyItem[] => {
  if (!category.children) return []
  
  // If children have sub-children, show the children as tabs
  if (shouldShowTabsForChildren(category.children)) {
    return category.children
  }
  
  // Otherwise, no tabs needed
  return []
}

const findParentCategoryForTabs = (categories: TaxonomyItem[], selectedId: string): TaxonomyItem | null => {
  // Find the category that should show tabs based on the selected category
  const selectedCategory = findCategoryById(categories, selectedId)
  if (!selectedCategory) return null
  
  // If the selected category has children that should show as tabs, return it
  if (shouldShowTabsForChildren(selectedCategory.children || [])) {
    return selectedCategory
  }
  
  // Otherwise, find the parent that should show tabs
  const findParent = (cats: TaxonomyItem[], targetId: string, parent: TaxonomyItem | null = null): TaxonomyItem | null => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        return parent
      }
      if (cat.children) {
        const found = findParent(cat.children, targetId, cat)
        if (found) return found
      }
    }
    return null
  }
  
  const parent = findParent(categories, selectedId)
  if (parent && shouldShowTabsForChildren(parent.children || [])) {
    return parent
  }
  
  return null
}

export default function TaxonomyPrototype5Page() {
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>("superDepartmentGrid")
  const [selectedSuperDepartmentId, setSelectedSuperDepartmentId] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [selectedAisleIdForTabs, setSelectedAisleIdForTabs] = useState<string | null>(null)
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null)
  const [selectedShelfTabId, setSelectedShelfTabId] = useState<string>("all")

  const [superDepartmentsData, setSuperDepartmentsData] = useState<TaxonomyItem[] | null>(null)
  const [fetchedBranches, setFetchedBranches] = useState<Map<string, TaxonomyItem[]>>(new Map())
  const [productData, setProductData] = useState<GetCategoryProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingCustomTaxonomy, setUsingCustomTaxonomy] = useState(false) // Track if using custom taxonomy

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

  const PRODUCT_QUERY = `
    query GetCategoryProducts(
      $categoryId: ID
      $page: Int
      $count: Int
      $sortBy: String
      $offers: Boolean # Only offers variable
    ) {
      category(
        page: $page
        count: $count
        sortBy: $sortBy
        categoryId: $categoryId
        offers: $offers # Used offers variable
      ) {
        pageInformation: info {
          totalCount: total
          pageNo: page
          count
          pageSize
          offset
        }
        productItems: products {
          id
          baseProductId
          title
          brandName
          shortDescription
          defaultImageUrl
          images {
            display {
              default {
                url
                originalUrl
              }
            }
            default {
              url
              originalUrl
            }
          }
          price {
            price: actual
            unitPrice
            unitOfMeasure
          }
          promotions { # Added promotions field
            promotionId: id
            promotionType
            startDate
            endDate
            offerText: description
          }
        }
      }
    }
  `

  const fetchTaxonomyBranch = useCallback(
    async (categoryId: string | null, style: "rounded" | "thumbnail"): Promise<TaxonomyItem[] | null> => {
      const cacheKey = `${categoryId || "root"}_${style}`
      if (fetchedBranches.has(cacheKey)) {
        return fetchedBranches.get(cacheKey)!
      }

      setLoading(true)
      setError(null)
      try {
        const variables = {
          storeId: "3060",
          categoryId: categoryId,
          style: style,
          includeInspirationEvents: false,
        }
        const result = await graphqlRequest<GetTaxonomyResponse>(TAXONOMY_QUERY, variables)
        if (result.data?.taxonomy) {
          let dataToCache: TaxonomyItem[]
          if (categoryId === null) {
            dataToCache = result.data.taxonomy
          } else {
            dataToCache = result.data.taxonomy[0]?.children || []
          }
          setFetchedBranches((prev) => new Map(prev).set(cacheKey, dataToCache))
          setUsingCustomTaxonomy(false)
          return dataToCache
        } else if (result.errors) {
          setError(result.errors[0].message)
        } else {
          setError("No taxonomy data returned.")
        }
      } catch (err) {
        setError(`Failed to fetch taxonomy: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
      return null
    },
    [TAXONOMY_QUERY, fetchedBranches],
  )

  const fetchProducts = useCallback(
    async (categoryId: string, offers = false) => {
      // Only offers parameter, no filters array
      setLoading(true)
      setError(null)
      try {
        const variables: {
          categoryId: string
          page: number
          count: number
          sortBy: string
          offers?: boolean
        } = {
          categoryId: categoryId,
          page: 0,
          count: 20,
          sortBy: "relevance",
        }

        if (offers) {
          variables.offers = true
        }

        const result = await graphqlRequest<GetCategoryProductsResponse>(PRODUCT_QUERY, variables)

        if (result.data?.category) {
          setProductData(result.data)
        } else if (result.errors) {
          setError(result.errors[0].message)
        } else {
          setError("No product data returned or unexpected response structure.")
        }
      } catch (err) {
        setError(`Failed to fetch products: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    },
    [PRODUCT_QUERY],
  )

  const handleResetToAPI = () => {
    localStorage.removeItem('customTaxonomy')
    setUsingCustomTaxonomy(false)
    setSuperDepartmentsData(null)
    setSelectedSuperDepartmentId(null)
    setSelectedDepartmentId(null)
    setSelectedAisleIdForTabs(null)
    setSelectedShelfId(null)
    setSelectedShelfTabId("all")
    setCurrentLevel("superDepartmentGrid")
    const loadAPITaxonomy = async () => {
      const data = await fetchTaxonomyBranch(null, "rounded")
      setSuperDepartmentsData(data)
    }
    loadAPITaxonomy()
  }

  const handleRefreshCustom = () => {
    // Reload custom taxonomy from localStorage
    try {
      const customTaxonomyData = localStorage.getItem('customTaxonomy')
      if (customTaxonomyData) {
        const parsedData = JSON.parse(customTaxonomyData)
        setSuperDepartmentsData(parsedData)
        setUsingCustomTaxonomy(true)
        setSelectedSuperDepartmentId(null)
        setSelectedDepartmentId(null)
        setSelectedAisleIdForTabs(null)
        setSelectedShelfId(null)
        setSelectedShelfTabId("all")
        setCurrentLevel("superDepartmentGrid")
        console.log("Custom taxonomy refreshed from localStorage:", parsedData)
      } else {
        // No custom taxonomy, load from API
        handleResetToAPI()
      }
    } catch (error) {
      console.error("Error refreshing custom taxonomy:", error)
      handleResetToAPI()
    }
  }

  useEffect(() => {
    // Check for custom taxonomy online first, then localStorage
    const loadCustomTaxonomy = async () => {
      try {
        // Try online API first
        const response = await fetch('/api/taxonomy')
        const result = await response.json()
        
        if (response.ok && result.data?.taxonomy) {
          setSuperDepartmentsData(result.data.taxonomy)
          setUsingCustomTaxonomy(true)
          setLoading(false)
          console.log("Online custom taxonomy loaded:", result.data.taxonomy)
          return
        }
      } catch (error) {
        console.error("Error loading online taxonomy:", error)
      }
      
      // Fallback to localStorage
      try {
        const customTaxonomyData = localStorage.getItem('customTaxonomy')
        if (customTaxonomyData) {
          const parsedData = JSON.parse(customTaxonomyData)
          setSuperDepartmentsData(parsedData)
          setUsingCustomTaxonomy(true)
          setLoading(false)
          console.log("localStorage custom taxonomy loaded:", parsedData)
          return
        }
      } catch (error) {
        console.error("Error loading custom taxonomy from localStorage:", error)
      }
      
      // If no custom taxonomy, load from API
      const data = await fetchTaxonomyBranch(null, "rounded")
      setSuperDepartmentsData(data)
    }
    
    loadCustomTaxonomy()
  }, [])

  useEffect(() => {
    if (selectedSuperDepartmentId && superDepartmentsData) {
      const selectedSd = superDepartmentsData.find((sd) => sd.id === selectedSuperDepartmentId)
      if (selectedSd) {
        // If using custom taxonomy, children are already embedded
        if (usingCustomTaxonomy && selectedSd.children && selectedSd.children.length > 0) {
          setSelectedDepartmentId(selectedSd.children[0].id)
        } else {
          // Otherwise, fetch from API
          const style = selectedSd.name === "Clothing & Accessories" ? "rounded" : "thumbnail"
          fetchTaxonomyBranch(selectedSuperDepartmentId, style).then((data) => {
            if (data && data.length > 0) {
              setSelectedDepartmentId(data[0].id)
            } else {
              setSelectedDepartmentId(null)
            }
          })
        }
      }
    }
  }, [selectedSuperDepartmentId, superDepartmentsData, fetchTaxonomyBranch, usingCustomTaxonomy])

  const superDepartments = useMemo(() => superDepartmentsData || [], [superDepartmentsData])

  const departmentsForSelectedSuperDepartment = useMemo(() => {
    if (selectedSuperDepartmentId) {
      const selectedSd = superDepartmentsData?.find((sd) => sd.id === selectedSuperDepartmentId)
      if (selectedSd) {
        // If using custom taxonomy, children are already embedded in the structure
        if (usingCustomTaxonomy && selectedSd.children) {
          return selectedSd.children
        }
        
        // Otherwise, use the cached data from API calls
        const style = selectedSd.name === "Clothing & Accessories" ? "rounded" : "thumbnail"
        const cacheKey = `${selectedSuperDepartmentId}_${style}`
        return fetchedBranches.get(cacheKey) || []
      }
    }
    return []
  }, [selectedSuperDepartmentId, superDepartmentsData, fetchedBranches, usingCustomTaxonomy])

  const currentAisleShelves = useMemo(() => {
    if (!superDepartmentsData) return []
    
    // Determine which category should show tabs based on current selections
    let categoryForTabs: TaxonomyItem | null = null
    
    if (selectedShelfId) {
      // If a shelf is selected, check if it should show tabs for its children
      categoryForTabs = findCategoryById(superDepartmentsData, selectedShelfId)
      if (categoryForTabs && shouldShowTabsForChildren(categoryForTabs.children || [])) {
        return getTabChildren(categoryForTabs)
      }
      
      // If the shelf doesn't have tab-worthy children, check its parent
      categoryForTabs = findParentCategoryForTabs(superDepartmentsData, selectedShelfId)
    } else if (selectedAisleIdForTabs) {
      // If an aisle is selected, check if it should show tabs for its children
      categoryForTabs = findCategoryById(superDepartmentsData, selectedAisleIdForTabs)
      if (categoryForTabs && shouldShowTabsForChildren(categoryForTabs.children || [])) {
        return getTabChildren(categoryForTabs)
      }
      
      // If the aisle doesn't have tab-worthy children, check its parent
      categoryForTabs = findParentCategoryForTabs(superDepartmentsData, selectedAisleIdForTabs)
    }
    
    return categoryForTabs ? getTabChildren(categoryForTabs) : []
  }, [selectedAisleIdForTabs, selectedShelfId, superDepartmentsData])

  const getHeaderTitle = () => {
    switch (currentLevel) {
      case "superDepartmentGrid":
        return "Shop all categories"
      case "departmentTabs":
        const sd = superDepartments.find((sd) => sd.id === selectedSuperDepartmentId)
        return sd ? sd.name : "Departments"
      case "aisleProductsWithTabs":
        const aisleForTabs = departmentsForSelectedSuperDepartment
          .flatMap((d) => d.children || [])
          .find((a) => a.id === selectedAisleIdForTabs)
        return aisleForTabs ? aisleForTabs.name : "Aisle Products"
      case "shelfProducts":
        const shelf = departmentsForSelectedSuperDepartment
          .flatMap((d) => d.children || [])
          .flatMap((a) => a.children || [])
          .find((s) => s.id === selectedShelfId)
        return shelf ? shelf.name : "Shelf Products"
      case "offersProducts": // New title for offers
        let offerCategoryName = "Category"
        if (selectedShelfId) {
          offerCategoryName = currentAisleShelves.find((s) => s.id === selectedShelfId)?.name || "Shelf"
        } else if (selectedAisleIdForTabs) {
          offerCategoryName =
            departmentsForSelectedSuperDepartment
              .flatMap((d) => d.children || [])
              .find((a) => a.id === selectedAisleIdForTabs)?.name || "Aisle"
        } else if (selectedDepartmentId) {
          offerCategoryName =
            departmentsForSelectedSuperDepartment.find((d) => d.id === selectedDepartmentId)?.name || "Department"
        } else if (selectedSuperDepartmentId) {
          offerCategoryName =
            superDepartments.find((sd) => sd.id === selectedSuperDepartmentId)?.name || "Super Department"
        }
        return `Special offers in ${offerCategoryName}`
      default:
        return "Tesco Taxonomy"
    }
  }

  const handleSuperDepartmentSelect = (id: string) => {
    setSelectedSuperDepartmentId(id)
    setCurrentLevel("departmentTabs")
    setProductData(null)
    setSelectedAisleIdForTabs(null)
    setSelectedShelfId(null)
    setSelectedShelfTabId("all")
  }

  const handleDepartmentTabSelect = (id: string) => {
    setSelectedDepartmentId(id)
    setSelectedAisleIdForTabs(null)
    setSelectedShelfId(null)
    setSelectedShelfTabId("all")
  }

  const handleAisleSelectForProducts = (aisleId: string) => {
    setSelectedAisleIdForTabs(aisleId)
    setSelectedShelfId(null)
    setSelectedShelfTabId("all")
    setCurrentLevel("aisleProductsWithTabs")
    fetchProducts(aisleId)
  }

  const handleShelfSelectForProducts = (shelfId: string) => {
    const selectedShelf = findCategoryById(superDepartmentsData || [], shelfId)
    if (!selectedShelf) {
      console.error("Selected shelf not found:", shelfId)
      return
    }
    
    // Check if this shelf has children that should show as tabs
    const hasTabWorthyChildren = shouldShowTabsForChildren(selectedShelf.children || [])
    
    setSelectedShelfId(shelfId)
    setSelectedAisleIdForTabs(null)
    
    if (hasTabWorthyChildren) {
      // If it has tab-worthy children, start with "all" to show all products from this shelf
      setSelectedShelfTabId("all")
    } else {
      // If no tab-worthy children, set tab to the actual shelf ID
      setSelectedShelfTabId(shelfId)
    }
    
    setCurrentLevel("shelfProducts")
    fetchProducts(shelfId)
  }

  const handleSubShelfSelectForProducts = (subShelfId: string) => {
    // This handles L5 sub-shelf selection - we keep the L4 shelf selected but show L5 products
    setSelectedShelfTabId(subShelfId) // Set tab to the specific L5 sub-shelf
    setCurrentLevel("shelfProducts")
    fetchProducts(subShelfId)
  }

  const handleShelfTabClick = (id: string) => {
    setSelectedShelfTabId(id)
    if (id === "all") {
      // Find the parent category that should show "all" products
      let parentCategoryId: string | null = null
      
      if (selectedShelfId) {
        // If we have a selected shelf, check if it has tab-worthy children
        const shelfCategory = findCategoryById(superDepartmentsData || [], selectedShelfId)
        if (shelfCategory && shouldShowTabsForChildren(shelfCategory.children || [])) {
          // Show all products from the shelf (parent of the tabs)
          parentCategoryId = selectedShelfId
        } else {
          // Find the parent that has tab-worthy children
          const parentForTabs = findParentCategoryForTabs(superDepartmentsData || [], selectedShelfId)
          parentCategoryId = parentForTabs?.id || selectedShelfId
        }
      } else if (selectedAisleIdForTabs) {
        // If we have a selected aisle, check if it has tab-worthy children
        const aisleCategory = findCategoryById(superDepartmentsData || [], selectedAisleIdForTabs)
        if (aisleCategory && shouldShowTabsForChildren(aisleCategory.children || [])) {
          // Show all products from the aisle (parent of the tabs)
          parentCategoryId = selectedAisleIdForTabs
        } else {
          // Find the parent that has tab-worthy children
          const parentForTabs = findParentCategoryForTabs(superDepartmentsData || [], selectedAisleIdForTabs)
          parentCategoryId = parentForTabs?.id || selectedAisleIdForTabs
        }
      }
      
      if (parentCategoryId) {
        fetchProducts(parentCategoryId)
      }
    } else {
      // Show products for the specific tab category
      fetchProducts(id)
    }
  }

  const handleSpecialOffersClick = (categoryId: string, categoryName: string) => {
    setCurrentLevel("offersProducts")
    fetchProducts(categoryId, true) // Fetch products with offers: true
  }

  const handleBack = () => {
    if (currentLevel === "departmentTabs") {
      setCurrentLevel("superDepartmentGrid")
      setSelectedSuperDepartmentId(null)
      setSelectedDepartmentId(null)
    } else if (
      currentLevel === "aisleProductsWithTabs" ||
      currentLevel === "shelfProducts" ||
      currentLevel === "offersProducts"
    ) {
      // Added offersProducts
      setCurrentLevel("departmentTabs")
      setProductData(null)
      setSelectedAisleIdForTabs(null)
      setSelectedShelfId(null)
      setSelectedShelfTabId("all") // Reset to "all" when going back to department level
    }
  }

  const renderSpecialOffersButton = () => {
    let categoryId: string | null = null
    let categoryName: string | null = null

    if (currentLevel === "departmentTabs" && selectedDepartmentId) {
      categoryId = selectedDepartmentId
      categoryName =
        departmentsForSelectedSuperDepartment.find((d) => d.id === selectedDepartmentId)?.name || "this department"
    } else if (currentLevel === "aisleProductsWithTabs" && selectedAisleIdForTabs) {
      categoryId = selectedAisleIdForTabs
      categoryName =
        departmentsForSelectedSuperDepartment
          .flatMap((d) => d.children || [])
          .find((a) => a.id === selectedAisleIdForTabs)?.name || "this aisle"
    } else if (currentLevel === "shelfProducts" && selectedShelfId) {
      categoryId = selectedShelfId
      categoryName = currentAisleShelves.find((s) => s.id === selectedShelfId)?.name || "this shelf"
    }

    if (categoryId && categoryName) {
      const isProductLevel = currentLevel === "aisleProductsWithTabs" || currentLevel === "shelfProducts" || currentLevel === "offersProducts"
      return (
        <div className={`p-4 pt-4 ${isProductLevel ? 'flex justify-center' : ''}`}>
          <Button
            onClick={() => handleSpecialOffersClick(categoryId!, categoryName!)}
            className={`font-bold bg-yellow-400 text-black hover:bg-yellow-500 ${isProductLevel ? 'w-auto' : 'w-full'}`}
          >
            Special offers in {categoryName}
          </Button>
        </div>
      )
    }
    return null
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )
    }

    switch (currentLevel) {
      case "superDepartmentGrid":
        if (superDepartments.length === 0) {
          return <div className="p-4 text-gray-500">No super departments found.</div>
        }
        return <SuperDepartmentGrid superDepartments={superDepartments} onSelect={handleSuperDepartmentSelect} />
      case "departmentTabs":
        if (departmentsForSelectedSuperDepartment.length === 0) {
          return <div className="p-4 text-gray-500">No departments found for this category.</div>
        }
        return (
          <DepartmentTabsContent
            selectedDepartmentId={selectedDepartmentId}
            departments={departmentsForSelectedSuperDepartment}
            onSelectAisleForProducts={handleAisleSelectForProducts}
            onSelectShelfForProducts={handleShelfSelectForProducts}
          />
        )
      case "aisleProductsWithTabs":
      case "shelfProducts":
      case "offersProducts": // Handle offersProducts here
        if (!productData || productData.category.productItems.length === 0) {
          return (
            <div className="p-4 text-gray-500">
              No products found for this {currentLevel === "offersProducts" ? "offer category" : "selection"}.
            </div>
          )
        }
        return (
          <AisleProductListingWithTabs
            products={productData.category.productItems}
            totalCount={productData.category.pageInformation.totalCount}
          />
        )
      default:
        return <div className="p-4 text-gray-500">Select a category to browse.</div>
    }
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <NavigationHeader
        title={getHeaderTitle()}
        onBack={currentLevel !== "superDepartmentGrid" ? handleBack : undefined}
      >
        {currentLevel === "departmentTabs" && departmentsForSelectedSuperDepartment.length > 0 && (
          <DepartmentTabs
            departments={departmentsForSelectedSuperDepartment}
            onSelectDepartment={handleDepartmentTabSelect}
            selectedDepartmentId={selectedDepartmentId}
          />
        )}
        {currentLevel === "aisleProductsWithTabs" && currentAisleShelves.length > 1 && (
          <AisleShelfTabs
            shelves={currentAisleShelves}
            selectedShelfTabId={selectedShelfTabId}
            onShelfTabClick={handleShelfTabClick}
          />
        )}
        {currentLevel === "shelfProducts" && currentAisleShelves.length > 1 && (
          <AisleShelfTabs
            shelves={currentAisleShelves}
            selectedShelfTabId={selectedShelfTabId}
            onShelfTabClick={handleShelfTabClick}
          />
        )}
        {renderSpecialOffersButton()} {/* Render the special offers button */}
      </NavigationHeader>
      <div className="flex-grow overflow-y-auto">{renderContent()}</div>
    </div>
  )
}
