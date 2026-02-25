"use client"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Settings,
  Cpu,
  Volume2,
  Keyboard,
  Brain,
  Shield,
} from "lucide-react"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sttModel: string
  onSttModelChange: (model: string) => void
  llmModel: string
  onLlmModelChange: (model: string) => void
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  soundFeedback: boolean
  onSoundFeedbackChange: (enabled: boolean) => void
  editStrength: number
  onEditStrengthChange: (strength: number) => void
  className?: string
}

const sttModels = [
  { value: "whisper-tiny", label: "Whisper Tiny (75MB)", description: "Fastest, lower accuracy" },
  { value: "whisper-base", label: "Whisper Base (142MB)", description: "Good balance" },
  { value: "whisper-small", label: "Whisper Small (466MB)", description: "Better accuracy" },
  { value: "whisper-medium", label: "Whisper Medium (1.5GB)", description: "High accuracy" },
]

const llmModels = [
  { value: "phi-3-mini", label: "Phi-3 Mini (2.4GB)", description: "Fast, lightweight" },
  { value: "mistral-7b", label: "Mistral 7B (4.4GB)", description: "Balanced" },
  { value: "llama-3-8b", label: "LLaMA 3 8B (5.7GB)", description: "High quality" },
  { value: "ollama-local", label: "Ollama (Local)", description: "External runtime" },
]

export function SettingsPanel({
  open,
  onOpenChange,
  sttModel,
  onSttModelChange,
  llmModel,
  onLlmModelChange,
  customPrompt,
  onCustomPromptChange,
  soundFeedback,
  onSoundFeedbackChange,
  editStrength,
  onEditStrengthChange,
}: SettingsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] overflow-y-auto border-border bg-card">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Settings className="size-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Configure your local AI dictation engine.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-8">
          {/* STT Model Selection */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Speech-to-Text Model</h3>
            </div>
            <Select value={sttModel} onValueChange={onSttModelChange}>
              <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {sttModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex flex-col">
                      <span className="text-foreground">{model.label}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator className="bg-border" />

          {/* LLM Model Selection */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">LLM Edit Model</h3>
            </div>
            <Select value={llmModel} onValueChange={onLlmModelChange}>
              <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {llmModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex flex-col">
                      <span className="text-foreground">{model.label}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator className="bg-border" />

          {/* Edit Strength */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Edit Strength</h3>
              <span className="text-xs font-mono text-muted-foreground">{editStrength}%</span>
            </div>
            <Slider
              value={[editStrength]}
              onValueChange={(val) => onEditStrengthChange(val[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimal</span>
              <span>Maximum</span>
            </div>
          </section>

          <Separator className="bg-border" />

          {/* Custom System Prompt */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Custom System Prompt</h3>
            <Textarea
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              placeholder="Add custom instructions for how the LLM should edit your text..."
              className="min-h-[80px] resize-none bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm"
            />
          </section>

          <Separator className="bg-border" />

          {/* Toggles */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm text-foreground">Sound Feedback</span>
                  <span className="text-xs text-muted-foreground">Play sounds on start/stop</span>
                </div>
              </div>
              <Switch
                checked={soundFeedback}
                onCheckedChange={onSoundFeedbackChange}
              />
            </div>

            <div className="flex items-center gap-2">
              <Keyboard className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">Type into active app</span>
                <span className="text-xs text-muted-foreground">Always on — text is pasted where your cursor is when you stop.</span>
              </div>
            </div>
          </section>

          <Separator className="bg-border" />

          {/* Privacy notice */}
          <section className={cn("flex items-start gap-2 rounded-lg bg-secondary/50 p-3")}>
            <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">Fully Local & Private</span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                All processing happens on your device. No data is sent to any external servers.
                Zero telemetry, zero cloud dependencies.
              </span>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
