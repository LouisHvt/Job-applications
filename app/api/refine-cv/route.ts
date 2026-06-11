import { NextResponse } from 'next/server'
import { fetchJob, fetchExperienceBank } from '@/lib/notion'
import { getProfile } from '@/lib/data'
import { anthropic } from '@/lib/anthropic'
import { buildCVSystemPrompt } from '@/lib/prompts'
import { CVData } from '@/components/CVTemplate'

export async function POST(req: Request) {
  try {
    const { jobId, currentCV, instruction } = await req.json() as {
      jobId: string
      currentCV: CVData
      instruction: string
    }

    const [job, experienceBank, profile] = await Promise.all([
      fetchJob(jobId),
      fetchExperienceBank(),
      Promise.resolve(getProfile()),
    ])

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const systemPrompt = buildCVSystemPrompt(experienceBank, profile)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Job posting:\n${job.jobDescription}`,
        },
        {
          role: 'assistant',
          content: JSON.stringify(currentCV),
        },
        {
          role: 'user',
          content: `Apply this feedback and return the updated CV JSON: ${instruction}\n\nReturn JSON only, no markdown wrapper.`,
        },
      ],
    })

    // Same extraction as lib/generate.ts — the model sometimes wraps JSON in markdown fences
    const raw = (response.content[0] as { text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')
    const cv: CVData = JSON.parse(jsonMatch[0])
    return NextResponse.json({ cv })
  } catch (err) {
    console.error('[refine-cv error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
