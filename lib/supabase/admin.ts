import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseConfig, hasSupabaseServiceRole, supabaseServiceKey, supabaseUrl } from './config'

/* ── KLIEN PERAN SERVER (SERVICE ROLE) — HANYA UNTUK ROUTE TERAUTENTIKASI ─────
   Kenapa file ini ada: sesi bisa SAH di server (cookie `sb-…-auth-token`) tapi
   klien Supabase di BROWSER tidak bisa memakainya — cookie ber-chunk, cookie
   pihak ketiga diblokir (Safari ITP), atau token kedaluwarsa di tab yang lama
   terbuka. Dalam keadaan itu setiap tulis ke `wallets`/`ledger_rows` ditolak
   RLS (`auth.uid()` kosong) dan barisnya tertahan di satu perangkat — persis
   gejala "transaksi ada di HP, tidak ada di laptop".

   Aturan yang TIDAK boleh dilanggar di file ini:
     1. HANYA dipanggil dari route handler yang SUDAH memverifikasi sesi
        (`requireUser(req)`), dan `user_id` SELALU diambil dari sesi itu —
        tidak pernah dari body request.
     2. Tidak boleh dipakai untuk membaca data lintas user: setiap query di
        route pemakainya wajib menyertakan `user_id = <sesi>`.
     3. Kunci ini mem-BYPASS RLS. Kalau ragu, jangan pakai file ini. */

let cached: SupabaseClient | null = null

/** true = kunci peran server tersedia (bukan kunci publishable) */
export function hasAdminSupabase(): boolean {
  return hasSupabaseConfig() && hasSupabaseServiceRole()
}

/** `null` = jalur server tidak tersedia → pemanggil wajib jatuh ke jalur browser/lokal */
export function adminSupabase(): SupabaseClient | null {
  if (!hasAdminSupabase()) return null
  cached ??= createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
