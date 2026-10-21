import { planById, type PlanId } from '@/lib/data/pricing'
import { restConfigured, restFetch } from '@/lib/supabase/rest'
import { isSubscriptionActive } from './app-access'

/* ── PAKET YANG DIMILIKI PEMANGGIL (satu sumber untuk server) ────────────────
   Sejak paket 84 harga & kemampuan ditentukan PAKET, bukan masa aktif. Jadi
   setiap route yang perlu tahu "user ini punya apa" membaca dari sini — tidak
   ada route yang menebak dari body request.

   Tabelnya tetap `user_subscriptions` (dibuat paket 63) supaya pembeli lama
   tidak kehilangan datanya. Kolom `tier_name` sekarang berisi `PlanId`
   ('catet-aja' | 'waras' | 'sultan'); nilai LAMA yang masih tersimpan
   dipetakan lewat `LEGACY_TIER_MAP` — lihat catatan di bawah. */

export interface CallerPlan {
  /** backend Supabase terkonfigurasi? kalau false, jawabannya "tidak tahu" */
  configured: boolean
  /** paket yang tersimpan; `null` = belum pernah beli. Tetap diisi saat expired. */
  planId: PlanId | null
  /** kapan pembelian dicatat (ISO); `null` kalau tidak diketahui */
  purchasedAt: string | null
  /** kapan masa aktif 30 hari berakhir (ISO); `null` untuk lifetime */
  expiresAt: string | null
  /** true = paket lifetime (tidak punya tanggal berakhir) */
  isLifetime: boolean
  /** periode yang tercatat di database */
  billingPeriod: 'monthly' | 'lifetime' | null
  /** true = akses boleh dipakai sekarang (`is_active` + masa aktif) */
  active: boolean
  /** true = prabayar 30 hari sudah lewat tanggal berakhir → mode baca-saja */
  expired: boolean
  /**
   * true = pembacaan GAGAL (jaringan/DB), bukan "tidak punya paket".
   * Pembeda ini penting: route yang memakai guard harus tahu bedanya
   * "user memang belum beli" dan "kita sedang tidak bisa memeriksa".
   */
  failed: boolean
}

interface SubscriptionRow {
  tier_name?: string | null
  is_active?: boolean | null
  started_at?: string | null
  expires_at?: string | null
  is_lifetime?: boolean | null
  billing_period?: string | null
}

/**
 * Pemetaan tier LAMA → paket baru. Ada supaya pembeli lama tidak kehilangan
 * akses saat model berubah dari langganan ke akses selamanya (keputusan paket
 * 84, dilaporkan di docs/handoff/laporan/84-*):
 *   · founding_member / lifetime → sultan  (dulu produk "seumur hidup" termahal)
 *   · yearly / annual            → waras   (dulu paket tahunan tengah)
 *   · monthly                    → catet-aja (dulu paket bulanan termurah)
 * Pemetaan ini HANYA baca; tidak pernah ditulis balik ke database.
 *
 * ⚠️ PEMETAAN INI HARUS SAMA PERSIS dengan `catetind_normalize_tier` di
 * `supabase/migrations/20261011120000_catetind_akses_selamanya.sql` (dua
 * implementasi, satu aturan). Mengubah salah satu WAJIB mengubah yang lain —
 * kalau tidak, akses pembeli lama bisa berbeda antara yang dilihat klien dan
 * yang ditulis database saat pemenuhan pembayaran.
 */
const LEGACY_TIER_MAP: Record<string, PlanId> = {
  founding_member: 'sultan',
  lifetime: 'sultan',
  yearly: 'waras',
  annual: 'waras',
  monthly: 'catet-aja',
}

/** id tier apa pun (lama atau baru) → `PlanId`; `null` kalau tidak dikenal */
export function normalizeTier(value: string | null | undefined): PlanId | null {
  if (!value) return null
  if (planById(value)) return value as PlanId
  return LEGACY_TIER_MAP[value] ?? null
}

/**
 * Baca paket pemanggil memakai TOKEN-nya (RLS `user_id = auth.uid()` yang
 * menyaring — route tidak pernah bisa melihat langganan orang lain).
 */
export async function readCallerPlan(token: string): Promise<CallerPlan> {
  if (!restConfigured()) {
    return {
      configured: false,
      planId: null,
      purchasedAt: null,
      expiresAt: null,
      isLifetime: false,
      billingPeriod: null,
      active: false,
      expired: false,
      failed: false,
    }
  }

  const res = await restFetch<SubscriptionRow[]>(
    'user_subscriptions?select=tier_name,is_active,started_at,expires_at,is_lifetime,billing_period&limit=1',
    { accessToken: token },
  )
  if (!res.ok) {
    return {
      configured: true,
      planId: null,
      purchasedAt: null,
      expiresAt: null,
      isLifetime: false,
      billingPeriod: null,
      active: false,
      expired: false,
      failed: true,
    }
  }

  const row = Array.isArray(res.data) ? res.data[0] : undefined
  const isLifetime = row?.is_lifetime === true
  const expiresAt = row?.expires_at ?? null
  const expiresMs = expiresAt ? Date.parse(expiresAt) : null
  const hasValidExpiry = expiresMs !== null && Number.isFinite(expiresMs)

  /* `is_active` saja TIDAK cukup: baris prabayar yang sudah lewat tanggal harus
     dianggap tidak aktif untuk penulisan, walau `is_active` masih true.
     Aturannya tinggal SATU — `isSubscriptionActive()` di `app-access.ts`, yang
     juga dipakai gerbang masuk app. */
  const now = Date.now()
  const active = isSubscriptionActive(row, { now })
  const expired =
    Boolean(row?.is_active) && !isLifetime && hasValidExpiry && expiresMs <= now

  const rawPeriod = row?.billing_period
  const billingPeriod: CallerPlan['billingPeriod'] =
    rawPeriod === 'monthly' || rawPeriod === 'lifetime'
      ? rawPeriod
      : isLifetime
        ? 'lifetime'
        : row
          ? 'monthly'
          : null

  return {
    configured: true,
    planId: normalizeTier(row?.tier_name),
    purchasedAt: row?.started_at ?? null,
    expiresAt,
    isLifetime,
    billingPeriod,
    active,
    expired,
    failed: false,
  }
}

/**
 * Bentuk balasan HTTP `/api/subscription` — satu sumber supaya route
 * rekonsiliasi pembayaran (paket 99) tidak mengarang bentuk kedua.
 *
 * `active` sengaja hanya true kalau barisnya ADA, ditandai aktif, DAN masa
 * aktifnya belum lewat. `planId` tetap dikembalikan saat expired supaya panel
 * billing bisa menawarkan perpanjangan paket yang sama.
 */
export function subscriptionPayload(caller: CallerPlan) {
  return {
    ok: true,
    configured: caller.configured,
    active: caller.configured && caller.active,
    planId: caller.configured ? caller.planId : null,
    purchasedAt: caller.configured ? caller.purchasedAt : null,
    expiresAt: caller.configured ? caller.expiresAt : null,
    isLifetime: caller.configured ? caller.isLifetime : false,
    billingPeriod: caller.configured ? caller.billingPeriod : null,
    expired: caller.configured ? caller.expired : false,
  }
}

