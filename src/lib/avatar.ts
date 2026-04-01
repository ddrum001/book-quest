// DiceBear avataaars option mappings
// skinColor and hairColor use 6-digit hex (no #)

export const SKIN_TONES: Record<string, { name: string; hex: string }> = {
  ffdbb4: { name: 'Pale',       hex: '#ffdbb4' },
  edb98a: { name: 'Light',      hex: '#edb98a' },
  fd9841: { name: 'Tanned',     hex: '#fd9841' },
  d08b5b: { name: 'Brown',      hex: '#d08b5b' },
  ae5d29: { name: 'Dark Brown', hex: '#ae5d29' },
  '614335': { name: 'Deep',     hex: '#614335' },
}

export const HAIR_COLORS: Record<string, { name: string; hex: string }> = {
  '2c1b18': { name: 'Black',    hex: '#2c1b18' },
  '4a312c': { name: 'Dark Brown', hex: '#4a312c' },
  '724133': { name: 'Brown',    hex: '#724133' },
  a55728:   { name: 'Auburn',   hex: '#a55728' },
  b58143:   { name: 'Blonde',   hex: '#b58143' },
  d6b370:   { name: 'Golden',   hex: '#d6b370' },
  c93305:   { name: 'Red',      hex: '#c93305' },
  f59797:   { name: 'Pink',     hex: '#f59797' },
  ecdcbf:   { name: 'Platinum', hex: '#ecdcbf' },
  e8e1e1:   { name: 'Silver',   hex: '#e8e1e1' },
}

export const EYE_STYLES: Record<string, { name: string; emoji: string }> = {
  default:   { name: 'Default',   emoji: '😊' },
  happy:     { name: 'Happy',     emoji: '😄' },
  wink:      { name: 'Wink',      emoji: '😉' },
  hearts:    { name: 'Hearts',    emoji: '😍' },
  side:      { name: 'Side-eye',  emoji: '😏' },
  squint:    { name: 'Squint',    emoji: '😤' },
  surprised: { name: 'Surprised', emoji: '😮' },
  closed:    { name: 'Closed',    emoji: '😌' },
}

export const EYEBROW_STYLES: Record<string, { name: string; emoji: string }> = {
  defaultNatural:      { name: 'Natural',   emoji: '🙂' },
  raisedExcitedNatural:{ name: 'Raised',    emoji: '😲' },
  angryNatural:        { name: 'Fierce',    emoji: '😤' },
  sadConcernedNatural: { name: 'Gentle',    emoji: '🥺' },
  upDownNatural:       { name: 'Expressive',emoji: '🤔' },
}

export const MOUTH_STYLES: Record<string, { name: string; emoji: string }> = {
  smile:   { name: 'Smile',   emoji: '😊' },
  twinkle: { name: 'Twinkle', emoji: '🙂' },
  tongue:  { name: 'Tongue',  emoji: '😛' },
  default: { name: 'Neutral', emoji: '😐' },
  serious: { name: 'Serious', emoji: '😑' },
  eating:  { name: 'Eating',  emoji: '😋' },
}
