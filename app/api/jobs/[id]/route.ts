import { NextResponse } from 'next/server'
import { fetchJob, updateJobStatus } from '@/lib/notion'
import { JobStatus } from '@/lib/types'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = await fetchJob(params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status } = await req.json() as { status: JobStatus }
  await updateJobStatus(params.id, status)
  return NextResponse.json({ ok: true })
}
