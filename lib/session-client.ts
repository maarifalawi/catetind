'use client'

import { browserSupabase } from './supabase/client'

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

/** alamat tujuan tautan masuk — halaman /login/verify yang sudah ada */
export function loginRedirectUrl(email: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/login/verify?email=${encodeURIComponent(email.trim())}`
}

/**
 * Kirim tautan masuk / kode OTP ke email. `shouldCreateUser: true` karena app ini
 * mendaftarkan user hanya dengan email (zero password, PRD 5933).
 *
 * Konfirmasi email WAJIB di project ini (`mailer_autoconfirm: false`), jadi user
 * baru harus membuka inbox dulu — layar /login/verify yang menjelaskan langkahnya.
 */
export async function sendLoginLink(email: string): Promise<AuthResult> {
  const client = browserSupabase()
  if (!client) return { ok: false, error: 'Backend Supabase belum dikonfigurasi di build ini.' }
  try {
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: loginRedirectUrl(email), shouldCreateUser: true },
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
