import { type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { pin } = await request.json()
  const correct = process.env.PARENT_PIN ?? '2653'
  return Response.json({ ok: pin === correct })
}
