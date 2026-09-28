import type { PushSubscription } from 'web-push'
import { restConfigured, restFetch, restRpc } from '@/lib/supabase/rest'

/* ── STORE PUSH PER-USER (paket 45: TABEL `push_subscriptions`) ──────────────
   Dulu: `Map<endpoint, subscription>` global tanpa identitas user, dan
   `/api/push/send` menyiarkan `title`/`body`/`url` dari body request ke SEMUA
   subscription — vektor phishing massal (temuan audit paket 39).

   Paket 39 memperbaikinya di memory. Paket 45 memindahkannya ke tabel
   `push_subscriptions` dengan RLS `user_id = auth.uid()`, jadi janji "hanya
   pemiliknya yang bisa melihat/mencabut" berlaku juga setelah server restart,
   dan tidak lagi bergantung pada satu instance.

   Broadcast lintas-user tetap TIDAK lewat sesi user, melainkan RPC
   `security definer` `catetind_push_targets(p_token)` yang membandingkan token
   internal dengan SETTING DATABASE (`app.catetind_internal_push_token`). Token
   itu tidak ada di repo: kosong = jalur ini mati (fail-closed).

   JALUR DEMO/TEST: kalau Supabase belum dipasangkan (test tanpa env), fungsi
   memakai memory seperti paket 39 supaya perilaku 401/403/rate-limit tetap
   teruji tanpa jaringan. */

export interface PushRecord {
  userId: string
  subscription: PushSubscription
  /** epoch ms — dipakai membersihkan record yang menggantung lama */
  createdAt: number
}

/** batas kirim: 5 pesan per menit per user (kebijakan produk PRD: ≤3 push/minggu) */
export const PUSH_RATE_WINDOW_MS = 60_000
export const PUSH_RATE_MAX = 5

type PushGlobals = {
  catetindPushSubs?: Map<string, PushRecord>
  catetindPushRate?: Map<string, number[]>
}

const g = globalThis as unknown as PushGlobals

function records(): Map<string, PushRecord> {
  return (g.catetindPushSubs ??= new Map<string, PushRecord>())
}

function rateSlots(): Map<string, number[]> {
  return (g.catetindPushRate ??= new Map<string, number[]>())
}

interface SubscriptionDbRow {
  endpoint: string
  user_id: string
  subscription: PushSubscription
  created_at?: string
}

function toRecord(row: SubscriptionDbRow): PushRecord {
  return {
    userId: row.user_id,
    subscription: row.subscription,
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  }
}

/**
 * Simpan/perbarui subscription MILIK user ini. Endpoint yang sama = pemiliknya
 * dipindah (upsert), karena satu endpoint browser hanya punya satu pemilik aktif.
 */
export async function pushEndpoint(
  userId: string,
  subscription: PushSubscription,
  token: string,
): Promise<PushRecord> {
  const record: PushRecord = { userId, subscription, createdAt: Date.now() }
  if (!restConfigured() || !token) {
    records().set(subscription.endpoint, record)
    return record
  }
  await restFetch('push_subscriptions', {
    method: 'POST',
    accessToken: token,
    body: { endpoint: subscription.endpoint, user_id: userId, subscription },
    prefer: 'resolution=merge-duplicates,return=representation',
  })
  return record
}

/**
 * Hapus subscription. `userId` selalu dikirim route: dengan begitu user A tidak
 * bisa mencabut subscription user B walau tahu endpoint-nya — dan kalau ada yang
 * mencoba, RLS membuat barisnya tidak ketemu (`removed: false`).
 */
export async function dropEndpoint(endpoint: string, userId?: string, token = ''): Promise<boolean> {
  if (!restConfigured() || !token) {
    const record = records().get(endpoint)
    if (!record) return false
    if (userId && record.userId !== userId) return false
    return records().delete(endpoint)
  }
  /* Tanpa `userId` (jalur internal) tidak ada yang bisa dihapus dari sini: RLS
     mensyaratkan sesi user. Pembersihan endpoint mati pada jalur internal
     dilakukan operator lewat SQL/dashboard — dicatat sebagai batas di laporan. */
  if (!userId) return false

  const res = await restFetch<{ endpoint: string }[]>(
    `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    { method: 'DELETE', accessToken: token },
  )
  return res.ok && (res.data?.length ?? 0) > 0
}

export async function subscriptionsOf(userId: string, token: string): Promise<PushRecord[]> {
  if (!restConfigured() || !token) {
    return [...records().values()].filter((record) => record.userId === userId)
  }
  const res = await restFetch<SubscriptionDbRow[]>(
    'push_subscriptions?select=endpoint,user_id,subscription,created_at',
    { accessToken: token },
  )
  return (res.data ?? []).map(toRecord)
}

/**
 * SEMUA subscription — hanya untuk jalur internal (`INTERNAL_PUSH_TOKEN`).
 *
 * Tidak mungkin dibaca dengan sesi user biasa (RLS aktif), dan memang tidak boleh:
 * itulah yang membuat satu akun tidak bisa menyiarkan notifikasi ke akun lain.
 */
export async function allSubscriptions(internalToken: string, token: string): Promise<PushRecord[]> {
  if (!restConfigured() || !token) return [...records().values()]
  const res = await restRpc<{ endpoint: string; user_id: string; subscription: PushSubscription }[]>(
    'catetind_push_targets',
    { p_token: internalToken },
    token,
  )
  return (res.data ?? []).map(toRecord)
}

export type RateLimitVerdict =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number }

/**
 * Rate limit sederhana berbasis jendela geser. Dipanggil SEKALI per request
 * kirim; saat ditolak, `429` + `Retry-After` yang jujur lebih baik daripada
 * diam-diam membuang pesan.
 *
 * Catatan jujur: penghitungnya masih per-instance server (in-memory). Supaya
 * batasnya berlaku lintas instance, angkanya harus ikut ke database — itu belum
 * ada, dan disebut apa adanya di laporan paket 45.
 */
export function consumeRateSlot(userId: string, now = Date.now()): RateLimitVerdict {
  const slots = rateSlots()
  const recent = (slots.get(userId) ?? []).filter((stamp) => now - stamp < PUSH_RATE_WINDOW_MS)

  if (recent.length >= PUSH_RATE_MAX) {
    const oldest = Math.min(...recent)
    const retryAfterSeconds = Math.max(1, Math.ceil((PUSH_RATE_WINDOW_MS - (now - oldest)) / 1000))
    slots.set(userId, recent)
    return { allowed: false, retryAfterSeconds }
  }

  recent.push(now)
  slots.set(userId, recent)
  return { allowed: true, remaining: PUSH_RATE_MAX - recent.length }
}

/** kosongkan store memory (dipakai test) */
export function resetPushStore(): void {
  records().clear()
  rateSlots().clear()
}

