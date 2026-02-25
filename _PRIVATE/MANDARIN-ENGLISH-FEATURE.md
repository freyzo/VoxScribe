# Mandarin → English Dictation Feature

## Goal
Let you speak in **Mandarin Chinese** and get:
1. **Raw transcription** in Chinese (what you said)
2. **English translation** (so you can use it at work and in English-only apps)

Both are shown in the app and saved in history, so you can copy either the Chinese or the English.

## How It Works

1. **Input language**
   - You choose: "English only" or "Mandarin → English".
   - When "Mandarin → English" is on, the app treats your speech as Mandarin.

2. **Speech-to-text (STT)**
   - **English mode**: Uses existing English Whisper models (e.g. `whisper-tiny.en`).
   - **Mandarin mode**: Uses a **multilingual** Whisper model (e.g. `Xenova/whisper-small` or `whisper-tiny` without `.en`) so it can transcribe Chinese.

3. **Translation (Mandarin → English only)**
   - When Mandarin mode is on, after we get the Chinese text we run a **local translation** step: Chinese → English.
   - Options (all local, no cloud):
     - **Option A**: Use the same Hugging Face Transformers.js pipeline with a small translation model (e.g. OPUS or a small seq2seq model) in the browser.
     - **Option B**: Use a Tauri/Rust backend that calls a local translation model (e.g. via llama.cpp / Ollama with a translate prompt).
   - For the first version we use **Option A** with a small browser-based translation model so everything stays in the frontend and offline.

4. **What gets shown and saved**
   - **Raw**: Chinese text (from Whisper).
   - **Edited**: Either:
     - Same as today (light/aggressive edit) but applied to the **English** translation, or
     - Just the English translation if edit mode is "Raw".
   - So in history we store:
     - `rawText`: Chinese (original)
     - `editedText`: English (translated, and optionally edited)
   - UI shows both: e.g. "今天的天气怎么样" and "How's the weather today?" so you see Chinese + English.

5. **Copy / type-out**
   - You can copy either the Chinese or the English from the UI.
   - "Type into app" (if we add it later) would use the English text by default so it works in English-only fields.

## Data Model Change

- **HistoryEntry** (and any "current session" state) gets:
  - `rawText`: string (Chinese in Mandarin mode, English in English mode)
  - `editedText`: string (English in both modes; in Mandarin mode it’s the translated + optionally edited text)
  - `sourceLanguage`: `"en"` | `"zh"` (optional, for display and future use)

So for Mandarin:
- `rawText` = Chinese
- `editedText` = English (translation + edit)
- We **log and show both** in the UI (e.g. Chinese on one line, English below or next to it).

## UI

- **Settings / Style**: Add a control "Dictation language" or "Input language": **English** | **Mandarin (中文) → English**.
- **Home / transcript**:
  - When last dictation was Mandarin: show two lines (or two blocks):
    - "原文 / Original: …" (Chinese)
    - "English: …" (translated/edited)
  - When English: keep current single-line behavior.
- **History**: Each entry can show both Chinese and English when `sourceLanguage === "zh"`; otherwise only one line.

## Implementation Order

1. Add **input language** state and UI (English vs Mandarin → English).
2. Add **multilingual Whisper** model option (e.g. `whisper-small` without `.en`) and load it when Mandarin is selected.
3. Add **translate step**: Chinese → English using a local model (browser-first with Transformers.js translation model).
4. Extend **HistoryEntry** with `sourceLanguage` and ensure `rawText`/`editedText` store Chinese and English as above.
5. Update **Home** and **History** UI to show both Chinese and English when the entry is Mandarin.

No cloud APIs; everything stays local and privacy-first.
