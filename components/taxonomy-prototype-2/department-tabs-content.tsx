"use client"

import { useMemo } from "react"
import type { TaxonomyItem } from "@/types/tesco"
// Removed ScrollArea import
import { AisleSection } from "./aisle-section"

interface DepartmentTabsContentProps {
  selectedDepartmentId: string | null
  departments: TaxonomyItem[]
  onSelectAisleForProducts: (aisleId: string) => void
  onSelectShelfForProducts: (shelfId: string) => void
}

export function DepartmentTabsContent({
  selectedDepartmentId,
  departments,
  onSelectAisleForProducts,
  onSelectShelfForProducts,
}: DepartmentTabsContentProps) {
  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === selectedDepartmentId),
    [departments, selectedDepartmentId],
  )

  const aislesForSelectedDepartment = useMemo(() => selectedDepartment?.children || [], [selectedDepartment])

  return (
    // Removed ScrollArea wrapper here. Vertical scrolling is handled by parent page.tsx
    <div className="p-4 space-y-6">
      {aislesForSelectedDepartment.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No aisles found for this department.</div>
      ) : (
        aislesForSelectedDepartment.map((aisle) => (
          <AisleSection
            key={aisle.id}
            aisle={aisle}
            onShowAllProducts={() => onSelectAisleForProducts(aisle.id)}
            onSelectShelf={onSelectShelfForProducts}
          />
        ))
      )}
    </div>
  )
}
