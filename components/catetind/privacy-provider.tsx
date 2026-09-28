'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { formatIDR } from '@/lib/wallets'
import { MASKED_AMOUNT } from '@/lib/data/history'
import {
  PRIVACY_MASKED_KEY,
  autoMaskedForHidden,
  maskedForVisibility,
  maskedSettingValue,
} from '@/lib/privacy-settings'

/* ── Global Privacy Toggle (Sensor Layar) ────────────────────────────────────
   Satu tombol "mata" di header menyensor SEMUA nominal di layar (saldo dompet,
   Jatah Hari Ini, Arus Uang, Distribusi, Tabungan Impian, sampai list transaksi)
   supaya aman dibuka di KRL / kafe / ruang publik.

   Prinsip §5.7: yang DIBACA disensor, yang DISUNTING tidak. Permukaan yang ikut
   sensor juga termasuk **toast/ringkasan sesudah aksi** — pajangan yang tetap
   tinggal di layar beberapa detik (persis di atas kartu yang sudah disensor),
   jadi nominalnya wajib lewat `hide()`/`money()` DI TITIK TOAST DIBUAT. Field
   input/sheet yang sedang disunting TIDAK ikut — menyensor field editable bikin
   salah input.

   Kenapa pakai Context, bukan props: nominal tersebar di belasan kartu yang
   masing-masing dibungkus `memo`. Context membuat satu klik toggle menembus
   semua kartu TANPA harus mengoper `masked` berlapis-lapis dari HomeScreen —
   dan kartu yang di-memo tetap ikut re-render karena ia *membaca* context.

   Preferensi disimpan di localStorage (hidrasi SETELAH mount) supaya server &
   client render identik dulu → tidak ada hydration mismatch. */

/** nominal tersensor — panjangnya dibuat mirip angka asli (titik, bukan "…").
 *  Definisi TUNGGAL-nya ada di `lib/data/history.ts` (dipakai juga `maskMoney`,
 *  `maskNominal`, `moneyLabel`) supaya format sensor cuma hidup di satu tempat;
 *  di-re-export dari sini agar pemanggil lama tidak perlu tahu asalnya. */
export { MASKED_AMOUNT }

type PrivacyValue = {
  /** true = semua nominal di layar disensor */
  masked: boolean
  /** balik sensor ↔ tampil */
  toggle: () => void
  setMasked: (value: boolean) => void
  /** sembunyikan nominal apa pun; tanda + / - di depan tetap dipertahankan */
  hide: (text: string) => string
  /** jalur cepat untuk angka rupiah: formatIDR + sensor dalam satu langkah */
  money: (value: number) => string
}

const PrivacyContext = createContext<PrivacyValue | null>(null)

const STORAGE_KEY = PRIVACY_MASKED_KEY

export function PrivacyProvider({ children }: { children: ReactNode }) {
  /** preferensi USER (disimpan di localStorage) */
  const [userMasked, setUserMasked] = useState(false)
  /**
   * Sensor SEMENTARA karena tab disembunyikan (app switcher). SENGAJA bukan
   * preferensi: revisi 27 Sep — dulu auto-sensor ikut dipersist, sehingga sekali
   * pindah tab user terkurung di mode sensor selamanya (keluhan nyata pemilik
   * produk: "default-nya kelihatan aja"). Sekarang begitu tab kembali terlihat,
   * angka langsung tampil lagi — kecuali user memang menyalakan tombol mata.
   */
  const [autoMasked, setAutoMasked] = useState(false)
  /* aturannya tinggal di `lib/privacy-settings.ts` supaya bisa diuji: yang tampil
     = pilihan user ATAU sensor sementara (paket 44) */
  const masked = maskedForVisibility(userMasked, autoMasked)

  /* hidrasi preferensi: pertama render SELALU tampil (server = client),
     baru setelah mount state dibaca dari localStorage */
  useEffect(() => {
    try {
      setUserMasked(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* localStorage bisa diblokir (mode privat) — default: tampil */
    }
  }, [])

  useEffect(() => {
    try {
      /* yang disimpan HANYA preferensi user (`maskedSettingValue`) — sensor
         sementara tidak pernah ikut, jadi pindah tab tidak mengurung user (paket 44) */
      localStorage.setItem(STORAGE_KEY, maskedSettingValue(userMasked))
    } catch {
      /* diabaikan */
    }
  }, [userMasked])

  /* ── AUTO-SENSOR SAAT APP DITINGGALKAN (paket 39, direvisi 27 Sep) ─────────
     Menyembunyikan tab = sensor otomatis (tanpa toast, tanpa bunyi), supaya
     nominal tidak terbaca di app switcher. Yang BERUBAH dari versi pertama:
     sensor ini SEMENTARA — begitu tab kembali terlihat, angka tampil lagi
     (kecuali user memang menyalakan tombol mata). Versi pertama memaksa
     `masked = true` DAN menyimpannya sebagai preferensi, sehingga satu kali
     pindah tab membuat user terkurung di mode sensor sampai ia menekan tombol
     mata sendiri. Kompromi ini tetap menjaga risiko yang mau ditutup (layar
     yang dibaca orang lain saat app ditinggal) tanpa merampas default user. */
  useEffect(() => {
    const onVisibility = () => {
      setAutoMasked(autoMaskedForHidden(document.hidden))
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const hide = useCallback(
    (text: string) => {
      if (!masked) return text
      const trimmed = text.trimStart()
      const sign = trimmed.startsWith('-') ? '-' : trimmed.startsWith('+') ? '+' : ''
      return `${sign}${MASKED_AMOUNT}`
    },
    [masked],
  )

  const value = useMemo<PrivacyValue>(
    () => ({
      masked,
      /* menekan tombol mata SELALU berarti niat user: sensor sementara dilepas
         supaya angka benar-benar tampil, apa pun kondisi tab sebelumnya */
      toggle: () => {
        setAutoMasked(false)
        setUserMasked((v) => !v)
      },
      setMasked: setUserMasked,
      hide,
      money: (amount: number) => (masked ? MASKED_AMOUNT : formatIDR(amount)),
    }),
    [masked, hide],
  )

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

/** dipakai semua kartu yang menampilkan nominal */
export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) {
    throw new Error('usePrivacy harus dipakai di dalam <PrivacyProvider>')
  }
  return ctx
}
