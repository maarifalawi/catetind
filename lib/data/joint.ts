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

/**
 * `false` → seluruh halaman berubah jadi flow "Ajak Pasangan" (Section 8).
 *
 * CATATAN KEPUTUSAN (paket 84): saklar ini TETAP memakai `DEMO_MODE`, bukan
 * `SHOWS_SAMPLE_DATA`. Alasannya: seluruh saklar perilaku di file ini adalah
 * SAKlar REVIEW yang kontraknya dikunci `lib/demo.test.ts` ("nilai saklar selalu
 * mengikuti env, di kedua mode") — memindahkannya ke `SHOWS_SAMPLE_DATA` akan
 * mematahkan kontrak itu dan membuat pasangan contoh muncul di setiap run test.
 * Yang penting untuk tugas ini sudah terpenuhi: build PRODUKSI (tanpa
 * `NEXT_PUBLIC_DEMO=1`) bernilai `false`, jadi user pertama melihat keadaan
 * kosong yang jujur + CTA "Undang pasangan", bukan pasangan yang tidak pernah
 * ia undang. Seed-nya sendiri (`INITIAL_JOINT_WALLET`) tetap hanya dipakai saat
 * saklar ini menyala.
 */
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
  /** id baris `joint_transactions` di Supabase (uuid) — `undefined` = belum dikirim (paket 64) */
  remoteId?: string
  /**
   * true = baris ini BELUM sampai ke server (kirim gagal / belum ada sesi saat
   * disimpan) sehingga hanya ada di perangkat ini.
   *
   * Kenapa ditandai, bukan disembunyikan: tanpa tanda ini, catatan yang gagal
   * terkirim terlihat sama persis dengan catatan yang sudah tersinkron — user
   * mengira pasangannya sudah melihatnya padahal tidak (temuan "halaman join
   * ngga sync: di akun pertama ada transaksi, di akun kedua kosong"). Store
   * mencoba mengirim ulang otomatis; chip di timeline menyebut keadaannya apa
   * adanya selama masih menunggu.
   */
  pendingSync?: boolean
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
  /**
   * Jenis catatan: `expense` (bawaan) atau `income`.
   *
   * Dulu form tambah menerima tipe "Pemasukan" dari Transaction Input Engine
   * tetapi store membuangnya, sehingga pemasukan yang diinput user selalu
   * tampil & terhitung sebagai PENGELUARAN. Sekarang jenisnya ikut tersimpan
   * dan dibaca mesin ledger (`lib/data/joint-ledger.ts`).
   */
  kind?: 'expense' | 'income'
  /**
   * id baris kas di dompet PRIBADI yang lahir bersama catatan ini (opsional).
   *
   * Diisi hanya kalau user memilih "Sumber Dana" saat mencatat. Fungsinya satu:
   * supaya menghapus catatan bareng juga mencabut baris kasnya — tanpa ini, uang
   * yang sudah keluar tetap tercatat di dompet padahal catatannya hilang.
   * Baris lama tidak punya field ini.
   */
  cashRowId?: string
  /** metode transfer di baris settlement (BCA/GoPay/Cash) */
  settlementMethod?: string
  /**
   * BULAN yang diselesaikan baris settle (`YYYY-MM`) — bukan tanggal transfer.
   *
   * Sejak settle mencatat waktu SUNGGUHAN (11 Nov), tanggal baris tidak lagi
   * selalu berada di bulan yang diselesaikan (bulan lama bisa disettle
   * belakangan). Kunci anti-dobel (`jointRowKey`) butuh BULAN, bukan tanggal:
   * tanpa field ini penanda bulan & baris server yang menceritakan transfer yang
   * sama akan dianggap dua baris berbeda.
   */
  settlementMonth?: string
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

/** deskripsi cadangan untuk PEMASUKAN bersama (uang masuk, bukan belanja) */
export const JOINT_DEFAULT_INCOME_DESCRIPTION = 'Pemasukan Bersama'

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

/** label tiap mode pembagian di Split Bill Sheet (Section 6A).
 *  Keterangan panjang per mode DIHAPUS atas permintaan pemilik produk: pil
 *  mode + kendali di bawahnya sudah menjelaskan sendiri, dan paragraf hint
 *  membuat sheet terasa penuh. */
export const SPLIT_MODES: { id: JointSplitType; label: string }[] = [
  { id: 'equal', label: 'Bagi Rata' },
  { id: 'percentage', label: 'Persentase' },
  { id: 'nominal', label: 'Nominal Custom' },
  { id: 'single_payer', label: 'Yang Ini Gue Yang Bayar' },
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
  tint: 'bg-hud-sage/25 text-forest ring-hud-sage/50',
  dot: 'bg-hud-sage ring-cream',
  rail: 'border-hud-sage',
}

export const JOINT_PARTNER: JointPerson = {
  id: 'user_b',
  name: 'Dany',
  avatar: '👩',
  tint: 'bg-hud-amber/25 text-hud-terracotta ring-hud-amber/50',
  dot: 'bg-hud-amber ring-cream',
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

/* ── LABEL BULAN (mock: September 2026) ──────────────────────────────────── */
export const JOINT_MONTH_LABEL = 'September 2026'

/**
 * Batas anggota satu kantong bersama.
 *
 * Undangan TIDAK lagi sekali pakai (migrasi `20261110120000_catetind_joint_multi_member.sql`):
 * orang ketiga & keempat boleh memakai kode yang sama sampai kedaluwarsa. Batas
 * ini menjaga buku besar tetap bisa dibaca (dan mencegah tautan disalahgunakan
 * sebagai grup tak terbatas) — bukan karena mesinnya hanya sanggup dua orang.
 */
export const JOINT_MAX_MEMBERS = 8

/** `2026-09` → "September 2026" (label bulan yang SEDANG dilihat halaman) */
export function jointMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) return ''
  return `${MONTHS_LONG[month - 1]} ${year}`
}

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
  /** total PEMASUKAN bersama bulan ini (tidak menambah "pengeluaran") */
  totalIncome: number
  /** posisi tiap anggota kantong (2 orang ATAU lebih) */
  members: JointSettlementMember[]
  /** rencana transfer untuk melunasi bulan ini (bisa lebih dari satu) */
  transfers: JointSettlementTransfer[]
}

/**
 * Satu anggota di dalam rekap bersama. Kantong ini TIDAK lagi terbatas dua
 * orang: undangan yang sama boleh dipakai orang ketiga, keempat, dst.
 */
export type JointSettlementMember = {
  person: JointPerson
  /** uang yang keluar dari kantongnya untuk PENGELUARAN bulan ini */
  paid: number
  /** uang yang ia setor sebagai PEMASUKAN bersama bulan ini */
  income: number
  /** kewajiban seharusnya (dibaca dari rasio pembagian) */
  owed: number
  /** `paid + income − owed`; > 0 berhak menerima, < 0 harus transfer */
  net: number
  /**
   * KONTRIBUSI setelah pelunasan (dasar bar kontribusi).
   *
   * `paid` hanya melihat siapa yang menyerahkan uang di kasir. Setelah satu
   * pihak mentransfer pelunasan (settle), bebannya berpindah: pengirim
   * menambah kontribusi, penerima menguranginya. Contoh: A menalangi
   * Rp 1.300.000 bagi rata, lalu B settle Rp 650.000 → kontribusi A dan B
   * masing-masing Rp 650.000 (50%–50%), bukan lagi 100%–0%.
   */
  contribution: number
  /** porsi kontribusi (persen, dibulatkan) — dipakai label bar */
  contributionPct: number
  /** porsi belanja bulan ini (persen, dibulatkan) */
  pct: number
}

/** satu instruksi transfer: siapa membayar siapa, berapa */
export type JointSettlementTransfer = {
  from: JointPerson
  to: JointPerson
  amount: number
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
    kind: tx.kind === 'income' ? 'income' : undefined,
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

/** true = baris PEMASUKAN bersama (uang masuk, bukan belanja) */
export function isIncomeTx(tx: JointTransaction): boolean {
  return tx.kind === 'income'
}

/**
 * Agregat ledger untuk daftar transaksi UI (opsional disaring per bulan).
 * Dipakai test & halaman yang butuh "siapa berhak menerima berapa".
 *
 * `members` bisa diisi roster SUNGGUHAN kantong (2 orang atau lebih); kalau
 * kosong, dipakai roster contoh (`JOINT_MEMBERS`) supaya test/seed tetap sah.
 *
 * `privatePolicy` ikut diteruskan supaya keputusan produk (`PRIVATE_EXPENSE_POLICY`
 * di `joint-ledger.ts`) berlaku di SELURUH angka halaman ini — bukan cuma di satu
 * tempat yang kebetulan ingat.
 */
export function ledgerTotalsOf(
  transactions: JointTransaction[],
  {
    month,
    privatePolicy,
    members,
  }: { month?: string; privatePolicy?: PrivateExpensePolicy; members?: string[] } = {},
): LedgerTotals {
  const scoped = month ? transactions.filter((tx) => withinMonth(tx.date, month)) : transactions
  return ledgerTotals(
    scoped.map(toLedgerTx),
    members && members.length > 0 ? members : JOINT_MEMBERS,
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
  /* pemasukan bukan beban: tidak pernah menaikkan timbangan pengeluaran */
  if (isIncomeTx(tx)) return false
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
    .filter((tx) => !isSettlementTx(tx) && !isIncomeTx(tx) && pocketOf(tx) === userId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/** uang yang MASUK ke kas bersama dari kantong satu orang bulan ini */
export function incomeBy(transactions: JointTransaction[], userId: string): number {
  return transactions
    .filter((tx) => isIncomeTx(tx) && pocketOf(tx) === userId)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/** seluruh pemasukan bersama (semua anggota) */
export function totalIncomeOf(transactions: JointTransaction[]): number {
  return transactions.filter(isIncomeTx).reduce((sum, tx) => sum + tx.amount, 0)
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
    .filter(
      (tx) =>
        !isSettlementTx(tx) &&
        !isIncomeTx(tx) &&
        pocketOf(tx) === userId &&
        countsForSettlement(tx, { privatePolicy }),
    )
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/** batasi nilai ke rentang [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Satu-satunya sumber kebenaran untuk kartu settlement, total bersama, dan
 * modal rekap. Dua lapisan angka (lihat MODEL AKUNTANSI di kepala file):
 *   • `myTotalSpent`/`partnerTotalSpent`/`totalSpent`  → seluruh catatan
 *     (hero + timeline). Pemasukan TIDAK ikut: ia bukan pengeluaran.
 *   • `myWeighedSpent`/`partnerWeighedSpent`/`difference` → yang benar-benar
 *     ditimbang (patungan saja; traktiran keluar, privat tetap masuk —
 *     kecuali `privatePolicy: 'excluded'`, lihat `joint-ledger.ts`).
 * `settled: true` memaksa skala kembali rata (0°) — dipakai setelah user
 * menekan "Tandai Sudah Settle".
 *
 * ROSTER NYATA (perbaikan penting): dulu fungsi ini selalu memakai
 * `JOINT_ME`/`JOINT_PARTNER` (id contoh `user_a`/`user_b`). Akibatnya di akun
 * sungguhan — yang catatannya memakai uuid — total selalu Rp 0, dan kartu
 * status menampilkan nama karangan "Jon"/"Dany". Sekarang pemanggil mengirim
 * `members` + `people` + `viewerId`, jadi angkanya menempel ke orang yang benar
 * dan kartu ini juga mendukung kantong 3–4 orang.
 */
export function computeSettlement(
  transactions: JointTransaction[],
  {
    settled = false,
    month = JOINT_MONTH_KEY,
    privatePolicy = PRIVATE_EXPENSE_POLICY,
    members,
    people,
    viewerId,
  }: {
    settled?: boolean
    month?: string
    privatePolicy?: PrivateExpensePolicy
    /** roster sungguhan (uuid). Kosong = roster contoh dua orang. */
    members?: string[]
    /** tampilan tiap anggota (nama/avatar/warna) — dipakai di kartu */
    people?: JointPerson[]
    /** id pemilik sesi; menentukan `my*` dan arah transfer yang disorot */
    viewerId?: string
  } = {},
): SettlementState {
  /* roster: anggota sungguhan kalau ada, kalau tidak roster contoh (seed/test) */
  const roster = members && members.length > 0 ? members : JOINT_MEMBERS
  const viewer = viewerId ?? roster[0] ?? JOINT_ME.id
  const partnerId = roster.find((id) => id !== viewer) ?? null
  const me = personOf(viewer, people)
  const partner = personOf(partnerId ?? viewer, people)

  /* Penyaringan bulan (audit #7): dulu settlement membaca SELURUH catatan
     selamanya sementara copy-nya bilang "bulan depan mulai dari nol".

     Baris SETTLE punya satu pengecualian: yang menentukan bulannya adalah
     `settlementMonth` (bulan yang diselesaikan), bukan `date` (waktu tombol
     ditekan). Bulan lama yang baru disettle sekarang tanggalnya jatuh di bulan
     berikutnya — menyaringnya dengan `date` membuat transfer itu hilang dari
     hitungan, persis bug "sudah settle tapi masih kelihatan berutang".
     Pengecualian ini TIDAK membuat baris settle terhitung di dua bulan: ia
     hanya cocok dengan SATU nilai `settlementMonth`. */
  const scoped = transactions.filter(
    (tx) =>
      withinMonth(tx.date, month) ||
      (Boolean(tx.isSettlement) && tx.settlementMonth === month),
  )

  /* lapisan 1 — seluruh PENGELUARAN: berapa uang yang keluar dari tiap kantong */
  const myTotalSpent = paidBy(scoped, viewer)
  const partnerTotalSpent = partnerId ? paidBy(scoped, partnerId) : 0
  const totalSpent = roster.reduce((sum, id) => sum + paidBy(scoped, id), 0)
  const totalIncome = totalIncomeOf(scoped)

  /* lapisan 2 — hanya pengeluaran patungan yang naik ke timbangan */
  const myWeighedSpent = weighedPaidBy(scoped, viewer, { privatePolicy })
  const partnerWeighedSpent = partnerId ? weighedPaidBy(scoped, partnerId, { privatePolicy }) : 0
  const weighedTotal = roster.reduce(
    (sum, id) => sum + weighedPaidBy(scoped, id, { privatePolicy }),
    0,
  )
  /* selisih total vs yang ditimbang = traktiran (bukan utang pasangan) */
  const treatTotal = totalSpent - weighedTotal

  /* lapisan 3 — NET: uang yang keluar DIKURANGI porsi yang seharusnya
     ditanggung (dibaca dari rasio split). Inilah angka yang menentukan arah &
     nominal transfer; sebelumnya arah dibaca dari "siapa bayar lebih banyak"
     sehingga split 60/40 tidak berpengaruh sama sekali. */
  const totals = ledgerTotals(scoped.map(toLedgerTx), roster, { privatePolicy })
  const myNet = totals.net[viewer] ?? 0
  const partnerNet = partnerId ? (totals.net[partnerId] ?? 0) : 0

  /* posisi tiap anggota — dipakai kartu settle & modal rekap (2 orang atau lebih) */
  /* ── KONTRIBUSI SETELAH PELUNASAN ─────────────────────────────────────────
     Bar kontribusi tidak boleh berhenti pada "siapa yang bayar di kasir":
     settle memindahkan beban. Baris settle (`isSettlement`) yang PAID BY satu
     anggota menambah kontribusinya, dan penerima manfaatnya (split
     `single_payer`) dikurangi sebesar itu. Baris PEMBUKA bulan (`isOpening`)
     tidak dihitung — ia saldo awal, bukan transfer yang terjadi bulan ini. */
  const moved = new Map<string, number>()
  for (const tx of scoped) {
    if (!isSettlementTx(tx) || tx.isOpening) continue
    const sender = pocketOf(tx)
    moved.set(sender, (moved.get(sender) ?? 0) + tx.amount)
    const beneficiary = tx.split?.type === 'single_payer' ? tx.split.payerId : ''
    if (beneficiary) moved.set(beneficiary, (moved.get(beneficiary) ?? 0) - tx.amount)
  }
  const contributions = roster.map((id) =>
    Math.max(0, paidBy(scoped, id) + (moved.get(id) ?? 0)),
  )
  const contributionTotal = contributions.reduce((sum, value) => sum + value, 0)

  const memberRows: JointSettlementMember[] = roster.map((id, index) => {
    const paid = paidBy(scoped, id)
    return {
      person: personOf(id, people),
      paid,
      income: incomeBy(scoped, id),
      owed: totals.owed[id] ?? 0,
      net: totals.net[id] ?? 0,
      contribution: contributions[index] ?? 0,
      contributionPct:
        contributionTotal === 0
          ? 0
          : Math.round(((contributions[index] ?? 0) / contributionTotal) * 100),
      pct: totalSpent === 0 ? 0 : Math.round((paid / totalSpent) * 100),
    }
  })
  const transfers = planTransfers(memberRows)

  const difference = Math.abs(myNet)
  const iAmOwed = myNet > 0
  /* lawan bicara yang paling relevan untuk PEMILIK SESI (dipakai kartu satu
     transfer & modal). Kalau ia berutang: pemberi pinjaman terbesar. Kalau ia
     berhak menerima: peminjam terbesar. Kalau impas: anggota lain pertama. */
  const myTransfer = transfers.find((row) => row.from.id === viewer)
  const toMe = transfers.find((row) => row.to.id === viewer)
  const whoOwes = iAmOwed ? (toMe?.from ?? partner) : me
  const whoIsOwed = iAmOwed ? me : (myTransfer?.to ?? partner)

  /* tiltDeg = (net aku − net lawan) / total yang ditimbang × 24,
     dijepit ±12° supaya beda sekecil apa pun tetap terbaca dan beda besar tidak
     bikin beam jungkir. Dihitung dari NET: positif = panci AKU turun (aku
     menalangi lebih dari porsiku / berhak menerima). */
  const rawTilt = weighedTotal === 0 ? 0 : ((myNet - partnerNet) / weighedTotal) * 24
  /**
   * `settled` hanya berarti "bulan ini PERNAH disettle" — bukan "sekarang impas".
   *
   * Dulu penanda settle memaksa `level: 'equal'` dan palang 0°, sehingga catatan
   * yang ditambahkan SETELAH settle (mis. belanja 100 jt sehari kemudian) tetap
   * tampil "Semua Impas / Bulan ini sudah ditutup" padahal selisihnya puluhan
   * juta. Yang menentukan impas hanya ANGKA: `difference` (= |net| yang sudah
   * memperhitungkan transfer settle).
   */
  const balanced = difference < RUPIAH_EPSILON
  const tiltDeg = balanced ? 0 : clamp(rawTilt, -12, 12)

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
    myOwed: totals.owed[viewer] ?? 0,
    partnerOwed: partnerId ? (totals.owed[partnerId] ?? 0) : 0,
    difference,
    /* SATU transfer menyelesaikan bagian PEMILIK SESI — bukan setengah selisih */
    settlementAmount: difference,
    whoOwes,
    whoIsOwed,
    tiltDeg,
    /* impas HANYA kalau angkanya nol — penanda settle tidak boleh menutupi
       selisih yang lahir dari catatan setelahnya */
    level: balanced ? 'equal' : difference > SETTLEMENT_THRESHOLD ? 'settle' : 'close',
    settled,
    month,
    totalIncome,
    members: memberRows,
    transfers,
  }
}

/** tampilan satu anggota: dari daftar orang kalau ada, kalau tidak persona contoh */
function personOf(id: string, people?: JointPerson[]): JointPerson {
  const found = people?.find((person) => person.id === id)
  if (found) return found
  if (id === JOINT_ME.id) return JOINT_ME
  if (id === JOINT_PARTNER.id) return JOINT_PARTNER
  return { ...JOINT_PARTNER, id, name: 'Anggota' }
}

/**
 * Rencana transfer paling ringkas (greedy): debitur terbesar membayar kreditur
 * terbesar sampai semua net nol. Untuk dua orang hasilnya persis satu transfer
 * penuh seperti sebelumnya; untuk 3–4 orang hasilnya maksimal `n − 1` transfer
 * dan TIDAK ada rupiah yang hilang (`Σ transfer` = `Σ net positif`).
 */
function planTransfers(rows: JointSettlementMember[]): JointSettlementTransfer[] {
  const debtors = rows
    .filter((row) => row.net < -RUPIAH_EPSILON)
    .map((row) => ({ person: row.person, remaining: -row.net }))
    .sort((a, b) => b.remaining - a.remaining)
  const creditors = rows
    .filter((row) => row.net > RUPIAH_EPSILON)
    .map((row) => ({ person: row.person, remaining: row.net }))
    .sort((a, b) => b.remaining - a.remaining)

  const out: JointSettlementTransfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].remaining, creditors[j].remaining)
    if (pay > RUPIAH_EPSILON) {
      out.push({ from: debtors[i].person, to: creditors[j].person, amount: pay })
    }
    debtors[i].remaining -= pay
    creditors[j].remaining -= pay
    if (debtors[i].remaining <= RUPIAH_EPSILON) i += 1
    if (creditors[j].remaining <= RUPIAH_EPSILON) j += 1
  }
  return out
}

/**
 * Kanon PRD A7 + audit #6: ajakan settle (banner cokelat + tombol transfer)
 * BARU boleh muncul kalau selisih > Rp100.000. Selama statusnya "Gak perlu
 * settle" sistem harus diam — dua pesan yang bertabrakan di satu layar bikin
 * user kehilangan kepercayaan ke angkanya.
 *
 * Penanda settle TIDAK lagi mematikan ajakan ini: bulan yang sudah settle lalu
 * ditambah catatan baru punya selisih BARU yang tetap harus bisa dibayar.
 * Kalau `settled` ikut dicek di sini, tombol "Settle sisa" hilang dari modal —
 * persis yang dilaporkan pemilik produk (11 Nov 2026): angka Rp 52.560.000
 * tampil tanpa satu pun tombol.
 */
export function shouldPromptSettlement(settlement: SettlementState): boolean {
  return settlement.level === 'settle'
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
 *  berbeda dan tidak mungkin lagi tertukar di layar.
 *
 *  `people` boleh diisi roster sungguhan (2 orang atau lebih); kalau kosong
 *  dipakai dua persona contoh supaya pemanggil lama tetap jalan. */
export function splitLabel(tx: JointTransaction, masked = false, people?: JointPerson[]): string {
  /* baris settlement bukan pembagian: labelnya menyebut metode transfernya */
  if (tx.isSettlement) {
    return tx.settlementMethod ? `${SETTLE_TRANSFER_PREFIX}${tx.settlementMethod}` : SETTLE_ENTRY_LABEL
  }
  if (isIncomeTx(tx)) return 'Pemasukan bersama'
  const roster = people && people.length > 0 ? people : JOINT_MEMBERS.map((id) => personOf(id))
  return splitSpecLabelFor(splitSpecOf(tx), roster, masked)
}

/** label untuk roster bebas (2 orang atau lebih) */
export function splitSpecLabelFor(
  split: SplitSpec,
  people: JointPerson[],
  masked = false,
): string {
  switch (split.type) {
    case 'percentage': {
      const slices = people
        .filter((person) => (split.percents[person.id] ?? 0) > 0)
        .map((person) => `${split.percents[person.id] ?? 0}`)
      if (slices.length === 0) return '0%'
      /* dua orang: "60/40" (bahasa lama, dipakai juga oleh halaman lain);
         lebih dari dua: diberi tanda persen supaya jelas ini rasio */
      return people.length > 2 ? `${slices.join('/')}%` : slices.join('/')
    }
    case 'nominal': {
      const slices = people
        .filter((person) => (split.amounts[person.id] ?? 0) > 0)
        .map((person) => moneyLabel(split.amounts[person.id] ?? 0, masked))
      return slices.length > 0 ? slices.join(' · ') : moneyLabel(0, masked)
    }
    case 'single_payer': {
      const bearer = people.find((person) => person.id === split.payerId)
      return bearer ? `${bearer.name} yang bayar` : 'Satu orang yang bayar'
    }
    default:
      /* bagi rata: sebut porsinya kalau anggotanya bukan dua orang, dan sebut
         peserta yang ikut kalau memang hanya sebagian anggota (mis. 3 dari 4) */
      {
        const selected = split.type === 'equal' ? split.participants : undefined
        const participants =
          selected && selected.length > 0
            ? people.filter((person) => selected.includes(person.id))
            : people
        const count = participants.length > 0 ? participants.length : people.length
        if (selected && selected.length > 0 && count < people.length) {
          const each = Math.floor(100 / count)
          return `Bagi rata ${count} dari ${people.length} orang (${each}% × ${count})`
        }
        if (people.length > 2) {
          const each = Math.floor(100 / people.length)
          return `Bagi rata (${each}% × ${people.length} orang)`
        }
        return 'Bagi rata'
      }
  }
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
  return splitSpecLabelFor(split, [me, partner], masked)
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
      /* pemasukan bukan belanja → tidak punya irisan kategori pengeluaran */
      !isIncomeTx(tx) &&
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
/** copy masa berlaku kode — kode TIDAK lagi sekali pakai: orang ketiga &
 *  keempat boleh memakai tautan yang sama sampai kedaluwarsa */
export const INVITE_VALIDITY_COPY = 'Kode berlaku 24 jam. Bisa dipakai beberapa orang.'

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
  'Kategori catatan privat disimpan anonim: di timeline tampil "🔒 Privat", bahkan buatmu, supaya pasangan nggak bisa nebak isinya dari kategori.'
/** penjelasan aturan timbangan (audit #2 & #3) — dipakai di halaman & modal.
 *  Stage 2: panci menampilkan POSISI BERSIH, jadi copy-nya tidak boleh lagi
 *  bilang "timbangan menimbang pengeluaran patungan" tanpa menyebut net. */
export const SETTLEMENT_SCOPE_COPY =
  'Panci menunjukkan posisi bersih (kewajiban yang sudah dibayar − porsi yang seharusnya) dari pengeluaran patungan. Traktiran tidak ikut ditimbang; nominal transaksi 🔒 Privat tetap dihitung.'
/** tooltip transaksi privat milik sendiri (Section 5B) */
export const PRIVATE_OWNER_HINT = 'Transaksi ini disembunyikan dari pasanganmu'
export const SETTLED_TOAST = 'Settled! Bulan depan mulai dari nol ⚖️💚'

/* ── COPY HAPUS DOMPET BERSAMA ───────────────────────────────────────────────
   Hapus dompet adalah aksi MERUSAK (baris dompet + seluruh catatan di dalamnya
   ikut terhapus lewat cascade), jadi kalimatnya harus menyebut akibatnya, bukan
   cuma "Hapus?". */
export const JOINT_WALLET_DELETE_COPY = {
  action: 'Hapus dompet bersama',
  title: 'Hapus dompet bersama ini?',
  cancel: 'Batal',
  confirm: 'Ya, hapus dompet',
  overlay: 'Konfirmasi hapus dompet bersama',
} as const

/* ── PEMILIK SENDIRIAN SETELAH ANGGOTA TERAKHIR KELUAR (sesi 5) ─────────────
   Sebelum ini layar langsung jatuh ke "Mau mulai dari mana?", sehingga pemilik
   yang masih punya dompet + riwayat tidak bisa mengundang lagi maupun
   menghapusnya dari layar itu. Panel ini menjaga dompetnya tetap terlihat. */
export const JOINT_SOLO_OWNER_COPY = {
  eyebrow: 'Dompet bersama',
  title: 'Kamu sekarang sendirian di dompet ini',
  body: 'Anggota lain sudah keluar. Undang lagi lewat kode, atau hapus dompetnya kalau memang sudah selesai.',
  invite: 'Bagikan kode undangan',
  remove: JOINT_WALLET_DELETE_COPY.action,
} as const

/* ── COPY KELOLA ANGGOTA (3–4 orang) ────────────────────────────────────────
   Dompet bersama sekarang berisi lebih dari dua orang. Dua aksi yang saling
   berlawanan harus dibedakan tegas: "Keluar" (anggota, hanya dirinya) dan
   "Keluarkan" (pemilik, orang lain). Keduanya memakai `ConfirmDialog`, karena
   keanggotaan menentukan siapa yang bisa membaca catatan bersama. */
export const JOINT_MEMBER_LIST_TITLE = 'Anggota dompet'
export const JOINT_MEMBER_OWNER_BADGE = 'Pemilik'
export const JOINT_MEMBER_ME_BADGE = 'Kamu'

export const JOINT_LEAVE_COPY = {
  action: 'Keluar dari dompet bersama',
  title: 'Keluar dari dompet bersama ini?',
  body: 'Kamu tidak akan bisa melihat atau mencatat di dompet ini lagi. Catatan yang sudah ada tetap menjadi milik anggota lain.',
  note: 'Dompet & catatan bareng TIDAK terhapus — hanya keanggotaanmu yang dilepas.',
  cancel: 'Batal',
  confirm: 'Ya, keluar',
  overlay: 'Konfirmasi keluar dari dompet bersama',
} as const

export const JOINT_REMOVE_MEMBER_COPY = {
  action: (name: string) => `Keluarkan ${name}`,
  title: (name: string) => `Keluarkan ${name} dari dompet bersama?`,
  body: (name: string) =>
    `${name} tidak akan bisa membuka dompet ini lagi. Riwayat catatan yang pernah ia buat tetap tampil rapi untuk semua anggota.`,
  note: 'Undangan baru bisa diberikan lagi kapan saja lewat kode undangan.',
  cancel: 'Batal',
  confirm: 'Ya, keluarkan',
  overlay: 'Konfirmasi keluarkan anggota',
} as const

/* ── COPY PELUNASAN PER PASANGAN ─────────────────────────────────────────────
   Grup 3–4 orang bisa punya lebih dari satu transfer (B→A dan C→A). Melunasi
   satu baris TIDAK boleh menutup utang anggota lain, jadi tombolnya per baris —
   dengan "lunasi semua" tetap tersedia sebagai jalan pintas. */
export const JOINT_SETTLE_ROW_ACTION = 'Lunasi'
export const JOINT_SETTLE_ROW_HINT = 'Tandai transfer ini sudah diterima.'
export const JOINT_SETTLE_ALL_LABEL = 'Lunasi semua transfer'
export const JOINT_SETTLE_ALL_HINT =
  'Mencatat setiap baris transfer sebagai pelunasan terpisah — utang tiap pasangan tetap bisa ditelusuri.'
export const JOINT_SETTLE_ROW_TOAST = (from: string, to: string) =>
  `Pelunasan ${from} → ${to} dicatat`
export const JOINT_SETTLE_ROW_FAIL = 'Pelunasan gagal dicatat, coba lagi ya'
/* ── SISA SETELAH SETTLE ──────────────────────────────────────────────────────
   Bulan yang sudah di-settle TIDAK terkunci dari catatan baru. Kalau catatan
   baru membuat posisi tidak seimbang lagi, selisihnya adalah utang BARU dan
   harus bisa dilunasi — tanpa menghapus penanda settle yang sudah terjadi. */
export const JOINT_SETTLE_REMAINDER_LABEL = 'Settle sisa'
export const JOINT_SETTLE_REMAINDER_TOAST = 'Sisa settle tercatat'

/* ── COPY PEMBAGIAN FLEKSIBEL (3–4 orang) ──────────────────────────────────── */
export const JOINT_SPLIT_PARTICIPANTS_LABEL = 'Siapa saja yang ikut?'
export const JOINT_SPLIT_PARTICIPANTS_HINT =
  'Centang anggota yang ikut menanggung. Yang tidak dicentang porsinya 0.'
export const JOINT_SPLIT_PERCENT_LABEL = 'Persentase tiap orang'
export const JOINT_SPLIT_PERCENT_HINT = 'Total persentase harus tepat 100%.'
export const JOINT_SPLIT_NOMINAL_LABEL = 'Nominal tiap orang'
export const JOINT_SPLIT_NOMINAL_HINT = 'Total nominal harus tepat sama dengan nominal transaksi.'
export const JOINT_SPLIT_TOTAL_LABEL = 'Total'
export const JOINT_SPLIT_MISMATCH = (total: string) => `Belum pas — totalnya harus ${total}.`

/* ── CARD PEMASUKAN BERSAMA ──────────────────────────────────────────────────
   Pemasukan bersama BUKAN pengeluaran negatif: ia uang yang MASUK ke kas
   bersama dan hanya menambah talangan penyetornya. Karena itu kartunya
   terpisah, dengan tanda `+` dan warna hijau. */
export const JOINT_INCOME_CARD_LABEL = 'Pemasukan Bersama'
export const JOINT_EXPENSE_CARD_LABEL = 'Pengeluaran Bersama'
export const JOINT_INCOME_CARD_EMPTY = 'Belum ada pemasukan bersama bulan ini.'

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
export const SETTLE_ENTRY_LABEL = 'Settle'
export const SETTLE_TRANSFER_PREFIX = 'Transfer '

/** pemilih "Siapa yang nalangin?" di form tambah (Stage 2 #3) — mengisi
 *  `paidByUserId`, jadi catatan yang uangnya keluar dari kantong pasangan tidak
 *  lagi tercatat sebagai pengeluaran pencatat. */
export const PAID_BY_LABEL = 'Siapa yang nalangin?'
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
  /**
   * KAPAN settle-nya benar-benar terjadi (`YYYY-MM-DD` + `HH:MM`), bukan tanggal
   * karangan. Dulu baris timeline selalu bertanggal `1 <bulan>` jam `20:30`
   * karena dua konstanta mock — user yang baru menekan tombol hari ini melihat
   * "1 Nov" dan mengira tanggalnya tidak tersinkron.
   *
   * Opsional supaya data lama (tanpa kolom ini) tetap terbaca: kalau kosong,
   * `buildSettlementEntry()` memakai perilaku lama sebagai cadangan.
   */
  settledAt?: string
  settledTime?: string
  /**
   * true = penanda ini BELUM sampai ke server (mis. sedang offline). Record
   * seperti ini tidak boleh ditimpa bacaan server saat hidrasi, dan dikirim
   * ulang oleh `retryPendingJointRows()`.
   */
  pendingSync?: boolean
  /**
   * Dompet PRIBADI yang dipakai saat settle (opsional) + id baris kasnya.
   *
   * Settle yang menyentuh dompet berarti uang benar-benar berpindah: pengirim
   * kehilangan `amount`, penerima menerimanya. Baris kasnya dicatat supaya
   * Riwayat & saldo dompet bercerita sama — dan supaya "Batalkan settle" bisa
   * mencabutnya kembali.
   */
  cashWalletId?: string
  cashRowId?: string
}

/**
 * Baris ledger dari penanda settle. Tanggalnya memakai WAKTU SUNGGUHAN settle
 * (`settledAt`/`settledTime`); kalau data lama belum punya kolom itu, perilaku
 * lama dipakai sebagai cadangan (tanggal di bulan record + jam mock).
 *
 * `nameOf` = penerjemah id anggota → nama panggilan. Tanpa itu, deskripsinya
 * TIDAK menyebut nama siapa pun: `jointNameOf()` hanya boleh hidup di
 * test/demo, dan dulu nama contohnya ("Jon") benar-benar muncul di produksi.
 *
 * Id-nya diturunkan dari record, jadi memanggilnya dua kali tidak pernah
 * menggandakan barisnya.
 */
export function buildSettlementEntry(
  record: JointSettlementRecord,
  {
    date,
    nameOf,
  }: {
    date?: string
    nameOf?: (userId: string) => string | undefined
  } = {},
): JointTransaction {
  const iso =
    date ??
    record.settledAt ??
    (record.month === JOINT_MONTH_KEY ? JOINT_TODAY_ISO : `${record.month}-01`)
  const recipient = nameOf?.(record.to)?.trim()
  return {
    id: `settle-${record.month}-${record.from}-${record.to}`,
    userId: record.from,
    paidByUserId: record.from,
    description: recipient
      ? `Settle ${monthLabelOf(record.month)}, transfer ke ${recipient}`
      : `Settle ${monthLabelOf(record.month)}`,
    amount: Math.max(0, Math.round(record.amount)),
    category: SETTLEMENT_CATEGORY,
    date: iso,
    time: record.settledTime ?? SETTLE_ENTRY_TIME,
    split: { type: 'single_payer', payerId: record.to },
    isSettlement: true,
    /* BULAN yang diselesaikan — dipakai kunci anti-dobel & pengunci hapus;
       tanggal barisnya sendiri adalah waktu tombol ditekan. */
    settlementMonth: record.month,
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
    settlementMonth: month,
  }
}

/**
 * Semua entri ledger yang lahir dari penanda settle tersimpan (fungsi MURNI —
 * bisa diuji tanpa browser): pembuka dari sisa bulan lalu + baris settle bulan
 * ini.
 *
 * `nameOf` dioper supaya deskripsi memakai nama SUNGGUHAN (bukan nama contoh).
 */
export function settlementEntriesFor(
  records: Record<string, JointSettlementRecord>,
  month: string,
  { nameOf }: { nameOf?: (userId: string) => string | undefined } = {},
): JointTransaction[] {
  const entries: JointTransaction[] = []
  const previous = records[previousMonthKey(month)]
  const carry = previous ? buildCarryOverEntry(previous, month) : null
  if (carry) entries.push(carry)
  const current = records[month]
  if (current) entries.push(buildSettlementEntry(current, { nameOf }))
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
    'keluar dari buku besar bersama, saldo patungan kalian berdua ikut terhitung ulang.',
  /** fakta yang wajib terbaca: yang berubah angka, bukan uang */
  cashNote:
    'Ini membatalkan catatannya, bukan memindahkan uang. Kalau transfernya memang sudah terjadi, catat ulang atau tandai settle ya 😊',
  safety: `Masih bisa kamu balikin lewat tombol Undo selama ${UNDO_WINDOW_MS / 1000} detik.`,
  cancel: 'Batal',
  confirm: 'Hapus',
  /** alasan baris di bulan yang sudah disettle TIDAK punya tombol hapus */
  lockedNote:
    'Bulan ini sudah ditandai settle, jadi catatannya dikunci, angka yang sudah kalian sepakati tidak boleh berubah diam-diam.',
  toastTitle: 'Catatan bareng dihapus',
  toastDescription: (description: string) => `${description} keluar dari buku besar bersama.`,
  toastUndo: 'Undo',
  toastUndoneTitle: 'Catatan dikembalikan 🧩',
  toastUndoneDescription: 'Timbangan & posisi bersihnya kembali ke angka sebelum dihapus.',
  toastExpired:
    'Jendela Undo-nya sudah lewat, catatannya bisa kamu tambahkan lagi kalau memang masih perlu 🧩',
  /** server menolak / belum menerima: baris sengaja TIDAK dihapus di layar ini */
  toastFailedTitle: 'Belum bisa dihapus',
  toastFailedDescription:
    'Server belum menerima penghapusan ini, jadi catatan itu tetap ada di semua perangkat. Coba lagi sebentar ya.',
} as const


