'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { formatAmountDigits } from '@/lib/money/amount-input'
import { AnimatedNumber } from './animated-number'
import {
  CALCULATOR_COPY,
  CALCULATOR_DEFAULTS,
  CALCULATOR_RATE,
  computePain,
  formatIDR,
} from '@/lib/data/landing'

/* ── SECTION 2 · PAIN CALCULATOR (interaktif, sisi klien) ────────────────────
   100% di klien, nol API, hitung ulang tiap ketikan — TANPA tombol submit.
   Insight yang dibuat user sendiri jauh lebih persuasif daripada klaim kami,
   jadi section ini cuma menyediakan dua kolom dan rumusnya; narasinya muncul
   dari angka mereka sendiri.

   Tiga gerak yang sengaja:
     1. tiap output menghitung naik dari 0 (`AnimatedNumber`);
     2. angka 5-tahun BERGETAR sekali setelah hitungannya selesai (Web Animations
        API — tanpa remount, jadi tidak mengulang count-up);
     3. angka investasi hijau + glow berdenyut pelan (harapan). */

/** teks Rupiah → angka (buang semua non-digit) */
function toNumber(text: string): number {
  const digits = text.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

/** ketikan mentah → teks berator ribuan, mis. "5000000" → "5.000.000" */
function reformat(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 13)
  return digits ? formatAmountDigits(Number(digits)) : ''
}

export function PainCalculator() {
  const [incomeText, setIncomeText] = useState(formatAmountDigits(CALCULATOR_DEFAULTS.income))
  const [spendingText, setSpendingText] = useState(
    formatAmountDigits(CALCULATOR_DEFAULTS.spending),
  )

  const income = toNumber(incomeText)
  const spending = toNumber(spendingText)
  const result = useMemo(() => computePain(income, spending), [income, spending])

  const fiveYearRef = useRef<HTMLDivElement>(null)

  /* getar halus tepat setelah count-up angka 5-tahun berhenti. Web Animations
     API dipilih (bukan framer-motion) supaya elemen tidak di-remount —
     meremount akan mengulang count-up dari 0. Hormati reduced-motion. */
  const shakeFiveYear = useCallback(() => {
    const el = fiveYearRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-2px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 480, easing: 'ease-in-out' },
    )
  }, [])

  return (
    <section
      id="pain-calculator"
      aria-labelledby="pain-calculator-title"
      className="scroll-mt-20 border-t border-soil/8 bg-sage/25 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.16em] text-forest uppercase">
            {CALCULATOR_COPY.eyebrow}
          </p>
          <h2
            id="pain-calculator-title"
            className="mt-2 font-display text-3xl font-medium tracking-tight text-forest lg:text-4xl"
          >
            {CALCULATOR_COPY.title}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-forest/55">
            {CALCULATOR_COPY.subtitle}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ── dua kolom input ── */}
          <div className="flex flex-col gap-5">
            <CurrencyField
              id="pain-income"
              label={CALCULATOR_COPY.incomeLabel}
              helper={CALCULATOR_COPY.incomeHelper}
              text={incomeText}
              onChange={(raw) => setIncomeText(reformat(raw))}
            />
            <CurrencyField
              id="pain-spending"
              label={CALCULATOR_COPY.spendingLabel}
              helper={CALCULATOR_COPY.spendingHelper}
              text={spendingText}
              onChange={(raw) => setSpendingText(reformat(raw))}
            />
          </div>

          {/* ── keluaran (hitung naik dari 0) ── */}
          <div className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
            {/* 1. satu tahun */}
            <div>
              <p className="text-[12.5px] leading-snug text-forest/55">{CALCULATOR_COPY.yearlyLead}</p>
              <AnimatedNumber
                value={result.yearlyLoss}
                format={formatIDR}
                className="mt-1 block font-display text-3xl font-medium tracking-tight tabular-nums text-forest sm:text-4xl"
              />
              <p className="mt-0.5 font-display text-lg font-medium text-forest/45">
                {CALCULATOR_COPY.yearlyTail}
              </p>
            </div>

            {/* 2. lima tahun — lebih besar, tebal, bergetar setelah count-up */}
            <div className="mt-5 border-t border-dashed border-soil/15 pt-5">
              <p className="text-[12.5px] leading-snug text-forest/55">{CALCULATOR_COPY.fiveYearLead}</p>
              <div ref={fiveYearRef} className="mt-1 inline-block">
                <AnimatedNumber
                  value={result.fiveYearLoss}
                  duration={1100}
                  onComplete={shakeFiveYear}
                  format={formatIDR}
                  className="block font-display text-[2.6rem] leading-none font-semibold tracking-tight tabular-nums text-forest sm:text-5xl"
                />
              </div>
              <p className="mt-1 font-display text-lg font-medium text-plum">
                {CALCULATOR_COPY.fiveYearTail}
              </p>
            </div>

            {/* 3. kalau diinvestasikan — hijau + glow berdenyut */}
            <div className="mt-5 rounded-[1.5rem] bg-mint/20 p-4 ring-1 ring-mint/40">
              <p className="text-[12.5px] leading-snug text-forest/60">
                {CALCULATOR_COPY.investLead}{' '}
                <span className="text-forest/40">({CALCULATOR_COPY.investLeadNote})</span>
              </p>
              <AnimatedNumber
                value={result.investedValue}
                duration={1100}
                format={formatIDR}
                className="mt-1 block font-display text-3xl font-medium tracking-tight tabular-nums text-forest motion-safe:animate-[landing-glow_2.8s_ease-in-out_infinite] sm:text-4xl"
              />
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-forest/55">
                (termasuk {formatIDR(result.investmentGain)} dari return{' '}
                {CALCULATOR_RATE.ratePct}%/tahun)
              </p>
            </div>

            {/* porsi dari gaji */}
            <p className="mt-4 text-[12.5px] text-forest/55">
              {CALCULATOR_COPY.shareOfIncomeLead}{' '}
              <span className="font-display text-base font-medium text-forest tabular-nums">
                {result.percentageOfIncome}%
              </span>{' '}
              {CALCULATOR_COPY.shareOfIncomeTail}
            </p>

            {/* jembatan emosional + CTA lunak (bukan CTA utama) */}
            <p className="mt-5 text-[13.5px] leading-relaxed font-medium text-forest/75">
              {CALCULATOR_COPY.bridge}
            </p>
            <a
              href={CALCULATOR_COPY.softCtaHref}
              className="group mt-4 inline-flex h-12 items-center gap-2 rounded-full border border-forest/30 bg-cream px-5 text-[14px] font-medium text-forest transition-colors duration-200 hover:bg-forest hover:text-cream motion-reduce:transition-none"
            >
              {CALCULATOR_COPY.softCta}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                strokeWidth={2.4}
                aria-hidden
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/** satu kolom nominal Rupiah (label + prefix Rp + helper) */
function CurrencyField({
  id,
  label,
  helper,
  text,
  onChange,
}: {
  id: string
  label: string
  helper: string
  text: string
  onChange: (raw: string) => void
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[13.5px] font-medium text-forest">{label}</span>
      <span className="mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3.5 ring-1 ring-soil/12 transition-all focus-within:ring-2 focus-within:ring-forest/40">
        <span className="font-display text-lg font-medium text-forest/40">Rp</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="w-full bg-transparent font-display text-lg font-medium tracking-tight tabular-nums text-forest outline-none placeholder:text-forest/25"
        />
      </span>
      <span className="mt-1.5 block text-[11.5px] leading-relaxed text-forest/50">{helper}</span>
    </label>
  )
}

