/**
 * scripts/qa/bills-flow.mjs — P2 · Tagihan rutin (tiga lapis).
 *
 *   1. Geometri saklar "Berulang setiap bulan" (pil, bukan lonjong).
 *   2. Tagihan jatuh tempo 31 (server menyimpan 31; kartu menyebut hari terakhir
 *      bulan yang lebih pendek).
 *   3. Cicilan tenor 6 dibayar Rp 500.000: saldo turun, baris ledger, tenor
 *      1/6 → 2/6, kalender, lonceng, tahan refresh.
 *   4. Batalkan lunas, edit nama, hapus tagihan.
 *   5. Kartu detail tanggal Kalender + tombol "Tambah Catatan di Tgl …".
 *
 * Pakai: node scripts/qa/bills-flow.mjs [--base=http://localhost:3000]
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
const USER = { email: `qa.bills.${stamp}@catetind.test`, password: `Qa!${stamp}Bl3`, name: 'Uji Tagihan' }
const LISTRIK = `Listrik uji ${stamp}`
const CICILAN = `Cicilan uji ${stamp}`

const auth = await createUser(USER)
await grantTier(auth.id, 'waras')
const session = await passwordSession(USER)
const token = session.access_token

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
page.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 180)}`))
const wait = (ms) => page.waitForTimeout(ms)
const screen = () => page.locator('body').innerText()

const bills = async () => {
  const res = await rest(token, 'bills?select=id,name,amount,due_day,active&order=created_at.asc')
  return Array.isArray(res.data) ? res.data : []
}
const ledger = async () => {
  const res = await rest(token, 'ledger_rows?select=id,amount,type,category,note,wallet_id,date')
  return Array.isArray(res.data) ? res.data : []
}
const wallets = async () => {
  const res = await rest(token, 'wallets?select=id,name&order=name.asc')
  return Array.isArray(res.data) ? res.data : []
}
const balanceOf = async (name) => {
  const wallet = (await wallets()).find((w) => w.name === name)
  if (!wallet) return null
  const res = await rest(token, 'wallet_balances?select=wallet_id,balance')
  const list = Array.isArray(res.data) ? res.data : []
  const row = list.find((item) => item.wallet_id === wallet.id)
  return row ? Number(row.balance) : null
}
const notifs = async () => {
  const res = await rest(token, 'notifications?select=id,title,body&order=created_at.desc&limit=20')
  return Array.isArray(res.data) ? res.data : []
}

async function onboarding() {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('5000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('25000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await wait(1600)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await wait(1200)
}

async function addBill({ name, amount, due, months = null }) {
  const opened = await page.getByRole('button', { name: /Tambah Tagihan|Tambah tagihan rutin/ }).first()
  await opened.click()
  await wait(700)
  const dlg = page.locator('[role="dialog"]:visible').last()
  await dlg.getByPlaceholder('Contoh: Kos Bulanan, Netflix').fill(name)
  await wait(400)
  await dlg.getByLabel('Nominal per bulan').fill(String(amount))
  await wait(300)
  await dlg.getByLabel('Tanggal jatuh tempo').fill(String(due))
  await wait(300)
  if (months) {
    await dlg.getByRole('radio', { name: 'Terbatas' }).click().catch(async () => {
      await dlg.getByText('Terbatas', { exact: true }).click()
    })
    await wait(400)
    await dlg.getByLabel('Berapa bulan').fill(String(months))
    await wait(300)
  }
  await dlg.getByRole('button', { name: /Simpan Tagihan/ }).click()
  await wait(2500)
}

async function topDialog() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-qa-active]').forEach((el) => el.removeAttribute('data-qa-active'))
    const all = [...document.querySelectorAll('[role="dialog"]')].map((el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return { el, top: r.top, bottom: r.bottom, w: r.width, h: r.height, v: s.visibility, d: s.display }
    })
    const inView = all.filter((d) => d.w > 20 && d.h > 120 && d.top >= -4 && d.top < window.innerHeight * 0.7 && d.bottom > 40 && d.v !== 'hidden' && d.d !== 'none')
    const target = inView.sort((a, b) => b.top - a.top)[0]
    if (target) target.el.setAttribute('data-qa-active', '1')
  })
  return page.locator('[data-qa-active="1"]').first()
}

async function markPaid(name) {
  /* Kait data (ditambahkan sesi 5) menunjuk tombol "Bayar" yang SELALU terlihat —
     bukan tombol swipe kanan yang opacity-nya 0 & pointer-events none. */
  const trigger = page.locator(`button[data-catetind-bill-pay="${name}"]`).last()
  await trigger.scrollIntoViewIfNeeded().catch(() => {})
  await trigger.click()
  await wait(1200)
  const paidDlg = page.locator(`[role="dialog"][aria-label="Tandai ${name} lunas"]`).last()
  record('cicilan', 'sheet Tandai Lunas terbuka', (await paidDlg.count()) > 0)

  /* Dompet sumber adalah radiogroup (role="radio"), BUKAN tombol berlabel "BCA".
     Sesi 4 menekan Escape saat tombol itu tidak ketemu — dan Escape menutup
     seluruh sheet, jadi tombol simpan ikut hilang. Sekarang pilih radionya. */
  const radios = paidDlg.getByRole('radio')
  let picked = false
  for (let i = 0; i < (await radios.count()); i += 1) {
    const radio = radios.nth(i)
    const text = (await radio.innerText().catch(() => '')) ?? ''
    if (!/BCA/.test(text)) continue
    await radio.scrollIntoViewIfNeeded().catch(() => {})
    if ((await radio.getAttribute('aria-checked')) !== 'true') await radio.click()
    picked = true
    break
  }

  const submit = paidDlg.locator('[data-catetind-bill-pay-submit="true"]').last()
  let enabled = false
  for (let i = 0; i < 24; i += 1) {
    if (await submit.isEnabled().catch(() => false)) {
      enabled = true
      break
    }
    await wait(150)
  }
  record(
    'cicilan',
    'dompet sumber dengan saldo cukup terpilih & tombol konfirmasi bayar aktif',
    picked && enabled,
    `radio=${picked} tombol=${enabled}`,
  )
  if (enabled) {
    await submit.scrollIntoViewIfNeeded().catch(() => {})
    await submit.click()
  }
  await page
    .waitForFunction(
      (label) => ![...document.querySelectorAll('[role="dialog"]')].some((el) => el.getAttribute('aria-label') === label),
      `Tandai ${name} lunas`,
      { timeout: 15_000 },
    )
    .catch(() => {})
  await wait(2800)
}

try {
  await onboarding()
  record('persiapan', 'dompet BCA dibuat', (await wallets()).some((w) => w.name === 'BCA'))

  /* ── 1. GEOMETRI SAKLAR + TAGIHAN JATUH TEMPO 31 ───────────────────────── */
  await page.goto(`${BASE}/bills`, { waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: /Tambah Tagihan|Tambah tagihan rutin/ }).first().click()
  await wait(700)
  const addDlg = page.locator('[role="dialog"]:visible').last()
  await addDlg.getByPlaceholder('Contoh: Kos Bulanan, Netflix').fill('Ukur Saklar')
  await wait(400)
  await addDlg.getByLabel('Nominal per bulan').fill('100000')
  await wait(500)
  const toggle = addDlg.getByRole('switch').first()
  const geometry = (await toggle.count())
    ? await toggle.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return { w: Math.round(rect.width), h: Math.round(rect.height), radius: parseFloat(style.borderRadius) }
      })
    : null
  record(
    'saklar',
    'saklar "Berulang setiap bulan" berbentuk pil (bukan lonjong)',
    Boolean(geometry && geometry.h >= 20 && geometry.h <= 32 && geometry.w / geometry.h >= 1.4 && geometry.w / geometry.h <= 2.2 && geometry.radius >= geometry.h / 2 - 1),
    JSON.stringify(geometry),
  )
  await page.keyboard.press('Escape').catch(() => {})
  await wait(400)

  await addBill({ name: LISTRIK, amount: 300_000, due: 31 })
  const listrikRow = (await bills()).find((b) => b.name === LISTRIK)
  record('tagihan', 'tagihan jatuh tempo 31 tersimpan di server', Boolean(listrikRow) && Number(listrikRow?.due_day) === 31, JSON.stringify(listrikRow ?? null))
  record('tagihan', 'kartu menyebut hari terakhir bulan berjalan (Tgl 30)', /Tgl 30/.test(await screen()))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1000)
  record('tagihan', 'tagihan bertahan setelah refresh', (await screen()).includes(LISTRIK))

  /* ── 2. CICILAN TENOR 6 ────────────────────────────────────────────────── */
  await addBill({ name: CICILAN, amount: 500_000, due: 25, months: 6 })
  const cicilanRow = (await bills()).find((b) => b.name === CICILAN)
  record('cicilan', 'tagihan cicilan tersimpan di server', Boolean(cicilanRow) && Number(cicilanRow?.amount) === 500_000, JSON.stringify(cicilanRow ?? null))
  record('cicilan', 'kartu menyebut tenor Bulan 1/6', /Bulan 1\/6/.test(await screen()))

  const balanceBefore = await balanceOf('BCA')
  await markPaid(CICILAN)
  const balanceAfter = await balanceOf('BCA')
  record('cicilan', 'saldo BCA turun Rp 500.000', balanceBefore !== null && balanceAfter === balanceBefore - 500_000, `${balanceBefore} → ${balanceAfter}`)
  const payRows = (await ledger()).filter((r) => r.note === CICILAN)
  record('cicilan', 'baris ledger pembayaran tercatat (kategori Tagihan)', payRows.some((r) => r.type === 'expense' && Number(r.amount) === 500_000), JSON.stringify(payRows))
  record('cicilan', 'tenor naik 1/6 → 2/6', /Bulan 2\/6/.test(await screen()))
  const paidNotif = (await notifs()).find((n) => /Tagihan dibayar/i.test(n.title) && new RegExp(CICILAN.slice(0, 10)).test(n.body ?? ''))
  record('cicilan', 'lonceng "Tagihan dibayar" masuk tabel notifications', Boolean(paidNotif), paidNotif ? paidNotif.title : 'tidak ada')
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1200)
  record('cicilan', 'status lunas & tenor 2/6 bertahan setelah refresh', /Bulan 2\/6/.test(await screen()))
  await page.screenshot({ path: path.join(SHOTS, 'bills-cicilan.png') })

  /* ── 3. KALENDER: BARIS PEMBAYARAN + KARTU TANGGAL ─────────────────────── */
  await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle' })
  await wait(1200)
  record('kalender', 'pembayaran tagihan muncul di kalender', (await screen()).includes(CICILAN))
  let dateCard = false
  const dayCells = page.locator('main button[aria-label]')
  for (let i = 0; i < Math.min(await dayCells.count(), 40); i += 1) {
    const label = (await dayCells.nth(i).evaluate((el) => el.getAttribute('aria-label')).catch(() => '')) ?? ''
    if (!/^\d{1,2}\b/.test(label.trim())) continue
    await dayCells.nth(i).click({ timeout: 1500 }).catch(() => {})
    await wait(400)
    if (await page.locator('[data-catetind-tanggal-detail]').first().isVisible().catch(() => false)) {
      dateCard = true
      break
    }
  }
  record('kalender', 'kartu detail tanggal terbuka', dateCard)
  record('kalender', 'tombol "Tambah Catatan di Tgl …" tampil', await page.getByRole('button', { name: /Tambah Catatan di Tgl/i }).first().isVisible().catch(() => false))


  /* ── 4. BATALKAN LUNAS ─────────────────────────────────────────────────── */
  await page.goto(`${BASE}/bills`, { waitUntil: 'networkidle' })
  await wait(1000)
  const unmark = page.locator(`button[data-catetind-bill-unmark="${CICILAN}"]`).last()
  record('batal', 'tombol "Batal lunas" tersedia', (await unmark.count()) > 0)
  if (await unmark.count()) {
    await unmark.scrollIntoViewIfNeeded().catch(() => {})
    await unmark.click()
    await wait(900)
    await page.getByRole('button', { name: /^Batalkan lunas$/ }).last().click()
    await wait(3200)
  }
  const balanceRestored = await balanceOf('BCA')
  record('batal', 'uang Rp 500.000 kembali ke dompet', balanceRestored === balanceAfter + 500_000, `${balanceAfter} → ${balanceRestored}`)
  record('batal', 'tenor kembali ke bulan sebelumnya', /Bulan 1\/6/.test(await screen()))
  record('batal', 'baris pembatalan tersimpan di Riwayat', (await ledger()).some((r) => /Batal bayar/i.test(r.note ?? '') && r.note?.includes(CICILAN)))

  /* ── 5. EDIT & HAPUS ───────────────────────────────────────────────────── */
  await page.locator(`button[data-catetind-bill-edit="${CICILAN}"]`).last().dispatchEvent('click')
  await wait(700)
  const editDlg = page.locator('[role="dialog"]:visible').last()
  await editDlg.getByPlaceholder('Contoh: Kos Bulanan, Netflix').fill(`${CICILAN} Edit`)
  await wait(300)
  await editDlg.getByRole('button', { name: /Simpan Perubahan/ }).click()
  await wait(2500)
  record('edit', 'nama baru tertulis di tabel bills', (await bills()).some((b) => b.name === `${CICILAN} Edit`))
  record('edit', 'nama baru tampil di layar', (await screen()).includes(`${CICILAN} Edit`))

  const beforeDelete = (await bills()).length
  await page.locator(`button[data-catetind-bill-delete="${CICILAN} Edit"]`).last().dispatchEvent('click')
  await wait(700)
  await page.getByRole('button', { name: /^Hapus$/ }).last().click()
  await wait(3000)
  record('hapus', 'baris tagihan hilang dari server', (await bills()).length === beforeDelete - 1)
  /* toast Undo menyebut nama tagihannya — jadi yang diperiksa adalah kartunya,
     bukan seluruh teks layar (toast sengaja menyebut nama selama 5 detik). */
  const remainingHooks = await page
    .locator(
      `button[data-catetind-bill-pay="${CICILAN} Edit"], button[data-catetind-bill-unmark="${CICILAN} Edit"], button[data-catetind-bill-edit="${CICILAN} Edit"]`,
    )
    .count()
  record('hapus', 'tagihan hilang dari layar', remainingHooks === 0, `sisa kait kartu=${remainingHooks}`)
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 400))
  await page.screenshot({ path: path.join(SHOTS, 'bills-failure.png') }).catch(() => {})
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji tagihan terhapus', removed)
}

const failed = results.filter((r) => !r.ok)
log(`\nRingkasan bills-flow: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-bills-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const f of failed) log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`)
  process.exit(1)
}

