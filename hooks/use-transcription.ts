"use client"

import { useState, useCallback, useRef } from "react"

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

export interface TranscriptionState {
  rawText: string
  editedText: string
  isTranscribing: boolean
  isEditing: boolean
  interimText: string
  editMode: EditMode
  tone: Tone
  customPrompt: string
}

export interface TranscriptionActions {
  startTranscription: () => void
  stopTranscription: () => string
  setEditMode: (mode: EditMode) => void
  setTone: (tone: Tone) => void
  setCustomPrompt: (prompt: string) => void
  processEdit: (text: string) => Promise<string>
  clearTranscript: () => void
  setRawText: (text: string) => void
  setEditedText: (text: string) => void
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
        .replace(/\bdue to the fact that\b/g, "because")
        .replace(/\bat this point in time\b/g, "now")
        .replace(/\bin the event that\b/g, "if")
        .replace(/\bfor the purpose of\b/g, "to")
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

export function useTranscription(): TranscriptionState & TranscriptionActions {
  const [rawText, setRawText] = useState("")
  const [editedText, setEditedText] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [interimText, setInterimText] = useState("")
  const [editMode, setEditMode] = useState<EditMode>("light")
  const [tone, setTone] = useState<Tone>("professional")
  const [customPrompt, setCustomPrompt] = useState("")

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef("")

  const startTranscription = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setIsTranscribing(true)
      finalTranscriptRef.current = ""
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      let final = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      if (final) {
        finalTranscriptRef.current += final
        setRawText(finalTranscriptRef.current)
      }
      setInterimText(interim)
    }

    recognition.onerror = () => {
      setIsTranscribing(false)
    }

    recognition.onend = () => {
      setIsTranscribing(false)
      setInterimText("")
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsTranscribing(false)
    setInterimText("")
    return finalTranscriptRef.current
  }, [])

  const processEdit = useCallback(
    async (text: string): Promise<string> => {
      if (!text.trim()) return text
      if (editMode === "raw") {
        setEditedText(text)
        return text
      }

      setIsEditing(true)

      // Simulate processing delay for realism
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400))

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
    startTranscription,
    stopTranscription,
    setEditMode,
    setTone,
    setCustomPrompt,
    processEdit,
    clearTranscript,
    setRawText,
    setEditedText,
  }
}
