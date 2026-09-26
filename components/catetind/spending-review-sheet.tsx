'use client'

import { CalendarDays, Sparkles, TrendingUp } from 'lucide-react'
import { BudgetSheet, SheetSubmit } from './budget-sheet'
import { cn } from '@/lib/utils'
import {
  PACING_HEX,
  SPENDING_REVIEW_COPY,
  SPENDING_REVIEW_MIN_NOTES,
  maskNominal,
  spendingReview,
  type BudgetHud,
  type PacingTone,
  type PeriodIncome,
  type PeriodWindow,
  type SpendingReviewCondition,
} from '@/lib/data/budget'

/* ── Panel "Review Pengeluaran Hari Ini" (prompt 19) ─────────────────────────
   Satu-satunya jalur pemulihan yang dirancang PRD untuk momen over budget:
   bukan menegur, tapi MENEMANI (PRD 649 — "kompromi untuk DIAN"). Dulu CTA-nya
   cuma toast "panel segera hadir", padahal justru di momen itu user paling
   rawan berhenti mencatat.

   Isi panel sengaja HANYA hari ini (bukan skor, bukan tren):
     1. satu kalimat dari tabel PRD 2B.4 / 2B.3 sesuai kondisi,
     2. uang keluar hari ini vs jatah harian periode aktif + pace (sage/amber/
        terracotta — warna kanon yang sama dengan kartu kategori),
     3. kategori terbesar hari ini — HANYA kalau catatannya sudah cukup
        (`SPENDING_REVIEW_MIN_NOTES`); kalau tipis, ganti kartu sabar PRD 2A.5,
     4. daftar catatan hari ini sebagai bukti angka di atas,
     5. kaki: "Lanjut ngobrol sama Minca" → AI Coach dengan pertanyaan terisi.

   Semua angka & kalimat datang dari `lib/data/budget.ts` (`spendingReview()`),
   jadi panel ini tidak menghitung apa pun sendiri dan tidak bisa beda dari
   kartu Jatah Hari Ini di layar yang sama. */

/** berapa catatan ditampilkan sebagai bukti sebelum diringkas "+N lainnya" */
const NOTES_SHOWN = 4

/** nuansa kalimat kondisi — terracotta hanya untuk state over (BUKAN merah),
 *  mengikuti kanon PRD 2B.2: warna status tidak pernah memakai merah. */
const CONDITION_SKIN: Record<SpendingReviewCondition, string> = {
  drySpell: 'bg-sage/45 ring-soil/8',
  incomeIn: 'bg-hud-sage/15 ring-hud-sage/25',
  over: 'bg-hud-terracotta/[0.07] ring-hud-terracotta/15',
  normal: 'bg-sage/45 ring-soil/8',
  shortfall: 'bg-hud-amber/12 ring-hud-amber/20',
}

/** warna teks status pace — hex kanon yang sama dengan kartu kategori */
const TONE_TEXT: Record<PacingTone, string> = {
  sage: 'text-[#b5b987]',
  amber: 'text-[#b89191]',
  terracotta: 'text-hud-terracotta',
}

export function SpendingReviewSheet({
  open,
  onClose,
  hud,
  window: period,
  income,
  masked,
  onContinueChat,
}: {
  open: boolean
  onClose: () => void
  /** HUD periode AKTIF dari halaman — satu angka dengan kartu Jatah Hari Ini */
  hud: BudgetHud
  /** periode aktif (chip label + panjang pacing) */
  window: PeriodWindow
  /** dry spell & "pemasukan cair hari ini" (PRD 2B.3) */
  income: PeriodIncome
  /** sensor layar global (PrivacyProvider) — nominal ikut mode privasi */
  masked: boolean
  /** lanjut ke AI Coach dengan pertanyaan sudah terisi */
  onContinueChat: () => void
}) {
  const review = spendingReview({ hud, income, masked })
  const { notes, pace, topCategory } = review
  const shownNotes = notes.slice(0, NOTES_SHOWN)
  const hiddenNotes = notes.length - shownNotes.length

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={SPENDING_REVIEW_COPY.title}
      description={SPENDING_REVIEW_COPY.description}
      footer={
        <div>
          <SheetSubmit onClick={onContinueChat}>
            <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
            {SPENDING_REVIEW_COPY.coachCta}
          </SheetSubmit>
          <p className="mt-2 text-center text-[10.5px] leading-relaxed text-ink/40">
            {SPENDING_REVIEW_COPY.coachHint}
          </p>
        </div>
      }
    >
      {/* 1. Kalimat kondisi — apa adanya dari tabel PRD (2B.4 / 2B.3) */}
      <p
        className={cn(
          'rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed text-ink ring-1',
          CONDITION_SKIN[review.condition],
        )}
      >
        {review.sentence}
      </p>

      {/* 2. Angka hari ini: keluar vs jatah harian + pace */}
      <section
        aria-label={SPENDING_REVIEW_COPY.spentLabel}
        className="mt-3 rounded-2xl bg-cream p-4 ring-1 ring-soil/12"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-ink/50">
              {SPENDING_REVIEW_COPY.spentLabel}
            </p>
            <p className="mt-1 text-[26px] font-black leading-none tracking-tight text-ink tabular-nums">
              {maskNominal(review.spentToday, masked)}
            </p>
            <p className="mt-1.5 text-[11.5px] font-medium text-ink/50">
              {SPENDING_REVIEW_COPY.budgetLead}{' '}
              <b className="font-semibold text-ink tabular-nums">
                {maskNominal(review.dailyBudget, masked)}
              </b>
            </p>
          </div>
          {/* chip periode: menegaskan jatah MANA yang dipakai membandingkan */}
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sage/70 px-2.5 py-1 text-[10.5px] font-bold text-forest ring-1 ring-soil/8">
            <CalendarDays className="size-3" strokeWidth={2.6} aria-hidden />
            {period.label}
          </span>
        </div>

        {pace ? (
          <>
            <div
              role="progressbar"
              aria-label={pace.copy}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(100, pace.percent))}
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#ebe4de]"
            >
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: `${Math.min(100, pace.percent)}%`,
                  backgroundColor: PACING_HEX[pace.tone],
                }}
              />
            </div>
            <p
              className={cn('mt-2 text-[11.5px] font-medium leading-snug', TONE_TEXT[pace.tone])}
            >
              {pace.copy}
            </p>
          </>
        ) : (
          /* jatah ditahan: jangan gambar bar 0% yang terbaca "aman" */
          <p className="mt-3 rounded-xl bg-hud-amber/12 px-3 py-2 text-[11.5px] leading-relaxed text-ink/60">
            {SPENDING_REVIEW_COPY.heldPace}
          </p>
        )}

        {/* meta — sisa jatah hari ini, sisa hari periode, jumlah catatan */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-soil/12 pt-2.5 text-[11px] text-ink/55">
          <span>
            {SPENDING_REVIEW_COPY.remainingLead}{' '}
            <b className="font-semibold text-ink tabular-nums">
              {maskNominal(review.remainingToday, masked)}
            </b>
          </span>
          <span aria-hidden className="size-1 rounded-full bg-ink/20" />
          <span className="tabular-nums">
            {review.daysLeft} {SPENDING_REVIEW_COPY.daysLeftSuffix}
          </span>
          <span aria-hidden className="size-1 rounded-full bg-ink/20" />
          <span className="tabular-nums">{SPENDING_REVIEW_COPY.notesLead(review.noteCount)}</span>
        </div>
      </section>


      {/* 3. Pola (kalau catatannya cukup) ATAU kartu sabar (kalau masih tipis) */}
      {topCategory ? (
        <section
          aria-label={SPENDING_REVIEW_COPY.topTitle}
          className="mt-3 flex items-center gap-3 rounded-2xl bg-cream p-4 ring-1 ring-soil/12"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sage/70 text-forest ring-1 ring-soil/8">
            <TrendingUp className="size-4" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold text-ink/45">
              {SPENDING_REVIEW_COPY.topTitle}
            </p>
            <p className="mt-0.5 truncate text-[13.5px] font-bold tracking-tight text-ink">
              {topCategory.category}
            </p>
            <p className="text-[10.5px] text-ink/45">
              {SPENDING_REVIEW_COPY.topShare(topCategory.pct)}
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-bold text-hud-terracotta tabular-nums">
            {maskNominal(topCategory.total, masked)}
          </span>
        </section>
      ) : (
        <section
          aria-label={SPENDING_REVIEW_COPY.thinTitle}
          className="mt-3 rounded-2xl border border-dashed border-oat bg-cream/60 px-4 py-4"
        >
          <p className="text-[13px] font-bold leading-snug text-ink">
            {SPENDING_REVIEW_COPY.thinTitle}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink/55">
            {SPENDING_REVIEW_COPY.thinBody}
          </p>
          {/* progres menuju ambang — engagement tanpa klaim palsu (PRD 2A.5) */}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#ebe4de]">
              <div
                className="h-full rounded-full bg-mint"
                style={{ width: `${(review.noteCount / SPENDING_REVIEW_MIN_NOTES) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-[10.5px] font-semibold text-ink/45 tabular-nums">
              {SPENDING_REVIEW_COPY.thinProgress(review.noteCount)}
            </span>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink/40">
            {SPENDING_REVIEW_COPY.thinHint}
          </p>
        </section>
      )}

      {/* 4. Catatan hari ini — bukti angka di atas, bukan opini */}
      {shownNotes.length > 0 && (
        <section aria-label={SPENDING_REVIEW_COPY.notesTitle} className="mt-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink/40">
            {SPENDING_REVIEW_COPY.notesTitle}
          </p>
          <ul className="mt-2 space-y-1.5 pb-1">
            {shownNotes.map((note) => (
              <li
                key={note.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-cream/70 px-3.5 py-2 ring-1 ring-soil/8"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">
                    {note.name}
                  </span>
                  <span className="block text-[10px] text-ink/40">
                    {note.category} · {note.time} · {note.wallet}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-ink/70 tabular-nums">
                  {maskNominal(note.amount, masked)}
                </span>
              </li>
            ))}
            {hiddenNotes > 0 && (
              <li className="px-1 text-[10.5px] text-ink/40">
                {SPENDING_REVIEW_COPY.notesMore(hiddenNotes)}
              </li>
            )}
          </ul>
        </section>
      )}
    </BudgetSheet>
  )
}

