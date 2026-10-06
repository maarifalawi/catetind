import { describe, expect, it } from 'vitest'
import {
  buildCoachContext,
  buildRecordedReply,
  buildWelcomeText,
  formatRupiah,
  looksLikeTransactionIntent,
  type CoachDataSummary,
} from './coach-context'

/* ── Test GROUNDING DATA AI (paket 65 · Tugas D) ─────────────────────────────
   Yang dibuktikan: (a) ucapan transaksi dikenali sebagai niat MENCATAT, pertanyaan
   biasa tidak; (b) ringkasan & sapaan memakai ANGKA NYATA dari data yang dikirim,
   bukan template; (c) balasan "sudah dicatat" menyebut angka SESUDAH. */

const SUMMARY: CoachDataSummary = {
  monthLabel: 'Oktober 2026',
  incomeThisMonth: 6_500_000,
  expenseThisMonth: 1_200_000,
  topCategory: 'Makanan',
  remainingToday: 95_000,
  walletCount: 3,
  cashTotal: 1_850_000,
  activeDebtTotal: 1_500_000,
  fundCount: 2,
}

describe('looksLikeTransactionIntent', () => {
  it('mengenali ucapan transaksi (makan 50k, catet ya)', () => {
    expect(looksLikeTransactionIntent('gua habis makan 50k, catet ya')).toBe(true)
    expect(looksLikeTransactionIntent('beli kopi 25rb')).toBe(true)
    expect(looksLikeTransactionIntent('nabung 200 ribu')).toBe(true)
    /* perintah eksplisit tanpa nominal tetap dianggap niat mencatat */
    expect(looksLikeTransactionIntent('catet ya')).toBe(true)
  })

  it('TIDAK menganggap pertanyaan biasa sebagai transaksi', () => {
    expect(looksLikeTransactionIntent('kok boros ya bulan ini?')).toBe(false)
    expect(looksLikeTransactionIntent('apa itu paylater?')).toBe(false)
    expect(looksLikeTransactionIntent('ceritain kondisi keuangan gue')).toBe(false)
    expect(looksLikeTransactionIntent('')).toBe(false)
  })
})

describe('buildCoachContext', () => {
  it('menyisipkan SEMUA angka nyata ke prompt', () => {
    const ctx = buildCoachContext(SUMMARY)
    expect(ctx).toContain(formatRupiah(6_500_000)) // pemasukan
    expect(ctx).toContain(formatRupiah(1_200_000)) // pengeluaran
    expect(ctx).toContain(formatRupiah(95_000)) // sisa jatah harian
    expect(ctx).toContain(formatRupiah(1_850_000)) // total saldo
    expect(ctx).toContain('Makanan') // kategori teratas
    expect(ctx).toContain('3') // jumlah dompet
  })

  it('tanpa kategori: menulis apa adanya, bukan mengarang', () => {
    const ctx = buildCoachContext({ ...SUMMARY, topCategory: null })
    expect(ctx).toContain('(belum ada pengeluaran)')
  })
})

describe('buildWelcomeText', () => {
  it('memakai angka NYATA — tidak ada "Rp 150.000" / "naik 35%" template', () => {
    const welcome = buildWelcomeText(SUMMARY)
    expect(welcome).toContain(formatRupiah(95_000))
    expect(welcome).toContain(formatRupiah(1_850_000))
    expect(welcome).toContain('Makanan')
    expect(welcome).not.toContain('150.000')
    expect(welcome).not.toContain('35%')
    expect(welcome).not.toContain('Kopi minggu ini')
  })
})

describe('buildRecordedReply', () => {
  it('menyebut nominal yang dicatat DAN sisa jatah harian SESUDAH', () => {
    const reply = buildRecordedReply('Makan siang', 'Rp 50.000', 'Rp 45.000')
    expect(reply).toContain('Rp 50.000')
    expect(reply).toContain('Rp 45.000')
  })
})
