# Installation Guide — Job Applications Tool

This tool generates tailored CVs and cover letters using Claude AI, pulling jobs from your personal Notion job tracker.

**Time required:** ~20 minutes to set up, ~5 minutes per application after.

---

## Prerequisites

Before starting, make sure you have:

- [ ] **Node.js 18+** — download at [nodejs.org](https://nodejs.org)
- [ ] **Git** — download at [git-scm.com](https://git-scm.com)
- [ ] A **Notion account** — [notion.so](https://notion.so)
- [ ] A **credit card** to activate the Anthropic API (pay-per-use, very cheap — ~$0.01 per CV generated)

---

## Step 1 — Get the code

1. Open your terminal (Mac: Terminal / Windows: PowerShell)
2. Navigate to where you want to install the tool:
   ```
   cd ~/Desktop
   ```
3. Clone the repository:
   ```
   git clone https://github.com/LouisHvt/Job-applications.git
   ```
4. Enter the project folder:
   ```
   cd Job-applications
   ```
5. Install dependencies:
   ```
   npm install
   ```

---

## Step 2 — Get your Anthropic API key

The tool uses Claude AI to generate CVs and cover letters. You need your own API key.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and log in
3. Go to **Billing** → add a payment method (you'll be charged per use, not a subscription)
4. Go to **API Keys** → click **Create Key**
5. Name it anything (e.g. "Job App Tool")
6. Copy the key — it starts with `sk-ant-...`
7. **Save it somewhere safe** — you won't be able to see it again

---

## Step 3 — Set up Notion

### 3A — Create a Notion integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Name it anything (e.g. "Job App")
4. Select your workspace
5. Click **Submit**
6. Copy the **Internal Integration Secret** — it starts with `ntn_...`
7. **Save it** — you'll need it in Step 5

### 3B — Duplicate the Job Tracker template

1. Open the template: [Job Tracker Template](https://wind-leaf-18d.notion.site/Job-Tracker-Template-36baa1de211e815c86edec1c101a3203)
2. Click **Duplicate** (top-right)
3. Select your Notion workspace
4. You now have a blank Job Tracker database in your workspace

### 3C — Connect the integration to your Job Tracker

1. Open the Job Tracker page you just duplicated
2. Click the `•••` menu (top-right)
3. Go to **Connections** → click **+ Add connection**
4. Search for and select the integration you created in Step 3A
5. Click **Confirm**

### 3D — Get the Job Tracker database ID

1. Open your Job Tracker database as a **full page** (click the arrow to expand, or open it directly)
2. Look at the URL — it will look like:
   ```
   https://www.notion.so/YOUR-WORKSPACE/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
   ```
3. Copy the 32-character string between the last `/` and the `?v=`
   - Example: if the URL is `.../My-Jobs-abc123def456...?v=...`, the ID is `abc123def456...`
   - Format the ID with dashes: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
4. **Save it** — this is your `NOTION_DATABASE_ID`

### 3E — Create your Experience Bank page

This is a Notion page where you write out all your experiences, bullet points, and achievements. The AI reads it when generating your CV.

1. Create a new page anywhere in your Notion workspace
2. Title it something like "My Experience Bank"
3. Write out your work history, key achievements, skills, and anything you'd want in a CV — the more detail the better
   - Think of it as a master dump of everything you've ever done professionally
   - Include company names, dates, metrics, and context
   - Don't worry about formatting — the AI handles that
4. Share this page with your integration (same as Step 3C)
5. Get the page ID from the URL (same method as Step 3D)
6. **Save it** — this is your `NOTION_EXPERIENCE_BANK_PAGE_ID`

---

## Step 4 — Configure environment variables

1. In the project folder, create a file called `.env.local`:
   ```
   cp .env.example .env.local
   ```
2. Open `.env.local` in any text editor
3. Fill in your four values:
   ```
   ANTHROPIC_API_KEY=sk-ant-...         ← from Step 2
   NOTION_API_KEY=ntn_...               ← from Step 3A
   NOTION_DATABASE_ID=xxxx-xxxx-...     ← from Step 3D
   NOTION_EXPERIENCE_BANK_PAGE_ID=xxxx-xxxx-...  ← from Step 3E
   ```
4. Save the file

> `.env.local` is never committed to git — your keys stay private.

---

## Step 5 — Run the app

1. In your terminal (inside the project folder), run:
   ```
   npm run dev
   ```
2. Open your browser and go to: [http://localhost:3000](http://localhost:3000)
3. The app should load with an empty job list

---

## Step 6 — Set up your profile

Your profile is what the AI uses to write your CV header, summary, and cover letter. It's stored locally on your machine only.

1. Go to [http://localhost:3000/profile](http://localhost:3000/profile)
2. Click **Parse CV** (first tab) — paste your full CV text and click **Parse with AI**
   - The AI will auto-fill your experiences, skills, and education
   - Review each section after
3. Go to **Personal Info** and fill in:
   - Name, email, phone, LinkedIn, portfolio link, location
   - **Languages** — one per line, e.g. `English — Native`
   - **Other Information** — the first item appears in your CV header (e.g. `EU Work Permit`); rest appear at the bottom
   - **Key Stats** — used in summaries and cover letters, e.g. `3+ years in B2B marketing`
4. Review **Experiences**, **Skills**, and **Education** tabs — edit anything the AI got wrong
5. Go to **Cover Letter Templates** — paste 1–3 cover letters you've written before. The AI uses these to match your tone and style.
6. Click **Save Profile**

---

## Step 7 — Add your first job and generate a CV

1. Go back to [http://localhost:3000](http://localhost:3000)
2. Click **+ Add Job** to manually enter a job, or add jobs directly in your Notion Job Tracker
3. Click on a job to open it
4. Click **Generate CV** — the AI will read your experience bank and build a tailored CV
5. Click **Generate Cover Letter** for the cover letter
6. Use the **refinement input** below each document to iterate: e.g. "make the opening more specific to their product team" or "swap the second experience for my freelance work"
7. Click **Download PDF** to export — print dialog will open, use **Save as PDF**

---

## Troubleshooting

**"Failed to fetch jobs"**
- Check that your `NOTION_DATABASE_ID` is correct
- Make sure you shared the database with your integration (Step 3C)

**"Failed to generate CV"**
- Check that your `NOTION_EXPERIENCE_BANK_PAGE_ID` is correct
- Make sure you shared the Experience Bank page with your integration (Step 3E)

**"Invalid API key"**
- Double-check your `ANTHROPIC_API_KEY` in `.env.local`
- Make sure you have billing set up at console.anthropic.com

**App won't start**
- Make sure Node.js 18+ is installed: run `node --version` in terminal
- Run `npm install` again if you see missing module errors

---

## Notes

- The app runs **locally** — no data is sent anywhere except to Notion (your own workspace) and Anthropic (only the job description + your experience bank, never stored)
- Your profile and job data stay on your machine
- Each CV/cover letter generation costs roughly $0.01–0.02 in API credits
- To stop the app: press `Ctrl+C` in the terminal
- To restart: run `npm run dev` again from the project folder
