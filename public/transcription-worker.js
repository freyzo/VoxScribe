/**
 * Web Worker: runs Whisper ASR and NLLB translation off the main thread
 * so the UI stays responsive (no black screen / freeze).
 * Load from same origin as the app, e.g. /transcription-worker.js
 */
self.onerror = function (ev) {
  const msg = ev?.message || (ev?.filename ? ev.filename + ":" + (ev.lineno ?? "") : "Worker error");
  self.postMessage({ type: "error", message: msg });
  return true;
};

const STT_MODEL_IDS = {
  // Use whisper-tiny for all variants — fastest model, good enough for English
  "whisper-tiny": "Xenova/whisper-tiny",
  "whisper-base": "Xenova/whisper-tiny",
  "whisper-small": "Xenova/whisper-tiny",
  "whisper-medium": "Xenova/whisper-tiny",
  "whisper-tiny-multilingual": "Xenova/whisper-tiny",
  "whisper-small-multilingual": "Xenova/whisper-tiny",
};

function collapseRepetition(text) {
  if (!text || !text.trim()) return text;
  let out = text.trim();
  out = out.replace(/\b(\w+(?:'\w+)?)(?:\s*,\s*\1\s*|\s+\1\s*){2,}/gi, "$1 ");
  out = out.replace(/((?:\b\w+(?:'\w+)?\s*){1,4})(?:\s*,\s*|\s+)(\1\s*){2,}/gi, (_, phrase) => phrase.trim() + " ");
  return out.replace(/\s{2,}/g, " ").trim();
}

let asrPipeline = null;
let asrModelId = null;
let translatePipeline = null;
const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

self.onmessage = async (e) => {
  const { type, modelId, audio, text, forceLanguage } = e.data || {};
  try {
    if (type === "preload") {
      // Load ASR model in background so first dictation doesn't wait on model load.
      let pipeline;
      try {
        const mod = await import(TRANSFORMERS_CDN);
        pipeline = mod.pipeline;
      } catch (importErr) {
        self.postMessage({ type: "preloadDone", ok: false });
        return;
      }
      const hfId = STT_MODEL_IDS[modelId] || STT_MODEL_IDS["whisper-tiny"];
      if (!asrPipeline || asrModelId !== modelId) {
        try {
          asrPipeline = await pipeline("automatic-speech-recognition", hfId);
          asrModelId = modelId;
        } catch (loadErr) {
          self.postMessage({ type: "preloadDone", ok: false });
          return;
        }
      }
      self.postMessage({ type: "preloadDone", ok: true });
      return;
    }
    if (type === "transcribe") {
      let pipeline;
      try {
        const mod = await import(TRANSFORMERS_CDN);
        pipeline = mod.pipeline;
      } catch (importErr) {
        const msg = importErr?.message || String(importErr);
        self.postMessage({
          type: "error",
          message: "Failed to load model (check network): " + msg,
        });
        return;
      }
      const hfId = STT_MODEL_IDS[modelId] || STT_MODEL_IDS["whisper-tiny"];
      if (!asrPipeline || asrModelId !== modelId) {
        try {
          asrPipeline = await pipeline("automatic-speech-recognition", hfId);
          asrModelId = modelId;
        } catch (loadErr) {
          const msg = loadErr?.message || String(loadErr);
          self.postMessage({
            type: "error",
            message: "Failed to load speech model: " + msg,
          });
          return;
        }
      }
      const opts = { chunk_length_s: 10, stride_length_s: 3, language: "english", task: "transcribe" };
      const result = await asrPipeline(audio, opts);
      const out = Array.isArray(result) ? result[0] : result;
      let outText = out?.text != null ? String(out.text).trim() : "";
      // Filter Whisper hallucinations and non-speech annotations
      // Brackets: [BLANK_AUDIO], [speaking in foreign language], etc.
      outText = outText.replace(/\[\s*(?:BLANK_AUDIO|speaking in [\w\s]+)\s*\]/gi, "");
      // Parenthetical sound descriptions: (coughs), (coughing), (sighs), (music), (laughs), (applause), etc.
      outText = outText.replace(/\(\s*[\w\s]+(?:ing|s|ed|tion|ture)?\s*\)\s*\.?\s*/gi, "");
      // Common Whisper junk outputs
      outText = outText.replace(/^\s*(?:you|thank you|thanks for watching|subscribe)\.?\s*$/gi, "");
      outText = outText.trim();
      if (!outText) {
        self.postMessage({ type: "transcribeResult", text: "" });
        return;
      }
      self.postMessage({ type: "transcribeResult", text: collapseRepetition(outText) });
      return;
    }
    if (type === "translate") {
      const trimmed = (text || "").trim();
      if (!trimmed) {
        self.postMessage({ type: "translateResult", text: "" });
        return;
      }
      let pipeline;
      try {
        const mod = await import(TRANSFORMERS_CDN);
        pipeline = mod.pipeline;
      } catch (importErr) {
        const msg = importErr?.message || String(importErr);
        self.postMessage({
          type: "error",
          message: "Failed to load translation model (check network): " + msg,
        });
        return;
      }
      if (!translatePipeline) {
        try {
          translatePipeline = await pipeline("translation", "Xenova/nllb-200-distilled-600M");
        } catch (loadErr) {
          const msg = loadErr?.message || String(loadErr);
          self.postMessage({
            type: "error",
            message: "Failed to load translation model: " + msg,
          });
          return;
        }
      }
      const result = await translatePipeline(trimmed, {
        src_lang: "zho_Hans",
        tgt_lang: "eng_Latn",
      });
      const output = Array.isArray(result) ? result[0] : result;
      const translated = output?.translation_text != null ? String(output.translation_text).trim() : trimmed;
      self.postMessage({ type: "translateResult", text: translated || trimmed });
      return;
    }
    self.postMessage({ type: "error", message: "Unknown message type: " + type });
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message || String(err) });
  }
};
