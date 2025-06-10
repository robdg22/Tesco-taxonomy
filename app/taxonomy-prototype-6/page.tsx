"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, GetCategoryProductsResponse, TaxonomyItem } from "@/types/tesco" // Removed FilterInput import
import { SuperDepartmentGrid } from "@/components/taxonomy-prototype-3/super-department-grid"
import { DepartmentTabs } from "@/components/taxonomy-prototype-3/department-tabs"
import { AisleGrid } from "@/components/taxonomy-prototype-3/aisle-grid"
import { ShelfGrid } from "@/components/taxonomy-prototype-3/shelf-grid"
import { ProductGrid } from "@/components/taxonomy-prototype-3/product-grid"
import { NavigationHeader } from "@/components/taxonomy-prototype-3/navigation-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { Button } from "@/components/ui/button" // Import Button for special offers
import { AisleShelfTabs } from "@/components/taxonomy-prototype-2/aisle-shelf-tabs"

type NavigationLevel = "superDepartmentGrid" | "departmentTabs" | "shelfGrid" | "productListing" | "offersProducts" // Added offersProducts

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

export default function TaxonomyPrototype6Page() {
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>("superDepartmentGrid")
  const [selectedSuperDepartmentId, setSelectedSuperDepartmentId] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(null)
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
          const dataToCache = categoryId === null ? result.data.taxonomy : result.data.taxonomy[0]?.children || []
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
    setSelectedAisleId(null)
    setSelectedShelfId(null)
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
        setSelectedAisleId(null)
        setSelectedShelfId(null)
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

  // Derived data based on current selections
  const superDepartments = useMemo(() => superDepartmentsData || [], [superDepartmentsData])

  const departments = useMemo(() => {
    if (selectedSuperDepartmentId) {
      const selectedSd = superDepartmentsData?.find((sd) => sd.id === selectedSuperDepartmentId)
      if (selectedSd) {
        // If using custom taxonomy, children are already embedded in the structure
        if (usingCustomTaxonomy && selectedSd.children) {
          return selectedSd.children
        }
        
        // Otherwise, retrieve departments from cache, which were fetched with 'thumbnail' style
        const cacheKey = `${selectedSuperDepartmentId}_thumbnail`
        return fetchedBranches.get(cacheKey) || []
      }
    }
    return []
  }, [selectedSuperDepartmentId, superDepartmentsData, fetchedBranches, usingCustomTaxonomy])

  const aisles = useMemo(() => {
    if (selectedDepartmentId) {
      return departments.find((d) => d.id === selectedDepartmentId)?.children || []
    }
    return []
  }, [selectedDepartmentId, departments])

  const shelves = useMemo(() => {
    if (selectedAisleId) {
      return aisles.find((a) => a.id === selectedAisleId)?.children || []
    }
    return []
  }, [selectedAisleId, aisles])

  // Calculate current aisle shelves for tabs (works with both API and custom taxonomy)
  const currentAisleShelves = useMemo(() => {
    if (selectedShelfId) {
      // If a shelf is selected, show its direct children (sub-shelves)
      const selectedShelf = findCategoryById(superDepartmentsData || [], selectedShelfId)
      return selectedShelf?.children || []
    } else if (selectedAisleId) {
      // If an aisle is selected, show its direct children (shelves)
      const selectedAisle = findCategoryById(superDepartmentsData || [], selectedAisleId)
      return selectedAisle?.children || []
    }
    return []
  }, [selectedAisleId, selectedShelfId, superDepartmentsData])

  // Handlers for navigation
  const handleSuperDepartmentSelect = async (id: string) => {
    setSelectedSuperDepartmentId(id)
    setCurrentLevel("departmentTabs")
    setProductData(null)
    setSelectedAisleId(null)
    setSelectedShelfId(null)

    if (usingCustomTaxonomy && superDepartmentsData) {
      // If using custom taxonomy, children are already embedded
      const selectedSd = superDepartmentsData.find((sd) => sd.id === id)
      if (selectedSd && selectedSd.children && selectedSd.children.length > 0) {
        setSelectedDepartmentId(selectedSd.children[0].id) // Select first department by default
      } else {
        setSelectedDepartmentId(null)
      }
    } else {
      // Otherwise, fetch children (departments, aisles, shelves) with 'thumbnail' style
      const childrenData = await fetchTaxonomyBranch(id, "thumbnail")
      if (childrenData && childrenData.length > 0) {
        setSelectedDepartmentId(childrenData[0].id) // Select first department by default
      } else {
        setSelectedDepartmentId(null)
      }
    }
  }

  const handleDepartmentSelect = (id: string) => {
    setSelectedDepartmentId(id)
    setSelectedAisleId(null)
    setSelectedShelfId(null)
    setProductData(null)
    // Stay on departmentTabs level, but update the aisle grid below
  }

  const handleAisleSelect = (id: string) => {
    // Find the selected aisle to check its children (shelves)
    const selectedAisle = aisles.find((a) => a.id === id)
    const shelvesForAisle = selectedAisle?.children || []

    // Modify the conditional logic for navigation
    if (shelvesForAisle.length <= 1) {
      setCurrentLevel("productListing") // Go straight to product listing
      setSelectedShelfTabId("all") // Show "all" since we're showing aisle products
      fetchProducts(id) // Fetch products for the AISLE ID
    } else {
      setCurrentLevel("shelfGrid") // Go to shelf grid as usual
      setSelectedShelfTabId("all") // Reset to "all" for shelf grid
    }
    setSelectedAisleId(id)
    setSelectedShelfId(null)
    setProductData(null)
  }

  const handleShelfSelect = (id: string) => {
    const selectedShelf = findCategoryById(superDepartmentsData || [], id)
    if (!selectedShelf) {
      console.error("Selected shelf not found:", id)
      return
    }
    
    // Check if this shelf has direct children (sub-shelves)
    const hasChildren = selectedShelf.children && selectedShelf.children.length > 0
    
    if (hasChildren) {
      // If it has children, set up to show tabs for those children
      setSelectedShelfId(id)
      setSelectedShelfTabId("all") // Start with "all" to show all products from this shelf
      setCurrentLevel("productListing")
      fetchProducts(id) // Show all products from the shelf initially
    } else {
      // If no children, go directly to products for this shelf
      setSelectedShelfId(id)
      setSelectedShelfTabId(id) // Set tab to the actual shelf ID
      setCurrentLevel("productListing")
      fetchProducts(id)
    }
  }

  const handleShelfTabClick = (id: string) => {
    setSelectedShelfTabId(id)
    if (id === "all") {
      // Show all products from the parent category (shelf or aisle)
      if (selectedShelfId) {
        fetchProducts(selectedShelfId)
      } else if (selectedAisleId) {
        fetchProducts(selectedAisleId)
      }
    } else {
      // Show products for the specific tab category (sub-shelf)
      fetchProducts(id)
    }
  }

  const handleSpecialOffersClick = (categoryId: string, categoryName: string) => {
    setCurrentLevel("offersProducts")
    fetchProducts(categoryId, true) // Fetch products with offers: true
  }

  const handleBack = () => {
    if (currentLevel === "productListing" || currentLevel === "offersProducts") {
      // Added offersProducts
      // If we came from a shelf, go back to shelfGrid. If from aisle (single shelf), go back to departmentTabs.
      if (selectedShelfId) {
        setCurrentLevel("shelfGrid")
        setSelectedShelfTabId("all") // Reset to "all" when going back to shelf grid
      } else if (selectedAisleId) {
        setCurrentLevel("departmentTabs")
        setSelectedShelfTabId("all") // Reset to "all" when going back to department tabs
      }
      setProductData(null)
    } else if (currentLevel === "shelfGrid") {
      setCurrentLevel("departmentTabs")
      setSelectedAisleId(null)
      setSelectedShelfTabId("all")
    } else if (currentLevel === "departmentTabs") {
      setCurrentLevel("superDepartmentGrid")
      setSelectedSuperDepartmentId(null)
      setSelectedDepartmentId(null)
      setSelectedAisleId(null)
      setSelectedShelfId(null)
      setSelectedShelfTabId("all")
    }
  }

  const getHeaderTitle = () => {
    switch (currentLevel) {
      case "superDepartmentGrid":
        return "Shop all categories"
      case "departmentTabs":
        return superDepartments.find((sd) => sd.id === selectedSuperDepartmentId)?.name || "Departments"
      case "shelfGrid":
        return aisles.find((a) => a.id === selectedAisleId)?.name || "Aisles"
      case "productListing":
        // Prioritize shelf name if available, otherwise use aisle name
        if (selectedShelfId) {
          return shelves.find((s) => s.id === selectedShelfId)?.name || "Products"
        } else if (selectedAisleId) {
          return aisles.find((a) => a.id === selectedAisleId)?.name || "Products"
        }
        return "Products"
      case "offersProducts": // New title for offers
        let offerCategoryName = "Category"
        if (selectedShelfId) {
          offerCategoryName = shelves.find((s) => s.id === selectedShelfId)?.name || "Shelf"
        } else if (selectedAisleId) {
          offerCategoryName = aisles.find((a) => a.id === selectedAisleId)?.name || "Aisle"
        } else if (selectedDepartmentId) {
          offerCategoryName = departments.find((d) => d.id === selectedDepartmentId)?.name || "Department"
        } else if (selectedSuperDepartmentId) {
          offerCategoryName =
            superDepartments.find((sd) => sd.id === selectedSuperDepartmentId)?.name || "Super Department"
        }
        return `Special offers in ${offerCategoryName}`
      default:
        return "Tesco Taxonomy"
    }
  }

  const renderSpecialOffersButton = () => {
    let categoryId: string | null = null
    let categoryName: string | null = null

    if (currentLevel === "departmentTabs" && selectedDepartmentId) {
      categoryId = selectedDepartmentId
      categoryName = departments.find((d) => d.id === selectedDepartmentId)?.name || "this department"
    } else if (currentLevel === "shelfGrid" && selectedAisleId) {
      // Changed from selectedAisleIdForTabs
      categoryId = selectedAisleId
      categoryName = aisles.find((a) => a.id === selectedAisleId)?.name || "this aisle"
    } else if (currentLevel === "productListing" && selectedShelfId) {
      categoryId = selectedShelfId
      categoryName = shelves.find((s) => s.id === selectedShelfId)?.name || "this shelf"
    }

    if (categoryId && categoryName) {
      const isProductLevel = currentLevel === "productListing" || currentLevel === "offersProducts"
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
        if (aisles.length === 0) {
          return <div className="p-4 text-gray-500">No aisles found for this department.</div>
        }
        return <AisleGrid aisles={aisles} onSelect={handleAisleSelect} />
      case "shelfGrid":
        if (shelves.length === 0) {
          return <div className="p-4 text-gray-500">No shelves found for this aisle.</div>
        }
        return <ShelfGrid shelves={shelves} onSelect={handleShelfSelect} />
      case "productListing":
      case "offersProducts": // Handle offersProducts here
        if (!productData || productData.category.productItems.length === 0) {
          return (
            <div className="p-4 text-gray-500">
              No products found for this {currentLevel === "offersProducts" ? "offer category" : "selection"}.
            </div>
          )
        }
        return (
          <ProductGrid
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
        {currentLevel === "departmentTabs" && departments.length > 0 && (
          <DepartmentTabs
            departments={departments}
            onSelectDepartment={handleDepartmentSelect}
            selectedDepartmentId={selectedDepartmentId}
          />
        )}
        {currentLevel === "productListing" && selectedAisleId && currentAisleShelves.length > 1 && (
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
