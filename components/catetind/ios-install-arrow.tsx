import { ArrowDown } from 'lucide-react'

// This floating arrow guides iOS users to Safari's Share button, since iOS doesn't support beforeinstallprompt API.

/**
 * IosInstallArrow — panah melayang khusus iOS Safari.
 *
 * Diposisikan dengan `env(safe-area-inset-bottom)` supaya duduk tepat di atas
 * toolbar Safari di semua model iPhone (termasuk yang ada notch/Dynamic Island),
 * dan tetap di atas bottom nav aplikasi. `show` dikendalikan halaman: hilang
 * begitu user sudah lewat langkah-langkah tutorial, sudah terpasang, atau
 * sedang membuka daftar panduan perangkat lain.
 */
export function IosInstallArrow({ show }: { show: boolean }) {
  if (!show) return null

  return (
    <div
      aria-hidden
      /* bottom = tinggi toolbar Safari + safe area iPhone + tinggi bottom nav app */
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.75rem)' }}
      className="pointer-events-none fixed inset-x-0 z-30 flex items-center justify-center gap-2 px-5"
    >
      <span className="rounded-full bg-forest px-3.5 py-2 text-[11px] font-semibold text-cream shadow-[0_14px_30px_-12px_rgba(16,58,42,0.6)]">
        Tap tombol ini dulu ya! 👇
      </span>
      <span className="animate-install-arrow-bounce flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-forest shadow-[0_14px_30px_-12px_rgba(16,58,42,0.6)] ring-1 ring-forest/15 motion-reduce:animate-none">
        <ArrowDown className="size-5" strokeWidth={2.6} />
      </span>
    </div>
  )
}
