/**
 * scripts/qa/audit.mjs — sapuan halaman nyata di Chromium (HP 390×844 & desktop 1280×800).
 *
 * Yang diperiksa per halaman:
 *   · halaman benar-benar terbuka (tidak terlempar ke /login atau /checkout)
 *   · 0 kalimat terlarang di teks yang benar-benar dirender
 *   · tidak ada gulir horizontal di layar HP (lebar konten terkunci)
 *   · bilah navigasi bawah menempel di dasar layar (position fixed + di dalam viewport)
 *   · seluruh placeholder berhuruf TEGAK (font-style normal)
 *
 * Pakai: node scripts/qa/audit.mjs [--base=http://localhost:3000]
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
  forbiddenPhrases,
  chromiumPath,
  rest,
} from './harness.mjs'

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7)
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })

const PAGES = [
  '/app',
  '/wallet',
  '/bills',
  '/calendar',
  '/budget',
  '/history',
  '/wealth',
  '/joint',
  '/settings',
  '/settings/profile',
  '/settings/ai',
  '/settings/notifications',
  '/settings/security',
  '/settings/data',
  '/settings/categories',
  '/settings/billing',
  '/help',
  '/install',
  '/checkout',
]

/** halaman utama yang WAJIB punya nav bawah menempel */
const NAV_PAGES = ['/app', '/wallet', '/bills', '/calendar', '/budget', '/history', '/wealth', '/joint']

const stamp = Date.now().toString(36)
const WARAS = { email: `qa.waras.${stamp}@catetind.test`, password: `Qa!${stamp}Aa1`, name: 'Kakak Waras' }
const FREE = { email: `qa.free.${stamp}@catetind.test`, password: `Qa!${stamp}Bb2`, name: 'Teman Satu' }

const FORBIDDEN = await forbiddenPhrases()
log(`Daftar teks terlarang: ${FORBIDDEN.length} pola`)

const warasAuth = await createUser(WARAS)
await grantTier(warasAuth.id, 'waras')
const warasSession = await passwordSession(WARAS)
const freeAuth = await createUser(FREE)
const freeSession = await passwordSession(FREE)
log(`Akun uji: ${WARAS.email} (waras) · ${FREE.email} (gratis)`)

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })

async function makeContext(session, viewport) {
  const context = await browser.newContext({ viewport, locale: 'id-ID', timezoneId: 'Asia/Jakarta' })
  await context.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
  ])
  return context
}


/* ── onboarding nyata (sekaligus bukti Bagian 4.3) ─────────────────────────── */
async function completeOnboarding(session) {
  const context = await makeContext(session, { width: 390, height: 844 })
  const page = await context.newPage()
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })

  const chrome = await page.evaluate(() => ({
    nav: document.querySelectorAll('nav').length,
    bell: document.querySelectorAll('[aria-label*="Notifikasi"], [aria-label*="notifikasi"]').length,
  }))
  record('onboarding', 'tanpa nav bawah / lonceng', chrome.nav === 0 && chrome.bell === 0, JSON.stringify(chrome))

  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  const saldo = page.getByLabel(/^Saldo /)
  await saldo.fill('1500000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.getByRole('button', { name: 'Lewati dulu, catat nanti' }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  record('onboarding', 'tombol lewati membawa ke Dashboard', new URL(page.url()).pathname === '/app')

  await context.close()
}


async function sweep(session, viewport, label) {
  const context = await makeContext(session, viewport)
  const page = await context.newPage()
  const consoleErrors = []
  page.on('pageerror', (error) => consoleErrors.push(String(error)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  for (const route of PAGES) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 60_000 })
    const finalPath = new URL(page.url()).pathname
    const status = res?.status() ?? 0
    const publicForFree = ['/joint', '/checkout']
    const expectOpen = label !== 'gratis' || publicForFree.includes(route)
    if (expectOpen) {
      record(
        `halaman ${label}/${viewport.width}`,
        `${route} terbuka`,
        status < 400 && (finalPath === route || finalPath.startsWith(route)),
        status >= 400 || finalPath !== route ? `status ${status} → ${finalPath}` : '',
      )
    } else {
      record(
        `paywall ${label}/${viewport.width}`,
        `${route} dialihkan ke harga`,
        finalPath === '/checkout',
        `→ ${finalPath}`,
      )
    }

    const text = await page.evaluate(() => document.body.innerText)
    const leaks = FORBIDDEN.filter((phrase) => text.includes(phrase))
    record(`teks ${label}/${viewport.width}`, `${route} 0 kalimat terlarang`, leaks.length === 0, leaks.join(' | '))

    if (viewport.width === 390) {
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return Math.max(doc.scrollWidth - doc.clientWidth, document.body.scrollWidth - doc.clientWidth)
      })
      record(`layout ${label}/HP`, `${route} tanpa gulir horizontal`, overflow <= 1, `overflow ${overflow}px`)

      if (NAV_PAGES.includes(route) && finalPath === route) {
        const nav = await page.evaluate(() => {
          const candidates = [...document.querySelectorAll('nav, [data-bottom-nav]')]
          const best = candidates
            .map((el) => ({ rect: el.getBoundingClientRect(), pos: getComputedStyle(el).position }))
            .filter((c) => c.rect.height > 30 && c.rect.width > 200)
            .sort((a, b) => b.rect.top - a.rect.top)[0]
          if (!best) return null
          return {
            pos: best.pos,
            bottomGap: Math.round(window.innerHeight - best.rect.bottom),
            visible: best.rect.top < window.innerHeight,
          }
        })
        record(
          `layout ${label}/HP`,
          `${route} nav bawah menempel`,
          Boolean(nav) && nav.pos === 'fixed' && Math.abs(nav.bottomGap) <= 24 && nav.visible,
          nav ? `pos=${nav.pos} gap=${nav.bottomGap}px` : 'nav tidak ditemukan',
        )
      }

      const placeholders = await page.evaluate(() =>
        [...document.querySelectorAll('input, textarea')]
          .filter((el) => el.getAttribute('placeholder'))
          .map((el) => ({ text: el.getAttribute('placeholder'), style: getComputedStyle(el).fontStyle })),
      )
      const italics = placeholders.filter((p) => p.style !== 'normal')
      record(
        `placeholder ${label}/HP`,
        `${route} placeholder tegak`,
        italics.length === 0,
        italics.map((p) => `${p.text} (${p.style})`).join(' | '),
      )
    }

    const fileName = `${label}-${viewport.width}${route.replace(/\//g, '_')}.png`
    await page.screenshot({ path: path.join(SHOTS, fileName), fullPage: false })
  }

  if (consoleErrors.length) {
    log(`  ⚠ ${consoleErrors.length} error konsol di ${label}/${viewport.width}:`)
    for (const error of consoleErrors.slice(0, 6)) log(`     · ${error.slice(0, 160)}`)
  }
  await context.close()
}


try {
  await completeOnboarding(warasSession)
  const ledgerAfterSkip = await rest(warasSession.access_token, 'ledger_rows?select=id')
  record(
    'onboarding',
    'lewati onboarding tidak mengarang transaksi',
    Array.isArray(ledgerAfterSkip.data) && ledgerAfterSkip.data.length === 0,
    `${Array.isArray(ledgerAfterSkip.data) ? ledgerAfterSkip.data.length : '?'} baris ledger_rows`,
  )

  await sweep(warasSession, { width: 390, height: 844 }, 'waras')
  await sweep(warasSession, { width: 1280, height: 800 }, 'waras')
  await sweep(freeSession, { width: 390, height: 844 }, 'gratis')

  /* ── rute /settings/appearance harus benar-benar hilang (butir 54) ───── */
  const goneCtx = await makeContext(warasSession, { width: 390, height: 844 })
  const gonePage = await goneCtx.newPage()
  const goneRes = await gonePage.goto(`${BASE}/settings/appearance`, { waitUntil: 'domcontentloaded' })
  record(
    'butir 54',
    'rute /settings/appearance sudah tidak ada',
    (goneRes?.status() ?? 0) === 404,
    `status ${goneRes?.status()} → ${new URL(gonePage.url()).pathname}`,
  )
  await goneCtx.close()

  /* ── kontrol akses admin ─────────────────────────────────────────────── */
  const anon = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const anonPage = await anon.newPage()
  const anonRes = await anonPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' })
  record(
    'admin',
    'pengunjung anonim ditolak',
    new URL(anonPage.url()).pathname !== '/admin' || (anonRes?.status() ?? 0) >= 400,
    `status ${anonRes?.status()} → ${new URL(anonPage.url()).pathname}`,
  )
  await anon.close()

  const freeCtx = await makeContext(freeSession, { width: 390, height: 844 })
  const freePage = await freeCtx.newPage()
  const freeRes = await freePage.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  await freePage.waitForTimeout(1500)
  const freeStatus = freeRes?.status() ?? 0
  record(
    'admin',
    'akun gratis ditolak',
    new URL(freePage.url()).pathname !== '/admin' || freeStatus === 403,
    `status ${freeStatus} → ${new URL(freePage.url()).pathname}`,
  )
  const freeApi = await fetch(`${BASE}/api/admin/export?type=unsubscribed`, {
    headers: { cookie: `${COOKIE_NAME}=${encodeURIComponent(sessionCookieValue(freeSession))}` },
  })
  record('admin', 'API admin menolak akun gratis (403)', freeApi.status === 403, `status ${freeApi.status}`)
  await freeCtx.close()
} finally {
  await browser.close()
  const removedWaras = await deleteUserByEmail(WARAS.email)
  const removedFree = await deleteUserByEmail(FREE.email)
  log(`\nPembersihan akun uji: waras=${removedWaras ? 'terhapus' : 'TIDAK ADA'} · gratis=${removedFree ? 'terhapus' : 'TIDAK ADA'}`)
}

const failed = results.filter((r) => !r.ok)
log(`\nRingkasan: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-audit-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const f of failed) log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`)
  process.exit(1)
}
