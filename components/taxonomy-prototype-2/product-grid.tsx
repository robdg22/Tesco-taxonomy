import type { ProductItem } from "@/types/tesco"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface ProductGridProps {
  products: ProductItem[]
  totalCount: number
}

export function ProductGrid({ products, totalCount }: ProductGridProps) {
  return (
    <div className="p-2 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">{totalCount} Products</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {products.map((product) => {
          // Use nullish coalescing to ensure imageUrl is always a string
          const imageUrl =
            product.defaultImageUrl ?? product.images?.default?.url ?? "/placeholder.svg?height=150&width=150"
          return (
            <Card key={product.id} className="flex flex-col border-0 shadow-none">
              {" "}
              {/* Explicitly removed border and shadow */}
              <CardContent className="flex flex-col items-center p-4">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={product.title || "Product image"}
                  width={150}
                  height={150}
                  className="rounded-md object-cover mb-2"
                />
                <p className="text-center text-sm font-medium line-clamp-2 mb-1">{product.title}</p>
                <p className="text-center text-base font-bold text-green-700">£{product.price.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
