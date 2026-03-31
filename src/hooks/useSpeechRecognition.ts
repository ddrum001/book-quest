'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export function useSpeechRecognition(
  onWord: (word: string) => void,
  enabled: boolean
) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)

  // Stable refs so callbacks don't go stale
  const onWordRef = useRef(onWord)
  const enabledRef = useRef(enabled)
  const recognitionRef = useRef<any>(null)

  useEffect(() => { onWordRef.current = onWord }, [onWord])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const start = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let lastTranscript = ''

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim()
        if (transcript === lastTranscript) continue
        lastTranscript = transcript

        // Emit each new word individually
        const words = transcript.split(/\s+/).filter(Boolean)
        words.forEach((w: string) => {
          const clean = w.replace(/[^a-z']/g, '')
          if (clean) onWordRef.current(clean)
        })
      }
    }

    recognition.onend = () => {
      setListening(false)
      // Auto-restart unless intentionally stopped
      if (enabledRef.current && recognitionRef.current === recognition) {
        setTimeout(() => {
          if (enabledRef.current && recognitionRef.current === recognition) {
            try { recognition.start() } catch { /* already started */ }
          }
        }, 200)
      }
    }

    recognition.onerror = (event: any) => {
      // no-speech and aborted are normal; log others
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      /* permission denied or already started */
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null  // prevent auto-restart
        try { recognitionRef.current.stop() } catch { /* ignore */ }
        recognitionRef.current = null
      }
      setListening(false)
      return
    }

    start()

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        try { recognitionRef.current.stop() } catch { /* ignore */ }
        recognitionRef.current = null
      }
    }
  }, [enabled, start])

  return { listening, supported }
}
