import { formatIDR } from '../wallets'
import { MONTHLY_INCOME, type BudgetScope } from './budget'
/* jendela Undo dibaca dari SATU definisi (`lib/data/history.ts`) — dipakai
   dialog hapus hutang & aset di sini supaya angka "5 detik" yang ditulis di
   layar benar-benar sama dengan yang berlaku di Riwayat & Tagihan */
import { UNDO_WINDOW_MS } from './history'

/** satu pintu impor untuk halaman Kekayaan & Hutang: komponennya cukup ambil dari sini */
export { formatIDR }
export { maskMoney } from './history'

/* ── PERSENTASE BULAT YANG SELALU BERJUMLAH 100% ─────────────────────────────
   Largest Remainder Method (Hamilton). Kenapa wajib:

   Membulatkan tiap potongan sendiri-sendiri (`Math.round(pct)`) bisa menghasilkan
   41 + 31 + 15 + 14 = 101% pada donut alokasi — angka mustahil yang langsung
   menghancurkan kredibilitas aplikasi finansial (audit fintech #3), dan bisa pula
   menghasilkan 99% yang bikin user mengira ada data hilang.

   Cara kerja: ambil `Math.floor` semua nilai dulu, hitung sisa slot menuju 100,
   lalu bagikan slot itu ke nilai dengan pecahan desimal TERBESAR. Hasilnya selalu
   bulat, selalu 100, dan selisihnya paling kecil terhadap nilai aslinya.

   Fungsi ini juga dipakai tombol tarik-tambang (label Aset/Hutang) supaya label
   82% + 18% tidak bisa berubah jadi 82% + 17% = 99%. */
export function splitPercents(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (!(total > 0)) return values.map(() => 0)

  const exact = values.map((value) => (value / total) * 100)
  const out = exact.map((value) => Math.floor(value))
  let remainder = 100 - out.reduce((sum, value) => sum + value, 0)

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)

  for (const { index } of byFraction) {
    if (remainder <= 0) break
    out[index] += 1
    remainder -= 1
  }
  return out
}

/* ── Kekayaan & Hutang / Wealth & Debt Tracking (/app/wealth) ────────────────
   Satu sumber data + logika murni (tanpa React) untuk halaman signature
   CatetInd (PRD Domain 2E):

   1. Portofolio investasi — reksadana, saham, emas, crypto — beserta turunan
      alokasi (donut) & return yang belum direalisasi.
   2. Dua kantong hutang: platform/berbunga (Kredivo, SPayLater, …) dan
      personal (teman/keluarga, dua arah: hutangku & piutangku).
   3. Dua visual khas halaman ini:
      - Tug-of-War: satu bar Aset (sage) vs Hutang (terracotta) + Net Worth.
      - Debt Snowball: bar per hutang platform, diurut dari saldo TERKECIL
        (metode Dave Ramsey) supaya melunasi hutang terasa seperti melumerkan
        gunung es — bukan daftar tabel yang bikin pusing.

   DEFINISI ASET (audit fintech #1 — jangan diubah tanpa alasan):
   `Aset` di angka Net Worth = KAS LIKUID (saldo seluruh dompet: BCA, GoPay,
   Tunai) + TOTAL ASET INVESTASI. Kas dibaca dari `walletAccountsTotal()`
   (lib/wallets.ts) — sumber yang sama dengan halaman Dompet & Akun — jadi tidak
   mungkin lagi ada user yang uangnya Rp 1 M di rekening tapi ditampilkan
   ber-Net-Worth nol karena belum punya saham.

   SEMUA PERSENTASE BULAT memakai `splitPercents()` (Largest Remainder Method)
   supaya satu kelompok label selalu berjumlah TEPAT 100% — donut alokasi tidak
   boleh lagi menampilkan 41+31+15+14 = 101% (audit fintech #3).

   Cicilan platform di sini bukan angka hiasan: `totalMonthInstallments()` yang
   dipotong dari income pool SEBELUM jatah harian dibagi (Domain 2B), dan
   `dtiBadge()` memakai warna kanon PRD 2E.2 — BUKAN merah.

   Catatan waktu: "sekarang" dipatok KONSTAN (`WEALTH_NOW_ISO`) dan semua
   timestamp ditampilkan dengan timeZone 'Asia/Jakarta'. Sebabnya dua:
   (1) HTML hasil render server & render pertama client jadi identik — tidak ada
   hydration mismatch pada label "Harga per …" atau peringatan harga basi;
   (2) demo bisa dipindah jam-nya dengan mengubah satu baris. Nanti saat data
   datang dari Supabase (`asset_price_cache`), konstanta ini yang diganti jam
   server — lihat fallback protocol PRD 2E.1.
   ────────────────────────────────────────────────────────────────────────── */

/* ── TIPE ──────────────────────────────────────────────────────────────────── */

export type AssetType = 'mutual_fund' | 'stock' | 'crypto' | 'gold'
export type WealthTab = 'investasi' | 'properti' | 'hutang'
/** segmented control Tab 3 — hutang yang gue punya vs piutang yang orang punya */
export type DebtView = 'hutangku' | 'piutangku'
export type DebtType = 'platform' | 'personal'
export type DebtDirection = 'owed_by_me' | 'owed_to_me'
export type DebtStatus = 'active' | 'settled'
/** warna kanon status (PRD 2B.2 / 2E.2) — resolusi: BUKAN merah */
export type Tone = 'sage' | 'amber' | 'terracotta'

export interface Investment {
  id: string
  /** id baris `investments` di Supabase (uuid) — `undefined` = belum dikirim (paket 64) */
  remoteId?: string
  type: AssetType
  name: string
  /** kode pasar / ticker: BBCA, BTC, RDPU, GOLD */
  symbol: string
  /** satuan mengikuti jenis: lot (saham), gram (emas), unit (reksadana), raw (crypto) */
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  totalInvested: number
  currentValue: number
  /** ISO UTC dari harga terakhir — ditampilkan apa adanya, tidak dipalsukan */
  lastUpdate: string
  /** dari backend `asset_price_cache.is_stale` (fallback protocol 2E.1) */
  isStale?: boolean
  /**
   * Konteks uang aset ini (paket 47) — Pribadi / Keluarga / Bersama.
   *
   * Model ini sebelumnya tidak punya konteks sama sekali, sehingga memilih
   * "Keluarga" di header halaman Kekayaan tidak mengubah daftarnya. Halaman
   * Kekayaan menyaring daftar tab dengan kolom ini, sementara Net Worth
   * (Tug-of-War bar) tetap menghitung SEMUA aset & hutang — konteks menyaring
   * daftar, bukan total (kanon paket 47).
   */
  scope: BudgetScope
}

/* ── PROPERTI / ASET FISIK (paket 63) ────────────────────────────────────────
   Rumah, tanah, kendaraan, logam mulia, perhiasan — aset yang nilainya diisi
   MANUAL user (tidak ada harga pasar seperti saham). Karena itu hanya ada dua
   angka: `purchasePrice` (harga beli) dan `currentValue` (nilai sekarang);
   selisihnya DITURUNKAN di UI, tidak disimpan. Nama kategori mengikuti enum
   database `physical_asset_category` supaya nilai kanon sama di mana pun. */
export type PhysicalAssetCategory =
  | 'rumah'
  | 'tanah'
  | 'kendaraan'
  | 'logam_mulia'
  | 'perhiasan'
  | 'lainnya'

export interface PhysicalAsset {
  id: string
  name: string
  category: PhysicalAssetCategory
  purchasePrice: number
  currentValue: number
  /** tanggal perolehan `YYYY-MM-DD` (opsional) */
  acquiredAt?: string
  note?: string
  /** konteks uang (paket 47) — sama seperti Investment/Debt */
  scope: BudgetScope
}

/** pilihan kategori Tab Properti (label sudah Bahasa Indonesia) */
export const PHYSICAL_ASSET_CATEGORY_OPTIONS: { id: PhysicalAssetCategory; label: string }[] = [
  { id: 'rumah', label: 'Rumah' },
  { id: 'tanah', label: 'Tanah' },
  { id: 'kendaraan', label: 'Kendaraan' },
  { id: 'logam_mulia', label: 'Logam mulia' },
  { id: 'perhiasan', label: 'Perhiasan' },
  { id: 'lainnya', label: 'Lainnya' },
]

/** label tampil satu kategori (fallback "Lainnya" — jangan menebak) */
export function physicalCategoryLabel(id: PhysicalAssetCategory): string {
  return PHYSICAL_ASSET_CATEGORY_OPTIONS.find((option) => option.id === id)?.label ?? 'Lainnya'
}

/** total nilai aset fisik (dipakai Net Worth & kartu ringkasan tab) */
export function totalPhysicalValue(list: PhysicalAsset[]): number {
  return list.reduce((sum, asset) => sum + (Number.isFinite(asset.currentValue) ? asset.currentValue : 0), 0)
}

/* ── HUTANG/PIUTANG ────────────────────────────────────────────────────────── */

/**
 * Hutang/piutang. Field platform (`tenor`, `currentMonth`, `monthlyInstallment`,
 * `interestRate`, `dueDate`) opsional karena hutang personal memang TIDAK punya
 * bunga/tenor/cicilan (PRD 2E.2) — sama seperti pola `Bill` di halaman Tagihan.
 */
export interface Debt {
  id: string
  /** id baris `debts` di Supabase (uuid) — `undefined` = belum dikirim (paket 64) */
  remoteId?: string
  type: DebtType
  /** nama paylater / KTA untuk hutang platform */
  provider?: string
  /** arah: 'owed_by_me' = aku hutang, 'owed_to_me' = dia hutang ke aku */
  direction?: DebtDirection
  /** nama teman/keluarga untuk hutang personal */
  counterparty?: string
  /** jumlah pokok saat pertama dicatat (lebar penuh bar snowball) */
  principal: number
  /** sisa yang belum dibayar (isi bar snowball) */
  remaining: number
  notes?: string
  status: DebtStatus
  /* — khusus platform — */
  tenor?: number
  currentMonth?: number
  monthlyInstallment?: number
  interestRate?: number
  /** jatuh tempo tiap bulan, tanggal 1–31 */
  dueDate?: number
  /**
   * Konteks uang hutang/piutang ini (paket 47) — Pribadi / Keluarga / Bersama.
   * Dipakai halaman Kekayaan untuk menyaring tab Hutang; Net Worth tetap
   * menghitung seluruh hutang & piutang (kanon paket 47).
   */
  scope: BudgetScope
}

/** satu baris riwayat beli/jual sebuah aset (mock; nanti investment_transactions) */
export interface AssetTransaction {
  id: string
  /**
   * FK ke `Investment.id` — bentuk yang sama dengan kolom
   * `investment_transactions.asset_id` di produksi. Karena itu ledger-nya satu
   * daftar datar, dan riwayat per aset adalah TURUNAN dari daftar itu
   * (`assetHistory`), bukan peta statis `{ assetId: [...] }` yang harus diurus
   * manual setiap kali ada aset baru.
   */
  assetId: string
  date: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
}

/**
 * Satu baris pembayaran hutang (mock; di produksi = tabel `debt_payments`
 * dengan kolom debt_id, amount, payment_date, wallet_id).
 *
 * `walletName` menyimpan NAMA dompet (pajangan riwayat), dan sejak paket 41
 * barisnya juga menyimpan `walletId` — id dompet KANON yang benar-benar
 * didebit/dikredit di ledger. Sebelumnya hanya nama yang ada, sehingga tidak
 * ada cara memastikan uangnya keluar dari dompet mana (temuan audit #1).
 */
export interface DebtPayment {
  id: string
  /** id baris `debt_payments` di Supabase (uuid) — `undefined` = belum dikirim (paket 64) */
  remoteId?: string
  debtId: string
  /** nominal yang benar-benar MENGHAPUS kewajiban/hak (pokok yang terlunasi) */
  amount: number
  /**
   * ISO. Pembayaran dari mock punya jam (jejak sistem), sedangkan pembayaran
   * yang dicatat user menyimpan TANGGALNYA saja (`YYYY-MM-DD`) apa adanya —
   * form "Catat Bayar" cuma bertanya tanggal, dan mengarang jam akan membuat
   * riwayat terlihat lebih presisi daripada datanya (sama seperti kolom
   * `payment_date DATE` di produksi).
   */
  paidAtISO: string
  walletName: string
  /** id dompet kanon (`bca`, `gopay`, …) — kunci baris ledger yang ditulis */
  walletId: string
  /** arah uang: `debt` = aku bayar hutangku, `receivable` = aku terima pelunasan piutang */
  kind: 'debt' | 'receivable'
  /** uang yang benar-benar berpindah tangan (bisa > `amount` kalau ada kembalian) */
  cashMoved?: number
  /** kembalian > 0 = user menyerahkan/menerima lebih dari sisa catatannya */
  changeAmount?: number
}

/** potongan donut alokasi aset */
export interface AllocationSlice {
  type: AssetType
  label: string
  emoji: string
  value: number
  /** persen bulat (dipakai teks legenda & tooltip) */
  pct: number
  color: string
}

/** satu baris Debt Snowball — semua angka sudah siap render */
export interface SnowballRow {
  debt: Debt
  emoji: string
  provider: string
  /** lebar track terhadap pokok TERBESAR — lebar = ukuran hutang asli */
  widthPct: number
  /** porsi yang masih tersisa (terracotta, dari kiri) */
  remainingPct: number
  /** porsi yang sudah lunas (sage) */
  paidPct: number
}

export interface DtiBadge {
  ratio: number
  tone: Tone
  label: string
  copy: string
  /** kelas pill siap pakai (palet kanon, TANPA merah) */
  pillClassName: string
}

/* ── KONSTANTA WAKTU & UANG (MOCK) ─────────────────────────────────────────── */

/** "sekarang" dipatok konstan — sumber tunggal untuk badge harga basi */
export const WEALTH_NOW_ISO = '2026-09-25T23:40:00Z'
/**
 * Angka gaji DEMO — SATU sumber (`MONTHLY_INCOME` di `lib/data/budget.ts`),
 * diteruskan di sini supaya pemanggil lama tidak putus.
 *
 * Sebelum paket 57 angka 7.500.000 hidup sebagai tiga salinan (`budget`, `bills`,
 * `wealth`) dan dipakai sebagai PEMBAGI rasio DTI seolah-olah itu pemasukan user.
 * Sekarang layar mengirim pemasukan dari konfigurasi user
 * (`lib/user-money-settings.ts`); konstanta ini tinggal default untuk test &
 * kanon demo.
 */
export { MONTHLY_INCOME }
/** tanggal "hari ini" yang dipatok — default field tanggal di sheet */
export const WEALTH_TODAY_ISO = '2026-09-25'
/** crypto boleh basi setelah 10 menit; saham/reksadana/emas 1x sehari (EOD) */
export const CRYPTO_FRESH_MINUTES = 10
export const DAILY_FRESH_HOURS = 24
/** zona waktu tampilan timestamp — dipatok supaya SSR & client identik */
export const WEALTH_TIME_ZONE = 'Asia/Jakarta'
/** plafon DTI: di atas ini badge pindah ke terracotta + copy empatik */
export const DTI_WATCH = 30
export const DTI_CAREFUL = 40

/* ── META JENIS ASET ────────────────────────────────────────────────────────
   Empat jenis aset memakai SATU keluarga warna: tangga sage (reksadana paling
   tua → crypto paling muda) plus amber kanon untuk emas. Tidak ada warna baru
   masuk ke palet CatetInd — `color` dipakai oleh donut Recharts, `dotClass`
   oleh legenda Tailwind. */
export const ASSET_TYPE_META: Record<
  AssetType,
  { label: string; emoji: string; unit: string; color: string; dotClass: string; chipClass: string }
> = {
  mutual_fund: {
    label: 'Reksadana',
    emoji: '📊',
    unit: 'unit',
    color: '#b5b987' /* sage paling tua */,
    dotClass: 'bg-[#b5b987]',
    chipClass: 'bg-[#b5b987]/12 text-forest',
  },
  stock: {
    label: 'Saham',
    emoji: '📈',
    unit: 'lot',
    color: '#b5b987' /* sage kanon */,
    dotClass: 'bg-hud-sage',
    chipClass: 'bg-hud-sage/25 text-forest',
  },
  gold: {
    label: 'Emas',
    emoji: '🪙',
    unit: 'gram',
    color: '#ffb885' /* amber hangat kanon */,
    dotClass: 'bg-hud-amber',
    chipClass: 'bg-hud-amber/25 text-[#b89191]',
  },
  crypto: {
    label: 'Crypto',
    emoji: '₿',
    unit: '' /* crypto memakai satuan raw koin */,
    color: '#e6e4c0' /* sage paling muda */,
    dotClass: 'bg-[#e6e4c0]',
    chipClass: 'bg-[#e6e4c0]/35 text-forest',
  },
}

/** urutan tetap alokasi — dipakai donut & legenda supaya warnanya konsisten */
export const ASSET_TYPE_ORDER: AssetType[] = ['mutual_fund', 'stock', 'gold', 'crypto']

/* ── PORTOFOLIO (MOCK) ─────────────────────────────────────────────────────── */
export const INITIAL_INVESTMENTS: Investment[] = [
  {
    id: '1',
    type: 'mutual_fund',
    name: 'Bibit Reksadana Pasar Uang',
    symbol: 'RDPU',
    quantity: 150.5432,
    avgBuyPrice: 42_000,
    currentPrice: 43_500,
    totalInvested: 6_322_814,
    currentValue: 6_548_630,
    lastUpdate: '2026-09-25T15:00:00Z',
    scope: 'pribadi',
  },
  {
    id: '2',
    type: 'stock',
    name: 'Bank BCA',
    symbol: 'BBCA',
    quantity: 5,
    avgBuyPrice: 9_250,
    currentPrice: 9_875,
    totalInvested: 4_625_000,
    currentValue: 4_937_500,
    lastUpdate: '2026-09-25T15:30:00Z',
    scope: 'pribadi',
  },
  {
    id: '3',
    type: 'crypto',
    name: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.00234,
    avgBuyPrice: 950_000_000,
    currentPrice: 980_000_000,
    totalInvested: 2_223_000,
    currentValue: 2_293_200,
    /* 3 jam 15 menit sebelum WEALTH_NOW_ISO → sengaja BASI (> 10 menit) supaya
       banner amber + tombol "Update Manual" (Section 5D) kelihatan hidup */
    lastUpdate: '2026-09-25T20:25:00Z',
    scope: 'pribadi',
  },
  {
    id: '4',
    type: 'gold',
    name: 'Emas Antam',
    symbol: 'GOLD',
    quantity: 2,
    avgBuyPrice: 1_100_000,
    currentPrice: 1_185_000,
    totalInvested: 2_200_000,
    currentValue: 2_370_000,
    lastUpdate: '2026-09-25T09:00:00Z',
    /* emas simpanan keluarga → konteks Keluarga. Sengaja BUKAN semua 'pribadi':
       konteks yang tidak punya isi akan menyembunyikan bug penyaring (paket 47). */
    scope: 'keluarga',
  },
]

/* ── HUTANG (MOCK) ─────────────────────────────────────────────────────────
   Dua platform aktif (Kredivo & SPayLater) + satu hutang personal ke Andi,
   satu piutang aktif (Rina) dan satu piutang yang sudah lunas (Budi) supaya
   tampilan "Sudah Lunas" di bawah daftar ikut teruji. */
export const INITIAL_DEBTS: Debt[] = [
  {
    id: '1',
    type: 'platform',
    provider: 'Kredivo',
    principal: 3_000_000,
    remaining: 2_500_000,
    tenor: 6,
    currentMonth: 2,
    monthlyInstallment: 550_000,
    interestRate: 2.95,
    dueDate: 10,
    status: 'active',
    scope: 'pribadi',
  },
  {
    id: '2',
    type: 'platform',
    provider: 'SPayLater',
    principal: 1_500_000,
    remaining: 750_000,
    tenor: 3,
    currentMonth: 2,
    monthlyInstallment: 520_000,
    interestRate: 2.5,
    dueDate: 25,
    status: 'active',
    scope: 'pribadi',
  },
  {
    id: '3',
    type: 'personal',
    direction: 'owed_by_me',
    counterparty: 'Andi',
    principal: 200_000,
    remaining: 200_000,
    notes: 'Makan siang kemarin',
    status: 'active',
    /* patungan makan bareng → konteks Bersama. Halaman Joint juga memakai
       konteks 'bersama', jadi keduanya bercerita sama (paket 47). */
    scope: 'bersama',
  },
  {
    id: '4',
    type: 'personal',
    direction: 'owed_to_me',
    counterparty: 'Rina',
    principal: 150_000,
    remaining: 150_000,
    notes: 'Nonton bioskop',
    status: 'active',
    scope: 'keluarga',
  },
  {
    id: '5',
    type: 'personal',
    direction: 'owed_to_me',
    counterparty: 'Budi',
    principal: 500_000,
    remaining: 0,
    notes: 'Dana darurat',
    status: 'settled',
    scope: 'pribadi',
  },
]

/* ── PEMBAYARAN HUTANG (MOCK, Section 7D) ────────────────────────────────────
   Ledger pembayaran yang membuat angka "Sudah dibayar" di kartu hutang bisa
   diaudit baris per baris. Jumlahnya sengaja COCOK dengan `debtPaid()` tiap
   hutang platform (pokok − sisa), jadi cerita di riwayat dan angka di kartu
   tidak pernah bertengkar:

     Kredivo   : 3.000.000 − 2.500.000 =   500.000 → 1 baris
     SPayLater : 1.500.000 −   750.000 =   750.000 → 2 baris (520.000 + 230.000)

   Setiap baris menyebut `walletId` dompet kanon yang benar-benar dipakai
   (`bca`, `gopay`, `tunai` — ketiganya ada di WALLET_SEED). Sebelum paket 41,
   baris ketiga menyebut "OVO": dompet yang TIDAK ada di ledger, sehingga pilihan
   itu mustahil mendebit saldo mana pun. Sekarang mock-nya jujur: yang dipakai
   memang dompet yang ada.

   Di produksi tabel ini (`debt_payments`) yang jadi sumber kebenaran, dan
   `remaining` dihitung `pokok − SUM(payments)` (PRD 2E.2 auto-calculate). */
export const INITIAL_DEBT_PAYMENTS: DebtPayment[] = [
  {
    id: 'pay-1',
    debtId: '2',
    amount: 520_000,
    paidAtISO: '2026-09-25T01:05:00Z',
    walletName: 'GoPay',
    walletId: 'gopay',
    kind: 'debt',
  },
  {
    id: 'pay-2',
    debtId: '1',
    amount: 500_000,
    paidAtISO: '2026-08-10T02:15:00Z',
    walletName: 'BCA',
    walletId: 'bca',
    kind: 'debt',
  },
  {
    id: 'pay-3',
    debtId: '2',
    amount: 230_000,
    paidAtISO: '2026-08-25T13:20:00Z',
    walletName: 'Tunai',
    walletId: 'tunai',
    kind: 'debt',
  },
]

/* ── FORMAT ─────────────────────────────────────────────────────────────────
   Angka desimal (kuantitas unit/gram/koin) ditulis manual — BUKAN
   `toLocaleString` — supaya pemisah ribuan (titik) & desimal (koma) sama persis
   di server dan browser tanpa bergantung pada data ICU mesin. */
export function formatNumber(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value)) return '0'
  const trimmed = value
    .toFixed(maxDecimals)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
  const [whole, decimals] = trimmed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimals ? `${grouped},${decimals}` : grouped
}

/** `150,5432 unit` · `5 lot` · `0,00234 BTC` · `2 gram` */
export function formatAssetQuantity(asset: Investment): string {
  const unit = ASSET_TYPE_META[asset.type].unit
  const amount = formatNumber(asset.quantity, asset.type === 'crypto' ? 6 : 4)
  /* crypto tidak punya satuan umum → pakai simbol koinnya sendiri */
  return unit ? `${amount} ${unit}` : `${amount} ${asset.symbol}`
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
] as const

/**
 * Timestamp harga dengan timezone DIPATOK: `25 Sep 2026, 22:00`.
 * Inilah label transparansi wajib PRD 2E.1 — halaman ini tidak pernah
 * berpura-pura harga real-time.
 */
export function formatPriceStamp(iso: string, withTime = true): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WEALTH_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const stamp = `${Number(pick('day'))} ${MONTHS_SHORT[Number(pick('month')) - 1]} ${pick('year')}`
  if (!withTime) return stamp
  return `${stamp}, ${pick('hour')}:${pick('minute')}`
}

/* ── TURUNAN PORTOFOLIO ────────────────────────────────────────────────────── */

export function totalInvestedValue(list: Investment[]): number {
  return list.reduce((sum, asset) => sum + asset.totalInvested, 0)
}

export function totalPortfolioValue(list: Investment[]): number {
  return list.reduce((sum, asset) => sum + asset.currentValue, 0)
}

/** return belum direalisasi (Rp + persen) — persen 0 saat belum ada modal */
export function unrealizedReturn(list: Investment[]): { value: number; pct: number } {
  const invested = totalInvestedValue(list)
  const value = totalPortfolioValue(list) - invested
  return { value, pct: invested === 0 ? 0 : (value / invested) * 100 }
}

export function assetReturn(asset: Investment): { value: number; pct: number } {
  const value = asset.currentValue - asset.totalInvested
  return {
    value,
    pct: asset.totalInvested === 0 ? 0 : (value / asset.totalInvested) * 100,
  }
}

/** alokasi per jenis aset, urutan tetap ASSET_TYPE_ORDER, jenis kosong dibuang */
export function allocationSlices(list: Investment[]): AllocationSlice[] {
  const rows = ASSET_TYPE_ORDER.map((type) => {
    const meta = ASSET_TYPE_META[type]
    const value = list
      .filter((asset) => asset.type === type)
      .reduce((sum, asset) => sum + asset.currentValue, 0)
    return { type, label: meta.label, emoji: meta.emoji, value, color: meta.color }
  }).filter((row) => row.value > 0)

  /* Largest Remainder Method dihitung SETELAH baris kosong dibuang, supaya
     persen yang tampil di legenda & donut selalu berjumlah TEPAT 100%. */
  const pct = splitPercents(rows.map((row) => row.value))
  return rows.map((row, index) => ({ ...row, pct: pct[index] ?? 0 }))
}

/* ── KESEGARAN HARGA (Section 5D) ──────────────────────────────────────────── */

/** umur harga dalam menit terhadap `WEALTH_NOW_ISO` (bukan jam mesin user) */
export function priceAgeMinutes(asset: Investment, nowIso: string = WEALTH_NOW_ISO): number {
  const age = new Date(nowIso).getTime() - new Date(asset.lastUpdate).getTime()
  return Math.max(0, Math.round(age / 60_000))
}

/**
 * Batas kesegaran per jenis: crypto 10 menit, sisanya 24 jam (EOD).
 * `is_stale` dari backend selalu menang kalau ada — aset itu yang bermasalah,
 * bukan seluruh halaman (PRD 2E.1 poin 5).
 */
export function isAssetStale(asset: Investment, nowIso: string = WEALTH_NOW_ISO): boolean {
  if (asset.isStale) return true
  const minutes = priceAgeMinutes(asset, nowIso)
  return asset.type === 'crypto'
    ? minutes > CRYPTO_FRESH_MINUTES
    : minutes > DAILY_FRESH_HOURS * 60
}

/**
 * Daftar aset yang harganya basi.
 *
 * Catatan audit fintech #7: halaman Kekayaan TIDAK lagi merender banner
 * agregat dari daftar ini — satu aset basi cukup diberi banner amber + tombol
 * "Update Manual" DI KARTUNYA SENDIRI, dan menambah pesan agregat di kaki
 * daftar hanya membuat halaman terasa rusak. Helper ini disimpan untuk pemakaian
 * lain (mis. badge ringkasan/notifikasi) yang butuh daftarnya, bukan pesannya.
 */
export function staleAssets(list: Investment[], nowIso: string = WEALTH_NOW_ISO): Investment[] {
  return list.filter((asset) => isAssetStale(asset, nowIso))
}

/** `Harga per 25 Sep 2026, 15:30` — label transparansi di daftar aset */
export function priceStampLabel(asset: Investment, withTime = true): string {
  return `Harga per ${formatPriceStamp(asset.lastUpdate, withTime)}`
}


/* ── TURUNAN HUTANG ─────────────────────────────────────────────────────────
   Arah pandang:
   - "Hutangku"  = platform (selalu aku yang hutang) + personal `owed_by_me`
   - "Piutangku" = personal `owed_to_me`
   Personal tidak pernah muncul di dua daftar sekaligus. */

export function platformDebts(debts: Debt[], includeSettled = false): Debt[] {
  return debts.filter(
    (debt) => debt.type === 'platform' && (includeSettled || debt.status === 'active'),
  )
}

/** personal per arah; yang `settled` dipisah supaya bisa diletakkan di bawah */
export function personalDebts(
  debts: Debt[],
  direction: DebtDirection,
): { active: Debt[]; settled: Debt[] } {
  const same = debts.filter((debt) => debt.type === 'personal' && debt.direction === direction)
  return {
    active: same.filter((debt) => debt.status === 'active'),
    settled: same.filter((debt) => debt.status === 'settled'),
  }
}

/** hutang yang AKU tanggung (platform + personal owed_by_me) — pembilang Net Worth */
export function activeDebtRemaining(debts: Debt[]): number {
  return debts
    .filter((debt) => debt.status === 'active' && debt.direction !== 'owed_to_me')
    .reduce((sum, debt) => sum + debt.remaining, 0)
}

/** total piutang aktif — dipakai ringkasan Tab 3 view Piutangku */
export function activeReceivableTotal(debts: Debt[]): number {
  return debts
    .filter((debt) => debt.status === 'active' && debt.direction === 'owed_to_me')
    .reduce((sum, debt) => sum + debt.remaining, 0)
}

/**
 * Cicilan platform bulan ini — angka yang DIPOTONG dari income pool sebelum
 * jatah harian dibagi (Domain 2B / PRD 2E.2).
 */
export function totalMonthInstallments(debts: Debt[]): number {
  return platformDebts(debts).reduce((sum, debt) => sum + (debt.monthlyInstallment ?? 0), 0)
}

export function dtiRatio(installments: number, income: number = MONTHLY_INCOME): number {
  if (income <= 0) return 0
  return Math.round((installments / income) * 100)
}

/**
 * Copy DTI saat pemasukan bulanan BELUM diatur (paket 57).
 *
 * `dtiRatio()` mengembalikan 0 kalau pembaginya <= 0 — kalau itu ditampilkan
 * apa adanya, kartunya berbunyi "DTI 0% — Sehat" untuk user yang pemasukannya
 * bahkan belum pernah diisi. Itu klaim aman yang tidak punya dasar, jadi
 * keadaannya dibedakan: label + satu kalimat yang menyebut jalan keluarnya.
 */
export const DTI_UNKNOWN_COPY = {
  label: 'Belum bisa dihitung',
  copy: 'Atur pemasukan bulananmu dulu — DTI membandingkan cicilan dengan pemasukanmu, bukan dengan angka contoh.',
} as const

/** Badge DTI — tiga nada kanon PRD 2E.2, copy empatik (bukan menakut-nakuti) */
export function dtiBadge(ratio: number): DtiBadge {
  if (ratio <= DTI_WATCH) {
    return {
      ratio,
      tone: 'sage',
      label: 'Sehat',
      copy: 'Beban cicilanmu ringan, mantap!',
      pillClassName: 'bg-hud-sage/25 text-forest ring-hud-sage/45',
    }
  }
  if (ratio <= DTI_CAREFUL) {
    return {
      ratio,
      tone: 'amber',
      label: 'Perlu perhatian',
      copy: 'Cicilan mulai lumayan — pantau terus ya',
      pillClassName: 'bg-hud-amber/25 text-[#b89191] ring-hud-amber/45',
    }
  }
  return {
    ratio,
    tone: 'terracotta',
    label: 'Hati-hati',
    copy: 'Beban cicilanmu agak tinggi. Yuk fokus lunasin dulu ya',
    pillClassName: 'bg-hud-terracotta/20 text-[#b89191] ring-hud-terracotta/45',
  }
}

export function debtPaid(debt: Debt): number {
  return Math.max(0, debt.principal - debt.remaining)
}

export function debtPaidPct(debt: Debt): number {
  if (debt.principal <= 0) return 0
  return Math.round((debtPaid(debt) / debt.principal) * 100)
}

/**
 * Riwayat pembayaran satu hutang, TERBARU di atas.
 *
 * Urutannya memakai TANGGAL saja (`YYYY-MM-DD`) — form "Catat Bayar" hanya
 * bertanya tanggal, jadi baris yang baru dicatat tidak boleh tenggelam di bawah
 * baris mock yang kebetulan punya jam, padahal tanggalnya sama.
 */
export function paymentsOfDebt(list: DebtPayment[], debtId: string): DebtPayment[] {
  return list
    .filter((payment) => payment.debtId === debtId)
    .sort((a, b) => b.paidAtISO.slice(0, 10).localeCompare(a.paidAtISO.slice(0, 10)))
}

/** `1 pembayaran tercatat` / `3 pembayaran tercatat` — label ringkas di header */
export function paymentCountLabel(count: number): string {
  return `${count} pembayaran tercatat`
}

/** estimasi total bunga = (cicilan × tenor) − pokok (PRD 2E.2 auto-calculate) */
export function estimatedInterest(debt: Debt): number {
  if (debt.type !== 'platform') return 0
  const total = (debt.monthlyInstallment ?? 0) * (debt.tenor ?? 0)
  return Math.max(0, total - debt.principal)
}


/**
 * Baris Debt Snowball: HANYA hutang platform aktif, diurut dari sisa TERKECIL.
 * Urutan inilah "permainannya" — user diajak menghabisi hutang terkecil dulu
 * supaya cepat dapat kemenangan pertama, lalu momentumnya dipakai ke hutang
 * berikutnya (metode bola salju Dave Ramsey).
 *
 * `keepId` (paket 50) menahan SATU hutang yang BARU SAJA lunas tetap digambar
 * sebentar. Sejak pelunasan ditulis ke store, status `settled` berlaku seketika
 * — tanpa penahan ini, bar yang mencair + confetti (signature halaman ini)
 * hilang sebelum sempat terlihat. Halaman Kekayaan mengirim `celebrateId`
 * selama animasinya berjalan; daftar hutangnya sendiri tetap dibaca dari store,
 * jadi tidak ada salinan data di komponen.
 */
export function snowballRows(debts: Debt[], keepId?: string | null): SnowballRow[] {
  const active = platformDebts(debts)
  const kept = keepId ? debts.find((debt) => debt.id === keepId && debt.type === 'platform') : undefined
  const rows = kept && !active.some((debt) => debt.id === kept.id) ? [...active, kept] : active
  /* lebar relatif dihitung dari SELURUH bar yang digambar (termasuk bar yang
     mencair) supaya lebar bar tidak melompat saat pelunasan dicatat */
  const maxPrincipal = rows.reduce((max, debt) => Math.max(max, debt.principal), 0)
  return [...rows]
    .sort((a, b) => a.remaining - b.remaining)
    .map((debt) => {
      const paidPct = debtPaidPct(debt)
      return {
        debt,
        emoji: providerEmoji(debt.provider),
        provider: debt.provider ?? 'Platform',
        widthPct: maxPrincipal === 0 ? 100 : (debt.principal / maxPrincipal) * 100,
        remainingPct: 100 - paidPct,
        paidPct,
      }
    })
}

/** progres keseluruhan snowball: 'Rp 1.250.000 / Rp 4.500.000 lunas (28%)' */
export function snowballProgress(debts: Debt[]): { paid: number; principal: number; pct: number } {
  const all = platformDebts(debts, true)
  const paid = all.reduce((sum, debt) => sum + debtPaid(debt), 0)
  const principal = all.reduce((sum, debt) => sum + debt.principal, 0)
  return { paid, principal, pct: principal === 0 ? 0 : Math.round((paid / principal) * 100) }
}

/** semua hutang yang aku tanggung sudah lunas? (celebration card, Section 8B) */
export function allDebtsSettled(debts: Debt[]): boolean {
  const mine = debts.filter((debt) => debt.direction !== 'owed_to_me')
  return mine.length > 0 && mine.every((debt) => debt.status === 'settled')
}

/* ── NILAI ASET TOTAL (audit fintech #1) ──────────────────────────────────── */

/**
 * Sisi ASET pada Net Worth: KAS LIKUID + TOTAL NILAI PORTOFOLIO INVESTASI.
 *
 * KAS LIKUID datang sebagai ARGUMEN (paket 40), bukan dibaca dari konstanta di
 * sini: satu-satunya sumber saldo dompet adalah store (`lib/money/store.ts`),
 * dan halaman Kekayaan membacanya lewat `cashTotal(snapshot)`. Sebelumnya
 * fungsi `liquidCashTotal()` di file ini membaca konstanta, sehingga Net Worth
 * tidak pernah ikut berubah saat user mengoreksi saldo di halaman Dompet —
 * dan angkanya bisa berbeda dari "Total Saldo" di Home (audit #1 & #3).
 *
 * Sebelum audit fintech #1, sisi aset hanya memakai `totalPortfolioValue()`
 * sehingga uang di rekening/e-wallet (yang notabene aset paling likuid) tidak
 * pernah dihitung.
 *
 * Paket 41 menambah potongan KETIGA: PIUTANG (`receivables`) — uang kita yang
 * masih dipegang orang lain. Nilainya datang dari catatan hutang/piutang
 * (`activeReceivableTotal`), bukan dari ledger kas, karena uangnya memang belum
 * ada di dompet mana pun.
 */
export function totalAssetValue(
  list: Investment[],
  liquidCash: number,
  receivables = 0,
): number {
  return netWorthParts({
    cash: liquidCash,
    investments: totalPortfolioValue(list),
    receivables,
    debts: 0,
  }).assets
}

/* ── TUG-OF-WAR (Section 3) ───────────────────────────────────────────────── */

export interface TugOfWar {
  assets: number
  debts: number
  netWorth: number
  /**
   * Porsi Aset presisi penuh (%) — SATU-SATUNYA angka yang boleh menentukan
   * lebar bar. Komponen mengikatnya ke `flexGrow`, bukan mengukur manual,
   * supaya lebar piksel mustahil berbeda dari data (audit fintech #2).
   */
  assetPct: number
  /** label bulat porsi Aset (%) — dibulatkan BERSAMA Hutang agar berjumlah 100 */
  assetPctLabel: number
  /** label bulat porsi Hutang (%) — assetPctLabel + debtPctLabel = 100 */
  debtPctLabel: number
  /** berapa kali aset lebih besar dari hutang (0 kalau hutang 0) */
  ratio: number
  positive: boolean
}

export function tugOfWar(assets: number, debts: number): TugOfWar {
  const span = assets + debts
  const assetPct = span === 0 ? 100 : (assets / span) * 100
  /* dua label dibulatkan sekaligus (Largest Remainder) supaya tidak pernah
     muncul 83% + 17% padahal ekspektasi desain 82% + 18% */
  const [assetPctLabel, debtPctLabel] = splitPercents(span === 0 ? [1, 0] : [assets, debts])
  return {
    assets,
    debts,
    netWorth: assets - debts,
    assetPct,
    assetPctLabel: assetPctLabel ?? 0,
    debtPctLabel: debtPctLabel ?? 0,
    ratio: debts === 0 ? 0 : assets / debts,
    positive: assets - debts >= 0,
  }
}

/* ── META PROVIDER PLATFORM (Section 7) ───────────────────────────────────── */

/** 6 provider terhardcode + freeform 'Lainnya' (PRD 2E.2) */
export const PLATFORM_PROVIDERS = [
  'Kredivo',
  'Akulaku',
  'SPayLater',
  'GoPay Later',
  'Home Credit',
  'Indodana',
] as const

const PROVIDER_EMOJI: Record<string, string> = {
  Kredivo: '💳',
  Akulaku: '🛒',
  SPayLater: '🛍️',
  'ShopeePay Pinjam': '🛍️',
  'GoPay Later': '👛',
  'Home Credit': '🏦',
  Indodana: '🏧',
}

export function providerEmoji(provider?: string): string {
  if (!provider) return '📄'
  return PROVIDER_EMOJI[provider] ?? '📄'
}

/** nama pihak lawan pada kartu personal — arah teks mengikuti view aktif */
export function counterpartyLabel(debt: Debt): string {
  const name = debt.counterparty ?? 'Tanpa nama'
  const toMe = debt.direction === 'owed_to_me'
  return toMe ? `${name} hutang ke aku` : `Aku hutang ke ${name}`
}

/**
 * Nama PENDEK satu catatan hutang/piutang (paket 61): provider untuk platform,
 * nama lawan untuk personal.
 *
 * Dipakai `aria-label` tombol aksi, dialog konfirmasi hapus, dan judul sheet
 * edit — semuanya butuh NAMA saja, bukan kalimat `counterpartyLabel()` yang
 * sudah menyebut arah ("Hapus Aku hutang ke Andi" terbaca aneh di dialog).
 */
export function debtName(debt: Debt): string {
  return debt.provider?.trim() || debt.counterparty?.trim() || 'Tanpa nama'
}

/** true kalau aliran uangnya menuju ke user (ikon panah masuk) */
export function debtPointsToMe(debt: Debt): boolean {
  return debt.direction === 'owed_to_me'
}


/* ── RIWAYAT TRANSAKSI ASET (MOCK, Section 5C) ─────────────────────────────
   Arah produksi: tabel `investment_transactions` (asset_id, type buy/sell,
   quantity, price_per_unit, transaction_date, fees, rdn_account) — dan
   `avg_buy_price` tiap aset DIHITUNG dari baris-baris ini (weighted average,
   PRD 2E.1 AC2). Karena itu bentuk mock-nya sudah meniru tabelnya: satu daftar
   datar dengan `assetId` di tiap baris, bukan peta statis yang isinya harus
   dirawat manual per aset.

   Konsekuensi yang memang diinginkan: aset yang belum punya baris ledger
   (mis. baru ditambahkan lewat sheet) menghasilkan daftar KOSONG, dan UI-nya
   menampilkan empty state jujur — bukan daftar tanpa penjelasan. */
export const INITIAL_ASSET_TRANSACTIONS: AssetTransaction[] = [
  { id: 't1', assetId: '1', date: '2026-07-05', side: 'buy', quantity: 60, price: 41_000 },
  { id: 't2', assetId: '1', date: '2026-08-10', side: 'buy', quantity: 50, price: 42_500 },
  { id: 't3', assetId: '1', date: '2026-09-01', side: 'buy', quantity: 40.5432, price: 41_800 },
  { id: 't4', assetId: '2', date: '2026-08-20', side: 'buy', quantity: 5, price: 9_250 },
  { id: 't5', assetId: '3', date: '2026-09-18', side: 'buy', quantity: 0.00134, price: 940_000_000 },
  { id: 't6', assetId: '3', date: '2026-09-22', side: 'buy', quantity: 0.001, price: 963_400_000 },
  { id: 't7', assetId: '4', date: '2026-06-12', side: 'buy', quantity: 1, price: 1_080_000 },
  { id: 't8', assetId: '4', date: '2026-09-02', side: 'buy', quantity: 1, price: 1_120_000 },
]

/** riwayat satu aset, TERBARU di atas — turunan dari ledger di atas */
export function assetHistory(list: AssetTransaction[], assetId: string): AssetTransaction[] {
  return list
    .filter((tx) => tx.assetId === assetId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** tanggal pendek untuk riwayat aset: `05 Jul 2026` */
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return `${String(day).padStart(2, '0')} ${MONTHS_SHORT[(month ?? 1) - 1]} ${year}`
}

/* ── PILIHAN DI SHEET (Section 5E & 7F) ───────────────────────────────────── */

export const ASSET_TYPE_OPTIONS: { id: AssetType; label: string }[] = ASSET_TYPE_ORDER.map(
  (type) => ({ id: type, label: `${ASSET_TYPE_META[type].emoji} ${ASSET_TYPE_META[type].label}` }),
)

/** label kuantitas yang menyesuaikan jenis aset (progressive disclosure 5E) */
export function quantityFieldLabel(type: AssetType): string {
  switch (type) {
    case 'stock':
      return 'Jumlah (Lot)'
    case 'gold':
      return 'Jumlah (Gram)'
    case 'mutual_fund':
      return 'Jumlah (Unit)'
    default:
      return 'Jumlah'
  }
}

/** akun RDN hanya relevan untuk saham (toggle di accordion "Detail Lanjutan") */
export const RDN_ACCOUNTS = [
  'Mirae Asset Sekuritas',
  'Mandiri Sekuritas',
  'Stockbit Sekuritas',
  'BNI Sekuritas',
  'Lainnya',
] as const

/* ── NET WORTH: SATU DEFINISI UNTUK SELURUH HALAMAN (paket 41) ───────────────
   Rumus ini dulu hidup di dalam komponen bar (`assets = cash + investments`),
   jadi piutang tidak pernah bisa masuk tanpa mengubah komponennya juga. Sekarang
   definisinya satu tempat dan diuji:

     Aset      = kas likuid + investasi + PIUTANG (uang kita yang ada di orang lain)
     Net Worth = Aset − hutang aktif

   Piutang masuk sisi ASET (audit fintech #2): sebelumnya `activeReceivableTotal()`
   ada tapi cuma dipajang di tab "Piutangku", sehingga orang yang meminjamkan
   Rp 500.000 terlihat lebih miskin Rp 500.000 di Net Worth.

   Komponennya TIDAK menerima satu angka jadi dari luar: ia menerima potongannya
   (`cash`, `investments`, `receivables`, `debts`) lalu menjumlahkan SENDIRI lewat
   fungsi ini, supaya mustahil ada halaman yang memakai definisi berbeda. */
export interface NetWorthParts {
  cash: number
  investments: number
  /** nilai ASET FISIK / properti (paket 63) — ikut sisi aset Net Worth */
  physical: number
  receivables: number
  debts: number
  assets: number
  netWorth: number
}

export function netWorthParts(input: {
  cash: number
  investments: number
  receivables: number
  debts: number
  /** opsional supaya pemanggil lama tetap sah; default 0 */
  physical?: number
}): NetWorthParts {
  const physical = Number.isFinite(input.physical) ? (input.physical as number) : 0
  const assets = input.cash + input.investments + input.receivables + physical
  return {
    cash: input.cash,
    investments: input.investments,
    physical,
    receivables: input.receivables,
    debts: input.debts,
    assets,
    netWorth: assets - input.debts,
  }
}

/* ── COPY TETAP (Section 7E & 8) ───────────────────────────────────────────── */

export const PERSONAL_SECTION_COPY =
  'Catat aja biar gak lupa, bukan buat ngejar-ngejar ya 😊'

export const SNOWBALL_TITLE = 'Debt Snowball Tracker'
export const SNOWBALL_HELP = 'Lunasi yang paling kecil dulu — biar cepat dapat kemenangan pertama 💪'
export const SNOWBALL_EMPTY = 'Belum ada hutang platform aktif. Bebas cicilan! 🌿'

export const EMPTY_INVESTASI_TITLE = 'Belum punya catatan investasi'
export const EMPTY_INVESTASI_COPY =
  'Saham, reksadana, crypto, emas — catat di sini biar tahu net worth kamu yang sebenarnya 📈🌿'
export const EMPTY_INVESTASI_CTA = 'Tambah Investasi Pertama'

export const EMPTY_HUTANG_TITLE = 'Gak ada hutang aktif'
export const EMPTY_HUTANG_COPY = 'Alhamdulillah! Atau mungkin ada yang belum dicatat? 😊'
export const EMPTY_HUTANG_CTA = 'Tambah Catatan'

export const EMPTY_PIUTANG_TITLE = 'Belum ada piutang tercatat'
export const EMPTY_PIUTANG_COPY = 'Kalau ada yang belum balikin duit, catat di sini biar rapi 😉'
export const EMPTY_PIUTANG_CTA = 'Tambah Catatan'

export const ALL_SETTLED_TITLE = 'Semua hutangmu LUNAS!'
export const ALL_SETTLED_COPY = 'Net worth kamu 100% bersih. Ini kerja keras yang nyata 🎉'

/** copy penghubung ke Daily HUD (Domain 2B) — angka diisi di komponen */
export function hudDeductionCopy(installments: string): string {
  return `💡 Cicilan ${installments} sudah dipotong dari Jatah Harian kamu`
}

/** micro-copy di bawah Net Worth (Section 3) */
export function netWorthCopy(positive: boolean, ratio: string): string {
  return positive
    ? `Asetmu ${ratio}x lebih besar dari hutang. Keep going! 💚`
    : 'Hutangmu masih lebih besar, tapi kamu udah mulai gerak. That counts! 🌱'
}

/* ── COPY: SHEET INVESTASI — DUA MODE (Section 5E) ──────────────────────────
   Satu sheet, dua mode. Yang berganti cuma judul, deskripsi, dan label tombol —
   formnya sama, jadi tidak ada dua komponen yang harus dijaga supaya perilakunya
   tetap identik (pola yang sama dengan sheet Tagihan).

   Nada mode edit sengaja tidak menyalahkan: yang user lakukan adalah
   MEMBETULKAN data (PRD 2E.1 — harga & nilai diisi manual), bukan bikin error. */
export const INVESTMENT_SHEET_COPY: Record<
  'add' | 'edit',
  { title: string; description: string; submit: string }
> = {
  add: {
    title: 'Tambah Investasi',
    description: 'Catat beli/jualnya — harga rata-rata kamu dihitung otomatis.',
    submit: 'Simpan Transaksi ✓',
  },
  edit: {
    title: 'Edit Aset',
    description: 'Perbaiki datanya — kartu & total portofolio langsung ikut berubah.',
    submit: 'Simpan Perubahan',
  },
}

/** label field harga yang ikut berganti arti antar mode */
export const INVESTMENT_PRICE_FIELD: Record<'add' | 'edit', { label: string; hint: string }> = {
  add: {
    label: 'Harga per unit',
    hint: 'Isi harga saat transaksi ini terjadi, bukan harga hari ini.',
  },
  edit: {
    label: 'Harga rata-rata beli (per unit)',
    hint: 'Modal kamu dihitung dari jumlah × harga ini. Harga pasar diubah lewat "Update Manual" di kartu aset.',
  },
}

/** judul kartu total di sheet, per mode: nilai transaksi vs nilai modal */
export const INVESTMENT_TOTAL_LABEL: Record<'add' | 'edit', string> = {
  add: 'Total',
  edit: 'Nilai modal',
}

/* ── COPY: HARGA MANUAL / BASI (Section 5D, PRD 2E.1 poin 3–4) ─────────────── */

/**
 * Warning amber kanon PRD 2E.1 poin 3 — menyebut JENIS asetnya, karena satu
 * sumber harga gagal tidak boleh terdengar seperti seluruh fitur mati.
 */
export function stalePriceWarning(assetTypeLabel: string, stamp: string): string {
  return `Harga ${assetTypeLabel} belum diperbarui. Update terakhir: ${stamp}`
}

/** timestamp "Terakhir diperbarui …" — satu-satunya stempel harga yang sah */
export function priceUpdatedLabel(stamp: string): string {
  return `Terakhir diperbarui ${stamp}`
}

export const PRICE_UPDATE_COPY = {
  title: 'Update Manual',
  description:
    'CatetInd gak nyambung ke bank/broker, jadi harga terakhir kamu isi sendiri — apa adanya.',
  fieldLabel: 'Harga sekarang (per unit)',
  fieldHint: 'Pakai harga yang kamu lihat di aplikasi broker/bursa hari ini.',
  submit: 'Simpan Harga Baru ✓',
  /** catatan transparansi: kapan angka ini dicatat (jam ditulis WIB) */
  stampNote: (stamp: string) => `Waktu update dicatat ${stamp} WIB.`,
  toastTitle: 'Harga diperbarui! ✅',
  toastDescription: (name: string) => `${name} sekarang memakai harga yang baru kamu isi.`,
  valueLabel: 'Nilai aset setelah update',
  returnLabel: 'Return setelah update',
}

/* ── COPY: RIWAYAT TRANSAKSI ASET (Section 5C) ─────────────────────────────── */
export const ASSET_HISTORY_TITLE = 'Riwayat Beli/Jual'
export const ASSET_HISTORY_EMPTY = 'Belum ada transaksi beli/jual untuk aset ini.'
export const ASSET_HISTORY_EMPTY_HINT =
  'Riwayat dibaca dari transaksi beli/jual aset, bukan dari nilai yang kamu isi di "Edit Aset" — jadi aset yang nilainya diisi manual bisa tampil kosong di sini.'
export const ASSET_HISTORY_FOOTNOTE =
  'Harga rata-rata dihitung otomatis (weighted average) dari riwayat ini.'

/* ── COPY: RIWAYAT PEMBAYARAN HUTANG (Section 7D) ──────────────────────────── */
export const PAYMENT_HISTORY_TITLE = 'Riwayat Pembayaran'
export const PAYMENT_HISTORY_EMPTY = 'Belum ada pembayaran tercatat untuk hutang ini.'
export const PAYMENT_HISTORY_EMPTY_HINT =
  'Setiap kali kamu tekan "Catat Bayar", tanggal & dompet sumbernya tersimpan di sini.'

/* ── COPY: TOAST AKSI ASET (dipakai wealth-screen) ─────────────────────────── */
export const ASSET_EDIT_TOAST = {
  title: 'Aset diperbarui ✅',
  description: (name: string) => `Kartu & total portofolio ${name} sudah disesuaikan.`,
}

/* ── COPY: EDIT & HAPUS HUTANG/ASET (paket 61) ───────────────────────────────
   Sebelum paket 61 halaman Kekayaan cuma punya jalur TAMBAH untuk hutang:
   `editDebt()` & `deleteDebt()` sudah ada & teruji di store sejak paket 50,
   tapi tidak punya tombol sama sekali — jadi user yang salah mengetik sisa
   hutangnya tidak punya cara membetulkan, dan catatan yang tidak dipakai lagi
   tidak punya pintu keluar (diakui sendiri di laporan 50 §8 poin 4).

   Semua kalimatnya tinggal di sini (kanon repo: copy user-facing bukan literal
   di JSX), dan sengaja dipakai BERSAMA oleh hutang & aset supaya keduanya jadi
   SATU pengalaman — bukan dua dialek dialog (paket 61.2). */

/** sheet Tambah/Edit utang-piutang: satu sheet, dua mode (pola `INVESTMENT_SHEET_COPY`) */
export const DEBT_SHEET_COPY: Record<
  'add' | 'edit',
  { title: string; description: string; submit: string }
> = {
  add: {
    title: 'Tambah Utang / Piutang',
    description: 'Catat aja dulu — nanti bisa ditandai lunas kapan pun.',
    submit: 'Simpan ✓',
  },
  edit: {
    title: 'Edit Utang / Piutang',
    description:
      'Betulkan datanya — kartu, DTI, dan Net Worth langsung ikut berubah. Pelunasan tetap lewat "Catat Bayar" supaya selalu ada baris kasnya.',
    submit: 'Simpan Perubahan',
  },
}

/** label aksi per baris kartu (hutang & aset memakai label yang sama) */
export const WEALTH_ROW_ACTION = {
  edit: 'Edit',
  remove: 'Hapus',
  /**
   * `aria-label` tombol ikon — menyebut nama catatannya, karena "Edit" telanjang
   * tidak memberi tahu tombol mana yang sedang dibaca pembaca layar.
   */
  editAria: (name: string) => `Edit ${name}`,
  removeAria: (name: string) => `Hapus ${name}`,
} as const

/** label status lunas (satu ejaan untuk seluruh halaman Kekayaan) */
export const DEBT_STATUS_COPY = {
  settled: 'Lunas',
} as const

/**
 * Kolom & pesan validasi yang HANYA muncul di mode EDIT utang/piutang (paket 61).
 *
 * Kenapa kolom "sisa" perlu ada: `Debt` menyimpan DUA angka — `principal`
 * (pokok saat pertama dicatat) dan `remaining` (sisa yang belum dibayar, yaitu
 * angka yang dihitung di Net Worth & DTI). Store sengaja mengizinkan keduanya
 * dibetulkan karena catatan ini diisi MANUAL; tanpa kolom ini, salah ketik sisa
 * = Net Worth salah sampai catatannya dihapus.
 */
export const DEBT_SHEET_FIELD_COPY = {
  /** label pokok di mode edit — pasangan dari kolom sisa di bawahnya */
  principalLabel: 'Jumlah pokok (Rp)',
  remainingLabel: 'Sisa belum dibayar (Rp)',
  remainingHint: 'Yang dihitung di Net Worth & DTI adalah sisa ini, bukan pokoknya.',
  /**
   * Sisa > pokok bukan "hutang yang membesar", itu salah ketik — dan kalau
   * dibiarkan, uang yang sudah keluar tidak akan punya jejak kas sama sekali.
   */
  overPrincipal:
    'Sisa tidak boleh lebih besar dari pokoknya. Kalau uangnya memang sudah keluar, catat lewat "Catat Bayar" supaya ada baris kasnya.',
}

/** toast setelah satu catatan hutang/piutang dibetulkan */
export const DEBT_EDIT_TOAST = {
  title: 'Catatan diperbarui ✅',
  description: (name: string) =>
    `${name} sudah dibetulkan — kartu, DTI, dan Net Worth ikut menyesuaikan.`,
}

/* ── COPY: DIALOG HAPUS (WAJIB JUJUR — keputusan paket 50) ──────────────────
   Yang tidak boleh disembunyikan dialog ini:

     · menghapus catatan hutang TIDAK menghapus baris kas. Uang yang sudah
       dibayar itu fakta, dan barisnya tetap ada di Riwayat;
     · yang benar-benar berubah adalah DAFTAR + Net Worth — jadi akibatnya
       disebut dengan arah yang benar (hutang hilang → Net Worth NAIK,
       piutang/aset hilang → Net Worth TURUN), bukan "berkurang" yang samar;
     · saldo dompet tidak tersentuh sama sekali oleh dua-duanya.

   `bodyLead`/`bodyTail` dipotong dua supaya nominalnya bisa ditebalkan di
   tengah kalimat (bentuk yang sama dengan `CONFIRM_DELETE_COPY` di Riwayat). */

/** jenis catatan dari sudut pandang user */
type DebtKindCopy = 'hutang' | 'piutang'

const DELETE_SAFETY_COPY = `Tenang — masih bisa kamu balikin lewat tombol Undo selama ${
  UNDO_WINDOW_MS / 1000
} detik.`

export const DELETE_DEBT_COPY = {
  /** overlay = tombol "batal" tak terlihat di belakang dialog */
  overlay: 'Batal hapus catatan hutang',
  title: (kind: DebtKindCopy) =>
    kind === 'piutang' ? 'Hapus catatan piutang ini?' : 'Hapus catatan hutang ini?',
  bodyLead: (name: string) => `Catatan ${name} sebesar `,
  bodyTail: (kind: DebtKindCopy) =>
    kind === 'piutang'
      ? 'keluar dari daftar. Piutang itu tidak lagi dihitung sebagai aset, jadi Net Worth turun sebesar itu.'
      : 'keluar dari daftar. Hutang itu tidak lagi dihitung, jadi Net Worth naik sebesar itu.',
  /** fakta uang: yang dihapus cuma catatannya */
  cashNote:
    'Pembayaran yang sudah kamu catat TIDAK ikut terhapus: uang yang sudah berpindah tangan itu fakta, dan barisnya tetap ada di Riwayat. Saldo dompetmu tidak berubah sama sekali.',
  safety: DELETE_SAFETY_COPY,
  cancel: 'Batal',
  confirm: 'Hapus',
} as const

export const DELETE_ASSET_COPY = {
  overlay: 'Batal hapus aset',
  title: 'Hapus aset ini?',
  bodyLead: (name: string) => `Aset ${name} senilai `,
  bodyTail:
    'keluar dari portofolio, dan nilai pasar yang dihitung di Net Worth ikut hilang sebesar itu.',
  /** aset memang tidak pernah menyentuh kas — supaya user tidak menebak */
  cashNote:
    'Halaman Kekayaan tidak menyentuh saldo dompet: menghapus aset tidak menambah maupun mengurangi uang di BCA/GoPay/Tunai.',
  safety: DELETE_SAFETY_COPY,
  cancel: 'Batal',
  confirm: 'Hapus',
} as const

export const DELETE_DEBT_TOAST = {
  title: 'Catatan hutang dihapus',
  description: (name: string) => `${name} keluar dari daftar hutangmu.`,
  undo: 'Undo',
  undoneTitle: 'Catatan dikembalikan 🌿',
  undoneDescription: 'Catatannya balik ke daftar — riwayat pembayarannya ikut utuh.',
  expired:
    'Jendela Undo-nya sudah lewat — catatannya bisa kamu tambahkan lagi kalau memang masih perlu 🌿',
} as const

export const DELETE_ASSET_TOAST = {
  title: 'Aset dihapus',
  description: (name: string) => `${name} keluar dari portofolio.`,
  undo: 'Undo',
  undoneTitle: 'Aset dikembalikan 🌿',
  undoneDescription: 'Nilainya balik ke portofolio & Net Worth seperti semula.',
  expired: 'Jendela Undo-nya sudah lewat — asetnya bisa kamu tambahkan lagi kapan aja 🌿',
} as const

/* ── TAB PROPERTI / ASET FISIK (paket 63) ────────────────────────────────────
   Tab ini DULU cuma teaser ("belum bisa dikelola", PRD A12). Atas permintaan
   pemilik produk, ia sekarang NYATA: user bisa mencatat rumah, tanah, kendaraan,
   logam mulia, perhiasan — dan nilainya IKUT dihitung ke Total Kekayaan
   (`netWorthParts()` di atas). Semua teksnya di sini supaya nol string di JSX. */

export const PHYSICAL_TAB_COPY = {
  title: 'Properti & Aset Fisik',
  blurb: 'Rumah, tanah, kendaraan, logam mulia, perhiasan — nilainya kamu isi sendiri.',
  totalLabel: 'Total nilai aset fisik',
  addLabel: 'Tambah Aset',
  emptyTitle: 'Belum ada aset fisik tercatat',
  emptyBody:
    'Rumah, kendaraan, atau barang berharga? Catat di sini biar Total Kekayaan kamu menggambarkan kondisi sebenarnya 🏠',
  emptyCta: 'Tambah Aset Pertama',
  gainLabel: 'Naik',
  lossLabel: 'Turun',
  flatLabel: 'Stabil',
  purchaseLabel: 'Harga beli',
  currentLabel: 'Nilai sekarang',
  diffLabel: 'Selisih',
  form: {
    addTitle: 'Tambah Aset Fisik',
    editTitle: 'Edit Aset Fisik',
    name: 'Nama aset',
    namePlaceholder: 'Contoh: Rumah Depok',
    category: 'Kategori',
    purchasePrice: 'Harga beli',
    currentValue: 'Nilai sekarang',
    acquiredAt: 'Tanggal perolehan (opsional)',
    note: 'Catatan (opsional)',
    save: 'Simpan',
    cancel: 'Batal',
    needName: 'Isi nama asetnya dulu ya 🌿',
    needValue: 'Isi nilai sekarangnya dulu ya 🌿',
  },
  delete: {
    title: 'Hapus aset ini?',
    body: (name: string) =>
      `“${name}” akan keluar dari daftar & dari Total Kekayaan. Bisa kamu balikin lewat Undo sesaat setelah ini.`,
    confirm: 'Hapus',
    cancel: 'Batal',
  },
  toast: {
    added: 'Aset dicatat! 🏠',
    edited: 'Aset diperbarui',
    deleted: (name: string) => `${name} dihapus dari daftar.`,
    undo: 'Undo',
    restoredTitle: 'Aset dikembalikan 🌿',
    restoredBody: 'Nilainya balik ke Total Kekayaan seperti semula.',
    undoExpired: 'Jendela Undo-nya sudah lewat — asetnya bisa kamu tambahkan lagi kapan aja 🌿',
  },
} as const

/* ── ASET CONTOH — hanya untuk MODE DEMO/review desain, BUKAN data user ──────
   Store (`lib/money/physical-store.ts`) hanya memakainya saat
   `showsSampleData()` true (mode demo/desain); di build produksi daftar ini
   TIDAK tampil sebagai milik user — empty state yang benar. */
export const INITIAL_PHYSICAL_ASSETS: PhysicalAsset[] = [
  {
    id: 'pa-1',
    name: 'Rumah Depok',
    category: 'rumah',
    purchasePrice: 650_000_000,
    currentValue: 720_000_000,
    acquiredAt: '2021-06-12',
    scope: 'keluarga',
  },
  {
    id: 'pa-2',
    name: 'Emas Antam 50g',
    category: 'logam_mulia',
    purchasePrice: 62_000_000,
    currentValue: 78_500_000,
    acquiredAt: '2023-02-01',
    scope: 'pribadi',
  },
  {
    id: 'pa-3',
    name: 'Motor Vario',
    category: 'kendaraan',
    purchasePrice: 24_000_000,
    currentValue: 15_000_000,
    acquiredAt: '2020-11-20',
    scope: 'pribadi',
  },
]


