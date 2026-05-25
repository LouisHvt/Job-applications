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

## Notion DB
- ID: 9e2a48ad-2018-43e8-af11-a6019ebc9737
- Fields: Role, Company, Job Description, Job Link, Status, Tier, Track, Date Found, Notes
- Generated content → written to page body (not DB properties)
- Status options: Proposed → Applied → Interview → Offer / Rejected / Archived
- Tier: Must Apply / Should Apply / Need Confirmation
- Track: Madrid Multinationals / Remote EMEA / Madrid Prestige
