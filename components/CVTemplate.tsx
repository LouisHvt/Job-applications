'use client'
import React from 'react'

export interface CVData {
  summary: string
  selectedExperiences: Array<{
    title: string
    company: string
    period: string
    location: string
    bullets: string[]
  }>
  skills: string[]
  education: Array<{
    degree: string
    school: string
    year: string
    location: string
    highlight?: string
  }>
}

interface ProfileInfo {
  name: string
  email: string
  linkedin: string
  portfolio: string
  location: string
}

interface Props {
  cvData: CVData
  profile: ProfileInfo
}


// Precise CV measurements matching the template brief
const S: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'Calibri, "Calibri Regular", Arial, sans-serif',
    fontSize: '11pt',
    color: '#000000',
    backgroundColor: '#ffffff',
    width: '555pt',
    margin: '0 auto',
    padding: '14pt 0 20pt 0',
    lineHeight: '1.25',
    boxSizing: 'border-box',
  },
  name: {
    fontSize: '17pt',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '3pt',
    letterSpacing: '1pt',
    textTransform: 'uppercase',
  },
  contactCenter: {
    textAlign: 'center',
    fontSize: '11pt',
    marginBottom: '1.5pt',
  },
  contactRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11pt',
    marginBottom: '1.5pt',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: '11pt',
    textTransform: 'uppercase',
    marginTop: '6pt',
    marginBottom: '1pt',
    letterSpacing: '0.3pt',
  },
  rule: {
    border: 'none',
    borderTop: '0.75px solid #000',
    margin: '0 0 3pt 0',
  },
  entryCompanyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  companyName: {
    fontWeight: 'bold',
    fontSize: '11pt',
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: '11pt',
    fontStyle: 'italic',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '2pt',
  },
  jobTitle: {
    fontWeight: 'bold',
    fontSize: '11pt',
  },
  dateText: {
    fontSize: '11pt',
  },
  // Bullet: character at 0.5pt from content edge, text at 17.3pt from content edge
  bulletItem: {
    display: 'flex',
    gap: '0',
    marginBottom: '1.5pt',
    fontSize: '11pt',
  },
  bulletChar: {
    minWidth: '16.8pt',
    paddingLeft: '0.5pt',
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
  },
  summaryText: {
    fontSize: '11pt',
    marginBottom: '2pt',
    marginTop: '2pt',
  },
  skillsText: {
    fontSize: '11pt',
    marginBottom: '2pt',
    marginTop: '2pt',
  },
}

function SectionTitle({ title }: { title: string }) {
  return (
    <>
      <div style={S.sectionTitle}>{title}</div>
      <hr style={S.rule} />
    </>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={S.bulletItem}>
      <span style={S.bulletChar}>▪</span>
      <span style={S.bulletText}>{text}</span>
    </div>
  )
}

export default function CVTemplate({ cvData, profile }: Props) {
  const portfolioDisplay = (profile.portfolio || 'louishouvet.vercel.app')
    .replace('https://', '')
    .replace('http://', '')

  return (
    <div style={S.page} id="cv-print-area">
      {/* ── HEADER ── */}
      <div style={S.name}>{profile.name.toUpperCase()}</div>
      <div style={S.contactCenter}>
        {profile.location} &nbsp;|&nbsp; {profile.phone} &nbsp;|&nbsp; {profile.email}
      </div>
      <div style={S.contactRow}>
        <span>
          {profile.linkedin.replace('https://', '')}
          {profile.otherInfo.length > 0 && <> &nbsp;|&nbsp; {profile.otherInfo[0]}</>}
        </span>
        {profile.portfolio && (
          <span>
            Portfolio:&nbsp;
            <a href={profile.portfolio} style={{ color: '#000', textDecoration: 'underline' }}>
              {portfolioDisplay}
            </a>
          </span>
        )}
      </div>

      {/* ── PROFESSIONAL SUMMARY ── */}
      <SectionTitle title="PROFESSIONAL SUMMARY" />
      <div style={S.summaryText}>{cvData.summary}</div>

      {/* ── EDUCATION ── */}
      <SectionTitle title="EDUCATION" />
      {cvData.education.map((edu, i) => (
        <div key={i} style={{ marginBottom: '3pt' }}>
          <div style={S.entryCompanyRow}>
            <span style={S.companyName}>{edu.school.toUpperCase()}</span>
            <span style={S.locationText}>{edu.location}</span>
          </div>
          <div style={S.titleRow}>
            <span style={S.jobTitle}>{edu.degree}</span>
            <span style={S.dateText}>{edu.year}</span>
          </div>
          {edu.highlight && <Bullet text={edu.highlight} />}
        </div>
      ))}

      {/* ── PROFESSIONAL EXPERIENCE ── */}
      <SectionTitle title="PROFESSIONAL EXPERIENCE" />
      {cvData.selectedExperiences.map((exp, i) => (
        <div key={i} style={{ marginBottom: '5pt' }}>
          <div style={S.entryCompanyRow}>
            <span style={S.companyName}>{exp.company.toUpperCase()}</span>
            <span style={S.locationText}>{exp.location}</span>
          </div>
          <div style={S.titleRow}>
            <span style={S.jobTitle}>{exp.title}</span>
            <span style={S.dateText}>{exp.period}</span>
          </div>
          {exp.bullets.map((bullet, j) => (
            <Bullet key={j} text={bullet} />
          ))}
        </div>
      ))}

      {/* ── LANGUAGES ── */}
      {profile.languages.length > 0 && (
        <>
          <SectionTitle title="LANGUAGES" />
          {profile.languages.map((lang, i) => <Bullet key={i} text={lang} />)}
        </>
      )}

      {/* ── TECHNICAL SKILLS ── */}
      {cvData.skills.length > 0 && (
        <>
          <SectionTitle title="TECHNICAL SKILLS" />
          <div style={S.skillsText}>{cvData.skills.join(' · ')}</div>
        </>
      )}

      {/* ── OTHER INFORMATION ── */}
      {profile.otherInfo.length > 1 && (
        <>
          <SectionTitle title="OTHER INFORMATION" />
          {profile.otherInfo.slice(1).map((info, i) => <Bullet key={i} text={info} />)}
        </>
      )}
    </div>
  )
}
