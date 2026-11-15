import { describe, expect, it } from 'vitest'
import type { AppNotification } from '@/lib/money/notification-store'
import {
  applyNotificationCachePatch,
  mergeNotificationCache,
  NOTIFICATIONS_CACHE_LIMIT,
  NOTIFICATIONS_CACHE_VERSION,
  parseNotificationsCache,
  toNotificationsCachePayload,
} from './notifications-cache'

/* ── CADANGAN LONCENG (data yang belum tentu benar) ───────────────────────────
   `notifications_cache` dibaca dari jsonb yang bisa saja berisi bentuk lama,
   null, atau array mentah. Yang diuji di sini adalah janji yang membuat
   sinkronisasi aman: data rusak TIDAK melempar, id kembar tidak menggandakan
   item, dan setiap aksi (baca/hapus/bersihkan) hanya menyentuh item yang benar. */

const item = (id: string, overrides: Partial<AppNotification> = {}): AppNotification => ({
  id,
  kind: 'expense',
  title: `Notif ${id}`,
  href: '/app',
  createdAt: '2026-11-14T03:00:00.000Z',
  read: false,
  ...overrides,
})

describe('cadangan lonceng di user_settings', () => {
  it('membaca bentuk objek {version, items} dan array mentah', () => {
    const payload = toNotificationsCachePayload([item('a'), item('b')])
    expect(payload.version).toBe(NOTIFICATIONS_CACHE_VERSION)
    expect(parseNotificationsCache(payload).map((row) => row.id)).toEqual(['a', 'b'])
    expect(parseNotificationsCache([item('c')]).map((row) => row.id)).toEqual(['c'])
  })

  it('data rusak menjadi daftar kosong, bukan error', () => {
    expect(parseNotificationsCache(null)).toEqual([])
    expect(parseNotificationsCache('bukan jsonb')).toEqual([])
    expect(parseNotificationsCache({ items: 'bukan array' })).toEqual([])
    expect(parseNotificationsCache([{ id: '', title: 'x' }, { id: 'ok' }])).toEqual([])
  })

  it('id kembar tidak pernah lahir dua kali di cadangan', () => {
    const current = [item('a'), item('b')]
    expect(mergeNotificationCache(current, item('a'))).toBe(current)
    const merged = mergeNotificationCache(current, item('c'))
    expect(merged.map((row) => row.id)).toEqual(['c', 'a', 'b'])
  })

  it('batas daftar dipatuhi (lonceng ringkasan, bukan arsip)', () => {
    const many = Array.from({ length: NOTIFICATIONS_CACHE_LIMIT }, (_, i) => item(`n${i}`))
    const merged = mergeNotificationCache(many, item('baru'))
    expect(merged).toHaveLength(NOTIFICATIONS_CACHE_LIMIT)
    expect(merged[0].id).toBe('baru')
  })

  it('tandai satu dibaca hanya menyentuh id itu', () => {
    const items = [item('a'), item('b')]
    const patched = applyNotificationCachePatch(items, { kind: 'read', id: 'b' })
    expect(patched.map((row) => row.read)).toEqual([false, true])
  })

  it('tandai semua dibaca, hapus satu, dan bersihkan', () => {
    const items = [item('a'), item('b')]
    expect(applyNotificationCachePatch(items, { kind: 'readAll' }).every((row) => row.read)).toBe(
      true,
    )
    expect(applyNotificationCachePatch(items, { kind: 'delete', id: 'a' }).map((row) => row.id)).toEqual(
      ['b'],
    )
    expect(applyNotificationCachePatch(items, { kind: 'clear' })).toEqual([])
  })
})
