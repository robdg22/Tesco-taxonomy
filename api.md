# Tesco Shopping Experience API Integration Prompt

You are tasked with setting up a Next.js project to access the Tesco shopping experience API. Follow these instructions to create a complete integration with proper proxy setup, TypeScript types, and Vercel deployment configuration.

## 1. Project Setup

Create a Next.js 15+ project with the following structure:
\`\`\`
project/
├── app/
│   ├── api/
│   │   └── tesco/
│   │       └── route.ts
│   └── layout.tsx
├── lib/
│   └── graphql-client.ts
├── types/
│   └── tesco.ts
├── next.config.mjs
└── package.json
\`\`\`

## 2. Package Dependencies

Add these dependencies to your `package.json`:
\`\`\`json
{
  "dependencies": {
    "@vercel/blob": "latest",
    "next": "15.2.4",
    "react": "^19",
    "react-dom": "^19",
    "typescript": "^5"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
\`\`\`

## 3. Next.js Configuration

Create `next.config.mjs`:
\`\`\`javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
\`\`\`

## 4. API Proxy Route

Create `app/api/tesco/route.ts` with these EXACT specifications:

### Required Headers for Tesco API:
- **X-Apikey**: `TvOSZJHlEk0pjniDGQFAc9Q59WGAR4dA`
- **Referer**: `https://www.tesco.com/groceries/en-GB/search?query=eggs%5D&inputType=free+text`
- **Region**: `UK`
- **User-Agent**: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36`

### Implementation:
\`\`\`typescript
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch("https://api.tesco.com/shoppingexperience", {
      method: "POST",
      headers: {
        "X-Apikey": "TvOSZJHlEk0pjniDGQFAc9Q59WGAR4dA",
        "Content-Type": "application/json",
        "Referer": "https://www.tesco.com/groceries/en-GB/search?query=eggs%5D&inputType=free+text",
        "Region": "UK",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
\`\`\`

## 5. GraphQL Client

Create `lib/graphql-client.ts`:
\`\`\`typescript
interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, any> = {},
): Promise<GraphQLResponse<T>> {
  try {
    const response = await fetch("/api/tesco", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("GraphQL request failed:", response.status, errorData)
      return { errors: [{ message: `API request failed with status ${response.status}` }] }
    }

    const result: GraphQLResponse<T> = await response.json()
    return result
  } catch (error) {
    console.error("Network or parsing error:", error)
    return {
      errors: [{ message: `Network or parsing error: ${error instanceof Error ? error.message : String(error)}` }],
    }
  }
}
\`\`\`

## 6. TypeScript Types

Create `types/tesco.ts`:
\`\`\`typescript
export interface Image {
  type: string
  url: string
  region: string
  title: string
}

export interface TaxonomyItemImageStyle {
  style: string
  images: Image[]
}

export interface TaxonomyItem {
  id: string
  name: string
  label: string
  pageType: string
  images?: TaxonomyItemImageStyle[]
  children?: TaxonomyItem[]
}

export interface Promotion {
  promotionId: string
  promotionType: string
  startDate: string
  endDate: string
  offerText: string
}

export interface ProductItem {
  id: string
  baseProductId: string
  title: string
  brandName: string
  shortDescription: string
  defaultImageUrl: string
  images?: {
    display?: { default?: { url: string; originalUrl: string } }
    default?: { url: string; originalUrl: string }
  }
  price?: {
    price: number
    unitPrice: string
    unitOfMeasure: string
  }
  promotions?: Promotion[]
}

export interface PageInformation {
  totalCount: number
  pageNo: number
  count: number
  pageSize: number
  offset: number
}

export interface GetTaxonomyResponse {
  taxonomy: TaxonomyItem[]
}

export interface GetCategoryProductsResponse {
  category: {
    pageInformation: PageInformation
    productItems: ProductItem[]
  }
}
\`\`\`

## 7. Example GraphQL Queries

### Taxonomy Query
\`\`\`graphql
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
\`\`\`

### Product Query
\`\`\`graphql
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
\`\`\`

## 8. Usage Example

Create a test page to demonstrate the API integration:
\`\`\`typescript
"use client"

import { useState, useEffect } from "react"
import { graphqlRequest } from "@/lib/graphql-client"
import type { GetTaxonomyResponse } from "@/types/tesco"

const TAXONOMY_QUERY = `
  query GetTaxonomy($storeId: ID, $includeInspirationEvents: Boolean, $style: String) {
    taxonomy(storeId: $storeId, includeInspirationEvents: $includeInspirationEvents) {
      id
      name
      label
      pageType
      children {
        id
        name
        label
        pageType
      }
    }
  }
`

export default function TestPage() {
  const [taxonomy, setTaxonomy] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchTaxonomy = async () => {
    setLoading(true)
    try {
      const variables = {
        storeId: "uk",
        includeInspirationEvents: false,
        style: "default"
      }
      
      const result = await graphqlRequest<GetTaxonomyResponse>(TAXONOMY_QUERY, variables)
      if (result.data) {
        setTaxonomy(result.data.taxonomy)
      }
    } catch (error) {
      console.error("Failed to fetch taxonomy:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxonomy()
  }, [])

  return (
    <div className="p-8">
      <h1>Tesco API Test</h1>
      {loading && <p>Loading...</p>}
      {taxonomy && (
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(taxonomy, null, 2)}
        </pre>
      )}
    </div>
  )
}
\`\`\`

## 9. Vercel Deployment

### Environment Detection
The setup automatically detects Vercel environment:
\`\`\`typescript
const isVercel = process.env.VERCEL === '1'
\`\`\`

### Optional: Vercel Blob Storage
If you need persistent storage, add Vercel Blob integration:
\`\`\`typescript
if (isVercel) {
  const { put, list } = await import('@vercel/blob')
  // Use for storing custom data
}
\`\`\`

## 10. Critical Implementation Notes

1. **CORS Handling**: The proxy includes proper CORS headers for browser access
2. **Error Handling**: Comprehensive error handling for network and API failures
3. **Environment Flexibility**: Works in both local development and Vercel production
4. **Security**: API key and sensitive headers are server-side only
5. **Performance**: Efficient GraphQL client with proper error responses

## 11. Testing

Test the integration by:
1. Running `npm run dev` locally
2. Visiting the test page to verify API connectivity
3. Checking browser network tab for successful API calls through the proxy
4. Deploying to Vercel to test production environment

## 12. Common Query Variables

### Taxonomy Variables:
- `storeId`: `"uk"`
- `includeInspirationEvents`: `false`
- `style`: `"default"`
- `categoryId`: Optional category ID for filtered results

### Product Variables:
- `categoryId`: Required category ID
- `page`: `0` (zero-based pagination)
- `count`: Number of products (e.g., `20`)
- `sortBy`: Sort criteria (optional)
- `offers`: `false` (boolean for promotions)

This setup provides a complete, production-ready integration with the Tesco shopping experience API that will work seamlessly in both development and production environments.
