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
  /** tombol hamburger di header mobile → membuka drawer navigasi (paket 64).
   *  Labelnya menyebut "navigasi", bukan cuma "menu", supaya jelas isinya. */
  menuAria: 'Buka menu navigasi',
} as const

/**
 * Panel notifikasi (paket 64) — lonceng di header membuka panel ini, bukan
 * langsung berpindah halaman. Keadaan kosong HARUS tetap terasa selesai: ia
 * menjelaskan kenapa belum ada apa-apa dan menawarkan tempat mengaturnya,
 * bukan sekadar menulis "tidak ada data".
 */
export const HOME_NOTIFICATION_COPY = {
  title: 'Notifikasi',
  emptyTitle: 'Belum ada notifikasi',
  emptyBody:
    'Pengingat tagihan, rekap mingguan, dan info masa aktif bakal muncul di sini. Kamu bisa atur jenisnya kapan aja.',
  settingsLink: 'Atur notifikasi',
  settingsHref: '/settings/notifications',
  closeLabel: 'Tutup panel notifikasi',
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
  /* ── MODAL DETAIL TANAMAN (paket 58) ──────────────────────────────────────
     Dua label + kalimat ini dulu ditulis langsung di `plant-detail-modal.tsx`;
     dipindah ke sini supaya copy user-facing tetap satu pintu (§8). Saat belum
     ada aktivitas, modal tidak menulis "0 hari" — ia menyebut apa adanya
     "Belum ada aktivitas", karena tanamannya belum pernah disiram. */
  detailTitle: 'Tanamanmu 🌿',
  hpLabel: 'Kesehatan tanaman',
  hpTitle: (pct: number) => `Kesehatan tanaman ${pct}%`,
  activeDaysLabel: 'Hari aktif bulan ini',
  activeDaysValue: (days: number) => `${days} hari`,
  activeEmptyValue: 'Belum ada aktivitas',
  activeBody: (days: number) =>
    `Kamu udah catat ${days} hari bulan ini — tanamanmu tumbuh karena konsistensimu. Lanjutin ya! 💚`,
  activeEmptyBody:
    'Belum ada aktivitas bulan ini — catat transaksi pertamamu, tanamanmu langsung ikut tumbuh 🌱',
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
 * Chip ringkas di header Home (paket 44 / 64) — menggantikan baris teks
 * "Dompet Pribadi: Rp X · Total Saldo = semua dompet" yang terlalu bertele-tele
 * dan dipindahkan/dipangkas di paket 64: yang penting di header cuma DUA fakta
 * ringan (jumlah dompet & jumlah transaksi), dan keduanya kini duduk rapi di
 * TENGAH, tepat di bawah Context Switcher.
 *
 * Aturan yang tetap berlaku:
 *   · **Total Saldo = SELURUH dompet** (`cashTotal()` di `lib/money/store.ts`),
 *     tidak pernah ikut mengecil saat konteks uang aktif;
 *   · chip dompet di header juga menghitung semua dompet — bukan yang tersaring;
 *   · penegas cakupan ("Total Saldo = semua dompet") tidak lagi ditulis di layar
 *     karena label "Total Saldo" sudah muncul di kartu dompet & panel Overview —
 *     mengulangnya di header cuma menambah teks tanpa menambah pengertian.
 */
export const HOME_TOTAL_COPY = {
  /** chip di header: SELALU jumlah seluruh dompet (konteks tidak menyaringnya) */
  walletsChip: (count: number) => `${count} dompet`,
  /** chip kedua: jumlah catatan transaksi yang tampil di ringkasan */
  transactionsChip: (count: number) => `${count} transaksi`,
  /**
   * Baris kecil "Dompet Pribadi: Rp 1.800.000" — sejak paket 64 TIDAK LAGI
   * dipakai di header Dashboard (terlalu bertele-tele untuk header). Definisi
   * tetap dipertahankan karena halaman Dompet & Akun memakainya di hero-nya
   * untuk keperluan yang sama: menjelaskan SUBTOTAL konteks, supaya user tidak
   * menyimpulkan totalnya salah. Satu definisi ⇒ kalimatnya tidak bercabang.
   */
  contextLine: (contextLabel: string, amount: string) => `Dompet ${contextLabel}: ${amount}`,
  /** penegas cakupan — dibaca berdampingan dengan baris konteks di atas */
  scopeNote: 'Total Saldo = semua dompet',
} as const

/** Copy tombol & baris keadaan kosong kartu dompet Home (paket 58 — 58.7).
 *  Dipindah dari JSX `wallet-card-stack.tsx` supaya literal copy tidak menumpuk
 *  di komponen; keadaan 0 dompet = satu-satunya kartu di deck. */
export const HOME_WALLET_STACK_COPY = {
  addTitle: 'Tambah Dompet',
  addSubtitle: 'Bank, e-wallet, atau tunai',
  emptyLine: 'Belum ada dompet — tambah satu dulu biar saldomu kebaca 🌱',
} as const

/** Copy slot nudge AI Coach di Home (paket 58 — 58.4). Dipindah dari JSX
 *  `daily-nudge.tsx`; pemicunya kini data nyata: "belum ada catatan hari ini"
 *  dibaca dari ledger, bukan konstanta. */
export const HOME_NUDGE_COPY = {
  coachLabel: 'AI Coach',
  title: 'Hari ini belum ada catatan nih 🌿',
  /* AUDIT "CLEAN UI" (paket 63): badan dua klausa di kartu Home dipangkas jadi
     satu ajakan — nudge bukan paragraf pengantar. */
  body: 'Kopi atau ongkos tadi udah dicatat belum?',
  cta: 'Catat sekarang',
  dismissLabel: 'Tutup pengingat hari ini',
} as const
