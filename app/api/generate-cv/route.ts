import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { getProfile } from '@/lib/data'
import { fetchJob, fetchExperienceBank, writeGeneratedContentToPage } from '@/lib/notion'
import { buildCVSystemPrompt } from '@/lib/prompts'
import { Profile } from '@/lib/types'

function formatCVAsText(cvData: {
  summary: string
  selectedExperiences: Array<{ title: string; company: string; period: string; bullets: string[] }>
  skills: string[]
  education: Array<{ degree: string; school: string; year: string; highlight?: string }>
}, profile: Profile): string {
  const experiences = cvData.selectedExperiences.map(exp =>
    `${exp.title} — ${exp.company} (${exp.period})\n${exp.bullets.map(b => `• ${b}`).join('\n')}`
  ).join('\n\n')

  return [
    profile.name,
    `${profile.email} | ${profile.location} | ${profile.linkedin}${profile.portfolio ? ` | ${profile.portfolio}` : ''}`,
    '',
    'SUMMARY',
    cvData.summary,
    '',
    'EXPERIENCE',
    experiences,
    '',
    'SKILLS',
    cvData.skills.join(', '),
    '',
    'EDUCATION',
    cvData.education.map(e => `${e.degree}, ${e.school} (${e.year})${e.highlight ? ` — ${e.highlight}` : ''}`).join('\n'),
  ].join('\n')
}

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
    max_tokens: 2048,
    system: buildCVSystemPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nGenerate a tailored CV.` }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

  const cvData = JSON.parse(jsonMatch[0])
  const cvText = formatCVAsText(cvData, profile)

  await writeGeneratedContentToPage(jobId, cvText, null)

  return NextResponse.json({ cv: cvData, cvText })
}
