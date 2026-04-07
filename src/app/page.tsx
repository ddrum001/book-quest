'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { THEMES, getLevel, getXpInCurrentLevel, XP_PER_LEVEL, type User } from '@/lib/types'
import { Avatar } from '@/components/Avatar'


const DAILY_GOAL_SECS = 20 * 60

function ptTodayBounds() {
  const now = new Date()
  const ptDateStr = new Intl.DateTimeFormat('sv', { timeZone: 'America/Los_Angeles' }).format(now)
  const utcH = now.getUTCHours()
  const ptH = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false }).format(now)
  )
  let off = ptH - utcH
  if (off > 12) off -= 24
  if (off < -12) off += 24
  const [yr, mo, dy] = ptDateStr.split('-').map(Number)
  const start = new Date(Date.UTC(yr, mo - 1, dy, -off, 0, 0, 0))
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

async function fetchTodaySeconds(userId: string): Promise<number> {
  const supabase = createClient()
  const { start, end } = ptTodayBounds()
  const { data } = await supabase
    .from('sessions')
    .select('reading_seconds')
    .eq('user_id', userId)
    .gte('completed_at', start.toISOString())
    .lt('completed_at', end.toISOString())
  return (data ?? []).reduce(
    (sum: number, s: { reading_seconds: number | null }) => sum + (s.reading_seconds ?? 0), 0
  )
}

export default function HomePage() {
  const router = useRouter()

  const [allUsers, setAllUsers] = useState<User[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [todaySeconds, setTodaySeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [pausedStory, setPausedStory] = useState<{ themeId: string; title: string; emoji: string } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Always load all users so the picker has something to show
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('child_name')
      setAllUsers((users ?? []) as User[])

      const userId = localStorage.getItem('bookquest_user_id')
      if (!userId) { setLoading(false); return }

      const found = (users ?? []).find((u: User) => u.id === userId)
      if (!found) { localStorage.removeItem('bookquest_user_id'); setLoading(false); return }

      setUser(found as User)
      setTodaySeconds(await fetchTodaySeconds(userId))

      // Check for a paused story
      const saved = localStorage.getItem(`bookquest_paused_story_${userId}`)
      if (saved) {
        try {
          const paused = JSON.parse(saved)
          const t = THEMES.find(th => th.id === paused.themeId)
          if (t && paused.story?.title) {
            setPausedStory({ themeId: paused.themeId, title: paused.story.title, emoji: t.emoji })
          }
        } catch { /* ignore */ }
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSelectUser(selected: User) {
    localStorage.setItem('bookquest_user_id', selected.id)
    setUser(selected)
    setTodaySeconds(await fetchTodaySeconds(selected.id))

    const saved = localStorage.getItem(`bookquest_paused_story_${selected.id}`)
    if (saved) {
      try {
        const paused = JSON.parse(saved)
        const t = THEMES.find(th => th.id === paused.themeId)
        if (t && paused.story?.title) {
          setPausedStory({ themeId: paused.themeId, title: paused.story.title, emoji: t.emoji })
        }
      } catch { setPausedStory(null) }
    } else {
      setPausedStory(null)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return
    setCreating(true)
    setError('')
    const supabase = createClient()

    // Check for an existing reader with the same name (case-insensitive)
    const { data: existing } = await supabase
      .from('users')
      .select('id, child_name')
      .ilike('child_name', nameInput.trim())
      .maybeSingle()
    if (existing) {
      setError(`A reader named "${existing.child_name}" already exists — pick them from the list!`)
      setCreating(false)
      return
    }

    const { data, error: dbError } = await supabase
      .from('users')
      .insert({ child_name: nameInput.trim(), coins: 100 })
      .select()
      .single()
    if (dbError) {
      setError('Something went wrong — please try again.')
      setCreating(false)
      return
    }
    const newUser = data as User
    localStorage.setItem('bookquest_user_id', newUser.id)
    setAllUsers(prev => [...prev, newUser].sort((a, b) => a.child_name.localeCompare(b.child_name)))
    setUser(newUser)
    setIsNewUser(true)
    setCreating(false)
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-parchment">
        <p className="text-gold text-2xl font-heading animate-pulse">Loading your quest…</p>
      </div>
    )
  }

  // ── User picker (no one logged in, users exist, not adding new) ───────────────
  if (!user && allUsers.length > 0 && !showNewForm) {
    return (
      <div className="flex-1 flex flex-col bg-parchment min-h-screen">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center">
            <div className="text-7xl mb-3">📚</div>
            <h1 className="text-4xl font-heading font-bold text-gold">Book Quest</h1>
            <p className="text-ink-light font-body mt-1">Who&apos;s reading today?</p>
          </div>
          <div className="w-full max-w-sm flex flex-col gap-3">
            {allUsers.map(u => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className="w-full bg-white border border-gold/30 rounded-3xl px-5 py-4 flex items-center gap-4 text-left shadow-sm active:scale-95 transition-transform"
              >
                <Avatar equipped={u.avatar_equipped ?? {}} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-ink text-xl">{u.child_name}</p>
                  <p className="text-ink-light font-body text-sm">
                    Level {getLevel(u.total_xp)} · {u.stories_read} stories
                    {(u.current_streak ?? 0) > 0 && ` · 🔥 ${u.current_streak}`}
                  </p>
                </div>
                <span className="text-gold text-2xl">›</span>
              </button>
            ))}
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full bg-parchment border border-gold/20 rounded-3xl px-5 py-4 font-heading font-semibold text-ink-light text-center active:scale-95 transition-transform"
            >
              + Add new reader
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── New reader form (no existing users, or chose to add new) ─────────────────
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-parchment px-6">
        <div className="text-center mb-10">
          <div className="text-8xl mb-4">📚</div>
          <h1 className="text-5xl font-heading font-bold text-gold leading-tight">Book Quest</h1>
          <p className="text-ink-light text-lg font-body mt-2">A magical reading adventure!</p>
        </div>

        <form onSubmit={handleCreateUser} className="w-full max-w-sm flex flex-col gap-4">
          <label className="text-ink font-heading font-semibold text-xl text-center">
            What&apos;s your name, brave reader?
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Type your name…"
            className="text-center text-2xl font-heading px-4 py-4 rounded-2xl border-2 border-gold/40 bg-white focus:border-gold focus:outline-none"
            autoFocus
            maxLength={20}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={!nameInput.trim() || creating}
            className="bg-gold text-white font-heading font-bold text-xl py-4 rounded-2xl disabled:opacity-50 active:scale-95 transition-transform shadow-md"
          >
            {creating ? 'Starting quest…' : 'Start My Quest! 🚀'}
          </button>
          {allUsers.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNameInput(''); setError('') }}
              className="text-ink-light font-heading text-sm text-center"
            >
              ← Back to reader list
            </button>
          )}
        </form>
      </div>
    )
  }

  // ── Home screen ───────────────────────────────────────────────────────────────
  const level = getLevel(user.total_xp)
  const xpInLevel = getXpInCurrentLevel(user.total_xp)
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100

  return (
    <div className="flex-1 flex flex-col bg-parchment min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-8 pb-4">
        <button onClick={() => router.push('/store')} className="shrink-0 active:scale-95 transition-transform">
          <Avatar equipped={user.avatar_equipped ?? {}} size={72} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-heading font-bold text-gold truncate">
            {user.child_name}&apos;s Quest
          </h1>
          <p className="text-ink font-heading font-semibold">Level {level} Reader</p>
          <p className="text-ink-light font-body text-sm">
            {user.total_stars} ⭐ &middot; {user.stories_read} stories
            {(user.current_streak ?? 0) > 0 && ` · 🔥 ${user.current_streak}`}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1 bg-white border border-gold/30 rounded-2xl px-3 py-1.5">
          <span>🪙</span>
          <span className="font-heading font-bold text-gold">{user.coins ?? 0}</span>
        </div>
      </header>

      {/* Welcome banner for new readers */}
      {isNewUser && (
        <div className="mx-6 mb-3 bg-gold/10 border border-gold/30 rounded-3xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">🪙</span>
          <div className="flex-1">
            <p className="font-heading font-bold text-ink">Welcome! You have 100 coins!</p>
            <p className="font-body text-sm text-ink-light mt-0.5">Read stories to earn even more — finish one perfectly for a bonus!</p>
          </div>
          <button onClick={() => setIsNewUser(false)} className="text-ink-muted font-heading text-lg leading-none shrink-0">×</button>
        </div>
      )}

      {/* XP progress bar */}
      <div className="px-6 mb-6">
        <div className="flex justify-between text-xs text-ink-muted font-heading mb-1">
          <span>XP Progress</span>
          <span>{xpInLevel} / {XP_PER_LEVEL}</span>
        </div>
        <div className="h-3 bg-white rounded-full border border-gold/20 overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-700"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>

      {/* Daily reading goal */}
      <div className="px-6 mb-2">
        <div className="bg-white rounded-3xl px-5 pt-4 pb-5 border border-gold/20 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest">
              TODAY&apos;S READING
            </p>
            <span className="font-heading font-bold text-ink text-sm">
              {Math.floor(todaySeconds / 60)}m {todaySeconds % 60}s
              {' '}<span className="text-ink-muted font-normal">/ 20 min</span>
            </span>
          </div>
          <div className="h-3 bg-parchment rounded-full overflow-hidden border border-gold/20">
            <div
              className="h-full bg-gold rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (todaySeconds / DAILY_GOAL_SECS) * 100)}%` }}
            />
          </div>
          {todaySeconds >= DAILY_GOAL_SECS ? (
            <p className="text-green-600 font-heading font-semibold text-xs text-center mt-2">
              🎉 Daily goal reached!
            </p>
          ) : (
            <p className="text-ink-muted font-body text-xs text-center mt-2">
              {Math.floor((DAILY_GOAL_SECS - todaySeconds) / 60)}m {(DAILY_GOAL_SECS - todaySeconds) % 60}s left to reach today&apos;s goal
            </p>
          )}
        </div>
      </div>

      {/* Main CTA */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <div className="text-center">
          <div className="text-7xl mb-3">🏰</div>
          <h2 className="text-3xl font-heading font-bold text-ink mb-1">Ready for adventure?</h2>
          <p className="text-ink-light font-body">Pick a world and start reading!</p>
        </div>
        {pausedStory && (
          <button
            onClick={() => router.push(`/story?theme=${pausedStory.themeId}&resume=true`)}
            className="w-full max-w-xs bg-sky-50 border-2 border-sky-300 rounded-3xl px-5 py-4 text-center active:scale-95 transition-transform"
          >
            <p className="text-[11px] font-heading font-semibold text-sky-500 tracking-widest mb-1">PAUSED STORY</p>
            <p className="font-heading font-bold text-sky-700 text-lg">
              {pausedStory.emoji} {pausedStory.title}
            </p>
            <p className="text-sky-500 font-body text-sm mt-0.5">⏸ Tap to continue reading</p>
          </button>
        )}
        <button
          onClick={() => router.push('/theme-picker')}
          className="w-full max-w-xs bg-gold text-white font-heading font-bold text-2xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
        >
          Choose a Story 📖
        </button>
        {(user.game_plays_available ?? 0) > 0 && (
          <button
            onClick={() => router.push('/games')}
            className="w-full max-w-xs bg-white border-2 border-gold font-heading font-bold text-xl py-4 rounded-3xl active:scale-95 transition-transform flex items-center justify-center gap-3"
          >
            <span>🎮 Play Games</span>
            <span className="bg-gold text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
              {user.game_plays_available}
            </span>
          </button>
        )}
        <button
          onClick={() => router.push('/math')}
          className="w-full max-w-xs bg-white border-2 border-amber-400 text-amber-700 font-heading font-bold text-xl py-4 rounded-3xl active:scale-95 transition-transform"
        >
          🧮 Times Tables
        </button>
      </div>

      {/* Bottom nav */}
      <nav className="flex justify-around px-4 pb-10 pt-4 border-t border-gold/20">
        <button className="flex flex-col items-center gap-1 text-gold">
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-heading font-semibold">Home</span>
        </button>
        <button onClick={() => router.push('/badges')} className="flex flex-col items-center gap-1 text-ink-light">
          <span className="text-2xl">🏆</span>
          <span className="text-xs font-heading">Badges</span>
        </button>
        <button
          onClick={() => (user.game_plays_available ?? 0) > 0 && router.push('/games')}
          className={`flex flex-col items-center gap-1 relative ${(user.game_plays_available ?? 0) > 0 ? 'text-ink' : 'text-ink-light opacity-40'}`}
        >
          <span className="relative">
            <span className="text-2xl">🎮</span>
            {(user.game_plays_available ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-gold text-white text-[9px] font-heading font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {user.game_plays_available}
              </span>
            )}
          </span>
          <span className="text-xs font-heading">Games</span>
        </button>
        <button onClick={() => router.push('/store')} className="flex flex-col items-center gap-1 text-ink-light">
          <span className="text-2xl">🛍️</span>
          <span className="text-xs font-heading">Store</span>
        </button>
        <button onClick={() => router.push('/users')} className="flex flex-col items-center gap-1 text-ink-light">
          <span className="text-2xl">👤</span>
          <span className="text-xs font-heading">Switch</span>
        </button>
        <button onClick={() => router.push('/parent')} className="flex flex-col items-center gap-1 text-ink-light">
          <span className="text-2xl">🔒</span>
          <span className="text-xs font-heading">Parent</span>
        </button>
      </nav>
    </div>
  )
}
