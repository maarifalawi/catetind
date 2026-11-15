/**
 * scripts/qa/settings-flow.mjs — P5.3 · Pengaturan (qa:settings).
 *
 *   · Ubah nama (auth metadata + tabel `profiles`).
 *   · Upload avatar ≤ 20 KB; total cookie sesi < 4096 B.
 *   · Kategori kustom + sembunyikan kategori bawaan (localStorage akun).
 *   · Preferensi AI (auto-naming off + Mode Savage) & notifikasi (reminder off)
 *     tersimpan di perangkat DAN `user_settings`.
 *   · Kunci PIN aplikasi.
 *   · Ekspor JSON berisi dompet & transaksi nyata.
 *
 * Pakai: node scripts/qa/settings-flow.mjs [--base=http://localhost:3000]
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
const SHOTS = path.resolve('qa-shots')
fs.mkdirSync(SHOTS, { recursive: true })
const stamp = Date.now().toString(36)
const USER = { email: `qa.settings.${stamp}@catetind.test`, password: `Qa!${stamp}St1`, name: 'Uji Pengaturan' }
const NEW_NAME = `Nama Baru ${stamp.slice(-4)}`
const CUSTOM_CATEGORY = `Kucing ${stamp.slice(-4)}`
const PIN = '123456'

/* PNG 1×1 (byte kecil, jauh di bawah 20 KB) */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const auth = await createUser(USER)
await grantTier(auth.id, 'waras')
const session = await passwordSession(USER)
const token = session.access_token

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
  acceptDownloads: true,
})
await context.addCookies([
  { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
])
const page = await context.newPage()
page.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 180)}`))
const wait = (ms) => page.waitForTimeout(ms)
const screen = () => page.locator('body').innerText()
const local = (key) => page.evaluate((k) => window.localStorage.getItem(k), key)

const list = async (query) => {
  const res = await rest(token, query)
  return Array.isArray(res.data) ? res.data : []
}
const profileRow = async () => (await list('profiles?select=nickname,avatar_url'))[0] ?? null
const userSettings = async () => (await list('user_settings?select=ai_prefs,notif_prefs'))[0] ?? null

async function onboarding() {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('1500000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('10000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await wait(1600)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await wait(1000)
}

try {
  await onboarding()

  /* ══ 1. NAMA ══════════════════════════════════════════════════════════════ */
  await page.goto(`${BASE}/settings/profile`, { waitUntil: 'networkidle' })
  await wait(1200)
  await page.getByPlaceholder('Nama lengkap kamu').fill(NEW_NAME)
  await page.getByRole('button', { name: 'Simpan Perubahan' }).last().click()
  await wait(2600)
  record('profil', 'nama baru tersimpan di tabel profiles', (await profileRow())?.nickname === NEW_NAME, JSON.stringify(await profileRow()))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1400)
  record('profil', 'nama baru bertahan setelah reload', (await page.getByPlaceholder('Nama lengkap kamu').inputValue()) === NEW_NAME)

  /* ══ 2. AVATAR ≤ 20 KB + COOKIE < 4096 B ════════════════════════════════ */
  await page.locator('input[type="file"][accept*="image"]').first().setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: PNG_1PX,
  })
  await wait(3500)
  const avatar = (await profileRow())?.avatar_url ?? ''
  const bytes = avatar.startsWith('data:')
    ? Math.round(((avatar.split(',')[1] ?? '').length * 3) / 4)
    : 0
  record('avatar', 'avatar tersimpan di profiles.avatar_url (data URL)', avatar.startsWith('data:image/'), avatar.slice(0, 40))
  record('avatar', 'ukuran avatar ≤ 20 KB', bytes > 0 && bytes <= 20 * 1024, `${bytes} byte`)
  const cookies = await context.cookies()
  const cookieBytes = cookies.reduce((sum, row) => sum + row.name.length + row.value.length, 0)
  record('avatar', 'total cookie sesi < 4096 byte', cookieBytes < 4096, `${cookieBytes} byte · ${cookies.length} cookie`)
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1400)
  record('avatar', 'avatar bertahan setelah reload', ((await page.locator('img[alt="Foto profil"]').first().getAttribute('src').catch(() => '')) ?? '').startsWith('data:image/'))

  /* ══ 3. KATEGORI KUSTOM + SEMBUNYIKAN KATEGORI ═══════════════════════════ */
  await page.goto(`${BASE}/settings/categories`, { waitUntil: 'networkidle' })
  await wait(1200)
  await page.getByRole('button', { name: 'Tambah Kategori Baru' }).first().click()
  await wait(700)
  await page.getByPlaceholder('Contoh: Kopi Harian').fill(CUSTOM_CATEGORY)
  await page.getByRole('button', { name: 'Simpan', exact: true }).last().click()
  await wait(1200)
  const afterCustom = JSON.parse((await local('catet-category-prefs')) ?? '{}')
  record('kategori', 'kategori kustom tersimpan di perangkat', (afterCustom.custom ?? []).some((item) => item.name === CUSTOM_CATEGORY), JSON.stringify(afterCustom.custom ?? []).slice(0, 160))
  record('kategori', 'kategori kustom tampil di daftar', (await screen()).includes(CUSTOM_CATEGORY))

  await page.locator('[aria-label="Tampilkan kategori Hiburan"]').first().click()
  await wait(900)
  const afterHide = JSON.parse((await local('catet-category-prefs')) ?? '{}')
  record('kategori', 'kategori bawaan Hiburan disembunyikan (localStorage)', (afterHide.hidden ?? []).includes('hiburan'), JSON.stringify(afterHide.hidden ?? []))
  record('kategori', 'label "Disembunyikan" tampil di baris Hiburan', /Disembunyikan/i.test(await screen()))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1300)
  record('kategori', 'kustom & sembunyikan bertahan setelah reload', (await screen()).includes(CUSTOM_CATEGORY) && /Disembunyikan/i.test(await screen()))

  /* ══ 4. PREFERENSI AI ════════════════════════════════════════════════════ */
  await page.goto(`${BASE}/settings/ai`, { waitUntil: 'networkidle' })
  await wait(1200)
  await page.locator('[aria-label="Penamaan Otomatis Transaksi"]').first().click()
  await wait(500)
  await page.locator('button').filter({ hasText: 'Mode Savage' }).first().click()
  await wait(1800)
  const aiPrefs = JSON.parse((await local('catet-ai-prefs')) ?? '{}')
  record('ai', 'preferensi AI tersimpan di perangkat (autoNaming off)', aiPrefs.autoNaming === false, JSON.stringify(aiPrefs))
  record('ai', 'gaya bicara Minca = Mode Savage', String(aiPrefs.mincaMode ?? '').includes('savage'), String(aiPrefs.mincaMode))
  const aiServer = (await userSettings())?.ai_prefs
  record('ai', 'preferensi AI tersimpan di user_settings', Boolean(aiServer) && aiServer.autoNaming === false, JSON.stringify(aiServer))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1400)
  const savageSelected = await page.locator('button').filter({ hasText: 'Mode Savage' }).first().getAttribute('aria-checked')
  record('ai', 'Mode Savage tetap terpilih setelah reload', savageSelected === 'true')

  /* ══ 5. PREFERENSI NOTIFIKASI ════════════════════════════════════════════ */
  await page.goto(`${BASE}/settings/notifications`, { waitUntil: 'networkidle' })
  await wait(1200)
  const reminder = page.locator('[aria-label="Toggle Reminder Harian"]').first()
  const beforeToggle = await reminder.getAttribute('aria-checked')
  await reminder.click()
  await wait(2200)
  const afterToggle = await reminder.getAttribute('aria-checked')
  record('notifikasi', 'saklar Reminder Harian berubah & tersimpan', beforeToggle !== afterToggle, `${beforeToggle} → ${afterToggle}`)
  const notifServer = (await userSettings())?.notif_prefs
  record('notifikasi', 'preferensi notifikasi tersimpan di user_settings', Boolean(notifServer) && notifServer['reminder-harian'] === (afterToggle === 'true'), JSON.stringify(notifServer))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1400)
  record('notifikasi', 'nilai saklar bertahan setelah reload', (await page.locator('[aria-label="Toggle Reminder Harian"]').first().getAttribute('aria-checked')) === afterToggle)

  /* ══ 6. EXPORT JSON ══════════════════════════════════════════════════════ */
  await page.goto(`${BASE}/settings/data`, { waitUntil: 'networkidle' })
  await wait(1200)
  const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null)
  await page.getByRole('button', { name: 'Unduh File JSON' }).first().click()
  const download = await downloadPromise
  let exported = null
  if (download) {
    const file = path.join(SHOTS, 'settings-export.json')
    await download.saveAs(file)
    exported = JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  record('export', 'file JSON terunduh', Boolean(exported))
  record(
    'export',
    'isi ekspor: skema + dompet + transaksi nyata',
    Boolean(exported) &&
      exported.schema === 'catetind.money-export' &&
      Number(exported.counts?.wallets) >= 1 &&
      Array.isArray(exported.wallets) &&
      JSON.stringify(exported).includes('10000'),
    exported ? `dompet=${exported.counts?.wallets} · baris=${exported.counts?.ledgerRows}` : '',
  )

  /* ══ 7. KUNCI PIN (terakhir: mengunci app saat dibuka ulang) ═════════════ */
  await page.goto(`${BASE}/settings/security`, { waitUntil: 'networkidle' })
  await wait(1200)
  await page.locator('[aria-label="Kunci Aplikasi dengan PIN"]').first().click()
  await wait(800)
  const pinInput = page.locator('input[placeholder="••••••"]:visible').first()
  await pinInput.fill(PIN)
  await wait(400)
  await page.getByRole('button', { name: 'Simpan PIN' }).last().click()
  await wait(2600)
  const lockKeys = await page.evaluate(() => Object.keys(window.localStorage).filter((key) => /lock|pin/i.test(key)))
  record('pin', 'PIN tersimpan di perangkat (hash lokal)', lockKeys.length > 0, lockKeys.join(','))
  record('pin', 'status Kunci Aplikasi menjadi aktif', /Aktif|Ubah PIN/i.test(await screen()), (await screen()).replace(/\s+/g, ' ').slice(0, 160))
  await page.screenshot({ path: path.join(SHOTS, 'settings-final.png'), fullPage: true })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
  await page.screenshot({ path: path.join(SHOTS, 'settings-failure.png'), fullPage: true }).catch(() => {})
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji pengaturan terhapus', removed)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan settings-flow: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-settings-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}
