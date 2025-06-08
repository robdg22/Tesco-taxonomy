import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Grid3X3, Layers, TestTube } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Tesco Taxonomy Prototypes
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Explore different approaches to organizing and navigating the Tesco product taxonomy.
        </p>
      </div>

      {/* Original Prototypes */}
      <Card>
        <CardHeader>
          <CardTitle>Original Prototypes (API Taxonomy)</CardTitle>
          <CardDescription>
            These prototypes use the original Tesco API taxonomy data
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/taxonomy-prototype-1">
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <span className="font-semibold">Prototype 1</span>
              <span className="text-sm text-gray-600">Hierarchical Navigation</span>
            </Button>
          </Link>
          <Link href="/taxonomy-prototype-2">
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <span className="font-semibold">Prototype 2</span>
              <span className="text-sm text-gray-600">Alternative Layout</span>
            </Button>
          </Link>
          <Link href="/taxonomy-prototype-3">
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <span className="font-semibold">Prototype 3</span>
              <span className="text-sm text-gray-600">Different Approach</span>
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Custom Taxonomy Prototypes */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Taxonomy Prototypes</CardTitle>
          <CardDescription>
            These prototypes use your custom reorganized taxonomy data
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/taxonomy-prototype-4">
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <span className="font-semibold">Prototype 4</span>
              <span className="text-sm text-gray-600">Custom Hierarchical</span>
            </Button>
          </Link>
          <Link href="/taxonomy-prototype-5">
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <span className="font-semibold">Prototype 5</span>
              <span className="text-sm text-gray-600">Custom Layout</span>
            </Button>
          </Link>
          <Link href="/taxonomy-prototype-6">
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <span className="font-semibold">Prototype 6</span>
              <span className="text-sm text-gray-600">Custom Approach</span>
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Taxonomy Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Taxonomy Editor</CardTitle>
          <CardDescription>
            Create and edit custom taxonomy structures for prototypes 4-6
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/taxonomy-test">
            <Button className="w-full">
              Open Taxonomy Editor
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
