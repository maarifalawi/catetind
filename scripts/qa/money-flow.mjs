/**
 * scripts/qa/money-flow.mjs — uji tempur tiga lapis (layar · tabel server ·
 * tahan refresh) untuk alur uang inti yang diminta Bagian 5:
 *
 *   1. tambah dompet kedua (GoPay Rp 500.000)
 *   2. tolak nama dompet kembar (tidak ada baris baru di server)
 *   3. ubah nama GoPay → "GoPay Jajan" (server + refresh)
 *   4. catat pengeluaran dengan DOUBLE-TAP → tepat SATU baris di server
 *   5. edit nominal & pindahkan dompet di Riwayat → saldo dua dompet benar
 *   6. pindah dana dari DRAWER di layar 390px → sheet tidak menutup sendiri,
 *      dua saldo bergerak, Total Pengeluaran TIDAK ikut berubah
 *   7. hapus transaksi → baris server hilang, saldo pulih, tidak kembali
 *
 * Pakai: node scripts/qa/money-flow.mjs [--base=http://localhost:3000]
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
const USER = { email: `qa.money.${stamp}@catetind.test`, password: `Qa!${stamp}Mn3`, name: 'Uji Uang' }
const NOTE = `Uji dobel ${stamp}`
const W2 = 'GoPay'
const W2_RENAMED = 'GoPay Jajan'

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
page.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 200)}`))

const wallets = async () => {
  const res = await rest(token, 'wallets?select=id,name,opening&order=name.asc')
  return Array.isArray(res.data) ? res.data : []
}
const rows = async () => {
  const res = await rest(token, 'ledger_rows?select=id,amount,wallet_id,type,note,date,client_tx_id')
  return Array.isArray(res.data) ? res.data : []
}
const balanceOf = async (name) => {
  const wallet = (await wallets()).find((w) => w.name === name)
  if (!wallet) return null
  /* Sumber angka: VIEW `wallet_balances` di server — view yang SAMA dengan yang
     dipakai aplikasi. Menghitung sendiri dari baris berarti transfer (satu baris
     dua sisi lewat `counter_wallet_id`) tidak ikut terhitung. */
  const res = await rest(token, 'wallet_balances?select=wallet_id,balance')
  const list = Array.isArray(res.data) ? res.data : []
  const row = list.find((item) => item.wallet_id === wallet.id)
  return row ? Number(row.balance) : Number(wallet.opening)
}
const screen = () => page.locator('body').innerText()
const wait = (ms) => page.waitForTimeout(ms)

/**
 * Tandai dialog yang BENAR-BENAR berada di dalam viewport.
 *
 * Kenapa perlu: di DOM ada DUA shell form transaksi (sheet mobile + modal web
 * desktop). Keduanya berukuran penuh dan "terlihat" bagi CSS, tetapi hanya satu
 * yang ada di layar 390px. Tanpa penanda ini, skrip bisa mengetik ke form
 * bayangan yang berada ribuan piksel di bawah layar — hasilnya nol baris, dan
 * itu terlihat seperti bug aplikasi padahal bug alat uji.
 */
async function activeDialog() {
  const info = await page.evaluate(() => {
    document.querySelectorAll('[data-qa-active]').forEach((el) => el.removeAttribute('data-qa-active'))
    const all = [...document.querySelectorAll('[role="dialog"]')].map((el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        w: Math.round(r.width),
        h: Math.round(r.height),
        visibility: s.visibility,
        display: s.display,
        cls: String(el.className).slice(0, 90),
        hasField: Boolean(el.querySelector('input,textarea,select')),
        el,
      }
    })
    const inView = all.filter(
      (d) =>
        d.w > 20 &&
        d.h > 120 &&
        d.top >= -4 &&
        d.top < window.innerHeight * 0.7 &&
        d.bottom > 40 &&
        d.visibility !== 'hidden' &&
        d.display !== 'none',
    )
    /* yang paling bawah di layar = bottom sheet yang sedang aktif */
    const target = inView.sort((a, b) => b.top - a.top)[0]
    if (target) target.el.setAttribute('data-qa-active', '1')
    return {
      count: inView.length,
      dialogs: all.map(({ top, bottom, w, h, visibility, display, cls, hasField }) => ({ top, bottom, w, h, visibility, display, cls, hasField })),
    }
  })
  log(`  dialog aktif: ${info.count} · ${JSON.stringify(info.dialogs).slice(0, 500)}`)
  return { dlg: page.locator('[data-qa-active="1"]'), count: info.count }
}

/** buka sheet Catat Transaksi, dengan percobaan ulang kalau animasinya belum masuk */
async function openTransactionSheet() {
  /* Tutup dulu modal otomatis yang mungkin muncul setelah Dashboard dimuat
     (mis. penawaran Top Up). Kalau tidak, sheet transaksi bisa tertutup lagi
     oleh modal yang datang belakangan — dan itu bukan bug form transaksi. */
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await wait(250)
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const open = await page.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"]')].some((el) => {
        const r = el.getBoundingClientRect()
        return (
          el.querySelector('input[aria-label="Nominal transaksi"]') &&
          r.top >= -4 &&
          r.top < window.innerHeight * 0.7 &&
          r.height > 120
        )
      }),
    )
    if (open) return true
    await page.getByRole('button', { name: 'Catat transaksi' }).first().click()
    await wait(600)
  }
  return false
}


try {
  /* ── SETUP: onboarding dengan dompet BCA Rp 5.000.000 ─────────────────── */
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('5000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('25000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await wait(1500)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await wait(1200)
  record('setup', 'dompet BCA + transaksi pertama ada di server', (await wallets()).length === 1 && (await rows()).length === 1)

  /* ── 1. TAMBAH DOMPET KEDUA (GoPay Rp 500.000) ────────────────────────── */
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Tambah dompet lain/ }).click()
  await page.getByLabel('Nama akun').fill(W2)
  await page.getByLabel('Saldo sekarang').fill('500000')
  await page.getByRole('button', { name: /Simpan Dompet/ }).click()
  await wait(2500)
  record('dompet', 'GoPay tampil di layar', (await screen()).includes(W2))
  record('dompet', 'GoPay tertulis di tabel wallets', (await wallets()).some((w) => w.name === W2))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1200)
  record('dompet', 'GoPay bertahan setelah refresh', (await screen()).includes(W2))
  await page.screenshot({ path: path.join(SHOTS, 'money-wallets.png') })

  /* ── 2. NAMA KEMBAR DITOLAK ───────────────────────────────────────────── */
  const before = (await wallets()).length
  await page.getByRole('button', { name: /Tambah dompet lain/ }).click()
  await page.getByLabel('Nama akun').fill(W2)
  await page.getByLabel('Saldo sekarang').fill('1234')
  await page.getByRole('button', { name: /Simpan Dompet/ }).click()
  await wait(1500)
  const after = (await wallets()).length
  record('dompet', 'nama kembar ditolak (server tetap ' + before + ' dompet)', after === before, `${before} → ${after}`)
  record('dompet', 'penolakan dijelaskan di form', /tidak boleh sama|sudah dipakai|wajib diisi/i.test(await screen()))
  await page.keyboard.press('Escape')
  await wait(500)

  /* ── 3. UBAH NAMA GoPay → "GoPay Jajan" ───────────────────────────────── */
  await page.getByRole('button', { name: new RegExp(`Opsi untuk ${W2}`) }).click()
  /* Menu ini dibangun dari beberapa baris (ikon + label + keterangan), jadi
     nama aksesibelnya memuat seluruh teks. Locator teks lebih tahan terhadap
     perubahan urutan/atribut daripada `aria-label` yang tepat. */
  await page.locator('button:has-text("Ubah dompet")').first().click()
  await wait(400)
  await page.getByLabel('Nama akun').fill(W2_RENAMED)
  await page.getByRole('button', { name: /Simpan Perubahan/ }).click()
  await wait(2200)
  record('dompet', 'nama baru tampil di layar', (await screen()).includes(W2_RENAMED))
  record('dompet', 'nama baru tertulis di tabel wallets', (await wallets()).some((w) => w.name === W2_RENAMED))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1200)
  record('dompet', 'nama baru bertahan setelah refresh', (await screen()).includes(W2_RENAMED))


  /* ── 4. DOUBLE-TAP: catat pengeluaran Rp 50.000 dari GoPay Jajan ──────── */
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(900)
  const sheetOpen = await openTransactionSheet()
  record('transaksi', 'sheet Catat Transaksi benar-benar terbuka di layar', sheetOpen)
  const { dlg } = await activeDialog()
  await dlg.locator('input[aria-label="Nominal transaksi"]').fill('50000')
  await dlg.locator('button[aria-label="Kategori"]').click()
  await wait(600)
  const searchCategory = page.locator('input[placeholder="Cari kategori…"]:visible').first()
  if (await searchCategory.count()) {
    await searchCategory.fill('Makanan')
    await wait(500)
  }
  const food = page.locator('button:visible', { hasText: 'Makanan' }).last()
  record('transaksi', 'pilihan kategori "Makanan" tersedia', (await food.count()) > 0)
  await food.click()
  await wait(500)
  await dlg.locator('button[aria-label="Pilih dompet transaksi"]').click()
  await wait(500)
  const walletOption = page.getByRole('button', { name: W2_RENAMED, exact: true })
  record('transaksi', 'dompet GoPay Jajan tersedia di pemilih', (await walletOption.count()) > 0)
  await walletOption.last().click()
  await wait(500)
  await dlg.locator('input[aria-label="Catatan transaksi (opsional)"]').fill(NOTE)
  await wait(300)
  const save = dlg.locator('button').filter({ hasText: /^Catat$/ }).last()
  record('transaksi', 'tombol simpan aktif setelah form lengkap', await save.isEnabled())
  await page.screenshot({ path: path.join(SHOTS, 'money-form-filled.png') })
  await save.click({ clickCount: 2, delay: 20 })
  await wait(3000)

  const created = (await rows()).filter((row) => row.note === NOTE)
  record('transaksi', 'double-tap menghasilkan TEPAT 1 baris di server', created.length === 1, `${created.length} baris`)
  record('transaksi', 'nominal Rp 50.000 tersimpan', Number(created[0]?.amount) === 50_000, String(created[0]?.amount))
  record('transaksi', 'tercatat di dompet GoPay Jajan', created[0]?.wallet_id === (await wallets()).find((w) => w.name === W2_RENAMED)?.id)
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1200)
  record('transaksi', 'catatan bertahan setelah refresh', (await screen()).includes(NOTE))
  await page.screenshot({ path: path.join(SHOTS, 'money-double-tap.png') })

  /* ── 5. EDIT: Rp 120.000 & pindah ke BCA ─────────────────────────────── */
  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: `Buka menu aksi ${NOTE}` }).click()
  await wait(400)
  await page.getByRole('button', { name: 'Edit transaksi' }).click()
  await wait(600)
  const { dlg: editDlg } = await activeDialog()
  await editDlg.locator('input[aria-label="Nominal transaksi"]').fill('120000')
  await editDlg.locator('button[aria-label="Pilih dompet transaksi"]').click()
  await wait(500)
  await page.getByRole('button', { name: 'BCA', exact: true }).last().click()
  await wait(400)
  await editDlg.getByRole('button', { name: 'Simpan', exact: true }).click()
  await wait(3000)

  const edited = (await rows()).filter((row) => row.note === NOTE)
  const bcaId = (await wallets()).find((w) => w.name === 'BCA')?.id
  record('edit', 'server menyimpan nominal Rp 120.000', Number(edited[0]?.amount) === 120_000, String(edited[0]?.amount))
  record('edit', 'baris pindah ke dompet BCA', edited[0]?.wallet_id === bcaId)
  record('saldo', 'GoPay Jajan kembali utuh Rp 500.000', (await balanceOf(W2_RENAMED)) === 500_000, String(await balanceOf(W2_RENAMED)))
  record(
    'saldo',
    'BCA terpotong Rp 120.000 (5.000.000 − 25.000 − 120.000)',
    (await balanceOf('BCA')) === 4_855_000,
    String(await balanceOf('BCA')),
  )
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1200)
  record('edit', 'nominal baru bertahan setelah refresh', /120[.,]?000/.test(await screen()))
  await page.screenshot({ path: path.join(SHOTS, 'money-edit.png') })

  /* ── 6. PINDAH DANA dari DRAWER (390px) ───────────────────────────────── */
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(1200)
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await wait(200)
  }
  await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
  await wait(600)
  const nav = await activeDialog()
  record('pindah', 'drawer navigasi terbuka', nav.count > 0)
  /* Nama tepat "Pindah Dana" hanya milik entri drawer; tab di sheet transaksi
     punya nama aksesibel panjang, jadi jangan pakai regex longgar di sini. */
  await nav.dlg.getByRole('button', { name: 'Pindah Dana', exact: true }).click()
  await wait(900)
  await page.screenshot({ path: path.join(SHOTS, 'money-transfer-open.png') })
  /* Pemilih dompet di sheet ini adalah RADIOGROUP (bukan tombol ber-aria-label);
     satu-satunya sheet transfer yang terbuka, jadi cari langsung di halaman. */
  const fromGroup = page.getByRole('radiogroup', { name: 'Dari dompet mana?' })
  record('pindah', 'sheet Pindah Dana terbuka dari drawer', (await fromGroup.count()) > 0)
  await fromGroup.getByRole('radio').filter({ hasText: 'BCA' }).first().click()
  await wait(500)
  /* Setelah asal dipilih, pemilih asal DIGANTI kartu terkunci (desain) — bukti
     sheet masih hidup adalah langkah tujuan yang muncul di bawahnya. */
  const toGroup = page.getByRole('radiogroup', { name: 'Ke dompet mana?' })
  const stillOpen1 = (await toGroup.count()) > 0
  await toGroup.getByRole('radio').filter({ hasText: W2_RENAMED }).first().click()
  await wait(500)
  const amountField = page.getByLabel('Mau pindah berapa?').first()
  const stillOpen2 = (await amountField.count()) > 0
  record('pindah', 'sheet tidak menutup sendiri setelah memilih dompet asal', stillOpen1)
  record('pindah', 'sheet tidak menutup sendiri setelah memilih dompet tujuan', stillOpen2)
  await amountField.fill('250000')
  await page.screenshot({ path: path.join(SHOTS, 'money-transfer-sheet.png') })

  const expenseBefore = (await rows()).filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
  await page.getByRole('button', { name: /^Pindah Rp/ }).last().click()
  await wait(3000)
  record('pindah', 'BCA berkurang Rp 250.000', (await balanceOf('BCA')) === 4_605_000, String(await balanceOf('BCA')))
  record('pindah', 'GoPay Jajan bertambah Rp 250.000', (await balanceOf(W2_RENAMED)) === 750_000, String(await balanceOf(W2_RENAMED)))
  const expenseAfter = (await rows()).filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
  record('pindah', 'Total Pengeluaran tidak ikut berubah (bukan belanja)', expenseBefore === expenseAfter, `${expenseBefore} → ${expenseAfter}`)
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1200)
  const transferTypes = (await rows()).filter((r) => r.type === 'transfer').length
  record('pindah', 'baris pindah dana tercatat & bertahan setelah refresh', transferTypes >= 1, `${transferTypes} baris transfer`)

  /* ── 7. HAPUS TRANSAKSI ───────────────────────────────────────────────── */
  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' })
  await wait(900)
  await page.getByRole('button', { name: `Buka menu aksi ${NOTE}` }).click()
  await wait(400)
  await page.getByRole('button', { name: 'Hapus catatan' }).click()
  await wait(500)
  await page.getByRole('button', { name: /^Hapus/ }).last().click()
  await wait(2500)
  record('hapus', 'baris benar-benar hilang dari tabel server', (await rows()).every((row) => row.note !== NOTE))
  record('hapus', 'saldo BCA pulih (+Rp 120.000)', (await balanceOf('BCA')) === 4_725_000, String(await balanceOf('BCA')))
  await page.reload({ waitUntil: 'networkidle' })
  await wait(1200)
  record('hapus', 'catatan tidak muncul lagi setelah refresh', !(await screen()).includes(NOTE))
  await page.screenshot({ path: path.join(SHOTS, 'money-delete.png') })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
  await page.screenshot({ path: path.join(SHOTS, 'money-failure.png') }).catch(() => {})
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji uang terhapus', removed)
}

const failed = results.filter((r) => !r.ok)
log(`\nRingkasan alur uang: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-money-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const f of failed) log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`)
  process.exit(1)
}

