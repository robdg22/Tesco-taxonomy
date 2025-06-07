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

type NavigationLevel = "superDepartmentGrid" | "departmentTabs" | "shelfGrid" | "productListing" | "offersProducts" // Added offersProducts

export default function TaxonomyPrototype3Page() {
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>("superDepartmentGrid")
  const [selectedSuperDepartmentId, setSelectedSuperDepartmentId] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(null)
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null)

  const [superDepartmentsData, setSuperDepartmentsData] = useState<TaxonomyItem[] | null>(null)
  const [fetchedBranches, setFetchedBranches] = useState<Map<string, TaxonomyItem[]>>(new Map())
  const [productData, setProductData] = useState<GetCategoryProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    // Initial fetch for super departments with 'rounded' style
    const loadInitialTaxonomy = async () => {
      const data = await fetchTaxonomyBranch(null, "rounded")
      if (data) {
        setSuperDepartmentsData(data)
      }
    }
    loadInitialTaxonomy()
  }, [fetchTaxonomyBranch])

  // Derived data based on current selections
  const superDepartments = useMemo(() => superDepartmentsData || [], [superDepartmentsData])

  const departments = useMemo(() => {
    if (selectedSuperDepartmentId) {
      // Retrieve departments from cache, which were fetched with 'thumbnail' style
      const cacheKey = `${selectedSuperDepartmentId}_thumbnail`
      return fetchedBranches.get(cacheKey) || []
    }
    return []
  }, [selectedSuperDepartmentId, fetchedBranches])

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

  // Handlers for navigation
  const handleSuperDepartmentSelect = async (id: string) => {
    setSelectedSuperDepartmentId(id)
    setCurrentLevel("departmentTabs")
    setProductData(null)
    setSelectedAisleId(null)
    setSelectedShelfId(null)

    // Fetch children (departments, aisles, shelves) with 'thumbnail' style
    const childrenData = await fetchTaxonomyBranch(id, "thumbnail")
    if (childrenData && childrenData.length > 0) {
      setSelectedDepartmentId(childrenData[0].id) // Select first department by default
    } else {
      setSelectedDepartmentId(null)
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
    if (shelvesForAisle.length === 1) {
      setCurrentLevel("productListing") // Go straight to product listing
      fetchProducts(id) // Fetch products for the AISLE ID
    } else {
      setCurrentLevel("shelfGrid") // Go to shelf grid as usual
    }
    setSelectedAisleId(id)
    setSelectedShelfId(null)
    setProductData(null)
  }

  const handleShelfSelect = (id: string) => {
    setSelectedShelfId(id)
    setCurrentLevel("productListing")
    fetchProducts(id) // Fetch products for the selected shelf
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
      } else if (selectedAisleId) {
        setCurrentLevel("departmentTabs")
      }
      setProductData(null)
    } else if (currentLevel === "shelfGrid") {
      setCurrentLevel("departmentTabs")
      setSelectedAisleId(null)
    } else if (currentLevel === "departmentTabs") {
      setCurrentLevel("superDepartmentGrid")
      setSelectedSuperDepartmentId(null)
      setSelectedDepartmentId(null)
      setSelectedAisleId(null)
      setSelectedShelfId(null)
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
        {renderSpecialOffersButton()} {/* Render the special offers button */}
      </NavigationHeader>
      <div className="flex-grow overflow-y-auto">{renderContent()}</div>
    </div>
  )
}
