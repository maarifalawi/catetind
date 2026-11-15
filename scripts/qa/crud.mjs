/**
 * scripts/qa/crud.mjs — bukti tiga lapis (layar · tabel server · tahan refresh)
 * untuk dua alur tulis paling dasar: transaksi pertama saat onboarding, lalu
 * tambah dompet dari halaman Dompet.
 *
 * Pakai: node scripts/qa/crud.mjs [--base=http://localhost:3000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  record,
  results,
  log,
  createUser,
  grantTier,
  passwordSession,
  sessionCookieValue,
  deleteUserByEmail,
  chromiumPath,
  rest,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })

const stamp = Date.now().toString(36)
const USER = { email: `qa.crud.${stamp}@catetind.test`, password: `Qa!${stamp}Cc3`, name: 'Kakak Uji' }
const WALLET_NAME = `Dompet Uji ${stamp}`

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
/* Jejak jaringan: bukti bahwa kiriman baris BENAR-BENAR berangkat (atau
   menerima kode yang menjelaskan kenapa tidak). Tanpa ini, kegagalan antrean
   terlihat sama dengan "tidak ada request sama sekali". */
page.on('request', (req) => {
  const url = req.url()
  if (!/ledger_rows|wallets/.test(url)) return
  if (req.method() === 'GET' || req.method() === 'HEAD') return
  log(`  → ${req.method()} ${url.replace('https://wmswtoyikvgzcvbgdceo.supabase.co', 'SB')}`)
})
page.on('response', (res) => {
  const url = res.url()
  if (!/ledger_rows|wallets/.test(url)) return
  if (res.request().method() === 'GET' || res.request().method() === 'HEAD') return
  log(`  ← ${res.status()} ${url.replace('https://wmswtoyikvgzcvbgdceo.supabase.co', 'SB')}`)
})
try {
  /* ── A. ONBOARDING + TRANSAKSI PERTAMA (bukan dilewati) ─────────────────── */
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('2000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('125000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await page.waitForTimeout(1500)

  const ledger = await rest(session.access_token, 'ledger_rows?select=id,amount,wallet_id,type,client_tx_id')
  let rows = Array.isArray(ledger.data) ? ledger.data : []
  record('transaksi', 'tepat SATU baris ledger di server', rows.length === 1, `${rows.length} baris`)
  if (rows.length === 0) {
    /* beri kesempatan antrean kirim (outbox) menyelesaikan pekerjaannya */
    for (let attempt = 0; attempt < 8 && rows.length === 0; attempt += 1) {
      await page.waitForTimeout(2000)
      const retry = await rest(session.access_token, 'ledger_rows?select=id,amount,wallet_id,type,client_tx_id')
      rows = Array.isArray(retry.data) ? retry.data : []
    }
    record('transaksi', 'baris muncul setelah antrean kirim', rows.length === 1, `${rows.length} baris (≤16s)`)
  }
  record(
    'transaksi',
    'dompet induk tersimpan lebih dulu (wallet_id terisi)',
    Boolean(rows[0]?.wallet_id),
    JSON.stringify(rows[0] ?? null),
  )
  record('transaksi', 'nominal 125000 tersimpan', Number(rows[0]?.amount) === 125000, String(rows[0]?.amount))

  const bodyDashboard = await page.locator('body').innerText()
  record('transaksi', 'nominal tampil di Dashboard', /125[.,]?000/.test(bodyDashboard))
  record('transaksi', 'tanpa spanduk "catatan menunggu"', !bodyDashboard.includes('menunggu'))
  await page.screenshot({ path: path.join(SHOTS, 'crud-transaction.png') })

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  record('transaksi', 'bertahan setelah refresh penuh', /125[.,]?000/.test(await page.locator('body').innerText()))

  /* ── B. TAMBAH DOMPET ──────────────────────────────────────────────────── */
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Tambah dompet lain, buka form Tambah Dompet' }).click()
  await page.getByLabel('Nama akun').fill(WALLET_NAME)
  await page.getByRole('button', { name: /Simpan Dompet/ }).click()
  await page.waitForTimeout(2500)

  record('dompet', 'nama dompet tampil di layar', (await page.locator('body').innerText()).includes(WALLET_NAME))
  const walletsDb = await rest(session.access_token, 'wallets?select=id,name')
  const walletRow = Array.isArray(walletsDb.data) ? walletsDb.data.find((row) => row.name === WALLET_NAME) : null
  record(
    'dompet',
    'baris wallets tertulis di server',
    Boolean(walletRow),
    JSON.stringify(walletsDb.data ?? walletsDb.status),
  )

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  record('dompet', 'dompet bertahan setelah refresh', (await page.locator('body').innerText()).includes(WALLET_NAME))
  await page.screenshot({ path: path.join(SHOTS, 'crud-wallet.png') })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 300))
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji CRUD terhapus', removed)
}

const failed = results.filter((r) => !r.ok)
log(`\nRingkasan CRUD: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-crud-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const f of failed) log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`)
  process.exit(1)
}

page.on('pageerror', (error) => log(`  ⚠ pageerror: ${String(error).slice(0, 160)}`))
page.on('response', async (res) => {
  if (!res.url().includes('/api/')) return
  if (res.status() < 400) return
  const body = await res.text().catch(() => '')
  log(`  ⚠ ${res.status()} ${res.url()} :: ${body.slice(0, 220)}`)
})
