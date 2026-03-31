'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLevel, getXpInCurrentLevel, XP_PER_LEVEL, type User } from '@/lib/types'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = localStorage.getItem('bookquest_user_id')
    if (!userId) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) setUser(data as User)
        else localStorage.removeItem('bookquest_user_id')
        setLoading(false)
      })
  }, [])

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return
    setCreating(true)
    setError('')
    const supabase = createClient()
    const { data, error: dbError } = await supabase
      .from('users')
      .insert({ child_name: nameInput.trim() })
      .select()
      .single()
    if (dbError) {
      setError('Something went wrong — please try again.')
      setCreating(false)
      return
    }
    localStorage.setItem('bookquest_user_id', data.id)
    setUser(data as User)
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-parchment">
        <p className="text-gold text-2xl font-heading animate-pulse">Loading your quest…</p>
      </div>
    )
  }

  /* ── Name entry (first time) ───────────────────────────────────────── */
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
        </form>
      </div>
    )
  }

  /* ── Home screen ───────────────────────────────────────────────────── */
  const level = getLevel(user.total_xp)
  const xpInLevel = getXpInCurrentLevel(user.total_xp)
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100

  return (
    <div className="flex-1 flex flex-col bg-parchment min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gold">📚 Book Quest</h1>
          <p className="text-ink-light font-body">Welcome back, {user.child_name}!</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-heading font-bold text-ink">Level {level} Reader</div>
          <div className="text-sm text-ink-light">
            {user.total_stars} ⭐ &middot; {user.stories_read} stories
          </div>
        </div>
      </header>

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

      {/* Main CTA */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-center">
          <div className="text-7xl mb-3">🏰</div>
          <h2 className="text-3xl font-heading font-bold text-ink mb-1">Ready for adventure?</h2>
          <p className="text-ink-light font-body">Pick a world and start reading!</p>
        </div>
        <button
          onClick={() => router.push('/theme-picker')}
          className="w-full max-w-xs bg-gold text-white font-heading font-bold text-2xl py-5 rounded-3xl shadow-lg active:scale-95 transition-transform"
        >
          Choose a Story 📖
        </button>
      </div>

      {/* Bottom nav */}
      <nav className="flex justify-around px-6 pb-10 pt-4 border-t border-gold/20">
        <button className="flex flex-col items-center gap-1 text-gold">
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-heading font-semibold">Home</span>
        </button>
        <button
          onClick={() => router.push('/badges')}
          className="flex flex-col items-center gap-1 text-ink-light"
        >
          <span className="text-2xl">🏆</span>
          <span className="text-xs font-heading">Badges</span>
        </button>
        <button
          onClick={() => router.push('/parent')}
          className="flex flex-col items-center gap-1 text-ink-light"
        >
          <span className="text-2xl">🔒</span>
          <span className="text-xs font-heading">Parent</span>
        </button>
      </nav>
    </div>
  )
}
