import { graphqlRequest } from "@/lib/graphql-client"
import type { GetCategoryProductsResponse } from "@/types/tesco"

const PRODUCT_QUERY_SINGLE_IMAGE = `
  query GetCategoryProducts(
    $categoryId: ID
    $page: Int
    $count: Int
  ) {
    category(
      categoryId: $categoryId # <-- Added this line to use the variable
      page: $page
      count: $count
    ) {
      productItems: products {
        images {
          default {
            url
          }
        }
        defaultImageUrl
      }
    }
  }
`

export async function fetchFirstProductImage(categoryId: string): Promise<string | null> {
  try {
    const variables = {
      categoryId: categoryId,
      page: 0,
      count: 1, // Only need one product to get an image
    }
    const result = await graphqlRequest<GetCategoryProductsResponse>(PRODUCT_QUERY_SINGLE_IMAGE, variables)

    if (result.data?.category?.productItems && result.data.category.productItems.length > 0) {
      const firstProduct = result.data.category.productItems[0]
      return firstProduct.defaultImageUrl || firstProduct.images?.default?.url || null
    }
  } catch (error) {
    console.error(`Failed to fetch product image for category ${categoryId}:`, error)
  }
  return null
}
