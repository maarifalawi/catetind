import type { AppNotification, NotificationKind } from '@/lib/money/notification-store'

/* ── CADANGAN LONCENG DI TABEL PENGATURAN USER (`user_settings`) ──────────────
   Tabel `public.notifications` adalah rumah utama daftar lonceng. Di project
   produksi tabel itu pernah belum termigrasi (`PGRST205`), sehingga lonceng
   hanya hidup di satu perangkat. Modul ini menyimpan bentuk cadangan yang
   dicerminkan ke `user_settings.notifications_cache` (jsonb) supaya sinkronisasi
   lintas perangkat tetap jalan walau tabel utama belum tersedia.

   Semua fungsi di sini MURNI (tanpa jaringan) supaya bisa diuji unit: parsing
   data yang tidak dikenal harus mengembalikan daftar kosong, bukan melempar. */

export const NOTIFICATIONS_CACHE_VERSION = 1
export const NOTIFICATIONS_CACHE_LIMIT = 60

/** daftar jenis yang dikenal — HARUS sama dengan `NotificationKind` di store */
const KINDS: readonly NotificationKind[] = [
  'expense',
  'income',
  'transfer',
  'bill',
  'bill-paid',
  'bill-due',
  'fund',
  'fund-goal',
  'joint',
  'settle',
  'budget',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toKind(value: unknown): NotificationKind {
  return KINDS.includes(value as NotificationKind) ? (value as NotificationKind) : 'expense'
}

export interface NotificationsCachePayload {
  version: number
  items: AppNotification[]
  updatedAt: number
}

/** baca `notifications_cache` yang bentuknya belum tentu benar (null/array/objek) */
export function parseNotificationsCache(value: unknown): AppNotification[] {
  const raw = Array.isArray(value) ? value : isRecord(value) ? value.items : null
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const items: AppNotification[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = typeof entry.id === 'string' ? entry.id : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    const title = typeof entry.title === 'string' ? entry.title : ''
    if (!title) continue
    items.push({
      id,
      kind: toKind(entry.kind),
      title,
      ...(typeof entry.body === 'string' && entry.body ? { body: entry.body } : {}),
      href: typeof entry.href === 'string' && entry.href ? entry.href : '/app',
      createdAt:
        typeof entry.createdAt === 'string' && entry.createdAt
          ? entry.createdAt
          : new Date().toISOString(),
      read: entry.read === true,
    })
    if (items.length >= NOTIFICATIONS_CACHE_LIMIT) break
  }
  return items
}

export function toNotificationsCachePayload(
  items: AppNotification[],
): NotificationsCachePayload {
  return {
    version: NOTIFICATIONS_CACHE_VERSION,
    items: items.slice(0, NOTIFICATIONS_CACHE_LIMIT),
    updatedAt: Date.now(),
  }
}

/** sisipkan di depan, id yang sama tidak pernah lahir dua kali (id stabil) */
export function mergeNotificationCache(
  current: AppNotification[],
  next: AppNotification,
  limit = NOTIFICATIONS_CACHE_LIMIT,
): AppNotification[] {
  if (current.some((item) => item.id === next.id)) return current
  return [next, ...current].slice(0, limit)
}

export type NotificationCachePatch =
  | { kind: 'read'; id: string }
  | { kind: 'readAll' }
  | { kind: 'delete'; id: string }
  | { kind: 'clear' }

export function applyNotificationCachePatch(
  items: AppNotification[],
  patch: NotificationCachePatch,
): AppNotification[] {
  switch (patch.kind) {
    case 'read':
      return items.map((item) => (item.id === patch.id ? { ...item, read: true } : item))
    case 'readAll':
      return items.map((item) => (item.read ? item : { ...item, read: true }))
    case 'delete':
      return items.filter((item) => item.id !== patch.id)
    case 'clear':
      return []
  }
}
