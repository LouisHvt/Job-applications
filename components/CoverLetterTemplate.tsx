'use client'
import React from 'react'
import { NotionJob, Profile } from '@/lib/types'

interface Props {
  coverLetter: string
  job: NotionJob
  profile: Profile
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const BROWN_DARK = '#1a1814'
const BROWN_MID = '#4a463d'

const S: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '"EB Garamond", Georgia, serif',
    fontSize: '14px',
    color: BROWN_DARK,
    backgroundColor: '#ffffff',
    width: '595pt',
    padding: '54pt 68pt',
    boxSizing: 'border-box',
    lineHeight: '1.65',
    margin: '0 auto',
  },
  name: {
    fontSize: '21px',
    fontWeight: 500,
    letterSpacing: '0.11px',
    color: BROWN_DARK,
    marginBottom: '4px',
  },
  contact: {
    fontSize: '12.5px',
    fontStyle: 'italic',
    lineHeight: '1.65',
    color: BROWN_MID,
  },
  meta: {
    fontSize: '12.5px',
    lineHeight: '1.65',
    color: BROWN_MID,
    marginTop: '20px',
  },
  rule: {
    border: 'none',
    borderTop: '1px solid #4a463d',
    opacity: 0.35,
    margin: '18px 0',
  },
  body: {
    fontSize: '14px',
    lineHeight: '24px',
    color: BROWN_DARK,
  },
  paragraph: {
    marginBottom: '16px',
  },
  sig: {
    marginTop: '28px',
  },
  sigRegards: {
    fontSize: '13.5px',
    fontStyle: 'italic',
    color: BROWN_MID,
    marginBottom: '12px',
  },
  sigMark: {
    fontSize: '30px',
    fontStyle: 'italic',
    letterSpacing: '-0.68px',
    lineHeight: '30px',
    color: BROWN_DARK,
    marginBottom: '8px',
  },
  sigLine: {
    width: '80px',
    height: '1px',
    backgroundColor: BROWN_MID,
    opacity: 0.35,
    marginBottom: '8px',
  },
  sigName: {
    fontSize: '12px',
    letterSpacing: '2.16px',
    textTransform: 'uppercase' as const,
    color: BROWN_MID,
  },
}

export default function CoverLetterTemplate({ coverLetter, job, profile }: Props) {
  const name = profile.name
  const email = profile.email
  const phone = profile.phone
  const portfolioDisplay = (profile.portfolio || '')
    .replace('https://', '').replace('http://', '')
  const location = profile.location || 'Madrid'
  const today = formatDate(new Date())
  const sigInitials = name.split(' ').filter(Boolean).map(w => w[0]).join('')

  const paragraphs = coverLetter
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <div style={S.page} id="cl-print-area">
      <div style={S.name}>{name}</div>
      <div style={S.contact}>
        {email}<br />
        {phone}<br />
        {portfolioDisplay}
      </div>

      <div style={S.meta}>
        {today}<br />
        {location}<br />
        <br />
        {job.company}
      </div>

      <hr style={S.rule} />

      <div style={S.body}>
        {paragraphs.map((p, i) => (
          <p key={i} style={S.paragraph}>{p}</p>
        ))}
        <p style={S.paragraph}>I trust that you can see how I could be a great fit for this position.</p>
        <p>Thank you for your consideration.</p>
      </div>

      <div style={S.sig}>
        <div style={S.sigRegards}>Best regards,</div>
        <div style={S.sigMark}>{sigInitials}</div>
        <div style={S.sigLine} />
        <div style={S.sigName}>{name}</div>
      </div>
    </div>
  )
}
