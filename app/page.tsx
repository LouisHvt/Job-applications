import { fetchJobs } from '@/lib/notion'
import JobList from '@/components/JobList'
import StatsBar from '@/components/StatsBar'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const jobs = await fetchJobs()
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const stats = {
    proposed: jobs.filter(j => j.status === 'Proposed').length,
    ready: jobs.filter(j => j.status === 'Ready to Apply').length,
    applied: jobs.filter(j => j.status === 'Applied').length,
    interviews: jobs.filter(j => j.status === 'Interview').length,
    thisWeek: jobs.filter(j => j.dateFound && new Date(j.dateFound) >= oneWeekAgo).length,
  }
  return (
    <div>
      <StatsBar {...stats} />
      <JobList jobs={jobs} />
    </div>
  )
}
