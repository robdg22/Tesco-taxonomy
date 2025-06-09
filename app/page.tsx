import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Settings, Play, Grid3X3, Layers, TestTube, Edit } from "lucide-react"

export default function HomePage() {
  const prototypes = [
    {
      id: "1",
      title: "Prototype 1",
      description: "Split view",
      href: "/taxonomy-prototype-1",
      type: "api"
    },
    {
      id: "2", 
      title: "Prototype 2",
      description: "Carousels",
      href: "/taxonomy-prototype-2",
      type: "api"
    },
    {
      id: "3",
      title: "Prototype 3", 
      description: "Hierarchical",
      href: "/taxonomy-prototype-3",
      type: "api"
    },
    {
      id: "4",
      title: "Prototype 4",
      description: "Custom Taxonomy (Split view)",
      href: "/taxonomy-prototype-4", 
      type: "custom"
    },
    {
      id: "5",
      title: "Prototype 5",
      description: "Custom Taxonomy (Carousels)",
      href: "/taxonomy-prototype-5",
      type: "custom"
    },
    {
      id: "6",
      title: "Prototype 6", 
      description: "Custom Taxonomy (Hierarchical)",
      href: "/taxonomy-prototype-6",
      type: "custom"
    }
  ]

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-shrink-0 border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tesco Taxonomy Prototypes</h1>
          <Link href="/taxonomy-test">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Edit className="h-4 w-4 mr-2" />
              Taxonomy Editor
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* API Prototypes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Grid3X3 className="h-4 w-4 text-gray-600" />
              <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Mango</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {prototypes.filter(p => p.type === "api").map((prototype) => (
                <Link key={prototype.id} href={prototype.href}>
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{prototype.title}</h3>
                      <Play className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">{prototype.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Custom Prototypes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-medium text-blue-600 uppercase tracking-wide">Custom Taxonomy</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {prototypes.filter(p => p.type === "custom").map((prototype) => (
                <Link key={prototype.id} href={prototype.href}>
                  <div className="border border-blue-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer bg-blue-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{prototype.title}</h3>
                      <Play className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-sm text-gray-600">{prototype.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
