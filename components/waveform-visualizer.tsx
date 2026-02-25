"use client"

import { useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface WaveformVisualizerProps {
  levels: number[]
  isRecording: boolean
  className?: string
  variant?: "bars" | "wave"
}

export function WaveformVisualizer({
  levels,
  isRecording,
  className,
  variant = "bars",
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const smoothLevelsRef = useRef<number[]>(Array(64).fill(0))

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    ctx.clearRect(0, 0, width, height)

    // Smooth the levels
    const smoothing = 0.15
    for (let i = 0; i < levels.length; i++) {
      smoothLevelsRef.current[i] =
        smoothLevelsRef.current[i] * (1 - smoothing) + levels[i] * smoothing
    }

    const smoothLevels = smoothLevelsRef.current

    if (variant === "bars") {
      drawBars(ctx, smoothLevels, width, height, isRecording)
    } else {
      drawWave(ctx, smoothLevels, width, height, isRecording)
    }

    animationRef.current = requestAnimationFrame(draw)
  }, [levels, isRecording, variant])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-full w-full", className)}
      aria-label={isRecording ? "Audio waveform - recording active" : "Audio waveform - idle"}
      role="img"
    />
  )
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  levels: number[],
  width: number,
  height: number,
  isRecording: boolean
) {
  const barCount = Math.min(levels.length, 48)
  const gap = 2
  const barWidth = (width - gap * (barCount - 1)) / barCount
  const centerY = height / 2

  for (let i = 0; i < barCount; i++) {
    const level = isRecording ? levels[i] || 0 : 0
    const minBarHeight = 2
    const barHeight = Math.max(minBarHeight, level * height * 0.8)

    const x = i * (barWidth + gap)
    const y = centerY - barHeight / 2

    // Color based on level intensity - warm dark theme colors
    const intensity = Math.min(1, level * 2)
    const r = Math.round(60 + intensity * 20)
    const g = Math.round(50 + intensity * 15)
    const b = Math.round(40 + intensity * 10)
    const alpha = isRecording ? 0.3 + intensity * 0.7 : 0.1

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.beginPath()
    const radius = Math.max(0, Math.min(barWidth / 2, barHeight / 2, 3))
    ctx.roundRect(x, y, barWidth, barHeight, radius)
    ctx.fill()

    // Glow effect for active bars
    if (isRecording && level > 0.3) {
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  levels: number[],
  width: number,
  height: number,
  isRecording: boolean
) {
  const centerY = height / 2
  const points = Math.min(levels.length, 48)

  ctx.beginPath()
  ctx.moveTo(0, centerY)

  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * width
    const level = isRecording ? levels[i] || 0 : 0
    const y = centerY - level * height * 0.35

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      const prevX = ((i - 1) / (points - 1)) * width
      const prevLevel = isRecording ? levels[i - 1] || 0 : 0
      const prevY = centerY - prevLevel * height * 0.35
      const cpX = (prevX + x) / 2
      ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y)
    }
  }

  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, isRecording ? "rgba(60, 50, 40, 0.7)" : "rgba(60, 50, 40, 0.15)")
  gradient.addColorStop(0.5, isRecording ? "rgba(80, 65, 50, 0.8)" : "rgba(80, 65, 50, 0.2)")
  gradient.addColorStop(1, isRecording ? "rgba(60, 50, 40, 0.7)" : "rgba(60, 50, 40, 0.15)")

  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.stroke()

  // Mirror the wave
  ctx.beginPath()
  ctx.moveTo(0, centerY)

  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * width
    const level = isRecording ? levels[i] || 0 : 0
    const y = centerY + level * height * 0.35

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      const prevX = ((i - 1) / (points - 1)) * width
      const prevLevel = isRecording ? levels[i - 1] || 0 : 0
      const prevY = centerY + prevLevel * height * 0.35
      const cpX = (prevX + x) / 2
      ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y)
    }
  }

  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.stroke()
}
