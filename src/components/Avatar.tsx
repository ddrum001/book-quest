'use client'

import { STORE_ITEMS } from '@/lib/types'
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, COSTUME_BODY } from '@/lib/avatar'

interface AvatarProps {
  equipped: Record<string, string>
  /** 'circle' = square crop of face shown inside a rounded-full div
   *  'full'   = full standing body */
  variant?: 'circle' | 'full'
  /** Pixel width of the rendered element */
  size?: number
  className?: string
}

// ── Character drawing ─────────────────────────────────────────────────────────
// Single coordinate space: viewBox "0 0 80 155"
// Head center (40, 52) r=22

function CharacterSVG({
  skinColor, hairColor, eyeColor,
  bodyColor, legsColor, bgColor,
  costumeEmoji, accessoryEmoji,
  viewBox,
}: {
  skinColor: string; hairColor: string; eyeColor: string
  bodyColor: string; legsColor: string; bgColor: string
  costumeEmoji?: string; accessoryEmoji?: string; viewBox: string
}) {
  // Slightly darker skin for shadows / ear inner
  const shadowSkin = skinColor + 'CC'

  return (
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}>

      {/* Background */}
      <rect x="0" y="0" width="80" height="155" rx="16" fill={bgColor} />

      {/* ── Accessory (above hair) ── */}
      {accessoryEmoji && (
        <text x="40" y="12" textAnchor="middle" fontSize="15" dominantBaseline="middle">
          {accessoryEmoji}
        </text>
      )}

      {/* ── Side hair — rendered BEHIND head ── */}
      <path
        d="M 20,52 C 12,62 10,78 12,90 C 14,100 20,103 24,100 C 22,88 21,70 22,54 Z"
        fill={hairColor}
      />
      <path
        d="M 60,52 C 68,62 70,78 68,90 C 66,100 60,103 56,100 C 58,88 59,70 58,54 Z"
        fill={hairColor}
      />

      {/* ── Ears — behind head ── */}
      <ellipse cx="17.5" cy="53" rx="5" ry="7.5" fill={skinColor} />
      <ellipse cx="62.5" cy="53" rx="5" ry="7.5" fill={skinColor} />
      {/* Inner ear */}
      <ellipse cx="18.5" cy="53" rx="2.8" ry="4.5" fill={shadowSkin} opacity="0.4" />
      <ellipse cx="61.5" cy="53" rx="2.8" ry="4.5" fill={shadowSkin} opacity="0.4" />

      {/* ── Head ── */}
      <circle cx="40" cy="52" r="22" fill={skinColor} />
      {/* Subtle chin shadow */}
      <ellipse cx="40" cy="71" rx="14" ry="4" fill={shadowSkin} opacity="0.25" />

      {/* ── Hair top mass (over head) ── */}
      <ellipse cx="40" cy="32" rx="23.5" ry="18" fill={hairColor} />

      {/* ── Bangs (organic fringe over forehead) ── */}
      <path
        d="M 19,47 C 24,56 34,55 40,53 C 46,55 56,56 61,47 C 54,33 26,33 19,47 Z"
        fill={hairColor}
      />
      {/* Subtle hair strand lines in bangs */}
      <path d="M 30,47 C 31,42 33,38 35,36" stroke={hairColor} strokeWidth="1.5"
        fill="none" opacity="0.5" />
      <path d="M 40,46 C 40,41 40,37 40,34" stroke={hairColor} strokeWidth="1.5"
        fill="none" opacity="0.5" />
      <path d="M 50,47 C 49,42 47,38 45,36" stroke={hairColor} strokeWidth="1.5"
        fill="none" opacity="0.5" />

      {/* ── Cheek blush ── */}
      <ellipse cx="22" cy="60" rx="8" ry="5" fill="#FF6B6B" opacity="0.15" />
      <ellipse cx="58" cy="60" rx="8" ry="5" fill="#FF6B6B" opacity="0.15" />

      {/* ── Eyebrows (match hair color) ── */}
      <path d="M 23,43 Q 30,39 37,42"
        stroke={hairColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M 43,42 Q 50,39 57,43"
        stroke={hairColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* ── Left eye ── */}
      {/* White almond */}
      <ellipse cx="30" cy="51" rx="7" ry="5.5" fill="white" />
      {/* Upper eyelid shadow */}
      <path d="M 23,48 Q 30,44 37,48"
        stroke="#00000022" strokeWidth="3" fill="none" />
      {/* Iris */}
      <circle cx="30" cy="51" r="4" fill={eyeColor} />
      {/* Pupil */}
      <circle cx="31" cy="50" r="2.2" fill="#111" />
      {/* Highlights */}
      <circle cx="30.3" cy="48.8" r="1.1" fill="white" opacity="0.85" />
      <circle cx="32.8" cy="51.8" r="0.6" fill="white" opacity="0.5" />
      {/* Lash line */}
      <path d="M 23,47.5 Q 30,44 37,47.5"
        stroke="#222" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* ── Right eye ── */}
      <ellipse cx="50" cy="51" rx="7" ry="5.5" fill="white" />
      <path d="M 43,48 Q 50,44 57,48"
        stroke="#00000022" strokeWidth="3" fill="none" />
      <circle cx="50" cy="51" r="4" fill={eyeColor} />
      <circle cx="51" cy="50" r="2.2" fill="#111" />
      <circle cx="50.3" cy="48.8" r="1.1" fill="white" opacity="0.85" />
      <circle cx="52.8" cy="51.8" r="0.6" fill="white" opacity="0.5" />
      <path d="M 43,47.5 Q 50,44 57,47.5"
        stroke="#222" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* ── Nose ── */}
      <path d="M 37,64 C 36,67 38,68 40,67 C 42,68 44,67 43,64"
        stroke="#C09080" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* ── Mouth / lips ── */}
      {/* Upper lip — cupid's bow */}
      <path d="M 33,71 C 35,68 37.5,69.5 40,70.5 C 42.5,69.5 45,68 47,71"
        stroke="#C07070" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Lower lip fill */}
      <path d="M 33,71 C 37,77.5 43,77.5 47,71"
        fill="#E09090" opacity="0.45" />
      {/* Lower lip line */}
      <path d="M 33,71 C 37,77.5 43,77.5 47,71"
        stroke="#C07070" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Neck ── */}
      <rect x="35" y="72" width="10" height="8" rx="3" fill={skinColor} />

      {/* ── Left arm ── */}
      <rect x="7" y="80" width="13" height="36" rx="6.5" fill={bodyColor} />
      {/* Left hand */}
      <ellipse cx="13.5" cy="118" rx="7" ry="6" fill={skinColor} />
      {/* Finger hints */}
      <path d="M 9,115 C 8,110 9,108 10.5,109" stroke={shadowSkin} strokeWidth="0.8"
        fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 13.5,113 C 13,108 14,106 15.5,107" stroke={shadowSkin} strokeWidth="0.8"
        fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 18,115 C 18,110 18,108 16.5,109" stroke={shadowSkin} strokeWidth="0.8"
        fill="none" strokeLinecap="round" opacity="0.6" />

      {/* ── Right arm ── */}
      <rect x="60" y="80" width="13" height="36" rx="6.5" fill={bodyColor} />
      {/* Right hand */}
      <ellipse cx="66.5" cy="118" rx="7" ry="6" fill={skinColor} />
      <path d="M 62,115 C 61,110 62,108 63.5,109" stroke={shadowSkin} strokeWidth="0.8"
        fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 66.5,113 C 66,108 67,106 68.5,107" stroke={shadowSkin} strokeWidth="0.8"
        fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 71,115 C 71,110 71,108 69.5,109" stroke={shadowSkin} strokeWidth="0.8"
        fill="none" strokeLinecap="round" opacity="0.6" />

      {/* ── Body / torso ── */}
      <rect x="19" y="78" width="42" height="44" rx="10" fill={bodyColor} />
      {/* Collar / neckline */}
      <path d="M 29,79 C 33,74 37,75 40,76 C 43,75 47,74 51,79"
        fill={bodyColor} stroke={bodyColor} strokeWidth="0" />
      <path d="M 30,79 C 34,73 38,74 40,75 C 42,74 46,73 50,79"
        stroke="#00000015" strokeWidth="1.5" fill="none" />
      {/* Costume emoji */}
      {costumeEmoji && (
        <text x="40" y="103" textAnchor="middle" fontSize="21" dominantBaseline="middle">
          {costumeEmoji}
        </text>
      )}

      {/* ── Legs ── */}
      <rect x="21" y="119" width="16" height="32" rx="7" fill={legsColor} />
      <rect x="43" y="119" width="16" height="32" rx="7" fill={legsColor} />
      {/* Knee hint */}
      <ellipse cx="29" cy="133" rx="6" ry="3.5" fill="#00000010" />
      <ellipse cx="51" cy="133" rx="6" ry="3.5" fill="#00000010" />

      {/* ── Shoes ── */}
      <ellipse cx="29" cy="152" rx="12" ry="5.5" fill="#2C2C2C" />
      <ellipse cx="51" cy="152" rx="12" ry="5.5" fill="#2C2C2C" />
      {/* Shoe highlight */}
      <ellipse cx="26" cy="150" rx="5" ry="2" fill="white" opacity="0.15" />
      <ellipse cx="48" cy="150" rx="5" ry="2" fill="white" opacity="0.15" />
    </svg>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function Avatar({ equipped, variant = 'circle', size, className = '' }: AvatarProps) {
  const eq = equipped ?? {}

  const skinColor  = SKIN_TONES[eq.skin   ?? 'light']?.color       ?? '#EEB98A'
  const hairColor  = HAIR_COLORS[eq.hair  ?? 'dark_brown']?.color   ?? '#3C1808'
  const eyeColor   = EYE_COLORS[eq.eyes   ?? 'brown']?.color        ?? '#7B4A2E'
  const bgItem     = STORE_ITEMS.find(i => i.id === eq.background)
  const bgColor    = bgItem?.color ?? '#FDF6EC'
  const costume    = STORE_ITEMS.find(i => i.id === eq.costume)
  const accessory  = STORE_ITEMS.find(i => i.id === eq.accessory)
  const { body: bodyColor, legs: legsColor } =
    COSTUME_BODY[eq.costume ?? 'default'] ?? COSTUME_BODY.default

  const props = {
    skinColor, hairColor, eyeColor,
    bodyColor, legsColor, bgColor,
    costumeEmoji: costume?.emoji,
    accessoryEmoji: accessory?.emoji,
  }

  if (variant === 'full') {
    const w = size ?? 140
    const h = Math.round(w * (155 / 80))
    return (
      <div className={className} style={{ width: w, height: h, flexShrink: 0 }}>
        <CharacterSVG {...props} viewBox="0 0 80 155" />
      </div>
    )
  }

  // Circle variant — crop to face/head
  const w = size ?? 72
  return (
    <div
      className={`rounded-full overflow-hidden border-2 border-gold/30 shrink-0 ${className}`}
      style={{ width: w, height: w, flexShrink: 0 }}
    >
      <CharacterSVG {...props} viewBox="5 14 70 70" />
    </div>
  )
}
