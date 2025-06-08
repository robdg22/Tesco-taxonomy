"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, GetCategoryProductsResponse, TaxonomyItem } from "@/types/tesco"
import { SuperDepartmentList } from "@/components/taxonomy-prototype-1/super-department-list"
import { DepartmentGrid } from "@/components/taxonomy-prototype-1/department-grid"
import { AisleGrid } from "@/components/taxonomy-prototype-1/aisle-grid"
import { ShelfGrid } from "@/components/taxonomy-prototype-1/shelf-grid"
import { ProductGrid } from "@/components/taxonomy-prototype-1/product-grid"
import { NavigationHeader } from "@/components/taxonomy-prototype-1/navigation-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, RotateCcw, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // For tabs
import { Button } from "@/components/ui/button" // For tabs
import Link from "next/link"

console.log("TaxonomyPrototype6Page component is rendering.")

type NavigationLevel =
  | "superDepartment"
  | "department"
  | "aisle"
  | "shelf"
  | "products"
  | "aisleProducts"
  | "offersProducts" // Added offersProducts

export default function TaxonomyPrototype6Page() {
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>("superDepartment")
  const [selectedSuperDepartmentId, setSelectedSuperDepartmentId] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(null)
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null) // Keep for shelf-level products

  const [taxonomyData, setTaxonomyData] = useState<TaxonomyItem[] | null>(null)
  const [productData, setProductData] = useState<GetCategoryProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAisleProductsDirectly, setShowAisleProductsDirectly] = useState(false) // New state for toggle
  const [selectedShelfTabId, setSelectedShelfTabId] = useState<string>("all") // New state for selected tab
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
    $offers: Boolean # Added offers variable
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
        promotions {
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

  const fetchTaxonomy = useCallback(
    async (categoryId?: string) => {
      setLoading(true)
      setError(null)
      try {
        const variables = {
          storeId: "3060",
          categoryId: categoryId || null,
          style: "thumbnail",
          includeInspirationEvents: false,
        }
        console.log("Fetching taxonomy with variables:", variables)
        const result = await graphqlRequest<GetTaxonomyResponse>(TAXONOMY_QUERY, variables)
        if (result.data?.taxonomy) {
          setTaxonomyData(result.data.taxonomy)
          setUsingCustomTaxonomy(false)
          console.log("API taxonomy data fetched:", result.data.taxonomy)
        } else if (result.errors) {
          console.error("Taxonomy fetch errors:", result.errors)
          setError(result.errors[0].message)
        } else {
          setError("No taxonomy data returned.")
        }
      } catch (err) {
        console.error("Taxonomy fetch caught error:", err)
        setError(`Failed to fetch taxonomy: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    },
    [TAXONOMY_QUERY],
  )

  const fetchProducts = useCallback(
    async (categoryId: string, offers = false) => {
      // Added offers parameter
      setLoading(true)
      setError(null)
      try {
        const variables = {
          categoryId: categoryId,
          page: 0,
          count: 20,
          sortBy: "relevance",
          offers: offers, // Pass offers variable
        }
        console.log("Fetching products with variables:", variables)
        const result = await graphqlRequest<GetCategoryProductsResponse>(PRODUCT_QUERY, variables)

        console.log("Product API raw result:", result)

        if (result.data?.category) {
          setProductData(result.data)
          console.log("Product data fetched successfully:", result.data)
        } else if (result.errors) {
          console.error("Product fetch errors:", result.errors)
          setError(result.errors[0].message)
        } else {
          setError("No product data returned or unexpected response structure.")
        }
      } catch (err) {
        console.error("Product fetch caught error:", err)
        setError(`Failed to fetch products: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    },
    [PRODUCT_QUERY],
  )

  useEffect(() => {
    // Check for custom taxonomy online first, then localStorage
    const loadCustomTaxonomy = async () => {
      try {
        // Try online API first
        const response = await fetch('/api/taxonomy')
        const result = await response.json()
        
        if (response.ok && result.data?.taxonomy) {
          setTaxonomyData(result.data.taxonomy)
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
          setTaxonomyData(parsedData)
          setUsingCustomTaxonomy(true)
          setLoading(false)
          console.log("localStorage custom taxonomy loaded:", parsedData)
          return
        }
      } catch (error) {
        console.error("Error loading custom taxonomy from localStorage:", error)
      }
      
      // If no custom taxonomy, load from API
      fetchTaxonomy()
    }
    
    loadCustomTaxonomy()
  }, [])

  useEffect(() => {
    if (taxonomyData && !selectedSuperDepartmentId && taxonomyData.length > 0) {
      setSelectedSuperDepartmentId(taxonomyData[0].id)
      console.log("Initial super department selected:", taxonomyData[0].id)
    }
  }, [taxonomyData, selectedSuperDepartmentId])

  const superDepartments = useMemo(() => {
    const sds = taxonomyData || []
    console.log("SuperDepartments derived:", sds)
    return sds
  }, [taxonomyData])
  const departments = useMemo(() => {
    if (selectedSuperDepartmentId) {
      const depts = superDepartments.find((sd) => sd.id === selectedSuperDepartmentId)?.children || []
      console.log("Departments derived:", depts)
      return depts
    }
    return []
  }, [selectedSuperDepartmentId, superDepartments])

  const aisles = useMemo(() => {
    if (selectedDepartmentId) {
      const aislesData = departments.find((d) => d.id === selectedDepartmentId)?.children || []
      console.log("Aisles derived:", aislesData)
      return aislesData
    }
    return []
  }, [selectedDepartmentId, departments])

  const shelves = useMemo(() => {
    if (selectedAisleId) {
      const shelvesData = aisles.find((a) => a.id === selectedAisleId)?.children || []
      console.log("Shelves derived:", shelvesData)
      return shelvesData
    }
    return []
  }, [selectedAisleId, aisles])

  const handleSuperDepartmentSelect = (id: string) => {
    setSelectedSuperDepartmentId(id)
    setSelectedDepartmentId(null)
    setSelectedAisleId(null)
    setSelectedShelfId(null)
    setCurrentLevel("superDepartment")
    console.log("Selected SuperDepartment:", id)
  }

  const handleDepartmentSelect = (id: string) => {
    setSelectedDepartmentId(id)
    setSelectedAisleId(null)
    setSelectedShelfId(null)
    
    // Find the selected department to check its children (aisles)
    const selectedDepartment = departments.find((d) => d.id === id)
    const aislesForDepartment = selectedDepartment?.children || []

    // Check if this department has no children (aisles) - if so, show products directly
    if (aislesForDepartment.length === 0) {
      setCurrentLevel("aisleProducts") // Show products for this department
      fetchProducts(id) // Fetch products for the department
      console.log("Selected Department has no aisles, fetching products directly for department:", id)
      return
    }

    setCurrentLevel("department")
    console.log("Selected Department:", id)
  }

  const handleAisleSelect = (id: string) => {
    setSelectedAisleId(id)
    setSelectedShelfId(null) // Clear shelf selection
    setSelectedShelfTabId("all") // Reset tab selection to 'all'

    // Find the selected aisle to check its children (shelves)
    const selectedAisle = aisles.find((a) => a.id === id)
    const shelvesForAisle = selectedAisle?.children || []

    // Check if this aisle has no children (shelves) - if so, show products directly
    if (shelvesForAisle.length === 0) {
      setCurrentLevel("aisleProducts") // Show products for this aisle
      fetchProducts(id) // Fetch products for the aisle
      console.log("Selected Aisle has no shelves, fetching products directly for aisle:", id)
      return
    }

    // Modify the conditional logic for navigation
    if (showAisleProductsDirectly || shelvesForAisle.length === 1) {
      setCurrentLevel("aisleProducts") // New level for aisle-level products
      fetchProducts(id) // Fetch products for the aisle
      console.log("Selected Aisle, fetching products for aisle:", id)
    } else {
      setCurrentLevel("aisle") // Go to shelf grid
      console.log("Selected Aisle, navigating to shelves for:", id)
    }
  }

  const handleShelfSelect = (id: string) => {
    setSelectedShelfId(id)
    setCurrentLevel("products")
    fetchProducts(id)
    console.log("Selected Shelf, fetching products for:", id)
  }

  const handleShelfTabClick = (id: string) => {
    setSelectedShelfTabId(id)
    if (id === "all") {
      fetchProducts(selectedAisleId!) // Fetch all products for the aisle
    } else {
      fetchProducts(id) // Fetch products for the specific shelf
    }
  }

  const handleSpecialOffersClick = (categoryId: string, categoryName: string) => {
    setCurrentLevel("offersProducts")
    fetchProducts(categoryId, true) // Fetch products with offers: true
    console.log(`Fetching special offers for ${categoryName} (ID: ${categoryId})`)
  }

  const handleResetToAPI = () => {
    localStorage.removeItem('customTaxonomy')
    setUsingCustomTaxonomy(false)
    setTaxonomyData(null)
    setSelectedSuperDepartmentId(null)
    setSelectedDepartmentId(null)
    setSelectedAisleId(null)
    setSelectedShelfId(null)
    setCurrentLevel("superDepartment")
    fetchTaxonomy()
  }

  const handleRefreshCustom = () => {
    // Reload custom taxonomy from localStorage
    try {
      const customTaxonomyData = localStorage.getItem('customTaxonomy')
      if (customTaxonomyData) {
        const parsedData = JSON.parse(customTaxonomyData)
        setTaxonomyData(parsedData)
        setUsingCustomTaxonomy(true)
        setSelectedSuperDepartmentId(null)
        setSelectedDepartmentId(null)
        setSelectedAisleId(null)
        setSelectedShelfId(null)
        setCurrentLevel("superDepartment")
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

  const handleBack = () => {
    if (currentLevel === "products") {
      setCurrentLevel("aisle")
      setProductData(null)
      console.log("Navigating back from Shelf Products to Aisle level.")
    } else if (currentLevel === "aisleProducts") {
      setCurrentLevel("department") // From aisle products, go back to department grid
      setProductData(null)
      console.log("Navigating back from Aisle Products to Department level.")
    } else if (currentLevel === "offersProducts") {
      // Handle back from offers based on the deepest selected category
      if (selectedShelfId) {
        setCurrentLevel("shelf")
      } else if (selectedAisleId) {
        setCurrentLevel("aisle")
      } else if (selectedDepartmentId) {
        setCurrentLevel("department")
      } else if (selectedSuperDepartmentId) {
        setCurrentLevel("superDepartment") // Go back to superDepartment if offers were from there
      }
      setProductData(null)
      console.log("Navigating back from Special Offers.")
    } else if (currentLevel === "shelf") {
      setCurrentLevel("aisle")
      console.log("Navigating back from Shelf Grid to Aisle level.")
    } else if (currentLevel === "aisle") {
      setCurrentLevel("department")
      console.log("Navigating back from Aisle Grid to Department level.")
    } else if (currentLevel === "department") {
      setCurrentLevel("superDepartment")
      console.log("Navigating back from Department Grid to SuperDepartment level.")
    }
  }

  const getHeaderTitle = () => {
    switch (currentLevel) {
      case "superDepartment":
        return "" // Removed "Shop all categories" title for superDepartment level
      case "department":
        return departments.find((d) => d.id === selectedDepartmentId)?.name || "Departments"
      case "aisle":
        return aisles.find((a) => a.id === selectedAisleId)?.name || "Aisles"
      case "shelf":
        return shelves.find((s) => s.id === selectedShelfId)?.name || "Shelves"
      case "products":
        // Show shelf name for products from a specific shelf
        return shelves.find((s) => s.id === selectedShelfId)?.name || "Products"
      case "aisleProducts":
        // Show aisle name for products from an aisle (single shelf or direct toggle)
        return aisles.find((a) => a.id === selectedAisleId)?.name || "Aisle Products"
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

  const renderRightPanelContent = () => {
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
      return <div className="p-4 text-red-500">Error: {error}</div>
    }

    switch (currentLevel) {
      case "superDepartment":
        if (departments.length === 0) {
          return <div className="p-4 text-gray-500">No departments found for this category.</div>
        }
        return <DepartmentGrid departments={departments} onSelect={handleDepartmentSelect} />
      case "department":
        if (aisles.length === 0) {
          return <div className="p-4 text-gray-500">No subcategories found. This category may contain products directly.</div>
        }
        return (
          <AisleGrid
            aisles={aisles}
            onSelect={handleAisleSelect}
            showAisleProductsDirectly={showAisleProductsDirectly}
            onToggleChange={setShowAisleProductsDirectly}
          />
        )
      case "aisle":
        if (shelves.length === 0) {
          return <div className="p-4 text-gray-500">No subcategories found. This category may contain products directly.</div>
        }
        return <ShelfGrid shelves={shelves} onSelect={handleShelfSelect} />
      case "products":
      case "aisleProducts":
      case "offersProducts": // Handle offersProducts here
        if (!productData || productData.category.productItems.length === 0) {
          return (
            <div className="p-4 text-gray-500">
              No products found for this {currentLevel === "offersProducts" ? "offer category" : "selection"}.
            </div>
          )
        }
        return productData ? (
          <ProductGrid
            products={productData.category.productItems}
            totalCount={productData.category.pageInformation.totalCount}
          />
        ) : (
          <div className="p-4 text-gray-500">No products found.</div>
        )
      default:
        return <div className="p-4 text-gray-500">Select a category to browse.</div>
    }
  }

  const isSuperDepartmentLevel = currentLevel === "superDepartment"

  const currentAisleShelves = useMemo(() => {
    if (selectedAisleId) {
      return aisles.find((a) => a.id === selectedAisleId)?.children || []
    }
    return []
  }, [selectedAisleId, aisles])

  const renderShelfTabs = () => {
    if (currentLevel !== "aisleProducts") return null

    return (
      <ScrollArea className="w-full whitespace-nowrap h-12">
        <div className="flex w-max space-x-4 px-4 py-2">
          <Button
            variant="ghost"
            className={cn(
              "pb-2 pt-0 h-auto rounded-none border-b-2 border-transparent min-w-[100px]",
              selectedShelfTabId === "all" && "border-blue-500 text-blue-700",
            )}
            onClick={() => handleShelfTabClick("all")}
          >
            All
          </Button>
          {currentAisleShelves.map((shelf) => (
            <Button
              key={shelf.id}
              variant="ghost"
              className={cn(
                "pb-2 pt-0 h-auto rounded-none border-b-2 border-transparent min-w-[100px]",
                selectedShelfTabId === shelf.id && "border-blue-500 text-blue-700",
              )}
              onClick={() => handleShelfTabClick(shelf.id)}
            >
              {shelf.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    )
  }

  const renderSpecialOffersButton = () => {
    let categoryId: string | null = null
    let categoryName: string | null = null

    if (currentLevel === "superDepartment" && selectedSuperDepartmentId) {
      categoryId = selectedSuperDepartmentId
      categoryName = superDepartments.find((sd) => sd.id === selectedSuperDepartmentId)?.name || "this category"
    } else if (currentLevel === "department" && selectedDepartmentId) {
      categoryId = selectedDepartmentId
      categoryName = departments.find((d) => d.id === selectedDepartmentId)?.name || "this department"
    } else if (currentLevel === "aisle" && selectedAisleId) {
      categoryId = selectedAisleId
      categoryName = aisles.find((a) => a.id === selectedAisleId)?.name || "this aisle"
    } else if (currentLevel === "shelf" && selectedShelfId) {
      categoryId = selectedShelfId
      categoryName = shelves.find((s) => s.id === selectedShelfId)?.name || "this shelf"
    }

    if (categoryId && categoryName) {
      return (
        <div className="p-4 pt-0">
          <Button
            onClick={() => handleSpecialOffersClick(categoryId!, categoryName!)}
            className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
          >
            Special offers in {categoryName}
          </Button>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - SuperDepartments */}
      <div className={cn("transition-all duration-300 ease-in-out", isSuperDepartmentLevel ? "w-1/3" : "w-0 hidden")}>
        {loading && (
          <div className="p-2 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {error && (
          <div className="p-2">
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        {!loading && !error && superDepartments.length === 0 && (
          <div className="p-4 text-gray-500">No super departments found.</div>
        )}
        {!loading && !error && superDepartments.length > 0 && (
          <SuperDepartmentList
            superDepartments={superDepartments}
            selectedSuperDepartmentId={selectedSuperDepartmentId}
            onSelect={handleSuperDepartmentSelect}
          />
        )}
      </div>

      {/* Right Panel - Dynamic Content */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out",
          isSuperDepartmentLevel ? "w-2/3" : "w-full",
        )}
      >
        <NavigationHeader title={getHeaderTitle()} onBack={currentLevel !== "superDepartment" ? handleBack : undefined}>
          {usingCustomTaxonomy && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b">
              <span className="text-sm text-blue-700">Using custom taxonomy</span>
              <Link href="/taxonomy-test">
                <Button variant="outline" size="sm" className="h-6 text-xs">
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleRefreshCustom}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          )}
          {renderShelfTabs()} {/* Render tabs as children of the header */}
          {renderSpecialOffersButton()} {/* Render the special offers button */}
        </NavigationHeader>
        {renderRightPanelContent()}
      </div>
    </div>
  )
}
