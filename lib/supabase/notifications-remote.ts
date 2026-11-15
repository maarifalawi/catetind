'use client'

import type { AppNotification, NotificationKind } from '@/lib/money/notification-store'
import { browserSupabase } from './client'
import { dataApi, dataApiOk } from './data-api'
import {
  applyNotificationCachePatch,
  mergeNotificationCache,
  parseNotificationsCache,
  toNotificationsCachePayload,
  type NotificationCachePatch,
} from './notifications-cache'

/* ── JALUR NOTIFIKASI KE SERVER ───────────────────────────────────────────────
   Satu daftar notifikasi per akun, dibaca & ditulis lewat jalur yang SAMA
   dengan modul lain (klien browser dulu, lalu jembatan `/api/data` saat sesi
   browser tidak tersedia). Semua fungsi di sini tidak pernah `throw`:
   `null`/`false` berarti "jalur server tidak tersedia", dan store tetap
   bekerja dari cache perangkat. */

export interface NotificationDbRow {
  id: string
  user_id?: string
  kind: string
  title: string
  body?: string | null
  href: string
  is_read?: boolean | null
  created_at?: string | null
}

const KINDS: NotificationKind[] = [
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

function toKind(value: string | null | undefined): NotificationKind {
  return KINDS.includes(value as NotificationKind) ? (value as NotificationKind) : 'expense'
}

export function toNotification(row: NotificationDbRow): AppNotification {
  return {
    id: row.id,
    kind: toKind(row.kind),
    title: row.title ?? '',
    ...(row.body ? { body: row.body } : {}),
    href: row.href || '/app',
    createdAt: row.created_at ?? new Date().toISOString(),
    read: row.is_read === true,
  }
}

function toRow(item: AppNotification): NotificationDbRow {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    body: item.body ?? null,
    href: item.href,
    is_read: item.read,
    created_at: item.createdAt,
  }
}

/* ── CADANGAN OTOMATIS: `user_settings.notifications_cache` ───────────────────
   Dipakai HANYA ketika tabel `notifications` tidak bisa dibaca/ditulis (mis.
   `PGRST205` karena migrasi belum diterapkan). Tujuannya satu: lonceng tetap
   tersinkron lintas perangkat tanpa menunggu migrasi manual. Pemanggil tidak
   perlu tahu jalur mana yang dipakai. */

const CACHE_ROW_LIMIT = 1

async function readNotificationsCache(): Promise<AppNotification[] | null> {
  const rows = await dataApi<Record<string, unknown>>({
    table: 'user_settings',
    op: 'select',
  })
  if (!rows) return null
  const row = rows.slice(0, CACHE_ROW_LIMIT)[0]
  if (!row) return []
  return parseNotificationsCache(row.notifications_cache)
}

async function writeNotificationsCache(items: AppNotification[]): Promise<boolean> {
  return dataApiOk({
    table: 'user_settings',
    op: 'upsert',
    rows: [
      {
        notifications_cache: toNotificationsCachePayload(items),
        updated_at: new Date().toISOString(),
      },
    ],
    onConflict: 'user_id',
  })
}

async function patchNotificationsCache(patch: NotificationCachePatch): Promise<boolean> {
  const current = await readNotificationsCache()
  if (!current) return false
  return writeNotificationsCache(applyNotificationCachePatch(current, patch))
}

/** baca notifikasi milik pemanggil; `null` = tanpa sesi/backend atau gagal */
export async function readRemoteNotifications(): Promise<AppNotification[] | null> {
  const client = browserSupabase()
  if (client) {
    try {
      const { data: session } = await client.auth.getSession()
      if (session.session?.access_token) {
        const { data, error } = await client
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(60)
        if (!error && data) {
          return (data as NotificationDbRow[])
            .filter((row) => Boolean(row?.id))
            .map((row) => toNotification(row))
        }
      }
    } catch {
      /* jatuh ke jalur server */
    }
  }
  const rows = await dataApi<NotificationDbRow>({
    table: 'notifications',
    op: 'select',
    order: { column: 'created_at', ascending: false },
  })
  if (rows) return rows.filter((row) => Boolean(row?.id)).map((row) => toNotification(row))
  /* jalur utama tidak tersedia → cadangan di tabel pengaturan user */
  return readNotificationsCache()
}

export async function pushNotificationToServer(item: AppNotification): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client.from('notifications').upsert(toRow(item), { onConflict: 'id' })
      if (!error || error.code === '23505') return true
    } catch {
      /* jatuh ke jalur server */
    }
  }
  const ok = await dataApiOk({
    table: 'notifications',
    op: 'upsert',
    rows: [toRow(item) as unknown as Record<string, unknown>],
    onConflict: 'id',
  })
  if (ok) return true
  /* jalur utama tidak tersedia → cadangan di tabel pengaturan user */
  const current = await readNotificationsCache()
  if (!current) return false
  return writeNotificationsCache(mergeNotificationCache(current, item))
}

export async function markNotificationReadOnServer(id: string): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client.from('notifications').update({ is_read: true }).eq('id', id)
      if (!error) return true
    } catch {
      /* jatuh ke jalur server */
    }
  }
  if (await dataApiOk({ table: 'notifications', op: 'update', match: { id }, patch: { is_read: true } })) {
    return true
  }
  return patchNotificationsCache({ kind: 'read', id })
}

export async function markAllNotificationsReadOnServer(): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { data: session } = await client.auth.getSession()
      const userId = session.session?.user.id
      if (userId) {
        const { error } = await client
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
        if (!error) return true
      }
    } catch {
      /* jatuh ke jalur server */
    }
  }
  if (await dataApiOk({ table: 'notifications', op: 'updateAll', patch: { is_read: true } })) {
    return true
  }
  return patchNotificationsCache({ kind: 'readAll' })
}

export async function deleteNotificationOnServer(id: string): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { error } = await client.from('notifications').delete().eq('id', id)
      if (!error) return true
    } catch {
      /* jatuh ke jalur server */
    }
  }
  if (await dataApiOk({ table: 'notifications', op: 'delete', match: { id } })) return true
  return patchNotificationsCache({ kind: 'delete', id })
}

export async function clearNotificationsOnServer(): Promise<boolean> {
  const client = browserSupabase()
  if (client) {
    try {
      const { data: session } = await client.auth.getSession()
      const userId = session.session?.user.id
      if (userId) {
        const { error } = await client.from('notifications').delete().eq('user_id', userId)
        if (!error) return true
      }
    } catch {
      /* jatuh ke jalur server */
    }
  }
  if (await dataApiOk({ table: 'notifications', op: 'deleteAll' })) return true
  return patchNotificationsCache({ kind: 'clear' })
}
