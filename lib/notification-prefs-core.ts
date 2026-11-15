/* ── PREFERENSI NOTIFIKASI: BAGIAN MURNI (CLIENT + SERVER) ───────────────────
   Enam saklar notifikasi dipakai DUA sisi:

     · klien  → `lib/notification-prefs.ts` (localStorage + sinkron akun)
     · server → cron pengingat (`lib/push/plan.ts`) yang harus tahu saklar mana
                yang menyala untuk tiap user, tanpa menyentuh `window`

   Karena itu daftar id, nilai default, dan cara membacanya dipisah ke file ini
   yang TIDAK ber-`'use client'` dan tidak menyentuh DOM. Kalau nilai default
   ditulis dua kali (client & server), satu perubahan di UI bisa membuat cron
   mengirim notifikasi yang sudah dimatikan user — jadi cukup satu sumber.

   `notif_prefs` disimpan sebagai jsonb ber-`updatedAt` (`user_settings`), dan
   payload-nya bisa berisi id lama/asing. `normalizeNotifPrefs()` adalah satu-
   satunya tempat aturan "id asing diabaikan, nilai hilang = default menyala".
   ────────────────────────────────────────────────────────────────────────── */

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

/**
 * Normalisasi payload preferensi (jsonb server ATAU localStorage) menjadi enam
 * saklar boolean. Nilai yang bukan boolean diabaikan (bukan "dimatikan"), dan
 * payload yang bukan objek menghasilkan default — sama seperti perilaku layar
 * pengaturan, jadi cron & UI tidak pernah berbeda pendapat.
 */
export function normalizeNotifPrefs(saved: unknown): Record<NotifPrefId, boolean> {
  const next = { ...DEFAULT_NOTIF_PREFS }
  if (!saved || typeof saved !== 'object') return next
  const raw = saved as Partial<Record<NotifPrefId, unknown>>
  for (const id of NOTIF_PREF_IDS) {
    if (typeof raw[id] === 'boolean') next[id] = raw[id] as boolean
  }
  return next
}

/** true = saklar ini menyala (payload mentah, tanpa perlu membaca localStorage) */
export function isNotifPrefOn(saved: unknown, id: NotifPrefId): boolean {
  return normalizeNotifPrefs(saved)[id]
}
