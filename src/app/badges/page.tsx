'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BADGE_INFO, type BadgeId, type User } from '@/lib/types'
import { Avatar } from '@/components/Avatar'

const BADGE_ORDER: BadgeId[] = [
  'first_tale',
  'voice_reader',
  'bookworm',
  'world_explorer',
  'streak_2',
  'streak_3',
  'streak_5',
  'streak_7',
  'streak_10',
  'streak_14',
  'streak_21',
  'streak_30',
  'streak_60',
]

export default function BadgesPage() {
  const router = useRouter()
  const [earned, setEarned] = useState<Set<BadgeId>>(new Set())
  const [avatarEquipped, setAvatarEquipped] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('bookquest_user_id')
    if (!userId) { router.push('/'); return }

    const supabase = createClient()
    Promise.all([
      supabase.from('badges').select('badge_id').eq('user_id', userId),
      supabase.from('users').select('avatar_equipped').eq('id', userId).single(),
    ]).then(([{ data: badgeData }, { data: userData }]) => {
      setEarned(new Set((badgeData ?? []).map(r => r.badge_id as BadgeId)))
      setAvatarEquipped((userData as User | null)?.avatar_equipped ?? {})
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-parchment">
        <p className="text-gold text-2xl font-heading animate-pulse">Loading badges…</p>
      </div>
    )
  }

  const earnedCount = BADGE_ORDER.filter(id => earned.has(id)).length

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      {/* Header */}
      <header className="shrink-0 px-6 pt-8 pb-4">
        <button
          onClick={() => router.push('/')}
          className="text-ink-light font-heading text-sm mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="flex items-center gap-5">
          <Avatar equipped={avatarEquipped} variant="full" size={90} />
          <div>
            <h1 className="text-3xl font-heading font-bold text-ink">🏆 Badges</h1>
            <p className="text-ink-light font-body text-sm mt-1">
              {earnedCount} of {BADGE_ORDER.length} earned
            </p>
            <button
              onClick={() => router.push('/store')}
              className="mt-2 text-xs font-heading font-semibold text-gold underline"
            >
              Customize avatar →
            </button>
          </div>
        </div>
      </header>

      {/* Badge grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <div className="flex flex-col gap-3">
          {BADGE_ORDER.map(id => {
            const info = BADGE_INFO[id]
            const isEarned = earned.has(id)
            return (
              <div
                key={id}
                className={`flex items-center gap-4 rounded-3xl px-5 py-4 border transition-all ${
                  isEarned
                    ? 'bg-white border-gold/30 shadow-sm'
                    : 'bg-white/50 border-gold/10'
                }`}
              >
                <span className={`text-4xl ${isEarned ? '' : 'grayscale opacity-30'}`}>
                  {info.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-heading font-bold ${isEarned ? 'text-ink' : 'text-ink-muted'}`}>
                    {info.name}
                  </p>
                  <p className={`text-sm font-body ${isEarned ? 'text-ink-light' : 'text-ink-muted'}`}>
                    {info.description}
                  </p>
                </div>
                {isEarned && (
                  <span className="text-gold text-xl shrink-0">✓</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
