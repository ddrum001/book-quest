export interface User {
  id: string
  child_name: string
  total_xp: number
  total_stars: number
  stories_read: number
  current_streak: number
  longest_streak: number
  coins: number
  avatar_equipped: Record<string, string>
  created_at: string
}

export interface StoreItem {
  id: string
  name: string
  description: string
  cost: number
  category: 'costume' | 'accessory' | 'background'
  emoji: string
  color?: string   // background items only
}

export const STORE_ITEMS: StoreItem[] = [
  // ── Costumes ────────────────────────────────────────────────────────────────
  { id: 'bunny',     category: 'costume',    name: 'Bunny Costume',   emoji: '🐰', cost: 50,  description: 'Dress up just like Trixie!' },
  { id: 'fairy',     category: 'costume',    name: 'Fairy',           emoji: '🧚', cost: 65,  description: 'Flutter through every page!' },
  { id: 'astronaut', category: 'costume',    name: 'Space Explorer',  emoji: '👩‍🚀', cost: 70,  description: 'Blast off to adventure!' },
  { id: 'wizard',    category: 'costume',    name: 'Wizard Robe',     emoji: '🧙', cost: 75,  description: 'Cast magical reading spells!' },
  { id: 'unicorn',   category: 'costume',    name: 'Unicorn',         emoji: '🦄', cost: 80,  description: 'Magical and majestic!' },
  { id: 'dragon',    category: 'costume',    name: 'Dragon',          emoji: '🐲', cost: 100, description: 'Breathe fire and read stories!' },
  // ── Accessories ─────────────────────────────────────────────────────────────
  { id: 'bow',       category: 'accessory',  name: 'Sparkle Bow',     emoji: '🎀', cost: 20,  description: 'A pretty finishing touch!' },
  { id: 'wand',      category: 'accessory',  name: 'Star Wand',       emoji: '⭐', cost: 25,  description: 'Wave it and stories appear!' },
  { id: 'crown',     category: 'accessory',  name: 'Golden Crown',    emoji: '👑', cost: 30,  description: 'For reading royalty!' },
  { id: 'glasses',   category: 'accessory',  name: 'Bookworm Specs',  emoji: '🤓', cost: 35,  description: 'Extra bookworm points!' },
  { id: 'halo',      category: 'accessory',  name: 'Halo',            emoji: '😇', cost: 40,  description: 'For the perfect reader!' },
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  { id: 'bg_rose',   category: 'background', name: 'Rose Garden',     emoji: '🌸', cost: 30,  description: 'Pretty as a petal!',       color: '#FCE7F3' },
  { id: 'bg_sky',    category: 'background', name: 'Blue Sky',        emoji: '☀️', cost: 30,  description: 'A bright sunny day!',      color: '#DBEAFE' },
  { id: 'bg_forest', category: 'background', name: 'Magic Forest',    emoji: '🌿', cost: 35,  description: 'Deep in the magic woods!', color: '#DCFCE7' },
  { id: 'bg_sunset', category: 'background', name: 'Golden Sunset',   emoji: '🌅', cost: 35,  description: 'Warm and cozy!',           color: '#FEF3C7' },
  { id: 'bg_ocean',  category: 'background', name: 'Ocean Deep',      emoji: '🌊', cost: 35,  description: 'Dive into adventure!',     color: '#E0F2FE' },
  { id: 'bg_night',  category: 'background', name: 'Starry Night',    emoji: '🌙', cost: 40,  description: 'Wish upon a star!',        color: '#EDE9FE' },
]

export interface ReadingSession {
  id: string
  user_id: string
  theme: string
  story_text: string | null
  quiz_score: number | null
  stars_earned: number | null
  vocab_words: string[] | null
  stumble_words: string[] | null
  completed_at: string
}

export interface Badge {
  id: string
  user_id: string
  badge_id: BadgeId
  earned_at: string
}

export type BadgeId =
  | 'first_tale'
  | 'quiz_ace'
  | 'word_wizard'
  | 'star_collector'
  | 'bookworm'
  | 'voice_reader'
  | 'world_explorer'
  | 'streak_2'
  | 'streak_3'
  | 'streak_5'
  | 'streak_7'
  | 'streak_10'
  | 'streak_14'
  | 'streak_21'
  | 'streak_30'
  | 'streak_60'

export type ThemeId =
  | 'dragon-kingdom'
  | 'ocean-depths'
  | 'star-explorer'
  | 'enchanted-forest'
  | 'pirate-seas'

export interface ThemeConfig {
  id: ThemeId
  name: string
  emoji: string
  color: string
  bg: string
  description: string
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'dragon-kingdom',
    name: 'Dragon Kingdom',
    emoji: '🐉',
    color: '#C0392B',
    bg: '#FFF0EE',
    description: 'Soar through ancient mountains with brave dragons!',
  },
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    emoji: '🐠',
    color: '#2980B9',
    bg: '#EEF6FF',
    description: 'Dive into a world of glowing coral and sea creatures!',
  },
  {
    id: 'star-explorer',
    name: 'Star Explorer',
    emoji: '🚀',
    color: '#8E44AD',
    bg: '#F5EEFF',
    description: 'Blast off to distant planets and cosmic wonders!',
  },
  {
    id: 'enchanted-forest',
    name: 'Enchanted Forest',
    emoji: '🌿',
    color: '#27AE60',
    bg: '#EFFFEF',
    description: 'Wander through a magical forest full of secrets!',
  },
  {
    id: 'pirate-seas',
    name: 'Pirate Seas',
    emoji: '🏴‍☠️',
    color: '#D35400',
    bg: '#FFF8EE',
    description: 'Set sail for treasure on the high seas!',
  },
]

export const BADGE_INFO: Record<BadgeId, { name: string; emoji: string; description: string }> = {
  first_tale: { name: 'First Tale', emoji: '📖', description: 'Finished your very first story!' },
  quiz_ace: { name: 'Quiz Ace', emoji: '🎯', description: 'Got a perfect score on a quiz!' },
  word_wizard: { name: 'Word Wizard', emoji: '✨', description: 'Unscrambled all the words!' },
  star_collector: { name: 'Star Collector', emoji: '⭐', description: 'Earned 3 stars in one session!' },
  bookworm: { name: 'Bookworm', emoji: '🐛', description: 'Read 5 stories!' },
  voice_reader: { name: 'Voice Reader', emoji: '🎤', description: 'Finished a story aloud!' },
  world_explorer: { name: 'World Explorer', emoji: '🌍', description: 'Explored all 5 adventure themes!' },
  streak_2:  { name: '2-Day Streak',    emoji: '🔥', description: 'Read 2 days in a row!' },
  streak_3:  { name: '3-Day Streak',    emoji: '🔥', description: 'Read 3 days in a row!' },
  streak_5:  { name: '5-Day Streak',    emoji: '🔥', description: 'Read 5 days in a row!' },
  streak_7:  { name: '1-Week Streak',   emoji: '🏅', description: 'Read every day for a whole week!' },
  streak_10: { name: '10-Day Streak',   emoji: '🏅', description: 'Read 10 days in a row!' },
  streak_14: { name: '2-Week Streak',   emoji: '🥇', description: 'Two full weeks of reading!' },
  streak_21: { name: '3-Week Streak',   emoji: '🥇', description: 'Three weeks straight — incredible!' },
  streak_30: { name: '30-Day Streak',   emoji: '👑', description: 'A whole month of daily reading!' },
  streak_60: { name: '60-Day Streak',   emoji: '👑', description: 'Two months of reading every single day!' },
}

export const XP_PER_LEVEL = 100

export function getLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1
}

export function getXpInCurrentLevel(totalXp: number): number {
  return totalXp % XP_PER_LEVEL
}

export interface StoryData {
  title: string
  story: string
  imagePrompt: string
  vocab: { word: string; hint: string }[]
}

export interface QuizData {
  questions: {
    q: string
    options: [string, string, string, string]
    answer: string
  }[]
}
