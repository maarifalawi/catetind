/* ── Ajak Teman — Referral Dashboard (/app/referral) · Domain 7D ─────────────
   Satu sumber data + logika MURNI (tanpa React) untuk halaman referral:

   1. STATE user: paket langganan, kode & link unik, sisa Bahan Bakar AI, dan
      statistik teman yang diajak.
   2. COPY REWARD DINAMIS — teksnya WAJIB berbeda per jenis langganan (mandat
      PRD 7D): pengguna bulanan/tahunan masih punya masa aktif, jadi rewardnya
      TAMBAHAN HARI; pengguna lifetime & founding member tidak punya masa aktif
      lagi, jadi rewardnya TOKEN AI. Salah pasang di sini = user ditawari reward
      yang tidak bisa dia pakai.
   3. Riwayat teman yang diundang + status pembayarannya (transparansi).
   4. Teks share kanon — dipakai `navigator.share()` dengan fallback clipboard.

   Catatan: semua angka di bawah masih MOCK. Begitu endpoint referral asli
   siap, cukup ganti nilai di file ini — komponen halaman hanya membaca
   turunan dari sini, jadi tidak ada angka yang perlu diburu di JSX.
   ────────────────────────────────────────────────────────────────────────── */

import { remainingPercent } from '../ai-quota'

/** paket langganan menentukan bentuk reward yang ditawarkan ke pengundang */
export type SubscriptionType = 'monthly' | 'yearly' | 'lifetime' | 'founding_member'

export interface ReferralState {
  userSubscription: SubscriptionType
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
  userSubscription: 'founding_member',
  referralCode: 'RINA-X7K',
  referralLink: 'catetind.com/r/RINA-X7K',
  aiTokenUsedPct: 85,
  aiTokenDaysLeft: 4,
  totalClicks: 12,
  friendsPending: 3,
  friendsConverted: 2,
  totalRewardEarned: '+2 bulan AI Token',
}

/* ── REWARD (3B) ──────────────────────────────────────────────────────────── */

/** label paket — dipakai chip transparansi di kartu reward */
export const SUBSCRIPTION_LABEL: Record<SubscriptionType, string> = {
  monthly: 'Paket Bulanan',
  yearly: 'Paket Tahunan',
  lifetime: 'Lifetime',
  founding_member: 'Founding Member',
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
  /** backend tidak bisa dihubungi saat memeriksa — beda dari "kode salah" */
  unavailable: 'Lagi nggak bisa memeriksa kode teman. Coba lagi sebentar ya.',
} as const

/** janji privasi (3E) — kalimat ini yang membunuh keberatan "data keuanganku aman?" */
export const REFERRAL_PRIVACY_PLEDGE =
  '100% Privat. Teman yang kamu undang tidak akan pernah bisa melihat data keuanganmu, dan sebaliknya.'

/** paket tanpa masa aktif → rewardnya token AI, bukan perpanjangan hari */
export function isLifetimePlan(subscription: SubscriptionType): boolean {
  return subscription === 'lifetime' || subscription === 'founding_member'
}

export interface RewardCopy {
  /** kalimat lengkap (lead + highlight) — dipakai untuk aria-label & alat uji */
  headline: string
  /** bagian awal kalimat, mis. "Ajak teman → kamu dapat" */
  lead: string
  /** aksen yang ditonjolkan di kalimat, mis. "+30 hari masa aktif GRATIS" */
  highlight: string
}

/**
 * Reward untuk PENGUNDANG. Dua keluarga teks, dipilih dari jenis langganan:
 *   • monthly / yearly            → tambahan masa aktif
 *   • lifetime / founding_member  → tambahan Token AI
 */
export function getReferrerReward(subscription: SubscriptionType): RewardCopy {
  const lead = 'Ajak teman → kamu dapat'
  const highlight = isLifetimePlan(subscription)
    ? '1 bulan Token AI GRATIS'
    : '+30 hari masa aktif GRATIS'
  return { lead, highlight, headline: `${lead} ${highlight}` }
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
  { id: 'budi', name: 'Budi Santoso', converted: true, joinedAt: '15 Sep 2026', reward: '+30 hari' },
  { id: 'siska', name: 'Siska Ayu', converted: true, joinedAt: '20 Sep 2026', reward: '+30 hari' },
  { id: 'reza', name: 'Reza Pratama', converted: false, joinedAt: '24 Sep 2026', reward: '-' },
  { id: 'ahmad', name: 'Ahmad Fauzi', converted: false, joinedAt: '25 Sep 2026', reward: '-' },
  { id: 'lisa', name: 'Lisa Permata', converted: false, joinedAt: '26 Sep 2026', reward: '-' },
]

/** label status teman — emoji dipakai sebagai penanda cepat, bukan ikon baru */
export function friendStatusLabel(converted: boolean): string {
  return converted ? '✅ Berlangganan' : '⏳ Belum bayar'
}

/* ── CARA KERJA (4D) ──────────────────────────────────────────────────────── */

export const REFERRAL_STEPS: string[] = [
  'Bagikan link unikmu ke teman via WhatsApp, Twitter, atau DM',
  'Temanmu mendaftar dan membayar langganan (otomatis dapat diskon 10%)',
  'Kamu langsung dapat reward — tanpa proses klaim, otomatis masuk!',
]

/* ── PAYLOAD SHARE (3D) ───────────────────────────────────────────────────── */

export const SHARE_TITLE = 'CatetInd - Track Keuangan Tanpa Ribet'
export const SHARE_TEXT =
  'Gue lagi pakai CatetInd buat track keuangan - literally 4 tap doang buat catat pengeluaran dan ada AI Coach yang gak nge-judge 🌱 Kalau mau coba, pake link gue buat dapet diskon 10%:'

/** basis URL share — selalu https + domain, bukan teks link yang ditampilkan */
export const REFERRAL_URL_BASE = 'https://catetind.com/r/'

export function buildReferralShareUrl(code: string): string {
  return `${REFERRAL_URL_BASE}${code}`
}

/**
 * Teks gabungan untuk FALLBACK clipboard (browser desktop tanpa Web Share API):
 * kalimat persuasif + link https-nya jadi satu tempelan yang utuh.
 */
export function buildReferralShareText(code: string): string {
  return `${SHARE_TEXT} ${buildReferralShareUrl(code)}`
}
