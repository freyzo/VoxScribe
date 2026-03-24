export type SourceLanguage = "en"

export interface HistoryEntry {
  id: string
  rawText: string
  editedText: string
  editMode: string
  timestamp: Date
  sourceLanguage?: SourceLanguage
}
