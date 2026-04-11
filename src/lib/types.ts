export interface User {
  id: string
  child_name: string
  total_xp: number
  total_stars: number
  stories_read: number
  current_streak: number
  longest_streak: number
  coins: number
  game_plays_available: number
  owned_items: string[]
  avatar_equipped: Record<string, string>
  created_at: string
}

export interface StoreItem {
  id: string          // also the DiceBear value (hex for backgroundColor, style name for others)
  name: string
  description: string
  cost: number
  category: 'top' | 'clothing' | 'accessories' | 'backgroundColor' | 'pet' | 'petAccessory' | 'petBackground'
  emoji: string
  color: string       // hex with # — used for preview swatch in store UI
}

export const STORE_ITEMS: StoreItem[] = [
  // ── Hair styles (top) ────────────────────────────────────────────────────────
  { id: 'bob',               category: 'top',             name: 'Cute Bob',          emoji: '✂️', cost: 30,  color: '#d6b370', description: 'A classic and cute bob cut!' },
  { id: 'bun',               category: 'top',             name: 'Top Bun',           emoji: '🎀', cost: 30,  color: '#724133', description: 'Stylish bun tied up high!' },
  { id: 'curly',             category: 'top',             name: 'Curly Waves',       emoji: '🌊', cost: 35,  color: '#a55728', description: 'Big beautiful curls!' },
  { id: 'longButNotTooLong', category: 'top',             name: 'Long & Lovely',     emoji: '✨', cost: 40,  color: '#b58143', description: 'Long, flowing locks!' },
  { id: 'bigHair',           category: 'top',             name: 'Big Hair',          emoji: '🦁', cost: 45,  color: '#c93305', description: 'Go big or go home!' },
  { id: 'frizzle',           category: 'top',             name: 'Frizzle',           emoji: '⚡', cost: 45,  color: '#4a312c', description: 'Wild and wonderful!' },
  { id: 'froBand',           category: 'top',             name: 'Fro with Band',     emoji: '🌟', cost: 50,  color: '#2c1b18', description: 'Rocking the fro!' },
  { id: 'miaWallace',        category: 'top',             name: 'Mia Style',         emoji: '🎬', cost: 50,  color: '#4a312c', description: 'Effortlessly cool!' },
  { id: 'shaggy',            category: 'top',             name: 'Shaggy',            emoji: '🐾', cost: 40,  color: '#724133', description: 'Relaxed and fun!' },
  { id: 'winterHat02',       category: 'top',             name: 'Winter Hat',        emoji: '🧢', cost: 55,  color: '#5C3317', description: 'Stay cozy and cute!' },
  { id: 'hat',               category: 'top',             name: 'Sun Hat',           emoji: '👒', cost: 60,  color: '#b58143', description: 'Ready for adventure!' },
  { id: 'shortCurly',        category: 'top',             name: 'Short Curly',       emoji: '🌀', cost: 35,  color: '#4a312c', description: 'Bouncy short curls!' },
  { id: 'shortFlat',         category: 'top',             name: 'Short & Flat',      emoji: '✂️', cost: 30,  color: '#2c1b18', description: 'Clean and neat!' },
  { id: 'shortRound',        category: 'top',             name: 'Round Crop',        emoji: '🔵', cost: 30,  color: '#724133', description: 'A tidy rounded cut!' },
  { id: 'shortWaved',        category: 'top',             name: 'Short Waves',       emoji: '〰️', cost: 35,  color: '#b58143', description: 'Short with a wave!' },
  { id: 'straight01',        category: 'top',             name: 'Sleek Straight',    emoji: '📏', cost: 35,  color: '#2c1b18', description: 'Silky smooth and straight!' },
  { id: 'fro',               category: 'top',             name: 'Natural Fro',       emoji: '🌟', cost: 50,  color: '#4a312c', description: 'Big, bold, and beautiful!' },
  { id: 'dreads01',          category: 'top',             name: 'Locs',              emoji: '🌿', cost: 55,  color: '#2c1b18', description: 'Beautiful locs style!' },
  { id: 'dreads02',          category: 'top',             name: 'Box Braids',        emoji: '🪢', cost: 55,  color: '#4a312c', description: 'Gorgeous box braids!' },
  { id: 'frida',             category: 'top',             name: 'Flower Crown',      emoji: '🌸', cost: 65,  color: '#c93305', description: 'Flowers in your hair!' },
  { id: 'turban',            category: 'top',             name: 'Royal Turban',      emoji: '👑', cost: 60,  color: '#5199e4', description: 'Regal and majestic!' },
  { id: 'winterHat01',       category: 'top',             name: 'Striped Beanie',    emoji: '🎿', cost: 50,  color: '#e05c5c', description: 'Stripey and super cozy!' },
  { id: 'winterHat03',       category: 'top',             name: 'Knit Hat',          emoji: '🧶', cost: 55,  color: '#d6a935', description: 'Warm knitted perfection!' },
  // ── Outfits (clothing) ───────────────────────────────────────────────────────
  { id: 'graphicShirt',      category: 'clothing',        name: 'Graphic Tee',       emoji: '🎨', cost: 30,  color: '#65c9ff', description: 'Show off your style!' },
  { id: 'shirtCrewNeck',     category: 'clothing',        name: 'Crew Neck',         emoji: '👕', cost: 30,  color: '#ff5c5c', description: 'A classic cool tee!' },
  { id: 'shirtScoopNeck',    category: 'clothing',        name: 'Scoop Neck',        emoji: '🌙', cost: 25,  color: '#ffafb9', description: 'Casual and comfy!' },
  { id: 'shirtVNeck',        category: 'clothing',        name: 'V-Neck Tee',        emoji: '🔻', cost: 25,  color: '#a8d8ea', description: 'Sporty V-neck style!' },
  { id: 'hoodie',            category: 'clothing',        name: 'Cozy Hoodie',       emoji: '🧥', cost: 35,  color: '#3c4f5c', description: 'Comfy and stylish!' },
  { id: 'overall',           category: 'clothing',        name: 'Cool Overalls',     emoji: '🌈', cost: 40,  color: '#5199e4', description: 'Comfy and colorful!' },
  { id: 'collarAndSweater',  category: 'clothing',        name: 'Cozy Sweater',      emoji: '🧶', cost: 45,  color: '#ffafb9', description: 'Warm and wonderful!' },
  { id: 'blazerAndShirt',    category: 'clothing',        name: 'Fancy Blazer',      emoji: '🎩', cost: 55,  color: '#262e33', description: 'Look super fancy!' },
  { id: 'blazerAndSweater',  category: 'clothing',        name: 'Smart Sweater',     emoji: '🦉', cost: 50,  color: '#5c7a6b', description: 'Brainy bookworm look!' },
  // ── Accessories ──────────────────────────────────────────────────────────────
  { id: 'round',             category: 'accessories',     name: 'Round Specs',       emoji: '🔮', cost: 20,  color: '#888888', description: 'Round and adorable glasses!' },
  { id: 'prescription01',    category: 'accessories',     name: 'Reading Glasses',   emoji: '🤓', cost: 25,  color: '#444444', description: 'Extra bookworm points!' },
  { id: 'prescription02',    category: 'accessories',     name: 'Oval Frames',       emoji: '🫧', cost: 30,  color: '#6b5c3e', description: 'Stylish oval glasses!' },
  { id: 'sunglasses',        category: 'accessories',     name: 'Cool Shades',       emoji: '😎', cost: 30,  color: '#222222', description: 'Too cool for school!' },
  { id: 'kurt',              category: 'accessories',     name: 'Retro Frames',      emoji: '🎸', cost: 35,  color: '#8B6914', description: 'Vintage and amazing!' },
  { id: 'wayfarers',         category: 'accessories',     name: 'Wayfarers',         emoji: '✈️', cost: 40,  color: '#333333', description: 'Adventurer style!' },
  { id: 'eyepatch',          category: 'accessories',     name: 'Eye Patch',         emoji: '🏴‍☠️', cost: 30,  color: '#111111', description: 'Pirate mode activated!' },
  // ── Backgrounds ──────────────────────────────────────────────────────────────
  { id: 'b6e3f4', category: 'backgroundColor', name: 'Blue Sky',       emoji: '☀️', cost: 20, color: '#b6e3f4', description: 'A bright sunny day!' },
  { id: 'fce4ec', category: 'backgroundColor', name: 'Rose Garden',    emoji: '🌸', cost: 20, color: '#fce4ec', description: 'Pretty as a petal!' },
  { id: 'd1f4e0', category: 'backgroundColor', name: 'Magic Forest',   emoji: '🌿', cost: 25, color: '#d1f4e0', description: 'Deep in the magic woods!' },
  { id: 'fff4bd', category: 'backgroundColor', name: 'Golden Sunset',  emoji: '🌅', cost: 25, color: '#fff4bd', description: 'Warm and cozy!' },
  { id: 'e8d5ff', category: 'backgroundColor', name: 'Starry Night',   emoji: '🌙', cost: 30, color: '#e8d5ff', description: 'Wish upon a star!' },
  { id: 'ffd5b5', category: 'backgroundColor', name: 'Autumn Glow',    emoji: '🍂', cost: 25, color: '#ffd5b5', description: 'Warm autumn colors!' },
  { id: 'c0f0ff', category: 'backgroundColor', name: 'Ocean Breeze',   emoji: '🌊', cost: 25, color: '#c0f0ff', description: 'Fresh as the sea!' },
  { id: 'ffcce0', category: 'backgroundColor', name: 'Cotton Candy',   emoji: '🍭', cost: 25, color: '#ffcce0', description: 'Sweet and dreamy!' },
  { id: 'dce8ff', category: 'backgroundColor', name: 'Periwinkle',     emoji: '💙', cost: 25, color: '#dce8ff', description: 'Cool and calming!' },
  { id: 'c5f5e8', category: 'backgroundColor', name: 'Mint Dream',     emoji: '🍃', cost: 20, color: '#c5f5e8', description: 'Fresh and refreshing!' },
  { id: 'ffecd2', category: 'backgroundColor', name: 'Peach Glow',     emoji: '🍑', cost: 20, color: '#ffecd2', description: 'Warm peachy vibes!' },
  { id: 'e8ffc0', category: 'backgroundColor', name: 'Lime Splash',    emoji: '🍋', cost: 20, color: '#e8ffc0', description: 'Zesty and fun!' },
  // ── Companion Pets ───────────────────────────────────────────────────────────
  { id: 'pet-sparky', category: 'pet', name: 'Sparky',  emoji: '🐶', cost: 100, color: '#FFB830', description: 'A cheerful pup always ready to play!' },
  { id: 'pet-cosmo',  category: 'pet', name: 'Hoot',    emoji: '🦉', cost: 100, color: '#7B61FF', description: 'A wise owl who loves books!' },
  { id: 'pet-luna',   category: 'pet', name: 'Luna',    emoji: '🐱', cost: 100, color: '#5BB8FF', description: 'A curious kitty who purrs at stories!' },
  { id: 'pet-rex',    category: 'pet', name: 'Rex',     emoji: '🦁', cost: 120, color: '#4CAF50', description: 'The king of the quest!' },
  { id: 'pet-pixel',  category: 'pet', name: 'Puddles', emoji: '🐸', cost: 120, color: '#FF6B9D', description: 'A leapy frog full of surprises!' },
  { id: 'pet-nova',   category: 'pet', name: 'Ember',   emoji: '🦊', cost: 200, color: '#FF7043', description: 'A clever fox with a fiery spirit!' },
  // ── Pet Accessories ──────────────────────────────────────────────────────────
  { id: 'petacc-bow',     category: 'petAccessory', name: 'Bow',       emoji: '🎀', cost: 25, color: '#FF69B4', description: 'A cute little bow!' },
  { id: 'petacc-crown',   category: 'petAccessory', name: 'Crown',     emoji: '👑', cost: 50, color: '#FFD700', description: 'For the royal pet!' },
  { id: 'petacc-hat',     category: 'petAccessory', name: 'Top Hat',   emoji: '🎩', cost: 40, color: '#444444', description: 'Very fancy indeed!' },
  { id: 'petacc-star',    category: 'petAccessory', name: 'Gold Star', emoji: '⭐', cost: 25, color: '#FFD700', description: 'A shining star!' },
  { id: 'petacc-flowers', category: 'petAccessory', name: 'Flowers',   emoji: '🌸', cost: 30, color: '#FF69B4', description: 'Pretty flower friend!' },
  { id: 'petacc-halo',    category: 'petAccessory', name: 'Halo',      emoji: '✨', cost: 35, color: '#FFF176', description: 'Pure and sparkly!' },
  // ── Pet Backgrounds ──────────────────────────────────────────────────────────
  { id: 'petbg-golden', category: 'petBackground', name: 'Golden',   emoji: '🌟', cost: 20, color: '#fff4bd', description: 'Warm golden glow!' },
  { id: 'petbg-cosmic', category: 'petBackground', name: 'Cosmic',   emoji: '🔮', cost: 25, color: '#e8d5ff', description: 'Magical purple!' },
  { id: 'petbg-sky',    category: 'petBackground', name: 'Sky Blue', emoji: '☁️', cost: 20, color: '#b6e3f4', description: 'Bright and breezy!' },
  { id: 'petbg-forest', category: 'petBackground', name: 'Forest',   emoji: '🌿', cost: 20, color: '#d1f4e0', description: 'Deep forest green!' },
  { id: 'petbg-rose',   category: 'petBackground', name: 'Rosy',     emoji: '🌷', cost: 20, color: '#fce4ec', description: 'Pretty in pink!' },
  { id: 'petbg-sunset', category: 'petBackground', name: 'Sunset',   emoji: '🌅', cost: 25, color: '#ffd5b5', description: 'Warm sunset vibes!' },
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
  | 'daily_goal'
  | 'streak_2'
  | 'streak_3'
  | 'streak_5'
  | 'streak_7'
  | 'streak_10'
  | 'streak_14'
  | 'streak_21'
  | 'streak_30'
  | 'streak_60'
  | 'math_8s'
  | 'math_9s'

export type ThemeId =
  | 'minecraft'
  | 'ocean-depths'
  | 'star-explorer'
  | 'enchanted-forest'
  | 'pirate-seas'
  | 'zombies-seabrook'
  | 'disneyland'

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
    id: 'minecraft',
    name: 'Minecraft',
    emoji: '⛏️',
    color: '#5B7C3A',
    bg: '#F0F7E8',
    description: 'Mine, build, and survive epic adventures in the blocky world!',
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
  {
    id: 'zombies-seabrook',
    name: 'Seabrook High',
    emoji: '🧟',
    color: '#C0227A',
    bg: '#FFF0F8',
    description: 'Join Erin at Seabrook High with Zed, Addison, and the whole crew!',
  },
  {
    id: 'disneyland',
    name: 'Disneyland Mysteries',
    emoji: '🏰',
    color: '#1565C0',
    bg: '#EEF4FF',
    description: 'Hunt for Hidden Mickeys and uncover the secret history of the Happiest Place on Earth!',
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
  daily_goal:    { name: 'Daily Champion', emoji: '🏅', description: 'Read for 20 minutes in a day!' },
  streak_2:  { name: '2-Day Streak',    emoji: '🔥', description: 'Read 2 days in a row!' },
  streak_3:  { name: '3-Day Streak',    emoji: '🔥', description: 'Read 3 days in a row!' },
  streak_5:  { name: '5-Day Streak',    emoji: '🔥', description: 'Read 5 days in a row!' },
  streak_7:  { name: '1-Week Streak',   emoji: '🏅', description: 'Read every day for a whole week!' },
  streak_10: { name: '10-Day Streak',   emoji: '🏅', description: 'Read 10 days in a row!' },
  streak_14: { name: '2-Week Streak',   emoji: '🥇', description: 'Two full weeks of reading!' },
  streak_21: { name: '3-Week Streak',   emoji: '🥇', description: 'Three weeks straight — incredible!' },
  streak_30: { name: '30-Day Streak',   emoji: '👑', description: 'A whole month of daily reading!' },
  streak_60: { name: '60-Day Streak',   emoji: '👑', description: 'Two months of reading every single day!' },
  math_8s:   { name: 'Times 8 Master', emoji: '🧮', description: 'Got a perfect score on the 8s times tables!' },
  math_9s:   { name: 'Times 9 Master', emoji: '🧮', description: 'Got a perfect score on the 9s times tables!' },
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
