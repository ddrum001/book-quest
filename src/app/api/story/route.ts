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

Rules:
- 180–200 words total
- Engaging plot with a clear beginning, middle, and end
- Suitable for an 8-year-old girl
- Include exactly 3 vocabulary spotlight words that are slightly challenging (4th-grade level); use each naturally in the story
- No chapter breaks or section headers — one continuous prose story

Return ONLY valid JSON, no markdown fences, no extra text:
{
  "title": "Story title",
  "story": "Full story text...",
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
