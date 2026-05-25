import { NextResponse } from 'next/server'
import { fetchJobs, createJob } from '@/lib/notion'
import { JobTier, JobTrack } from '@/lib/types'

export async function GET() {
  const jobs = await fetchJobs()
  return NextResponse.json(jobs)
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      role: string
      company: string
      jobLink?: string
      jobDescription?: string
      tier?: JobTier
      track?: JobTrack
    }
    const job = await createJob(body)
    return NextResponse.json(job)
  } catch (err) {
    console.error('[createJob error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
