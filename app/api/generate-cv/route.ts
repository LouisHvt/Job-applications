import { NextResponse } from 'next/server'
import { generateCV } from '@/lib/generate'
import { writeGeneratedContentToPage } from '@/lib/notion'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  try {
    const { cv, cvText } = await generateCV(jobId)
    await writeGeneratedContentToPage(jobId, cvText, null)
    return NextResponse.json({ cv, cvText })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    const status = msg === 'Job not found' ? 404 : msg === 'Job has no description' ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
