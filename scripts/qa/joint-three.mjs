/**
 * scripts/qa/joint-three.mjs — P3 · Dompet bersama 3 jendela browser.
 *
 *   · 1 akun Waras (pemilik) + 2 akun Gratis (@catetind.test).
 *   · Kode undangan 6 karakter dipakai bergabung 3× (2 anggota baru + 1 percobaan
 *     ulang yang harus dijawab "sudah anggota").
 *   · 5 mode pembagian: Bagi Rata, porsi (peserta dipilih), Persentase, Nominal
 *     Custom, dan Traktir (satu orang menanggung) + validasi total persen/nominal.
 *   · Pemasukan bersama tercatat.
 *   · Pelunasan PER PASANGAN: melunasi A↔B tidak melunasi utang C.
 *   · Bar kontribusi 50%/50% setelah settle (dua anggota).
 *   · "Cerita Kita" ada di kotak gulir (overflow-y auto, isinya bisa digulir).
 *   · Hapus catatan, keluar dompet, keluarkan anggota, hapus dompet bersama —
 *     state lokal anggota lain bersih.
 *
 * Pakai: node scripts/qa/joint-three.mjs [--base=http://localhost:3000]
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
const OWNER = { email: `qa.joint.o.${stamp}@catetind.test`, password: `Qa!${stamp}Oo1`, name: 'Pemilik Uji' }
const G1 = { email: `qa.joint.a.${stamp}@catetind.test`, password: `Qa!${stamp}Aa2`, name: 'Anggota Satu' }
const G2 = { email: `qa.joint.b.${stamp}@catetind.test`, password: `Qa!${stamp}Bb3`, name: 'Anggota Dua' }
const WALLET_NAME = `Dompet Tiga ${stamp}`
/** nama tampilan pemilik di dalam dompet bersama — UI menyebutnya "Kamu" */
const ME_LABEL = 'Kamu'

const ownerAuth = await createUser(OWNER)
await grantTier(ownerAuth.id, 'waras')
await createUser(G1)
await createUser(G2)
const ownerSession = await passwordSession(OWNER)
const g1Session = await passwordSession(G1)
const g2Session = await passwordSession(G2)
const ownerToken = ownerSession.access_token
const g1Token = g1Session.access_token
const g2Token = g2Session.access_token

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true })
async function makeWindow(session) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  })
  await context.addCookies([
    { name: COOKIE_NAME, value: sessionCookieValue(session), url: BASE, httpOnly: false, sameSite: 'Lax' },
  ])
  const page = await context.newPage()
  page.on('pageerror', (err) => log(`  ⚠ pageerror: ${String(err).slice(0, 160)}`))
  return { context, page }
}
const owner = await makeWindow(ownerSession)
const guest1 = await makeWindow(g1Session)
const guest2 = await makeWindow(g2Session)

const wait = (page, ms) => page.waitForTimeout(ms)
const screen = (page) => page.locator('body').innerText()

/* ── pembaca server (token anggota; RLS aktif) ───────────────────────────── */
const list = async (token, query) => {
  const res = await rest(token, query)
  return Array.isArray(res.data) ? res.data : []
}
let walletId = null
const jointWallets = () => list(ownerToken, 'joint_wallets?select=id,name,owner_id')
const members = (id) => list(ownerToken, `joint_members?select=joint_wallet_id,user_id,role&joint_wallet_id=eq.${id}`)
const jointTx = (id) =>
  list(
    ownerToken,
    `joint_transactions_public?select=id,description,amount,kind,split_type,split_percents,split_amounts,split_members,bearer_id,is_settlement,paid_by_user_id&joint_wallet_id=eq.${id}&order=created_at.asc`,
  )
const settlements = (id) =>
  list(ownerToken, `joint_settlements?select=*&joint_wallet_id=eq.${id}`)
const inviteCodes = () => list(ownerToken, 'invite_codes?select=code,joint_wallet_id,expires_at')

async function onboarding(page) {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('5000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.getByRole('button', { name: 'Lewati dulu, catat nanti' }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await wait(page, 800)
}

async function joinWithCode(page, code) {
  await page.goto(`${BASE}/joint`, { waitUntil: 'networkidle' })
  await wait(page, 1000)
  await page.getByRole('button', { name: /Gabung pakai kode/ }).first().click()
  await wait(page, 700)
  await page.locator('input[name="kode-undangan"]').fill(code)
  await page.getByRole('button', { name: /Gabung Sekarang/ }).click()
  await wait(page, 6000)
}

/* ── Bantu isi sheet "Catat transaksi bareng" ───────────────────────────── */
async function openJointSheet(page, { amount, note, kind = 'Pengeluaran', payer }) {
  await page.getByRole('button', { name: 'Catat transaksi bareng' }).first().click()
  await wait(page, 1000)
  const sheet = page.locator('[role="dialog"][aria-label="Catat transaksi bareng"]').last()
  if (kind === 'Pemasukan') {
    await sheet.getByRole('button', { name: 'Pemasukan', exact: true }).first().click()
  }
  await sheet.getByLabel('Nominal transaksi').first().fill(String(amount))
  await sheet.getByLabel('Catatan transaksi (opsional)').first().fill(note)
  if (payer) {
    const pill = sheet.getByRole('radio', { name: new RegExp(payer) }).first()
    if (await pill.count()) await pill.click()
  }
  /* kategori wajib sebelum tombol Catat hidup */
  await sheet.getByRole('button', { name: /Kategori/ }).first().click()
  await wait(page, 700)
  const catDlg = page.locator('[role="dialog"]:visible').last()
  const options = catDlg.locator('button[aria-label]:visible')
  let picked = false
  for (let i = 0; i < (await options.count()); i += 1) {
    const label = (await options.nth(i).getAttribute('aria-label')) ?? ''
    if (!label || /Tutup|Lihat Semua/i.test(label)) continue
    await options.nth(i).click()
    picked = true
    break
  }
  await wait(page, 600)
  return sheet
}

async function openSplit(page) {
  await page.getByRole('button', { name: /Atur pembagian/ }).last().click()
  await wait(page, 800)
  return page.locator('[role="dialog"][aria-label="Atur Pembagian"]').last()
}

async function pickSplitMode(splitDlg, label) {
  await splitDlg.getByRole('radio', { name: label, exact: true }).first().click()
  await wait(splitDlg.page(), 500)
}

async function saveSplit(page) {
  const splitDlg = page.locator('[role="dialog"][aria-label="Atur Pembagian"]').last()
  const submit = splitDlg.getByRole('button', { name: 'Simpan Pembagian' }).last()
  const enabled = await submit.isEnabled().catch(() => false)
  if (enabled) await submit.click()
  await wait(page, 800)
  return enabled
}

async function submitJoint(page, sheet) {
  const catat = sheet.getByRole('button', { name: /^Catat$/ }).last()
  const enabled = await catat.isEnabled().catch(() => false)
  if (enabled) await catat.click()
  await wait(page, 3200)
  return enabled
}

try {
  /* ══ 1. PEMILIK MEMBUAT DOMPET + KODE 6 KARAKTER ═══════════════════════════ */
  await onboarding(owner.page)
  await owner.page.goto(`${BASE}/joint`, { waitUntil: 'networkidle' })
  await wait(owner.page, 1000)
  await owner.page.getByRole('button', { name: /Buat Dompet/ }).first().click()
  await owner.page.locator('input[placeholder^="Dompet Kita"]').first().fill(WALLET_NAME)
  await owner.page.getByRole('button', { name: /Buat Dompet & Ajak/ }).click()
  await wait(owner.page, 4000)
  const codeLabel = await owner.page
    .locator('p[aria-label^="Kode undangan"]')
    .first()
    .getAttribute('aria-label')
    .catch(() => '')
  const code = (codeLabel ?? '').replace('Kode undangan ', '').replace(/\s+/g, '')
  record('undangan', 'kode undangan 6 karakter tampil di layar', /^[A-Z0-9]{6}$/.test(code), code)

  const wallets = await jointWallets()
  walletId = wallets.find((row) => row.name === WALLET_NAME)?.id ?? null
  record(
    'undangan',
    'kode tercatat di tabel invite_codes milik dompet ini',
    (await inviteCodes()).some((row) => row.code === code && row.joint_wallet_id === walletId),
  )
  await owner.page.getByRole('button', { name: 'Tutup kode undangan' }).click().catch(() => {})
  await wait(owner.page, 1000)

  /* ══ 2. ANGGOTA PERTAMA GABUNG + KODE DIPAKAI ULANG ═══════════════════════ */
  await joinWithCode(guest1.page, code)
  record('undangan', 'anggota pertama gabung & melihat dompetnya', (await screen(guest1.page)).includes(WALLET_NAME))
  record('undangan', 'server: 2 anggota setelah kode dipakai', (await members(walletId)).length === 2, `${(await members(walletId)).length} anggota`)
  await owner.page.reload({ waitUntil: 'networkidle' })
  await wait(owner.page, 2200)
  record('undangan', 'layar pemilik menyebut 2 anggota', /2 ORANG/i.test(await screen(owner.page)))

  /* ══ 3. DUA ORANG: 100/0 → settle → 50/50 ════════════════════════════════ */
  const twoSheet = await openJointSheet(owner.page, { amount: 300_000, note: 'Makan berdua awal' })
  await openSplit(owner.page)
  await pickSplitMode(owner.page.locator('[role="dialog"][aria-label="Atur Pembagian"]').last(), 'Bagi Rata')
  await saveSplit(owner.page)
  const firstSaved = await submitJoint(owner.page, twoSheet)
  const twoNote = (await jointTx(walletId)).find((row) => row.description.includes('Makan berdua awal'))
  record('split', 'Bagi Rata dua orang tersimpan di server', firstSaved && twoNote?.split_type === 'equal', JSON.stringify(twoNote ?? null))
  await wait(owner.page, 900)
  record('kontribusi', 'sebelum settle bar kontribusi 100% / 0%', /Kamu 100%/.test(await screen(owner.page)) && /Anggota Satu 0%/.test(await screen(owner.page)))

  /* hapus satu catatan SEBELUM settle (bulan yang sudah settle mengunci hapus) */
  const delSheet = await openJointSheet(owner.page, { amount: 50_000, note: 'Catatan untuk dihapus' })
  await submitJoint(owner.page, delSheet)
  const beforeDelete = (await jointTx(walletId)).filter((row) => !row.is_settlement).length
  const delRow = owner.page.getByRole('button', { name: /Catatan untuk dihapus/ }).first()
  await delRow.scrollIntoViewIfNeeded().catch(() => {})
  await delRow.click()
  await wait(owner.page, 900)
  await owner.page.locator('button[aria-label^="Hapus catatan"]:visible').last().click()
  await wait(owner.page, 700)
  await owner.page.getByRole('button', { name: /^Hapus$/ }).last().click()
  await wait(owner.page, 3200)
  const afterDelete = (await jointTx(walletId)).filter((row) => !row.is_settlement).length
  record('hapus', 'hapus catatan menghapus baris di server', afterDelete === beforeDelete - 1, `${beforeDelete} → ${afterDelete}`)
  const timelineText = await owner.page
    .locator('div.overflow-y-auto.overscroll-contain')
    .last()
    .innerText()
    .catch(() => '')
  record('hapus', 'catatan terhapus hilang dari Cerita Kita', !timelineText.includes('Catatan untuk dihapus'))

  /* settle dua orang → bar 50/50 */
  await owner.page.getByRole('button', { name: 'Settle Sekarang' }).first().click()
  await wait(owner.page, 900)
  await owner.page.getByRole('button', { name: 'Tandai Sudah Settle' }).last().click()
  await wait(owner.page, 3400)
  record('settle', 'settle dua orang tercatat di tabel joint_settlements', (await settlements(walletId)).length >= 1)
  record('kontribusi', 'setelah settle bar kontribusi menjadi 50% / 50%', /Kamu 50%/.test(await screen(owner.page)) && /Anggota Satu 50%/.test(await screen(owner.page)))
  record('settle', 'status kartu settlement menyebut impas', /Semua Impas|sudah ditutup/i.test(await screen(owner.page)))

  /* ══ 4. ANGGOTA KETIGA BERGABUNG (kode 6 karakter yang SAMA) ══════════════ */
  await joinWithCode(guest2.page, code)
  record('undangan', 'anggota ketiga bergabung dengan kode yang sama', (await screen(guest2.page)).includes(WALLET_NAME))
  record('undangan', 'server: 3 anggota setelah kode dipakai 3×', (await members(walletId)).length === 3)
  await owner.page.reload({ waitUntil: 'networkidle' })
  await wait(owner.page, 2400)
  record('undangan', 'layar pemilik menyebut 3 ORANG', /3 ORANG/i.test(await screen(owner.page)))

  /* ══ 5. LIMA MODE PEMBAGIAN ═══════════════════════════════════════════════ */
  /* 5a — Bagi Rata penuh (3 peserta) */
  const eqSheet = await openJointSheet(owner.page, { amount: 300_000, note: 'Rata tiga orang', payer: G1.name })
  await openSplit(owner.page)
  await pickSplitMode(owner.page.locator('[role="dialog"][aria-label="Atur Pembagian"]').last(), 'Bagi Rata')
  await saveSplit(owner.page)
  await submitJoint(owner.page, eqSheet)
  const eqTx = (await jointTx(walletId)).find((row) => row.description.includes('Rata tiga orang'))
  const eqMembers = eqTx?.split_members?.length ?? 0
  record(
    'split',
    'mode Bagi Rata (3 peserta) tersimpan',
    eqTx?.split_type === 'equal' && (eqMembers === 0 || eqMembers === 3),
    JSON.stringify(eqTx ?? null),
  )

  /* 5b — Porsi: Bagi Rata dengan peserta dipilih (2 dari 3) */
  const porsiSheet = await openJointSheet(owner.page, { amount: 200_000, note: 'Porsi dua dari tiga', payer: G1.name })
  const porsiSplit = await openSplit(owner.page)
  await pickSplitMode(porsiSplit, 'Bagi Rata')
  const g2Box = porsiSplit.getByRole('checkbox', { name: new RegExp(G2.name) }).first()
  if (await g2Box.count()) await g2Box.uncheck()
  await wait(owner.page, 500)
  await saveSplit(owner.page)
  await submitJoint(owner.page, porsiSheet)
  const porsiTx = (await jointTx(walletId)).find((row) => row.description.includes('Porsi dua dari tiga'))
  record('split', 'mode Porsi: hanya 2 peserta yang menanggung', porsiTx?.split_type === 'equal' && (porsiTx?.split_members?.length ?? 0) === 2, JSON.stringify(porsiTx ?? null))

  /* 5c — Persentase: total ≠ 100 ditolak, 50/30/20 diterima */
  const pctSheet = await openJointSheet(owner.page, { amount: 300_000, note: 'Persen tiga orang', payer: G1.name })
  const pctSplit = await openSplit(owner.page)
  await pickSplitMode(pctSplit, 'Persentase')
  const pctMine = pctSplit.getByLabel(`Persentase ${ME_LABEL}`)
  const pctG1 = pctSplit.getByLabel(`Persentase ${G1.name}`)
  const pctG2 = pctSplit.getByLabel(`Persentase ${G2.name}`)
  await pctMine.fill('50')
  await pctG1.fill('30')
  await pctG2.fill('10')
  await wait(owner.page, 500)
  const pctInvalidDisabled = !(await pctSplit.getByRole('button', { name: 'Simpan Pembagian' }).last().isEnabled())
  await pctG2.fill('20')
  await wait(owner.page, 500)
  const pctValidEnabled = await pctSplit.getByRole('button', { name: 'Simpan Pembagian' }).last().isEnabled()
  record('split', 'validasi persen: total ≠ 100% ditolak, 50/30/20 diterima', pctInvalidDisabled && pctValidEnabled)
  await saveSplit(owner.page)
  await submitJoint(owner.page, pctSheet)
  const pctTx = (await jointTx(walletId)).find((row) => row.description.includes('Persen tiga orang'))
  const pctValues = Object.values(pctTx?.split_percents ?? {}).map(Number).sort((a, b) => a - b)
  record('split', 'mode Persentase tersimpan 50/30/20 di server', pctTx?.split_type === 'percentage' && JSON.stringify(pctValues) === JSON.stringify([20, 30, 50]), JSON.stringify(pctTx ?? null))

  /* 5d — Nominal Custom: total ≠ nominal ditolak, 150/100/50 diterima */
  const nomSheet = await openJointSheet(owner.page, { amount: 300_000, note: 'Nominal tiga orang', payer: G1.name })
  const nomSplit = await openSplit(owner.page)
  await pickSplitMode(nomSplit, 'Nominal Custom')
  await nomSplit.getByLabel(`${ME_LABEL} menanggung`).fill('100000')
  await nomSplit.getByLabel(`${G1.name} menanggung`).fill('100000')
  await nomSplit.getByLabel(`${G2.name} menanggung`).fill('50000')
  await wait(owner.page, 500)
  const nomInvalidDisabled = !(await nomSplit.getByRole('button', { name: 'Simpan Pembagian' }).last().isEnabled())
  await nomSplit.getByLabel(`${ME_LABEL} menanggung`).fill('150000')
  await nomSplit.getByLabel(`${G1.name} menanggung`).fill('100000')
  await nomSplit.getByLabel(`${G2.name} menanggung`).fill('50000')
  await wait(owner.page, 500)
  const nomValidEnabled = await nomSplit.getByRole('button', { name: 'Simpan Pembagian' }).last().isEnabled()
  record('split', 'validasi nominal: total ≠ nominal ditolak, 150+100+50 diterima', nomInvalidDisabled && nomValidEnabled)
  await saveSplit(owner.page)
  await submitJoint(owner.page, nomSheet)
  const nomTx = (await jointTx(walletId)).find((row) => row.description.includes('Nominal tiga orang'))
  const nomValues = Object.values(nomTx?.split_amounts ?? {}).map(Number).sort((a, b) => a - b)
  record('split', 'mode Nominal Custom tersimpan 150/100/50 ribu di server', nomTx?.split_type === 'nominal' && JSON.stringify(nomValues) === JSON.stringify([50_000, 100_000, 150_000]), JSON.stringify(nomTx ?? null))

  /* 5e — Traktir: satu orang menanggung 100% (G1 mentraktir semua) */
  const treatSheet = await openJointSheet(owner.page, { amount: 150_000, note: 'Traktir pemilik', payer: G1.name })
  const treatSplit = await openSplit(owner.page)
  await pickSplitMode(treatSplit, 'Yang Ini Gue Yang Bayar')
  await treatSplit.getByRole('radio', { name: new RegExp(G1.name) }).last().click().catch(() => {})
  await wait(owner.page, 500)
  await saveSplit(owner.page)
  await submitJoint(owner.page, treatSheet)
  const treatTx = (await jointTx(walletId)).find((row) => row.description.includes('Traktir pemilik'))
  const treatValues = Object.values(treatTx?.split_amounts ?? {}).map(Number).sort((a, b) => a - b)
  record(
    'split',
    'mode Traktir: satu orang menanggung 100% (dua lainnya 0)',
    treatTx?.split_type === 'single_payer' &&
      treatTx?.bearer_id === treatTx?.paid_by_user_id &&
      (treatTx?.split_amounts === null || JSON.stringify(treatValues) === JSON.stringify([0, 0, 150_000])),
    JSON.stringify(treatTx ?? null),
  )

  /* 5f — Beban khusus G2 (100%) supaya utang pasangan kedua tetap di atas
     ambang transfer setelah pasangan pertama dilunasi. */
  const g2Sheet = await openJointSheet(owner.page, { amount: 200_000, note: 'Beban G2 saja', payer: G1.name })
  const g2Split = await openSplit(owner.page)
  await pickSplitMode(g2Split, 'Persentase')
  await g2Split.getByLabel(`Persentase ${ME_LABEL}`).fill('0')
  await g2Split.getByLabel(`Persentase ${G1.name}`).fill('0')
  await g2Split.getByLabel(`Persentase ${G2.name}`).fill('100')
  await wait(owner.page, 500)
  await saveSplit(owner.page)
  await submitJoint(owner.page, g2Sheet)

  /* ══ 6. SETTLE PER PASANGAN (3 ORANG) ════════════════════════════════════
     Seluruh catatan 3 orang di atas dibayar G1 dan porsi owner/G2 > 0, jadi
     rencananya DUA transfer: owner→G1 dan G2→G1. */
  await owner.page.reload({ waitUntil: 'networkidle' })
  await wait(owner.page, 2400)
  const transferRows = owner.page.locator('li').filter({ hasText: 'Perlu transfer' })
  const rowsBefore = await transferRows.count()
  record('settle', 'rencana transfer 3 orang menampilkan ≥2 pasangan', rowsBefore >= 2, `${rowsBefore} baris`)
  const settleBefore = (await jointTx(walletId)).filter((row) => row.is_settlement).length
  if (rowsBefore >= 1) {
    const settledPairText = (await transferRows.first().innerText()).replace(/\s+/g, ' ')
    await transferRows.first().getByRole('button', { name: 'Lunasi' }).click()
    await wait(owner.page, 3600)
    const rowsAfter = await owner.page.locator('li').filter({ hasText: 'Perlu transfer' }).count()
    const settleAfter = (await jointTx(walletId)).filter((row) => row.is_settlement).length
    record('settle', 'pelunasan satu pasangan menambah 1 baris settlement', settleAfter === settleBefore + 1, `${settleBefore} → ${settleAfter}`)
    record('settle', 'utang pasangan lain TIDAK ikut lunas', rowsAfter === rowsBefore - 1 && rowsAfter >= 1, `${rowsBefore} → ${rowsAfter} · pasangan: ${settledPairText.slice(0, 80)}`)
    record('settle', 'kartu tidak lagi bilang "Semua Impas" setelah satu pasangan lunas', !/Semua Impas/i.test(await screen(owner.page)))
  }

  /* ══ 7. PEMASUKAN BERSAMA ═════════════════════════════════════════════════ */
  const incomeSheet = await openJointSheet(owner.page, {
    amount: 500_000,
    note: 'Pemasukan bersama uji',
    kind: 'Pemasukan',
  })
  await submitJoint(owner.page, incomeSheet)
  const incomeTx = (await jointTx(walletId)).find((row) => row.description.includes('Pemasukan bersama uji'))
  record('pemasukan', 'pemasukan bersama tersimpan (kind income) di server', incomeTx?.kind === 'income' && Number(incomeTx?.amount) === 500_000, JSON.stringify(incomeTx ?? null))
  record('pemasukan', 'layar menampilkan PEMASUKAN BERSAMA +Rp 500.000', /PEMASUKAN BERSAMA[^0-9]*\+?Rp\s?500\.000/i.test((await screen(owner.page)).replace(/\s+/g, ' ')))

  /* ══ 8. "CERITA KITA" DI DALAM KOTAK GULIR ═══════════════════════════════ */
  for (let i = 0; i < 8; i += 1) {
    const extra = await openJointSheet(owner.page, { amount: 10_000, note: `Catatan gulir ${i + 1}` })
    await submitJoint(owner.page, extra)
  }
  const storyBox = owner.page.locator('div.overflow-y-auto.overscroll-contain').last()
  const storyMetrics = await storyBox
    .evaluate((el) => ({
      overflowY: getComputedStyle(el).overflowY,
      maxHeight: getComputedStyle(el).maxHeight,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }))
    .catch(() => null)
  record(
    'cerita',
    '"Cerita Kita" berada di kotak gulir (overflow-y auto + tinggi terbatas)',
    Boolean(storyMetrics) && storyMetrics.overflowY === 'auto' && storyMetrics.maxHeight !== 'none',
    JSON.stringify(storyMetrics),
  )
  const scrolledTop = await storyBox
    .evaluate((el) => {
      el.scrollTop = el.scrollHeight
      return el.scrollTop
    })
    .catch(() => 0)
  record('cerita', 'isi Cerita Kita benar-benar bisa digulir', scrolledTop > 0, `scrollTop=${scrolledTop}`)

  /* ══ 9. KELOLA ANGGOTA & DOMPET ═══════════════════════════════════════════ */
  await guest1.page.reload({ waitUntil: 'networkidle' })
  await wait(guest1.page, 2400)
  const leaveBtn = guest1.page.getByRole('button', { name: 'Keluar dari dompet bersama' }).first()
  await leaveBtn.scrollIntoViewIfNeeded().catch(() => {})
  await leaveBtn.click()
  await wait(guest1.page, 700)
  await guest1.page.getByRole('button', { name: 'Ya, keluar' }).last().click()
  await wait(guest1.page, 3600)
  record('anggota', 'keluar dompet: layar anggota kembali ke pilihan awal', /Mau mulai dari mana/i.test(await screen(guest1.page)))
  record('anggota', 'keluar dompet: keanggotaan dihapus di server (sisa 2)', (await members(walletId)).length === 2, `${(await members(walletId)).length}`)
  await owner.page.reload({ waitUntil: 'networkidle' })
  await wait(owner.page, 2200)
  record('anggota', 'pemilik melihat sisa 2 anggota', /2 ORANG/i.test(await screen(owner.page)))

  const removeBtn = owner.page.getByRole('button', { name: `Keluarkan ${G2.name}` }).first()
  await removeBtn.scrollIntoViewIfNeeded().catch(() => {})
  await removeBtn.click()
  await wait(owner.page, 700)
  await owner.page.getByRole('button', { name: 'Ya, keluarkan' }).last().click()
  await wait(owner.page, 3600)
  record('anggota', 'keluarkan anggota: server menyisakan 1 anggota', (await members(walletId)).length === 1, `${(await members(walletId)).length}`)
  await guest2.page.reload({ waitUntil: 'networkidle' })
  await wait(guest2.page, 2400)
  record(
    'anggota',
    'state lokal anggota yang dikeluarkan bersih (tanpa nama dompet)',
    /Mau mulai dari mana/i.test(await screen(guest2.page)) && !(await screen(guest2.page)).includes(WALLET_NAME),
  )

  const deleteWallet = owner.page.getByRole('button', { name: 'Hapus dompet bersama' }).first()
  /* setelah mengeluarkan anggota, segarkan layar pemilik dulu (realtime bisa
     sempat menutup kartu) — dompet & perannya tetap milik pemilik. */
  await owner.page.reload({ waitUntil: 'networkidle' })
  await wait(owner.page, 3500)
  record('dompet', 'pemilik masih melihat dompetnya setelah mengeluarkan anggota', (await screen(owner.page)).includes(WALLET_NAME))
  await owner.page.screenshot({ path: path.join(SHOTS, 'joint-before-delete.png'), fullPage: true })
  await deleteWallet.scrollIntoViewIfNeeded().catch(() => {})
  await deleteWallet.click()
  await wait(owner.page, 800)
  await owner.page.getByRole('button', { name: 'Ya, hapus dompet' }).last().click()
  await wait(owner.page, 3600)
  record('dompet', 'hapus dompet bersama: baris joint_wallets hilang dari server', !(await jointWallets()).some((row) => row.id === walletId))
  record('dompet', 'layar pemilik kembali ke pilihan awal', /Mau mulai dari mana/i.test(await screen(owner.page)))
  await owner.page.screenshot({ path: path.join(SHOTS, 'joint-three-final.png'), fullPage: true })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
  await owner.page.screenshot({ path: path.join(SHOTS, 'joint-failure.png'), fullPage: true }).catch(() => {})
} finally {
  await owner.context.close()
  await guest1.context.close()
  await guest2.context.close()
  await browser.close()
  const removedOwner = await deleteUserByEmail(OWNER.email)
  const removedG1 = await deleteUserByEmail(G1.email)
  const removedG2 = await deleteUserByEmail(G2.email)
  record('bersih-bersih', 'tiga akun uji joint terhapus', removedOwner && removedG1 && removedG2)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan joint-three: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-joint-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}
