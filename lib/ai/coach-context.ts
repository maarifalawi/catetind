import { mentionsWordLoose } from './coach-guard'
import { computeDailyHud } from '@/lib/data/budget'
import { cashTotal, getMoneySnapshot, recordedTransactions, walletAccounts } from '@/lib/money/store'
import { getFundsSnapshot, liveFunds } from '@/lib/money/funds-store'
import { getWealthSnapshot } from '@/lib/money/wealth-store'

/* ── RINGKASAN DATA NYATA UNTUK AI COACH (paket 65 · Tugas D) ────────────────
   Akar masalah yang ditutup: `/api/ai/text` memanggil model TANPA ringkasan data
   user, sementara prompt sistem menulis "kamu menerima ringkasan data user (...)
   sisa jatah harian" — jadi model MENGARANG angka. Modul ini menyusun ringkasan
   dari DATA STORE yang nyata (bukan konstanta), mengirimnya ke server, dan
   dipakai juga untuk sapaan pembuka + jaring aman aturan lokal.

   Fungsi PURE (tanpa store) ada di atas agar bisa diuji tanpa browser; satu
   kolektor `collectCoachSummary()` membaca store yang sama dengan halaman. */

/** ringkasan angka NYATA yang boleh disebut AI (di luar ini AI DILARANG mengarang) */
export interface CoachDataSummary {
  /** label bulan berjalan, mis. "Oktober 2026" */
  monthLabel: string
  incomeThisMonth: number
  expenseThisMonth: number
  /** kategori pengeluaran terbesar bulan ini — `null` kalau belum ada pengeluaran */
  topCategory: string | null
  /** sisa jatah harian dari `computeDailyHud()` — inti kartu "Jatah Hari Ini" */
  remainingToday: number
  walletCount: number
  cashTotal: number
  /** total sisa hutang aktif (dari sisi "hutangku") */
  activeDebtTotal: number
  fundCount: number
}

/** format rupiah kanon untuk teks AI (tanpa desimal) */
export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`
}

/** ringkasan angka → teks yang disisipkan ke prompt sistem (server) */
export function buildCoachContext(summary: CoachDataSummary): string {
  return [
    `Bulan berjalan: ${summary.monthLabel}`,
    `Pemasukan bulan ini: ${formatRupiah(summary.incomeThisMonth)}`,
    `Pengeluaran bulan ini: ${formatRupiah(summary.expenseThisMonth)}`,
    `Kategori pengeluaran teratas: ${summary.topCategory ?? '(belum ada pengeluaran)'}`,
    `Sisa jatah harian: ${formatRupiah(summary.remainingToday)}`,
    `Jumlah dompet: ${summary.walletCount} · Total saldo: ${formatRupiah(summary.cashTotal)}`,
    `Hutang aktif: ${summary.activeDebtTotal > 0 ? formatRupiah(summary.activeDebtTotal) : 'tidak ada'}`,
    `Celengan aktif: ${summary.fundCount}`,
  ].join('\n')
}

/** sapaan pembuka yang memakai angka NYATA (bukan "Rp 150.000" template) */
export function buildWelcomeText(summary: CoachDataSummary): string {
  const parts = [
    `Halo! 👋 Sisa jatah harianmu hari ini ${formatRupiah(summary.remainingToday)}.`,
    `${summary.walletCount} dompet aktif dengan total saldo ${formatRupiah(summary.cashTotal)}.`,
  ]
  if (summary.topCategory) {
    parts.push(`Pengeluaran terbesarmu bulan ini di kategori ${summary.topCategory}.`)
  }
  parts.push('Mau aku bantu catat sesuatu, atau review pengeluaranmu?')
  return parts.join(' ')
}

/**
 * Balasan jujur setelah pencatatan SUKSES dari chat — menyebut angka NYATA
 * SESUDAH baris benar-benar tertulis (sisa jatah harian baru dari
 * `computeDailyHud`), bukan angka lama/karangan.
 */
export function buildRecordedReply(
  name: string,
  amountLabel: string,
  remainingLabel: string,
): string {
  return `Sip, "${name}" senilai ${amountLabel} sudah aku catat ya 🌿 Sisa jatah harianmu sekarang ${remainingLabel}.`
}

/**
 * Deteksi niat MENCATAT transaksi dari pesan bebas (Domain 4B).
 *
 * Bukan klasifikasi model — sengaja aturan sederhana & murah, dan sejak paket 80
 * TOLERAN SALAH KETIK. Akar temuan 8 Okt 2026: user mengetik "makn gacoan 30k",
 * aturan lama cocokkan kata persis (`makan`), jadi pesan itu lolos ke model —
 * dan model (yang memang tidak bisa menulis) menjawab "sudah tercatat", padahal
 * Riwayat kosong.
 *
 * Tiga sinyal, dari yang paling kuat:
 *   1. perintah mencatat ("catet/catat/input") — kartu konfirmasi akan menanyakan
 *      nominalnya kalau user belum menyebutkannya;
 *   2. nominal + kata aksi/nama tempat, dibaca TOLERAN typo ("makn" → "makan",
 *      "gacoan" adalah nama warung);
 *   3. nominal + kalimat pendek yang bukan pertanyaan dan bukan pernyataan status
 *      ("minggu ini aku keluar 200k").
 *
 * Sinyal 3 boleh agak longgar karena jalurnya AMAN: yang muncul hanya kartu
 * konfirmasi yang bisa dibatalkan (`Catat ✓` yang menulis, bukan AI), dan semua
 * nilainya dibaca dari ketikan user — sementara salah tafsir di jalur model
 * harganya klaim palsu.
 */
const RECORD_COMMANDS = ['catet', 'catat', 'catatkan', 'input'] as const

/** kata AKSI belanja/bayar/menabung (toleran salah ketik lewat `mentionsWordLoose`) */
const ACTION_WORDS = [
  'makan',
  'minum',
  'beli',
  'bayar',
  'jajan',
  'ongkos',
  'bensin',
  'parkir',
  'belanja',
  'nabung',
  'menabung',
  'gaji',
  'gajian',
  'transfer',
  'topup',
  'top up',
  'isi',
  'kopi',
  'takeaway',
  'sarapan',
  'laundry',
  'servis',
  'tambal',
  'sewa',
  'nyewa',
  'tiket',
  'nonton',
  'langganan',
  'cicil',
  'cicilan',
  'obat',
  'apotek',
  'listrik',
  'wifi',
  'pulsa',
  'kuota',
  'donasi',
  'sedekah',
  'zakat',
] as const

/**
 * Nama warung/toko yang umum di Indonesia. Dipisah dari `ACTION_WORDS` karena
 * kalimatnya sering TIDAK punya kata kerja: "gacoan 30k", "indomaret 80rb".
 */
const PLACE_WORDS = [
  'warteg',
  'warung',
  'gacoan',
  'mixue',
  'starbucks',
  'kopitiam',
  'resto',
  'restoran',
  'geprek',
  'bakso',
  'nasi',
  'mie',
  'ayam',
  'gofood',
  'grabfood',
  'shopeefood',
  'grab',
  'gojek',
  'ojol',
  'indomaret',
  'alfamart',
  'alfamidi',
  'superindo',
  'tokopedia',
  'shopee',
  'lazada',
] as const

/** kata tanya/perintah analisis — kalimat seperti ini TIDAK dianggap ucapan transaksi */
const QUESTION_MARKERS =
  /\?|\b(apa|apakah|kenapa|kok|mengapa|berapa|brp|gimana|bagaimana|kapan|siapa|dimana|mana|boleh|bisakah|bisa|harus|perlu|menurutmu|jelasin|jelaskan|rekomendasi|saran|tips|prediksi|analisa|analisis|hitung|hitungin|ringkas|rangkum|review|baik|lebih)\b/

/** kata status ledger — "saldo bca 30k" itu pernyataan, bukan transaksi */
const LEDGER_STATUS_WORDS =
  /\b(saldo|saldoku|saldomu|jatah|jatahku|sisa|sisaku|punya|punyaku|uangku|duitku|dompetku|total|target|limit|budget|anggaran|rencana|tabunganku|celenganku)\b/

/** maksimal kata untuk sinyal 3 — kalimat panjang hampir selalu bukan ucapan transaksi */
const MAX_BARE_STATEMENT_WORDS = 6

export function looksLikeTransactionIntent(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (!t) return false

  /* 1. perintah eksplisit — tidak butuh nominal (kartu akan menanyakannya) */
  if (mentionsWordLoose(t, RECORD_COMMANDS)) return true

  const hasAmount = /\d/.test(t)
  if (!hasAmount) return false

  /* 2. nominal + kata aksi / nama tempat (typo ditoleransi) */
  if (mentionsWordLoose(t, ACTION_WORDS) || mentionsWordLoose(t, PLACE_WORDS)) return true

  /* 3. nominal + kalimat pendek yang bukan pertanyaan & bukan status ledger */
  const wordCount = t.split(/\s+/).filter(Boolean).length
  if (wordCount > MAX_BARE_STATEMENT_WORDS) return false
  if (QUESTION_MARKERS.test(t) || LEDGER_STATUS_WORDS.test(t)) return false
  return true
}

/** kolektor ringkasan dari store NYATA (dipakai klien: sapaan, grounding, jaring aman) */
export function collectCoachSummary(now: Date = new Date()): CoachDataSummary {
  const snapshot = getMoneySnapshot()
  const txs = recordedTransactions(snapshot)
  const monthPrefix = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`
  const monthTx = txs.filter((tx) => tx.date.startsWith(monthPrefix))

  const incomeThisMonth = monthTx
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const expenseThisMonth = monthTx
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const byCategory = new Map<string, number>()
  for (const tx of monthTx) {
    if (tx.type !== 'expense') continue
    byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + tx.amount)
  }
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const funds = liveFunds(getFundsSnapshot())
  const hud = computeDailyHud({ sinkingFunds: funds })

  const debts = getWealthSnapshot().debts
  const activeDebtTotal = debts
    .filter((debt) => debt.status === 'active' && debt.direction === 'owed_by_me')
    .reduce((sum, debt) => sum + debt.remaining, 0)

  return {
    monthLabel: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    incomeThisMonth,
    expenseThisMonth,
    topCategory,
    remainingToday: hud.remainingToday,
    walletCount: walletAccounts(snapshot).length,
    cashTotal: cashTotal(snapshot),
    activeDebtTotal,
    fundCount: funds.length,
  }
}
