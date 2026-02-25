"use client"

import { useState, useCallback, useEffect } from "react"
import { AppSidebar, type PageId } from "@/components/app-sidebar"
import { HomePage } from "@/components/home-page"
import { DictionaryPage, type DictionaryWord } from "@/components/dictionary-page"
import { StylePage } from "@/components/style-page"
import { ModelsPage } from "@/components/models-page"
import { AppErrorBoundary } from "@/components/error-boundary"
import type { HistoryEntry } from "@/components/history-panel"
import type { EditMode, Tone } from "@/hooks/use-transcription"

const defaultWords: DictionaryWord[] = [
  { id: "1", word: "7z", type: "learned", createdAt: new Date() },
  { id: "2", word: "do.now", type: "learned", createdAt: new Date() },
  { id: "3", word: "lexa", type: "learned", createdAt: new Date() },
  { id: "4", word: "grep", type: "learned", createdAt: new Date() },
  { id: "5", word: "github", type: "learned", createdAt: new Date() },
  { id: "6", word: "kubectl", type: "learned", createdAt: new Date() },
  { id: "7", word: "Vercel", type: "manual", createdAt: new Date() },
  { id: "8", word: "Next.js", type: "manual", createdAt: new Date() },
]

export default function FlowApp() {
  const [activePage, setActivePage] = useState<PageId>("home")

  useEffect(() => {
    const el = document.getElementById("app-loading")
    if (el) el.style.display = "none"
  }, [])

  // History state (shared across pages)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Dictionary state
  const [words, setWords] = useState<DictionaryWord[]>(defaultWords)

  // Style settings
  const [editMode, setEditMode] = useState<EditMode>("light")
  const [tone, setTone] = useState<Tone>("professional")
  const [customPrompt, setCustomPrompt] = useState("")
  const [sttModel, setSttModel] = useState("whisper-tiny")
  const [inputLanguage, setInputLanguage] = useState<"en" | "zh">("en")
  const [llmModel, setLlmModel] = useState("phi-3-mini")
  const [editStrength, setEditStrength] = useState(50)

  const handleAddWord = useCallback((word: string) => {
    setWords((prev) => [
      {
        id: Date.now().toString(),
        word,
        type: "manual",
        createdAt: new Date(),
      },
      ...prev,
    ])
  }, [])

  const handleDeleteWord = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id))
  }, [])

  return (
    <AppErrorBoundary>
      <main className="flex h-screen bg-background">
        <AppSidebar activePage={activePage} onPageChange={setActivePage} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activePage === "home" && (
          <HomePage
            history={history}
            setHistory={setHistory}
            sttModel={sttModel}
            inputLanguage={inputLanguage}
            onOpenStyle={() => setActivePage("style")}
          />
        )}

        {activePage === "dictionary" && (
          <DictionaryPage
            words={words}
            onAddWord={handleAddWord}
            onDeleteWord={handleDeleteWord}
          />
        )}

        {activePage === "style" && (
          <StylePage
            editMode={editMode}
            onEditModeChange={setEditMode}
            tone={tone}
            onToneChange={setTone}
            customPrompt={customPrompt}
            onCustomPromptChange={setCustomPrompt}
            sttModel={sttModel}
            onSttModelChange={setSttModel}
            inputLanguage={inputLanguage}
            onInputLanguageChange={setInputLanguage}
            llmModel={llmModel}
            onLlmModelChange={setLlmModel}
            editStrength={editStrength}
            onEditStrengthChange={setEditStrength}
          />
        )}

        {activePage === "models" && (
          <ModelsPage
            sttModel={sttModel}
            onSttModelChange={setSttModel}
            llmModel={llmModel}
            onLlmModelChange={setLlmModel}
          />
        )}
        </div>
      </main>
    </AppErrorBoundary>
  )
}
