'use client'

import { useEffect, useState } from 'react'
import { aiQuotaResetInfo, type AiQuotaReset } from '@/lib/ai-quota'

/* ── INFO RESET KUOTA AI — NYATA & SSR-AMAN (paket 86) ───────────────────────
   Kartu Bahan Bakar AI (sidebar) dan Fuel Gauge di /settings/billing butuh tahu
   KAPAN kuota dasar di-reset. Dulu jawabannya kostan mock ('1 Oktober 2026'),
   jadi tanggalnya tidak pernah benar di produksi.

   Kenapa lewat hook, bukan konstanta: tanggal reset diturunkan dari `new Date()`,
   dan server (jam UTC) bisa berbeda hari dengan HP user (jam lokal). Kalau
   dihitung saat render server, HTML server & hasil hidrasi bisa beda → hydration
   mismatch (dilarang `CONTEXT-WAJIB` §8). Karena itu nilainya `null` sampai
   komponen selesai mount, persis pola `useTodayISO()`
   (`lib/use-today-iso.ts`); pemanggil memakai `AI_QUOTA_RESET_FALLBACK` untuk
   keadaan "belum terbaca" sehingga tidak ada tanggal kosong di layar. */
export function useAiQuotaReset(): AiQuotaReset | null {
  const [info, setInfo] = useState<AiQuotaReset | null>(null)
  useEffect(() => {
    setInfo(aiQuotaResetInfo(new Date()))
  }, [])
  return info
}
