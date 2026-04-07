import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const MIN_POOL_SIZE = 3

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
- 180–200 words total
- Lexile level 520–570L (comfortable 3rd-grade reading level — short sentences, common words)
- Engaging plot with a clear beginning, middle, and end
- Include exactly 3 vocabulary spotlight words that are mildly challenging (strong 3rd-grade level); use each naturally in the story
- Break the story into 3–4 short paragraphs (2–4 sentences each) separated by a blank line — no wall of text
- No chapter titles or section headers
- Keep the tone fun, a little adventurous, and never condescending
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

Each story should be grounded in ONE real Minecraft mechanic or situation — pick a different one each time:
- A creeper blowing up something important at the worst possible moment
- Discovering a stronghold hidden beneath a village she built up
- Exploring an ancient city in the deep dark (warden nearby, every sound matters)
- A thunderstorm turning a villager into a witch mid-trade
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

  if (theme === 'zombies-seabrook') {
    return `Write a short children's fan-fiction story set at Seabrook High School, the school from Disney's "Zombies" movies. This is personal fan fiction written just for Erin and is not for any commercial use.

Erin is a student at Seabrook High. She:
- Is a regular human who loves engineering and building things (especially Minecraft-style contraptions)
- Has a fluffy white pet bunny named Trixie who sometimes sneaks onto campus in her backpack
- Prefers hanging out with the monster students because she finds them way more interesting than the "normies"
- Has a 4-year-old brother named Sebastian who occasionally shows up unexpectedly
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
- Has a 4-year-old brother named Sebastian who sometimes tags along
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

export async function POST(request: NextRequest) {
  const { theme } = await request.json()

  const supabase = await createClient()

  // Check current pool size for this theme
  const { count } = await (supabase as any)
    .from('story_pool')
    .select('*', { count: 'exact', head: true })
    .eq('theme_id', theme)

  if ((count ?? 0) >= MIN_POOL_SIZE) {
    return Response.json({ ok: true, skipped: true })
  }

  // Generate a new story
  const storyData = await generateStory(theme)

  // Insert into story_pool
  await (supabase as any)
    .from('story_pool')
    .insert({ theme_id: theme, story_data: storyData })

  // Pre-warm the image by fetching it (fire-and-forget, errors silently swallowed)
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(storyData.imagePrompt)}?width=800&height=380&nologo=true`
  await fetch(imageUrl, { signal: AbortSignal.timeout(50_000) }).catch(() => {})

  return Response.json({ ok: true, skipped: false })
}
