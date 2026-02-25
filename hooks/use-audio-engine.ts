"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type RecordingState = "idle" | "recording" | "processing" | "transcribing" | "editing"

export interface AudioEngineState {
  recordingState: RecordingState
  audioLevel: number
  audioLevels: number[]
  duration: number
  error: string | null
}

export interface AudioEngineActions {
  startRecording: () => Promise<void>
  stopRecording: () => void
  getAudioData: () => Float32Array | null
  endProcessing: () => void
}

export function useAudioEngine(): AudioEngineState & AudioEngineActions {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [audioLevel, setAudioLevel] = useState(0)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(64).fill(0))
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    // Calculate RMS level
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / dataArray.length)
    setAudioLevel(rms)

    // Extract frequency bands for waveform visualization
    const bands = 64
    const bandSize = Math.floor(dataArray.length / bands)
    const newLevels: number[] = []
    for (let i = 0; i < bands; i++) {
      let bandSum = 0
      for (let j = 0; j < bandSize; j++) {
        bandSum += dataArray[i * bandSize + j]
      }
      newLevels.push((bandSum / bandSize) / 255)
    }
    setAudioLevels(newLevels)

    animationFrameRef.current = requestAnimationFrame(updateLevels)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })

      mediaStreamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      // Use ScriptProcessor for raw audio data capture
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      audioChunksRef.current = []

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        audioChunksRef.current.push(new Float32Array(inputData))
      }

      source.connect(analyser)
      analyser.connect(processor)
      processor.connect(audioContext.destination)

      startTimeRef.current = Date.now()
      setDuration(0)
      setRecordingState("recording")

      // Start level monitoring
      updateLevels()

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access microphone")
      setRecordingState("idle")
    }
  }, [updateLevels])

  const stopRecording = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Disconnect nodes
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setAudioLevel(0)
    setAudioLevels(Array(64).fill(0))
    setRecordingState("processing")
  }, [])

  const getAudioData = useCallback((): Float32Array | null => {
    if (audioChunksRef.current.length === 0) return null

    const totalLength = audioChunksRef.current.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    )
    const result = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of audioChunksRef.current) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    audioChunksRef.current = []
    return result
  }, [])

  const endProcessing = useCallback(() => {
    setRecordingState("idle")
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    recordingState,
    audioLevel,
    audioLevels,
    duration,
    error,
    startRecording,
    stopRecording,
    getAudioData,
    endProcessing,
  }
}
