import { anthropic } from './anthropic'
import { getProfile } from './data'
import { fetchJob, fetchExperienceBank, writeGeneratedContentToPage } from './notion'
import { buildCVSystemPrompt, buildCoverLetterSystemPrompt } from './prompts'
import { Profile } from './types'
import { CVData } from '@/components/CVTemplate'

function formatCVAsText(cvData: CVData, profile: Profile): string {
  const experiences = cvData.selectedExperiences
    .map(exp => `${exp.title} — ${exp.company} (${exp.period})\n${exp.bullets.map(b => `• ${b}`).join('\n')}`)
    .join('\n\n')
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

export async function generateCV(jobId: string): Promise<{ cv: CVData; cvText: string }> {
  const [job, experienceBank, profile] = await Promise.all([
    fetchJob(jobId),
    fetchExperienceBank(),
    Promise.resolve(getProfile()),
  ])
  if (!job) throw new Error('Job not found')
  if (!job.jobDescription) throw new Error('Job has no description')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: buildCVSystemPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nGenerate a tailored CV.` }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  const cv = JSON.parse(jsonMatch[0]) as CVData
  const cvText = formatCVAsText(cv, profile)
  return { cv, cvText }
}

export async function generateCoverLetter(jobId: string): Promise<{ coverLetter: string }> {
  const [job, experienceBank, profile] = await Promise.all([
    fetchJob(jobId),
    fetchExperienceBank(),
    Promise.resolve(getProfile()),
  ])
  if (!job) throw new Error('Job not found')
  if (!job.jobDescription) throw new Error('Job has no description')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: buildCoverLetterSystemPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nWrite a tailored cover letter.` }],
  })

  const coverLetter = (message.content[0] as { type: string; text: string }).text.trim()
  return { coverLetter }
}

export async function generateBothAndSave(jobId: string): Promise<void> {
  const [{ cv, cvText }, { coverLetter }] = await Promise.all([
    generateCV(jobId),
    generateCoverLetter(jobId),
  ])
  await writeGeneratedContentToPage(jobId, cvText, coverLetter)
}
