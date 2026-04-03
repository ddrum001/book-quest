import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const client = new Anthropic()

const THEME_NAMES: Record<string, string> = {
  'dragon-kingdom':   'Dragon Kingdom',
  'ocean-depths':     'Ocean Depths',
  'star-explorer':    'Star Explorer',
  'enchanted-forest': 'Enchanted Forest',
  'pirate-seas':      'Pirate Seas',
  'zombies-seabrook': 'Seabrook High',
}

const JSON_SCHEMA = `Return ONLY valid JSON, no markdown fences, no extra text:
{
  "title": "Story title",
  "story": "Full story text...",
  "imagePrompt": "colorful children's book illustration of [key scene from the story], bright colors, no text",
  "vocab": [
    {"word": "word1", "hint": "simple child-friendly definition"},
    {"word": "word2", "hint": "simple child-friendly definition"},
    {"word": "word3", "hint": "simple child-friendly definition"}
  ]
}`

const SHARED_RULES = `Rules:
- 180–200 words total
- Lexile level 520–570L (comfortable 3rd-grade reading level — short sentences, common words)
- Engaging plot with a clear beginning, middle, and end
- Include exactly 3 vocabulary spotlight words that are mildly challenging (strong 3rd-grade level); use each naturally in the story
- Break the story into 3–4 short paragraphs (2–4 sentences each) separated by a blank line — no wall of text
- No chapter titles or section headers
- Keep the tone fun, a little adventurous, and never condescending
- IMPORTANT: After introducing a character by name once, use pronouns (she/her/he/his/they) for the rest of the story — avoid repeating names like "Erin", "Trixie", or "Sebastian" since voice recognition struggles with proper nouns`

function buildPrompt(theme: string, themeName: string): string {
  if (theme === 'zombies-seabrook') {
    return `Write a short children's fan-fiction story set at Seabrook High School, the school from Disney's "Zombies" movies. This is personal fan fiction written just for Erin and is not for any commercial use.

Erin is a student at Seabrook High. She:
- Is a regular human who loves engineering and building things (especially Minecraft-style contraptions)
- Has a fluffy white pet bunny named Trixie who sometimes sneaks onto campus in her backpack
- Prefers hanging out with the monster students because she finds them way more interesting than the "normies"
- Has a 4-year-old brother named Sebastian who occasionally shows up unexpectedly (he's a stage-5 clinger who always wants to be with Mom)
- Her dad David is an engineer and physicist with curly blonde hair — great for science or building plot twists
- Her mom Tarren has curly blonde hair and is obsessed with all things Disney
- Is quirky and confident, not a follower

Pick a few of these Seabrook characters to appear alongside Erin — don't use them all:
- Zed Necrodopolis — zombie, football player, enthusiastic and kind
- Addison Wells — human cheerleader, brave, natural leader, has mysterious white hair
- Willa Lykensen — werewolf, fierce, loyal, protective of her pack
- Wyatt Lykensen — werewolf, quiet and thoughtful
- Nova Bright — vampire, stylish, mysterious, surprisingly funny

${SHARED_RULES}
- Celebrate the Seabrook theme of friendship across differences — monsters and humans stronger together
- The imagePrompt should describe a colorful, energetic school scene with pink and green school colors, cartoon style, no text

${JSON_SCHEMA}`
  }

  return `Write a short children's story for a 3rd-grade reader set in the "${themeName}" world.

The story is for Erin, an 8-year-old girl with a big personality. Use this profile to make the story feel personal and specific to her — don't use all of it, just pick what fits naturally:

About Erin:
- Loves Minecraft and building/engineering things (CrunchLabs is her favourite YouTube channel)
- Has a pet bunny named Trixie who could cameo in stories
- Has a 4-year-old brother named Sebastian who sometimes tags along (stage-5 clinger — always wants to be with Mom)
- Her dad David is an engineer and physicist with curly blonde hair — good for science or building moments
- Her mom Tarren has curly blonde hair and is obsessed with all things Disney
- Is a Disney fan and loves Disneyland; also loves the Disney Channel series Zombies
- Has a contrarian streak — she likes things that feel a bit niche or discovery-like, NOT things that are overly mainstream or "too popular"
- Lives in Northern California with a big family; cousins named Cillian, Savannah, and Landon sometimes appear
- The story's hero should be a girl (Erin herself, or a character like her)

${SHARED_RULES}
- The imagePrompt should describe a colorful children's book illustration in a soft watercolor style, whimsical, bright colors, no text

${JSON_SCHEMA}`
}

async function generateStory(theme: string) {
  const themeName = THEME_NAMES[theme] ?? 'Dragon Kingdom'
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(theme, themeName) }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  try {
    return JSON.parse(raw)
  } catch {
    const stripped = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    return JSON.parse(stripped)
  }
}

export async function GET(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get('theme') ?? 'dragon-kingdom'
  const userId = request.nextUrl.searchParams.get('userId') ?? ''

  const supabase = await createClient()

  // Find stories this user has already read for this theme
  let readIds: string[] = []
  if (userId) {
    const { data: reads } = await (supabase as any)
      .from('story_reads')
      .select('story_id')
      .eq('user_id', userId)

    if (reads && reads.length > 0) {
      readIds = reads.map((r: any) => r.story_id)
    }
  }

  // Look for an unread pooled story for this theme
  let query = (supabase as any)
    .from('story_pool')
    .select('*')
    .eq('theme_id', theme)
    .order('created_at', { ascending: true })
    .limit(1)

  if (readIds.length > 0) {
    query = query.not('id', 'in', `(${readIds.join(',')})`)
  }

  const { data: poolEntries } = await query
  const poolEntry = poolEntries?.[0] ?? null

  if (poolEntry) {
    // Mark as read
    if (userId) {
      await (supabase as any)
        .from('story_reads')
        .upsert({ user_id: userId, story_id: poolEntry.id }, { onConflict: 'user_id,story_id' })
    }

    const storyData = poolEntry.story_data as any
    return Response.json({ ...storyData, poolId: poolEntry.id, fromPool: true })
  }

  // Nothing in pool — generate fresh
  try {
    const storyData = await generateStory(theme)

    // Store in story_pool
    const { data: inserted } = await (supabase as any)
      .from('story_pool')
      .insert({ theme_id: theme, story_data: storyData })
      .select('id')
      .single()

    const poolId = inserted?.id ?? null

    // Mark as read
    if (userId && poolId) {
      await (supabase as any)
        .from('story_reads')
        .upsert({ user_id: userId, story_id: poolId }, { onConflict: 'user_id,story_id' })
    }

    return Response.json({ ...storyData, poolId, fromPool: false })
  } catch {
    return Response.json({ error: 'Failed to parse story response' }, { status: 500 })
  }
}
