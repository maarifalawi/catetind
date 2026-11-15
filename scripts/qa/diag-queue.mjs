/**
 * scripts/qa/diag-queue.mjs — mengapa baris tertinggal di antrean?
 * Meniru timing crud.mjs (2,5 s), mencatat setiap request `ledger_rows` dan
 * snapshot IndexedDB yang benar-benar tersimpan setelah Dashboard dibuka.
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
const WAIT = Number((process.argv.find((a) => a.startsWith('--wait=')) ?? '--wait=2500').slice(7))
const stamp = Date.now().toString(36)
const USER = { email: `qa.queue.${stamp}@catetind.test`, password: `Qa!${stamp}Qq3`, name: 'Queue' }

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

page.on('request', (req) => {
  const url = req.url()
  if (/ledger_rows|wallets/.test(url) && req.method() !== 'GET') log(`  → ${req.method()} ${url.replace('https://wmswtoyikvgzcvbgdceo.supabase.co', 'SB')}`)
  if (url.includes('/api/data')) log(`  → POST /api/data ${req.postData()?.slice(0, 160)}`)
})
page.on('response', (res) => {
  const url = res.url()
  if (/ledger_rows|wallets/.test(url) && res.request().method() !== 'GET') log(`  ← ${res.status()} ${url.replace('https://wmswtoyikvgzcvbgdceo.supabase.co', 'SB')}`)
})

async function dumpLocal(label) {
  const state = await page.evaluate(async () => {
    const open = () =>
      new Promise((resolve) => {
        const req = indexedDB.open('catetind-money')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      })
    const db = await open()
    if (!db) return { error: 'no db' }
    const keys = await new Promise((resolve) => {
      const req = db.transaction('state', 'readonly').objectStore('state').getAllKeys()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve([])
    })
    const snapKey = keys.find((k) => String(k).startsWith('snapshot:'))
    const snap = await new Promise((resolve) => {
      const req = db.transaction('state', 'readonly').objectStore('state').get(snapKey)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
    return {
      keys: keys.map(String),
      snapKey: String(snapKey ?? ''),
      wallets: (snap?.wallets ?? []).map((w) => ({ id: w.id, name: w.name })),
      rows: (snap?.rows ?? []).map((r) => ({ id: r.id, amount: r.amount, walletId: r.walletId, clientTxId: r.clientTxId })),
      syncedIds: snap?.syncedIds ?? [],
      syncedWalletIds: snap?.syncedWalletIds ?? [],
      pendingWalletIds: snap?.pendingWalletIds ?? [],
    }
  })
  log(`  [${label}] ${JSON.stringify(state)}`)
}

try {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('2000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('125000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await page.waitForTimeout(WAIT)
  await dumpLocal(`sebelum pindah (tunggu ${WAIT}ms)`)

  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await page.waitForTimeout(1500)
  await dumpLocal('dashboard +1,5s')

  for (let i = 0; i < 5; i += 1) {
    await page.waitForTimeout(2000)
    await dumpLocal(`dashboard +${(i + 2) * 1.5 + 1}s`)
  }
  const rows = await rest(session.access_token, 'ledger_rows?select=id,amount,wallet_id,client_tx_id')
  log(`  server rows (token harness): ${JSON.stringify(rows.data)}`)

  /* Identitas yang dipakai browser vs harness — kalau berbeda, barisnya memang
     tertulis, hanya bukan di akun yang sedang diperiksa. */
  const browserSession = await page.evaluate(async () => {
    const mod = await import('/_next/static/chunks/_.js').catch(() => null)
    return mod ? 'loaded' : 'n/a'
  }).catch(() => 'n/a')
  log(`  browser probe: ${browserSession}`)
  const cookieUser = await page.evaluate(() => {
    const raw = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('sb-') && c.includes('-auth-token='))
    if (!raw) return null
    try {
      const value = decodeURIComponent(raw.split('=').slice(1).join('=')).replace(/^base64-/, '')
      const json = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')))
      return { id: json?.user?.id ?? null, email: json?.user?.email ?? null }
    } catch {
      return 'unreadable'
    }
  })
  log(`  cookie user: ${JSON.stringify(cookieUser)} · harness user: ${session.user.id}`)
  const serviceRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`.length
      ? 'https://wmswtoyikvgzcvbgdceo.supabase.co/rest/v1/ledger_rows?select=id,user_id,amount,client_tx_id'
      : '',
    {
      headers: {
        apikey: (await import('node:fs')).readFileSync('.env.local', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim(),
        Authorization: `Bearer ${(await import('node:fs')).readFileSync('.env.local', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()}`,
      },
    },
  )
  const allRows = await serviceRes.json().catch(() => null)
  log(`  semua baris (service role): ${JSON.stringify(allRows)?.slice(0, 900)}`)
  log(`  banner: ${/menunggu/i.test(await page.locator('body').innerText()) ? 'ADA' : 'tidak'}`)
} catch (error) {
  log(`  GAGAL: ${String(error).slice(0, 500)}`)
} finally {
  await context.close()
  await browser.close()
  await deleteUserByEmail(USER.email)
}
