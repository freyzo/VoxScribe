"use client"

import { cn } from "@/lib/utils"
import type { RecordingState } from "@/hooks/use-audio-engine"
import { Mic, Square, Loader2 } from "lucide-react"

interface MicButtonProps {
  state: RecordingState
  onToggle: () => void
  audioLevel: number
  className?: string
  disabled?: boolean
}

export function MicButton({ state, onToggle, audioLevel, className, disabled = false }: MicButtonProps) {
  const isRecording = state === "recording"
  const isProcessing = state === "processing" || state === "transcribing" || state === "editing"
  const isDisabled = disabled || isProcessing
  const pulseScale = isRecording ? 1 + audioLevel * 0.4 : 1

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer glow ring */}
      <div
        className={cn(
          "absolute rounded-full transition-all duration-300",
          isRecording
            ? "bg-primary/10 animate-pulse"
            : "bg-transparent"
        )}
        style={{
          width: `${80 + audioLevel * 40}px`,
          height: `${80 + audioLevel * 40}px`,
          opacity: isRecording ? 0.6 + audioLevel * 0.4 : 0,
        }}
      />

      {/* Middle ring */}
      {isRecording && (
        <div
          className="absolute rounded-full border-2 border-primary/30 transition-transform duration-100"
          style={{
            width: `${72 + audioLevel * 20}px`,
            height: `${72 + audioLevel * 20}px`,
            transform: `scale(${pulseScale})`,
          }}
        />
      )}

      {/* Main button */}
      <button
        onClick={onToggle}
        disabled={isDisabled}
        aria-label={
          isRecording
            ? "Stop recording"
            : isDisabled
              ? "Processing audio"
              : "Start recording"
        }
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "size-14",
          isRecording
            ? "bg-recording text-recording-foreground shadow-md hover:bg-recording/90"
            : isDisabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
        )}
      >
        {isDisabled ? (
          <Loader2 className="size-6 animate-spin" />
        ) : isRecording ? (
          <Square className="size-5" fill="currentColor" />
        ) : (
          <Mic className="size-6" />
        )}
      </button>
    </div>
  )
}
