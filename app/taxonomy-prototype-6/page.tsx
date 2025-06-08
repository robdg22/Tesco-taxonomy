"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, GetCategoryProductsResponse, TaxonomyItem } from "@/types/tesco"
import { SuperDepartmentGrid } from "@/components/taxonomy-prototype-3/super-department-grid"
import { DepartmentTabs } from "@/components/taxonomy-prototype-3/department-tabs"
import { AisleGrid } from "@/components/taxonomy-prototype-3/aisle-grid"
import { ShelfGrid } from "@/components/taxonomy-prototype-3/shelf-grid"
import { ProductGrid } from "@/components/taxonomy-prototype-3/product-grid"
import { NavigationHeader } from "@/components/taxonomy-prototype-3/navigation-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"

type NavigationLevel = "superDepartmentGrid" | "departmentTabs" | "aisleGrid" | "shelfGrid" | "productListing" | "offersProducts"

export default function TaxonomyPrototype6Page() {
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
  const [usingCustomTaxonomy, setUsingCustomTaxonomy] = useState(false)

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
      $offers: Boolean
    ) {
      category(
        page: $page
        count: $count
        sortBy: $sortBy
        categoryId: $categoryId
        offers: $offers
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
    async (categoryId: string, offers: boolean = false): Promise<GetCategoryProductsResponse | null> => {
      setLoading(true)
      setError(null)
      try {
        const variables = {
          categoryId: categoryId,
          page: 1,
          count: 48,
          sortBy: "RELEVANCE",
          offers: offers,
        }
        const result = await graphqlRequest<{ category: GetCategoryProductsResponse }>(PRODUCT_QUERY, variables)
        if (result.data?.category) {
          setProductData(result.data.category)
          return result.data.category
        } else if (result.errors) {
          setError(result.errors[0].message)
        } else {
          setError("No product data returned.")
        }
      } catch (err) {
        setError(`Failed to fetch products: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
      return null
    },
    [PRODUCT_QUERY],
  )

  // Load custom taxonomy from Vercel Blob
  const loadCustomTaxonomy = async () => {
    try {
      const response = await fetch('/api/taxonomy')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const customData = await response.json()
      
      if (customData && Array.isArray(customData)) {
        setSuperDepartmentsData(customData)
        setUsingCustomTaxonomy(true)
        setLoading(false)
        return true
      } else {
        console.warn('Custom taxonomy data is not in expected format')
        return false
      }
    } catch (error) {
      console.error('Failed to load custom taxonomy:', error)
      return false
    }
  }

  // Load initial taxonomy (try custom first, fallback to API)
  const loadInitialTaxonomy = async () => {
    const customLoaded = await loadCustomTaxonomy()
    if (!customLoaded) {
      const data = await fetchTaxonomyBranch(null, "rounded")
      setSuperDepartmentsData(data)
    }
  }

  useEffect(() => {
    loadInitialTaxonomy()
  }, [])

  const handleSuperDepartmentSelect = async (id: string) => {
    setSelectedSuperDepartmentId(id)
    setSelectedDepartmentId(null)
    setCurrentLevel("departmentTabs")
  }

  const handleDepartmentSelect = (id: string) => {
    setSelectedDepartmentId(id)
    setSelectedAisleId(null)
    setCurrentLevel("aisleGrid")
  }

  const handleAisleSelect = (id: string) => {
    setSelectedAisleId(id)
    setSelectedShelfId(null)
    setCurrentLevel("shelfGrid")
  }

  const handleShelfSelect = (id: string) => {
    setSelectedShelfId(id)
    fetchProducts(id)
    setCurrentLevel("productListing")
  }

  const handleSpecialOffersClick = (categoryId: string, categoryName: string) => {
    fetchProducts(categoryId, true)
    setCurrentLevel("offersProducts")
  }

  const handleBack = () => {
    if (currentLevel === "offersProducts") {
      setCurrentLevel("productListing")
      setProductData(null)
    } else if (currentLevel === "productListing") {
      setCurrentLevel("shelfGrid")
      setSelectedShelfId(null)
    } else if (currentLevel === "shelfGrid") {
      setCurrentLevel("aisleGrid")
      setSelectedAisleId(null)
    } else if (currentLevel === "aisleGrid") {
      setCurrentLevel("departmentTabs")
      setSelectedDepartmentId(null)
    } else if (currentLevel === "departmentTabs") {
      setCurrentLevel("superDepartmentGrid")
      setSelectedSuperDepartmentId(null)
    }
  }

  const getHeaderTitle = () => {
    if (currentLevel === "superDepartmentGrid") {
      return usingCustomTaxonomy ? "Custom Taxonomy - Super Departments" : "Super Departments"
    }
    if (currentLevel === "departmentTabs" && selectedSuperDepartmentId) {
      const superDept = superDepartmentsData?.find((item) => item.id === selectedSuperDepartmentId)
      return superDept?.name || "Departments"
    }
    if (currentLevel === "aisleGrid" && selectedDepartmentId) {
      const superDept = superDepartmentsData?.find((item) => item.id === selectedSuperDepartmentId)
      const dept = superDept?.children?.find((item) => item.id === selectedDepartmentId)
      return dept?.name || "Aisles"
    }
    if (currentLevel === "shelfGrid" && selectedAisleId) {
      const superDept = superDepartmentsData?.find((item) => item.id === selectedSuperDepartmentId)
      const dept = superDept?.children?.find((item) => item.id === selectedDepartmentId)
      const aisle = dept?.children?.find((item) => item.id === selectedAisleId)
      return aisle?.name || "Shelves"
    }
    if (currentLevel === "productListing" && selectedShelfId) {
      const superDept = superDepartmentsData?.find((item) => item.id === selectedSuperDepartmentId)
      const dept = superDept?.children?.find((item) => item.id === selectedDepartmentId)
      const aisle = dept?.children?.find((item) => item.id === selectedAisleId)
      const shelf = aisle?.children?.find((item) => item.id === selectedShelfId)
      return shelf?.name || "Products"
    }
    if (currentLevel === "offersProducts") {
      return "Special Offers"
    }
    return "Taxonomy"
  }

  const renderSpecialOffersButton = () => {
    if (currentLevel === "productListing" && selectedShelfId) {
      return (
        <div className="mb-4">
          <Button
            onClick={() => handleSpecialOffersClick(selectedShelfId, "Special Offers")}
            variant="outline"
            className="w-full"
          >
            View Special Offers
          </Button>
        </div>
      )
    }
    return null
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    switch (currentLevel) {
      case "superDepartmentGrid":
        return (
          <SuperDepartmentGrid
            superDepartments={superDepartmentsData || []}
            onSelect={handleSuperDepartmentSelect}
          />
        )

      case "departmentTabs":
        if (!selectedSuperDepartmentId) return null
        const selectedSuperDepartment = superDepartmentsData?.find((item) => item.id === selectedSuperDepartmentId)
        return (
          <DepartmentTabs
            departments={selectedSuperDepartment?.children || []}
            onSelectDepartment={handleDepartmentSelect}
            selectedDepartmentId={selectedDepartmentId}
          />
        )

      case "aisleGrid":
        if (!selectedDepartmentId) return null
        const superDept = superDepartmentsData?.find((item) => item.id === selectedSuperDepartmentId)
        const selectedDepartment = superDept?.children?.find((item) => item.id === selectedDepartmentId)
        return (
          <AisleGrid
            aisles={selectedDepartment?.children || []}
            onSelect={handleAisleSelect}
          />
        )

      case "shelfGrid":
        if (!selectedAisleId) return null
        const dept = superDepartmentsData
          ?.find((item) => item.id === selectedSuperDepartmentId)
          ?.children?.find((item) => item.id === selectedDepartmentId)
        const selectedAisle = dept?.children?.find((item) => item.id === selectedAisleId)
        return (
          <ShelfGrid
            shelves={selectedAisle?.children || []}
            onSelect={handleShelfSelect}
          />
        )

      case "productListing":
      case "offersProducts":
        if (!productData || productData.category.productItems.length === 0) {
          return (
            <div className="p-4 text-gray-500">
              No products found for this {currentLevel === "offersProducts" ? "offer category" : "selection"}.
            </div>
          )
        }
        return (
          <div>
            {currentLevel === "productListing" && renderSpecialOffersButton()}
            <ProductGrid
              products={productData.category.productItems}
              totalCount={productData.category.pageInformation.totalCount}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NavigationHeader
        title={getHeaderTitle()}
        onBack={currentLevel !== "superDepartmentGrid" ? handleBack : undefined}
      >
        {usingCustomTaxonomy && currentLevel === "superDepartmentGrid" && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium">Using Custom Taxonomy</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const data = await fetchTaxonomyBranch(null, "rounded")
                  setSuperDepartmentsData(data)
                  setUsingCustomTaxonomy(false)
                }}
              >
                Switch to API
              </Button>
            </div>
          </div>
        )}
        {!usingCustomTaxonomy && currentLevel === "superDepartmentGrid" && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600 font-medium">Using API Taxonomy</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const success = await loadCustomTaxonomy()
                  if (!success) {
                    // Fallback to API taxonomy
                    const data = await fetchTaxonomyBranch(null, "rounded")
                    setSuperDepartmentsData(data)
                    setUsingCustomTaxonomy(false)
                  }
                }}
              >
                Switch to Custom
              </Button>
            </div>
          </div>
        )}
      </NavigationHeader>
      {renderContent()}
    </div>
  )
}
