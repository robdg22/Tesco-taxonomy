"use client"

import { useState } from "react"
import type { ProductItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Check } from "lucide-react"

interface ProductGridProps {
  products: ProductItem[]
  totalCount: number
}

export function ProductGrid({ products, totalCount }: ProductGridProps) {
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set())

  const handleAddToBasket = (productId: string) => {
    setAddedProducts(prev => new Set(prev).add(productId))
    // Auto-hide the message after 3 seconds
    setTimeout(() => {
      setAddedProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }, 3000)
  }

  return (
    <div className="p-2 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">{totalCount} Products</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {products.map((product) => {
          const imageUrl =
            product.defaultImageUrl ?? product.images?.default?.url ?? "/placeholder.svg?height=150&width=150"
          const isAdded = addedProducts.has(product.id)
          
          return (
            <Card key={product.id} className="flex flex-col border-0 shadow-none">
              {" "}
              {/* Explicitly removed border and shadow */}
              <CardContent className="flex flex-col items-center p-4">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={product.title}
                  width={150}
                  height={150}
                  className="rounded-md object-cover mb-2"
                />
                <p className="text-center text-sm font-medium line-clamp-2 mb-1">{product.title}</p>
                <p className="text-center text-base font-bold text-green-700 mb-2">£{product.price.price.toFixed(2)}</p>
                
                {product.promotions?.[0]?.offerText && (
                  <div className="mb-2 px-2 py-1 bg-yellow-400 text-black text-xs font-semibold rounded-sm text-center w-auto">
                    {product.promotions[0].offerText}
                  </div>
                )}

                <Button 
                  onClick={() => handleAddToBasket(product.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 mb-2 w-auto"
                  size="sm"
                >
                  Add
                </Button>

                {isAdded && (
                  <div className="flex items-center gap-1 text-green-700 text-xs font-medium">
                    <Check className="h-3 w-3" />
                    <span>1 x added to basket</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
