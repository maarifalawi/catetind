/* ── Ajak Teman — Referral Dashboard (/app/referral) · Domain 7D ─────────────
   Satu sumber data + logika MURNI (tanpa React) untuk halaman referral:

   1. STATE user: paket yang dimiliki (akses selamanya sejak paket 84), kode &
      link unik, sisa Bahan Bakar AI, dan statistik teman yang diajak.
   2. COPY REWARD — SATU bentuk untuk semua paket: Token AI. Dulu teksnya
      berbeda per jenis langganan (bulanan/tahunan dapat tambahan hari, lifetime
      dapat token); sejak tidak ada lagi masa aktif, "+30 hari" tidak punya
      tempat untuk disimpan dan sudah dihapus.
   3. Riwayat teman yang diundang + status pembayarannya (transparansi).
   4. Teks share kanon — dipakai `navigator.share()` dengan fallback clipboard.

   Catatan: semua angka di bawah masih MOCK — produksi: dari endpoint referral.
   Begitu endpoint aslinya siap, cukup ganti nilai di file ini — komponen halaman
   hanya membaca turunan dari sini, jadi tidak ada angka yang perlu diburu di JSX.
   ────────────────────────────────────────────────────────────────────────── */

import { AI_BASE_TOKENS_TOTAL, remainingPercent } from '../ai-quota'
import { SHOWS_SAMPLE_DATA } from '../demo'
import { SITE_DOMAIN, SITE_ORIGIN } from '../site'
import type { PlanId } from './pricing'

/**
 * Paket user menentukan BENTUK reward (paket 84). Karena SEMUA paket sekarang
 * akses selamanya (tanpa masa aktif), reward untuk pengundang selalu berupa
 * Token AI — tidak ada lagi "+30 hari masa aktif" yang bisa dikirim ke tipe
 * langganan yang tidak punya masa aktif.
 */
export type UserPlanId = PlanId

export interface ReferralState {
  /** `null` = belum punya paket aktif. Produksi: dibaca dari `/api/subscription`. */
  userSubscription: UserPlanId | null
  /** kode unik user — dipakai juga sebagai slug link undangan */
  referralCode: string
  /** link yang DITAMPILKAN ke user (tanpa skema https, biar ringkas di kotak mono) */
  referralLink: string
  /** Bahan Bakar AI: persen TERPAKAI (85 = 85% terpakai, 15% sisa) */
  aiTokenUsedPct: number
  /** sisa hari sebelum kuota dasar di-reset — pemicu urgensi di gauge */
  aiTokenDaysLeft: number
  totalClicks: number
  /** sudah daftar tapi belum bayar → reward BELUM cair */
  friendsPending: number
  /** sudah daftar DAN bayar → reward cair OTOMATIS (tanpa klaim) */
  friendsConverted: number
  /** akumulasi reward yang sudah cair, sudah dalam bentuk teks siap tampil */
  totalRewardEarned: string
}

export const referralState: ReferralState = {
  userSubscription: 'sultan',
  referralCode: 'RINA-X7K',
  referralLink: buildReferralLinkText('RINA-X7K'),
  aiTokenUsedPct: 85,
  aiTokenDaysLeft: 4,
  totalClicks: 12,
  friendsPending: 3,
  friendsConverted: 2,
  totalRewardEarned: '+2 bulan AI Token',
}

/* ── REWARD (3B) — SATU bentuk untuk semua paket ───────────────────────────── */

/** label paket — dipakai chip transparansi di kartu reward */
export const PLAN_LABEL: Record<UserPlanId, string> = {
  'catet-aja': 'Paket Catet Aja',
  waras: 'Paket Waras',
  sultan: 'Paket Sultan',
}

/** label siap tampil untuk pemilik paket; `null` = belum punya paket */
export function planLabel(planId: UserPlanId | null): string {
  if (!planId) return 'Belum ada paket'
  return PLAN_LABEL[planId]
}

/** yang didapat TEMAN saat checkout — sisi lain dari program dua arah */
export const REFERRED_FRIEND_BENEFIT = 'Temanmu dapat diskon 10% saat checkout'

/**
 * Pesan validasi kode teman (paket 64) — dipakai endpoint `/api/referral/validate`
 * SEBELUM registrasi difinalkan. Kalimatnya sengaja tidak menyalahkan: kode yang
 * salah ketik itu biasa, dan jalan keluarnya selalu disebut ("lanjut tanpa kode").
 */
export const REFERRAL_VALIDATE_COPY = {
  /** kode tidak ada di database (atau bentuknya tidak wajar) */
  invalid: 'Kode temannya nggak ketemu. Cek lagi ya, atau lanjut tanpa kode.',
  /** kode ada, tetapi tidak boleh dipakai oleh email/akun ini */
  conflict:
    'Kode ini nggak bisa dipakai untuk akunmu. Kalau kamu sudah pernah pakai kode lain, kode pertama yang berlaku.',
  /** backend tidak bisa dihubungi saat memeriksa — beda dari "kode salah" */
  unavailable: 'Lagi nggak bisa memeriksa kode teman. Coba lagi sebentar ya.',
} as const

/** janji privasi (3E) — kalimat ini yang membunuh keberatan "data keuanganku aman?" */
export const REFERRAL_PRIVACY_PLEDGE =
  '100% Privat. Teman yang kamu undang tidak akan pernah bisa melihat data keuanganmu, dan sebaliknya.'

/* ── REWARD REFERRAL (3B) — satu bentuk untuk semua paket ────────────────────
   Sejak paket 84 semua paket akses selamanya, jadi reward pengundang selalu
   Token AI (tidak ada masa aktif yang bisa ditambah). */

/**
 * `true` = angka & riwayat referral di halaman ini MASIH CONTOH.
 *
 * Paket 85: endpoint referral asli belum ada, jadi datanya tetap mock — TAPI
 * mock itu TIDAK boleh disajikan sebagai milik user. Halaman menampilkan tanda
 * "Contoh" yang jelas selama `REFERRAL_IS_SAMPLE` bernilai true, sehingga tidak
 * ada statistik teman karangan yang menyamar jadi fakta.
 */
export const REFERRAL_IS_SAMPLE = !SHOWS_SAMPLE_DATA

/** tanda jujur saat angka referral masih contoh (dipakai halaman /referral) */
export const REFERRAL_SAMPLE_NOTICE = {
  badge: 'Contoh',
  body: 'Angka & riwayat di halaman ini masih contoh — statistik referral asli menyusul begitu sinkronisasi aktif.',
} as const

export interface RewardCopy {
  /** kalimat lengkap (lead + highlight) — dipakai untuk aria-label & alat uji */
  headline: string
  /** bagian awal kalimat, mis. "Ajak teman → kamu dapat" */
  lead: string
  /** aksen yang ditonjolkan di kalimat, mis. "1 bulan Token AI GRATIS" */
  highlight: string
}

/** Reward untuk PENGUNDANG — sama untuk paket apa pun yang ia miliki. */
export function getReferrerReward(): RewardCopy {
  const lead = 'Ajak teman → kamu dapat'
  const highlight = '1 bulan Token AI GRATIS'
  return { lead, highlight, headline: `${lead} ${highlight}` }
}

/* ── REWARD YANG BENAR-BENAR DIBERIKAN (bukan sekadar copy) ──────────────────
   Bentuknya SATU: "1 bulan Token AI". Angka tokennya = kuota dasar bulanan
   kanon (`AI_BASE_TOKENS_TOTAL` di lib/ai-quota.ts), jadi tidak lahir tabel
   token kedua. Diberikan untuk pembelian paket APA PUN (bukan top-up token),
   dan idempoten per `order_id` — lihat webhook pembayaran + tabel
   `referral_rewards`. */
export const REFERRAL_REWARD_TOKENS = AI_BASE_TOKENS_TOTAL

/**
 * Reward untuk satu pembelian yang BERHASIL. `null` = tidak ada reward
 * (top-up token bukan pembelian paket, jadi tidak memicu bonus referral).
 */
export function referralRewardFor(
  purpose: string | null | undefined,
): { kind: 'tokens'; amount: number } | null {
  if (purpose === 'topup') return null
  return { kind: 'tokens', amount: REFERRAL_REWARD_TOKENS }
}

/* ── BAHAN BAKAR AI (3A) ──────────────────────────────────────────────────── */

/**
 * Persen SISA token AI. State menyimpan persen TERPAKAI (menyambung telemetri
 * kuota), jadi pembalikannya dikerjakan sekali di sini — logika persennya
 * memakai ulang `remainingPercent` dari lib/ai-quota supaya angka di halaman
 * ini tidak pernah berbeda cerita dengan kartu "Bahan Bakar AI" di sidebar.
 */
export function tokenRemainingPct(usedPct: number): number {
  return Math.round(remainingPercent(usedPct, 100))
}

/* ── RIWAYAT TEMAN (4C) ───────────────────────────────────────────────────── */

export interface ReferralFriend {
  id: string
  name: string
  /** sudah bayar = reward cair */
  converted: boolean
  /** tanggal daftar (mock, sudah diformat) — statis supaya render server &
   *  client identik, tidak ada hydration mismatch */
  joinedAt: string
  /** reward untuk pengundang; '-' selama teman belum bayar */
  reward: string
}

export const REFERRAL_HISTORY: ReferralFriend[] = [
  { id: 'budi', name: 'Budi Santoso', converted: true, joinedAt: '15 Sep 2026', reward: '+1 bln Token AI' },
  { id: 'siska', name: 'Siska Ayu', converted: true, joinedAt: '20 Sep 2026', reward: '+1 bln Token AI' },
  { id: 'reza', name: 'Reza Pratama', converted: false, joinedAt: '24 Sep 2026', reward: '-' },
  { id: 'ahmad', name: 'Ahmad Fauzi', converted: false, joinedAt: '25 Sep 2026', reward: '-' },
  { id: 'lisa', name: 'Lisa Permata', converted: false, joinedAt: '26 Sep 2026', reward: '-' },
]

/** label status teman — emoji dipakai sebagai penanda cepat, bukan ikon baru.
 *  H10-3 (audit UI/UX): yang belum bayar TIDAK disebut "Belum bayar" (terasa
 *  menghakimi) — pakai "Menunggu", dan chip-nya kini netral abu (bukan merah),
 *  supaya halaman tetap terasa mengundang. */
export function friendStatusLabel(converted: boolean): string {
  return converted ? '✅ Sudah beli paket' : '⏳ Menunggu'
}

/** H10-2 (audit UI/UX) — penjelasan tier reward di balik badge paket. Audit:
 *  badge "Paket Sultan" muncul tanpa penjelasan; user berhak tahu apa artinya
 *  bagi reward referral-nya. Dipakai sebagai tooltip (`title`) + tautan kecil. */
export const PLAN_TIER_EXPLAIN = {
  linkLabel: (plan: string) => `Apa itu ${plan}?`,
  body: 'Paketmu menentukan bonus yang kamu dapat tiap kali teman membeli lewat linkmu — makin tinggi paketnya, makin besar bonus Token AI-nya. Semua paket CatetInd berlaku selamanya (sekali bayar).',
} as const

/* ── CARA KERJA (4D) ──────────────────────────────────────────────────────── */

export const REFERRAL_STEPS: string[] = [
  'Bagikan link unikmu ke teman via WhatsApp, Twitter, atau DM',
  'Temanmu mendaftar dan membeli paket (otomatis dapat diskon 10%)',
  'Kamu langsung dapat reward — tanpa proses klaim, otomatis masuk!',
]

/* ── PAYLOAD SHARE (3D) ───────────────────────────────────────────────────── */

export const SHARE_TITLE = 'CatetInd - Track Keuangan Tanpa Ribet'
export const SHARE_TEXT =
  'Gue lagi pakai CatetInd buat track keuangan - literally 4 tap doang buat catat pengeluaran dan ada AI Coach yang gak nge-judge 🌱 Kalau mau coba, pake link gue buat dapet diskon 10%:'

/** basis URL referral — selalu https + domain, satu sumber dengan `lib/site.ts` */
export const REFERRAL_URL_BASE = `${SITE_ORIGIN}/r/`

export function buildReferralShareUrl(code: string): string {
  return `${REFERRAL_URL_BASE}${code}`
}

/**
 * teks link yang DITAMPILKAN ke user (tanpa skema, pola `buildShareLinkText` /
 * `buildReferralLinkText`). Dipisah dari versi absolut supaya tidak ada lagi
 * domain yang diketik tangan di dalam `referralState`.
 */
export function buildReferralLinkText(code: string): string {
  return `${SITE_DOMAIN}/r/${code}`
}

/**
 * Teks gabungan untuk FALLBACK clipboard (browser desktop tanpa Web Share API):
 * kalimat persuasif + link https-nya jadi satu tempelan yang utuh.
 */
export function buildReferralShareText(code: string): string {
  return `${SHARE_TEXT} ${buildReferralShareUrl(code)}`
}
