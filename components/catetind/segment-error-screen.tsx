'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Download, Home, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { InfoNote } from './info-note'
import { cn } from '@/lib/utils'
import { fetchSessionUser } from '@/lib/session-client'
import { downloadMoneyExport } from '@/lib/money/export'
import {
  SEGMENT_ERROR_ACTIONS,
  SEGMENT_ERROR_COPY,
  type SegmentErrorArea,
} from '@/lib/data/segment-error'

/* ── LAYAR ERROR PER SEGMEN (paket 43 · audit Stage 6 #3) ────────────────────
   Satu komponen, dipakai lima `error.tsx` (`app/`, `/wallet`, `/wealth`,
   `/history`, `/joint`). Alasan satu komponen: copy & tombolnya harus SAMA di
   semua segmen — kalau tiap segmen menulis layarnya sendiri, salah satu pasti
   ketinggalan saat ditambal, dan justru segmen uang yang paling penting.

   Dua hal yang membuat layar ini BERGUNA, bukan sekadar sopan:

     1. `withShell` (default true) → sidebar desktop TETAP ada. User tidak
        terjebak: ia masih bisa pindah ke halaman lain yang sehat.
     2. Tombol "Unduh Data Saya" memakai jalur ekspor yang SAMA dengan
        `/settings/data` (`lib/money/export.ts`) dan membacanya dari store, bukan
        dari komponen yang error — jadi kegagalan render tidak menghalangi user
        mengambil catatannya.

   `error.digest` sengaja TIDAK ditampilkan di layar (bahasa mesin bukan bahasa
   user); ia dicatat ke konsol supaya bisa dicocokkan dengan log produksi. */

export function SegmentErrorScreen({
  area,
  error,
  reset,
  withShell = true,
}: {
  area: SegmentErrorArea
  error: Error & { digest?: string }
  reset: () => void
  /** false = dipakai `app/error.tsx` (halaman app lain): tanpa shell sidebar */
  withShell?: boolean
}) {
  const copy = SEGMENT_ERROR_COPY[area]

  useEffect(() => {
    /* jejak teknis: satu baris di konsol, tanpa kode error di layar user */
    console.error(`[CatetInd] error segment "${area}":`, error)
  }, [area, error])

  /**
   * Unduh ekspor dari layar error. `fetchSessionUser()` dibungkus try/catch lewat
   * nilainya sendiri (fungsi itu sudah aman), dan ekspornya TIDAK boleh ikut
   * gagal hanya karena sesi tidak terbaca — file tetap dibuat dengan `user: null`.
   */
  async function handleExport() {
    const user = await fetchSessionUser()
    const result = downloadMoneyExport(user)
    if (!result) {
      toast.error(SEGMENT_ERROR_ACTIONS.exportFailedTitle, {
        description: SEGMENT_ERROR_ACTIONS.exportFailedBody,
      })
      return
    }
    toast.success(SEGMENT_ERROR_ACTIONS.exportDoneTitle(result.fileName), {
      description: SEGMENT_ERROR_ACTIONS.exportDoneBody,
    })
  }

  const panel = (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start">
      <div className="w-full rounded-[2rem] bg-cream p-6 ring-1 ring-soil/12 sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-hud-amber/25 text-hud-terracotta">
          <TriangleAlert className="size-5" strokeWidth={2.2} aria-hidden />
        </span>

        <p className="mt-4 text-[10.5px] font-semibold tracking-[0.16em] text-ink/40 uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink/60">{copy.body}</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-3 text-sm font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden />
            {SEGMENT_ERROR_ACTIONS.reloadLabel}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cream px-5 py-3 text-sm font-semibold text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
          >
            <Download className="size-4" strokeWidth={2.4} aria-hidden />
            {SEGMENT_ERROR_ACTIONS.exportLabel}
          </button>
          {!withShell && (
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-ink/60 transition-colors hover:text-ink"
            >
              <Home className="size-4" strokeWidth={2.4} aria-hidden />
              {SEGMENT_ERROR_ACTIONS.homeLabel}
            </Link>
          )}
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink/40">
          {SEGMENT_ERROR_ACTIONS.exportHint}
        </p>

        {/* AUDIT "CLEAN UI" (paket 63): penjelasan "kenapa aman" dulu paragraf
            ketiga di depan mata (bahasa teknis di momen panik). Sekarang cuma
            satu baris penenang; detailnya di balik satu tap. */}
        <InfoNote
          className="mt-4"
          icon={ShieldCheck}
          title={SEGMENT_ERROR_ACTIONS.safeTitle}
          summary={copy.safeSummary}
          label={SEGMENT_ERROR_ACTIONS.safeLabel}
        >
          {copy.safeBody}
        </InfoNote>
      </div>
    </div>
  )

  if (!withShell) return <div className={cn('w-full px-5 py-10 sm:px-8 lg:py-16')}>{panel}</div>

  return <ScreenShell>{panel}</ScreenShell>
}
