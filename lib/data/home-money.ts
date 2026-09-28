import { HISTORY_TODAY_ISO, MASKED_AMOUNT, MONTHS_SHORT, type HistoryTransaction } from './history'
import type { TransactionType } from '../types'

/* ── RINGKASAN UANG HOME — SATU SUMBER (paket 35) ────────────────────────────
   Home punya DUA kartu yang bercerita soal uang yang sama: "Arus Uang" (chart
   pemasukan vs pengeluaran) dan "Transaksi Terakhir" (daftar + strip ringkasan).
   Sebelum paket 35 angkanya datang dari dua tempat: kartu transaksi menurunkan
   angkanya dari baris seed, sementara kartu chart masih memakai konstanta keras
   `INCOME = 8_500_000` / `EXPENSE = 752_000` + `SERIES` 5 titik. Nilai keduanya
   kebetulan SAMA saat seed, jadi begitu user mencatat pengeluaran Rp 25.000,
   strip kartu transaksi bergerak sementara chart di sebelahnya masih menulis
   "surplus Rp 7.748.000" untuk uang yang sama.

   File ini yang menutup celah itu:
     1. `HOME_MONEY_GROUPS` = baris seed kanon (satu-satunya tempat nominalnya
        ditulis), lengkap dengan tanggal ISO-nya.
     2. `homeMoneyRowFrom()` = pintu masuk catatan sesi dari
        `lib/money/store.ts` (satu-satunya store uang — TIDAK ada store kedua).
     3. `homeCashFlowSeries()` + `summarizeCashFlowSeries()` = turunan murni:
        seri 5 pekan dan totalnya dihitung dari himpunan baris yang SAMA, jadi
        jumlah tiap seri mustahil berbeda dari total di strip.
     4. `HOME_MONEY_COPY.period` = label periode TUNGGAL: dua kartu di satu layar
        menyebut string yang sama, bukan satu "Minggu ini" vs satu "bulan ini".

   Batas yang jujur (diperbarui paket 40): baris ini membaca catatan dari SATU
   store uang (`lib/money/store.ts`), bukan bus transaksi lama — dan baris yang
   dihapus user (tombstone) ikut hilang di sini juga, sama seperti di kartu
   "Transaksi Terakhir" dan halaman Riwayat. Dulu kartu ini sengaja tidak
   mengurangi total saat baris disembunyikan karena bus belum punya API hapus;
   sekarang tidak ada lagi dua himpunan baris yang bisa berbeda.

   Nominal seed SENGAJA tidak digeser: 8.500.000 masuk · 752.000 keluar · net
   7.748.000 tetap angka patokan audit. `lib/data/budget.ts` (`DAILY_HUD`) nol
   sentuhan dari paket ini. */

export interface HomeMoneyRow {
  /** id stabil: baris seed `seed-N`, baris sesi `session-<id>` */
  id: string
  name: string
  /** kategori apa adanya — dipakai sebagai label baris di kartu */
  category: string
  /** jam lokal `HH:MM` */
  time: string
  /** tanggal lokal `YYYY-MM-DD` — dipakai menyusun seri per pekan */
  date: string
  /** selalu positif; arah uang ditentukan `type` */
  amount: number
  type: TransactionType
}

export interface HomeMoneyGroup {
  /** label grup yang tampil ("Hari ini" / "Kemarin" / "21 Sep") */
  label: string
  /** grup hari berjalan → dot leaf berdenyut di kartu transaksi */
  live?: boolean
  rows: HomeMoneyRow[]
}

/**
 * Baris seed Home — satu-satunya tempat nominalnya ditulis.
 *
 * Tanggalnya ISO supaya chart bisa menyusun pekan tanpa menebak dari label.
 * Jangkar "hari ini" = `HISTORY_TODAY_ISO` (2026-09-27), tanggal yang sama
 * dengan catatan mock Riwayat & `TODAY_ISO` halaman Budget; "Kemarin" = sehari
 * sebelum jangkar. Nominal & jamnya TIDAK berubah dari seed lama — 8.500.000
 * masuk (Gaji Bulanan) dan 752.000 keluar (85.000 + 42.000 + 350.000 + 275.000).
 */
export const HOME_MONEY_GROUPS: HomeMoneyGroup[] = [
  {
    label: 'Hari ini',
    live: true,
    rows: [
      { id: 'seed-1', name: 'Starbucks', category: 'Makanan & Minuman', time: '14:32', date: '2026-09-27', amount: 85_000, type: 'expense' },
    ],
  },
  {
    label: 'Kemarin',
    rows: [
      { id: 'seed-2', name: 'Gaji Bulanan', category: 'Pemasukan', time: '09:00', date: '2026-09-26', amount: 8_500_000, type: 'income' },
      { id: 'seed-3', name: 'Grab', category: 'Transport', time: '08:15', date: '2026-09-26', amount: 42_000, type: 'expense' },
    ],
  },
  {
    label: '21 Sep',
    rows: [
      { id: 'seed-4', name: 'Listrik PLN', category: 'Tagihan', time: '19:40', date: '2026-09-21', amount: 350_000, type: 'expense' },
      { id: 'seed-5', name: 'Shopee', category: 'Belanja', time: '16:05', date: '2026-09-21', amount: 275_000, type: 'expense' },
    ],
  },
]

/** baris seed yang diratakan — kartu chart tidak peduli pengelompokan harinya */
export const HOME_MONEY_ROWS: HomeMoneyRow[] = HOME_MONEY_GROUPS.flatMap((group) => group.rows)

/** bulan periode (dari jangkar mock) — dipakai label sumbu-X & legend */
const HOME_MONEY_ANCHOR_MONTH = Number(HISTORY_TODAY_ISO.slice(5, 7))

/** bulan periode dalam bentuk pendek — "Sep" */
export const HOME_MONEY_MONTH_SHORT = MONTHS_SHORT[HOME_MONEY_ANCHOR_MONTH - 1]

/** 5 titik seri = 5 pekan dalam sebulan (tgl 1–7, 8–14, 15–21, 22–28, 29–31) */
export const HOME_MONEY_WEEK_COUNT = 5

/**
 * Copy ringkasan uang Home. Semua kalimat yang dipakai KEDUA kartu tinggal di
 * sini supaya label periode & insight bisa diaudit sekali jalan — persis alasan
 * `HOME_MONEY_COPY.period` ada: satu string, dua kartu.
 */
export const HOME_MONEY_COPY = {
  /** PERIODE TUNGGAL kartu chart & kartu transaksi di layar yang sama */
  period: 'Bulan ini',
  /** subjudul kartu transaksi — dulu "Aktivitas 3 hari terakhir", padahal yang
   *  diringkas di bawahnya periode bulan; sekarang sejalan dengan `period` */
  txnSubtitle: 'Catatan terbaru bulan ini',
  /** potongan strip kartu transaksi: "<period> +X masuk, -Y keluar — net Z" */
  txnInflow: 'masuk,',
  txnOutflow: 'keluar — net',
  /** badge kepala kartu chart — surplus/defisit, bukan selalu "Surplus" */
  chartBadgeSurplus: (pct: number) => `Surplus ${pct}%`,
  chartBadgeDeficit: (pct: number) => `Defisit ${pct}%`,
  /** strip insight kartu chart — tiga varian jujur, tidak ada klaim "hemat"
   *  saat pengeluaran justru melebihi pemasukan */
  chartSavedLabel: 'pemasukan',
  chartSavedTail: 'berhasil disimpan — surplus',
  chartSpentLabel: 'pemasukan terpakai',
  chartOverspendTail: 'pengeluaran lebih besar dari pemasukan — minus',
  chartNoIncome: 'Belum ada pemasukan di periode ini — catat pemasukan dulu biar arus uangnya kebaca 🌱',
} as const

/**
 * Terjemahkan catatan sesi dari store uang (`lib/money/store.ts`) jadi baris
 * ringkasan Home.
 *
 * Id-nya diberi prefiks `session-` supaya SAMA dengan id baris ledger di store
 * (`session-9001`): itulah kunci tombstone yang dipakai saat user menghapus
 * baris — hapus di Home, Riwayat, dan halaman dompet menunjuk baris yang sama.
 */
export function homeMoneyRowFrom(record: HistoryTransaction): HomeMoneyRow {
  return {
    id: `session-${record.id}`,
    name: record.name,
    category: record.category,
    time: record.time,
    date: record.date,
    amount: record.amount,
    type: record.type,
  }
}

export interface HomeMoneySummary {
  count: number
  income: number
  expense: number
  net: number
}

/**
 * Definisi uang masuk/keluar kartu Home — SAMA dengan kanon app-wide
 * (`summarizeTransactions` di `lib/data/history.ts`): pindah dana (tabungan &
 * transfer) NETRAL karena net worth user tidak berubah, jadi ia tidak dihitung
 * masuk maupun keluar.
 */
export function summarizeHomeMoney(rows: HomeMoneyRow[]): HomeMoneySummary {
  let income = 0
  let expense = 0
  for (const row of rows) {
    if (row.type === 'income') income += row.amount
    else if (row.type === 'expense') expense += row.amount
  }
  return { count: rows.length, income, expense, net: income - expense }
}

export interface HomeCashFlowPoint {
  /** label pekan untuk sumbu-X grafik, mis. "22 Sep" */
  label: string
  income: number
  expense: number
}

/**
 * Seri arus uang 5 pekan — TURUNAN dari baris yang sama dengan kartu "Transaksi
 * Terakhir", bukan angka kedua.
 *
 * Tiga aturan yang membuat dua kartu mustahil bercerita beda:
 *   1. setiap baris jatuh ke TEPAT satu pekan (`Math.floor((tgl - 1) / 7)`),
 *      jadi Σ(pengeluaran seri) ≡ total pengeluaran strip — bukan kebetulan,
 *      tapi konsekuensi;
 *   2. pindah dana netral, sama seperti strip;
 *   3. baris di luar bulan periode tetap DIHITUNG (dibucket menurut tanggalnya,
 *      plafon pekan ke-5), tidak dibuang — kalau dibuang, jumlah seri akan beda
 *      dari strip dan bug lama itu kembali.
 */
export function homeCashFlowSeries(rows: HomeMoneyRow[]): HomeCashFlowPoint[] {
  const points: HomeCashFlowPoint[] = Array.from({ length: HOME_MONEY_WEEK_COUNT }, (_, i) => ({
    label: `${1 + i * 7} ${HOME_MONEY_MONTH_SHORT}`,
    income: 0,
    expense: 0,
  }))

  for (const row of rows) {
    const day = Number(row.date.slice(8, 10))
    /* tanggal rusak (defensif) diperlakukan sebagai tanggal 1, bukan NaN yang
       bisa membuat `points[NaN]` undefined */
    const safeDay = Number.isFinite(day) && day > 0 ? day : 1
    const index = Math.min(Math.floor((safeDay - 1) / 7), points.length - 1)
    const point = points[index]
    if (row.type === 'income') point.income += row.amount
    else if (row.type === 'expense') point.expense += row.amount
  }

  return points
}

/**
 * Total dari SERI (bukan dari daftar baris mentah) — dipakai kartu chart supaya
 * angka di strip-nya mustahil berbeda dari jumlah titik di grafiknya sendiri.
 */
export function summarizeCashFlowSeries(
  points: HomeCashFlowPoint[],
): Omit<HomeMoneySummary, 'count'> {
  let income = 0
  let expense = 0
  for (const point of points) {
    income += point.income
    expense += point.expense
  }
  return { income, expense, net: income - expense }
}

/**
 * Batas atas sumbu-Y yang "bulat" (1 / 2 / 2,5 / 5 / 10 × 10ⁿ) — pengganti
 * konstanta keras `INCOME_MAX`/`EXPENSE_MAX`. Selalu ≥ nilai terbesar, jadi
 * garis puncak tidak pernah melewati kanvas walau nominalnya berubah setelah
 * user mencatat.
 */
export function niceAxisMax(value: number): number {
  if (!(value > 0)) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

/** tiga tick sumbu-Y: puncak (max), tengah, nol */
export function axisTicks(max: number): number[] {
  return [max, max / 2, 0]
}

/** dua desimal → tanpa nol ekor, pemisah koma (`8,5` · `4,25` · `10`) */
function shortNumber(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')
}

/**
 * Label rupiah pendek untuk sumbu-Y: `8,5 jt` · `500 rb` · `0`. Tanpa `Intl`
 * supaya hasilnya deterministik (HTML server = client) seperti formatter lain
 * di `lib/data/*`.
 */
export function shortRupiah(value: number): string {
  if (!value) return '0'
  if (Math.abs(value) >= 1_000_000) return `${shortNumber(value / 1_000_000)} jt`
  if (Math.abs(value) >= 1_000) return `${shortNumber(value / 1_000)} rb`
  return shortNumber(value)
}

/**
 * Label sumbu-Y saat mata privasi aktif.
 *
 * Sumbu chart adalah permukaan yang DIBACA dan angkanya menyiratkan nominal
 * (skala "8,5 jt" = pemasukan user), jadi ia ikut disensor — bukan dibiarkan
 * terbaca. §5.7 memang menyebut tooltip/ringkasan chart sebagai permukaan
 * baca, dan sumbu ini bagian dari itu.
 *
 * Sensornya SATU definisi (`MASKED_AMOUNT` di `lib/data/history.ts`), sama
 * dengan `hide()`/`money()` di `privacy-provider`; `0` pun ikut disamakan
 * supaya sumbunya tidak setengah terbaca (pola `ratioLabel` di
 * `lib/data/budget.ts`).
 */
export function axisLabel(value: number, masked: boolean): string {
  return masked ? MASKED_AMOUNT : shortRupiah(value)
}
