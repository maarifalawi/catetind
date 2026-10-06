'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LANDING_TIERS, type LandingTier, type LandingTierId } from '@/lib/data/landing'
import { LeadSheet } from './lead-sheet'

/* ── KONTEKS CTA LANDING ─────────────────────────────────────────────────────
   Tombol "pilih paket" (di kartu harga) dan "Daftar Sekarang" (di sticky bar)
   sama-sama membuka SATU sheet pendaftaran. Daripada mengoper state lewat dua
   komponen yang berjauhan di pohon, satu provider kecil memegang "tier mana yang
   sedang dipilih" + status buka sheet-nya; section mana pun tinggal memanggil
   `openFor(tierId)`.

   Provider ini KLIEN, tapi anak-anaknya (seluruh section) tetap Server Component
   — mereka dioper sebagai `children`, jadi tidak ada yang ikut jadi klien. */
type LandingCtaValue = {
  openFor: (tierId: LandingTierId) => void
}

const LandingCtaContext = createContext<LandingCtaValue | null>(null)

export function useLandingCta(): LandingCtaValue {
  const context = useContext(LandingCtaContext)
  if (!context) throw new Error('useLandingCta harus dipakai di dalam <LandingCtaProvider>')
  return context
}

export function LandingCtaProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [tier, setTier] = useState<LandingTier | null>(null)

  const openFor = useCallback((tierId: LandingTierId) => {
    setTier(LANDING_TIERS.find((item) => item.id === tierId) ?? LANDING_TIERS[0])
    setOpen(true)
  }, [])

  const value = useMemo(() => ({ openFor }), [openFor])

  return (
    <LandingCtaContext.Provider value={value}>
      {children}
      <LeadSheet open={open} tier={tier} onClose={() => setOpen(false)} />
    </LandingCtaContext.Provider>
  )
}
