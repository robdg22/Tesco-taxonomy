"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, GetCategoryProductsResponse, TaxonomyItem } from "@/types/tesco"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Terminal, Search, ShoppingCart, ChevronDown, Home, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

console.log("TaxonomyPrototype10Page component is rendering.")

export default function TaxonomyPrototype10Page() {
  const [currentPath, setCurrentPath] = useState<TaxonomyItem[]>([])
  const selectedCategory = useMemo(() => currentPath[currentPath.length - 1] || null, [currentPath])
  const [showProducts, setShowProducts] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string>("/tesco-logo.svg")

  const [taxonomyData, setTaxonomyData] = useState<TaxonomyItem[] | null>(null)
  const [productData, setProductData] = useState<GetCategoryProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllDepartmentsMenu, setShowAllDepartmentsMenu] = useState(false)

  // State for the active tab when viewing products
  const [selectedTabCategoryId, setSelectedTabCategoryId] = useState<string | null>(null)

  // State for hover-based multi-level navigation
  const [hoveredLevel1Id, setHoveredLevel1Id] = useState<string | null>(null)
  const [hoveredLevel2Id, setHoveredLevel2Id] = useState<string | null>(null)

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

  // Get level 2 categories based on hovered level 1 item
  const level2Items = useMemo(() => {
    if (!hoveredLevel1Id) return []
    const parent = superDepartments.find((item) => item.id === hoveredLevel1Id)
    return parent?.children || []
  }, [hoveredLevel1Id, superDepartments])

  // Get level 3 categories based on hovered level 2 item
  const level3Items = useMemo(() => {
    if (!hoveredLevel2Id || level2Items.length === 0) return []
    const parent = level2Items.find((item) => item.id === hoveredLevel2Id)
    return parent?.children || []
  }, [hoveredLevel2Id, level2Items])

  // Handle click on a category at any level
  const handleCategoryClick = (item: TaxonomyItem) => {
    setCurrentPath([item])
    setShowProducts(true)
    fetchProducts(item.id)
    setSelectedTabCategoryId(item.id)
    setShowAllDepartmentsMenu(false)
    setHoveredLevel1Id(null)
    setHoveredLevel2Id(null)
    console.log("Navigated to products for:", item.name)
  }

  const handleGoBack = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1)
      setCurrentPath(newPath)
      setShowProducts(false)
      setProductData(null)
      setSelectedTabCategoryId(null)
      console.log("Go back to:", newPath.map((i) => i.name).join(" > "))
    }
  }

  const handleGoHome = () => {
    setCurrentPath([])
    setShowProducts(false)
    setProductData(null)
    setSelectedTabCategoryId(null)
    console.log("Go home")
  }

  const handleToggleAllDepartments = () => {
    setShowAllDepartmentsMenu(!showAllDepartmentsMenu)
    if (!showAllDepartmentsMenu) {
      setHoveredLevel1Id(null)
      setHoveredLevel2Id(null)
    }
  }

  const handleTabChange = (tabId: string) => {
    setSelectedTabCategoryId(tabId)
    fetchProducts(tabId)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAllDepartmentsMenu) {
        const target = event.target as Element
        const dropdown = document.querySelector('[data-dropdown="all-departments"]')
        if (dropdown && !dropdown.contains(target)) {
          setShowAllDepartmentsMenu(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showAllDepartmentsMenu])

  // Top Navigation Component
  const TopNavigation = () => (
    <div className="text-white text-small" style={{ backgroundColor: "#00539F" }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-end space-x-6 py-2">
          <a href="#" className="hover:underline font-tesco-regular">
            Tesco Bank
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            Tesco Mobile
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            Delivery saver
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            Store locator
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            My orders
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            Help
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            Feedback
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            My account
          </a>
          <a href="#" className="hover:underline font-tesco-regular">
            Sign out
          </a>
        </div>
      </div>
    </div>
  )

  // Header Component
  const Header = () => (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <img src={logoUrl || "/placeholder.svg"} alt="Tesco" className="h-9 w-auto" />
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-4 pr-14 py-3 border border-gray-300 rounded-full text-base"
                />
                <Button
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full w-10 h-10 p-0 flex items-center justify-center"
                  style={{ backgroundColor: "#00539F" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#007EB3")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#00539F")}
                >
                  <Search className="h-4 w-4 text-white" />
                </Button>
              </div>
              <div className="text-sm mt-1">
                <a href="#" className="link-tesco" style={{ color: "#00539F" }}>
                  Search with a list of items
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-6 w-6" style={{ color: "#00539F" }} />
              <div className="text-right">
                <div className="font-semibold">£0000.00</div>
                <div className="text-sm text-gray-500">Guide price</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Main Navigation Component (Dropdown)
  const MainNavigation = () => (
    <div className="bg-white border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center space-x-8 py-3">
          <button
            className="flex items-center space-x-2 font-bold"
            style={{ color: "#00539F" }}
            onClick={handleToggleAllDepartments}
          >
            <span>All departments</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showAllDepartmentsMenu && "rotate-180")} />
          </button>
          <a href="#" className="font-bold" style={{ color: "#00539F" }}>
            Groceries & Essentials
          </a>
          <a href="#" className="font-bold" style={{ color: "#00539F" }}>
            My Favourites
          </a>
          <a href="#" className="font-bold" style={{ color: "#00539F" }}>
            Special Offers
          </a>
          <a href="#" className="font-bold" style={{ color: "#00539F" }}>
            Summer
          </a>
          <a href="#" className="font-bold" style={{ color: "#00539F" }}>
            Tesco Clubcard
          </a>
          <a href="#" className="font-bold" style={{ color: "#00539F" }}>
            F&F Clothing
          </a>
          <a href="#" className="font-bold" style={{ color: "#00539F" }}>
            Recipes
          </a>
        </div>
      </div>

      {/* Multi-level Hover-based Flyout Menu */}
      {showAllDepartmentsMenu && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 bg-white shadow-2xl z-50 flex flex-col"
          data-dropdown="all-departments"
          onMouseLeave={() => {
            setHoveredLevel1Id(null)
            setHoveredLevel2Id(null)
          }}
        >
          {/* Close Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowAllDepartmentsMenu(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" style={{ color: "#00539F" }} />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Level 1 - Top-level Categories */}
            <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="space-y-0">
                {superDepartments.map((dept) => (
                  <button
                    key={dept.id}
                    onMouseEnter={() => {
                      setHoveredLevel1Id(dept.id)
                      setHoveredLevel2Id(null)
                    }}
                    onClick={() => handleCategoryClick(dept)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150 border-b border-gray-100",
                      hoveredLevel1Id === dept.id ? "text-white" : "hover:bg-gray-50",
                    )}
                    style={
                      hoveredLevel1Id === dept.id
                        ? { backgroundColor: "#00539F" }
                        : { color: "#00539F" }
                    }
                  >
                    <span className="font-tesco-regular text-sm">{dept.name}</span>
                    {(dept.children?.length || 0) > 0 && (
                      <ChevronDown
                        className="h-4 w-4"
                        style={{
                          color: hoveredLevel1Id === dept.id ? "white" : "#00539F",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Level 2 - Second-level Categories */}
            {level2Items.length > 0 && (
              <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-0">
                  {level2Items.map((item) => (
                    <button
                      key={item.id}
                      onMouseEnter={() => setHoveredLevel2Id(item.id)}
                      onClick={() => handleCategoryClick(item)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150 border-b border-gray-200",
                        hoveredLevel2Id === item.id ? "text-white" : "hover:bg-white",
                      )}
                      style={
                        hoveredLevel2Id === item.id
                          ? { backgroundColor: "#00539F" }
                          : { color: "#00539F" }
                      }
                    >
                      <span className="font-tesco-regular text-sm">{item.name}</span>
                      {(item.children?.length || 0) > 0 && (
                        <ChevronDown
                          className="h-4 w-4"
                          style={{
                            color: hoveredLevel2Id === item.id ? "white" : "#00539F",
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Level 3 - Third-level Categories */}
            {level3Items.length > 0 && (
              <div className="flex-1 bg-white overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {level3Items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleCategoryClick(item)}
                      className="flex flex-col items-center text-center p-3 rounded-lg hover:shadow-md transition-all duration-200 hover:bg-gray-50"
                    >
                      <div className="w-16 h-16 mb-2 relative flex items-center justify-center">
                        <img
                          src={
                            item.images?.[0]?.images?.[0]?.url ||
                            "/placeholder.svg?height=64&width=64&query=category icon" ||
                            "/placeholder.svg"
                          }
                          alt={item.name}
                          width={64}
                          height={64}
                          className="object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                      </div>
                      <span className="font-semibold text-xs" style={{ color: "#00539F" }}>
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state or welcome message when no level 2 items */}
            {level2Items.length === 0 && hoveredLevel1Id !== null && (
              <div className="flex-1 bg-white flex items-center justify-center">
                <p className="text-gray-500 text-center">Select a category to browse</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // Main Content Area
  const MainContentArea = () => {
    if (loading) {
      return (
        <div className="flex-1 p-8">
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
        <div className="flex-1 p-8">
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
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#00539F" }}>
              Welcome to Tesco
            </h2>
            <p className="text-gray-600">Click "All departments" to browse our categories</p>
          </div>
        </div>
      )
    }

    const tabs = selectedCategory.children || []
    const hasTabs = tabs.length > 0

    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold" style={{ color: "#00539F" }}>
              {selectedCategory.name}
            </h1>
            {productData && (
              <span className="text-gray-500">({productData.category.pageInformation.totalCount} products)</span>
            )}
          </div>
          <div className="flex space-x-2">
            {currentPath.length > 0 && (
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex items-center space-x-2"
                style={{ borderColor: "#00539F", color: "#00539F" }}
              >
                <span>Back</span>
              </Button>
            )}
            <Button
              onClick={handleGoHome}
              variant="ghost"
              className="flex items-center space-x-2"
              style={{ color: "#00539F" }}
            >
              <span>Home</span>
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasTabs && (
          <Tabs value={selectedTabCategoryId || selectedCategory.id} onValueChange={handleTabChange} className="mb-6">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger
                value={selectedCategory.id}
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                style={{
                  backgroundColor: selectedTabCategoryId === selectedCategory.id ? "#00539F" : "transparent",
                  color: selectedTabCategoryId === selectedCategory.id ? "white" : "#00539F",
                  borderColor: "#00539F",
                }}
              >
                All {selectedCategory.name}
              </TabsTrigger>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                  style={{
                    backgroundColor: selectedTabCategoryId === tab.id ? "#00539F" : "transparent",
                    color: selectedTabCategoryId === tab.id ? "white" : "#00539F",
                    borderColor: "#00539F",
                  }}
                >
                  {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={selectedTabCategoryId || selectedCategory.id}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {productData?.category.productItems.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <img
                      src={product.defaultImageUrl || product.images?.display?.default?.url || "/placeholder.jpg"}
                      alt={product.title}
                      className="w-full h-32 object-cover rounded mb-3"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.jpg"
                      }}
                    />
                    <h3 className="font-medium mb-2 line-clamp-2" style={{ color: "#00539F" }}>
                      {product.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">{product.brandName}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{ color: "#00539F" }}>
                        £{product.price?.price?.toFixed(2) || "0.00"}
                      </span>
                      {product.price?.unitPrice && (
                        <span className="text-xs text-gray-500">
                          £{product.price.unitPrice}/{product.price.unitOfMeasure}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!hasTabs && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {productData?.category.productItems.map((product) => (
              <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <img
                  src={product.defaultImageUrl || product.images?.display?.default?.url || "/placeholder.jpg"}
                  alt={product.title}
                  className="w-full h-32 object-cover rounded mb-3"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.jpg"
                  }}
                />
                <h3 className="font-medium mb-2 line-clamp-2" style={{ color: "#00539F" }}>
                  {product.title}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{product.brandName}</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: "#00539F" }}>
                    £{product.price?.price?.toFixed(2) || "0.00"}
                  </span>
                  {product.price?.unitPrice && (
                    <span className="text-xs text-gray-500">
                      £{product.price.unitPrice}/{product.price.unitOfMeasure}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <Header />
      <MainNavigation />
      <div className="max-w-7xl mx-auto bg-white min-h-screen">
        <MainContentArea />
      </div>
    </div>
  )
}
