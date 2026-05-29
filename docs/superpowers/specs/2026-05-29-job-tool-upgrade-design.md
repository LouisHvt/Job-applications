# Job Application Tool — Upgrade Design
**Date:** 2026-05-29  
**Status:** Approved

## Overview

Six features added to the existing Next.js + Notion + Claude Haiku job application tool, followed by a single Vercel deployment. All features are built and tested locally first; deployment happens once at the end as a clean release.

No existing generation logic, Notion integration, or data model is rewritten. Features extend what exists.

---

## Constraints & Unchanged Foundations

- Notion remains the database (Job Tracker DB + Experience Bank page)
- Claude Haiku remains the AI model for all generation
- Existing API routes (`/api/generate-cv`, `/api/generate-cover-letter`, `/api/refine-cv`, `/api/refine-cover-letter`) are untouched
- `data/profile.json` remains the source of personal info
- No new auth or multi-user logic

---

## Feature 1 — Auto-generate on "Ready to Apply"

**Trigger:** `PATCH /api/jobs/[id]` receives `{ status: "Ready to Apply" }`.

**Behavior:**
1. Notion status is updated immediately — the API response returns right away (non-blocking).
2. CV + cover letter generation is fired as a background async call (no `await` on the generation, uses `waitUntil` in Vercel or a detached Promise).
3. Generated content is written back to the Notion page as today (via `writeGeneratedContentToPage`).
4. The job detail page already fetches fresh data on load, so navigating to the job after a few seconds shows the generated content.

**No new UI needed.** The existing "Ready to Apply" status change flow in `JobDetail` already calls the PATCH route.

---

## Feature 3 — PDF Export

**New routes:**
- `GET /api/jobs/[id]/cv-pdf` — renders CV as PDF, returns binary blob
- `GET /api/jobs/[id]/cover-letter-pdf` — renders cover letter as PDF, returns binary blob

**Implementation:**
- Uses `@sparticuz/chromium` + `puppeteer-core` (Vercel-compatible headless Chromium, ~50MB).
- Each route fetches the job + profile, renders the existing HTML template (same output as `CVTemplate`/`CoverLetterTemplate` components), passes it to Chromium, returns `application/pdf`.
- PDF dimensions: A4, matching existing print styles.

**UI:** Two download buttons added to the job detail page — "Download CV" and "Download Cover Letter" — visible once content has been generated.

**New dependencies:** `@sparticuz/chromium`, `puppeteer-core`

---

## Feature 4 — Interview Prep Generator

**New route:** `POST /api/jobs/[id]/interview-prep`

**Input:** job description + experience bank (fetched from Notion)

**Output (Claude Haiku):** A two-part document:
1. **Briefing sheet** — company context summary, role breakdown, 3–5 tailored talking points, 2–3 smart questions to ask the interviewer
2. **Q&A pairs** — 5–7 likely interview questions with tailored answers drawn from the experience bank

**Storage:** Written back to the Notion job page as a new section.

**UI:** New "Interview Prep" tab on the job detail page. Visible at all times (manually triggerable), but highlighted/badged when status = `Interview`. One "Generate prep" button; shows the two-part output once generated.

---

## Feature 6 — Pipeline Stats Bar

**Location:** Top of the job list page (`/`), above the job list.

**Implementation:** Computed server-side in the existing `HomePage` component from the jobs array already fetched — no additional API call or data fetch.

**Display (compact single row):**
```
X proposed  ·  X ready  ·  X applied  ·  X interviews  ·  X this week
```
"This week" = jobs with `dateFound` within the last 7 days across all statuses.

**New component:** `StatsBar` — pure display, receives counts as props.

---

## Feature 7 — Job Scout Agent

### Data Sources
- **Adzuna API** (free, no credit card) — covers Spain + EMEA job listings, returns structured role/company/salary/link data
- **Remotive API** (free, no key needed) — remote-only EMEA roles

### Scout Route
**`POST /api/scout`** — callable by Vercel Cron and manually from the UI.

**Flow:**
1. Fetch jobs from Adzuna (Madrid + EMEA keywords per active tracks) and Remotive (remote EMEA).
2. Deduplicate: filter out any job whose link already exists in the Notion database.
3. Score remaining jobs with Claude Haiku (0–10 relevance against profile + track labels). Keep scores ≥ 6.
4. Insert top candidates into Notion as `Proposed`, `Source: Scout`.
5. Auto-skip stale: any existing `Proposed` job with `dateFound` older than 30 days is moved to `Skipped`.

**Search keywords derived from track labels:**
- Track 1 (Madrid Multinationals): "marketing", "partnerships", "events", "Madrid"
- Track 2 (Remote EMEA): "remote", "marketing", "partnerships", "EMEA"
- Track 3 (Madrid Prestige): "brand", "sponsorship", "luxury", "Madrid"
- Music / Nightlife: "music", "entertainment", "events", "nightlife"

### Scheduling
Two Vercel Cron entries in `vercel.json`:
```json
{ "path": "/api/scout", "schedule": "0 1 * * *" }   // 2am CET (01:00 UTC)
{ "path": "/api/scout", "schedule": "0 13 * * *" }  // 2pm CET (13:00 UTC)
```
(Adjust by 1h during summer CEST → UTC+2: `0 0 * * *` and `0 12 * * *`)

### Manual Trigger
"Scout now" button in the Nav component. Calls `POST /api/scout`, shows a loading state, then refreshes the job list.

### New env vars needed
```
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
```

---

## Feature + — Job Tracker Health (bundled with Feature 7)

- **Deduplication:** checked by job link before any insert in the scout route.
- **Auto-skip stale Proposed:** on every scout run, Notion is queried for `Proposed` jobs older than 30 days → status updated to `Skipped`. Keeps the list actionable without deleting history.

---

## Deployment (final step)

1. All features built and verified locally.
2. Deploy to Vercel via `vercel deploy --prod`.
3. Set all env vars in Vercel dashboard (`NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_EXPERIENCE_BANK_PAGE_ID`, `ANTHROPIC_API_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`).
4. Verify Vercel Cron triggers are active in the Vercel dashboard.
5. Run a manual scout from the deployed app to confirm end-to-end.

---

## Build Order

1. Feature 6 — Stats bar (no new deps, fastest win)
2. Feature 1 — Auto-generate on Ready to Apply (extends existing route)
3. Feature 3 — PDF export (new deps, isolated routes)
4. Feature 4 — Interview prep (new AI route + UI tab)
5. Feature 7 + health — Scout agent + dedup + auto-skip + cron config
6. Deployment — Vercel deploy + env vars + cron verification
