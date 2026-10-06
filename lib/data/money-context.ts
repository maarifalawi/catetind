import type { MoneyContext } from '../types'
import type { BudgetScope } from './budget'

/* ── KONTEKS UANG — LABEL, PENANDA, & COPY (paket 47) ────────────────────────
   Konteks uang (Pribadi/Keluarga/Bersama, PRD Domain 2C.2) dipakai di hampir
   semua halaman sejak paket 47. Dulu labelnya ditulis ulang di tiap tempat
   (Home punya `SCOPE_LABEL` sendiri, halaman Budget menulis caption `if/else`,
   halaman lain tidak menulis apa-apa) — persis jenis duplikat yang bikin satu
   konteks punya dua nama di dua layar.

   File ini SATU-SATUNYA sumber teksnya:

     1. `CONTEXT_LABEL`        — nama tampil konteks (Pribadi/Keluarga/Bersama).
     2. `contextName()`        — bentuk huruf kecil untuk di tengah kalimat.
     3. `UNKNOWN_CONTEXT_COPY` — penanda baris yang konteksnya tak bisa
                                 dipastikan (aturan kanon #2 paket 47).
     4. `SCOPE_NOTE`           — kalimat cakupan untuk angka TOTAL yang memang
                                 tidak disaring konteks (aturan kanon #1).
     5. `CONTEXT_EMPTY_COPY`   — empty state per konteks per halaman: konteks
                                 yang belum punya data harus BILANG apa adanya,
                                 bukan layar kosong (PRD "state" tiap halaman).
     6. `scopedItems()`        — satu implementasi penyaring `scope` untuk
                                 tagihan / kalender / hutang / aset.

   Angka tidak ada di sini: semua nominal tetap dibaca dari store & data mock
   (`lib/money/*`, `lib/data/*`) supaya angka demo tidak pernah bergeser.
   ────────────────────────────────────────────────────────────────────────── */

/** nama konteks untuk tampilan (huruf kapital di awal — "Pribadi") */
export const CONTEXT_LABEL: Record<MoneyContext, string> = {
  pribadi: 'Pribadi',
  keluarga: 'Keluarga',
  bersama: 'Bersama',
}

/** nama konteks untuk di tengah kalimat ("dikontek keluarga") */
export function contextName(ctx: MoneyContext): string {
  return CONTEXT_LABEL[ctx].toLowerCase()
}

/**
 * Copy menu konteks uang (paket 65 · Tugas E).
 *
 * Dashboard dulu memakai segmented control 3 kolom yang MEMOTONG label panjang
 * ("Kelua…", "Bersam…") di lebar sempit. Penggantinya adalah menu dropdown yang
 * menampilkan label PENUH; teks tombolnya (bukan ikon) tinggal di sini supaya
 * tidak ada copy di JSX.
 */
export const CONTEXT_MENU_COPY = {
  /** aria-label tombol pembuka (ikon + label konteks aktif + chevron) */
  triggerAria: 'Ganti konteks keuangan',
  /** aria-label daftar pilihan */
  menuAria: 'Pilih konteks keuangan',
} as const

/**
 * Penanda baris yang konteksnya TIDAK bisa dipastikan.
 *
 * Ada supaya baris itu tidak "hilang" diam-diam saat konteks aktif (aturan
 * kanon #2): ia tetap tampil di semua konteks, tapi diberi nama apa adanya —
 * "Belum berkonteks" — plus satu kalimat yang menjelaskan kenapa dan apa yang
 * harus dilakukan user (tambah dompetnya, maka barisnya ikut terkelompok).
 */
export const UNKNOWN_CONTEXT_COPY = {
  badge: 'Belum berkonteks',
  /** tooltip/aria — menjelaskan kenapa baris ini muncul di konteks mana pun */
  hint:
    'Dompet catatan ini belum ada di daftar dompetmu, jadi ia tetap tampil di semua konteks. Tambah dompetnya biar masuk ke konteks yang benar.',
} as const

/**
 * Kalimat cakupan untuk angka TOTAL.
 *
 * Aturan kanon #1 paket 47: konteks menyaring DAFTAR & ARUS, bukan total.
 * Karena itu setiap angka total wajib menyebut cakupannya di sebelah angkanya —
 * bukan dikecilkan, dan bukan dibiarkan ambigu. (`Total Saldo` dipakai bersama
 * Home lewat `HOME_TOTAL_COPY.scopeNote` supaya hanya ada SATU kalimat untuk
 * satu angka.)
 */
export const SCOPE_NOTE = {
  /** Net Worth & tab Kekayaan */
  netWorth: 'Net Worth = seluruh aset & hutang, bukan hanya konteks ini',
  /** ringkasan tameng & waterfall di halaman Tagihan */
  bills: 'Ringkasan di atas = seluruh tagihanmu, semua konteks',
  /** ringkasan periode kalender */
  calendar: 'Ringkasan periode = seluruh catatan, semua konteks',
  /** kartu skor & insight di Riwayat */
  history: 'Ringkasan besar tetap seluruh catatanmu',
  /** hero Total Saldo & panel Komposisi di halaman Dompet */
  walletComposition: 'Total Saldo & komposisi di atas tetap menghitung semua dompet.',
} as const

/** ditampilkan di bawah judul halaman yang daftarnya ikut konteks */
export function contextCaption(ctx: MoneyContext): string {
  return `Konteks uang: ${CONTEXT_LABEL[ctx]}`
}

/**
 * Satu implementasi penyaring `scope` — dipakai tagihan (`lib/data/bills.ts`),
 * entri kalender, hutang, dan aset investasi. Semua model itu menyimpan
 * `scope: BudgetScope` yang sama dengan konteks uang global, jadi tidak pernah
 * ada tipe konteks kedua (larangan paket 47).
 */
export function scopedItems<T extends { scope: BudgetScope }>(
  items: readonly T[],
  ctx: BudgetScope,
): T[] {
  return items.filter((item) => item.scope === ctx)
}

/**
 * Empty state PER KONTEKS — copy nurturing + CTA, satu definisi per halaman.
 *
 * Semua bentuknya menerima nama konteks supaya kalimatnya menyebut konteks yang
 * sedang dibaca ("Belum ada dompet di konteks Keluarga"). Halaman yang memanggil
 * ini TIDAK menulis kalimatnya sendiri di JSX (aturan repo: copy user-facing
 * tinggal di `lib/data/*`).
 */
export const CONTEXT_EMPTY_COPY = {
  /** /wallet — konteks tanpa dompet (mis. Bersama sebelum user menambah dompet) */
  wallet: {
    title: (label: string) => `Belum ada dompet di konteks ${label} 🌱`,
    body:
      'Dompet dipisah per konteks supaya laporan pribadi dan keluarga tidak bercampur. Dompet yang kamu tambah di sini langsung ikut dihitung di Total Saldo.',
    cta: (label: string) => `Tambah dompet ${label.toLowerCase()}`,
  },
  /** /history — tidak ada catatan di konteks ini */
  history: {
    title: (label: string) => `Belum ada catatan di konteks ${label} 🌱`,
    body:
      'Catatan yang kamu buat sekarang masuk ke konteks yang sedang aktif. Catatan lama tetap aman di konteksnya masing-masing — pindah konteks untuk melihatnya.',
    cta: 'Catat Sekarang',
  },
  /** /calendar — periode yang dibaca tidak punya entri di konteks ini */
  calendar: {
    title: (label: string) => `Kalender konteks ${label} masih kosong`,
    body:
      'Catat pengeluaran atau pemasukan di tanggal yang kamu pilih — angkanya langsung masuk ke konteks ini.',
    cta: 'Catat di tanggal ini',
  },
  /** /bills — konteks tanpa tagihan rutin */
  bills: {
    title: (label: string) => `Belum ada tagihan rutin di konteks ${label} 📋`,
    body:
      'Kos, langganan, cicilan — tagihan yang kamu simpan di sini ikut konteks yang sedang aktif, jadi jatah harianmu tetap akurat.',
    cta: 'Tambah tagihan',
  },
  /** /wealth tab Investasi — tidak ada aset di konteks ini */
  investments: {
    title: (label: string) => `Belum ada aset investasi di konteks ${label} 📈`,
    body:
      'Aset yang kamu catat di sini masuk ke konteks aktif. Net Worth di atas tetap menghitung seluruh aset & hutang.',
    cta: 'Tambah aset pertama',
  },
  /** /wealth tab Hutang — tidak ada hutang/piutang di konteks ini */
  debts: {
    title: (label: string) => `Belum ada hutang atau piutang di konteks ${label} 💳`,
    body:
      'Hutang platform maupun catatan ke teman bisa dikelompokkan per konteks, jadi jelas ini urusan siapa.',
    cta: 'Catat hutang/piutang',
  },
} as const

/**
 * Notice untuk halaman yang MEMANG konteks `bersama` (`/joint`).
 *
 * Halaman itu tidak punya versi "pribadi" maupun "keluarga", jadi jawabannya
 * bukan daftar kosong tanpa penjelasan: user diberi tahu halaman ini milik
 * konteks Bersama, lalu SATU tombol untuk berpindah ke sana
 * (`setContext('bersama')`) — satu ketukan, tidak perlu cari-cari switcher.
 */
export const JOINT_CONTEXT_COPY = {
  title: 'Dompet Bersama itu konteks Bersama',
  body: (label: string) =>
    `Konteksmu sekarang ${label}. Kantong ini memang cuma untuk uang bersama (patungan) — pindah ke konteks Bersama biar switcher & catatan lain di halaman ini konsisten.`,
  cta: 'Pindah ke Bersama',
} as const
