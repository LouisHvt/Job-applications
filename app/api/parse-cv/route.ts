import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { buildCVParserPrompt } from '@/lib/prompts'

export async function POST(request: Request) {
  const { rawCV } = await request.json()
  if (!rawCV?.trim()) return NextResponse.json({ error: 'No CV text provided' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: buildCVParserPrompt(),
    messages: [{ role: 'user', content: rawCV }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse CV' }, { status: 500 })

  return NextResponse.json(JSON.parse(jsonMatch[0]))
}
