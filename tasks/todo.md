# Job Applications Tool — TODO

## Architecture
- Notion = source of truth for jobs (agent scouts daily → Status: Proposed)
- Local Next.js app = generation layer (reads from Notion, generates via Claude, writes back to Notion page body)
- Local data/profile.json = master profile (private, gitignored)

## Status

### Done
- [x] Next.js 14 initialized with TypeScript, Tailwind, dependencies

### In Progress
- [ ] Lib layer (types, notion client, data, anthropic, prompts)
- [ ] API routes
- [ ] Pages and components

### Tasks
- [ ] Task 1: Setup (env template, install @notionhq/client, tasks/)
- [ ] Task 2: Lib layer — types.ts, notion.ts, data.ts, anthropic.ts, prompts.ts
- [ ] Task 3: API routes — jobs, profile, parse-cv, generate-cv, generate-cover-letter
- [ ] Task 4: Layout + Nav
- [ ] Task 5: Job list page (/)
- [ ] Task 6: Job detail page (/jobs/[id])
- [ ] Task 7: Profile page (/profile) with AI CV parser

## Current task (2026-06-11): Mistral AI Partner Manager SI - EMEA application
- [x] Create job in Notion via POST /api/jobs (Mistral AI, Partner Manager SI - EMEA, Track 2 - Remote EMEA)
- [x] Generate CV via /api/generate-cv
- [x] Generate cover letter via /api/generate-cover-letter
- [x] Download both PDFs → generated/mistral-partner-manager-cv.pdf + -cover-letter.pdf
- [x] Bugfix: buildCVHtml crashed on profiles missing languages/otherInfo — added null-safe defaults
- Note: an ElevenLabs GTM Enablement job (with generated CV + cover letter) was also created in Notion before the user switched targets — still there, delete if unwanted

## 2026-06-11: Riot Games APAC application
- [x] Created job in Notion (Esports Events Coordinator, APAC Emerging Markets)
- [x] Generated + refined cover letter with personal points (gamer story, APAC travel, language commitment, Singapore relocation)
- [x] Rendered generated/riot-apac-esports-events-cover-letter.pdf
- [!] BLOCKER to verify: role requires existing Singapore work authorization, no sponsorship — user must confirm eligibility before applying
- Note: refined letter is in the PDF only; Notion page body holds the pre-refinement version (refine route doesn't write back to Notion)
- [x] Restructured letter: classic self-presentation intro + achievement body + strong closing (user-requested format)
- [x] Template/prompt change: removed hardcoded closing sentences from buildCoverLetterHtml; prompt now generates a real closing (thanks + one polite interview invitation)
- [x] CV generated + refined with Airtable and technical event infrastructure (LED, power, internet) — user-confirmed skills, added to data/profile.json skills too
- [x] Bugfix: refine-cv route crashed on markdown-fenced JSON; now uses same brace-extraction as lib/generate.ts

## Notion DB
- ID: 9e2a48ad-2018-43e8-af11-a6019ebc9737
- Fields: Role, Company, Job Description, Job Link, Status, Tier, Track, Date Found, Notes
- Generated content → written to page body (not DB properties)
- Status options: Proposed → Applied → Interview → Offer / Rejected / Archived
- Tier: Must Apply / Should Apply / Need Confirmation
- Track: Madrid Multinationals / Remote EMEA / Madrid Prestige
