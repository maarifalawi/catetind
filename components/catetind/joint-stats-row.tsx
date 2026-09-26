'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import {
  JOINT_ME,
  JOINT_PARTNER,
  JOINT_PREV_MONTH_TOTAL,
  categoryBreakdown,
  categoryEmoji,
  categoryLabel,
  moneyLabel,
  type JointPerson,
  type JointTransaction,
  type SettlementState,
} from '@/lib/data/joint'
import { cn } from '@/lib/utils'

/* ── Monthly Stats Row (Section 4) ───────────────────────────────────────────
   Tiga kartu mungil: Total Bersama · Jon bayar · Dany bayar. Kartunya bisa
   di-tap dan MENGEMBANG jadi rincian per kategori — jadi angka besar di
   halaman ini selalu bisa "dibongkar" tanpa pindah halaman.

   Angka kartu = LAPISAN 1 di `lib/data/joint.ts`: seluruh uang yang keluar
   dari kantong tiap orang bulan ini, termasuk traktiran & transaksi 🔒 Privat
   (audit #3 — nominal privat wajib ikut hitungan beban). Yang lebih kecil
   (patungan saja) ada di panci timbangan, lihat `weighedPaidBy()`.

   Mobile: deret satu baris yang bisa digeser (1×3 horizontal scroll).
   Desktop: grid tiga kolom.
   ────────────────────────────────────────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

type StatId = 'total' | 'me' | 'partner'

export function JointStatsRow({
  settlement,
  transactions,
  masked,
  me = JOINT_ME,
  partner = JOINT_PARTNER,
}: {
  settlement: SettlementState
  transactions: JointTransaction[]
  masked: boolean
  me?: JointPerson
  partner?: JointPerson
}) {
  const [openCard, setOpenCard] = useState<StatId | null>(null)

  /* tren vs bulan lalu — turun = kabar baik untuk pengeluaran (olive) */
  const trendPct =
    JOINT_PREV_MONTH_TOTAL === 0
      ? 0
      : Math.round(
          ((settlement.totalSpent - JOINT_PREV_MONTH_TOTAL) / JOINT_PREV_MONTH_TOTAL) * 100,
        )
  const spendingDown = trendPct < 0

  const breakdown = categoryBreakdown(
    transactions,
    openCard === 'me' ? me.id : openCard === 'partner' ? partner.id : undefined,
  )

  const toggle = (id: StatId) => setOpenCard((prev) => (prev === id ? null : id))

  return (
    <div className="mt-4">
      <div className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        <StatCard
          label="Total Bersama"
          value={moneyLabel(settlement.totalSpent, masked)}
          hint="bulan ini"
          active={openCard === 'total'}
          onClick={() => toggle('total')}
          trend={
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                spendingDown ? 'bg-hud-sage/25 text-[#503a3a]' : 'bg-hud-amber/25 text-[#b89191]',
              )}
            >
              {spendingDown ? (
                <ArrowDownRight className="size-3" strokeWidth={2.8} />
              ) : (
                <ArrowUpRight className="size-3" strokeWidth={2.8} />
              )}
              {Math.abs(trendPct)}%
            </span>
          }
        />
        <StatCard
          label={`${me.name} bayar`}
          value={moneyLabel(settlement.myTotalSpent, masked)}
          hint={`(${settlement.myPct}%)`}
          avatar={me.avatar}
          tint={me.tint}
          active={openCard === 'me'}
          onClick={() => toggle('me')}
        />
        <StatCard
          label={`${partner.name} bayar`}
          value={moneyLabel(settlement.partnerTotalSpent, masked)}
          hint={`(${settlement.partnerPct}%)`}
          avatar={partner.avatar}
          tint={partner.tint}
          active={openCard === 'partner'}
          onClick={() => toggle('partner')}
        />
      </div>
      {/* rincian per kategori dari kartu yang sedang dibuka */}
      <AnimatePresence initial={false}>
        {openCard && (
          <motion.div
            key={openCard}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 rounded-[1.5rem] bg-[#fbf6d9] px-4 py-3.5 ring-1 ring-soil/[0.05]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">
                Rincian{' '}
                {openCard === 'total'
                  ? 'bersama'
                  : openCard === 'me'
                    ? `pengeluaran ${me.name}`
                    : `pengeluaran ${partner.name}`}
              </p>

              {breakdown.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-ink/45">Belum ada pengeluaran 🌱</p>
              ) : (
                <ul className="mt-2.5 space-y-2.5">
                  {breakdown.map((slice) => (
                    <li key={slice.category} className="flex items-center gap-2.5">
                      <span aria-hidden className="text-[14px]">
                        {categoryEmoji(slice.category)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[12.5px] font-semibold text-ink">
                            {categoryLabel(slice.category)}
                          </span>
                          <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink/70">
                            {moneyLabel(slice.amount, masked)}
                            <span className="ml-1 font-medium text-ink/40">{slice.pct}%</span>
                          </span>
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-soil/[0.05]">
                          <motion.span
                            initial={{ width: 0 }}
                            animate={{ width: `${slice.pct}%` }}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="block h-full rounded-full bg-hud-sage/70"
                          />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Satu kartu stat mungil — seluruh kartu adalah tombol (tap = bongkar rincian) */
function StatCard({
  label,
  value,
  hint,
  avatar,
  tint,
  trend,
  active,
  onClick,
}: {
  label: string
  value: string
  hint: string
  avatar?: string
  tint?: string
  trend?: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cn(
        'w-[152px] shrink-0 snap-start rounded-[1.25rem] px-3.5 py-3 text-left transition-all duration-200 sm:w-auto',
        'ring-1 active:scale-[0.98]',
        active
          ? 'bg-forest text-cream ring-forest shadow-[0_18px_36px_-26px_rgba(69,89,78,0.95)]'
          : 'bg-[#fbf6d9] ring-soil/[0.05] hover:bg-cream',
      )}
    >
      <span className="flex items-center gap-1.5">
        {avatar && tint && (
          <span
            aria-hidden
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ring-1',
              tint,
            )}
          >
            {avatar}
          </span>
        )}
        <span
          className={cn(
            'truncate text-[11px] font-semibold',
            active ? 'text-cream/70' : 'text-ink/50',
          )}
        >
          {label}
        </span>
        {trend}
      </span>

      <span
        className={cn(
          'mt-1.5 block truncate text-[15px] font-black tabular-nums tracking-tight',
          active ? 'text-cream' : 'text-ink',
        )}
      >
        {value}
      </span>
      <span className={cn('mt-0.5 block text-[10.5px]', active ? 'text-cream/60' : 'text-ink/40')}>
        {hint}
      </span>
    </button>
  )
}
