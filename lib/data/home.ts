/**
 * Copy untuk HEADER dan kartu ringkasan Home.
 *
 * Kenapa file ini ada: paket 29 menghidupkan kontrol Home yang sebelumnya tidak
 * melakukan apa pun (pencarian transaksi, notifikasi) dan mengarahkan ulang
 * tombol yang tidak punya tujuan (Menu). Semua kalimat barunya TIDAK ditulis di
 * JSX — aturannya sama dengan halaman lain di repo ini: teks user-facing tinggal
 * di `lib/data/*`, komponennya cuma menyusun tampilan.
 *
 * Tautan (`href`) sengaja tidak disimpan di sini: di repo ini `href` ditulis di
 * komponennya (pola yang sama dengan kartu lain), supaya route yang dipakai
 * gampang dilacak lewat pencarian biasa.
 */

import type { BudgetScope } from './budget'
import { CONTEXT_LABEL } from './money-context'

/** nama konteks uang (Pribadi / Keluarga / Bersama) — dipakai kicker hero supaya
 *  jelas celengan itu milik siapa. Labelnya TIDAK ditulis ulang di sini: sumber
 *  tunggalnya `CONTEXT_LABEL` di `lib/data/money-context.ts` (paket 47), file yang
 *  juga dipakai switcher, badge kartu, dan empty state per konteks. */

/** Header Home — kolom cari transaksi & tombol notifikasi (keduanya desktop). */
export const HOME_HEADER_COPY = {
  /** placeholder kolom cari. Isinya "Cari transaksi..." — persis kata yang
   *  dipakai user, bukan istilah teknis seperti "query". */
  searchPlaceholder: 'Cari transaksi...',
  searchAria: 'Cari transaksi',
  /** label tombol kirim di ujung kolom cari — arahnya ke halaman Riwayat */
  searchSubmit: 'Cari di Riwayat',
  /** nama tombol lonceng; dot kecil tetap jadi penanda ada hal baru */
  notificationsLabel: 'Notifikasi',
} as const

/**
 * Kartu "Tabungan Impian" di Home — SATU SUMBER: `INITIAL_SINKING_FUNDS`
 * (`lib/data/budget.ts`), daftar yang sama dengan /budget dan /budget/<id>.
 *
 * ATURAN FINAL (paket 30): nama, nominal, progres, dan tahap tanaman di kartu
 * ini semuanya TURUNAN dari daftar itu — tidak ada mock tampilan kedua. Karena
 * itu tiap panah bisa menunjuk `/budget/<id>` celengan yang benar-benar ada, dan
 * nama yang user tekan pasti ditemukan lagi di halaman tujuan.
 *
 * KENAPA KARTU INI GLOBAL (tidak disaring `useMoneyContext()` seperti daftar di
 * /budget) — ini keputusan, bukan kelalaian:
 *   1. Kartu "Jatah Hari Ini" tepat di atasnya dihitung dari
 *      `SINKING_OBLIGATION_ALL` (`DAILY_HUD`), yaitu kewajiban SEMUA celengan
 *      lintas konteks uang. Kalau kartu ini menyaring per konteks, satu layar
 *      Home bercerita dua hal tentang celengan yang sama: kewajibannya dipotong
 *      dari semua, tapi daftarnya cuma sebagian.
 *   2. Aturan hero ("prioritas kritis dulu") memang aturan lintas konteks —
 *      celengan 'kritis' di mock ini justru milik konteks keluarga.
 *   3. Halaman tujuan `/budget/<id>` TIDAK digerbangi konteks, jadi setiap
 *      tautan di kartu ini sah dibuka dari konteks mana pun.
 * Kepemilikan tetap dibuka apa adanya lewat kicker hero ("celengan keluarga"),
 * jadi user tidak disesatkan soal celengan itu milik konteks yang mana.
 *
 * Yang SENGAJA tidak dilakukan: mengubah `INITIAL_SINKING_FUNDS`, `DAILY_HUD`,
 * atau menambah celengan mock ke-4 supaya kartu "kelihatan penuh" — angka demo
 * PRD 678 adalah patokan dan tidak boleh bergeser.
 */
export const HOME_GOALS_COPY = {
  title: 'Tabungan Impian',
  subtitle: 'Tiap setoran = nyiram tanaman',
  /** tombol `+` di kepala kartu → membuka sheet "Tanam Celengan Baru" di /budget */
  addLabel: 'Tanam celengan baru',
  /** alasan hero dipilih — dua-duanya dari aturan di `heroFundOf()`, bukan
   *  hiasan: yang kritis disebut prioritasnya, yang menang lewat progres
   *  disebut progresnya */
  heroReasonPriority: (priorityLabel: string) => `Prioritas ${priorityLabel.toLowerCase()}`,
  heroReasonProgress: 'Progres paling cepat',
  /** kicker di bawah nama hero = alasan + konteks uang celengan itu */
  heroKicker: (reason: string, scope: BudgetScope) =>
    `${reason} · celengan ${CONTEXT_LABEL[scope].toLowerCase()}`,
  /** label baris nominal di dalam hero */
  savedLabel: 'Terkumpul',
  targetLabel: 'Target',
  /** badge tahap tanaman di dalam hero — "Tahap 2 · Tunas" */
  stageBadge: (stage: number, stageName: string) => `Tahap ${stage} · ${stageName}`,
  /** kalimat penyemangat hero (tanpa angka, jadi tidak ikut disensor) */
  heroBlurbBloom: 'Sudah berbunga! Tanaman ini tumbuh dari konsistensi setoranmu 🌸',
  heroBlurbGrowing: 'Tiap setoran bikin tanaman ini naik tahap. Rawat terus ya 🌿',
  /** judul kecil di atas baris mini — sekaligus menyebut jumlahnya apa adanya */
  restTitle: (count: number) => `${count} celengan lain`,
  /** aria-label panah hero & baris mini; dua-duanya membuka `/budget/<id>`
   *  celengan itu, jadi kalimatnya satu bentuk (jelas tujuan + nama celengan) */
  openDetail: (name: string) => `Buka celengan ${name} di halaman Budget`,
  /** empty state — defensif: mock hari ini selalu punya 3 celengan, tapi kartu
   *  ini tidak boleh pecah kalau daftarnya suatu saat kosong */
  emptyTitle: 'Belum ada celengan impian',
  emptyBody:
    'Mulai dari satu celengan saja dulu — angka kecil juga sah. Tiap setoran bikin tanamanmu naik tahap 🌱',
  emptyCta: 'Tanam celengan pertama',
} as const

/**
 * Widget "Tanamanmu" di Home — baris nutrisi & kaki "menuju tahap berikutnya".
 *
 * Sejak paket 30 baris ini menyebut CELENGAN YANG SAMA dengan kartu Tabungan
 * Impian (`heroFundOf()`), bukan mock tampilan kedua yang persennya ditulis
 * tetap dan tidak ada di data mana pun. Kalimatnya tinggal di sini karena ia
 * bagian dari cerita celengan di Home, sementara HP / hari aktif tetap state
 * tanaman itu sendiri.
 */
export const HOME_PLANT_COPY = {
  /** rangkaian: "<nutritionBefore> <nama celengan> (<pct>%) <nutritionAfter>" */
  nutritionBefore: 'Tumbuh dari',
  nutritionAfter: '— setor lagi biar naik tahap 🌿',
  nutritionPercent: (pct: number) => `(${pct}%)`,
  /** kaki kartu: jarak ke tahap tanaman berikutnya (tahap 1–3) */
  nextStage: (stage: number, stageName: string) => `Menuju tahap ${stage} - ${stageName}`,
  /** tahap 4 tidak punya "tahap berikutnya" — jangan tulis "menuju tahap 4" */
  lastStage: 'Tahap terakhir · menuju target tercapai',
  /** pct sudah 100: tidak ada lagi yang dikejar, dan itu boleh dirayakan */
  targetReached: 'Target celengan ini tercapai 🎉',
  /** pertahanan kalau daftar celengan kosong — jangan sampai tanaman Home
   *  menggantung tanpa penjelasan kenapa ia tumbuh */
  noNutrition: 'Belum ada celengan yang dikejar — mulai satu yuk 🌱',
} as const

/** Donat saldo (panel "Your Balance Overview") — tiga pintasan ke halaman nyata. */
export const BALANCE_RING_COPY = {
  /** tombol utama di bawah donat */
  insightsLabel: 'Buka Insight',
  /** orbit kanan: halaman yang sama dengan tombol utama, tapi dari sisi grafik
   *  (heatmap keborosan + grafik arus uang ada di sana) */
  chartLabel: 'Lihat grafik & heatmap pengeluaran',
  /** orbit kiri: dompet bersama */
  jointLabel: 'Buka Joint Wallet',
} as const

/** Kartu Income di panel overview. */
export const HOME_INCOME_COPY = {
  /** label bulan — STATIS, bukan pemilih: mock hanya punya satu bulan berisi
   *  angka nyata (lihat komentar di `income-card.tsx`) */
  monthLabel: 'Februari',
} as const

/**
 * Label "Total Saldo" di Home (paket 44) — satu definisi + kalimat yang jujur.
 *
 * Temuan uji pemakaian: chip di header Home menghitung dompet YANG TERSARING
 * konteks ("2 dompet") sementara kartu "Total Saldo" menjumlahkan semua dompet
 * ("3 dompet aktif") — dua angka berbeda untuk satu user di satu layar, dan
 * labelnya sama-sama "Total Saldo".
 *
 * Aturan yang sekarang dikunci:
 *   · **Total Saldo = SELURUH dompet** (`cashTotal()` di `lib/money/store.ts`),
 *     tidak pernah ikut mengecil saat konteks uang aktif;
 *   · chip dompet di header juga menghitung semua dompet — bukan yang tersaring;
 *   · saat konteks aktif, `contextLine` yang menjelaskan saldo konteks itu, jadi
 *     user paham kenapa daftarnya lebih pendek tanpa mengira totalnya salah.
 */
export const HOME_TOTAL_COPY = {
  /** chip di header: SELALU jumlah seluruh dompet (konteks tidak menyaringnya) */
  walletsChip: (count: number) => `${count} dompet`,
  /** baris kecil saat konteks uang aktif: "Dompet Pribadi: Rp 1.800.000" */
  contextLine: (contextLabel: string, amount: string) => `Dompet ${contextLabel}: ${amount}`,
  /** penegas cakupan — dibaca berdampingan dengan baris konteks di atas */
  scopeNote: 'Total Saldo = semua dompet',
} as const
