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
import type { MoneyContext } from '@/lib/types'
import { availableContexts } from '@/lib/data/money-context'
import { homeWallets, useMoneyStore } from '@/lib/money/store'
import { enabledContextsOf, useUserMoneySettings } from '@/lib/user-money-settings'

/* ── Konteks Uang Global (Pribadi / Keluarga / Bersama) ──────────────────────
   Audit UX #6: mengubah konteks bukan filter lokal — ia mengubah SELURUH isi
   app (dompet, riwayat, budget, kalender). Karena itu ia disimpan di satu
   provider global dan dipasang di Global Header / Sidebar, bukan di dalam body
   halaman.

   Kenapa Context, bukan props: Sidebar (desktop) dan header halaman (mobile)
   sama-sama perlu membaca/menulis nilai yang SAMA. Preferensi disimpan di
   localStorage (hidrasi SETELAH mount) supaya server & client render identik
   dulu → tidak ada hydration mismatch.

   PAKET 87 — KONTEKS MANA YANG MUNCUL: tidak semua user butuh "Keluarga" &
   "Bersama". Provider ini menyatukan DUA sumber yang sudah ada (pilihan user di
   Pengaturan `lib/user-money-settings.ts` + dompet yang benar-benar ada di
   ledger) jadi satu daftar `availableContexts`. Pemilih konteks (pill mobile /
   dropdown desktop) membaca daftar itu dan menyembunyikan diri saat isinya < 2 —
   user dengan satu konteks tidak melihat kontrol yang tidak mengontrol apa pun. */

const STORAGE_KEY = 'catet-ind-money-context'

const VALID_CONTEXTS: MoneyContext[] = ['pribadi', 'keluarga', 'bersama']

type MoneyContextValue = {
  /** konteks aktif — sumber tunggal untuk seluruh app */
  context: MoneyContext
  /** ganti konteks aktif (otomatis tersimpan) */
  setContext: (value: MoneyContext) => void
  /**
   * Konteks yang boleh tampil di pemilih (paket 87): pilihan user di Pengaturan
   * ∪ konteks yang masih berisi dompet ∪ `pribadi`. Pemilih menyembunyikan diri
   * saat isinya < 2, jadi user yang cuma punya satu konteks tidak melihat tombol
   * konteks sama sekali.
   */
  availableContexts: MoneyContext[]
}

const Ctx = createContext<MoneyContextValue | null>(null)

export function MoneyContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<MoneyContext>('pribadi')

  /* Dua sumber yang sama dengan seluruh app: preferensi user (Pengaturan) dan
     ledger kas (dompet mana yang benar-benar ada). Provider ini MENYATUKAN
     jawabannya — ia tidak menyimpan salinan yang bisa basi. */
  const settings = useUserMoneySettings()
  const snapshot = useMoneyStore()
  const available = useMemo(() => {
    const withWallets = new Set<MoneyContext>()
    for (const wallet of homeWallets(snapshot, 'all')) withWallets.add(wallet.context)
    return availableContexts(enabledContextsOf(settings), [...withWallets])
  }, [settings, snapshot])

  const setContext = useCallback((value: MoneyContext) => {
    setContextState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* diabaikan */
    }
  }, [])

  /* hidrasi preferensi: render pertama SELALU 'pribadi' (server = client),
     baru setelah mount nilai dibaca dari localStorage */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as MoneyContext | null
      if (stored && VALID_CONTEXTS.includes(stored)) setContextState(stored)
    } catch {
      /* localStorage bisa diblokir (mode privat) — default: pribadi */
    }
  }, [])

  /* Konteks aktif yang ternyata sudah tidak tersedia (user mematikannya di
     Pengaturan) → kembali ke konteks pertama yang tersedia. Ditulis lewat
     `setContext` supaya pilihan barunya IKUT tersimpan — kalau hanya state
     memori yang diubah, reload berikutnya akan berkedip ke nilai lama dulu. */
  useEffect(() => {
    if (!available.includes(context)) setContext(available[0] ?? 'pribadi')
  }, [available, context, setContext])

  const value = useMemo<MoneyContextValue>(
    () => ({ context, setContext, availableContexts: available }),
    [context, setContext, available],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** dipakai Sidebar (global) & header halaman yang ikut konteks */
export function useMoneyContext() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error('useMoneyContext harus dipakai di dalam <MoneyContextProvider>')
  }
  return ctx
}
