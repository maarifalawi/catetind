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

/* ── Global Privacy Toggle (Sensor Layar) ────────────────────────────────────
   Satu tombol "mata" di header menyensor SEMUA nominal di layar (saldo dompet,
   Jatah Hari Ini, Arus Uang, Distribusi, Tabungan Impian, sampai list transaksi)
   supaya aman dibuka di KRL / kafe / ruang publik.

   Kenapa pakai Context, bukan props: nominal tersebar di belasan kartu yang
   masing-masing dibungkus `memo`. Context membuat satu klik toggle menembus
   semua kartu TANPA harus mengoper `masked` berlapis-lapis dari HomeScreen —
   dan kartu yang di-memo tetap ikut re-render karena ia *membaca* context.

   Preferensi disimpan di localStorage (hidrasi SETELAH mount) supaya server &
   client render identik dulu → tidak ada hydration mismatch. */

/** nominal tersensor — panjangnya dibuat mirip angka asli (titik, bukan "…") */
export const MASKED_AMOUNT = 'Rp •••••••'

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

const STORAGE_KEY = 'catet-ind-privacy-masked'

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [masked, setMasked] = useState(false)

  /* hidrasi preferensi: pertama render SELALU tampil (server = client),
     baru setelah mount state dibaca dari localStorage */
  useEffect(() => {
    try {
      setMasked(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* localStorage bisa diblokir (mode privat) — default: tampil */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, masked ? '1' : '0')
    } catch {
      /* diabaikan */
    }
  }, [masked])

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
      toggle: () => setMasked((v) => !v),
      setMasked,
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
