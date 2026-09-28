import { afterEach, describe, expect, it } from 'vitest'
import {
  PRIVACY_MASKED_KEY,
  autoMaskedForHidden,
  maskedForVisibility,
  maskedSettingValue,
  readMaskedSetting,
} from './privacy-settings'

/* ── Test ATURAN SENSOR NOMINAL (paket 44 · uji pemakaian #4) ─────────────────
   Yang dikunci di sini adalah perilaku yang dilaporkan rusak oleh pemilik produk:

     "Setelah pindah tab, angka tersensor dan tetap tersensor."

   Versi pertama sensor otomatis MEMPERSIST dirinya sebagai preferensi, jadi satu
   kali app switcher dibuka user terkurung di mode sensor. Tiga fungsi murni di
   `lib/privacy-settings.ts` (dipakai langsung oleh provider) sekarang memisahkan
   dua sumber sensor: pilihan user (permanen) dan tab disembunyikan (sementara).

   Catatan batas: ini test LAPIS ATURAN, bukan test browser. Bukti bahwa event
   `visibilitychange` benar-benar memanggilnya ada di
   `components/catetind/privacy-provider.tsx` (satu pemanggilan per fungsi), dan
   langkah verifikasi manualnya ditulis di laporan paket 44. */

/** localStorage tiruan: di lingkungan test (node) `window` tidak ada sama sekali */
function withFakeWindow(storage: { getItem: () => string | null; setItem?: (v: string) => void }, run: () => void) {
  const globalWithWindow = globalThis as { window?: unknown }
  const before = globalWithWindow.window
  globalWithWindow.window = {
    localStorage: {
      getItem: () => storage.getItem(),
      setItem: (_key: string, value: string) => storage.setItem?.(value),
    },
  }
  try {
    run()
  } finally {
    globalWithWindow.window = before
  }
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('sensor sementara: pindah tab vs tombol mata (paket 44)', () => {
  it('tab disembunyikan → nominal disensor (aman di app switcher)', () => {
    expect(autoMaskedForHidden(true)).toBe(true)
    expect(maskedForVisibility(false, autoMaskedForHidden(true))).toBe(true)
  })

  it('tab kembali terlihat → nominal LANGSUNG tampil lagi (tidak terkurung)', () => {
    /* ini inti keluhan yang ditutup: kembali dari app switcher = tampil, tanpa
       perlu menekan tombol mata */
    expect(autoMaskedForHidden(false)).toBe(false)
    expect(maskedForVisibility(false, autoMaskedForHidden(false))).toBe(false)
  })

  it('tombol mata tetap permanen: pilihan user menang di keadaan tab mana pun', () => {
    expect(maskedForVisibility(true, autoMaskedForHidden(false))).toBe(true)
    expect(maskedForVisibility(true, autoMaskedForHidden(true))).toBe(true)
  })

  it('yang DIPERSIST cuma pilihan user — sensor sementara tidak pernah disimpan', () => {
    /* kalau sensor sementara ikut dipersist, `readMaskedSetting()` akan membaca
       sensor itu sebagai preferensi user dan mengurungnya di mode sensor. */
    expect(maskedSettingValue(false)).toBe('0')
    expect(maskedSettingValue(true)).toBe('1')
  })
})

describe('readMaskedSetting: default tampil di semua situasi tidak ideal', () => {
  it('tanpa window (server/test) → false, bukan error', () => {
    expect(readMaskedSetting()).toBe(false)
  })

  it('membaca preferensi tersimpan apa adanya', () => {
    withFakeWindow({ getItem: () => '1' }, () => expect(readMaskedSetting()).toBe(true))
    withFakeWindow({ getItem: () => '0' }, () => expect(readMaskedSetting()).toBe(false))
    withFakeWindow({ getItem: () => null }, () => expect(readMaskedSetting()).toBe(false))
  })

  it('localStorage diblokir (mode privat) → default tampil, bukan melempar', () => {
    withFakeWindow(
      {
        getItem: () => {
          throw new Error('blocked')
        },
      },
      () => expect(readMaskedSetting()).toBe(false),
    )
  })

  it('kunci yang dipakai tetap nama lama supaya preferensi user tidak hilang', () => {
    expect(PRIVACY_MASKED_KEY).toBe('catet-ind-privacy-masked')
  })
})
