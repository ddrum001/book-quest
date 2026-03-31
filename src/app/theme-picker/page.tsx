'use client'

import { useRouter } from 'next/navigation'
import { THEMES } from '@/lib/types'

export default function ThemePickerPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <header className="px-6 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="text-ink-light font-heading flex items-center gap-1 mb-4 min-h-0"
        >
          ← Back
        </button>
        <h1 className="text-4xl font-heading font-bold text-ink">Choose Your World</h1>
        <p className="text-ink-light font-body mt-1">Where will today&apos;s adventure take you?</p>
      </header>

      <div className="flex flex-col gap-4 px-6 pb-10">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => router.push(`/story?theme=${theme.id}`)}
            className="flex items-center gap-4 p-5 rounded-3xl bg-white border-2 active:scale-[0.98] transition-transform text-left w-full shadow-sm"
            style={{ borderColor: theme.color }}
          >
            <span className="text-5xl shrink-0">{theme.emoji}</span>
            <div>
              <div className="text-xl font-heading font-bold" style={{ color: theme.color }}>
                {theme.name}
              </div>
              <div className="text-ink-light font-body text-sm mt-0.5 leading-snug">
                {theme.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
