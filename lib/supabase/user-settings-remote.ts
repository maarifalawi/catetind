'use client'

import { browserSupabase } from './client'

/* ── PENGATURAN USER DI SERVER (`user_settings`) (paket 45) ───────────────────
   Sebelum paket ini tiga hal penting hidup HANYA di perangkat:
   penanda onboarding (`catet-ind-onboarding`), target bulanan
   (`catet-ind-monthly-target`), dan pilihan sensor nominal
   (`catet-ind-privacy-masked`). Akibatnya user yang membuka app di perangkat
   kedua harus mengulang onboarding dan kehilangan targetnya — padahal itu data
   AKUN, bukan data perangkat.

   Tabel `user_settings` menyimpannya sebagai satu baris per user (jsonb untuk
   bagian yang bentuknya masih berkembang). Yang tetap lokal: PIN/kunci app
   (`lib/app-lock-store.ts`) — rahasia perangkat memang tidak boleh naik ke server. */

export interface RemoteUserSettings {
  /** tombol mata: sensor nominal disimpan user */
  masked: boolean
  onboarding: unknown | null
  monthlyTargets: unknown | null
  privacy: Record<string, unknown>
}

export async function readUserSettings(): Promise<RemoteUserSettings | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('user_settings')
      .select('masked,onboarding,monthly_targets,privacy')
      .maybeSingle()
    if (error || !data) return null
    return {
      masked: data.masked === true,
      onboarding: data.onboarding ?? null,
      monthlyTargets: data.monthly_targets ?? null,
      privacy: (data.privacy ?? {}) as Record<string, unknown>,
    }
  } catch {
    return null
  }
}

/**
 * Tulis sebagian pengaturan. `upsert` (bukan `update`) karena baris
 * `user_settings` dibuat trigger saat user mendaftar — kalau trigger itu tidak
 * jalan (mis. user lama/backfill), tulisannya tetap berhasil.
 */
export async function patchUserSettings(patch: Partial<RemoteUserSettings>): Promise<boolean> {
  const client = browserSupabase()
  if (!client) return false
  try {
    const { data: session } = await client.auth.getSession()
    const userId = session.session?.user.id
    if (!userId) return false

    const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
    if (patch.masked !== undefined) row.masked = patch.masked
    if (patch.onboarding !== undefined) row.onboarding = patch.onboarding
    if (patch.monthlyTargets !== undefined) row.monthly_targets = patch.monthlyTargets
    if (patch.privacy !== undefined) row.privacy = patch.privacy

    const { error } = await client.from('user_settings').upsert(row, { onConflict: 'user_id' })
    return !error
  } catch {
    return false
  }
}
