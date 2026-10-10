'use client'

import Link from 'next/link'
import { BarChart3, LineChart, Users } from 'lucide-react'
import { BALANCE_RING_COPY } from '@/lib/data/home'
import { usePrivacy } from './privacy-provider'

/* ── DONAT SALDO DI PANEL "RINGKASAN SALDO" ──────────────────────────────────
   REDESAIN (paket 82). Panel ini dibuka dari kartu dompet di Dashboard.

   Yang DIHAPUS dari versi lama — semuanya visual yang mengklaim data yang tidak
   ada, dan itu yang membuat panel terasa "UI-nya buruk":
     · busur progres `PROGRESS = 0.72` — SELALU 72% untuk dompet apa pun (angka
       karangan tepat di muka panel yang isinya nominal sungguhan);
     · grafik garis `GROWTH_PATH` — kurva naik statis, bukan saldo user;
     · tiga tombol yang MENGAPUNG di tepi donat (kiri/kanan/bawah) dan saling
       menabrak tepi cincin saat panel sempit.

   Yang tersisa: satu cincin tipis dekoratif (track Oat + cincin gradien
   forest→mint yang PENUH, jadi ia tidak menyatakan persentase apa pun), nominal
   di tengah, lalu SATU baris pintasan ikon yang rata di bawahnya. Nominalnya
   tetap `amount` + `caption` dari kartu yang dipencet user, dan badge `trend`
   tetap persen NYATA (arus bersih bulan ini vs bulan lalu). ─────────────────── */

const SIZE = 200
const STROKE = 10
const R = (SIZE - STROKE) / 2 - 2

export function BalanceRing({
  amount = 0,
  caption = 'Total saldo',
  trend,
}: {
  /** saldo yang ditampilkan di tengah donat (Rp) */
  amount?: number
  /** label kecil di bawah nominal — nama dompet atau "Total saldo" */
  caption?: string
  /** badge persentase NYATA (arus bersih bulan ini vs bulan lalu); `undefined` = disembunyikan */
  trend?: string
} = {}) {
  const { money } = usePrivacy()
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative mx-auto size-[200px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#45594e" />
              <stop offset="100%" stopColor="#91bb9e" />
            </linearGradient>
          </defs>
          {/* track Oat */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#ebe4de" strokeWidth={STROKE} />
          {/* cincin penuh — dekoratif, bukan persentase */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </svg>

        {/* isi tengah: nominal + nama dompet + badge tren nyata */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {/* key={amount} → elemen remount & animasi pop terputar ulang tiap kali
              kartu yang dipencet berganti, jadi mata user langsung tertuju ke
              saldo dompet yang baru dipilih */}
          <span
            key={amount}
            className="animate-[fade-pop_0.4s_ease-out] text-[26px] font-semibold leading-none tracking-tight text-forest tabular-nums"
          >
            {money(amount)}
          </span>
          <span className="mt-1.5 max-w-full truncate text-[11.5px] text-forest/45">{caption}</span>
          {trend && (
            <span className="mt-2 rounded-full bg-forest px-2 py-0.5 text-[10px] font-medium text-mint">
              {trend}
            </span>
          )}
        </div>
      </div>

      {/* pintasan — satu baris rata, bukan tombol mengambang yang menabrak cincin */}
      <div className="mt-5 flex items-center justify-center gap-2.5">
        <RingShortcut href="/joint" label={BALANCE_RING_COPY.jointLabel}>
          <Users className="size-4" aria-hidden />
        </RingShortcut>
        <RingShortcut href="/history" label={BALANCE_RING_COPY.chartLabel}>
          <BarChart3 className="size-4" aria-hidden />
        </RingShortcut>
        <RingShortcut href="/history" label={BALANCE_RING_COPY.insightsLabel} primary>
          <LineChart className="size-4" strokeWidth={2.4} aria-hidden />
        </RingShortcut>
      </div>
    </div>
  )
}

/** pintasan ikon di bawah donat — selalu tautan ke halaman yang benar-benar ada */
function RingShortcut({
  href,
  label,
  primary = false,
  children,
}: {
  href: string
  label: string
  primary?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={
        primary
          ? 'flex size-11 items-center justify-center rounded-full bg-forest text-cream shadow-[0_12px_26px_-14px_rgba(69,89,78,0.9)] transition-colors hover:bg-forest-soft active:scale-95'
          : 'flex size-11 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage/70 active:scale-95'
      }
    >
      {children}
    </Link>
  )
}
