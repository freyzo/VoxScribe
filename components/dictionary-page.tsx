"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, X, Sparkles, ArrowDownUp, RotateCw } from "lucide-react"

export interface DictionaryWord {
  id: string
  word: string
  type: "manual" | "learned"
  createdAt: Date
}

interface DictionaryPageProps {
  words: DictionaryWord[]
  onAddWord: (word: string) => void
  onDeleteWord: (id: string) => void
}

const sampleChips = [
  "Q3 Roadmap",
  "Whispr -> Wispr",
  "SF MOMA",
  "Figma Jam",
  "Company name",
]

export function DictionaryPage({ words, onAddWord, onDeleteWord }: DictionaryPageProps) {
  const [activeTab, setActiveTab] = useState("all")
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newWord, setNewWord] = useState("")
  const [showAddInput, setShowAddInput] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  const filteredWords = words.filter((w) => {
    if (activeTab === "manual" && w.type !== "manual") return false
    if (activeTab === "learned" && w.type !== "learned") return false
    if (searchQuery && !w.word.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleAddWord = () => {
    const trimmed = newWord.trim()
    if (trimmed && !words.some((w) => w.word.toLowerCase() === trimmed.toLowerCase())) {
      onAddWord(trimmed)
      setNewWord("")
      setShowAddInput(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddWord()
    } else if (e.key === "Escape") {
      setNewWord("")
      setShowAddInput(false)
    }
  }

  return (
    <ScrollArea className="h-full min-h-0 flex-1">
      <div className="mx-auto min-h-full max-w-[860px] px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dictionary
          </h1>
          <Button
            onClick={() => setShowAddInput(true)}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1.5 size-4" />
            Add new
          </Button>
        </div>

        {/* Tabs + actions row */}
        <div className="mt-6 flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto gap-0 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Personal
              </TabsTrigger>
              <TabsTrigger
                value="learned"
                className="rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-1 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Auto-learned
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>
            <button
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Sort"
            >
              <ArrowDownUp className="size-4" />
            </button>
            <button
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Refresh"
            >
              <RotateCw className="size-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mt-3">
            <Input
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border bg-card"
              autoFocus
            />
          </div>
        )}

        {/* Separator line */}
        <div className="mt-0 border-b border-border" />

        {/* Banner */}
        {showBanner && (
          <div className="relative mt-6 rounded-xl border border-border bg-banner p-6">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss banner"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-2xl font-semibold text-banner-foreground text-pretty leading-snug">
              Flow speaks the way you speak.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Flow learns your unique words and names -- automatically or manually.{" "}
              <strong className="text-foreground">
                Add personal terms, company jargon, client names, or industry-specific lingo
              </strong>
              . Share them with your team so everyone stays on the same page.
            </p>

            {/* Sample chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {sampleChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Add new word button inside banner */}
            <div className="mt-4">
              <Button
                onClick={() => setShowAddInput(true)}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Add new word
              </Button>
            </div>
          </div>
        )}

        {/* Add word input */}
        {showAddInput && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Input
              placeholder="Type a new word or phrase..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 border-border bg-background"
              autoFocus
            />
            <Button onClick={handleAddWord} disabled={!newWord.trim()} size="sm">
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewWord("")
                setShowAddInput(false)
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Word list */}
        <div className="mt-4 flex flex-col">
          {filteredWords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No words match your search." : "No words in your dictionary yet."}
              </p>
            </div>
          )}

          {filteredWords.map((word) => (
            <div
              key={word.id}
              className="group flex items-center justify-between border-b border-border px-2 py-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{word.word}</span>
                {word.type === "learned" && (
                  <Sparkles className="size-3.5 text-amber-400" />
                )}
              </div>
              <button
                onClick={() => onDeleteWord(word.id)}
                className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                aria-label={`Delete ${word.word}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
