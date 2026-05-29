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
          <span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">&#9642;</span>
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
      ${edu.highlight ? `
        <div style="display:flex;gap:0;margin-bottom:1.5pt;font-size:11pt">
          <span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">&#9642;</span>
          <span style="flex:1">${edu.highlight}</span>
        </div>` : ''}
    </div>`).join('')

  const languagesHtml = profile.languages.length > 0 ? `
    <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">LANGUAGES</div>
    <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
    ${profile.languages.map(lang => `
      <div style="display:flex;gap:0;margin-bottom:1.5pt;font-size:11pt">
        <span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">&#9642;</span>
        <span style="flex:1">${lang}</span>
      </div>`).join('')}` : ''

  const skillsHtml = cvData.skills.length > 0 ? `
    <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">TECHNICAL SKILLS</div>
    <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
    <div style="font-size:11pt;margin-bottom:2pt;margin-top:2pt">${cvData.skills.join(' &middot; ')}</div>` : ''

  const otherInfoHtml = profile.otherInfo.length > 1 ? `
    <div style="font-weight:bold;font-size:11pt;text-transform:uppercase;margin-top:6pt;margin-bottom:1pt;letter-spacing:0.3pt">OTHER INFORMATION</div>
    <hr style="border:none;border-top:0.75px solid #000;margin:0 0 3pt 0" />
    ${profile.otherInfo.slice(1).map(info => `
      <div style="display:flex;gap:0;margin-bottom:1.5pt;font-size:11pt">
        <span style="min-width:16.8pt;padding-left:0.5pt;flex-shrink:0">&#9642;</span>
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
