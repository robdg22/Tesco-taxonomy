"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeftIcon } from "lucide-react"
import type React from "react" // Import React
import { cn } from "@/lib/utils" // Import cn for conditional class names

interface NavigationHeaderProps {
  title: string
  onBack?: () => void
  children?: React.ReactNode // New prop for additional content
}

export function NavigationHeader({ title, onBack, children }: NavigationHeaderProps) {
  const shouldShowHeaderContent = title || onBack // Show if title exists or back button is needed

  return (
    <div className={cn("flex flex-col", shouldShowHeaderContent || children ? "border-b" : "")}>
      {shouldShowHeaderContent && (
        <div className="flex items-center p-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
              <ChevronLeftIcon className="h-6 w-6" />
            </Button>
          )}
          <h1 className="text-xl font-semibold ml-2">{title}</h1>
        </div>
      )}
      {children && <div className="w-full">{children}</div>} {/* Render children below title */}
    </div>
  )
}
