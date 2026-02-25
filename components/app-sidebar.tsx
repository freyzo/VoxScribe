"use client"

import { cn } from "@/lib/utils"
import { LayoutGrid, BookOpen, Type, Box } from "lucide-react"

export type PageId = "home" | "dictionary" | "style" | "models"

interface AppSidebarProps {
  activePage: PageId
  onPageChange: (page: PageId) => void
}

const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: LayoutGrid },
  { id: "dictionary", label: "Dictionary", icon: BookOpen },
  { id: "style", label: "Style", icon: Type },
  { id: "models", label: "Models", icon: Box },
]

function VoxScribeLogo({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer circle */}
      <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      {/* Sound wave bars radiating from center */}
      <rect x="8" y="9" width="2.5" height="10" rx="1.25" fill="currentColor" opacity="0.6" />
      <rect x="12.75" y="5" width="2.5" height="18" rx="1.25" fill="currentColor" />
      <rect x="17.5" y="8" width="2.5" height="12" rx="1.25" fill="currentColor" opacity="0.75" />
    </svg>
  )
}

export function AppSidebar({ activePage, onPageChange }: AppSidebarProps) {
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-8">
        <VoxScribeLogo className="text-primary" />
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          VoxScribe
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-[18px]" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
