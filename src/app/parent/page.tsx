'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLevel, type User } from '@/lib/types'

const PIN = '2653'

interface Session {
  id: string
  theme: string
  stars_earned: number | null
  stumble_words: string[] | null
  reading_seconds: number | null
  created_at: string
}

function toPtDate(date: Date): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Los_Angeles' }).format(date)
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    days.push(toPtDate(new Date(Date.now() - i * 86_400_000)))
  }
  return days
}

function shortDate(ptDate: string): string {
  const [, m, d] = ptDate.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

export default function ParentPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  // Check sessionStorage for prior auth
  useEffect(() => {
    if (sessionStorage.getItem('parent_authed') === '1') setAuthed(true)
  }, [])

  // Load all users once authed
  useEffect(() => {
    if (!authed) return
    createClient()
      .from('users')
      .select('*')
      .order('child_name')
      .then(({ data }) => {
        const u = (data ?? []) as User[]
        setUsers(u)
        if (u.length > 0) setSelectedId(u[0].id)
      })
  }, [authed])

  // Load sessions for selected user
  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    createClient()
      .from('sessions')
      .select('id, theme, stars_earned, stumble_words, reading_seconds, created_at')
      .eq('user_id', selectedId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[Parent portal] sessions query error:', error)
        setSessions((data ?? []) as Session[])
        setLoading(false)
      })
  }, [selectedId])

  function handlePin(e: React.FormEvent) {
    e.preventDefault()
    if (pin === PIN) {
      sessionStorage.setItem('parent_authed', '1')
      setAuthed(true)
      setPinError(false)
    } else {
      setPinError(true)
      setPin('')
    }
  }

  // ── PIN gate ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-parchment px-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🔒</div>
          <h1 className="text-3xl font-heading font-bold text-ink">Parent Portal</h1>
          <p className="text-ink-light font-body mt-1">Enter your PIN to continue</p>
        </div>
        <form onSubmit={handlePin} className="w-full max-w-xs flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false) }}
            placeholder="PIN"
            maxLength={6}
            autoFocus
            className="text-center text-3xl font-heading tracking-widest px-4 py-4 rounded-2xl border-2 border-gold/40 bg-white focus:border-gold focus:outline-none"
          />
          {pinError && <p className="text-red-500 text-sm text-center">Incorrect PIN</p>}
          <button
            type="submit"
            disabled={!pin}
            className="bg-gold text-white font-heading font-bold text-xl py-4 rounded-2xl disabled:opacity-50 active:scale-95 transition-transform"
          >
            Unlock
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-ink-light font-heading text-sm text-center"
          >
            ← Back
          </button>
        </form>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  const selectedUser = users.find(u => u.id === selectedId) ?? null

  // Last 7 days reading time
  const last7 = getLast7Days()
  const secondsByDay: Record<string, number> = {}
  const storiesByDay: Record<string, number> = {}
  for (const day of last7) { secondsByDay[day] = 0; storiesByDay[day] = 0 }
  for (const s of sessions) {
    const day = toPtDate(new Date(s.created_at))
    if (secondsByDay[day] !== undefined) {
      secondsByDay[day] += s.reading_seconds ?? 0
      storiesByDay[day] += 1
    }
  }
  const maxSecs = Math.max(...last7.map(d => secondsByDay[d]), 1)

  // Top stumble words
  const wordCounts: Record<string, number> = {}
  for (const s of sessions) {
    for (const w of s.stumble_words ?? []) {
      const lw = w.toLowerCase()
      wordCounts[lw] = (wordCounts[lw] ?? 0) + 1
    }
  }
  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Total skipped/stumble words across all sessions
  const totalStumbles = sessions.reduce((sum, s) => sum + (s.stumble_words?.length ?? 0), 0)
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.reading_seconds ?? 0), 0)

  return (
    <div className="flex flex-col bg-parchment min-h-screen max-h-screen">
      {/* Header */}
      <header className="shrink-0 px-6 pt-6 pb-3">
        <button onClick={() => router.push('/')} className="text-ink-light font-heading text-sm mb-3 flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold text-ink">📊 Parent Portal</h1>
          <button
            onClick={() => { sessionStorage.removeItem('parent_authed'); setAuthed(false) }}
            className="text-xs font-heading text-ink-light border border-gold/20 rounded-xl px-3 py-1.5"
          >
            Lock
          </button>
        </div>
      </header>

      {/* Reader tabs */}
      {users.length > 1 && (
        <div className="shrink-0 flex gap-2 px-6 pb-3 overflow-x-auto">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedId(u.id)}
              className={`shrink-0 px-4 py-2 rounded-2xl font-heading font-semibold text-sm transition-colors ${
                selectedId === u.id ? 'bg-gold text-white' : 'bg-white border border-gold/20 text-ink-light'
              }`}
            >
              {u.child_name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col gap-4">
        {loading || !selectedUser ? (
          <p className="text-gold text-center font-heading animate-pulse pt-10">Loading…</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-3xl p-4 border border-gold/20 shadow-sm text-center">
                <p className="text-2xl font-heading font-bold text-gold">{selectedUser.stories_read}</p>
                <p className="text-xs font-heading text-ink-light mt-0.5">Stories read</p>
              </div>
              <div className="bg-white rounded-3xl p-4 border border-gold/20 shadow-sm text-center">
                <p className="text-2xl font-heading font-bold text-gold">{fmtTime(totalSeconds)}</p>
                <p className="text-xs font-heading text-ink-light mt-0.5">Total time</p>
              </div>
              <div className="bg-white rounded-3xl p-4 border border-gold/20 shadow-sm text-center">
                <p className="text-2xl font-heading font-bold text-gold">Lv {getLevel(selectedUser.total_xp)}</p>
                <p className="text-xs font-heading text-ink-light mt-0.5">Current level</p>
              </div>
            </div>

            {/* Reading time — last 7 days */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-4">Reading Time — Last 7 Days</p>
              <div className="flex items-end gap-2 h-24">
                {last7.map(day => {
                  const secs = secondsByDay[day]
                  const stories = storiesByDay[day]
                  const heightPct = maxSecs > 0 ? (secs / maxSecs) * 100 : 0
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-[10px] font-heading text-ink-light">{secs > 0 ? fmtTime(secs) : ''}</p>
                      <div className="w-full flex items-end" style={{ height: '60px' }}>
                        <div
                          className="w-full rounded-t-lg transition-all"
                          style={{
                            height: `${Math.max(heightPct, secs > 0 ? 8 : 0)}%`,
                            backgroundColor: secs > 0 ? '#D4A847' : '#e5e7eb',
                          }}
                        />
                      </div>
                      <p className="text-[10px] font-heading text-ink-light">{shortDate(day)}</p>
                      {stories > 0 && <p className="text-[9px] font-heading text-gold">{stories} {stories === 1 ? 'story' : 'stories'}</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stories per theme */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Stories by Theme</p>
              {(() => {
                const themeCounts: Record<string, number> = {}
                for (const s of sessions) {
                  themeCounts[s.theme] = (themeCounts[s.theme] ?? 0) + 1
                }
                const themeNames: Record<string, string> = {
                  'dragon-kingdom': '🐉 Dragon Kingdom',
                  'ocean-depths': '🐠 Ocean Depths',
                  'star-explorer': '🚀 Star Explorer',
                  'enchanted-forest': '🌿 Enchanted Forest',
                  'pirate-seas': '🏴‍☠️ Pirate Seas',
                  'zombies-seabrook': '🧟 Seabrook High',
                }
                const entries = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])
                if (entries.length === 0) return <p className="text-ink-light font-body text-sm">No stories read yet.</p>
                return (
                  <div className="flex flex-col gap-2">
                    {entries.map(([theme, count]) => (
                      <div key={theme} className="flex items-center justify-between">
                        <p className="font-body text-sm text-ink">{themeNames[theme] ?? theme}</p>
                        <p className="font-heading font-semibold text-gold text-sm">{count} {count === 1 ? 'story' : 'stories'}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Top stumble words */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <div className="flex items-baseline justify-between mb-3">
                <p className="font-heading font-bold text-ink">Top Tricky Words</p>
                <p className="text-xs font-heading text-ink-light">{totalStumbles} total stumbles</p>
              </div>
              {topWords.length === 0 ? (
                <p className="text-ink-light font-body text-sm">No stumble words yet — great reading!</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topWords.map(([word, count], i) => {
                    const maxCount = topWords[0][1]
                    const pct = (count / maxCount) * 100
                    return (
                      <div key={word} className="flex items-center gap-3">
                        <p className="text-xs font-heading text-ink-muted w-4 shrink-0">{i + 1}</p>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-heading font-semibold text-ink text-sm">{word}</p>
                            <p className="text-xs font-heading text-ink-light">{count}×</p>
                          </div>
                          <div className="h-1.5 bg-gold/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent sessions */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Recent Sessions</p>
              {sessions.length === 0 ? (
                <p className="text-ink-light font-body text-sm">No sessions yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {sessions.slice(0, 10).map(s => {
                    const themeEmojis: Record<string, string> = {
                      'dragon-kingdom': '🐉', 'ocean-depths': '🐠', 'star-explorer': '🚀',
                      'enchanted-forest': '🌿', 'pirate-seas': '🏴‍☠️', 'zombies-seabrook': '🧟',
                    }
                    const stars = s.stars_earned ?? 0
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{themeEmojis[s.theme] ?? '📖'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-semibold text-ink text-sm capitalize">
                            {s.theme.replace(/-/g, ' ')}
                          </p>
                          <p className="text-xs font-body text-ink-light">
                            {fmtTime(s.reading_seconds ?? 0)} · {(s.stumble_words ?? []).length} stumbles
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</p>
                          <p className="text-[10px] font-heading text-ink-muted">
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
