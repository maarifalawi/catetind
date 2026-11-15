/**
 * scripts/qa/admin-flow.mjs — P5.5 · Founder Command Center (qa:admin).
 *
 *   · Login SESI PEMILIK secara programatik lewat Admin API
 *     (`generateLink({ type: 'magiclink', email: shiimaify@gmail.com })` → verify),
 *     HANYA untuk membaca/menguji /admin. Tidak ada data keuangan pemilik yang
 *     ditulis.
 *   · 4 tab /admin (Ringkasan · User · Langganan · Pembayaran) terbuka.
 *   · Dry Run cron: POST /api/admin/push-cron { dryRun: true } sukses & tercatat.
 *   · Aksi founder pada akun uji @catetind.test (set paket Waras lifetime) →
 *     efeknya langsung aktif di jendela browser akun uji tersebut.
 *
 * Pakai: node scripts/qa/admin-flow.mjs [--base=http://localhost:3000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  createUser,
  passwordSession,
  sessionCookieValue,
  sessionFromMagicLink,
  deleteUserByEmail,
  chromiumPath,
  restService,
  record,
  results,
  log,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })
const OWNER_EMAIL = 'shiimaify@gmail.com'
const stamp = Date.now().toString(36)
const TEST = { email: `qa.admin.target.${stamp}@catetind.test`, password: `Qa!${stamp}Ad1`, name: 'Target Founder' }

const targetAuth = await createUser(TEST)
const targetSession = await passwordSession(TEST)
const ownerSession = await sessionFromMagicLink(OWNER_EMAIL)

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const makeWindow = async (session, viewport) => {
  const context = await browser.newContext({ viewport, locale: 'id-ID', timezoneId: 'Asia/Jakarta' })
  await context.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
  ])
  const page = await context.newPage()
  page.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 160)}`))
  return { context, page }
}
const admin = await makeWindow(ownerSession, { width: 1280, height: 800 })
const target = await makeWindow(targetSession, { width: 390, height: 844 })
const wait = (page, ms) => page.waitForTimeout(ms)
const screen = (page) => page.locator('body').innerText()

try {
  record('login', 'sesi pemilik dibuat lewat generateLink magiclink', Boolean(ownerSession?.access_token) && ownerSession?.user?.email === OWNER_EMAIL, ownerSession?.user?.email)

  await admin.page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  await wait(admin.page, 2000)
  record('tab', 'halaman /admin terbuka untuk pemilik', admin.page.url().includes('/admin') && !(await screen(admin.page)).includes('Akses ditolak'), admin.page.url())

  /* ══ 4 TAB ═══════════════════════════════════════════════════════════════ */
  for (const label of ['Ringkasan', 'User', 'Langganan', 'Pembayaran']) {
    const tab = admin.page.getByRole('button', { name: new RegExp(`^${label}\\b`) }).first()
    await tab.scrollIntoViewIfNeeded().catch(() => {})
    await tab.click()
    await wait(admin.page, 900)
    record('tab', `tab ${label} aktif`, (await tab.getAttribute('aria-pressed')) === 'true')
    if (label === 'User') {
      record('tab', 'tab User menampilkan pencarian user', (await admin.page.getByPlaceholder('Cari nama atau email…').count()) > 0)
    }
  }
  await admin.page.getByRole('button', { name: /^Pembayaran\b/ }).first().click()
  await wait(admin.page, 800)
  record('tab', 'tab Pembayaran menampilkan tabel pembayaran', /Pembayaran|order|Status/i.test(await screen(admin.page)))

  /* ══ DRY RUN CRON ════════════════════════════════════════════════════════ */
  await admin.page.getByRole('button', { name: /^Ringkasan\b/ }).first().click()
  await wait(admin.page, 800)
  const dryResponse = admin.page.waitForResponse(
    (res) => res.url().includes('/api/admin/push-cron') && res.request().method() === 'POST',
    { timeout: 60_000 },
  )
  await admin.page.getByRole('button', { name: 'Mode simulasi', exact: true }).first().click()
  const dryRes = await dryResponse.catch(() => null)
  const dryBody = dryRes ? await dryRes.json().catch(() => null) : null
  record(
    'cron',
    'Dry Run cron sukses tanpa mengirim push',
    Boolean(dryRes?.ok()) && dryBody?.ok === true && (dryBody?.report?.dryRun === true || dryBody?.dryRun === true),
    dryBody ? `${dryRes.status()} · ${JSON.stringify(dryBody.report ?? dryBody).slice(0, 220)}` : 'tanpa respons',
  )
  await wait(admin.page, 1200)
  record('cron', 'UI menandai eksekusi sebagai simulasi', /simulasi/i.test(await screen(admin.page)))

  /* ══ AKSI FOUNDER → AKUN UJI ═════════════════════════════════════════════ */
  await admin.page.getByRole('button', { name: /^User\b/ }).first().click()
  await wait(admin.page, 800)
  await admin.page.getByPlaceholder('Cari nama atau email…').fill(TEST.email)
  await wait(admin.page, 800)
  await admin.page.getByRole('button', { name: 'Kelola', exact: true }).first().click()
  await wait(admin.page, 900)
  record('founder', 'panel founder untuk akun uji terbuka', (await admin.page.getByText(`Kelola ${TEST.name}`).count()) > 0)

  const selects = admin.page.locator('select')
  await selects.nth(0).selectOption('waras')
  await selects.nth(1).selectOption('lifetime')
  await wait(admin.page, 400)
  await admin.page.getByRole('button', { name: 'Simpan paket', exact: true }).first().click()
  await wait(admin.page, 3200)

  const subs = (
    await restService(`user_subscriptions?select=user_id,tier_name,is_lifetime,is_active&user_id=eq.${targetAuth.id}`)
  ).data
  const sub = Array.isArray(subs) ? subs[0] : null
  record(
    'founder',
    'server: akun uji kini Paket Waras lifetime & aktif',
    sub?.tier_name === 'waras' && sub?.is_lifetime === true && sub?.is_active === true,
    JSON.stringify(sub ?? null),
  )

  /* bukti di jendela browser AKUN UJI: akses /app tidak lagi dilempar ke /checkout */
  await target.page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(target.page, 2000)
  record('founder', 'akun uji langsung bisa membuka /app (bukan /checkout)', target.page.url().includes('/app') && !target.page.url().includes('/checkout'), target.page.url())
  /* paket aktif membuka onboarding (sebelumnya akun Gratis dilempar ke /checkout) */
  if (target.page.url().includes('/app/onboarding')) {
    await target.page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
    await target.page.getByRole('button', { name: /^Lanjut/ }).click()
    await target.page.locator('button[aria-pressed]').first().click()
    await target.page.getByLabel(/^Saldo /).fill('1000000')
    await target.page.getByRole('button', { name: /^Lanjut/ }).click()
    await target.page.getByRole('button', { name: 'Lewati dulu, catat nanti' }).click()
    await target.page.waitForURL('**/app', { timeout: 30_000 })
    await wait(target.page, 1200)
  }
  await target.page.goto(`${BASE}/settings/billing`, { waitUntil: 'networkidle' })
  await wait(target.page, 1800)
  record('founder', 'layar akun uji menyebut paket Waras', /Waras/i.test(await screen(target.page)), (await screen(target.page)).replace(/\s+/g, ' ').slice(0, 160))
  await target.page.screenshot({ path: path.join(SHOTS, 'admin-target-waras.png'), fullPage: true })
  await admin.page.screenshot({ path: path.join(SHOTS, 'admin-founder.png'), fullPage: true })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
  await admin.page.screenshot({ path: path.join(SHOTS, 'admin-failure.png'), fullPage: true }).catch(() => {})
} finally {
  await admin.context.close()
  await target.context.close()
  await browser.close()
  const removed = await deleteUserByEmail(TEST.email)
  record('bersih-bersih', 'akun uji target founder terhapus', removed)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan admin-flow: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-admin-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}
