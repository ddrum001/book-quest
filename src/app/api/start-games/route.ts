import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { userId } = await request.json()
  const supabase = await createClient()

  const { data: user } = await supabase
    .from('users')
    .select('game_plays_available')
    .eq('id', userId)
    .single()

  if (!user || (user.game_plays_available ?? 0) < 1) {
    return Response.json({ error: 'No game plays available' }, { status: 403 })
  }

  await supabase
    .from('users')
    .update({ game_plays_available: user.game_plays_available - 1 })
    .eq('id', userId)

  return Response.json({ ok: true })
}
