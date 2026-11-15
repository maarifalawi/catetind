'use client'

import {
  DEFAULT_NOTIF_PREFS,
  NOTIF_PREF_IDS,
  normalizeNotifPrefs,
  type NotifPrefId,
} from './notification-prefs-core'
import { applyRemotePrefs, notifyPrefsChanged, withUpdatedAt, writePrefsRaw } from './prefs-sync'

/* ── PREFERENSI NOTIFIKASI (LINTAS PERANGKAT) ─────────────────────────────────
   Sebelumnya enam saklar ini hanya hidup di `localStorage` (`catet-notif-prefs`):
   user yang mematikan "Reminder Harian" di HP tetap menerimanya di laptop.

   Sekarang nilai yang sama disimpan di `user_settings.notif_prefs` (kolom jsonb
   sendiri, bukan di dalam `privacy` — supaya tidak bertabrakan dengan penulis
   `privacy` lain) beserta `updatedAt`, dan diadopsi perangkat lain lewat
   `settings-sync` (boot + realtime).

   Sejak paket cron pengingat, daftar id + nilai default + normalisasi pindah ke
   `notification-prefs-core.ts` karena dipakai juga oleh SERVER
   (`lib/push/plan.ts`). Satu sumber: saklar yang dimatikan di layar ini
   benar-benar mematikan pesan yang dikirim cron, bukan hanya tampilan.

   Yang TETAP per perangkat: izin notifikasi browser & langganan push. Itu
   keputusan OS/browser, bukan preferensi akun — `push_subscriptions` sudah
   menyimpannya per perangkat. */

export { DEFAULT_NOTIF_PREFS, NOTIF_PREF_IDS, type NotifPrefId }

export const NOTIF_PREFS_KEY = 'catet-notif-prefs'

/** baca dari perangkat (id asing diabaikan, default menyala) */
export function readNotifPrefs(): Record<NotifPrefId, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIF_PREFS }
  try {
    const raw = window.localStorage.getItem(NOTIF_PREFS_KEY)
    if (!raw) return { ...DEFAULT_NOTIF_PREFS }
    return normalizeNotifPrefs(JSON.parse(raw) as unknown)
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

/**
 * PESAN STATUS PUSH — dipakai layar Pengaturan → Notifikasi.
 *
 * Dulu blok ini bernama `NOTIF_SCHEDULE_NOTE`: satu paragraf panjang yang
 * menjelaskan jadwal pengingat otomatis. Paragraf itu DIMINTA DIHAPUS dari
 * layar (terlalu panjang & mengulang isi saklar di bawahnya), jadi yang tinggal
 * hanya kalimat status yang muncul SAAT ADA YANG PERLU DIJELASKAN — bukan
 * paragraf tetap yang selalu tampil.
 *
 * Alasan tiap kalimat ada di sini, bukan di komponen: repo ini menyimpan semua
 * teks user-facing di `lib/`, dan hook push mengembalikan kode hasil
 * (`PushActivateResult`) yang tinggal diterjemahkan di satu tempat ini.
 */
export const PUSH_STATUS_COPY = {
  /** aktivasi berhasil, perangkat sudah terdaftar */
  activated: 'Perangkat ini sudah terdaftar buat push. Coba tombol tes di bawah buat memastikan.',
  /** browser tidak punya Web Push sama sekali */
  unsupported:
    'Browser ini belum mendukung Web Push. Coba Chrome/Edge terbaru, atau Safari iOS 16.4+ yang sudah di-install ke Home Screen.',
  /** izin notifikasi ditolak user/browser */
  denied:
    'Izin notifikasi ditolak browser. Buka ikon 🔒 di address bar → Izin Situs → Notifikasi, lalu coba lagi.',
  /** service worker belum/tidak siap — penyebab klasik di mode dev */
  noWorker:
    'Service worker belum siap, jadi push belum bisa didaftarkan. Muat ulang halaman sekali; kalau masih sama, aktifkan lewat build produksi (`pnpm build && pnpm start`) atau pastikan situs dibuka via localhost/HTTPS.',
  /** endpoint menolak karena belum ada sesi (401) */
  noSession: 'Masuk dulu ke akun kamu, baru perangkat ini bisa didaftarkan buat push.',
  /** gagal karena sebab lain (mis. kunci VAPID tidak terbaca) */
  failed: 'Push belum berhasil didaftarkan. Coba lagi sebentar ya.',
} as const
