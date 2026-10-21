import { isPublicRoute } from '@/lib/public-routes'
import { restConfigured, restFetch } from '@/lib/supabase/rest'

/* ── GERBANG MASUK APP: HANYA PEMILIK PAKET AKTIF ───────────────────────────
   ATURAN PRODUK YANG MENGIKAT: halaman app (`/app`, `/wallet`, `/budget`,
   `/settings`, dst.) TIDAK BOLEH dirender untuk user yang belum membayar.
   Sebelum file ini, middleware hanya memeriksa SESI — akibatnya user yang baru
   mendaftar (belum berlangganan) tetap masuk Dashboard, dan itulah yang
   dilaporkan. Gerbang ini adalah pemeriksaan KEDUA setelah sesi:

     sesi sah + paket aktif   → halaman app dirender
     sesi sah + belum bayar   → dialihkan ke `/checkout` (halaman harga)
     sesi sah + paket kedaluwarsa → dialihkan ke `/checkout`

   Dua pengecualian yang SENGAJA dipegang, sama seperti modul langganan lain:

     · backend belum dikonfigurasi (build demo/test) → kita TIDAK TAHU paket
       user, jadi jangan mengunci berdasarkan ketidaktahuan;
     · pembacaan paket GAGAL (jaringan/DB) → diperlakukan "tidak tahu", BUKAN
       "belum beli". Satu request gagal tidak boleh membuat pelanggan yang sah
       kehilangan akses ke datanya.

   Modul ini sengaja TIDAK mengimpor `lib/data/pricing.ts`: middleware cukup tahu
   "aktif atau tidak", dan memuat seluruh katalog harga di Edge bundle hanya
   menambah berat tanpa menambah kebenaran. Aturan aktifnya dipakai bersama oleh
   `readCallerPlan()` supaya tidak pernah ada dua definisi "aktif" yang berbeda.
   ────────────────────────────────────────────────────────────────────────── */

/** halaman tujuan saat user belum punya paket: daftar harga, bukan app */
export const PAYWALL_PATH = '/checkout'

/** kolom `user_subscriptions` yang menentukan akses (bukan tier-nya) */
export interface SubscriptionAccessRow {
  is_active?: boolean | null
  expires_at?: string | null
  is_lifetime?: boolean | null
}

/** jawaban pembacaan akses — bentuknya sama dengan `CallerPlan` yang relevan */
export interface CallerAccess {
  /** backend Supabase terkonfigurasi? kalau false, jawabannya "tidak tahu" */
  configured: boolean
  /** paket boleh dipakai sekarang (`is_active` + masa aktif belum lewat) */
  active: boolean
  /** pembacaan GAGAL (jaringan/DB), bukan "tidak punya paket" */
  failed: boolean
}

/** hasil keputusan gerbang; `unknown` = backend tidak bisa menjawab */
export type AppAccessDecision = 'allow' | 'paywall' | 'unknown'

/**
 * Satu-satunya aturan "paket ini masih memberi akses".
 *
 * - `is_active` saja TIDAK cukup: baris prabayar yang sudah lewat tanggal harus
 *   dianggap tidak aktif walau `is_active` masih true.
 * - `is_lifetime` = akses selamanya; `expires_at` diabaikan (NULL).
 * - Tanggal yang tidak bisa diparse = tidak ada masa aktif yang sah → tidak aktif.
 */
export function isSubscriptionActive(
  row: SubscriptionAccessRow | null | undefined,
  { now = Date.now() }: { now?: number } = {},
): boolean {
  if (!row || row.is_active !== true) return false
  if (row.is_lifetime === true) return true
  const expiresMs = row.expires_at ? Date.parse(row.expires_at) : Number.NaN
  return Number.isFinite(expiresMs) && expiresMs > now
}

/**
 * Keputusan gerbang app dari hasil `readCallerAccess()`.
 *
 * `failed` sengaja menghasilkan `unknown` (→ middleware meloloskan), bukan
 * `paywall`: mengunci pelanggan sah karena DB sesaat tidak bisa dibaca adalah
 * kerugian yang lebih besar daripada satu request yang lolos tanpa pemeriksaan.
 */
export function appAccessDecision(access: CallerAccess): AppAccessDecision {
  if (!access.configured) return 'allow'
  if (access.failed) return 'unknown'
  return access.active ? 'allow' : 'paywall'
}

/**
 * true = halaman ini bagian dari APP dan wajib punya paket aktif.
 *
 * Kebalikannya adalah `PUBLIC_ROUTES` (`lib/public-routes.ts`) — daftar yang
 * sama yang dipakai gerbang sesi. Jadi tidak ada daftar rute kedua: apa pun
 * yang boleh dibuka anonim (landing, login, checkout, bantuan publik, …) juga
 * boleh dibuka user yang belum membayar.
 */
export function requiresPaidAccess(pathname: string): boolean {
  return !isPublicRoute(pathname)
}

/**
 * Baca akses pemanggil memakai TOKEN-nya. RLS `user_id = auth.uid()` yang
 * menyaring, jadi route ini tidak pernah bisa melihat langganan orang lain.
 * Tidak pernah melempar: kegagalan dikembalikan sebagai `failed: true`.
 */
export async function readCallerAccess(token: string): Promise<CallerAccess> {
  if (!restConfigured()) {
    return { configured: false, active: false, failed: false }
  }

  const res = await restFetch<SubscriptionAccessRow[]>(
    'user_subscriptions?select=is_active,expires_at,is_lifetime&limit=1',
    { accessToken: token },
  )
  if (!res.ok) {
    return { configured: true, active: false, failed: true }
  }

  const row = Array.isArray(res.data) ? res.data[0] : undefined
  return { configured: true, active: isSubscriptionActive(row), failed: false }
}
