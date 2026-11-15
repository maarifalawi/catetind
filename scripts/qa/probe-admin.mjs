/**
 * scripts/qa/probe-admin.mjs — kontrol akses /admin & /api/admin untuk akun biasa.
 * Pakai: node scripts/qa/probe-admin.mjs
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
const cookie = `${COOKIE_NAME}=${encodeURIComponent(sessionCookieValue(session))}`

for (const api of ['/api/admin/sync', '/api/admin/export?type=unsubscribed']) {
  const res = await fetch(`${BASE}${api}`, { headers: { cookie }, redirect: 'manual' })
  log(`API ${api} → ${res.status}`)
}

const anonApi = await fetch(`${BASE}/api/admin/sync`, { redirect: 'manual' })
log(`API /api/admin/sync tanpa cookie → ${anonApi.status}`)

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
await context.addCookies([
  { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
])
const page = await context.newPage()
const res = await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
log(`Halaman /admin status=${res?.status()} → ${page.url()}`)
log(`Judul: ${await page.title()}`)
log(`Teks awal: ${(await page.evaluate(() => document.body.innerText)).slice(0, 120).replace(/\s+/g, ' ')}`)

await browser.close()
await deleteUserByEmail(user.email)
