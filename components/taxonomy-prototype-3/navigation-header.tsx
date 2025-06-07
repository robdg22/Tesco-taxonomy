"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeftIcon } from "lucide-react"
import type React from "react"

interface NavigationHeaderProps {
  title: string
  onBack?: () => void
  children?: React.ReactNode
}

export function NavigationHeader({ title, onBack, children }: NavigationHeaderProps) {
  return (
    <div className="flex flex-col border-b">
      <div className="flex items-center p-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ChevronLeftIcon className="h-6 w-6" />
          </Button>
        )}
        <h1 className="text-xl font-semibold ml-2">{title}</h1>
      </div>
      {children && <div className="w-full">{children}</div>}
    </div>
  )
}
