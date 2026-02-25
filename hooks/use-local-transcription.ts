"use client"

import { useState, useCallback, useRef } from "react"
// Lazy-load transformers only when loadModel/transcribeAudio is used (home uses worker, so main thread never loads this).

export type EditMode = "raw" | "light" | "aggressive"
export type Tone = "casual" | "professional" | "concise"

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

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
  transcribeAudio: (audio: Float32Array) => Promise<string>
  setEditMode: (mode: EditMode) => void
  setTone: (tone: Tone) => void
  setCustomPrompt: (prompt: string) => void
  processEdit: (text: string) => Promise<string>
  clearTranscript: () => void
  setRawText: (text: string) => void
  setEditedText: (text: string) => void
  loadModel: (modelId: string) => Promise<void>
}

const STT_MODEL_IDS: Record<string, string> = {
  "whisper-tiny": "Xenova/whisper-tiny.en",
  "whisper-base": "Xenova/whisper-base.en",
  "whisper-small": "Xenova/whisper-small.en",
  "whisper-medium": "Xenova/whisper-medium.en",
  // Multilingual (no .en) — use for Mandarin/Chinese input
  "whisper-tiny-multilingual": "Xenova/whisper-tiny",
  "whisper-small-multilingual": "Xenova/whisper-small",
}

/** Collapse Whisper repetition/hallucination (e.g. "no, no, no, no" -> "no") */
function collapseRepetition(text: string): string {
  if (!text.trim()) return text
  let out = text.trim()
  // Collapse repeated words (same word 3+ times in a row, with optional commas/spaces)
  out = out.replace(/\b(\w+(?:'\w+)?)(?:\s*,\s*\1\s*|\s+\1\s*){2,}/gi, "$1 ")
  // Collapse repeated phrases (2–4 words repeated)
  out = out.replace(/((?:\b\w+(?:'\w+)?\s*){1,4})(?:\s*,\s*|\s+)(\1\s*){2,}/gi, (_, phrase) => phrase.trim() + " ")
  return out.replace(/\s{2,}/g, " ").trim()
}

function applyLightEdit(text: string): string {
  if (!text.trim()) return text

  // Capitalize first letter of sentences
  let result = text.trim()
  result = result.charAt(0).toUpperCase() + result.slice(1)

  // Fix common speech patterns
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

  // Add period at end if missing
  if (result && !/[.!?]$/.test(result)) {
    result += "."
  }

  // Capitalize after periods
  result = result.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`)

  return result.trim()
}

function applyAggressiveRewrite(text: string, tone: Tone): string {
  let result = applyLightEdit(text)

  // Remove filler phrases
  const fillerPhrases = [
    /\bso basically\b/gi,
    /\bi mean\b/gi,
    /\byou know what I mean\b/gi,
    /\bkind of\b/gi,
    /\bsort of\b/gi,
    /\bto be honest\b/gi,
    /\bhonestly\b/gi,
    /\bliterally\b/gi,
    /\bactually\b/gi,
    /\bI think that\b/gi,
    /\bI feel like\b/gi,
    /\bI guess\b/gi,
    /\band stuff\b/gi,
    /\bor something\b/gi,
    /\bor whatever\b/gi,
    /\byeah so\b/gi,
    /\banyway\b/gi,
    /\banyways\b/gi,
  ]

  for (const filler of fillerPhrases) {
    result = result.replace(filler, "")
  }

  // Clean up whitespace
  result = result.replace(/\s{2,}/g, " ").trim()

  // Tone adjustments
  switch (tone) {
    case "professional":
      result = result
        .replace(/\bgot\b/g, "received")
        .replace(/\bget\b/g, "obtain")
        .replace(/\bbig\b/g, "significant")
        .replace(/\bgood\b/g, "excellent")
        .replace(/\bbad\b/g, "unfavorable")
        .replace(/\bthing\b/g, "matter")
        .replace(/\bthings\b/g, "matters")
        .replace(/\bneed to\b/g, "should")
        .replace(/\bwant to\b/g, "would like to")
        .replace(/\ba lot of\b/g, "numerous")
        .replace(/\bfigure out\b/g, "determine")
      break
    case "concise":
      result = result
        .replace(/\bin order to\b/g, "to")
        .replace(/\bdue to fact that\b/g, "because")
        .replace(/\bat this point in time\b/g, "now")
        .replace(/\bin event that\b/g, "if")
        .replace(/\bfor purpose of\b/g, "to")
        .replace(/\bwith regard to\b/g, "about")
        .replace(/\bin spite of\b/g, "despite")
        .replace(/\bit is important to note that\b/g, "")
        .replace(/\bit should be noted that\b/g, "")
      break
    case "casual":
    default:
      break
  }

  // Recapitalize
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1)
    result = result.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`)
  }

  if (result && !/[.!?]$/.test(result)) {
    result += "."
  }

  return result.replace(/\s{2,}/g, " ").trim()
}

export function useLocalTranscription(modelId: string = "whisper-tiny"): LocalTranscriptionState & LocalTranscriptionActions {
  const [rawText, setRawText] = useState("")
  const [editedText, setEditedText] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [interimText, setInterimText] = useState("")
  const [editMode, setEditMode] = useState<EditMode>("light")
  const [tone, setTone] = useState<Tone>("professional")
  const [customPrompt, setCustomPrompt] = useState("")
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef("")
  const pipelineRef = useRef<((audio: Float32Array, opts: object) => Promise<unknown>) | null>(null)
  const currentModelIdRef = useRef<string>("")

  const loadModel = useCallback(async (modelId: string) => {
    const hfModelId = STT_MODEL_IDS[modelId] ?? STT_MODEL_IDS["whisper-tiny"]
    if (pipelineRef.current && currentModelIdRef.current === modelId) return

    setIsModelLoading(true)
    setModelError(null)

    try {
      const { pipeline } = await import("@huggingface/transformers")
      console.log(`Loading STT model: ${modelId} (${hfModelId})`)
      const pipe = await pipeline("automatic-speech-recognition", hfModelId, {
        progress_callback: (progress: { progress?: number }) => {
          if (progress?.progress != null) console.log("Model load progress:", Math.round(progress.progress * 100), "%")
        },
      })
      pipelineRef.current = pipe as (audio: Float32Array, opts: object) => Promise<unknown>
      currentModelIdRef.current = modelId
      console.log("STT model loaded successfully")
    } catch (error) {
      console.error("Failed to load STT model:", error)
      setModelError(error instanceof Error ? error.message : "Failed to load model")
    } finally {
      setIsModelLoading(false)
    }
  }, [])

  const startTranscription = useCallback(() => {
    setModelError(null)
    setIsTranscribing(true)
    finalTranscriptRef.current = ""
    setInterimText("Listening...")
  }, [])

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsTranscribing(false)
    setInterimText("")
    return ""
  }, [])

  const transcribeAudio = useCallback(
    async (audio: Float32Array): Promise<string> => {
      if (!pipelineRef.current) {
        await loadModel(modelId)
        if (!pipelineRef.current) return ""
      }
      try {
        const result = await pipelineRef.current(audio, { chunk_length_s: 30, stride_length_s: 5 })
        const out = Array.isArray(result) ? result[0] : result
        let text = out?.text != null ? String(out.text).trim() : ""
        // Whisper returns [BLANK_AUDIO] for silent or undetectable speech — treat as empty
        if (text === "[BLANK_AUDIO]" || !text.replace(/\[\s*BLANK_AUDIO\s*\]/i, "").trim()) {
          setModelError("No speech detected. Try speaking again.")
          return ""
        }
        setModelError(null)
        return collapseRepetition(text)
      } catch (error) {
        console.error("Transcription error:", error)
        setModelError(error instanceof Error ? error.message : "Transcription failed")
        return ""
      }
    },
    [modelId, loadModel]
  )

  const processEdit = useCallback(
    async (text: string): Promise<string> => {
      if (!text.trim()) return text
      if (editMode === "raw") {
        setEditedText(text)
        return text
      }

      setIsEditing(true)

      // MVP: no artificial delay — keep latency low until text shows in other apps
      // await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400))

      let result: string
      if (editMode === "light") {
        result = applyLightEdit(text)
      } else {
        result = applyAggressiveRewrite(text, tone)
      }

      setEditedText(result)
      setIsEditing(false)
      return result
    },
    [editMode, tone]
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
    transcribeAudio,
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
