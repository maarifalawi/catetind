/**
 * scripts/qa/navigation.mjs — uji navigasi & integritas tautan (paket 108).
 *
 * Latar belakang: pemisahan cangkang app ke `app/(app)` memindahkan belasan
 * folder rute. Yang paling mudah rusak akibat pemindahan itu BUKAN kompilasi,
 * melainkan tautan: href ke rute yang sudah tidak ada, redirect middleware yang
 * salah tujuan, dan halaman app yang tiba-tiba kosong karena provider-nya
 * tertinggal di layout yang salah.
 *
 * Yang diperiksa:
 *   1. Setiap tautan internal pada halaman publik (landing, login, kontak,
 *      bantuan, changelog, legal, welcome, checkout, daftar, 404) dijawab
 *      < 400 — tidak ada rute mati.
 *   2. Alur nyata tanpa sesi: landing → "Pilih Paket" → /checkout, landing →
 *      Masuk → /login, dan rute app tanpa sesi dialihkan ke /login?next=…
 *   3. Halaman depan anonim: 0 permintaan /api/session & /api/data (tidak ada
 *      401 di jaringan) — bukti cangkang app tidak lagi ikut.
 *   4. Dengan sesi berbayar: Dashboard, Dompet, Tagihan, Dompet Bersama,
 *      Pengaturan, dan Admin terbuka + memakai cangkang app.
 *
 * Pakai: node scripts/qa/navigation.mjs [--base=http://localhost:3000]
 */
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  chromiumPath,
  createUser,
  deleteUserByEmail,
  grantTier,
  log,
  passwordSession,
  record,
  results,
  sessionCookieValue,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000')
  .slice(7)

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/contact',
  '/bantuan',
  '/changelog',
  '/privacy',
  '/terms',
  '/security',
  '/welcome',
  '/checkout',
  '/registered',
]

/* halaman app yang wajib terbuka untuk akun berbayar */
const APP_PAGES = ['/app', '/wallet', '/bills', '/joint', '/settings', '/admin']

const stamp = Date.now().toString(36)
const USER = {
  email: `qa.nav.${stamp}@catetind.test`,
  password: `Qa!${stamp}Nn4`,
  name: 'Kakak Navigasi',
}

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })

try {
  /* ── 1. Tautan di halaman publik ─────────────────────────────────────────── */
  const anon = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'id-ID' })
  const page = await anon.newPage()

  const internal = new Set()
  for (const route of PUBLIC_PAGES) {
    const response = await page.goto(`${BASE}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const status = response?.status() ?? 0
    record('publik', `${route} dijawab`, status < 400, `status ${status}`)

    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href') ?? '')
        .filter((href) => href.startsWith('/') && !href.startsWith('//')),
    )
    for (const href of hrefs) internal.add(href.split('#')[0] || '/')
  }

  /* URL tak dikenal untuk pengunjung ANONIM: gerbang sesi middleware
     mengarahkan ke /login?next=… (bukan 404). Halaman 404 asli diuji di bagian
     sesi, karena hanya pengguna bersesi yang melihatnya (paket 108). */
  await page.goto(`${BASE}/halaman-yang-tidak-ada`, { waitUntil: 'domcontentloaded' })
  const unknown = new URL(page.url())
  record(
    'gerbang sesi',
    'URL tak dikenal anonim → /login',
    unknown.pathname === '/login' && unknown.searchParams.get('next') === '/halaman-yang-tidak-ada',
    page.url(),
  )

  /* halaman depan anonim tidak boleh memanggil sesi/data */
  const landingNetwork = []
  page.on('response', (response) => {
    const url = response.url()
    if (url.includes('/api/')) landingNetwork.push({ url: url.replace(BASE, ''), status: response.status() })
  })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(1200)
  const forbiddenCalls = landingNetwork.filter((entry) =>
    /\/(api\/session|api\/data|api\/onboarding)/.test(entry.url),
  )
  record(
    'landing anonim',
    '0 panggilan /api/session · /api/data',
    forbiddenCalls.length === 0,
    forbiddenCalls.map((entry) => `${entry.status} ${entry.url}`).join(' | '),
  )

  /* ── 2. Tautan internal dijawab < 400 ────────────────────────────────────── */
  const broken = []
  for (const href of [...internal].sort()) {
    /* tautan yang butuh sesi menjawab 307 ke /login — itu BUKAN rusak */
    const response = await page.request.get(`${BASE}${href}`, { maxRedirects: 0 })
    if (response.status() >= 400) broken.push(`${response.status()} ${href}`)
  }
  record(
    'tautan',
    `${internal.size} tautan internal hidup`,
    broken.length === 0,
    broken.slice(0, 8).join(' | '),
  )

  /* ── 3. Alur nyata tanpa sesi ────────────────────────────────────────────── */
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  /* CTA hero ("Cobain") sudah dihapus; pintu beli di landing adalah tombol
     navbar "Pilih Paket" yang menuju section harga. */
  await page.getByRole('link', { name: /^Pilih Paket/i }).first().click()
  await page.waitForTimeout(800)
  await page.locator('#pricing a[href*="/checkout"]').first().click()
  await page.waitForURL('**/checkout**', { timeout: 30_000 }).catch(() => {})
  record('alur', 'landing → Pilih Paket → /checkout', new URL(page.url()).pathname === '/checkout', page.url())

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: /^Masuk/i }).first().click()
  await page.waitForURL('**/login**', { timeout: 30_000 }).catch(() => {})
  record('alur', 'landing → Masuk → /login', new URL(page.url()).pathname === '/login', page.url())

  await page.goto(`${BASE}/wallet`, { waitUntil: 'domcontentloaded' })
  const gated = new URL(page.url())
  record(
    'gerbang sesi',
    '/wallet tanpa sesi → /login?next=/wallet',
    gated.pathname === '/login' && gated.searchParams.get('next') === '/wallet',
    page.url(),
  )
  await anon.close()

  /* ── 4. Dengan sesi berbayar ─────────────────────────────────────────────── */
  const auth = await createUser(USER)
  await grantTier(auth.id, 'waras')
  const session = await passwordSession(USER)

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'id-ID' })
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: sessionCookieValue(session),
      url: BASE,
      httpOnly: false,
      sameSite: 'Lax',
    },
  ])
  const app = await context.newPage()

  /* onboarding wajib dilewati sekali supaya gerbang tidak menahan semua rute */
  await app
    .goto(`${BASE}/app/onboarding`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    .catch(() => {})
  if (new URL(app.url()).pathname === '/app/onboarding') {
    await app.waitForTimeout(1200)
    await app.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
    await app.getByRole('button', { name: /^Lanjut/ }).click()
    await app.locator('button[aria-pressed]').first().click()
    await app.getByLabel(/^Saldo /).fill('1500000')
    await app.getByRole('button', { name: /^Lanjut/ }).click()
    await app.getByRole('button', { name: 'Lewati dulu, catat nanti' }).click()
    await app.waitForURL('**/app', { timeout: 30_000 }).catch(() => {})
  }

  for (const route of APP_PAGES) {
    const response = await app.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    /* tunggu hidrasi: provider app (AccountScope/OnboardingGate) baru memasang
       `data-catetind-page-root` setelah membaca penyimpanan di klien. */
    await app.waitForTimeout(1800)
    const path = new URL(app.url()).pathname
    const status = response?.status() ?? 0
    const shell = await app.evaluate(() => Boolean(document.querySelector('[data-catetind-page-root]')))
    const bodyText = await app.evaluate(() => document.body.innerText.slice(0, 4000))

    /* /admin untuk akun non-admin: halaman penolakan yang sah, bukan 500/kosong */
    const allowed =
      route === '/admin' ? status < 500 && bodyText.length > 40 : status < 400 && path === route
    record(
      'app',
      `${route} terbuka dengan sesi`,
      allowed,
      `status ${status} → ${path}${shell ? ' · shell ✓' : ' · shell ✗'}`,
    )
    if (route !== '/admin') record('app', `${route} memakai cangkang app`, shell)
  }

  /* 404 untuk pengguna bersesi: status 404 dan TIDAK memakai cangkang app —
     bukti `withShell={false}` di app/not-found.tsx (halaman publik tetap ringan). */
  const notFoundResponse = await app.goto(`${BASE}/halaman-yang-tidak-ada`, {
    waitUntil: 'domcontentloaded',
  })
  const notFoundShell = await app.evaluate(() =>
    Boolean(document.querySelector('[data-catetind-page-root]')),
  )
  const notFoundText = await app.evaluate(() => document.body.innerText.trim())
  record(
    '404',
    'halaman 404 dijawab 404 tanpa cangkang app',
    notFoundResponse?.status() === 404 && !notFoundShell && notFoundText.length > 20,
    `status ${notFoundResponse?.status()} · shell ${notFoundShell ? 'ada' : 'tidak ada'}`,
  )

  await context.close()
  await deleteUserByEmail(USER.email)
} finally {
  await browser.close()
}

const failed = results.filter((entry) => !entry.ok)
log('')
log(`Ringkasan: ${results.length - failed.length}/${results.length} lolos`)
if (failed.length > 0) {
  log(`GAGAL: ${failed.map((entry) => `[${entry.area}] ${entry.name} (${entry.detail})`).join(' · ')}`)
  process.exitCode = 1
}

