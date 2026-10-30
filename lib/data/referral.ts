/* ── Ajak Teman — Referral Dashboard (/referral) · Domain 7D ─────────────────
   Satu sumber data + logika MURNI (tanpa React) untuk halaman referral:

   1. TIPE state yang dibaca dari server (`GET /api/referral/me` → RPC
      `catetind_referral_overview()`). Semua angka milik pemanggil sendiri;
      tidak ada konstanta contoh di file ini lagi.
   2. COPY REWARD — SATU bentuk untuk semua paket: Token AI.
   3. Teks share kanon — dipakai `navigator.share()` dengan fallback clipboard.

   Yang DIHAPUS dari file ini (dan tidak boleh kembali):
     · `referralState` — kode contoh, jumlah klik, persen token, jumlah teman;
     · `REFERRAL_HISTORY` — lima teman karangan beserta tanggal & rewardnya;
     · `REFERRAL_IS_SAMPLE` / `REFERRAL_SAMPLE_NOTICE` — "tanda jujur" yang
       dipakai untuk membenarkan data karangan. Data nyata tidak butuh tanda;
     · `PLAN_LABEL` / `planLabel` / `PLAN_TIER_EXPLAIN` / `friendStatusLabel` /
       `tokenRemainingPct` — turunan `referralState` yang sudah tidak punya
       pemanggil.

   Kalau suatu saat butuh data contoh untuk review desain, tempatnya adalah
   `DEMO_MODE` (`lib/demo.ts`) di layar — BUKAN konstanta di file domain ini.
   ────────────────────────────────────────────────────────────────────────── */

import { AI_BASE_TOKENS_TOTAL } from '../ai-quota'
import { DEMO_MODE } from '../demo'
import { SITE_DOMAIN, SITE_ORIGIN } from '../site'

/* ── TIPE STATE ───────────────────────────────────────────────────────────── */

/**
 * `null` = belum punya paket aktif. Produksi: dibaca dari `/api/subscription`
 * oleh gerbang langganan, bukan dari file ini.
 */
export interface ReferralState {
  userSubscription: string | null
  /** kode unik user — `null` = belum ada kode yang bisa dibagikan */
  referralCode: string | null
  referralLink: string | null
  totalClicks: number
  /** sudah daftar tapi belum bayar → reward BELUM cair */
  friendsPending: number
  /** sudah daftar DAN bayar → reward cair OTOMATIS (tanpa klaim) */
  friendsConverted: number
  /** akumulasi token AI yang sudah benar-benar cair */
  rewardTokens: number
}

/** satu baris "Riwayat Teman" — `id` = uuid relasi, bukan uuid akun teman */
export interface ReferralFriend {
  id: string
  /** nama yang diturunkan server dari email yang diundang (bukan karangan) */
  name: string
  /** sudah bayar = reward cair */
  converted: boolean
  /** tanggal daftar `YYYY-MM-DD` — diformat di layar, bukan di sini */
  joinedAt: string
}

/* ── GERBANG DEMO ─────────────────────────────────────────────────────────── */

/**
 * `true` = layar boleh menampilkan catatan "mode demo". Nilainya mengikuti
 * `DEMO_MODE` (build produksi selalu `false`, lihat `lib/demo.ts`).
 *
 * Ini BUKAN pengganti data: di mode demo pun angka yang tampil tetap datang
 * dari store (yang kosong), jadi yang terlihat adalah empty state yang jujur
 * plus satu kalimat penjelas. Data contoh tidak pernah dihidupkan kembali.
 */
export const REFERRAL_SHOWS_DEMO_NOTICE = DEMO_MODE

export const REFERRAL_DEMO_NOTICE = {
  badge: 'Mode demo',
  body: 'Build ini berjalan tanpa data akun. Angka referral asli muncul setelah kamu masuk dengan akun sungguhan.',
} as const

/* ── REWARD (3B) — SATU bentuk untuk semua paket ───────────────────────────── */

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

export interface RewardCopy {
  /** kalimat lengkap (lead + highlight) — dipakai untuk aria-label & alat uji */
  headline: string
  /** bagian awal kalimat, mis. "Ajak teman, kamu dapat" */
  lead: string
  /** aksen yang ditonjolkan di kalimat, mis. "1 bulan Token AI GRATIS" */
  highlight: string
}

/** Reward untuk PENGUNDANG — sama untuk paket apa pun yang ia miliki. */
export function getReferrerReward(): RewardCopy {
  const lead = 'Ajak teman, kamu dapat'
  const highlight = '1 bulan Token AI GRATIS'
  return { lead, highlight, headline: `${lead} ${highlight}` }
}

/* ── REWARD YANG BENAR-BENAR DIBERIKAN (bukan sekadar copy) ──────────────────
   Bentuknya SATU: "1 bulan Token AI". Angka tokennya = kuota dasar bulanan
   kanon (`AI_BASE_TOKENS_TOTAL` di `lib/ai-quota.ts`), jadi tidak lahir tabel
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

/**
 * Total reward yang sudah cair, jadi kalimat siap tampil.
 *
 * `0` = "Belum ada" (bukan "+0 bulan"). Kelipatan penuh kuota dasar disebut
 * dalam bulan supaya cocok dengan janji di kartu reward; sisa token yang belum
 * genap satu bulan disebut sebagai token, bukan dibulatkan naik (membulatkan
 * ke atas berarti menjanjikan sesuatu yang belum cair).
 */
export function formatRewardEarned(tokens: number): string {
  const total = Math.max(0, Math.round(Number(tokens) || 0))
  if (total === 0) return 'Belum ada'
  const months = Math.floor(total / REFERRAL_REWARD_TOKENS)
  const rest = total - months * REFERRAL_REWARD_TOKENS
  if (months > 0 && rest === 0) return `+${months} bulan Token AI`
  return months > 0 ? `+${months} bulan +${rest} token AI` : `+${total} token AI`
}

/* ── CARA KERJA (4D) ──────────────────────────────────────────────────────── */

export const REFERRAL_STEPS: string[] = [
  'Bagikan link unikmu ke teman via WhatsApp, X, atau DM',
  'Temanmu mendaftar dan membeli paket (otomatis dapat diskon 10%)',
  'Kamu langsung dapat reward, tanpa proses klaim, otomatis masuk!',
]

/* ── COPY KEADAAN KOSONG ──────────────────────────────────────────────────── */

export const REFERRAL_EMPTY_COPY = {
  /** belum ada kode yang bisa dibagikan */
  noCode: 'Link referral belum siap. Coba muat ulang sebentar lagi.',
  /** jaringan/server gagal — bukan "kamu belum punya teman" */
  loadFailed: 'Angka referral belum bisa dimuat.',
  retry: 'Coba lagi',
  /** belum ada teman sama sekali */
  noFriends: 'Belum ada teman yang pakai linkmu.',
  /** build tanpa backend */
  notConfigured: 'Akun ini belum tersambung ke server, jadi belum ada angka referral.',
} as const

/* ── PAYLOAD SHARE (3D) ───────────────────────────────────────────────────── */

export const SHARE_TITLE = 'CatetInd - Track Keuangan Tanpa Ribet'
export const SHARE_TEXT =
  'Gue lagi pakai CatetInd buat track keuangan. Cuma 4 tap buat catat pengeluaran dan ada AI Coach yang nggak nge-judge. Kalau mau coba, pake link gue buat dapet diskon 10%:'

/** basis URL referral — selalu https + domain, satu sumber dengan `lib/site.ts` */
export const REFERRAL_URL_BASE = `${SITE_ORIGIN}/r/`

export function buildReferralShareUrl(code: string): string {
  return `${REFERRAL_URL_BASE}${code}`
}

/**
 * Teks link yang DITAMPILKAN ke user (tanpa skema, pola `buildShareLinkText`).
 * Dipisah dari versi absolut supaya tidak ada domain yang diketik tangan.
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
