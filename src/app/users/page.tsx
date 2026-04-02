'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLevel, type User } from '@/lib/types'
import { Avatar } from '@/components/Avatar'

export default function UsersPage() {
  const router = useRouter()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setCurrentId(localStorage.getItem('bookquest_user_id'))
    const supabase = createClient()
    supabase
      .from('users')
      .select('*')
      .order('child_name')
      .then(({ data }) => {
        setAllUsers((data ?? []) as User[])
        setLoading(false)
      })
  }, [])

  function handleSelect(u: User) {
    localStorage.setItem('bookquest_user_id', u.id)
    router.push('/')
  }

  async function handleCreate(e: React.FormEvent) {
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
      setError(`"${existing.child_name}" already exists — pick them from the list above.`)
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
    localStorage.setItem('bookquest_user_id', data.id)
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-parchment">
        <p className="text-gold text-2xl font-heading animate-pulse">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <header className="shrink-0 px-6 pt-8 pb-4">
        <button
          onClick={() => router.push('/')}
          className="text-ink-light font-heading text-sm mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-heading font-bold text-ink">👤 Switch Reader</h1>
        <p className="text-ink-light font-body text-sm mt-1">Who&apos;s reading today?</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col gap-3">
        {allUsers.map(u => {
          const isActive = u.id === currentId
          return (
            <button
              key={u.id}
              onClick={() => handleSelect(u)}
              className={`w-full rounded-3xl px-5 py-4 flex items-center gap-4 text-left active:scale-95 transition-transform border ${
                isActive
                  ? 'bg-gold/10 border-gold/50 shadow-sm'
                  : 'bg-white border-gold/20 shadow-sm'
              }`}
            >
              <Avatar equipped={u.avatar_equipped ?? {}} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-bold text-ink text-xl">{u.child_name}</p>
                  {isActive && (
                    <span className="text-xs font-heading font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                      current
                    </span>
                  )}
                </div>
                <p className="text-ink-light font-body text-sm">
                  Level {getLevel(u.total_xp)} · {u.stories_read} {u.stories_read === 1 ? 'story' : 'stories'}
                  {(u.current_streak ?? 0) > 0 && ` · 🔥 ${u.current_streak} day streak`}
                </p>
              </div>
              <span className="text-gold text-2xl">›</span>
            </button>
          )
        })}

        {/* Add new reader */}
        {!showNewForm ? (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full bg-white border border-dashed border-gold/40 rounded-3xl px-5 py-4 font-heading font-semibold text-ink-light text-center active:scale-95 transition-transform"
          >
            + Add new reader
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gold/30 rounded-3xl px-5 py-5 flex flex-col gap-3"
          >
            <p className="font-heading font-semibold text-ink text-center">New reader name</p>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Type a name…"
              className="text-center text-xl font-heading px-4 py-3 rounded-2xl border-2 border-gold/40 bg-parchment focus:border-gold focus:outline-none"
              autoFocus
              maxLength={20}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={!nameInput.trim() || creating}
              className="bg-gold text-white font-heading font-bold text-lg py-3 rounded-2xl disabled:opacity-50 active:scale-95 transition-transform"
            >
              {creating ? 'Creating…' : 'Start Quest 🚀'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNameInput(''); setError('') }}
              className="text-ink-light font-heading text-sm text-center"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
