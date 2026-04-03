import { createClient } from '@/lib/supabase/server'
import { type BadgeId } from '@/lib/types'

export async function POST(request: Request) {
  const { userId, bonusCoins, bonusStars, perfectScramble, perfectQuiz } = await request.json()

  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('coins, total_stars')
    .eq('id', userId)
    .single()

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  await supabase
    .from('users')
    .update({
      coins: (user.coins ?? 0) + (bonusCoins ?? 0),
      total_stars: (user.total_stars ?? 0) + (bonusStars ?? 0),
    })
    .eq('id', userId)

  // Award badges — unique constraint silently drops already-earned ones
  const candidates: BadgeId[] = []
  if (perfectScramble) candidates.push('word_wizard')
  if (perfectQuiz) candidates.push('quiz_ace')

  for (const badgeId of candidates) {
    await supabase.from('badges').insert({ user_id: userId, badge_id: badgeId })
  }

  return Response.json({ ok: true })
}
