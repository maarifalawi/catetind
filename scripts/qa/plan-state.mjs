/**
 * scripts/qa/plan-state.mjs — P6 · keadaan paket di checkout (qa:plan).
 *
 * Mengunci bug yang dilaporkan pemilik produk: "user mau mesen, tab webnya
 * bolak-balik doang, nggak masuk ke payment gate."
 *
 * Yang diuji (dengan akun uji sungguhan + cookie sesi nyata):
 *   1. akun yang SUDAH punya paket melihat keadaan "Ini paketmu sekarang.", dan
 *      CTA-nya menuju Dashboard — bukan "Daftar & mulai";
 *   2. membuka `/checkout/bayar?plan=<paket yang dimiliki>` TETAP di halaman itu
 *      (tidak redirect balik ke `/checkout`, tidak ada navigasi berulang);
 *   3. akun tier lebih rendah melihat SELISIH upgrade (Rp30.000) dan tetap bisa
 *      sampai ke tombol "Bayar sekarang".
 *
 * Pakai: node scripts/qa/plan-state.mjs [--base=http://localhost:3000]
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
  record,
  results,
  log,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })
const stamp = Date.now().toString(36)

const OWNED_WARAS = { email: `qa.plan.waras.${stamp}@catetind.test`, password: `Qa!${stamp}Pw1`, name: 'Uji Punya Waras' }
const OWNED_LOWER = { email: `qa.plan.aja.${stamp}@catetind.test`, password: `Qa!${stamp}Pa2`, name: 'Uji Punya Catet Aja' }
const users = []

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })

async function signIn(user, tier) {
  const auth = await createUser(user)
  users.push(user.email)
  await grantTier(auth.id, tier)
  const session = await passwordSession(user)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  })
  await context.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
  ])
  return context
}

/** selisih lebar dokumen vs viewport — > 0 berarti ada gulir horizontal */
async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

try {
  /* ── 1 · AKUN YANG SUDAH PUNYA WARAS ───────────────────────────────────── */
  const warasContext = await signIn(OWNED_WARAS, 'waras')
  const warasPage = await warasContext.newPage()
  warasPage.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 160)}`))

  await warasPage.goto(`${BASE}/checkout?plan=waras&period=lifetime`, { waitUntil: 'networkidle' })
  await warasPage.waitForTimeout(800)
  record('layout', 'checkout (paket dimiliki) tanpa gulir horizontal', (await horizontalOverflow(warasPage)) <= 0)
  let body = await warasPage.locator('body').innerText()
  record('checkout', 'paket yang dimiliki ditandai "Ini paketmu sekarang."', body.includes('Ini paketmu sekarang.'), body.slice(0, 180))
  record(
    'checkout',
    'CTA memakai "Buka dashboard", bukan "Daftar & mulai"',
    (await warasPage.getByRole('button', { name: 'Buka dashboard' }).count()) > 0 && !body.includes('Daftar & mulai'),
  )

  /* direct ke halaman bayar untuk paket yang sama: harus RENDER, bukan redirect */
  let mainNavigations = 0
  warasPage.on('framenavigated', (frame) => {
    if (frame === warasPage.mainFrame()) mainNavigations += 1
  })
  await warasPage.goto(`${BASE}/checkout/bayar?plan=waras&period=lifetime`, { waitUntil: 'networkidle' })
  await warasPage.waitForTimeout(1600)
  record('layout', 'halaman bayar (paket dimiliki) tanpa gulir horizontal', (await horizontalOverflow(warasPage)) <= 0)
  body = await warasPage.locator('body').innerText()
  record('bayar', 'halaman bayar TETAP di /checkout/bayar (tanpa ping-pong)', warasPage.url().includes('/checkout/bayar'), warasPage.url())
  record('bayar', 'redirect loop tidak terjadi', mainNavigations <= 2, `framenavigated=${mainNavigations}`)
  record(
    'bayar',
    'keadaan "Paket ini sudah kamu miliki" tampil + CTA dashboard',
    body.includes('Paket ini sudah kamu miliki') &&
      (await warasPage.getByRole('link', { name: 'Masuk ke dashboard' }).count()) > 0,
    body.slice(0, 200),
  )
  record('bayar', 'tidak ada tombol "Bayar sekarang" untuk paket yang sudah dimiliki', !body.includes('Bayar sekarang'))

  /* CTA "Lihat paket upgrade" harus membawa ke paket SATU TINGKAT DI ATASNYA
     (Waras → Sultan), bukan memilih paket yang sudah aktif. */
  await warasPage.getByRole('link', { name: 'Lihat paket upgrade' }).first().click()
  await warasPage.waitForURL(/\/checkout(\?|$)/, { timeout: 10_000 })
  await warasPage.waitForTimeout(700)
  body = await warasPage.locator('body').innerText()
  record(
    'checkout',
    '"Lihat paket upgrade" membawa ke selisih Sultan (Rp 170.000)',
    body.includes('Cukup tambah Rp 170.000 untuk upgrade.'),
    body.slice(0, 220),
  )
  await warasPage.screenshot({ path: path.join(SHOTS, 'plan-owned-waras.png'), fullPage: true })
  await warasContext.close()

  /* ── 2 · AKUN TIER LEBIH RENDAH (UPGRADE) ─────────────────────────────── */
  const lowerContext = await signIn(OWNED_LOWER, 'catet-aja')
  const lowerPage = await lowerContext.newPage()
  lowerPage.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 160)}`))

  await lowerPage.goto(`${BASE}/checkout?plan=waras&period=lifetime`, { waitUntil: 'networkidle' })
  await lowerPage.waitForTimeout(800)
  record('layout', 'checkout (upgrade) tanpa gulir horizontal', (await horizontalOverflow(lowerPage)) <= 0)
  body = await lowerPage.locator('body').innerText()
  record(
    'checkout',
    'upgrade menampilkan selisih Rp 30.000 (bukan harga penuh)',
    body.includes('Cukup tambah Rp 30.000 untuk upgrade.') && body.includes('Rp 30.000'),
    body.slice(0, 220),
  )
  record(
    'checkout',
    'CTA upgrade menyebut nominal selisih',
    (await lowerPage.getByRole('button', { name: 'Upgrade — bayar Rp 30.000' }).count()) > 0,
  )

  await lowerPage.goto(`${BASE}/checkout/bayar?plan=waras&period=lifetime`, { waitUntil: 'networkidle' })
  await lowerPage.waitForTimeout(1200)
  record('layout', 'halaman bayar (upgrade) tanpa gulir horizontal', (await horizontalOverflow(lowerPage)) <= 0)
  body = await lowerPage.locator('body').innerText()
  record('bayar', 'upgrade tetap sampai ke halaman bayar', lowerPage.url().includes('/checkout/bayar'), lowerPage.url())
  record(
    'bayar',
    'judul & nominal upgrade benar',
    body.includes('Bayar selisih upgrade-mu') && body.includes('Rp 30.000') && body.includes('Bayar sekarang'),
    body.slice(0, 220),
  )
  await lowerPage.screenshot({ path: path.join(SHOTS, 'plan-upgrade-catet-aja.png'), fullPage: true })
  await lowerContext.close()
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
} finally {
  await browser.close()
  let removedAll = true
  for (const email of users) removedAll = (await deleteUserByEmail(email)) && removedAll
  record('bersih-bersih', 'akun uji paket terhapus', removedAll)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan plan-state: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-plan-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}

