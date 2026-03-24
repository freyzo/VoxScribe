"use client"

import { useState, useCallback, useEffect } from "react"
import { AppSidebar, type PageId } from "@/components/app-sidebar"
import { HomePage } from "@/components/home-page"
import { DictionaryPage, type DictionaryWord } from "@/components/dictionary-page"
import { StylePage } from "@/components/style-page"
import { ModelsPage } from "@/components/models-page"
import { AppErrorBoundary } from "@/components/error-boundary"
import type { HistoryEntry, SourceLanguage } from "@/components/history-panel"
import type { EditMode, Tone } from "@/hooks/use-transcription"
import { dbDictList, dbDictAdd, dbDictDelete, dbHistoryList } from "@/lib/db"

export default function FlowApp() {
  const [activePage, setActivePage] = useState<PageId>("home")

  useEffect(() => {
    const el = document.getElementById("app-loading")
    if (el) el.style.display = "none"
  }, [])

  // History state (shared across pages)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Dictionary state
  const [words, setWords] = useState<DictionaryWord[]>([])

  // Style settings
  const [editMode, setEditMode] = useState<EditMode>("light")
  const [tone, setTone] = useState<Tone>("professional")
  const [customPrompt, setCustomPrompt] = useState("")
  const [sttModel, setSttModel] = useState("whisper-tiny-multilingual")
  const [llmModel, setLlmModel] = useState("phi-3-mini")
  const [editStrength, setEditStrength] = useState(50)

  // Load dictionary + history from SQLite on mount
  useEffect(() => {
    dbDictList()
      .then((rows) => {
        setWords(
          rows.map((r) => ({
            id: String(r.id),
            word: r.word,
            type: r.type as "manual" | "learned",
            createdAt: new Date(r.createdAt),
          }))
        )
      })
      .catch(() => {}) // not in Tauri — keep empty

    dbHistoryList(200)
      .then((rows) => {
        setHistory(
          rows.map((r) => ({
            id: String(r.id),
            rawText: r.rawText,
            editedText: r.editedText,
            editMode: r.editMode as EditMode,
            timestamp: new Date(r.timestamp),
            sourceLanguage: r.sourceLanguage as SourceLanguage,
          }))
        )
      })
      .catch(() => {})
  }, [])

  const handleAddWord = useCallback((word: string) => {
    // Optimistic update + persist to DB
    const tempId = Date.now().toString()
    setWords((prev) => [
      { id: tempId, word, type: "manual", createdAt: new Date() },
      ...prev,
    ])
    dbDictAdd(word, "manual")
      .then((row) => {
        // Replace temp id with real DB id
        setWords((prev) =>
          prev.map((w) => (w.id === tempId ? { ...w, id: String(row.id) } : w))
        )
      })
      .catch(() => {})
  }, [])

  const handleDeleteWord = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id))
    dbDictDelete(Number(id)).catch(() => {})
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
            dictionaryWords={words}
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
