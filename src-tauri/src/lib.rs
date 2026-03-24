mod db;

use std::path::PathBuf;
use std::thread;
use std::time::Duration;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[tauri::command]
fn get_tray_icon_path(app: tauri::AppHandle) -> Result<String, String> {
  let path = app
    .path()
    .resource_dir()
    .map(|d: PathBuf| d.join("icons").join("32x32.png"))
    .ok()
    .filter(|p: &PathBuf| p.exists())
    .or_else(|| {
      let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("icons").join("32x32.png");
      dev_path.exists().then_some(dev_path)
    })
    .ok_or_else(|| "Tray icon not found".to_string())?;
  Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn exit_app() {
  std::process::exit(0);
}

/// Paste the given text into the currently focused app (Notes, Terminal, etc.)
/// by copying to clipboard and simulating Cmd+V (Mac) or Ctrl+V (Win/Linux).
/// Hides our window before pasting so the target app (e.g. Notes) gets the paste, then shows again.
#[tauri::command]
fn inject_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
  use enigo::{Direction, Enigo, Key, Keyboard, Settings};
  if text.is_empty() {
    return Ok(());
  }
  let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
  let saved = clipboard.get_text().ok();
  clipboard.set_text(text.clone()).map_err(|e| e.to_string())?;
  thread::sleep(Duration::from_millis(5));

  // Hide our window so the app that had focus (e.g. Notes) gets it back and receives the paste.
  let main = app
    .get_webview_window("main")
    .or_else(|| app.webview_windows().into_keys().next().and_then(|k| app.get_webview_window(&k)));
  let was_visible = main.as_ref().and_then(|w| w.is_visible().ok()).unwrap_or(false);
  if let Some(ref win) = main {
    let _ = win.hide();
    thread::sleep(Duration::from_millis(15));
  }

  let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
  #[cfg(target_os = "macos")]
  let modifier = Key::Meta;
  #[cfg(not(target_os = "macos"))]
  let modifier = Key::Control;

  // Tight delays — just enough for macOS to register keystrokes (enigo#201)
  enigo.key(modifier, Direction::Press).map_err(|e| e.to_string())?;
  thread::sleep(Duration::from_millis(10));
  enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
  thread::sleep(Duration::from_millis(5));
  enigo.key(modifier, Direction::Release).map_err(|e| e.to_string())?;
  thread::sleep(Duration::from_millis(10));
  if let Some(restore) = saved {
    let _ = clipboard.set_text(restore);
  }

  // Re-show after a short delay so the paste lands in the target app
  if was_visible {
    if let Some(ref win) = main {
      thread::sleep(Duration::from_millis(50));
      let _ = win.show();
    }
  }
  Ok(())
}

// --- Dictionary commands ---
#[tauri::command]
fn dict_list(app: tauri::AppHandle) -> Result<Vec<db::DictionaryWord>, String> {
  let db = app.state::<db::Db>();
  db.list_words()
}

#[tauri::command]
fn dict_add(app: tauri::AppHandle, word: String, word_type: Option<String>) -> Result<db::DictionaryWord, String> {
  let db = app.state::<db::Db>();
  db.add_word(&word, word_type.as_deref().unwrap_or("manual"))
}

#[tauri::command]
fn dict_delete(app: tauri::AppHandle, id: i64) -> Result<(), String> {
  let db = app.state::<db::Db>();
  db.delete_word(id)
}

// --- History commands ---
#[tauri::command]
fn history_list(app: tauri::AppHandle, limit: Option<i64>) -> Result<Vec<db::HistoryEntry>, String> {
  let db = app.state::<db::Db>();
  db.list_history(limit.unwrap_or(200))
}

#[tauri::command]
fn history_add(app: tauri::AppHandle, raw_text: String, edited_text: String, edit_mode: String, source_language: Option<String>) -> Result<db::HistoryEntry, String> {
  let db = app.state::<db::Db>();
  db.add_history(&raw_text, &edited_text, &edit_mode, source_language.as_deref().unwrap_or("en"))
}

#[tauri::command]
fn history_delete(app: tauri::AppHandle, id: i64) -> Result<(), String> {
  let db = app.state::<db::Db>();
  db.delete_history(id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      get_tray_icon_path, exit_app, inject_text,
      dict_list, dict_add, dict_delete,
      history_list, history_add, history_delete,
    ])
    .setup(|app| {
      // macOS: run as "accessory" so we don't steal focus when the user presses the global hotkey
      #[cfg(target_os = "macos")]
      let _ = app.handle().set_activation_policy(tauri::ActivationPolicy::Accessory);

      // Initialize SQLite database
      let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
      let database = db::Db::open(app_data).map_err(|e| e.to_string())?;
      app.manage(database);
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // --- Menu bar tray icon (created from JS in lib/tray.ts) ---
      // Rust setup only handles global shortcut; tray is initialized from frontend
      // to avoid Tauri version API mismatches.

      let handle = app.handle().clone();
      app.global_shortcut().on_shortcut("Control+D", move |_app, _shortcut, event| {
        match event.state {
          tauri_plugin_global_shortcut::ShortcutState::Pressed => {
            let _ = handle.emit("start_dictation", ());
          }
          tauri_plugin_global_shortcut::ShortcutState::Released => {
            let _ = handle.emit("stop_dictation", ());
          }
        }
      })?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
