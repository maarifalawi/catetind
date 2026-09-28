'use client'

import Link from 'next/link'
import { BarChart3, DollarSign, LineChart, Users } from 'lucide-react'
import { BALANCE_RING_COPY } from '@/lib/data/home'
import { usePrivacy } from './privacy-provider'

const SIZE = 240
const STROKE = 12
const R = (SIZE - STROKE) / 2 - 6
const C = 2 * Math.PI * R
const PROGRESS = 0.72

const GROWTH_PATH =
  'M2 36 C 12 30, 20 35, 32 27 S 52 31, 64 21 S 88 25, 102 15 S 126 13, 138 5'

/**
 * Donat saldo di panel "Your Balance Overview".
 *
 * `amount` + `caption` dikirim dari kartu yang sedang dipencet user di deck
 * dompet (kartu BCA → saldo BCA, kartu GoPay → saldo GoPay). Kartu "Semua
 * Dompet" mengirim total gabungan. Angka akan pop tiap kali nilainya berubah.
 */
export function BalanceRing({
  amount = 4309573,
  caption = 'Total saldo',
  trend = '-27%',
}: {
  /** saldo yang ditampilkan di tengah donat (Rp) */
  amount?: number
  /** label kecil di bawah nominal — nama dompet atau "Total saldo" */
  caption?: string
  /** badge persentase (mock) di bawah caption */
  trend?: string
} = {}) {
  const { money } = usePrivacy()
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="relative aspect-square">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full -rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#45594e" />
              <stop offset="55%" stopColor="#45594e" />
              <stop offset="100%" stopColor="#91bb9e" />
            </linearGradient>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#ebe4de"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${C * PROGRESS} ${C}`}
          />
        </svg>

        {/* $ badge on top */}
        <span className="absolute left-1/2 top-1 flex size-9 -translate-x-1/2 items-center justify-center rounded-full bg-forest text-mint ring-4 ring-cream">
          <DollarSign className="size-4" strokeWidth={2.5} />
        </span>

        {/* center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* balance growth chart */}
          <svg
            viewBox="0 0 140 44"
            className="mb-1 h-11 w-36 overflow-visible"
            fill="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#91bb9e" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#91bb9e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="growthStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#45594e" />
                <stop offset="100%" stopColor="#91bb9e" />
              </linearGradient>
            </defs>
            {/* grid lines */}
            <line
              x1="0"
              y1="14"
              x2="140"
              y2="14"
              stroke="#000000"
              strokeOpacity="0.09"
              strokeDasharray="3 4"
            />
            <line
              x1="0"
              y1="29"
              x2="140"
              y2="29"
              stroke="#000000"
              strokeOpacity="0.09"
              strokeDasharray="3 4"
            />
            {/* area fill */}
            <path
              d={`${GROWTH_PATH} L 138 44 L 2 44 Z`}
              fill="url(#growthFill)"
              className="animate-[area-fade_0.9s_ease_0.5s_both]"
            />
            {/* growth line */}
            <path
              d={GROWTH_PATH}
              stroke="url(#growthStroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              className="animate-[line-draw_1.2s_cubic-bezier(0.4,0,0.2,1)_both]"
            />
            {/* end point */}
            <circle cx="138" cy="5" r="5.5" fill="#91bb9e" opacity="0.25" />
            <circle
              cx="138"
              cy="5"
              r="2.8"
              fill="#91bb9e"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
          <div className="flex items-center gap-1.5">
            {/* key={amount} → elemen remount & animasi pop terputar ulang tiap
                kali kartu yang dipencet berganti, jadi mata user langsung
                tertuju ke saldo dompet yang baru dipilih */}
            <span
              key={amount}
              className="animate-[fade-pop_0.4s_ease-out] text-2xl font-semibold tracking-tight text-ink tabular-nums"
            >
              {money(amount)}
            </span>
          </div>
          <span className="mt-0.5 max-w-[9.5rem] truncate text-xs text-ink/45">{caption}</span>
          <span className="mt-2 rounded-full bg-forest px-2 py-0.5 text-[10px] font-semibold text-mint">
            {trend}
          </span>
        </div>
      </div>

      {/* orbiting quick buttons — tiga pintasan yang benar-benar ada halamannya.
          Sebelumnya ketiganya MATI (button tanpa onClick, aria-label generik
          "Quick action"), padahal donat ini tampil di Home lewat overview-panel. */}
      <OrbitButton
        href="/joint"
        label={BALANCE_RING_COPY.jointLabel}
        className="left-0 top-1/2"
        icon={<Users className="size-4" aria-hidden />}
      />
      <OrbitButton
        href="/history"
        label={BALANCE_RING_COPY.chartLabel}
        className="right-0 top-1/2"
        icon={<BarChart3 className="size-4" aria-hidden />}
      />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
        <Link
          href="/history"
          aria-label={BALANCE_RING_COPY.insightsLabel}
          className="flex size-14 items-center justify-center rounded-full bg-mint text-forest shadow-[0_12px_28px_-8px_rgba(145,187,158,0.9)] ring-4 ring-cream transition-transform active:translate-y-px"
        >
          <LineChart className="size-5" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>
    </div>
  )
}

function OrbitButton({
  href,
  label,
  className,
  icon,
}: {
  /** halaman tujuan — orbit selalu jadi tautan, bukan tombol mati */
  href: string
  /** nama aksinya untuk pembaca layar (bukan "Quick action" yang kabur) */
  label: string
  className: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`absolute flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-transform active:translate-y-[calc(-50%+1px)] ${className}`}
    >
      {icon}
    </Link>
  )
}
