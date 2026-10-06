'use client'

import { useSyncExternalStore } from 'react'
import type { BudgetScope } from '@/lib/data/budget'
import { INITIAL_PHYSICAL_ASSETS, type PhysicalAsset, type PhysicalAssetCategory } from '@/lib/data/wealth'
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
  return updated
}

/** hapus (tombstone) — barisnya disimpan supaya Undo bisa memulihkannya apa adanya */
export function deletePhysicalAsset(id: string): PhysicalAsset | null {
  const asset = live.assets.find((row) => row.id === id)
  if (!asset || live.removedIds.includes(id)) return null
  commit({ ...live, removedIds: [...live.removedIds, id], hydrated: true })
  return asset
}

/** Undo hapus: cabut tombstone-nya — nilainya balik ke Net Worth seperti semula */
export function restorePhysicalAsset(id: string): PhysicalAsset | null {
  if (!live.removedIds.includes(id)) return null
  const asset = live.assets.find((row) => row.id === id) ?? null
  commit({ ...live, removedIds: live.removedIds.filter((rowId) => rowId !== id), hydrated: true })
  return asset
}

/** Hapus akun: kosongkan state + tandai purged (dipanggil `lib/account.ts`) */
export function purgePhysicalStore(): PhysicalSnapshot {
  accountPurged = true
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

