import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [{ data: users, error: usersError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from('users').select('*').order('child_name'),
    supabase.from('sessions').select('id, user_id, theme, stars_earned, stumble_words, reading_seconds, completed_at').order('completed_at', { ascending: false }),
  ])

  return Response.json({ users: users ?? [], sessions: sessions ?? [] })
}
