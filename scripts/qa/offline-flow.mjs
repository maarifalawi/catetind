/**
 * scripts/qa/offline-flow.mjs — sinyal putus-nyambung (Bagian 7.3) + lonceng.
 *
 *   1. catat 1 transaksi saat browser OFFLINE → spanduk offline tampil, tombol
 *      tutupnya utuh di dalam layar 390px, dan server TIDAK menerima baris;
 *   2. kembali ONLINE → antrean terkirim otomatis tanpa muat ulang, TEPAT satu
 *      baris (tidak dobel), spanduk antrean hilang sendiri;
 *   3. lonceng: item nyata muncul → "Tandai semua dibaca" → "Bersihkan".
 *
 * Pakai: node scripts/qa/offline-flow.mjs [--base=http://localhost:3000]
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
  rest,
  record,
  results,
  log,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
/* WATCHDOG: skrip uji tidak boleh menggantung tanpa batas. Kalau lewat 150 detik,
   proses keluar dengan kode 3 — log yang sudah tertulis jadi bukti fase terakhir. */
const watchdog = setTimeout(() => {
  console.error('WATCHDOG: skrip melewati 150 detik — keluar paksa')
  process.exit(3)
}, 150_000)
watchdog.unref?.()
log('boot: harness siap')
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })
const stamp = Date.now().toString(36)
const USER = { email: `qa.offline.${stamp}@catetind.test`, password: `Qa!${stamp}Of3`, name: 'Uji Offline' }
const NOTE = `Offline ${stamp}`

const auth = await createUser(USER)
log('boot: user uji dibuat')
await grantTier(auth.id, 'waras')
log('boot: paket waras aktif')
const session = await passwordSession(USER)
log('boot: sesi login siap')
const token = session.access_token
const rows = async () => {
  const res = await rest(token, 'ledger_rows?select=id,amount,type,note,client_tx_id')
  return Array.isArray(res.data) ? res.data : []
}

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
log('boot: browser terbuka')
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
})
await context.addCookies([
  { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
])
log('boot: cookie sesi disuntik')
const page = await context.newPage()
log('boot: page siap')
page.setDefaultTimeout(15_000)
const wait = (ms) => page.waitForTimeout(ms)
const screen = () => page.locator('body').innerText()


async function markSheet() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-qa-active]').forEach((el) => el.removeAttribute('data-qa-active'))
    const inView = [...document.querySelectorAll('[role="dialog"]')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.height > 120 && r.top >= -4 && r.top < window.innerHeight * 0.7
    })
    const target = inView.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]
    if (target) target.setAttribute('data-qa-active', '1')
  })
  return page.locator('[data-qa-active="1"]')
}

async function openSheet() {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await wait(200)
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const open = await page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"]')].some((el) => {
        const r = el.getBoundingClientRect()
        return (
          el.querySelector('input[aria-label="Nominal transaksi"]') &&
          r.top >= -4 &&
          r.top < window.innerHeight * 0.7
        )
      }),
    )
    if (open) return true
    await page.getByRole('button', { name: 'Catat transaksi' }).first().click()
    await wait(600)
  }
  return false
}

async function addExpense(amount, note) {
  const open = await openSheet()
  if (!open) throw new Error('sheet catat tidak terbuka')
  const dlg = await markSheet()
  await dlg.locator('input[aria-label="Nominal transaksi"]').fill(String(amount))
  await dlg.locator('button[aria-label="Kategori"]').click()
  await wait(500)
  const search = page.locator('input[placeholder="Cari kategori…"]:visible').first()
  if (await search.count()) {
    await search.fill('Makanan')
    await wait(400)
  }
  await page.locator('button:visible', { hasText: 'Makanan' }).last().click()
  await wait(400)
  await dlg.locator('input[aria-label="Catatan transaksi (opsional)"]').fill(note)
  await dlg.locator('button').filter({ hasText: /^Catat$/ }).last().click()
  await wait(1500)
}

try {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'domcontentloaded' })
  log('boot: onboarding terbuka')
  await wait(1800)
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('5000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('25000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await wait(1500)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await wait(1500)
  record('setup', 'transaksi pertama tercatat di server', (await rows()).length === 1)

  /* ── OFFLINE ──────────────────────────────────────────────────────────── */
  log('  fase: offline')
  await context.setOffline(true)
  await wait(400)
  await addExpense(40000, NOTE)
  log('  fase: offline — transaksi dibuat')
  record('offline', 'spanduk offline tampil', /Offline, catatanmu aman|catatan nunggu/i.test(await screen()))
  const dismiss = page.getByRole('button', { name: /Tutup/ }).first()
  const dismissBox = (await dismiss.count()) ? await dismiss.boundingBox() : null
  record(
    'offline',
    'tombol tutup spanduk utuh di dalam layar 390px',
    Boolean(dismissBox && dismissBox.x + dismissBox.width <= 390 && dismissBox.x >= 0),
    JSON.stringify(dismissBox),
  )
  await page.screenshot({ path: path.join(SHOTS, 'offline-banner.png') })
  record('offline', 'baris TIDAK (belum) sampai ke server', (await rows()).filter((r) => r.note === NOTE).length === 0)

  /* ── ONLINE: sembuh otomatis ──────────────────────────────────────────── */
  log('  fase: online')
  await context.setOffline(false)
  let synced = 0
  for (let i = 0; i < 10; i += 1) {
    await wait(1000)
    synced = (await rows()).filter((r) => r.note === NOTE).length
    if (synced > 0) break
  }
  record('online', 'antrean terkirim otomatis tanpa muat ulang', synced === 1, `${synced} baris`)
  await wait(1200)
  record('online', 'tidak ada baris DOBEL', (await rows()).filter((r) => r.note === NOTE).length === 1)
  record('online', 'spanduk antrean hilang sendiri', !/catatan nunggu|belum diproses/i.test(await screen()))
  await page.screenshot({ path: path.join(SHOTS, 'online-recovered.png') })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await wait(1200)
  record('online', 'bertahan setelah refresh penuh', (await screen()).includes(NOTE))

  /* ── LONCENG NOTIFIKASI ───────────────────────────────────────────────── */
  log('  fase: lonceng')
  await page.getByRole('button', { name: 'Notifikasi' }).first().click()
  await wait(600)
  record('lonceng', 'notifikasi nyata dari transaksi muncul', /Pengeluaran tercatat|Tagihan|Setoran|Pemasukan tercatat/i.test(await screen()))
  /* LAPIS 2: baris nyata di tabel `notifications` server (bukan hanya cache
     perangkat). Ini bukti lonceng tersinkron lintas perangkat. */
  const serverNotifs = await rest(token, 'notifications?select=id,title,is_read&order=created_at.desc&limit=5')
  record(
    'lonceng',
    'notifikasi tersimpan di tabel server',
    Array.isArray(serverNotifs.data) && serverNotifs.data.length > 0,
    `HTTP ${serverNotifs.status} · ${Array.isArray(serverNotifs.data) ? serverNotifs.data.length : '?'} baris`,
  )
  const markAll = page.getByRole('button', { name: 'Tandai semua dibaca' })
  if (await markAll.count()) {
    await markAll.first().click()
    await wait(500)
    record(
      'lonceng',
      'Tandai semua dibaca menghapus lencana angka',
      (await page.getByRole('button', { name: /^\d+ belum dibaca$/ }).count()) === 0,
    )
  } else {
    record('lonceng', 'tombol Tandai semua dibaca tersedia', false)
  }
  const clear = page.getByRole('button', { name: 'Bersihkan notifikasi' })
  if (await clear.count()) {
    await clear.first().click()
    await wait(500)
    record('lonceng', 'Bersihkan mengosongkan panel', /Belum ada notifikasi/.test(await screen()))
  } else {
    record('lonceng', 'tombol Bersihkan tersedia', false)
  }
  await page.screenshot({ path: path.join(SHOTS, 'notification-bell.png') })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 400))
  await page.screenshot({ path: path.join(SHOTS, 'offline-failure.png') }).catch(() => {})
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji offline terhapus', removed)
}

const failed = results.filter((r) => !r.ok)
log(`\nRingkasan offline & lonceng: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-offline-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const f of failed) log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`)
  process.exit(1)
}

