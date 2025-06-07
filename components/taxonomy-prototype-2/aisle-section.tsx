"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { ShelfCarousel } from "./shelf-carousel"
import { Button } from "@/components/ui/button" // Changed from next/link

interface AisleSectionProps {
  aisle: TaxonomyItem
  onShowAllProducts: (aisleId: string) => void
  onSelectShelf: (shelfId: string) => void
}

export function AisleSection({ aisle, onShowAllProducts, onSelectShelf }: AisleSectionProps) {
  const shelves = aisle.children || []

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold truncate">{aisle.name}</h3>
        <Button // Changed from Link
          variant="link" // Use link variant for button to maintain similar appearance
          size="sm"
          onClick={() => onShowAllProducts(aisle.id)}
          className="flex-shrink-0 ml-2 whitespace-nowrap"
        >
          Show All
        </Button>
      </div>
      {shelves.length === 0 ? (
        <p className="text-gray-500 text-sm">No shelves in this aisle.</p>
      ) : (
        <ShelfCarousel shelves={shelves} onSelect={onSelectShelf} />
      )}
    </div>
  )
}
