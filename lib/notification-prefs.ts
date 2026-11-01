'use client'

import { applyRemotePrefs, notifyPrefsChanged, withUpdatedAt, writePrefsRaw } from './prefs-sync'

/* ── PREFERENSI NOTIFIKASI (LINTAS PERANGKAT) ─────────────────────────────────
   Sebelumnya enam saklar ini hanya hidup di `localStorage` (`catet-notif-prefs`):
   user yang mematikan "Reminder Harian" di HP tetap menerimanya di laptop.

   Sekarang nilai yang sama disimpan di `user_settings.notif_prefs` (kolom jsonb
   sendiri, bukan di dalam `privacy` — supaya tidak bertabrakan dengan penulis
   `privacy` lain) beserta `updatedAt`, dan diadopsi perangkat lain lewat
   `settings-sync` (boot + realtime).

   Yang TETAP per perangkat: izin notifikasi browser & langganan push. Itu
   keputusan OS/browser, bukan preferensi akun — `push_subscriptions` sudah
   menyimpannya per perangkat. */

export const NOTIF_PREFS_KEY = 'catet-notif-prefs'

/** id kanon — HARUS sama dengan daftar `PREFS` di `notification-settings.tsx` */
export const NOTIF_PREF_IDS = [
  'reminder-harian',
  'laporan-mingguan',
  'laporan-bulanan',
  'tanaman-layu',
  'tagihan-jatuh-tempo',
  'budget-hampir-habis',
] as const

export type NotifPrefId = (typeof NOTIF_PREF_IDS)[number]

/** titik berangkat yang sama dengan dulu: semua menyala */
export const DEFAULT_NOTIF_PREFS: Record<NotifPrefId, boolean> = {
  'reminder-harian': true,
  'laporan-mingguan': true,
  'laporan-bulanan': true,
  'tanaman-layu': true,
  'tagihan-jatuh-tempo': true,
  'budget-hampir-habis': true,
}

/** baca dari perangkat (id asing diabaikan, default menyala) */
export function readNotifPrefs(): Record<NotifPrefId, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIF_PREFS }
  try {
    const raw = window.localStorage.getItem(NOTIF_PREFS_KEY)
    if (!raw) return { ...DEFAULT_NOTIF_PREFS }
    const saved = JSON.parse(raw) as Partial<Record<NotifPrefId, unknown>> | null
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_NOTIF_PREFS }
    const next = { ...DEFAULT_NOTIF_PREFS }
    for (const id of NOTIF_PREF_IDS) {
      if (typeof saved[id] === 'boolean') next[id] = saved[id] as boolean
    }
    return next
  } catch {
    return { ...DEFAULT_NOTIF_PREFS }
  }
}

/**
 * Simpan preferensi: perangkat ini (dengan `updatedAt`) + akun (jsonb
 * `notif_prefs`). Penulisan server best-effort — nilai lokal sudah sah dan akan
 * dikirim lagi pada perubahan berikutnya.
 */
export function writeNotifPrefs(next: Record<NotifPrefId, boolean>): void {
  const payload = withUpdatedAt(next)
  writePrefsRaw(NOTIF_PREFS_KEY, payload)
  notifyPrefsChanged('notif')
  void import('@/lib/supabase/user-settings-remote').then(({ patchUserSettings }) =>
    patchUserSettings({ notifPrefs: payload }),
  )
}

/** adopsi nilai dari `user_settings.notif_prefs` bila lebih baru */
export function applyRemoteNotifPrefs(remote: unknown): boolean {
  return applyRemotePrefs(NOTIF_PREFS_KEY, remote, 'notif')
}
