'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from './config'

/* ── KLIEN SUPABASE DI BROWSER (paket 45) ────────────────────────────────────
   Satu klien per tab (memoized): `createBrowserClient` menyimpan session di
   cookie lewat `document.cookie`, dan membuat dua klien berarti dua penulis
   cookie yang bisa saling menimpa (gejalanya: sesi "hilang sendiri").

   `flowType: 'pkce'` dipilih eksplisit: tautan masuk dari email dikembalikan ke
   `/login/verify?code=…`, dan kode itu ditukar jadi sesi DI BROWSER
   (`exchangeCodeForSession`) — jalur yang sama yang dipakai halaman itu untuk
   kode OTP 6 angka. Tanpa PKCE, tautan email hanya bisa ditukar di server dan
   halaman /login/verify tidak bisa menyelesaikannya sendiri.

   ⚠️ Cookie sesi TIDAK httpOnly — dan itu disengaja: klien inilah yang me-refresh
   token di latar belakang supaya tab yang lama terbuka tidak tiba-tiba jadi
   anonim. Yang melindungi data bukan httpOnly, melainkan RLS di database:
   tanpa baris `user_id = auth.uid()` yang cocok, cookie sebagus apa pun tidak
   membuka satu baris. (Kalau nanti app memilih "semua tulis lewat server",
   cookie httpOnly baru mungkin — dan file ini jadi tidak dibutuhkan lagi.) */

let cached: SupabaseClient | null = null

/** `null` = backend belum dipasangkan / dipanggil dari server → pemanggil jatuh ke jalur lokal */
export function browserSupabase(): SupabaseClient | null {
  if (!hasSupabaseConfig()) return null
  if (typeof window === 'undefined') return null
  cached ??= createBrowserClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { flowType: 'pkce', detectSessionInUrl: false },
  })
  return cached
}

/** true = ada sesi aktif di perangkat ini (dipakai store & ekspor) */
export async function hasBrowserSession(): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { data } = await client.auth.getSession()
    return Boolean(data.session?.access_token)
  } catch {
    return false
  }
}

/** id user yang sedang masuk (dipakai label & filter lokal), `null` kalau belum */
export async function browserUserId(): Promise<string | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data } = await client.auth.getSession()
    return data.session?.user.id ?? null
  } catch {
    return null
  }
}
