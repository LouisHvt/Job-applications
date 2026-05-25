import { NotionJob, Profile } from './types'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function generateCoverLetterHTML(
  coverLetter: string,
  job: NotionJob,
  profile: Profile
): string {
  const paragraphs = coverLetter
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  const name = profile.name
  const email = profile.email
  const phone = profile.phone
  const portfolioDisplay = (profile.portfolio || '')
    .replace('https://', '').replace('http://', '')
  const location = profile.location || 'Madrid'
  const today = formatDate(new Date())
  const sigInitials = (profile.name || 'Louis Houvet')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')

  const paragraphsHTML = paragraphs
    .map(p => `      <p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Cover Letter — ${job.company}</title>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #f0ede8;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 48px 24px;
      font-family: 'EB Garamond', Georgia, serif;
    }

    .page {
      width: 792px;
      min-height: 1120px;
      background: #ffffff;
      padding: 88px 100px;
      color: #1a1814;
    }

    .v1-name {
      font-size: 22px;
      font-weight: 500;
      letter-spacing: 0.11px;
      color: #1a1814;
      margin-bottom: 6px;
    }

    .v1-contact {
      font-size: 13.5px;
      font-style: italic;
      line-height: 22.95px;
      color: #4a463d;
    }

    .v1-meta {
      font-size: 13.5px;
      line-height: 22.95px;
      color: #4a463d;
      margin-top: 32px;
    }

    .v1-rule {
      height: 1px;
      background: #4a463d;
      margin: 28px 0;
      opacity: 0.4;
    }

    .v1-body {
      font-size: 15px;
      line-height: 26.25px;
      color: #1a1814;
    }

    .v1-body p + p {
      margin-top: 22px;
    }

    .v1-sig {
      margin-top: 52px;
    }

    .v1-sig-mark {
      font-size: 34px;
      font-style: italic;
      letter-spacing: -0.68px;
      line-height: 34px;
      color: #1a1814;
      margin-bottom: 10px;
    }

    .v1-sig-line {
      height: 1px;
      width: 100px;
      background: #4a463d;
      opacity: 0.4;
      margin-bottom: 10px;
    }

    .v1-sig-name {
      font-size: 13.5px;
      letter-spacing: 2.16px;
      text-transform: uppercase;
      color: #4a463d;
    }

    @media print {
      body { background: white; padding: 0; }
      .page { min-height: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="v1-name">${name}</div>
    <div class="v1-contact">
      ${email}<br>
      ${phone}<br>
      ${portfolioDisplay}
    </div>

    <div class="v1-meta">
      ${today}<br>
      ${location}<br>
      <br>
      ${job.company}
    </div>

    <div class="v1-rule"></div>

    <div class="v1-body">
${paragraphsHTML}
    </div>

    <div class="v1-sig">
      <div class="v1-sig-mark">${sigInitials}</div>
      <div class="v1-sig-line"></div>
      <div class="v1-sig-name">${name}</div>
    </div>
  </div>
</body>
</html>`
}
