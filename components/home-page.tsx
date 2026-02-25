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
  translateInWorker,
  terminateWorker,
} from "@/lib/transcription-worker-client"
import { injectTextIntoActiveApp, preloadTauriInject } from "@/lib/inject-text"

const FOREIGN_LANGUAGE_PLACEHOLDER = /\[?\s*speaking\s+in\s+foreign\s+language\s*\]?\.?/i

interface HomePageProps {
  history: HistoryEntry[]
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>
  sttModel: string
  inputLanguage: "en" | "zh"
  onOpenStyle?: () => void
}

export function HomePage({
  history,
  setHistory,
  sttModel,
  inputLanguage,
  onOpenStyle,
}: HomePageProps) {
  const resolvedSttModel =
    inputLanguage === "zh"
      ? sttModel === "whisper-small" || sttModel === "whisper-small-multilingual"
        ? "whisper-small-multilingual"
        : "whisper-tiny-multilingual"
      : sttModel

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
    transcribeAudio,
    processEdit,
    clearTranscript,
    setRawText,
    isModelLoading,
    modelError,
    loadModel,
  } = useLocalTranscription(resolvedSttModel)

  const [browserSupport, setBrowserSupport] = useState({ audio: false, speech: false })
  const [showBanner, setShowBanner] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState<"transcribing" | "translating" | "editing" | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const recordingStateRef = useRef(recordingState)
  recordingStateRef.current = recordingState

  useEffect(() => {
    const hasAudio = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
    setBrowserSupport({ audio: hasAudio, speech: false }) // We're using local model, not browser speech
  }, [])

  // Transcription/translation run in a Web Worker so we don't load the heavy model on the main thread (no black screen / freeze).

  // Menu bar tray: show "Listening…" when recording so user has desktop feedback
  useEffect(() => {
    setTrayRecording(recordingState === "recording")
  }, [recordingState])

  // Preload only Tauri inject API (tiny). Worker+model preload removed: keeping the STT model
  // in memory caused the app to crash after a few minutes from memory pressure.
  useEffect(() => {
    preloadTauriInject()
  }, [])

  const handleToggleRecording = useCallback(async () => {
    if (recordingState === "recording") {
      stopRecording()
      const audio = getAudioData()
      stopTranscription()
      setProcessingError(null)

      try {
        if (audio && audio.length > 0) {
          setProcessingStep("transcribing")
          let finalText: string
          try {
            finalText = await transcribeInWorker(resolvedSttModel, audio, {
              forceLanguage: inputLanguage === "zh" ? "zh" : undefined,
            })
          } catch (err) {
            console.error("Transcription failed:", err)
            setProcessingError(err instanceof Error ? err.message : "Transcription failed")
            return
          }

          if (finalText) {
            const isMandarin = inputLanguage === "zh"
            setRawText(finalText)

            // MVP: skip Mandarin→English translation to reduce latency (was adding NLLB model load + run).
            // When re-enabled: setProcessingStep("translating"), then textToEdit = await translateInWorker(finalText)
            let textToEdit = finalText
            // if (isMandarin) {
            //   setProcessingStep("translating")
            //   try {
            //     textToEdit = await translateInWorker(finalText)
            //   } catch (err) {
            //     console.error("Translation failed:", err)
            //     setProcessingError(err instanceof Error ? err.message : "Translation failed")
            //     textToEdit = finalText
            //   }
            // }

            setProcessingStep("editing")
            const edited = await processEdit(textToEdit)
            setHistory((prev) => [
              {
                id: crypto.randomUUID(),
                rawText: finalText,
                editedText: edited,
                editMode,
                timestamp: new Date(),
                sourceLanguage: isMandarin ? "zh" : "en",
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
        setTimeout(terminateWorker, 1000)
      }
    } else if (recordingState === "idle") {
      if (isModelLoading) {
        console.log("Model is still loading...")
        return
      }
      clearTranscript()
      setProcessingError(null)
      setIsStarting(true)
      try {
        startTranscription()
        await startRecording()
      } catch (error) {
        console.error("Failed to start recording:", error)
        setProcessingError(error instanceof Error ? error.message : "Failed to start recording")
      } finally {
        setIsStarting(false)
      }
    }
  }, [
    recordingState,
    isModelLoading,
    inputLanguage,
    resolvedSttModel,
    startRecording,
    stopRecording,
    getAudioData,
    startTranscription,
    stopTranscription,
    processEdit,
    editMode,
    clearTranscript,
    setRawText,
    setHistory,
    endProcessing,
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      // Ctrl+D for dictation - start on key down
      if (e.ctrlKey && e.key === "d" && !isInput) {
        e.preventDefault()
        if (recordingState === "idle") {
          handleToggleRecording()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      // Stop dictation when either Ctrl or D is released (more reliable than only checking Ctrl)
      if (recordingState === "recording" && !isInput && (e.key === "d" || e.key === "D" || e.key === "Control")) {
        e.preventDefault()
        handleToggleRecording()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [handleToggleRecording, recordingState])

  // Listen for tray + global shortcut: start_dictation = toggle; stop_dictation = release to stop (global only)
  useEffect(() => {
    let unlistenStart: (() => void) | null = null
    let unlistenStop: (() => void) | null = null

    const setupListeners = async () => {
      try {
        unlistenStart = await listen("start_dictation", () => {
          handleToggleRecording()
        })
        unlistenStop = await listen("stop_dictation", () => {
          if (recordingStateRef.current === "recording") handleToggleRecording()
        })
      } catch (error) {
        console.log("Tauri not available, skipping tray/shortcut listeners")
      }
    }

    setupListeners()

    return () => {
      unlistenStart?.()
      unlistenStop?.()
    }
  }, [handleToggleRecording])

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
                  <strong>Hold</strong> <kbd className="rounded border border-border bg-muted px-1 font-mono text-xs">Ctrl+D</kbd> to record; <strong>release</strong> to stop and paste. Text is always typed into the active app (Notes, Terminal, etc.). Or click the mic / tray to toggle.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Keyboard className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Text is typed into the focused app when you stop.</span>
                </div>
                {isModelLoading && (
                  <p className="text-xs text-blue-400">
                    Loading {sttModel} model... This may take a moment.
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
                        ? isModelLoading ? "Loading model..." : "Press Ctrl+D to start (works in any app)"
                        : isStarting
                          ? "Starting…"
                          : recordingState === "recording"
                            ? "Listening… (release Ctrl+D to stop)"
                            : processingStep === "transcribing"
                              ? "Transcribing… (may take 30–60 sec)"
                              : processingStep === "translating"
                              ? "Translating to English…"
                              : processingStep === "editing"
                                ? "Editing…"
                                : "Processing..."}
                    </span>
                    {recordingState === "recording" && (
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
                  isRecording={recordingState === "recording"}
                  variant="bars"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {(audioError || processingError) && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{processingError ?? audioError}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can try again. If you switched to Mandarin mode, wait until the model has finished loading before recording.
            </p>
          </div>
        )}

        {/* Hint when user got "[speaking in foreign language]" — they need Mandarin mode */}
        {inputLanguage === "en" && onOpenStyle && (FOREIGN_LANGUAGE_PLACEHOLDER.test(editedText || rawText) || history.some((e) => FOREIGN_LANGUAGE_PLACEHOLDER.test(e.rawText || e.editedText))) && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-foreground">
              You're on <strong>English only</strong>, so Chinese isn't transcribed. To get Chinese + English, go to <strong>Style</strong> and set <strong>Dictation language</strong> to <strong>Mandarin (中文) → English</strong>.
            </p>
            <button
              type="button"
              onClick={onOpenStyle}
              className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Go to Style →
            </button>
          </div>
        )}

        {/* Interim transcription - scrollable when long */}
        {(interimText || (rawText && recordingState === "recording")) && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-4">
            <p className="text-sm leading-relaxed text-foreground">
              {rawText}
              {interimText && (
                <span className="text-muted-foreground italic">{interimText}</span>
              )}
            </p>
          </div>
        )}

        {/* Latest edited text - scrollable when long; show both Chinese + English when Mandarin */}
        {editedText && recordingState !== "recording" && (
          <div className="mt-4 flex max-h-48 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-card p-4">
            {inputLanguage === "zh" && rawText && (
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">原文 / Original</p>
                  <p className="text-sm leading-relaxed text-foreground">{rawText}</p>
                </div>
                <button
                  onClick={() => handleCopy(rawText, "latest-raw")}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Copy Chinese"
                >
                  {copiedId === "latest-raw" ? <Check className="size-4" /> : <Copy className="size-4" />}
                </button>
              </div>
            )}
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {inputLanguage === "zh" && (
                  <p className="text-xs font-medium text-muted-foreground">English</p>
                )}
                <p className="text-sm leading-relaxed text-foreground">{editedText}</p>
              </div>
              <button
                onClick={() => handleCopy(editedText, "latest")}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Copy English"
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
                    const isZh = entry.sourceLanguage === "zh"
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
                          {isZh && entry.rawText && (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-muted-foreground">原文 / Original</p>
                                <p className="max-h-24 overflow-y-auto text-sm leading-relaxed text-foreground">
                                  {entry.rawText}
                                </p>
                              </div>
                              <button
                                onClick={() => handleCopy(entry.rawText, `${entry.id}-raw`)}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label="Copy Chinese"
                              >
                                {copiedId === `${entry.id}-raw` ? <Check className="size-4" /> : <Copy className="size-4" />}
                              </button>
                            </div>
                          )}
                          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                            {isZh && <p className="text-xs font-medium text-muted-foreground">English</p>}
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
