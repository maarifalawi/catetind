import { HISTORY_TODAY_ISO, MASKED_AMOUNT, MONTHS_SHORT, type HistoryTransaction } from './history'
import { MONTHLY_INCOME } from './budget'
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

   PAKET 58 — Home berhenti membaca konstanta demo sebagai SUMBER ANGKA:
   `HOME_MONEY_GROUPS`/`HOME_MONEY_ROWS` di file ini turun pangkat jadi kanon
   data DEMO & bahan test (aturan audit §1.11: "seed lama boleh tetap ada sebagai
   data DEMO, tapi tidak boleh lagi menjadi sumber angka di komponen"). Kartu
   "Arus Uang" dan "Transaksi Terakhir" — plus "Distribusi Pengeluaran" yang dulu
   menulis segmennya sendiri (Rp 3.150.000, temuan #11) — sekarang membaca baris
   LEDGER NYATA dari `recordedTransactions()` (store yang sama dengan Jatah Hari
   Ini). Akibat yang disengaja dan diumumkan: pada akun tanpa catatan, kartu-kartu
   itu menampilkan EMPTY STATE yang jujur, bukan angka contoh. Baris yang dihapus
   user (tombstone) ikut hilang; baris yang DIEDIT memakai nilai barunya. Nominal
   seed di file ini TIDAK digeser (85.000 + 42.000 + 350.000 + 275.000 keluar ·
   7.500.000 masuk) — ia tetap jadi bukti hitung di test, tapi tidak lagi tampil
   di layar. Turunan murni kartu Home tinggal di sini: `homeRowsInLastDays()`
   (58.6), `groupHomeMoneyRows()` (label "Hari ini"/"Kemarin"),
   `distributionSegments()` (58.2), `activeLedgerDays()` (58.3), dan
   `homeCashFlowSeries()` + `monthShortFromISO()` (bulan label NYATA). */

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
 * sebelum jangkar. Uang keluar TIDAK berubah dari seed lama — 752.000 keluar
 * (85.000 + 42.000 + 350.000 + 275.000).
 *
 * PAKET 57 — satu perbaikan angka yang SENGAJA dan diumumkan: baris "Gaji
 * Bulanan" dulu 8.500.000 sementara seluruh sisa app memakai kanon 7.500.000
 * (`MONTHLY_INCOME`, `CONTEXT-WAJIB` §10.1), jadi satu Home bisa bercerita dua
 * angka gaji (temuan AKAR C audit 2026-09). Sekarang nominalnya membaca kanon
 * yang SAMA (`MONTHLY_INCOME`), jadi angka gaji demo tinggal satu: 7.500.000
 * masuk · 752.000 keluar · net 6.748.000.
 * PAKET 58 — baris seed di bawah BERHENTI menjadi sumber angka kartu Home
 * (temuan AKAR A: setelah akun dikosongkan, angka-angka ini tetap muncul). Ia
 * sekarang murni KANON DEMO + bahan test; kartu Home membaca ledger NYATA user.
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
      { id: 'seed-2', name: 'Gaji Bulanan', category: 'Pemasukan', time: '09:00', date: '2026-09-26', amount: MONTHLY_INCOME, type: 'income' },
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
 *
 * Paket 58 menambah kalimat EMPTY STATE di sini (Arus Uang, Distribusi
 * Pengeluaran, Transaksi Terakhir) supaya tidak ada satu pun string baru yang
 * ditulis di JSX — aturan §8 CONTEXT-WAJIB.
 */
export const HOME_MONEY_COPY = {
  /** PERIODE TUNGGAL kartu chart & kartu transaksi di layar yang sama */
  period: 'Bulan ini',
  /** subjudul kartu transaksi — daftar di kartu itu SEJAK PAKET 58 dibatasi
   *  7 hari kalender (58.6), jadi subjudulnya menyebut itu apa adanya */
  txnSubtitle: 'Catatan 7 hari terakhir',
  /** tombol kepala kartu menuju halaman Riwayat (filter lengkap ada di sana) */
  seeAll: 'Lihat semua',
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
  /** judul + EMPTY STATE Arus Uang (58.1) */
  chartTitle: 'Arus Uang',
  chartSubtitle: 'Pemasukan vs pengeluaran, per pekan',
  chartEmptyTitle: 'Arus uangmu belum tergambar',
  chartEmptyBody:
    'Grafik ini menggambar dari catatanmu sendiri — catat pemasukan & pengeluaran pertama, dan dua garisnya langsung hidup.',
  chartEmptyCta: '+ Catat Transaksi',
  /** judul + EMPTY STATE Distribusi Pengeluaran (58.2 · temuan #11) */
  distributionTitle: 'Distribusi Pengeluaran',
  distributionEmptyTitle: 'Belum ada pengeluaran bulan ini',
  distributionEmptyBody:
    'Mulai catat pengeluaranmu — di sini kelihatan kategori mana yang paling menelan. Nggak ada yang perlu dihakimi.',
  distributionEmptyCta: '+ Catat Pengeluaran',
  distributionTopLead: 'jadi pos terbesar',
  distributionTopTail: 'dari total pengeluaran',
  distributionDetailTail: 'dari total',
  /** EMPTY STATE Transaksi Terakhir (58.1) */
  txnTitle: 'Transaksi Terakhir',
  txnEmptyTitle: 'Belum ada catatan',
  txnEmptyBody: 'Catat yang pertama yuk! 🌱',
  txnEmptyCta: '+ Catat Transaksi',
  /** tautan "Lihat Riwayat" di dalam empty state (route nyata: /history) */
  historyLink: 'Lihat Riwayat',
} as const

/** label grup hari di kartu Transaksi Terakhir — satu definisi, bukan literal */
export const HOME_MONEY_DAY_LABEL = {
  today: 'Hari ini',
  yesterday: 'Kemarin',
} as const

/** geser tanggal ISO sejumlah hari (murni, UTC — bebas pergeseran timezone) */
function isoDaysBack(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

/** bulan pendek dari ISO `YYYY-MM-DD`; kosong = jatuh ke kanon demo */
export function monthShortFromISO(iso?: string): string {
  if (!iso || iso.length < 7) return HOME_MONEY_MONTH_SHORT
  const month = Number(iso.slice(5, 7))
  return MONTHS_SHORT[month - 1] ?? HOME_MONEY_MONTH_SHORT
}

/**
 * Baris 7 hari kalender terakhir (inklusif hari ini) — batas daftar "Transaksi
 * Terakhir" di Home (58.6). Yang lebih tua tetap bisa dibaca lengkap di
 * `/history`; Home cukup menampilkan yang masih segar.
 *
 * `todayIso` kosong (render server & render pertama client) ⇒ TIDAK menyaring:
 * snapshot server memang kosong, dan menyaring dengan tanggal karangan justru
 * bikin HTML server ≠ render pertama client.
 */
export function homeRowsInLastDays(
  rows: HomeMoneyRow[],
  todayIso: string,
  days = 7,
): HomeMoneyRow[] {
  if (!todayIso) return rows
  const startIso = isoDaysBack(todayIso, days - 1)
  return rows.filter((row) => row.date >= startIso && row.date <= todayIso)
}

/**
 * Batas JUMLAH baris kartu "Transaksi Terakhir" di Home (paket 64): maksimal 10
 * baris. Kartu ini ringkasan, bukan arsip — kalau seminggu penuh berisi puluhan
 * catatan, daftar yang panjang justru menenggelamkan kartu di bawahnya.
 * Daftar lengkap (tanpa batas) tetap hidup di `/history`.
 */
export const HOME_RECENT_MAX_ROWS = 10

/** potong daftar ke batas baris kartu Home; input dianggap sudah urut terbaru dulu */
export function capHomeRecentRows(
  rows: HomeMoneyRow[],
  max = HOME_RECENT_MAX_ROWS,
): HomeMoneyRow[] {
  return rows.length > max ? rows.slice(0, max) : rows
}

/** label satu hari: "Hari ini" / "Kemarin" / "21 Sep" (dari tanggal NYATA) */
export function homeMoneyGroupLabel(dateIso: string, todayIso: string): string {
  if (todayIso) {
    if (dateIso === todayIso) return HOME_MONEY_DAY_LABEL.today
    if (dateIso === isoDaysBack(todayIso, 1)) return HOME_MONEY_DAY_LABEL.yesterday
  }
  const day = Number(dateIso.slice(8, 10))
  const month = MONTHS_SHORT[Number(dateIso.slice(5, 7)) - 1] ?? ''
  return `${day} ${month}`.trim()
}

/**
 * Kelompokkan baris per tanggal untuk kartu "Transaksi Terakhir" — labelnya
 * diturunkan dari tanggal barisnya, bukan teks seed ("Hari ini"/"Kemarin" di
 * `HOME_MONEY_GROUPS` dulu hanya benar saat tanggal seed-nya bertepatan).
 */
export function groupHomeMoneyRows(
  rows: HomeMoneyRow[],
  todayIso: string,
): HomeMoneyGroup[] {
  const byDate = new Map<string, HomeMoneyRow[]>()
  for (const row of rows) {
    const list = byDate.get(row.date)
    if (list) list.push(row)
    else byDate.set(row.date, [row])
  }

  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({
      label: homeMoneyGroupLabel(date, todayIso),
      live: todayIso !== '' && date === todayIso,
      rows: list,
    }))
}

/**
 * Palet kanon segmen kategori — dirotasi menurut URUTAN segmen (BUKAN nama
 * kategori, karena kategori datang dari catatan user sendiri).
 *
 * Dipakai DUA permukaan yang menggambar kategori: kartu "Distribusi
 * Pengeluaran" di Home dan donut Rekap Mingguan. Satu konstanta supaya warna
 * kategori tidak pernah berbeda antar-kartu (sebelumnya tiap komponen punya
 * salinannya sendiri).
 */
export const HOME_DISTRIBUTION_PALETTE = ['#b5b987', '#91a0b8', '#ffb885', '#b89191'] as const

export interface HomeDistributionSegment {
  label: string
  amount: number
  pct: number
}

/** label gabungan kategori ke-5+ — jujur "Lainnya", bukan dipotong diam-diam */
export const HOME_DISTRIBUTION_REST_LABEL = 'Lainnya'

/**
 * Turunan SEGMEN "Distribusi Pengeluaran" dari baris NYATA user (58.2).
 *
 * Aturan yang dikunci:
 *   · hanya `type === 'expense'` — pemasukan/tabungan/pindah dana netral, sama
 *     seperti kanon `summarizeTransactions()` (net worth tidak berubah);
 *   · hanya nominal > 0 (baris 0 tidak menggambar segmen);
 *   · urut menurun — pos terbesar selalu segmen pertama;
 *   · kategori ke-5+ digabung ke `Lainnya`, persennya dihitung dari total itu.
 */
export function distributionSegments(
  rows: HomeMoneyRow[],
  maxSegments = 4,
): HomeDistributionSegment[] {
  const totals = new Map<string, number>()
  for (const row of rows) {
    if (row.type !== 'expense' || row.amount <= 0) continue
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount)
  }

  const sorted = [...totals.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
  const total = sorted.reduce((sum, seg) => sum + seg.amount, 0)
  if (total <= 0) return []

  const head = sorted.slice(0, Math.max(1, maxSegments))
  const tail = sorted.slice(head.length)
  if (tail.length > 0) {
    head.push({
      label: HOME_DISTRIBUTION_REST_LABEL,
      amount: tail.reduce((sum, seg) => sum + seg.amount, 0),
    })
  }

  return head.map((seg) => ({
    label: seg.label,
    amount: seg.amount,
    pct: Math.round((seg.amount / total) * 100),
  }))
}

/**
 * Jumlah TANGGAL unik di ledger (58.3) — sumber "hari aktif" tanaman, mengganti
 * `activeDays: 21` yang dulu konstanta. `todayIso` menentukan bulan berjalan;
 * kosong ⇒ semua tanggal dihitung (render server: ledgernya memang kosong, jadi
 * HTML server tetap sama dengan render pertama client).
 */
export function activeLedgerDays(rows: HistoryTransaction[], todayIso: string): number {
  const month = todayIso ? todayIso.slice(0, 7) : ''
  const dates = new Set<string>()
  for (const row of rows) {
    if (month && row.date.slice(0, 7) !== month) continue
    dates.add(row.date)
  }
  return dates.size
}

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
 *   3. `monthISO` (paket 58): label "Bulan ini" hanya boleh memuat baris bulan
 *      itu. Dulu semua baris dibucket apa pun bulannya, padahal sumbu-X-nya
 *      bilang "1 Sep"/"8 Sep". Sekarang baris di luar bulan dibuang dari seri —
 *      dan karena strip membaca TOTAL SERI, keduanya tetap mustahil berbeda.
 *      Tanpa `monthISO` (pemakaian lama/test), semua baris dibucket seperti dulu.
 */
export function homeCashFlowSeries(
  rows: HomeMoneyRow[],
  monthISO?: string,
): HomeCashFlowPoint[] {
  const monthShort = monthShortFromISO(monthISO)
  const points: HomeCashFlowPoint[] = Array.from({ length: HOME_MONEY_WEEK_COUNT }, (_, i) => ({
    label: `${1 + i * 7} ${monthShort}`,
    income: 0,
    expense: 0,
  }))

  for (const row of rows) {
    if (monthISO && row.date.slice(0, 7) !== monthISO) continue
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

/** ambang jam nudge harian: sebelum sore, "belum catat" masih wajar */
export const NUDGE_HOUR_THRESHOLD = 15

/**
 * Pemicu slot Nudge AI Coach di Home (58.4) — fungsi murni supaya perilakunya
 * bisa diuji tanpa DOM (repo ini tidak punya test komponen).
 *
 * Aturannya: nudge HANYA muncul kalau memang (a) jam perangkat sudah lewat
 * sore, (b) hari ini benar-benar belum ada catatan di ledger, dan (c) akunnya
 * tidak kosong. `forceShow` (mode demo) melewati (a) & (b) — TAPI tidak (c):
 * tidak ada gunanya menyuruh mencatat di akun yang isinya sudah dihapus.
 */
export function shouldShowDailyNudge(input: {
  hour: number | null
  hasRecordToday: boolean
  accountEmpty: boolean
  forceShow?: boolean
}): boolean {
  if (input.accountEmpty) return false
  if (input.forceShow) return true
  return (input.hour ?? 0) >= NUDGE_HOUR_THRESHOLD && !input.hasRecordToday
}
