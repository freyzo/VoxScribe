"use client"

import { useState, useEffect } from "react"
import { HomePage } from "@/components/home-page"
import { AppErrorBoundary } from "@/components/error-boundary"
import type { HistoryEntry } from "@/lib/types"

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sttModel] = useState("whisper-tiny-multilingual")

  useEffect(() => {
    const el = document.getElementById("app-loading")
    if (el) el.style.display = "none"
  }, [])

  return (
    <AppErrorBoundary>
      <main className="h-screen bg-background">
        <HomePage
          history={history}
          setHistory={setHistory}
          sttModel={sttModel}
        />
      </main>
    </AppErrorBoundary>
  )
}
