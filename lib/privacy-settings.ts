/* ── PENGATURAN PRIVASI DI PERANGKAT (dipakai provider & file ekspor) ─────────
   Satu-satunya preferensi privasi yang benar-benar disimpan adalah "sensor
   nominal" (tombol mata). Sebelum paket 43, kuncinya hidup sebagai konstanta
   privat di dalam `components/catetind/privacy-provider.tsx` — artinya file
   EKSPOR tidak punya cara jujur membacanya tanpa mengimpor KOMPONEN dari `lib/`
   (arah impor repo ini selalu komponen → lib).

   Karena itu kuncinya pindah ke sini: provider & file ekspor membaca sumber
   yang sama, dan tidak ada dua kunci yang bisa berbeda. */

/** kunci localStorage — nama lama dipertahankan supaya preferensi user tidak hilang */
export const PRIVACY_MASKED_KEY = 'catet-ind-privacy-masked'

/**
 * Apakah user memilih menyensor nominal? Aman dipanggil di server/test
 * (`false` = tampil) dan saat localStorage diblokir (mode privat).
 */
export function readMaskedSetting(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(PRIVACY_MASKED_KEY) === '1'
  } catch {
    return false
  }
}

/* ── ATURAN SENSOR: DUA SUMBER, SATU HASIL (revisi 27 Sep, dikunci paket 44) ──
   Keluhan nyata pemilik produk: "setelah pindah tab, angka tersensor dan tetap
   tersensor". Penyebabnya versi pertama MEMPERSIST sensor otomatis, jadi satu
   kali app switcher dibuka user terkurung di mode sensor sampai ia menekan tombol
   mata sendiri. Dua fungsi murni di bawah ini mengunci aturan penggantinya —
   dieksekusi langsung oleh `components/catetind/privacy-provider.tsx`:

     1. `maskedForVisibility()` — yang tampil = pilihan user ATAU sensor sementara;
     2. `autoMaskedForHidden()`  — sensor sementara hidup HANYA selama tab
        disembunyikan, jadi begitu app kembali terlihat nominalnya LANGSUNG tampil;
     3. `maskedSettingValue()`   — yang disimpan ke localStorage cuma pilihan user.

   Dipisah dari provider (yang butuh React/DOM) supaya aturan ini bisa diuji
   sebagai logika biasa: `lib/privacy-settings.test.ts`. */

/**
 * Sensor sementara: tab disembunyikan = sensor ON, tab terlihat = sensor OFF.
 * Dipakai provider saat event `visibilitychange`.
 */
export function autoMaskedForHidden(hidden: boolean): boolean {
  return hidden
}

/** Nominal yang tampil disensor kalau user memintanya ATAU tab sedang disembunyikan */
export function maskedForVisibility(userMasked: boolean, autoMasked: boolean): boolean {
  return userMasked || autoMasked
}

/**
 * Nilai yang DIPERSIST — SENGAJA hanya pilihan user.
 *
 * Sensor sementara tidak pernah ikut disimpan: itulah perbedaan yang membuat
 * "pindah tab → sensor, kembali → tampil" mungkin. Tombol mata tetap permanen
 * karena ia menulis preferensi user (`'1'`/`'0'`) lewat jalur ini.
 */
export function maskedSettingValue(userMasked: boolean): '1' | '0' {
  return userMasked ? '1' : '0'
}
