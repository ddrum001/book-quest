import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  const { storyText, vocab } = await request.json()
  const vocabWords = (vocab as { word: string }[]).map(v => v.word).join(', ')

  const prompt = `You are making mini-game content for a children's reading app for an 8-year-old. Read this story carefully.

Story:
${storyText}

Vocabulary words already used for word-scramble (do NOT reuse for hangman): ${vocabWords}

Generate:

1. HANGMAN: 1 word found in the story (4–8 letters, single word, no proper nouns, not one of the vocab words). The clue should only make sense if the child actually read the story.

2. QUIZ: 1 multiple-choice comprehension question about what happened in the story. Exactly 4 short options, only one correct.

Return ONLY valid JSON, no markdown fences, no extra text:
{
  "hangman": [
    {"word": "brave", "clue": "How Erin felt when she faced the giant dragon"}
  ],
  "quiz": [
    {"q": "What did Erin find at the bottom of the lake?", "options": ["A golden key", "A sleeping fish", "A magic stone", "An old map"], "answer": "A golden key"}
  ]
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  try {
    return Response.json(JSON.parse(raw))
  } catch {
    const stripped = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      return Response.json(JSON.parse(stripped))
    } catch {
      return Response.json({ hangman: [], quiz: [] })
    }
  }
}
