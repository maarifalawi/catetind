/**
 * scripts/qa/snap-flow.mjs — P5.4 · Midtrans Snap INLINE (qa:snap).
 *
 *   · QRIS checkout memanggil `/api/payment/charge` → respons memuat token Snap.
 *   · Halaman pembayaran Midtrans tampil DI DALAM kartu yang sama
 *     (`#catetind-snap-embed` + iframe midtrans), tanpa tab baru, pada dua
 *     viewport: 390×844 dan 1280×800.
 *   · Baris order `pending` milik akun uji dihapus di akhir skrip.
 *
 * Pakai: node scripts/qa/snap-flow.mjs [--base=http://localhost:3000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  COOKIE_NAME,
  createUser,
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
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })
const stamp = Date.now().toString(36)
const users = []

await createUser({ email: `qa.snap.${stamp}@catetind.test`, password: `Qa!${stamp}Sn1`, name: 'Uji Snap' })
users.push(`qa.snap.${stamp}@catetind.test`)
const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const orderIds = new Set()

try {
  for (const [index, viewport] of [
    { width: 390, height: 844, label: '390×844' },
    { width: 1280, height: 800, label: '1280×800' },
  ].entries()) {
    /* satu akun uji per viewport: tiap jendela membuat order Snap sendiri,
       jadi token tidak dipakai ulang dari proses sebelumnya */
    const email = index === 0 ? users[0] : `qa.snap.b.${stamp}@catetind.test`
    if (index > 0) {
      await createUser({ email, password: `Qa!${stamp}Sn2`, name: 'Uji Snap B' })
      users.push(email)
    }
    const user = { email, password: index === 0 ? `Qa!${stamp}Sn1` : `Qa!${stamp}Sn2` }
    const session = await passwordSession(user)
    const context = await browser.newContext({ viewport, locale: 'id-ID', timezoneId: 'Asia/Jakarta' })
    await context.addCookies([
      { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
    ])
    const page = await context.newPage()
    page.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 160)}`))

    const chargeResponse = page.waitForResponse(
      (res) => res.url().includes('/api/payment/charge') && res.request().method() === 'POST',
      { timeout: 45_000 },
    )
    await page.goto(`${BASE}/checkout/bayar?plan=waras`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    const qris = page.getByRole('radio', { name: /QRIS/i }).first()
    record('metode', `${viewport.label}: QRIS tersedia & terpilih`, (await qris.count()) > 0 && (await qris.getAttribute('aria-checked')) === 'true')
    await qris.click().catch(() => {})
    await page.getByRole('button', { name: 'Bayar sekarang' }).first().click()

    const response = await chargeResponse.catch(() => null)
    const body = response ? await response.json().catch(() => null) : null
    if (body?.orderId) orderIds.add(body.orderId)
    record(
      'charge',
      `${viewport.label}: respons /api/payment/charge memuat token Snap`,
      Boolean(response?.ok()) && body?.ok === true && typeof body?.token === 'string' && body.token.length > 10,
      body ? `${response.status()} · order=${body.orderId} · token=${String(body.token).slice(0, 10)}… · ${body.error ?? ''}` : 'tanpa respons',
    )
    record('charge', `${viewport.label}: redirectUrl Snap + konfigurasi embed ada`, /midtrans/i.test(body?.redirectUrl ?? '') && Boolean(body?.snap?.scriptUrl) && Boolean(body?.snap?.clientKey), JSON.stringify(body?.snap ?? null))

    /* halaman pembayaran Midtrans DI-EMBED di kartu yang sama */
    const embedBox = page.locator('#catetind-snap-embed').first()
    const inlineFrame = embedBox.locator('iframe[src*="midtrans"]').first()
    await inlineFrame.waitFor({ state: 'visible', timeout: 45_000 }).catch(() => {})
    const inline = await inlineFrame.isVisible().catch(() => false)
    record('inline', `${viewport.label}: iframe Midtrans tampil di dalam #catetind-snap-embed`, inline)
    record('inline', `${viewport.label}: tetap di /checkout/bayar (tanpa tab baru)`, page.url().includes('/checkout/bayar') && context.pages().length === 1, page.url())
    if (inline) {
      const box = await inlineFrame.boundingBox()
      record(
        'inline',
        `${viewport.label}: iframe berada di dalam viewport`,
        Boolean(box) && box.width > 100 && box.height > 100 && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1,
        JSON.stringify(box),
      )
    }
    await page.screenshot({ path: path.join(SHOTS, `snap-${viewport.width}.png`), fullPage: true })
    await context.close()
  }
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
} finally {
  await browser.close()
  /* bersih-bersih: hapus baris order pending uji (kunci peran server) */
  let deleted = 0
  for (const orderId of orderIds) {
    const res = await restService(`purchases?order_id=eq.${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    })
    if (res.ok && Array.isArray(res.data)) deleted += res.data.length
  }
  record('bersih-bersih', 'baris order pending uji dihapus', deleted === orderIds.size || orderIds.size === 0, `${deleted}/${orderIds.size}`)
  let removedAll = true
  for (const email of users) removedAll = (await deleteUserByEmail(email)) && removedAll
  record('bersih-bersih', 'akun uji Snap terhapus', removedAll)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan snap-flow: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-snap-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}
