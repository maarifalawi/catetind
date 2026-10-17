/**
 * scripts/landing/_tmp-release-verify.mjs
 * Verifikasi rilis landing: overflow, font, pricing monthly/lifetime,
 * checkout, marquee, WhatsApp, dan screenshot `docs/landing/shots/release-*`.
 * Jalankan setelah `pnpm build` + `pnpm exec next start -p 3100`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:3100'
const OUT = path.join(process.cwd(), 'docs', 'landing', 'shots')
fs.mkdirSync(OUT, { recursive: true })

const channel = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'msedge'
  : 'chrome'
const browser = await chromium.launch({ channel, headless: true })
const out = { pages: {}, pricing: {}, checkout: {}, marquee: {}, contact: {}, whatsapp: null }

async function open(pathname, viewport = { width: 1440, height: 1000 }, extra = {}) {
  const context = await browser.newContext({
    viewport,
    locale: 'id-ID',
    deviceScaleFactor: 1,
    ...extra,
  })
  const page = await context.newPage()
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'load', timeout: 90_000 })
  await page.waitForTimeout(1800)
  return { context, page }
}

async function measure(page) {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body)
    const h1 = document.querySelector('h1')
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      bodyFont: body.fontFamily,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
    }
  })
}

for (const [name, vp] of Object.entries({
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 1000 },
  mobile: { width: 390, height: 844 },
})) {
  const { context, page } = await open('/', vp)
  out.pages[`root-${name}`] = await measure(page)
  await page.screenshot({ path: path.join(OUT, `release-root-${name}.png`), fullPage: true })
  await context.close()
}

for (const [name, vp] of Object.entries({
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 1000 },
  mobile: { width: 390, height: 844 },
})) {
  const { context, page } = await open('/contact', vp)
  out.pages[`contact-${name}`] = await measure(page)
  await page.screenshot({ path: path.join(OUT, `release-contact-${name}.png`), fullPage: true })
  await context.close()
}

/* pricing monthly → lifetime */
{
  const { context, page } = await open('/')
  const price = page.locator('#pricing [data-landing-price="waras"]')
  const card = price.locator('xpath=ancestor::article')
  out.pricing.monthly = (await price.textContent())?.trim()
  out.pricing.monthlyCta = await card.locator('a[href*="/checkout"]').getAttribute('href')
  await page.locator('#pricing').screenshot({ path: path.join(OUT, 'release-pricing-monthly.png') })
  await page.locator('[data-landing-mode="lifetime"]').click()
  await page.waitForTimeout(400)
  out.pricing.lifetime = (await price.textContent())?.trim()
  out.pricing.lifetimeCta = await card.locator('a[href*="/checkout"]').getAttribute('href')
  await page.locator('#pricing').screenshot({ path: path.join(OUT, 'release-pricing-lifetime.png') })
  await context.close()
}

/* checkout monthly & lifetime */
for (const period of ['monthly', 'lifetime']) {
  const { context, page } = await open(`/checkout?plan=waras&period=${period}`, {
    width: 1440,
    height: 1100,
  })
  const text = await page.locator('body').innerText()
  out.checkout[period] = {
    has79: text.includes('79.000'),
    has129: text.includes('129.000'),
    has30: text.includes('per 30 hari') || text.includes('Aktif 30 hari'),
    hasLifetime: text.includes('Sekali bayar, akses selamanya'),
    overflow: (await measure(page)).overflow,
  }
  await page.screenshot({
    path: path.join(OUT, `release-checkout-${period}.png`),
    fullPage: true,
  })
  await context.close()
}

/* FAQ rail desktop + dropdown mobile */
{
  const { context, page } = await open('/')
  await page.locator('#faq').screenshot({ path: path.join(OUT, 'release-faq-desktop.png') })
  await context.close()
}
{
  const { context, page } = await open('/', { width: 390, height: 844 })
  const trigger = page.locator('#faq button[aria-haspopup="listbox"]')
  await trigger.click()
  await page.waitForTimeout(300)
  await page.locator('#faq').screenshot({ path: path.join(OUT, 'release-faq-mobile.png') })
  await context.close()
}

/* marquee: bergerak, pause saat hover, diam saat reduced motion */
{
  const { context, page } = await open('/', { width: 1440, height: 1000 })
  const marquee = page.locator('.animate-landing-marquee')
  out.marquee.running = await marquee.evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      animationName: s.animationName,
      duration: s.animationDuration,
      state: s.animationPlayState,
    }
  })
  await page.locator('.landing-marquee-mask').hover()
  await page.waitForTimeout(200)
  out.marquee.hover = await marquee.evaluate((el) => getComputedStyle(el).animationPlayState)
  await page.locator('#hero').screenshot({ path: path.join(OUT, 'release-marquee.png') })
  await context.close()
}
{
  const { context, page } = await open(
    '/',
    { width: 1440, height: 1000 },
    { reducedMotion: 'reduce' },
  )
  out.marquee.reducedMotion = await page
    .locator('.animate-landing-marquee')
    .evaluate((el) => getComputedStyle(el).animationName)
  await context.close()
}

/* WhatsApp link + form submit membuka WA berisi isi form */
{
  const { context, page } = await open('/contact')
  out.whatsapp = await page.locator('a[href^="https://wa.me/"]').first().getAttribute('href')
  await page.fill('#landing-contact-name', 'Rina')
  await page.fill('#landing-contact-contact', '08123456789')
  await page.fill('#landing-contact-question', 'Aman gak datanya?')
  const [popup] = await Promise.all([
    context.waitForEvent('page', { timeout: 10_000 }),
    page.locator('form button[type="submit"]').click(),
  ])
  out.contact.submitUrl = popup.url()
  out.contact.noteVisible = await page
    .locator('form p[role="status"]')
    .isVisible()
    .catch(() => false)
  await popup.close()
  await context.close()
}

await browser.close()
console.log(JSON.stringify(out, null, 2))
