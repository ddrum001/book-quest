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
  "aaron's": "erin's",
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

// Levenshtein distance — fast, O(n) space
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]++
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1])
      prev = tmp
    }
  }
  return row[b.length]
}

// Lenient match for the CURRENT word: exact > homophone > prefix > fuzzy.
// Skip fuzzy for very short words to avoid false positives ("I" ≠ "in").
function matches(spoken: string, target: string): boolean {
  if (!spoken || !target) return false
  if (spoken === target) return true
  if (spoken.length <= 2 || target.length <= 2) return false
  // Prefix: she said at least the first 4 chars of the target word correctly
  // (covers mumbled/trailed-off endings: "beauti" for "beautiful")
  if (target.length >= 5 && spoken.length >= 4 && target.startsWith(spoken.slice(0, 4))) return true
  // Fuzzy: 1 edit for words up to 6 chars, 2 edits for longer
  return levenshtein(spoken, target) <= (target.length <= 6 ? 1 : 2)
}

// Stricter match for the ONE-WORD lookahead only — no prefix heuristic,
// tighter edit distance. Avoids false advances when a spoken word vaguely
// resembles something two positions ahead.
function matchesStrict(spoken: string, target: string): boolean {
  if (!spoken || !target) return false
  if (spoken === target) return true
  if (spoken.length <= 2 || target.length <= 2) return false
  return levenshtein(spoken, target) <= 1
}

function tokenize(text: string): WordToken[] {
  const tokens: WordToken[] = []
  for (const chunk of text.split(/\s+/).filter(Boolean)) {
    // Split mid-word hyphens ("well-known" → "well-" + "known") so each part
    // is individually speakable. Standalone punctuation like — or - produces
    // an empty clean and is skipped entirely.
    const parts = chunk.split(/(?<=[a-zA-Z])-(?=[a-zA-Z])/)
    parts.forEach((part, i) => {
      // Re-attach hyphen as display suffix on all but the last part
      const display = i < parts.length - 1 ? part + '-' : part
      const clean = normalize(display)
      if (clean) tokens.push({ text: display, clean })
    })
  }
  return tokens
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
  const themeId = searchParams.get('theme') ?? 'minecraft'
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
  const isResume = searchParams.get('resume') === 'true'

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
  const [claiming, setClaiming] = useState(false)
  const [rewardParams, setRewardParams] = useState<string | null>(null)
  const [tooManySkips, setTooManySkips] = useState(false)
  // Synchronous guard — ref updates are immediate unlike setState, so rapid taps
  // all see the true value set by the first tap before any re-render occurs
  const claimingRef = useRef(false)
  // Stable idempotency key for this session — same key every re-render,
  // so even if handleClaimRewards fires twice the DB upsert only creates one row
  const sessionKeyRef = useRef(crypto.randomUUID())

  // Stable refs for use inside callbacks
  const currentWordIndexRef = useRef(0)
  const isReadingRef = useRef(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const didInitialScrollRef = useRef(false)

  // Active reading time tracking
  // Only counts seconds when speech has been heard within the last 45 s
  const IDLE_THRESHOLD = 25_000
  const activeSecondsRef = useRef(0)
  const lastActivityRef = useRef(0)
  const skipCountRef = useRef(0)

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

    if (isResume && userId) {
      const saved = localStorage.getItem(`bookquest_paused_story_${userId}`)
      if (saved) {
        try {
          const paused = JSON.parse(saved)
          sessionKeyRef.current = paused.sessionId
          activeSecondsRef.current = paused.activeSeconds ?? 0
          skipCountRef.current = paused.skipCount ?? 0
          setStory(paused.story)
          const savedIdx = paused.currentWordIndex ?? 0
          setCurrentWordIndex(savedIdx)
          currentWordIndexRef.current = savedIdx
          setStumbleWords(new Set(paused.stumbleWords ?? []))
          setSkippedWords(new Set(paused.skippedWords ?? []))
          setSpokenIndices(new Set(paused.spokenIndices ?? []))
          setPhase('ready')
          return
        } catch { /* fall through to normal fetch */ }
      }
    }

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
  }, [themeId, isResume])

  // ── Auto-scroll current word into view ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading') return
    wordRefs.current[currentWordIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [currentWordIndex, phase])

  // Scroll to saved position when a resumed story first loads in ready phase
  useEffect(() => {
    if (phase === 'ready' && currentWordIndex > 0 && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true
      setTimeout(() => {
        wordRefs.current[currentWordIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }
  }, [phase, currentWordIndex])

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
    const matchIdx =
      matches(norm, words[idx]?.clean ?? '')                        ? idx
      : matchesStrict(norm, words[idx + 1]?.clean ?? '')            ? idx + 1
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
    // Scroll to current word (word 0 on fresh start, saved position on resume)
    wordRefs.current[currentWordIndexRef.current]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleSkipWord() {
    const idx = currentWordIndexRef.current
    if (idx >= words.length) return

    skipCountRef.current += 1
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

  function stopReadingTimers() {
    isReadingRef.current = false
    setSpeechEnabled(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current)
    window.speechSynthesis?.cancel()
  }

  function savePauseState() {
    const userId = localStorage.getItem('bookquest_user_id')
    if (userId && story) {
      localStorage.setItem(`bookquest_paused_story_${userId}`, JSON.stringify({
        sessionId: sessionKeyRef.current,
        themeId,
        story,
        currentWordIndex: currentWordIndexRef.current,
        wordCount: words.length,
        activeSeconds: activeSecondsRef.current,
        skipCount: skipCountRef.current,
        stumbleWords: Array.from(stumbleWords),
        skippedWords: Array.from(skippedWords),
        spokenIndices: Array.from(spokenIndices),
        pausedAt: new Date().toISOString(),
      }))
    }
  }

  function handlePauseStory() {
    stopReadingTimers()
    savePauseState()
    setShowSkipConfirm(false)
    router.push('/')
  }

  function handleEndStory() {
    stopReadingTimers()
    router.push('/')
  }

  function handleBack() {
    stopReadingTimers()
    // Auto-save progress if reading has started, so user can resume later
    if (currentWordIndexRef.current > 0) {
      savePauseState()
    }
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
      setClaiming(true)
      const userId = localStorage.getItem('bookquest_user_id')
      if (!userId) { router.push('/'); return }

      // Clear any paused state — story is now complete
      localStorage.removeItem(`bookquest_paused_story_${userId}`)

      // Store story data so the games page can generate hangman + quiz content
      sessionStorage.setItem('bookquest_game_data', JSON.stringify({
        storyText: story?.story ?? '',
        vocab: story?.vocab ?? [],
      }))

      const res = await fetch('/api/complete-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionKeyRef.current,
          userId,
          theme: themeId,
          storyText: story?.story ?? '',
          stumbleWords: stumbleList,
          skippedWords: skippedList,
          vocabWords: story?.vocab.map(v => v.word) ?? [],
          readingSeconds: activeSecondsRef.current,
          skipCount: skipCountRef.current,
        }),
      })
      const data = await res.json()

      if (data.tooManySkips) {
        setTooManySkips(true)
        setClaiming(false)
        claimingRef.current = false
        return
      }

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
        goalBonus: String(data.dailyGoalBonus ?? 0),
      })
      setRewardParams(params.toString())
      setClaiming(false)
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

          {tooManySkips ? (
            <div className="w-full max-w-sm flex flex-col gap-4 text-center">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl px-6 py-5">
                <p className="text-3xl mb-2">😬</p>
                <p className="text-orange-800 font-heading font-bold text-lg mb-1">
                  Too many words skipped!
                </p>
                <p className="text-orange-700 font-body text-sm">
                  No rewards this time — try reading the words aloud instead of skipping them.
                </p>
              </div>
              <button onClick={() => router.push('/')} className="text-ink-light font-heading text-sm">
                Back to Home
              </button>
            </div>
          ) : !rewardParams ? (
            <button
              onClick={handleClaimRewards}
              disabled={claiming}
              className="w-full max-w-xs text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform disabled:opacity-60"
              style={{ backgroundColor: theme.color }}
            >
              {claiming ? 'Saving…' : 'Claim Rewards! 🏆'}
            </button>
          ) : (
            <div className="w-full max-w-xs flex flex-col gap-3">
              <button
                onClick={() => router.push(`/games?${rewardParams}`)}
                className="w-full text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.color }}
              >
                🎮 Play Games
              </button>
              <button
                onClick={() => router.push(`/reward?${rewardParams}`)}
                className="w-full bg-white border border-gold/30 text-ink font-heading font-semibold text-lg py-4 rounded-3xl active:scale-95 transition-transform"
              >
                See My Rewards →
              </button>
            </div>
          )}

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
            {currentWordIndex > 0 ? '▶️ Continue Reading' : '🎤 Start Reading Aloud'}
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

            {/* Word skip + pause + end story buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSkipWord}
                className="flex-1 bg-amber-50 border border-amber-300 text-amber-800 font-heading font-semibold text-sm py-3 rounded-2xl active:scale-95 transition-transform"
              >
                🔊 Skip
              </button>
              <button
                onClick={handlePauseStory}
                className="flex-1 bg-sky-50 border border-sky-300 text-sky-700 font-heading font-semibold text-sm py-3 rounded-2xl active:scale-95 transition-transform"
              >
                ⏸ Pause
              </button>
              <button
                onClick={() => setShowSkipConfirm(true)}
                className="bg-white border border-red-200 text-red-400 font-heading text-sm font-semibold px-3 py-3 rounded-2xl active:scale-95 transition-transform"
              >
                End
              </button>
            </div>
          </div>
        )}
      </div>

      {/* End-story confirmation modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-0">
          <div className="bg-white rounded-t-3xl w-full max-w-lg px-6 pt-6 pb-10">
            <div className="text-5xl text-center mb-3">🚪</div>
            <h2 className="text-xl font-heading font-bold text-ink text-center mb-2">
              End this story?
            </h2>
            <p className="text-ink-light font-body text-sm text-center mb-6">
              You won&apos;t receive any rewards unless you finish. Use the ⏸ Pause button to save your spot and come back later!
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
                className="w-full bg-white border border-red-200 text-red-400 font-heading font-semibold text-base py-3 rounded-2xl active:scale-95 transition-transform"
              >
                End Story (no rewards)
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
