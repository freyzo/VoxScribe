"use client"

/**
 * TypeScript bridge to the SQLite database via Tauri commands.
 * Falls back to in-memory storage when not running in Tauri.
 */

function isTauri(): boolean {
  if (typeof window === "undefined") return false
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  return !!(w.__TAURI__ ?? w.__TAURI_INTERNALS__)
}

let invokePromise: Promise<typeof import("@tauri-apps/api/core")> | null = null
async function getInvoke() {
  if (!invokePromise) invokePromise = import("@tauri-apps/api/core")
  return (await invokePromise).invoke
}

// --- Dictionary types ---
export interface DbDictionaryWord {
  id: number
  word: string
  type: string // "manual" | "learned"
  createdAt: string
}

// --- History types ---
export interface DbHistoryEntry {
  id: number
  rawText: string
  editedText: string
  editMode: string
  timestamp: string
  sourceLanguage: string
}

// --- Dictionary API ---
export async function dbDictList(): Promise<DbDictionaryWord[]> {
  if (!isTauri()) return []
  const invoke = await getInvoke()
  return invoke("dict_list")
}

export async function dbDictAdd(word: string, wordType: string = "manual"): Promise<DbDictionaryWord> {
  const invoke = await getInvoke()
  return invoke("dict_add", { word, wordType })
}

export async function dbDictDelete(id: number): Promise<void> {
  const invoke = await getInvoke()
  return invoke("dict_delete", { id })
}

// --- History API ---
export async function dbHistoryList(limit: number = 200): Promise<DbHistoryEntry[]> {
  if (!isTauri()) return []
  const invoke = await getInvoke()
  return invoke("history_list", { limit })
}

export async function dbHistoryAdd(
  rawText: string,
  editedText: string,
  editMode: string,
  sourceLanguage: string = "en"
): Promise<DbHistoryEntry> {
  const invoke = await getInvoke()
  return invoke("history_add", { rawText, editedText, editMode, sourceLanguage })
}

export async function dbHistoryDelete(id: number): Promise<void> {
  const invoke = await getInvoke()
  return invoke("history_delete", { id })
}
