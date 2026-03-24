"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Check,
  Loader2,
  Cpu,
  Brain,
  HardDrive,
  Zap,
  Star,
  Trash2,
} from "lucide-react"

export interface ModelEntry {
  id: string
  name: string
  category: "stt" | "llm"
  size: string
  description: string
  speed: "Fast" | "Balanced" | "Quality"
  ramRequired: string
  downloaded: boolean
  active: boolean
}

const defaultModels: ModelEntry[] = [
  {
    id: "whisper-tiny-multilingual",
    name: "Whisper Tiny Multilingual",
    category: "stt",
    size: "75 MB",
    description: "Fastest speech-to-text with multilingual support.",
    speed: "Fast",
    ramRequired: "~1 GB",
    downloaded: true,
    active: true,
  },
  {
    id: "whisper-small-multilingual",
    name: "Whisper Small Multilingual",
    category: "stt",
    size: "466 MB",
    description: "Higher accuracy for multilingual dictation.",
    speed: "Quality",
    ramRequired: "~3 GB",
    downloaded: false,
    active: false,
  },
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini",
    category: "llm",
    size: "2.4 GB",
    description: "Lightweight and fast text editing. Great for grammar fixes.",
    speed: "Fast",
    ramRequired: "~4 GB",
    downloaded: true,
    active: true,
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B Instruct",
    category: "llm",
    size: "4.4 GB",
    description: "Strong general-purpose editing with excellent instruction following.",
    speed: "Balanced",
    ramRequired: "~8 GB",
    downloaded: false,
    active: false,
  },
  {
    id: "llama-3-8b",
    name: "LLaMA 3 8B Instruct",
    category: "llm",
    size: "5.7 GB",
    description: "Highest quality rewrites with nuanced tone and style control.",
    speed: "Quality",
    ramRequired: "~10 GB",
    downloaded: false,
    active: false,
  },
  {
    id: "gemma-2b",
    name: "Gemma 2B",
    category: "llm",
    size: "1.4 GB",
    description: "Ultra-lightweight LLM for basic grammar and punctuation fixes.",
    speed: "Fast",
    ramRequired: "~3 GB",
    downloaded: false,
    active: false,
  },
]

interface ModelsPageProps {
  sttModel: string
  onSttModelChange: (model: string) => void
  llmModel: string
  onLlmModelChange: (model: string) => void
}

export function ModelsPage({
  sttModel,
  onSttModelChange,
  llmModel,
  onLlmModelChange,
}: ModelsPageProps) {
  const [models, setModels] = useState<ModelEntry[]>(defaultModels)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "stt" | "llm">("all")

  const handleDownload = (id: string) => {
    setDownloadingId(id)
    // Simulate download
    setTimeout(() => {
      setModels((prev) =>
        prev.map((m) => (m.id === id ? { ...m, downloaded: true } : m))
      )
      setDownloadingId(null)
    }, 2500)
  }

  const handleRemove = (id: string) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, downloaded: false, active: false } : m))
    )
  }

  const handleActivate = (model: ModelEntry) => {
    if (!model.downloaded) return
    if (model.category === "stt") {
      onSttModelChange(model.id)
      setModels((prev) =>
        prev.map((m) =>
          m.category === "stt"
            ? { ...m, active: m.id === model.id }
            : m
        )
      )
    } else {
      onLlmModelChange(model.id)
      setModels((prev) =>
        prev.map((m) =>
          m.category === "llm"
            ? { ...m, active: m.id === model.id }
            : m
        )
      )
    }
  }

  const filteredModels = filter === "all" ? models : models.filter((m) => m.category === filter)
  const sttModels = filteredModels.filter((m) => m.category === "stt")
  const llmModels = filteredModels.filter((m) => m.category === "llm")

  const speedColor = (speed: string) => {
    switch (speed) {
      case "Fast":
        return "text-green-400"
      case "Balanced":
        return "text-primary"
      case "Quality":
        return "text-blue-400"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="h-full min-h-0 flex-1">
        <div className="mx-auto min-h-full max-w-[860px] px-8 py-8 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Models
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Download and manage local AI models for speech-to-text and text editing.
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mt-6 flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
            {(["all", "stt", "llm"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "All" : f === "stt" ? "Speech-to-Text" : "LLM Editing"}
              </button>
            ))}
          </div>

          {/* STT Models */}
          {sttModels.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Speech-to-Text Models
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {sttModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isDownloading={downloadingId === model.id}
                    onDownload={() => handleDownload(model.id)}
                    onRemove={() => handleRemove(model.id)}
                    onActivate={() => handleActivate(model)}
                    speedColor={speedColor}
                  />
                ))}
              </div>
            </section>
          )}

          {/* LLM Models */}
          {llmModels.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  LLM Edit Models
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {llmModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isDownloading={downloadingId === model.id}
                    onDownload={() => handleDownload(model.id)}
                    onRemove={() => handleRemove(model.id)}
                    onActivate={() => handleActivate(model)}
                    speedColor={speedColor}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function ModelCard({
  model,
  isDownloading,
  onDownload,
  onRemove,
  onActivate,
  speedColor,
}: {
  model: ModelEntry
  isDownloading: boolean
  onDownload: () => void
  onRemove: () => void
  onActivate: () => void
  speedColor: (speed: string) => string
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-xl border p-4 transition-all",
        model.active
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card hover:border-muted-foreground/20"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">{model.name}</h3>
          {model.active && (
            <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px] px-1.5 py-0 border-0">
              Active
            </Badge>
          )}
          <span className={cn("text-[10px] font-medium flex items-center gap-1", speedColor(model.speed))}>
            <Zap className="size-3" />
            {model.speed}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {model.description}
        </p>
        <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <HardDrive className="size-3" />
            {model.size}
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="size-3" />
            RAM: {model.ramRequired}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        {model.downloaded ? (
          <>
            {!model.active && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-border text-foreground hover:bg-accent"
                onClick={onActivate}
              >
                <Star className="size-3.5 mr-1" />
                Use
              </Button>
            )}
            {!model.active && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
            {model.active && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Check className="size-4" />
                In use
              </div>
            )}
          </>
        ) : (
          <Button
            size="sm"
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="size-3.5 mr-1 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="size-3.5 mr-1" />
                Download
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
