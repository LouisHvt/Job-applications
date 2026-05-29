import { NextResponse } from 'next/server'
import { fetchJob } from '@/lib/notion'
import { getProfile } from '@/lib/data'
import { generateCV } from '@/lib/generate'
import { buildCVHtml } from '@/lib/htmlTemplates'
import { renderHtmlToPdf } from '@/lib/pdfRenderer'
import { CVData } from '@/components/CVTemplate'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  let cvData: CVData | null = body.cvData ?? null

  if (!cvData) {
    const { cv } = await generateCV(params.id)
    cvData = cv
  }

  const job = await fetchJob(params.id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const profile = getProfile()

  const html = buildCVHtml(cvData, profile)
  const pdf = await renderHtmlToPdf(html)

  const filename = `CV_${profile.name.replace(/\s+/g, '_')}_${job.company.replace(/\s+/g, '_')}.pdf`
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
