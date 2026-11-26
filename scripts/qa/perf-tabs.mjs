/**
 * scripts/qa/perf-tabs.mjs — P6 · waktu buka Riwayat & Budget (qa:perf).
 *
 * Latar: pemilik produk melaporkan dua tab ini "ada delay beberapa detik".
 * Skrip ini menyiapkan akun uji berisi 620 baris ledger (2 halaman bacaan
 * server), memanaskan store sekali di Dashboard, lalu MENGUKUR waktu dari klik
 * menu sampai isi halaman benar-benar tampil.
 *
 * Angka yang dicetak bukan janji performa — ia bukti bahwa:
 *   · halaman tidak lagi menampilkan "0 catatan" palsu (kerangka dulu);
 *   · modal/sheet berat tidak ikut ter-mount saat halaman pertama kali dibuka;
 *   · isi datang dalam hitungan detik yang wajar di mesin uji ini.
 *
 * Pakai: node scripts/qa/perf-tabs.mjs [--base=http://localhost:3000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  createUser,
  grantTier,
  passwordSession,
  sessionCookieValue,
  deleteUserByEmail,
  chromiumPath,
  restService,
  record,
  results,
  log,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const stamp = Date.now().toString(36)
const USER = { email: `qa.perf.${stamp}@catetind.test`, password: `Qa!${stamp}Pf1`, name: 'Uji Performa' }

/** tanggal lokal mundur `days` hari */
function isoDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

const auth = await createUser(USER)
await grantTier(auth.id, 'waras')

const wallet = await restService('wallets', {
  method: 'POST',
  headers: { Prefer: 'return=minimal' },
  body: JSON.stringify([{ user_id: auth.id, id: 'qa-perf-bca', name: 'QA BCA' }]),
})
if (!wallet.ok) throw new Error(`seed wallet: ${wallet.status}`)

const rows = Array.from({ length: 620 }, (_, index) => ({
  user_id: auth.id,
  id: `qa-perf-${index}`,
  wallet_id: 'qa-perf-bca',
  type: index % 7 === 0 ? 'income' : 'expense',
  amount: 5_000 + index,
  date: isoDaysAgo(index % 60),
  note: `catatan uji ${index}`,
  category: index % 3 === 0 ? 'Makanan' : 'Transportasi',
  client_tx_id: `qa-perf-tx-${index}`,
  ai_generated: false,
  time_label: `0${index % 10}:15`,
  seq: 100_000 + index,
}))
const inserted = await restService('ledger_rows', {
  method: 'POST',
  headers: { Prefer: 'return=minimal' },
  body: JSON.stringify(rows),
})
if (!inserted.ok) throw new Error(`seed ledger: ${inserted.status}`)

const session = await passwordSession(USER)
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
})
await context.addCookies([
  { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
])
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 200)))

try {
  /* Panaskan store sekali: login → Dashboard → tunggu hidrasi wallet/ledger.
     Ini kondisi nyata setelah login, bukan halaman yang dibuka dari nol. */
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  record('boot', 'Dashboard terbuka tanpa error halaman', pageErrors.length === 0, pageErrors.join(' | '))

  /* ── Riwayat & Insight ────────────────────────────────────────────────── */
  const historyStart = Date.now()
  await page.locator('a[href="/history"]:visible').first().click()
  await page.getByText('Filter Global').first().waitFor({ state: 'visible', timeout: 20_000 })
  const historyMs = Date.now() - historyStart
  record('riwayat', 'isi Riwayat tampil (bukan kerangka) setelah navigasi', true, `${historyMs} ms`)
  record('riwayat', 'waktu buka < 8 detik (ambang kewajaran mesin uji)', historyMs < 8_000, `${historyMs} ms`)
  record(
    'riwayat',
    'modal/sheet berat tidak ter-mount saat halaman dibuka',
    (await page.getByRole('dialog').count()) === 0,
    `dialog=${await page.getByRole('dialog').count()}`,
  )

  /* tab Insight memakai perhitungan yang sengaja ditunda — pastikan tetap hidup */
  await page.getByRole('tab', { name: 'Insight' }).first().click()
  const insightVisible = await page
    .getByText('Insight AI')
    .first()
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false)
  record('riwayat', 'tab Insight masih menampilkan kartu insight', insightVisible)
  await page.getByRole('tab', { name: 'Riwayat' }).first().click()

  /* ── Budget & Target Nabung ───────────────────────────────────────────── */
  const budgetStart = Date.now()
  await page.locator('a[href="/budget"]:visible').first().click()
  await page.getByText('Jatah Hari Ini').first().waitFor({ state: 'visible', timeout: 20_000 })
  const budgetMs = Date.now() - budgetStart
  record('budget', 'isi Budget tampil (bukan kerangka) setelah navigasi', true, `${budgetMs} ms`)
  record('budget', 'waktu buka < 8 detik (ambang kewajaran mesin uji)', budgetMs < 8_000, `${budgetMs} ms`)
  record(
    'budget',
    'sheet berat tidak ter-mount saat halaman dibuka',
    (await page.getByRole('dialog').count()) === 0,
    `dialog=${await page.getByRole('dialog').count()}`,
  )

  /* sheet tambah budget dimuat saat diklik (bukan saat halaman dibuka) */
  await page.getByRole('button', { name: 'Tambah batas kategori' }).first().click()
  const sheetVisible = await page
    .getByRole('dialog')
    .first()
    .waitFor({ state: 'visible', timeout: 6_000 })
    .then(() => true)
    .catch(() => false)
  record('budget', 'sheet "Tambah batas kategori" terbuka saat diklik', sheetVisible)
  await page.keyboard.press('Escape')

  /* ── KERANGKA + MODAL DINAMIS (konteks BARU, jaringan ledger diperlambat) ──
     Dua hal yang tidak terlihat di pengukuran hangat:
       · saat cache perangkat kosong, halaman harus menampilkan kerangka dulu
         (bukan "0 catatan" palsu) lalu menggantinya dengan isi;
       · modal Rekap Mingguan dimuat dinamis — dipaksa muncul dengan tanggal
         Jumat supaya jalur mount-tertunda itu benar-benar dijalankan. */
  const coldContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  })
  await coldContext.addInitScript(() => {
    const RealDate = Date
    const fixed = new RealDate('2026-11-27T10:00:00+07:00').valueOf() // Jumat
    class FakeDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) super(fixed)
        else super(...args)
      }
      static now() {
        return fixed
      }
    }
    window.Date = FakeDate
  })
  await coldContext.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
  ])
  const coldPage = await coldContext.newPage()
  await coldPage.route('**/rest/v1/ledger_rows*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  await coldPage.goto(`${BASE}/history`, { waitUntil: 'domcontentloaded' })
  const skeletonVisible = await coldPage
    .locator('[data-catetind-skeleton]')
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false)
  record('riwayat', 'kerangka tampil saat data masih dimuat (cache kosong)', skeletonVisible)
  const skeletonGone = await coldPage
    .locator('[data-catetind-skeleton]')
    .first()
    .waitFor({ state: 'detached', timeout: 25_000 })
    .then(() => true)
    .catch(() => false)
  record('riwayat', 'kerangka diganti isi setelah data datang', skeletonGone)

  await coldPage.getByRole('button', { name: 'Recap mingguan siap' }).first().click()
  const recapVisible = await coldPage
    .getByRole('dialog', { name: 'Rekap mingguan' })
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false)
  record('riwayat', 'modal Rekap Mingguan (dimuat dinamis) terbuka', recapVisible)
  await coldPage.keyboard.press('Escape')
  await coldContext.close()

  await page.screenshot({ path: path.resolve('qa-shots', 'perf-budget.png'), fullPage: false })
  log(`\nWaktu: Riwayat ${historyMs} ms · Budget ${budgetMs} ms (akun 620 baris)`)
  record('error', 'tidak ada pageerror selama pengukuran', pageErrors.length === 0, pageErrors.join(' | '))
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
} finally {
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun + data uji terhapus', removed)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan perf-tabs: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-perf-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}
