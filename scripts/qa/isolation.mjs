/**
 * scripts/qa/isolation.mjs — P4 · isolasi ganti akun di SATU konteks browser.
 *
 * Skenario: Uji 1 mencatat data unik (transaksi, budget, dompet) → cookie
 * diganti ke Uji 2 (logout→login di konteks yang sama, localStorage TETAP
 * hidup) → buktikan 0 kebocoran di layar & tabel server → kembali ke Uji 1 dan
 * datanya utuh. Ditutup dengan pemindaian data dummy.
 *
 * Pakai: node scripts/qa/isolation.mjs
 */
import fs from 'node:fs'
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
const stamp = Date.now().toString(36)
const U1 = { email: `qa.iso.a.${stamp}@catetind.test`, password: `Qa!${stamp}Ia3`, name: 'Uji Satu' }
const U2 = { email: `qa.iso.b.${stamp}@catetind.test`, password: `Qa!${stamp}Ib3`, name: 'Uji Dua' }
const NOTE = `Rahasia satu ${stamp}`
const WALLET = `Dompet Rahasia ${stamp}`

const auth1 = await createUser(U1)
await grantTier(auth1.id, 'waras')
const s1 = await passwordSession(U1)
const auth2 = await createUser(U2)
await grantTier(auth2.id, 'waras')
const s2 = await passwordSession(U2)

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
})
const page = await context.newPage()
page.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 160)}`))
const wait = (ms) => page.waitForTimeout(ms)
const screen = () => page.locator('body').innerText()

async function use(session) {
  await context.clearCookies()
  await context.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
  ])
}

async function rows(token) {
  const res = await rest(token, 'ledger_rows?select=id,amount,type,note')
  return Array.isArray(res.data) ? res.data : []
}

try {
  /* ── UJI 1: data unik ─────────────────────────────────────────────────── */
  await use(s1)
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('4000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('123000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await wait(1500)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await wait(1200)

  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: /Tambah dompet lain/ }).click()
  await page.getByLabel('Nama akun').fill(WALLET)
  await page.getByLabel('Saldo sekarang').fill('777000')
  await page.getByRole('button', { name: /Simpan Dompet/ }).click()
  await wait(2200)

  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: 'Catat transaksi' }).first().click()
  await wait(700)
  const dlg = page.locator('[role="dialog"]:visible').last()
  await dlg.locator('input[aria-label="Nominal transaksi"]').fill('45000')
  await dlg.locator('button[aria-label="Pilih dompet transaksi"]').click()
  await wait(500)
  const pick = page.getByRole('button', { name: WALLET, exact: true }).last()
  if (await pick.count()) await pick.click()
  await wait(400)
  await dlg.locator('button[aria-label="Kategori"]').click()
  await wait(500)
  await page.locator('button:visible', { hasText: 'Makanan' }).last().click()
  await wait(400)
  await dlg.locator('input[aria-label="Catatan transaksi (opsional)"]').fill(NOTE)
  await dlg.locator('button').filter({ hasText: /^Catat$/ }).last().click()
  await wait(2500)

  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: 'Tambah batas kategori' }).click()
  await wait(700)
  const budgetDlg = page.locator('[role="dialog"]:visible').last()
  await budgetDlg.getByRole('radio', { name: /Makanan/ }).click()
  await wait(400)
  await budgetDlg.locator('input[inputmode="numeric"]').first().fill('111000')
  await wait(300)
  await budgetDlg.getByRole('button', { name: /Simpan Budget/ }).click()
  await wait(2000)

  const u1Rows = await rows(s1.access_token)
  record('uji1', 'data Uji 1 benar-benar ada di server', u1Rows.some((r) => r.note === NOTE) && u1Rows.some((r) => Number(r.amount) === 123000), JSON.stringify(u1Rows.map((r) => r.note)))
  const u1Wallets = (await rest(s1.access_token, 'wallets?select=name')).data ?? []
  record('uji1', 'dompet unik Uji 1 ada di server', u1Wallets.some((w) => w.name === WALLET))
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(1000)
  record('uji1', 'layar Uji 1 memuat catatan unik', (await screen()).includes(NOTE))
  const localKeysU1 = await page.evaluate(() => Object.keys(localStorage).sort())


  /* ── UJI 2: akun lain di konteks yang SAMA ────────────────────────────── */
  await use(s2)
  const leaks = []
  for (const route of ['/app', '/history', '/wallet', '/budget', '/settings/profile', '/joint', '/referral']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await wait(1100)
    const text = await screen()
    if (text.includes(NOTE)) leaks.push(`${route}: catatan`)
    if (text.includes(WALLET)) leaks.push(`${route}: dompet`)
    if (/111\.000/.test(text)) leaks.push(`${route}: budget`)
    if (text.includes('Uji Satu')) leaks.push(`${route}: nama`)
  }
  record('uji2', '0 kebocoran data Uji 1 di layar Uji 2', leaks.length === 0, leaks.join(' | ') || 'bersih')
  const u2Rows = await rows(s2.access_token)
  const u2Wallets = (await rest(s2.access_token, 'wallets?select=name')).data ?? []
  record('uji2', 'tabel server Uji 2 kosong dari data Uji 1', u2Rows.every((r) => r.note !== NOTE) && !u2Wallets.some((w) => w.name === WALLET), `${u2Rows.length} baris · ${u2Wallets.length} dompet`)
  const localKeysU2 = await page.evaluate(() => Object.keys(localStorage).sort())
  const u2BudgetKey = `catet-ind-budgets#${s2.user.id}`
  const u2BudgetValue = await page.evaluate((key) => localStorage.getItem(key), u2BudgetKey)
  record(
    'uji2',
    'budget yang DIBACA Uji 2 bukan milik Uji 1',
    !String(u2BudgetValue ?? '').includes('111000'),
    String(u2BudgetValue ?? 'tidak ada kunci').slice(0, 80),
  )
  record('uji2', 'kunci localStorage Uji 2 memakai id akun Uji 2', localKeysU2.some((key) => key.includes(s2.user.id)), `${localKeysU2.length} kunci`)

  /* ── KEMBALI KE UJI 1 ─────────────────────────────────────────────────── */
  await use(s1)
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(1400)
  record('uji1', 'data Uji 1 utuh saat kembali', (await screen()).includes(NOTE))
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(1000)
  record('uji1', 'budget Uji 1 utuh saat kembali', /111\.000/.test(await screen()))

  /* ── BEBAS DATA DUMMY ─────────────────────────────────────────────────── */
  const dummy = ['Jon & Dany', 'Budi Santoso', 'RINA-X7K', 'Siska Ayu', 'Reza Pratama']
  const hits = []
  for (const route of ['/app', '/history', '/wallet', '/budget', '/bills', '/wealth', '/joint', '/referral', '/settings/billing']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await wait(900)
    const text = await screen()
    for (const name of dummy) if (text.includes(name)) hits.push(`${route}: ${name}`)
    if (/^(Halo|Hai|Selamat (pagi|siang|sore|malam)),? Kamu\b/m.test(text)) hits.push(`${route}: sapaan literal "Kamu"`)
  }
  record('dummy', '0 nama/angka contoh di 9 rute', hits.length === 0, hits.slice(0, 4).join(' | ') || 'bersih')
  await page.goto(`${BASE}/settings/billing`, { waitUntil: 'networkidle' })
  await wait(900)
  record('dummy', 'Riwayat Pembayaran mulai dari keadaan kosong', /Belum ada|belum ada/i.test(await screen()))
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 400))
} finally {
  await context.close()
  await browser.close()
  const r1 = await deleteUserByEmail(U1.email)
  const r2 = await deleteUserByEmail(U2.email)
  record('bersih-bersih', 'dua akun uji terhapus', r1 && r2)
}

const failed = results.filter((r) => !r.ok)
log(`\nRingkasan isolation: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-isolation-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const f of failed) log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`)
  process.exit(1)
}

