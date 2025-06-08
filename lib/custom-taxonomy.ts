import { useState, useEffect } from "react"
import type { TaxonomyItem } from "@/types/tesco"

export interface CustomTaxonomyItem extends TaxonomyItem {
  isCustom?: boolean
}

export interface CustomTaxonomyManager {
  hasCustomTaxonomy: () => boolean
  getCustomTaxonomy: () => CustomTaxonomyItem[] | null
  clearCustomTaxonomy: () => void
  convertToTaxonomyItems: (customItems: CustomTaxonomyItem[]) => TaxonomyItem[]
}

export const customTaxonomyManager: CustomTaxonomyManager = {
  hasCustomTaxonomy: (): boolean => {
    if (typeof window === 'undefined') return false
    try {
      const stored = localStorage.getItem('tesco-custom-taxonomy')
      return stored !== null && stored !== 'null'
    } catch {
      return false
    }
  },

  getCustomTaxonomy: (): CustomTaxonomyItem[] | null => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem('tesco-custom-taxonomy')
      if (!stored || stored === 'null') return null
      return JSON.parse(stored) as CustomTaxonomyItem[]
    } catch (err) {
      console.error('Failed to load custom taxonomy:', err)
      return null
    }
  },

  clearCustomTaxonomy: (): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem('tesco-custom-taxonomy')
    } catch (err) {
      console.error('Failed to clear custom taxonomy:', err)
    }
  },

  convertToTaxonomyItems: (customItems: CustomTaxonomyItem[]): TaxonomyItem[] => {
    return customItems.map(item => ({
      id: item.id,
      name: item.name,
      label: item.label,
      pageType: item.pageType,
      images: item.images,
      children: item.children ? customTaxonomyManager.convertToTaxonomyItems(item.children as CustomTaxonomyItem[]) : undefined
    }))
  }
}

// Hook for React components to use custom taxonomy
export const useCustomTaxonomy = () => {
  const [hasCustom, setHasCustom] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setHasCustom(customTaxonomyManager.hasCustomTaxonomy())
  }, [])

  const getCustom = () => {
    if (!isClient) return null
    return customTaxonomyManager.getCustomTaxonomy()
  }

  const clear = () => {
    if (!isClient) return
    customTaxonomyManager.clearCustomTaxonomy()
    setHasCustom(false)
  }
  
  return {
    hasCustomTaxonomy: hasCustom,
    getCustomTaxonomy: getCustom,
    clearCustomTaxonomy: clear,
    convertToTaxonomyItems: customTaxonomyManager.convertToTaxonomyItems,
    isClient
  }
} 