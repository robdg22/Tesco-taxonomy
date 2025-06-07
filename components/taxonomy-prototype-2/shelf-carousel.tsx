"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useEffect, useState, useRef } from "react"
import { fetchFirstProductImage } from "@/lib/api-utils" // Import the new utility function

interface ShelfCarouselProps {
  shelves: TaxonomyItem[]
  onSelect: (id: string) => void
}

export function ShelfCarousel({ shelves, onSelect }: ShelfCarouselProps) {
  const [shelfImages, setShelfImages] = useState<Record<string, string | null>>({})
  const activeFetches = useRef<Set<string>>(new Set()) // To track currently fetching shelf IDs

  useEffect(() => {
    const fetchImages = async () => {
      const promises: Promise<{ id: string; url: string | null }>[] = []

      shelves.forEach((shelf) => {
        // Only fetch if not already in cache and not currently fetching
        if (!(shelf.id in shelfImages) && !activeFetches.current.has(shelf.id)) {
          activeFetches.current.add(shelf.id)
          promises.push(fetchFirstProductImage(shelf.id).then((url) => ({ id: shelf.id, url })))
        }
      })

      if (promises.length > 0) {
        const results = await Promise.all(promises)
        setShelfImages((prev) => {
          const updatedImages = { ...prev }
          results.forEach(({ id, url }) => {
            updatedImages[id] = url
            activeFetches.current.delete(id) // Remove from active fetches once resolved
          })
          return updatedImages
        })
      }
    }

    fetchImages()
  }, [shelves, shelfImages]) // Depend on shelves and shelfImages to trigger re-fetch for new shelves or if an image was previously null

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex w-max space-x-2 pb-2">
        {shelves.map((shelf) => {
          const imageUrl = shelfImages[shelf.id] || "/placeholder.svg?height=80&width=80"
          const isLoading = activeFetches.current.has(shelf.id) // Check if currently loading

          return (
            <Card
              key={shelf.id}
              className="flex-shrink-0 w-[100px] cursor-pointer border-0 shadow-none transition-shadow"
              onClick={() => onSelect(shelf.id)}
            >
              <CardContent className="flex flex-col items-center p-2">
                {isLoading ? (
                  <div className="w-[80px] h-[80px] bg-gray-200 rounded-md mb-1 animate-pulse" />
                ) : (
                  <Image
                    src={imageUrl || "/placeholder.svg"}
                    alt={shelf.name || "Shelf image"}
                    width={80}
                    height={80}
                    className="rounded-md object-cover mb-1"
                  />
                )}
                <p className="text-center text-xs font-medium text-wrap">{shelf.name}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
