import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const client = new Anthropic()

const THEME_NAMES: Record<string, string> = {
  'minecraft':        'Minecraft',
  'ocean-depths':     'Ocean Depths',
  'star-explorer':    'Star Explorer',
  'enchanted-forest': 'Enchanted Forest',
  'pirate-seas':      'Pirate Seas',
  'zombies-seabrook': 'Seabrook High',
  'disneyland':       'Disneyland Mysteries',
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
- 120–140 words total — keep it SHORT and punchy, leave her wanting more
- Lexile level 520–570L (comfortable 3rd-grade reading level — short sentences, common words)
- Fast-paced plot with immediate action — open in the middle of something exciting, not with setup
- End with a satisfying but curious moment that makes her smile and want the next one
- Include exactly 3 vocabulary spotlight words that are mildly challenging (strong 3rd-grade level); use each naturally in the story
- Break the story into 2–3 short paragraphs (2–3 sentences each) separated by a blank line — no wall of text
- No chapter titles or section headers
- Keep the tone fun, energetic, and a little surprising — aim for at least one moment that will make her laugh or gasp
- IMPORTANT: After introducing a character by name once, use pronouns (she/her/he/his/they) for the rest of the story — avoid repeating names like "Erin", "Trixie", or "Sebastian" since voice recognition struggles with proper nouns`

function buildPrompt(theme: string, themeName: string): string {
  if (theme === 'minecraft') {
    return `Write a short children's adventure story set inside the world of Minecraft. This is written just for Erin.

Erin has just spawned into a new world. She:
- Loves building elaborate redstone contraptions and engineering clever solutions — this is her favourite part of the game
- Has a tamed rabbit in her world named Trixie — white with orange-brown patches, always hopping into trouble
- Her 4-year-old brother Sebastian joins her world sometimes and immediately starts punching trees with his bare fists
- Her dad David plays too — he's obsessed with speedrunning and always wants to rush to the Nether
- Is the kind of player who explores every cave and reads every chest before moving on; she hates missing secrets
- Has a contrarian streak — she likes discovering things other players walk right past

Each story should be grounded in ONE real Minecraft mechanic or situation — pick a different one each time:
- A creeper blowing up something important at the worst possible moment
- Discovering a stronghold hidden beneath a village she built up
- Exploring an ancient city in the deep dark (warden nearby, every sound matters)
- A thunderstorm turning a villager into a witch mid-trade
- Finding a hidden message in a chest that leads to an unexpected treasure
- Building a redstone sorting machine that goes hilariously wrong
- Trading with piglins in the Nether and getting something completely unexpected
- A raid on her village that she has to defend using only what she has on hand
- Stumbling into an amethyst geode while mining for iron
- Accidentally leading a pillager patrol straight back to her base

${SHARED_RULES}
- Ground the story in real Minecraft mechanics — biomes, mobs, crafting, and items should feel authentic and specific
- The imagePrompt should describe a colorful Minecraft scene with blocky pixelated terrain, bright saturated colors, no text

${JSON_SCHEMA}`
  }

  if (theme === 'disneyland') {
    return `Write a short children's adventure story set at Disneyland in Anaheim, California. This is personal fan fiction written just for Erin and is not for commercial use.

Erin is visiting Disneyland with her family on a day trip from Northern California. She:
- Has brown hair and blue eyes
- Loves discovering secrets and things most people walk right past (she has a contrarian streak — she loves knowing things others don't)
- Has a 4-year-old brother named Sebastian (blonde hair, blue eyes) who tags along and sometimes accidentally helps
- Her mom Tarren (curly blonde hair) is a Disney superfan who has the park memorized
- Her dad David (curly blonde hair) is an engineer who gets excited about how things were built
- Has a pet bunny named Trixie (white with orangish-brown splotches) who occasionally sneaks along in her backpack

Each story should center on ONE of these real Disneyland secrets or historical facts — pick a different one each time and weave it naturally into the plot:

HIDDEN MICKEYS (three-circle Mickey silhouette hidden in plain sight):
- The pizza slices in the pizza window on Main Street form a Hidden Mickey
- A Hidden Mickey is formed by three circles in the ironwork above the entrance to Pirates of the Caribbean
- The spots on a giraffe near the Jungle Cruise form a Hidden Mickey
- Rocks near Big Thunder Mountain Railroad form a Hidden Mickey when viewed from the right angle

DISNEYLAND HISTORY & TRIVIA:
- Walt Disney himself had a private apartment above the fire station on Main Street; a lamp is kept lit there in his memory to this day
- Disneyland opened on July 17, 1955 — opening day was so chaotic (counterfeit tickets, melting asphalt, broken drinking fountains) that the press called it "Black Sunday," but Walt called it his "happiest and most exciting day"
- Sleeping Beauty Castle uses "forced perspective" — the bricks get smaller higher up to trick your eye into thinking it's taller than its 77 feet
- The Matterhorn was the world's first tubular steel roller coaster (1959) — and there is a real basketball hoop hidden inside it used by cast members
- Club 33 is a secret members-only restaurant hidden behind an unmarked door in New Orleans Square — the address is 33 Royal Street
- Disneyland pumps scents through hidden vents called Smellitzers — vanilla on Main Street, baked goods near the bakery
- The Haunted Mansion is said to have exactly 999 happy haunts — "there's always room for one more"
- The Blue Bayou Restaurant is built inside the Pirates of the Caribbean ride so diners watch boats float past
- Feral cats live in Disneyland — they hide during the day and come out at night to keep rodents away; cast members leave food for them
- Indiana Jones Adventure uses a "trackless" ride system with no rails — the jeep is guided by a wire embedded in the floor
- The Enchanted Tiki Room (1963) was the first attraction to use audio-animatronics — Walt was so proud he called it his "greatest achievement"
- New Orleans Square was the first entirely new "land" added to Disneyland after opening day (1966)
- Walt Disney walked the orange groves that became Disneyland and personally decided where every land would go

${SHARED_RULES}
- The fact or Hidden Mickey should feel like a real discovery Erin stumbles onto — not a history lesson, but a genuine "whoa, did you know?!" moment woven into a small adventure
- Dad David is the one who knows the history and engineering trivia; Mom Tarren is the experiential superfan who loves the parades, Fantasmic, and the overall vibe — Erin is the one who physically discovers the secret or hidden detail
- The imagePrompt should describe a colorful, bright Disneyland scene — iconic castle or Main Street in the background, cheerful cartoon style, warm afternoon light, no text

${JSON_SCHEMA}`
  }

  if (theme === 'zombies-seabrook') {
    return `Write a short children's fan-fiction story set at Seabrook High School, the school from Disney's "Zombies" movies. This is personal fan fiction written just for Erin and is not for any commercial use.

Erin is a student at Seabrook High. She:
- Is a regular human who loves engineering and building things (especially Minecraft-style contraptions)
- Has a pet bunny named Trixie with "broken orange" coloring — white with orangish-brown splotches — who sometimes sneaks onto campus in her backpack
- Prefers hanging out with the monster students because she finds them way more interesting than the "normies"
- Has a 4-year-old brother named Sebastian (blonde hair, blue eyes) who occasionally shows up unexpectedly (he's a stage-5 clinger who always wants to be with Mom)
- Erin herself has brown hair and blue eyes
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
- Has a pet bunny named Trixie with "broken orange" coloring — white with orangish-brown splotches — who could cameo in stories
- Has a 4-year-old brother named Sebastian (blonde hair, blue eyes) who sometimes tags along (stage-5 clinger — always wants to be with Mom)
- Erin herself has brown hair and blue eyes
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
  const theme = request.nextUrl.searchParams.get('theme') ?? 'minecraft'
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
