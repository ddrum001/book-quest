import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [{ data: users, error: usersError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from('users').select('*').order('child_name'),
    supabase.from('sessions').select('id, user_id, theme, stars_earned, stumble_words, reading_seconds, created_at').order('created_at', { ascending: false }),
  ])

  if (usersError) console.error('[parent-report] users error:', usersError)
  if (sessionsError) console.error('[parent-report] sessions error:', sessionsError)

  return Response.json({ users: users ?? [], sessions: sessions ?? [] })
}
