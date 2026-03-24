"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useAudioEngine } from "@/hooks/use-audio-engine"
import { useLocalTranscription } from "@/hooks/use-local-transcription"
import { WaveformVisualizer } from "@/components/waveform-visualizer"
import type { HistoryEntry } from "@/lib/types"
import { Copy, Check, Clock, Mic, Square, Loader2 } from "lucide-react"
import { listen } from "@tauri-apps/api/event"
import { setTrayRecording } from "@/lib/tray"
import {
  transcribeInWorker,
  terminateWorker,
} from "@/lib/transcription-worker-client"
import { injectTextIntoActiveApp, preloadTauriInject } from "@/lib/inject-text"

interface HomePageProps {
  history: HistoryEntry[]
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>
  sttModel: string
}

export function HomePage({ history, setHistory, sttModel }: HomePageProps) {
  const resolvedSttModel =
    sttModel === "whisper-small" || sttModel === "whisper-small-multilingual"
      ? "whisper-small-multilingual"
      : "whisper-tiny-multilingual"

  const {
    recordingState,
    audioLevel,
    audioLevels,
    duration,
    error: audioError,
    startRecording,
    stopRecording,
    getAudioData,
    endProcessing,
  } = useAudioEngine()

  const {
    rawText,
    editedText,
    interimText,
    editMode,
    startTranscription,
    stopTranscription,
    processEdit,
    clearTranscript,
    setRawText,
    isModelLoading,
    modelError,
  } = useLocalTranscription(resolvedSttModel)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState<"transcribing" | "editing" | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Refs for guarding against double-start and stale closures
  const busyRef = useRef(false)
  const recordingStateRef = useRef(recordingState)
  recordingStateRef.current = recordingState

  useEffect(() => {
    setTrayRecording(recordingState === "recording")
  }, [recordingState])

  useEffect(() => {
    preloadTauriInject()
  }, [])

  const doStart = useCallback(async () => {
    if (busyRef.current || recordingStateRef.current !== "idle") return
    if (isModelLoading) return
    busyRef.current = true
    try {
      clearTranscript()
      setProcessingError(null)
      startTranscription()
      await startRecording()
    } catch (error) {
      console.error("Failed to start recording:", error)
      setProcessingError(error instanceof Error ? error.message : "Failed to start recording")
    } finally {
      busyRef.current = false
    }
  }, [isModelLoading, clearTranscript, startTranscription, startRecording])

  const doStop = useCallback(async () => {
    if (busyRef.current || recordingStateRef.current !== "recording") return
    busyRef.current = true
    try {
      stopRecording()
      const audio = getAudioData()
      stopTranscription()
      setProcessingError(null)

      if (audio && audio.length > 0) {
        setProcessingStep("transcribing")
        let finalText: string
        try {
          finalText = await transcribeInWorker(resolvedSttModel, audio)
        } catch (err) {
          console.error("Transcription failed:", err)
          setProcessingError(err instanceof Error ? err.message : "Transcription failed")
          return
        }

        if (finalText) {
          setRawText(finalText)
          setProcessingStep("editing")
          const edited = await processEdit(finalText)
          setHistory((prev) => [
            {
              id: crypto.randomUUID(),
              rawText: finalText,
              editedText: edited,
              editMode,
              timestamp: new Date(),
              sourceLanguage: "en",
            },
            ...prev,
          ])
          const result = await injectTextIntoActiveApp(edited)
          if (!result.ok && result.message) setProcessingError(result.message)
        }
      }
    } finally {
      setProcessingStep(null)
      endProcessing()
      busyRef.current = false
      // Terminate worker after a delay to free memory
      setTimeout(terminateWorker, 1000)
    }
  }, [
    resolvedSttModel,
    stopRecording,
    getAudioData,
    stopTranscription,
    processEdit,
    editMode,
    setRawText,
    setHistory,
    endProcessing,
  ])

  // Keyboard: hold Ctrl+D to record, release to stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d" && !e.repeat) {
        const target = e.target as HTMLElement
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return
        e.preventDefault()
        doStart()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (recordingStateRef.current !== "recording") return
      if (e.key === "d" || e.key === "D" || e.key === "Control") {
        e.preventDefault()
        doStop()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [doStart, doStop])

  // Tauri tray/global shortcut events
  useEffect(() => {
    let unlistenStart: (() => void) | null = null
    let unlistenStop: (() => void) | null = null

    const setup = async () => {
      try {
        unlistenStart = await listen("start_dictation", () => {
          if (recordingStateRef.current === "idle") doStart()
          else if (recordingStateRef.current === "recording") doStop()
        })
        unlistenStop = await listen("stop_dictation", () => {
          if (recordingStateRef.current === "recording") doStop()
        })
      } catch {
        // Not in Tauri
      }
    }
    setup()
    return () => { unlistenStart?.(); unlistenStop?.() }
  }, [doStart, doStop])

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isIdle = recordingState === "idle" && !processingStep
  const isRecording = recordingState === "recording"
  const isProcessing = !!processingStep

  const statusText = isModelLoading
    ? "Loading model..."
    : isRecording
      ? `Listening... ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`
      : processingStep === "transcribing"
        ? "Transcribing..."
        : processingStep === "editing"
          ? "Editing..."
          : "Hold Ctrl+D to dictate"

  return (
    <div className="flex h-full flex-col">
      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
        {/* Mic button + waveform */}
        <div className="relative flex flex-col items-center gap-4">
          {/* Waveform behind mic */}
          {isRecording && (
            <div className="absolute -inset-8 opacity-60">
              <WaveformVisualizer
                levels={audioLevels}
                isRecording={true}
                variant="wave"
              />
            </div>
          )}

          {/* Mic button */}
          <button
            onClick={() => {
              if (isRecording) doStop()
              else if (isIdle) doStart()
            }}
            disabled={isProcessing || isModelLoading}
            className={`relative z-10 flex size-20 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isRecording
                ? "bg-red-500/90 text-white shadow-lg shadow-red-500/20"
                : isProcessing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            }`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isProcessing ? (
              <Loader2 className="size-7 animate-spin" />
            ) : isRecording ? (
              <Square className="size-6" fill="currentColor" />
            ) : (
              <Mic className="size-7" />
            )}
          </button>

          {/* Glow ring */}
          {isRecording && (
            <div
              className="absolute z-0 rounded-full bg-red-500/10 animate-pulse"
              style={{
                width: `${100 + audioLevel * 60}px`,
                height: `${100 + audioLevel * 60}px`,
              }}
            />
          )}
        </div>

        {/* Status */}
        <p className={`text-sm ${isRecording ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
          {statusText}
        </p>

        {/* Error */}
        {(audioError || processingError || modelError) && (
          <p className="max-w-md text-center text-xs text-red-400">
            {processingError ?? modelError ?? audioError}
          </p>
        )}

        {/* Current transcription */}
        {(interimText || (rawText && isRecording)) && (
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-4">
            <p className="text-sm leading-relaxed text-foreground">
              {rawText}
              {interimText && <span className="text-muted-foreground italic">{interimText}</span>}
            </p>
          </div>
        )}

        {/* Latest result */}
        {editedText && !isRecording && !isProcessing && (
          <div className="flex w-full max-w-lg items-start gap-3 rounded-lg border border-border bg-card p-4">
            <p className="flex-1 text-sm leading-relaxed text-foreground">{editedText}</p>
            <button
              onClick={() => handleCopy(editedText, "latest")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Copy text"
            >
              {copiedId === "latest" ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        )}
      </div>

      {/* History — compact bottom section */}
      {history.length > 0 && (
        <div className="border-t border-border px-8 py-4 max-h-[35vh] overflow-y-auto">
          <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">History</p>
          <div className="flex flex-col gap-0">
            {history.slice(0, 20).map((entry) => {
              const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              const displayText = entry.editedText || entry.rawText
              return (
                <div key={entry.id} className="flex gap-4 border-t border-border/50 py-3 first:border-t-0">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-16">
                    <Clock className="size-3" />
                    {timeStr}
                  </span>
                  <p className="flex-1 text-sm leading-relaxed text-foreground line-clamp-2">{displayText}</p>
                  <button
                    onClick={() => handleCopy(displayText, entry.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {copiedId === entry.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
