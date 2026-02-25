"use client"

import { useEffect } from "react"
import { initTray } from "@/lib/tray"

export function TrayInit() {
  useEffect(() => {
    initTray()
  }, [])
  return null
}
