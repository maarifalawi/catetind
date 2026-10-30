'use client'

import { browserSupabase } from './supabase/client'
import { buildVerifyHref } from './data/auth'

/* ── SESI DARI SISI CLIENT (paket 45: SUPABASE AUTH, BUKAN MOCK) ─────────────
   Versi paket 39 meminta cookie ke `POST /api/session` — endpoint demo yang
   menulis cookie tanpa tanda tangan. Sejak paket 45 sesinya milik Supabase:

     · masuk  → `signInWithOtp` mengirim tautan/kode ke email;
     · masuk  → `verifyOtp` (kode 6 angka) atau `exchangeCodeForSession` (tautan);
     · keluar → `DELETE /api/session` (server yang mencabut token + hapus cookie).

   Semua fungsi di sini mengembalikan `{ ok }` alih-alih melempar: layar masuk
   harus bisa menampilkan pesan Indonesia yang manusiawi, dan kegagalan jaringan
   bukan pengecualian yang layak menutup halaman. */

export type AuthResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

export interface SessionUserView {
  id: string
  email: string
  name: string
}

/**
 * Alamat tujuan tautan masuk — halaman /login/verify yang sudah ada. `next`
 * opsional: diteruskan supaya user yang membuka TAUTAN dari emailnya mendarat
 * di halaman yang dituju (mis. `/checkout/bayar?…`), bukan Dashboard.
 */
export function loginRedirectUrl(email: string, next?: string | null): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}${buildVerifyHref(email, next)}`
}

/**
 * Kirim tautan masuk / kode OTP ke email. `shouldCreateUser: true` karena app ini
 * mendaftarkan user hanya dengan email (zero password, PRD 5933).
 *
 * Konfirmasi email WAJIB di project ini (`mailer_autoconfirm: false`), jadi user
 * baru harus membuka inbox dulu — layar /login/verify yang menjelaskan langkahnya.
 */
export async function sendLoginLink(email: string, next?: string | null): Promise<AuthResult> {
  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }
  try {
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: loginRedirectUrl(email, next), shouldCreateUser: true },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: 'Tautan masuk sudah dikirim ke emailmu.' }
  } catch {
    return { ok: false, error: 'Jaringan tidak bisa dihubungi. Coba lagi ya.' }
  }
}

/** Masuk dengan kode 6 angka dari email — tanpa password */
export async function verifyEmailOtp(email: string, token: string): Promise<AuthResult> {
  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }
  const code = token.replace(/\D/g, '')
  if (code.length < 6) return { ok: false, error: 'Kodenya 6 angka ya. Cek lagi emailnya.' }
  try {
    const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Jaringan tidak bisa dihubungi. Coba lagi ya.' }
  }
}

/**
 * Tukar `?code=` dari tautan email jadi sesi (PKCE). Dipanggil halaman
 * /login/verify — jalur pertama yang selesai oleh user yang membuka email di
 * browser yang sama.
 */
export async function completeMagicLink(code: string): Promise<AuthResult> {
  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }
  try {
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Jaringan tidak bisa dihubungi. Coba lagi ya.' }
  }
}

/** Akhiri sesi: server mencabut token Supabase lalu menghapus cookie-nya. */
export async function endSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/session', { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Siapa yang sedang masuk? Dibaca lewat `/api/session` (bukan
 * `supabase.auth.getSession()` di klien) supaya jawabannya SAMA dengan yang
 * dipakai route server — satu sumber kebenaran identitas, seperti sebelum paket
 * 45; yang berubah cuma isinya (sekarang token Supabase yang sah).
 */
export async function fetchSessionUser(): Promise<SessionUserView | null> {
  try {
    const res = await fetch('/api/session', { method: 'GET', cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { user?: SessionUserView }
    return data.user ?? null
  } catch {
    return null
  }
}

/* ── REGISTRASI (paket 64: SUPABASE AUTH NYATA, BUKAN MOCK) ───────────────────
   Langkah 1 checkout dulu cuma mengumpulkan email + nama lalu lanjut ke
   "pembayaran" mock. Sekarang ia benar-benar MENDAFTARKAN akun:

     1. validasi kode teman di BACKEND (kalau ada) — integritas referral; kode
        yang tidak ada di database MENOLAK proses sebelum akun difinalkan;
     2. `signInWithOtp` + `shouldCreateUser` = pendaftaran tanpa password,
        persis kanon PRD 5933 (satu email, nol password). Nama panggilan ikut
        sebagai metadata user supaya trigger profil memakainya;
     3. LIFECYCLE HANDOFF — kalau Supabase mengembalikan `session` (auto-confirm
        ON) → `dashboard`; kalau verifikasi email wajib (produksi:
        `mailer_autoconfirm: false`) → `verify`, dan UI merender langkah "buka
        emailmu" yang jelas.

   Panggilan yang sama dipakai halaman masuk, jadi tidak ada dua cara berbeda
   membuat akun di app ini. */

const NETWORK_ERROR = 'Jaringan tidak bisa dihubungi. Coba lagi ya.'

export type RegisterNext = 'verify' | 'dashboard'

export type RegisterOutcome =
  | { ok: true; next: RegisterNext }
  | { ok: false; error: string }

/**
 * Validasi kode teman ke backend (yang memeriksanya ke DATABASE). Dipakai dua
 * arah: sebagai langkah pertama registrasi, dan (lewat endpoint yang sama) oleh
 * apa pun yang butuh memastikan kode benar-benar ada.
 */
export async function validateReferralCode(code: string, email: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/referral/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), email: email.trim() }),
    })
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (!res.ok || !data || data.ok === false) {
      return {
        ok: false,
        error: data?.error ?? 'Kode temannya nggak ketemu. Cek lagi ya, atau lanjut tanpa kode.',
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: NETWORK_ERROR }
  }
}

/** Daftar akun baru (email + nama panggilan, tanpa password) + integritas referral. */
export async function registerAccount({
  email,
  nickname,
  referralCode,
  next,
}: {
  email: string
  nickname: string
  /** kode teman yang sudah "dipakai" di checkout (opsional) */
  referralCode?: string | null
  /** halaman tujuan setelah verifikasi email (mis. `/checkout/bayar?…`) */
  next?: string | null
}): Promise<RegisterOutcome> {
  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }

  const trimmedEmail = email.trim()
  const trimmedNickname = nickname.trim()

  /* 1 — integritas referral DULU: menolak lebih awal berarti tidak ada akun
     setengah jadi yang menunggu dibersihkan. */
  const code = referralCode?.trim()
  if (code) {
    const check = await validateReferralCode(code, trimmedEmail)
    if (!check.ok) return { ok: false, error: check.error }
  }

  /* 2 — buat akun (passwordless) + simpan nama panggilan di metadata user */
  try {
    const { data, error } = await client.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: loginRedirectUrl(trimmedEmail, next),
        data: { nickname: trimmedNickname },
      },
    })
    if (error) return { ok: false, error: error.message }
    /* 3 — handoff: sesi ada = auto-login; tidak ada = wajib cek email dulu */
    return { ok: true, next: data.session ? 'dashboard' : 'verify' }
  } catch {
    return { ok: false, error: NETWORK_ERROR }
  }
}
