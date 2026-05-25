import { fetchJob } from '@/lib/notion'
import { getProfile } from '@/lib/data'
import { notFound } from 'next/navigation'
import JobDetail from '@/components/JobDetail'

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await fetchJob(params.id)
  if (!job) notFound()
  const profile = getProfile()
  return <JobDetail job={job} profile={profile} />
}
