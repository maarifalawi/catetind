'use client'

import { memo, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChartPie, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import {
  HOME_DISTRIBUTION_PALETTE,
  HOME_MONEY_COPY,
  distributionSegments,
  homeMoneyRowFrom,
} from '@/lib/data/home-money'
import { recordedTransactions, useMoneyStore } from '@/lib/money/store'
import { useTodayISO } from '@/lib/use-today-iso'
import { usePrivacy } from './privacy-provider'

/* ── Distribusi Pengeluaran — TURUNAN dari catatan NYATA user (paket 58) ─────
   Dulu kartu ini menulis sendiri `SEGMENTS` (Makanan 1.260.000 · Transport
   819.000 · Tagihan 630.000 · Belanja 441.000) + `TOTAL = 3_150_000`. Angka itu
   tidak berasal dari mana pun: setelah user mengosongkan seluruh datanya,
   kartunya tetap menampilkan empat segmen contoh (temuan AKAR A + #11 audit
   2026-09) — dan di Home yang sama ia bercerita berbeda dengan kartu "Arus
   Uang" (752.000) maupun Jatah Hari Ini (2.300.000). Justru itu yang dilarang
   kanon "jujur di setiap klaim" (PRD 244).

   Sekarang sumbernya SATU, sama dengan kartu-kartu uang Home lainnya: baris
   ledger NYATA dari `useMoneyStore()` yang diturunkan murni oleh
   `distributionSegments()` (`lib/data/home-money.ts`, teruji). Segmen = kategori
   PENGELUARAN user di bulan berjalan — sejalan dengan label "Bulan ini" yang
   kartu ini nyatakan — diurutkan menurun, dan kategori ke-5+
   digabung jujur ke `Lainnya` supaya lebar bar tetap bisa dibaca.

   Tanpa pengeluaran → EMPTY STATE (temuan #11), bukan 4 segmen contoh.

   Paletnya tetap 4 warna kanon (olive · thistle · cantelope · plum — audit #3):
   warnanya rotasi menurut URUTAN segmen, bukan menurut nama kategori, karena
   kategorinya sekarang datang dari catatan user sendiri. */

/* palet kanon SAMA dengan donut Rekap Mingguan (`lib/data/home-money.ts`) —
   satu konstanta, dua permukaan, jadi warna kategori tidak bisa berbeda */
const PALETTE = HOME_DISTRIBUTION_PALETTE

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup (lihat catatan di
 *  cash-flow-card.tsx). Membaca context privasi global untuk menyensor nominal. */
export const ExpenseDistributionCard = memo(function ExpenseDistributionCard() {
  const { money } = usePrivacy()
  const [active, setActive] = useState<number | null>(null)
  /* "hari ini" dari jam perangkat — `''` pada render pertama (hidrasi aman) */
  const today = useTodayISO()
  const snapshot = useMoneyStore()

  /* baris bulan berjalan: ledger NYATA, bukan `HOME_MONEY_ROWS` (seed demo sudah
     berhenti jadi sumber angka Home sejak paket 58). Sebelum mount (`today`
     masih '') seluruh baris dipakai apa adanya — server & render pertama client
     identik karena snapshot server memang kosong. */
  const segments = useMemo(() => {
    const rows = recordedTransactions(snapshot).map(homeMoneyRowFrom)
    const inMonth = today
      ? rows.filter((row) => row.date.slice(0, 7) === today.slice(0, 7))
      : rows
    return distributionSegments(inMonth)
  }, [snapshot, today])

  const total = segments.reduce((sum, seg) => sum + seg.amount, 0)
  const activeSeg = active === null ? null : (segments[active] ?? null)

  /* posisi awal kumulatif tiap segmen - untuk tooltip */
  const starts: number[] = []
  {
    let acc = 0
    for (const seg of segments) {
      starts.push(acc)
      acc += seg.pct
    }
  }

  return (
    <div className="flex flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12">
      {/* header - konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-sage text-forest">
            <ChartPie className="size-3.5" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{HOME_MONEY_COPY.distributionTitle}</p>
            <p className="text-[10px] text-ink/45">{HOME_MONEY_COPY.period}</p>
          </div>
        </div>
        {segments.length > 0 && (
          <span className="rounded-full bg-sage px-2 py-0.5 text-[10px] font-semibold text-forest tabular-nums">
            {money(total)}
          </span>
        )}
      </div>

      {segments.length === 0 ? (
        /* ── EMPTY STATE (temuan #11) — dulu kartu ini tidak punya cabang ini,
              jadi saat data kosong ia tetap menggambar 4 segmen contoh. CTA-nya
              nyata: membuka panel input (pola kartu Transaksi Terakhir) dan
              tautan ke Riwayat yang memang menyimpan catatannya. */
        <div className="mx-2 mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sage text-forest">
            <ChartPie className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">
            {HOME_MONEY_COPY.distributionEmptyTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink/50">
            {HOME_MONEY_COPY.distributionEmptyBody}
          </p>
          <TransactionBottomSheet
            trigger={
              <button
                type="button"
                className="mt-4 rounded-full bg-forest px-5 py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {HOME_MONEY_COPY.distributionEmptyCta}
              </button>
            }
          />
          <Link
            href="/history"
            className="mt-2.5 text-[11.5px] font-semibold text-forest transition-colors hover:text-forest-soft"
          >
            {HOME_MONEY_COPY.historyLink}
          </Link>
        </div>
      ) : (
        <>
          {/* segmented horizontal bar + tooltip mengambang */}
          <div className="relative mt-5">
            {activeSeg !== null && active !== null && (
              <div
                key={activeSeg.label}
                className="pointer-events-none absolute bottom-[calc(100%+10px)] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-cream shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] animate-[fade-pop_0.25s_ease_both] motion-reduce:animate-none"
                style={{
                  left: `clamp(64px, ${starts[active] + activeSeg.pct / 2}%, calc(100% - 64px))`,
                }}
              >
                {money(activeSeg.amount)} - {activeSeg.pct}%
                <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45 rounded-[2px] bg-ink" />
              </div>
            )}

            {/* satu bar penuh, tiap kategori satu segmen dengan celah tipis */}
            <div className="flex h-2.5 w-full gap-[3px]">
              {segments.map((seg, i) => {
                const isActive = active === i
                const dimmed = active !== null && !isActive
                return (
                  <button
                    key={seg.label}
                    type="button"
                    aria-label={`${seg.label} ${seg.pct}% - ${money(seg.amount)}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(isActive ? null : i)}
                    className={cn(
                      'h-full cursor-pointer rounded-full outline-none transition-opacity duration-300 animate-[area-fade_0.6s_ease_backwards] motion-reduce:animate-none',
                      dimmed ? 'opacity-30' : 'opacity-100',
                    )}
                    style={{
                      width: `${seg.pct}%`,
                      backgroundColor: PALETTE[i % PALETTE.length],
                      animationDelay: `${120 + i * 90}ms`,
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* legend minimalis - dot kecil + nama kategori inline */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 break-words">
            {segments.map((seg, i) => {
              const isActive = active === i
              return (
                <button
                  key={seg.label}
                  type="button"
                  aria-pressed={isActive}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(isActive ? null : i)}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] transition-colors duration-200',
                    isActive
                      ? 'font-semibold text-ink'
                      : 'font-medium text-ink/55 hover:text-ink',
                  )}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full transition-opacity duration-300"
                    style={{
                      backgroundColor: PALETTE[i % PALETTE.length],
                      opacity: active !== null && !isActive ? 0.35 : 1,
                    }}
                  />
                  {seg.label}
                  <span className="font-semibold text-ink/40 tabular-nums">{seg.pct}%</span>
                </button>
              )
            })}
          </div>

          {/* insight dinamis - mengikuti kategori aktif (angkanya dari segmen,
              bukan kalimat tetap "Makanan 40%" seperti dulu) */}
          <div className="mt-2.5">
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-cream px-3 py-2 text-center text-[11px] leading-relaxed text-ink/55">
              <Flame className="size-3 shrink-0 text-forest" strokeWidth={2.2} />
              {activeSeg === null ? (
                <span key="insight-total" className="animate-[fade-pop_0.3s_ease_both] motion-reduce:animate-none">
                  <b className="font-semibold text-ink">{segments[0].label}</b>{' '}
                  {HOME_MONEY_COPY.distributionTopLead} - {segments[0].pct}%{' '}
                  {HOME_MONEY_COPY.distributionTopTail}
                </span>
              ) : (
                <span key={activeSeg.label} className="animate-[fade-pop_0.3s_ease_both] motion-reduce:animate-none">
                  <b className="font-semibold text-ink">{activeSeg.label}</b> -{' '}
                  {money(activeSeg.amount)} ({activeSeg.pct}% {HOME_MONEY_COPY.distributionDetailTail})
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
})
