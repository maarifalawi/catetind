'use client'

import { useState } from 'react'
import { CheckCircle2, Download, Loader2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InstallOutcome } from '@/hooks/use-install-prompt'

// beforeinstallprompt is supported on Chrome (Android, Windows, Mac), Edge, and Samsung Internet. Not supported on Safari/iOS.

/**
 * InstallCta — tombol install 1-klik (Android & desktop saja).
 *
 * Tiga keadaan yang mungkin:
 * 1. `isInstalled`   → app sudah jalan sebagai aplikasi terpasang (standalone)
 * 2. `canInstall`    → browser menyediakan dialog install native → tombol besar
 * 3. sisanya         → prompt belum/tidak tersedia → arahkan ke panduan manual
 *
 * Halaman /install tidak merender komponen ini ketika device = ios.
 */
export function InstallCta({
  isInstalled,
  canInstall,
  isPrompting,
  onInstall,
  className,
}: {
  isInstalled: boolean
  canInstall: boolean
  isPrompting: boolean
  onInstall: () => Promise<InstallOutcome>
  className?: string
}) {
  /* hasil prompt terakhir — buat copy saat user dismiss */
  const [outcome, setOutcome] = useState<InstallOutcome | null>(null)

  async function handleInstall() {
    setOutcome(await onInstall())
  }

  if (isInstalled) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-3xl bg-sage/80 px-5 py-4 ring-1 ring-forest/10',
          className,
        )}
      >
        <CheckCircle2 className="size-6 shrink-0 text-forest" strokeWidth={2.2} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-forest">
            ✅ CatetInd sudah terpasang di perangkat ini!
          </p>
          <p className="mt-1 text-xs leading-relaxed text-forest/70">
            Buka lewat ikon di Homescreen biar bonus install-nya langsung masuk.
          </p>
        </div>
      </div>
    )
  }

  if (!canInstall) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-3xl bg-cream/85 px-5 py-4 ring-1 ring-soil/12 backdrop-blur-xl',
          className,
        )}
      >
        <Smartphone className="size-5 shrink-0 text-forest" strokeWidth={2.2} />
        <p className="text-sm leading-relaxed text-ink/60">
          {outcome === 'dismissed'
            ? 'Oke, install-nya di-nanti dulu. Kamu bisa install kapan saja lewat langkah manual di bawah 👇'
            : 'Tombol install otomatis belum tersedia di browser ini. Tenang, ada cara manual di bawah 👇'}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('', className)}>
      <button
        type="button"
        onClick={handleInstall}
        disabled={isPrompting}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-mint px-6 py-4 text-base font-semibold text-forest shadow-[0_20px_44px_-18px_rgba(69,89,78,0.6)] ring-1 ring-forest/10 transition-all duration-200 hover:bg-mint-soft hover:shadow-[0_24px_48px_-18px_rgba(69,89,78,0.65)] active:scale-[0.98] disabled:opacity-70 sm:text-lg"
      >
        {isPrompting ? (
          <Loader2 className="size-5 animate-spin" strokeWidth={2.4} />
        ) : (
          <Download className="size-5" strokeWidth={2.4} />
        )}
        {isPrompting ? 'Membuka dialog install…' : 'Install CatetInd Sekarang'}
      </button>
      <p className="mt-2.5 text-center text-xs text-ink/45">
        Gratis · Tanpa App Store · Ikonnya langsung nongol di Homescreen
      </p>
    </div>
  )
}
