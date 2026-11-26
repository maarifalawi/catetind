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
  STALE_ASSET_RELOAD_GUARD_KEY,
  STALE_ASSET_RELOAD_WINDOW_MS,
  isStaleAssetError,
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
     3. Kalau yang gagal adalah MEMUAT BERKAS (chunk), layar ini reload dokumen
        sekali secara otomatis — `reset()` tidak akan pernah berhasil untuk kasus
        itu. Lihat `isStaleAssetError()` di `lib/data/segment-error.ts`.

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
  /**
   * Error ini kegagalan MEMUAT BERKAS (chunk/`dynamic import`), bukan kegagalan
   * render. Bedanya penting: `reset()` menggambar ulang pohon yang sama dan
   * meminta chunk dengan URL lama yang sudah 404, jadi tombolnya terasa tidak
   * bekerja. Untuk jenis ini satu-satunya obat adalah reload dokumen.
   */
  const staleAsset = isStaleAssetError(error)

  useEffect(() => {
    /* jejak teknis: satu baris di konsol, tanpa kode error di layar user */
    console.error(`[CatetInd] error segment "${area}":`, error)
  }, [area, error])

  /**
   * PEMULIHAN OTOMATIS untuk chunk yang gagal dimuat: reload sekali, lalu user
   * mendarat di halaman yang benar tanpa harus menekan apa pun. Dijaga
   * `sessionStorage` per jendela waktu supaya jaringan yang benar-benar mati
   * tidak membuat tab berputar-putar me-reload selamanya.
   */
  useEffect(() => {
    if (!staleAsset) return
    try {
      const last = Number(window.sessionStorage.getItem(STALE_ASSET_RELOAD_GUARD_KEY) ?? 0)
      if (Number.isFinite(last) && Date.now() - last < STALE_ASSET_RELOAD_WINDOW_MS) return
      window.sessionStorage.setItem(STALE_ASSET_RELOAD_GUARD_KEY, String(Date.now()))
    } catch {
      /* storage diblokir (mode privat ketat): jangan reload tanpa penjaga */
      return
    }
    window.location.reload()
  }, [staleAsset])

  /** "Muat ulang": reload dokumen untuk kegagalan aset, `reset()` untuk sisanya */
  function handleReload() {
    if (staleAsset) {
      window.location.reload()
      return
    }
    reset()
  }

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

        <p className="mt-4 text-[11.5px] font-medium tracking-[0.16em] text-forest-muted uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-forest sm:text-2xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-forest-muted">{copy.body}</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-3 text-sm font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden />
            {SEGMENT_ERROR_ACTIONS.reloadLabel}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cream px-5 py-3 text-sm font-medium text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage"
          >
            <Download className="size-4" strokeWidth={2.4} aria-hidden />
            {SEGMENT_ERROR_ACTIONS.exportLabel}
          </button>
          {!withShell && (
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-forest-muted transition-colors hover:text-forest"
            >
              <Home className="size-4" strokeWidth={2.4} aria-hidden />
              {SEGMENT_ERROR_ACTIONS.homeLabel}
            </Link>
          )}
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-forest-muted">
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
