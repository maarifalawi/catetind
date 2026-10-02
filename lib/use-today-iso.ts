'use client'

import { useEffect, useState } from 'react'
import { todayISO } from './time'

/* ── HOOK "HARI INI" — DIPISAH DARI lib/time.ts (paket 57) ───────────────────
   Kenapa file sendiri, bukan di dalam `lib/time.ts` seperti rencana awal prompt:
   `lib/time.ts` juga mengimpor `localISODate`/`todayISO` ke `lib/data/history.ts`
   dan `lib/data/joint.ts`, yang dibaca SERVER COMPONENT (`app/history/page.tsx`)
   dan ROUTE HANDLER (`app/api/wallets/**`). Begitu file itu menyentuh
   `useState`, build Next menolak:

     "You're importing a module that depends on `useState` into a React Server
      Component module."

   Jadi pembagiannya: fungsi murni tetap di `lib/time.ts` (boleh diimpor siapa
   saja), hook-nya di sini dengan directive `'use client'` — pola yang sama dengan
   `lib/use-push-notifications.ts`. Satu "hari ini", dua pintu masuk sesuai
   lingkungan pemakainya. */

/**
 * "Hari ini" untuk komponen klien — `''` sampai komponen selesai mount.
 *
 * Render pertama sengaja string KOSONG (bukan `todayISO()` langsung): HTML server
 * & hasil hidrasi tetap identik, lalu nilainya diisi sekali sesudah mount.
 * Pemanggil yang butuh nilai untuk render server memakai fallback eksplisit
 * (`today || JANGKAR_SEED`), jadi tidak ada hydration mismatch (`CONTEXT-WAJIB`
 * §8) dan tidak ada tanggal kosong di layar.
 *
 * Nilainya TIDAK di-refresh otomatis saat lewat tengah malam: satu render = satu
 * nilai, sama seperti seluruh halaman lain di repo ini (menambah timer di sini
 * berarti setiap kartu uang ikut berdetak tanpa alasan).
 */
export function useTodayISO(): string {
  const [today, setToday] = useState('')
  useEffect(() => {
    setToday(todayISO())
  }, [])
  return today
}
