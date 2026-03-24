"use client"

/**
 * Menu bar tray for the desktop app. Creates the tray icon and updates tooltip when recording.
 * Only runs when window.__TAURI__ is defined.
 */

let trayRef: { setTooltip: (t: string) => Promise<void> } | null = null

export function setTrayRecording(recording: boolean): void {
  if (!trayRef) return
  trayRef.setTooltip(recording ? "VoxScribe – Listening…" : "VoxScribe").catch(() => {})
}

export async function initTray(): Promise<void> {
  if (typeof window === "undefined" || !(window as unknown as { __TAURI__?: unknown }).__TAURI__ || trayRef) return
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    const { TrayIcon } = await import("@tauri-apps/api/tray")
    const { Menu } = await import("@tauri-apps/api/menu")
    const { getCurrentWindow } = await import("@tauri-apps/api/window")

    const { emit } = await import("@tauri-apps/api/event")
    const iconPath = await invoke<string>("get_tray_icon_path")
    const menu = await Menu.new({
      items: [
        { id: "dictation", text: "Dictation: hold Ctrl+D to record, release to stop", action: () => emit("start_dictation") },
        { id: "show", text: "Show VoxScribe", action: () => getCurrentWindow().show().then(() => getCurrentWindow().setFocus()) },
        { id: "quit", text: "Quit VoxScribe", action: () => import("@tauri-apps/api/core").then(({ invoke }) => invoke("exit_app")) },
      ],
    })

    const tray = await TrayIcon.new({
      id: "voxscribe",
      icon: iconPath,
      tooltip: "VoxScribe",
      menu,
      showMenuOnLeftClick: false,
    })
    trayRef = { setTooltip: (t) => tray.setTooltip(t) }
  } catch (e) {
    console.warn("Tray init failed (not in Tauri?):", e)
  }
}
