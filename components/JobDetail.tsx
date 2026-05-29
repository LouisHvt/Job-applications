'use client'
import { useState } from 'react'
import Link from 'next/link'
import { NotionJob, Profile, JobStatus, JobTier } from '@/lib/types'
import CVTemplate, { CVData } from '@/components/CVTemplate'
import CoverLetterTemplate from '@/components/CoverLetterTemplate'

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

type Tab = 'cv' | 'cover-letter'

interface Props {
  job: NotionJob
  profile: Profile
}

export default function JobDetail({ job, profile }: Props) {
  const [tab, setTab] = useState<Tab>('cv')
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [loadingCV, setLoadingCV] = useState(false)
  const [loadingCL, setLoadingCL] = useState(false)
  const [refineInput, setRefineInput] = useState('')
  const [refining, setRefining] = useState(false)
  const [refineCVInput, setRefineCVInput] = useState('')
  const [refiningCV, setRefiningCV] = useState(false)

  const refineCoverLetter = async () => {
    if (!refineInput.trim() || !coverLetter) return
    setRefining(true)
    const res = await fetch('/api/refine-cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, currentLetter: coverLetter, instruction: refineInput.trim() }),
    })
    const data = await res.json()
    if (data.coverLetter) {
      setCoverLetter(data.coverLetter)
      setRefineInput('')
    }
    setRefining(false)
  }
  const [savedToNotion, setSavedToNotion] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)
  const [showCLPrintView, setShowCLPrintView] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<JobStatus | null>(job.status)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const changeStatus = async (status: JobStatus) => {
    setUpdatingStatus(true)
    setCurrentStatus(status)
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdatingStatus(false)
  }

  const generateCV = async () => {
    setLoadingCV(true)
    setSavedToNotion(false)
    setShowPrintView(false)
    const res = await fetch('/api/generate-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    })
    const data = await res.json()
    if (data.cv) {
      setCvData(data.cv)
      setSavedToNotion(true)
    }
    setLoadingCV(false)
  }

  const generateCoverLetter = async () => {
    setLoadingCL(true)
    setSavedToNotion(false)
    const res = await fetch('/api/generate-cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    })
    const data = await res.json()
    if (data.coverLetter) {
      setCoverLetter(data.coverLetter)
      setSavedToNotion(true)
    }
    setLoadingCL(false)
  }

  const refineCV = async () => {
    if (!refineCVInput.trim() || !cvData) return
    setRefiningCV(true)
    const res = await fetch('/api/refine-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, currentCV: cvData, instruction: refineCVInput.trim() }),
    })
    const data = await res.json()
    if (data.cv) {
      setCvData(data.cv)
      setRefineCVInput('')
    }
    setRefiningCV(false)
  }

  const noProfile = !profile.name

  const profileInfo = {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio,
    location: profile.location,
    languages: profile.languages,
    otherInfo: profile.otherInfo,
    keyStats: profile.keyStats,
  }

  // CV print view
  if (showPrintView && cvData) {
    return (
      <div>
        <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
          >
            Download PDF
          </button>
          <button
            onClick={() => setShowPrintView(false)}
            className="px-4 py-2 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>
        <div className="p-8 bg-gray-100 min-h-screen flex justify-center">
          <div className="bg-white shadow-lg p-[28pt]">
            <CVTemplate cvData={cvData} profile={profileInfo} />
          </div>
        </div>
      </div>
    )
  }

  // Cover letter print view
  if (showCLPrintView && coverLetter) {
    return (
      <div>
        <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
          >
            Download PDF
          </button>
          <button
            onClick={() => setShowCLPrintView(false)}
            className="px-4 py-2 bg-white border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>
        <div className="min-h-screen bg-[#f0ede8] flex justify-center py-12">
          <div className="bg-white shadow-lg">
            <CoverLetterTemplate coverLetter={coverLetter} job={job} profile={profile} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/" className="text-gray-400 hover:text-gray-600 mt-1 text-sm">← Back</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{job.role}</h1>
            {job.tier && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[job.tier]}`}>{job.tier}</span>
            )}
            <select
              value={currentStatus ?? ''}
              onChange={e => changeStatus(e.target.value as JobStatus)}
              disabled={updatingStatus}
              className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                currentStatus ? STATUS_COLORS[currentStatus] : 'bg-gray-100 text-gray-400'
              } ${updatingStatus ? 'opacity-50' : ''}`}
            >
              <option value="" disabled>No status</option>
              {(Object.keys(STATUS_COLORS) as JobStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-500 mt-0.5">
            {job.company}
            {job.jobLink && (
              <> · <a href={job.jobLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View posting ↗</a></>
            )}
          </p>
        </div>
      </div>

      {noProfile && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-700">
          Your profile is empty. <Link href="/profile" className="font-semibold underline">Set up your profile first</Link> — just name, email, LinkedIn, portfolio.
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Left: Job Description */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Job Description</p>
          {job.jobDescription ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[72vh] overflow-y-auto">
              {job.jobDescription}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-sm text-gray-400">
              No job description in Notion.
            </div>
          )}
        </div>

        {/* Right: Generate */}
        <div>
          <div className="flex gap-2 mb-4">
            {(['cv', 'cover-letter'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'cv' ? 'CV' : 'Cover Letter'}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-96">
            {/* ── CV TAB ── */}
            {tab === 'cv' && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={generateCV}
                  disabled={loadingCV || !job.jobDescription}
                  className={`w-full py-3 rounded-xl text-white font-medium text-sm transition-all ${
                    loadingCV || !job.jobDescription
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90'
                  }`}
                >
                  {loadingCV ? 'Generating...' : cvData ? 'Regenerate CV' : 'Generate CV'}
                </button>

                {savedToNotion && tab === 'cv' && (
                  <p className="text-xs text-green-600 text-center">Saved to Notion page ✓</p>
                )}

                {cvData && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                      <p className="font-semibold text-gray-500 text-xs uppercase tracking-wide mb-2">Summary</p>
                      <p>{cvData.summary}</p>
                      <p className="font-semibold text-gray-500 text-xs uppercase tracking-wide mt-3 mb-1">Experiences selected</p>
                      {cvData.selectedExperiences.map((exp, i) => (
                        <p key={i} className="text-gray-600">▪ {exp.title} — {exp.company}</p>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={refineCVInput}
                        onChange={e => setRefineCVInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && refineCV()}
                        placeholder="Refine: swap Gen.G for Procon, shorten the summary..."
                        disabled={refiningCV}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                      />
                      <button
                        onClick={refineCV}
                        disabled={refiningCV || !refineCVInput.trim()}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                          refiningCV || !refineCVInput.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {refiningCV ? '...' : '↵'}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPrintView(true)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Preview
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/jobs/${job.id}/cv-pdf`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cvData }),
                          })
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `CV_${profile.name.replace(/\s+/g, '_')}.pdf`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── COVER LETTER TAB ── */}
            {tab === 'cover-letter' && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={generateCoverLetter}
                  disabled={loadingCL || !job.jobDescription}
                  className={`w-full py-3 rounded-xl text-white font-medium text-sm transition-all ${
                    loadingCL || !job.jobDescription
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90'
                  }`}
                >
                  {loadingCL ? 'Generating...' : coverLetter ? 'Regenerate' : 'Generate Cover Letter'}
                </button>

                {savedToNotion && tab === 'cover-letter' && (
                  <p className="text-xs text-green-600 text-center">Saved to Notion page ✓</p>
                )}

                {coverLetter && (
                  <>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{coverLetter}</pre>
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={refineInput}
                        onChange={e => setRefineInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && refineCoverLetter()}
                        placeholder="Refine: make the hook more specific, loosen the tone..."
                        disabled={refining}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                      />
                      <button
                        onClick={refineCoverLetter}
                        disabled={refining || !refineInput.trim()}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                          refining || !refineInput.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {refining ? '...' : '↵'}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(coverLetter)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Copy Text
                      </button>
                      <button
                        onClick={() => setShowCLPrintView(true)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Preview
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/jobs/${job.id}/cover-letter-pdf`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ coverLetter }),
                          })
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `CoverLetter_${profile.name.replace(/\s+/g, '_')}.pdf`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700"
                      >
                        Download PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
