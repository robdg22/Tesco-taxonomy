"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface AisleGridProps {
  aisles: TaxonomyItem[]
  onSelect: (id: string) => void
}

export function AisleGrid({ aisles, onSelect }: AisleGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-2 overflow-y-auto">
      {aisles.map((aisle) => {
        const imageUrl = aisle.images?.[0]?.images?.[0]?.url || "/placeholder.svg?height=80&width=80"
        console.log(`Loading image for Aisle ${aisle.name}: ${imageUrl}`)
        return (
          <Card
            key={aisle.id}
            className="cursor-pointer border-0 shadow-none transition-shadow" // Explicitly removed border and shadow
            onClick={() => onSelect(aisle.id)}
          >
            <CardContent className="flex flex-col items-center p-4">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={aisle.name}
                width={80}
                height={80}
                className="rounded-md object-cover mb-2"
              />
              <p className="text-center text-xs font-medium">{aisle.name}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
