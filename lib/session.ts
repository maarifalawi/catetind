import { NextResponse, type NextRequest } from 'next/server'
import { readSupabaseSession, sessionCookieName } from './supabase/session-cookie'

/* ── SESI & OTORISASI ROUTE HANDLER (paket 45: SESI SUPABASE NYATA) ──────────
   Paket 39 memasang penjaga `requireUser()` untuk SELURUH endpoint `app/api/**`
   supaya tidak ada lagi request anonim yang bisa menghapus dompet orang lain.
   Isinya waktu itu cookie mock (`catet-ind-session` = id user apa adanya) yang
   bisa dipalsukan dari DevTools; batas itu ditulis apa adanya di file ini.

   Sekarang isinya sesi SUPABASE: cookie `sb-<ref>-auth-token` berisi sesi Auth
   yang ditandatangani server, plus `access_token` yang dipakai SETIAP query ke
   PostgREST. Yang dibaca di file ini cuma bentuk cookie-nya (tanpa verifikasi
   tanda tangan — kunci rahasia project memang tidak boleh ada di klien);
   verifikasinya terjadi DI DATABASE, tempat `auth.uid()` ditentukan dari token
   yang sama. Jadi cookie palsu = token palsu = `401` dari PostgREST, dan
   `user.id` di sini TIDAK PERNAH dipakai sebagai izin akses — ia identitas untuk
   label, analitik, dan pemilihan store demo (yang selalu punya fallback RLS).

   API-nya SENGAJA dipertahankan (`requireUser(req)` → `{ ok, user }`), karena
   seluruh route sudah memakainya sebagai baris pertama. Yang ditambahkan:
   `token` — access token pemanggil, supaya route bisa memanggil PostgREST ATAS
   NAMA user itu (lihat `lib/supabase/rest.ts`).
   ────────────────────────────────────────────────────────────────────────── */

export interface SessionUser {
  /** `auth.users.id` (UUID) */
  id: string
  email: string
  /** nama panggilan dari metadata user */
  name: string
}

/**
 * Nama cookie sesi (`sb-<ref>-auth-token`). Dipakai test & alat bantu; nama
 * sebenarnya ditentukan `lib/supabase/session-cookie.ts` dari URL project, jadi
 * tidak pernah ada dua nama cookie yang bisa berbeda.
 */
export const SESSION_COOKIE = sessionCookieName()

/** hasil guard: user + token-nya, atau response 401 yang siap dikembalikan route */
export type SessionGuard =
  | { ok: true; user: SessionUser; token: string }
  | { ok: false; response: NextResponse }

/**
 * Penjaga wajib untuk setiap route handler. Dipanggil sebagai baris PERTAMA:
 *     const auth = requireUser(req)
 *     if (!auth.ok) return auth.response
 *     const userId = auth.user.id     // ← identitas dari SESI, bukan body request
 *
 * `req` dipakai supaya cookie-nya dibaca dari permintaan yang sedang berjalan
 * (bukan dari state global) — dua request paralel tidak bisa saling menimpa sesi.
 */
export function requireUser(req: NextRequest): SessionGuard {
  const session = readSupabaseSession(req.headers.get('cookie'))
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' },
        { status: 401 },
      ),
    }
  }
  return {
    ok: true,
    token: session.accessToken,
    user: { id: session.userId, email: session.email, name: session.name },
  }
}
