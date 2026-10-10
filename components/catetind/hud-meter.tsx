'use client'

import { cn } from '@/lib/utils'
import { HOME_HUD_COPY, hudMeter } from '@/lib/data/budget'

/* ── METER JATAH HARIAN — BAR SEGMEN h-2 (paket 76) ──────────────────────────
   "Biarkan visualnya yang berbicara." Kartu Jatah Hari Ini dulu menjejalkan
   penjelasan panjang (baris "Setelah dipotong cicilan … & celengan …") di kartu
   /budget, dan bar kontinu `h-3` di kartu Home. Sekarang keduanya memakai SATU
   visual premium yang sama: bar SEGMEN `h-2` bulat penuh.

   Kenapa SEGMEN, bukan bar kontinu lagi:
     · ia terbaca sebagai "seberapa penuh jatahku" dalam sekali lirik, lebih
       jujur daripada satu blok mulus yang menyembunyikan porsi diskret;
     · warnanya mengikuti tiga status kanon PRD 2B.2 (sage/amber/terracotta)
       lewat `HOME_HUD_COPY.status` — sumber warna yang SAMA dengan chip status.

   Angkanya TIDAK dihitung di sini: `hudMeter()` (fungsi murni di
   `lib/data/budget.ts`) yang memetakan porsi terpakai → jumlah segmen + status.
   Komponen ini cuma menggambar, jadi ia tak bisa berbeda dari kartu yang lain.

   A11y: satu `role="progressbar"` yang bisa dibaca (segmennya sendiri
   `aria-hidden`) + `aria-valuenow` persen. Animasi fill dihormati
   `prefers-reduced-motion` lewat `motion-reduce:transition-none`. */
export function HudMeter({
  usedPct,
  ariaLabel,
  className,
}: {
  /** porsi jatah hari ini yang terpakai (0..1) — dari `computeDailyHud` */
  usedPct: number
  /** nama yang dibaca pembaca layar (mis. "Jatah Hari Ini") */
  ariaLabel: string
  /** jarak/lebar dari pemanggil — meter selalu mengisi lebar kontainernya */
  className?: string
}) {
  const model = hudMeter(usedPct)
  const fill = HOME_HUD_COPY.status[model.status].ring

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(model.usedPct * 100)}
      className={cn('flex h-2 w-full items-stretch gap-1', className)}
    >
      {Array.from({ length: model.total }, (_, index) => {
        const on = index < model.filled
        return (
          <span
            key={`hud-meter-${index}`}
            aria-hidden
            className={cn(
              'flex-1 rounded-full transition-colors duration-500 ease-out motion-reduce:transition-none',
              /* segmen kosong pakai dasar soil pudar yang sama dengan bar lama */
              !on && 'bg-soil/[0.09]',
            )}
            style={on ? { backgroundColor: fill } : undefined}
          />
        )
      })}
    </div>
  )
}
