'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isPublicRoute } from '@/lib/public-routes'
import { hydrateBudgetsFromServer } from '@/lib/budget-storage'
import { hydrateMoneySettingsFromServer } from '@/lib/user-money-settings'
import { PRIVACY_MASKED_KEY } from '@/lib/privacy-settings'
import { ONBOARDING_STORE_KEY } from '@/lib/onboarding'
import { TARGET_STORE_KEY } from '@/lib/data/monthly-review'
import { CATEGORY_PREFS_STORAGE_KEY } from '@/lib/data/category-prefs'
import { readUserSettings } from '@/lib/supabase/user-settings-remote'
import { subscribeTables } from '@/lib/supabase/realtime'
import { applyRemoteAiPrefs } from '@/lib/ai-prefs'
import { applyRemoteNotifPrefs } from '@/lib/notification-prefs'

/* ── SINKRON PENGATURAN SAAT APP DIBUKA ───────────────────────────────────────
   Empat hal yang dulu hidup HANYA di localStorage sekarang juga tinggal di akun:

     · konfigurasi uang (pemasukan bulanan, cicilan, gajian, periode, konteks);
     · limit budget per kategori;
     · onboarding (supaya perangkat kedua tidak diminta mengulang);
     · tombol mata (sensor nominal) + target bulanan.

   Komponen ini menjalankan hidrasi SEKALI setelah hidrasi React, hanya di
   halaman app (bukan route publik, karena isinya data akun), dan tidak
   merender apa pun.

   Dua aturan yang berbeda, dan sengaja:
     · uang & budget → LAST-WRITE-WINS lewat `updatedAt` (dua-duanya bisa diubah
       di perangkat mana pun, jadi yang terbaru menang);
     · onboarding / sensor / target bulanan → HANYA DIISI KALAU LOKAL KOSONG.
       Nilai lokal yang sudah ada tidak pernah ditimpa, karena perangkat ini
       adalah yang paling tahu keadaan terakhirnya.

   Tidak ada angka default yang dikarang: kalau server dan perangkat sama-sama
   kosong, kartu Jatah Hari Ini tetap menampilkan "belum diatur". */
export function SettingsSync() {
  const pathname = usePathname()

  useEffect(() => {
    if (isPublicRoute(pathname)) return
    let active = true
    void (async () => {
      /* SATU panggilan `user_settings` untuk semua kebutuhan boot. Sebelumnya
         uang, budget, dan pemulihan penanda lokal masing-masing membaca baris
         yang sama (tiga round-trip untuk satu baris), dan dua upsert paralel
         bahkan bisa saling menimpa. */
      const remote = await readUserSettings()
      if (!active) return
      if (!remote) return
      await hydrateMoneySettingsFromServer(remote)
      if (!active) return
      await hydrateBudgetsFromServer(remote)
      if (!active) return
      /* preferensi AI & notifikasi (kolom jsonb sendiri): last-write-wins
         lewat `updatedAt`, jadi perangkat baru mengadopsi pilihan terakhir */
      applyPrefsFromRemote(remote)
      if (!active) return
      restoreLocalOnlySettings(remote)
    })()
    return () => {
      active = false
    }
  }, [pathname])

  /* ── PERUBAHAN DARI PERANGKAT LAIN (real-time) ─────────────────────────────
     Tanpa ini, mengubah pemasukan/gajian/limit budget di HP baru terlihat di
     laptop setelah reload. Sinyalnya hanya memicu hidrasi ulang lewat jalur yang
     SAMA dengan boot (`hydrateMoneySettingsFromServer` / `hydrateBudgetsFromServer`
     — keduanya last-write-wins lewat `updatedAt`), jadi tidak ada aturan kedua. */
  useEffect(() => {
    if (isPublicRoute(pathname)) return
    if (settingsRealtimeStarted || typeof window === 'undefined') return
    settingsRealtimeStarted = true

    const resync = () => {
      void (async () => {
        const remote = await readUserSettings()
        if (!remote) return
        await hydrateMoneySettingsFromServer(remote)
        await hydrateBudgetsFromServer(remote)
        applyPrefsFromRemote(remote)
      })()
    }
    subscribeTables('settings-changes', ['user_settings'], resync)
    const wake = () => {
      if (document.visibilityState === 'visible') resync()
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)
  }, [pathname])

  return null
}

/** dijaga di tingkat modul: satu langganan per dokumen (idempoten) */
let settingsRealtimeStarted = false

/**
 * Preferensi kecil (AI & notifikasi) dari `user_settings`. Nilainya membawa
 * `updatedAt`; `applyRemote*` hanya menulis kalau versi server memang lebih baru
 * (lihat `lib/prefs-sync.ts`), lalu memberi tahu komponen yang terbuka.
 */
function applyPrefsFromRemote(remote: { aiPrefs?: unknown; notifPrefs?: unknown }): void {
  applyRemoteAiPrefs(remote.aiPrefs)
  applyRemoteNotifPrefs(remote.notifPrefs)
}

/**
 * Isi penanda lokal yang MASIH KOSONG dari `user_settings`.
 *
 * Tanpa ini, "make `readUserSettings()` actually used" hanya teori: fungsi itu
 * sudah ada sejak paket 45 tapi tidak pernah dipanggil, jadi perangkat kedua
 * tetap mengulang onboarding dan kehilangan target bulanannya.
 *
 * `remote` dioper dari boot (`SettingsSync`) supaya baris `user_settings` cukup
 * dibaca SEKALI. Kalau dipanggil tanpa argumen (mis. dari test), ia membaca
 * sendiri.
 */
export function restoreLocalOnlySettings(
  remote?: {
    masked?: boolean
    onboarding?: unknown
    monthlyTargets?: unknown
    categories?: unknown
  } | null,
): void {
  if (typeof window === 'undefined') return
  void (async () => {
    const settings = remote ?? (await readUserSettings())
    if (!settings) return
    try {
      const store = window.localStorage
      const writeIfEmpty = (key: string, value: string) => {
        if (store.getItem(key) !== null) return
        store.setItem(key, value)
      }
      /* onboarding: bentuknya sudah JSON dari server (bukan string) */
      if (settings.onboarding && typeof settings.onboarding === 'object') {
        writeIfEmpty(ONBOARDING_STORE_KEY, JSON.stringify(settings.onboarding))
      }
      if (settings.monthlyTargets && typeof settings.monthlyTargets === 'object') {
        writeIfEmpty(TARGET_STORE_KEY, JSON.stringify(settings.monthlyTargets))
      }
      /* preferensi kategori (kustom + yang disembunyikan) — data akun */
      if (settings.categories && typeof settings.categories === 'object') {
        writeIfEmpty(CATEGORY_PREFS_STORAGE_KEY, JSON.stringify(settings.categories))
      }
      /* sensor nominal: `'1'` = tersensor (lihat `maskedSettingValue()`) */
      if (settings.masked === true) writeIfEmpty(PRIVACY_MASKED_KEY, '1')
    } catch {
      /* mode privat / storage diblokir: app tetap berjalan dengan nilai lokal */
    }
  })()
}
