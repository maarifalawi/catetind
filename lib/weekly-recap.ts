import { periodWindow } from './data/budget'
import {
  HOME_DISTRIBUTION_PALETTE,
  distributionSegments,
  summarizeHomeMoney,
  type HomeMoneyRow,
} from './data/home-money'

/* ── REKAP MINGGUAN = TURUNAN DARI LEDGER NYATA ───────────────────────────────
   Sebelum ini file ini memegang `WEEK_DATA` (9 transaksi · masuk 8.500.000 ·
   keluar 1.240.000), `WEEK_SEGMENTS`, dan `WEEK_PLANT` — angka KERAS yang tidak
   berasal dari catatan user. Akibatnya rekap berisi nominal contoh apa pun isi
   ledger user: akun baru melihat "Minggu ini 9 transaksi", dan user yang mencatat
   tidak melihat catatannya di slide mana pun.

   Sekarang SATU fungsi murni (`weeklyRecapFrom`) menurunkan seluruh angka dari
   baris ledger NYATA di JENDELA PEKAN yang dihitung dari tanggal perangkat.
   Pipeline-nya SENGAJA sama dengan kartu-kartu uang Home (`summarizeHomeMoney` +
   `distributionSegments`) supaya angka rekap tidak mungkin berbeda dari kartu
   Arus Uang / Distribusi / Transaksi Terakhir untuk pekan yang sama:
     · pindah dana & setoran tabungan NETRAL (`summarizeHomeMoney`) — jadi
       Σ kategori donut SELALU sama dengan angka pengeluaran di kepala slide;
     · kategori ke-5+ digabung "Lainnya" (`distributionSegments`);
     · warna kategori = palet kanon yang SAMA dengan Distribusi Pengeluaran.

   Komponen membacanya lewat `useWeeklyRecap()` (`lib/use-weekly-recap.ts`) yang
   menyatukan store uang + tanggal perangkat — mencatat transaksi langsung
   mengubah banner & semua slide tanpa refresh (satu store, satu turunan). */

/* ── RENTANG PEKAN = TURUNAN DARI "HARI INI" (audit Temporal Desync) ──────────
   Label rentangnya dulu literal `'22–28 Sep 2024'`. Sekarang dihitung dari
   `periodWindow('weekly', todayISO)` di `lib/data/budget.ts` — fungsi tanggal
   yang SUDAH dipakai tab Mingguan /budget, jadi definisi pekan (Senin–Minggu)
   satu untuk seluruh app. */
export function weekPeriodLabel(todayISO: string): string {
  return periodWindow('weekly', todayISO).rangeLabel
}

/**
 * Jangkar DEFAULT (render server & bahan test) — dari jangkar seed `TODAY_ISO`,
 * bukan literal. Komponen memakai `recap.periodLabel` (jendela NYATA).
 */
export const WEEK_PERIOD = periodWindow('weekly').rangeLabel

/** hari dalam satu pekan — pembagi "rata-rata/hari" */
export const WEEKLY_RECAP_DAYS = 7

/** satu irisan kategori pengeluaran, sudah membawa warna palet kanon */
export interface WeeklyRecapSegment {
  label: string
  amount: number
  pct: number
  color: string
}

/** tahap papan puzzle (plant-illustration: 1..4) */
export type RecapPuzzleStage = 1 | 2 | 3 | 4

/** Seluruh angka slide — semuanya turunan, tidak ada satu pun nominal keras. */
export interface WeeklyRecap {
  /** batas pekan (ISO) yang dipakai menyaring ledger */
  startISO: string
  endISO: string
  /** label rentang, mis. `28 Sep – 4 Okt` (sumber sama dengan tab Mingguan) */
  periodLabel: string
  /** jumlah catatan di pekan ini */
  transactions: number
  income: number
  expense: number
  net: number
  /** segmen kategori pengeluaran (urut menurun, berwarna) */
  segments: WeeklyRecapSegment[]
  /** pos terbesar — `null` saat belum ada pengeluaran di pekan ini */
  top: WeeklyRecapSegment | null
  /** rata-rata pengeluaran per hari (÷ 7) */
  avgPerDay: number
  /** porsi pemasukan yang terpakai / masih disisihkan (0 saat tanpa pemasukan) */
  spentPct: number
  keptPct: number
  /** saving rate = net / income (BISA negatif saat pengeluaran > pemasukan) */
  savingPct: number
  /** jumlah TANGGAL unik yang punya catatan di pekan ini (0..7) */
  activeDays: number
  /** tahap papan puzzle MINGGUAN dari konsistensi catat */
  puzzleStage: RecapPuzzleStage
  /** porsi hari aktif pekan ini (0–100) — jumlah KEPINGAN papan rekap */
  puzzleProgress: number
  /** true = tidak ada satu pun catatan di pekan ini */
  empty: boolean
}

/**
 * Tahap papan puzzle versi REKAP MINGGUAN — dari konsistensi mencatat pekan ini.
 *
 * Ini SENGAJA lensa berbeda dari kartu "Puzzle kamu" di Dashboard (yang kepingannya
 * dari progres celengan): rekap menceritakan PEKAN, jadi yang digambar adalah
 * kebiasaan mencatat pekan itu. Perbedaan lensa itu sekarang dinyatakan di layar
 * (`WEEKLY_RECAP_COPY.puzzleSource`), bukan dibiarkan jadi teka-teki.
 *
 * Sejak revisi ini jumlah KEPINGAN papan rekap juga dari porsi hari aktif
 * (`weekActivePct`), bukan `stage × 3`. Dulu 2 hari aktif = tahap 2 = 6 keping
 * (setengah papan) padahal baru 2 dari 7 hari — angka yang terasa membesar
 * sendiri. Sekarang 2 hari = 29% = 3 keping, dan 7 hari = 12 keping penuh.
 * Ambang tahapnya memakai ambang yang SAMA dengan papan Dashboard (25/50/80),
 * jadi badge tahap tidak pernah bertentangan dengan papannya sendiri.
 */
export function weeklyPuzzleStage(activeDays: number): RecapPuzzleStage {
  return puzzleStageFromPercent(weekActivePct(activeDays))
}

/** porsi hari aktif pekan ini (0–100) — 2 hari = 29%, 7 hari = 100% */
export function weekActivePct(activeDays: number): number {
  const days = Math.min(WEEKLY_RECAP_DAYS, Math.max(0, activeDays))
  return Math.round((days / WEEKLY_RECAP_DAYS) * 100)
}

/** ambang tahap = ambang papan Dashboard (`stageFromPercent`: 25/50/80) */
function puzzleStageFromPercent(percent: number): RecapPuzzleStage {
  if (percent >= 80) return 4 // tahap 4 · puzzle lengkap
  if (percent >= 50) return 3 // tahap 3 · hampir lengkap
  if (percent >= 25) return 2 // tahap 2 · setengah jalan
  return 1 // tahap 1 · awal tersusun
}

/** segmen kategori + warna palet kanon (rotasi URUTAN, bukan nama kategori) */
function segmentsWithColor(rows: HomeMoneyRow[]): WeeklyRecapSegment[] {
  return distributionSegments(rows).map((seg, index) => ({
    ...seg,
    color: HOME_DISTRIBUTION_PALETTE[index % HOME_DISTRIBUTION_PALETTE.length],
  }))
}

/**
 * Turunkan seluruh rekap dari baris ledger NYATA + tanggal perangkat.
 *
 * `todayISO` kosong (belum mount) ⇒ jendela jatuh ke jangkar seed; ledgernya
 * sendiri juga masih kosong saat render server, jadi HTML server = render
 * pertama client (hidrasi aman) — sama polanya dengan kartu Home lain.
 */
export function weeklyRecapFrom(rows: HomeMoneyRow[], todayISO: string): WeeklyRecap {
  const window = todayISO ? periodWindow('weekly', todayISO) : periodWindow('weekly')
  const inWeek = rows.filter((row) => row.date >= window.startISO && row.date <= window.endISO)

  const { count, income, expense, net } = summarizeHomeMoney(inWeek)
  const segments = segmentsWithColor(inWeek)
  const spentPct = income > 0 ? Math.round((expense / income) * 100) : 0
  const activeDays = new Set(inWeek.map((row) => row.date)).size
  const puzzleProgress = weekActivePct(activeDays)

  return {
    startISO: window.startISO,
    endISO: window.endISO,
    periodLabel: window.rangeLabel,
    transactions: count,
    income,
    expense,
    net,
    segments,
    top: segments[0] ?? null,
    avgPerDay: Math.round(expense / WEEKLY_RECAP_DAYS),
    spentPct,
    keptPct: Math.max(100 - spentPct, 0),
    savingPct: income > 0 ? Math.round((net / income) * 100) : 0,
    activeDays,
    puzzleStage: weeklyPuzzleStage(activeDays),
    puzzleProgress,
    empty: count === 0,
  }
}

/**
 * Nominal NET pekan ini dengan tanda, siap tempel di baris kedua banner:
 * `-Rp 75.000` / `+Rp 50.000`, dan nol tanpa tanda sama sekali.
 *
 * `formatAmount` sengaja disuntikkan pemanggil supaya format uang yang dipakai
 * tetap SATU dengan seluruh app (banner memakai `money()` dari
 * `PrivacyProvider`, jadi menyensor nominal pun tetap jalan). Tidak ada nominal
 * cadangan di sini: angkanya selalu dari `WeeklyRecap.net`.
 */
export function recapNetLabel(
  net: number,
  formatAmount: (value: number) => string,
): string {
  const safe = Number.isFinite(net) ? Math.trunc(net) : 0
  if (safe === 0) return formatAmount(0)
  return `${safe < 0 ? '-' : '+'}${formatAmount(Math.abs(safe))}`
}

/* ── COPY (aturan §8: string user-facing tidak literal di JSX) ────────────────
   Kalimat EMPTY STATE & label baru yang lahir bersama data nyata. Saat pekan
   belum punya catatan, slide TIDAK menggambar Rp 0 / donut kosong — ia menyebut
   apa adanya dan menunjuk satu tindakan. */
export const WEEKLY_RECAP_COPY = {
  /** judul panel saat rekap AI belum terbuka di paket user (paket 84) */
  lockedTitle: 'Rekap mingguan AI',
  /** judul banner Home (angka dari rekap pekan NYATA, tanpa emoji/seruan) */
  bannerTitle: 'Recap minggu ini siap',
  /** baris kedua banner: `{jumlah} transaksi · {net}` — dua-duanya turunan */
  bannerSummary: (count: number, net: string) => `${count} transaksi · ${net}`,
  /* ── SLIDE "PUZZLE KAMU" (habit loop pekan) ───────────────────────────────
     Slide ini dulu berjudul "Tanaman Kamu" dan 2 hari aktif digambar sebagai
     6 dari 12 keping (setengah papan) — terasa bertabrakan dengan kartu
     "Puzzle kamu" di Dashboard yang baru 2 keping. Sekarang kepingannya dari
     porsi hari aktif (2 hari = 3 keping) DAN sumbernya ditulis di layar, jadi
     dua papan itu tidak lagi terlihat saling menyalahkan. */
  /** badge di bawah papan: jumlah kepingan pekan ini */
  puzzlePieces: (filled: number, total: number) => `${filled} dari ${total} keping`,
  /** satu baris sumber angka — pembeda tegas dengan papan Dashboard */
  puzzleSource:
    'Kepingan di sini dari hari kamu mencatat pekan ini. Papan di Dashboard dari progres celengan, jadi jumlahnya boleh beda.',
  /** caption kartu "Hari aktif minggu ini" */
  habitCaption:
    'Papan ini terisi dari kebiasaan mencatat minggu ini, bukan angka yang perlu dikejar.',
  /** caption mini-card jumlah catatan (emoji puzzle, bukan tunas) */
  transactionsCaption: 'transaksi tercatat 🧩',
  /** langkah habit di slide Rencana Minggu Depan */
  habitStep: 'Catat transaksi tiap hari biar kepinganmu nambah',
  /** panel pengganti seluruh slide saat rekap kosong (sekalian judul banner) */
  emptyTitle: 'Belum ada catatan minggu ini',
  emptyBody: 'Catat transaksi pertama, angka dan grafiknya langsung hidup.',
  emptyCta: '+ Catat Transaksi',
  /** Cakupan slide Pengeluaran — SENGAJA "pekan ini", BUKAN "7 hari terakhir".
      Jendela rekap = pekan kalender Senin–Minggu dari tanggal perangkat, jadi
      "7 hari terakhir" berbohong saat pekan belum selesai (rentangnya masih
      memuat hari besok). Rentang tepatnya ditempel dari `recap.periodLabel`,
      sumber yang sama dengan chip kepala modal — jadi tidak bisa berbeda. */
  expensesScope: 'dalam pekan ini',
  /** Slide 2 saat pemasukan ada tapi pengeluaran belum ada */
  expensesEmpty: 'Belum ada pengeluaran minggu ini. Catatanmu otomatis muncul di sini.',
  /** Slide 4 saat belum ada pos pengeluaran (langkah kategori disembunyikan) */
  planNoCategory: 'Pengeluaran pekan ini masih nol. Minggu depan bebas kamu atur.',
  /** Slide 1 saat belum ada pemasukan: perbandingan tidak bisa dihitung */
  noIncome: 'Belum ada pemasukan minggu ini. Catat pemasukan biar perbandingannya kebaca.',
  /** badge saving rate saat pengeluaran melebihi pemasukan */
  savingNegative: 'minus',
  savingHealthy: 'sehat',
} as const

export const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

/* ── CTA SLIDE "RENCANA MINGGU DEPAN" (paket 29) ─────────────────────────────
   Dua tombol di bawah slide ini dulu MATI, padahal PRD 2141–2145 minta CTA-nya
   duduk di zona ibu jari — jadi justru tombol paling mudah dijangkau yang tidak
   bisa ditekan. Sekarang keduanya punya tujuan nyata:

     • `setTarget` → alur target nabung yang SUDAH ada di app (modal Target
       bulanan; dibuka dari kartu Target — Home maupun /history — atau dari CTA
       recap ini sendiri). Labelnya sengaja "Atur target nabung", BUKAN "target
       minggu depan": yang disimpan app adalah target bulanan, dan menulis
       minggu sementara data menyimpan bulan = janji yang tidak dipenuhi angka.
       CTA ini WAJIB membuka modalnya (paket 32) — dulu, saat prop `onSetTarget`
       tidak dikirim (/history), label ini jatuh ke tautan /budget: tujuan nyata,
       tapi bukan alur target.
     • `planLink` → `/budget`, halaman "rencana tabungan" yang sungguhan (limit
       per kategori + celengan impian). */
export const WEEKLY_RECAP_CTA_COPY = {
  setTarget: 'Atur target nabung',
  planLink: 'Lihat rencana tabungan cerdas',
} as const
