"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface SuperDepartmentGridProps {
  superDepartments: TaxonomyItem[]
  onSelect: (id: string) => void
}

export function SuperDepartmentGrid({ superDepartments, onSelect }: SuperDepartmentGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-2 overflow-y-auto">
      {superDepartments.map((sd) => {
        const imageUrl = sd.images?.[0]?.images?.[0]?.url ?? "/placeholder.svg?height=150&width=150"
        return (
          <Card
            key={sd.id}
            className="cursor-pointer border-0 shadow-none transition-shadow" // Explicitly removed border and shadow
            onClick={() => onSelect(sd.id)}
          >
            <CardContent className="flex flex-col items-center p-4">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={sd.name}
                width={100}
                height={100}
                className="rounded-md object-cover mb-2"
              />
              <p className="text-center text-sm font-medium">{sd.name}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
