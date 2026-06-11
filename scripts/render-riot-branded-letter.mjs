// One-off branded cover letter renderer for the Riot Games APAC application.
// Deliberately separate from lib/htmlTemplates.ts: that template stays company-neutral.
// Usage: node scripts/render-riot-branded-letter.mjs
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const OUT_PDF = 'generated/riot-apac-esports-events-cover-letter.pdf'
const OUT_HTML = 'generated/riot-cover-letter-branded.html'

// ---------------------------------------------------------------- letter text
const GREETING = 'Dear Hiring Manager,'
const PARAGRAPHS = [
  `My name is Louis Houvet, a 25-year-old professional starting my career after a master's in strategic marketing and communications, a bachelor's in hospitality management, and over three years of experience producing live events across tourism and esports. Gaming has been part of my life since I was a kid, and Riot's titles are the ones I always come back to. Stepping into esports recently made me realise how much I enjoy this world, and that is the real reason I am writing: the Esports Events Coordinator role for APAC Emerging Markets is one of the few jobs where I can genuinely see myself.`,
  `Last year, I spent half a year working with Gen.G in Riyadh, including a whole month running the Superfan Program at the Esports World Cup. I coordinated vendors, worked alongside the broadcast and sponsorship teams to keep the creative vision intact on site, and looked after the technical side of the activation with our production partners, from LED screens to power and connectivity. Those months asked a lot of us, and I enjoyed every day of it.`,
  `Before esports, I coordinated events at Procon in Mexico City, contracting more than fifteen vendors across three countries and organising travel programs for groups of fifty or more international guests. Those years taught me to stay organised, adapt quickly, and communicate well with people from very different backgrounds. I plan my projects with tools like Airtable and Google Suite, and I like looking back at event data to see what we could do better next time.`,
  `To be frank, Riot has been at the top of my list since I started my bachelor's. I used to look at the headquarters in California and the esports hub in Berlin, knowing there were offices in other cities too. So when I saw this role was based in Singapore, a country I have already visited four times, it caught my attention immediately. Then I watched the office presentation video, and I just felt it: I think I could belong and grow there.`,
  `APAC is a region I love and have travelled extensively, and I feel at ease with its different cultures even though I have not worked there yet. I do not speak Mandarin or Japanese today, but I am ready to learn whichever language the subregion needs. I would be happy to call Singapore home, and I am currently securing a Work Holiday Pass that lets me work there without sponsorship from day one.`,
  `I am genuinely excited about this role. It is one of those rare jobs where I can picture myself completely, and I would love the opportunity to prove it in an interview. Thank you for your time and consideration.`,
]

// ---------------------------------------------------------------- asset fetch
async function fetchAsBase64(url, headers = {}) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/png'
  const buf = Buffer.from(await res.arrayBuffer())
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function getChamberPortrait() {
  const res = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
  if (!res.ok) throw new Error(`valorant-api agents -> ${res.status}`)
  const { data } = await res.json()
  const chamber = data.find((a) => a.displayName === 'Chamber')
  if (!chamber) throw new Error('Chamber not found in agent list')
  const url = chamber.fullPortrait || chamber.fullPortraitV2 || chamber.displayIcon
  return fetchAsBase64(url)
}

async function getRiotLogo() {
  // Wikimedia Commons hosts official Riot logo files; any version is acceptable.
  const api =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cmime' +
    '&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=' +
    encodeURIComponent('Riot Games logo svg')
  try {
    const res = await fetch(api, { headers: { 'User-Agent': 'cover-letter-render/1.0 (personal job application)' } })
    if (!res.ok) throw new Error(`commons api -> ${res.status}`)
    const json = await res.json()
    const pages = Object.values(json?.query?.pages ?? {})
    const candidate = pages
      .map((p) => p.imageinfo?.[0])
      .filter(Boolean)
      .find((i) => /riot[ _]games/i.test(i.url) && /\.(svg|png)$/i.test(i.url))
    if (!candidate) throw new Error('no riot logo match on commons')
    return await fetchAsBase64(candidate.url, { 'User-Agent': 'cover-letter-render/1.0 (personal job application)' })
  } catch (e) {
    console.warn('[logo fallback]', e.message)
    return null // falls back to a styled wordmark in the template
  }
}

// ---------------------------------------------------------------- html build
function buildHtml({ chamberB64, logoB64 }) {
  const paragraphsHtml = PARAGRAPHS.map((p) => `<p>${p}</p>`).join('\n      ')
  const logoHtml = logoB64
    ? `<img class="riot-logo" src="${logoB64}" alt="Riot Games" />`
    : `<div class="riot-wordmark">RIOT<span> GAMES</span></div>`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --navy: #0F1923;
    --red: #FF4655;
    --bone: #ECE8E1;
    --gold: #C9A86A;
    --ink: #1D2430;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; }
  .page {
    width: 210mm; height: 296.5mm;
    position: relative; overflow: hidden;
    background: #FDFCFA; color: var(--ink);
    font-family: 'EB Garamond', Georgia, serif;
  }

  /* header band */
  .band {
    background: var(--navy);
    padding: 26px 46px 20px 46px;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .name {
    font-family: 'Oswald', sans-serif; font-weight: 600;
    font-size: 30px; letter-spacing: 5px; color: var(--bone);
    line-height: 1;
  }
  .contact {
    margin-top: 9px; font-family: 'Oswald', sans-serif; font-weight: 400;
    font-size: 9px; letter-spacing: 1.6px; color: rgba(236,232,225,0.72);
    text-transform: uppercase;
  }
  .contact .slash { color: var(--red); font-weight: 600; padding: 0 5px; }
  .role-tag {
    text-align: right; font-family: 'Oswald', sans-serif;
    font-size: 10px; letter-spacing: 2.4px; color: var(--red);
    text-transform: uppercase; line-height: 1.7;
  }
  .role-tag span { color: rgba(236,232,225,0.55); }
  .redline { height: 4px; background: var(--red); }

  /* content */
  .content { position: relative; padding: 24px 46px 0 46px; z-index: 1; }
  .recipient-row { display: flex; justify-content: space-between; align-items: center; }
  .recipient {
    font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 2px;
    color: var(--navy); text-transform: uppercase;
  }
  .recipient .slash { color: var(--red); font-weight: 600; padding: 0 4px; }
  .dateline { margin-top: 5px; font-style: italic; font-size: 12px; color: #5A6068; }
  .riot-logo { height: 34px; }
  .riot-wordmark {
    font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 19px;
    letter-spacing: 3px; color: var(--red);
  }
  .riot-wordmark span { color: var(--navy); font-weight: 400; }

  .greeting { margin-top: 22px; font-size: 13.6px; font-weight: 500; }
  .letter { margin-top: 12px; max-width: 168mm; }
  .letter p { font-size: 13.2px; line-height: 1.52; margin-bottom: 11px; text-align: justify; }

  /* chamber watermark */
  .chamber {
    position: absolute; right: -30px; bottom: 24mm; height: 560px;
    opacity: 0.17; z-index: 0; pointer-events: none;
  }

  /* signature */
  .signature { margin-top: 16px; break-inside: avoid; page-break-inside: avoid; }
  .regards { font-style: italic; font-size: 12.5px; color: #5A6068; }
  .initials {
    margin-top: 8px; font-family: 'Oswald', sans-serif; font-weight: 500;
    font-size: 30px; letter-spacing: 6px; color: var(--gold); line-height: 1;
  }
  .sig-rule { width: 74px; height: 1px; background: var(--gold); opacity: 0.6; margin: 8px 0; }
  .sig-name {
    font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 4px;
    color: var(--navy); text-transform: uppercase;
  }

  /* footer band */
  .footer {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 1;
  }
  .footer .thin { height: 3px; background: var(--red); }
  .footer .bar {
    background: var(--navy); padding: 8px 0; text-align: center;
    font-family: 'Oswald', sans-serif; font-size: 7.5px; letter-spacing: 4px;
    color: rgba(236,232,225,0.78); text-transform: uppercase;
  }
  .footer .slash { color: var(--red); padding: 0 7px; }
</style>
</head><body>
<div class="page">
  <div class="band">
    <div>
      <div class="name">LOUIS HOUVET</div>
      <div class="contact">1louishvt1@gmail.com<span class="slash">//</span>Madrid<span class="slash">//</span>louishouvet.vercel.app<span class="slash">//</span>linkedin.com/in/louis-houvet</div>
    </div>
    <div class="role-tag">
      Esports Events Coordinator<br/><span>APAC Emerging Markets // Contract</span>
    </div>
  </div>
  <div class="redline"></div>

  <img class="chamber" src="${chamberB64}" alt="" />

  <div class="content">
    <div class="recipient-row">
      <div>
        <div class="recipient">Riot Games<span class="slash">//</span>Esports Events, APAC-EM</div>
        <div class="dateline">Madrid, 11 June 2026</div>
      </div>
      ${logoHtml}
    </div>

    <div class="greeting">${GREETING}</div>
    <div class="letter">
      ${paragraphsHtml}
    </div>

    <div class="signature">
      <div class="regards">Best regards,</div>
      <div class="initials">LH</div>
      <div class="sig-rule"></div>
      <div class="sig-name">Louis Houvet</div>
    </div>
  </div>

  <div class="footer">
    <div class="thin"></div>
    <div class="bar">League of Legends<span class="slash">//</span>Valorant<span class="slash">//</span>Teamfight Tactics<span class="slash">//</span>Wild Rift</div>
  </div>
</div>
</body></html>`
}

// ---------------------------------------------------------------- render
async function main() {
  console.log('Fetching assets...')
  const [chamberB64, logoB64] = await Promise.all([getChamberPortrait(), getRiotLogo()])
  console.log('Chamber portrait:', (chamberB64.length / 1024).toFixed(0), 'KB | Riot logo:', logoB64 ? 'ok' : 'wordmark fallback')

  const html = buildHtml({ chamberB64, logoB64 })
  fs.writeFileSync(OUT_HTML, html)

  const executablePath =
    process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const browser = await puppeteer.launch({ executablePath, headless: true, args: [] })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
    fs.writeFileSync(OUT_PDF, Buffer.from(pdf))
    const pages = (pdf.length && (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length) || '?'
    console.log('Saved', OUT_PDF, '|', (pdf.length / 1024).toFixed(0), 'KB |', pages, 'page(s)')
  } finally {
    await browser.close()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
