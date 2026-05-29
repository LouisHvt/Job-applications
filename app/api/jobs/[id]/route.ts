import { NextResponse } from 'next/server'
import { fetchJob, updateJobStatus } from '@/lib/notion'
import { generateBothAndSave } from '@/lib/generate'
import { JobStatus } from '@/lib/types'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = await fetchJob(params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status } = await req.json() as { status: JobStatus }
  await updateJobStatus(params.id, status)

  // Fire-and-forget: generate CV + cover letter when job is marked ready to apply.
  // Does not block the status update response.
  if (status === 'Ready to Apply') {
    generateBothAndSave(params.id).catch(err =>
      console.error(`Auto-generate failed for job ${params.id}:`, err)
    )
  }

  return NextResponse.json({ ok: true })
}
