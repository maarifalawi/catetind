import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * InstallRewardBanner — "bribe" terakhir di halaman /install.
 *
 * Bonus sengaja dikunci di balik pembukaan app dari Homescreen (standalone),
 * karena itulah aksi yang paling kuat membuat kebiasaan pakai PWA terbentuk.
 */
export function InstallRewardBanner({ className }: { className?: string }) {
  return (
    <section className={cn('mt-6', className)}>
      {/* TODO: Detect standalone mode via window.matchMedia('(display-mode: standalone)') and trigger reward claim API on first standalone launch. */}
      <div className="relative overflow-hidden rounded-3xl bg-forest p-5 text-cream ring-1 ring-forest/20 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-full bg-mint/20 blur-2xl"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-mint uppercase">
            <Sparkles className="size-3" strokeWidth={2.4} />
            Bonus Eksklusif
          </span>

          <h2 className="mt-3 text-lg leading-snug font-semibold sm:text-xl">
            🎁 Bonus Eksklusif! Install CatetInd dan buka app dari Homescreen untuk langsung
            dapat:
          </h2>

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <li className="flex items-center gap-2.5 rounded-2xl bg-cream/10 px-3.5 py-3 ring-1 ring-cream/10">
              <span className="text-base">💚</span>
              <span className="text-sm font-medium">+100 Nyawa AI gratis</span>
            </li>
            <li className="flex items-center gap-2.5 rounded-2xl bg-cream/10 px-3.5 py-3 ring-1 ring-cream/10">
              <span className="text-base">🪴</span>
              <span className="text-sm font-medium">Skin Pot Emas untuk Tanamanmu</span>
            </li>
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-cream/60">
            Bonus otomatis masuk ke akunmu saat pertama kali buka CatetInd dari Homescreen.
          </p>
        </div>
      </div>
    </section>
  )
}
