/**
 * scripts/qa/dump-ui.mjs — daftar kontrol yang BISA DIKLIK di rute nyata
 * (nama aksesibel + label input), dipakai untuk menulis skrip uji berikutnya
 * tanpa menebak selector.
 *
 * Pakai: node scripts/qa/dump-ui.mjs /wallet /history ...
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
const USER = { email: `qa.dump.${stamp}@catetind.test`, password: `Qa!${stamp}Du3`, name: 'Dump' }
const auth = await createUser(USER)
await grantTier(auth.id, 'waras')
const session = await passwordSession(USER)

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
})
await context.addCookies([
  { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
])
const page = await context.newPage()

const describe = async (label) => {
  const info = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return rect.width > 2 && rect.height > 2 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const name = (el) =>
      (el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60) ||
        el.getAttribute('name') ||
        el.tagName)
    const buttons = [...document.querySelectorAll('button,[role="button"],a[href]')]
      .filter(visible)
      .map((el) => `${el.tagName.toLowerCase()}: ${name(el)}`)
    const inputs = [...document.querySelectorAll('input,textarea,select')]
      .filter(visible)
      .map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('type') ?? el.tagName}] ${name(el)}`)
    const headings = [...document.querySelectorAll('h1,h2,h3')]
      .filter(visible)
      .map((el) => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80))
    return { buttons, inputs, headings }
  })
  log(`\n===== ${label} =====`)
  log(`H: ${info.headings.join(' | ')}`)
  log(`INPUT (${info.inputs.length}):\n  ${info.inputs.join('\n  ')}`)
  log(`BUTTON (${info.buttons.length}):\n  ${info.buttons.join('\n  ')}`)
}

try {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('5000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('25000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await page.waitForTimeout(1500)

  const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/app', '/wallet', '/history', '/budget', '/bills']
  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await describe(route)
  }
} catch (error) {
  log(`GAGAL: ${String(error).slice(0, 600)}`)
} finally {
  await context.close()
  await browser.close()
  await deleteUserByEmail(USER.email)
}
