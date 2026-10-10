'use client'

import { useSyncExternalStore } from 'react'
import type { BudgetScope } from '@/lib/data/budget'
import { INITIAL_PHYSICAL_ASSETS, type PhysicalAsset, type PhysicalAssetCategory } from '@/lib/data/wealth'
import {
  deleteRemotePhysicalAsset,
  pushPhysicalAssetToServer,
  readRemotePhysicalAssets,
} from '@/lib/supabase/physical-remote'
import { randomUuid } from '@/lib/supabase/uuid'
import { subscribePhysicalChanges, type WealthRealtimeHandle } from '@/lib/supabase/realtime'
import { PHYSICAL_STATE_KEY, loadDeviceState, saveDeviceState } from './idb'

/* ── SATU STORE ASET FISIK / PROPERTI (paket 63) ─────────────────────────────
   Tab "Properti & Aset Fisik" di `/wealth` — pola yang sama dengan
   `lib/money/funds-store.ts` & `wealth-store.ts`: satu state modul, ditulis ke
   IndexedDB (key `physical`, database yang SAMA), dibaca lewat `useSyncExternalStore`.

   Aturan "data real" (paket 65 · Tugas A): state awal SELALU KOSONG. Seed
   `INITIAL_PHYSICAL_ASSETS` tinggal jadi BAHAN test & bahan bootstrap demo
   (`seedDemoDataOnce()`), BUKAN lagi data awal milik user.

   Di produksi tiap penulisan jadi insert/update/delete ke tabel `physical_assets`
   (tabel + RLS-nya sudah ada, `user_id = auth.uid()`); karena itu bentuk state di
   sini JSON polos yang siap dikirim HTTP. */

export interface PersistedPhysical {
  version?: number
  assets?: PhysicalAsset[]
  /** TOMBSTONE aset yang dihapus user — pola sama dengan store lain */
  removedIds?: string[]
}

export interface PhysicalSnapshot {
  assets: PhysicalAsset[]
  removedIds: string[]
  /** false sampai IndexedDB selesai dibaca (anti hydration mismatch) */
  hydrated: boolean
}

/** BAHAN test (`resetPhysicalStore()`) & bahan bootstrap demo — bukan state awal */
const SEED_ASSETS: PhysicalAsset[] = INITIAL_PHYSICAL_ASSETS

const SERVER_SNAPSHOT: PhysicalSnapshot = Object.freeze({
  assets: [],
  removedIds: [],
  hydrated: false,
})

const SEED_SNAPSHOT: PhysicalSnapshot = Object.freeze({
  assets: SEED_ASSETS,
  removedIds: [],
  hydrated: false,
})

const EMPTY_SNAPSHOT: PhysicalSnapshot = Object.freeze({ assets: [], removedIds: [], hydrated: true })

let live: PhysicalSnapshot = SERVER_SNAPSHOT
let accountPurged = false
let hydrateStarted = false
let nextId = 1
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getPhysicalSnapshot(): PhysicalSnapshot {
  return live
}

export function getServerPhysicalSnapshot(): PhysicalSnapshot {
  return SERVER_SNAPSHOT
}

function persist(snapshot: PhysicalSnapshot): void {
  saveDeviceState<PersistedPhysical>(PHYSICAL_STATE_KEY, {
    version: 1,
    assets: snapshot.assets,
    removedIds: snapshot.removedIds,
  })
}

function commit(next: PhysicalSnapshot): void {
  live = next
  persist(next)
  emit()
}

async function hydrate(): Promise<void> {
  if (hydrateStarted) return
  hydrateStarted = true
  const stored = await loadDeviceState<PersistedPhysical>(PHYSICAL_STATE_KEY)
  if (accountPurged) return
  const assets = stored && Array.isArray(stored.assets) ? stored.assets : []
  const removedIds = stored && Array.isArray(stored.removedIds) ? stored.removedIds : []
  commit({ assets, removedIds, hydrated: true })

  /* SERVER jadi sumber saat ada sesi; `null` = tanpa sesi → tetap jalur lokal */
  const remote = await readRemotePhysicalAssets()
  if (!remote) return
  commit(mergePhysicalRemote(remote, live))
  for (const asset of live.assets) {
    if (live.removedIds.includes(asset.id)) continue
    if (!asset.remoteId) await ensurePhysicalOnServer(asset.id)
  }
  /* perubahan dari tab/perangkat lain masuk sendiri lewat langganan ini */
  startPhysicalRealtime()
}

/* ── JALUR SERVER (paket 84) ─────────────────────────────────────────────────
   Sebelumnya aset fisik hanya hidup di perangkat ini. Sekarang ia ikut ke
   server lewat tabel `physical_assets` dan ikut realtime, jadi dua perangkat
   menampilkan aset yang sama tanpa refresh. */

/** gabung daftar server dengan antrean perangkat — fungsi murni (mudah diuji) */
export function mergePhysicalRemote(
  remote: PhysicalAsset[],
  current: PhysicalSnapshot,
): PhysicalSnapshot {
  const byRemote = new Map<string, PhysicalAsset>()
  const byId = new Map<string, PhysicalAsset>()
  for (const asset of current.assets) {
    if (!byId.has(asset.id)) byId.set(asset.id, asset)
    if (asset.remoteId && !byRemote.has(asset.remoteId)) byRemote.set(asset.remoteId, asset)
  }
  const merged: PhysicalAsset[] = remote.map((row) => {
    const local = byRemote.get(row.id) ?? byId.get(row.id)
    /* `scope` tidak ada di skema → pertahankan milik perangkat */
    return local ? { ...row, id: local.id, scope: local.scope } : row
  })
  const baseIds = new Set(merged.map((row) => row.id))
  const baseRemotes = new Set(merged.map((row) => row.remoteId).filter(Boolean) as string[])
  for (const asset of current.assets) {
    if (SEED_ASSETS.some((seed) => seed.id === asset.id)) continue
    if (baseIds.has(asset.id)) continue
    if (asset.remoteId && baseRemotes.has(asset.remoteId)) continue
    merged.push(asset)
  }
  return { assets: merged, removedIds: current.removedIds, hydrated: true }
}

let realtime: WealthRealtimeHandle | null = null

async function ensurePhysicalOnServer(id: string): Promise<boolean> {
  const asset = live.assets.find((row) => row.id === id)
  if (!asset) return false
  const remoteId = asset.remoteId ?? randomUuid()
  if (!(await pushPhysicalAssetToServer(asset, remoteId))) return false
  if (asset.remoteId !== remoteId) {
    live = {
      ...live,
      assets: live.assets.map((row) => (row.id === id ? { ...row, remoteId } : row)),
    }
    persist(live)
    emit()
  }
  return true
}

async function refreshPhysicalFromServer(): Promise<void> {
  const remote = await readRemotePhysicalAssets()
  if (!remote) return
  commit(mergePhysicalRemote(remote, live))
}

function stopPhysicalRealtime(): void {
  realtime?.stop()
  realtime = null
}

function startPhysicalRealtime(): void {
  if (realtime) return
  realtime = subscribePhysicalChanges(() => {
    void refreshPhysicalFromServer()
  })
}

export function subscribePhysicalStore(listener: () => void): () => void {
  listeners.add(listener)
  void hydrate()
  return () => {
    listeners.delete(listener)
  }
}

/** aset yang masih HIDUP (yang dihapus disaring tombstone) — semua pembaca pakai ini */
export function livePhysicalAssets(snapshot: PhysicalSnapshot): PhysicalAsset[] {
  if (snapshot.removedIds.length === 0) return snapshot.assets
  return snapshot.assets.filter((asset) => !snapshot.removedIds.includes(asset.id))
}

function newId(): string {
  return `pa-${Date.now().toString(36)}-${nextId++}`
}

/** nominal selalu integer rupiah & tidak negatif */
function normalizeAmount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

export interface NewPhysicalInput {
  name: string
  category: PhysicalAssetCategory
  purchasePrice: number
  currentValue: number
  acquiredAt?: string
  note?: string
  scope?: BudgetScope
}

/** tambah aset. `null` = ditolak (nama kosong / nilai sekarang 0) — tidak menulis apa pun */
export function addPhysicalAsset(input: NewPhysicalInput): PhysicalAsset | null {
  const name = input.name.trim()
  const currentValue = normalizeAmount(input.currentValue)
  if (!name || currentValue <= 0) return null

  const asset: PhysicalAsset = {
    id: newId(),
    name,
    category: input.category,
    purchasePrice: normalizeAmount(input.purchasePrice),
    currentValue,
    acquiredAt: input.acquiredAt || undefined,
    note: input.note?.trim() || undefined,
    scope: input.scope ?? 'pribadi',
  }
  commit({ ...live, assets: [asset, ...live.assets], hydrated: true })
  void ensurePhysicalOnServer(asset.id)
  return asset
}

export interface PhysicalEdit {
  name?: string
  category?: PhysicalAssetCategory
  purchasePrice?: number
  currentValue?: number
  acquiredAt?: string
  note?: string
}

/** ubah aset. `null` = tidak ada / sudah dihapus */
export function editPhysicalAsset(id: string, patch: PhysicalEdit): PhysicalAsset | null {
  const existing = live.assets.find((asset) => asset.id === id)
  if (!existing || live.removedIds.includes(id)) return null

  const updated: PhysicalAsset = {
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() || existing.name : existing.name,
    category: patch.category ?? existing.category,
    purchasePrice:
      patch.purchasePrice !== undefined ? normalizeAmount(patch.purchasePrice) : existing.purchasePrice,
    currentValue: patch.currentValue !== undefined ? normalizeAmount(patch.currentValue) : existing.currentValue,
    acquiredAt: patch.acquiredAt !== undefined ? patch.acquiredAt || undefined : existing.acquiredAt,
    note: patch.note !== undefined ? patch.note.trim() || undefined : existing.note,
  }
  commit({ ...live, assets: live.assets.map((asset) => (asset.id === id ? updated : asset)), hydrated: true })
  void ensurePhysicalOnServer(id)
  return updated
}

/** hapus (tombstone) — barisnya disimpan supaya Undo bisa memulihkannya apa adanya */
export function deletePhysicalAsset(id: string): PhysicalAsset | null {
  const asset = live.assets.find((row) => row.id === id)
  if (!asset || live.removedIds.includes(id)) return null
  commit({ ...live, removedIds: [...live.removedIds, id], hydrated: true })
  /* hapus di server juga (Undo memulihkannya lewat upsert di `restore…`) */
  if (asset.remoteId) void deleteRemotePhysicalAsset(asset.remoteId)
  return asset
}

/** Undo hapus: cabut tombstone-nya — nilainya balik ke Net Worth seperti semula */
export function restorePhysicalAsset(id: string): PhysicalAsset | null {
  if (!live.removedIds.includes(id)) return null
  const asset = live.assets.find((row) => row.id === id) ?? null
  commit({ ...live, removedIds: live.removedIds.filter((rowId) => rowId !== id), hydrated: true })
  /* baris yang di-undo perlu dikirim ulang ke server */
  void ensurePhysicalOnServer(id)
  return asset
}

/** Hapus akun: kosongkan state + tandai purged (dipanggil `lib/account.ts`) */
export function purgePhysicalStore(): PhysicalSnapshot {
  accountPurged = true
  stopPhysicalRealtime()
  live = EMPTY_SNAPSHOT
  persist(live)
  emit()
  return live
}

/** snapshot store aset fisik untuk komponen client */
export function usePhysicalStore(): PhysicalSnapshot {
  return useSyncExternalStore(subscribePhysicalStore, getPhysicalSnapshot, getServerPhysicalSnapshot)
}

/** Kosongkan ke kondisi seed (khusus test). UI tidak pernah memanggilnya. */
export function resetPhysicalStore(): void {
  live = SEED_SNAPSHOT
  accountPurged = false
  hydrateStarted = false
  emit()
}

