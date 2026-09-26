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

/* ── Konteks Uang Global (Pribadi / Keluarga / Bersama) ──────────────────────
   Audit UX #6: mengubah konteks bukan filter lokal — ia mengubah SELURUH isi
   app (dompet, riwayat, budget, kalender). Karena itu ia disimpan di satu
   provider global dan dipasang di Global Header / Sidebar, bukan di dalam body
   halaman.

   Kenapa Context, bukan props: Sidebar (desktop) dan header halaman (mobile)
   sama-sama perlu membaca/menulis nilai yang SAMA. Preferensi disimpan di
   localStorage (hidrasi SETELAH mount) supaya server & client render identik
   dulu → tidak ada hydration mismatch. */

const STORAGE_KEY = 'catet-ind-money-context'

const VALID_CONTEXTS: MoneyContext[] = ['pribadi', 'keluarga', 'bersama']

type MoneyContextValue = {
  /** konteks aktif — sumber tunggal untuk seluruh app */
  context: MoneyContext
  /** ganti konteks aktif (otomatis tersimpan) */
  setContext: (value: MoneyContext) => void
}

const Ctx = createContext<MoneyContextValue | null>(null)

export function MoneyContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<MoneyContext>('pribadi')

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

  const setContext = useCallback((value: MoneyContext) => {
    setContextState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* diabaikan */
    }
  }, [])

  const value = useMemo<MoneyContextValue>(() => ({ context, setContext }), [context, setContext])

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
