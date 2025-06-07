"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Switch } from "@/components/ui/switch" // Import Switch
import { Label } from "@/components/ui/label" // Import Label

interface AisleGridProps {
  aisles: TaxonomyItem[]
  onSelect: (id: string) => void
  showAisleProductsDirectly: boolean // New prop
  onToggleChange: (checked: boolean) => void // New prop
}

export function AisleGrid({ aisles, onSelect, showAisleProductsDirectly, onToggleChange }: AisleGridProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end p-4 border-b">
        <Label htmlFor="aisle-product-toggle" className="mr-2 text-sm font-medium">
          Go directly to products
        </Label>
        <Switch
          id="aisle-product-toggle"
          checked={showAisleProductsDirectly}
          onCheckedChange={onToggleChange}
          aria-label="Toggle direct product listing from aisle"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 p-2 overflow-y-auto flex-grow">
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
    </div>
  )
}
