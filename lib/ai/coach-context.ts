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
 * Bukan klasifikasi model — sengaja aturan sederhana & murah: butuh SINYAL
 * NOMINAL (angka) DAN kata aksi (makan/beli/bayar/nabung/…), ATAU perintah
 * eksplisit "catat/catet". Pertanyaan biasa ("kok boros ya?", "apa itu paylater?")
 * tidak lolos, jadi tetap dijawab model.
 */
export function looksLikeTransactionIntent(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (!t) return false
  const hasAmount = /\d/.test(t)
  const actionWord =
    /(catet|catat|makan|minum|beli|bayar|jajan|ongkos|bensin|parkir|belanja|nabung|menabung|gaji|transfer|isi|top ?up|kopi|take ?away|sarapan)/.test(
      t,
    )
  const explicitRecord = /(catet|catat)\b/.test(t)
  /* perintah eksplisit tanpa nominal tetap dianggap niat mencatat — kartu
     konfirmasi akan meminta nominalnya (jujur: belum bisa disimpan) */
  return (hasAmount && actionWord) || explicitRecord
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
