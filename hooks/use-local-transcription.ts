"use client"

import { useState, useCallback, useRef } from "react"

export type EditMode = "raw" | "light" | "aggressive"
export type Tone = "casual" | "professional" | "concise"

export interface LocalTranscriptionState {
  rawText: string
  editedText: string
  isTranscribing: boolean
  isEditing: boolean
  interimText: string
  editMode: EditMode
  tone: Tone
  customPrompt: string
  isModelLoading: boolean
  modelError: string | null
}

export interface LocalTranscriptionActions {
  startTranscription: () => void
  stopTranscription: () => string
  setEditMode: (mode: EditMode) => void
  setTone: (tone: Tone) => void
  setCustomPrompt: (prompt: string) => void
  processEdit: (text: string) => Promise<string>
  clearTranscript: () => void
  setRawText: (text: string) => void
  setEditedText: (text: string) => void
  loadModel: (modelId: string) => Promise<void>
}

function applyLightEdit(text: string): string {
  if (!text.trim()) return text

  let result = text.trim()
  result = result.charAt(0).toUpperCase() + result.slice(1)

  result = result
    .replace(/\s+/g, " ")
    .replace(/\s,/g, ",")
    .replace(/\s\./g, ".")
    .replace(/\bi\b/g, "I")
    .replace(/\bdont\b/g, "don't")
    .replace(/\bcant\b/g, "can't")
    .replace(/\bwont\b/g, "won't")
    .replace(/\bdidnt\b/g, "didn't")
    .replace(/\bisnt\b/g, "isn't")
    .replace(/\barent\b/g, "aren't")
    .replace(/\bwasnt\b/g, "wasn't")
    .replace(/\bwerent\b/g, "weren't")
    .replace(/\bhasnt\b/g, "hasn't")
    .replace(/\bhavent\b/g, "haven't")
    .replace(/\bwouldnt\b/g, "wouldn't")
    .replace(/\bcouldnt\b/g, "couldn't")
    .replace(/\bshouldnt\b/g, "shouldn't")
    .replace(/\bits\b(?!\s)/g, "it's")
    .replace(/\bthats\b/g, "that's")
    .replace(/\bwhats\b/g, "what's")
    .replace(/\btheres\b/g, "there's")
    .replace(/\bheres\b/g, "here's")
    .replace(/\blets\b/g, "let's")
    .replace(/\bim\b/g, "I'm")
    .replace(/\byoure\b/g, "you're")
    .replace(/\btheyre\b/g, "they're")
    .replace(/\bwere\b(?=\s+\w+ing)/g, "we're")
    .replace(/\bum\b/gi, "")
    .replace(/\buh\b/gi, "")
    .replace(/\blike\s+like\b/gi, "like")
    .replace(/\byou know\b/gi, "")
    .replace(/\bbasically\b/gi, "")
    .replace(/\s{2,}/g, " ")

  if (result && !/[.!?]$/.test(result)) {
    result += "."
  }

  result = result.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`)

  return result.trim()
}

export function useLocalTranscription(_modelId: string = "whisper-tiny"): LocalTranscriptionState & LocalTranscriptionActions {
  const [rawText, setRawText] = useState("")
  const [editedText, setEditedText] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [interimText, setInterimText] = useState("")
  const [editMode, setEditMode] = useState<EditMode>("light")
  const [tone, setTone] = useState<Tone>("professional")
  const [customPrompt, setCustomPrompt] = useState("")
  const [isModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  const finalTranscriptRef = useRef("")

  // Model loading is handled by the Web Worker, not the main thread.
  const loadModel = useCallback(async (_modelId: string) => {
    // no-op: worker handles model loading
  }, [])

  const startTranscription = useCallback(() => {
    setModelError(null)
    setIsTranscribing(true)
    finalTranscriptRef.current = ""
    setInterimText("Listening...")
  }, [])

  const stopTranscription = useCallback(() => {
    setIsTranscribing(false)
    setInterimText("")
    return ""
  }, [])

  const processEdit = useCallback(
    async (text: string): Promise<string> => {
      if (!text.trim()) return text
      if (editMode === "raw") {
        setEditedText(text)
        return text
      }

      setIsEditing(true)
      const result = applyLightEdit(text)
      setEditedText(result)
      setIsEditing(false)
      return result
    },
    [editMode]
  )

  const clearTranscript = useCallback(() => {
    setRawText("")
    setEditedText("")
    setInterimText("")
    finalTranscriptRef.current = ""
  }, [])

  return {
    rawText,
    editedText,
    isTranscribing,
    isEditing,
    interimText,
    editMode,
    tone,
    customPrompt,
    isModelLoading,
    modelError,
    startTranscription,
    stopTranscription,
    setEditMode,
    setTone,
    setCustomPrompt,
    processEdit,
    clearTranscript,
    setRawText,
    setEditedText,
    loadModel,
  }
}
