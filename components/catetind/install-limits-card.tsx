import { Bell, ShieldCheck, WifiOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INSTALL_LIMITS, type InstallLimitIconKey } from '@/lib/data/install'
import { InfoNote } from './info-note'

/* ── Batasan PWA di halaman /install ─────────────────────────────────────────
   Kartu ini adalah pasangan jujur dari tiga kartu benefit di hero: bukan
   menakuti, tapi memberi tahu apa yang TIDAK bisa dijanjikan (PRD 4A + aturan
   copy PRD 5.6 — "jangan pernah memberi false promise"). Trust dibangun justru
   dari keberanian menyebut batas sebelum user menemukannya sendiri.

   Ikon dipetakan di sini (bukan di lib/data) supaya file data tetap bebas React.
   ─────────────────────────────────────────────────────────────────────────── */

const LIMIT_ICON: Record<InstallLimitIconKey, LucideIcon> = {
  bell: Bell,
  offline: WifiOff,
}

export function InstallLimitsCard({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'rounded-3xl bg-cream/85 p-4 ring-1 ring-soil/12 backdrop-blur-xl sm:p-5',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <ShieldCheck className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-forest">{INSTALL_LIMITS.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-forest/50">{INSTALL_LIMITS.blurb}</p>
        </div>
      </header>

      {/* AUDIT "CLEAN UI" (paket 63): dulu setiap batas langsung membuka dua baris
          penjelasan, jadi kartu ini terbaca seperti disclaimer. Sekarang yang
          tampil cuma judulnya; penjelasannya di balik satu tap (InfoNote). */}
      <ul className="mt-3 space-y-2">
        {INSTALL_LIMITS.points.map((point) => {
          const Icon = LIMIT_ICON[point.icon]
          return (
            <li key={point.title} className="rounded-2xl bg-sage/50 px-3.5 py-3 ring-1 ring-forest/10">
              <InfoNote
                bare
                compact
                tone="calm"
                icon={Icon}
                title={point.title}
                label={INSTALL_LIMITS.detailLabel}
              >
                {point.desc}
              </InfoNote>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
