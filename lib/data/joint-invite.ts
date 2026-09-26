/* ── Join Invite Landing (/join/[code]) — sisi B dari Domain 2D.2 ─────────────
   Halaman ini dibuka bukan oleh user kita, tapi oleh pasangan/teman yang
   diminta mengelola uang bersama. Tekanan sosialnya paling tinggi di seluruh
   produk (menolak undangan terasa seperti menolak orangnya), jadi file ini
   menahan dua aturan sekaligus:

     1. SATU SUMBER KODE. `resolveInvite()` membaca `INVITE_CODE` dari
        `lib/data/joint.ts` — kode yang tampil di modal Section 8B (/joint)
        BUKAN daftar kedua di sini. Kode yang dibuat di dalam app pasti bisa
        dibuka di halaman ini, dan kode lain jatuh ke status `unknown`.
     2. COPY YANG TIDAK MEMAKSA. Bahasa serba "kalau mau" — tanpa hitungan
        mundur, tanpa "jangan sampai kamu mengecewakan". Warna urgensi palsu
        dilarang PRD 4507 & CONTEXT-WAJIB §5.3.

   Yang SENGAJA tidak ada di layar ini: angka/transaksi milik pengundang
   (PRD 921 — data historis masing-masing user tidak boleh terganggu, dan
   2D.1 melarang kebocoran lintas-user).

   Arah produksi: validasi single-use + kedaluwarsa 24 jam (PRD AC1) HARUS
   dicek di server (`GET /api/joint/invite/:code`) karena status invite adalah
   otorisasi, bukan dekorasi. Di demo ini statusnya ditentukan lokal supaya
   semua state bisa direview tanpa backend.
   ────────────────────────────────────────────────────────────────────────── */

import { INITIAL_JOINT_WALLET, INVITE_CODE, INVITE_VALIDITY_COPY, JOINT_ME } from './joint'

export type InviteStatus = 'valid' | 'expired' | 'used' | 'unknown'

/** status yang punya kartu sendiri (selain `valid`) */
export type InvalidInviteStatus = Exclude<InviteStatus, 'valid'>

export interface ValidInvite {
  status: 'valid'
  /** invite yang valid selalu tahu siapa pengundang & dompetnya */
  inviterName: string
  walletName: string
  /** masa berlaku (copy kanon dari /joint) */
  validUntilLabel: string
}

export interface InvalidInvite {
  status: InvalidInviteStatus
  /** nama pengundang — `null` kalau kodenya tidak dikenal (jangan mengarang nama) */
  inviterName: string | null
  /** dompet yang ditawarkan — `null` kalau kodenya tidak dikenal */
  walletName: string | null
  /** invite non-valid tidak punya masa berlaku untuk ditampilkan */
  validUntilLabel: null
}

/** union bertanda: komponen bisa narrow `status` tanpa pengecekan null berlapis */
export type ResolvedInvite = ValidInvite | InvalidInvite

/* ── SAKLAR DEMO ─────────────────────────────────────────────────────────────
   Pola yang sama dengan `DEMO_PARTNER_JOINED` di lib/data/joint.ts: state yang
   conditional tetap harus bisa direview desainernya. Kode di bawah cuma berlaku
   di repo demo — di produksi daftar ini tidak ada, status dibaca dari server. */
export const DEMO_EXPIRED_CODE = 'B3X9Q1'
export const DEMO_USED_CODE = 'C8P4T7'
/** kode yang pasti tidak dikenal — dipakai tautan review `unknown` */
export const DEMO_UNKNOWN_CODE = 'ZZZZZZ'

/** daftar state untuk blok review di kaki halaman (label + kode) */
export const DEMO_INVITE_STATES: { status: InviteStatus; label: string; code: string }[] = [
  { status: 'valid', label: 'Valid', code: INVITE_CODE },
  { status: 'expired', label: 'Kedaluwarsa', code: DEMO_EXPIRED_CODE },
  { status: 'used', label: 'Sudah dipakai', code: DEMO_USED_CODE },
  { status: 'unknown', label: 'Kode asing', code: DEMO_UNKNOWN_CODE },
]

/** `/join/<kode>` — dipakai halaman ini sendiri & tautan pratinjau dari /joint */
export function buildJoinHref(code: string): string {
  return `/join/${code.trim().toUpperCase()}`
}

/**
 * Kode → status undangan. Mengembalikan `unknown` (bukan error) untuk kode yang
 * tidak dikenal supaya halaman bisa menjawab dengan ramah, bukan 404 kaku.
 */
export function resolveInvite(code: string): ResolvedInvite {
  const normalized = code.trim().toUpperCase()

  if (normalized === INVITE_CODE) {
    return {
      status: 'valid',
      inviterName: JOINT_ME.name,
      walletName: INITIAL_JOINT_WALLET.name,
      validUntilLabel: INVITE_VALIDITY_COPY,
    }
  }

  /* dua state non-valid yang masih tahu siapa pengundangnya: masanya sudah
     habis (24 jam) atau undangannya sudah sekali terpakai (PRD AC1) */
  if (normalized === DEMO_EXPIRED_CODE || normalized === DEMO_USED_CODE) {
    return {
      status: normalized === DEMO_EXPIRED_CODE ? 'expired' : 'used',
      inviterName: JOINT_ME.name,
      walletName: INITIAL_JOINT_WALLET.name,
      validUntilLabel: null,
    }
  }

  return { status: 'unknown', inviterName: null, walletName: null, validUntilLabel: null }
}


/* ── COPY (inventaris #7 · PRD 900–932) ─────────────────────────────────────
   Semua teks user-facing halaman ini tinggal di sini; komponennya nol string. */

export const JOIN_COPY = {
  eyebrow: 'Undangan dompet bersama',
  /** pola persis PRD 915 — nama pengundang jadi subjek kalimat, bukan "Anda diundang" */
  headline: (inviter: string) => `Halo! ${inviter} mengajakmu kelola uang bareng di CatetInd 💚`,
  walletLabel: 'Dompet bersama',
  /** penjelas singkat: apa yang terjadi setelah gabung, tanpa istilah teknis */
  subtitle:
    'Satu buku besar untuk kalian berdua: siapa nalangin apa, berapa yang perlu diimpasin. Mulai dari Rp0 dan tanpa mindahin uang ke mana-mana.',
  benefitsTitle: 'Yang kalian dapat',
  benefits: [
    {
      emoji: '🤝',
      title: 'Bagi pengeluaran berdua',
      desc: 'Patungan otomatis 50/50 — atau atur sendiri kalau porsi kalian beda.',
    },
    {
      emoji: '📊',
      title: 'Ringkasan bareng',
      desc: 'Rekap mingguan & bulanan: kalian kelola berapa bareng, tanpa perlu tanya-tanya.',
    },
    {
      emoji: '🫶',
      title: 'Dompet pribadi tetap ada',
      desc: 'Uang pribadimu nggak pindah ke mana-mana. Yang dibagi cuma catatan bersama ini.',
    },
  ],
  /** jaminan privasi 2D.1 — WAJIB tampil SEBELUM CTA primer (urutan visual) */
  privacyTitle: 'Transaksi pribadimu tetap pribadi.',
  privacyBody:
    'Yang dibagi cuma dompet bersama ini. Catatan pribadimu, dompet pribadimu, dan riwayat yang sudah ada nggak ikut kelihatan atau tercampur.',
  /** catatan diskon referral satu arah untuk yang diundang (PRD 2D.6) */
  referralNote: (inviter: string) => `Bonus buat kamu: diskon referral dari ${inviter}.`,
  /** CTA primer — mengarah ke /login (belum ada sesi = masuk dulu, lalu auto-join) */
  ctaJoin: 'Gabung Dompet Ini',
  ctaJoinHint:
    'Masuk dulu pakai tautan email — tanpa password. Belum punya akun? Tautan itu sekaligus bikin akunmu.',
  /** CTA sekunder — nyata, sopan, tanpa rasa bersalah (tanpa countdown/urgensi) */
  ctaLater: 'Nanti aja',
  ctaLaterHint: 'Nggak ada pengingat beruntun dan nggak ada batas waktu yang dipaksa.',
} as const

/* ── STATUS NON-VALID ─────────────────────────────────────────────────────── */

export const INVALID_INVITE_COPY: Record<
  InvalidInviteStatus,
  { emoji: string; title: string; body: string }
> = {
  expired: {
    emoji: '⏳',
    title: 'Tautan undangannya sudah kedaluwarsa',
    body: 'Undangan dompet bersama cuma berlaku 24 jam demi keamanan kalian. Nggak ada yang hilang kok — tinggal minta link baru.',
  },
  used: {
    emoji: '✅',
    title: 'Tautan ini sudah dipakai',
    body: 'Undangan ini sekali pakai, jadi sudah nggak bisa dibuka lagi. Kalau memang mau gabung, minta link baru ya.',
  },
  unknown: {
    emoji: '🧐',
    title: 'Kodenya nggak ketemu',
    body: 'Mungkin salah ketik, atau linknya nggak tersalin lengkap. Coba buka ulang link yang kamu terima, atau minta link baru.',
  },
} as const

/** judul kartu "minta link baru" — personal kalau pengundangnya diketahui */
export function askAgainLead(inviterName: string | null): string {
  return inviterName ? `Minta link baru ke ${inviterName}` : 'Minta link baru ke yang mengundangmu'
}

export const ASK_AGAIN_COPY = {
  hint: 'Salin pesannya, lalu tempel di chat kalian. Undangan kedaluwarsa itu hal biasa, kok.',
  copyLabel: 'Salin pesan minta link',
  copiedLabel: 'Tersalin ✓',
} as const

/**
 * Pesan siap-tempel untuk meminta undangan baru. Ditulis dari sudut pandang
 * yang DIUNDANG dan tanpa nada menuntut — ini jalan keluar, bukan pengaduan.
 */
export function buildAskAgainMessage(inviterName: string | null): string {
  const sapaan = inviterName ? `Hei ${inviterName}` : 'Hei'
  return `${sapaan}, link undangan dompet bersama CatetInd-nya udah nggak bisa dibuka. Boleh kirim ulang? 💚`
}

/** tautan review state (kaki halaman) — jujur berlabel demo */
export const JOIN_DEMO_COPY = {
  title: 'Di build demo',
  body: 'Demo ini belum punya sesi, jadi tombol "Gabung Dompet Ini" mengarah ke halaman masuk dan belum benar-benar menggabungkan dompet.',
  joinLabel: 'Lihat hasil setelah gabung (demo)',
  joinHint: 'Lompati langkah masuk supaya alurnya bisa ditelusuri sampai ujung.',
  statesLabel: 'Coba state lain',
} as const

/* ── STATE SUKSES (PRD AC4: dompet mulai Rp0) ─────────────────────────────── */

export const JOIN_SUCCESS_COPY = {
  title: (walletName: string) => `Kalian sekarang punya ${walletName} 💚`,
  body: 'Dompet bersama aktif dan mulai dari Rp0. Riwayat pribadi kalian tetap terpisah — nggak ada catatan yang tercampur.',
  cta: 'Buka dompet bersama',
  restart: 'Balik lihat undangannya',
} as const

/* ── TAUTAN MASUK DARI DALAM APP ─────────────────────────────────────────────
   `/join/[code]` dibuka dari luar (chat/WhatsApp), tapi route-nya tetap harus
   bisa dijangkau dari navigasi nyata (CONTEXT-WAJIB §2). Dua pintu masuknya:
   modal kode undangan di /joint (Section 8B) dan kartu Dompet Bersama di
   Pengaturan. Gunanya juga nyata: user A bisa memeriksa apa yang akan dilihat
   pasangannya SEBELUM membagikan linknya. */
export const JOIN_PREVIEW_COPY = {
  linkLabel: 'Pratinjau halaman undangan',
  hint: 'Tampilan yang dilihat pasanganmu saat membuka link undangan ini.',
} as const
