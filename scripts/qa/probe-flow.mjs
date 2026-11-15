/**
 * scripts/qa/probe-flow.mjs — buka menu-menu yang belum diketahui labelnya
 * (opsi dompet, form tambah dompet, drawer mobile, sheet pindah dana) lalu
 * cetak kontrol yang terlihat. Alat diagnosis, bukan penjaga.
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
const USER = { email: `qa.flow.${stamp}@catetind.test`, password: `Qa!${stamp}Fl3`, name: 'Flow' }
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

async function dump(label) {
  const info = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    const name = (el) =>
      (el.getAttribute('aria-label') || el.getAttribute('placeholder') || (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70) || el.tagName)
    return {
      buttons: [...document.querySelectorAll('button,[role="button"],a[href]')].filter(visible).map(name),
      inputs: [...document.querySelectorAll('input,textarea,select')].filter(visible).map((el) => `${name(el)} [${el.getAttribute('type') ?? el.tagName}]`),
      dialog: [...document.querySelectorAll('[role="dialog"],[role="menu"]')].filter(visible).map((el) => (el.innerText || '').trim().slice(0, 200)),
    }
  })
  log(`\n--- ${label} ---`)
  log(`INPUT: ${info.inputs.join(' | ')}`)
  log(`BUTTON: ${info.buttons.slice(-30).join(' | ')}`)
  log(`DIALOG: ${info.dialog.join(' || ')}`)
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
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await page.waitForTimeout(1200)

  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Opsi untuk BCA/ }).click()
  await page.waitForTimeout(500)
  await dump('menu opsi dompet')
  const closeAll = async () => page.keyboard.press('Escape').catch(() => {})
  await closeAll()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: /Tambah dompet lain/ }).click()
  await page.waitForTimeout(600)
  await dump('form tambah dompet')
  await closeAll()

  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
  await page.waitForTimeout(600)
  await dump('drawer navigasi')
  const transferButton = page.getByRole('button', { name: /Pindah Dana/ }).first()
  if (await transferButton.count()) {
    await transferButton.click()
    await page.waitForTimeout(800)
    await dump('sheet pindah dana')
    const stillOpen = await page.getByText(/Mau pindah berapa/).count()
    log(`  sheet masih terbuka setelah pilih entri drawer: ${stillOpen > 0}`)
    await closeAll()
  } else {
    log('  tombol Pindah Dana tidak ditemukan')
  }

  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const rowButtons = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map((el) => el.getAttribute('aria-label') || (el.innerText || '').trim()).filter(Boolean),
  )
  log(`\n--- history buttons ---\n${rowButtons.join(' | ')}`)
} catch (error) {
  log(`GAGAL: ${String(error).slice(0, 700)}`)
} finally {
  await context.close()
  await browser.close()
  await deleteUserByEmail(USER.email)
}
