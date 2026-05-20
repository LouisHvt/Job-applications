# Job Applications Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js app that lets Louis paste job postings, generate tailored CVs and cover letters via Claude, and track applications on a kanban board.

**Architecture:** Next.js 14 App Router with file-system JSON storage (`data/`). API routes handle all data reads/writes and Claude API calls. UI is React with Tailwind; drag-and-drop via `@hello-pangea/dnd`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Anthropic SDK (`claude-haiku-4-5`), `@hello-pangea/dnd`, `uuid`

---

## Master Profile — Where to Edit

`/profile` is the single source of truth the AI pulls from. Edit it before generating anything:

- **Experiences** — each role has bullet points; write them rich and specific, the AI picks the most relevant ones
- **Skills** — tag list the AI references for the skills section
- **Cover Letter Templates** — paste 1–3 of your existing letters; the AI imitates your tone/style
- Data persists to `data/profile.json` (never committed)

---

## File Map

```
app/
  layout.tsx                          # Root layout, nav
  page.tsx                            # Dashboard (kanban)
  jobs/[id]/page.tsx                  # Job detail
  profile/page.tsx                    # Master profile editor
  api/
    profile/route.ts                  # GET/PUT profile.json
    jobs/route.ts                     # GET all jobs / POST new job
    jobs/[id]/route.ts                # GET/PUT/DELETE single job
    generate-cv/route.ts              # POST: call Claude → tailored CV
    generate-cover-letter/route.ts    # POST: call Claude → cover letter

components/
  Nav.tsx                             # Top navigation bar
  StatsBar.tsx                        # Stats row above kanban
  KanbanBoard.tsx                     # DnD board shell
  JobCard.tsx                         # Single card
  NewJobModal.tsx                     # "Add application" modal
  JobDetail/
    index.tsx                         # Two-panel shell
    CVTab.tsx                         # Generate + display CV
    CoverLetterTab.tsx                # Generate + display cover letter
    NotesTab.tsx                      # Free-text notes
    TimelineTab.tsx                   # Status history + next action
  profile/
    ProfileForm.tsx                   # Top-level form shell
    PersonalInfoSection.tsx           # Name, email, location, summary
    ExperiencesSection.tsx            # List of roles + bullets
    SkillsSection.tsx                 # Tag editor
    EducationSection.tsx              # Degree/school/year list
    CoverLetterTemplatesSection.tsx   # Paste templates

lib/
  types.ts                            # All shared TypeScript types
  data.ts                             # JSON file read/write helpers
  prompts.ts                          # Claude prompt builders
  anthropic.ts                        # Anthropic SDK client

data/                                 # Created at runtime, gitignored
  profile.json
  jobs/
    [uuid].json
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `.env.local.example`
- Create: `.gitignore`
- Create: `data/.gitkeep`, `data/jobs/.gitkeep`

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
```

When prompted: No to src/ directory, Yes to App Router.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @hello-pangea/dnd uuid @anthropic-ai/sdk
npm install --save-dev @types/uuid
```

- [ ] **Step 3: Create `.env.local.example`**

```
ANTHROPIC_API_KEY=your-key-here
```

Copy it: `cp .env.local.example .env.local` and fill in your real key.

- [ ] **Step 4: Add data directories to .gitignore**

Add to `.gitignore`:
```
.env.local
data/profile.json
data/jobs/
!data/.gitkeep
!data/jobs/.gitkeep
```

- [ ] **Step 5: Create placeholder data files**

```bash
mkdir -p data/jobs
touch data/.gitkeep data/jobs/.gitkeep
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running at http://localhost:3000 with default Next.js page.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with dependencies"
```

---

## Task 2: Types and Data Layer

**Files:**
- Create: `lib/types.ts`
- Create: `lib/data.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```typescript
export type JobStatus = 'target' | 'in_progress' | 'applied' | 'interview' | 'closed'

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
  linkedin: string
  location: string
  summary: string
  experiences: Experience[]
  skills: string[]
  education: Education[]
  coverLetterTemplates: string[]
}

export interface StatusHistoryEntry {
  status: JobStatus
  changedAt: string
}

export interface NextAction {
  label: string
  dueDate: string
}

export interface Job {
  id: string
  company: string
  role: string
  location: string
  industry: string
  status: JobStatus
  posting: string
  addedAt: string
  statusHistory: StatusHistoryEntry[]
  generatedCV: string
  generatedCoverLetter: string
  notes: string
  nextAction: NextAction | null
}
```

- [ ] **Step 2: Write `lib/data.ts`**

```typescript
import fs from 'fs'
import path from 'path'
import { Profile, Job } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const PROFILE_PATH = path.join(DATA_DIR, 'profile.json')
const JOBS_DIR = path.join(DATA_DIR, 'jobs')

const DEFAULT_PROFILE: Profile = {
  name: '',
  email: '',
  linkedin: '',
  location: '',
  summary: '',
  experiences: [],
  skills: [],
  education: [],
  coverLetterTemplates: [],
}

export function getProfile(): Profile {
  if (!fs.existsSync(PROFILE_PATH)) return DEFAULT_PROFILE
  return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'))
}

export function saveProfile(profile: Profile): void {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2))
}

export function getAllJobs(): Job[] {
  if (!fs.existsSync(JOBS_DIR)) return []
  return fs.readdirSync(JOBS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), 'utf-8')))
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
}

export function getJob(id: string): Job | null {
  const jobPath = path.join(JOBS_DIR, `${id}.json`)
  if (!fs.existsSync(jobPath)) return null
  return JSON.parse(fs.readFileSync(jobPath, 'utf-8'))
}

export function saveJob(job: Job): void {
  if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true })
  fs.writeFileSync(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify(job, null, 2))
}

export function deleteJob(id: string): void {
  const jobPath = path.join(JOBS_DIR, `${id}.json`)
  if (fs.existsSync(jobPath)) fs.unlinkSync(jobPath)
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/data.ts
git commit -m "feat: add types and JSON data layer"
```

---

## Task 3: API Routes — Profile + Jobs

**Files:**
- Create: `app/api/profile/route.ts`
- Create: `app/api/jobs/route.ts`
- Create: `app/api/jobs/[id]/route.ts`

- [ ] **Step 1: Write `app/api/profile/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getProfile, saveProfile } from '@/lib/data'
import { Profile } from '@/lib/types'

export async function GET() {
  return NextResponse.json(getProfile())
}

export async function PUT(request: Request) {
  const profile: Profile = await request.json()
  saveProfile(profile)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write `app/api/jobs/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getAllJobs, saveJob } from '@/lib/data'
import { Job } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  return NextResponse.json(getAllJobs())
}

export async function POST(request: Request) {
  const body = await request.json()
  const job: Job = {
    id: uuidv4(),
    company: body.company,
    role: body.role,
    location: body.location ?? '',
    industry: body.industry ?? '',
    status: 'target',
    posting: body.posting ?? '',
    addedAt: new Date().toISOString(),
    statusHistory: [{ status: 'target', changedAt: new Date().toISOString() }],
    generatedCV: '',
    generatedCoverLetter: '',
    notes: '',
    nextAction: null,
  }
  saveJob(job)
  return NextResponse.json(job, { status: 201 })
}
```

- [ ] **Step 3: Write `app/api/jobs/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getJob, saveJob, deleteJob } from '@/lib/data'
import { Job } from '@/lib/types'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = getJob(params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const existing = getJob(params.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updates: Partial<Job> = await request.json()
  const updated: Job = { ...existing, ...updates }
  saveJob(updated)
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  deleteJob(params.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Test routes manually**

Start dev server: `npm run dev`

Test profile GET:
```bash
curl http://localhost:3000/api/profile
```
Expected: `{"name":"","email":"", ...}`

Test job POST:
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"company":"Stripe","role":"PM","location":"Paris"}'
```
Expected: JSON with a UUID id, status "target".

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add profile and jobs API routes"
```

---

## Task 4: Root Layout + Nav

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/Nav.tsx`

- [ ] **Step 1: Write `components/Nav.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        path === href
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  )
  return (
    <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-6 gap-2">
      <span className="font-semibold text-gray-900 mr-4">Job Applications</span>
      {link('/', 'Dashboard')}
      {link('/profile', 'My Profile')}
    </nav>
  )
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Job Applications',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify in browser**

Visit http://localhost:3000 — should see nav bar with "Dashboard" and "My Profile" links.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx components/Nav.tsx
git commit -m "feat: add root layout and navigation"
```

---

## Task 5: Profile Page

**Files:**
- Create: `components/profile/PersonalInfoSection.tsx`
- Create: `components/profile/ExperiencesSection.tsx`
- Create: `components/profile/SkillsSection.tsx`
- Create: `components/profile/EducationSection.tsx`
- Create: `components/profile/CoverLetterTemplatesSection.tsx`
- Create: `components/profile/ProfileForm.tsx`
- Create: `app/profile/page.tsx`

- [ ] **Step 1: Write `components/profile/PersonalInfoSection.tsx`**

```typescript
import { Profile } from '@/lib/types'

interface Props {
  profile: Profile
  onChange: (updates: Partial<Profile>) => void
}

export default function PersonalInfoSection({ profile, onChange }: Props) {
  const field = (label: string, key: keyof Profile, type = 'text') => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={profile[key] as string}
        onChange={e => onChange({ [key]: e.target.value })}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
  return (
    <section className="grid grid-cols-2 gap-4">
      {field('Full Name', 'name')}
      {field('Email', 'email', 'email')}
      {field('LinkedIn URL', 'linkedin')}
      {field('Location', 'location')}
      <div className="col-span-2 flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">One-line Summary</label>
        <input
          value={profile.summary}
          onChange={e => onChange({ summary: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `components/profile/ExperiencesSection.tsx`**

```typescript
'use client'
import { Experience } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  experiences: Experience[]
  onChange: (experiences: Experience[]) => void
}

export default function ExperiencesSection({ experiences, onChange }: Props) {
  const add = () =>
    onChange([
      ...experiences,
      { id: uuidv4(), title: '', company: '', startDate: '', endDate: '', bullets: [''] },
    ])

  const update = (id: string, updates: Partial<Experience>) =>
    onChange(experiences.map(e => (e.id === id ? { ...e, ...updates } : e)))

  const remove = (id: string) => onChange(experiences.filter(e => e.id !== id))

  const updateBullet = (expId: string, idx: number, value: string) => {
    const exp = experiences.find(e => e.id === expId)!
    const bullets = [...exp.bullets]
    bullets[idx] = value
    update(expId, { bullets })
  }

  const addBullet = (expId: string) => {
    const exp = experiences.find(e => e.id === expId)!
    update(expId, { bullets: [...exp.bullets, ''] })
  }

  const removeBullet = (expId: string, idx: number) => {
    const exp = experiences.find(e => e.id === expId)!
    update(expId, { bullets: exp.bullets.filter((_, i) => i !== idx) })
  }

  const input = (label: string, value: string, onCh: (v: string) => void) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        value={value}
        onChange={e => onCh(e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {experiences.map((exp, i) => (
        <div key={exp.id} className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-800">Experience {i + 1}</span>
            <button onClick={() => remove(exp.id)} className="text-xs text-red-500 hover:underline">
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {input('Job Title', exp.title, v => update(exp.id, { title: v }))}
            {input('Company', exp.company, v => update(exp.id, { company: v }))}
            {input('Start Date', exp.startDate, v => update(exp.id, { startDate: v }))}
            {input('End Date', exp.endDate, v => update(exp.id, { endDate: v }))}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-600">Bullet Points</label>
            {exp.bullets.map((bullet, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={bullet}
                  onChange={e => updateBullet(exp.id, idx, e.target.value)}
                  placeholder="Describe what you did and the impact..."
                  className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeBullet(exp.id, idx)}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => addBullet(exp.id)}
              className="text-xs text-blue-600 hover:underline self-start"
            >
              + Add bullet
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Add Experience
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Write `components/profile/SkillsSection.tsx`**

```typescript
'use client'
import { useState } from 'react'

interface Props {
  skills: string[]
  onChange: (skills: string[]) => void
}

export default function SkillsSection({ skills, onChange }: Props) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed])
    }
    setInput('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {skills.map(skill => (
          <span key={skill} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
            {skill}
            <button onClick={() => onChange(skills.filter(s => s !== skill))} className="text-blue-400 hover:text-blue-700 ml-1">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add a skill (press Enter)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={add} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Add
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `components/profile/EducationSection.tsx`**

```typescript
import { Education } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  education: Education[]
  onChange: (education: Education[]) => void
}

export default function EducationSection({ education, onChange }: Props) {
  const add = () => onChange([...education, { degree: '', school: '', year: '' }])
  const update = (i: number, updates: Partial<Education>) =>
    onChange(education.map((e, idx) => (idx === i ? { ...e, ...updates } : e)))
  const remove = (i: number) => onChange(education.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-4">
      {education.map((edu, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">Education {i + 1}</span>
            <button onClick={() => remove(i)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['degree', 'school', 'year'] as const).map(field => (
              <div key={field} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 capitalize">{field}</label>
                <input
                  value={edu[field]}
                  onChange={e => update(i, { [field]: e.target.value })}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Add Education
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Write `components/profile/CoverLetterTemplatesSection.tsx`**

```typescript
interface Props {
  templates: string[]
  onChange: (templates: string[]) => void
}

export default function CoverLetterTemplatesSection({ templates, onChange }: Props) {
  const update = (i: number, value: string) =>
    onChange(templates.map((t, idx) => (idx === i ? value : t)))
  const add = () => onChange([...templates, ''])
  const remove = (i: number) => onChange(templates.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        Paste 1–3 cover letters you've written. The AI uses these as a style reference — it learns your tone, structure, and voice.
      </p>
      {templates.map((t, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-gray-700">Template {i + 1}</label>
            <button onClick={() => remove(i)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
          <textarea
            value={t}
            onChange={e => update(i, e.target.value)}
            rows={8}
            placeholder="Paste a cover letter here..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      ))}
      {templates.length < 3 && (
        <button
          onClick={add}
          className="border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Add Template
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write `components/profile/ProfileForm.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { Profile } from '@/lib/types'
import PersonalInfoSection from './PersonalInfoSection'
import ExperiencesSection from './ExperiencesSection'
import SkillsSection from './SkillsSection'
import EducationSection from './EducationSection'
import CoverLetterTemplatesSection from './CoverLetterTemplatesSection'

const SECTIONS = ['Personal Info', 'Experiences', 'Skills', 'Education', 'Cover Letter Templates']

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState(0)

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

  if (!profile) return <div className="p-8 text-gray-400">Loading...</div>

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

      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
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
        {activeSection === 0 && <PersonalInfoSection profile={profile} onChange={update} />}
        {activeSection === 1 && <ExperiencesSection experiences={profile.experiences} onChange={v => update({ experiences: v })} />}
        {activeSection === 2 && <SkillsSection skills={profile.skills} onChange={v => update({ skills: v })} />}
        {activeSection === 3 && <EducationSection education={profile.education} onChange={v => update({ education: v })} />}
        {activeSection === 4 && <CoverLetterTemplatesSection templates={profile.coverLetterTemplates} onChange={v => update({ coverLetterTemplates: v })} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write `app/profile/page.tsx`**

```typescript
import ProfileForm from '@/components/profile/ProfileForm'

export default function ProfilePage() {
  return <ProfileForm />
}
```

- [ ] **Step 8: Verify in browser**

Visit http://localhost:3000/profile — should see profile form with 5 tab sections. Add a skill, click Save — refresh page, skill should persist.

- [ ] **Step 9: Commit**

```bash
git add app/profile/ components/profile/
git commit -m "feat: add master profile page with all sections"
```

---

## Task 6: Dashboard — Kanban Board

**Files:**
- Create: `components/StatsBar.tsx`
- Create: `components/JobCard.tsx`
- Create: `components/KanbanBoard.tsx`
- Create: `components/NewJobModal.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Write `components/StatsBar.tsx`**

```typescript
import { Job } from '@/lib/types'

const statBox = (label: string, value: number, color: string) => (
  <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex flex-col gap-0.5">
    <span className={`text-2xl font-bold ${color}`}>{value}</span>
    <span className="text-xs text-gray-500">{label}</span>
  </div>
)

export default function StatsBar({ jobs }: { jobs: Job[] }) {
  const applied = jobs.filter(j => ['applied', 'interview', 'closed'].includes(j.status)).length
  const interviews = jobs.filter(j => j.status === 'interview').length
  const responseRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0

  return (
    <div className="flex gap-4 mb-6">
      {statBox('Total Tracked', jobs.length, 'text-gray-900')}
      {statBox('Applied', applied, 'text-blue-600')}
      {statBox('Interviews', interviews, 'text-green-600')}
      {statBox('Response Rate', responseRate, 'text-purple-600')}
    </div>
  )
}
```

- [ ] **Step 2: Write `components/JobCard.tsx`**

```typescript
import { Job, JobStatus } from '@/lib/types'
import Link from 'next/link'

const STATUS_COLORS: Record<JobStatus, string> = {
  target: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-50 text-yellow-700',
  applied: 'bg-blue-50 text-blue-700',
  interview: 'bg-green-50 text-green-700',
  closed: 'bg-red-50 text-red-600',
}

export default function JobCard({ job }: { job: Job }) {
  const initial = job.company.charAt(0).toUpperCase()
  const date = new Date(job.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{job.company}</p>
            <p className="text-gray-500 text-xs truncate">{job.role}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          {job.industry && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {job.industry}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{date}</span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Write `components/KanbanBoard.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Job, JobStatus } from '@/lib/types'
import JobCard from './JobCard'

const COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: 'target', label: 'Target', color: 'bg-gray-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-yellow-400' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { id: 'interview', label: 'Interview', color: 'bg-green-500' },
  { id: 'closed', label: 'Closed', color: 'bg-red-400' },
]

interface Props {
  initialJobs: Job[]
}

export default function KanbanBoard({ initialJobs }: Props) {
  const [jobs, setJobs] = useState(initialJobs)

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const newStatus = result.destination.droppableId as JobStatus
    const jobId = result.draggableId

    setJobs(prev =>
      prev.map(j => j.id === jobId ? {
        ...j,
        status: newStatus,
        statusHistory: [...j.statusHistory, { status: newStatus, changedAt: new Date().toISOString() }],
      } : j)
    )

    await fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        statusHistory: [
          ...jobs.find(j => j.id === jobId)!.statusHistory,
          { status: newStatus, changedAt: new Date().toISOString() },
        ],
      }),
    })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colJobs = jobs.filter(j => j.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-64">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <span className="font-medium text-gray-700 text-sm">{col.label}</span>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {colJobs.length}
                </span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 min-h-24 rounded-xl p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-100'
                    }`}
                  >
                    {colJobs.map((job, index) => (
                      <Draggable key={job.id} draggableId={job.id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                            <JobCard job={job} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
```

- [ ] **Step 4: Write `components/NewJobModal.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
}

export default function NewJobModal({ onClose }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({ company: '', role: '', location: '', industry: '', posting: '' })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.company || !form.role) return
    setLoading(true)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const job = await res.json()
    onClose()
    router.push(`/jobs/${job.id}`)
    router.refresh()
  }

  const field = (label: string, key: keyof typeof form, required = false, rows?: number) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {rows ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={rows}
          placeholder={key === 'posting' ? 'Paste the full job posting here...' : ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      ) : (
        <input
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">New Application</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('Company', 'company', true)}
          {field('Role', 'role', true)}
          {field('Location', 'location')}
          {field('Industry', 'industry')}
        </div>
        {field('Job Posting', 'posting', false, 6)}
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !form.company || !form.role}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Application'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `app/page.tsx`**

```typescript
import { getAllJobs } from '@/lib/data'
import KanbanBoard from '@/components/KanbanBoard'
import StatsBar from '@/components/StatsBar'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const jobs = getAllJobs()
  return <DashboardClient jobs={jobs} />
}
```

- [ ] **Step 6: Create `components/DashboardClient.tsx`** (wraps server data + client modal state)

```typescript
'use client'
import { useState } from 'react'
import { Job } from '@/lib/types'
import KanbanBoard from './KanbanBoard'
import StatsBar from './StatsBar'
import NewJobModal from './NewJobModal'

export default function DashboardClient({ jobs }: { jobs: Job[] }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + New Application
        </button>
      </div>
      <StatsBar jobs={jobs} />
      <KanbanBoard initialJobs={jobs} />
      {showModal && <NewJobModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
```

- [ ] **Step 7: Verify in browser**

Visit http://localhost:3000 — should see stats bar, 5 kanban columns, and "+ New Application" button. Click it, fill in company + role, submit — should redirect to job detail (404 for now, that's fine).

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx components/StatsBar.tsx components/JobCard.tsx components/KanbanBoard.tsx components/NewJobModal.tsx components/DashboardClient.tsx
git commit -m "feat: add kanban dashboard with stats, cards, and new job modal"
```

---

## Task 7: Claude API Setup + Prompt Builders

**Files:**
- Create: `lib/anthropic.ts`
- Create: `lib/prompts.ts`

- [ ] **Step 1: Write `lib/anthropic.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

- [ ] **Step 2: Write `lib/prompts.ts`**

```typescript
import { Profile } from './types'

export function buildCVSystemPrompt(profile: Profile): string {
  return `You are an expert CV writer. You will receive a job posting and tailor the following professional profile to it.

PROFILE:
Name: ${profile.name}
Location: ${profile.location}
Email: ${profile.email}
LinkedIn: ${profile.linkedin}
Summary: ${profile.summary}

EXPERIENCES:
${profile.experiences.map(e => `
Role: ${e.title} at ${e.company} (${e.startDate} – ${e.endDate})
Bullets:
${e.bullets.map(b => `- ${b}`).join('\n')}
`).join('\n')}

SKILLS: ${profile.skills.join(', ')}

EDUCATION:
${profile.education.map(e => `${e.degree}, ${e.school}, ${e.year}`).join('\n')}

INSTRUCTIONS:
- Select the 3-4 most relevant experiences for this role
- Rewrite bullet points to mirror the language and priorities in the job posting
- Do NOT invent new achievements — only rephrase existing ones
- Return a JSON object with this exact structure:
{
  "summary": "one tailored summary sentence",
  "selectedExperienceIds": ["id1", "id2", ...],
  "rewrittenBullets": {
    "experienceId": ["bullet 1", "bullet 2", ...]
  },
  "skills": ["skill1", "skill2", ...],
  "education": [{ "degree": "", "school": "", "year": "" }]
}`.trim()
}

export function buildCoverLetterSystemPrompt(profile: Profile): string {
  const templates = profile.coverLetterTemplates.filter(t => t.trim())
  return `You are an expert cover letter writer. You will write a tailored cover letter in the voice of ${profile.name}.

PROFILE SUMMARY: ${profile.summary}

EXPERIENCES:
${profile.experiences.slice(0, 4).map(e => `${e.title} at ${e.company}: ${e.bullets[0] ?? ''}`).join('\n')}

${templates.length > 0 ? `STYLE REFERENCE (previous cover letters — match the tone and structure):
${templates.map((t, i) => `--- Template ${i + 1} ---\n${t}`).join('\n\n')}` : ''}

INSTRUCTIONS:
- Write a 3-paragraph cover letter (opening, value proposition, closing)
- Match the tone of the style reference if provided
- Mirror language from the job posting
- Be direct and specific — no clichés
- Return plain text only, no markdown`.trim()
}
```

- [ ] **Step 3: Write `app/api/generate-cv/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { getProfile, getJob, saveJob } from '@/lib/data'
import { buildCVSystemPrompt } from '@/lib/prompts'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  const job = getJob(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const profile = getProfile()
  const system = buildCVSystemPrompt(profile)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.posting}\n\nGenerate a tailored CV based on this posting.` }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

  const cvData = JSON.parse(jsonMatch[0])
  const cvText = JSON.stringify(cvData)

  saveJob({ ...job, generatedCV: cvText })

  return NextResponse.json({ cv: cvData })
}
```

- [ ] **Step 4: Write `app/api/generate-cover-letter/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { getProfile, getJob, saveJob } from '@/lib/data'
import { buildCoverLetterSystemPrompt } from '@/lib/prompts'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  const job = getJob(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const profile = getProfile()
  const system = buildCoverLetterSystemPrompt(profile)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.posting}\n\nWrite a tailored cover letter.` }],
  })

  const coverLetter = (message.content[0] as { type: string; text: string }).text
  saveJob({ ...job, generatedCoverLetter: coverLetter })

  return NextResponse.json({ coverLetter })
}
```

- [ ] **Step 5: Verify API key works**

```bash
curl -X POST http://localhost:3000/api/generate-cv \
  -H "Content-Type: application/json" \
  -d '{"jobId":"test"}'
```

Expected: `{"error":"Job not found"}` (key is loading, route works).

- [ ] **Step 6: Commit**

```bash
git add lib/anthropic.ts lib/prompts.ts app/api/generate-cv/ app/api/generate-cover-letter/
git commit -m "feat: add Anthropic client and CV/cover letter generation routes"
```

---

## Task 8: Job Detail Page

**Files:**
- Create: `components/JobDetail/index.tsx`
- Create: `components/JobDetail/CVTab.tsx`
- Create: `components/JobDetail/CoverLetterTab.tsx`
- Create: `components/JobDetail/NotesTab.tsx`
- Create: `components/JobDetail/TimelineTab.tsx`
- Create: `app/jobs/[id]/page.tsx`

- [ ] **Step 1: Write `components/JobDetail/CVTab.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Job, Profile, Experience } from '@/lib/types'

interface CVData {
  summary: string
  selectedExperienceIds: string[]
  rewrittenBullets: Record<string, string[]>
  skills: string[]
  education: Array<{ degree: string; school: string; year: string }>
}

interface Props {
  job: Job
  profile: Profile
}

export default function CVTab({ job, profile }: Props) {
  const [loading, setLoading] = useState(false)
  const [cvData, setCvData] = useState<CVData | null>(
    job.generatedCV ? JSON.parse(job.generatedCV) : null
  )

  const generate = async () => {
    setLoading(true)
    const res = await fetch('/api/generate-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    })
    const data = await res.json()
    setCvData(data.cv)
    setLoading(false)
  }

  const copyText = () => {
    if (!cvData) return
    const selectedExps = cvData.selectedExperienceIds.map(id => {
      const exp = profile.experiences.find(e => e.id === id)
      if (!exp) return ''
      const bullets = cvData.rewrittenBullets[id] ?? exp.bullets
      return `${exp.title} at ${exp.company} (${exp.startDate} – ${exp.endDate})\n${bullets.map(b => `• ${b}`).join('\n')}`
    }).join('\n\n')

    const text = `${profile.name}\n${profile.email} | ${profile.location}\n\nSUMMARY\n${cvData.summary}\n\nEXPERIENCE\n${selectedExps}\n\nSKILLS\n${cvData.skills.join(', ')}\n\nEDUCATION\n${cvData.education.map(e => `${e.degree}, ${e.school}, ${e.year}`).join('\n')}`
    navigator.clipboard.writeText(text)
  }

  const matchedCount = cvData?.selectedExperienceIds.length ?? 0

  return (
    <div className="flex flex-col gap-5">
      {cvData && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          AI matched <strong>{matchedCount}</strong> of your experiences to this role.
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading || !job.posting}
        className={`w-full py-3 rounded-xl text-white font-medium text-sm transition-all ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-green-500 hover:opacity-90'
        }`}
      >
        {loading ? 'Generating...' : cvData ? 'Regenerate CV' : 'Generate CV'}
      </button>

      {!job.posting && (
        <p className="text-xs text-amber-600 text-center">Add a job posting first to enable generation.</p>
      )}

      {cvData && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</h3>
            <p className="text-sm text-gray-700">{cvData.summary}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Experience</h3>
            {cvData.selectedExperienceIds.map(id => {
              const exp = profile.experiences.find(e => e.id === id)
              if (!exp) return null
              const bullets = cvData.rewrittenBullets[id] ?? exp.bullets
              return (
                <div key={id} className="mb-4">
                  <p className="text-sm font-semibold text-gray-900">{exp.title} — {exp.company}</p>
                  <p className="text-xs text-gray-400 mb-1">{exp.startDate} – {exp.endDate}</p>
                  <ul className="list-disc list-inside space-y-1">
                    {bullets.map((b, i) => (
                      <li key={i} className="text-sm text-gray-700">{b}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</h3>
            <p className="text-sm text-gray-700">{cvData.skills.join(', ')}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Education</h3>
            {cvData.education.map((e, i) => (
              <p key={i} className="text-sm text-gray-700">{e.degree}, {e.school}, {e.year}</p>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={copyText} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Copy Text
            </button>
            <button onClick={() => window.print()} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700">
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `components/JobDetail/CoverLetterTab.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Job } from '@/lib/types'

export default function CoverLetterTab({ job }: { job: Job }) {
  const [loading, setLoading] = useState(false)
  const [letter, setLetter] = useState(job.generatedCoverLetter)

  const generate = async () => {
    setLoading(true)
    const res = await fetch('/api/generate-cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    })
    const data = await res.json()
    setLetter(data.coverLetter)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={generate}
        disabled={loading || !job.posting}
        className={`w-full py-3 rounded-xl text-white font-medium text-sm transition-all ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-green-500 hover:opacity-90'
        }`}
      >
        {loading ? 'Generating...' : letter ? 'Regenerate Cover Letter' : 'Generate Cover Letter'}
      </button>

      {!job.posting && (
        <p className="text-xs text-amber-600 text-center">Add a job posting first to enable generation.</p>
      )}

      {letter && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{letter}</pre>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigator.clipboard.writeText(letter)}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Copy Text
            </button>
            <button onClick={() => window.print()} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700">
              Download PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `components/JobDetail/NotesTab.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Job } from '@/lib/types'

export default function NotesTab({ job }: { job: Job }) {
  const [notes, setNotes] = useState(job.notes)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={12}
        placeholder="Interview prep, contacts, thoughts, questions to ask..."
        className="border border-gray-200 rounded-xl p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <button
        onClick={save}
        className={`self-end px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
          saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {saved ? 'Saved!' : 'Save Notes'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Write `components/JobDetail/TimelineTab.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Job, JobStatus } from '@/lib/types'

const STATUS_LABELS: Record<JobStatus, string> = {
  target: 'Added to Target',
  in_progress: 'Moved to In Progress',
  applied: 'Application Sent',
  interview: 'Interview Scheduled',
  closed: 'Closed',
}

const STATUS_COLORS: Record<JobStatus, string> = {
  target: 'bg-gray-400',
  in_progress: 'bg-yellow-400',
  applied: 'bg-blue-500',
  interview: 'bg-green-500',
  closed: 'bg-red-400',
}

export default function TimelineTab({ job }: { job: Job }) {
  const [nextAction, setNextAction] = useState(job.nextAction ?? { label: '', dueDate: '' })
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextAction }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isOverdue = nextAction.dueDate && new Date(nextAction.dueDate) < new Date()

  return (
    <div className="flex flex-col gap-6">
      {nextAction.label && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
          Next: {nextAction.label}
          {nextAction.dueDate && ` — by ${new Date(nextAction.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Action</label>
        <input
          value={nextAction.label}
          onChange={e => setNextAction(a => ({ ...a, label: e.target.value }))}
          placeholder="e.g. Follow up with recruiter"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={nextAction.dueDate}
          onChange={e => setNextAction(a => ({ ...a, dueDate: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={save}
          className={`self-end px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">History</label>
        <div className="flex flex-col gap-3">
          {[...job.statusHistory].reverse().map((entry, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[entry.status]}`} />
              <span className="text-sm text-gray-700">{STATUS_LABELS[entry.status]}</span>
              <span className="ml-auto text-xs text-gray-400">
                {new Date(entry.changedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `components/JobDetail/index.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Job, JobStatus, Profile } from '@/lib/types'
import CVTab from './CVTab'
import CoverLetterTab from './CoverLetterTab'
import NotesTab from './NotesTab'
import TimelineTab from './TimelineTab'
import { useRouter } from 'next/navigation'

const TABS = ['CV', 'Cover Letter', 'Notes', 'Timeline']

const STATUS_ORDER: JobStatus[] = ['target', 'in_progress', 'applied', 'interview', 'closed']
const STATUS_LABELS: Record<JobStatus, string> = {
  target: 'Target',
  in_progress: 'In Progress',
  applied: 'Applied',
  interview: 'Interview',
  closed: 'Closed',
}
const STATUS_BADGE: Record<JobStatus, string> = {
  target: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-50 text-yellow-700',
  applied: 'bg-blue-50 text-blue-700',
  interview: 'bg-green-50 text-green-700',
  closed: 'bg-red-50 text-red-600',
}

interface Props {
  job: Job
  profile: Profile
}

export default function JobDetail({ job: initialJob, profile }: Props) {
  const [job, setJob] = useState(initialJob)
  const [activeTab, setActiveTab] = useState(0)
  const router = useRouter()

  const advance = async () => {
    const currentIdx = STATUS_ORDER.indexOf(job.status)
    if (currentIdx === STATUS_ORDER.length - 1) return
    const newStatus = STATUS_ORDER[currentIdx + 1]
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        statusHistory: [...job.statusHistory, { status: newStatus, changedAt: new Date().toISOString() }],
      }),
    })
    const updated = await res.json()
    setJob(updated)
  }

  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(job.status) + 1]

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {job.company.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{job.company}</h1>
          <p className="text-gray-500">{job.role}{job.location ? ` · ${job.location}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[job.status]}`}>
            {STATUS_LABELS[job.status]}
          </span>
          {nextStatus && (
            <button
              onClick={advance}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Move to {STATUS_LABELS[nextStatus]} →
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Job Posting</div>
          {job.posting ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[70vh] overflow-y-auto">
              {job.posting}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-400">
              No job posting added.
            </div>
          )}
        </div>

        <div>
          <div className="flex gap-2 mb-4">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === i ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 min-h-96">
            {activeTab === 0 && <CVTab job={job} profile={profile} />}
            {activeTab === 1 && <CoverLetterTab job={job} />}
            {activeTab === 2 && <NotesTab job={job} />}
            {activeTab === 3 && <TimelineTab job={job} />}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `app/jobs/[id]/page.tsx`**

```typescript
import { getJob, getProfile } from '@/lib/data'
import { notFound } from 'next/navigation'
import JobDetail from '@/components/JobDetail'

export const dynamic = 'force-dynamic'

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const job = getJob(params.id)
  if (!job) notFound()
  const profile = getProfile()
  return <JobDetail job={job} profile={profile} />
}
```

- [ ] **Step 7: Verify end-to-end**

1. Visit http://localhost:3000 — create a new application with a real job posting
2. You should land on the job detail page
3. Click the CV tab → "Generate CV" → should call Claude and display a tailored CV
4. Click the Cover Letter tab → "Generate Cover Letter" → should display a letter
5. Notes tab → type something → Save → refresh, notes persist
6. Timeline tab → set a next action → Save → check it appears

- [ ] **Step 8: Commit**

```bash
git add components/JobDetail/ app/jobs/
git commit -m "feat: add job detail page with CV, cover letter, notes, and timeline tabs"
```

---

## Task 9: Print CSS for PDF Export

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add print styles to `app/globals.css`**

```css
@media print {
  nav,
  button,
  .no-print {
    display: none !important;
  }

  body {
    background: white;
  }

  .print-content {
    padding: 0;
  }
}
```

- [ ] **Step 2: Wrap CV output in a `print-content` div**

In `components/JobDetail/CVTab.tsx`, wrap the CV output section (summary, experience, skills, education) in:
```tsx
<div className="print-content">
  {/* ... cv content ... */}
</div>
```

- [ ] **Step 3: Test**

Click "Download PDF" → browser print dialog → Save as PDF. Verify only CV content appears, no nav or buttons.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css components/JobDetail/CVTab.tsx
git commit -m "feat: add print CSS for PDF export"
```

---

## Done Criteria

The app is complete when:

- [ ] `npm run dev` starts with no errors
- [ ] `/profile` — can fill in all sections, save, refresh, data persists
- [ ] `/` — kanban board shows all 5 columns, can create new application, drag cards between columns
- [ ] `/jobs/[id]` — displays job posting, CV tab generates and displays a tailored CV, Cover Letter tab generates a letter, Notes save, Timeline shows history
- [ ] PDF export prints only the CV/letter content
