import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'

const client = new Anthropic()

const THEME_NAMES: Record<string, string> = {
  'dragon-kingdom': 'Dragon Kingdom',
  'ocean-depths': 'Ocean Depths',
  'star-explorer': 'Star Explorer',
  'enchanted-forest': 'Enchanted Forest',
  'pirate-seas': 'Pirate Seas',
}

export async function GET(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get('theme') ?? 'dragon-kingdom'
  const themeName = THEME_NAMES[theme] ?? 'Dragon Kingdom'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Write a short children's story for a 3rd-grade reader (Lexile 580–650L) set in the "${themeName}" world.

The story is for Erin, an 8-year-old girl with a big personality. Use this profile to make the story feel personal and specific to her — don't use all of it, just pick what fits naturally:

About Erin:
- Loves Minecraft and building/engineering things (CrunchLabs is her favourite YouTube channel)
- Has a pet bunny named Trixie who could cameo in stories
- Has a 4-year-old brother named Sebastian who sometimes tags along
- Is a Disney fan and loves Disneyland; also loves the Disney Channel series Zombies
- Has a contrarian streak — she likes things that feel a bit niche or discovery-like, NOT things that are overly mainstream or "too popular"
- Lives in Northern California with a big family; cousins named Cillian, Savannah, and Landon sometimes appear
- The story's hero should be a girl (Erin herself, or a character like her)

Rules:
- 180–200 words total
- Lexile level 520–570L (comfortable 3rd-grade reading level — short sentences, common words)
- Engaging plot with a clear beginning, middle, and end
- Include exactly 3 vocabulary spotlight words that are mildly challenging (strong 3rd-grade level); use each naturally in the story
- Break the story into 3–4 short paragraphs (2–4 sentences each) separated by a blank line — no wall of text
- No chapter titles or section headers
- Keep the tone fun, a little adventurous, and never condescending

Return ONLY valid JSON, no markdown fences, no extra text:
{
  "title": "Story title",
  "story": "Full story text...",
  "imagePrompt": "colorful children's book illustration of [key scene from the story], soft watercolor style, whimsical, bright colors, no text",
  "vocab": [
    {"word": "word1", "hint": "simple child-friendly definition"},
    {"word": "word2", "hint": "simple child-friendly definition"},
    {"word": "word3", "hint": "simple child-friendly definition"}
  ]
}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  try {
    const data = JSON.parse(raw)
    return Response.json(data)
  } catch {
    // Strip accidental markdown fences if Claude added them
    const stripped = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      return Response.json(JSON.parse(stripped))
    } catch {
      return Response.json({ error: 'Failed to parse story response' }, { status: 500 })
    }
  }
}
