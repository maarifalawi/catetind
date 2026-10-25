import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildCoachContext,
  buildRecordedReply,
  buildWelcomeText,
  collectCoachSummary,
  formatRupiah,
  looksLikeTransactionIntent,
  type CoachDataSummary,
} from './coach-context'
import { detectOutOfScope } from './coach-guard'
import { purgeMoneyStore } from '@/lib/money/store'
import { purgeFundsStore } from '@/lib/money/funds-store'
import { purgeWealthStore } from '@/lib/money/wealth-store'
import { purgeUserMoneySettings, saveUserMoneySettings } from '@/lib/user-money-settings'

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
  allowanceState: 'ready',
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

  it('akun baru (jatah belum ada): TIDAK menyebut "Rp 0" sebagai jatah', () => {
    const reply = buildRecordedReply('Makan siang', 'Rp 50.000', null)
    expect(reply).toContain('Rp 50.000')
    expect(reply).not.toContain('jatah')
    expect(reply).not.toContain('Rp 0')
  })
})

/* ── AKUN BARU TIDAK BOLEH MEWARISI ANGKA DEMO ───────────────────────────────
   Keluhan nyata: akun yang baru dibuat (0 dompet, 0 catatan, pemasukan belum
   diatur) langsung disapa AI "Sisa jatah harianmu Rp 1.100.000". Angka itu
   berasal dari konstanta demo `lib/data/budget.ts`
   ((7.500.000 − 800.000 − 2.300.000) ÷ 4 hari), bukan dari data user. Dua blok
   di bawah mengunci: (1) status jatah menentukan apakah nominal boleh disebut,
   (2) kolektor membaca konfigurasi user + kalender nyata. */
describe('status jatah di prompt & sapaan', () => {
  const EMPTY: CoachDataSummary = {
    monthLabel: 'Oktober 2026',
    incomeThisMonth: 0,
    expenseThisMonth: 0,
    topCategory: null,
    remainingToday: 0,
    allowanceState: 'not-configured',
    walletCount: 0,
    cashTotal: 0,
    activeDebtTotal: 0,
    fundCount: 0,
  }

  it('belum diatur: prompt TIDAK memuat nominal jatah, sapaan jujur', () => {
    const ctx = buildCoachContext(EMPTY)
    expect(ctx).toContain('Sisa jatah harian: BELUM TERSEDIA')
    expect(ctx).not.toContain('Sisa jatah harian: Rp')
    expect(ctx).not.toContain('1.100.000')

    const welcome = buildWelcomeText(EMPTY)
    expect(welcome).not.toContain('Sisa jatah harianmu hari ini')
    expect(welcome).not.toContain('1.100.000')
    expect(welcome).toContain('belum bisa dihitung')
    expect(welcome).toContain('Dompetmu juga masih kosong')
  })

  it('jatah ditahan: tidak menyebut Rp 0 seolah itu jatah', () => {
    const shortfall: CoachDataSummary = {
      ...EMPTY,
      allowanceState: 'shortfall',
      walletCount: 2,
      cashTotal: 400_000,
    }
    expect(buildCoachContext(shortfall)).toContain('Sisa jatah harian: DITAHAN')
    expect(buildCoachContext(shortfall)).not.toContain('Sisa jatah harian: Rp')

    const welcome = buildWelcomeText(shortfall)
    expect(welcome).toContain('sedang ditahan')
    expect(welcome).not.toContain('Rp 0')
  })
})

describe('collectCoachSummary — angka dari data user, bukan konstanta demo', () => {
  beforeEach(() => {
    purgeMoneyStore()
    purgeFundsStore()
    purgeWealthStore()
    purgeUserMoneySettings()
  })

  it('akun kosong: not-configured, 0 dompet, sapaan tanpa nominal jatah', () => {
    const summary = collectCoachSummary(new Date('2026-10-25T10:00:00'))
    expect(summary.allowanceState).toBe('not-configured')
    expect(summary.remainingToday).toBe(0)
    expect(summary.walletCount).toBe(0)
    expect(summary.cashTotal).toBe(0)
    expect(summary.incomeThisMonth).toBe(0)
    expect(summary.expenseThisMonth).toBe(0)
    expect(summary.fundCount).toBe(0)

    const welcome = buildWelcomeText(summary)
    expect(welcome).not.toContain('1.100.000')
    expect(welcome).not.toContain('Sisa jatah harianmu hari ini')

    const ctx = buildCoachContext(summary)
    expect(ctx).not.toContain('Sisa jatah harian: Rp')
    expect(ctx).not.toContain('1.100.000')
  })

  it('pemasukan diatur: angka = konfigurasi user ÷ sisa hari KALENDER nyata', () => {
    saveUserMoneySettings({ monthlyIncome: 7_500_000, totalInstallments: 800_000 })
    /* 25 Okt 2026: 31 hari, sisa 7 hari → (7,5jt − 800rb) ÷ 7 = 957.142.
       Angka demo lama (CURRENT_DAY 27 / DAYS_IN_MONTH 30) adalah 1.100.000 —
       kalau angka itu muncul lagi, ringkasan masih membaca konstanta. */
    const summary = collectCoachSummary(new Date('2026-10-25T10:00:00'))
    expect(summary.allowanceState).toBe('ready')
    expect(summary.remainingToday).toBe(Math.floor(6_700_000 / 7))
    expect(summary.remainingToday).not.toBe(1_100_000)
    expect(buildWelcomeText(summary)).toContain(formatRupiah(Math.floor(6_700_000 / 7)))
    expect(buildCoachContext(summary)).toContain(formatRupiah(Math.floor(6_700_000 / 7)))
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
