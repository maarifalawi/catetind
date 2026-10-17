/* Alat sekali pakai: aset & detail Pricing/FAQ dari situs live Framer. */
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'id-ID' })
await page.goto('https://reserved-calls-942581.framer.app/', { waitUntil: 'load', timeout: 90_000 })
await page.waitForTimeout(3500)

const data = await page.evaluate(() => {
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y + window.scrollY) }
  }
  const cards = ['card-1', 'card-2', 'card-3', 'card-4'].map((id) => {
    const el = document.getElementById(id)
    if (!el) return { id, missing: true }
    return {
      id,
      text: el.innerText.replace(/\n{2,}/g, '\n').trim(),
      images: [...el.querySelectorAll('img')].map((img) => ({
        src: img.getAttribute('src'),
        current: img.currentSrc,
        alt: img.getAttribute('alt'),
        ...box(img),
      })),
    }
  })

  const pricing = document.getElementById('pricing')
  const pricingInfo = pricing
    ? {
        text: pricing.innerText.replace(/\n{2,}/g, '\n').trim(),
        buttons: [...pricing.querySelectorAll('a')].map((a) => ({
          text: a.innerText.trim().slice(0, 60),
          href: a.getAttribute('href'),
        })),
      }
    : null

  const faq = document.getElementById('faq')
  const faqInfo = faq
    ? {
        text: faq.innerText.replace(/\n{2,}/g, '\n').trim(),
        links: [...faq.querySelectorAll('a')].map((a) => ({
          text: a.innerText.trim().slice(0, 60),
          href: a.getAttribute('href'),
        })),
        rows: [...faq.querySelectorAll('[data-framer-name="Question"]')].map((el) => ({
          text: el.innerText.trim().slice(0, 120),
          ...box(el),
          bg: getComputedStyle(el.parentElement).backgroundColor,
        })),
      }
    : null

  return { cards, pricingInfo, faqInfo }
})

console.log(JSON.stringify(data, null, 1))
await browser.close()
