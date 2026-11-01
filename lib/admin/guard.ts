import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/supabase/server'
import { adminAccessDecision, type AdminAccessDecision } from './access'

/* ── PENJAGA AKSES ADMIN DI SERVER (HANYA DI SINI IZIN DIBERIKAN) ────────────
   Dashboard Admin adalah satu-satunya permukaan yang membaca data SEMUA user.
   Karena itu:

     1. Sesi diverifikasi dengan `supabase.auth.getUser()` — token benar-benar
        ditanyakan ke Supabase Auth, bukan disimpulkan dari keberadaan cookie
        (cookie bisa ditempel siapa saja lewat DevTools).
     2. Email pemanggil dibandingkan dengan daftar admin di `lib/admin/access.ts`.
     3. Halaman TIDAK dirender saat akses ditolak: `app/admin/page.tsx`
        memanggil `readAdminIdentity()` dan langsung `redirect()`.
     4. Route API memakai `requireAdminApi()` dan menjawab 401/403 — bukan
        merender halaman kosong yang tampak "berhasil".

   ⚠️ Kunci peran server (`SUPABASE_SERVICE_ROLE_KEY`) hanya dipakai SETELAH
   penjagaan ini lolos, dan tidak pernah dikirim ke browser.
   ────────────────────────────────────────────────────────────────────────── */

export interface AdminIdentity {
  id: string
  email: string
  name: string
}

export type AdminIdentityResult =
  | { ok: true; user: AdminIdentity }
  | { ok: false; decision: Exclude<AdminAccessDecision, 'admin'>; reason: string }

/** baca & verifikasi identitas pemanggil, lalu putuskan akses admin */
export async function readAdminIdentity(): Promise<AdminIdentityResult> {
  const client = await serverSupabase()
  if (!client) {
    return {
      ok: false,
      decision: 'forbidden',
      reason: 'Backend Supabase belum dikonfigurasi di server ini.',
    }
  }

  let email = ''
  let id = ''
  let name = ''

  try {
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) {
      return {
        ok: false,
        decision: 'unauthenticated',
        reason: 'Sesi tidak ditemukan atau sudah kedaluwarsa.',
      }
    }
    id = data.user.id
    email = data.user.email ?? ''
    const metadata = data.user.user_metadata as { nickname?: unknown } | null
    name = typeof metadata?.nickname === 'string' ? metadata.nickname.trim() : ''
  } catch {
    return {
      ok: false,
      decision: 'unauthenticated',
      reason: 'Sesi tidak bisa diverifikasi saat ini.',
    }
  }

  const decision = adminAccessDecision({ authenticated: true, email })
  if (decision !== 'admin') {
    return {
      ok: false,
      decision,
      reason: 'Akun ini bukan pemilik/admin CatetInd.',
    }
  }

  return { ok: true, user: { id, email, name } }
}

export type AdminApiGuard =
  | { ok: true; user: AdminIdentity }
  | { ok: false; response: NextResponse }

/**
 * Penjaga untuk route `app/api/admin/**`. Dipanggil sebagai baris PERTAMA:
 *
 *     const gate = await requireAdminApi()
 *     if (!gate.ok) return gate.response
 */
export async function requireAdminApi(): Promise<AdminApiGuard> {
  const identity = await readAdminIdentity()
  if (identity.ok) return identity

  const status = identity.decision === 'unauthenticated' ? 401 : 403
  return {
    ok: false,
    response: NextResponse.json({ ok: false, error: identity.reason }, { status }),
  }
}
