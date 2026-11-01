'use client'

import { browserSupabase } from './client'
import { dataApi, dataApiOk } from './data-api'

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
  /** konfigurasi uang (pemasukan, cicilan, gajian, periode, konteks) + updatedAt */
  money: unknown | null
  /** limit budget per kategori + updatedAt */
  budgets: unknown | null
  /** preferensi kategori (yang disembunyikan + kustom) — lintas perangkat */
  categories?: unknown | null
  /** preferensi AI (saklar capture + mode Minca) + updatedAt — kolom sendiri */
  aiPrefs?: unknown | null
  /** preferensi notifikasi (6 saklar) + updatedAt — kolom sendiri */
  notifPrefs?: unknown | null
}

export async function readUserSettings(): Promise<RemoteUserSettings | null> {
  const viaBrowser = await readSettingsViaBrowser()
  if (viaBrowser) return viaBrowser
  /* jalur server: sesi cookie yang sah tapi klien browser tidak punya sesi */
  const rows = await dataApi<Record<string, unknown>>({ table: 'user_settings', op: 'select' })
  if (!rows || rows.length === 0) return null
  return toRemoteUserSettings(rows[0])
}

function toRemoteUserSettings(data: Record<string, unknown>): RemoteUserSettings {
  return {
    masked: data.masked === true,
    onboarding: data.onboarding ?? null,
    monthlyTargets: data.monthly_targets ?? null,
    privacy: (data.privacy ?? {}) as Record<string, unknown>,
    money: data.money ?? null,
    budgets: data.budgets ?? null,
    categories: data.categories ?? null,
    aiPrefs: data.ai_prefs ?? null,
    notifPrefs: data.notif_prefs ?? null,
  }
}

async function readSettingsViaBrowser(): Promise<RemoteUserSettings | null> {
  const client = browserSupabase()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('user_settings')
      .select('masked,onboarding,monthly_targets,privacy,money,budgets,categories,ai_prefs,notif_prefs')
      .maybeSingle()
    if (error || !data) return null
    return toRemoteUserSettings(data as Record<string, unknown>)
  } catch {
    return null
  }
}

/** bentuk baris `user_settings` — `user_id` hanya diisi jalur browser (server menimpanya) */
function settingsRow(patch: Partial<RemoteUserSettings>, userId?: string): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (userId) row.user_id = userId
  if (patch.masked !== undefined) row.masked = patch.masked
  if (patch.onboarding !== undefined) row.onboarding = patch.onboarding
  if (patch.monthlyTargets !== undefined) row.monthly_targets = patch.monthlyTargets
  if (patch.privacy !== undefined) row.privacy = patch.privacy
  if (patch.money !== undefined) row.money = patch.money
  if (patch.budgets !== undefined) row.budgets = patch.budgets
  if (patch.categories !== undefined) row.categories = patch.categories
  if (patch.aiPrefs !== undefined) row.ai_prefs = patch.aiPrefs
  if (patch.notifPrefs !== undefined) row.notif_prefs = patch.notifPrefs
  return row
}

/**
 * Tulis sebagian pengaturan. `upsert` (bukan `update`) karena baris
 * `user_settings` dibuat trigger saat user mendaftar — kalau trigger itu tidak
 * jalan (user lama/backfill), tulisannya tetap berhasil.
 *
 * Dua jalur: klien browser (RLS, token user) → kalau tidak ada sesi/gagal,
 * jalur server dengan cookie sesi (`app/api/data`). Pengaturan akun tidak boleh
 * "hilang" hanya karena token di browser basi.
 */
export async function patchUserSettings(patch: Partial<RemoteUserSettings>): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { data: session } = await client.auth.getSession()
      const userId = session.session?.user.id
      if (userId) {
        const { error } = await client
          .from('user_settings')
          .upsert(settingsRow(patch, userId), { onConflict: 'user_id' })
        if (!error) return true
      }
    } catch {
      /* jatuh ke jalur server */
    }
  }
  return dataApiOk({
    table: 'user_settings',
    op: 'upsert',
    rows: [settingsRow(patch)],
    onConflict: 'user_id',
  })
}

