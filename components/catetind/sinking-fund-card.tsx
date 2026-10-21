'use client'

import { CalendarDays, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTEXT_LABEL } from '@/lib/data/money-context'
import { PlantIllustration, type PlantStage as IllustrationStage } from './plant-illustration'
import {
  FUND_CARD_ACTION_COPY,
  PLANT_STAGES,
  PLANT_STAGE_INDEX,
  SINKING_FUND_CARD_COPY,
  SINKING_PER_DAY_DAYS,
  formatDeadline,
  fundPercent,
  maskNominal,
  monthlyNeeded,
  priorityStyle,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── Kartu Celengan Impian (Zona B) ──────────────────────────────────────────
   REDESAIN (paket 101) — kartu ini sekarang BERDIRI SENDIRI, bukan baris di
   dalam satu kartu daftar panjang:

     · chrome kartu sendiri: putih, ring tipis, shadow lembut, sudut 1,4rem —
       jadi batas antar celengan terbaca tanpa perlu hairline pemisah;
     · tanaman tetap ANCHOR visual di kiri (tile bergradien mint→sage);
     · prioritas & konteks jadi chip pastel kecil, bukan deretan teks + titik;
     · persen besar + nama tahap di kanan;
     · bar progres tipis ber-track sage (bukan abu-abu), isian mint→forest;
     · kaki kartu dipisah hairline: deadline (chip sage) di kiri, aksi di kanan;
     · "Setor" memakai pill mint lembut (bukan blok hijau tua) supaya lima kartu
       berturut-turut tidak terasa berat.

   `progress` diteruskan ke PlantIllustration supaya tinggi & rimbun tanaman
   benar-benar mengikuti persen (20% vs 80% tidak lagi tampak sama).
   ────────────────────────────────────────────────────────────────────────── */

export function SinkingFundCard({
  fund,
  masked,
  onOpen,
  onContribute,
  onDelete,
}: {
  fund: SinkingFundItem
  masked: boolean
  onOpen: (fund: SinkingFundItem) => void
  onContribute: (fund: SinkingFundItem) => void
  /** hapus celengan ini (opsional — kartu tetap utuh tanpa prop ini) */
  onDelete?: (fund: SinkingFundItem) => void
}) {
  const priority = priorityStyle(fund.priority)
  const percent = fundPercent(fund)
  const reached = percent >= 100
  const perMonth = monthlyNeeded(fund.target, fund.current, fund.deadline)
  const perDay = Math.round(perMonth / SINKING_PER_DAY_DAYS)
  const percentLabel = `${Math.round(percent)}%`
  /* label tahap DITURUNKAN dari persen yang sama dengan ilustrasi — jangan baca
     `fund.stage` yang bisa tertinggal dari progres sebenarnya */
  const stageLabel = reached
    ? PLANT_STAGES.bloom.label
    : percent >= 75
      ? PLANT_STAGES.flower.label
      : percent >= 50
        ? PLANT_STAGES.plant.label
        : percent >= 25
          ? PLANT_STAGES.sprout.label
          : PLANT_STAGES.seed.label

  return (
    <article
      className={cn(
        'group/card relative overflow-hidden rounded-[1.4rem] bg-cream p-3.5 ring-1 ring-soil/10',
        'shadow-[0_14px_34px_-28px_rgba(69,89,78,0.45)]',
        'transition-[box-shadow,transform] duration-300 hover:-translate-y-px hover:ring-forest/15 hover:shadow-[0_20px_40px_-28px_rgba(69,89,78,0.4)]',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-4',
      )}
    >
      {/* halo mint di sudut — dekorasi, bukan informasi */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-mint/15 blur-2xl"
      />

      <button
        type="button"
        onClick={() => onOpen(fund)}
        aria-label={SINKING_FUND_CARD_COPY.progressAria(
          fund.name,
          percentLabel,
          maskNominal(fund.current, masked),
          maskNominal(fund.target, masked),
        )}
        className="relative block w-full rounded-[1.1rem] text-left outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-mint/30 via-sage/55 to-sage/25 p-1 ring-1 ring-soil/[0.04] sm:size-[68px]">
            <PlantIllustration
              stage={PLANT_STAGE_INDEX[fund.stage] as IllustrationStage}
              progress={percent}
              className="w-12 sm:w-[52px]"
            />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-start gap-1">
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold leading-tight tracking-tight text-forest">
                {fund.name}
              </span>
              {/* affordance buka detail: seluruh badan kartu sudah bisa ditekan,
                  jadi cukup chevron — tanpa teks "Lihat detail" */}
              <ChevronRight
                className="mt-0.5 size-4 shrink-0 text-forest/25 transition-transform duration-300 group-hover/card:translate-x-0.5 motion-reduce:transition-none"
                strokeWidth={2.2}
                aria-hidden
              />
            </span>
            {/* meta dipadatkan jadi chip pastel — bukan deretan teks + titik */}
            <span className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/60 px-2 py-[3px] text-[9.5px] font-medium text-forest-muted">
                <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', priority.dot)} />
                {priority.label}
              </span>
              <span className="inline-flex items-center rounded-full bg-sage/40 px-2 py-[3px] text-[9.5px] font-medium text-forest-muted">
                {CONTEXT_LABEL[fund.scope]}
              </span>
            </span>
          </span>
        </span>

        {/* nominal + persen SEBARIS di bawah identitas — nama celengan dapat
            seluruh lebar kartu, dan target tidak lagi terpotong kolom persen */}
        <span className="mt-3 flex items-end justify-between gap-2">
          <span className="min-w-0 truncate text-[15px] font-semibold leading-none tracking-tight tabular-nums text-forest">
            {maskNominal(fund.current, masked)}
            <span className="ml-1 text-[10.5px] font-medium text-forest-muted">
              / {maskNominal(fund.target, masked)}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="font-display text-[22px] font-semibold leading-none tracking-tight tabular-nums text-forest">
              {percentLabel}
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-forest-muted">
              {stageLabel}
            </span>
          </span>
        </span>

        <span
          aria-hidden
          className="mt-3.5 block h-1.5 w-full overflow-hidden rounded-full bg-sage/70"
        >
          <span
            className="block h-full rounded-full bg-gradient-to-r from-mint to-forest/45 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </span>

        <span className="mt-2 block truncate text-[10.5px] tabular-nums text-forest-muted">
          {SINKING_FUND_CARD_COPY.perMonth(maskNominal(perMonth, masked))}
          <span className="text-forest/50">
            {' · '}
            {SINKING_FUND_CARD_COPY.perDay(maskNominal(perDay, masked))}
          </span>
        </span>
      </button>

      {/* ── KAKI KARTU — deadline di kiri, aksi di kanan, dipisah hairline
          supaya area sentuh "Setor" tidak bercampur dengan badan kartu. */}
      <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-soil/[0.06] pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-sage/50 px-2.5 py-1 text-[10px] font-medium tabular-nums text-forest-muted">
          <CalendarDays className="size-3 shrink-0" strokeWidth={2.2} aria-hidden />
          <span className="truncate">{formatDeadline(fund.deadline)}</span>
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(fund)}
              aria-label={FUND_CARD_ACTION_COPY.delete(fund.name)}
              title={FUND_CARD_ACTION_COPY.deleteLabel}
              className="flex size-9 items-center justify-center rounded-full text-forest/35 transition-all hover:bg-plum/10 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95 lg:opacity-0 lg:group-hover/card:opacity-100 lg:focus-visible:opacity-100"
            >
              <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={() => onContribute(fund)}
            aria-label={SINKING_FUND_CARD_COPY.contributeAria(fund.name)}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-mint/30 px-3.5 text-[11.5px] font-medium text-forest ring-1 ring-mint/60 transition-colors hover:bg-mint/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
          >
            <Plus className="size-3.5" strokeWidth={3} aria-hidden />
            {SINKING_FUND_CARD_COPY.contribute}
          </button>
        </span>
      </div>
    </article>
  )
}
