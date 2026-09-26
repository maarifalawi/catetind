'use client'

import { useState } from 'react'
import { Check, Copy, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

/** target QR — halaman install supaya HP langsung dapat panduan versi mobile-nya */
const INSTALL_URL = 'https://catetind.com/install'

/**
 * InstallQrHandoff — serah-terima desktop → mobile.
 *
 * Muncul di bawah panduan desktop: user yang lebih suka nyatet di HP tinggal
 * scan, gak perlu ngetik URL panjang di HP.
 */
export function InstallQrHandoff({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(INSTALL_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard diblokir browser — link tetap terbaca di layar */
    }
  }

  return (
    <section
      aria-label="Buka CatetInd di HP lewat QR Code"
      className={cn(
        'rounded-3xl bg-cream/85 p-4 ring-1 ring-soil/5 backdrop-blur-xl sm:p-5',
        className,
      )}
    >
      <h2 className="text-base font-semibold text-ink">Lebih suka nyatet di HP?</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink/55">
        Scan QR Code ini pakai kamera HP kamu untuk langsung buka CatetInd di HP.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        {/* TODO: Install qrcode.react and generate dynamic QR pointing to catetind.com/install. */}
        <div className="flex size-40 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-forest/15 bg-cream/60">
          <div className="px-3 text-center">
            <QrCode className="mx-auto size-8 text-ink/30" strokeWidth={1.8} />
            <p className="mt-2 text-[11px] leading-snug font-medium text-ink/35">
              [QR Code segera hadir]
            </p>
          </div>
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink/35 uppercase">
            Link install
          </p>
          <p className="mt-1 text-sm font-semibold break-all text-forest">
            catetind.com/install
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-2 text-xs font-semibold text-forest transition-colors duration-200 hover:bg-forest hover:text-mint active:scale-95"
          >
            {copied ? (
              <Check className="size-3.5" strokeWidth={2.6} />
            ) : (
              <Copy className="size-3.5" strokeWidth={2.4} />
            )}
            {copied ? 'Tersalin!' : 'Copy link'}
          </button>
        </div>
      </div>
    </section>
  )
}
