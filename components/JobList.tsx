'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NotionJob, JobTier, JobStatus, JobTrack } from '@/lib/types'

const TIER_COLORS: Record<JobTier, string> = {
  'Must Apply': 'bg-green-100 text-green-700',
  'Should Apply': 'bg-yellow-100 text-yellow-700',
  'Need Confirmation': 'bg-orange-100 text-orange-700',
}

const STATUS_COLORS: Record<JobStatus, string> = {
  Proposed: 'bg-gray-100 text-gray-600',
  'Ready to Apply': 'bg-pink-100 text-pink-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-purple-100 text-purple-700',
  Offer: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-600',
  Skipped: 'bg-gray-100 text-gray-400',
}

const TRACK_SHORT: Record<string, string> = {
  'Track 1 - Madrid Multinationals': 'Madrid MNCs',
  'Track 2 - Remote EMEA': 'Remote EMEA',
  'Track 3 - Madrid Prestige': 'Madrid Prestige',
  'Music / Nightlife': 'Music / Nightlife',
}

const TIERS: JobTier[] = ['Must Apply', 'Should Apply', 'Need Confirmation']
const STATUSES: JobStatus[] = ['Proposed', 'Ready to Apply', 'Applied', 'Interview', 'Offer', 'Rejected', 'Skipped']
const TRACKS: JobTrack[] = ['Track 1 - Madrid Multinationals', 'Track 2 - Remote EMEA', 'Track 3 - Madrid Prestige', 'Music / Nightlife']

type TierFilter = 'All' | JobTier
type StatusFilter = JobStatus

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function AddJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    role: '',
    company: '',
    jobLink: '',
    jobDescription: '',
    tier: '' as JobTier | '',
    track: '' as JobTrack | '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.role.trim() || !form.company.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role.trim(),
          company: form.company.trim(),
          jobLink: form.jobLink.trim() || undefined,
          jobDescription: form.jobDescription.trim() || undefined,
          tier: form.tier || undefined,
          track: form.track || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save.'); setSaving(false); return }
      onCreated()
      onClose()
    } catch {
      setError('Network error. Try again.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Add Job</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Role *</label>
            <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Partnerships Manager" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Company *</label>
            <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Spotify" className={inputCls} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Job Link</label>
            <input value={form.jobLink} onChange={e => set('jobLink', e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Tier</label>
            <select value={form.tier} onChange={e => set('tier', e.target.value)} className={inputCls}>
              <option value="">No tier</option>
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Track</label>
            <select value={form.track} onChange={e => set('track', e.target.value)} className={inputCls}>
              <option value="">No track</option>
              {TRACKS.map(t => <option key={t} value={t}>{TRACK_SHORT[t]}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Job Description</label>
            <textarea
              value={form.jobDescription}
              onChange={e => set('jobDescription', e.target.value)}
              rows={5}
              placeholder="Paste the job description here..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.role.trim() || !form.company.trim()}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              saving || !form.role.trim() || !form.company.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? 'Adding...' : 'Add to Notion'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JobList({ jobs: initialJobs }: { jobs: NotionJob[] }) {
  const router = useRouter()
  const [tierFilter, setTierFilter] = useState<TierFilter>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Proposed')
  const [showAddModal, setShowAddModal] = useState(false)

  const filtered = initialJobs.filter(j => {
    if (tierFilter !== 'All' && j.tier !== tierFilter) return false
    if (j.status !== statusFilter) return false
    return true
  })

  return (
    <div className="max-w-5xl mx-auto p-8">
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => router.refresh()}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{filtered.length} jobs</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Job
          </button>
        </div>
      </div>

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2 mb-2">
        {(['All', ...TIERS] as TierFilter[]).map(tier => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tierFilter === tier ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tier === 'All'
              ? `All (${initialJobs.length})`
              : `${tier} (${initialJobs.filter(j => j.tier === tier).length})`}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === status ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {status} ({initialJobs.filter(j => j.status === status).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No jobs with this status.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Role / Company</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Tier</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Track</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(job => (
                <tr key={job.id} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/jobs/${job.id}`} className="group">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{job.role}</p>
                        {job.source === 'Manual' && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-violet-100 text-violet-600">Manual</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{job.company}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    {job.tier ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[job.tier]}`}>{job.tier}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {job.status ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>{job.status}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">
                    {job.track ? TRACK_SHORT[job.track] ?? job.track : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">
                    {job.dateFound ? new Date(job.dateFound).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
