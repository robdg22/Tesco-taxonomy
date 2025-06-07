"use client"

import type { ProductItem } from "@/types/tesco"
import { ProductGrid } from "./product-grid"

interface AisleProductListingProps {
  products: ProductItem[]
  totalCount: number
}

export function AisleProductListing({ products, totalCount }: AisleProductListingProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Product Grid */}
      <div className="flex-grow overflow-y-auto">
        <ProductGrid products={products} totalCount={totalCount} />
      </div>
    </div>
  )
}
