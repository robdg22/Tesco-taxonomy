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
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Original Prototypes</h2>
          <p className="text-gray-600">Using the live Tesco taxonomy API</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">Prototype 1</CardTitle>
                </div>
              </div>
              <CardDescription>
                Traditional hierarchical navigation with left sidebar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/taxonomy-prototype-1">
                <Button variant="outline" className="w-full">
                  View Prototype 1
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Grid3X3 className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">Prototype 2</CardTitle>
                </div>
              </div>
              <CardDescription>
                Tab-based navigation with department tabs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/taxonomy-prototype-2">
                <Button variant="outline" className="w-full">
                  View Prototype 2
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Layers className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">Prototype 3</CardTitle>
                </div>
              </div>
              <CardDescription>
                Grid-based navigation with visual department selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/taxonomy-prototype-3">
                <Button variant="outline" className="w-full">
                  View Prototype 3
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Taxonomy Test</h2>
          <p className="text-gray-600">Test custom taxonomy modifications</p>
        </div>
        
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <TestTube className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-blue-900">Custom Taxonomy Test</CardTitle>
                <CardDescription className="text-blue-700">
                  Create a "Groceries" superdepartment containing "Fresh Food" and test navigation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-blue-800">
                This will create: <strong>Groceries → Fresh Food → Fruit & Vegetables → Products</strong>
              </p>
              <Link href="/taxonomy-test">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Create & Test Custom Taxonomy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 