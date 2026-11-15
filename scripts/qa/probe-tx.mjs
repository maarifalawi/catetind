/**
 * scripts/qa/probe-tx.mjs — di mana form transaksi yang BENAR-BENAR terlihat?
 * Mencetak posisi tiap input "Nominal transaksi" dan tombol "Catat" beserta
 * induk dialognya, supaya skrip uji tidak menulis ke shell bayangan.
 */
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  createUser,
  grantTier,
  passwordSession,
  sessionCookieValue,
  deleteUserByEmail,
  chromiumPath,
  log,
} from './harness.mjs'

const BASE = 'http://localhost:3000'
const stamp = Date.now().toString(36)
const USER = { email: `qa.txp.${stamp}@catetind.test`, password: `Qa!${stamp}Tx3`, name: 'Tx Probe' }
const auth = await createUser(USER)
await grantTier(auth.id, 'waras')
const session = await passwordSession(USER)
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'id-ID', timezoneId: 'Asia/Jakarta' })
await context.addCookies([{ name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' }])
const page = await context.newPage()

try {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('5000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('25000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Catat transaksi' }).first().click()
  await page.waitForTimeout(900)

  const info = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }
    }
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].map((el) => ({
      rect: rect(el),
      cls: String(el.className).slice(0, 120),
      text: (el.innerText || '').trim().slice(0, 60),
      hasAmount: Boolean(el.querySelector('input[aria-label="Nominal transaksi"]')),
    }))
    const inputs = [...document.querySelectorAll('input[aria-label="Nominal transaksi"]')].map((el) => ({ rect: rect(el) }))
    return { dialogs, inputs }
  })
  log(JSON.stringify(info, null, 2))
} catch (error) {
  log(`GAGAL: ${String(error).slice(0, 500)}`)
} finally {
  await context.close()
  await browser.close()
  await deleteUserByEmail(USER.email)
}
