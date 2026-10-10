'use client'

import { HOME_HUD_COPY, hudMeter } from '@/lib/data/budget'

/* ── CINCIN PEMAKAIAN JATAH — visual utama kartu "Jatah Hari Ini" /budget ─────
   REDESAIN (paket 82). Kartu Jatah Hari Ini di /budget adalah kartu super-hero
   full-width; di layar selebar itu, satu busur yang menutup rapi lebih tenang
   dibaca daripada bar segmen yang memanjang tanpa ujung. Jadi hero /budget
   memakai CINCIN ini, sementara kartu Jatah Hari Ini yang padat di Dashboard
   tetap memakai `HudMeter` (bar segmen) — dua permukaan boleh berbeda RAGAM
   visual, tapi TIDAK boleh berbeda angka:

     · angka cincin = `hudMeter(todayUsedPct)` — fungsi MURNI yang sama dengan
       `HudMeter`, membaca `todayUsedPct` dari `computeDailyHud()`;
     · warna = `HOME_HUD_COPY.status` — tiga warna kanon PRD 2B.2, sumber yang
       sama dengan chip status di Home (satu makna, satu warna).

   A11y: satu `role="img"` ber-`aria-label` yang menyebut persennya; SVG-nya
   `aria-hidden` supaya angkanya tidak dibaca dua kali. Animasi isian dihormati
   `prefers-reduced-motion` lewat `motion-reduce:transition-none`. */

export function HudRing({
  usedPct,
  ariaLabel,
  size = 80,
  stroke = 7,
  tone = 'dark',
}: {
  /** porsi jatah hari ini yang terpakai (0..1) — dari `computeDailyHud` */
  usedPct: number
  /** kalimat yang dibaca pembaca layar (mis. dari `HUD_COPY.ringAria`) */
  ariaLabel: string
  /** diameter cincin (px) */
  size?: number
  /** tebal busur (px) */
  stroke?: number
  /** 'dark' = di atas permukaan forest (track putih transparan), 'light' = di atas putih */
  tone?: 'light' | 'dark'
}) {
  const model = hudMeter(usedPct)
  const fill = HOME_HUD_COPY.status[model.status].ring
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const percentLabel = `${Math.round(model.usedPct * 100)}%`

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        {/* track — Oat pudar di atas putih, putih transparan di atas forest */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={tone === 'dark' ? 'stroke-cream/15' : 'stroke-soil/10'}
        />
        {/* busur pemakaian — mulai 12 arah jarum jam (SVG diputar -90°) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={fill}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - model.usedPct)}
          className="transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
      </svg>
      <span
        className={
          tone === 'dark'
            ? 'absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-cream tabular-nums'
            : 'absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-forest tabular-nums'
        }
      >
        {percentLabel}
      </span>
    </span>
  )
}
