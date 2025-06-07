"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, GetCategoryProductsResponse, TaxonomyItem } from "@/types/tesco"
import { SuperDepartmentGrid } from "@/components/taxonomy-prototype-2/super-department-grid"
import { DepartmentTabs } from "@/components/taxonomy-prototype-2/department-tabs"
import { DepartmentTabsContent } from "@/components/taxonomy-prototype-2/department-tabs-content"
import { ProductGrid } from "@/components/taxonomy-prototype-2/product-grid"
import { NavigationHeader } from "@/components/taxonomy-prototype-2/navigation-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { AisleProductListingWithTabs } from "@/components/taxonomy-prototype-2/aisle-product-listing-with-tabs"
import { AisleShelfTabs } from "@/components/taxonomy-prototype-2/aisle-shelf-tabs" // New import

type NavigationLevel = "superDepartmentGrid" | "departmentTabs" | "aisleProductsWithTabs" | "shelfProducts"

export default function TaxonomyPrototype2Page() {
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>("superDepartmentGrid")
  const [selectedSuperDepartmentId, setSelectedSuperDepartmentId] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [selectedAisleIdForTabs, setSelectedAisleIdForTabs] = useState<string | null>(null) // New state for aisle when showing tabs
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null)
  const [selectedShelfTabId, setSelectedShelfTabId] = useState<string>("all") // New state for selected tab in aisle products

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
    const loadInitialTaxonomy = async () => {
      const data = await fetchTaxonomyBranch(null, "rounded")
      if (data) {
        setSuperDepartmentsData(data)
      }
    }
    loadInitialTaxonomy()
  }, [fetchTaxonomyBranch])

  useEffect(() => {
    if (selectedSuperDepartmentId && superDepartmentsData) {
      const selectedSd = superDepartmentsData.find((sd) => sd.id === selectedSuperDepartmentId)
      if (selectedSd) {
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
  }, [selectedSuperDepartmentId, superDepartmentsData, fetchTaxonomyBranch])

  const superDepartments = useMemo(() => superDepartmentsData || [], [superDepartmentsData])

  const departmentsForSelectedSuperDepartment = useMemo(() => {
    if (selectedSuperDepartmentId) {
      const selectedSd = superDepartmentsData?.find((sd) => sd.id === selectedSuperDepartmentId)
      if (selectedSd) {
        const style = selectedSd.name === "Clothing & Accessories" ? "rounded" : "thumbnail"
        const cacheKey = `${selectedSuperDepartmentId}_${style}`
        return fetchedBranches.get(cacheKey) || []
      }
    }
    return []
  }, [selectedSuperDepartmentId, superDepartmentsData, fetchedBranches])

  const currentAisleShelves = useMemo(() => {
    if (selectedAisleIdForTabs) {
      const selectedDepartment = departmentsForSelectedSuperDepartment.find((d) =>
        d.children?.some((a) => a.id === selectedAisleIdForTabs),
      )
      const selectedAisle = selectedDepartment?.children?.find((a) => a.id === selectedAisleIdForTabs)
      return selectedAisle?.children || []
    }
    return []
  }, [selectedAisleIdForTabs, departmentsForSelectedSuperDepartment])

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
      default:
        return "Tesco Taxonomy"
    }
  }

  const handleSuperDepartmentSelect = (id: string) => {
    setSelectedSuperDepartmentId(id)
    setCurrentLevel("departmentTabs")
    setProductData(null)
    setSelectedAisleIdForTabs(null) // Clear aisle for tabs
    setSelectedShelfId(null) // Clear shelf
    setSelectedShelfTabId("all") // Reset tab
  }

  const handleDepartmentTabSelect = (id: string) => {
    setSelectedDepartmentId(id)
    setSelectedAisleIdForTabs(null) // Clear aisle for tabs
    setSelectedShelfId(null) // Clear shelf
    setSelectedShelfTabId("all") // Reset tab
  }

  const handleAisleSelectForProducts = (aisleId: string) => {
    setSelectedAisleIdForTabs(aisleId)
    setSelectedShelfId(null)
    setSelectedShelfTabId("all") // Default to 'all' when showing aisle products
    setCurrentLevel("aisleProductsWithTabs")
    fetchProducts(aisleId)
  }

  const handleShelfSelectForProducts = (shelfId: string) => {
    setSelectedShelfId(shelfId)
    setSelectedAisleIdForTabs(null) // Clear aisle for tabs
    setSelectedShelfTabId("all") // Reset tab
    setCurrentLevel("shelfProducts")
    fetchProducts(shelfId)
  }

  const handleShelfTabClick = (id: string) => {
    setSelectedShelfTabId(id)
    if (id === "all") {
      fetchProducts(selectedAisleIdForTabs!) // Fetch all products for the aisle
    } else {
      fetchProducts(id) // Fetch products for the specific shelf
    }
  }

  const handleBack = () => {
    if (currentLevel === "departmentTabs") {
      setCurrentLevel("superDepartmentGrid")
      setSelectedSuperDepartmentId(null)
      setSelectedDepartmentId(null)
    } else if (currentLevel === "aisleProductsWithTabs" || currentLevel === "shelfProducts") {
      setCurrentLevel("departmentTabs")
      setProductData(null)
      setSelectedAisleIdForTabs(null)
      setSelectedShelfId(null)
      setSelectedShelfTabId("all")
    }
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
        if (!productData || productData.category.productItems.length === 0) {
          return <div className="p-4 text-gray-500">No products found for this aisle.</div>
        }
        return (
          <AisleProductListingWithTabs
            products={productData.category.productItems}
            totalCount={productData.category.pageInformation.totalCount}
            // Removed shelves, selectedShelfTabId, onShelfTabClick props as tabs are moved out
          />
        )
      case "shelfProducts":
        if (!productData || productData.category.productItems.length === 0) {
          return <div className="p-4 text-gray-500">No products found for this shelf.</div>
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
        {currentLevel === "departmentTabs" && departmentsForSelectedSuperDepartment.length > 0 && (
          <DepartmentTabs
            departments={departmentsForSelectedSuperDepartment}
            onSelectDepartment={handleDepartmentTabSelect}
            selectedDepartmentId={selectedDepartmentId}
          />
        )}
        {currentLevel === "aisleProductsWithTabs" && currentAisleShelves.length > 0 && (
          <AisleShelfTabs
            shelves={currentAisleShelves}
            selectedShelfTabId={selectedShelfTabId}
            onShelfTabClick={handleShelfTabClick}
          />
        )}
      </NavigationHeader>
      <div className="flex-grow overflow-y-auto">{renderContent()}</div>
    </div>
  )
}
