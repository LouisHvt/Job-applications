import { NextResponse } from 'next/server'
import { generateCoverLetter } from '@/lib/generate'
import { writeGeneratedContentToPage } from '@/lib/notion'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  try {
    const { coverLetter } = await generateCoverLetter(jobId)
    await writeGeneratedContentToPage(jobId, '', coverLetter)
    return NextResponse.json({ coverLetter })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    const status = msg === 'Job not found' ? 404 : msg === 'Job has no description' ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
