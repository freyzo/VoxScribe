"use client"

/**
 * Runs transcription and translation in a Web Worker so the main thread (UI) stays responsive.
 * Prevents black screen / freeze when processing takes 30+ seconds.
 */

let worker: Worker | null = null

function getWorker(): Worker {
  if (worker) return worker
  const url = "/transcription-worker.js"
  try {
    worker = new Worker(url, { type: "module" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error("Could not load transcription worker: " + msg)
  }
  return worker
}

/**
 * Terminate the worker to free memory. Call this after transcription/translation
 * so the app doesn't crash a few seconds later from memory pressure.
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
  }
}

/**
 * Preload the worker and STT model in the background so first dictation doesn't wait on model load.
 * Call on app/home load. Safe to call multiple times; uses current modelId.
 */
export function preloadWorker(modelId: string, options?: { forceLanguage?: "zh" }): void {
  if (typeof window === "undefined") return
  const w = getWorker()
  w.postMessage({
    type: "preload",
    modelId,
    forceLanguage: options?.forceLanguage,
  })
}

export function transcribeInWorker(
  modelId: string,
  audio: Float32Array,
  options?: { forceLanguage?: "zh" }
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve("")
      return
    }
    const w = getWorker()
    const onMessage = (e: MessageEvent) => {
      const { type, text, message } = e.data || {}
      if (type === "transcribeResult") {
        w.removeEventListener("message", onMessage)
        w.removeEventListener("error", onError)
        resolve(text != null ? String(text) : "")
      } else if (type === "error") {
        w.removeEventListener("message", onMessage)
        w.removeEventListener("error", onError)
        reject(new Error(message || "Transcription failed"))
      }
    }
    const onError = (ev: ErrorEvent) => {
      w.removeEventListener("message", onMessage)
      w.removeEventListener("error", onError)
      const detail =
        ev?.message || (ev?.filename ? `${ev.filename}:${ev.lineno ?? ""}` : "")
      reject(
        new Error(
          detail
            ? `Transcription worker failed: ${detail}`
            : "Transcription worker failed. Check the console or try again."
        )
      )
    }
    w.addEventListener("message", onMessage)
    w.addEventListener("error", onError)
    w.postMessage(
      { type: "transcribe", modelId, audio, forceLanguage: options?.forceLanguage },
      [audio.buffer]
    )
  })
}

export function translateInWorker(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve(text)
      return
    }
    const trimmed = (text || "").trim()
    if (!trimmed) {
      resolve("")
      return
    }
    const w = getWorker()
    const onMessage = (e: MessageEvent) => {
      const { type, text: result, message } = e.data || {}
      if (type === "translateResult") {
        w.removeEventListener("message", onMessage)
        w.removeEventListener("error", onError)
        resolve(result != null ? String(result) : trimmed)
      } else if (type === "error") {
        w.removeEventListener("message", onMessage)
        w.removeEventListener("error", onError)
        reject(new Error(message || "Translation failed"))
      }
    }
    const onError = (ev: ErrorEvent) => {
      w.removeEventListener("message", onMessage)
      w.removeEventListener("error", onError)
      const detail =
        ev?.message || (ev?.filename ? `${ev.filename}:${ev.lineno ?? ""}` : "")
      reject(
        new Error(
          detail
            ? `Translation worker failed: ${detail}`
            : "Translation worker failed. Check the console or try again."
        )
      )
    }
    w.addEventListener("message", onMessage)
    w.addEventListener("error", onError)
    w.postMessage({ type: "translate", text: trimmed })
  })
}
