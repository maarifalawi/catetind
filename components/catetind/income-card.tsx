'use client'

import { Banknote, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HOME_INCOME_COPY } from '@/lib/data/home'
import type { HomeIncomeStats } from '@/lib/data/home-money'
import { usePrivacy } from './privacy-provider'

/* ── KARTU "PEMASUKAN" DI PANEL RINGKASAN SALDO ──────────────────────────────
   REDESAIN (paket 82). Keluhan pemilik produk berturut-turut: blok ini kaku,
   berat, dan "UI-nya sangat amat buruk" — permintaannya: modern & minimalist.

   Sebelumnya kartunya gelap penuh (gradien `forest` → hitam) di dalam panel
   putih, dengan angka menempel kiri, badge persen menggantung di kanan atas,
   dan grafik 6 bulan tanpa satu pun pemisah.

   Bentuk barunya SATU KARTU PUTIH (kanon palet: kartu = putih + hairline +
   shadow, bukan gradien gelap) yang dibaca dari atas ke bawah sebagai satu
   kalimat:

     · kepala   : ikon mint + nama kartu  |  chip bulan berjalan (Oat)
     · angka    : nominal bulan ini (hero, semibold)  |  badge tren + pembanding
     · pemisah  : satu garis rambut
     · grafik   : 6 bar tipis, bulan aktif mint, sisanya isian soil pudar

   Angka & kalimatnya TIDAK berubah: semuanya tetap dari `incomeStatsFor()`
   (`lib/data/home-money.ts`) dan `HOME_INCOME_COPY` (`lib/data/home.ts`).
   Yang dilepas cuma pengulangan: keterangan "Total pemasukan bulan ini" (judul
   kartu sudah bilang "Pemasukan", chip bulan sudah menyebut bulannya) dan label
   nilai melayang di atas bar yang menutupi bar tetangga. ───────────────────── */

export function IncomeCard({ stats }: { stats: HomeIncomeStats }) {
  const { money } = usePrivacy()
  /* skala bar dari nilai terbesar yang ADA — bukan konstanta */
  const max = Math.max(1, ...stats.series.map((point) => point.value))
  const hasIncome = stats.series.some((point) => point.value > 0)
  /* pembanding hanya saat bisa dihitung (bulan lalu ada pemasukan) */
  const hasBaseline = stats.changePct !== null
  const up = (stats.changePct ?? 0) >= 0
  const TrendIcon = up ? TrendingUp : TrendingDown

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 shadow-[0_20px_44px_-36px_rgba(0,0,0,0.5)]">
      {/* aksen lembut di sudut — satu-satunya elemen "bersinar", bukan gradien
          gelap penuh yang menabrak gaya panel */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-mint/15 blur-3xl"
      />

      {/* kepala: ikon + nama kartu, lalu chip bulan berjalan */}
      <div className="relative flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-mint/25 text-forest">
            <Banknote className="size-3.5" strokeWidth={2.4} aria-hidden />
          </span>
          <span className="text-[13px] font-medium text-forest">{HOME_INCOME_COPY.label}</span>
        </span>
        <span className="rounded-full bg-sage px-2.5 py-1 text-[10.5px] font-medium text-forest/55">
          {stats.monthLabel}
        </span>
      </div>

      {/* angka utama + pembanding — satu baris, rata dasar supaya tidak ada
          ruang kosong lebar di antaranya */}
      <div className="relative mt-5 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <p className="text-[30px] font-semibold leading-none tracking-tight text-forest tabular-nums sm:text-[34px]">
          {money(stats.thisMonth)}
        </p>
        {hasBaseline ? (
          <span className="flex items-center gap-1.5 pb-0.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
                up ? 'bg-mint/25 text-forest' : 'bg-plum/15 text-plum',
              )}
            >
              <TrendIcon className="size-3" strokeWidth={2.8} aria-hidden />
              {up ? '+' : ''}
              {stats.changePct}%
            </span>
            <span className="text-[11px] text-forest/45">{HOME_INCOME_COPY.vsLastMonth}</span>
          </span>
        ) : (
          /* belum ada pembanding (bulan lalu Rp 0): sebut pembandingnya, bukan
             persen karangan */
          <span className="pb-0.5 text-[11px] text-forest/45">{HOME_INCOME_COPY.vsLastMonth}</span>
        )}
      </div>

      {/* pemisah + grafik bulanan — dari seri bulan NYATA */}
      <div className="relative mt-5 border-t border-soil/10 pt-4">
        {hasIncome ? (
          <>
            <div className="flex h-16 items-end gap-2">
              {stats.series.map((point, i) => (
                <div key={point.key} className="group/bar relative flex h-full flex-1 items-end">
                  <div
                    className={cn(
                      'w-full origin-bottom animate-[bar-grow_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full motion-reduce:animate-none',
                      point.active
                        ? 'bg-gradient-to-t from-mint/70 to-mint'
                        : 'bg-soil/[0.07] transition-colors duration-300 group-hover/bar:bg-soil/[0.12]',
                    )}
                    style={{
                      height: `${Math.max(6, (point.value / max) * 100)}%`,
                      animationDelay: `${120 + i * 45}ms`,
                    }}
                  />
                </div>
              ))}
            </div>
            {/* label bulan — bulan aktif ditegaskan, sisanya redup */}
            <div className="mt-2 flex gap-2">
              {stats.series.map((point) => (
                <span
                  key={point.key}
                  className={cn(
                    'flex-1 text-center text-[9.5px] font-medium',
                    point.active ? 'text-forest' : 'text-forest/35',
                  )}
                >
                  {point.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          /* saat belum ada pemasukan, yang muncul penjelasan jujur, bukan bar contoh */
          <div className="rounded-2xl bg-sage/50 px-4 py-5 text-center">
            <p className="text-[12.5px] font-medium text-forest">{HOME_INCOME_COPY.emptyTitle}</p>
            <p className="mt-1 text-[11px] text-forest/50">{HOME_INCOME_COPY.emptyHint}</p>
          </div>
        )}
      </div>
    </section>
  )
}
