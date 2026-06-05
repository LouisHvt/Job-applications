import { NextResponse } from 'next/server'
import { fetchAllJobLinks, createScoutJob, skipStaleProposedJobs } from '@/lib/notion'
import { getProfile } from '@/lib/data'
import { anthropic } from '@/lib/anthropic'
import { buildScoutScoringPrompt } from '@/lib/prompts'
import { JobTrack } from '@/lib/types'

interface RawJob {
  role: string
  company: string
  description: string
  link: string
  track: JobTrack
}

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY

async function fetchAdzuna(keywords: string, location: string, track: JobTrack): Promise<RawJob[]> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return []
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/es/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(keywords)}&where=${encodeURIComponent(location)}&results_per_page=20&content-type=application/json`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((j: any) => ({
      role: j.title ?? '',
      company: j.company?.display_name ?? '',
      description: j.description ?? '',
      link: j.redirect_url ?? '',
      track,
    }))
  } catch {
    return []
  }
}

async function fetchRemotive(keywords: string, track: JobTrack): Promise<RawJob[]> {
  try {
    const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keywords)}&limit=20`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs ?? []).map((j: any) => ({
      role: j.title ?? '',
      company: j.company_name ?? '',
      description: j.description ? j.description.replace(/<[^>]+>/g, '').slice(0, 500) : '',
      link: j.url ?? '',
      track,
    }))
  } catch {
    return []
  }
}

async function scoreJobs(
  profile: ReturnType<typeof getProfile>,
  jobs: RawJob[]
): Promise<Array<RawJob & { score: number }>> {
  if (jobs.length === 0) return []

  const input = jobs.map(j => ({ role: j.role, company: j.company, description: j.description.slice(0, 300), link: j.link }))
  const prompt = buildScoutScoringPrompt(profile, input)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  let scores: Array<{ link: string; score: number }> = []
  try {
    scores = JSON.parse(text)
  } catch {
    return []
  }

  const scoreMap = new Map(scores.map(s => [s.link, s.score]))
  return jobs.map(j => ({ ...j, score: scoreMap.get(j.link) ?? 0 }))
}

export async function POST() {
  try {
    const profile = getProfile()
    const existingLinks = await fetchAllJobLinks()

    // Fetch from all sources in parallel
    const [madrid1, madrid3, remote2, remoteMusic] = await Promise.all([
      fetchAdzuna('marketing partnerships events', 'Madrid', 'Track 1 - Madrid Multinationals'),
      fetchAdzuna('brand sponsorship luxury', 'Madrid', 'Track 3 - Madrid Prestige'),
      fetchRemotive('marketing partnerships EMEA', 'Track 2 - Remote EMEA'),
      fetchRemotive('music entertainment events', 'Music / Nightlife'),
    ])

    const allJobs = [...madrid1, ...madrid3, ...remote2, ...remoteMusic]

    // Deduplicate against existing Notion entries
    const newJobs = allJobs.filter(j => j.link && !existingLinks.has(j.link))

    // Deduplicate within this batch (same link from multiple sources)
    const seen = new Set<string>()
    const uniqueNewJobs = newJobs.filter(j => {
      if (seen.has(j.link)) return false
      seen.add(j.link)
      return true
    })

    // Score with Claude
    const scoredJobs = await scoreJobs(profile, uniqueNewJobs)
    const qualified = scoredJobs.filter(j => j.score >= 6)

    // Insert into Notion
    await Promise.all(
      qualified.map(j =>
        createScoutJob({
          role: j.role,
          company: j.company,
          jobLink: j.link,
          jobDescription: j.description,
          track: j.track,
        })
      )
    )

    // Auto-skip stale Proposed jobs
    const skipped = await skipStaleProposedJobs()

    return NextResponse.json({
      fetched: allJobs.length,
      newAfterDedup: uniqueNewJobs.length,
      qualified: qualified.length,
      inserted: qualified.length,
      skipped,
    })
  } catch (err) {
    console.error('[scout error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
