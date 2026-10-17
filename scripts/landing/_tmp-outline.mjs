/* Alat sekali pakai: outline section About/Pricing/FAQ dari situs live Framer.
   Dihapus setelah pemakaian — bukan bagian dari repo. */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'id-ID' })
await page.goto('https://reserved-calls-942581.framer.app/', { waitUntil: 'load', timeout: 90_000 })
await page.waitForTimeout(3500)

const data = await page.evaluate(() => {
  const pick = (el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      tag: el.tagName,
      id: el.id,
      name: el.getAttribute('data-framer-name'),
      w: Math.round(r.width),
      h: Math.round(r.height),
      y: Math.round(r.y + window.scrollY),
      bg: cs.backgroundColor,
      pos: cs.position,
      top: cs.top,
      fs: cs.fontSize,
      lh: cs.lineHeight,
      ff: cs.fontFamily,
      color: cs.color,
      pad: cs.padding,
      gap: cs.gap,
      radius: cs.borderRadius,
    }
  }
  const out = {}
  for (const name of ['About', 'Pricing', 'FAQ']) {
    const sec = document.querySelector(`section[data-framer-name="${name}"]`)
    out[name] = sec
      ? {
          self: pick(sec),
          kids: [...sec.querySelectorAll(':scope > *')].map(pick),
          headings: [...sec.querySelectorAll('h1,h2,h3')]
            .map((el) => ({ text: el.textContent.trim().slice(0, 90), ...pick(el) }))
            .slice(0, 14),
        }
      : null
  }
  return out
})

console.log(JSON.stringify(data, null, 1))
await browser.close()
