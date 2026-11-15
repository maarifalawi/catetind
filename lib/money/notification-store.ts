'use client'

import { useSyncExternalStore } from 'react'
import { browserUserId } from '@/lib/supabase/client'
import { subscribeTables } from '@/lib/supabase/realtime'
import {
  clearNotificationsOnServer,
  deleteNotificationOnServer,
  markAllNotificationsReadOnServer,
  markNotificationReadOnServer,
  pushNotificationToServer,
  readRemoteNotifications,
} from '@/lib/supabase/notifications-remote'
import { accountStateKey, loadDeviceState, resolveDeviceOwner, saveDeviceState } from './idb'

/* ── PUSAT NOTIFIKASI (lonceng) ───────────────────────────────────────────────
   Lonceng di header dulu cuma pintu ke halaman pengaturan: tidak ada satu pun
   item yang lahir dari aktivitas user. Modul ini mengisi lubang itu — satu
   tempat untuk SEMUA kejadian yang layak diberitahukan:

     · kas       — pengeluaran, pemasukan, pindah dana
     · tagihan   — tagihan dibuat, dibayar, dan jatuh tempo (H-3 / H-1 / H)
     · celengan  — setoran, penarikan, target tercapai
     · bersama   — catatan baru & pelunasan di Dompet Bersama
     · budget    — pemakaian 80% (peringatan) dan 100% (batas lewat)

   Sifat penyimpanan mengikuti store uang lain (satu pola, satu cara baca):
     · per AKUN (`notifications:<userId>`), jadi akun lain di browser yang sama
       tidak mewarisi notifikasi akun sebelumnya;
     · dicerminkan ke server (tabel `notifications`) supaya ponsel & desktop
       membaca daftar yang sama;
     · id stabil — item yang sama tidak pernah lahir dua kali walau hidrasi
       dijalankan berulang (realtime / tab kembali aktif).

   Fungsi tulis TIDAK PERNAH melempar: notifikasi adalah lapisan informasi,
   bukan jalur uang. Kegagalan menyimpan tidak boleh membatalkan transaksi. */

export type NotificationKind =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'bill'
  | 'bill-paid'
  | 'bill-due'
  | 'fund'
  | 'fund-goal'
  | 'joint'
  | 'settle'
  | 'budget'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body?: string
  /** halaman yang dituju saat item diketuk */
  href: string
  /** ISO timestamp */
  createdAt: string
  read: boolean
}

export interface NotificationsState {
  items: AppNotification[]
  hydrated: boolean
}

export const NOTIFICATIONS_STATE_KEY = 'notifications'
const NOTIFICATIONS_STATE_VERSION = 1
/** batas daftar: lonceng adalah ringkasan aktivitas terakhir, bukan arsip */
const MAX_ITEMS = 60

const EMPTY: NotificationsState = { items: [], hydrated: false }
let live: NotificationsState = EMPTY
const listeners = new Set<() => void>()

interface PersistedNotifications {
  version: number
  items: AppNotification[]
  purged?: boolean
}

let hydrateStarted = false
let hydratedOnce = false
let accountPurged = false
let deviceOwnerUserId: string | null = null
let realtimeStarted = false
/** waktu "Bersihkan" terakhir — item server yang lebih tua diabaikan */
let clearedBeforeMs = 0

export function getNotificationsSnapshot(): NotificationsState {
  return live
}

/** snapshot server & render pertama harus identik (tanpa hydration mismatch) */
const SERVER_SNAPSHOT: NotificationsState = { items: [], hydrated: false }
export function getServerNotificationsSnapshot(): NotificationsState {
  return SERVER_SNAPSHOT
}

export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener)
  void hydrateNotifications()
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

function persist(): void {
  saveDeviceState<PersistedNotifications>(
    accountStateKey(NOTIFICATIONS_STATE_KEY, deviceOwnerUserId),
    {
      version: NOTIFICATIONS_STATE_VERSION,
      items: live.items,
      purged: accountPurged,
    },
  )
}

function commit(items: AppNotification[], hydrated = true): void {
  live = { items: items.slice(0, MAX_ITEMS), hydrated }
  persist()
  emit()
}

/** id unik lintas perangkat; fallback untuk browser tanpa `randomUUID` */
function newId(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID()
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

async function hydrateNotifications(): Promise<void> {
  if (hydrateStarted) return
  hydrateStarted = true

  const userId = await resolveDeviceOwner(NOTIFICATIONS_STATE_KEY, (await browserUserId()) ?? null)
  deviceOwnerUserId = userId
  const key = accountStateKey(NOTIFICATIONS_STATE_KEY, userId)
  const persisted = await loadDeviceState<PersistedNotifications>(key)
  accountPurged = persisted?.purged === true
  const known = persisted?.version === NOTIFICATIONS_STATE_VERSION
  const stored = accountPurged ? [] : known ? (persisted?.items ?? []).filter((item) => item?.id) : []
  /* notifikasi yang sempat lahir SEBELUM hidrasi selesai (mis. transaksi kilat
     saat app baru dibuka) tetap dipertahankan — digabung per id. */
  const early = live.items.filter((item) => !stored.some((row) => row.id === item.id))
  live = {
    items: [...early, ...stored].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    hydrated: true,
  }
  hydratedOnce = true
  emit()

  if (accountPurged) return
  const remote = await readRemoteNotifications()
  if (!remote) return
  mergeRemote(remote)
  /* Lonceng di perangkat lain ikut hidup tanpa refresh halaman. */
  if (!realtimeStarted) {
    realtimeStarted = true
    subscribeTables('catetind-notifications', ['notifications'], () => {
      void refreshNotifications()
    })
  }
}

/** gabung item server ke daftar lokal (per id; yang sudah dibaca tetap dibaca) */
function mergeRemote(remote: AppNotification[]): void {
  /* Setelah "Bersihkan", realtime bisa mengirim ulang daftar server SEBELUM
     DELETE-nya selesai — dulu itu membuat item yang baru dibersihkan hidup lagi.
     Item yang lahir sebelum waktu bersih-bersih diabaikan. */
  const incoming = remote.filter((item) => {
    const createdAt = Date.parse(item.createdAt)
    return !Number.isFinite(createdAt) || createdAt > clearedBeforeMs
  })
  const merged = new Map<string, AppNotification>()
  for (const item of live.items) merged.set(item.id, item)
  for (const item of incoming) {
    const local = merged.get(item.id)
    merged.set(item.id, local ? { ...local, ...item, read: local.read || item.read } : item)
  }
  commit([...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

/** tarik ulang dari server (realtime / tab kembali aktif). Gagal = diam. */
export async function refreshNotifications(): Promise<boolean> {
  if (!hydratedOnce || accountPurged) return false
  const remote = await readRemoteNotifications()
  if (!remote) return false
  mergeRemote(remote)
  return true
}

/**
 * Tambah satu notifikasi. `id` (opsional) boleh dioper pemanggil yang butuh
 * id stabil — dasar notifikasi jatuh tempo yang dihitung ulang setiap halaman
 * dibuka, sehingga item yang sama mustahil lahir dua kali.
 */
export function notify(input: {
  kind: NotificationKind
  title: string
  body?: string
  href: string
  id?: string
}): AppNotification {
  const id = input.id ?? newId()
  const existing = live.items.find((item) => item.id === id)
  if (existing) return existing
  const item: AppNotification = {
    id,
    kind: input.kind,
    title: input.title,
    ...(input.body ? { body: input.body } : {}),
    href: input.href,
    createdAt: new Date().toISOString(),
    read: false,
  }
  commit([item, ...live.items])
  void pushNotificationToServer(item)
  return item
}

/** true = notifikasi dengan id ini sudah ada (dipakai penjaga jatuh tempo) */
export function hasNotification(id: string): boolean {
  return live.items.some((item) => item.id === id)
}

export function markNotificationRead(id: string): void {
  const item = live.items.find((row) => row.id === id)
  if (!item || item.read) return
  commit(live.items.map((row) => (row.id === id ? { ...row, read: true } : row)))
  void markNotificationReadOnServer(id)
}

export function markAllNotificationsRead(): void {
  if (!live.items.some((item) => !item.read)) return
  commit(live.items.map((item) => ({ ...item, read: true })))
  void markAllNotificationsReadOnServer()
}

export function removeNotification(id: string): void {
  if (!live.items.some((item) => item.id === id)) return
  commit(live.items.filter((item) => item.id !== id))
  void deleteNotificationOnServer(id)
}

export function clearNotifications(): void {
  if (live.items.length === 0) return
  clearedBeforeMs = Date.now()
  commit([])
  void clearNotificationsOnServer()
}

export function unreadNotificationCount(state: NotificationsState = live): number {
  return state.items.reduce((count, item) => (item.read ? count : count + 1), 0)
}

export function useNotifications(): NotificationsState {
  return useSyncExternalStore(
    subscribeNotifications,
    getNotificationsSnapshot,
    getServerNotificationsSnapshot,
  )
}

/** dipakai alur "Hapus Akun" — tidak menyisakan satu item pun di perangkat */
export function purgeNotifications(): void {
  accountPurged = true
  live = { items: [], hydrated: true }
  /* penanda `purged` ditulis ke key akun yang SEDANG dipakai DAN key dasar:
     hidrasi berikutnya bisa membaca salah satunya (mis. sesi klien belum
     terbaca), dan daftar lama tidak boleh hidup lagi lewat jalur itu. */
  const payload: PersistedNotifications = {
    version: NOTIFICATIONS_STATE_VERSION,
    items: [],
    purged: true,
  }
  if (deviceOwnerUserId) {
    saveDeviceState<PersistedNotifications>(
      accountStateKey(NOTIFICATIONS_STATE_KEY, deviceOwnerUserId),
      payload,
    )
  }
  saveDeviceState<PersistedNotifications>(
    accountStateKey(NOTIFICATIONS_STATE_KEY, null),
    payload,
  )
  deviceOwnerUserId = null
  emit()
}

/** test-only: kembalikan modul ke keadaan awal */
export function resetNotificationsStore(): void {
  live = EMPTY
  hydrateStarted = false
  hydratedOnce = false
  accountPurged = false
  deviceOwnerUserId = null
  clearedBeforeMs = 0
  emit()
}

/** apakah hidrasi perangkat sudah selesai (dipakai test) */
export function notificationsHydrated(): boolean {
  return hydratedOnce
}
