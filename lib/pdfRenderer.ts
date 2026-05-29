import puppeteer from 'puppeteer-core'

export async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium')
    return puppeteer.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })
  }
  // Local dev: uses system Chrome. Set CHROME_PATH in .env.local if not at default location.
  const executablePath =
    process.env.CHROME_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  return puppeteer.launch({ executablePath, headless: true, args: [] })
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    // networkidle0 ensures Google Fonts load before PDF generation
    await page.setContent(html, { waitUntil: 'networkidle0' as 'load' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
