"use client"

import type { TaxonomyItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { useEffect, useState, useRef } from "react" // Import hooks
import { fetchFirstProductImage } from "@/lib/api-utils" // Import the new utility function

interface ShelfGridProps {
  shelves: TaxonomyItem[]
  onSelect: (id: string) => void
}

export function ShelfGrid({ shelves, onSelect }: ShelfGridProps) {
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
    <div className="grid grid-cols-3 gap-2 p-2 overflow-y-auto">
      {shelves.map((shelf) => {
        const imageUrl = shelfImages[shelf.id] || "/placeholder.svg?height=70&width=70"
        const isLoading = activeFetches.current.has(shelf.id) // Check if currently loading

        return (
          <Card
            key={shelf.id}
            className="cursor-pointer border-0 shadow-none transition-shadow" // Explicitly removed border and shadow
            onClick={() => onSelect(shelf.id)}
          >
            <CardContent className="flex flex-col items-center p-4">
              {isLoading ? (
                <div className="w-[70px] h-[70px] bg-gray-200 rounded-md mb-2 animate-pulse" />
              ) : (
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={shelf.name}
                  width={70}
                  height={70}
                  className="rounded-md object-cover mb-2"
                />
              )}
              <p className="text-center text-xs font-medium">{shelf.name}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
