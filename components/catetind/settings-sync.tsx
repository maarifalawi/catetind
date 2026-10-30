'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isPublicRoute } from '@/lib/public-routes'
import { hydrateBudgetsFromServer } from '@/lib/budget-storage'
import { hydrateMoneySettingsFromServer } from '@/lib/user-money-settings'
import { PRIVACY_MASKED_KEY } from '@/lib/privacy-settings'
import { ONBOARDING_STORE_KEY } from '@/lib/onboarding'
import { TARGET_STORE_KEY } from '@/lib/data/monthly-review'
import { readUserSettings } from '@/lib/supabase/user-settings-remote'

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
      restoreLocalOnlySettings(remote)
    })()
    return () => {
      active = false
    }
  }, [pathname])

  return null
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
      /* sensor nominal: `'1'` = tersensor (lihat `maskedSettingValue()`) */
      if (settings.masked === true) writeIfEmpty(PRIVACY_MASKED_KEY, '1')
    } catch {
      /* mode privat / storage diblokir: app tetap berjalan dengan nilai lokal */
    }
  })()
}
