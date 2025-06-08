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

type NavigationLevel = "superDepartmentGrid" | "departmentTabs" | "shelfGrid" | "productListing" | "offersProducts"

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
    async (categoryId: string, offers: boolean = false): Promise<void> => {
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
        console.error("Error loading localStorage taxonomy:", error)
      }
      
      // If no custom taxonomy, load from API
      loadInitialTaxonomy()
    }

    loadCustomTaxonomy()
  }, [])

  const loadInitialTaxonomy = async () => {
    const data = await fetchTaxonomyBranch(null, "rounded")
    if (data) {
      setSuperDepartmentsData(data)
      setUsingCustomTaxonomy(false)
    }
  }

  const handleSuperDepartmentSelect = async (id: string) => {
    setSelectedSuperDepartmentId(id)
    setSelectedDepartmentId(null)
    setSelectedAisleId(null)
    setSelectedShelfId(null)
    setCurrentLevel("departmentTabs")
  }

  const handleDepartmentSelect = (id: string) => {
    setSelectedDepartmentId(id)
    setSelectedAisleId(null)
    setSelectedShelfId(null)
    setCurrentLevel("shelfGrid")
  }

  const handleAisleSelect = (id: string) => {
    setSelectedAisleId(id)
    setSelectedShelfId(null)
    
    // Check if aisle has children (shelves)
    const superDept = superDepartmentsData?.find((dept) => dept.id === selectedSuperDepartmentId)
    const department = superDept?.children?.find((dept) => dept.id === selectedDepartmentId)
    const aisle = department?.children?.find((aisle) => aisle.id === id)
    
    if (aisle?.children && aisle.children.length > 0) {
      setCurrentLevel("shelfGrid")
    } else {
      // No shelves, show products directly
      setCurrentLevel("productListing")
      fetchProducts(id)
    }
  }

  const handleShelfSelect = (id: string) => {
    setSelectedShelfId(id)
    setCurrentLevel("productListing")
    fetchProducts(id)
  }

  const handleSpecialOffersClick = (categoryId: string, categoryName: string) => {
    setCurrentLevel("offersProducts")
    fetchProducts(categoryId, true)
  }

  const handleBack = () => {
    if (currentLevel === "departmentTabs") {
      setCurrentLevel("superDepartmentGrid")
      setSelectedSuperDepartmentId(null)
    } else if (currentLevel === "shelfGrid") {
      if (selectedAisleId) {
        setCurrentLevel("shelfGrid")
        setSelectedAisleId(null)
      } else {
        setCurrentLevel("departmentTabs")
        setSelectedDepartmentId(null)
      }
    } else if (currentLevel === "productListing") {
      if (selectedShelfId) {
        setCurrentLevel("shelfGrid")
        setSelectedShelfId(null)
        setProductData(null)
      } else if (selectedAisleId) {
        setCurrentLevel("shelfGrid")
        setSelectedAisleId(null)
        setProductData(null)
      } else {
        setCurrentLevel("departmentTabs")
        setProductData(null)
      }
    } else if (currentLevel === "offersProducts") {
      setCurrentLevel("superDepartmentGrid")
      setProductData(null)
    }
  }

  const getHeaderTitle = () => {
    if (currentLevel === "superDepartmentGrid") {
      return "Shop by Category"
    }
    if (currentLevel === "departmentTabs" && selectedSuperDepartmentId) {
      const superDept = superDepartmentsData?.find((dept) => dept.id === selectedSuperDepartmentId)
      return superDept?.name || "Departments"
    }
    if (currentLevel === "shelfGrid") {
      if (selectedAisleId) {
        const superDept = superDepartmentsData?.find((dept) => dept.id === selectedSuperDepartmentId)
        const department = superDept?.children?.find((dept) => dept.id === selectedDepartmentId)
        const aisle = department?.children?.find((aisle) => aisle.id === selectedAisleId)
        return aisle?.name || "Shelves"
      } else if (selectedDepartmentId) {
        const superDept = superDepartmentsData?.find((dept) => dept.id === selectedSuperDepartmentId)
        const department = superDept?.children?.find((dept) => dept.id === selectedDepartmentId)
        return department?.name || "Aisles"
      }
    }
    if (currentLevel === "productListing") {
      if (selectedShelfId) {
        const superDept = superDepartmentsData?.find((dept) => dept.id === selectedSuperDepartmentId)
        const department = superDept?.children?.find((dept) => dept.id === selectedDepartmentId)
        const aisle = department?.children?.find((aisle) => aisle.id === selectedAisleId)
        const shelf = aisle?.children?.find((shelf) => shelf.id === selectedShelfId)
        return shelf?.name || "Products"
      } else if (selectedAisleId) {
        const superDept = superDepartmentsData?.find((dept) => dept.id === selectedSuperDepartmentId)
        const department = superDept?.children?.find((dept) => dept.id === selectedDepartmentId)
        const aisle = department?.children?.find((aisle) => aisle.id === selectedAisleId)
        return aisle?.name || "Products"
      }
    }
    if (currentLevel === "offersProducts") {
      return "Special Offers"
    }
    return "Shop by Category"
  }

  const renderSpecialOffersButton = () => {
    if (currentLevel !== "superDepartmentGrid") return null

    return (
      <div className="mb-6">
        <Button
          onClick={() => handleSpecialOffersClick("", "Special Offers")}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold"
        >
          🔥 Special Offers
        </Button>
      </div>
    )
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

    if (currentLevel === "superDepartmentGrid" && superDepartmentsData) {
      return <SuperDepartmentGrid superDepartments={superDepartmentsData} onSelect={handleSuperDepartmentSelect} />
    }

    if (currentLevel === "departmentTabs" && selectedSuperDepartmentId && superDepartmentsData) {
      const selectedSuperDepartment = superDepartmentsData.find((dept) => dept.id === selectedSuperDepartmentId)
      if (selectedSuperDepartment?.children) {
        return <DepartmentTabs departments={selectedSuperDepartment.children} onSelectDepartment={handleDepartmentSelect} selectedDepartmentId={selectedDepartmentId} />
      }
    }

    if (currentLevel === "shelfGrid" && superDepartmentsData) {
      if (selectedAisleId) {
        // Show shelves for the selected aisle
        const superDept = superDepartmentsData.find((dept) => dept.id === selectedSuperDepartmentId)
        const department = superDept?.children?.find((dept) => dept.id === selectedDepartmentId)
        const aisle = department?.children?.find((aisle) => aisle.id === selectedAisleId)
        if (aisle?.children) {
          return <ShelfGrid shelves={aisle.children} onSelect={handleShelfSelect} />
        }
      } else if (selectedDepartmentId) {
        // Show aisles for the selected department
        const superDept = superDepartmentsData.find((dept) => dept.id === selectedSuperDepartmentId)
        const department = superDept?.children?.find((dept) => dept.id === selectedDepartmentId)
        if (department?.children) {
          return <AisleGrid aisles={department.children} onSelect={handleAisleSelect} />
        }
      }
    }

    if (currentLevel === "productListing" && productData) {
      return <ProductGrid products={productData.category.productItems} totalCount={productData.category.pageInformation.totalCount} />
    }

    if (currentLevel === "offersProducts") {
      if (productData) {
        return <ProductGrid products={productData.category.productItems} totalCount={productData.category.pageInformation.totalCount} />
      } else {
        return (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Special Offers</h2>
            <p className="text-gray-600">Loading special offers...</p>
          </div>
        )
      }
    }

    return <div>No content available</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <NavigationHeader title={getHeaderTitle()} onBack={currentLevel !== "superDepartmentGrid" ? handleBack : undefined}>
          {renderSpecialOffersButton()}
        </NavigationHeader>
        {renderContent()}
      </div>
    </div>
  )
}
