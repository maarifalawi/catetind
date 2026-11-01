'use client'

import { useSyncExternalStore } from 'react'
import { fetchSessionUser, type SessionUserView } from '@/lib/session-client'
import { subscribeTables } from '@/lib/supabase/realtime'

/* ── IDENTITAS SESI UNTUK KOMPONEN KLIEN (perbaikan audit K4) ─────────────────
   Beberapa komponen perlu tahu SIAPA yang sedang masuk: sidebar (blok profil),
   panel Pengaturan (nama & email), sapaan Dashboard, dan panel Export Data.

   Sebelum hook ini ada, ketiganya memakai konstanta demo yang di-hardcode
   ('Jon Snow' / 'jon@snow.com' / avatar contoh). Karena sidebar tampil di SEMUA
   halaman app, setiap user melihat identitas orang lain di layarnya sendiri —
   dan itu bukan cuma soal tampilan: itu mengklaim sesuatu yang tidak benar.

   Kontraknya sengaja jujur, mengikuti pola `app-lock-provider.tsx`:
     • sumbernya TETAP `fetchSessionUser()` → `/api/session` (server), sehingga
       jawabannya sama dengan yang dipakai route server;
     • `user === null` berarti "belum ada sesi / belum terbaca" — BUKAN "tamu
       pasti". Karena itu pemanggil WAJIB menyediakan label netral
       (`SESSION_COPY.unknownName` / `unknownEmail`), bukan menebak nama;
     • `loaded` dipakai kalau nanti perlu membedakan "masih memuat" dari "tidak
       ada sesi" tanpa memicu hydration mismatch.

   GANTI NAMA (perbaikan: nama benar-benar berubah di semua layar): nilainya
   sekarang hidup di SATU store modul, bukan state per komponen. `useState`
   lokal membuat sidebar, sapaan, dan panel Pengaturan bisa menyimpan jawaban
   yang berbeda — dan setelah user menyimpan nama baru, hanya panel yang
   berubah. Dengan store ini, `setSessionUserName()` memperbarui SEMUA pemakai
   sekaligus tanpa reload.
   ──────────────────────────────────────────────────────────────────────────── */

export interface SessionUserState {
  user: SessionUserView | null
  /** true setelah percobaan baca pertama selesai (berhasil maupun gagal) */
  loaded: boolean
}

/** kondisi "belum terbaca" — objek TETAP supaya `useSyncExternalStore` stabil */
const UNLOADED: SessionUserState = { user: null, loaded: false }

let snapshot: SessionUserState = UNLOADED
const listeners = new Set<() => void>()
let started = false
let inFlight: Promise<void> | null = null

function emit(next: SessionUserState): void {
  snapshot = next
  for (const listener of listeners) listener()
}

/**
 * Baca identitas sekali per dokumen; hasilnya dibagi ke semua pemakai hook.
 * Penjaga "jangan setState setelah unmount" tidak lagi dibutuhkan karena store
 * hidup di modul, bukan di dalam komponen yang bisa hilang.
 */
function read(): Promise<void> {
  if (inFlight) return inFlight
  const run = fetchSessionUser()
    .then((user) => emit({ user, loaded: true }))
    /* gagal jaringan bukan "pasti tamu": pertahankan identitas terakhir yang
       sudah terbaca, dan tandai percobaannya selesai */
    .catch(() => emit({ user: snapshot.user, loaded: true }))
    .finally(() => {
      inFlight = null
    })
  inFlight = run
  return run
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!started) {
    started = true
    void read()
    startProfileRealtime()
  }
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Nama/foto yang berubah di PERANGKAT LAIN ikut masuk tanpa reload:
 * `profiles` ada di publication realtime (migrasi 20261101120000), dan sinyalnya
 * hanya memicu baca ulang `/api/session` (jalur yang sama dengan hidrasi).
 */
let profileRealtimeStarted = false
function startProfileRealtime(): void {
  if (profileRealtimeStarted || typeof window === 'undefined') return
  profileRealtimeStarted = true
  subscribeTables('profile-changes', ['profiles'], () => {
    void read()
  })
}

function getSnapshot(): SessionUserState {
  return snapshot
}

function getServerSnapshot(): SessionUserState {
  return UNLOADED
}

export function useSessionUser(): SessionUserState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** tarik ulang identitas dari `/api/session` (mis. setelah masuk di tab lain) */
export function refreshSessionUser(): Promise<void> {
  started = true
  return read()
}

/**
 * Nama baru SUDAH tersimpan di server (`updateDisplayName()`). Dipasang langsung
 * ke semua pemakai hook supaya sapaan Dashboard & sidebar berubah seketika —
 * tanpa reload, dan tanpa menunggu `/api/session` membacakan cookie yang baru.
 */
export function setSessionUserName(name: string): void {
  setSessionUserProfile({ name })
}

/**
 * Perbarui identitas tampilan setelah server mengonfirmasi perubahan
 * (`updateDisplayName` / `updateAvatar`). Semua pemakai hook ikut berubah
 * seketika — sapaan Dashboard, sidebar, dan panel Pengaturan.
 */
export function setSessionUserProfile(patch: {
  name?: string
  avatarUrl?: string | null
}): void {
  const current = snapshot.user
  if (!current) return
  emit({
    user: {
      ...current,
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.avatarUrl === undefined ? {} : { avatarUrl: patch.avatarUrl }),
    },
    loaded: true,
  })
}
