import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { getProfile } from '@/lib/data'
import { fetchJob, fetchExperienceBank, writeInterviewPrepToPage } from '@/lib/notion'
import { buildInterviewPrepPrompt } from '@/lib/prompts'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const [job, experienceBank, profile] = await Promise.all([
    fetchJob(params.id),
    fetchExperienceBank(),
    Promise.resolve(getProfile()),
  ])

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (!job.jobDescription) return NextResponse.json({ error: 'Job has no description' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: buildInterviewPrepPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nGenerate interview prep.` }],
  })

  const content = (message.content[0] as { type: string; text: string }).text.trim()
  await writeInterviewPrepToPage(params.id, content)
  return NextResponse.json({ content })
}
