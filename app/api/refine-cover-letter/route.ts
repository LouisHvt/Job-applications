import { NextResponse } from 'next/server'
import { fetchJob, fetchExperienceBank } from '@/lib/notion'
import { getProfile } from '@/lib/data'
import { anthropic } from '@/lib/anthropic'
import { buildCoverLetterSystemPrompt } from '@/lib/prompts'

export async function POST(req: Request) {
  try {
    const { jobId, currentLetter, instruction } = await req.json()

    const [job, experienceBank, profile] = await Promise.all([
      fetchJob(jobId),
      fetchExperienceBank(),
      Promise.resolve(getProfile()),
    ])

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const systemPrompt = buildCoverLetterSystemPrompt(experienceBank, profile)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Job posting:\n${job.jobDescription}\n\nCurrent cover letter:\n${currentLetter}`,
        },
        {
          role: 'assistant',
          content: currentLetter,
        },
        {
          role: 'user',
          content: `Rewrite the cover letter applying this feedback: ${instruction}\n\nReturn only the updated letter, no commentary.`,
        },
      ],
    })

    const coverLetter = (response.content[0] as { text: string }).text.trim()
    return NextResponse.json({ coverLetter })
  } catch (err) {
    console.error('[refine-cover-letter error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
