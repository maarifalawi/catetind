'use client'

import { useEffect, useState } from 'react'
import { fetchSessionUser, type SessionUserView } from '@/lib/session-client'

/* ── IDENTITAS SESI UNTUK KOMPONEN KLIEN (perbaikan audit K4) ─────────────────
   Beberapa komponen perlu tahu SIAPA yang sedang masuk: sidebar (blok profil),
   panel Pengaturan (nama & email), dan panel Export Data (alamat tujuan).

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
   ──────────────────────────────────────────────────────────────────────────── */

export interface SessionUserState {
  user: SessionUserView | null
  /** true setelah percobaan baca pertama selesai (berhasil maupun gagal) */
  loaded: boolean
}

export function useSessionUser(): SessionUserState {
  const [user, setUser] = useState<SessionUserView | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    /* `active` menahan setState setelah unmount — pertanyaan identitas sering
       dijawab terlambat (jaringan), dan komponennya bisa sudah hilang. */
    let active = true

    void fetchSessionUser()
      .then((next) => {
        if (!active) return
        setUser(next)
        setLoaded(true)
      })
      .catch(() => {
        if (active) setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  return { user, loaded }
}
