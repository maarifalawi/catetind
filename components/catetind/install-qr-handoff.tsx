'use client'

import { useState } from 'react'
import { Check, Copy, Share2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  INSTALL_HANDOFF,
  INSTALL_SHARE_TEXT,
  INSTALL_SHARE_TITLE,
  INSTALL_URL,
  INSTALL_URL_TEXT,
} from '@/lib/data/install'

/* ── Serah-terima desktop → HP · /install ────────────────────────────────────
   Dulu blok ini kotak bergaris putus-putus berlabel "menyusul". Untuk panduan
   teknis, tempat kosong justru lebih buruk daripada tidak ada: user yang
   tersangkut di sini adalah drop-off termahal (niatnya sudah ada, cuma macet di
   langkah teknis).

   Isinya sekarang aksi yang benar-benar jalan — tanpa dependency baru:
   • `Bagikan link` → Web Share API kalau browser punya (langsung kirim ke
     WhatsApp/Telegram/AirDrop), kalau tidak ada jatuh ke clipboard.
   • `Salin link`   → clipboard, pintu darurat universal semua browser.
   • Status + toast berubah setelah aksi, karena user berhak tahu aksinya
     berhasil — bukan menebak dari tombol yang diam.

   Nama file & komponen dipertahankan supaya kontrak import halaman tidak
   berubah; QR sungguhan butuh paket tambahan yang sengaja TIDAK dipakai
   (lihat laporan task) — jadi tidak ada label kosong di sini.
   ────────────────────────────────────────────────────────────────────────── */

type HandoffStatus = 'idle' | 'copied' | 'shared' | 'failed'

export function InstallQrHandoff({ className }: { className?: string }) {
  const [status, setStatus] = useState<HandoffStatus>('idle')

  /** micro-feedback 2,5 detik lalu balik netral — pola sama dengan tombol Copy di referral */
  function flash(next: Exclude<HandoffStatus, 'idle'>) {
    setStatus(next)
    window.setTimeout(() => setStatus('idle'), 2500)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(INSTALL_URL)
      flash('copied')
      toast.success(INSTALL_HANDOFF.status.copied)
    } catch {
      /* clipboard diblokir browser (mis. halaman bukan https) — link tetap terbaca di layar */
      flash('failed')
      toast.error(INSTALL_HANDOFF.status.failed)
    }
  }

  /**
   * Web Share API dulu; browser yang tidak punya (`typeof` check, bukan
   * `'share' in navigator`, supaya tipe navigator tidak menyempit jadi never)
   * otomatis dialihkan ke salin link — user tetap cukup sekali tempel.
   */
  async function shareLink() {
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

    if (!canShare) {
      await copyLink()
      return
    }

    try {
      await navigator.share({
        title: INSTALL_SHARE_TITLE,
        text: INSTALL_SHARE_TEXT,
        url: INSTALL_URL,
      })
      flash('shared')
    } catch {
      /* user menutup dialog share — bukan error, jangan bikin toast ganggu */
    }
  }

  const statusText = status === 'idle' ? null : INSTALL_HANDOFF.status[status]

  return (
    <section
      aria-label={INSTALL_HANDOFF.a11yLabel}
      className={cn(
        'rounded-3xl bg-cream/85 p-4 ring-1 ring-soil/12 backdrop-blur-xl sm:p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <Smartphone className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-forest">{INSTALL_HANDOFF.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-forest/50">{INSTALL_HANDOFF.blurb}</p>
        </div>
      </header>

      {/* link ditulis apa adanya (mono) supaya bisa dibaca & diketik manual */}
      <div className="mt-4 rounded-2xl bg-sage/50 px-3.5 py-3 ring-1 ring-forest/10">
        <p className="text-[10.5px] font-medium tracking-[0.16em] text-forest/45 uppercase">
          {INSTALL_HANDOFF.linkLabel}
        </p>
        <p className="mt-1 font-mono text-sm font-medium break-all text-forest">
          {INSTALL_URL_TEXT}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={shareLink}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-medium text-cream transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98]"
        >
          <Share2 className="size-4" strokeWidth={2.4} aria-hidden />
          {INSTALL_HANDOFF.shareLabel}
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-sage px-4 py-3 text-sm font-medium text-forest transition-colors duration-200 hover:bg-forest hover:text-mint active:scale-[0.98]"
        >
          {status === 'copied' ? (
            <Check className="size-4" strokeWidth={2.6} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={2.4} aria-hidden />
          )}
          {INSTALL_HANDOFF.copyLabel}
        </button>
      </div>

      {/* status aksi — aria-live supaya screen reader ikut tahu, bukan cuma mata */}
      <p
        aria-live="polite"
        className="mt-2 min-h-4 text-center text-xs font-medium text-forest/80"
      >
        {statusText}
      </p>

      <p className="text-center text-[11px] leading-relaxed text-forest/50">
        {INSTALL_HANDOFF.instruction}
      </p>
    </section>
  )
}
