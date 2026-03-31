export interface User {
  id: string
  child_name: string
  total_xp: number
  total_stars: number
  stories_read: number
  created_at: string
}

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
  vocab: { word: string; hint: string }[]
}

export interface QuizData {
  questions: {
    q: string
    options: [string, string, string, string]
    answer: string
  }[]
}
