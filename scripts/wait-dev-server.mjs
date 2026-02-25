#!/usr/bin/env node
/**
 * Start Next dev server and wait until http://localhost:3000 is ready.
 * Used as beforeDevCommand so the Tauri window opens after the app is ready.
 */
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const devUrl = "http://localhost:3000"
const maxWaitMs = 120_000
const pollMs = 800

function waitForUrl() {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = async () => {
      try {
        const r = await fetch(devUrl)
        if (r.ok) return resolve(true)
      } catch (_) {}
      if (Date.now() - start > maxWaitMs) return resolve(false)
      setTimeout(check, pollMs)
    }
    check()
  })
}

const child = spawn("pnpm", ["run", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
})

child.on("error", (err) => {
  console.error("Dev server failed to start:", err)
  process.exit(1)
})

// Wait for server to be ready so Tauri window doesn't open to a blank page
const ready = await waitForUrl()
if (!ready) {
  console.warn("Timed out waiting for", devUrl, "- window may open to a loading state.")
}

// Keep process alive so the dev server stays running; Tauri opens the window when ready
child.on("exit", (code) => process.exit(code ?? 0))
