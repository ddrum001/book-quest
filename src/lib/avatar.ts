export const SKIN_TONES: Record<string, { name: string; color: string }> = {
  fair:   { name: 'Fair',       color: '#FDDBB4' },
  light:  { name: 'Light',      color: '#EEB98A' },
  medium: { name: 'Medium',     color: '#D08B5B' },
  tan:    { name: 'Tan',        color: '#AE6836' },
  dark:   { name: 'Dark',       color: '#7B4020' },
  deep:   { name: 'Deep',       color: '#4A2210' },
}

export const HAIR_COLORS: Record<string, { name: string; color: string }> = {
  black:       { name: 'Black',       color: '#1A0800' },
  dark_brown:  { name: 'Dark Brown',  color: '#3C1808' },
  brown:       { name: 'Brown',       color: '#6B3520' },
  auburn:      { name: 'Auburn',      color: '#8B3103' },
  light_brown: { name: 'Light Brown', color: '#A07050' },
  blonde:      { name: 'Blonde',      color: '#D4A827' },
  red:         { name: 'Red',         color: '#AA2200' },
  grey:        { name: 'Grey',        color: '#909090' },
}

export const EYE_COLORS: Record<string, { name: string; color: string }> = {
  dark_brown: { name: 'Dark Brown', color: '#3E1F00' },
  brown:      { name: 'Brown',      color: '#7B4A2E' },
  hazel:      { name: 'Hazel',      color: '#8B7040' },
  green:      { name: 'Green',      color: '#2E7D32' },
  blue:       { name: 'Blue',       color: '#1565C0' },
  grey:       { name: 'Grey',       color: '#607D8B' },
}

// Body and leg colors for each costume ID
export const COSTUME_BODY: Record<string, { body: string; legs: string }> = {
  default:    { body: '#90CAF9', legs: '#3F51B5' },
  bunny:      { body: '#F8BBD9', legs: '#F48FB1' },
  fairy:      { body: '#CE93D8', legs: '#AB47BC' },
  astronaut:  { body: '#ECEFF1', legs: '#90A4AE' },
  wizard:     { body: '#7B1FA2', legs: '#4A148C' },
  unicorn:    { body: '#F5F5F5', legs: '#E0E0E0' },
  dragon:     { body: '#2E7D32', legs: '#1B5E20' },
}
