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

// Collapse homophones to one canonical form so "their" matches "there" etc.
const HOMOPHONES: Record<string, string> = {
  // there / their / they're
  'their': 'there', "they're": 'there',
  // to / too / two
  'too': 'to', 'two': 'to',
  // your / you're
  "you're": 'your',
  // its / it's
  "it's": 'its',
  // here / hear
  'hear': 'here',
  // know / no
  'know': 'no',
  // new / knew
  'knew': 'new',
  // one / won
  'won': 'one',
  // by / bye / buy
  'bye': 'by', 'buy': 'by',
  // for / four
  'four': 'for',
  // sea / see
  'see': 'sea',
  // be / bee
  'bee': 'be',
  // right / write
  'write': 'right',
  // meet / meat
  'meat': 'meet',
  // week / weak
  'weak': 'week',
  // wear / where
  'where': 'wear',
  // bare / bear
  'bear': 'bare',
  // made / maid
  'maid': 'made',
  // wait / weight
  'weight': 'wait',
  // way / weigh
  'weigh': 'way',
  // which / witch
  'witch': 'which',
  // so / sew
  'sew': 'so',
  // tale / tail
  'tail': 'tale',
  // role / roll
  'roll': 'role',
  // sail / sale
  'sale': 'sail',
  // sun / son
  'son': 'sun',
  // flower / flour
  'flour': 'flower',
  // peace / piece
  'piece': 'peace',
  // pair / pear
  'pear': 'pair',
  // rain / reign
  'reign': 'rain', 'rein': 'rain',
  // plane / plain
  'plain': 'plane',
  // whole / hole
  'hole': 'whole',
  // mail / male
  'male': 'mail',
  // stare / stair
  'stair': 'stare',
  // Erin / Aaron (recognizer often transcribes the name as Aaron)
  'aaron': 'erin',
  // Erin's / errands
  'errands': "erin's",
  // night / knight
  'knight': 'night',
  // not / knot
  'knot': 'not',
  // road / rode
  'rode': 'road',
}

function normalize(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '')
  return HOMOPHONES[clean] ?? clean
}

function tokenize(text: string): WordToken[] {
  return text.split(/\s+/).filter(Boolean).map(text => ({
    text,
    clean: normalize(text),
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
  const [skippedWords, setSkippedWords] = useState<Set<string>>(new Set())
  const [showHint, setShowHint] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const claimingRef = useRef(false)

  // Stable refs for use inside callbacks
  const currentWordIndexRef = useRef(0)
  const isReadingRef = useRef(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  // Active reading time tracking
  // Only counts seconds when speech has been heard within the last 45 s
  const IDLE_THRESHOLD = 25_000
  const activeSecondsRef = useRef(0)
  const lastActivityRef = useRef(0)

  // ── Text-to-speech helper ───────────────────────────────────────────────────
  const speakWord = useCallback((word: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.rate = 0.85
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }, [])

  const paragraphs = useMemo(() => story ? toParagraphs(story.story) : [], [story])
  const words = useMemo(() => paragraphs.flatMap(p => p.words), [paragraphs])

  useEffect(() => { currentWordIndexRef.current = currentWordIndex }, [currentWordIndex])

  // Start active-time counter when reading begins; pause it when idle
  useEffect(() => {
    if (phase !== 'reading') return
    lastActivityRef.current = Date.now()
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current < IDLE_THRESHOLD) {
        activeSecondsRef.current += 1
      }
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Fetch story ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const userId = localStorage.getItem('bookquest_user_id')
    fetch(`/api/story?theme=${themeId}&userId=${userId ?? ''}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setStory(data as StoryData)
        setPhase('ready')
        fetch('/api/story-pool/refill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: themeId }),
        }).catch(() => {})
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

  // ── Hint + audio timers ─────────────────────────────────────────────────────
  const resetHintTimer = useCallback((cancelSpeech = true) => {
    setShowHint(false)
    if (cancelSpeech) window.speechSynthesis?.cancel()
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current)

    // 4 s → show visual hint
    hintTimerRef.current = setTimeout(() => {
      if (!isReadingRef.current) return
      const idx = currentWordIndexRef.current
      setShowHint(true)
      setStumbleWords(prev => {
        const word = words[idx]?.clean
        if (!word) return prev
        const next = new Set(prev)
        next.add(word)
        return next
      })
    }, 4000)

    // 8 s → speak the word aloud (and repeat every 8 s while still stuck)
    const scheduleAudio = (delay: number) => {
      audioTimerRef.current = setTimeout(() => {
        if (!isReadingRef.current) return
        const idx = currentWordIndexRef.current
        const word = words[idx]?.text.replace(/[^a-zA-Z']/g, '')
        if (word) speakWord(word)
        scheduleAudio(8000)  // repeat every 8 s until she says it
      }, delay)
    }
    scheduleAudio(8000)
  }, [words, speakWord])

  // ── Handle a spoken word ────────────────────────────────────────────────────
  const handleSpokenWord = useCallback((spoken: string) => {
    if (!isReadingRef.current) return
    const idx = currentWordIndexRef.current
    if (idx >= words.length) return

    const norm = normalize(spoken)
    const matchIdx = words[idx]?.clean === norm ? idx
      : words[idx + 1]?.clean === norm ? idx + 1
      : -1

    if (matchIdx !== -1) {
      setSpokenIndices(prev => {
        const next = new Set(prev)
        for (let i = idx; i <= matchIdx; i++) next.add(i)
        return next
      })
      const newIdx = matchIdx + 1
      currentWordIndexRef.current = newIdx
      setCurrentWordIndex(newIdx)
      resetHintTimer()
      window.speechSynthesis?.cancel()
      if (newIdx >= words.length) {
        isReadingRef.current = false
        setSpeechEnabled(false)
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
        if (audioTimerRef.current) clearTimeout(audioTimerRef.current)
        setPhase('done')
      }
    }
  }, [words, resetHintTimer])

  const { listening, supported, lastRaw } = useSpeechRecognition(handleSpokenWord, speechEnabled)

  // Any recognised speech (right or wrong) resets the idle clock
  useEffect(() => {
    if (lastRaw && phase === 'reading') {
      lastActivityRef.current = Date.now()
    }
  }, [lastRaw, phase])

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handleStartReading() {
    isReadingRef.current = true
    setSpeechEnabled(true)
    setPhase('reading')
    resetHintTimer()
    // Scroll to first word
    wordRefs.current[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleSkipWord() {
    const idx = currentWordIndexRef.current
    if (idx >= words.length) return

    const word = words[idx]
    setSkippedWords(prev => { const n = new Set(prev); n.add(word.clean); return n })
    setSpokenIndices(prev => { const n = new Set(prev); n.add(idx); return n })

    const newIdx = idx + 1
    currentWordIndexRef.current = newIdx
    setCurrentWordIndex(newIdx)

    // Pause the reading timer — only resume when she actually speaks again
    lastActivityRef.current = 0

    // Speak the skipped word without cancelling it via resetHintTimer
    const display = word.text.replace(/[^a-zA-Z']/g, '')
    resetHintTimer(false) // clear timers but keep speech queue intact
    speakWord(display)    // speakWord cancels any prior utterance then queues this word

    if (newIdx >= words.length) {
      isReadingRef.current = false
      setSpeechEnabled(false)
      setPhase('done')
    }
  }

  function handleEndStory() {
    isReadingRef.current = false
    setSpeechEnabled(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current)
    window.speechSynthesis?.cancel()
    router.push('/')
  }

  function handleBack() {
    isReadingRef.current = false
    setSpeechEnabled(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current)
    window.speechSynthesis?.cancel()
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
    const skippedList = Array.from(skippedWords)

    async function handleClaimRewards() {
      if (claimingRef.current) return
      claimingRef.current = true
      const userId = localStorage.getItem('bookquest_user_id')
      if (!userId) { router.push('/'); return }

      const res = await fetch('/api/complete-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          theme: themeId,
          storyText: story?.story ?? '',
          stumbleWords: stumbleList,
          skippedWords: skippedList,
          vocabWords: story?.vocab.map(v => v.word) ?? [],
          readingSeconds: activeSecondsRef.current,
        }),
      })
      const data = await res.json()

      const params = new URLSearchParams({
        theme: themeId,
        xp: String(data.xpGained ?? 0),
        stars: String(data.starsEarned ?? 1),
        totalXp: String(data.newTotalXp ?? 0),
        xpInLevel: String(data.xpInLevel ?? 0),
        level: String(data.levelAfter ?? 1),
        leveledUp: String(data.leveledUp ?? false),
        badges: (data.newBadges ?? []).join(','),
        stumbles: stumbleList.join(','),
        skips: skippedList.join(','),
        readSecs: String(data.sessionSeconds ?? 0),
        todaySecs: String(data.todaySeconds ?? 0),
        streak: String(data.currentStreak ?? 0),
        coins: String(data.coinsGained ?? 0),
      })
      router.push(`/reward?${params.toString()}`)
    }

    const allDifficult = [...new Set([...stumbleList, ...skippedList])]

    return (
      <div className="flex flex-col bg-parchment min-h-screen">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <div className="text-8xl">🎉</div>
          <div>
            <h2 className="text-4xl font-heading font-bold text-ink">Amazing reading!</h2>
            <p className="text-ink-light font-body mt-1">You finished the whole story!</p>
          </div>

          {allDifficult.length > 0 && (
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 border-2 border-gold/20 text-left">
              <p className="font-heading font-semibold text-ink mb-3 text-center">
                Words to practise 📚
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {allDifficult.map(w => (
                  <span key={w} className="bg-yellow-50 border border-yellow-300 text-yellow-800 font-heading font-semibold px-3 py-1.5 rounded-full text-sm capitalize">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {allDifficult.length === 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl px-6 py-4">
              <p className="text-green-700 font-heading font-semibold">
                🌟 No stumble words — perfect reading!
              </p>
            </div>
          )}

          <button
            onClick={handleClaimRewards}
            disabled={claimingRef.current}
            className="w-full max-w-xs text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform disabled:opacity-60"
            style={{ backgroundColor: theme.color }}
          >
            Claim Rewards! 🏆
          </button>

          <button onClick={() => router.push('/')} className="text-ink-light font-heading text-sm">
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
          <button
            onClick={() => speakWord(words[currentWordIndex].text.replace(/[^a-zA-Z']/g, ''))}
            className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-3 text-center active:scale-95 transition-transform"
          >
            <p className="text-xs text-amber-600 font-heading font-semibold mb-0.5">
              Next word: <span className="ml-1">🔊 tap to hear it</span>
            </p>
            <p className="text-3xl font-heading font-bold text-amber-800">
              {words[currentWordIndex].text.replace(/[^a-zA-Z']/g, '')}
            </p>
          </button>
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
          <div className="flex flex-col gap-2">
            {/* Mic status — full width */}
            <div className="flex items-center gap-2.5 bg-white rounded-2xl px-4 py-3 border border-gold/20">
              <span className={`text-xl ${listening ? 'animate-pulse' : 'opacity-40'}`}>
                {listening ? '🎤' : '🔇'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-semibold text-ink leading-none">
                  {listening ? 'Listening…' : 'Reconnecting…'}
                </p>
                <p className="text-[11px] text-ink-muted font-body mt-0.5 truncate">
                  {lastRaw ? `Heard: "${lastRaw}"` : (supported ? 'Say the yellow word' : 'Use Chrome or Safari')}
                </p>
              </div>
            </div>

            {/* Word skip + end story buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSkipWord}
                className="flex-1 bg-amber-50 border border-amber-300 text-amber-800 font-heading font-semibold text-sm py-3 rounded-2xl active:scale-95 transition-transform"
              >
                🔊 Skip word
              </button>
              <button
                onClick={() => setShowSkipConfirm(true)}
                className="bg-white border border-red-200 text-red-400 font-heading text-sm font-semibold px-4 py-3 rounded-2xl active:scale-95 transition-transform"
              >
                End Story
              </button>
            </div>
          </div>
        )}
      </div>

      {/* End-story confirmation modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-0">
          <div className="bg-white rounded-t-3xl w-full max-w-lg px-6 pt-6 pb-10">
            <div className="text-5xl text-center mb-3">📖</div>
            <h2 className="text-xl font-heading font-bold text-ink text-center mb-2">
              End the story?
            </h2>
            <p className="text-ink-light font-body text-sm text-center mb-6">
              This will stop the story early. It won&apos;t count as completed,
              so you won&apos;t earn any XP, stars, or streak progress.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="w-full text-white font-heading font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform"
                style={{ backgroundColor: theme.color }}
              >
                Keep Reading!
              </button>
              <button
                onClick={handleEndStory}
                className="w-full bg-white border border-red-200 text-red-400 font-heading font-semibold text-base py-4 rounded-2xl active:scale-95 transition-transform"
              >
                Yes, end the story
              </button>
            </div>
          </div>
        </div>
      )}
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
