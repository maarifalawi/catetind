/* ── Kode undangan dompet bersama (paket 39) ──────────────────────────────────
   Sebelumnya kode undangan adalah SATU konstanta global `INVITE_CODE = 'A7K2M9'`
   di `lib/data/joint.ts` yang ikut ter-bundle ke seluruh halaman, sementara
   copy-nya menjanjikan "berlaku 24 jam, cuma bisa dipakai 1x" — janji yang tidak
   pernah diverifikasi siapa pun. Sekarang:

     • kode dibuat PER WALLET (dua dompet → dua kode berbeda), 6 karakter,
       digenerate `crypto.getRandomValues` (tanpa dependency baru);
     • tiap kode punya state `{ code, walletId, createdAt, expiresAt, usedBy }`;
     • `resolveInviteFrom()` memvalidasi single-use + kedaluwarsa 24 jam dari
       state itu — fungsi murni, jadi bisa diuji tanpa browser;
     • penyimpanannya di `lib/invite-store.ts` (memory + localStorage). Di
       produksi status invite HARUS dibaca server (`GET /api/joint/invite/:code`)
       karena ia otorisasi, bukan dekorasi.

   Karena validasinya nyata, copy "Kode berlaku 24 jam. Cuma bisa dipakai 1x."
   baru boleh tampil di layar yang kodenya memang divalidasi dengan cara itu.

   Yang SENGAJA tidak ada di halaman /join: angka/transaksi milik pengundang
   (PRD 921 — data historis masing-masing user tidak boleh terganggu, dan
   2D.1 melarang kebocoran lintas-user).
   ────────────────────────────────────────────────────────────────────────── */

import { INITIAL_JOINT_WALLET, INVITE_VALIDITY_COPY, JOINT_ME, JOINT_PARTNER } from './joint'

/** masa berlaku kode undangan — angka kanon PRD AC1 (24 jam) */
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000

export const INVITE_CODE_LENGTH = 6

/**
 * Alfabet kode: tanpa `O/0`, `I/1/L` yang sering tertukar saat kode dibacakan
 * lewat telepon atau diketik ulang dari screenshot. 31 karakter × 6 posisi ≈
 * 8,8 × 10⁸ kombinasi — cukup untuk kode berumur 24 jam yang sekali pakai.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** state satu kode undangan — bentuknya sama dengan tabel `joint_wallet_invites` di PRD */
export interface InviteRecord {
  code: string
  /** dompet yang ditawarkan (satu kode = satu dompet) */
  walletId: string
  /** epoch ms */
  createdAt: number
  expiresAt: number
  /** id user yang sudah memakai kode ini — `null` = masih bisa dipakai */
  usedBy: string | null
}

/* ── PEMBUATAN KODE ──────────────────────────────────────────────────────── */

export type RandomBytes = (length: number) => Uint8Array

/**
 * Sumber acak kanon: Web Crypto. Dipisah jadi parameter supaya test bisa
 * menyuntik sumber deterministik dan supaya fungsi di atasnya tetap murni.
 */
export const cryptoRandomBytes: RandomBytes = (length) =>
  crypto.getRandomValues(new Uint8Array(length))

/**
 * 6 karakter dari alfabet aman-baca. Modulo dipakai apa adanya (bukan rejection
 * sampling): biasnya sepersekian persen dan tidak mengubah kekuatan kode 24 jam
 * sekali pakai, jadi loop tambahan cuma menambah kode tanpa manfaat.
 */
export function generateInviteCode(random: RandomBytes = cryptoRandomBytes): string {
  const bytes = random(INVITE_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

/** kode unik di antara record yang sudah ada (tabrakan → generate ulang) */
export function generateUniqueInviteCode(
  existing: readonly InviteRecord[],
  random: RandomBytes = cryptoRandomBytes,
): string {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateInviteCode(random)
    if (!existing.some((record) => record.code === code)) return code
  }
  /* praktis tidak pernah terjadi; kalau terjadi, lebih baik gagal terang-terangan
     daripada menyimpan kode duplikat yang membuka dompet orang lain */
  throw new Error('Gagal membuat kode undangan unik — coba lagi.')
}

export function createInviteRecord({
  walletId,
  existing = [],
  now = Date.now(),
  random,
}: {
  walletId: string
  existing?: readonly InviteRecord[]
  now?: number
  random?: RandomBytes
}): InviteRecord {
  return {
    code: generateUniqueInviteCode(existing, random),
    walletId,
    createdAt: now,
    expiresAt: now + INVITE_TTL_MS,
    usedBy: null,
  }
}

export function isInviteExpired(record: InviteRecord, now = Date.now()): boolean {
  return now >= record.expiresAt
}

/** kode masih bisa dipakai: belum lewat 24 jam DAN belum pernah dipakai */
export function isInviteUsable(record: InviteRecord, now = Date.now()): boolean {
  return !isInviteExpired(record, now) && record.usedBy === null
}

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

/**
 * nama dompet dari id-nya. Di produksi ini `SELECT name FROM wallets WHERE id = …`
 * (dengan RLS yang memastikan pengundang memang berhak menawarkannya); di demo
 * hanya dompet bersama yang punya kode undangan, jadi tabelnya cukup satu baris
 * kanon dari `lib/data/joint.ts`.
 */
export function inviteWalletName(walletId: string): string | null {
  return walletId === INITIAL_JOINT_WALLET.id ? INITIAL_JOINT_WALLET.name : null
}

/* ── STATE DEMO UNTUK REVIEW (kaki halaman /join) ────────────────────────────
   Empat state halaman /join harus bisa diperiksa desainer tanpa menebak URL, dan
   tiga di antaranya adalah keadaan yang MEMANG ada di store — bukan kode ajaib
   yang cuma "kelihatan" invalid:

     • valid    → record baru, kedaluwarsa 24 jam dari sekarang;
     • expired  → record yang `expiresAt`-nya 2 jam lalu;
     • used     → record yang `usedBy`-nya sudah terisi;
     • unknown  → kode yang tidak ada di store sama sekali.

   Waktunya relatif terhadap `now`, jadi ketiga state itu tetap benar kapan pun
   demo dibuka (bukan kode yang "kedaluwarsa selamanya"). Satu pengecualian yang
   disengaja: begitu kode `valid` di sini DIPAKAI lewat tombol "gabung (demo)",
   `lib/invite-store.ts` mempromosikannya jadi record tersimpan → statusnya
   menjadi `used` dan bertahan setelah reload. Itu memang janji "sekali pakai"
   yang bekerja; untuk kembali memeriksa state `valid`, buat kode baru di /joint.
   ────────────────────────────────────────────────────────────────────────── */
export const DEMO_VALID_CODE = 'K4M2P9'
export const DEMO_EXPIRED_CODE = 'B3X9Q1'
export const DEMO_USED_CODE = 'C8P4T7'
/** kode yang pasti tidak dikenal — dipakai tautan review `unknown` */
export const DEMO_UNKNOWN_CODE = 'ZZZZZZ'

export function demoInviteRecords(now = Date.now()): InviteRecord[] {
  return [
    {
      code: DEMO_VALID_CODE,
      walletId: INITIAL_JOINT_WALLET.id,
      createdAt: now - 60_000,
      expiresAt: now + INVITE_TTL_MS - 60_000,
      usedBy: null,
    },
    {
      code: DEMO_EXPIRED_CODE,
      walletId: INITIAL_JOINT_WALLET.id,
      createdAt: now - INVITE_TTL_MS - 2 * 60 * 60 * 1000,
      expiresAt: now - 2 * 60 * 60 * 1000,
      usedBy: null,
    },
    {
      code: DEMO_USED_CODE,
      walletId: INITIAL_JOINT_WALLET.id,
      createdAt: now - 3 * 60 * 60 * 1000,
      expiresAt: now + 21 * 60 * 60 * 1000,
      usedBy: JOINT_PARTNER.id,
    },
  ]
}

/** daftar state untuk blok review di kaki halaman (label + kode) */
export const DEMO_INVITE_STATES: { status: InviteStatus; label: string; code: string }[] = [
  { status: 'valid', label: 'Valid', code: DEMO_VALID_CODE },
  { status: 'expired', label: 'Kedaluwarsa', code: DEMO_EXPIRED_CODE },
  { status: 'used', label: 'Sudah dipakai', code: DEMO_USED_CODE },
  { status: 'unknown', label: 'Kode asing', code: DEMO_UNKNOWN_CODE },
]

/** `/join/<kode>` — dipakai halaman ini sendiri & tautan pratinjau dari /joint */
export function buildJoinHref(code: string): string {
  return `/join/${code.trim().toUpperCase()}`
}

/**
 * Kode → status undangan (fungsi MURNI atas daftar record).
 *
 * Mengembalikan `unknown` (bukan error) untuk kode yang tidak dikenal supaya
 * halaman bisa menjawab dengan ramah, bukan 404 kaku. Urutan pemeriksaan
 * disengaja: `unknown` → `used` → `expired`, karena "sudah dipakai" adalah
 * informasi yang lebih berguna ("minta link baru") daripada "kedaluwarsa".
 */
export function resolveInviteFrom(
  records: readonly InviteRecord[],
  code: string,
  now = Date.now(),
): ResolvedInvite {
  const normalized = code.trim().toUpperCase()
  const record = records.find((item) => item.code === normalized)

  if (!record) {
    return { status: 'unknown', inviterName: null, walletName: null, validUntilLabel: null }
  }

  const walletName = inviteWalletName(record.walletId)

  if (record.usedBy !== null) {
    return { status: 'used', inviterName: JOINT_ME.name, walletName, validUntilLabel: null }
  }

  if (isInviteExpired(record, now)) {
    return { status: 'expired', inviterName: JOINT_ME.name, walletName, validUntilLabel: null }
  }

  return {
    status: 'valid',
    inviterName: JOINT_ME.name,
    /* dompet yang sudah dihapus/di-rename tetap harus menyebut sesuatu yang jelas */
    walletName: walletName ?? INITIAL_JOINT_WALLET.name,
    validUntilLabel: INVITE_VALIDITY_COPY,
  }
}

/**
 * Pakai kode (single-use) — menandai `usedBy`.
 *
 * Dipanggil saat orang yang diundang BENAR-BENAR bergabung: di produksi setelah
 * login berhasil (server), di demo saat tombol "gabung (demo)" ditekan supaya
 * sekali-pakai-nya bisa dibuktikan di layar.
 *
 * Mengembalikan record yang sudah ditandai, atau `null` kalau kodenya tidak
 * bisa dipakai (tidak ada / sudah dipakai / kedaluwarsa) — jadi pemanggil tidak
 * pernah salah menganggap undangan berhasil.
 */
export function consumeInviteIn(
  records: readonly InviteRecord[],
  code: string,
  userId: string,
  now = Date.now(),
): InviteRecord | null {
  const normalized = code.trim().toUpperCase()
  const record = records.find((item) => item.code === normalized)
  if (!record || !isInviteUsable(record, now)) return null

  record.usedBy = userId
  return record
}

/* ── COPY UNTUK MODAL KODE DI /joint (Section 8B) ───────────────────────────
   Semua kalimat yang dilihat user tinggal di sini — komponennya nol string.
   Satu aturan yang mengikat: jangan pernah menyebut masa berlaku untuk kode yang
   statusnya sudah bukan `valid`; pemanggil membaca `resolveInvite()` dulu. */

export const INVITE_CODE_COPY = {
  title: 'Bagikan kode ini 💌',
  /** pengantar personal — nama dompetnya ikut supaya jelas kode ini untuk dompet apa */
  lead: (partnerName: string, walletName: string) =>
    `${partnerName} tinggal masukin kodenya buat gabung ke ${walletName}.`,
  /** label masa berlaku — angka nyata dari record (bukan klaim kosong) */
  expiresAt: (label: string) => `Berlaku sampai ${label}.`,
  /** satu kode aktif per dompet: membuat kode baru = mencabut yang lama */
  refresh: 'Buat kode baru',
  refreshHint: 'Kode lama langsung tidak berlaku — satu dompet, satu kode aktif.',
  /** status kode yang sudah tidak bisa dipakai (dipakai / lewat 24 jam) */
  invalidNote: 'Kode ini sudah nggak bisa dipakai. Buat kode baru di bawah ya 👇',
  /** umpan balik setelah menekan "Buat kode baru" */
  refreshedToast: 'Kode baru siap 🌿',
} as const

/** `https://catetind.app/join/<kode>` — bentuk absolute untuk dibagikan lewat chat */
export function buildInviteUrl(code: string): string {
  return `https://catetind.app${buildJoinHref(code)}`
}

/**
 * Teks share (Web Share API / clipboard). Kodenya parameternya — dulu fungsi ini
 * membaca konstanta global, sehingga dua dompet yang berbeda selalu membagikan
 * kode yang sama.
 */
export function buildInviteShareText(name: string, code: string, walletName: string): string {
  return `Halo! Aku (${name}) mengajakmu kelola uang bareng di CatetInd 💚 Dompet: ${walletName} — Kode: ${code} — klik link ini: ${buildInviteUrl(code)}`
}

/** label sisa masa berlaku. Dihitung HANYA di handler/pasca-mount (jam lokal user). */
export function inviteExpiryLabel(record: InviteRecord): string {
  const date = new Date(record.expiresAt)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ]
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${hour}.${minute}`
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
  body: 'Demo ini belum tersambung ke backend, jadi tombol "Gabung Dompet Ini" mengarah ke halaman masuk dan penggabungan dompetnya masih simulasi.',
  joinLabel: 'Lihat hasil setelah gabung (demo)',
  joinHint:
    'Lompati langkah masuk supaya alurnya bisa ditelusuri sampai ujung. Kode undangannya langsung ditandai TERPAKAI — buka ulang tautan ini untuk melihat state "sudah dipakai".',
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
  /** belum ada kode aktif untuk dompet ini — jangan tampilkan tautan palsu */
  emptyLead: 'Belum ada kode undangan aktif untuk dompet ini.',
  emptyCta: 'Buat kode di halaman Dompet Bersama',
  emptyHint:
    'Kode undangannya cuma berlaku 24 jam sejak dibuat, jadi halaman pratinjaunya muncul setelah kodenya ada.',
} as const
