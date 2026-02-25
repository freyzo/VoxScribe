"use client"

import { cn } from "@/lib/utils"
import type { RecordingState } from "@/hooks/use-audio-engine"
import { Mic, Shield, Cpu, Clock } from "lucide-react"

interface StatusBarProps {
  recordingState: RecordingState
  duration: number
  sttModel: string
  className?: string
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function StatusBar({
  recordingState,
  duration,
  sttModel,
  className,
}: StatusBarProps) {
  const stateLabels: Record<RecordingState, string> = {
    idle: "Ready",
    recording: "Recording",
    processing: "Processing",
    transcribing: "Transcribing",
    editing: "Editing",
  }

  const stateColors: Record<RecordingState, string> = {
    idle: "bg-muted-foreground",
    recording: "bg-recording",
    processing: "bg-chart-4",
    transcribing: "bg-primary",
    editing: "bg-primary",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-2",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full transition-colors",
              stateColors[recordingState],
              recordingState === "recording" && "animate-pulse"
            )}
          />
          <span className="text-xs font-medium text-foreground">
            {stateLabels[recordingState]}
          </span>
        </div>

        {/* Duration */}
        {(recordingState === "recording" || duration > 0) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span className="font-mono">{formatDuration(duration)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Model indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Cpu className="size-3" />
          <span>{sttModel.replace("whisper-", "").replace(/^\w/, c => c.toUpperCase())}</span>
        </div>

        {/* Hotkey hint */}
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Mic className="size-3" />
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Space
          </kbd>
        </div>

        {/* Privacy badge */}
        <div className="flex items-center gap-1 text-xs text-primary">
          <Shield className="size-3" />
          <span className="hidden sm:inline">Local</span>
        </div>
      </div>
    </div>
  )
}
