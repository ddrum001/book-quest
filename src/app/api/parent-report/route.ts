import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const [{ data: users }, { data: sessions }] = await Promise.all([
    supabase.from('users').select('*').order('child_name'),
    supabase.from('sessions').select('id, user_id, theme, stars_earned, stumble_words, reading_seconds, created_at').order('created_at', { ascending: false }),
  ])

  return Response.json({ users: users ?? [], sessions: sessions ?? [] })
}
