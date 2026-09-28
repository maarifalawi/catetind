import type { WalletAccount } from '../wallets'
import { TRANSFER_DOOR_COPY } from './add-wallet'
import {
  formatDayLabel,
  shiftISODate,
  summarizeTransactions,
  type HistoryTransaction,
} from './history'

/* ── Dompet Detail (/wallet/[id]) ────────────────────────────────────────────
   Halaman ini menjawab SATU pertanyaan: "dompet INI kondisinya gimana?" —
   rekening yang mau dipakai bayar sesuatu. Karena itu semua angka di sini
   bersifat dompet-lokal: ringkasan 30 hari, arah saldo, dan daftar transaksi
   cuma berisi catatan milik dompet tersebut.

   Arah produksi (saat Supabase aktif) — pengganti mock di bawah:
     SELECT id, name, amount, type, category, occurred_at
     FROM transactions
     WHERE wallet_id = $1 AND user_id = auth.uid()
     ORDER BY occurred_at DESC
     LIMIT 200;
   Yang TIDAK berubah saat pindah backend: saldo tetap dibaca dari tabel
   `wallets` (`WalletAccount.balance`, lib/wallets.ts) — bukan dihitung ulang
   dari daftar transaksi. Saldo adalah sumber kebenaran (dikoreksi lewat Smart
   Sync), riwayat cuma penjelasnya.

   Tanggal disimpan sebagai string `YYYY-MM-DD` (pola lib/data/history.ts):
   angka & label hari jadi deterministik, jadi HTML server dan client identik
   (tidak ada hydration mismatch). */

/** panjang jendela ringkasan ("30 hari terakhir") */
export const WALLET_DETAIL_WINDOW_DAYS = 30

/**
 * Ambang data minimum sebelum boleh menampilkan klaim/trend (PRD 574–590,
 * non-negotiable: "jangan pernah berikan false insight").
 *
 * 7 = ambang paling rendah di tabel PRD (category trend alert). Di bawah angka
 * itu halaman ini menampilkan KARTU SABAR (progress x/7) — bukan garis trend
 * yang menyesatkan dari 2–3 transaksi.
 */
export const INSIGHT_MIN_TRANSACTIONS = 7

/**
 * Mock transaksi per dompet (kunci = `WalletSeed.id`, mis. `bca`).
 *
 * Bentuknya `HistoryTransaction` supaya komponen yang sudah ada
 * (`history-transaction-row`, `transaction-detail-sheet`) bisa dipakai ulang
 * tanpa adaptor — dan tiap dompet sengaja punya ketebalan data yang BERBEDA
 * karena tiga state halaman ini harus bisa didemokan:
 *
 *   · `bca`   → 9 catatan → data cukup: ringkasan + garis arah saldo
 *   · `gopay` → 5 catatan → data tipis: kartu sabar (5/7), tanpa trend
 *   · `tunai` → 0 catatan → empty state nurturing
 *
 * SENGAJA TANPA `transfer`: tipe 'transfer' cuma bilang "pindah dana" tanpa
 * arah masuk/keluar, sehingga Net dompet bisa salah kalau catatannya top-up
 * MASUK ke dompet ini. Sejak paket 40 arah pindah dana MEMANG ada di ledger
 * (`counterWalletId`), tapi mock lama ini belum ikut dipindah ke ledger — jadi
 * aturannya tetap: baris mock tidak berpindah dompet.
 */
export const WALLET_DETAIL_TRANSACTIONS: Record<string, HistoryTransaction[]> = {
  bca: [
    { id: 101, name: 'Kopi Kenangan Oat Latte', amount: 32_000, type: 'expense', category: 'Makanan', wallet: 'BCA', date: '2026-09-27', time: '07:30', aiGenerated: true },
    { id: 102, name: 'Ayam Geprek Bu Rini', amount: 25_000, type: 'expense', category: 'Makanan', wallet: 'BCA', date: '2026-09-26', time: '12:40', aiGenerated: true },
    { id: 103, name: 'Belanja Bulanan Superindo', amount: 285_000, type: 'expense', category: 'Makanan', wallet: 'BCA', date: '2026-09-25', time: '19:20', aiGenerated: true },
    { id: 104, name: 'Bayar Kos Bulan Sep', amount: 1_500_000, type: 'expense', category: 'Tagihan', wallet: 'BCA', date: '2026-09-24', time: '21:10', aiGenerated: true },
    { id: 105, name: 'Setor Tabungan Darurat', amount: 500_000, type: 'saving', category: 'Dana Darurat', wallet: 'BCA', date: '2026-09-24', time: '10:30', aiGenerated: false },
    { id: 106, name: 'Netflix Subscription', amount: 54_000, type: 'expense', category: 'Hiburan', wallet: 'BCA', date: '2026-09-23', time: '20:00', aiGenerated: true },
    { id: 107, name: 'SPBU Pertamina', amount: 150_000, type: 'expense', category: 'Transportasi', wallet: 'BCA', date: '2026-09-22', time: '20:15', aiGenerated: true },
    { id: 108, name: 'Proyek Desain Sampingan', amount: 750_000, type: 'income', category: 'Proyek', wallet: 'BCA', date: '2026-09-21', time: '09:15', aiGenerated: false },
    { id: 109, name: 'Paket Data Telkomsel', amount: 100_000, type: 'expense', category: 'Tagihan', wallet: 'BCA', date: '2026-09-19', time: '19:00', aiGenerated: true },
  ],
  gopay: [
    { id: 201, name: 'Kopi Kenangan Oat Latte', amount: 32_000, type: 'expense', category: 'Makanan', wallet: 'GoPay', date: '2026-09-27', time: '08:10', aiGenerated: true },
    { id: 202, name: 'Ayam Geprek Bu Rini', amount: 25_000, type: 'expense', category: 'Makanan', wallet: 'GoPay', date: '2026-09-26', time: '12:40', aiGenerated: true },
    { id: 203, name: 'Grab ke Kantor', amount: 45_000, type: 'expense', category: 'Transportasi', wallet: 'GoPay', date: '2026-09-25', time: '07:45', aiGenerated: true },
    { id: 204, name: 'Boba Janji Jiwa', amount: 24_000, type: 'expense', category: 'Makanan', wallet: 'GoPay', date: '2026-09-24', time: '16:40', aiGenerated: true },
    { id: 205, name: 'Cashback GoPay', amount: 15_000, type: 'income', category: 'Cashback', wallet: 'GoPay', date: '2026-09-23', time: '09:05', aiGenerated: false },
  ],
  tunai: [],
}

/** catatan mock milik satu dompet (id = `WalletSeed.id`) */
export function walletTransactions(walletId: string): HistoryTransaction[] {
  return WALLET_DETAIL_TRANSACTIONS[walletId] ?? []
}


/**
 * Irisan 30 hari terakhir milik dompet ini.
 *
 * Jendelanya dihitung MUNDUR DARI CATATAN TERBARU, bukan dari `new Date()`:
 * mock-nya bertanggal tetap, jadi kalau demo dibuka jauh setelah tanggal itu,
 * perhitungan dari "hari ini" akan menghasilkan ringkasan berisi nol semua
 * padahal daftarnya kelihatan penuh — angka nol palsu seperti itu lebih buruk
 * daripada jendela yang jujur mengikuti data.
 */
export function walletWindow(txs: HistoryTransaction[]): HistoryTransaction[] {
  if (txs.length === 0) return []
  const newest = txs.reduce((latest, tx) => (tx.date > latest ? tx.date : latest), txs[0].date)
  const from = shiftISODate(newest, -(WALLET_DETAIL_WINDOW_DAYS - 1))
  return txs.filter((tx) => tx.date >= from && tx.date <= newest)
}

export interface WalletPeriodSummary {
  /** jumlah catatan di jendela ini */
  count: number
  /** uang MASUK (pemasukan) */
  income: number
  /** uang KELUAR (pengeluaran + setoran tabungan) */
  expense: number
  /** income − expense = perubahan saldo dompet di jendela ini */
  net: number
  /** tanggal paling awal & paling akhir yang benar-benar dipakai */
  fromLabel: string
  toLabel: string
}

/**
 * Ringkasan dompet untuk jendela 30 hari. `null` = belum ada catatan sama
 * sekali (halaman menampilkan empty state, bukan deretan angka nol).
 *
 * Perhitungannya memakai `summarizeTransactions()` dari lib/data/history.ts —
 * SATU definisi uang masuk/keluar untuk seluruh app (pindah dana netral,
 * setoran tabungan ikut terhitung keluar), jadi halaman ini tidak mungkin
 * berbeda angka dengan Riwayat & Insight.
 */
export function walletSummary30d(txs: HistoryTransaction[]): WalletPeriodSummary | null {
  const windowTxs = walletWindow(txs)
  if (windowTxs.length === 0) return null

  const { count, income, expense, net } = summarizeTransactions(windowTxs)
  const dates = windowTxs.map((tx) => tx.date).sort()
  return {
    count,
    income,
    expense,
    net,
    fromLabel: formatDayLabel(dates[0]),
    toLabel: formatDayLabel(dates[dates.length - 1]),
  }
}

export interface WalletTrendPoint {
  /** `YYYY-MM-DD` */
  date: string
  /** `27 Sep 2026` — dipakai sebagai label tooltip */
  label: string
  /** saldo dompet pada akhir hari itu */
  balance: number
}

/**
 * Perubahan saldo satu catatan, dilihat DARI posisi dompet ini: pemasukan
 * menambah, pengeluaran & setoran tabungan mengurangi. Pindah dana tidak
 * mengubah net worth, jadi tidak ikut dihitung (lihat catatan di mock).
 */
function walletDelta(tx: HistoryTransaction): number {
  if (tx.type === 'income') return tx.amount
  if (tx.type === 'transfer') return 0
  return -tx.amount
}

/**
 * Garis arah saldo harian selama jendela 30 hari.
 *
 * Titik TERAKHIR selalu sama dengan `WalletAccount.balance`: saldo pembuka
 * dihitung mundur dari saldo asli, bukan dikarang lalu dipaksa cocok. Dua
 * efeknya: angka di grafik tidak pernah beradu dengan angka di kartu, dan
 * begitu Smart Sync mengoreksi saldo, seluruh garisnya ikut bergeser — grafik
 * dan kartu tetap satu cerita.
 *
 * Deterministik (tanpa angka acak) supaya HTML server & client identik — pola
 * yang sama dengan heatmap di lib/data/history.ts.
 */
export function walletSparkline(
  wallet: WalletAccount,
  txs: HistoryTransaction[],
): WalletTrendPoint[] {
  const windowTxs = walletWindow(txs)
  if (windowTxs.length === 0) return []

  const dates = windowTxs.map((tx) => tx.date).sort()
  const from = dates[0]
  const to = dates[dates.length - 1]

  const perDay = new Map<string, number>()
  for (const tx of windowTxs) {
    perDay.set(tx.date, (perDay.get(tx.date) ?? 0) + walletDelta(tx))
  }

  const net = windowTxs.reduce((sum, tx) => sum + walletDelta(tx), 0)
  /* lantai 0: saldo tidak pernah negatif. Kalau datanya sampai ke situ,
     angka pembukanya yang salah — bukan grafiknya yang perlu menipu. */
  let running = Math.max(0, wallet.balance - net)

  const points: WalletTrendPoint[] = []
  for (let iso = from; iso <= to; iso = shiftISODate(iso, 1)) {
    running += perDay.get(iso) ?? 0
    points.push({ date: iso, label: formatDayLabel(iso), balance: running })
  }
  return points
}

/* ── COPY (Bahasa Indonesia, santai-hangat, tanpa menyalahkan) ──────────────── */

export const WALLET_DETAIL_COPY = {
  /** tombol kembali: aria-label penuh + label visual yang tampil di desktop */
  back: 'Kembali ke Dompet & Akun',
  backLabel: 'Kembali',
  heroLabel: 'Saldo',
  /** konteks angka — CatetInd 100% dari catatan user, tanpa open-banking */
  heroHint: 'Dibaca dari catatanmu sendiri, bukan sambungan ke m-banking.',
  /** saldo dompet bukan total kekayaan; itu di halaman Kekayaan & Hutang */
  heroScope: 'Saldo dompet ini saja.',
  /** kalau id di URL tidak ada dompetnya */
  notFoundTitle: 'Dompet tidak ditemukan',
  /** penjelasan + jalan keluar — bukan halaman kosong */
  notFoundHint:
    'Dompet dengan id itu tidak ada di daftarmu. Mungkin tautannya sudah lama, atau dompetnya memang sudah dihapus.',
  notFoundAction: 'Kembali ke Dompet & Akun',
} as const

export const WALLET_PERIOD_COPY = {
  title: 'Ringkas 30 Hari',
  /** label bebas istilah akuntansi — bukan debit/kredit */
  income: 'Masuk',
  expense: 'Keluar',
  net: 'Net',
  windowHint: (from: string, to: string, count: number) => `${from} – ${to} · ${count} catatan`,
  netHint: 'Net = masuk − keluar, termasuk setoran tabungan.',
  trendTitle: 'Arah Saldo',
  trendHint: 'Saldo harian dari catatanmu, bukan proyeksi.',
  /** pembaca layar: grafik tidak terbaca mata, jadi isinya dikatakan */
  trendA11y: (from: string, fromBalance: string, to: string, toBalance: string) =>
    `Saldo ${from} sekitar ${fromBalance}, menjadi ${toBalance} pada ${to}.`,
} as const

export const WALLET_PATIENT_COPY = {
  title: 'Aku lagi belajar pola dompet ini',
  body: 'Aku lagi belajar pola dompet ini. Terus catat ya, nanti aku kasih ringkasan yang beneran berguna 📊',
  /** progress menuju ambang insight — engagement tanpa klaim prematur */
  progress: (count: number) =>
    `${Math.min(count, INSIGHT_MIN_TRANSACTIONS)}/${INSIGHT_MIN_TRANSACTIONS} transaksi`,
  progressHint: (remaining: number) =>
    `${remaining} transaksi lagi buat buka arah saldo dompet ini.`,
} as const

export const WALLET_EMPTY_COPY = {
  body: 'Belum ada catatan di dompet ini 🌱 Yuk catat yang pertama.',
  hint: 'Satu catatan sudah cukup bikin dompet ini mulai terbaca.',
} as const

export const WALLET_LIST_COPY = {
  title: 'Transaksi Dompet Ini',
  /** pill jumlah catatan di kepala daftar */
  count: (count: number) => `${count} catatan`,
} as const

export const WALLET_QUICK_ACTION_COPY = {
  add: 'Catat transaksi',
  sync: 'Sesuaikan Saldo',
  syncHint: 'Saldo dompet ini berubah? Tulis angka aslinya.',
  syncToastTitle: 'Saldo dikoreksi. Selisihnya tercatat otomatis. 🪄',
  /**
   * Aksi ketiga (paket 55): pindah dana DARI dompet halaman ini. Label & hint-nya
   * dibaca dari `TRANSFER_DOOR_COPY` (`lib/data/add-wallet.ts`) — aksi ini sama
   * persis dengan entri menu “Lainnya” dan popover kartu di /wallet, jadi namanya
   * tidak boleh ditulis ulang di sini. Sebelum paket ini halaman detail dompet
   * hanya MENYEBUT “pindah dana” di komentar: tidak ada tombolnya sama sekali.
   */
  transferLabel: TRANSFER_DOOR_COPY.detailLabel,
  transferHint: TRANSFER_DOOR_COPY.detailHint,
} as const

/**
 * Label "Total Saldo" di halaman Dompet & Akun (paket 44).
 *
 * Angka hero-nya adalah `cashTotal()` dari store: jumlah SELURUH dompet, dan
 * halaman ini memang menampilkan semua dompet (tidak disaring konteks uang).
 * Kalimatnya karena itu menyebut cakupannya terang-terangan — dan menegaskan
 * bahwa konteks uang menyaring daftar/arus, bukan total ini. Itu yang menutup
 * keluhan "angka saldo beda antar halaman": bedanya dulu bukan cakupan, tapi
 * HOME yang menjumlahkan daftar tersaring sementara halaman ini menjumlahkan
 * semuanya.
 */
export const WALLET_TOTAL_COPY = {
  /** baris di bawah nominal hero: "Total Saldo semua dompet · 3 dompet aktif" */
  heroSubtitle: (count: number) => `Total Saldo semua dompet · ${count} dompet aktif`,
  /** penegas: konteks uang TIDAK mengubah angka ini */
  contextNote: 'Konteks uang menyaring daftar & arus — bukan angka total di atas.',
  /** aria-label nominal hero, supaya pembaca layar mendengar cakupannya */
  heroAmountLabel: (amount: string) => `Total Saldo semua dompet: ${amount}`,
  /**
   * Kepala panel "Komposisi" — jumlah akun + cakupannya.
   *
   * Komposisi memecah TOTAL SALDO, jadi ia memuat SELURUH dompet walaupun daftar
   * kartu di bawahnya disaring konteks (paket 47). Menuliskan cakupannya di sini
   * membuat dua angka di satu layar tidak terasa bertentangan.
   */
  compositionAccounts: (count: number) => `${count} akun · semua dompet`,
} as const

/**
 * Nama baris yang lahir dari Koreksi Saldo (Smart Sync) — SATU sumber untuk
 * modal, toast, DAN baris ledger yang benar-benar ditulis
 * (`postBalanceAdjustment` di `lib/money/store.ts`).
 *
 * Sebelum paket 40, modal menjanjikan "Pengeluaran Tak Tercatat akan
 * ditambahkan otomatis ke catatanmu" sementara yang terjadi cuma saldo lokal
 * yang berubah: janji yang tidak ditepati, dan tidak ada satu pun baris di
 * Riwayat (temuan audit #4 & #5). Sekarang teks yang sama dipakai sebagai NAMA
 * baris ledger-nya, jadi kalimat modal itu benar apa adanya — bukan janji
 * kosong, dan bukan dua catatan untuk satu koreksi (yang bikin saldo terpotong
 * dua kali).
 */
export const WALLET_SYNC_ADJUSTMENT_COPY = {
  /** selisih negatif: saldo catatan lebih besar dari saldo asli di bank */
  untrackedExpense: 'Pengeluaran Tak Tercatat',
  /** selisih positif: ada uang masuk yang belum pernah dicatat */
  untrackedIncome: 'Pemasukan Tak Tercatat',
  /** kategori barisnya di Riwayat — bukan "koreksi" yang bikin bingung */
  adjustmentCategory: 'Koreksi Saldo',
  /** toast setelah koreksi benar-benar menulis baris (satu per arah selisih) */
  toastExpense: 'Saldo dikoreksi. Pengeluaran Tak Tercatat ditambahkan. 🪄',
  toastIncome: 'Saldo dikoreksi. Pemasukan Tak Tercatat ditambahkan. 🪄',
  /** keterangan live di modal, satu per arah selisih */
  modalHint: {
    expense: 'Pengeluaran Tak Tercatat akan ditambahkan otomatis ke catatanmu.',
    income: 'Pemasukan Tak Tercatat akan ditambahkan otomatis ke catatanmu.',
    none: 'Saldo di catatanmu sudah sama dengan saldo asli — tidak ada yang perlu dikoreksi.',
  },
} as const

/**
 * Warna garis & isian grafik arah saldo — diambil dari palet kanon
 * (Evergreen #45594e sebagai garis, Leaf #91bb9e sebagai isian;
 * rujukan docs/theme/PALETTE.md). Ditaruh di lapis data mengikuti pola
 * `ASSET_TYPE_META.color` di lib/data/wealth.ts supaya tidak ada hex yang
 * ditulis langsung di komponen.
 */
export const WALLET_TREND_COLORS = {
  stroke: '#45594e',
  fill: '#91bb9e',
} as const


/**
 * Popover aksi di kartu dompet halaman Dompet & Akun (/wallet).
 *
 * Ikut ditaruh di lapis data karena ia satu domain dengan halaman ini: aksi
 * "Buka detail" adalah pintu masuk ke /wallet/[id], dan labelnya tidak boleh
 * ditulis ulang di dalam JSX kartu — supaya penamaan aksi dompet konsisten di
 * seluruh app. Label "Sesuaikan Saldo" memakai WALLET_QUICK_ACTION_COPY.sync
 * (satu literal, dipakai popover /wallet DAN tombol sticky halaman detail).
 */
export const WALLET_CARD_MENU_COPY = {
  openDetail: 'Buka detail',
  openDetailHint: 'Saldo & riwayat dompet ini',
  /**
   * Nama aksi diseragamkan jadi “Pindah Dana” (paket 55) — labelnya dibaca dari
   * `TRANSFER_DOOR_COPY` di `lib/data/add-wallet.ts`, sumber yang sama dengan
   * entri menu “Lainnya”, sidebar desktop, dan judul sheetnya. Sebelumnya
   * popover ini bilang “Pindah Saldo” sementara halaman lain menyebut aksi yang
   * sama dengan nama berbeda — dan satu aksi dengan dua nama adalah bentuk
   * paling halus dari navigasi paralel yang dilarang PRD 2A.6.
   */
  transfer: TRANSFER_DOOR_COPY.menuLabel,
  transferHint: TRANSFER_DOOR_COPY.menuHint,
  syncHint: 'Smart Sync',
} as const

