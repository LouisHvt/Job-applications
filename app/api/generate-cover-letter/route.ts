import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { getProfile } from '@/lib/data'
import { fetchJob, fetchExperienceBank, writeGeneratedContentToPage } from '@/lib/notion'
import { buildCoverLetterSystemPrompt } from '@/lib/prompts'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  const [job, experienceBank, profile] = await Promise.all([
    fetchJob(jobId),
    fetchExperienceBank(),
    Promise.resolve(getProfile()),
  ])

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (!job.jobDescription) return NextResponse.json({ error: 'Job has no description' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: buildCoverLetterSystemPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nWrite a tailored cover letter.` }],
  })

  const coverLetter = (message.content[0] as { type: string; text: string }).text
  await writeGeneratedContentToPage(jobId, '', coverLetter)

  return NextResponse.json({ coverLetter })
}
