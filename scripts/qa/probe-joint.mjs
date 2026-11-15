/**
 * scripts/qa/probe-joint.mjs — kenapa akun gratis mendarat di /checkout?
 * Pakai: node scripts/qa/probe-joint.mjs
 */
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  createUser,
  passwordSession,
  sessionCookieValue,
  deleteUserByEmail,
  chromiumPath,
  log,
} from './harness.mjs'

const BASE = 'http://localhost:3000'
const stamp = Date.now().toString(36)
const user = { email: `qa.probe.${stamp}@catetind.test`, password: `Qa!${stamp}Zz9`, name: 'Probe' }
await createUser(user)
const session = await passwordSession(user)

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'id-ID' })
await context.addCookies([
  { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
])
const page = await context.newPage()
page.on('response', (res) => {
  if (res.status() >= 300 && res.status() < 400) log(`  redirect ${res.status()} ${res.url()} → ${res.headers()['location']}`)
})
const res = await page.goto(`${BASE}/joint`, { waitUntil: 'domcontentloaded' })
log(`goto status: ${res?.status()} · url: ${page.url()}`)
await page.waitForTimeout(3000)
log(`setelah 3s : ${page.url()}`)
log(`judul      : ${await page.title()}`)
log(`teks awal  : ${(await page.evaluate(() => document.body.innerText)).slice(0, 220).replace(/\s+/g, ' ')}`)

await browser.close()
await deleteUserByEmail(user.email)
