'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { THEMES, type StoryData } from '@/lib/types'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'ready' | 'reading' | 'done'

interface WordToken {
  text: string   // display text (may include punctuation)
  clean: string  // lowercase, punctuation stripped — used for matching
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenize(text: string): WordToken[] {
  return text.split(/\s+/).filter(Boolean).map(text => ({
    text,
    clean: text.toLowerCase().replace(/[^a-z']/g, ''),
  }))
}

// Split story into paragraphs, each with its own word array + global offset
interface Paragraph {
  words: WordToken[]
  offset: number  // index of this paragraph's first word in the global words array
}

function toParagraphs(storyText: string): Paragraph[] {
  let offset = 0
  return storyText.split(/\n\n+/).filter(s => s.trim()).map(para => {
    const words = tokenize(para)
    const p: Paragraph = { words, offset }
    offset += words.length
    return p
  })
}

// ── Main component ────────────────────────────────────────────────────────────

function StoryScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const themeId = searchParams.get('theme') ?? 'dragon-kingdom'
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]

  // Story data
  const [phase, setPhase] = useState<Phase>('loading')
  const [story, setStory] = useState<StoryData | null>(null)
  const [fetchError, setFetchError] = useState('')

  // Karaoke state
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [spokenIndices, setSpokenIndices] = useState<Set<number>>(new Set())
  const [stumbleWords, setStumbleWords] = useState<Set<string>>(new Set())
  const [showHint, setShowHint] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const [lastHeard, setLastHeard] = useState('')

  // Stable refs for use inside callbacks
  const currentWordIndexRef = useRef(0)
  const isReadingRef = useRef(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const paragraphs = useMemo(() => story ? toParagraphs(story.story) : [], [story])
  const words = useMemo(() => paragraphs.flatMap(p => p.words), [paragraphs])

  // Keep hot refs in sync — callbacks read these instead of closing over state
  const wordsRef = useRef<WordToken[]>([])
  useEffect(() => { wordsRef.current = words }, [words])
  useEffect(() => { currentWordIndexRef.current = currentWordIndex }, [currentWordIndex])

  // ── Fetch story ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/story?theme=${themeId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setStory(data as StoryData)
        setPhase('ready')
      })
      .catch(() => setFetchError("Couldn't load the story. Please go back and try again."))
  }, [themeId])

  // ── Auto-scroll current word into view ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading') return
    wordRefs.current[currentWordIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [currentWordIndex, phase])

  // ── 4-second hint timer ─────────────────────────────────────────────────────
  // Stable: reads words via ref so it never needs words in its dep array
  const resetHintTimer = useCallback(() => {
    setShowHint(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      if (!isReadingRef.current) return
      const idx = currentWordIndexRef.current
      setShowHint(true)
      setStumbleWords(prev => {
        const word = wordsRef.current[idx]?.clean
        if (!word) return prev
        const next = new Set(prev)
        next.add(word)
        return next
      })
    }, 4000)
  }, []) // stable — all reads go through refs

  // ── Handle a spoken word ────────────────────────────────────────────────────
  // Stable: reads words via ref so the React Compiler can't over-memoize it
  const handleSpokenWord = useCallback((spoken: string) => {
    if (!isReadingRef.current) return
    const currentWords = wordsRef.current
    const idx = currentWordIndexRef.current
    if (idx >= currentWords.length) return

    setLastHeard(spoken)
    if (currentWords[idx].clean === spoken) {
      setSpokenIndices(prev => {
        const next = new Set(prev)
        next.add(idx)
        return next
      })

      const newIdx = idx + 1
      currentWordIndexRef.current = newIdx
      setCurrentWordIndex(newIdx)
      resetHintTimer()

      if (newIdx >= currentWords.length) {
        isReadingRef.current = false
        setSpeechEnabled(false)
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
        setPhase('done')
      }
    }
  }, [resetHintTimer]) // resetHintTimer is also stable

  const { listening, supported } = useSpeechRecognition(handleSpokenWord, speechEnabled)

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handleStartReading() {
    isReadingRef.current = true
    setSpeechEnabled(true)
    setPhase('reading')
    resetHintTimer()
    // Scroll to first word
    wordRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleSkip() {
    isReadingRef.current = false
    setSpeechEnabled(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    setPhase('done')
  }

  function handleBack() {
    isReadingRef.current = false
    setSpeechEnabled(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    router.back()
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-parchment px-6 gap-4 text-center">
        <div className="text-6xl">😔</div>
        <p className="text-ink font-heading text-xl">{fetchError}</p>
        <button
          onClick={() => router.back()}
          className="bg-gold text-white font-heading font-bold px-8 py-4 rounded-2xl"
        >
          Go Back
        </button>
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-parchment gap-5">
        <div className="text-8xl animate-bounce">{theme.emoji}</div>
        <p className="text-2xl font-heading font-semibold text-ink animate-pulse">
          Writing your story…
        </p>
        <p className="text-ink-muted font-body text-sm">This takes about 10 seconds</p>
      </div>
    )
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const stumbleList = Array.from(stumbleWords)
    return (
      <div className="flex flex-col bg-parchment min-h-screen">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <div className="text-8xl">🎉</div>
          <div>
            <h2 className="text-4xl font-heading font-bold text-ink">Amazing reading!</h2>
            <p className="text-ink-light font-body mt-1">You finished the whole story!</p>
          </div>

          {stumbleList.length > 0 && (
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 border-2 border-gold/20 text-left">
              <p className="font-heading font-semibold text-ink mb-3 text-center">
                Words to practise 📚
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {stumbleList.map(w => (
                  <span
                    key={w}
                    className="bg-yellow-50 border border-yellow-300 text-yellow-800 font-heading font-semibold px-3 py-1.5 rounded-full text-sm capitalize"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {stumbleList.length === 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl px-6 py-4">
              <p className="text-green-700 font-heading font-semibold">
                🌟 No stumble words — perfect reading!
              </p>
            </div>
          )}

          <button
            onClick={() => router.push(`/quiz?theme=${themeId}`)}
            className="w-full max-w-xs text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: theme.color }}
          >
            Take the Quiz! 🎯
          </button>

          <button
            onClick={() => router.push('/')}
            className="text-ink-light font-heading text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // ── Ready + Reading ─────────────────────────────────────────────────────────
  const progressPercent = words.length > 0
    ? Math.round((currentWordIndex / words.length) * 100)
    : 0

  return (
    <div className="flex flex-col bg-parchment min-h-screen max-h-screen">
      {/* Header */}
      <header className="shrink-0 px-6 pt-6 pb-3">
        <button
          onClick={handleBack}
          className="text-ink-light font-heading flex items-center gap-1 mb-3 min-h-0 text-sm"
        >
          ← Back
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{theme.emoji}</span>
            <h1 className="text-lg font-heading font-bold text-ink truncate">{story!.title}</h1>
          </div>
          {phase === 'reading' && (
            <span className="text-sm font-heading text-ink-muted shrink-0">{progressPercent}%</span>
          )}
        </div>

        {/* Progress bar (reading only) */}
        {phase === 'reading' && (
          <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden border border-gold/20">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%`, backgroundColor: theme.color }}
            />
          </div>
        )}
      </header>

      {/* Vocab spotlight (ready phase only) */}
      {phase === 'ready' && (
        <div className="shrink-0 px-6 pb-3">
          <p className="text-[11px] font-heading font-semibold text-ink-muted tracking-widest mb-2">
            SPOTLIGHT WORDS
          </p>
          <div className="flex flex-col gap-2">
            {story!.vocab.map(v => (
              <div
                key={v.word}
                className="bg-white border border-gold/25 rounded-2xl px-4 py-2.5 flex items-baseline gap-2"
              >
                <span className="font-heading font-bold text-gold shrink-0">{v.word}</span>
                <span className="text-ink-light font-body text-sm leading-snug">{v.hint}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Story illustration */}
      {story!.imagePrompt && (
        <div className="shrink-0 px-6 pb-4">
          <img
            src={`https://image.pollinations.ai/prompt/${encodeURIComponent(story!.imagePrompt)}?width=800&height=380&nologo=true`}
            alt="Story illustration"
            className="w-full rounded-3xl object-cover shadow-sm"
            style={{ maxHeight: '220px' }}
          />
        </div>
      )}

      {/* Story text — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {paragraphs.map((para, pi) => (
          <p
            key={pi}
            className="font-body select-none mb-5"
            style={{ fontSize: '19px', lineHeight: 1.9 }}
          >
            {para.words.map((word, wi) => {
              const i = para.offset + wi
              const isSpoken = spokenIndices.has(i)
              const isCurrent = phase === 'reading' && i === currentWordIndex

              let className = 'inline transition-colors duration-200'
              let style: React.CSSProperties = {}

              if (isSpoken) {
                className += ' text-green-600 font-medium'
              } else if (isCurrent) {
                className += ' rounded-sm font-bold'
                style = { backgroundColor: '#FEF08A', color: '#3D2B1F' }
              }

              return (
                <span key={i}>
                  <span
                    ref={el => { wordRefs.current[i] = el }}
                    className={className}
                    style={style}
                  >
                    {word.text}
                  </span>
                  {' '}
                </span>
              )
            })}
          </p>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 px-6 pb-10 pt-3 border-t border-gold/20 flex flex-col gap-3">
        {/* Hint banner */}
        {phase === 'reading' && showHint && words[currentWordIndex] && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-3 text-center">
            <p className="text-xs text-amber-600 font-heading font-semibold mb-0.5">Next word:</p>
            <p className="text-3xl font-heading font-bold text-amber-800">
              {words[currentWordIndex].text.replace(/[^a-zA-Z']/g, '')}
            </p>
          </div>
        )}

        {phase === 'ready' && (
          <button
            onClick={handleStartReading}
            className="w-full text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: theme.color }}
          >
            🎤 Start Reading Aloud
          </button>
        )}

        {phase === 'reading' && (
          <div className="flex gap-3">
            {/* Mic status */}
            <div className="flex-1 flex items-center gap-2.5 bg-white rounded-2xl px-4 py-3 border border-gold/20">
              <span className={`text-xl ${listening ? 'animate-pulse' : 'opacity-40'}`}>
                {listening ? '🎤' : '🔇'}
              </span>
              <div>
                <p className="text-sm font-heading font-semibold text-ink leading-none">
                  {listening ? 'Listening…' : 'Reconnecting…'}
                </p>
                <p className="text-[11px] text-ink-muted font-body mt-0.5">
                  {lastHeard ? `Heard: "${lastHeard}"` : (supported ? 'Say the yellow word' : 'Use Chrome or Safari')}
                </p>
              </div>
            </div>

            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="bg-white border border-gold/30 font-heading text-sm font-semibold text-ink-light px-5 py-3 rounded-2xl active:scale-95 transition-transform"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StoryPage() {
  return (
    <Suspense>
      <StoryScreen />
    </Suspense>
  )
}
