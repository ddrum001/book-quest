// Pet configuration constants

// Maps store item ID → bottts seed string (seed determines the bot's entire look)
export const PET_SEEDS: Record<string, string> = {
  'pet-sparky': 'Sparky',
  'pet-cosmo':  'Cosmo',
  'pet-luna':   'Luna',
  'pet-rex':    'Rex',
  'pet-pixel':  'Pixel',
  'pet-nova':   'Nova',
}

// Maps petAccessory item ID → display emoji (overlaid on top of the bot)
export const PET_ACCESSORY_EMOJIS: Record<string, string> = {
  'petacc-bow':     '🎀',
  'petacc-crown':   '👑',
  'petacc-hat':     '🎩',
  'petacc-star':    '⭐',
  'petacc-flowers': '🌸',
  'petacc-halo':    '✨',
}

// Maps petBackground item ID → 6-digit hex (no #), same format as avatar backgroundColor
export const PET_BACKGROUND_COLORS: Record<string, string> = {
  'petbg-golden': 'fff4bd',
  'petbg-cosmic': 'e8d5ff',
  'petbg-sky':    'b6e3f4',
  'petbg-forest': 'd1f4e0',
  'petbg-rose':   'fce4ec',
  'petbg-sunset': 'ffd5b5',
}
