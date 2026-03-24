use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryWord {
  pub id: i64,
  pub word: String,
  #[serde(rename = "type")]
  pub word_type: String,
  #[serde(rename = "createdAt")]
  pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
  pub id: i64,
  #[serde(rename = "rawText")]
  pub raw_text: String,
  #[serde(rename = "editedText")]
  pub edited_text: String,
  #[serde(rename = "editMode")]
  pub edit_mode: String,
  pub timestamp: String,
  #[serde(rename = "sourceLanguage")]
  pub source_language: String,
}

pub struct Db {
  conn: Mutex<Connection>,
}

impl Db {
  pub fn open(app_data_dir: PathBuf) -> Result<Self, String> {
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("voxscribe.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
      "CREATE TABLE IF NOT EXISTS dictionary (
         id         INTEGER PRIMARY KEY AUTOINCREMENT,
         word       TEXT NOT NULL UNIQUE,
         word_type  TEXT NOT NULL DEFAULT 'manual',
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       );
       CREATE TABLE IF NOT EXISTS history (
         id              INTEGER PRIMARY KEY AUTOINCREMENT,
         raw_text        TEXT NOT NULL,
         edited_text     TEXT NOT NULL DEFAULT '',
         edit_mode       TEXT NOT NULL DEFAULT 'light',
         timestamp       TEXT NOT NULL DEFAULT (datetime('now')),
         source_language TEXT NOT NULL DEFAULT 'en'
       );"
    ).map_err(|e| e.to_string())?;

    Ok(Db { conn: Mutex::new(conn) })
  }

  // --- Dictionary ---
  pub fn list_words(&self) -> Result<Vec<DictionaryWord>, String> {
    let conn = self.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
      .prepare("SELECT id, word, word_type, created_at FROM dictionary ORDER BY id DESC")
      .map_err(|e| e.to_string())?;
    let rows = stmt
      .query_map([], |row| {
        Ok(DictionaryWord {
          id: row.get(0)?,
          word: row.get(1)?,
          word_type: row.get(2)?,
          created_at: row.get(3)?,
        })
      })
      .map_err(|e| e.to_string())?;
    let mut words = Vec::new();
    for row in rows {
      words.push(row.map_err(|e| e.to_string())?);
    }
    Ok(words)
  }

  pub fn add_word(&self, word: &str, word_type: &str) -> Result<DictionaryWord, String> {
    let conn = self.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
      "INSERT OR IGNORE INTO dictionary (word, word_type) VALUES (?1, ?2)",
      params![word, word_type],
    ).map_err(|e| e.to_string())?;
    let mut stmt = conn
      .prepare("SELECT id, word, word_type, created_at FROM dictionary WHERE word = ?1")
      .map_err(|e| e.to_string())?;
    stmt.query_row(params![word], |row| {
      Ok(DictionaryWord {
        id: row.get(0)?,
        word: row.get(1)?,
        word_type: row.get(2)?,
        created_at: row.get(3)?,
      })
    }).map_err(|e| e.to_string())
  }

  pub fn delete_word(&self, id: i64) -> Result<(), String> {
    let conn = self.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM dictionary WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
  }

  // --- History ---
  pub fn list_history(&self, limit: i64) -> Result<Vec<HistoryEntry>, String> {
    let conn = self.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
      .prepare("SELECT id, raw_text, edited_text, edit_mode, timestamp, source_language FROM history ORDER BY id DESC LIMIT ?1")
      .map_err(|e| e.to_string())?;
    let rows = stmt
      .query_map(params![limit], |row| {
        Ok(HistoryEntry {
          id: row.get(0)?,
          raw_text: row.get(1)?,
          edited_text: row.get(2)?,
          edit_mode: row.get(3)?,
          timestamp: row.get(4)?,
          source_language: row.get(5)?,
        })
      })
      .map_err(|e| e.to_string())?;
    let mut entries = Vec::new();
    for row in rows {
      entries.push(row.map_err(|e| e.to_string())?);
    }
    Ok(entries)
  }

  pub fn add_history(&self, raw_text: &str, edited_text: &str, edit_mode: &str, source_language: &str) -> Result<HistoryEntry, String> {
    let conn = self.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
      "INSERT INTO history (raw_text, edited_text, edit_mode, source_language) VALUES (?1, ?2, ?3, ?4)",
      params![raw_text, edited_text, edit_mode, source_language],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn
      .prepare("SELECT id, raw_text, edited_text, edit_mode, timestamp, source_language FROM history WHERE id = ?1")
      .map_err(|e| e.to_string())?;
    stmt.query_row(params![id], |row| {
      Ok(HistoryEntry {
        id: row.get(0)?,
        raw_text: row.get(1)?,
        edited_text: row.get(2)?,
        edit_mode: row.get(3)?,
        timestamp: row.get(4)?,
        source_language: row.get(5)?,
      })
    }).map_err(|e| e.to_string())
  }

  pub fn delete_history(&self, id: i64) -> Result<(), String> {
    let conn = self.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM history WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
  }
}
