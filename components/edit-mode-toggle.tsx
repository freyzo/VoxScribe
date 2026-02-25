"use client"

import { cn } from "@/lib/utils"
import type { EditMode, Tone } from "@/hooks/use-transcription"
import { FileText, Wand2, Sparkles, MessageSquare, Briefcase, Minimize2 } from "lucide-react"

interface EditModeToggleProps {
  editMode: EditMode
  tone: Tone
  onEditModeChange: (mode: EditMode) => void
  onToneChange: (tone: Tone) => void
  className?: string
}

const editModes: { value: EditMode; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: "raw",
    label: "Raw",
    description: "No editing",
    icon: FileText,
  },
  {
    value: "light",
    label: "Light Edit",
    description: "Fix grammar & punctuation",
    icon: Wand2,
  },
  {
    value: "aggressive",
    label: "Rewrite",
    description: "Full clarity rewrite",
    icon: Sparkles,
  },
]

const tones: { value: Tone; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "casual", label: "Casual", icon: MessageSquare },
  { value: "professional", label: "Professional", icon: Briefcase },
  { value: "concise", label: "Concise", icon: Minimize2 },
]

export function EditModeToggle({
  editMode,
  tone,
  onEditModeChange,
  onToneChange,
  className,
}: EditModeToggleProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Edit mode selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Edit Mode
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {editModes.map((mode) => {
            const Icon = mode.icon
            const isActive = editMode === mode.value
            return (
              <button
                key={mode.value}
                onClick={() => onEditModeChange(mode.value)}
                aria-pressed={isActive}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-xs transition-all",
                  "border",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="size-4" />
                <span className="font-medium">{mode.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tone selector - only show when not in raw mode */}
      {editMode !== "raw" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tone
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {tones.map((t) => {
              const Icon = t.icon
              const isActive = tone === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => onToneChange(t.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-all",
                    "border",
                    isActive
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="font-medium">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
