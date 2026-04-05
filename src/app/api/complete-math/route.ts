import { createClient } from '@/lib/supabase/server'
import { getLevel, XP_PER_LEVEL, type BadgeId } from '@/lib/types'

const XP_BASE = 10
const XP_PER_CORRECT = 2
const COINS_BASE = 5
const COINS_PER_CORRECT = 2

function starsForScore(score: number, total: number): number {
  if (score === total) return 3
  if (score >= total * 0.8) return 2
  if (score >= total * 0.5) return 1
  return 0
}

export async function POST(request: Request) {
  const { userId, score, total } = await request.json()

  const supabase = await createClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const xpGained = XP_BASE + XP_PER_CORRECT * score
  const coinsGained = COINS_BASE + COINS_PER_CORRECT * score
  const starsEarned = starsForScore(score, total)

  const levelBefore = getLevel(user.total_xp)
  const newTotalXp = user.total_xp + xpGained
  const levelAfter = getLevel(newTotalXp)

  await supabase
    .from('users')
    .update({
      total_xp: newTotalXp,
      total_stars: user.total_stars + starsEarned,
      coins: (user.coins ?? 0) + coinsGained,
    })
    .eq('id', userId)

  // Badge: perfect score on 8s tables
  const newBadges: BadgeId[] = []
  if (score === total) {
    const { error } = await supabase
      .from('badges')
      .insert({ user_id: userId, badge_id: 'math_8s' })
    if (!error) newBadges.push('math_8s')
  }

  return Response.json({
    xpGained,
    coinsGained,
    starsEarned,
    newBadges,
    newTotalXp,
    xpInLevel: newTotalXp % XP_PER_LEVEL,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter > levelBefore,
  })
}
