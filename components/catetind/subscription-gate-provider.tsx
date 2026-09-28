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
import { usePathname } from 'next/navigation'
import { PUBLIC_ROUTES, isPublicRoute } from '@/lib/public-routes'
import {
  RENEWAL_STATE,
  readRenewalMarker,
  resolveSubscription,
  writeRenewalMarker,
  type SubscriptionPhase,
  type SubscriptionSnapshot,
} from '@/lib/data/renewal'

/* ── Gerbang Langganan Global — Grace Period & Post-Grace (inventaris state III/IV · PRD 4534–4547) ──
   Setelah masa aktif habis, app TIDAK boleh dikunci: user masih harus bisa
   membaca saldo & seluruh histori (PRD 4538). Yang berhenti hanya ALIRAN MASUK
   data baru. Satu provider di root memegang fakta itu supaya FAB, tombol Tambah
   sidebar, semua tombol simpan sheet, dan tanaman Home membaca status yang SAMA
   — mustahil ada dua layar yang berbeda pendapat soal "boleh catat atau tidak".

   Kenapa Context, bukan props: titik yang harus tahu status ini tersebar di
   bottom nav, sidebar, engine input, dan belasan sheet. Mengoper satu boolean
   dari setiap screen berarti setiap layar baru wajib ingat mengoper ulang —
   kegagalan yang tidak terlihat sampai produksi. Membacanya dari context
   membuat titik baru otomatis ikut terjaga.

   Hidrasi penanda dilakukan SETELAH mount (effect), jadi HTML server & client
   identik dulu — pola yang sama dengan `MoneyContextProvider`/`PrivacyProvider`. */

/**
 * Route PUBLIK / pre-app yang TIDAK boleh kena gerbang — di sini user mungkin
 * belum bisa login, jadi berhenti di gerbang sama saja memenjarakannya.
 *
 *   • `/login`, `/login/verify` — pintu masuk akun
 *   • `/checkout`               — WAJIB tetap bisa membayar (termasuk memperpanjang!)
 *   • `/privacy`, `/terms`      — dokumen legal, dibaca orang yang belum punya akun
 *   • `/join/*`                 — undangan dompet bersama (penerimanya sering belum punya akun)
 *   • `/share/*`                — kartu pencapaian dari tautan publik
 *   • `/install`                — panduan install PWA
 *   • `/app/onboarding`         — flow setup pertama setelah membayar
 *
 * Daftarnya sekarang tinggal di `lib/public-routes.ts` karena dipakai DUA
 * gerbang (langganan + kunci PIN perangkat). Nama lama tetap di-export supaya
 * pemanggil & komentar yang sudah ada tidak perlu berubah.
 */
export const SUBSCRIPTION_PUBLIC_ROUTES = PUBLIC_ROUTES

/** true kalau pathname berada di (atau di bawah) halaman publik/pre-app */
export function isSubscriptionPublicRoute(pathname: string): boolean {
  return isPublicRoute(pathname)
}

type SubscriptionGateValue = {
  /** fase langganan efektif (memperhitungkan penanda "sudah diperpanjang") */
  snapshot: SubscriptionSnapshot
  phase: SubscriptionPhase
  /**
   * true = tombol yang MENAMBAH data keuangan harus non-aktif. Pembacaan data,
   * navigasi, dokumen legal, dan pembayaran TIDAK pernah ikut terkunci.
   */
  inputLocked: boolean
  /** true = gerbang sengaja dimatikan karena user ada di halaman publik/pre-app */
  onPublicRoute: boolean
  /**
   * Tandai siklus ini sudah diperpanjang — dipanggil banner setelah RenewalModal
   * sukses. Menulis penanda (agar bertahan lintas reload) SEKALIGUS membebaskan
   * UI seketika, tanpa menunggu refresh.
   */
  markRenewed: () => void
}

const SubscriptionGateContext = createContext<SubscriptionGateValue | null>(null)

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  /** penanda "sudah diperpanjang" untuk siklus aktif — dibaca setelah mount */
  const [renewed, setRenewed] = useState(false)

  /* hidrasi penanda: render pertama SELALU dari hitungan alami (server = client),
     baru setelah mount penanda localStorage dibaca. Tidak ada hydration mismatch
     karena nilai awal kedua sisi sama. */
  useEffect(() => {
    setRenewed(readRenewalMarker(RENEWAL_STATE.expiryLabel).renewed)
  }, [])

  const snapshot = useMemo(
    /* `shown: true` tidak dipakai oleh `resolveSubscription` — yang dibaca hanya
       `renewed`. Dikirim eksplisit supaya berkas ini tidak perlu menyentuh
       localStorage saat render (penanda `shown` milik hook pengingat Home). */
    () => resolveSubscription(RENEWAL_STATE, { shown: true, renewed }),
    [renewed],
  )

  const onPublicRoute = isSubscriptionPublicRoute(pathname)
  const inputLocked = snapshot.phase !== 'active' && !onPublicRoute

  const markRenewed = useCallback(() => {
    writeRenewalMarker(RENEWAL_STATE.expiryLabel, { shown: true, renewed: true })
    setRenewed(true)
  }, [])

  const value = useMemo<SubscriptionGateValue>(
    () => ({ snapshot, phase: snapshot.phase, inputLocked, onPublicRoute, markRenewed }),
    [snapshot, inputLocked, onPublicRoute, markRenewed],
  )

  return (
    <SubscriptionGateContext.Provider value={value}>
      {children}
    </SubscriptionGateContext.Provider>
  )
}

/**
 * Dipakai titik input mana pun yang perlu tahu "sedang boleh catat atau tidak":
 * FAB bottom nav, tombol Tambah sidebar, engine input transaksi, dan
 * `SheetSubmit` di sheet-sheet tambah.
 */
export function useSubscriptionGate() {
  const ctx = useContext(SubscriptionGateContext)
  if (!ctx) {
    throw new Error('useSubscriptionGate harus dipakai di dalam <SubscriptionGateProvider>')
  }
  return ctx
}
