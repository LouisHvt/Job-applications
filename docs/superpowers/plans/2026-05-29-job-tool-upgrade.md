# Job Application Tool — 6-Feature Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pipeline stats, auto-generation on status change, PDF export, interview prep, and a daily job scout agent to the existing Next.js job application tool.

**Architecture:** Features extend existing API routes and components without rewriting the core generation logic. A new `lib/generate.ts` extracts shared generation logic used by both existing routes and the new auto-trigger. The scout agent uses Adzuna + Remotive free APIs with Claude Haiku scoring, runs on Vercel Cron at 1:00 and 13:00 UTC (2am/2pm CET), and is also manually triggerable from the Nav.

**Tech Stack:** Next.js 14.2 App Router, Notion API (`@notionhq/client`), Claude Haiku (`@anthropic-ai/sdk`), Tailwind CSS, `puppeteer-core` + `@sparticuz/chromium` for PDF export.

---

## File Map

**New files:**
| File | Purpose |
|------|---------|
| `components/StatsBar.tsx` | Pipeline stats bar rendered above job list |
| `lib/generate.ts` | Pure CV + cover letter generation logic (no HTTP, no Notion writes) |
| `lib/htmlTemplates.ts` | Server-side HTML string builders for PDF rendering |
| `lib/pdfRenderer.ts` | Puppeteer browser launcher (local vs Vercel) |
| `lib/scout.ts` | Adzuna + Remotive fetching, Claude scoring, dedup, stale-skip |
| `lib/prompts.ts` (additions) | `buildInterviewPrepPrompt` |
| `app/api/jobs/[id]/cv-pdf/route.ts` | CV PDF download endpoint |
| `app/api/jobs/[id]/cover-letter-pdf/route.ts` | Cover letter PDF download endpoint |
| `app/api/jobs/[id]/interview-prep/route.ts` | Interview prep generator |
| `app/api/scout/route.ts` | Scout agent (GET for cron, POST for manual) |
| `vercel.json` | Vercel Cron schedule config |

**Modified files:**
| File | Change |
|------|--------|
| `app/page.tsx` | Compute stats, render `<StatsBar>` |
| `app/api/jobs/[id]/route.ts` | On `Ready to Apply`, fire detached generation |
| `app/api/generate-cv/route.ts` | Delegate to `lib/generate.ts` |
| `app/api/generate-cover-letter/route.ts` | Delegate to `lib/generate.ts` |
| `components/JobDetail.tsx` | Add PDF download buttons + interview prep tab |
| `components/Nav.tsx` | Add "Scout now" button |
| `lib/notion.ts` | Add `fetchAllJobLinks`, `skipStaleProposed`, `writeInterviewPrepToPage` |
| `next.config.mjs` | Add `serverExternalPackages` for Puppeteer/Chromium |

---

## Task 1: Stats Bar

**Files:**
- Create: `components/StatsBar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/StatsBar.tsx`**

```tsx
interface StatsBarProps {
  proposed: number
  ready: number
  applied: number
  interviews: number
  thisWeek: number
}

export default function StatsBar({ proposed, ready, applied, interviews, thisWeek }: StatsBarProps) {
  const items = [
    { label: 'proposed', value: proposed },
    { label: 'ready', value: ready },
    { label: 'applied', value: applied },
    { label: 'interviews', value: interviews },
    { label: 'this week', value: thisWeek },
  ]
  return (
    <div className="flex items-center gap-6 px-5 py-3 bg-white border border-gray-200 rounded-xl mb-6 text-sm">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300 mr-4">·</span>}
          <span className="font-semibold text-gray-900">{item.value}</span>
          <span className="text-gray-400">{item.label}</span>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `app/page.tsx` to compute stats and render StatsBar**

```tsx
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
```

- [ ] **Step 3: Start dev server and verify stats bar appears above the job list**

Run: `npm run dev`  
Expected: A compact stats row showing counts above the job table. All counts accurate against Notion data.

- [ ] **Step 4: Commit**

```bash
git add components/StatsBar.tsx app/page.tsx
git commit -m "feat: add pipeline stats bar above job list"
```

---

## Task 2: Extract `lib/generate.ts`

This is a prerequisite for auto-generation (Task 3). It extracts the core logic from the two existing route files so both routes and the auto-trigger can share it.

**Files:**
- Create: `lib/generate.ts`
- Modify: `app/api/generate-cv/route.ts`
- Modify: `app/api/generate-cover-letter/route.ts`

- [ ] **Step 1: Create `lib/generate.ts`**

```ts
import { anthropic } from './anthropic'
import { getProfile } from './data'
import { fetchJob, fetchExperienceBank, writeGeneratedContentToPage } from './notion'
import { buildCVSystemPrompt, buildCoverLetterSystemPrompt } from './prompts'
import { Profile } from './types'
import { CVData } from '@/components/CVTemplate'

function formatCVAsText(
  cvData: CVData,
  profile: Profile
): string {
  const experiences = cvData.selectedExperiences
    .map(exp => `${exp.title} — ${exp.company} (${exp.period})\n${exp.bullets.map(b => `• ${b}`).join('\n')}`)
    .join('\n\n')
  return [
    profile.name,
    `${profile.email} | ${profile.location} | ${profile.linkedin}${profile.portfolio ? ` | ${profile.portfolio}` : ''}`,
    '',
    'SUMMARY',
    cvData.summary,
    '',
    'EXPERIENCE',
    experiences,
    '',
    'SKILLS',
    cvData.skills.join(', '),
    '',
    'EDUCATION',
    cvData.education.map(e => `${e.degree}, ${e.school} (${e.year})${e.highlight ? ` — ${e.highlight}` : ''}`).join('\n'),
  ].join('\n')
}

export async function generateCV(jobId: string): Promise<{ cv: CVData; cvText: string }> {
  const [job, experienceBank, profile] = await Promise.all([
    fetchJob(jobId),
    fetchExperienceBank(),
    Promise.resolve(getProfile()),
  ])
  if (!job) throw new Error('Job not found')
  if (!job.jobDescription) throw new Error('Job has no description')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: buildCVSystemPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nGenerate a tailored CV.` }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  const cv = JSON.parse(jsonMatch[0]) as CVData
  const cvText = formatCVAsText(cv, profile)
  return { cv, cvText }
}

export async function generateCoverLetter(jobId: string): Promise<{ coverLetter: string }> {
  const [job, experienceBank, profile] = await Promise.all([
    fetchJob(jobId),
    fetchExperienceBank(),
    Promise.resolve(getProfile()),
  ])
  if (!job) throw new Error('Job not found')
  if (!job.jobDescription) throw new Error('Job has no description')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: buildCoverLetterSystemPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nWrite a tailored cover letter.` }],
  })

  const coverLetter = (message.content[0] as { type: string; text: string }).text.trim()
  return { coverLetter }
}

// Used by auto-trigger: generates both and writes to Notion in a single append call.
export async function generateBothAndSave(jobId: string): Promise<void> {
  const [{ cv, cvText }, { coverLetter }] = await Promise.all([
    generateCV(jobId),
    generateCoverLetter(jobId),
  ])
  await writeGeneratedContentToPage(jobId, cvText, coverLetter)
}
```

- [ ] **Step 2: Refactor `app/api/generate-cv/route.ts` to use `lib/generate.ts`**

```ts
import { NextResponse } from 'next/server'
import { generateCV } from '@/lib/generate'
import { writeGeneratedContentToPage } from '@/lib/notion'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  try {
    const { cv, cvText } = await generateCV(jobId)
    await writeGeneratedContentToPage(jobId, cvText, null)
    return NextResponse.json({ cv, cvText })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    const status = msg === 'Job not found' ? 404 : msg === 'Job has no description' ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
```

- [ ] **Step 3: Refactor `app/api/generate-cover-letter/route.ts` to use `lib/generate.ts`**

```ts
import { NextResponse } from 'next/server'
import { generateCoverLetter } from '@/lib/generate'
import { writeGeneratedContentToPage } from '@/lib/notion'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  try {
    const { coverLetter } = await generateCoverLetter(jobId)
    await writeGeneratedContentToPage(jobId, '', coverLetter)
    return NextResponse.json({ coverLetter })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Generation failed'
    const status = msg === 'Job not found' ? 404 : msg === 'Job has no description' ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
```

- [ ] **Step 4: Verify existing CV + cover letter generation still works in the browser**

Navigate to a job with a description, click "Generate CV" and "Generate Cover Letter". Both should work identically to before.

- [ ] **Step 5: Commit**

```bash
git add lib/generate.ts app/api/generate-cv/route.ts app/api/generate-cover-letter/route.ts
git commit -m "refactor: extract core generation logic into lib/generate.ts"
```

---

## Task 3: Auto-Generate on "Ready to Apply"

**Files:**
- Modify: `app/api/jobs/[id]/route.ts`

- [ ] **Step 1: Update the PATCH route to fire background generation**

```ts
import { NextResponse } from 'next/server'
import { fetchJob, updateJobStatus } from '@/lib/notion'
import { generateBothAndSave } from '@/lib/generate'
import { JobStatus } from '@/lib/types'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = await fetchJob(params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status } = await req.json() as { status: JobStatus }
  await updateJobStatus(params.id, status)

  // Fire-and-forget: generate CV + cover letter when job is marked ready to apply.
  // Does not block the status update response.
  if (status === 'Ready to Apply') {
    generateBothAndSave(params.id).catch(err =>
      console.error(`Auto-generate failed for job ${params.id}:`, err)
    )
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Test the auto-trigger**

Open a `Proposed` job with a job description in the app. Change its status to `Ready to Apply`. The status dropdown updates immediately. Wait ~10–15 seconds, then open the Notion page for that job directly — you should see a generated CV and cover letter appended to the page.

- [ ] **Step 3: Commit**

```bash
git add app/api/jobs/[id]/route.ts
git commit -m "feat: auto-generate CV and cover letter when job moves to Ready to Apply"
```

---

## Task 4: PDF Export — Infrastructure

**Files:**
- Modify: `next.config.mjs`
- Create: `lib/pdfRenderer.ts`
- Create: `lib/htmlTemplates.ts`

- [ ] **Step 1: Install PDF dependencies**

```bash
npm install puppeteer-core @sparticuz/chromium
```

- [ ] **Step 2: Update `next.config.mjs` to exclude Puppeteer/Chromium from Next.js bundling**

```mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
}

export default nextConfig
```

- [ ] **Step 3: Create `lib/pdfRenderer.ts`**

Handles local (Windows Chrome) vs production (Vercel Chromium) browser launch.

```ts
import puppeteer from 'puppeteer-core'

export async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium')
    return puppeteer.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless as boolean,
    })
  }
  // Local dev: uses system Chrome. Set CHROME_PATH in .env.local if not at default location.
  const executablePath =
    process.env.CHROME_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  return puppeteer.launch({ executablePath, headless: true, args: [] })
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    // waitUntil: 'networkidle0' ensures Google Fonts load before PDF generation
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
```

- [ ] **Step 4: Add `CHROME_PATH` to `.env.local` (skip if Chrome is at the default path)**

Only needed if Chrome is not at `C:\Program Files\Google\Chrome\Application\chrome.exe`.

```
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

- [ ] **Step 5: Create `lib/htmlTemplates.ts`**

Builds complete HTML documents (matching the React template styles) for Puppeteer to render. The CV uses Arial/Calibri and the cover letter uses EB Garamond loaded via Google Fonts.

```ts
import { CVData } from '@/components/CVTemplate'
import { NotionJob, Profile } from './types'

export function buildCVHtml(cvData: CVData, profile: Profile): string {
  const portfolioDisplay = (profile.portfolio || '')
    .replace('https://', '').replace('http://', '')

  const experiencesHtml = cvData.selectedExperiences.map(exp => `
    <div style="margin-bottom:5pt">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-weight:bold;font-size:11pt;text-transform:uppercase">${exp.company.toUpperCase()}</span>
        <span style="font-size:11pt;font-style:italic">${exp.location}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2pt">
        <span style="font-weight:bold;font-size:11pt">${exp.title}</span>
        <span style="font-size:11pt">${exp.period}</span>
      </div>
      ${exp.bullets.map(b => `
        <div style="display:flex;gap:0;margin-bottom:1.5pt;font-size:11pt">
          <span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">▪</span>
          <span style="flex:1">${b}</span>
        </div>`).join('')}
    </div>`).join('')

  const educationHtml = cvData.education.map(edu => `
    <div style="margin-bottom:3pt">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-weight:bold;font-size:11pt;text-transform:uppercase">${edu.school.toUpperCase()}</span>
        <span style="font-size:11pt;font-style:italic">${edu.location}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2pt">
        <span style="font-weight:bold;font-size:11pt">${edu.degree}</span>
        <span style="font-size:11pt">${edu.year}</span>
      </div>
      ${edu.highlight ? `<div style="display:flex;gap:0;margin-bottom:1.5pt;font-size:11pt"><span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">▪</span><span style="flex:1">${edu.highlight}</span></div>` : ''}
    </div>`).join('')

  const languagesHtml = profile.languages.length > 0 ? `
    <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">LANGUAGES</div>
    <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
    ${profile.languages.map(lang => `
      <div style="display:flex;gap:0;margin-bottom:1.5pt;font-size:11pt">
        <span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">▪</span>
        <span style="flex:1">${lang}</span>
      </div>`).join('')}` : ''

  const skillsHtml = cvData.skills.length > 0 ? `
    <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">TECHNICAL SKILLS</div>
    <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
    <div style="font-size:11pt;margin-bottom:2pt;margin-top:2pt">${cvData.skills.join(' · ')}</div>` : ''

  const otherInfoHtml = profile.otherInfo.length > 1 ? `
    <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">OTHER INFORMATION</div>
    <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
    ${profile.otherInfo.slice(1).map(info => `
      <div style="display:flex;gap:0;margin-bottom:1.5pt;font-size:11pt">
        <span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">▪</span>
        <span style="flex:1">${info}</span>
      </div>`).join('')}` : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>* { box-sizing: border-box; margin: 0; padding: 0; }</style>
</head><body>
<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000;background:#fff;width:555pt;margin:0 auto;padding:14pt 0 20pt 0;line-height:1.25">
  <div style="font-size:17pt;font-weight:bold;text-align:center;margin-bottom:3pt;letter-spacing:1pt;text-transform:uppercase">${profile.name.toUpperCase()}</div>
  <div style="text-align:center;font-size:11pt;margin-bottom:1.5pt">${profile.location} &nbsp;|&nbsp; ${profile.phone} &nbsp;|&nbsp; ${profile.email}</div>
  <div style="display:flex;justify-content:space-between;font-size:11pt;margin-bottom:1.5pt">
    <span>${profile.linkedin.replace('https://', '')}${profile.otherInfo[0] ? ` &nbsp;|&nbsp; ${profile.otherInfo[0]}` : ''}</span>
    ${profile.portfolio ? `<span>Portfolio:&nbsp;<a href="${profile.portfolio}" style="color:#000;text-decoration:underline">${portfolioDisplay}</a></span>` : ''}
  </div>
  <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">PROFESSIONAL SUMMARY</div>
  <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
  <div style="font-size:11pt;margin-bottom:2pt;margin-top:2pt">${cvData.summary}</div>
  <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">EDUCATION</div>
  <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
  ${educationHtml}
  <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">PROFESSIONAL EXPERIENCE</div>
  <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
  ${experiencesHtml}
  ${languagesHtml}
  ${skillsHtml}
  ${otherInfoHtml}
</div>
</body></html>`
}

export function buildCoverLetterHtml(coverLetter: string, job: NotionJob, profile: Profile): string {
  const portfolioDisplay = (profile.portfolio || '')
    .replace('https://', '').replace('http://', '')
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const sigInitials = profile.name.split(' ').filter(Boolean).map((w: string) => w[0]).join('')

  const paragraphsHtml = coverLetter
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin-bottom:16px">${p}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>* { box-sizing: border-box; margin: 0; padding: 0; }</style>
</head><body>
<div style="font-family:'EB Garamond',Georgia,serif;font-size:14px;color:#1a1814;background:#fff;width:595pt;padding:54pt 68pt;line-height:1.65;margin:0 auto">
  <div style="font-size:21px;font-weight:500;letter-spacing:0.11px;color:#1a1814;margin-bottom:4px">${profile.name}</div>
  <div style="font-size:12.5px;font-style:italic;line-height:1.65;color:#4a463d">
    ${profile.email}<br/>${profile.phone}<br/>${portfolioDisplay}
  </div>
  <div style="font-size:12.5px;line-height:1.65;color:#4a463d;margin-top:20px">
    ${today}<br/>${profile.location || 'Madrid'}<br/><br/>${job.company}
  </div>
  <hr style="border:none;border-top:1px solid #4a463d;opacity:0.35;margin:18px 0" />
  <div style="font-size:14px;line-height:24px;color:#1a1814">
    ${paragraphsHtml}
    <p style="margin-bottom:16px">I trust that you can see how I could be a great fit for this position.</p>
    <p>Thank you for your consideration.</p>
  </div>
  <div style="margin-top:28px">
    <div style="font-size:13.5px;font-style:italic;color:#4a463d;margin-bottom:12px">Best regards,</div>
    <div style="font-size:30px;font-style:italic;letter-spacing:-0.68px;line-height:30px;color:#1a1814;margin-bottom:8px">${sigInitials}</div>
    <div style="width:80px;height:1px;background-color:#4a463d;opacity:0.35;margin-bottom:8px"></div>
    <div style="font-size:12px;letter-spacing:2.16px;text-transform:uppercase;color:#4a463d">${profile.name}</div>
  </div>
</div>
</body></html>`
}
```

- [ ] **Step 6: Commit**

```bash
git add next.config.mjs lib/pdfRenderer.ts lib/htmlTemplates.ts
git commit -m "feat: add PDF rendering infrastructure (Puppeteer + HTML templates)"
```

---

## Task 5: CV PDF Download Route + Button

**Files:**
- Create: `app/api/jobs/[id]/cv-pdf/route.ts`
- Modify: `components/JobDetail.tsx`

- [ ] **Step 1: Create `app/api/jobs/[id]/cv-pdf/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { fetchJob } from '@/lib/notion'
import { getProfile } from '@/lib/data'
import { generateCV } from '@/lib/generate'
import { buildCVHtml } from '@/lib/htmlTemplates'
import { renderHtmlToPdf } from '@/lib/pdfRenderer'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  // Accept either pre-generated cvData from the UI, or re-generate from the job
  let cvData = body.cvData ?? null

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
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 2: Add "Download CV PDF" button to `components/JobDetail.tsx`**

In the CV tab section, replace the existing "Preview & Download PDF" button block with:

```tsx
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
```

- [ ] **Step 3: Test CV PDF download**

Generate a CV for a job, then click "Download PDF". A PDF file should download. Open it and verify the layout matches the print preview.

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs/[id]/cv-pdf/route.ts components/JobDetail.tsx
git commit -m "feat: add CV PDF download route and button"
```

---

## Task 6: Cover Letter PDF Download Route + Button

**Files:**
- Create: `app/api/jobs/[id]/cover-letter-pdf/route.ts`
- Modify: `components/JobDetail.tsx`

- [ ] **Step 1: Create `app/api/jobs/[id]/cover-letter-pdf/route.ts`**

```ts
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
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 2: Add "Download Cover Letter PDF" button to `components/JobDetail.tsx`**

In the cover letter tab, replace the existing "Preview & Download PDF" button block with:

```tsx
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
```

- [ ] **Step 3: Test cover letter PDF download**

Generate a cover letter, click "Download PDF". Verify the PDF downloads with the correct EB Garamond font, layout, and signature.

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs/[id]/cover-letter-pdf/route.ts components/JobDetail.tsx
git commit -m "feat: add cover letter PDF download route and button"
```

---

## Task 7: Interview Prep — Route + Prompt

**Files:**
- Modify: `lib/prompts.ts`
- Modify: `lib/notion.ts`
- Create: `app/api/jobs/[id]/interview-prep/route.ts`

- [ ] **Step 1: Add `buildInterviewPrepPrompt` to `lib/prompts.ts`**

Append to the end of the file:

```ts
export function buildInterviewPrepPrompt(experienceBank: string, profile: Profile): string {
  return `You are preparing ${profile.name} for a job interview. You have access to their full experience bank and the job description.

CANDIDATE EXPERIENCE BANK:
${experienceBank}

YOUR TASK:
Produce a two-part interview preparation document.

PART 1 — BRIEFING SHEET:
- Company context: 2-3 sentences on what the company does and its market position (infer from the job description)
- Role breakdown: what success looks like in this role, key responsibilities
- 3–5 talking points: specific angles from ${profile.name}'s background that map directly to this role's priorities. Each point is one sentence.
- 2–3 smart questions to ask the interviewer (specific to the role, not generic)

PART 2 — Q&A PAIRS:
Generate 5–7 likely interview questions for this specific role. For each:
- Write the question exactly as an interviewer would ask it
- Write a 3–5 sentence answer using ${profile.name}'s actual experience from the bank. Be specific with names, numbers, and outcomes. Never invent facts.

HARD RULES:
- Never use em-dashes (—) anywhere
- Never say "passionate about", "team player", "dynamic"
- Answers must reference real experiences from the bank, not generic claims
- Keep each answer under 100 words

Return plain text, no markdown headers, no JSON. Separate Part 1 and Part 2 with the line: --- Q&A ---`.trim()
}
```

- [ ] **Step 2: Add `writeInterviewPrepToPage` to `lib/notion.ts`**

Append after `fetchExperienceBank`:

```ts
export async function writeInterviewPrepToPage(pageId: string, content: string): Promise<void> {
  const blocks: Parameters<typeof notion.blocks.children.append>[0]['children'] = [
    { type: 'divider', divider: {} },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '🎯 Interview Prep' } }],
        color: 'default',
      },
    },
    ...content.split('\n').filter(Boolean).map(line => ({
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: line } }],
        color: 'default' as const,
      },
    })),
  ]
  for (let i = 0; i < blocks.length; i += 100) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 100) })
  }
}
```

- [ ] **Step 3: Create `app/api/jobs/[id]/interview-prep/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { getProfile } from '@/lib/data'
import { fetchJob, fetchExperienceBank, writeInterviewPrepToPage } from '@/lib/notion'
import { buildInterviewPrepPrompt } from '@/lib/prompts'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const [job, experienceBank, profile] = await Promise.all([
    fetchJob(params.id),
    fetchExperienceBank(),
    Promise.resolve(getProfile()),
  ])

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (!job.jobDescription) return NextResponse.json({ error: 'Job has no description' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: buildInterviewPrepPrompt(experienceBank, profile),
    messages: [{ role: 'user', content: `JOB POSTING:\n${job.jobDescription}\n\nGenerate interview prep.` }],
  })

  const content = (message.content[0] as { type: string; text: string }).text.trim()
  await writeInterviewPrepToPage(params.id, content)
  return NextResponse.json({ content })
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/prompts.ts lib/notion.ts app/api/jobs/[id]/interview-prep/route.ts
git commit -m "feat: add interview prep generator route and prompt"
```

---

## Task 8: Interview Prep UI Tab

**Files:**
- Modify: `components/JobDetail.tsx`

- [ ] **Step 1: Add `interview-prep` to the Tab type and state in `JobDetail.tsx`**

Replace:
```tsx
type Tab = 'cv' | 'cover-letter'
```
With:
```tsx
type Tab = 'cv' | 'cover-letter' | 'interview-prep'
```

- [ ] **Step 2: Add `interviewPrep` state and `generateInterviewPrep` function**

Add alongside the other state declarations:
```tsx
const [interviewPrep, setInterviewPrep] = useState('')
const [loadingPrep, setLoadingPrep] = useState(false)
```

Add alongside the other handler functions:
```tsx
const generateInterviewPrep = async () => {
  setLoadingPrep(true)
  const res = await fetch(`/api/jobs/${job.id}/interview-prep`, { method: 'POST' })
  const data = await res.json()
  if (data.content) setInterviewPrep(data.content)
  setLoadingPrep(false)
}
```

- [ ] **Step 3: Add the "Interview Prep" tab button to the tab bar**

Replace the tab buttons map:
```tsx
{(['cv', 'cover-letter', 'interview-prep'] as Tab[]).map(t => (
  <button
    key={t}
    onClick={() => setTab(t)}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
    }`}
  >
    {t === 'cv' ? 'CV' : t === 'cover-letter' ? 'Cover Letter' : (
      <span className="flex items-center gap-1.5">
        Interview Prep
        {currentStatus === 'Interview' && (
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
        )}
      </span>
    )}
  </button>
))}
```

- [ ] **Step 4: Add the interview prep tab panel**

Add after the cover-letter tab panel (before the closing `</div>` of the content area):

```tsx
{/* ── INTERVIEW PREP TAB ── */}
{tab === 'interview-prep' && (
  <div className="flex flex-col gap-4">
    <button
      onClick={generateInterviewPrep}
      disabled={loadingPrep || !job.jobDescription}
      className={`w-full py-3 rounded-xl text-white font-medium text-sm transition-all ${
        loadingPrep || !job.jobDescription
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:opacity-90'
      }`}
    >
      {loadingPrep ? 'Generating...' : interviewPrep ? 'Regenerate Prep' : 'Generate Interview Prep'}
    </button>

    {interviewPrep && (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-[60vh] overflow-y-auto">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
          {interviewPrep}
        </pre>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Test the interview prep tab**

Open any job with a description, switch to the Interview Prep tab, click "Generate Interview Prep". After ~10 seconds, verify the briefing sheet and Q&A pairs appear. Check that the purple dot appears on the tab when the job status is `Interview`.

- [ ] **Step 6: Commit**

```bash
git add components/JobDetail.tsx
git commit -m "feat: add interview prep tab to job detail page"
```

---

## Task 9: Scout — Notion Helpers + `lib/scout.ts`

**Files:**
- Modify: `lib/notion.ts`
- Create: `lib/scout.ts`

- [ ] **Step 1: Add `fetchAllJobLinks` and `skipStaleProposed` to `lib/notion.ts`**

Append to `lib/notion.ts`:

```ts
export async function fetchAllJobLinks(): Promise<Set<string>> {
  const jobs = await fetchJobs()
  return new Set(jobs.map(j => j.jobLink).filter(Boolean))
}

export async function skipStaleProposed(): Promise<number> {
  const jobs = await fetchJobs()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const stale = jobs.filter(j =>
    j.status === 'Proposed' &&
    j.dateFound &&
    new Date(j.dateFound) < thirtyDaysAgo
  )

  await Promise.all(stale.map(j => updateJobStatus(j.id, 'Skipped')))
  return stale.length
}
```

- [ ] **Step 2: Create `lib/scout.ts`**

```ts
import { anthropic } from './anthropic'
import { getProfile } from './data'
import { createJob, fetchAllJobLinks, skipStaleProposed } from './notion'

export interface ScoutJob {
  role: string
  company: string
  jobLink: string
  jobDescription: string
  salary?: string
  source: 'Adzuna' | 'Remotive'
}

async function fetchAdzunaJobs(what: string, where: string): Promise<ScoutJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  // Adzuna uses country code 'es' for Spain; 'gb' for UK as EMEA proxy
  const country = where === 'madrid' ? 'es' : 'gb'
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where)}&results_per_page=20&content-type=application/json`

  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { results?: Array<{
    title: string
    company: { display_name: string }
    redirect_url: string
    description: string
    salary_min?: number
    salary_max?: number
  }> }

  return (data.results ?? []).map(r => ({
    role: r.title,
    company: r.company.display_name,
    jobLink: r.redirect_url,
    jobDescription: r.description,
    salary: r.salary_min ? `${r.salary_min}–${r.salary_max ?? r.salary_min}` : undefined,
    source: 'Adzuna' as const,
  }))
}

async function fetchRemotiveJobs(search: string): Promise<ScoutJob[]> {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=20`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { jobs?: Array<{
    title: string
    company_name: string
    url: string
    description: string
  }> }

  return (data.jobs ?? []).map(r => ({
    role: r.title,
    company: r.company_name,
    jobLink: r.url,
    jobDescription: r.description,
    source: 'Remotive' as const,
  }))
}

async function scoreJobs(jobs: ScoutJob[]): Promise<Array<ScoutJob & { score: number }>> {
  if (jobs.length === 0) return []
  const profile = getProfile()

  const jobList = jobs.map((j, i) =>
    `[${i}] ${j.role} at ${j.company}\nDescription excerpt: ${j.jobDescription.slice(0, 300)}`
  ).join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You score job listings for relevance to a candidate. 
Candidate background: ${profile.name}, focused on events, partnerships, sports, and entertainment roles in Madrid or remote EMEA.
Rate each job 0–10. Return ONLY a JSON array of numbers, one per job, in the same order. Example: [7,3,9,2]`,
    messages: [{ role: 'user', content: jobList }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const match = raw.match(/\[[\d,\s]+\]/)
  if (!match) return jobs.map(j => ({ ...j, score: 5 }))

  const scores: number[] = JSON.parse(match[0])
  return jobs.map((j, i) => ({ ...j, score: scores[i] ?? 0 }))
}

export async function runScout(): Promise<{ inserted: number; autoSkipped: number }> {
  // 1. Auto-skip stale Proposed jobs
  const autoSkipped = await skipStaleProposed()

  // 2. Fetch existing job links for dedup
  const existingLinks = await fetchAllJobLinks()

  // 3. Fetch from both sources in parallel
  const [
    madridMarketing,
    madridBrand,
    remoteMarketing,
    remotePartnerships,
    remoteEvents,
  ] = await Promise.all([
    fetchAdzunaJobs('marketing partnerships events', 'madrid'),
    fetchAdzunaJobs('brand sponsorship entertainment', 'madrid'),
    fetchRemotiveJobs('marketing partnerships EMEA'),
    fetchRemotiveJobs('partnerships sponsorship'),
    fetchRemotiveJobs('events entertainment'),
  ])

  // 4. Deduplicate by link
  const seen = new Set<string>()
  const candidates = [
    ...madridMarketing, ...madridBrand,
    ...remoteMarketing, ...remotePartnerships, ...remoteEvents,
  ].filter(j => {
    if (!j.jobLink || existingLinks.has(j.jobLink) || seen.has(j.jobLink)) return false
    seen.add(j.jobLink)
    return true
  })

  // 5. Score and filter (keep score >= 6)
  const scored = await scoreJobs(candidates)
  const qualified = scored.filter(j => j.score >= 6)

  // 6. Insert into Notion as Proposed
  await Promise.all(qualified.map(j =>
    createJob({
      role: j.role,
      company: j.company,
      jobLink: j.jobLink,
      jobDescription: j.jobDescription.slice(0, 2000),
      ...(j.salary ? {} : {}),
    }).then(created =>
      // Mark source as Scout via a secondary update
      // (createJob always sets Source: Manual — we override it)
      fetch // we'll fix source in notion.ts instead — see note below
    ).catch(() => null)
  ))

  return { inserted: qualified.length, autoSkipped }
}
```

> **Note on Scout source label:** `createJob` in `lib/notion.ts` hardcodes `Source: { select: { name: 'Manual' } }`. Add a `source` parameter to `createJob` so the scout can label jobs as `Scout`.

- [ ] **Step 3: Update `createJob` in `lib/notion.ts` to accept an optional source**

Change the `createJob` signature and body:

```ts
export async function createJob(data: {
  role: string
  company: string
  jobLink?: string
  jobDescription?: string
  tier?: import('./types').JobTier
  track?: import('./types').JobTrack
  source?: 'Manual' | 'Scout'  // add this
}): Promise<NotionJob> {
  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Role: { title: [{ text: { content: data.role } }] },
      Company: { rich_text: [{ text: { content: data.company } }] },
      Status: { select: { name: 'Proposed' } },
      Source: { select: { name: data.source ?? 'Manual' } },  // update this line
      // ... rest unchanged
    },
  })
  return pageToJob(page)
}
```

- [ ] **Step 4: Fix `lib/scout.ts` — remove the broken `fetch` reference and use `createJob` with `source: 'Scout'`**

Replace the `Promise.all(qualified.map(...))` block with:

```ts
await Promise.all(qualified.map(j =>
  createJob({
    role: j.role,
    company: j.company,
    jobLink: j.jobLink,
    jobDescription: j.jobDescription.slice(0, 2000),
    source: 'Scout',
  }).catch(() => null)
))
```

- [ ] **Step 5: Add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` to `.env.local`**

Sign up at https://developer.adzuna.com (free, instant). Then add to `.env.local`:
```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

- [ ] **Step 6: Commit**

```bash
git add lib/notion.ts lib/scout.ts
git commit -m "feat: add scout agent logic (Adzuna + Remotive + Claude scoring + dedup)"
```

---

## Task 10: Scout Route + Nav Button

**Files:**
- Create: `app/api/scout/route.ts`
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Create `app/api/scout/route.ts`**

Supports both GET (Vercel Cron) and POST (manual trigger from Nav).

```ts
import { NextResponse } from 'next/server'
import { runScout } from '@/lib/scout'

// Vercel Cron calls GET. Verify the cron secret to prevent unauthorized calls.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runScout()
  return NextResponse.json(result)
}

// Manual trigger from Nav button
export async function POST() {
  const result = await runScout()
  return NextResponse.json(result)
}
```

- [ ] **Step 2: Add `CRON_SECRET` to `.env.local`**

```
CRON_SECRET=any-random-string-you-choose
```

- [ ] **Step 3: Update `components/Nav.tsx` to add "Scout now" button**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const [scouting, setScouting] = useState(false)
  const [lastResult, setLastResult] = useState<{ inserted: number; autoSkipped: number } | null>(null)

  const scout = async () => {
    setScouting(true)
    setLastResult(null)
    const res = await fetch('/api/scout', { method: 'POST' })
    const data = await res.json()
    setLastResult(data)
    setScouting(false)
    router.refresh()
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        path === href || (href !== '/' && path.startsWith(href))
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-6 gap-2 sticky top-0 z-10">
      <span className="font-bold text-gray-900 mr-4 text-sm tracking-tight">Job Applications</span>
      {link('/', 'Jobs')}
      {link('/profile', 'My Profile')}
      <div className="ml-auto flex items-center gap-3">
        {lastResult && (
          <span className="text-xs text-gray-400">
            +{lastResult.inserted} jobs · {lastResult.autoSkipped} auto-skipped
          </span>
        )}
        <button
          onClick={scout}
          disabled={scouting}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            scouting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {scouting ? 'Scouting...' : '⚡ Scout now'}
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Test manual scout**

Click "Scout now" in the nav. Wait ~20–30 seconds (Claude scoring takes time). Verify the result badge shows counts, and new `Proposed` jobs with `Source: Scout` appear in Notion.

- [ ] **Step 5: Commit**

```bash
git add app/api/scout/route.ts components/Nav.tsx
git commit -m "feat: add scout API route and Nav scout button"
```

---

## Task 11: Vercel Cron Config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json` with cron schedule**

2am CET = 01:00 UTC (winter) / 00:00 UTC (summer CEST).  
2pm CET = 13:00 UTC (winter) / 12:00 UTC (summer CEST).  
Using winter UTC offsets — adjust manually in summer if needed.

```json
{
  "crons": [
    {
      "path": "/api/scout",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/scout",
      "schedule": "0 13 * * *"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel Cron schedule for scout agent (2am and 2pm CET)"
```

---

## Task 12: Vercel Deployment

- [ ] **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

- [ ] **Step 2: Run a full local test of all features**

- Stats bar: visible and accurate on homepage
- Auto-generate: change a Proposed job to Ready to Apply, verify Notion page gets content
- CV PDF: generate a CV, download PDF, verify layout
- Cover letter PDF: generate a cover letter, download PDF, verify layout
- Interview prep: generate prep for any job, verify briefing + Q&A appear
- Manual scout: click Scout now, verify jobs appear in Notion

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel deploy --prod
```

Follow the prompts: link to your GitHub repo, accept defaults for framework (Next.js detected automatically).

- [ ] **Step 4: Set all environment variables in Vercel dashboard**

Go to your project → Settings → Environment Variables. Add:
```
NOTION_API_KEY
NOTION_DATABASE_ID
NOTION_EXPERIENCE_BANK_PAGE_ID
ANTHROPIC_API_KEY
ADZUNA_APP_ID
ADZUNA_APP_KEY
CRON_SECRET
```

- [ ] **Step 5: Verify Vercel Cron is active**

In Vercel dashboard → project → Cron Jobs tab. You should see two entries for `/api/scout`. Trigger one manually from the dashboard to verify end-to-end.

- [ ] **Step 6: Smoke test the deployed app**

Open the Vercel deployment URL. Verify job list loads, stats bar shows, generate a CV, download a PDF, run a manual scout. Check Vercel function logs for any errors.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: production deployment complete"
git push
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Feature 1 (auto-generate on Ready to Apply) — Task 3
- [x] Feature 3 (PDF export) — Tasks 4–6
- [x] Feature 4 (interview prep) — Tasks 7–8
- [x] Feature 6 (stats bar) — Task 1
- [x] Feature 7 (scout agent) — Tasks 9–10
- [x] Dedup by job link — Task 9, `fetchAllJobLinks`
- [x] Auto-skip stale Proposed (30 days) — Task 9, `skipStaleProposed`
- [x] Vercel Cron 2am + 2pm CET — Task 11
- [x] Manual scout trigger from Nav — Task 10
- [x] Deployment — Task 12

**Type consistency:**
- `generateCV` / `generateCoverLetter` / `generateBothAndSave` defined in Task 2, used in Tasks 3, 5
- `buildCVHtml` / `buildCoverLetterHtml` defined in Task 4, used in Tasks 5, 6
- `renderHtmlToPdf` defined in Task 4, used in Tasks 5, 6
- `runScout` defined in Task 9, used in Task 10
- `skipStaleProposed` / `fetchAllJobLinks` defined in Task 9
- `createJob` with `source` param updated in Task 9, used in Task 9 (scout insert)
- `writeInterviewPrepToPage` defined in Task 7, used in Task 7
- `buildInterviewPrepPrompt` defined in Task 7, used in Task 7
