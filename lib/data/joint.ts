import { MASKED_AMOUNT, UNDO_WINDOW_MS, shiftISODate } from './history'
import {
  PRIVATE_EXPENSE_POLICY,
  RUPIAH_EPSILON,
  hiddenPrivateBurden,
  isHiddenFrom,
  isTreatShares,
  ledgerTotals,
  sharesOf,
  withinMonth,
  type HiddenPrivateBurden,
  type LedgerTotals,
  type LedgerTx,
  type PrivateExpensePolicy,
  type SplitSpec,
} from './joint-ledger'
import { formatIDR } from '../wallets'

/* ── Joint Wallet (/app/joint) — PRD Domain 2D ───────────────────────────────
   "Multiplayer mode" CatetInd: satu dompet untuk dua orang (pasangan serius /
   menikah). Modul ini SENGAJA murni data + fungsi hitung (tanpa React) supaya:

   1. Settlement (siapa bayar lebih banyak, siapa harus transfer) bisa diuji
      tanpa render — sama seperti `lib/data/history.ts`.
   2. Semua angka yang dipakai Balance Scale, stats row, dan timeline berasal
      dari SATU sumber, jadi tidak ada nominal yang berbeda antar-section.

   MODEL AKUNTANSI (audit fintech #1–#3) — baca ini dulu sebelum ubah rumus:
   • Dompet ini SHARED LEDGER, bukan rekening bersama. Uang TIDAK dikumpulkan
     di satu tempat: tiap orang mengeluarkan dari kantongnya sendiri, lalu
     dihitung impas saat settle. Karena itu `JointWallet` sengaja TIDAK punya
     field saldo — "saldo bersama" adalah angka fiktif (audit #1).
   • `paidBy()`        → uang yang benar-benar keluar dari kantong satu orang
     untuk SELURUH catatan (traktiran & transaksi privat ikut). Dipakai hero
     "Total Pengeluaran Bersama" + Card Stats, supaya angka di kartu bisa
     ditelusuri ke jumlah catatan di timeline.
   • `weighedPaidBy()` → angka yang DITIMBANG timbangan: HANYA pengeluaran
     patungan (Bagi Rata / Persentase / Nominal Custom). Traktiran
     ("Yang Ini Gue Yang Bayar" = 100% ditanggung sendiri, bukan utang ke
     pasangan) DIKELUARKAN dari timbangan (audit #2), sedangkan nominal
     transaksi 🔒 Privat TETAP dihitung walau itemnya disembunyikan dari
     pasangan (audit #3). Traktiran dideteksi dari PORSI (ada pihak yang
     porsinya 0), bukan dari nama mode.
   • `myNet` / `partnerNet` → `bayar − kewajiban`, dihitung mesin ledger
     (`lib/data/joint-ledger.ts`). Arah & nominal transfer HANYA boleh dibaca
     dari sini: `net > 0` = berhak menerima, `net < 0` = harus transfer
     (audit fintech #4 — split 60/40 wajib memengaruhi angka). Dengan model ini
     Σ net selalu 0 dan Σ porsi per transaksi selalu = nominal transaksi.
   • `paidByUserId` → kantong yang keluar uang, terpisah dari `userId` (pembuat
     catatan). Tanpa pemisahan ini, catatan yang ditulis atas nama pasangan
     selalu terhitung sebagai pengeluaran pencatat.
   • `month` → settlement disaring per bulan (`JOINT_MONTH_KEY`). Sebelumnya
     pembacaannya kumulatif selamanya, padahal copy-nya menjanjikan reset
     "mulai dari nol" tiap bulan.

   Waktu: JOINT_TODAY_ISO dipakai sebagai "hari ini" (konstan) — pola yang sama
   dengan halaman Tagihan / Kekayaan — supaya render server & client identik
   (label "Hari ini"/"Kemarin" deterministik, bebas hydration mismatch). */

/* ── SAKLAR DEMO (env-gate · paket 42) ──────────────────────────────────────
   Sebelum paket 42 kelima saklar di bawah ini `true` keras: kalau di-ship,
   SETIAP user melihat rekap bulanan setiap hari, "transaksi baru dari partner"
   palsu, dan rekap mingguan di hari Selasa. Sekarang semuanya membaca
   `DEMO_MODE` (`lib/demo.ts` → `NEXT_PUBLIC_DEMO=1`), jadi build produksi
   otomatis kembali ke perilaku jujur:

     · DEMO_PARTNER_JOINED=false  → halaman berubah jadi flow "Ajak Pasangan" (Section 8)
     · DEMO_FORCE_*_RECAP=false   → banner rekap hanya muncul di jendela aslinya
     · DEMO_REALTIME_MOCK=false   → tidak ada transaksi partner yang "muncul sendiri"

   Untuk review desain: jalankan dev dengan `NEXT_PUBLIC_DEMO=1` (lihat
   `lib/demo.ts`), jangan mengubah nilai di file ini per-saklar lagi — dulu
   itulah cara dua rilis berbeda cerita tentang perilaku produksi. */
import { DEMO_MODE } from '../demo'

/** false → seluruh halaman berubah jadi flow "Ajak Pasangan" (Section 8) */
export const DEMO_PARTNER_JOINED = DEMO_MODE
/** paksa banner rekap mingguan tampil (produksi: hanya hari Minggu).
 *  Kalau rekap BULANAN juga aktif, banner mingguan disembunyikan —
 *  hierarki audit #8 lewat `recapBannerVisibility()`. */
export const DEMO_FORCE_WEEKLY_RECAP = DEMO_MODE
/** paksa banner rekap bulanan tampil (produksi: hanya tanggal 28–31).
 *  Set false kalau mau mereview banner mingguan sendirian. */
export const DEMO_FORCE_MONTHLY_RECAP = DEMO_MODE
/** simulasi transaksi baru dari partner masuk via "Supabase Realtime" (5C) */
export const DEMO_REALTIME_MOCK = DEMO_MODE
/** tampilkan overlay selebrasi "partner baru gabung" saat halaman dibuka (8C).
 *  Saklar ini MEMANG hanya untuk review desain, jadi tidak ikut `DEMO_MODE`:
 *  ia tetap mati di kedua mode dan dinyalakan manual kalau sedang ditinjau. */
export const DEMO_JOINED_CELEBRATION = false

/** "hari ini" versi DATA SEED — jangkar DEFAULT untuk render server & test.
 *
 *  PAKET 57: layar /joint mengirim tanggal perangkat (`useTodayISO()` di
 *  `joint-timeline.tsx`) untuk label "Hari ini"/"Kemarin". Konstanta ini tetap
 *  dipakai untuk data seed & kunci bulan settlement (`JOINT_MONTH_KEY`), yang
 *  memang harus stabil: catatan bersama contoh hidup di September 2026. */
export const JOINT_TODAY_ISO = '2026-09-25'
/** sehari sebelum `JOINT_TODAY_ISO` — dipakai label "Kemarin" versi seed */
const JOINT_YESTERDAY_ISO = '2026-09-24'

export type JointSplitType = 'equal' | 'percentage' | 'nominal' | 'single_payer'

/** identitas satu orang di dompet bersama (mock — nanti dari profil user) */
export type JointPerson = {
  id: string
  name: string
  /** emoji avatar */
  avatar: string
  /** kelas tint chip avatar */
  tint: string
  /** kelas titik penghubung timeline (menempel garis tengah) */
  dot: string
  /** kelas rel kiri saat timeline jadi satu kolom (mobile) */
  rail: string
}

export type JointTransaction = {
  id: string
  /** PEMBUAT catatan (dipakai untuk privasi & "siapa yang mengetik") */
  userId: string
  /**
   * KANTONG yang keluar uang (`audit fintech #4`).
   *
   * Dulu utang disimpulkan dari `userId`, padahal itu pembuat catatan — jadi
   * transaksi yang Dany talangi tetap tercatat sebagai pengeluaran Jon dan
   * timbangan bias ke arah pencatat. Sekarang pembayar eksplisit; kalau kosong
   * (data lama) dianggap sama dengan `userId`.
   */
  paidByUserId?: string
  description: string
  amount: number
  category: string
  /** tanggal lokal `YYYY-MM-DD` */
  date: string
  /** jam lokal `HH:MM` */
  time: string
  /**
   * Bentuk pembagian KANONIK (`SplitSpec` dari mesin ledger). Sejak Stage 2
   * inilah satu-satunya bentuk yang ditulis UI, sehingga persen (60) dan
   * rupiah (60.000) tidak lagi bisa menempati field yang sama seperti pada
   * `splits` di bawah — ambiguitas itu sudah ditutup di layer ledger, dan
   * sekarang ditutup juga di layar.
   */
  split?: SplitSpec
  /** @deprecated jalur MIGRASI data lama (seed & test) saja. Tidak ada
   *  komponen yang boleh membacanya langsung — pakai `splitSpecOf(tx)`. */
  splitType?: JointSplitType
  /** mode 'percentage' → persen per user (total 100) · mode 'nominal' → rupiah per user */
  splits?: Record<string, number>
  /** mode 'single_payer' → user yang menanggung 100% */
  payerId?: string
  /** true = detail itemnya cuma kelihatan oleh pembuatnya (Domain 2D.4).
   *  NOMINALNYA tetap ikut hitungan timbangan bersama (audit fintech #3) */
  isPrivate?: boolean
  /** pemilik transaksi privat */
  privateForUser?: string
  /**
   * true = baris SETTLEMENT (transfer penyelesaian bulan), bukan pengeluaran.
   * Uangnya memang pindah kantong — jadi lapisan net (`ledgerTotals`) WAJIB
   * membacanya supaya utangnya benar-benar lunas — tapi ia tidak menambah
   * "pengeluaran bersama", jadi lapisan pengeluaran (`paidBy`) mengabaikannya.
   */
  isSettlement?: boolean
  /** true = baris PEMBUKA bulan: sisa bulan lalu yang dibawa (Stage 2 #5) */
  isOpening?: boolean
  /** metode transfer di baris settlement (BCA/GoPay/Cash) */
  settlementMethod?: string
  /** baru masuk dari partner (mock Realtime) → animasi slide-in + badge "Baru" */
  justArrived?: boolean
}

/** kategori penanda transaksi privat — dipakai bersama oleh rincian kategori
 *  dan label timeline supaya nama item privat tidak pernah bocor (2D.4) */
export const PRIVATE_CATEGORY = '🔒'

/** toast setelah transaksi bareng masuk timeline.
 *  Paket 33: panel input tidak lagi menembak toast sukses sendiri (ia tidak tahu
 *  catatannya tersimpan atau belum) — pemilik datanya yang mengabarkan. */
export const JOINT_ADDED_TOAST = 'Catatan bareng tersimpan 💚'

/** deskripsi cadangan saat catatan bareng disimpan tanpa catatan (Section 9).
 *  Dipakai form DAN store (`addJointTransaction`) supaya tidak ada dua versi
 *  kalimat untuk keadaan yang sama. */
export const JOINT_DEFAULT_DESCRIPTION = 'Pengeluaran Bareng'

/** kategori cadangan catatan bareng saat user belum memilih kategori
 *  (paket 54 memindahkan pemilih kategori ke user; sebelum itu nilainya tetap). */
export const JOINT_DEFAULT_CATEGORY = 'Lainnya'

export type JointWallet = {
  id: string
  name: string
  /** tanggal dompet bersama dibuat (`YYYY-MM-DD`) */
  createdAt: string
  /**
   * true = kantong ini benar-benar DIBUAT user (paket 61.3).
   *
   * Tanpa bendera ini, dua keadaan yang sangat berbeda tampak sama: karena
   * `INITIAL_JOINT_WALLET` sudah punya nama ("Dompet Kita 💚"), halaman tidak
   * bisa membedakan "belum ada kantong" dari "kantong ada, pasangan belum
   * gabung" — padahal langkah yang harus dilakukan user berbeda. Kantong seed
   * tidak punya bendera ini; `createJointPocket()` yang memasangnya.
   */
  created?: boolean
}

/** label + hint tiap mode pembagian di Split Bill Sheet (Section 6A) */
export const SPLIT_MODES: { id: JointSplitType; label: string; hint: string }[] = [
  { id: 'equal', label: 'Bagi Rata', hint: '50 / 50 — paling sering dipakai' },
  { id: 'percentage', label: 'Persentase', hint: 'Geser slider, sisi lain ikut menyesuaikan' },
  { id: 'nominal', label: 'Nominal Custom', hint: 'Isi satu sisi, sisanya dihitung otomatis' },
  { id: 'single_payer', label: 'Yang Ini Gue Yang Bayar', hint: '100% ditanggung satu orang' },
]

/** quick-pick persentase (Section 6A) */
export const PERCENT_PRESETS = [
  { me: 60, partner: 40 },
  { me: 70, partner: 30 },
  { me: 80, partner: 20 },
] as const

/* ── IDENTITAS ───────────────────────────────────────────────────────────── */
/* Tint dua orang sengaja diambil dari palet status HUD (sage #b5b987 &
   amber #ffb885) supaya warna orang = bahasa warna CatetInd, bukan warna baru. */
export const JOINT_ME: JointPerson = {
  id: 'user_a',
  name: 'Jon',
  avatar: '🧑',
  tint: 'bg-hud-sage/25 text-[#000000] ring-hud-sage/50',
  dot: 'bg-hud-sage ring-[#ffffff]',
  rail: 'border-hud-sage',
}

export const JOINT_PARTNER: JointPerson = {
  id: 'user_b',
  name: 'Dany',
  avatar: '👩',
  tint: 'bg-hud-amber/25 text-[#b89191] ring-hud-amber/50',
  dot: 'bg-hud-amber ring-[#ffffff]',
  rail: 'border-hud-amber',
}

/** dompet bersama default — nama bisa diganti (editable on tap, Section 2).
 *  TIDAK ada `balance` di sini: dompet ini BUKU BESAR bersama, bukan rekening
 *  berisi uang (audit fintech #1 — "saldo bersama" itu angka fiktif). */
export const INITIAL_JOINT_WALLET: JointWallet = {
  id: 'joint_1',
  name: 'Dompet Kita 💚',
  createdAt: '2026-07-15',
}

/* ── TRANSAKSI (mock) ────────────────────────────────────────────────────── */
/* Urutan sumber sengaja TIDAK berurut waktu: pengurutan dikerjakan
   `groupJointTransactions()` supaya satu tempat saja yang tahu aturan urut. */
export const INITIAL_JOINT_TRANSACTIONS: JointTransaction[] = [
  {
    id: '1',
    userId: JOINT_ME.id,
    description: 'Groceries Superindo',
    amount: 285000,
    category: 'Makanan',
    date: JOINT_TODAY_ISO,
    time: '14:32',
    splitType: 'equal',
  },
  {
    id: '2',
    userId: JOINT_PARTNER.id,
    description: 'Listrik PLN September',
    amount: 450000,
    category: 'Tagihan',
    date: JOINT_TODAY_ISO,
    time: '10:15',
    splitType: 'equal',
  },
  {
    id: '3',
    userId: JOINT_ME.id,
    description: 'Makan malam anniversary',
    amount: 380000,
    category: 'Makanan',
    date: JOINT_YESTERDAY_ISO,
    time: '19:45',
    splitType: 'single_payer',
    payerId: JOINT_ME.id,
  },
  {
    id: '4',
    userId: JOINT_PARTNER.id,
    description: 'Pengeluaran Privat Partner',
    amount: 150000,
    category: '🔒',
    date: JOINT_YESTERDAY_ISO,
    time: '16:00',
    splitType: 'equal',
    isPrivate: true,
    privateForUser: JOINT_PARTNER.id,
  },
  {
    id: '5',
    userId: JOINT_ME.id,
    description: 'WiFi IndiHome',
    amount: 350000,
    category: 'Tagihan',
    date: '2026-09-23',
    time: '09:00',
    splitType: 'percentage',
    splits: { [JOINT_ME.id]: 60, [JOINT_PARTNER.id]: 40 },
  },
  {
    id: '6',
    userId: JOINT_PARTNER.id,
    description: 'Bensin motor',
    amount: 50000,
    category: 'Transportasi',
    date: '2026-09-23',
    time: '08:30',
    splitType: 'equal',
  },
  {
    id: '7',
    userId: JOINT_ME.id,
    description: 'Groceries Alfamart',
    amount: 120000,
    category: 'Makanan',
    date: '2026-09-22',
    time: '17:00',
    splitType: 'equal',
  },
  {
    id: '8',
    userId: JOINT_PARTNER.id,
    description: 'Sabun & shampoo',
    amount: 85000,
    category: 'Belanja',
    date: '2026-09-22',
    time: '11:20',
    splitType: 'equal',
  },
]

/* ── MOCK SUPABASE REALTIME (Section 5C) ─────────────────────────────────── */
/** jeda munculnya indikator "Dany sedang mencatat..." setelah halaman dibuka */
export const REALTIME_TYPING_DELAY = 2600
/** jeda transaksi partner benar-benar masuk (spec: ~5 detik) */
export const REALTIME_ARRIVAL_DELAY = 5000
/** transaksi yang "datang" dari partner — nominal & copy persis spec Section 5C */
export const REALTIME_ARRIVAL: JointTransaction = {
  id: 'rt-1',
  userId: JOINT_PARTNER.id,
  description: 'Listrik PLN',
  amount: 450000,
  category: 'Tagihan',
  date: JOINT_TODAY_ISO,
  time: '21:07',
  splitType: 'equal',
  justArrived: true,
}

/* ── REKAP MINGGUAN & BULANAN (Section 10) ───────────────────────────────── */
export const JOINT_WEEKLY = {
  /** total pengeluaran bersama 7 hari terakhir (mock) */
  total: 728000,
  /** dibanding minggu lalu (negatif = lebih hemat) */
  trendPct: -12,
  /** jumlah catatan per orang — dipakai copy "paling rajin catat" */
  counts: { [JOINT_ME.id]: 4, [JOINT_PARTNER.id]: 5 } as Record<string, number>,
}

/** label bulan untuk rekap (mock: September 2026) */
export const JOINT_MONTH_LABEL = 'September 2026'
/** total pengeluaran bersama bulan lalu — pembanding trend di stats row.
 *  Dianotasi `number` supaya perbandingan `=== 0` di UI tetap valid secara tipe. */
export const JOINT_PREV_MONTH_TOTAL: number = 1985000

/* ── HITUNGAN SETTLEMENT (Section 3) ─────────────────────────────────────── */
/** ambang "perlu settle" — di atas ini baru muncul ajakan transfer (kanon 2D.3) */
export const SETTLEMENT_THRESHOLD = 100000

/** ambang banner gaya push "pengeluaran besar" (Section 11: > Rp 500.000) */
export const PUSH_ALERT_THRESHOLD = 500000

/** level keputusan yang dipakai UI untuk memilih copy Balance Scale */
export type SettlementLevel = 'equal' | 'close' | 'settle'

export type SettlementState = {
  /* ── lapisan 1: seluruh catatan (hero + Card Stats + timeline) ─────────── */
  /** semua uang yang keluar dari kantong satu orang bulan ini (traktiran &
   *  privat ikut) — angka di Card Stats */
  myTotalSpent: number
  partnerTotalSpent: number
  /** Total Pengeluaran Bersama bulan ini = jumlah SELURUH catatan (hero) */
  totalSpent: number
  /** porsi tiap orang dari total catatan, persen dibulatkan */
  myPct: number
  partnerPct: number

  /* ── lapisan 2: yang benar-benar naik ke timbangan (patungan saja) ─────── */
  /** pengeluaran patungan satu orang — inilah berat panci timbangan */
  myWeighedSpent: number
  partnerWeighedSpent: number
  /** total yang ditimbang (tanpa traktiran) */
  weighedTotal: number
  /** total traktiran bulan ini — dipakai copy "tidak ikut ditimbang" */
  treatTotal: number
  /** |net| pihak yang nombok kurang = NOMINAL TRANSFER (bukan setengahnya) */
  difference: number
  /** alias `difference` — satu transfer menyelesaikan bulan ini */
  settlementAmount: number
  whoOwes: JointPerson
  whoIsOwed: JointPerson
  /**
   * Kemiringan beam dari angka yang DITIMBANG (audit #2: traktiran tidak boleh
   * menggerakkan palang). Konvensi: positif = panci AKU lebih berat → panci
   * kiri (aku) TURUN. Pihak yang nalangin lebih banyak memang harus lebih
   * rendah — itu hukum berat dasar, bukan pilihan desain (audit #5).
   */
  tiltDeg: number
  /* ── lapisan 3: NET per orang — dasar arah & nominal transfer ────────────
     `paid − kewajiban`. Inilah satu-satunya angka yang menentukan siapa
     mentransfer ke siapa; panci timbangan cuma pajangan nominal. */
  /** > 0 = aku berhak menerima · < 0 = aku harus transfer */
  myNet: number
  partnerNet: number
  /** kewajiban SEHARUSNYA (dibaca dari rasio split, bukan dari kas) */
  myOwed: number
  partnerOwed: number
  level: SettlementLevel
  /** true = bulan ini sudah ditandai settle (scale dikunci rata) */
  settled: boolean
  /** bulan yang dihitung (`YYYY-MM`) — settlement tidak lagi kumulatif */
  month: string
}

/** dua anggota dompet bersama — dipakai mesin ledger sebagai daftar peserta */
export const JOINT_MEMBERS: string[] = [JOINT_ME.id, JOINT_PARTNER.id]

/** bulan default yang dihitung settlement (`YYYY-MM` dari hari ini mock) */
export const JOINT_MONTH_KEY = JOINT_TODAY_ISO.slice(0, 7)

/**
 * `JointTransaction` (bentuk UI) → `LedgerTx` (bentuk akuntansi).
 *
 * Satu-satunya tempat yang tahu pemetaan mode lama → `SplitSpec` baru, jadi
 * tidak ada modul kedua yang bisa menafsirkan ulang arti `splits`.
 */
export function splitSpecOf(tx: JointTransaction): SplitSpec {
  /* Bentuk kanonik dipakai kalau ada; `switch` di bawah cuma JALUR MIGRASI
     data lama (seed & test yang masih menyimpan splitType/splits/payerId).
     Satu tempat ini saja yang tahu arti bentuk lama, jadi tidak ada modul
     kedua yang bisa menafsirkannya berbeda. */
  if (tx.split) return tx.split
  switch (tx.splitType) {
    case 'percentage':
      return {
        type: 'percentage',
        percents: tx.splits ?? { [JOINT_ME.id]: 50, [JOINT_PARTNER.id]: 50 },
      }
    case 'nominal': {
      const mine = tx.splits?.[JOINT_ME.id] ?? Math.round(tx.amount / 2)
      const theirs = tx.splits?.[JOINT_PARTNER.id] ?? tx.amount - Math.round(tx.amount / 2)
      return { type: 'nominal', amounts: { [JOINT_ME.id]: mine, [JOINT_PARTNER.id]: theirs } }
    }
    case 'single_payer':
      return { type: 'single_payer', payerId: tx.payerId ?? tx.userId }
    default:
      return { type: 'equal' }
  }
}

export function toLedgerTx(tx: JointTransaction): LedgerTx {
  return {
    id: tx.id,
    /* kantong yang keluar uang: eksplisit, fallback ke pembuat catatan (data lama) */
    payerId: tx.paidByUserId ?? tx.userId,
    createdByUserId: tx.userId,
    amount: tx.amount,
    split: splitSpecOf(tx),
    date: tx.date,
    isPrivate: tx.isPrivate,
    privateForUser: tx.privateForUser,
  }
}

/**
 * Agregat ledger untuk daftar transaksi UI (opsional disaring per bulan).
 * Dipakai test & halaman yang butuh "siapa berhak menerima berapa".
 *
 * `privatePolicy` ikut diteruskan supaya keputusan produk (`PRIVATE_EXPENSE_POLICY`
 * di `joint-ledger.ts`) berlaku di SELURUH angka halaman ini — bukan cuma di satu
 * tempat yang kebetulan ingat.
 */
export function ledgerTotalsOf(
  transactions: JointTransaction[],
  { month, privatePolicy }: { month?: string; privatePolicy?: PrivateExpensePolicy } = {},
): LedgerTotals {
  const scoped = month ? transactions.filter((tx) => withinMonth(tx.date, month)) : transactions
  return ledgerTotals(
    scoped.map(toLedgerTx),
    JOINT_MEMBERS,
    privatePolicy ? { privatePolicy } : {},
  )
}

/** true = traktiran: porsi salah satu pihak 0 → tidak menimbulkan utang.
 *  Dibaca dari PORSI (bukan dari nama mode), jadi traktiran yang ditulis lewat
 *  mode "Nominal Custom" (sisi pasangan 0) ikut terdeteksi (audit fintech #2). */
export function isTreat(tx: JointTransaction): boolean {
  return isTreatShares(sharesOf(toLedgerTx(tx), JOINT_MEMBERS))
}

/** true = transaksi ini ikut menimbang timbangan settlement.
 *  Traktiran keluar dari timbangan; transaksi privat SELALU masuk (audit #3)
 *  supaya nominalnya tetap dihitung sebagai beban, apa pun mode split-nya —
 *  KECUALI kalau kebijakan produk bilang `'excluded'` (paket 41): baris privat
 *  keluar dari buku besar bersama, jadi tidak menimbulkan utang. */
export function countsForSettlement(
  tx: JointTransaction,
  { privatePolicy = PRIVATE_EXPENSE_POLICY }: { privatePolicy?: PrivateExpensePolicy } = {},
): boolean {
  if (tx.isPrivate && privatePolicy === 'excluded') return false
  return !isTreat(tx) || Boolean(tx.isPrivate)
}

/** uang yang KELUAR DARI KANTONG satu orang untuk seluruh catatan dompet
 *  bersama bulan ini — traktiran & transaksi privat ikut dihitung supaya
 *  angka Card Stats bisa ditelusuri ke jumlah catatan di timeline (audit #3). */
/** kantong yang keluar uang: `paidByUserId` kalau ada, kalau tidak pembuat catatan */
export function pocketOf(tx: JointTransaction): string {
  return tx.paidByUserId ?? tx.userId
}

/** true = baris settlement / pembuka bulan (transfer penyelesaian), BUKAN
 *  pengeluaran. Dipakai bersama oleh lapisan pengeluaran & rincian kategori
 *  supaya "Total Pengeluaran Bersama" tidak ikut membengkak saat user settle. */
export function isSettlementTx(tx: JointTransaction): boolean {
  return Boolean(tx.isSettlement)
}

export function paidBy(transactions: JointTransaction[], userId: string): number {
  return transactions
    .filter((tx) => !isSettlementTx(tx) && pocketOf(tx) === userId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/** Berat panci timbangan satu orang: pengeluaran patungan saja.
 *  Traktiran dikeluarkan (audit #2), nominal privat tetap dihitung (audit #3)
 *  kecuali kebijakan privatnya `'excluded'` (paket 41). */
export function weighedPaidBy(
  transactions: JointTransaction[],
  userId: string,
  { privatePolicy = PRIVATE_EXPENSE_POLICY }: { privatePolicy?: PrivateExpensePolicy } = {},
): number {
  return transactions
    .filter((tx) => !isSettlementTx(tx) && pocketOf(tx) === userId && countsForSettlement(tx, { privatePolicy }))
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/** batasi nilai ke rentang [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Satu-satunya sumber kebenaran untuk Balance Scale, stats row, dan modal
 * settlement. Dua lapisan angka (lihat MODEL AKUNTANSI di kepala file):
 *   • `myTotalSpent`/`partnerTotalSpent`/`totalSpent`  → seluruh catatan
 *     (hero + Card Stats + timeline).
 *   • `myWeighedSpent`/`partnerWeighedSpent`/`difference` → yang benar-benar
 *     ditimbang (patungan saja; traktiran keluar, privat tetap masuk —
 *     kecuali `privatePolicy: 'excluded'`, lihat `joint-ledger.ts`).
 * `settled: true` memaksa scale kembali rata (0°) — dipakai setelah user
 * menekan "Tandai Sudah Settle ✓" supaya animasi pegasnya jalan ke level.
 */
export function computeSettlement(
  transactions: JointTransaction[],
  {
    settled = false,
    month = JOINT_MONTH_KEY,
    privatePolicy = PRIVATE_EXPENSE_POLICY,
  }: { settled?: boolean; month?: string; privatePolicy?: PrivateExpensePolicy } = {},
): SettlementState {
  /* Penyaringan bulan (audit #7): dulu settlement membaca SELURUH catatan
     selamanya sementara copy-nya bilang "bulan depan mulai dari nol". */
  const scoped = transactions.filter((tx) => withinMonth(tx.date, month))

  /* lapisan 1 — seluruh catatan: berapa uang yang keluar dari tiap kantong */
  const myTotalSpent = paidBy(scoped, JOINT_ME.id)
  const partnerTotalSpent = paidBy(scoped, JOINT_PARTNER.id)
  const totalSpent = myTotalSpent + partnerTotalSpent

  /* lapisan 2 — hanya pengeluaran patungan yang naik ke timbangan */
  const myWeighedSpent = weighedPaidBy(scoped, JOINT_ME.id, { privatePolicy })
  const partnerWeighedSpent = weighedPaidBy(scoped, JOINT_PARTNER.id, { privatePolicy })
  const weighedTotal = myWeighedSpent + partnerWeighedSpent
  /* selisih total vs yang ditimbang = traktiran (bukan utang pasangan) */
  const treatTotal = totalSpent - weighedTotal

  /* lapisan 3 — NET: uang yang keluar DIKURANGI porsi yang seharusnya
     ditanggung (dibaca dari rasio split). Inilah angka yang menentukan arah &
     nominal transfer; sebelumnya arah dibaca dari "siapa bayar lebih banyak"
     sehingga split 60/40 tidak berpengaruh sama sekali. */
  const totals = ledgerTotals(scoped.map(toLedgerTx), JOINT_MEMBERS, { privatePolicy })
  const myNet = totals.net[JOINT_ME.id] ?? 0
  const partnerNet = totals.net[JOINT_PARTNER.id] ?? 0

  const difference = Math.abs(myNet)
  const iAmOwed = myNet > 0

  /* spec Section 3: tiltDeg = (net aku − net partner) / total yang ditimbang × 24,
     dijepit ±12° supaya beda sekecil apa pun tetap terbaca dan beda besar tidak
     bikin beam jungkir. Dihitung dari NET: positif = panci AKU turun (aku
     menalangi lebih dari porsiku / berhak menerima). */
  const rawTilt = weighedTotal === 0 ? 0 : ((myNet - partnerNet) / weighedTotal) * 24
  const tiltDeg = settled ? 0 : clamp(rawTilt, -12, 12)

  const myPct = totalSpent === 0 ? 0 : Math.round((myTotalSpent / totalSpent) * 100)

  return {
    myTotalSpent,
    partnerTotalSpent,
    totalSpent,
    myPct,
    partnerPct: totalSpent === 0 ? 0 : 100 - myPct,
    myWeighedSpent,
    partnerWeighedSpent,
    weighedTotal,
    treatTotal,
    myNet,
    partnerNet,
    myOwed: totals.owed[JOINT_ME.id] ?? 0,
    partnerOwed: totals.owed[JOINT_PARTNER.id] ?? 0,
    difference,
    /* SATU transfer menyelesaikan bulan ini — bukan setengah selisih lagi */
    settlementAmount: difference,
    whoOwes: iAmOwed ? JOINT_PARTNER : JOINT_ME,
    whoIsOwed: iAmOwed ? JOINT_ME : JOINT_PARTNER,
    tiltDeg,
    /* settled dipaksa rata supaya animasi "kembali level" terjadi */
    level:
      settled || difference < RUPIAH_EPSILON
        ? 'equal'
        : difference > SETTLEMENT_THRESHOLD
          ? 'settle'
          : 'close',
    settled,
    month,
  }
}

/**
 * Kanon PRD A7 + audit #6: ajakan settle (banner cokelat + tombol transfer)
 * BARU boleh muncul kalau selisih > Rp100.000. Selama statusnya "Gak perlu
 * settle" (atau sudah ditandai settle) sistem harus diam — dua pesan yang
 * bertabrakan di satu layar bikin user kehilangan kepercayaan ke angkanya.
 */
export function shouldPromptSettlement(settlement: SettlementState): boolean {
  return !settlement.settled && settlement.level === 'settle'
}

/* ── JENDELA REKAP (Section 10) ──────────────────────────────────────────── */
/** produksi: rekap mingguan cuma hari Minggu */
export function isWeeklyRecapDay(day: Date): boolean {
  return day.getDay() === 0
}
/** produksi: rekap bulanan cuma tanggal 28–31 */
export function isMonthlyRecapDay(day: Date): boolean {
  return day.getDate() >= 28
}

/**
 * Banner rekap mana yang boleh tampil (audit #8). Di produksi `forceMonthly` &
 * `forceWeekly` false → keputusan murni dari tanggal; dua-duanya true = saklar
 * demo. HIERARKI: rekap bulanan menang, rekap mingguan disembunyikan — dua
 * banner raksasa bertumpuk bikin layar penuh notifikasi dan justru bikin
 * keduanya diabaikan user.
 */
export function recapBannerVisibility(
  day: Date,
  { forceMonthly = false, forceWeekly = false }: { forceMonthly?: boolean; forceWeekly?: boolean } = {},
): { monthly: boolean; weekly: boolean } {
  const monthly = forceMonthly || isMonthlyRecapDay(day)
  const weekly = forceWeekly || isWeeklyRecapDay(day)
  return { monthly, weekly: weekly && !monthly }
}

/* ── PENGELOMPOKAN & LABEL ───────────────────────────────────────────────── */

/** singkatan bulan Indonesia — ditulis manual supaya label tanggal deterministik
 *  (tidak bergantung ICU/locale mesin yang merender) */
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** "2026-09-25" → angka-angka tanggalnya tanpa bikin objek Date (bebas timezone) */
function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

/** "Hari ini" · "Kemarin" · "22 Sep" (＋ tahun kalau beda tahun)
 *
 *  `todayIso` = tanggal perangkat yang dikirim layar (paket 57). Kalau kosong,
 *  jatuh ke jangkar seed supaya pemanggil lama & test tetap deterministik —
 *  "Kemarin" dihitung dari jangkar yang dipakai, bukan dari konstanta kedua. */
export function jointDateLabel(iso: string, todayIso: string = JOINT_TODAY_ISO): string {
  const yesterday = shiftISODate(todayIso, -1)
  if (iso === todayIso) return 'Hari ini'
  if (iso === yesterday) return 'Kemarin'
  const { year, month, day } = parseIso(iso)
  const base = `${day} ${MONTHS_SHORT[month - 1]}`
  return year === parseIso(todayIso).year ? base : `${base} ${year}`
}

/** "2026-07-15" → "15 Juli 2026" (dipakai "Bersama sejak ...") */
export function jointDateLong(iso: string): string {
  const { year, month, day } = parseIso(iso)
  return `${day} ${MONTHS_LONG[month - 1]} ${year}`
}

export type JointDayGroup = {
  date: string
  /** label separator yang menyeberangi garis tengah timeline */
  label: string
  items: JointTransaction[]
}

/** urut terbaru dulu (tanggal lalu jam), dikelompokkan per hari.
 *
 *  `todayIso` diteruskan ke `jointDateLabel()` supaya label "Hari ini"/"Kemarin"
 *  memakai tanggal perangkat (paket 57), bukan jangkar seed. */
export function groupJointTransactions(
  transactions: JointTransaction[],
  todayIso: string = JOINT_TODAY_ISO,
): JointDayGroup[] {
  const sorted = [...transactions].sort((a, b) =>
    a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date),
  )

  const groups: JointDayGroup[] = []
  for (const tx of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === tx.date) {
      last.items.push(tx)
      continue
    }
    groups.push({ date: tx.date, label: jointDateLabel(tx.date, todayIso), items: [tx] })
  }
  return groups
}

/** nominal ikut toggle privasi halaman */
export function moneyLabel(value: number, masked: boolean): string {
  return masked ? MASKED_AMOUNT : formatIDR(value)
}

/** Label pembagian kecil di tiap kartu timeline: "Bagi rata" · "60/40" · "Jon yang bayar".
 *  Sejak Stage 2 label ini SELALU dibaca dari `SplitSpec` (`splitSpecOf`), jadi
 *  tidak ada lagi pembacaan `tx.splits` — persen dan rupiah hidup di field yang
 *  berbeda dan tidak mungkin lagi tertukar di layar. */
export function splitLabel(tx: JointTransaction, masked = false): string {
  /* baris settlement bukan pembagian: labelnya menyebut metode transfernya */
  if (tx.isSettlement) {
    return tx.settlementMethod ? `${SETTLE_TRANSFER_PREFIX}${tx.settlementMethod}` : SETTLE_ENTRY_LABEL
  }
  return splitSpecLabel(splitSpecOf(tx), JOINT_ME, JOINT_PARTNER, masked)
}

/**
 * Label satu `SplitSpec` tanpa perlu `JointTransaction` — dipakai form tambah
 * ("Split: …") dan timeline, jadi keduanya bicara bahasa yang sama.
 */
export function splitSpecLabel(
  split: SplitSpec,
  me: JointPerson,
  partner: JointPerson,
  masked = false,
): string {
  switch (split.type) {
    case 'percentage': {
      const mine = split.percents[me.id] ?? 50
      return `${mine}/${100 - mine}`
    }
    case 'nominal': {
      const mine = split.amounts[me.id] ?? 0
      const theirs = split.amounts[partner.id] ?? 0
      return `${moneyLabel(mine, masked)} · ${moneyLabel(theirs, masked)}`
    }
    case 'single_payer':
      return split.payerId === partner.id ? `${partner.name} yang bayar` : `${me.name} yang bayar`
    default:
      return 'Bagi rata'
  }
}

export type JointCategorySlice = { category: string; amount: number; pct: number }

/**
 * Rincian per kategori untuk kartu stats yang di-tap (Section 4).
 * `userId` kosong = seluruh dompet.
 *
 * Audit fintech #3: nominal transaksi privat IKUT dijumlahkan (dulu dibuang,
 * jadi Σ rincian ≠ angka di kartunya) — tapi identitas itemnya tetap rahasia.
 *
 * PAKET 41 menambal kebocoran yang tersisa (audit Stage 4 #6): irisan privat
 * milik ORANG LAIN dihapus dari rincian bersama. Dulu nominalnya tampil sebagai
 * satu irisan "🔒 Privat Rp 150.000" — pasangan bisa membaca nominal yang
 * seharusnya rahasia, sementara ia tetap ditagih separuhnya tanpa tahu
 * alasannya. Sekarang: nominal privat milik viewer tetap tampil sebagai satu
 * irisan anonim, nominal milik orang lain tidak tampil sama sekali, dan beban
 * yang ditanggung viewer diungkapkan terpisah lewat `privateBurdenCopy()`
 * (`hiddenPrivateBurdenOf()`).
 */
export function categoryBreakdown(
  transactions: JointTransaction[],
  userId?: string,
  { viewerId = JOINT_ME.id }: { viewerId?: string } = {},
): JointCategorySlice[] {
  /* baris settlement bukan pengeluaran → tidak boleh muncul sebagai irisan
     kategori (dulu ini bikin Σ rincian ≠ angka kartu setelah user settle) */
  const scoped = transactions.filter(
    (tx) =>
      !isSettlementTx(tx) &&
      (userId === undefined || tx.userId === userId) &&
      /* catatan privat orang lain: isinya BUKAN hak viewer — sembunyikan total */
      !isHiddenFrom(toLedgerTx(tx), viewerId),
  )
  const total = scoped.reduce((sum, tx) => sum + tx.amount, 0)

  const byCategory = new Map<string, number>()
  for (const tx of scoped) {
    /* privat milik sendiri dinormalkan ke satu kategori anonim: nominalnya
       tetap bisa dilihat pemiliknya, tapi tidak membocorkan nama itemnya */
    const category = tx.isPrivate ? PRIVATE_CATEGORY : tx.category
    byCategory.set(category, (byCategory.get(category) ?? 0) + tx.amount)
  }

  return [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total === 0 ? 0 : Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Beban privat yang harus DIUNGKAPKAN ke viewer: berapa rupiah porsi dia dari
 * catatan privat orang lain yang tidak bisa ia lihat, dan berapa catatannya.
 *
 * Inilah pasangan dari `categoryBreakdown()` yang tidak lagi menampilkan
 * nominal privat: tanpa pengungkapan ini, user ditagih untuk sesuatu yang tidak
 * pernah ia ketahui — persis temuan audit Stage 4 #6.
 */
export function hiddenPrivateBurdenOf(
  transactions: JointTransaction[],
  {
    viewerId = JOINT_ME.id,
    month,
    privatePolicy = PRIVATE_EXPENSE_POLICY,
  }: { viewerId?: string; month?: string; privatePolicy?: PrivateExpensePolicy } = {},
): HiddenPrivateBurden {
  const scoped = month ? transactions.filter((tx) => withinMonth(tx.date, month)) : transactions
  return hiddenPrivateBurden(scoped.map(toLedgerTx), viewerId, JOINT_MEMBERS, { privatePolicy })
}

/**
 * Kalimat pengungkapan di kartu rincian bersama — ikut tersensor saat privasi
 * halaman dinyalakan (nominalnya sama sensitifnya dengan angka lain di layar).
 */
export function privateBurdenCopy(burden: HiddenPrivateBurden, masked: boolean): string {
  if (burden.count === 0) return ''
  const notes = burden.count === 1 ? '1 catatan' : `${burden.count} catatan`
  return `Kamu menanggung ${moneyLabel(burden.amount, masked)} dari ${notes} yang tidak bisa kamu lihat.`
}

/** emoji kecil untuk pill kategori (mock — nanti dari katalog kategori) */
export function categoryEmoji(category: string): string {
  switch (category) {
    case 'Makanan':
      return '🍜'
    case 'Tagihan':
      return '🧾'
    case 'Transportasi':
      return '🛵'
    case 'Belanja':
      return '🧺'
    case PRIVATE_CATEGORY:
      return '🔒'
    case SETTLEMENT_CATEGORY:
      return '🤝'
    default:
      return '💚'
  }
}

/** label kategori untuk rincian: item privat tetap anonim (audit #3) */
export function categoryLabel(category: string): string {
  return category === PRIVATE_CATEGORY ? 'Privat' : category
}

/* ── INVITE PARTNER (Section 8) ────────────────────────────────────────────
   Kode undangan TIDAK lagi konstanta di sini (paket 39). Dulu `INVITE_CODE =
   'A7K2M9'` global ikut ter-bundle ke seluruh halaman dan dipakai semua dompet,
   sementara copy-nya menjanjikan "24 jam, 1x pakai" tanpa ada yang memvalidasi.
   Sekarang kode dibuat per wallet & divalidasi sungguhan di
   `lib/data/joint-invite.ts` + `lib/invite-store.ts`. Yang tinggal di sini cuma
   copy masa berlaku supaya kalimatnya tetap satu sumber. */
/** copy masa berlaku kode — hanya boleh tampil untuk kode yang MEMANG divalidasi 24 jam & 1x pakai */
export const INVITE_VALIDITY_COPY = 'Kode berlaku 24 jam. Cuma bisa dipakai 1x.'

/* ── COPY YANG DIPAKAI BERSAMA ───────────────────────────────────────────── */
/** peringatan saat toggle privasi transaksi dinyalakan (Section 9).
 *  Audit #1 + #3: dompet ini bukan rekening bersama, dan nominal privat tetap
 *  ikut hitungan — jadi copy-nya tidak boleh lagi bilang "saldo berkurang". */
export const PRIVACY_WARNING_COPY =
  'Transaksi ini cuma kamu yang lihat detail itemnya. Pasanganmu tetap lihat nominalnya ikut dihitung di total bersama, tanpa tahu item & kategorinya.'
/** kenapa kategori catatan privat tidak ikut tersimpan (paket 54).
 *  Pemilih kategori di form tambah dipakai bareng semua dompet, jadi user yang
 *  menyalakan 🔒 berhak tahu lebih dulu bahwa pilihannya tidak akan terpakai:
 *  store menulis lambang privasi sebagai kategorinya (`PRIVATE_CATEGORY`), dan
 *  itu memang aturan privasi — bukan bug yang disembunyikan. */
export const PRIVATE_CATEGORY_NOTE =
  'Kategori catatan privat disimpan anonim: di timeline tampil "🔒 Privat" — bahkan buatmu — supaya pasangan nggak bisa nebak isinya dari kategori.'
/** penjelasan aturan timbangan (audit #2 & #3) — dipakai di halaman & modal.
 *  Stage 2: panci menampilkan POSISI BERSIH, jadi copy-nya tidak boleh lagi
 *  bilang "timbangan menimbang pengeluaran patungan" tanpa menyebut net. */
export const SETTLEMENT_SCOPE_COPY =
  'Panci menunjukkan posisi bersih (kewajiban yang sudah dibayar − porsi yang seharusnya) dari pengeluaran patungan. Traktiran tidak ikut ditimbang; nominal transaksi 🔒 Privat tetap dihitung.'
/** versi pendek untuk ruang sempit (di dalam modal rekap) */
export const SETTLEMENT_SCOPE_SHORT =
  'Panci = posisi bersih (bayar − kewajiban) · traktiran tidak ditimbang · nominal 🔒 Privat tetap dihitung.'
/** tooltip transaksi privat milik sendiri (Section 5B) */
export const PRIVATE_OWNER_HINT = 'Transaksi ini disembunyikan dari pasanganmu'
/** pengingat bahwa aplikasi ini cuma mencatat, bukan memindahkan uang */
export const SETTLEMENT_DISCLAIMER =
  'Ini cuma pencatatan, bukan transfer uang asli. Transfernya manual via BCA/GoPay/cash ya 😊'
export const SETTLED_TOAST = 'Settled! Bulan depan mulai dari nol ⚖️💚'

/* ── BAHASA "NET" DI LAYAR (audit fintech Stage 2 #1) ──────────────────────
   Mesin ledger sudah bicara NET (`bayar − kewajiban`) sejak Stage 1, tapi
   panci timbangan & modal rekap masih menampilkan "uang yang keluar dari
   kantong" dan "patungan". Akibatnya satu komponen memakai dua bahasa angka:
   palang dibaca dari net, sedangkan angkanya dari kas — dan user tidak bisa
   menelusuri utangnya. Mulai paket ini SEMUA permukaan memakai NET dengan
   label eksplisit: `+Rp X · berhak menerima` / `-Rp X · harus transfer`.

   Tidak ada satu pun tempat yang boleh menghitung ulang arti net: fungsi di
   bawah ini adalah satu-satunya penerjemahnya. */

/** arti net positif — pihak ini menalangi lebih dari porsinya */
export const NET_RECEIVE_COPY = 'berhak menerima'
/** arti net negatif — pihak ini menalangi kurang dari porsinya */
export const NET_TRANSFER_COPY = 'harus transfer'
/** arti net nol */
export const NET_IMPAS_COPY = 'udah impas'

/** judul blok net di modal rekap */
export const NET_SECTION_TITLE = 'Posisi bersih (bayar − kewajiban)'
/** row "satu transfer menyelesaikan bulan ini" di modal rekap */
export const SETTLE_ONE_TRANSFER_LABEL = 'Satu transfer'
export const SETTLE_ONE_TRANSFER_HINT = 'Satu transfer penuh langsung menyelesaikan bulan ini.'
/** label baris sisa bulan lalu yang dibawa */
export const SETTLE_CARRY_ROW_LABEL = 'Sisa bulan lalu dibawa'

/** `+Rp 25.000` · `-Rp 25.000` · `Rp 0` — nominal net dengan tanda arah.
 *  Tanda minus ditulis ASCII supaya hasilnya sama di semua font mesin. */
export function signedMoneyLabel(value: number, masked: boolean): string {
  const rounded = Math.round(value)
  if (rounded > 0) return `+${moneyLabel(rounded, masked)}`
  if (rounded < 0) return `-${moneyLabel(-rounded, masked)}`
  return moneyLabel(0, masked)
}

/** Label lengkap net (nominal + artinya) — nol nominal negatif yang tampil
 *  tanpa label. Dipakai panci timbangan, aria-label, modal, dan banner. */
export function netPhrase(value: number, masked: boolean): string {
  const rounded = Math.round(value)
  if (rounded === 0) return `${moneyLabel(0, masked)} · ${NET_IMPAS_COPY}`
  return `${signedMoneyLabel(rounded, masked)} · ${rounded > 0 ? NET_RECEIVE_COPY : NET_TRANSFER_COPY}`
}

/** label pendek untuk chip panci yang sempit (tanpa nominal) */
export function netShortLabel(value: number): string {
  const rounded = Math.round(value)
  if (rounded > 0) return NET_RECEIVE_COPY
  if (rounded < 0) return NET_TRANSFER_COPY
  return NET_IMPAS_COPY
}

/** net satu orang dari `SettlementState` (panci/banner butuh net milik orang
 *  yang sedang dibicarakan, bukan selalu net milik "aku") */
export function netOf(settlement: SettlementState, userId: string): number {
  return userId === JOINT_PARTNER.id ? settlement.partnerNet : settlement.myNet
}

/** nama anggota dompet dari id kantong (dompet ini cuma punya dua anggota) */
export function jointNameOf(userId: string): string {
  return userId === JOINT_PARTNER.id ? JOINT_PARTNER.name : JOINT_ME.name
}

/** `'2026-09'` → `'September 2026'` (ditulis manual, bebas locale mesin) */
export function monthLabelOf(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const index = Number(month) - 1
  const label = MONTHS_LONG[index] ?? month
  return `${label} ${year}`
}

/** bulan sebelum `monthKey`: `'2026-09'` → `'2026-08'`, `'2026-01'` → `'2025-12'` */
export function previousMonthKey(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return monthKey
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
}

/* ── SETTLE = ENTRI BUKU BESAR + PENANDA PER BULAN (Stage 2 #5) ────────────
   Dulu `handleSettle` cuma `useState(true)`: tidak ada entri ledger (jadi
   "settled" tidak bisa ditelusuri) dan setelah halaman dibuka ulang nagging
   settle-nya kembali. Sekarang settle menuliskan baris
   `settlement {from, to, amount, method, month}` ke ledger DAN penanda per
   bulan di localStorage (pola `lib/data/monthly-review.ts`).

   Baris settlement TIDAK butuh rumus baru — ia baris ledger biasa:
     bayar = kantong yang mengirim · kewajiban = kantong yang menerima
   → net pengirim naik, net penerima turun, Σ net tetap 0, dan timbangan
   otomatis bilang "impas". Ia cuma ditandai `isSettlement` supaya tidak ikut
   dihitung sebagai pengeluaran bersama.

   Sisa yang belum tertutup (`carryOver`) diposting sebagai baris PEMBUKA
   bulan berikutnya dengan arah dibalik — jadi utangnya benar-benar
   menyeberang bulan, bukan hilang saat penanda bulan berganti. */

/** kategori penanda baris settlement — dipakai label & emoji di timeline */
export const SETTLEMENT_CATEGORY = 'Settle'

/** metode transfer yang bisa dipilih saat menandai settle (mock) */
export const SETTLEMENT_METHODS = ['BCA', 'GoPay', 'Cash'] as const
export type SettlementMethod = (typeof SETTLEMENT_METHODS)[number]
export const DEFAULT_SETTLEMENT_METHOD: SettlementMethod = 'BCA'

/** pertanyaan kecil di atas pemilih metode di modal rekap */
export const SETTLE_METHOD_LABEL = 'Transfernya lewat mana?'

/** label baris settlement di timeline */
export const SETTLE_ENTRY_LABEL = 'Settle ✓'
export const SETTLE_TRANSFER_PREFIX = 'Transfer '

/** pemilih "Siapa yang nalangin?" di form tambah (Stage 2 #3) — mengisi
 *  `paidByUserId`, jadi catatan yang uangnya keluar dari kantong pasangan tidak
 *  lagi tercatat sebagai pengeluaran pencatat. */
export const PAID_BY_LABEL = 'Siapa yang nalangin?'
export const PAID_BY_HINT = 'Uangnya keluar dari kantong siapa — bukan siapa yang mengetik.'
export const PAID_BY_ME_LABEL = 'Aku'

/** jam mock baris settlement — deterministik, pola tanggal/jam mock repo ini */
const SETTLE_ENTRY_TIME = '20:30'

/** satu baris `settlement {from, to, amount, method, month}` yang disimpan per bulan */
export interface JointSettlementRecord {
  /** bulan yang disettle (`YYYY-MM`) */
  month: string
  /** kantong yang mengirim uang (pihak yang tadi berutang) */
  from: string
  /** kantong yang menerima */
  to: string
  /** nominal yang benar-benar ditransfer */
  amount: number
  /** metode transfer yang dipilih user */
  method: SettlementMethod
  /** sisa yang belum tertutup transfer ini (0 pada settle penuh). Kalau > 0,
   *  sisa itu diposting sebagai pembuka bulan berikutnya supaya utangnya tidak
   *  hilang diam-diam saat penanda bulan berganti. */
  carryOver: number
}

/**
 * Baris ledger dari penanda settle. Tanggalnya ditaruh di bulan record supaya
 * net-nya ikut dihitung pada bulan itu, dan id-nya diturunkan dari record —
 * jadi memanggilnya dua kali tidak pernah menggandakan barisnya.
 */
export function buildSettlementEntry(
  record: JointSettlementRecord,
  { date }: { date?: string } = {},
): JointTransaction {
  const iso = date ?? (record.month === JOINT_MONTH_KEY ? JOINT_TODAY_ISO : `${record.month}-01`)
  return {
    id: `settle-${record.month}-${record.from}-${record.to}`,
    userId: record.from,
    paidByUserId: record.from,
    description: `Settle ${monthLabelOf(record.month)} — transfer ke ${jointNameOf(record.to)}`,
    amount: Math.max(0, Math.round(record.amount)),
    category: SETTLEMENT_CATEGORY,
    date: iso,
    time: SETTLE_ENTRY_TIME,
    split: { type: 'single_payer', payerId: record.to },
    isSettlement: true,
    settlementMethod: record.method,
  }
}

/** baris pembuka bulan `month` dari sisa bulan sebelumnya (null = tidak ada sisa) */
export function buildCarryOverEntry(
  previous: JointSettlementRecord,
  month: string,
): JointTransaction | null {
  const carry = Math.max(0, Math.round(previous.carryOver))
  if (carry === 0) return null
  return {
    id: `carry-${previous.month}-${previous.from}-${previous.to}`,
    /* arah DIBALIK dari baris settle: penerima bulan lalu yang menalangi sisa
       itu, jadi utangnya muncul kembali sebagai pembuka di bulan baru */
    userId: previous.to,
    paidByUserId: previous.to,
    description: `Sisa ${monthLabelOf(previous.month)} dibawa ke ${monthLabelOf(month)}`,
    amount: carry,
    category: SETTLEMENT_CATEGORY,
    date: `${month}-01`,
    time: '00:00',
    split: { type: 'single_payer', payerId: previous.from },
    isSettlement: true,
    isOpening: true,
  }
}

/**
 * Semua entri ledger yang lahir dari penanda settle tersimpan (fungsi MURNI —
 * bisa diuji tanpa browser): pembuka dari sisa bulan lalu + baris settle bulan
 * ini.
 */
export function settlementEntriesFor(
  records: Record<string, JointSettlementRecord>,
  month: string,
): JointTransaction[] {
  const entries: JointTransaction[] = []
  const previous = records[previousMonthKey(month)]
  const carry = previous ? buildCarryOverEntry(previous, month) : null
  if (carry) entries.push(carry)
  const current = records[month]
  if (current) entries.push(buildSettlementEntry(current))
  return entries
}

/** copy baris "Sisa bulan lalu dibawa" di modal rekap */
export function settlementCarryCopy(previous: JointSettlementRecord, masked: boolean): string {
  return `${SETTLE_CARRY_ROW_LABEL}: ${moneyLabel(previous.carryOver, masked)} (dari ${monthLabelOf(previous.month)}).`
}

/* ── Penanda settle per bulan — ⚠️ LEGACY (baca-saja, paket 52) ──────────────────────────
   Sejak paket 52 penanda settle MILIK `lib/money/joint-store.ts` (key IndexedDB
   `joint`). Fungsi di bawah ini tidak lagi dipakai untuk menulis: ia tinggal
   sebagai jalur MIGRASI — dibaca SEKALI saat store hidrasi supaya penanda
   "bulan ini sudah settle" milik user lama tidak hilang saat aplikasi
   diperbarui. Tidak ada jalur baru yang boleh menulis ke localStorage.
   (Alasan lengkap ada di `lib/money/joint-store.ts` §migrasi.)

   Kuncinya memuat bulannya, jadi "sekali per bulan" terjadi dengan sendirinya
   dan bulan depan tidak perlu menghapus apa pun — persis pola
   `lib/data/monthly-review.ts`. Semua bacaan aman untuk SSR (mengembalikan
   null/kosong), jadi tidak ada risiko hydration mismatch. */

const JOINT_SETTLE_STORE_PREFIX = 'catet-ind-joint-settle:'

export function jointSettleStoreKey(month: string): string {
  return `${JOINT_SETTLE_STORE_PREFIX}${month}`
}

function parseJointSettlementRecord(raw: string | null): JointSettlementRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<JointSettlementRecord>
    if (
      typeof parsed.month !== 'string' ||
      typeof parsed.from !== 'string' ||
      typeof parsed.to !== 'string' ||
      typeof parsed.amount !== 'number'
    ) {
      return null
    }
    const method = SETTLEMENT_METHODS.find((item) => item === parsed.method)
    return {
      month: parsed.month,
      from: parsed.from,
      to: parsed.to,
      amount: Math.max(0, Math.round(parsed.amount)),
      method: method ?? DEFAULT_SETTLEMENT_METHOD,
      carryOver:
        typeof parsed.carryOver === 'number' ? Math.max(0, Math.round(parsed.carryOver)) : 0,
    }
  } catch {
    /* isi rusak / storage diblokir → anggap bulan itu belum pernah settle */
    return null
  }
}

/** satu penanda bulan — ⚠️ LEGACY (jalur baca lama). Store kantong bersama
 *  memakai map-nya sendiri (`settlementRecordFor()`), jadi fungsi ini tidak
 *  dipanggil UI; aman untuk SSR (mengembalikan `null` di luar browser). */
export function readJointSettlementRecord(month: string): JointSettlementRecord | null {
  if (typeof window === 'undefined') return null
  try {
    return parseJointSettlementRecord(window.localStorage.getItem(jointSettleStoreKey(month)))
  } catch {
    return null
  }
}

/** semua penanda settle tersimpan — ⚠️ LEGACY: dibaca SEKALI saat store
 *  kantong bersama hidrasi (`lib/money/joint-store.ts`), lalu dipindahkan ke
 *  state store (key IndexedDB `joint`). Tidak ada pemanggil lain. */
export function readJointSettlementRecords(): Record<string, JointSettlementRecord> {
  const out: Record<string, JointSettlementRecord> = {}
  if (typeof window === 'undefined') return out
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith(JOINT_SETTLE_STORE_PREFIX)) continue
      const record = parseJointSettlementRecord(window.localStorage.getItem(key))
      if (record) out[record.month] = record
    }
  } catch {
    return out
  }
  return out
}

/** ⚠️ DIHAPUS di paket 52: penulis penanda settle ke localStorage.
 *
 *  Kantong bersama sekarang punya SATU penyimpanan (`lib/money/joint-store.ts`,
 *  key IndexedDB `joint`). Membiarkan fungsi penulis ini hidup berarti
 *  menyediakan jalur tulis KEDUA — sumber "state bersama hidup di dua tempat"
 *  yang justru ditutup paket ini. Pembacanya (`readJointSettlementRecords()`)
 *  tetap ada untuk migrasi satu kali. */

/* ── COPY: TIGA KEADAAN /joint (paket 61.3) ──────────────────────────────────
   Halaman ini punya tiga wujud yang sangat berbeda, dan sebelum paket 61
   perpindahannya tidak pernah dijelaskan: user menekan "Buat Dompet & Ajak
   Pasangan", lalu layar berubah, dan ia harus menebak apa yang barusan terjadi
   dan apa yang belum. Blok ini untuk MENGATAKAN keadaan itu — apa yang sudah
   ada, apa yang sedang menunggu, dan apa langkah berikutnya: ekspektasi yang
   jelas, bukan kalimat penyemangat. */
export const JOINT_STATE_COPY: Record<
  'empty' | 'waiting' | 'active',
  { badge: string; title: string; body: string; note: string }
> = {
  empty: {
    badge: 'Langkah 1 dari 3',
    title: 'Belum ada kantong bersama',
    body: 'Kasih nama kantong kalian, lalu bagikan kode undangannya ke pasangan. Buku besar bersama baru dibuka setelah dia bergabung.',
    note: 'Kantong yang baru dibuat selalu KOSONG — catatan contoh tidak ikut terbawa.',
  },
  waiting: {
    badge: 'Langkah 2 dari 3',
    title: 'Menunggu pasanganmu bergabung',
    body: 'Kantongnya sudah ada (masih kosong) dan kode undangannya sudah bisa dibagikan. Di halaman pasangan, kode itu membuka kantong yang sama.',
    note: 'Kamu tetap bisa mencatat sekarang; angka timbangannya baru berarti setelah kalian berdua ada di kantong ini.',
  },
  active: {
    badge: 'Langkah 3 dari 3',
    title: 'Kantong kalian sudah aktif',
    body: 'Buku besar bersama terbuka: catat bareng, atur pembagian tiap catatan, lalu tandai settle kalau sudah waktunya impas.',
    note: 'Timbangan menampilkan posisi bersih (patungan saja); kartu statistik di bawahnya menghitung SEMUA catatan, termasuk traktiran.',
  },
}

/**
 * RELASI KANTONG BERSAMA DENGAN KAS PRIBADI (paket 61.3) — dinyatakan di layar,
 * bukan disimpulkan user sendiri.
 *
 * Kanon teknisnya ada di `lib/money/joint-store.ts` (§"KANTONG BERSAMA BUKAN
 * BAGIAN TOTAL SALDO"): buku besar ini SENGAJA tidak menyentuh
 * `lib/money/store.ts`, jadi saldo BCA/GoPay/Tunai tidak pernah berubah karena
 * catatan bareng. Kalau ini tidak dikatakan, user akan menduga uangnya berpindah
 * — atau sebaliknya, menduga catatannya tidak berpengaruh sama sekali.
 */
export const JOINT_PERSONAL_CASH_COPY =
  'Buku besar ini terpisah dari dompet pribadimu: mencatat bareng TIDAK mengubah saldo BCA/GoPay/Tunai dan tidak muncul di Riwayat pribadi. Yang dicatat di sini cuma siapa menalangi berapa.'

/* ── COPY: HAPUS SATU BARIS CATATAN BERSAMA (paket 61.3) ────────────────────
   Yang berubah saat satu baris dihapus bukan cuma daftarnya: angka PATUNGAN
   pasangan ikut terhitung ulang. Itu sebabnya copy-nya menyebut akibat itu
   lebih dulu, dan menyebut apa yang TIDAK berubah (uangnya tidak berpindah). */
export const JOINT_DELETE_COPY = {
  /** label tombol aksi di kartu timeline */
  action: 'Hapus',
  /** aria-label tombol ikon — sebut catatannya supaya tidak ambigu */
  actionAria: (description: string) => `Hapus catatan ${description}`,
  overlay: 'Batal hapus catatan bareng',
  title: 'Hapus catatan ini?',
  /** dipotong dua supaya nominalnya bisa ditebalkan di tengah kalimat */
  bodyLead: (description: string) => `Catatan ${description} sebesar `,
  bodyTail:
    'keluar dari buku besar bersama — saldo patungan kalian berdua ikut terhitung ulang.',
  /** fakta yang wajib terbaca: yang berubah angka, bukan uang */
  cashNote:
    'Ini membatalkan catatannya, bukan memindahkan uang. Kalau transfernya memang sudah terjadi, catat ulang atau tandai settle ya 😊',
  safety: `Masih bisa kamu balikin lewat tombol Undo selama ${UNDO_WINDOW_MS / 1000} detik.`,
  cancel: 'Batal',
  confirm: 'Hapus',
  /** alasan baris di bulan yang sudah disettle TIDAK punya tombol hapus */
  lockedNote:
    'Bulan ini sudah ditandai settle, jadi catatannya dikunci — angka yang sudah kalian sepakati tidak boleh berubah diam-diam.',
  toastTitle: 'Catatan bareng dihapus',
  toastDescription: (description: string) => `${description} keluar dari buku besar bersama.`,
  toastUndo: 'Undo',
  toastUndoneTitle: 'Catatan dikembalikan 🌿',
  toastUndoneDescription: 'Timbangan & posisi bersihnya kembali ke angka sebelum dihapus.',
  toastExpired:
    'Jendela Undo-nya sudah lewat — catatannya bisa kamu tambahkan lagi kalau memang masih perlu 🌿',
} as const

