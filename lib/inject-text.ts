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

export function isRunningInTauri(): boolean {
  return isTauri()
}

export async function injectTextIntoActiveApp(text: string): Promise<{ ok: boolean; message?: string }> {
  const trimmed = (text || "").trim()
  if (!trimmed) return { ok: true }

  if (isTauri()) {
    try {
      if (!tauriInvokePromise) tauriInvokePromise = import("@tauri-apps/api/core")
      const { invoke } = await tauriInvokePromise
      await invoke("inject_text", { text: trimmed })
      return { ok: true, message: "Typed into active app" }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const hint =
        /accessibility|permission|trusted/i.test(raw) || raw.includes("enigo") || raw.includes("clipboard")
          ? "\n\nFix: System Settings → Privacy & Security → Accessibility → add VoxScribe"
          : ""
      return { ok: false, message: raw + hint }
    }
  }

  // Not in Tauri — browser fallback
  try {
    await navigator.clipboard.writeText(trimmed)
    return { ok: false, message: "Not running as desktop app. Text copied to clipboard — paste with Cmd+V." }
  } catch {
    return {
      ok: false,
      message: "Not running as desktop app. Build with `pnpm tauri:dev` for auto-typing into other apps.",
    }
  }
}
