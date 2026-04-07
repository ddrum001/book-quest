'use client'

import { createAvatar } from '@dicebear/core'
import * as bottts from '@dicebear/bottts'
import { PET_SEEDS, PET_ACCESSORY_EMOJIS, PET_BACKGROUND_COLORS } from '@/lib/pet'

interface PetAvatarProps {
  equipped: Record<string, string>
  size?: number
  className?: string
}

function buildPetSvg(equipped: Record<string, string>): string {
  const seed  = PET_SEEDS[equipped.pet ?? ''] ?? 'bookquest-pet'
  const bgHex = PET_BACKGROUND_COLORS[equipped.petBackground ?? ''] ?? 'b6e3f4'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avatar = createAvatar(bottts as any, {
    seed,
    backgroundColor: [bgHex],
    backgroundType:  ['solid'],
  })

  return avatar.toString()
    .replace(/width="[^"]*"/,  'width="100%"')
    .replace(/height="[^"]*"/, 'height="100%"')
}

export function PetAvatar({ equipped, size = 80, className = '' }: PetAvatarProps) {
  const svg          = buildPetSvg(equipped)
  const accessory    = equipped.petAccessory ? PET_ACCESSORY_EMOJIS[equipped.petAccessory] : null
  const accessoryPx  = Math.round(size * 0.33)

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden border-2 border-gold/30"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {accessory && (
        <div
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 select-none pointer-events-none leading-none"
          style={{ fontSize: accessoryPx }}
        >
          {accessory}
        </div>
      )}
    </div>
  )
}
