# Job Applications — Design Spec
**Date:** 2026-04-07
**Status:** Approved

---

## Overview

A personal job application tool for one user (Louis). Combines an AI-powered CV and cover letter tailoring engine with a kanban-style application tracker. No auth, no hosting — runs locally with one command.

---

## Core Concept

Paste a job posting → AI reads it against your master profile → selects the most relevant experiences → generates a tailored CV and cover letter ready to download. Every application is tracked in a kanban board from first interest to closed.

---

## Screens

### 1. Dashboard (`/`)

Kanban board with 5 columns: **Target → In Progress → Applied → Interview → Closed**

- Stats bar at top: total tracked, applied count, interview count, response rate
- Each card shows: company logo initial, company name, role title, date, industry tag
- "+ New Application" button top-right
- Click any card → Job Detail
- Drag card to move between columns (drag-and-drop)

**Visual style:** Light blue/green/white. Light gray background (`#f0f4f8`), white cards, blue (`#1a6fff`) and green (`#10c98f`) accents. Each column has a colored dot and top accent matching its status.

### 2. Job Detail (`/jobs/[id]`)

Two-panel layout.

**Left panel — Job Posting**
- Displays the pasted job description (read-only, formatted)
- "Pasted on [date]" label

**Right panel — Tabs**

- **CV tab:** AI banner showing how many experiences matched. "Generate CV" button (blue→green gradient). Generated CV shown as formatted sections (Experience, Skills, Education). "Download PDF" and "Copy Text" buttons.
- **Cover Letter tab:** Same pattern — AI banner, generate button, output shown inline, copy/download.
- **Notes tab:** Free-text area for thoughts, contacts, interview prep.
- **Timeline tab:** Chronological log of status changes and manual notes. Shows next action reminder (e.g. "Follow up by Apr 12") in an amber banner.

**Header:** Company logo initial, company name, role title, location. Status badge (color-coded). "Move Stage →" button advances to next column. "Edit" button for manual edits.

### 3. My Profile (`/profile`)

One-time setup — the master profile the AI pulls from on every generation.

**Sections:**
- **Personal info:** Name, email, LinkedIn URL, location, one-line summary
- **Experiences:** List of past roles. Each entry: title, company, dates, bullet-point description. Add / edit / delete. Ordered by recency.
- **Skills:** Tag list (e.g. Growth, PLG, SQL, Figma). Add / remove.
- **Education:** Degree, school, year.
- **Cover letter templates:** Paste 1–3 existing templates. AI uses these as style reference when generating new ones.

---

## AI Workflow

**Model:** `claude-haiku-4-5` — fast (1–2s), cheap, sufficient for CV/letter work.

**CV generation prompt:**
- System: full profile (all experiences, skills, education)
- User: job posting text + instruction to select the most relevant experiences and rewrite bullets to match the role's language
- Output: JSON with selected experience IDs + rewritten bullet points

**Cover letter generation prompt:**
- System: full profile + any saved cover letter templates (style reference)
- User: job posting text + instruction to write a tailored cover letter in the user's voice
- Output: plain text cover letter

**API key:** stored in `.env.local` (never committed).

---

## Data Model

All data stored as JSON files in `data/`.

### `data/profile.json`
```json
{
  "name": "Louis",
  "email": "",
  "linkedin": "",
  "location": "",
  "summary": "",
  "experiences": [
    {
      "id": "uuid",
      "title": "",
      "company": "",
      "startDate": "",
      "endDate": "",
      "bullets": [""]
    }
  ],
  "skills": [""],
  "education": [{ "degree": "", "school": "", "year": "" }],
  "coverLetterTemplates": [""]
}
```

### `data/jobs/[id].json`
```json
{
  "id": "uuid",
  "company": "",
  "role": "",
  "location": "",
  "industry": "",
  "status": "target | in_progress | applied | interview | closed",
  "posting": "",
  "addedAt": "",
  "statusHistory": [{ "status": "", "changedAt": "" }],
  "generatedCV": "",
  "generatedCoverLetter": "",
  "notes": "",
  "nextAction": { "label": "", "dueDate": "" }
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| AI | Anthropic API (`claude-haiku-4-5`) |
| Data storage | JSON files in `data/` folder |
| PDF export | Browser print with print CSS |
| Drag-and-drop | `@hello-pangea/dnd` |

---

## File Structure

```
Job Applications/
├── app/
│   ├── page.tsx                  # Dashboard (kanban)
│   ├── jobs/[id]/page.tsx        # Job detail
│   ├── profile/page.tsx          # My profile
│   └── api/
│       ├── generate-cv/route.ts          # POST: calls Claude, returns tailored CV
│       └── generate-cover-letter/route.ts # POST: calls Claude, returns cover letter
├── components/
│   ├── KanbanBoard.tsx
│   ├── JobCard.tsx
│   ├── JobDetail/
│   │   ├── index.tsx
│   │   ├── CVTab.tsx
│   │   ├── CoverLetterTab.tsx
│   │   ├── NotesTab.tsx
│   │   └── TimelineTab.tsx
│   ├── ProfileForm.tsx
│   └── StatsBar.tsx
├── lib/
│   ├── data.ts         # Read/write JSON files
│   ├── anthropic.ts    # Claude API client
│   └── prompts.ts      # CV and cover letter prompt builders
├── data/
│   ├── profile.json
│   └── jobs/
├── docs/
└── .env.local          # ANTHROPIC_API_KEY (not committed)
```

---

## Out of Scope (MVP)

- Email / calendar integration
- Hosting or deployment
- Multi-user support
- Automatic job discovery
- Interview question prep (future addition)

---

## Future Ideas

- **Interview prep tab:** AI generates likely interview questions based on the job posting
- **Company research:** auto-pull company info (funding, size, news) from the posting
- **Weekly review:** summary of pipeline health and suggested next actions
