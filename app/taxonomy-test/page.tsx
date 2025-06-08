"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ArrowRight, RotateCcw, Loader2 } from "lucide-react"
import Link from "next/link"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse, TaxonomyItem } from "@/types/tesco"

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

export default function TaxonomyTestPage() {
  const [isCreated, setIsCreated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [originalData, setOriginalData] = useState<TaxonomyItem[] | null>(null)
  const [loadingOriginal, setLoadingOriginal] = useState(false)

  useEffect(() => {
    // Check if custom taxonomy already exists
    const existing = localStorage.getItem('customTaxonomy')
    if (existing && existing !== 'null') {
      setIsCreated(true)
    }
  }, [])

  const loadOriginalTaxonomy = async () => {
    setLoadingOriginal(true)
    try {
      const variables = {
        storeId: "3060",
        categoryId: null,
        style: "thumbnail",
        includeInspirationEvents: false,
      }
      const result = await graphqlRequest<GetTaxonomyResponse>(TAXONOMY_QUERY, variables)
      if (result.data?.taxonomy) {
        setOriginalData(result.data.taxonomy)
        console.log("Original taxonomy loaded:", result.data.taxonomy)
      }
    } catch (error) {
      console.error("Failed to load original taxonomy:", error)
    } finally {
      setLoadingOriginal(false)
    }
  }

  const createReorganizedTaxonomy = () => {
    if (!originalData) return
    
    setIsLoading(true)
    
    try {
      // Find Marketplace (first superDepartment) and Top Deals (its first child)
      const marketplace = originalData.find(sd => sd.name === "Marketplace")
      const topDeals = marketplace?.children?.find(dept => dept.name === "Top Deals")
      
      if (!marketplace) {
        console.error("Could not find Marketplace superDepartment")
        console.log("Available superDepartments:", originalData.map(sd => sd.name))
        return
      }
      
      if (!topDeals) {
        console.error("Could not find Top Deals department")
        console.log("Available departments in Marketplace:", marketplace.children?.map(dept => dept.name))
        return
      }

      console.log(`Found Top Deals in Marketplace: ${topDeals.name}`)
      console.log(`Top Deals has ${topDeals.children?.length || 0} children`)

      // Create reorganized taxonomy with Top Deals moved to Level 0
      const reorganizedTaxonomy = [
        // Top Deals is now Level 0 (with all its children preserved)
        {
          ...topDeals,
          // All children automatically become Level 1, 2, 3 relatively
        },
        // Keep all other original top-level categories, but remove Top Deals from Marketplace
        ...originalData.map(superDept => {
          if (superDept.name === "Marketplace") {
            // Remove Top Deals from Marketplace's children
            return {
              ...superDept,
              children: superDept.children?.filter(dept => dept.name !== "Top Deals") || []
            }
          }
          return superDept
        })
      ]

      // Save reorganized taxonomy to localStorage
      localStorage.setItem('customTaxonomy', JSON.stringify(reorganizedTaxonomy))
      setIsCreated(true)
      console.log(`Reorganized taxonomy created - Top Deals moved to Level 0:`, reorganizedTaxonomy)
    } catch (error) {
      console.error("Failed to create reorganized taxonomy:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearCustomTaxonomy = () => {
    localStorage.removeItem('customTaxonomy')
    setIsCreated(false)
    console.log("Custom taxonomy cleared")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Taxonomy Reorganizer</h1>
        <p className="text-muted-foreground">
          Move "Top Deals" from Marketplace to become a top-level category (Level 0)
        </p>
      </div>

      {/* Status */}
      {isCreated && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Taxonomy reorganized! "Top Deals" is now a top-level category with all its children preserved.
          </AlertDescription>
        </Alert>
      )}

      {/* Load Original Data */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Load Real Tesco Taxonomy</CardTitle>
          <CardDescription>
            First, we need to load the original Tesco taxonomy data to reorganize it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={loadOriginalTaxonomy}
            disabled={loadingOriginal}
            className="flex items-center space-x-2"
          >
            {loadingOriginal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{loadingOriginal ? "Loading..." : "Load Original Taxonomy"}</span>
          </Button>
          
          {originalData && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Original taxonomy loaded with {originalData.length} top-level categories
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reorganize Taxonomy */}
      {originalData && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Move Top Deals to Level 0</CardTitle>
            <CardDescription>
              This will move "Top Deals" from being nested under "Marketplace" to become a top-level category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Reorganization:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="text-red-600">❌ <strong>Before:</strong> Marketplace → Top Deals → [children]</div>
                <div className="text-green-600">✅ <strong>After:</strong> Top Deals → [children] (now Level 0)</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={createReorganizedTaxonomy}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>{isLoading ? "Reorganizing..." : "Move Top Deals to Level 0"}</span>
              </Button>
              
              {isCreated && (
                <Button 
                  variant="outline"
                  onClick={clearCustomTaxonomy}
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset to Original</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Navigation */}
      {isCreated && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Step 3: Test Reorganized Taxonomy</CardTitle>
            <CardDescription className="text-blue-700">
              See "Top Deals" as a top-level category in the left sidebar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Expected Result:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• "Top Deals" appears in the left sidebar (Level 0)</div>
                  <div>• All Top Deals children are preserved and shifted up relatively</div>
                  <div>• Marketplace department still exists but without Top Deals</div>
                </div>
              </div>
              
              <Link href="/taxonomy-prototype-1-custom">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center space-x-2">
                  <span>Test Reorganized Taxonomy</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back to Home */}
      <div className="pt-4">
        <Link href="/">
          <Button variant="outline">
            ← Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
} 