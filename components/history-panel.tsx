"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react"

export type SourceLanguage = "en" | "zh"

export interface HistoryEntry {
  id: string
  rawText: string
  editedText: string
  editMode: string
  timestamp: Date
  /** When "zh", rawText is Chinese and editedText is English (translated + edited). */
  sourceLanguage?: SourceLanguage
}

interface HistoryPanelProps {
  entries: HistoryEntry[]
  onClear: () => void
  className?: string
}

export function HistoryPanel({ entries, onClear, className }: HistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (entries.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <Clock className="mb-3 size-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground/50">No dictation history yet</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-foreground">
          History ({entries.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="mr-1 size-3" />
          Clear All
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="flex flex-col gap-2 pr-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id
            const displayText = entry.editedText || entry.rawText
            const timeStr = entry.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })

            return (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm text-foreground leading-relaxed",
                        !isExpanded && "line-clamp-2"
                      )}
                    >
                      {displayText}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleCopy(displayText, entry.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === entry.id ? (
                        <Check className="size-3" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {entry.editMode}
                    </span>
                  </div>
                  {displayText.length > 100 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <>
                          Less <ChevronUp className="size-3" />
                        </>
                      ) : (
                        <>
                          More <ChevronDown className="size-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
