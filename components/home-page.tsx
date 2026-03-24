"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useAudioEngine } from "@/hooks/use-audio-engine"
import { useLocalTranscription } from "@/hooks/use-local-transcription"
import { WaveformVisualizer } from "@/components/waveform-visualizer"
import type { HistoryEntry } from "@/components/history-panel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Clock, Copy, Check, Keyboard } from "lucide-react"
import { listen } from "@tauri-apps/api/event"
import { setTrayRecording } from "@/lib/tray"
import {
  transcribeInWorker,
  terminateWorker,
} from "@/lib/transcription-worker-client"
import { injectTextIntoActiveApp, preloadTauriInject, isRunningInTauri } from "@/lib/inject-text"

interface HomePageProps {
  history: HistoryEntry[]
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>
  sttModel: string
}

export function HomePage({
  history,
  setHistory,
  sttModel,
}: HomePageProps) {
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

  const [showBanner, setShowBanner] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState<"transcribing" | "editing" | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [injectStatus, setInjectStatus] = useState<string | null>(null)

  // Guards
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
      setInjectStatus(null)
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

          console.log("[VoxScribe] Injecting text into active app:", edited.slice(0, 50))
          const result = await injectTextIntoActiveApp(edited)
          console.log("[VoxScribe] Inject result:", result)
          if (!result.ok) {
            setProcessingError(result.message ?? "Failed to type into active app")
          } else if (result.message) {
            setInjectStatus(result.message)
            setTimeout(() => setInjectStatus(null), 4000)
          }
        }
      }
    } finally {
      setProcessingStep(null)
      endProcessing()
      busyRef.current = false
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

  // Tauri global shortcut events
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

  // Group history by date
  const groupedHistory = history.reduce<Record<string, HistoryEntry[]>>((groups, entry) => {
    const now = new Date()
    const entryDate = new Date(entry.timestamp)
    const diffDays = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

    let label: string
    if (diffDays === 0) {
      label = "TODAY"
    } else if (diffDays === 1) {
      label = "YESTERDAY"
    } else {
      label = entryDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase()
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(entry)
    return groups
  }, {})

  const isRecording = recordingState === "recording"

  return (
    <ScrollArea className="h-full min-h-0 flex-1">
      <div className="mx-auto min-h-full max-w-[860px] px-8 py-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            Welcome back
          </h1>
        </div>

        {/* Recording banner / CTA */}
        {showBanner && (
          <div className="relative mt-6 overflow-hidden rounded-xl border border-border bg-banner p-6">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss banner"
            >
              <X className="size-5" />
            </button>
            <div className="flex items-center gap-8">
              <div className="flex flex-1 flex-col gap-3">
                <h2 className="text-xl font-semibold text-banner-foreground text-pretty">
                  Start dictating anywhere
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong>Hold</strong> <kbd className="rounded border border-border bg-muted px-1 font-mono text-xs">Ctrl+D</kbd> to record; <strong>release</strong> to stop and paste. Text is always typed into the active app (Notes, Terminal, etc.).
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Keyboard className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Text is typed into the focused app when you stop.</span>
                </div>
                {isModelLoading && (
                  <p className="text-xs text-blue-400">
                    Loading {sttModel} model...
                  </p>
                )}
                {modelError && (
                  <p className="text-xs text-red-400">
                    Model error: {modelError}
                  </p>
                )}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {recordingState === "idle"
                        ? isModelLoading ? "Loading model..." : "Press Ctrl+D to start"
                        : isRecording
                          ? "Listening... (release Ctrl+D to stop)"
                          : processingStep === "transcribing"
                            ? "Transcribing..."
                            : processingStep === "editing"
                              ? "Editing..."
                              : "Processing..."}
                    </span>
                    {isRecording && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Waveform */}
              <div className="hidden h-16 w-48 md:block">
                <WaveformVisualizer
                  levels={audioLevels}
                  isRecording={isRecording}
                  variant="bars"
                />
              </div>
            </div>
          </div>
        )}

        {/* Inject status */}
        {injectStatus && (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2">
            <p className="text-xs text-green-400">{injectStatus}</p>
          </div>
        )}

        {/* Error display */}
        {(audioError || processingError) && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive whitespace-pre-line">{processingError ?? audioError}</p>
          </div>
        )}

        {/* Interim transcription */}
        {(interimText || (rawText && isRecording)) && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-4">
            <p className="text-sm leading-relaxed text-foreground">
              {rawText}
              {interimText && (
                <span className="text-muted-foreground italic">{interimText}</span>
              )}
            </p>
          </div>
        )}

        {/* Latest edited text */}
        {editedText && !isRecording && (
          <div className="mt-4 flex max-h-48 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-card p-4">
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-foreground">{editedText}</p>
              </div>
              <button
                onClick={() => handleCopy(editedText, "latest")}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Copy text"
              >
                {copiedId === "latest" ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {Object.keys(groupedHistory).length > 0 && (
          <div className="mt-10 flex flex-col gap-8">
            {Object.entries(groupedHistory).map(([dateLabel, entries]) => (
              <div key={dateLabel}>
                <p className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground">
                  {dateLabel}
                </p>
                <div className="flex flex-col gap-0">
                  {entries.map((entry, index) => {
                    const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    const displayText = entry.editedText || entry.rawText
                    return (
                      <div
                        key={`${dateLabel}-${entry.id}-${index}`}
                        className="flex gap-6 border-t border-border py-5"
                      >
                        <div className="flex items-start gap-1.5 pt-0.5 text-sm text-muted-foreground shrink-0 w-20">
                          <Clock className="size-3.5 mt-0.5" />
                          <span>{timeStr}</span>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                            <p className="max-h-32 min-w-0 flex-1 overflow-y-auto text-sm leading-relaxed text-foreground">
                              {displayText}
                            </p>
                            <button
                              onClick={() => handleCopy(displayText, entry.id)}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === entry.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {history.length === 0 && (
          <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your dictation history will appear here
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
