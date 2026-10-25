import { mentionsWordLoose } from './coach-guard'
import { computeDailyHud, periodWindowForTab, spentInWindow, spentOn } from '@/lib/data/budget'
import { cashTotal, getMoneySnapshot, recordedTransactions, walletAccounts } from '@/lib/money/store'
import { getFundsSnapshot, liveFunds } from '@/lib/money/funds-store'
import { getWealthSnapshot } from '@/lib/money/wealth-store'
import { hasConfiguredIncome, readUserMoneySettings } from '@/lib/user-money-settings'
import { localISODate } from '@/lib/time'

/* ── RINGKASAN DATA NYATA UNTUK AI COACH (paket 65 · Tugas D) ────────────────
   Akar masalah yang ditutup: `/api/ai/text` memanggil model TANPA ringkasan data
   user, sementara prompt sistem menulis "kamu menerima ringkasan data user (...)
   sisa jatah harian" — jadi model MENGARANG angka. Modul ini menyusun ringkasan
   dari DATA STORE yang nyata (bukan konstanta), mengirimnya ke server, dan
   dipakai juga untuk sapaan pembuka + jaring aman aturan lokal.

   Fungsi PURE (tanpa store) ada di atas agar bisa diuji tanpa browser; satu
   kolektor `collectCoachSummary()` membaca store yang sama dengan halaman. */

/**
 * Keadaan jatah harian — SATU-SATUNYA izin bagi AI untuk menyebut nominal jatah.
 *
 * Tiga nilai ini sengaja memetakan PERSIS tiga cabang kartu "Jatah Hari Ini"
 * (`components/catetind/daily-hud-card.tsx`): belum diatur (CTA), jatah ditahan
 * (shortfall), atau angka siap dibaca. Tanpa status ini, ringkasan hanya bisa
 * mengirim angka 0 dan model akan menyebut "Rp 0" sebagai jatah — klaim yang sama
 * palsunya dengan angka demo.
 */
export type CoachAllowanceState = 'ready' | 'not-configured' | 'shortfall'

/** ringkasan angka NYATA yang boleh disebut AI (di luar ini AI DILARANG mengarang) */
export interface CoachDataSummary {
  /** label bulan berjalan, mis. "Oktober 2026" */
  monthLabel: string
  incomeThisMonth: number
  expenseThisMonth: number
  /** kategori pengeluaran terbesar bulan ini — `null` kalau belum ada pengeluaran */
  topCategory: string | null
  /**
   * Sisa jatah harian dari `computeDailyHud()` — inti kartu "Jatah Hari Ini".
   *
   * HANYA bermakna saat `allowanceState === 'ready'`. Akun baru (belum ada
   * pemasukan yang diatur) bernilai 0 di sini, dan 0 itu BUKAN jatah user.
   */
  remainingToday: number
  /** apakah nominal `remainingToday` boleh disebut ke user */
  allowanceState: CoachAllowanceState
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

/**
 * Satu baris jatah harian untuk prompt sistem — TIDAK PERNAH memuat nominal saat
 * angkanya belum ada, jadi model tidak punya angka untuk dikarang/diulang.
 */
function allowanceLine(summary: CoachDataSummary): string {
  if (summary.allowanceState === 'ready') {
    return `Sisa jatah harian: ${formatRupiah(summary.remainingToday)}`
  }
  if (summary.allowanceState === 'shortfall') {
    return 'Sisa jatah harian: DITAHAN (pemasukan bulan ini belum cukup menutup cicilan & celengan) — JANGAN sebut nominal jatah apa pun'
  }
  return 'Sisa jatah harian: BELUM TERSEDIA (pemasukan bulan ini belum diatur user) — JANGAN sebut nominal jatah apa pun'
}

/** ringkasan angka → teks yang disisipkan ke prompt sistem (server) */
export function buildCoachContext(summary: CoachDataSummary): string {
  return [
    `Bulan berjalan: ${summary.monthLabel}`,
    `Pemasukan bulan ini: ${formatRupiah(summary.incomeThisMonth)}`,
    `Pengeluaran bulan ini: ${formatRupiah(summary.expenseThisMonth)}`,
    `Kategori pengeluaran teratas: ${summary.topCategory ?? '(belum ada pengeluaran)'}`,
    allowanceLine(summary),
    `Jumlah dompet: ${summary.walletCount} · Total saldo: ${formatRupiah(summary.cashTotal)}`,
    `Hutang aktif: ${summary.activeDebtTotal > 0 ? formatRupiah(summary.activeDebtTotal) : 'tidak ada'}`,
    `Celengan aktif: ${summary.fundCount}`,
  ].join('\n')
}

/**
 * Sapaan pembuka dari data NYATA — dan TIDAK menyebut angka jatah kalau angkanya
 * belum ada. Akar bug yang ditutup: akun yang baru dibuat (0 dompet, 0 catatan,
 * pemasukan belum diatur) dulu disapa "Sisa jatah harianmu Rp 1.100.000" karena
 * ringkasannya memakai konstanta demo.
 */
export function buildWelcomeText(summary: CoachDataSummary): string {
  const parts = ['Halo! 👋']

  if (summary.allowanceState === 'ready') {
    parts.push(`Sisa jatah harianmu hari ini ${formatRupiah(summary.remainingToday)}.`)
    parts.push(
      `${summary.walletCount} dompet aktif dengan total saldo ${formatRupiah(summary.cashTotal)}.`,
    )
    if (summary.topCategory) {
      parts.push(`Pengeluaran terbesarmu bulan ini di kategori ${summary.topCategory}.`)
    }
    parts.push('Mau aku bantu catat sesuatu, atau review pengeluaranmu?')
    return parts.join(' ')
  }

  parts.push(
    summary.allowanceState === 'shortfall'
      ? 'Jatah harianmu sedang ditahan karena pemasukan bulan ini belum cukup menutup cicilan dan celengan.'
      : 'Jatah harianmu belum bisa dihitung karena pemasukan bulananmu belum diatur di Pengaturan.',
  )
  parts.push(
    summary.walletCount > 0
      ? `Kamu punya ${summary.walletCount} dompet aktif dengan total saldo ${formatRupiah(summary.cashTotal)}.`
      : 'Dompetmu juga masih kosong (0 dompet, saldo Rp 0).',
  )
  parts.push(
    summary.walletCount > 0
      ? 'Isi pemasukan bulanan di Pengaturan supaya aku bisa menghitung jatah harianmu 🌿'
      : 'Yuk mulai dari menu Dompet (bikin dompet pertama) lalu isi pemasukan bulanan di Pengaturan — setelah itu aku bisa bantu hitung jatah harianmu 🌿',
  )
  return parts.join(' ')
}

/**
 * Balasan jujur setelah pencatatan SUKSES dari chat — menyebut angka NYATA
 * SESUDAH baris benar-benar tertulis (sisa jatah harian baru dari
 * `computeDailyHud`), bukan angka lama/karangan.
 *
 * `remainingLabel: null` = jatah harian belum bisa dihitung (akun baru / jatah
 * ditahan) → kalimat sisa jatah DILEWATI, bukan diganti "Rp 0".
 */
export function buildRecordedReply(
  name: string,
  amountLabel: string,
  remainingLabel: string | null,
): string {
  const saved = `Sip, "${name}" senilai ${amountLabel} sudah aku catat ya 🌿`
  return remainingLabel ? `${saved} Sisa jatah harianmu sekarang ${remainingLabel}.` : saved
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
 * konfirmasi yang bisa dibatalkan (`Catat` yang menulis, bukan AI), dan semua
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

  /* ── JATAH HARIAN DARI DATA USER, BUKAN KONSTANTA DEMO ─────────────────────
     BUG YANG DITUTUP: dulu di sini cuma `computeDailyHud({ sinkingFunds: funds })`.
     Semua argumen lain jatuh ke DEFAULT DEMO — pemasukan 7.500.000, cicilan
     800.000, pengeluaran 2.300.000, dan 4 hari tersisa (CURRENT_DAY 27 /
     DAYS_IN_MONTH 30) — sehingga akun yang benar-benar baru (0 dompet, 0 catatan,
     pemasukan belum diatur) disapa AI dengan "Sisa jatah harianmu Rp 1.100.000":
     (7.500.000 − 800.000 − 2.300.000) ÷ 4.

     Sekarang argumennya SAMA dengan kartu "Jatah Hari Ini"
     (`components/catetind/daily-hud-card.tsx`): konfigurasi uang user
     (`lib/user-money-settings.ts`), baris ledger NYATA, dan jendela bulan
     kalender dari tanggal perangkat. Jadi angka yang disebut AI = angka di layar,
     dan akun kosong tidak punya dasar untuk menyebut nominal apa pun. */
  const todayIso = localISODate(now)
  const window = periodWindowForTab('monthly', todayIso)
  const settings = readUserMoneySettings()
  const hud = computeDailyHud({
    monthlyIncome: settings.monthlyIncome,
    totalInstallments: settings.totalInstallments,
    sinkingFunds: funds,
    spent: spentInWindow(txs, window),
    spentToday: spentOn(txs, todayIso),
    window,
  })

  /* Tiga keadaan yang PERSIS memetakan tiga cabang kartu Home: belum diatur
     (CTA), jatah ditahan (shortfall), atau angka siap disebut. Tanpa ini, akun
     kosong akan mengirim `remainingToday: 0` dan model menyebut "Rp 0" seolah
     itu jatah user — sama palsunya dengan angka demo. */
  const allowanceState: CoachAllowanceState = !hasConfiguredIncome(settings)
    ? 'not-configured'
    : hud.shortfall
      ? 'shortfall'
      : 'ready'

  const debts = getWealthSnapshot().debts
  const activeDebtTotal = debts
    .filter((debt) => debt.status === 'active' && debt.direction === 'owed_by_me')
    .reduce((sum, debt) => sum + debt.remaining, 0)

  return {
    monthLabel: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    incomeThisMonth,
    expenseThisMonth,
    topCategory,
    remainingToday: allowanceState === 'ready' ? hud.remainingToday : 0,
    allowanceState,
    walletCount: walletAccounts(snapshot).length,
    cashTotal: cashTotal(snapshot),
    activeDebtTotal,
    fundCount: funds.length,
  }
}
