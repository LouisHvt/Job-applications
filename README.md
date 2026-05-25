# Job Applications Tool

A local Next.js app that reads jobs from a Notion database and generates tailored CVs and cover letters using Claude AI.

## What it does

- Pulls jobs from your Notion job tracker (populated by a daily scout agent or manually)
- Generates a tailored CV and cover letter per job using your Master Experience Bank
- Lets you refine the output with an inline chat
- Exports to PDF via browser print

## Setup

### 1. Prerequisites

- Node.js 18+
- A Notion account
- An Anthropic API key — get one at console.anthropic.com

### 2. Notion setup

**A) Create a Notion integration**
1. Go to notion.so/my-integrations → New integration
2. Name it (e.g. "Jobs App"), select your workspace
3. Copy the API key → `NOTION_API_KEY`

**B) Duplicate the Job Tracker template**

Click this link and hit **Duplicate** to get a blank copy with the correct schema already set up:

👉 [Job Tracker Template](https://wind-leaf-18d.notion.site/Job-Tracker-Template-36baa1de211e815c86edec1c101a3203)

It includes these properties:

| Property | Type |
|---|---|
| Role | Title |
| Company | Rich text |
| Status | Select: Proposed, Ready to Apply, Applied, Interview, Offer, Rejected, Skipped |
| Tier | Select: Must Apply, Should Apply, Need Confirmation |
| Track | Select: your own tracks |
| Job Description | Rich text |
| Job Link | URL |
| Date Found | Date |
| Source | Select |
| Notes | Rich text |

Share the database with your integration. Copy the database ID from the URL → `NOTION_DATABASE_ID`.

**C) Create a Master Experience Bank page**
A Notion page with all your experiences, education, and bullet points written out. The AI reads this to select and tailor content for each application. Share it with your integration. Copy the page ID → `NOTION_EXPERIENCE_BANK_PAGE_ID`.

### 3. Install and run

```bash
git clone <this-repo>
cd job-applications
npm install
cp .env.example .env.local
# Fill in your keys in .env.local
npm run dev
```

Open http://localhost:3000.

### 4. Set up your profile

Go to `/profile` and fill in:

- **Personal Info**: name, email, phone, LinkedIn, portfolio, location
- **Languages**: one per line, e.g. `English — Native`
- **Other Information**: first item appears in the CV header (e.g. `EU Work Permit`); rest go in the Other Information section at the bottom
- **Key Stats**: used in CV summaries and cover letters, e.g. `3+ years in marketing and partnerships`

Use **Parse CV** to paste your existing CV and let the AI extract everything automatically.

## How it works

1. Jobs appear in the list pulled from your Notion database
2. Click a job → Generate CV or Cover Letter
3. The AI reads your Notion experience bank, selects the most relevant experiences, and tailors everything to the job description
4. Use the refinement input to iterate: "make the hook more specific", "swap experience X for Y"
5. Preview → Download PDF

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add your four env vars in Vercel dashboard → Project Settings → Environment Variables.
