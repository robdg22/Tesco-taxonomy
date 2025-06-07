"use client"

import type { ProductItem } from "@/types/tesco"
import { ProductGrid } from "./product-grid"
// Removed ScrollArea, ScrollBar, Button, cn imports as tabs are moved out

interface AisleProductListingWithTabsProps {
  products: ProductItem[]
  totalCount: number
  // Removed shelves, selectedShelfTabId, onShelfTabClick props as tabs are moved out
}

export function AisleProductListingWithTabs({ products, totalCount }: AisleProductListingWithTabsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Product Grid */}
      <div className="flex-grow overflow-y-auto">
        <ProductGrid products={products} totalCount={totalCount} />
      </div>
    </div>
  )
}
