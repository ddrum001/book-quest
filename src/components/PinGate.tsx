'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bookquest_unlocked'
const CORRECT_PIN = process.env.NEXT_PUBLIC_APP_PIN ?? '0000'

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null) // null = not checked yet
  const [entry, setEntry] = useState('')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  function handleDigit(d: string) {
    if (entry.length >= 4) return
    const next = entry + d
    setEntry(next)

    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        localStorage.setItem(STORAGE_KEY, 'true')
        setUnlocked(true)
      } else {
        setShake(true)
        setTimeout(() => { setEntry(''); setShake(false) }, 600)
      }
    }
  }

  function handleDelete() {
    setEntry(prev => prev.slice(0, -1))
  }

  // Not checked yet — render nothing to avoid flash
  if (unlocked === null) return null

  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-parchment px-6">
      <div className="text-7xl mb-4">📚</div>
      <h1 className="text-4xl font-heading font-bold text-gold mb-1">Book Quest</h1>
      <p className="text-ink-light font-body mb-10">Enter your secret code</p>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-10 ${shake ? 'animate-bounce' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-colors duration-150 ${
              i < entry.length ? 'bg-gold border-gold' : 'border-ink-muted bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="h-16 rounded-2xl bg-white border border-gold/20 text-2xl font-heading font-bold text-ink shadow-sm active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
        {/* Bottom row: empty, 0, delete */}
        <div />
        <button
          onClick={() => handleDigit('0')}
          className="h-16 rounded-2xl bg-white border border-gold/20 text-2xl font-heading font-bold text-ink shadow-sm active:scale-95 transition-transform"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-16 rounded-2xl bg-white border border-gold/20 text-xl font-heading text-ink-light shadow-sm active:scale-95 transition-transform"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
