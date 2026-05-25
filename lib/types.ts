export type JobStatus = 'Proposed' | 'Ready to Apply' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Skipped'
export type JobTier = 'Must Apply' | 'Should Apply' | 'Need Confirmation'
export type JobTrack = 'Track 1 - Madrid Multinationals' | 'Track 2 - Remote EMEA' | 'Track 3 - Madrid Prestige' | 'Music / Nightlife'

export interface NotionJob {
  id: string
  role: string
  company: string
  status: JobStatus | null
  tier: JobTier | null
  track: JobTrack | null
  jobDescription: string
  jobLink: string
  notes: string
  salary: string
  source: string
  dateFound: string | null
  url: string
}

export interface Experience {
  id: string
  title: string
  company: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface Education {
  degree: string
  school: string
  year: string
}

export interface Profile {
  name: string
  email: string
  phone: string
  linkedin: string
  portfolio: string
  location: string
  summary: string
  experiences: Experience[]
  skills: string[]
  education: Education[]
  coverLetterTemplates: string[]
  languages: string[]
  otherInfo: string[]
  keyStats: string[]
}
