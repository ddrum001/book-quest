import { createClient } from '@/lib/supabase/server'
import { getLevel, XP_PER_LEVEL, type BadgeId } from '@/lib/types'

const XP_FOR_STORY = 25
const XP_BONUS_PERFECT = 10 // no stumble words

const COINS_FOR_STORY = 15
const COINS_BONUS_PERFECT = 10

const ALL_THEMES = [
  'dragon-kingdom',
  'ocean-depths',
  'star-explorer',
  'enchanted-forest',
  'pirate-seas',
  'zombies-seabrook',
]

const STREAK_BADGES: Array<{ days: number; id: BadgeId }> = [
  { days: 2,  id: 'streak_2' },
  { days: 3,  id: 'streak_3' },
  { days: 5,  id: 'streak_5' },
  { days: 7,  id: 'streak_7' },
  { days: 10, id: 'streak_10' },
  { days: 14, id: 'streak_14' },
  { days: 21, id: 'streak_21' },
  { days: 30, id: 'streak_30' },
  { days: 60, id: 'streak_60' },
]

// Returns YYYY-MM-DD for a UTC timestamp interpreted in Pacific Time
function toPtDate(date: Date): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Los_Angeles' }).format(date)
}

// Returns UTC start/end of today in Pacific Time
function getPtTodayBounds(): { gte: string; lt: string } {
  const now = new Date()
  const ptDateStr = toPtDate(now)

  const utcH = now.getUTCHours()
  const ptH = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  )
  let offsetHours = ptH - utcH
  if (offsetHours > 12) offsetHours -= 24
  if (offsetHours < -12) offsetHours += 24

  const [year, month, day] = ptDateStr.split('-').map(Number)
  const startUTC = new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0, 0))
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000)

  return { gte: startUTC.toISOString(), lt: endUTC.toISOString() }
}

export async function POST(request: Request) {
  const { sessionId, userId, theme, storyText, stumbleWords, skippedWords, vocabWords, readingSeconds } =
    await request.json()

  const supabase = await createClient()

  // Fetch current user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // ── Fetch previous sessions (used for streak + theme checks) ─────────────────
  const { data: prevSessions } = await supabase
    .from('sessions')
    .select('theme, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })

  // ── Streak computation ────────────────────────────────────────────────────────
  const todayPt = toPtDate(new Date())
  const yesterdayPt = toPtDate(new Date(Date.now() - 24 * 60 * 60 * 1000))

  // Unique PT dates from all previous sessions
  const prevPtDates = new Set(
    (prevSessions ?? []).map(s => toPtDate(new Date(s.completed_at)))
  )

  let newStreak: number
  if (prevPtDates.has(todayPt)) {
    // She already completed a story today — streak doesn't change
    newStreak = user.current_streak
  } else if (prevPtDates.has(yesterdayPt) || user.current_streak === 0) {
    // Read yesterday (or this is the very first story ever) — continue/start streak
    newStreak = user.current_streak + 1
  } else {
    // Gap of 2+ days — reset
    newStreak = 1
  }
  const newLongestStreak = Math.max(user.longest_streak ?? 0, newStreak)

  // ── Calculate XP rewards ──────────────────────────────────────────────────────
  // Skipped words count the same as stumbles toward the star rating
  const allDifficult = [...new Set([...(stumbleWords ?? []), ...(skippedWords ?? [])])]
  const stumbleCount: number = allDifficult.length
  const starsEarned = stumbleCount === 0 ? 3 : stumbleCount <= 2 ? 2 : 1
  const xpGained    = XP_FOR_STORY    + (stumbleCount === 0 ? XP_BONUS_PERFECT    : 0)
  const coinsGained = COINS_FOR_STORY + (stumbleCount === 0 ? COINS_BONUS_PERFECT : 0)
  const newTotalCoins = (user.coins ?? 0) + coinsGained
  const levelBefore = getLevel(user.total_xp)
  const newTotalXp = user.total_xp + xpGained
  const newStoriesRead = user.stories_read + 1
  const levelAfter = getLevel(newTotalXp)
  const sessionSeconds = Math.max(0, Math.round(readingSeconds ?? 0))

  // ── Save session ──────────────────────────────────────────────────────────────
  const { error: sessionError } = await supabase.from('sessions').upsert({
    ...(sessionId ? { id: sessionId } : {}),
    user_id: userId,
    theme,
    story_text: storyText ?? '',
    quiz_score: null,
    stars_earned: starsEarned,
    vocab_words: vocabWords ?? [],
    stumble_words: allDifficult,
    reading_seconds: sessionSeconds,
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (sessionError) console.error('[complete-story] session insert error:', sessionError)

  // ── Update user totals ────────────────────────────────────────────────────────
  await supabase
    .from('users')
    .update({
      total_xp: newTotalXp,
      total_stars: user.total_stars + starsEarned,
      stories_read: newStoriesRead,
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      coins: newTotalCoins,
    })
    .eq('id', userId)

  // ── Badge checking ────────────────────────────────────────────────────────────
  const candidates: BadgeId[] = []

  // First story ever
  if (user.stories_read === 0) candidates.push('first_tale')

  // 5 stories read
  if (newStoriesRead === 5) candidates.push('bookworm')

  // Finished a story aloud (always true here)
  candidates.push('voice_reader')

  // All 5 themes explored
  const seenThemes = new Set((prevSessions ?? []).map((s: { theme: string }) => s.theme))
  seenThemes.add(theme)
  if (ALL_THEMES.every(t => seenThemes.has(t))) {
    candidates.push('world_explorer')
  }

  // Streak milestones
  for (const { days, id } of STREAK_BADGES) {
    if (newStreak >= days) candidates.push(id)
  }

  // Insert each candidate — unique constraint silently drops already-earned badges
  const newlyEarned: BadgeId[] = []
  for (const badgeId of candidates) {
    const { error } = await supabase
      .from('badges')
      .insert({ user_id: userId, badge_id: badgeId })
    if (!error) newlyEarned.push(badgeId)
  }

  // ── Today's reading total (PT timezone) ──────────────────────────────────────
  const { gte, lt } = getPtTodayBounds()
  const { data: todaySessions } = await supabase
    .from('sessions')
    .select('reading_seconds')
    .eq('user_id', userId)
    .gte('completed_at', gte)
    .lt('completed_at', lt)

  const todaySeconds = (todaySessions ?? []).reduce(
    (sum: number, s: { reading_seconds: number | null }) => sum + (s.reading_seconds ?? 0),
    0,
  )

  return Response.json({
    xpGained,
    starsEarned,
    newTotalXp,
    xpInLevel: newTotalXp % XP_PER_LEVEL,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter > levelBefore,
    newBadges: newlyEarned,
    sessionSeconds,
    todaySeconds,
    currentStreak: newStreak,
    coinsGained,
    newTotalCoins,
  })
}
