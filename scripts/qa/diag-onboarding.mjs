/**
 * scripts/qa/diag-onboarding.mjs — DIAGNOSA BUG-1 (transaksi pertama onboarding).
 * Mencatat console browser + setiap request/response yang gagal + isi tabel
 * `wallets`/`ledger_rows` dari waktu ke waktu.
 *
 * Pakai: node scripts/qa/diag-onboarding.mjs [--base=http://localhost:3000]
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
  rest,
  log,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const stamp = Date.now().toString(36)
const USER = { email: `qa.diag.${stamp}@catetind.test`, password: `Qa!${stamp}Dg3`, name: 'Diag' }

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
page.on('console', (msg) => log(`  console.${msg.type()}: ${msg.text().slice(0, 400)}`))
page.on('pageerror', (err) => log(`  pageerror: ${String(err).slice(0, 400)}`))
page.on('requestfailed', (req) => log(`  requestfailed ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`))
page.on('response', async (res) => {
  const url = res.url()
  if (!url.includes('supabase') && !url.includes('/api/')) return
  if (res.status() < 400) return
  const body = await res.text().catch(() => '')
  log(`  HTTP ${res.status()} ${res.request().method()} ${url.replace(BASE, '')} :: ${body.slice(0, 300)}`)
})

try {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('2000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('125000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await page.waitForTimeout(3500)

  const dump = async (label) => {
    const wallets = await rest(session.access_token, 'wallets?select=id,name,opening')
    const rows = await rest(session.access_token, 'ledger_rows?select=id,amount,wallet_id,client_tx_id,type')
    log(`  [${label}] wallets=${JSON.stringify(wallets.data)} rows=${JSON.stringify(rows.data)}`)
  }
  await dump('setelah Catat Pertama')

  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await page.waitForTimeout(2000)
  await dump('setelah Dashboard')

  for (let i = 0; i < 6; i += 1) {
    await page.waitForTimeout(2000)
    await dump(`t+${(i + 1) * 2}s`)
  }

  const banner = await page.locator('body').innerText()
  log(`  spanduk menunggu: ${/menunggu/i.test(banner) ? 'ADA' : 'tidak ada'}`)
  const local = await page.evaluate(() => ({
    localKeys: Object.keys(localStorage).filter((k) => k.includes('catet-ind')),
    idb: typeof indexedDB !== 'undefined',
  }))
  log(`  localStorage: ${JSON.stringify(local)}`)
} catch (error) {
  log(`  GAGAL: ${String(error).slice(0, 500)}`)
} finally {
  await context.close()
  await browser.close()
  log(`  hapus akun uji: ${await deleteUserByEmail(USER.email)}`)
}
