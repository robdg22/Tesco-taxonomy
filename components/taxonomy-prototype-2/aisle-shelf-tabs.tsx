"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AisleShelfTabsProps {
  shelves: TaxonomyItem[]
  selectedShelfTabId: string
  onShelfTabClick: (id: string) => void
}

export function AisleShelfTabs({ shelves, selectedShelfTabId, onShelfTabClick }: AisleShelfTabsProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap h-12 border-b">
      <div className="flex w-max space-x-4 px-4 py-2">
        <Button
          variant="ghost"
          className={cn(
            "pb-2 pt-0 h-auto rounded-none border-b-2 border-transparent min-w-[100px]",
            selectedShelfTabId === "all" && "border-blue-500 text-blue-700",
          )}
          onClick={() => onShelfTabClick("all")}
        >
          All
        </Button>
        {shelves.map((shelf) => (
          <Button
            key={shelf.id}
            variant="ghost"
            className={cn(
              "pb-2 pt-0 h-auto rounded-none border-b-2 border-transparent min-w-[100px]",
              selectedShelfTabId === shelf.id && "border-blue-500 text-blue-700",
            )}
            onClick={() => onShelfTabClick(shelf.id)}
          >
            {shelf.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
