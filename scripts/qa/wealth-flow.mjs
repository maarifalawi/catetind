/**
 * scripts/qa/wealth-flow.mjs — P2 · Kekayaan, Celengan, Investasi, Aset, Hutang,
 * dan rekonsiliasi Net Worth (tiga lapis: layar × tabel Supabase × reload).
 *
 * Skenario (sesuai §6.2 laporan audit):
 *   1. Celengan target Rp 1.000.000 — setor 400.000, tolak setoran > saldo
 *      dompet, tarik 100.000, setor sampai 100%, ubah nama/target, lalu hapus.
 *   2. Investasi 10 unit × Rp 100.000 → harga manual Rp 112.500/unit =
 *      +12,5% imbal hasil; tercatat di layar & server.
 *   3. Aset fisik (Properti) Rp 2.500.000 → nilai sekarang Rp 3.000.000.
 *   4. Hutang Rp 1.000.000 → Catat Bayar Rp 300.000 → sisa Rp 700.000
 *      (dompet & ledger sinkron).
 *   5. Net Worth: /wealth = Kas(/wallet) + Kekayaan + Properti − Hutang,
 *      selisih tepat Rp 0, dan angkanya tahan reload.
 *
 * Pakai: node scripts/qa/wealth-flow.mjs [--base=http://localhost:3000]
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
const USER = { email: `qa.wealth.${stamp}@catetind.test`, password: `Qa!${stamp}Wl3`, name: 'Uji Kekayaan' }
const FUND = `Celengan uji ${stamp}`
const FUND_EDIT = `${FUND} Baru`
const INVEST = `Reksa Dana ${stamp}`
const PROPERTY = `Motor uji ${stamp}`
const DEBT = `Pinjaman uji ${stamp}`

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

/* ── pembaca server (token user, RLS aktif) ───────────────────────────────── */
const list = async (query) => {
  const res = await rest(token, query)
  return Array.isArray(res.data) ? res.data : []
}
const goals = () => list('goals?select=id,name,target,status&order=created_at.asc')
const savings = () => list('goal_savings?select=goal_id,saved')
const contributions = () => list('goal_contributions?select=goal_id,amount,wallet_id,contributed_at,client_tx_id')
const investments = () => list('investments?select=id,name,units,avg_price&order=created_at.asc')
const investmentValues = () => list('investment_values?select=investment_id,name,units,value')
const physical = () => list('physical_assets?select=id,name,purchase_price,current_value')
const debts = () => list('debts?select=id,counterparty,principal,status,direction')
const debtBalances = () => list('debt_balances?select=debt_id,remaining')
const debtPayments = () => list('debt_payments?select=id,debt_id,amount,wallet_id')
const walletBalances = () => list('wallet_balances?select=wallet_id,name,balance')
const ledger = () => list('ledger_rows?select=id,amount,type,category,note,wallet_id,date')
const netWorthView = async () => (await list('user_net_worth?select=cash,assets,receivables,debts,net_worth'))[0] ?? null

const balanceOf = async (name) => {
  const row = (await walletBalances()).find((item) => item.name === name)
  return row ? Number(row.balance) : null
}
const cashTotal = async () =>
  (await walletBalances()).reduce((sum, row) => sum + Number(row.balance), 0)
const savedOf = async (goalName) => {
  const goal = (await goals()).find((item) => item.name === goalName)
  if (!goal) return null
  const rows = (await contributions()).filter((item) => item.goal_id === goal.id)
  if (rows.length) {
    /* jumlah BERTANDA: penarikan ditandai `out:` di client_tx_id, karena
       skema goal_contributions tidak punya kolom arah. View goal_savings
       menjumlahkan semua baris apa adanya, jadi ia bukan sumber yang benar. */
    return rows.reduce((sum, row) => {
      const amount = Number(row.amount) || 0
      return sum + (String(row.client_tx_id ?? '').startsWith('out:') ? -amount : amount)
    }, 0)
  }
  const row = (await savings()).find((item) => item.goal_id === goal.id)
  return row ? Number(row.saved) : 0
}

/** angka pertama berformat "Rp 1.234.567" (bukan bentuk ringkas "Rp 1,2 jt").
 *  Hanya menerima ribuan berpemisah titik supaya "Rp 6,72 jt" tidak terbaca 6. */
const parseRp = (text) => {
  const match = String(text).match(/Rp\s?(\d{1,3}(?:\.\d{3})+)/)
  return match ? Number(match[1].replace(/\./g, '')) : null
}
/** teks hero yang memuat label tertentu + nominal penuh pertama di sekitarnya */
async function fullRpNear(label) {
  const text = await page
    .getByText(label, { exact: true })
    .last()
    .evaluate((el) => {
      let node = el
      for (let i = 0; i < 5 && node; i += 1, node = node.parentElement) {
        const inner = node.innerText ?? ''
        if (/Rp\s?\d{1,3}(?:\.\d{3})+/.test(inner)) return inner
      }
      return ''
    })
    .catch(() => '')
  return parseRp(text)
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

/** pilih radio dompet BCA di dalam dialog apa pun (role="radio", bukan tombol) */
async function pickBca(dialog) {
  const radios = dialog.getByRole('radio')
  for (let i = 0; i < (await radios.count()); i += 1) {
    const radio = radios.nth(i)
    const text = (await radio.innerText().catch(() => '')) ?? ''
    if (!/BCA/.test(text)) continue
    await radio.scrollIntoViewIfNeeded().catch(() => {})
    if ((await radio.getAttribute('aria-checked')) !== 'true') await radio.click()
    return true
  }
  return false
}

try {
  await onboarding()
  record('persiapan', 'dompet BCA dibuat lewat onboarding', (await balanceOf('BCA')) !== null)

  /* ══ 1. CELENGAN ═══════════════════════════════════════════════════════════ */
  await page.goto(`${BASE}/budget`, { waitUntil: 'networkidle' })
  await wait(1200)
  /* mobile menampilkan SATU zona per tab — Celengan Impian ada di zona B.
     Kontrol zonanya `role="tab"` (bukan button biasa), sama seperti /wealth. */
  await page.getByRole('tab', { name: 'Celengan Impian' }).first().click()
  await wait(700)
  const addFundBtn = page
    .getByRole('button', { name: /Mulai Celengan Pertama|Tambah Celengan Baru|Mulai celengan baru/ })
    .first()
  await addFundBtn.scrollIntoViewIfNeeded().catch(() => {})
  await addFundBtn.click()
  await wait(900)
  const fundDlg = page.locator('[role="dialog"]:visible').last()
  record('celengan', 'sheet "Buat Celengan Baru" terbuka', await fundDlg.isVisible().catch(() => false))
  await fundDlg.getByPlaceholder('Biaya Operasi Mama').fill(FUND)
  await fundDlg.getByLabel('Targetnya berapa?').fill('1000000')
  /* step 2 wajib: tanggal target harus terisi sebelum tombol Buat aktif */
  await fundDlg.getByLabel('Pilih target tanggal').fill('2027-06-30')
  await wait(600)
  const createFund = fundDlg.getByRole('button', { name: /Buat Celengan/ }).last()
  await createFund.scrollIntoViewIfNeeded().catch(() => {})
  await createFund.click()
  await wait(3200)
  const goalRow = (await goals()).find((item) => item.name === FUND)
  record('celengan', 'target Rp 1.000.000 tersimpan di tabel goals', Number(goalRow?.target) === 1_000_000, JSON.stringify(goalRow ?? null))

  const openFund = page.locator(`[data-catetind-fund-open="${FUND}"]`).last()
  await openFund.scrollIntoViewIfNeeded().catch(() => {})
  await openFund.click()
  await page.waitForURL(/\/budget\/\d+/, { timeout: 15_000 })
  await wait(1200)
  record('celengan', 'halaman detail celengan terbuka', (await screen()).includes(FUND))

  const cashBeforeFund = await cashTotal()
  const contribute = async (amount, name = FUND) => {
    const trigger = page.locator(`[data-catetind-fund-contribute="${name}"]`).last()
    await trigger.scrollIntoViewIfNeeded().catch(() => {})
    await trigger.click()
    await wait(900)
    const dialog = page.locator(`[role="dialog"][aria-label="Setor ke ${name}"]`).last()
    await dialog.getByLabel('Mau setor berapa?').fill(String(amount))
    await wait(500)
    const bcaPicked = await pickBca(dialog)
    const submit = dialog.getByRole('button', { name: /Setor 💰/ }).last()
    await submit.scrollIntoViewIfNeeded().catch(() => {})
    return { dialog, submit, bcaPicked }
  }

  const firstSetor = await contribute(400_000)
  record('celengan', 'setor 400.000: dompet BCA terpilih & tombol aktif', firstSetor.bcaPicked && (await firstSetor.submit.isEnabled()))
  await firstSetor.submit.click()
  await wait(3200)
  record('celengan', 'server: terkumpul (jumlah bertanda) = Rp 400.000', (await savedOf(FUND)) === 400_000, String(await savedOf(FUND)))
  record('celengan', 'dompet BCA berkurang Rp 400.000', (await cashTotal()) === cashBeforeFund - 400_000, `${cashBeforeFund} → ${await cashTotal()}`)
  record('celengan', 'layar detail menampilkan progres Rp 400.000', (await screen()).includes('400.000'))

  /* tolak setoran melebihi saldo dompet */
  const tooBig = await contribute(9_000_000)
  const statusText = await tooBig.dialog.locator('[role="status"]').allInnerTexts().catch(() => [])
  const rejected = /belum cukup|gak cukup|tidak cukup/i.test(statusText.join(' '))
  record(
    'celengan',
    'setoran > saldo dompet ditolak (alasan tampil, tombol mati)',
    rejected && !(await tooBig.submit.isEnabled()),
    statusText.join(' | ').slice(0, 160),
  )
  await page.keyboard.press('Escape')
  await wait(800)
  record('celengan', 'setoran yang ditolak tidak menulis apa pun', (await savedOf(FUND)) === 400_000, String(await savedOf(FUND)))

  /* tarik Rp 100.000 */
  const withdraw = page.locator(`[data-catetind-fund-withdraw="${FUND}"]`).last()
  await withdraw.scrollIntoViewIfNeeded().catch(() => {})
  await withdraw.click()
  await wait(900)
  const withdrawDlg = page.locator(`[role="dialog"][aria-label="Tarik dari ${FUND}"]`).last()
  await withdrawDlg.getByLabel('Mau tarik berapa?').fill('100000')
  await wait(500)
  const withdrawSubmit = withdrawDlg.getByRole('button', { name: /^Tarik Dana$/ }).last()
  await withdrawSubmit.scrollIntoViewIfNeeded().catch(() => {})
  await withdrawSubmit.click()
  await wait(3000)
  record('celengan', 'tarik Rp 100.000: server menyisakan Rp 300.000', (await savedOf(FUND)) === 300_000, String(await savedOf(FUND)))
  record('celengan', 'uang tarikan kembali ke dompet (+Rp 100.000)', (await cashTotal()) === cashBeforeFund - 300_000, String(await cashTotal()))

  /* setor sampai 100% */
  const finish = await contribute(700_000)
  await finish.submit.click()
  await wait(3400)
  record('celengan', 'setor 700.000: progres server tepat Rp 1.000.000 (100%)', (await savedOf(FUND)) === 1_000_000, String(await savedOf(FUND)))
  record('celengan', 'layar menandai target tercapai', /100%|TERCAPAI|Buat target baru/i.test(await screen()))
  const fundLedger = (await ledger()).filter((row) => row.category === 'Tabungan')
  record(
    'celengan',
    'ledger server mencatat setoran (transfer) & tarikan (saving_withdraw)',
    fundLedger.some((row) => row.type === 'transfer' && Number(row.amount) === 400_000) &&
      fundLedger.some((row) => row.type === 'saving_withdraw' && Number(row.amount) === 100_000),
    JSON.stringify(fundLedger.map((row) => [row.type, row.amount])),
  )

  /* ubah nama & target */
  const editFund = page.locator(`[data-catetind-fund-edit="${FUND}"]`).last()
  await editFund.scrollIntoViewIfNeeded().catch(() => {})
  await editFund.click()
  await wait(900)
  const editDlg = page.locator('[role="dialog"][aria-label="Ubah Celengan"]').last()
  record('celengan', 'sheet "Ubah Celengan" terbuka', await editDlg.isVisible().catch(() => false))
  await editDlg.locator('[data-catetind-fund-edit-name="true"]').fill(FUND_EDIT)
  await editDlg.getByLabel('Targetnya berapa?').fill('1200000')
  await wait(400)
  const editSubmit = editDlg.locator('[data-catetind-fund-edit-submit="true"]').last()
  await editSubmit.scrollIntoViewIfNeeded().catch(() => {})
  await editSubmit.click()
  await wait(3000)
  const editedGoal = (await goals()).find((item) => item.name === FUND_EDIT)
  record('celengan', 'edit tersimpan di server (nama & target baru)', Number(editedGoal?.target) === 1_200_000, JSON.stringify(editedGoal ?? null))
  record('celengan', 'nama baru tampil di layar', (await screen()).includes(FUND_EDIT))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1400)
  record('celengan', 'nama & progres bertahan setelah reload', (await screen()).includes(FUND_EDIT) && (await screen()).includes('1.000.000'))

  /* hapus celengan */
  const deleteFund = page.locator(`[data-catetind-fund-delete="${FUND_EDIT}"]`).last()
  await deleteFund.scrollIntoViewIfNeeded().catch(() => {})
  await deleteFund.click()
  await wait(800)
  await page.getByRole('button', { name: /^Hapus$/ }).last().click()
  await wait(3200)
  record('celengan', 'hapus: baris goals hilang dari server', !(await goals()).some((item) => item.name === FUND_EDIT))
  await page.waitForURL('**/budget', { timeout: 15_000 }).catch(() => {})
  await wait(1200)
  record('celengan', 'hapus: kartu celengan hilang dari /budget', (await page.locator(`[data-catetind-fund-open="${FUND_EDIT}"]`).count()) === 0)

  /* ══ 2. INVESTASI (+12,5%) ════════════════════════════════════════════════ */
  await page.goto(`${BASE}/wealth`, { waitUntil: 'networkidle' })
  await wait(1400)
  await page.getByRole('button', { name: 'Tambah investasi' }).first().click()
  await wait(900)
  const invDlg = page.locator('[role="dialog"][aria-label="Tambah Investasi"]').last()
  await invDlg.getByPlaceholder('Contoh: BBCA, Bitcoin, Bibit RDPU').fill(INVEST)
  await invDlg.getByLabel('Jumlah (Unit)').fill('10')
  await invDlg.getByLabel('Harga per unit').fill('100000')
  await wait(500)
  const invSubmit = invDlg.getByRole('button', { name: /Simpan Transaksi/ }).last()
  await invSubmit.scrollIntoViewIfNeeded().catch(() => {})
  await invSubmit.click()
  await wait(3400)
  const invRow = (await investments()).find((item) => item.name === INVEST)
  record(
    'investasi',
    'investasi tersimpan di server (10 unit × Rp 100.000)',
    Boolean(invRow) && Number(invRow.units) === 10 && Number(invRow.avg_price) === 100_000,
    JSON.stringify(invRow ?? null),
  )
  record('investasi', 'kartu aset tampil di layar', (await screen()).includes(INVEST))

  const updatePrice = page.getByRole('button', { name: `Update harga ${INVEST}` }).last()
  await updatePrice.scrollIntoViewIfNeeded().catch(() => {})
  await updatePrice.click()
  await wait(900)
  const priceDlg = page.locator('[role="dialog"][aria-label="Update Manual"]').last()
  await priceDlg.getByLabel('Harga sekarang (per unit)').fill('112500')
  await wait(500)
  const priceSubmit = priceDlg.getByRole('button', { name: /Simpan Harga Baru/ }).last()
  await priceSubmit.scrollIntoViewIfNeeded().catch(() => {})
  await priceSubmit.click()
  await wait(3400)
  const invValue = (await investmentValues()).find((item) => item.name === INVEST)
  record('investasi', 'server: nilai 10 × Rp 112.500 = Rp 1.125.000', Number(invValue?.value) === 1_125_000, JSON.stringify(invValue ?? null))
  record('investasi', 'imbal hasil +12,5% tampil di layar', /1\.125\.000/.test(await screen()) && /12[.,]50?\s*%/.test(await screen()))

  /* ══ 3. ASET FISIK (PROPERTI) ═════════════════════════════════════════════ */
  await page.getByRole('tab', { name: 'Properti', exact: true }).click()
  await wait(700)
  await page.getByRole('button', { name: 'Tambah aset' }).first().click()
  await wait(900)
  const physDlg = page.locator('[role="dialog"][aria-label="Tambah Aset Fisik"]').last()
  await physDlg.getByPlaceholder('Contoh: Rumah Depok').fill(PROPERTY)
  await physDlg.getByLabel('Harga beli').fill('2500000')
  await physDlg.getByLabel('Nilai sekarang').fill('3000000')
  await wait(500)
  const physSubmit = physDlg.getByRole('button', { name: /^Simpan$/ }).last()
  await physSubmit.scrollIntoViewIfNeeded().catch(() => {})
  await physSubmit.click()
  await wait(3400)
  const physRow = (await physical()).find((item) => item.name === PROPERTY)
  record(
    'properti',
    'aset fisik tersimpan di server (beli 2,5 jt → kini 3 jt)',
    Boolean(physRow) && Number(physRow.current_value) === 3_000_000,
    JSON.stringify(physRow ?? null),
  )
  record('properti', 'kartu aset fisik tampil di layar', (await screen()).includes(PROPERTY))

  /* ══ 4. HUTANG Rp 1.000.000 → BAYAR Rp 300.000 ═══════════════════════════ */
  await page.getByRole('tab', { name: 'Hutang', exact: true }).click()
  await wait(700)
  await page.getByRole('button', { name: 'Tambah utang atau piutang' }).first().click()
  await wait(900)
  const debtDlg = page.locator('[role="dialog"][aria-label="Tambah Utang / Piutang"]').last()
  await debtDlg.getByPlaceholder('Nama teman/keluarga').fill(DEBT)
  await debtDlg.getByLabel('Jumlah').fill('1000000')
  await wait(500)
  const debtSubmit = debtDlg.getByRole('button', { name: /^Simpan$/ }).last()
  await debtSubmit.scrollIntoViewIfNeeded().catch(() => {})
  await debtSubmit.click()
  await wait(3400)
  const debtRow = (await debts()).find((item) => item.counterparty === DEBT)
  record('hutang', 'hutang Rp 1.000.000 tersimpan di server', Number(debtRow?.principal) === 1_000_000, JSON.stringify(debtRow ?? null))
  record('hutang', 'sisa awal Rp 1.000.000 tampil di layar', /1\.000\.000/.test(await screen()))

  const cashBeforePay = await cashTotal()
  /* kartu hutang PERSONAL memakai baris aksi selebar kartu berlabel "Catat Bayar"
     (tanpa nama di teks tombolnya), jadi tombolnya dicari di dalam kartu yang
     menyebut nama hutangnya. */
  const payBtn = page
    .locator('li', { hasText: DEBT })
    .getByRole('button', { name: 'Catat Bayar', exact: true })
    .last()
  await payBtn.scrollIntoViewIfNeeded().catch(() => {})
  await payBtn.click()
  await wait(900)
  const payDlg = page.locator(`[role="dialog"][aria-label="Catat Bayar ${DEBT}"]`).last()
  await payDlg.getByLabel('Nominal dibayar').fill('300000')
  await wait(500)
  const payBca = await pickBca(payDlg)
  const paySubmit = payDlg.getByRole('button', { name: /Simpan Pembayaran/ }).last()
  await paySubmit.scrollIntoViewIfNeeded().catch(() => {})
  record('hutang', 'sheet bayar: dompet BCA terpilih & tombol aktif', payBca && (await paySubmit.isEnabled()))
  await paySubmit.click()
  await wait(3400)

  const remainingRow = (await debtBalances()).find((item) => item.debt_id === debtRow?.id)
  record('hutang', 'server: sisa hutang Rp 700.000', Number(remainingRow?.remaining) === 700_000, JSON.stringify(remainingRow ?? null))
  const payLedger = (await ledger()).filter((row) => row.type === 'debt_payment' && Number(row.amount) === 300_000)
  record('hutang', 'baris ledger debt_payment Rp 300.000 tercatat', payLedger.length === 1, JSON.stringify(payLedger))
  record('hutang', 'dompet BCA berkurang Rp 300.000', (await cashTotal()) === cashBeforePay - 300_000, `${cashBeforePay} → ${await cashTotal()}`)
  record('hutang', 'payment tercatat di tabel debt_payments', (await debtPayments()).some((row) => row.debt_id === debtRow?.id && Number(row.amount) === 300_000))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1500)
  record('hutang', 'sisa Rp 700.000 bertahan setelah reload', /700\.000/.test(await screen()))

  /* ══ 5. REKONSILIASI NET WORTH ════════════════════════════════════════════ */
  const server = await netWorthView()
  const serverCash = await cashTotal()
  const serverInvest = (await investmentValues()).reduce((sum, row) => sum + Number(row.value), 0)
  const serverPhysical = (await physical()).reduce((sum, row) => sum + Number(row.current_value), 0)
  const serverDebt = (await debtBalances()).reduce((sum, row) => sum + Number(row.remaining), 0)

  await page.goto(`${BASE}/wealth`, { waitUntil: 'networkidle' })
  await wait(1600)
  const netText = await page
    .getByLabel('Kekayaan bersih: total aset dibanding total hutang')
    .first()
    .innerText()
  const displayedNet = parseRp(netText)
  const panelInvestment = parseRp(await page.locator('section[aria-label="Kekayaan"]').first().innerText())
  const panelDebt = parseRp(await page.locator('section[aria-label="Hutang dan piutang"]').first().innerText())

  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' })
  await wait(1400)
  const walletCash = await fullRpNear('Total Saldo')

  const fromScreens = (walletCash ?? 0) + (panelInvestment ?? 0) + serverPhysical - (panelDebt ?? 0)
  const diffScreens = displayedNet === null ? null : displayedNet - fromScreens
  const diffServer = server ? Number(server.net_worth) - (serverCash + serverInvest - serverDebt) : null
  log(
    `  Net Worth: layar ${displayedNet} · kas(/wallet) ${walletCash} · kekayaan ${panelInvestment} · properti ${serverPhysical} · hutang ${panelDebt} · server ${server?.net_worth}`,
  )
  record(
    'networth',
    'server: net_worth = kas + investasi − hutang (selisih Rp 0)',
    diffServer === 0,
    `selisih=${diffServer} · kas=${serverCash} investasi=${serverInvest} hutang=${serverDebt}`,
  )
  record(
    'networth',
    '/wealth = /wallet + Kekayaan + Properti − Hutang (selisih Rp 0)',
    diffScreens === 0,
    `selisih=${diffScreens} · layar=${displayedNet} hitung=${fromScreens}`,
  )
  record('networth', 'kas /wallet sama dengan view wallet_balances (Rp 0)', walletCash === serverCash, `${walletCash} vs ${serverCash}`)

  await page.goto(`${BASE}/wealth`, { waitUntil: 'networkidle' })
  await wait(1600)
  const netTextAfter = await page
    .getByLabel('Kekayaan bersih: total aset dibanding total hutang')
    .first()
    .innerText()
  const displayedAfter = parseRp(netTextAfter)
  record('networth', 'angka Net Worth bertahan setelah reload', displayedAfter === displayedNet, `${displayedNet} → ${displayedAfter}`)
  await page.screenshot({ path: path.join(SHOTS, 'wealth-networth.png'), fullPage: true })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
  await page.screenshot({ path: path.join(SHOTS, 'wealth-failure.png'), fullPage: true }).catch(() => {})
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji kekayaan terhapus', removed)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan wealth-flow: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-wealth-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}
