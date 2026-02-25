"use client"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Wand2,
  Sparkles,
  MessageSquare,
  Briefcase,
  Minimize2,
  Cpu,
  Brain,
  Languages,
} from "lucide-react"
import type { EditMode, Tone } from "@/hooks/use-transcription"

interface StylePageProps {
  editMode: EditMode
  onEditModeChange: (mode: EditMode) => void
  tone: Tone
  onToneChange: (tone: Tone) => void
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  sttModel: string
  onSttModelChange: (model: string) => void
  inputLanguage: "en" | "zh"
  onInputLanguageChange: (lang: "en" | "zh") => void
  llmModel: string
  onLlmModelChange: (model: string) => void
  editStrength: number
  onEditStrengthChange: (strength: number) => void
}

const editModes: { value: EditMode; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "raw", label: "Raw", description: "No editing, exact transcription", icon: FileText },
  { value: "light", label: "Light Edit", description: "Fix grammar, punctuation, and filler words", icon: Wand2 },
  { value: "aggressive", label: "Rewrite", description: "Full clarity and tone rewrite", icon: Sparkles },
]

const tones: { value: Tone; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "casual", label: "Casual", description: "Conversational and friendly", icon: MessageSquare },
  { value: "professional", label: "Professional", description: "Formal and polished", icon: Briefcase },
  { value: "concise", label: "Concise", description: "Minimal and to-the-point", icon: Minimize2 },
]

const sttModels = [
  { value: "whisper-tiny", label: "Whisper Tiny (EN)", desc: "75MB - Fastest" },
  { value: "whisper-base", label: "Whisper Base (EN)", desc: "142MB - Balanced" },
  { value: "whisper-small", label: "Whisper Small (EN)", desc: "466MB - Better" },
  { value: "whisper-medium", label: "Whisper Medium (EN)", desc: "1.5GB - Best" },
  { value: "whisper-tiny-multilingual", label: "Whisper Tiny (多语言)", desc: "75MB - Mandarin etc." },
  { value: "whisper-small-multilingual", label: "Whisper Small (多语言)", desc: "466MB - Mandarin etc." },
]

const llmModels = [
  { value: "phi-3-mini", label: "Phi-3 Mini", desc: "2.4GB - Fast" },
  { value: "mistral-7b", label: "Mistral 7B", desc: "4.4GB - Balanced" },
  { value: "llama-3-8b", label: "LLaMA 3 8B", desc: "5.7GB - Quality" },
  { value: "ollama-local", label: "Ollama (Local)", desc: "External runtime" },
]

export function StylePage({
  editMode,
  onEditModeChange,
  tone,
  onToneChange,
  customPrompt,
  onCustomPromptChange,
  sttModel,
  onSttModelChange,
  inputLanguage,
  onInputLanguageChange,
  llmModel,
  onLlmModelChange,
  editStrength,
  onEditStrengthChange,
}: StylePageProps) {
  return (
    <ScrollArea className="h-full min-h-0 flex-1">
      <div className="mx-auto min-h-full max-w-[860px] px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Style</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how Flow edits and refines your dictated text.
        </p>

        {/* Input language: English vs Mandarin → English */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Dictation language
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Speak in English only, or in Mandarin and get both Chinese + English.
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
            If you see &quot;[speaking in foreign language]&quot;, you're on English-only — switch to <strong>Mandarin → English</strong> below.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => onInputLanguageChange("en")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-all",
                inputLanguage === "en"
                  ? "border-foreground bg-card shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <Languages className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">English only</span>
            </button>
            <button
              onClick={() => onInputLanguageChange("zh")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-all",
                inputLanguage === "zh"
                  ? "border-foreground bg-card shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <Languages className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Mandarin (中文) → English</span>
            </button>
          </div>
        </section>

        {/* Edit Mode */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Edit Mode
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {editModes.map((mode) => {
              const Icon = mode.icon
              const isActive = editMode === mode.value
              return (
                <button
                  key={mode.value}
                  onClick={() => onEditModeChange(mode.value)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                    isActive
                      ? "border-foreground bg-card shadow-sm"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", isActive ? "text-foreground" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                      {mode.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Tone */}
        {editMode !== "raw" && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Tone
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tones.map((t) => {
                const Icon = t.icon
                const isActive = tone === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => onToneChange(t.value)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                      isActive
                        ? "border-foreground bg-card shadow-sm"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4", isActive ? "text-foreground" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                        {t.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <Separator className="my-8" />

        {/* Edit Strength */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Edit Strength
            </h2>
            <span className="text-sm font-mono text-muted-foreground">{editStrength}%</span>
          </div>
          <Slider
            value={[editStrength]}
            onValueChange={(val) => onEditStrengthChange(val[0])}
            min={0}
            max={100}
            step={5}
            className="mt-3 w-full"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Minimal changes</span>
            <span>Maximum rewriting</span>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Custom Prompt */}
        <section>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Custom Instructions
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Add specific instructions for how the LLM should edit your text.
          </p>
          <Textarea
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="e.g. Always use Oxford commas. Avoid passive voice. Keep technical terms unchanged."
            className="mt-3 min-h-[100px] resize-none border-border bg-card text-foreground placeholder:text-muted-foreground/50 text-sm"
          />
        </section>

        <Separator className="my-8" />

        {/* Model Selection */}
        <section>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Models
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Cpu className="size-4 text-muted-foreground" />
                Speech-to-Text
              </label>
              <p className="text-xs text-muted-foreground">
                Use a multilingual model (e.g. Whisper Tiny 多语言) when dictating in Mandarin.
              </p>
              <Select value={sttModel} onValueChange={onSttModelChange}>
                <SelectTrigger className="border-border bg-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {sttModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span>{m.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{m.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Brain className="size-4 text-muted-foreground" />
                LLM Edit Engine
              </label>
              <Select value={llmModel} onValueChange={onLlmModelChange}>
                <SelectTrigger className="border-border bg-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {llmModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span>{m.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{m.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      </div>
    </ScrollArea>
  )
}
