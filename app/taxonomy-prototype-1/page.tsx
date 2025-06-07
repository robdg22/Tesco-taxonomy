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
import { Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { AisleProductListing } from "@/components/taxonomy-prototype-1/aisle-product-listing" // Still used for product display
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // For tabs
import { Button } from "@/components/ui/button" // For tabs

console.log("TaxonomyPrototype1Page component is rendering.")

type NavigationLevel = "superDepartment" | "department" | "aisle" | "shelf" | "products" | "aisleProducts"

export default function TaxonomyPrototype1Page() {
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
    ) {
      category(
        page: $page
        count: $count
        sortBy: $sortBy
        categoryId: $categoryId
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
          console.log("Taxonomy data fetched:", result.data.taxonomy)
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
    async (categoryId: string) => {
      setLoading(true)
      setError(null)
      try {
        const variables = {
          categoryId: categoryId,
          page: 0,
          count: 20,
          sortBy: "relevance",
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
    fetchTaxonomy()
  }, [fetchTaxonomy])

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
    setCurrentLevel("department")
    console.log("Selected Department:", id)
  }

  const handleAisleSelect = (id: string) => {
    setSelectedAisleId(id)
    setSelectedShelfId(null) // Clear shelf selection
    setSelectedShelfTabId("all") // Reset tab selection to 'all'
    if (showAisleProductsDirectly) {
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

  const handleBack = () => {
    if (currentLevel === "products") {
      setCurrentLevel("aisle")
      setProductData(null)
      console.log("Navigating back from Shelf Products to Aisle level.")
    } else if (currentLevel === "aisleProducts") {
      setCurrentLevel("department") // From aisle products, go back to department grid
      setProductData(null)
      console.log("Navigating back from Aisle Products to Department level.")
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
        return shelves.find((s) => s.id === selectedShelfId)?.name || "Products"
      case "aisleProducts":
        return aisles.find((a) => a.id === selectedAisleId)?.name || "Aisle Products"
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
        // Removed NavigationHeader from here
        return <DepartmentGrid departments={departments} onSelect={handleDepartmentSelect} />
      case "department":
        if (aisles.length === 0) {
          return <div className="p-4 text-gray-500">No aisles found for this department.</div>
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
          return <div className="p-4 text-gray-500">No shelves found for this aisle.</div>
        }
        return <ShelfGrid shelves={shelves} onSelect={handleShelfSelect} />
      case "products":
        if (!productData || productData.category.productItems.length === 0) {
          return <div className="p-4 text-gray-500">No products found for this shelf.</div>
        }
        return productData ? (
          <ProductGrid
            products={productData.category.productItems}
            totalCount={productData.category.pageInformation.totalCount}
          />
        ) : (
          <div className="p-4 text-gray-500">No products found.</div>
        )
      case "aisleProducts":
        if (!productData || productData.category.productItems.length === 0) {
          return <div className="p-4 text-gray-500">No products found for this aisle.</div>
        }
        return (
          <AisleProductListing
            products={productData.category.productItems}
            totalCount={productData.category.pageInformation.totalCount}
          />
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

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - SuperDepartments */}
      <div className={cn("transition-all duration-300 ease-in-out", isSuperDepartmentLevel ? "w-1/3" : "w-0 hidden")}>
        {/* Removed NavigationHeader and its wrapper div entirely */}
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
          {renderShelfTabs()} {/* Render tabs as children of the header */}
        </NavigationHeader>
        {renderRightPanelContent()}
      </div>
    </div>
  )
}
