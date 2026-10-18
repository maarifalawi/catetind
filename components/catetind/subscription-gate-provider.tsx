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
import { PUBLIC_ROUTES, isProviderExemptRoute } from '@/lib/public-routes'
import {
  capabilitiesOf,
  canUse as canUseCapability,
  planById,
  type Capability,
  type PlanDefinition,
  type PlanId,
} from '@/lib/data/pricing'

/* ── GERBANG PAKET GLOBAL (paket 84 — pengganti gerbang masa aktif) ──────────
   Satu provider di root (`app/layout.tsx`) memegang SATU fakta: paket apa yang
   dimiliki user, dan kemampuan apa yang terbuka karenanya. Semua titik yang
   menampilkan fitur berbayar — widget AI Coach, tombol scan struk, rekap AI,
   Joint Wallet, kartu Billing — membaca dari sini, jadi mustahil ada dua layar
   yang berbeda pendapat soal "fitur ini terbuka atau tidak".

   Kenapa Context, bukan props: titiknya tersebar di bottom nav, sidebar, engine
   input, dan belasan sheet. Mengoper satu nilai dari setiap layar berarti setiap
   layar baru wajib ingat mengoper ulang — kegagalan yang tidak terlihat sampai
   produksi.

   SUMBER DATANYA `/api/subscription`. Nilainya dibaca SETELAH mount (efek),
   sehingga HTML server & client identik lebih dulu (pola yang sama dengan
   `MoneyContextProvider`/`PrivacyProvider`) — tidak ada hydration mismatch.

   BENTUK JAWABAN YANG JUJUR (dan kenapa begitu):
     · `configured:false` (build demo/test, tanpa Supabase) → kita memang TIDAK
       TAHU paket user. Karena itu tidak ada yang dikunci: mengunci berdasarkan
       ketidaktahuan akan memenjarakan pemakai build demo & pemilik paket saat
       backend sedang mati.
     · `configured:true` + `planId:null` → user memang belum pernah beli →
       fitur berbayar terkunci dan pencatatan ditahan sampai ada paket.
     · gagal baca (401/jaringan) → diperlakukan "tidak tahu", bukan "belum
       beli" — jangan menuduh user belum bayar hanya karena satu request gagal.

   CATATAN TENTANG `inputLocked`: dulu ini berarti "masa aktif habis" (grace
   period 7 hari). Sejak paket 84 TIDAK ADA masa aktif, jadi pemicunya tinggal
   satu: belum ada paket sama sekali. Nama variabelnya dipertahankan supaya
   puluhan titik input yang sudah memakainya tidak perlu berubah — tapi artinya
   sudah berbeda, dan itu ditulis di komentar ini supaya tidak disalahpahami
   sebagai sisa sistem lama. */

export const SUBSCRIPTION_PUBLIC_ROUTES = PUBLIC_ROUTES

/** true kalau pathname berada di (atau di bawah) halaman publik/pre-app */
export function isSubscriptionPublicRoute(pathname: string): boolean {
  return isProviderExemptRoute(pathname)
}

export interface CallerPlanState {
  planId: PlanId | null
  /** backend Supabase terkonfigurasi → jawabannya bisa dipercaya */
  configured: boolean
  /** jawaban `/api/subscription` sudah datang */
  ready: boolean
  /** kapan pembelian dicatat (ISO) */
  purchasedAt: string | null
  /** kapan masa aktif 30 hari berakhir; `null` untuk lifetime */
  expiresAt: string | null
  isLifetime: boolean
  billingPeriod: 'monthly' | 'lifetime' | null
  /** true = prabayar sudah lewat tanggal → mode baca-saja */
  expired: boolean
}

const UNKNOWN_PLAN: CallerPlanState = {
  planId: null,
  configured: false,
  ready: false,
  purchasedAt: null,
  expiresAt: null,
  isLifetime: false,
  billingPeriod: null,
  expired: false,
}

type SubscriptionGateValue = {
  /** paket aktif sebagai definisi lengkap (nama, harga, fitur) */
  plan: PlanDefinition | null
  planId: PlanId | null
  purchasedAt: string | null
  expiresAt: string | null
  isLifetime: boolean
  billingPeriod: 'monthly' | 'lifetime' | null
  /** true = masa aktif prabayar habis; data tetap bisa dibaca & diekspor */
  expired: boolean
  capabilities: Capability[]
  canUse: (capability: Capability) => boolean
  /**
   * true = paket user BENAR-BENAR diketahui (backend terkonfigurasi & jawaban
   * `/api/subscription` sudah datang). Dipakai titik fitur berbayar untuk
   * memutuskan "terkunci atau tidak": kalau paketnya belum diketahui, JANGAN
   * dikunci — mengunci berdasarkan ketidaktahuan adalah menuduh.
   */
  planKnown: boolean
  /**
   * true = tombol yang MENAMBAH data keuangan harus non-aktif — user belum
   * punya paket ATAU masa aktif prabayarnya sudah habis.
   * Pembacaan data, ekspor, navigasi, dokumen legal, dan pembayaran TIDAK
   * pernah ikut terkunci.
   */
  inputLocked: boolean
  /** true = gerbang sengaja dimatikan karena user ada di halaman publik/pre-app */
  onPublicRoute: boolean
  /** baca ulang paket dari server (dipakai setelah pembayaran selesai) */
  refresh: () => void
}

const SubscriptionGateContext = createContext<SubscriptionGateValue | null>(null)

interface SubscriptionResponse {
  configured?: unknown
  planId?: unknown
  purchasedAt?: unknown
  expiresAt?: unknown
  isLifetime?: unknown
  billingPeriod?: unknown
  expired?: unknown
}

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<CallerPlanState>(UNKNOWN_PLAN)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription', { cache: 'no-store' })
      if (!res.ok) {
        /* 401/jaringan = TIDAK TAHU, bukan "belum beli" — lihat catatan di atas */
        setState({ ...UNKNOWN_PLAN, ready: true })
        return
      }
      const body = (await res.json()) as SubscriptionResponse
      const period =
        body.billingPeriod === 'monthly' || body.billingPeriod === 'lifetime'
          ? body.billingPeriod
          : null
      setState({
        configured: body.configured === true,
        planId: typeof body.planId === 'string' ? (body.planId as PlanId) : null,
        purchasedAt: typeof body.purchasedAt === 'string' ? body.purchasedAt : null,
        expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
        isLifetime: body.isLifetime === true,
        billingPeriod: period,
        expired: body.expired === true,
        ready: true,
      })
    } catch {
      setState({ ...UNKNOWN_PLAN, ready: true })
    }
  }, [])

  const onPublicRoute = isSubscriptionPublicRoute(pathname)

  useEffect(() => {
    /* Halaman publik (landing, /contact, /terms, /checkout, …) TIDAK punya
       sesi. Fetch `/api/subscription` di sana hanya menghasilkan 401 di
       console + satu request sia-sia; status paket juga tidak dipakai karena
       banner & gerbang memang dimatikan di rute publik. */
    if (onPublicRoute) return
    void load()
  }, [load, onPublicRoute])

  const plan = useMemo(() => planById(state.planId), [state.planId])
  const capabilities = useMemo(() => capabilitiesOf(state.planId), [state.planId])

  const inputLocked =
    state.configured && state.ready && (!state.planId || state.expired) && !onPublicRoute

  const value = useMemo<SubscriptionGateValue>(
    () => ({
      plan,
      planId: state.planId,
      purchasedAt: state.purchasedAt,
      expiresAt: state.expiresAt,
      isLifetime: state.isLifetime,
      billingPeriod: state.billingPeriod,
      expired: state.expired,
      capabilities,
      canUse: (capability: Capability) =>
        state.expired ? false : canUseCapability(state.planId, capability),
      planKnown: state.configured && state.ready,
      inputLocked,
      onPublicRoute,
      refresh: () => void load(),
    }),
    [
      plan,
      state.planId,
      state.purchasedAt,
      state.expiresAt,
      state.isLifetime,
      state.billingPeriod,
      state.expired,
      capabilities,
      inputLocked,
      onPublicRoute,
      load,
    ],
  )

  return (
    <SubscriptionGateContext.Provider value={value}>
      {children}
    </SubscriptionGateContext.Provider>
  )
}

/**
 * Dipakai titik mana pun yang perlu tahu "paket user apa" atau "fitur ini
 * terbuka atau tidak": widget AI Coach, tombol scan struk & voice, rekap AI,
 * Joint Wallet, kartu Billing, FAB bottom nav, tombol Tambah sidebar, dan
 * `SheetSubmit` di sheet-sheet tambah.
 */
export function useSubscriptionGate() {
  const ctx = useContext(SubscriptionGateContext)
  if (!ctx) {
    throw new Error('useSubscriptionGate harus dipakai di dalam <SubscriptionGateProvider>')
  }
  return ctx
}
