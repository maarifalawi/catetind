import type { LandingSectionMarker } from '@/lib/data/landing'
import { cn } from '@/lib/utils'

/* ── PENANDA ANTAR-SECTION LANDING ──────────────────────────────────────────
   Satu garis rambut penuh dengan nomor + nama section di tengah. Dipasang DI
   ANTARA section (bukan di dalam), jadi batas tiap bagian terbaca tanpa
   menambah kartu atau latar baru. `aria-hidden` karena heading section sudah
   memberi struktur yang sama untuk pembaca layar. */

export function LandingSectionDivider({
  marker,
  className,
}: {
  marker: LandingSectionMarker
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn('w-full bg-canvas px-5 landing-tab:px-10', className)}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3">
        <span className="h-px flex-1 bg-soil/10" />
        <span className="inline-flex items-center gap-2 text-[10.5px] leading-none font-medium tracking-[0.18em] text-forest/45 uppercase">
          <span className="tabular-nums text-forest/30">{marker.index}</span>
          <span className="size-0.5 rounded-full bg-forest/30" />
          {marker.label}
        </span>
        <span className="h-px flex-1 bg-soil/10" />
      </div>
    </div>
  )
}