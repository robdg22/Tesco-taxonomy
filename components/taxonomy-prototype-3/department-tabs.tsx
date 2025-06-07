"use client"
import type { TaxonomyItem } from "@/types/tesco"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface DepartmentTabsProps {
  departments: TaxonomyItem[]
  onSelectDepartment: (id: string) => void
  selectedDepartmentId: string | null
}

export function DepartmentTabs({ departments, onSelectDepartment, selectedDepartmentId }: DepartmentTabsProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap border-b">
      <div className="flex w-max space-x-4 px-4 py-2">
        {departments.map((dept) => {
          const imageUrl = dept.images?.[0]?.images?.[0]?.url ?? "/placeholder.svg?height=50&width=50"
          return (
            <Button
              key={dept.id}
              variant="ghost"
              className={cn(
                "flex flex-col items-center pb-2 pt-0 h-auto rounded-none border-b-2 border-transparent min-w-[80px]",
                selectedDepartmentId === dept.id && "border-blue-500 text-blue-700",
              )}
              onClick={() => onSelectDepartment(dept.id)}
            >
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={dept.name}
                width={50}
                height={50}
                className="rounded-md object-cover mb-1"
              />
              <span className="text-xs font-medium">{dept.name}</span>
            </Button>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
