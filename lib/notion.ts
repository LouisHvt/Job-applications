import { Client } from '@notionhq/client'
import { NotionJob, JobStatus } from './types'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const DATABASE_ID = process.env.NOTION_DATABASE_ID!
const EXPERIENCE_BANK_PAGE_ID = process.env.NOTION_EXPERIENCE_BANK_PAGE_ID!

function extractText(richText: Array<{ plain_text: string }> | undefined): string {
  return richText?.map(t => t.plain_text).join('') ?? ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pageToJob(page: any): NotionJob {
  const props = page.properties
  return {
    id: page.id,
    role: extractText(props.Role?.title),
    company: extractText(props.Company?.rich_text),
    status: props.Status?.select?.name ?? null,
    tier: props.Tier?.select?.name ?? null,
    track: props.Track?.select?.name ?? null,
    jobDescription: extractText(props['Job Description']?.rich_text),
    jobLink: props['Job Link']?.url ?? '',
    notes: extractText(props.Notes?.rich_text),
    salary: extractText(props.Salary?.rich_text),
    source: props.Source?.select?.name ?? '',
    dateFound: props['Date Found']?.date?.start ?? null,
    url: page.url,
  }
}

export async function fetchJobs(): Promise<NotionJob[]> {
  const jobs: NotionJob[] = []
  let cursor: string | undefined

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      sorts: [{ property: 'Date Found', direction: 'descending' }],
    })

    response.results.forEach(page => {
      if (page.object === 'page') jobs.push(pageToJob(page))
    })

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return jobs
}

export async function fetchJob(id: string): Promise<NotionJob | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    return pageToJob(page)
  } catch {
    return null
  }
}

export async function writeGeneratedContentToPage(
  pageId: string,
  cvText: string,
  coverLetterText: string | null
): Promise<void> {
  // Clear existing generated content blocks (append after a separator)
  const heading = coverLetterText ? '🤖 Generated CV' : '🤖 Generated CV'

  const blocks: Parameters<typeof notion.blocks.children.append>[0]['children'] = [
    {
      type: 'divider',
      divider: {},
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: heading } }],
        color: 'default',
      },
    },
    ...cvText.split('\n').filter(Boolean).map(line => ({
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: line } }],
        color: 'default' as const,
      },
    })),
  ]

  if (coverLetterText) {
    blocks.push(
      {
        type: 'divider',
        divider: {},
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '📝 Cover Letter' } }],
          color: 'default',
        },
      },
      ...coverLetterText.split('\n').filter(Boolean).map(line => ({
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: line } }],
          color: 'default' as const,
        },
      }))
    )
  }

  // Append in chunks of 100 (Notion API limit)
  for (let i = 0; i < blocks.length; i += 100) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: blocks.slice(i, i + 100),
    })
  }
}

function chunkRichText(text: string): Array<{ text: { content: string } }> {
  const chunks: Array<{ text: { content: string } }> = []
  for (let i = 0; i < text.length; i += 1999) {
    chunks.push({ text: { content: text.slice(i, i + 1999) } })
  }
  return chunks
}

export async function createJob(data: {
  role: string
  company: string
  jobLink?: string
  jobDescription?: string
  tier?: import('./types').JobTier
  track?: import('./types').JobTrack
}): Promise<NotionJob> {
  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Role: { title: [{ text: { content: data.role } }] },
      Company: { rich_text: [{ text: { content: data.company } }] },
      Status: { select: { name: 'Proposed' } },
      Source: { select: { name: 'Manual' } },
      ...(data.tier ? { Tier: { select: { name: data.tier } } } : {}),
      ...(data.track ? { Track: { select: { name: data.track } } } : {}),
      ...(data.jobLink ? { 'Job Link': { url: data.jobLink } } : {}),
      ...(data.jobDescription ? { 'Job Description': { rich_text: chunkRichText(data.jobDescription) } } : {}),
      'Date Found': { date: { start: new Date().toISOString().split('T')[0] } },
    },
  })
  return pageToJob(page)
}

export async function fetchAllJobLinks(): Promise<Set<string>> {
  const links = new Set<string>()
  let cursor: string | undefined
  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      filter_properties: ['Job Link'],
    })
    response.results.forEach((page: any) => {
      const url = page.properties?.['Job Link']?.url
      if (url) links.add(url)
    })
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)
  return links
}

export async function createScoutJob(data: {
  role: string
  company: string
  jobLink: string
  jobDescription: string
  track?: import('./types').JobTrack
}): Promise<void> {
  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Role: { title: [{ text: { content: data.role } }] },
      Company: { rich_text: [{ text: { content: data.company } }] },
      Status: { select: { name: 'Proposed' } },
      Source: { select: { name: 'Scout' } },
      'Job Link': { url: data.jobLink },
      ...(data.jobDescription ? { 'Job Description': { rich_text: chunkRichText(data.jobDescription.slice(0, 2000)) } } : {}),
      ...(data.track ? { Track: { select: { name: data.track } } } : {}),
      'Date Found': { date: { start: new Date().toISOString().split('T')[0] } },
    },
  })
}

export async function skipStaleProposedJobs(): Promise<number> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0]

  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      and: [
        { property: 'Status', select: { equals: 'Proposed' } },
        { property: 'Date Found', date: { before: cutoff } },
      ],
    },
  })

  await Promise.all(
    response.results.map((page: any) =>
      notion.pages.update({ page_id: page.id, properties: { Status: { select: { name: 'Skipped' } } } })
    )
  )
  return response.results.length
}

export async function deleteJob(pageId: string): Promise<void> {
  await notion.pages.update({ page_id: pageId, archived: true })
}

export async function updateJobStatus(pageId: string, status: JobStatus): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
    },
  })
}

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

export async function fetchExperienceBank(): Promise<string> {
  const response = await notion.blocks.children.list({
    block_id: EXPERIENCE_BANK_PAGE_ID,
    page_size: 100,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines = response.results.map((block: any) => {
    const type = block.type
    const content = block[type]
    if (!content?.rich_text) return ''
    const text = extractText(content.rich_text)
    if (type === 'heading_1') return `\n# ${text}`
    if (type === 'heading_2') return `\n## ${text}`
    if (type === 'heading_3') return `\n### ${text}`
    if (type === 'bulleted_list_item') return `- ${text}`
    if (type === 'numbered_list_item') return `${text}`
    if (type === 'divider') return '\n---'
    return text
  })

  return lines.filter(Boolean).join('\n')
}
