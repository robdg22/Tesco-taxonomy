"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, GetCategoryProductsResponse, TaxonomyItem } from "@/types/tesco"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Terminal, Search, ShoppingBasket, ChevronDown, ChevronRight, X, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

console.log("TaxonomyPrototype9Page component is rendering.")

export default function TaxonomyPrototype9Page() {
  const [currentPath, setCurrentPath] = useState<TaxonomyItem[]>([])
  const selectedCategory = useMemo(() => currentPath[currentPath.length - 1] || null, [currentPath])
  const [showProducts, setShowProducts] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string>("/tesco-logo.svg")

  const [taxonomyData, setTaxonomyData] = useState<TaxonomyItem[] | null>(null)
  const [productData, setProductData] = useState<GetCategoryProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllDepartmentsMenu, setShowAllDepartmentsMenu] = useState(false)

  // State for managing the active super department and department within the flyout
  const [activeSuperDepartmentId, setActiveSuperDepartmentId] = useState<string | null>(null)
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null)

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
            type
            url
            region
            title
          }
          children {
            id
            name
            label
            pageType
            images(style: $style) {
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
    async (categoryId: string, offers = false) => {
      setLoading(true)
      setError(null)
      try {
        const variables = {
          categoryId: categoryId,
          page: 0,
          count: 20,
          sortBy: "relevance",
          offers: offers,
        }
        console.log("Fetching products with variables:", variables)
        const result = await graphqlRequest<GetCategoryProductsResponse>(PRODUCT_QUERY, variables)

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
    const loadTaxonomy = async () => {
      try {
        const response = await fetch("/api/taxonomy")
        const result = await response.json()

        if (response.ok && result.data?.taxonomy) {
          setTaxonomyData(result.data.taxonomy)
          setLoading(false)
          console.log("Online custom taxonomy loaded:", result.data.taxonomy)
          return
        }
      } catch (error) {
        console.error("Error loading online taxonomy:", error)
      }

      try {
        const customTaxonomyData = localStorage.getItem("customTaxonomy")
        if (customTaxonomyData) {
          const parsedData = JSON.parse(customTaxonomyData)
          setTaxonomyData(parsedData)
          setLoading(false)
          console.log("localStorage custom taxonomy loaded:", parsedData)
          return
        }
      } catch (error) {
        console.error("Error loading custom taxonomy from localStorage:", error)
      }

      fetchTaxonomy()
    }

    loadTaxonomy()
  }, [fetchTaxonomy])

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/api/upload-logo")
        const result = await response.json()
        if (result.success && result.url) {
          setLogoUrl(result.url)
          console.log("Logo loaded from:", result.source)
        }
      } catch (error) {
        console.error("Error loading logo:", error)
      }
    }

    loadLogo()
  }, [])

  const superDepartments = useMemo(() => {
    return taxonomyData || []
  }, [taxonomyData])

  // Determine items to display in the middle column
  const middleColumnItems = useMemo(() => {
    if (!activeSuperDepartmentId) return []
    const activeSuperDept = superDepartments.find((sd) => sd.id === activeSuperDepartmentId)
    return activeSuperDept?.children || []
  }, [activeSuperDepartmentId, superDepartments])

  // Determine items to display in the right column
  const rightColumnItems = useMemo(() => {
    if (!activeDepartmentId) return []
    const activeDept = middleColumnItems.find((dept) => dept.id === activeDepartmentId)
    return activeDept?.children || []
  }, [activeDepartmentId, middleColumnItems])

  const handleSuperDepartmentClick = (superDeptId: string) => {
    setActiveSuperDepartmentId(superDeptId)
    setActiveDepartmentId(null) // Reset middle selection
  }

  const handleDepartmentClick = (deptId: string) => {
    setActiveDepartmentId(deptId)
  }

  const handleAisleClick = (aisle: TaxonomyItem) => {
    setCurrentPath([aisle])
    setShowProducts(true)
    fetchProducts(aisle.id)
    setShowAllDepartmentsMenu(false)
    console.log("Navigated to aisle:", aisle.name)
  }

  const handleGoBack = () => {
    if (currentPath.length > 0) {
      setShowAllDepartmentsMenu(true)
      setShowProducts(false)
      setProductData(null)
      // Re-activate the last selected categories
      const lastCategory = currentPath[currentPath.length - 1]
      // Try to find the parent hierarchy
      for (const superDept of superDepartments) {
        for (const dept of superDept.children || []) {
          for (const aisle of dept.children || []) {
            if (aisle.id === lastCategory.id) {
              setActiveSuperDepartmentId(superDept.id)
              setActiveDepartmentId(dept.id)
              setCurrentPath([])
              return
            }
          }
        }
      }
      setCurrentPath([])
    }
  }

  const handleCloseFlyout = () => {
    setShowAllDepartmentsMenu(false)
    setActiveSuperDepartmentId(null)
    setActiveDepartmentId(null)
  }

  const handleToggleAllDepartments = () => {
    const newState = !showAllDepartmentsMenu
    setShowAllDepartmentsMenu(newState)
    if (newState && superDepartments.length > 0) {
      setActiveSuperDepartmentId(superDepartments[0].id)
      setActiveDepartmentId(null)
    } else {
      setActiveSuperDepartmentId(null)
      setActiveDepartmentId(null)
    }
  }

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAllDepartmentsMenu) {
        const target = event.target as Element
        const flyout = document.querySelector('[data-flyout="all-departments"]')
        if (flyout && !flyout.contains(target)) {
          setShowAllDepartmentsMenu(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showAllDepartmentsMenu])

  // Utility Bar Component (Global Header)
  const UtilityBar = () => (
    <div className="bg-tesco-blue h-[32px] flex items-center justify-end">
      <div className="flex">
        {["Tesco Bank", "Tesco Mobile", "Delivery saver", "Store locator", "My orders", "Help", "Feedback", "My account", "Sign out"].map((item, index) => (
          <button
            key={index}
            className="h-[32px] px-[20px] py-[4px] flex items-center justify-center border-l border-white/40 hover:bg-white/10 transition-colors"
          >
            <span className="font-tesco font-bold text-[14px] leading-[18px] text-white whitespace-nowrap">
              {item}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  // Header Component
  const Header = () => (
    <div className="bg-white">
      <div className="flex items-center gap-[24px] px-[12px]">
        {/* Logo */}
        <div className="flex items-center justify-center py-[16px]">
          <img src={logoUrl || "/placeholder.svg"} alt="Tesco" className="h-[36px] w-[120px] object-contain" />
        </div>

        {/* Search */}
        <div className="flex-1 max-w-[749px] py-[16px]">
          <div className="flex gap-[12px] items-center">
            <div className="flex-1 relative">
              <div className="absolute inset-0 border border-[#666666] bg-white rounded-sm" />
              <div className="relative flex items-center gap-[4px] px-[12px] py-[8px]">
                <Search className="w-[24px] h-[24px] text-[#666666]" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search"
                  className="flex-1 font-tesco text-[16px] leading-[20px] text-tesco-grey bg-transparent border-0 outline-none"
                />
              </div>
            </div>
            <button className="bg-tesco-blue hover:bg-tesco-blue-secondary rounded-[20px] p-[8px] flex items-center justify-center transition-colors">
              <Search className="w-[24px] h-[24px] text-white" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Basket */}
        <div className="py-[16px]">
          <div className="flex items-center gap-[8px]">
            <button className="bg-tesco-blue hover:bg-tesco-blue-secondary rounded-[20px] p-[8px] flex items-center justify-center transition-colors">
              <ShoppingBasket className="w-[24px] h-[24px] text-white" strokeWidth={2} />
            </button>
            <div className="flex flex-col justify-center">
              <p className="font-tesco font-bold text-[16px] leading-[20px] text-tesco-blue whitespace-nowrap">
                £0000.00
              </p>
              <p className="font-tesco text-[12px] leading-[16px] text-tesco-grey whitespace-nowrap">
                Guide price
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Local Navigation Component
  const LocalNavigation = () => (
    <div className="bg-white h-[44px] flex items-center gap-[16px] border-b border-tesco-border">
      <button
        onClick={handleToggleAllDepartments}
        className="flex items-center gap-[8px] px-[8px] py-[10px] hover:bg-gray-50 transition-colors"
      >
        <span className="font-tesco font-bold text-[16px] leading-[20px] text-tesco-blue whitespace-nowrap">
          All Departments
        </span>
        <ChevronDown className={cn("w-[24px] h-[24px] text-tesco-blue transition-transform", showAllDepartmentsMenu && "rotate-180")} />
      </button>
      {["Groceries & Essentials", "My Favourites", "Special Offers", "Summer", "Tesco Clubcard", "F&F Clothing", "Recipes"].map((item, index) => (
        <button
          key={index}
          className="px-[8px] py-[12px] hover:bg-gray-50 transition-colors"
        >
          <span className="font-tesco font-bold text-[16px] leading-[20px] text-tesco-blue whitespace-nowrap">
            {item}
          </span>
        </button>
      ))}
    </div>
  )

  // Flyout Menu Component
  const FlyoutMenu = () => {
    if (!showAllDepartmentsMenu) return null

    return (
      <div
        className="fixed inset-x-0 top-[116px] bg-white border-t-2 border-tesco-blue-secondary shadow-lg z-50"
        data-flyout="all-departments"
      >
        {/* Flyout top bar */}
        <div className="bg-white border-b border-tesco-border px-[12px] py-0 flex items-center justify-between h-[24px]">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-[4px] hover:underline"
            disabled={currentPath.length === 0}
          >
            <ArrowLeft className="w-[24px] h-[24px] text-tesco-blue" />
            <span className="font-tesco font-bold text-[16px] leading-[20px] text-tesco-blue">
              Back to {currentPath.length > 0 ? currentPath[currentPath.length - 1].name : "[category name]"}
            </span>
          </button>
          <button
            onClick={handleCloseFlyout}
            className="flex items-center gap-[8px] py-[8px] hover:opacity-70 transition-opacity"
          >
            <span className="font-tesco font-bold text-[16px] leading-[20px] text-tesco-blue">Close</span>
            <div className="border-2 border-tesco-blue rounded-[18px] p-[4px] bg-white">
              <X className="w-[16px] h-[16px] text-tesco-blue" />
            </div>
          </button>
        </div>

        {/* Three column layout */}
        <div className="border-b-4 border-tesco-blue-secondary">
          <div className="flex overflow-hidden">
            {/* Left column - Super Departments */}
            <div className="w-1/3 bg-white px-[12px]">
              {superDepartments.map((superDept) => (
                <div key={superDept.id}>
                  {activeSuperDepartmentId === superDept.id ? (
                    <div className="bg-tesco-blue-secondary overflow-hidden">
                      <button
                        onClick={() => handleSuperDepartmentClick(superDept.id)}
                        className="w-full flex items-center justify-between px-[12px] py-[8px]"
                      >
                        <span className="flex-1 text-left font-tesco font-bold text-[16px] leading-[20px] text-white py-[2px]">
                          {superDept.name}
                        </span>
                        <ChevronRight className="w-[24px] h-[24px] text-white shrink-0" />
                      </button>
                      <div className="h-px bg-tesco-border" />
                    </div>
                  ) : (
                    <div className="bg-white border-b border-neutral-200 overflow-hidden">
                      <button
                        onClick={() => handleSuperDepartmentClick(superDept.id)}
                        className="w-full flex items-center justify-between px-[12px] py-[8px] hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex-1 text-left font-tesco text-[16px] leading-[20px] text-tesco-blue py-[2px]">
                          {superDept.name}
                        </span>
                        <ChevronRight className="w-[24px] h-[24px] text-tesco-blue shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Middle column - Departments */}
            <div className="w-1/3 bg-white px-[12px]">
              {middleColumnItems.map((dept) => (
                <div key={dept.id}>
                  {activeDepartmentId === dept.id ? (
                    <div className="bg-tesco-blue-secondary overflow-hidden">
                      <button
                        onClick={() => handleDepartmentClick(dept.id)}
                        className="w-full flex items-center justify-between px-[12px] py-[8px]"
                      >
                        <span className="flex-1 text-left font-tesco font-bold text-[16px] leading-[20px] text-white py-[2px]">
                          {dept.name}
                        </span>
                        <ChevronRight className="w-[24px] h-[24px] text-white shrink-0" />
                      </button>
                      <div className="h-px bg-tesco-border" />
                    </div>
                  ) : (
                    <div className="bg-white border-b border-neutral-200 overflow-hidden">
                      <button
                        onClick={() => handleDepartmentClick(dept.id)}
                        className="w-full flex items-center justify-between px-[12px] py-[8px] hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex-1 text-left font-tesco text-[16px] leading-[20px] text-tesco-blue py-[2px]">
                          {dept.name}
                        </span>
                        <ChevronRight className="w-[24px] h-[24px] text-tesco-blue shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right column - Aisles */}
            <div className="w-1/3 bg-white px-[12px]">
              {rightColumnItems.map((aisle) => (
                <div key={aisle.id} className="bg-white border-b border-neutral-200 overflow-hidden">
                  <button
                    onClick={() => handleAisleClick(aisle)}
                    className="w-full flex items-center px-[12px] py-[8px] hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex-1 text-left font-tesco text-[16px] leading-[20px] text-tesco-blue py-[2px]">
                      {aisle.name}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Content Area
  const MainContentArea = () => {
    if (loading) {
      return (
        <div className="p-8">
          <div className="grid grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-8">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )
    }

    if (!showProducts || !selectedCategory) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-tesco font-bold mb-4 text-tesco-blue">Welcome to Tesco</h2>
            <p className="font-tesco text-tesco-grey">Click "All Departments" to browse our categories</p>
          </div>
        </div>
      )
    }

    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="font-tesco font-bold text-[32px] leading-[40px] text-tesco-blue">
            {selectedCategory.name}
          </h1>
          {productData && (
            <span className="font-tesco text-tesco-grey">({productData.category.pageInformation.totalCount} products)</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {productData?.category.productItems.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
              <img
                src={product.defaultImageUrl || product.images?.display?.default?.url || "/placeholder.jpg"}
                alt={product.title}
                className="w-full h-32 object-cover rounded mb-3"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.jpg"
                }}
              />
              <h3 className="font-tesco font-bold text-[16px] leading-[20px] text-tesco-blue mb-2 line-clamp-2">
                {product.title}
              </h3>
              <p className="font-tesco text-[12px] leading-[16px] text-tesco-grey mb-2">
                {product.brandName}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-tesco font-bold text-[16px] leading-[20px] text-tesco-blue">
                  £{product.price?.price?.toFixed(2) || "0.00"}
                </span>
                {product.price?.unitPrice && (
                  <span className="font-tesco text-[12px] leading-[16px] text-tesco-grey">
                    £{product.price.unitPrice}/{product.price.unitOfMeasure}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UtilityBar />
      <Header />
      <LocalNavigation />
      <FlyoutMenu />
      <div className="bg-white min-h-screen">
        <MainContentArea />
      </div>
    </div>
  )
}

