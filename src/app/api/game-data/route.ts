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

1. HANGMAN: 2 words found in the story (4–8 letters, single word, no proper nouns, not one of the vocab words). The clue for each word should only make sense if the child actually read the story — reference something specific that happened or was described.

2. QUIZ: 3 multiple-choice comprehension questions testing what happened in the story. Each question must have exactly 4 short options (only one correct). Make the wrong answers plausible but clearly wrong to someone who read the story.

Return ONLY valid JSON, no markdown fences, no extra text:
{
  "hangman": [
    {"word": "brave", "clue": "How Erin felt when she faced the giant dragon"},
    {"word": "torch", "clue": "What Erin used to light the dark tunnel"}
  ],
  "quiz": [
    {"q": "What did Erin find at the bottom of the lake?", "options": ["A golden key", "A sleeping fish", "A magic stone", "An old map"], "answer": "A golden key"},
    {"q": "Question 2?", "options": ["A", "B", "C", "D"], "answer": "A"},
    {"q": "Question 3?", "options": ["A", "B", "C", "D"], "answer": "A"}
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
