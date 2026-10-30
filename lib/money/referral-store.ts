'use client'

import { useSyncExternalStore } from 'react'
import type { ReferralFriend } from '@/lib/data/referral'

/* ── STORE REFERRAL — ANGKA NYATA, MULAI DARI KOSONG ─────────────────────────
   Sebelum ini `/referral` membaca `referralState` dari `lib/data/referral.ts`:
   kode contoh, jumlah klik karangan, dan lima teman fiktif. Konstanta itu sudah
   DIHAPUS; satu-satunya sumber sekarang `GET /api/referral/me`
   (`catetind_referral_overview()` di database, dibatasi `auth.uid()`).

   Bentuk state sengaja polos dan SELALU KOSONG sebelum hidrasi:

     · `status`      — `idle`/`loading`/`ready`/`error`; `ready` berarti server
                       benar-benar menjawab, jadi angka nol pun bermakna nol.
     · `configured`  — `false` = build tanpa backend Supabase. UI mengatakan
                       "belum tersambung", bukan menampilkan angka contoh.
     · `code`        — `null` = belum ada kode yang bisa dibagikan. Tombol
                       Bagikan/Copy dimatikan, bukan mengirim link karangan.

   Tidak ada persistensi perangkat dengan sengaja: ini data AKUN, bukan data
   perangkat. Kalau dibaca dari IndexedDB, angka lama bisa tampil sebagai milik
   user setelah pindah akun di perangkat yang sama — persis kelas bug yang
   ditutup paket 100 untuk store uang. */

export interface ReferralSnapshot {
  status: 'idle' | 'loading' | 'ready' | 'error'
  configured: boolean
  code: string | null
  clicks: number
  pending: number
  converted: number
  /** total token AI yang sudah cair (dari `referral_rewards`) */
  rewardTokens: number
  friends: ReferralFriend[]
  /** false sampai server menjawab — batas render server ↔ client */
  hydrated: boolean
}

/** snapshot untuk render server & render pertama client — SELALU KOSONG */
const SERVER_SNAPSHOT: ReferralSnapshot = Object.freeze({
  status: 'idle',
  configured: true,
  code: null,
  clicks: 0,
  pending: 0,
  converted: 0,
  rewardTokens: 0,
  friends: [] as ReferralFriend[],
  hydrated: false,
})

let live: ReferralSnapshot = SERVER_SNAPSHOT
let hydrateStarted = false
const listeners = new Set<() => void>()

export function getReferralSnapshot(): ReferralSnapshot {
  return live
}

export function getServerReferralSnapshot(): ReferralSnapshot {
  return SERVER_SNAPSHOT
}

function emit(): void {
  for (const listener of listeners) listener()
}

function commit(next: ReferralSnapshot): void {
  live = next
  emit()
}

/**
 * Berlangganan + hidrasi sekali. Dipanggil `useReferral()`, jadi pembacaan
 * jaringan baru terjadi SETELAH hidrasi React — HTML server dan render pertama
 * client tetap identik (keduanya kosong).
 */
export function subscribeReferralStore(listener: () => void): () => void {
  listeners.add(listener)
  void hydrateReferral()
  return () => {
    listeners.delete(listener)
  }
}

export async function hydrateReferral(): Promise<void> {
  if (hydrateStarted || typeof window === 'undefined') return
  hydrateStarted = true
  await refreshReferral()
}

/** paksa baca ulang (dipakai setelah kembali dari checkout / tombol coba lagi) */
export async function refreshReferral(): Promise<void> {
  commit({ ...live, status: 'loading' })
  try {
    const res = await fetch('/api/referral/me', { cache: 'no-store' })
    const body = (await res.json()) as {
      ok?: boolean
      configured?: boolean
      code?: string | null
      clicks?: number
      pending?: number
      converted?: number
      rewardTokens?: number
      friends?: ReferralFriend[]
    }
    if (!res.ok || body.ok !== true) {
      commit({ ...live, status: 'error', hydrated: true })
      return
    }
    commit({
      status: 'ready',
      configured: body.configured !== false,
      code: typeof body.code === 'string' && body.code ? body.code : null,
      clicks: Math.max(0, Math.round(Number(body.clicks) || 0)),
      pending: Math.max(0, Math.round(Number(body.pending) || 0)),
      converted: Math.max(0, Math.round(Number(body.converted) || 0)),
      rewardTokens: Math.max(0, Math.round(Number(body.rewardTokens) || 0)),
      friends: Array.isArray(body.friends) ? body.friends : [],
      hydrated: true,
    })
  } catch {
    commit({ ...live, status: 'error', hydrated: true })
  }
}

/**
 * Kembalikan ke keadaan kosong. Dipakai "Hapus Akun" (angka referral adalah data
 * akun, jadi tidak boleh tersisa di layar) dan test.
 */
export function resetReferralStore(): void {
  live = SERVER_SNAPSHOT
  hydrateStarted = false
  emit()
}

/** hook baca untuk komponen */
export function useReferral(): ReferralSnapshot {
  return useSyncExternalStore(subscribeReferralStore, getReferralSnapshot, getServerReferralSnapshot)
}
