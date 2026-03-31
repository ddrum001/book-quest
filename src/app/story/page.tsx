'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { THEMES } from '@/lib/types'
import { Suspense } from 'react'

function StoryPlaceholder() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const themeId = searchParams.get('theme')
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]

  return (
    <div className="flex flex-col bg-parchment min-h-screen">
      <header className="px-6 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="text-ink-light font-heading flex items-center gap-1 mb-4 min-h-0"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{theme.emoji}</span>
          <div>
            <h1 className="text-2xl font-heading font-bold" style={{ color: theme.color }}>
              {theme.name}
            </h1>
            <p className="text-ink-light font-body text-sm">Story loading soon…</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✨</div>
          <p className="text-2xl font-heading font-semibold text-ink">Story screen coming soon!</p>
          <p className="text-ink-light font-body mt-2">This is where the karaoke reader will live.</p>
        </div>
      </div>
    </div>
  )
}

export default function StoryPage() {
  return (
    <Suspense>
      <StoryPlaceholder />
    </Suspense>
  )
}
