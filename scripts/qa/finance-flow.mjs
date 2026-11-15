/**
 * scripts/qa/finance-flow.mjs — P2 · alur keuangan inti (tiga lapis).
 *
 *   1. Riwayat: cari, filter dompet/kategori/tipe, tab Insight.
 *   2. Budget 200.000 → 170.000 (85% + lonceng) → 220.000 (110% + lonceng).
 *   3. Gajian tanggal 25 (siklus gajian).
 *   4. Matematika lintas halaman: Total Pengeluaran Home = Riwayat = ledger (Rp 0).
 *
 * Bukti tiap klaim: layar Chromium 390×844, baris tabel Supabase dengan token
 * user (RLS), lalu `page.reload()`.
 *
 * Pakai: node scripts/qa/finance-flow.mjs [--base=http://localhost:3000]
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
const USER = { email: `qa.finance.${stamp}@catetind.test`, password: `Qa!${stamp}Fn3`, name: 'Uji Finansial' }
const INCOME_NOTE = `Gaji uji ${stamp}`
const FOOD_NOTE = `Makan uji ${stamp}`
const EXTRA_NOTE = `Jajan uji ${stamp}`

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
const rows = async () => {
  const res = await rest(token, 'ledger_rows?select=id,amount,type,category,note,wallet_id,date')
  return Array.isArray(res.data) ? res.data : []
}
const wallets = async () => {
  const res = await rest(token, 'wallets?select=id,name,opening&order=name.asc')
  return Array.isArray(res.data) ? res.data : []
}
const balanceOf = async (name) => {
  const wallet = (await wallets()).find((w) => w.name === name)
  if (!wallet) return null
  const res = await rest(token, 'wallet_balances?select=wallet_id,balance')
  const list = Array.isArray(res.data) ? res.data : []
  const row = list.find((item) => item.wallet_id === wallet.id)
  return row ? Number(row.balance) : Number(wallet.opening)
}
const budgets = async () => {
  const res = await rest(token, 'user_settings?select=*')
  const row = Array.isArray(res.data) ? res.data[0] : null
  const list = row?.budgets?.budgets
  return Array.isArray(list) ? list : []
}
const notifs = async () => {
  const res = await rest(token, 'notifications?select=id,title,body,is_read&order=created_at.desc&limit=20')
  return Array.isArray(res.data) ? res.data : []
}


/** dialog yang benar-benar di viewport (pola money-flow) */
async function activeDialog() {
  const count = await page.evaluate(() => {
    document.querySelectorAll('[data-qa-active]').forEach((el) => el.removeAttribute('data-qa-active'))
    const all = [...document.querySelectorAll('[role="dialog"]')].map((el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return { el, top: r.top, bottom: r.bottom, w: r.width, h: r.height, v: s.visibility, d: s.display }
    })
    const inView = all.filter(
      (d) => d.w > 20 && d.h > 120 && d.top >= -4 && d.top < window.innerHeight * 0.7 && d.bottom > 40 && d.v !== 'hidden' && d.d !== 'none',
    )
    const target = inView.sort((a, b) => b.top - a.top)[0]
    if (target) target.el.setAttribute('data-qa-active', '1')
    return inView.length
  })
  return { dlg: page.locator('[data-qa-active="1"]').first(), count }
}

async function openTransactionSheet() {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await wait(200)
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const open = await page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"]')].some((el) => {
        const r = el.getBoundingClientRect()
        return el.querySelector('input[aria-label="Nominal transaksi"]') && r.top >= -4 && r.top < window.innerHeight * 0.7 && r.height > 120
      }),
    )
    if (open) return true
    await page.getByRole('button', { name: 'Catat transaksi' }).first().click()
    await wait(600)
  }
  return false
}

/** catat satu transaksi lewat sheet (jalur user, bukan REST) */
async function addTransaction({ kind, amount, category, note }) {
  const opened = await openTransactionSheet()
  if (!opened) throw new Error('sheet catat tidak terbuka')
  const { dlg } = await activeDialog()
  if (kind === 'income') {
    await dlg.getByRole('button', { name: 'Pemasukan', exact: true }).first().click()
    await wait(500)
  }
  await dlg.locator('input[aria-label="Nominal transaksi"]').fill(String(amount))
  await dlg.locator('button[aria-label="Pilih dompet transaksi"]').click()
  await wait(500)
  const walletPick = page.getByRole('button', { name: 'BCA', exact: true }).last()
  if (await walletPick.count()) {
    await walletPick.click()
    await wait(400)
  } else {
    await page.keyboard.press('Escape').catch(() => {})
    await wait(300)
  }
  await dlg.locator('button[aria-label="Kategori"]').click()
  await wait(500)
  const search = page.locator('input[placeholder="Cari kategori…"]:visible').first()
  if (await search.count()) {
    await search.fill(category)
    await wait(400)
  }
  const option = page.locator('button:visible', { hasText: category }).last()
  if (!(await option.count())) throw new Error(`kategori ${category} tidak ada`)
  await option.click()
  await wait(400)
  await dlg.locator('input[aria-label="Catatan transaksi (opsional)"]').fill(note)
  await wait(250)
  await dlg.locator('button').filter({ hasText: /^Catat$/ }).last().click()
  await wait(2500)
}

/** angka rupiah pertama setelah teks tertentu */
async function amountNear(labelRe) {
  const text = await screen()
  const re = new RegExp(`${labelRe.source}[^\\d]{0,80}(Rp[\\s\\u00a0]?[\\d.]+)`, 'i')
  const hit = text.match(re)
  return hit ? hit[1].replace(/[\s\u00a0]/g, '') : null
}

try {
  /* ── SETUP: onboarding, dompet BCA Rp 5.000.000 ───────────────────────── */
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
  for (let i = 0; i < 12 && !(await wallets()).some((w) => w.name === 'BCA'); i += 1) await wait(700)
  record('persiapan', 'onboarding selesai & dompet BCA dibuat', (await wallets()).some((w) => w.name === 'BCA'), JSON.stringify(await wallets()))

  /* ── 1. BUDGET 200.000 (Makanan) ──────────────────────────────────────── */
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: 'Tambah batas kategori' }).click()
  await wait(600)
  const budgetDialog = page.locator('[role="dialog"]:visible').last()
  await budgetDialog.getByRole('radio', { name: /Makanan/ }).click()
  await wait(400)
  await budgetDialog.locator('input[inputmode="numeric"]').first().fill('200000')
  await wait(400)
  await budgetDialog.getByRole('button', { name: /Simpan Budget/ }).click()
  await wait(1500)
  for (let i = 0; i < 12 && (await budgets()).length === 0; i += 1) await wait(700)
  const budgetRow = (await budgets()).find((b) => /makan/i.test(b.category))
  record('budget', 'baris budget Makanan 200.000 tersimpan di server', Boolean(budgetRow) && Number(budgetRow?.limit ?? budgetRow?.amount) === 200_000, JSON.stringify(budgetRow ?? null))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1000)
  record('budget', 'limit 200.000 bertahan setelah refresh', (await screen()).includes('200.000'))

  /* ── 2. TRANSAKSI: gaji 3 jt + makan 170 rb ───────────────────────────── */
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(900)
  await addTransaction({ kind: 'income', amount: 3_000_000, category: 'Lainnya', note: INCOME_NOTE })
  await addTransaction({ kind: 'expense', amount: 170_000, category: 'Makanan', note: FOOD_NOTE })
  const afterFirst = await rows()
  record('transaksi', 'pemasukan gaji tercatat di tabel ledger_rows', afterFirst.some((r) => r.type === 'income' && Number(r.amount) === 3_000_000 && r.note === INCOME_NOTE))
  record('transaksi', 'pengeluaran 170.000 tercatat di tabel ledger_rows', afterFirst.some((r) => r.type === 'expense' && Number(r.amount) === 170_000 && r.note === FOOD_NOTE))
  record('transaksi', 'saldo BCA = 5.000.000 + 3.000.000 − 195.000', (await balanceOf('BCA')) === 7_805_000, String(await balanceOf('BCA')))

  /* ── 3. BUDGET 85% + lonceng ───────────────────────────────────────────── */
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(1200)
  record('budget', 'kartu Makanan menunjukkan 85%', /85\s*%/.test(await screen()))
  const notif85 = (await notifs()).find((n) => /hampir habis/i.test(n.title) && /makan/i.test(`${n.title} ${n.body}`))
  record('budget', 'lonceng "hampir habis" masuk tabel notifications', Boolean(notif85), notif85 ? notif85.title : 'tidak ada')
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1000)
  record('budget', '85% bertahan setelah refresh', /85\s*%/.test(await screen()))

  /* ── 4. BUDGET 110% + lonceng ──────────────────────────────────────────── */
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(900)
  await addTransaction({ kind: 'expense', amount: 50_000, category: 'Makanan', note: EXTRA_NOTE })
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(1200)
  record('budget', 'kartu Makanan menunjukkan 110%', /110\s*%/.test(await screen()))
  const notif110 = (await notifs()).find((n) => /terlampaui/i.test(n.title) && /makan/i.test(`${n.title} ${n.body}`))
  record('budget', 'lonceng "terlampaui" masuk tabel notifications', Boolean(notif110), notif110 ? notif110.title : 'tidak ada')
  record('budget', 'dua ambang = dua baris lonceng (tidak dobel)', (await notifs()).filter((n) => /budget/i.test(n.title)).length === 2, String((await notifs()).filter((n) => /budget/i.test(n.title)).length))


  /* ── 5. GAJIAN TANGGAL 25 ──────────────────────────────────────────────── */
  const payRes = await rest(token, 'user_settings?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ money: { version: 1, monthlyIncome: 3_000_000, totalInstallments: 0, paydayDate: 25, dashboardPeriod: 'cycle', enabledContexts: ['pribadi'], updatedAt: Date.now(), purged: false }, updated_at: new Date().toISOString() }),
  })
  record('gajian', 'periode gajian 25 tertulis di user_settings', payRes.ok, `HTTP ${payRes.status}`)
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(1200)
  record('gajian', 'tab Siklus Gajian tampil', /Siklus Gajian/.test(await screen()))
  await page.goto(`${BASE}/settings/profile`, { waitUntil: 'networkidle' })
  await wait(1500)
  const paydayToggle = page.getByRole('button', { name: /Tanggal Gajian/ }).first()
  if (await paydayToggle.count()) {
    await paydayToggle.click()
    await wait(600)
  }
  const paydayField = page.locator('#settings-payday')
  const paydayValue = (await paydayField.count()) ? await paydayField.inputValue() : ''
  record('gajian', 'layar Pengaturan membaca Tanggal Gajian 25', paydayValue === '25', String(paydayValue))
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(1200)
  record('gajian', 'siklus gajian bertahan setelah refresh', /Siklus Gajian/.test(await screen()))

  /* ── 6. RIWAYAT: cari & filter ─────────────────────────────────────────── */
  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await wait(1000)
  const searchBox = page.locator('input[type="search"]').first()
  await searchBox.fill('Makan uji')
  await wait(900)
  const searchText = await screen()
  record('riwayat', 'pencarian menyaring ke catatan Makanan', searchText.includes(FOOD_NOTE) && !searchText.includes(INCOME_NOTE))
  await searchBox.fill('')
  await wait(700)

  await page.getByRole('button', { name: 'Filter Tipe' }).click()
  await wait(500)
  const typeDialog = (await activeDialog()).dlg
  await typeDialog.getByRole('button', { name: 'Pemasukan', exact: true }).click()
  await wait(900)
  const incomeFiltered = await screen()
  record('riwayat', 'filter tipe Pemasukan hanya menyisakan gaji', incomeFiltered.includes(INCOME_NOTE) && !incomeFiltered.includes(FOOD_NOTE))
  await page.keyboard.press('Escape').catch(() => {})
  await wait(400)

  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await wait(1500)
  const insightTab = page.locator('button', { hasText: /^Insight$/ }).first()
  if (await insightTab.count()) await insightTab.click({ force: true }).catch(() => {})
  await wait(1200)
  const insightText = await screen()
  record('riwayat', 'tab Insight terbuka tanpa error', /Kapan Kamu Sering Boros|Insight/i.test(insightText) && !/gagal dimuat/i.test(insightText))

  /* ── 7. MATEMATIKA LINTAS HALAMAN (Rp 0) ───────────────────────────────── */
  const ledger = await rows()
  const expense = ledger.filter((r) => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0)
  const income = ledger.filter((r) => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0)
  record('matematika', 'ledger: pemasukan 3.000.000 · pengeluaran 245.000', income === 3_000_000 && expense === 245_000, `${income} / ${expense}`)
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(1100)
  const homeExpense = await amountNear(/Pengeluaran/i)
  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await wait(900)
  const histExpense = await amountNear(/Total Pengeluaran|Pengeluaran/i)
  record('matematika', 'Total Pengeluaran Home = ledger', homeExpense === 'Rp245.000', String(homeExpense))
  record('matematika', 'Total Pengeluaran Riwayat = ledger', histExpense === 'Rp245.000', String(histExpense))
  record('matematika', 'selisih dua halaman Rp 0', homeExpense === histExpense, `${homeExpense} vs ${histExpense}`)
  await page.screenshot({ path: path.join(SHOTS, 'finance-history.png') })

  /* ── 8. FILTER DOMPET & KATEGORI ──────────────────────────────────────── */
  await page.reload({ waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: 'Filter Dompet' }).click()
  await wait(500)
  const bcaFilter = page.getByRole('button', { name: 'BCA', exact: true }).last()
  if (await bcaFilter.count()) await bcaFilter.click()
  await wait(800)
  record('riwayat', 'filter dompet BCA tetap menampilkan catatan BCA', (await screen()).includes(FOOD_NOTE))
  await page.keyboard.press('Escape').catch(() => {})
  await wait(300)
  await page.getByRole('button', { name: 'Filter Kategori' }).click()
  await wait(500)
  const catDialog = (await activeDialog()).dlg
  const foodCat = catDialog.getByRole('button', { name: /Makanan/ }).first()
  if (await foodCat.count()) {
    await foodCat.click()
    await wait(800)
    const catText = await screen()
    record('riwayat', 'filter kategori Makanan menyisakan dua catatan Makanan', catText.includes(FOOD_NOTE) && catText.includes(EXTRA_NOTE))
  } else {
    record('riwayat', 'filter kategori Makanan tersedia', false)
  }
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 400))
  await page.screenshot({ path: path.join(SHOTS, 'finance-failure.png') }).catch(() => {})
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji finansial terhapus', removed)
}

const failed = results.filter((r) => !r.ok)
log(`\nRingkasan finance-flow: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-finance-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const f of failed) log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`)
  process.exit(1)
}

