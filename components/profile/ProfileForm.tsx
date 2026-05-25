'use client'
import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

const SECTIONS = ['Parse CV', 'Personal Info', 'Experiences', 'Skills', 'Education', 'Cover Letter Templates']

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // CV parser state
  const [rawCV, setRawCV] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseMsg, setParseMsg] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(setProfile)
  }, [])

  const update = (updates: Partial<Profile>) =>
    setProfile(p => p ? { ...p, ...updates } : p)

  const save = async () => {
    if (!profile) return
    setSaving(true)
    await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const parseCV = async () => {
    if (!rawCV.trim()) return
    setParsing(true)
    setParseMsg('')
    const res = await fetch('/api/parse-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawCV }),
    })
    const data = await res.json()
    if (data.error) {
      setParseMsg('Failed to parse. Try again.')
    } else {
      setProfile(data)
      setParseMsg('Parsed! Review each section and save when ready.')
      setActiveSection(1)
    }
    setParsing(false)
  }

  if (!profile) return <div className="p-8 text-gray-400">Loading...</div>

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <button
          onClick={save}
          disabled={saving}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 flex-wrap">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => setActiveSection(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === i ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {/* Parse CV */}
        {activeSection === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Paste the raw text of your current CV. Claude will extract all your experiences, skills, and education automatically. You can edit everything afterwards.
            </p>
            <textarea
              value={rawCV}
              onChange={e => setRawCV(e.target.value)}
              rows={14}
              placeholder="Paste your full CV text here..."
              className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-center gap-4">
              <button
                onClick={parseCV}
                disabled={parsing || !rawCV.trim()}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  parsing || !rawCV.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {parsing ? 'Parsing...' : 'Parse with AI'}
              </button>
              {parseMsg && <p className="text-sm text-green-600">{parseMsg}</p>}
            </div>
          </div>
        )}

        {/* Personal Info */}
        {activeSection === 1 && (
          <div className="grid grid-cols-2 gap-4">
            {(['name', 'email', 'phone', 'linkedin', 'portfolio', 'location'] as const).map(key => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 capitalize">{key}</label>
                <input
                  type="text"
                  value={profile[key]}
                  onChange={e => update({ [key]: e.target.value })}
                  placeholder={key === 'portfolio' ? 'https://yourportfolio.com' : key === 'phone' ? '+1 234 567 8900' : ''}
                  className={inputCls}
                />
              </div>
            ))}
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">One-line Summary</label>
              <input value={profile.summary} onChange={e => update({ summary: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Languages <span className="text-gray-400 font-normal text-xs">(one per line, e.g. "French — Native")</span></label>
              <textarea
                value={profile.languages.join('\n')}
                onChange={e => update({ languages: e.target.value.split('\n').map(l => l.trim()).filter(Boolean) })}
                rows={3} className={`${inputCls} resize-none`}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Other Information <span className="text-gray-400 font-normal text-xs">(one per line — first item appears in the CV header)</span></label>
              <textarea
                value={profile.otherInfo.join('\n')}
                onChange={e => update({ otherInfo: e.target.value.split('\n').map(l => l.trim()).filter(Boolean) })}
                rows={3} className={`${inputCls} resize-none`}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Key Stats <span className="text-gray-400 font-normal text-xs">(used in CV summary and cover letter — one per line)</span></label>
              <textarea
                value={profile.keyStats.join('\n')}
                onChange={e => update({ keyStats: e.target.value.split('\n').map(l => l.trim()).filter(Boolean) })}
                rows={4} className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        )}

        {/* Experiences */}
        {activeSection === 2 && (
          <div className="flex flex-col gap-6">
            {profile.experiences.map((exp, i) => (
              <div key={exp.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-800">Experience {i + 1}</span>
                  <button
                    onClick={() => update({ experiences: profile.experiences.filter(e => e.id !== exp.id) })}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['title', 'company', 'startDate', 'endDate'] as const).map(field => (
                    <div key={field} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                      <input
                        value={exp[field]}
                        onChange={e => update({
                          experiences: profile.experiences.map(ex =>
                            ex.id === exp.id ? { ...ex, [field]: e.target.value } : ex
                          )
                        })}
                        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-600">Bullets</label>
                  {exp.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={bullet}
                        onChange={e => {
                          const bullets = [...exp.bullets]
                          bullets[idx] = e.target.value
                          update({ experiences: profile.experiences.map(ex => ex.id === exp.id ? { ...ex, bullets } : ex) })
                        }}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => update({
                          experiences: profile.experiences.map(ex =>
                            ex.id === exp.id ? { ...ex, bullets: exp.bullets.filter((_, j) => j !== idx) } : ex
                          )
                        })}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none"
                      >×</button>
                    </div>
                  ))}
                  <button
                    onClick={() => update({
                      experiences: profile.experiences.map(ex =>
                        ex.id === exp.id ? { ...ex, bullets: [...exp.bullets, ''] } : ex
                      )
                    })}
                    className="text-xs text-blue-600 hover:underline self-start"
                  >+ Add bullet</button>
                </div>
              </div>
            ))}
            <button
              onClick={() => update({
                experiences: [...profile.experiences, { id: uuidv4(), title: '', company: '', startDate: '', endDate: '', bullets: [''] }]
              })}
              className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add Experience
            </button>
          </div>
        )}

        {/* Skills */}
        {activeSection === 3 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <span key={skill} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
                  {skill}
                  <button onClick={() => update({ skills: profile.skills.filter(s => s !== skill) })} className="text-blue-400 hover:text-blue-700 ml-1">×</button>
                </span>
              ))}
            </div>
            <SkillInput onAdd={skill => update({ skills: [...profile.skills, skill] })} />
          </div>
        )}

        {/* Education */}
        {activeSection === 4 && (
          <div className="flex flex-col gap-4">
            {profile.education.map((edu, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">Education {i + 1}</span>
                  <button onClick={() => update({ education: profile.education.filter((_, j) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['degree', 'school', 'year'] as const).map(field => (
                    <div key={field} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600 capitalize">{field}</label>
                      <input
                        value={edu[field]}
                        onChange={e => update({ education: profile.education.map((ed, j) => j === i ? { ...ed, [field]: e.target.value } : ed) })}
                        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => update({ education: [...profile.education, { degree: '', school: '', year: '' }] })}
              className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >+ Add Education</button>
          </div>
        )}

        {/* Cover Letter Templates */}
        {activeSection === 5 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">Paste 1–3 cover letters you've written. The AI uses these as a style reference — tone, structure, voice.</p>
            {profile.coverLetterTemplates.map((t, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-gray-700">Template {i + 1}</label>
                  <button onClick={() => update({ coverLetterTemplates: profile.coverLetterTemplates.filter((_, j) => j !== i) })} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
                <textarea
                  value={t}
                  onChange={e => update({ coverLetterTemplates: profile.coverLetterTemplates.map((tmpl, j) => j === i ? e.target.value : tmpl) })}
                  rows={8}
                  placeholder="Paste a cover letter here..."
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            ))}
            {profile.coverLetterTemplates.length < 3 && (
              <button
                onClick={() => update({ coverLetterTemplates: [...profile.coverLetterTemplates, ''] })}
                className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >+ Add Template</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SkillInput({ onAdd }: { onAdd: (skill: string) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const trimmed = input.trim()
    if (trimmed) { onAdd(trimmed); setInput('') }
  }
  return (
    <div className="flex gap-2">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && add()}
        placeholder="Add a skill (press Enter)"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button onClick={add} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Add</button>
    </div>
  )
}
