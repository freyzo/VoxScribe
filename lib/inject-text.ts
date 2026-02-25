"use client"

/**
 * Type the given text into the currently focused app (Notes, Terminal, etc.),
 * like Wispr Flow. When running inside Tauri, uses clipboard + Cmd+V/Ctrl+V and
 * briefly hides our window so the target app gets the paste.
 * In the browser, copies to clipboard so the user can paste manually.
 */
function isTauri(): boolean {
  if (typeof window === "undefined") return false
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  return !!(w.__TAURI__ ?? w.__TAURI_INTERNALS__)
}

let tauriInvokePromise: Promise<typeof import("@tauri-apps/api/core")> | null = null

/** Preload Tauri API so first inject doesn't wait on dynamic import. Call on app load. */
export function preloadTauriInject(): void {
  if (typeof window === "undefined" || !isTauri()) return
  if (!tauriInvokePromise) tauriInvokePromise = import("@tauri-apps/api/core")
}

export async function injectTextIntoActiveApp(text: string): Promise<{ ok: boolean; message?: string }> {
  const trimmed = (text || "").trim()
  if (!trimmed) return { ok: true }

  if (isTauri()) {
    try {
      if (!tauriInvokePromise) tauriInvokePromise = import("@tauri-apps/api/core")
      const { invoke } = await tauriInvokePromise
      await invoke("inject_text", { text: trimmed })
      return { ok: true }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const hint =
        /accessibility|permission|trusted/i.test(raw) || raw.includes("enigo") || raw.includes("clipboard")
          ? " On macOS: add VoxScribe in System Settings → Privacy & Security → Accessibility."
          : ""
      return { ok: false, message: raw + hint }
    }
  }

  try {
    await navigator.clipboard.writeText(trimmed)
    return { ok: true, message: "Copied to clipboard. Paste with Cmd+V (Mac) or Ctrl+V (Windows) where you need it." }
  } catch {
    return {
      ok: false,
      message:
        "Could not copy to clipboard. Use the desktop app (VoxScribe) for typing into other apps like Notes.",
    }
  }
}
