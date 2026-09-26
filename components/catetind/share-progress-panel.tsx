'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  SHARE_PANEL_COPY,
  buildShareHref,
  buildSharePayload,
  buildShareUrl,
  type ShareCard,
} from '@/lib/data/share'

/* ── Panel "Bagikan kartu pencapaian" — trigger dari Rekap Mingguan ──────────
   PRD 6614–6617 minta tombol Share di dalam rekap. Di app, tombol itu harus
   MENGHASILKAN sesuatu DAN menuju sesuatu, jadi panel ini memberi dua aksi yang
   benar-benar jalan tanpa dependency baru (pola `install-qr-handoff.tsx`):

     • `Bagikan`   → Web Share API (WhatsApp/IG/DM) bila browsernya punya,
                     kalau tidak jatuh otomatis ke salin link.
     • `Salin link` → clipboard: pintu darurat universal semua browser.
     • tautan pratinjau → `/share/<id>`, halaman yang dilihat penerimanya —
       pola `JOIN_PREVIEW_COPY` di `/joint` supaya user bisa memeriksa hasilnya
       SEBELUM membagikan.

   Panel SENGAJA tidak menggambar ulang kartunya: yang harus dilihat user adalah
   HALAMAN yang dibuka orang lain, bukan tiruannya di dalam sheet. Satu kartu,
   satu gambar (`share-achievement-card.tsx`) — tidak ada dua versi yang bisa
   berbeda isi. Semua copy dari `lib/data/share.ts`.
   ────────────────────────────────────────────────────────────────────────── */

type PanelStatus = 'idle' | 'copied' | 'shared' | 'failed'

export function ShareProgressPanel({
  card,
  className,
}: {
  card: ShareCard
  className?: string
}) {
  const [status, setStatus] = useState<PanelStatus>('idle')

  /** micro-feedback 2,5 detik lalu balik netral — pola tombol Copy di /install */
  function flash(next: Exclude<PanelStatus, 'idle'>) {
    setStatus(next)
    window.setTimeout(() => setStatus('idle'), 2500)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildShareUrl(card.id))
      flash('copied')
      toast.success(SHARE_PANEL_COPY.status.copied)
    } catch {
      /* clipboard diblokir browser (mis. bukan https) — tautannya tetap ada di kartu */
      flash('failed')
      toast.error(SHARE_PANEL_COPY.status.failed)
    }
  }

  /**
   * `typeof` check (bukan `'share' in navigator`) supaya TypeScript tidak
   * menyempitkan `navigator` jadi `never` di cabang fallback — sama seperti
   * `referral-screen.tsx`.
   */
  async function shareLink() {
    const payload = buildSharePayload(card.id)
    /* kartu tanpa payload = tautan mati; jangan pernah dibagikan */
    if (!payload) return

    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    if (!canShare) {
      await copyLink()
      return
    }

    try {
      await navigator.share(payload)
      flash('shared')
      toast.success(SHARE_PANEL_COPY.status.shared)
    } catch {
      /* user menutup dialog share — bukan error, jangan bikin toast ganggu */
    }
  }

  const statusText = status === 'idle' ? null : SHARE_PANEL_COPY.status[status]

  return (
    <section
      aria-label={SHARE_PANEL_COPY.title}
      className={cn('rounded-2xl bg-sage/50 p-4 ring-1 ring-soil/10', className)}
    >
      <header className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cream text-forest">
          <Share2 className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[13.5px] font-semibold tracking-tight text-ink">
            {SHARE_PANEL_COPY.title}
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink/55">
            {SHARE_PANEL_COPY.blurb}
          </p>
        </div>
      </header>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={shareLink}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-forest px-4 text-[12.5px] font-semibold text-cream transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
        >
          <Share2 className="size-3.5" strokeWidth={2.4} aria-hidden />
          {SHARE_PANEL_COPY.shareLabel}
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-cream px-4 text-[12.5px] font-semibold text-forest ring-1 ring-soil/14 transition-colors duration-200 hover:bg-sage/70 active:scale-[0.98] motion-reduce:transition-none"
        >
          {status === 'copied' ? (
            <Check className="size-3.5" strokeWidth={2.6} aria-hidden />
          ) : (
            <Copy className="size-3.5" strokeWidth={2.4} aria-hidden />
          )}
          {SHARE_PANEL_COPY.copyLabel}
        </button>
      </div>

      {/* status aksi — aria-live supaya screen reader ikut tahu, bukan cuma mata */}
      <p aria-live="polite" className="mt-1.5 min-h-4 text-center text-[11px] font-medium text-forest/80">
        {statusText}
      </p>

      <div className="mt-1.5 border-t border-soil/12 pt-3">
        <Link
          href={buildShareHref(card.id)}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-forest underline underline-offset-2 transition-colors duration-200 hover:text-forest-soft motion-reduce:transition-none"
        >
          {SHARE_PANEL_COPY.previewLabel}
          <ArrowUpRight className="size-3.5" strokeWidth={2.4} aria-hidden />
        </Link>
        <p className="mt-1 text-[10.5px] leading-relaxed text-ink/45">
          {SHARE_PANEL_COPY.previewHint}
        </p>
      </div>
    </section>
  )
}
