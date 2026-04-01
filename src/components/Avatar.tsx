'use client'

import { createAvatar } from '@dicebear/core'
import * as avataaars from '@dicebear/avataaars'

interface AvatarProps {
  equipped: Record<string, string>
  /** 'circle' = rounded portrait crop
   *  'full'   = full square portrait */
  variant?: 'circle' | 'full'
  size?: number
  className?: string
}

function buildSvg(equipped: Record<string, string>): string {
  const eq = equipped ?? {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avatar = createAvatar(avataaars as any, {
    seed:                   'bookquest-fixed',
    skinColor:              [eq.skinColor        ?? 'edb98a'],
    hairColor:              [eq.hairColor        ?? '4a312c'],
    top:                    [eq.top              ?? 'longButNotTooLong'],
    topProbability:         100,
    eyes:                   [eq.eyes             ?? 'default'],
    eyebrows:               [eq.eyebrows         ?? 'defaultNatural'],
    mouth:                  [eq.mouth            ?? 'smile'],
    clothing:               [eq.clothing         ?? 'shirtScoopNeck'],
    clothesColor:           [eq.clothesColor     ?? 'ff5c5c'],
    accessories:            eq.accessories ? [eq.accessories] : [],
    accessoriesProbability: eq.accessories ? 100 : 0,
    facialHairProbability:  0,
    backgroundColor:        [eq.backgroundColor  ?? 'b6e3f4'],
    backgroundType:         ['solid'],
  })

  return avatar.toString()
    .replace(/width="[^"]*"/, 'width="100%"')
    .replace(/height="[^"]*"/, 'height="100%"')
}

export function Avatar({ equipped, variant = 'circle', size, className = '' }: AvatarProps) {
  const svg = buildSvg(equipped ?? {})

  if (variant === 'full') {
    const w = size ?? 140
    return (
      <div
        className={className}
        style={{ width: w, height: w, flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  const w = size ?? 72
  return (
    <div
      className={`rounded-full overflow-hidden border-2 border-gold/30 shrink-0 ${className}`}
      style={{ width: w, height: w, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
