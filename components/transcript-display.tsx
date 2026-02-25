"use client"

import { cn } from "@/lib/utils"
import { Copy, Check, Trash2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { EditMode } from "@/hooks/use-transcription"

interface TranscriptDisplayProps {
  rawText: string
  editedText: string
  interimText: string
  isEditing: boolean
  editMode: EditMode
  onClear: () => void
  className?: string
}

export function TranscriptDisplay({
  rawText,
  editedText,
  interimText,
  isEditing,
  editMode,
  onClear,
  className,
}: TranscriptDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const displayText = editMode === "raw" ? rawText : editedText || rawText
  const hasText = rawText.trim().length > 0 || interimText.trim().length > 0

  const handleCopy = async () => {
    const textToCopy = showRaw ? rawText : displayText
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">Transcript</h2>
          {editMode !== "raw" && rawText && editedText && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
            >
              {showRaw ? "Show edited" : "Show raw"}
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasText && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopy}
                aria-label="Copy transcript"
                className="text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClear}
                aria-label="Clear transcript"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Text display */}
      <div className="relative min-h-[120px] flex-1 rounded-xl border border-border bg-card p-4">
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span>Editing transcript...</span>
            </div>
          </div>
        )}

        {hasText ? (
          <div className="space-y-1">
            {showRaw ? (
              <p className="text-sm leading-relaxed text-muted-foreground font-mono">
                {rawText}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-foreground">
                {displayText}
                {interimText && (
                  <span className="text-muted-foreground/60 italic">
                    {interimText}
                  </span>
                )}
              </p>
            )}

            {/* Edit mode indicator */}
            {editMode !== "raw" && editedText && !showRaw && (
              <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-border/50">
                <div className="size-1.5 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">
                  {editMode === "light" ? "Light edit applied" : "Aggressively rewritten"}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[100px] items-center justify-center">
            <p className="text-sm text-muted-foreground/50">
              Press the mic button or use the hotkey to start dictating...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
