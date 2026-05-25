import { fetchJobs } from '@/lib/notion'
import JobList from '@/components/JobList'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const jobs = await fetchJobs()
  return <JobList jobs={jobs} />
}
