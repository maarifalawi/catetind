import { describe, expect, it } from 'vitest'
import {
  buildCoachContext,
  buildRecordedReply,
  buildWelcomeText,
  formatRupiah,
  looksLikeTransactionIntent,
  type CoachDataSummary,
} from './coach-context'
import { detectOutOfScope } from './coach-guard'

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

  it('mengenali typo & nama warung — temuan "makn gacoan 30k" (paket 80)', () => {
    /* dulu pesan ini lolos ke model dan dijawab "sudah tercatat" */
    expect(looksLikeTransactionIntent('makn gacoan 30k')).toBe(true)
    expect(looksLikeTransactionIntent('minm 20k')).toBe(true)
    expect(looksLikeTransactionIntent('sarapn 15rb')).toBe(true)
    /* nama tempat tanpa kata kerja: "gacoan 30k" */
    expect(looksLikeTransactionIntent('gacoan 30k')).toBe(true)
    expect(looksLikeTransactionIntent('indomaret 80rb')).toBe(true)
  })

  it('mengenali kalimat pendek ber-nominal yang bukan pertanyaan', () => {
    expect(looksLikeTransactionIntent('minggu ini aku keluar 200k')).toBe(true)
    expect(looksLikeTransactionIntent('tadi jajan 15k')).toBe(true)
  })

  it('TIDAK menganggap pertanyaan/status sebagai transaksi', () => {
    expect(looksLikeTransactionIntent('kok boros ya bulan ini?')).toBe(false)
    expect(looksLikeTransactionIntent('apa itu paylater?')).toBe(false)
    expect(looksLikeTransactionIntent('ceritain kondisi keuangan gue')).toBe(false)
    /* pertanyaan & pernyataan status ledger tetap dijawab model */
    expect(looksLikeTransactionIntent('berapa sisa jatah 50k?')).toBe(false)
    expect(looksLikeTransactionIntent('saldo bca 30k')).toBe(false)
    expect(looksLikeTransactionIntent('kapan gajian?')).toBe(false)
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

/* ── URUTAN DUA PAGAR DI WIDGET (paket 80) ───────────────────────────────────
   Widget memeriksa gerbang konteks LEBIH DULU daripada gerbang niat transaksi.
   Yang dikunci di sini: kalimat transaksi tidak pernah ditolak ("aku cuma
   menemani keuanganmu…" untuk catatan belanja = pengalaman yang membingungkan),
   sementara pertanyaan yang menyebut topik luar konteks tidak pernah berubah jadi
   kartu konfirmasi. */
describe('gerbang konteks vs gerbang niat transaksi', () => {
  it('kalimat transaksi lolos gerbang konteks', () => {
    for (const text of [
      'catet makan gacoan 30k',
      'makn gacoan 30k',
      'beli tiket film 100k',
      'bayar langganan spotify 55k',
    ]) {
      expect(looksLikeTransactionIntent(text)).toBe(true)
      expect(detectOutOfScope(text)).toBe(false)
    }
  })

  it('pertanyaan luar konteks ditolak — walaupun menyebut nominal', () => {
    for (const text of ['resep nasi goreng 30k', 'buatkan script python 100k', 'kamu pakai model apa?']) {
      expect(detectOutOfScope(text)).toBe(true)
    }
  })
})
