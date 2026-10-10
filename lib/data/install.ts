/* ── Panduan Install PWA (/install) · Inventaris #6 ─────────────────────────
   Satu sumber data + copy MURNI (tanpa React) untuk halaman install:

   1. HERO + 3 alasan install — bahasa user, bukan bahasa fitur.
   2. TUTORIALS — langkah per platform (iOS Safari, Android Chrome, Desktop).
      Tiap langkah boleh menunjuk satu diagram di `install-step-visual.tsx`
      ("tunjukkan, jangan jelaskan"): panduan teknis adalah titik drop-off
      termahal, jadi kebingungan harus dituntaskan gambar, bukan paragraf.
   3. INSTALL_LIMITS — batasan PWA yang kami jujurkan (PRD 4A: dukungan
      notifikasi tergantung browser/OS, dan offline hanya berarti app shell
      tersimpan — data tetap butuh koneksi). Sisi jujur dari janji "bisa
      offline" di kartu benefit, supaya tidak ada klaim berlebihan (PRD 5.6).
   4. INSTALL_HANDOFF — serah-terima desktop → HP tanpa QR & tanpa dependency
      baru: Web Share API dengan fallback clipboard (pola referral-screen.tsx).

   Semua teks di bawah = copy kanon halaman install. Komponen hanya menyusun,
   tidak menulis kalimat — supaya perubahan nada cukup di satu tempat.
   ────────────────────────────────────────────────────────────────────────── */

/* import tipe saja (tanpa runtime) supaya file data tetap bebas React */
import type { DeviceType } from '@/hooks/use-device-detect'

/* ── HERO ─────────────────────────────────────────────────────────────────── */

export const INSTALL_HERO = {
  badge: 'Gratis · Tanpa App Store',
  title: 'Install CatetInd di HP Kamu',
  subtitle: 'Biar nyatet pengeluaran secepat buka Instagram.',
} as const

/** 3 alasan install — manfaat yang bisa dibuktikan user, bukan jargon teknis */
export const INSTALL_BENEFITS = [
  { emoji: '📴', title: 'Bisa Offline', desc: 'Catat walau tanpa sinyal.' },
  { emoji: '🚀', title: 'Buka Instan', desc: 'Langsung terbuka, tanpa nunggu.' },
  { emoji: '💾', title: 'Ringan', desc: 'Gak makan banyak memori.' },
] as const

/* ── STATE PEMBANTU ───────────────────────────────────────────────────────── */

/** deteksi perangkat jalan setelah mount — jangan sempat menampilkan panduan yang salah */
export const INSTALL_DETECTING_LABEL = 'Mendeteksi perangkat kamu…'

/** label tombol buka/tutup daftar panduan perangkat lain */
export const INSTALL_OTHER_GUIDES_LABEL = {
  open: 'Lihat panduan untuk perangkat lain',
  close: 'Sembunyikan panduan perangkat lain',
} as const

/** aria-label tablist pemilih perangkat */
export const INSTALL_TABLIST_LABEL = 'Pilih perangkat'

/** catatan saat tab iPhone dibuka dari perangkat non-iPhone */
export const INSTALL_IOS_PANEL_NOTE =
  'Panah panduan Share hanya muncul saat halaman ini dibuka di iPhone.'

/** arahan khusus iPhone — jumlah langkah dihitung dari data, jangan di-hardcode */
export function INSTALL_IOS_CTA(stepCount: number): string {
  return `Di iPhone: tap Share di Safari, ikuti ${stepCount} langkah 👇`
}

/** penutup halaman — jalan terakhir kalau panduan tetap tidak cukup */
export const INSTALL_HELP_FOOTER = {
  prefix: 'Masih bingung? Buka ',
  linkLabel: 'Pusat Bantuan',
  suffix: '.',
} as const

/* ── PANDUAN PER PLATFORM ─────────────────────────────────────────────────── */

/** kunci diagram pendamping langkah — dipetakan ke SVG di install-step-visual.tsx */
export type InstallVisualKey =
  | 'ios-share-button'
  | 'ios-add-to-home'
  | 'android-menu'
  | 'android-install-item'
  | 'desktop-address-bar'

export type TutorialStep = {
  /** satu perintah, satu kalimat, tanpa jargon */
  text: string
  /** diagram hanya dipasang kalau langkahnya butuh ditunjukkan */
  visual?: InstallVisualKey
}

export type Tutorial = {
  /** nama platform di tab + judul kartu */
  label: string
  /** syarat/batas platform yang harus dibaca sebelum mulai */
  note: string
  steps: TutorialStep[]
}

/** judul kartu panduan — satu resep untuk semua platform */
export function tutorialCardTitle(label: string): string {
  return `Cara install di ${label}`
}

/** aria-label kartu panduan (landmark section) */
export function tutorialAriaLabel(label: string): string {
  return `Panduan install ${label}`
}

/** isi panduan manual per perangkat — copy kanon halaman /install */
export const TUTORIALS: Record<DeviceType, Tutorial> = {
  ios: {
    label: 'iPhone / iPad',
    note: 'Wajib Safari ya — Chrome & browser lain di iPhone tidak bisa install PWA.',
    steps: [
      {
        text: 'Buka catetind.com di browser Safari (wajib Safari, Chrome iOS tidak support).',
      },
      {
        text: 'Tap ikon Share (kotak dengan panah ke atas) di toolbar bawah layar.',
        visual: 'ios-share-button',
      },
      {
        text: "Scroll ke bawah, pilih 'Tambahkan ke Layar Utama' (ikon kotak bertanda plus).",
        visual: 'ios-add-to-home',
      },
      {
        text: "Tap 'Tambah' di pojok kanan atas. Selesai — ikon CatetInd langsung nongol di layar utama.",
      },
    ],
  },
  android: {
    label: 'Android',
    note: 'Paling mulus dari Chrome. Kalau tombol install otomatis tidak muncul, pakai cara ini.',
    steps: [
      { text: 'Buka catetind.com di browser Chrome.' },
      {
        text: 'Tap ikon titik tiga (⋮) di sudut kanan atas.',
        visual: 'android-menu',
      },
      {
        text: "Pilih 'Install Aplikasi' atau 'Tambahkan ke Layar Utama' dari menu yang muncul.",
        visual: 'android-install-item',
      },
      { text: 'Konfirmasi install. Ikon CatetInd muncul di menu HP kamu!' },
    ],
  },
  desktop: {
    label: 'Desktop',
    note: 'Chrome atau Edge — paling cepat lewat ikon install di address bar.',
    steps: [
      { text: 'Buka catetind.com di Chrome atau Edge.' },
      {
        text: 'Klik ikon Install (panah ke bawah) di ujung kanan address bar.',
        visual: 'desktop-address-bar',
      },
      { text: "Klik 'Install'. CatetInd terbuka sebagai aplikasi desktop mandiri." },
    ],
  },
}

/**
 * Caption diagram — teks nyata (bukan bagian SVG) supaya ikut ukuran font user,
 * bisa dibaca screen reader, dan tetap kontras di mode teks apa pun.
 */
export const VISUAL_CAPTION: Record<InstallVisualKey, string> = {
  'ios-share-button': 'Tombol Share ada di toolbar bawah Safari.',
  'ios-add-to-home': "Pilih 'Tambahkan ke Layar Utama', lalu tap 'Tambah'.",
  'android-menu': 'Ikon titik tiga ada di pojok kanan atas.',
  'android-install-item': 'Item installnya ada di menu itu.',
  'desktop-address-bar': 'Ikon install muncul di ujung kanan address bar.',
}

/* ── BATASAN PWA (jujur, dari PRD 4A) ─────────────────────────────────────── */

export type InstallLimitIconKey = 'bell' | 'offline'

export type InstallLimit = {
  icon: InstallLimitIconKey
  title: string
  desc: string
}

export const INSTALL_LIMITS: {
  title: string
  blurb: string
  /** label tombol disclosure tiap batas — detailnya disembunyikan sampai diminta */
  detailLabel: string
  points: InstallLimit[]
} = {
  title: 'Yang perlu kamu tahu',
  blurb: 'Dua batas PWA yang kami jujurkan.',
  detailLabel: 'Detail',
  points: [
    {
      icon: 'bell',
      title: 'Notifikasi tergantung browser',
      desc: 'Chrome, Edge, dan Safari terbaru oke. Browser lain kadang belum dukung — pengingat tetap ada saat app dibuka.',
    },
    {
      icon: 'offline',
      title: 'Offline = tampilan tersimpan',
      desc: 'App tetap terbuka tanpa sinyal. Data baru masuk begitu internet balik.',
    },
  ],
}

/* ── SERAH-TERIMA DESKTOP → HP ────────────────────────────────────────────── */

/** link yang DITAMPILKAN — tanpa skema, ringkas dibaca & bisa diketik manual */
export const INSTALL_URL_TEXT = 'catetind.com/install'

/** link PENUH — dipakai navigator.share & clipboard (butuh skema https) */
export const INSTALL_URL = 'https://catetind.com/install'

export const INSTALL_HANDOFF = {
  a11yLabel: 'Lanjutkan panduan install di HP kamu',
  title: 'Lanjutkan di HP',
  blurb: 'Bagikan atau salin link ini, lalu buka di HP.',
  linkLabel: 'Link install',
  shareLabel: 'Bagikan link',
  copyLabel: 'Salin link',
  /** teks status setelah aksi — user harus tahu aksinya berhasil, bukan menebak */
  status: {
    copied: 'Link tersalin ✓',
    shared: 'Link terkirim ✓',
    failed: 'Gagal menyalin — salin link-nya manual ya',
  },
  instruction: "Buka di HP, lalu pilih 'Add to Home Screen'.",
} as const

/** payload Web Share API — satu paket judul + kalimat + link */
export const INSTALL_SHARE_TITLE = 'Install CatetInd di HP kamu'
export const INSTALL_SHARE_TEXT =
  "Buka link ini di HP kamu, lalu pilih 'Add to Home Screen' biar CatetInd bisa dibuka walau gak ada sinyal."

/* ── TAUTAN KE CHECKOUT (/checkout) ─────────────────────────────────────────
   Halaman /install bisa dibuka orang yang BELUM punya akun CatetInd (halaman
   publik, dijangkau dari sidebar & menu "Lainnya"). Tanpa tautan ini, pengunjung
   berakhir di jalan buntu — dan route `/checkout` jadi yatim, padahal CONTEXT-
   WAJIB §2 melarang halaman tanpa tautan masuk yang nyata. */

export const INSTALL_CHECKOUT_CTA = {
  prefix: 'Belum punya akun?',
  linkLabel: 'Mulai di sini',
  suffix: '',
  href: '/checkout',
} as const
