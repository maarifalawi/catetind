/**
 * scripts/qa/ai-flow.mjs — P5.2 · Minca AI (qa:ai).
 *
 *   · Minca membalas dengan nada santai (bukan "Anda", tanpa menghakimi).
 *   · Jawaban memakai TANGGAL LOKAL hari ini (Asia/Jakarta).
 *   · Transaksi dari chat masuk "Transaksi Terbaru" & tabel `ledger_rows`.
 *   · `ai_usage` berkurang kumulatif di server dan TIDAK kembali ke 100% saat
 *     reload (kuota dibaca dari baris server, bukan konstanta tampilan).
 *
 * Pakai: node scripts/qa/ai-flow.mjs [--base=http://localhost:3000]
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
const USER = { email: `qa.ai.${stamp}@catetind.test`, password: `Qa!${stamp}Ai1`, name: 'Uji Minca' }
const NOTE = `Kopi uji ${stamp}`

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

const list = async (query) => {
  const res = await rest(token, query)
  return Array.isArray(res.data) ? res.data : []
}
const aiUsage = async (activity) =>
  (await list(`ai_usage?select=activity,calls_used,month_key&activity=eq.${activity}`))[0] ?? null
const ledger = () => list('ledger_rows?select=id,amount,type,category,note,date,wallet_id')

/** tanggal lokal Asia/Jakarta (tanggal yang WAJIB dipakai balasan & catatan) */
const todayJakarta = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
const [year, month, day] = todayJakarta.split('-')
const monthName = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', month: 'long' }).format(new Date())
const monthKey = `${year}-${month}`

async function onboarding() {
  await page.goto(`${BASE}/app/onboarding`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Situasi hidup' }).getByRole('button').first().click()
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('button[aria-pressed]').first().click()
  await page.getByLabel(/^Saldo /).fill('2000000')
  await page.getByRole('button', { name: /^Lanjut/ }).click()
  await page.locator('input[aria-label="Nominal transaksi pertama"]:visible').first().fill('25000')
  await page.getByRole('button', { name: /Catat Pertama/ }).click()
  await wait(1600)
  await page.getByRole('button', { name: /Masuk ke Dashboard/ }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
  await wait(1200)
}

async function openPanel() {
  if (await page.getByRole('dialog', { name: 'Minca' }).count()) return
  await page.getByRole('button', { name: 'Buka Minca' }).first().click()
  await wait(1200)
}
const panel = () => page.getByRole('dialog', { name: 'Minca' }).first()
const panelText = async () => (await panel().innerText()).replace(/\s+/g, ' ')
async function send(message) {
  const input = panel().getByLabel('Ketik pesan untuk Minca').first()
  await input.fill(message)
  await panel().getByRole('button', { name: 'Kirim pesan' }).last().click()
  await wait(12_000)
}

try {
  await onboarding()
  await openPanel()
  record('panel', 'panel Minca terbuka', await panel().isVisible())
  const usageStart = Number((await aiUsage('chat'))?.calls_used ?? 0)

  /* ══ 1. BALASAN SANTAI ═══════════════════════════════════════════════════ */
  await send('halo minca, gimana kondisi uangku hari ini?')
  const casualReply = await panelText()
  record(
    'balasan',
    'Minca membalas santai (kata "gue/lo/aku/kamu", tanpa "Anda")',
    /(gue|lo\b|aku\b|kamu\b)/i.test(casualReply) && !/Anda\b/.test(casualReply),
    casualReply.slice(-220),
  )
  record('balasan', 'balasan menyebut kondisi uang user (bukan jawaban kosong)', /(pengeluaran|belum ada|catatan|dompet|jatah)/i.test(casualReply))

  /* tiga pertanyaan keuangan lagi: kuota chat harus turun KUMULATIF */
  await send('ada tips hemat buat tanggal tua?')
  await send('gimana cara atur budget makan biar nggak boncos?')
  await send('pengeluaranku minggu ini gimana?')

  /* ══ 2. TANGGAL LOKAL HARI INI ════════════════════════════════════════════ */
  await send(`aku mau catat gajian tanggal ${Number(day)} ${monthName} ${year}, itu hari apa ya?`)
  const dateReply = await panelText()
  const dateField = panel().locator('input[aria-label="Tanggal"]').first()
  const dateValue = (await dateField.count()) ? await dateField.inputValue().catch(() => '') : ''
  const mentionsDate =
    dateValue === todayJakarta ||
    dateReply.includes(`${Number(day)} ${monthName}`) ||
    dateReply.includes(todayJakarta)
  record(
    'tanggal',
    `kartu/balasan memakai tanggal lokal hari ini (${Number(day)} ${monthName} ${year})`,
    mentionsDate,
    `input=${dateValue} · ${dateReply.slice(-200)}`,
  )
  /* pesan "catat gajian" membuka draft konfirmasi — buang dulu supaya pesan
     berikutnya tidak diblokir ("Selesaikan dulu catatan di atas") */
  const discard = panel().getByRole('button', { name: 'Batal', exact: true }).last()
  if (await discard.count()) {
    await discard.click().catch(() => {})
    await wait(800)
  }

  /* ══ 3. TRANSAKSI DARI CHAT ══════════════════════════════════════════════ */
  const beforeLedger = (await ledger()).length
  await send('kopi 25000')
  const confirmCard = panel().locator('input[aria-label="Nama catatan"]').first()
  record('transaksi', 'kartu konfirmasi transaksi muncul dari chat', (await confirmCard.count()) > 0)
  if (await confirmCard.count()) {
    const nameValue = await confirmCard.inputValue()
    if (!nameValue.trim()) await confirmCard.fill(NOTE)
  }
  const catat = panel().getByRole('button', { name: /^Catat$/ }).last()
  await catat.scrollIntoViewIfNeeded().catch(() => {})
  await catat.click()
  await wait(3800)
  const rows = await ledger()
  const aiRow = rows.find(
    (row) => Number(row.amount) === 25_000 && /kopi/i.test(row.note ?? '') && row.type === 'expense',
  )
  record('transaksi', 'baris pengeluaran Rp 25.000 masuk tabel ledger_rows', Boolean(aiRow) && rows.length > beforeLedger, JSON.stringify(aiRow ?? null))
  record('transaksi', 'tanggal baris = tanggal lokal hari ini', aiRow?.date === todayJakarta, `${aiRow?.date} vs ${todayJakarta}`)

  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await wait(1600)
  record('transaksi', 'catatan AI tampil di Transaksi Terbaru', /kopi/i.test(await screen()) && /25\.000/.test(await screen()))

  /* ══ 4. KUOTA AI KUMULATIF & TAHAN RELOAD ════════════════════════════════ */
  const usageAfter = await aiUsage('chat')
  const callsAfter = Number(usageAfter?.calls_used ?? 0)
  record('kuota', 'ai_usage bertambah kumulatif di server (≥3 panggilan chat)', callsAfter >= usageStart + 3 && usageAfter?.month_key === monthKey, `${usageStart} → ${callsAfter} · ${usageAfter?.month_key}`)

  await openPanel()
  const gaugeBefore = await panelText()
  const pctBefore = Number((gaugeBefore.match(/(\d+)% sisa/) ?? [])[1] ?? 100)
  record('kuota', 'gauge Bahan Bakar AI tidak lagi 100% setelah panggilan', pctBefore < 100, `${pctBefore}% sisa`)

  await page.reload({ waitUntil: 'networkidle' })
  await wait(2200)
  const usageReloaded = await aiUsage('chat')
  record('kuota', 'ai_usage tidak kembali ke nol setelah reload', Number(usageReloaded?.calls_used ?? 0) === callsAfter, `${usageReloaded?.calls_used}`)
  await openPanel()
  const gaugeAfter = await panelText()
  const pctAfter = Number((gaugeAfter.match(/(\d+)% sisa/) ?? [])[1] ?? 100)
  record('kuota', 'gauge setelah reload sama (tidak kembali 100%)', pctAfter === pctBefore && pctAfter < 100, `${pctBefore}% → ${pctAfter}%`)
  await page.screenshot({ path: path.join(SHOTS, 'ai-minca.png'), fullPage: true })
} catch (error) {
  record('alur', 'skrip berjalan sampai selesai', false, String(error).slice(0, 500))
  await page.screenshot({ path: path.join(SHOTS, 'ai-failure.png'), fullPage: true }).catch(() => {})
} finally {
  await context.close()
  await browser.close()
  const removed = await deleteUserByEmail(USER.email)
  record('bersih-bersih', 'akun uji AI terhapus', removed)
}

const failed = results.filter((row) => !row.ok)
log(`\nRingkasan ai-flow: ${results.length - failed.length}/${results.length} lulus · ${failed.length} gagal`)
fs.writeFileSync('qa-ai-report.json', JSON.stringify(results, null, 2))
if (failed.length) {
  log('\nGagal:')
  for (const row of failed) log(`  ✗ [${row.area}] ${row.name} — ${row.detail}`)
  process.exit(1)
}
