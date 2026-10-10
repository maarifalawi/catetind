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

/**
 * Jumlah hari dalam bulan ISO `YYYY-MM` (paket 70) — sumber PANJANG seri
 * "Arus Uang".
 *
 * Kenapa ini ada: serinya dulu dipaku 5 pekan (tgl 1–7, 8–14, 15–21, 22–28,
 * 29–31), jadi label sumbu-X terakhir SELALU "29 <bulan>" — walau bulannya
 * punya 31 hari. Pemilik produk menandai itu sebagai bug ("kok cuma sampai
 * tanggal 29?"). Sekarang panjang serinya = jumlah hari bulan itu apa adanya.
 *
 * Fungsi murni (tanpa state/jam) supaya bisa diuji langsung: `Date.UTC` dipakai,
 * bukan waktu lokal, jadi hasilnya tidak bergeser mengikuti timezone mesin.
 */
export function daysInMonth(monthISO: string): number {
  const year = Number(monthISO.slice(0, 4))
  const month = Number(monthISO.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return 31
  /* "hari ke-0 bulan berikutnya" = hari terakhir bulan ini */
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

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
  /* ── KARTU "ARUS UANG" (paket 66 — visualisasinya digambar ULANG) ──────────
     Bentuk lama: dua spline + dua area + grid penuh + strip insight panjang
     ("93% pemasukan berhasil disimpan — surplus Rp …"). Permintaan pemilik
     produk: visualisasinya dimaksimalkan, lebih ramah dibaca, dan bukan grafik
     garis "pasaran". Bentuk baru: kolom PASANG-SURUT per pekan (uang masuk naik,
     uang keluar turun dari SATU garis nol), tiga angka kunci, dan pekan yang
     bisa diketuk untuk melihat rincinya. Karena itu:
       · subjudul "Pemasukan vs pengeluaran, per pekan" → DIHAPUS (kolomnya
         sudah bicara sendiri, dan judul kartu sudah menyebut "Arus Uang");
       · strip insight kalimat panjang → DIHAPUS (badge kepala sudah menyebut
         surplus/defisit %, tiga angka kunci sudah menyebut masuk/keluar/sisa). */
  /** tiga angka kunci di atas grafik */
  chartIncomeLabel: 'Pemasukan',
  chartExpenseLabel: 'Pengeluaran',
  /** netto periode ini — "Sisa" lebih ramah daripada "Net" */
  chartNetLabel: 'Sisa',
  /** aria grafik (tidak tampil): menyebut bahwa tiap titik = satu tanggal */
  chartAria: 'Grafik arus uang harian bulan ini — tiap titik satu tanggal',
  /** judul kecil pekan aktif di strip rincian */
  chartWeekLabel: (label: string) => `Pekan ${label}`,
  /** satu kolom pekan untuk pembaca layar (nominal sudah tersensor di pemanggil) */
  chartColumnAria: (label: string, income: string, expense: string) =>
    `Pekan ${label}: pemasukan ${income}, pengeluaran ${expense}`,
  /* ── KARTU "ARUS UANG" (paket 68 — digambar ulang jadi garis minimalis) ────
     Bentuk paket 67 (peta aliran alluvial + "irama pekan") terasa berat bagi
     pemilik produk. Bentuk paket 68: SATU grafik garis spline halus tanpa grid
     & tanpa sumbu tebal — hanya dua kurva (masuk & keluar) dengan area gradient
     yang memudar, plus tooltip minimalis (tanggal + nominal). Dua label arah di
     tooltip hidup di sini; legenda inline memakai label angka kunci yang SUDAH
     ada (`chartIncomeLabel`/`chartExpenseLabel`) supaya tidak lahir sinonim
     baru. `buildFlowMap()` + copy paket 66/67 TIDAK dihapus: geometri alluvial
     tetap teruji di `home-money.test.ts`, jadi ia masih punya rumahnya bila
     bentuk itu dibutuhkan lagi. */
  chartTooltipIncome: 'Masuk',
  chartTooltipExpense: 'Keluar',
  /* ── KARTU "ARUS UANG" (paket 67 — visualisasi digambar ULANG lagi) ─────────
     Bentuk paket 66 (kolom pasang-surut per pekan) masih terasa "grafik
     pasaran" bagi pemilik produk. Bentuk paket 67: PETA ALIRAN (alluvial) —
     uang masuk digambar sebagai satu simpul, lalu PECAH jadi dua pita: yang
     benar-benar keluar ("Pengeluaran") dan yang benar-benar disimpan ("Sisa").
     Pita yang mengalir = visualnya, tebal pita = besarnya. Ditambah "Irama
     pekan" (deret gelembung) supaya cerita per-pekan tetap hidup tanpa
     kembali ke batang/garis. Copy di bawah menemani bentuk baru itu. */
  /** label kecil di atas peta aliran */
  chartFlowLabel: 'Ke mana uangmu mengalir',
  /** label simpul saat uang keluar melebihi uang masuk (pita masuk tambahan) */
  chartDeficitLabel: 'Defisit',
  /** judul strip irama pekan (deret gelembung di bawah peta aliran) */
  chartRhythmLabel: 'Irama pekan',
  /** satu-satunya kalimat di kartu saat belum ada pemasukan (pengeluaran saja) */
  chartNoIncome:
    'Belum ada pemasukan di periode ini — catat pemasukan dulu biar arus uangnya kebaca 🌱',
  /** judul + EMPTY STATE Arus Uang (58.1) */
  chartTitle: 'Arus Uang',
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
  /** caption TENGAH donat Distribusi Pengeluaran (paket 68 — bentuk "pie
   *  modern"). Sengaja pendek ("Total") supaya muat di lubang donat; nominalnya
   *  menyusul di bawah label, dan porsi per kategori hidup di legend di
   *  sampingnya. */
  distributionCenterLabel: 'Total',
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
 * Batas JUMLAH baris kartu "Transaksi Terakhir" di Home (paket 64, diturunkan di
 * paket 66): maksimal 5 baris. Kartu ini ringkasan, bukan arsip — di bento grid
 * kolom kanan (2/3) ia berbagi baris dengan dua daftar ringkas di kolom kiri,
 * jadi daftar yang panjang bikin dashboard menggantung & tidak simetris.
 * Daftar lengkap (tanpa batas) tetap hidup di `/history` lewat "Lihat semua".
 */
export const HOME_RECENT_MAX_ROWS = 5

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

/* ── WARNA GRAFIK "ARUS UANG" (paket 68 · visualisasi digambar ulang) ────────
   Recharts butuh warna sebagai NILAI atribut (`stroke`, `stopColor`, `fill`),
   bukan kelas Tailwind — jadi warnanya tinggal di lapis data, sama seperti
   `HOME_DISTRIBUTION_PALETTE` & `WALLET_TREND_COLORS` (lib/data/wallet-detail).
   Isinya tetap palet kanon: mint (#91bb9e) untuk uang masuk, plum / hud-
   terracotta (#b89191) untuk uang keluar; sisanya forest dengan opasitas, jadi
   penjaga palet (`scripts/theme/audit-palette.mjs`) tetap hijau. */
export const HOME_CASHFLOW_COLORS = {
  /** uang masuk — mint (leaf) */
  income: '#91bb9e',
  /** uang keluar — plum (hud-terracotta) */
  expense: '#b89191',
  /** label sumbu-X — tanpa garis/sumbu tebal, cuma teks tanggal pudar */
  axis: 'rgba(69,89,78,0.45)',
  /** garis kursor tooltip */
  cursor: 'rgba(69,89,78,0.16)',
  /** halo titik aktif — putih kanvas */
  dot: '#ffffff',
} as const

/* ── SIMETRI TIGA ANGKA KUNCI "ARUS UANG" (paket 76) ─────────────────────────
   Permintaan pemilik produk: Pemasukan · Pengeluaran · Sisa harus SIMETRIS —
   setiap nominal duduk di SATU sumbu kanan yang sama dan tidak bergeser saat
   nilainya berubah (mis. Rp 12.345.678). Jalan keluarnya CSS Grid dengan SATU
   template kolom bersama (`HOME_CASHFLOW_AXIS.gridClass`): label di kolom kiri
   yang tumbuh, nominal di kolom kanan yang lebarnya = nominal TERPANJANG. Karena
   ketiga baris memakai grid yang sama (bukan tiga grid terpisah), kolom nominal
   selalu sama lebar → angka panjang tak pernah mendorong label.

   Nominalnya wajib `tabular-nums` (lebar tiap digit identik) + `tracking-tight`
   (rapat) supaya tak ada satu piksel pun yang "melompat" antar-nilai. Kelasnya
   tinggal di sini sebagai konstanta supaya simetri ini punya SATU definisi yang
   bisa diuji (`lib/data/home-money.test.ts`) — bukan disalin di JSX. */
export const HOME_CASHFLOW_AXIS = {
  /** template kolom bersama: [label+ikon, tumbuh] [nominal, auto, rata kanan] */
  gridClass: 'grid-cols-[minmax(0,1fr)_auto]',
  /** kelas tipografi nominal kanon: digit seragam + rapat */
  valueClass: 'tabular-nums tracking-tight',
} as const

/** kunci tiga angka kunci kartu Arus Uang, dalam URUTAN kanon */
export type FlowAxisKey = 'income' | 'expense' | 'net'

export interface FlowAxisRow {
  key: FlowAxisKey
  /** label kanon (`HOME_MONEY_COPY`: Pemasukan / Pengeluaran / Sisa) */
  label: string
  /** nominal yang tampil; Sisa boleh NEGATIF (defisit) */
  amount: number
  /** true = nilai di bawah nol → tanda minus & nada terracotta */
  negative: boolean
}

/**
 * Tiga baris ringkasan Arus Uang — MURNI, tanpa format & tanpa React.
 *
 * Urutannya dikunci (Pemasukan → Pengeluaran → Sisa) supaya komponen cukup
 * memetakan hasilnya ke satu grid; `net` sengaja dihitung di sini (bukan di JSX)
 * supaya tanda defisit punya SATU sumber yang bisa diuji.
 */
export function cashFlowAxisRows(income: number, expense: number): FlowAxisRow[] {
  const net = income - expense
  return [
    { key: 'income', label: HOME_MONEY_COPY.chartIncomeLabel, amount: income, negative: false },
    { key: 'expense', label: HOME_MONEY_COPY.chartExpenseLabel, amount: expense, negative: false },
    { key: 'net', label: HOME_MONEY_COPY.chartNetLabel, amount: net, negative: net < 0 },
  ]
}

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
  /** label tanggal untuk sumbu-X grafik, mis. "22 Okt" */
  label: string
  income: number
  expense: number
}

/**
 * Seri "Arus Uang" — SATU TITIK PER HARI, sepanjang bulan yang diminta (paket 70).
 *
 * Tiga aturan yang membuat kartu chart & kartu "Transaksi Terakhir" mustahil
 * bercerita beda:
 *   1. setiap baris jatuh ke TEPAT satu tanggal (`points[tgl - 1]`), jadi
 *      Σ(pengeluaran seri) ≡ total yang dibaca kartu mana pun — bukan kebetulan,
 *      tapi konsekuensi;
 *   2. pindah dana netral, sama seperti strip (uang pindah dompet ≠ keluar);
 *   3. `monthISO` menyaring bulannya: label "Bulan ini · Okt" hanya boleh memuat
 *      baris bulan itu.
 *
 * PANJANGNYA = jumlah hari bulan itu (`daysInMonth`), bukan 5 pekan seperti dulu.
 * Itu yang membuat label terakhir sekarang benar-benar "31 Okt" di bulan 31 hari,
 * dan grafiknya ikut bergerak begitu ada catatan baru (data dibaca dari ledger
 * yang sama setiap render — real-time, bukan teks yang ditempel).
 *
 * Tanpa `monthISO` (render server & render pertama client) serinya 31 titik
 * berlabel bulan kanon demo — jumlah titiknya SAMA dengan bulan asli, jadi
 * hidrasi tidak menggeser tata letak grafik.
 */
export function homeCashFlowSeries(
  rows: HomeMoneyRow[],
  monthISO?: string,
): HomeCashFlowPoint[] {
  const monthShort = monthShortFromISO(monthISO)
  const dayCount = monthISO ? daysInMonth(monthISO) : 31
  const points: HomeCashFlowPoint[] = Array.from({ length: dayCount }, (_, i) => ({
    label: `${i + 1} ${monthShort}`,
    income: 0,
    expense: 0,
  }))

  for (const row of rows) {
    if (monthISO && row.date.slice(0, 7) !== monthISO) continue
    const day = Number(row.date.slice(8, 10))
    /* tanggal rusak (defensif) diperlakukan sebagai tanggal 1, bukan NaN yang
       bisa membuat `points[NaN]` undefined */
    const safeDay = Number.isFinite(day) && day > 0 ? day : 1
    const point = points[Math.min(safeDay, dayCount) - 1]
    if (!point) continue
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

/* ── PEMASUKAN BULANAN (panel Ringkasan Saldo) ────────────────────────────────
   Kartu "Pemasukan" di panel Ringkasan Saldo dulu menulis angka contoh
   (`Rp 8.900.000`, `+27%`, `Februari`, 12 bar statis). Sekarang angkanya MURNI
   dari baris ledger dompet yang sedang dibuka, dan label bulannya dibaca dari
   tanggal perangkat — jadi tidak pernah "nyangkut" di satu bulan. */

const MONTHS_FULL_ID = [
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

/** `2026-10` + (−1) → `2026-09` (aritmetika bulan murni, tanpa `Date`) */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const total = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(total / 12)
  const nextMonth = (((total % 12) + 12) % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

/** bulan berjalan dari tanggal perangkat; jatuh ke bulan kanon saat SSR */
export function monthKeyOf(todayISO: string): string {
  return /^\d{4}-\d{2}/.test(todayISO) ? todayISO.slice(0, 7) : HISTORY_TODAY_ISO.slice(0, 7)
}

export interface HomeIncomeStats {
  /** nama bulan penuh (mis. "Oktober") */
  monthLabel: string
  /** total pemasukan bulan berjalan */
  thisMonth: number
  /** pemasukan bulan sebelumnya (pembagi persen) */
  lastMonth: number
  /** perubahan % vs bulan lalu; `null` = belum bisa dihitung (bulan lalu Rp 0) */
  changePct: number | null
  /** seri `months` bulan terakhir (paling lama → terbaru) untuk bar chart */
  series: { key: string; label: string; value: number; active: boolean }[]
}

/**
 * Batas tampil persen perubahan (paket 74) — magnitudonya DIPOTONG di 100%.
 *
 * Kenapa perlu: rumus `((baru − lama) / |lama|) × 100` bisa MELEDAK saat basisnya
 * (bulan lalu) sangat kecil — arus bersih bulan lalu +Rp 17.000 dan bulan ini
 * −Rp 580.000 menghasilkan −3.514%, angka yang mustahil dibaca dan langsung
 * meruntuhkan kredibilitas kartu keuangan. Nilai dijepit ke rentang [−100, 100];
 * TANDA dipertahankan karena badge tren memang dua arah (naik/turun). Basis nol
 * tetap ditangani pemanggil dengan mengembalikan `null` (badge disembunyikan,
 * bukan persen karangan) — pembagian nol tidak pernah terjadi di sini.
 */
const CHANGE_PCT_LIMIT = 100
export function clampChangePct(pct: number): number {
  if (!Number.isFinite(pct)) return 0
  return Math.max(-CHANGE_PCT_LIMIT, Math.min(CHANGE_PCT_LIMIT, Math.round(pct)))
}

/**
 * Ringkasan pemasukan bulanan dari baris yang SUDAH tersaring (dompet/konteks).
 * Murni: tanpa React, tanpa `Date` — angka & labelnya deterministik.
 */
export function incomeStatsFor(
  rows: HomeMoneyRow[],
  todayISO: string,
  months = 6,
): HomeIncomeStats {
  const monthKey = monthKeyOf(todayISO)
  const byMonth = new Map<string, number>()
  for (const row of rows) {
    if (row.type !== 'income') continue
    const key = row.date.slice(0, 7)
    byMonth.set(key, (byMonth.get(key) ?? 0) + row.amount)
  }
  const thisMonth = byMonth.get(monthKey) ?? 0
  const lastMonth = byMonth.get(shiftMonthKey(monthKey, -1)) ?? 0
  const changePct =
    lastMonth > 0 ? clampChangePct(((thisMonth - lastMonth) / lastMonth) * 100) : null
  const series = Array.from({ length: months }, (_, i) => {
    const key = shiftMonthKey(monthKey, -(months - 1 - i))
    return {
      key,
      label: (MONTHS_FULL_ID[Number(key.slice(5, 7)) - 1] ?? '').slice(0, 3),
      value: byMonth.get(key) ?? 0,
      active: key === monthKey,
    }
  })
  return {
    monthLabel: MONTHS_FULL_ID[Number(monthKey.slice(5, 7)) - 1] ?? '',
    thisMonth,
    lastMonth,
    changePct,
    series,
  }
}

/**
 * Perubahan ARUS BERSIH (masuk − keluar) bulan ini vs bulan lalu — dipakai
 * badge tren di donat saldo. `null` = bulan lalu belum ada arus (tidak bisa
 * dihitung); badge-nya disembunyikan, bukan menampilkan persen karangan.
 */
export function netFlowChangePct(rows: HomeMoneyRow[], todayISO: string): number | null {
  const monthKey = monthKeyOf(todayISO)
  const lastKey = shiftMonthKey(monthKey, -1)
  let netThis = 0
  let netLast = 0
  for (const row of rows) {
    const signed = row.type === 'income' ? row.amount : row.type === 'expense' ? -row.amount : 0
    if (signed === 0) continue
    const key = row.date.slice(0, 7)
    if (key === monthKey) netThis += signed
    else if (key === lastKey) netLast += signed
  }
  if (netLast === 0) return null
  return clampChangePct(((netThis - netLast) / Math.abs(netLast)) * 100)
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

/* ── PETA ALIRAN "ARUS UANG" (paket 67) ──────────────────────────────────────
   Visual kartu Arus Uang sekarang sebuah ALUVIUM (peta aliran), bukan batang
   maupun garis: uang masuk memecah jadi pita "keluar" dan pita "disimpan".

   Geometrinya hidup di sini — murni, tanpa React, tanpa DOM — supaya "kenapa
   pita ini setinggi itu" bisa dibuktikan oleh test, bukan hanya oleh mata
   (repo ini tidak punya test komponen).

   Satuan: PERSEN kanvas (0..100) di KEDUA sumbu. Komponen membacanya langsung:
   simpul = <span> DOM (`top`/`height` dalam %), pita = SVG `viewBox="0 0 100
   100"` + `preserveAspectRatio="none"`. Jadi tidak ada satu pun koordinat
   piksel yang bergantung breakpoint. */

/** satu simpul (palang vertikal): `top` & `size` dalam persen kanvas */
export interface FlowNode {
  top: number
  size: number
}

/** satu pita: dua port (kiri → kanan) dengan arah uang sebagai `tone` */
export interface FlowRibbon {
  from: FlowNode
  to: FlowNode
  /** 'out' = uang keluar (rose) · 'in' = uang disimpan (mint) */
  tone: 'out' | 'in'
}

export interface FlowMap {
  /** simpul "Pemasukan" (kolom kiri) */
  income: FlowNode
  /** simpul "Pengeluaran" (kolom kanan) */
  expense: FlowNode
  /** simpul "Sisa" — uang yang benar-benar disimpan (null kalau tidak ada) */
  saved: FlowNode | null
  /** simpul "Defisit" — uang keluar > uang masuk (null kalau tidak defisit) */
  deficit: FlowNode | null
  ribbons: FlowRibbon[]
}

/** tinggi (%) sepasang simpul + jarak antar dua simpul sekolom */
export const FLOW_SPAN = 74
export const FLOW_GAP = 8

/**
 * Peta aliran uang bulan ini — MURNI.
 *
 * Masukan = dua total (pemasukan & pengeluaran); keluaran = geometri simpul &
 * pita dalam persen kanvas. Kunci keseimbangannya: `total = max(masuk, keluar)`
 * dan kolom kiri (masuk + defisit) maupun kolom kanan (keluar + sisa) dua-duanya
 * berjumlah `total` — jadi kedua kolom selalu bisa dibandingkan dengan SATU
 * skala, dan pita tidak pernah meluber keluar simpulnya.
 */
export function buildFlowMap(income: number, expense: number): FlowMap {
  const saved = Math.max(income - expense, 0)
  const deficit = Math.max(expense - income, 0)
  const total = Math.max(income, expense)
  /* -FLOW_GAP supaya "konten + jarak" = FLOW_SPAN saat simpulnya memang dua */
  const unit = total > 0 ? (FLOW_SPAN - FLOW_GAP) / total : 0

  /* kolom kiri: Pemasukan (+ Defisit kalau uang keluar melebihi uang masuk) */
  const leftGap = deficit > 0 ? FLOW_GAP : 0
  const leftTop = 50 - (income * unit + deficit * unit + leftGap) / 2
  const incomeNode: FlowNode = { top: leftTop, size: income * unit }
  const deficitNode: FlowNode | null =
    deficit > 0 ? { top: leftTop + income * unit + leftGap, size: deficit * unit } : null

  /* kolom kanan: Pengeluaran (+ Sisa yang benar-benar disimpan) */
  const rightGap = saved > 0 ? FLOW_GAP : 0
  const rightTop = 50 - (expense * unit + saved * unit + rightGap) / 2
  const expenseNode: FlowNode = { top: rightTop, size: expense * unit }
  const savedNode: FlowNode | null =
    saved > 0 ? { top: rightTop + expense * unit + rightGap, size: saved * unit } : null

  /* pita yang benar-benar ada — yang bernilai nol tidak digambar */
  const toExpense = Math.min(income, expense)
  const ribbons: FlowRibbon[] = []
  if (toExpense > 0) {
    ribbons.push({
      from: { top: incomeNode.top, size: toExpense * unit },
      to: { top: expenseNode.top, size: toExpense * unit },
      tone: 'out',
    })
  }
  if (saved > 0 && savedNode) {
    ribbons.push({
      from: { top: incomeNode.top + toExpense * unit, size: saved * unit },
      to: { top: savedNode.top, size: saved * unit },
      tone: 'in',
    })
  }
  if (deficit > 0 && deficitNode) {
    ribbons.push({
      from: { top: deficitNode.top, size: deficit * unit },
      to: { top: expenseNode.top + toExpense * unit, size: deficit * unit },
      tone: 'out',
    })
  }

  return {
    income: incomeNode,
    expense: expenseNode,
    saved: savedNode,
    deficit: deficitNode,
    ribbons,
  }
}
