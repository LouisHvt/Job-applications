import { NextResponse } from 'next/server'
import { fetchJob } from '@/lib/notion'
import { getProfile } from '@/lib/data'
import { buildCoverLetterHtml } from '@/lib/htmlTemplates'
import { renderHtmlToPdf } from '@/lib/pdfRenderer'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { coverLetter } = await req.json()
  if (!coverLetter) return NextResponse.json({ error: 'No cover letter provided' }, { status: 400 })

  const job = await fetchJob(params.id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const profile = getProfile()

  const html = buildCoverLetterHtml(coverLetter, job, profile)
  const pdf = await renderHtmlToPdf(html)

  const filename = `CoverLetter_${profile.name.replace(/\s+/g, '_')}_${job.company.replace(/\s+/g, '_')}.pdf`
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
