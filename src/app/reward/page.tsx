'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { THEMES, BADGE_INFO, XP_PER_LEVEL, type BadgeId } from '@/lib/types'

function Star({ filled, delay }: { filled: boolean; delay: string }) {
  return (
    <span
      className={`text-5xl transition-all duration-500 ${filled ? 'opacity-100 scale-110' : 'opacity-25 grayscale'}`}
      style={{ animationDelay: delay }}
    >
      ⭐
    </span>
  )
}

function RewardScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const DAILY_GOAL_SECS = 20 * 60 // 20 minutes

  const themeId = searchParams.get('theme') ?? 'dragon-kingdom'
  const xpGained = Number(searchParams.get('xp') ?? 0)
  const starsEarned = Number(searchParams.get('stars') ?? 1)
  const newTotalXp = Number(searchParams.get('totalXp') ?? 0)
  const xpInLevel = Number(searchParams.get('xpInLevel') ?? 0)
  const levelAfter = Number(searchParams.get('level') ?? 1)
  const leveledUp = searchParams.get('leveledUp') === 'true'
  const newBadges = (searchParams.get('badges') ?? '')
    .split(',')
    .filter(Boolean) as BadgeId[]
  const stumbleWords = (searchParams.get('stumbles') ?? '')
    .split(',')
    .filter(Boolean)
  const skippedWords = (searchParams.get('skips') ?? '')
    .split(',')
    .filter(Boolean)
  const readSecs = Number(searchParams.get('readSecs') ?? 0)
  const todaySecs = Number(searchParams.get('todaySecs') ?? 0)
  const currentStreak = Number(searchParams.get('streak') ?? 0)
  const coinsGained = Number(searchParams.get('coins') ?? 0)
  const gameCoins = Number(searchParams.get('gameCoins') ?? 0)
  const gameStars = Number(searchParams.get('gameStars') ?? 0)

  function fmtTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    if (m === 0) return `${s}s`
    if (s === 0) return `${m}m`
    return `${m}m ${s}s`
  }

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
  const xpPercent = Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100)

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      {/* Themed top banner */}
      <div
        className="shrink-0 px-6 pt-10 pb-8 text-center"
        style={{ backgroundColor: theme.color + '18' }}
      >
        {leveledUp ? (
          <>
            <div className="text-7xl mb-2 animate-bounce">🎊</div>
            <h1 className="text-4xl font-heading font-bold text-ink mb-1">Level Up!</h1>
            <p className="text-2xl font-heading font-semibold" style={{ color: theme.color }}>
              You&apos;re now a Level {levelAfter} Reader!
            </p>
          </>
        ) : (
          <>
            <div className="text-7xl mb-2">{theme.emoji}</div>
            <h1 className="text-4xl font-heading font-bold text-ink mb-1">
              Story Complete!
            </h1>
            <p className="font-heading font-semibold" style={{ color: theme.color }}>
              Level {levelAfter} Reader
            </p>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

        {/* Streak */}
        {currentStreak > 0 && (
          <div className="bg-white rounded-3xl p-5 text-center border border-gold/20 shadow-sm">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-2">
              READING STREAK
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl">🔥</span>
              <div>
                <p className="text-4xl font-heading font-bold text-ink leading-none">
                  {currentStreak}
                </p>
                <p className="text-sm font-heading text-ink-light">
                  {currentStreak === 1 ? 'day' : 'days in a row'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stars */}
        <div className="bg-white rounded-3xl p-5 text-center border border-gold/20 shadow-sm">
          <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">
            READING STARS
          </p>
          <div className="flex justify-center gap-3 mb-2">
            <Star filled={starsEarned >= 1} delay="0ms" />
            <Star filled={starsEarned >= 2} delay="150ms" />
            <Star filled={starsEarned >= 3} delay="300ms" />
          </div>
          <p className="text-sm font-body text-ink-light mt-2">
            {starsEarned === 3
              ? 'Perfect reading — no stumbles!'
              : starsEarned === 2
              ? 'Great job — just a few tricky words!'
              : 'Good effort — keep practising!'}
          </p>
        </div>

        {/* Coins */}
        <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-1">
              QUEST COINS EARNED
            </p>
            <p className="text-3xl font-heading font-bold text-gold">+{coinsGained + gameCoins} 🪙</p>
            {gameCoins > 0 && (
              <p className="text-xs font-body text-ink-light mt-0.5">
                {coinsGained} reading + {gameCoins} games
              </p>
            )}
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/store'
            }}
            className="bg-gold text-white font-heading font-semibold text-sm px-4 py-2 rounded-2xl active:scale-95 transition-transform"
          >
            Visit Store
          </button>
        </div>

        {/* Game bonus stars */}
        {gameStars > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm text-center">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-2">
              GAME BONUS STARS
            </p>
            <p className="text-3xl mb-1">{'⭐'.repeat(gameStars)}</p>
            <p className="text-sm font-body text-ink-light">
              {gameStars === 2 ? 'Perfect quiz — double star bonus!' : 'Bonus star for finishing all games!'}
            </p>
          </div>
        )}

        {/* XP */}
        <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest">
              EXPERIENCE POINTS
            </p>
            <span className="text-gold font-heading font-bold text-lg">+{xpGained} XP</span>
          </div>
          <div className="h-4 bg-parchment rounded-full overflow-hidden border border-gold/20">
            <div
              className="h-full bg-gold rounded-full transition-all duration-1000"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-ink-muted font-heading mt-1">
            <span>Level {levelAfter}</span>
            <span>{xpInLevel} / {XP_PER_LEVEL} XP</span>
          </div>
        </div>

        {/* Reading time */}
        {readSecs > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest">
                TODAY&apos;S READING
              </p>
              <span className="font-heading font-bold text-ink text-sm">
                {fmtTime(todaySecs)} / 20 min
              </span>
            </div>
            <p className="text-xs text-ink-light font-body mb-3">
              You read for <span className="font-semibold text-ink">{fmtTime(readSecs)}</span> this story
            </p>
            <div className="h-4 bg-parchment rounded-full overflow-hidden border border-gold/20">
              <div
                className="h-full bg-gold rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (todaySecs / DAILY_GOAL_SECS) * 100)}%` }}
              />
            </div>
            {todaySecs >= DAILY_GOAL_SECS ? (
              <p className="text-center text-green-600 font-heading font-semibold text-sm mt-2">
                🎉 Daily goal reached! Amazing work!
              </p>
            ) : (
              <p className="text-center text-ink-muted font-body text-xs mt-2">
                {fmtTime(DAILY_GOAL_SECS - todaySecs)} more to hit your 20-min goal
              </p>
            )}
          </div>
        )}

        {/* New badges */}
        {newBadges.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">
              NEW BADGES EARNED 🏅
            </p>
            <div className="flex flex-col gap-3">
              {newBadges.map(id => {
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

        {/* Stumble words */}
        {stumbleWords.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">
              WORDS TO PRACTISE 📚
            </p>
            <div className="flex flex-wrap gap-2">
              {stumbleWords.map(w => (
                <span
                  key={w}
                  className="bg-amber-50 border border-amber-200 text-amber-800 font-heading font-semibold px-3 py-1.5 rounded-full text-sm capitalize"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skipped words */}
        {skippedWords.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest mb-3">
              WORDS YOU SKIPPED 🔊
            </p>
            <p className="text-xs text-ink-light font-body mb-3">
              The app read these for you — try them next time!
            </p>
            <div className="flex flex-wrap gap-2">
              {skippedWords.map(w => (
                <span
                  key={w}
                  className="bg-blue-50 border border-blue-200 text-blue-800 font-heading font-semibold px-3 py-1.5 rounded-full text-sm capitalize"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Actions */}
      <div className="shrink-0 px-6 pb-10 pt-4 flex flex-col gap-3 border-t border-gold/20">
        <button
          onClick={() => router.push('/theme-picker')}
          className="w-full text-white font-heading font-bold text-xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
          style={{ backgroundColor: theme.color }}
        >
          Read Another Story {theme.emoji}
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

export default function RewardPage() {
  return (
    <Suspense>
      <RewardScreen />
    </Suspense>
  )
}
