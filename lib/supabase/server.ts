import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from './config'

/* ── KLIEN SUPABASE DI SERVER (paket 45) ─────────────────────────────────────
   Dipakai route handler yang MEMBUAT/MENGAKHIRI sesi (keluar, dan siapa pun yang
   perlu menulis cookie dari sisi server). `cookies()` di Next 16 async, jadi
   seluruh fungsi di file ini async juga.

   Cookie ditulis oleh `setAll` — itulah satu-satunya cara `@supabase/ssr`
   memindahkan sesi hasil refresh ke browser. Gagal menulis cookie BUKAN alasan
   menggagalkan permintaan user (mis. saat dipanggil dari Server Component yang
   read-only), jadi kegagalannya dibiarkan senyap seperti contoh resmi
   `@supabase/ssr`. */

export async function serverSupabase(): Promise<SupabaseClient | null> {
  if (!hasSupabaseConfig()) return null
  const store = await cookies()
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { flowType: 'pkce' },
    cookies: {
      getAll() {
        return store.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options)
        } catch {
          /* dipanggil dari konteks yang tidak boleh menulis cookie — sesi tetap sah */
        }
      },
    },
  })
}

/**
 * Akhiri sesi DI SERVER: token dicabut Auth (`signOut`), lalu cookie sesinya
 * dihapus. Dua-duanya penting: menghapus cookie saja menyisakan refresh token
 * yang masih hidup di server, dan mencabut token saja menyisakan cookie yang
 * bikin app mengira user masih masuk.
 */
export async function signOutServer(): Promise<boolean> {
  const client = await serverSupabase()
  if (!client) return false
  try {
    await client.auth.signOut()
    return true
  } catch {
    return false
  }
}
