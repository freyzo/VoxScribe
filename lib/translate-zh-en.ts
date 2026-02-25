"use client"

import { pipeline } from "@huggingface/transformers"

const TRANSLATION_MODEL_ID = "Xenova/nllb-200-distilled-600M"
const SRC_LANG = "zho_Hans" // Chinese (Simplified)
const TGT_LANG = "eng_Latn" // English

let translatorPipeline: Awaited<ReturnType<typeof pipeline>> | null = null

/**
 * Translate Mandarin Chinese text to English using a local NLLB model.
 * Loads the model on first call; subsequent calls reuse it.
 * Only runs in the browser (uses WebAssembly / browser APIs).
 */
export async function translateChineseToEnglish(chineseText: string): Promise<string> {
  const trimmed = chineseText.trim()
  if (!trimmed) return ""

  if (typeof window === "undefined") {
    return trimmed
  }

  if (!translatorPipeline) {
    translatorPipeline = await pipeline("translation", TRANSLATION_MODEL_ID)
  }

  const result = await translatorPipeline(trimmed, {
    src_lang: SRC_LANG,
    tgt_lang: TGT_LANG,
  })

  const output = Array.isArray(result) ? result[0] : result
  const text = output?.translation_text != null ? String(output.translation_text).trim() : ""
  return text || trimmed
}
