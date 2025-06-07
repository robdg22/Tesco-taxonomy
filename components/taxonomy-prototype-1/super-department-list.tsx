"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SuperDepartmentListProps {
  superDepartments: TaxonomyItem[]
  selectedSuperDepartmentId: string | null
  onSelect: (id: string) => void
}

export function SuperDepartmentList({
  superDepartments,
  selectedSuperDepartmentId,
  onSelect,
}: SuperDepartmentListProps) {
  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col p-2">
        {superDepartments.map((sd) => (
          <button
            key={sd.id}
            className={cn(
              "py-3 px-4 text-left text-sm font-medium rounded-md transition-colors duration-200",
              selectedSuperDepartmentId === sd.id ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100 text-gray-700",
            )}
            onClick={() => onSelect(sd.id)}
          >
            {sd.name}
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
