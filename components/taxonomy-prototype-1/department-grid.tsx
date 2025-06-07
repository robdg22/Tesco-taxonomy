"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface DepartmentGridProps {
  departments: TaxonomyItem[]
  onSelect: (id: string) => void
}

export function DepartmentGrid({ departments, onSelect }: DepartmentGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 overflow-y-auto">
      {departments.map((dept) => {
        const imageUrl = dept.images?.[0]?.images?.[0]?.url || "/placeholder.svg?height=100&width=100"
        console.log(`Loading image for Department ${dept.name}: ${imageUrl}`)
        return (
          <Card
            key={dept.id}
            className="cursor-pointer border-0 shadow-none transition-shadow" // Explicitly removed border and shadow
            onClick={() => onSelect(dept.id)}
          >
            <CardContent className="flex flex-col items-center p-4">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={dept.name}
                width={100}
                height={100}
                className="rounded-md object-cover mb-2"
              />
              <p className="text-center text-sm font-medium">{dept.name}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
