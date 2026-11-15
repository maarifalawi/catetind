/** probe sementara: daftar kontrol di /joint (dipakai untuk menajamkan selector) */
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  chromiumPath,
  createUser,
  deleteUserByEmail,
  grantTier,
  log,
  passwordSession,
  sessionCookieValue,
} from './harness.mjs'

const BASE = 'http://localhost:3000'
const stamp = Date.now().toString(36)
const USER = { email: `qa.probejoint.${stamp}@catetind.test`, password: `Qa!${stamp}Jj1`, name: 'Probe Joint' }
const auth = await createUser(USER)
await grantTier(auth.id, 'waras')
const session = await passwordSession(USER)
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
await context.addCookies([
  { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
])
const page = await context.newPage()
await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(800)
await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
await page.getByRole('button', { name: /^Lanjut/ }).click()
await page.locator('button[aria-pressed]').first().click()
await page.getByLabel(/^Saldo /).fill('1500000')
await page.getByRole('button', { name: /^Lanjut/ }).click()
await page.getByRole('button', { name: 'Lewati dulu, catat nanti' }).click()
await page.waitForURL('**/app', { timeout: 30_000 })

await page.goto(`${BASE}/joint`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const info = await page.evaluate(() => ({
  path: location.pathname,
  text: (document.querySelector('main')?.innerText ?? document.body.innerText).slice(0, 700),
  buttons: Array.from(document.querySelectorAll('button')).map((node) => ({
    label: (node.getAttribute('aria-label') ?? node.textContent ?? '').trim().slice(0, 50),
    visible: node.getClientRects().length > 0,
  })),
  inputs: Array.from(document.querySelectorAll('input')).map((node) => ({
    type: node.type,
    placeholder: node.placeholder,
    visible: node.getClientRects().length > 0,
  })),
}))
log(JSON.stringify(info, null, 2))

const createBtn = page.locator('button:visible').filter({ hasText: 'Buat Dompet' }).first()
log(`create count: ${await page.locator('button:visible').filter({ hasText: 'Buat Dompet' }).count()}`)
await createBtn.click({ timeout: 3000 }).catch((error) => log(`click gagal: ${error.message.slice(0, 120)}`))
await page.waitForTimeout(1200)
const after = await page.evaluate(() => ({
  text: (document.querySelector('main')?.innerText ?? document.body.innerText).slice(0, 500),
  dialogs: Array.from(document.querySelectorAll('[role="dialog"]'))
    .filter((node) => node.getClientRects().length > 0)
    .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').slice(0, 160)),
  visibleInputs: Array.from(document.querySelectorAll('input')).filter((node) => node.getClientRects().length > 0).map((node) => node.placeholder || node.type),
}))
log(JSON.stringify(after, null, 2))


await browser.close()
await deleteUserByEmail(USER.email)
