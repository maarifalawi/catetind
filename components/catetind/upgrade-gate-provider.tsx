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
import { CAPABILITY_LABEL, capabilityUnlockedBy, type Capability } from '@/lib/data/pricing'
import { PAGE_ACCESS_COPY, pageAccessRule } from '@/lib/subscription/page-access'
import { UpgradeModal } from './upgrade-modal'
import { useSubscriptionGate } from './subscription-gate-provider'

/* ── GERBANG UPGRADE GLOBAL ──────────────────────────────────────────────────
   Halaman yang terkunci TIDAK dirender sama sekali. Dua pintu masuk:

     · klik tautan/menu  → `openUpgradeForPage(href)` mencegah navigasi dan
       membuka `UpgradeModal` (halaman sekarang tetap di tempatnya);
     · buka URL langsung → `ScreenShell` redirect ke halaman aman + memanggil
       fungsi yang sama, jadi user tetap melihat alasan + pilihan upgrade.

   Kenapa provider di root, bukan state per komponen: sidebar desktop, drawer
   mobile, menu Pengaturan, dan `ScreenShell` harus membuka MODAL YANG SAMA.
   Kalau tiap tempat punya state sendiri, bisa muncul dua modal atau satu tempat
   tidak tahu popup sedang terbuka.

   Nominal & target paket tetap dari `UpgradeModal` → `priceFor()`; file ini
   hanya memilih kemampuan yang kurang dan menyusun alasan yang spesifik. */

type UpgradeRequest = {
  capability: Capability
  message: string
}

interface UpgradeGateValue {
  /** buka popup untuk satu kemampuan (dipakai fitur terkunci bila perlu) */
  openUpgrade: (capability: Capability, message?: string) => void
  /**
   * Kalau `href` menunjuk halaman terkunci: buka popup dan kembalikan `true`
   * (pemanggil WAJIB `preventDefault()`). Selain itu `false` → navigasi normal.
   */
  openUpgradeForPage: (href: string) => boolean
}

const UpgradeGateContext = createContext<UpgradeGateValue | null>(null)

export function UpgradeGateProvider({ children }: { children: ReactNode }) {
  const { lockedPageCapability } = useSubscriptionGate()
  const [request, setRequest] = useState<UpgradeRequest | null>(null)

  const openUpgrade = useCallback((capability: Capability, message?: string) => {
    const unlockPlan = capabilityUnlockedBy(capability)
    setRequest({
      capability,
      message:
        message ??
        `${CAPABILITY_LABEL[capability]} aktif di ${unlockPlan.name}. Upgrade dulu untuk membukanya.`,
    })
  }, [])

  const openUpgradeForPage = useCallback(
    (href: string) => {
      const capability = lockedPageCapability(href)
      if (!capability) return false
      const rule = pageAccessRule(href)
      const unlockPlan = capabilityUnlockedBy(capability)
      setRequest({
        capability,
        message: PAGE_ACCESS_COPY.title(rule?.label ?? 'ini', unlockPlan.name),
      })
      return true
    },
    [lockedPageCapability],
  )

  const value = useMemo<UpgradeGateValue>(
    () => ({ openUpgrade, openUpgradeForPage }),
    [openUpgrade, openUpgradeForPage],
  )

  /* ── SATU PINTU UNTUK SEMUA TAUTAN INTERNAL ─────────────────────────────────
     Capture phase dipakai supaya listener ini berjalan SEBELUM handler Next
     `<Link>` (yang ada di fase bubble). `preventDefault()` membuat Next berhenti
     di `if (e.defaultPrevented) return` — jadi halaman terkunci tidak pernah
     dipindahkan, dan popup tetap muncul.

     Klik modifikasi (Ctrl/Cmd/Shift/Alt) & target `_blank` sengaja dilewatkan:
     kalau user membuka tab baru, tab itu tetap dijaga `ScreenShell`
     (redirect + popup), jadi tidak ada jalan masuk tanpa upgrade. */
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== '_self') return

      const href = anchor.getAttribute('href')
      if (!href) return
      if (!openUpgradeForPage(href)) return
      /* Hentikan juga handler `<Link>`/komponen lain: halaman terkunci tidak
         boleh dipindahkan lewat jalur mana pun. */
      event.preventDefault()
      event.stopPropagation()
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [openUpgradeForPage])

  return (
    <UpgradeGateContext.Provider value={value}>
      {children}
      <UpgradeModal
        open={request !== null}
        onClose={() => setRequest(null)}
        reason={request?.message}
      />
    </UpgradeGateContext.Provider>
  )
}

export function useUpgradeGate() {
  const context = useContext(UpgradeGateContext)
  if (!context) {
    throw new Error('useUpgradeGate harus dipakai di dalam <UpgradeGateProvider>')
  }
  return context
}
