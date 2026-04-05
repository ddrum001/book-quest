'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getLevel, getXpInCurrentLevel, XP_PER_LEVEL, BADGE_INFO, type BadgeId } from '@/lib/types'

// ── 8s multiplication facts ──────────────────────────────────────────────────
const ALL_FACTS = Array.from({ length: 12 }, (_, i) => ({
  factor: i + 1,
  answer: 8 * (i + 1),
}))

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getOptions(correct: number): number[] {
  const wrongs = new Set<number>()
  const offsets = [8, 16, 4, 24, 12]
  for (const off of offsets) {
    if (wrongs.size >= 3) break
    if (correct - off > 0 && !wrongs.has(correct - off)) wrongs.add(correct - off)
    if (wrongs.size < 3 && !wrongs.has(correct + off)) wrongs.add(correct + off)
  }
  return shuffle([correct, ...Array.from(wrongs).slice(0, 3)])
}

const TOTAL = 10

function starsForScore(score: number): number {
  if (score === TOTAL) return 3
  if (score >= 8) return 2
  if (score >= 5) return 1
  return 0
}

type Phase = 'playing' | 'summary' | 'claimed'

interface Reward {
  xpGained: number
  coinsGained: number
  starsEarned: number
  newBadges: BadgeId[]
  newTotalXp: number
  xpInLevel: number
  levelAfter: number
  leveledUp: boolean
}

export default function MathPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [questions] = useState(() =>
    shuffle(ALL_FACTS).slice(0, TOTAL).map(q => ({
      ...q,
      options: getOptions(q.answer),
    }))
  )
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [phase, setPhase] = useState<Phase>('playing')
  const [reward, setReward] = useState<Reward | null>(null)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('bookquest_user_id')
    if (!id) { router.push('/'); return }
    setUserId(id)
  }, [router])

  const handleAnswer = useCallback((option: number) => {
    if (feedback !== null || selected !== null) return
    const isCorrect = option === questions[current].answer
    setSelected(option)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    const newResults = [...results, isCorrect]

    setTimeout(() => {
      setSelected(null)
      setFeedback(null)
      setResults(newResults)
      if (current + 1 >= TOTAL) {
        setPhase('summary')
      } else {
        setCurrent(c => c + 1)
      }
    }, 900)
  }, [feedback, selected, questions, current, results])

  async function claimReward() {
    if (!userId || claiming) return
    setClaiming(true)
    const score = results.filter(Boolean).length
    const res = await fetch('/api/complete-math', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, score, total: TOTAL }),
    })
    const data: Reward = await res.json()
    setReward(data)
    setPhase('claimed')
    setClaiming(false)
  }

  const score = results.filter(Boolean).length
  const stars = starsForScore(score)

  // ── Claimed / reward screen ─────────────────────────────────────────────────
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
              <h1 className="text-4xl font-heading font-bold text-ink mb-1">Math Complete!</h1>
              <p className="font-heading font-semibold text-gold">
                {score} / {TOTAL} correct
              </p>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {/* Stars */}
          <div className="bg-white rounded-3xl p-5 text-center border border-gold/20 shadow-sm">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">
              MATH STARS
            </p>
            <div className="flex justify-center gap-3 mb-2">
              {[1, 2, 3].map(n => (
                <span key={n} className={`text-5xl transition-all duration-500 ${stars >= n ? 'opacity-100 scale-110' : 'opacity-25 grayscale'}`}>
                  ⭐
                </span>
              ))}
            </div>
            <p className="text-sm font-body text-ink-light mt-2">
              {stars === 3 ? 'Perfect score — unbelievable!' : stars === 2 ? 'Excellent work — almost perfect!' : stars === 1 ? 'Good effort — keep practicing!' : 'Keep going — you can do it!'}
            </p>
          </div>

          {/* Coins */}
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-1">
                QUEST COINS EARNED
              </p>
              <p className="text-3xl font-heading font-bold text-gold">+{reward.coinsGained} 🪙</p>
            </div>
            <button
              onClick={() => router.push('/store')}
              className="bg-gold text-white font-heading font-semibold text-sm px-4 py-2 rounded-2xl active:scale-95 transition-transform"
            >
              Visit Store
            </button>
          </div>

          {/* XP */}
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest">
                EXPERIENCE POINTS
              </p>
              <span className="text-gold font-heading font-bold text-lg">+{reward.xpGained} XP</span>
            </div>
            <div className="h-4 bg-parchment rounded-full overflow-hidden border border-gold/20">
              <div
                className="h-full bg-gold rounded-full transition-all duration-1000"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ink-muted font-heading mt-1">
              <span>Level {reward.levelAfter}</span>
              <span>{reward.xpInLevel} / {XP_PER_LEVEL} XP</span>
            </div>
          </div>

          {/* New badges */}
          {reward.newBadges.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">
                NEW BADGE EARNED 🏅
              </p>
              <div className="flex flex-col gap-3">
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
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pb-10 pt-4 flex flex-col gap-3 border-t border-gold/20">
          <button
            onClick={() => router.push('/math')}
            className="w-full bg-gold text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
          >
            Practice Again 🧮
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-white border border-gold/30 text-ink font-heading font-semibold text-lg py-4 rounded-3xl active:scale-95 transition-transform"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // ── Summary screen ──────────────────────────────────────────────────────────
  if (phase === 'summary') {
    return (
      <div className="flex-1 flex flex-col bg-parchment min-h-screen items-center justify-center px-6 gap-8">
        <div className="text-center">
          <div className="text-8xl mb-4">
            {stars === 3 ? '🏆' : stars === 2 ? '🎉' : stars === 1 ? '👍' : '💪'}
          </div>
          <h1 className="text-4xl font-heading font-bold text-ink mb-2">
            {score} out of {TOTAL}!
          </h1>
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3].map(n => (
              <span key={n} className={`text-4xl ${stars >= n ? '' : 'grayscale opacity-30'}`}>⭐</span>
            ))}
          </div>
          <p className="text-ink-light font-body text-lg">
            {stars === 3
              ? 'Perfect! You know your 8s!'
              : stars === 2
              ? 'Almost perfect — great work!'
              : stars >= 1
              ? 'Good start — keep practicing!'
              : 'Keep at it — you\'ll get there!'}
          </p>
        </div>

        {/* Answer recap */}
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

  // ── Playing screen ──────────────────────────────────────────────────────────
  const q = questions[current]
  const progressPct = (current / TOTAL) * 100

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      {/* Header */}
      <header className="shrink-0 px-6 pt-8 pb-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-ink-light font-heading text-sm flex items-center gap-1"
        >
          ← Home
        </button>
        <div className="text-center">
          <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest">
            TIMES 8 TABLES
          </p>
          <p className="text-lg font-heading font-bold text-ink">
            {current + 1} / {TOTAL}
          </p>
        </div>
        <div className="w-16" />
      </header>

      {/* Progress bar */}
      <div className="px-6 mb-6">
        <div className="h-3 bg-white rounded-full border border-gold/20 overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="bg-white rounded-3xl px-8 py-10 border border-gold/20 shadow-sm text-center w-full max-w-sm">
          <p className="text-ink-muted font-heading text-lg mb-2">What is</p>
          <p className="text-6xl font-heading font-bold text-ink">
            8 × {q.factor}
          </p>
          <p className="text-5xl font-heading font-bold text-gold mt-1">= ?</p>
        </div>

        {/* Answer grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {q.options.map(option => {
            const isSelected = selected === option
            const isCorrect = option === q.answer
            let btnClass = 'bg-white border-2 border-gold/30 text-ink'
            if (isSelected) {
              btnClass = feedback === 'correct'
                ? 'bg-green-100 border-2 border-green-400 text-green-800 scale-105'
                : 'bg-red-100 border-2 border-red-400 text-red-700'
            } else if (feedback === 'wrong' && isCorrect) {
              btnClass = 'bg-green-100 border-2 border-green-400 text-green-800'
            }
            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className={`${btnClass} font-heading font-bold text-4xl py-6 rounded-3xl shadow-sm transition-all duration-200 active:scale-95`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom padding */}
      <div className="shrink-0 h-12" />
    </div>
  )
}
