'use client'

import { ArrowRight, CheckCircle2 } from 'lucide-react'
import {
  JOINT_MONTH_LABEL,
  moneyLabel,
  type JointPerson,
  type SettlementState,
} from '@/lib/data/joint'
import { cn } from '@/lib/utils'

/* ── SATU-SATUNYA KARTU SETTLEMENT (redesign Dompet Bersama) ──────────────────
   Sebelum redesign ada TIGA tempat yang berbicara soal settle di satu layar:
   panci timbangan, banner rekap bulanan (dengan timbangan mini + tombol), dan
   baris ledger. Sekarang satu kartu ini memegang seluruh urusan settlement:

     • arah transfer (kantong yang bayar → kantong yang menerima),
     • nominal yang perlu dipindahkan (satu transfer penuh),
     • satu CTA `Settle Sekarang`.

   Kartu ini TIDAK menghitung apa pun: seluruh angka datang dari
   `computeSettlement()` (lib/data/joint.ts). Saat bulan sudah ditandai settle
   (atau selisihnya di bawah ambang), kartu berhenti menawarkan transfer dan
   hanya menampilkan badge hijau `✓ Semua Impas` — tidak ada aksi yang
   disarankan padahal tidak perlu.
   ────────────────────────────────────────────────────────────────────────── */

export function JointSettlementCard({
  settlement,
  masked,
  me,
  partner,
  onSettle,
}: {
  settlement: SettlementState
  /** ikut toggle privasi halaman — nominal jadi Rp ••••••• */
  masked: boolean
  me: JointPerson
  partner: JointPerson
  /** buka modal settlement (satu-satunya aksi transfer di halaman) */
  onSettle: () => void
}) {
  const { settled, level, whoOwes, whoIsOwed, settlementAmount, difference } = settlement
  const needsTransfer = !settled && level === 'settle'
  const allEven = settled || level === 'equal'

  return (
    <section
      aria-label={`Status settlement ${JOINT_MONTH_LABEL}`}
      className="rounded-[1.75rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/10"
    >
      {/* kepala kartu: label status + badge hasil */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-forest/40">Status</p>
        <StatusBadge even={allEven} needsTransfer={needsTransfer} />
      </div>

      {needsTransfer ? (
        <>
          {/* arah transfer: pembayar → penerima */}
          <div className="mt-4 flex items-center gap-2">
            <PersonPill person={whoOwes} caption="Perlu transfer" />
            <span aria-hidden className="flex flex-1 items-center gap-1.5 px-1">
              <span className="h-px flex-1 border-t border-dashed border-soil/20" />
              <ArrowRight className="size-3.5 shrink-0 text-forest/30" strokeWidth={2.4} />
              <span className="h-px flex-1 border-t border-dashed border-soil/20" />
            </span>
            <PersonPill person={whoIsOwed} caption="Biar impas" align="right" />
          </div>

          {/* nominal yang perlu dipindahkan — angka paling penting di kartu ini */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sage/60 px-4 py-3.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-forest/50">
              Nominal transfer
            </span>
            <span className="font-display text-[22px] font-semibold leading-none tabular-nums tracking-tight text-hud-terracotta">
              {moneyLabel(settlementAmount, masked)}
            </span>
          </div>

          <button
            type="button"
            onClick={onSettle}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest text-[13.5px] font-medium text-mint shadow-[0_16px_32px_-22px_rgba(0,0,0,0.95)] transition-colors hover:bg-forest-soft active:scale-[0.99]"
          >
            Settle Sekarang
            <ArrowRight className="size-4" strokeWidth={2.6} />
          </button>
        </>
      ) : (
        /* impas / hampir impas / sudah settle: tidak ada aksi transfer */
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-hud-sage/15 px-4 py-4 ring-1 ring-hud-sage/35">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hud-sage/25 text-forest ring-1 ring-hud-sage/40">
            <CheckCircle2 className="size-[18px]" strokeWidth={2.3} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-forest">
              {allEven ? 'Semua Impas' : 'Hampir Impas'}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-forest-muted">
              {settled
                ? 'Bulan ini sudah ditutup.'
                : allEven
                  ? 'Tidak ada transfer yang perlu dilakukan.'
                  : `Selisih ${moneyLabel(difference, masked)} — tidak perlu transfer.`}
            </p>
          </div>
          <span className="ml-auto shrink-0 text-[11px] font-medium text-forest/40">
            {me.name} &amp; {partner.name}
          </span>
        </div>
      )}
    </section>
  )
}

/** Badge hasil settlement — hijau untuk impas, amber untuk yang masih perlu transfer */
function StatusBadge({ even, needsTransfer }: { even: boolean; needsTransfer: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ring-1',
        even
          ? 'bg-hud-sage/20 text-forest ring-hud-sage/30'
          : needsTransfer
            ? 'bg-hud-amber/20 text-hud-terracotta ring-hud-amber/35'
            : 'bg-hud-sage/15 text-forest ring-hud-sage/25',
      )}
    >
      {even && <CheckCircle2 className="size-3" strokeWidth={2.6} aria-hidden />}
      {even ? 'Semua Impas' : needsTransfer ? 'Belum Impas' : 'Hampir Impas'}
    </span>
  )
}

/** Satu ujung alur transfer — avatar, nama, dan makna posisinya */
function PersonPill({
  person,
  caption,
  align = 'left',
}: {
  person: JointPerson
  caption: string
  align?: 'left' | 'right'
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2',
        align === 'right' && 'flex-row-reverse text-right',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-[16px] ring-1',
          person.tint,
        )}
      >
        {person.avatar}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-tight text-forest">
          {person.name}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-forest/45">
          {caption}
        </span>
      </span>
    </div>
  )
}
