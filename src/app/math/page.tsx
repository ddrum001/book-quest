'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getXpInCurrentLevel, XP_PER_LEVEL, BADGE_INFO, type BadgeId } from '@/lib/types'

// ── Facts & helpers ────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// All unique products in the 2–9 × 2–9 range, sorted ascending
const ALL_PRODUCTS = Array.from(new Set(
  Array.from({ length: 8 }, (_, i) => i + 2).flatMap(a =>
    Array.from({ length: 8 }, (_, j) => j + 2).map(b => a * b)
  )
)).sort((a, b) => a - b)

function getOptions(correct: number): number[] {
  const others = ALL_PRODUCTS.filter(p => p !== correct)
  others.sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct))
  return shuffle([correct, ...others.slice(0, 3)])
}

const TOTAL = 10

function starsForScore(score: number): number {
  if (score === TOTAL) return 3
  if (score >= 8) return 2
  if (score >= 5) return 1
  return 0
}

function generateQuestions() {
  const facts: { factorA: number; factorB: number; answer: number }[] = []
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      facts.push({ factorA: a, factorB: b, answer: a * b })
    }
  }
  return shuffle(facts).slice(0, TOTAL).map(q => ({
    ...q,
    options: getOptions(q.answer),
  }))
}

// Normalize spoken homophones before number parsing
const NUMBER_HOMOPHONES: Record<string, string> = {
  'ate': 'eight',
  'to': 'two', 'too': 'two',
  'for': 'four',
  'won': 'one',
  'free': 'three',
  'nein': 'nine',
  'tin': 'ten',
  'fort': 'forty',
}

// Parse a raw speech transcript like "fifty six", "56", or "eighty" into an integer
function parseSpokenNumber(raw: string): number | null {
  const ONES: Record<string, number> = {
    'zero': 0, 'oh': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  }
  const TENS: Record<string, number> = {
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  }
  // Normalize homophones word by word before parsing
  const text = raw.toLowerCase().replace(/-/g, ' ').trim()
    .split(/\s+/).map(w => NUMBER_HOMOPHONES[w] ?? w).join(' ')
  // Direct digit string: "56"
  const direct = parseInt(text)
  if (!isNaN(direct) && direct >= 0) return direct
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    if (ONES[parts[0]] !== undefined) return ONES[parts[0]]
    if (TENS[parts[0]] !== undefined) return TENS[parts[0]]
    return null
  }
  if (parts.length === 2) {
    const t = TENS[parts[0]], o = ONES[parts[1]]
    if (t !== undefined && o !== undefined) return t + o
  }
  return null
}

// ── Types ──────────────────────────────────────────────────────────────────────

type GameMode = 'practice' | 'challenge'
type Phase = 'select' | 'playing' | 'summary' | 'claimed'

interface Question { factorA: number; factorB: number; answer: number; options: number[] }
interface Reward {
  xpGained: number; coinsGained: number; starsEarned: number
  newBadges: BadgeId[]; newTotalXp: number; xpInLevel: number
  levelAfter: number; leveledUp: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MathPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [hasCompletedPractice, setHasCompletedPractice] = useState(false)
  const [mode, setMode] = useState<GameMode>('practice')
  const [phase, setPhase] = useState<Phase>('select')

  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState<boolean[]>([])

  // Practice state
  const [practiceSelected, setPracticeSelected] = useState<number | null>(null)
  const [practiceFeedback, setPracticeFeedback] = useState<'correct' | 'wrong' | null>(null)

  // Challenge state
  const [inputValue, setInputValue] = useState('')
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const [listening, setListening] = useState(false)
  const [challengeFeedback, setChallengeFeedback] = useState<'correct' | 'wrong' | null>(null)

  // Reward
  const [reward, setReward] = useState<Reward | null>(null)
  const [claiming, setClaiming] = useState(false)

  // Stable refs so callbacks stay current without re-creating
  const questionsRef = useRef<Question[]>([])
  const currentRef = useRef(0)
  const resultsRef = useRef<boolean[]>([])
  const challengeFeedbackRef = useRef<'correct' | 'wrong' | null>(null)
  const speechEnabledRef = useRef(false)
  const submitChallengeRef = useRef<((n: number) => void) | null>(null)

  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => { resultsRef.current = results }, [results])
  useEffect(() => { challengeFeedbackRef.current = challengeFeedback }, [challengeFeedback])
  useEffect(() => { speechEnabledRef.current = speechEnabled }, [speechEnabled])

  useEffect(() => {
    const id = localStorage.getItem('bookquest_user_id')
    if (!id) { router.push('/'); return }
    setUserId(id)
    const practiced = !!localStorage.getItem('math_facts_practiced')
    setHasCompletedPractice(practiced)
    if (!practiced) {
      // First time — skip the mode selector and go straight into practice
      beginGame('practice')
    }
    // If practiced before, phase stays 'select' and the mode picker renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  function beginGame(gameMode: GameMode) {
    const qs = generateQuestions()
    setQuestions(qs)
    questionsRef.current = qs
    setMode(gameMode)
    setCurrent(0)
    currentRef.current = 0
    setResults([])
    resultsRef.current = []
    setPracticeSelected(null)
    setPracticeFeedback(null)
    setInputValue('')
    setChallengeFeedback(null)
    challengeFeedbackRef.current = null
    if (gameMode === 'challenge') setSpeechEnabled(true)
    else setSpeechEnabled(false)
    setPhase('playing')
  }

  // ── Practice: tap a choice ────────────────────────────────────────────────────
  const handlePracticeAnswer = useCallback((option: number) => {
    if (practiceFeedback !== null || practiceSelected !== null) return
    const isCorrect = option === questionsRef.current[currentRef.current]?.answer
    setPracticeSelected(option)
    setPracticeFeedback(isCorrect ? 'correct' : 'wrong')
    const newResults = [...resultsRef.current, isCorrect]
    setTimeout(() => {
      setPracticeSelected(null)
      setPracticeFeedback(null)
      setResults(newResults)
      resultsRef.current = newResults
      const nextIdx = currentRef.current + 1
      if (nextIdx >= TOTAL) {
        setPhase('summary')
      } else {
        setCurrent(nextIdx)
        currentRef.current = nextIdx
      }
    }, 1200)
  }, [practiceFeedback, practiceSelected])

  // ── Challenge: submit a numeric answer (shared by speech + button) ────────────
  const submitChallenge = useCallback((answer: number) => {
    if (challengeFeedbackRef.current !== null) return
    const idx = currentRef.current
    const q = questionsRef.current[idx]
    if (!q) return
    const isCorrect = answer === q.answer
    setInputValue(String(answer))
    setChallengeFeedback(isCorrect ? 'correct' : 'wrong')
    challengeFeedbackRef.current = isCorrect ? 'correct' : 'wrong'
    setSpeechEnabled(false)
    const newResults = [...resultsRef.current, isCorrect]
    setTimeout(() => {
      setChallengeFeedback(null)
      challengeFeedbackRef.current = null
      setInputValue('')
      setResults(newResults)
      resultsRef.current = newResults
      const nextIdx = idx + 1
      if (nextIdx >= TOTAL) {
        setPhase('summary')
      } else {
        setCurrent(nextIdx)
        currentRef.current = nextIdx
        setSpeechEnabled(true)
      }
    }, 1200)
  }, [])

  // Keep submitChallengeRef current so the speech effect can call it without restarts
  useEffect(() => { submitChallengeRef.current = submitChallenge }, [submitChallenge])

  // ── Inline speech recognition for numbers ─────────────────────────────────────
  // We can't use useSpeechRecognition here because it strips digits before emitting.
  // Instead we read the raw final transcript and parse it as a number directly.
  useEffect(() => {
    const SpeechAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!speechEnabled || !SpeechAPI) {
      setListening(false)
      return
    }

    const recognition = new SpeechAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setListening(true)
    recognition.onend = () => {
      setListening(false)
      // Auto-restart while still active
      if (speechEnabledRef.current) {
        setTimeout(() => {
          if (speechEnabledRef.current) {
            try { recognition.start() } catch { /* already started */ }
          }
        }, 200)
      }
    }
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('Math speech error:', e.error)
      }
    }
    recognition.onresult = (event: any) => {
      if (challengeFeedbackRef.current !== null) return
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim()
        const isFinal = event.results[i].isFinal as boolean
        const n = parseSpokenNumber(transcript)
        if (n === null) continue
        // Submit immediately if the interim already matches this question's answer
        // (no false-positive risk — wrong partials won't equal the correct answer),
        // or on any final result containing a valid number.
        const currentAnswer = questionsRef.current[currentRef.current]?.answer
        if (isFinal || n === currentAnswer) {
          submitChallengeRef.current?.(n)
          return
        }
      }
    }

    try { recognition.start() } catch { /* permission denied */ }

    return () => {
      recognition.onend = null
      try { recognition.stop() } catch { /* ignore */ }
    }
  }, [speechEnabled])

  // ── Claim reward ──────────────────────────────────────────────────────────────
  async function claimReward() {
    if (!userId || claiming) return
    setClaiming(true)
    const score = results.filter(Boolean).length
    if (mode === 'practice') {
      localStorage.setItem('math_facts_practiced', '1')
      setHasCompletedPractice(true)
    }
    const res = await fetch('/api/complete-math', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, score, total: TOTAL }),
    })
    setReward(await res.json())
    setSpeechEnabled(false)
    setPhase('claimed')
    setClaiming(false)
  }

  const score = results.filter(Boolean).length
  const stars = starsForScore(score)

  // ── Mode selector ─────────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="flex-1 flex flex-col bg-parchment min-h-screen items-center justify-center px-6 gap-8">
        <div className="text-center">
          <div className="text-7xl mb-3">🧮</div>
          <h1 className="text-3xl font-heading font-bold text-ink">Multiplication Facts</h1>
          <p className="text-ink-light font-body mt-1">All facts to 81 (2 × 2 through 9 × 9)</p>
        </div>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={() => beginGame('practice')}
            className="w-full bg-white border-2 border-gold rounded-3xl px-6 py-5 text-left active:scale-95 transition-transform shadow-sm"
          >
            <p className="text-xl font-heading font-bold text-ink mb-1">🟡 Practice</p>
            <p className="text-sm font-body text-ink-light">Multiple choice — tap the right answer</p>
          </button>
          <button
            onClick={() => beginGame('challenge')}
            className="w-full bg-white border-2 border-amber-400 rounded-3xl px-6 py-5 text-left active:scale-95 transition-transform shadow-sm"
          >
            <p className="text-xl font-heading font-bold text-ink mb-1">🔥 Challenge</p>
            <p className="text-sm font-body text-ink-light">Type or say the answer — no hints!</p>
          </button>
        </div>
        <button onClick={() => router.push('/')} className="text-ink-light font-heading text-sm">
          ← Back to Home
        </button>
      </div>
    )
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  if (phase === 'summary') {
    return (
      <div className="flex-1 flex flex-col bg-parchment min-h-screen items-center justify-center px-6 gap-8">
        <div className="text-center">
          <div className="text-8xl mb-4">
            {stars === 3 ? '🏆' : stars === 2 ? '🎉' : stars === 1 ? '👍' : '💪'}
          </div>
          <h1 className="text-4xl font-heading font-bold text-ink mb-2">{score} out of {TOTAL}!</h1>
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3].map(n => (
              <span key={n} className={`text-4xl ${stars >= n ? '' : 'grayscale opacity-30'}`}>⭐</span>
            ))}
          </div>
          <p className="text-ink-light font-body text-lg">
            {stars === 3 ? 'Perfect! You know your multiplication facts!' :
             stars === 2 ? 'Almost perfect — great work!' :
             stars >= 1 ? 'Good start — keep practicing!' :
             "Keep going — you'll get there!"}
          </p>
        </div>

        {/* Answer recap grid */}
        <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
          <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3 text-center">
            YOUR ANSWERS
          </p>
          <div className="grid grid-cols-5 gap-2">
            {results.map((correct, i) => (
              <div
                key={i}
                className={`rounded-xl py-2 text-center text-sm font-heading font-bold ${
                  correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {correct ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={claimReward}
          disabled={claiming}
          className="w-full max-w-sm bg-gold text-white font-heading font-bold text-2xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform disabled:opacity-60"
        >
          {claiming ? 'Claiming…' : 'Claim Reward! 🎁'}
        </button>
      </div>
    )
  }

  // ── Claimed / reward screen ───────────────────────────────────────────────────
  if (phase === 'claimed' && reward) {
    const xpPercent = Math.min(100, (reward.xpInLevel / XP_PER_LEVEL) * 100)
    return (
      <div className="flex flex-col bg-parchment min-h-screen">
        <div className="shrink-0 px-6 pt-10 pb-8 text-center bg-yellow-50">
          {reward.leveledUp ? (
            <>
              <div className="text-7xl mb-2 animate-bounce">🎊</div>
              <h1 className="text-4xl font-heading font-bold text-ink mb-1">Level Up!</h1>
              <p className="text-2xl font-heading font-semibold text-gold">
                You&apos;re now Level {reward.levelAfter}!
              </p>
            </>
          ) : (
            <>
              <div className="text-7xl mb-2">🧮</div>
              <h1 className="text-4xl font-heading font-bold text-ink mb-1">
                {mode === 'challenge' ? 'Challenge Complete!' : 'Math Complete!'}
              </h1>
              <p className="font-heading font-semibold text-gold">{score} / {TOTAL} correct</p>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {/* Stars */}
          <div className="bg-white rounded-3xl p-5 text-center border border-gold/20 shadow-sm">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">MATH STARS</p>
            <div className="flex justify-center gap-3 mb-2">
              {[1, 2, 3].map(n => (
                <span key={n} className={`text-5xl ${stars >= n ? 'opacity-100 scale-110' : 'opacity-25 grayscale'}`}>⭐</span>
              ))}
            </div>
            <p className="text-sm font-body text-ink-light mt-2">
              {stars === 3 ? 'Perfect score — unbelievable!' :
               stars === 2 ? 'Excellent — almost perfect!' :
               stars >= 1 ? 'Good effort — keep practicing!' :
               'Keep at it — you can do it!'}
            </p>
          </div>

          {/* Coins */}
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-1">QUEST COINS EARNED</p>
              <p className="text-3xl font-heading font-bold text-gold">+{reward.coinsGained} 🪙</p>
            </div>
            <button onClick={() => router.push('/store')} className="bg-gold text-white font-heading font-semibold text-sm px-4 py-2 rounded-2xl active:scale-95 transition-transform">
              Visit Store
            </button>
          </div>

          {/* XP */}
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest">EXPERIENCE POINTS</p>
              <span className="text-gold font-heading font-bold text-lg">+{reward.xpGained} XP</span>
            </div>
            <div className="h-4 bg-parchment rounded-full overflow-hidden border border-gold/20">
              <div className="h-full bg-gold rounded-full transition-all duration-1000" style={{ width: `${xpPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-ink-muted font-heading mt-1">
              <span>Level {reward.levelAfter}</span>
              <span>{reward.xpInLevel} / {XP_PER_LEVEL} XP</span>
            </div>
          </div>

          {/* New badges */}
          {reward.newBadges.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">NEW BADGE EARNED 🏅</p>
              {reward.newBadges.map(id => {
                const info = BADGE_INFO[id]
                return (
                  <div key={id} className="flex items-center gap-3 bg-parchment rounded-2xl px-4 py-3">
                    <span className="text-3xl">{info.emoji}</span>
                    <div>
                      <p className="font-heading font-bold text-ink">{info.name}</p>
                      <p className="text-xs text-ink-light font-body">{info.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pb-10 pt-4 flex flex-col gap-3 border-t border-gold/20">
          {hasCompletedPractice ? (
            <>
              <button
                onClick={() => beginGame('practice')}
                className="w-full bg-white border-2 border-gold text-ink font-heading font-bold text-lg py-4 rounded-3xl active:scale-95 transition-transform"
              >
                🟡 Practice Again
              </button>
              <button
                onClick={() => beginGame('challenge')}
                className="w-full bg-gold text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
              >
                🔥 Challenge Mode
              </button>
            </>
          ) : (
            <button
              onClick={() => beginGame('practice')}
              className="w-full bg-gold text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
            >
              Practice Again 🧮
            </button>
          )}
          <button onClick={() => router.push('/')} className="w-full bg-white border border-gold/30 text-ink font-heading font-semibold text-lg py-4 rounded-3xl active:scale-95 transition-transform">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // ── Playing ───────────────────────────────────────────────────────────────────
  if (phase !== 'playing' || questions.length === 0) return null
  const q = questions[current]
  const progressPct = (current / TOTAL) * 100

  // ── Practice mode ─────────────────────────────────────────────────────────────
  if (mode === 'practice') {
    return (
      <div className="flex flex-col bg-parchment min-h-screen">
        <header className="shrink-0 px-6 pt-8 pb-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-ink-light font-heading text-sm flex items-center gap-1">← Home</button>
          <div className="text-center">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest">🟡 PRACTICE</p>
            <p className="text-lg font-heading font-bold text-ink">{current + 1} / {TOTAL}</p>
          </div>
          <div className="w-16" />
        </header>

        <div className="px-6 mb-6">
          <div className="h-3 bg-white rounded-full border border-gold/20 overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <div className="bg-white rounded-3xl px-8 py-10 border border-gold/20 shadow-sm text-center w-full max-w-sm">
            <p className="text-ink-muted font-heading text-lg mb-2">What is</p>
            <p className="text-6xl font-heading font-bold text-ink">{q.factorA} × {q.factorB}</p>
            <p className="text-5xl font-heading font-bold text-gold mt-1">= ?</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {q.options.map(option => {
              const isSel = practiceSelected === option
              const isCorrect = option === q.answer
              let cls = 'bg-white border-2 border-gold/30 text-ink'
              if (isSel) cls = practiceFeedback === 'correct' ? 'bg-green-100 border-2 border-green-400 text-green-800 scale-105' : 'bg-red-100 border-2 border-red-400 text-red-700'
              else if (practiceFeedback === 'wrong' && isCorrect) cls = 'bg-green-100 border-2 border-green-400 text-green-800'
              return (
                <button
                  key={option}
                  onClick={() => handlePracticeAnswer(option)}
                  className={`${cls} font-heading font-bold text-4xl py-6 rounded-3xl shadow-sm transition-all duration-200 active:scale-95`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
        <div className="shrink-0 h-12" />
      </div>
    )
  }

  // ── Challenge mode ────────────────────────────────────────────────────────────
  const challengeBg =
    challengeFeedback === 'correct' ? 'bg-green-50 border-green-400' :
    challengeFeedback === 'wrong'   ? 'bg-red-50 border-red-400' :
    'bg-white border-gold/20'

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <header className="shrink-0 px-6 pt-8 pb-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="text-ink-light font-heading text-sm flex items-center gap-1">← Home</button>
        <div className="text-center">
          <p className="text-xs font-heading font-semibold text-amber-600 tracking-widest">🔥 CHALLENGE</p>
          <p className="text-lg font-heading font-bold text-ink">{current + 1} / {TOTAL}</p>
        </div>
        <div className="w-16" />
      </header>

      <div className="px-6 mb-6">
        <div className="h-3 bg-white rounded-full border border-gold/20 overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Question */}
        <div className="bg-white rounded-3xl px-8 py-10 border border-gold/20 shadow-sm text-center w-full max-w-sm">
          <p className="text-ink-muted font-heading text-lg mb-2">What is</p>
          <p className="text-6xl font-heading font-bold text-ink">{q.factorA} × {q.factorB}</p>
          <p className="text-5xl font-heading font-bold text-gold mt-1">= ?</p>
        </div>

        {/* Answer input */}
        <div className={`w-full max-w-sm rounded-3xl border-2 px-6 py-5 transition-colors duration-200 ${challengeBg}`}>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={e => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(inputValue); if (!isNaN(n)) submitChallenge(n) } }}
            disabled={challengeFeedback !== null}
            placeholder="Type your answer…"
            className="w-full text-center text-5xl font-heading font-bold bg-transparent outline-none text-ink placeholder:text-ink-muted/40"
            autoComplete="off"
          />
          {challengeFeedback && (
            <p className={`text-center text-sm font-heading font-bold mt-2 ${challengeFeedback === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
              {challengeFeedback === 'correct' ? `✓ Correct! ${q.factorA} × ${q.factorB} = ${q.answer}` : `✗ The answer is ${q.answer}`}
            </p>
          )}
        </div>

        {/* Mic + Check buttons */}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => setSpeechEnabled(e => !e)}
            disabled={challengeFeedback !== null}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-heading font-semibold text-base border-2 transition-all active:scale-95 disabled:opacity-40 ${
              speechEnabled
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-white border-gold/30 text-ink'
            }`}
          >
            <span className={speechEnabled && listening ? 'animate-pulse' : ''}>{speechEnabled ? '🎤' : '🎙️'}</span>
            {speechEnabled ? (listening ? 'Listening…' : 'On') : 'Say it'}
          </button>
          <button
            onClick={() => { const n = parseInt(inputValue); if (!isNaN(n)) submitChallenge(n) }}
            disabled={!inputValue || challengeFeedback !== null}
            className="flex-1 bg-gold text-white font-heading font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-95 transition-transform disabled:opacity-40"
          >
            Check ✓
          </button>
        </div>
      </div>
      <div className="shrink-0 h-12" />
    </div>
  )
}
