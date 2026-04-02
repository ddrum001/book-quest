'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STORE_ITEMS, type StoreItem, type User } from '@/lib/types'
import { SKIN_TONES, HAIR_COLORS, EYE_STYLES, EYEBROW_STYLES, MOUTH_STYLES } from '@/lib/avatar'
import { Avatar } from '@/components/Avatar'

type Tab = 'top' | 'clothing' | 'accessories' | 'backgroundColor' | 'customize'
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'top',             label: 'Hair',        emoji: '💇' },
  { key: 'clothing',        label: 'Outfits',     emoji: '👕' },
  { key: 'accessories',     label: 'Accessories', emoji: '✨' },
  { key: 'backgroundColor', label: 'Backgrounds', emoji: '🎨' },
  { key: 'customize',       label: 'Customize',   emoji: '🪄' },
]

export default function StorePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [equipped, setEquipped] = useState<Record<string, string>>({})
  const equippedRef = useRef<Record<string, string>>({})
  const [tab, setTab] = useState<Tab>('top')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Keep ref in sync so event handlers always read the latest equipped state
  equippedRef.current = equipped

  const userId = typeof window !== 'undefined' ? localStorage.getItem('bookquest_user_id') : null

  const load = useCallback(async () => {
    if (!userId) { router.push('/'); return }
    const supabase = createClient()
    const [{ data: userData }, { data: itemData }] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('user_items').select('item_id').eq('user_id', userId),
    ])
    if (!userData) { router.push('/'); return }
    setUser(userData as User)
    setOwnedIds(new Set((itemData ?? []).map((r: { item_id: string }) => r.item_id)))
    setEquipped((userData as User).avatar_equipped ?? {})
    setLoading(false)
  }, [userId, router])

  useEffect(() => { load() }, [load])

  async function saveEquipped(next: Record<string, string>) {
    // Read userId fresh — avoids stale closure when null during first render
    const uid = localStorage.getItem('bookquest_user_id')
    if (!uid) return
    equippedRef.current = next
    setEquipped(next)
    setUser(prev => prev ? { ...prev, avatar_equipped: next } : prev)
    setSaveStatus('saving')
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ avatar_equipped: next })
      .eq('id', uid)
      .select('id')
      .single()
    if (error) {
      setSaveStatus('error')
      console.error('[Avatar save]', error)
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  async function handleAppearance(key: string, value: string) {
    // Use ref so rapid taps always build on the latest state
    await saveEquipped({ ...equippedRef.current, [key]: value })
  }

  async function handleEquip(item: StoreItem) {
    const isEquipped = equippedRef.current[item.category] === item.id
    const next = { ...equippedRef.current }
    if (isEquipped) delete next[item.category]
    else next[item.category] = item.id
    await saveEquipped(next)
  }

  async function handleBuy(item: StoreItem) {
    if (!user || !userId || busy) return
    if ((user.coins ?? 0) < item.cost) return
    setBusy(item.id)
    const supabase = createClient()
    await Promise.all([
      supabase.from('users').update({ coins: user.coins - item.cost }).eq('id', userId),
      supabase.from('user_items').insert({ user_id: userId, item_id: item.id }),
    ])
    setUser(prev => prev ? { ...prev, coins: prev.coins - item.cost } : prev)
    setOwnedIds(prev => new Set([...prev, item.id]))
    // Auto-equip on purchase
    const next = { ...equippedRef.current, [item.category]: item.id }
    await saveEquipped(next)
    setBusy(null)
  }

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-parchment">
        <p className="text-gold text-2xl font-heading animate-pulse">Loading store…</p>
      </div>
    )
  }

  const storeItems = tab !== 'customize' ? STORE_ITEMS.filter(i => i.category === tab) : []

  return (
    <div className="flex flex-col bg-parchment min-h-screen max-h-screen">
      {/* Header */}
      <header className="shrink-0 px-6 pt-6 pb-3">
        <button onClick={() => router.push('/')} className="text-ink-light font-heading text-sm mb-3 flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold text-ink">🛍️ Quest Store</h1>
          <div className="flex items-center gap-2 bg-white border border-gold/30 rounded-2xl px-3 py-1.5">
            <span className="text-lg">🪙</span>
            <span className="font-heading font-bold text-gold text-lg">{user.coins ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Avatar preview */}
      <div className="shrink-0 flex flex-col items-center py-3 gap-1">
        <Avatar equipped={equipped} variant="full" size={120} />
        <p className={`text-xs font-heading transition-opacity duration-300 ${
          saveStatus === 'idle' ? 'opacity-0' :
          saveStatus === 'saving' ? 'opacity-100 text-ink-light' :
          saveStatus === 'saved' ? 'opacity-100 text-green-500' :
          'opacity-100 text-red-500'
        }`}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '⚠ Save failed' : '✓ Saved'}
        </p>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-2 px-6 pb-3 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-2 rounded-2xl font-heading font-semibold text-sm transition-colors ${
              tab === t.key ? 'bg-gold text-white' : 'bg-white border border-gold/20 text-ink-light'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col gap-3">

        {/* ── Store item tabs ── */}
        {tab !== 'customize' && storeItems.map(item => {
          const owned      = ownedIds.has(item.id)
          const isEquipped = equipped[item.category] === item.id
          const canAfford  = (user.coins ?? 0) >= item.cost
          const isBusy     = busy === item.id

          return (
            <div
              key={item.id}
              className={`bg-white rounded-3xl px-4 py-4 border flex items-center gap-4 ${
                isEquipped ? 'border-gold/50 shadow-md' : 'border-gold/20 shadow-sm'
              }`}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-black/5"
                style={{ backgroundColor: item.color }}
              >
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-ink">{item.name}</p>
                <p className="text-ink-light font-body text-xs">{item.description}</p>
                {!owned && (
                  <p className="text-gold font-heading font-semibold text-sm mt-0.5">{item.cost} 🪙</p>
                )}
              </div>
              {owned ? (
                <button
                  onClick={() => handleEquip(item)}
                  className={`shrink-0 px-4 py-2 rounded-2xl font-heading font-semibold text-sm active:scale-95 transition-transform ${
                    isEquipped ? 'bg-gold text-white' : 'bg-white border border-gold/30 text-ink'
                  }`}
                >
                  {isEquipped ? 'Equipped ✓' : 'Equip'}
                </button>
              ) : (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBusy}
                  className="shrink-0 px-4 py-2 rounded-2xl font-heading font-semibold text-sm bg-gold text-white disabled:opacity-40 active:scale-95 transition-transform"
                >
                  {isBusy ? '…' : 'Buy'}
                </button>
              )}
            </div>
          )
        })}

        {/* ── Customize tab ── */}
        {tab === 'customize' && (
          <>
            <p className="text-xs font-heading font-semibold text-ink-muted tracking-widest pt-1">
              FREE — no coins needed!
            </p>

            {/* Style presets */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Style Preset</p>
              <div className="flex gap-3">
                {[
                  { label: '👧 Girl',   top: 'longButNotTooLong', clothing: 'shirtScoopNeck', clothesColor: 'ff5c5c' },
                  { label: '👦 Boy',    top: 'shortCurly',        clothing: 'shirtCrewNeck',  clothesColor: '5199e4' },
                  { label: '🌈 Neutral',top: 'curly',             clothing: 'hoodie',         clothesColor: '65c9ff' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => saveEquipped({ ...equippedRef.current, top: preset.top, clothing: preset.clothing, clothesColor: preset.clothesColor })}
                    className="flex-1 py-3 rounded-2xl font-heading font-semibold text-sm border border-gold/20 bg-parchment text-ink active:scale-95 transition-transform"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skin tone */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Skin Tone</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(SKIN_TONES).map(([key, { name, hex }]) => (
                  <button
                    key={key}
                    onClick={() => handleAppearance('skinColor', key)}
                    title={name}
                    className={`w-10 h-10 rounded-full border-4 active:scale-90 transition-transform ${
                      (equipped.skinColor ?? 'edb98a') === key
                        ? 'border-gold shadow-md scale-110'
                        : 'border-white/60 shadow-sm'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Hair color */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Hair Color</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(HAIR_COLORS).map(([key, { name, hex }]) => (
                  <button
                    key={key}
                    onClick={() => handleAppearance('hairColor', key)}
                    title={name}
                    className={`w-10 h-10 rounded-full border-4 active:scale-90 transition-transform ${
                      (equipped.hairColor ?? '4a312c') === key
                        ? 'border-gold shadow-md scale-110'
                        : 'border-white/60 shadow-sm'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Eyes */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Eye Style</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EYE_STYLES).map(([key, { name, emoji }]) => (
                  <button
                    key={key}
                    onClick={() => handleAppearance('eyes', key)}
                    title={name}
                    className={`px-3 py-2 rounded-2xl font-heading text-sm active:scale-90 transition-transform border ${
                      (equipped.eyes ?? 'default') === key
                        ? 'bg-gold text-white border-gold'
                        : 'bg-white border-gold/20 text-ink'
                    }`}
                  >
                    {emoji} {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Eyebrows */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Eyebrows</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EYEBROW_STYLES).map(([key, { name, emoji }]) => (
                  <button
                    key={key}
                    onClick={() => handleAppearance('eyebrows', key)}
                    title={name}
                    className={`px-3 py-2 rounded-2xl font-heading text-sm active:scale-90 transition-transform border ${
                      (equipped.eyebrows ?? 'defaultNatural') === key
                        ? 'bg-gold text-white border-gold'
                        : 'bg-white border-gold/20 text-ink'
                    }`}
                  >
                    {emoji} {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Mouth */}
            <div className="bg-white rounded-3xl p-5 border border-gold/20 shadow-sm">
              <p className="font-heading font-bold text-ink mb-3">Mouth</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MOUTH_STYLES).map(([key, { name, emoji }]) => (
                  <button
                    key={key}
                    onClick={() => handleAppearance('mouth', key)}
                    title={name}
                    className={`px-3 py-2 rounded-2xl font-heading text-sm active:scale-90 transition-transform border ${
                      (equipped.mouth ?? 'smile') === key
                        ? 'bg-gold text-white border-gold'
                        : 'bg-white border-gold/20 text-ink'
                    }`}
                  >
                    {emoji} {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
