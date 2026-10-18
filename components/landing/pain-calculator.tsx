'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, Calculator } from 'lucide-react'
import {
  DEFAULT_PAIN_RESULT_TAB,
  PAIN_CALCULATOR_COPY,
  PAIN_CALCULATOR_DEFAULTS,
  PAIN_RESULT_TABS,
  clampLeak,
  clampSalary,
  computeGaibResult,
  formatIDR,
  resultAmountForTab,
  resultCaptionForTab,
  type PainResultTabId,
} from '@/lib/data/pain-calculator'
import { cn } from '@/lib/utils'
import { LandingReveal } from './lp/reveal'

/* ── KALKULATOR UANG GAIB (SECTION 2) ────────────────────────────────────────
   Dua kolom dengan satu garis pemisah tipis:

     kiri  → judul + dua slider (gaji & uang gaib)
     kanan → tab rentang + SATU angka besar + CTA

   Hanya satu angka hasil yang tampil pada satu waktu. Tab mengganti angka
   (1 tahun / 5 tahun / diinvestasikan) tanpa memuat ulang apa pun; hitungan
   tetap client-side lewat useMemo, dan count-up memakai Framer Motion. */

const COPY = PAIN_CALCULATOR_COPY
const DEFAULTS = PAIN_CALCULATOR_DEFAULTS

export function LandingPainCalculator() {
  const reduceMotion = useReducedMotion()
  const [salary, setSalary] = useState<number>(DEFAULTS.salary)
  const [leak, setLeak] = useState<number>(DEFAULTS.defaultLeak)
  const [tab, setTab] = useState<PainResultTabId>(DEFAULT_PAIN_RESULT_TAB)
  const tabRefs = useRef<Record<PainResultTabId, HTMLButtonElement | null>>({
    yearly: null,
    fiveYear: null,
    invested: null,
  })

  const result = useMemo(() => computeGaibResult(salary, leak), [salary, leak])
  const amount = resultAmountForTab(tab, result)
  const caption = resultCaptionForTab(tab, result)
  const formattedAmount = formatIDR(amount)
  /* nominal panjang (miliaran) memakai skala lebih kecil supaya tidak meluber
     dari kolom kanan — heuristik berbasis jumlah karakter, bukan tebak-tebakan */
  const compactAmount = formattedAmount.length > 13
  const activeTab = PAIN_RESULT_TABS.find((item) => item.id === tab) ?? PAIN_RESULT_TABS[0]

  /** panah kiri/kanan memindah tab — pola yang sama dengan toggle pricing */
  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const index = PAIN_RESULT_TABS.findIndex((item) => item.id === tab)
    const nextIndex =
      event.key === 'ArrowRight'
        ? (index + 1) % PAIN_RESULT_TABS.length
        : (index - 1 + PAIN_RESULT_TABS.length) % PAIN_RESULT_TABS.length
    const next = PAIN_RESULT_TABS[nextIndex]
    setTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  /** href tetap ada sebagai fallback; ini hanya menambah gulir halus */
  function handleCtaClick(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById('pricing')
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <section
      id="pain-calculator"
      aria-labelledby="pain-calculator-title"
      className="w-full scroll-mt-24 bg-canvas px-5 py-16 landing-tab:px-10 landing:py-24"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <LandingReveal
          y={32}
          className="flex flex-col overflow-hidden rounded-[28px] bg-canvas shadow-landing-hairline ring-1 ring-soil/10 landing-tab:grid landing-tab:grid-cols-2"
        >
          {/* ── KIRI: penanda + judul + dua slider ─────────────────────── */}
          <div className="flex flex-col p-5 sm:p-7 landing:p-10">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sage py-0.5 pr-4 pl-0.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-canvas">
                <Calculator className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[14px] leading-[1.5] text-forest">
                {COPY.eyebrow}
              </span>
            </span>

            <h2
              id="pain-calculator-title"
              className="mt-5 max-w-[360px] font-display text-[clamp(34px,6vw,64px)] leading-[1.05] font-medium tracking-[-0.045em] text-forest"
            >
              {COPY.titleLead} {COPY.titleEmphasis} {COPY.titleTail}
            </h2>

            <div className="mt-8 flex flex-col gap-10 landing-tab:mt-10 landing:gap-12">
              <div>
                <label
                  htmlFor="pain-salary"
                  className="text-[13px] leading-[1.5] font-medium text-forest/55"
                >
                  {COPY.salaryLabel}
                </label>
                <p className="mt-2 font-display text-[clamp(30px,7.5vw,52px)] leading-none font-medium tracking-[-0.045em] text-forest tabular-nums landing-tab:text-[clamp(30px,4.6vw,44px)] landing:text-[clamp(40px,3.8vw,52px)]">
                  {formatIDR(salary)}
                </p>
                <RangeSlider
                  id="pain-salary"
                  label={COPY.salaryLabel}
                  value={salary}
                  min={DEFAULTS.salaryMin}
                  max={DEFAULTS.salaryMax}
                  step={DEFAULTS.salaryStep}
                  valueText={formatIDR(salary)}
                  onChange={(next) => setSalary(clampSalary(next))}
                  className="mt-4"
                />
              </div>

              <div>
                <label
                  htmlFor="pain-leak"
                  className="text-[13px] leading-[1.5] font-medium text-forest/55"
                >
                  {COPY.leakLabel}
                </label>
                <p className="mt-2 font-display text-[clamp(30px,7.5vw,52px)] leading-none font-medium tracking-[-0.045em] text-forest tabular-nums landing-tab:text-[clamp(30px,4.6vw,44px)] landing:text-[clamp(40px,3.8vw,52px)]">
                  {formatIDR(leak)}
                </p>
                <RangeSlider
                  id="pain-leak"
                  label={COPY.leakLabel}
                  value={leak}
                  min={DEFAULTS.leakMin}
                  max={DEFAULTS.leakMax}
                  step={DEFAULTS.leakStep}
                  valueText={formatIDR(leak)}
                  onChange={(next) => setLeak(clampLeak(next))}
                  className="mt-4"
                />
              </div>
            </div>
          </div>

          {/* ── KANAN: hasil — sekat sendiri di mobile ──────────────────── */}
          <div className="flex flex-col justify-center border-t border-soil/10 bg-sage/20 p-5 sm:p-7 landing-tab:border-t-0 landing-tab:border-l landing-tab:bg-transparent landing-tab:p-10">
            <div className="flex flex-col items-center text-center">
              <p className="text-[10.5px] leading-[1.5] font-medium tracking-[0.18em] text-forest/45 uppercase">
                {COPY.resultLabel}
              </p>

              <div
                role="group"
                aria-label={COPY.tabsAria}
                onKeyDown={handleTabKeyDown}
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-sage/70 p-1"
              >
                {PAIN_RESULT_TABS.map((item) => {
                  const active = item.id === tab
                  return (
                    <button
                      key={item.id}
                      ref={(node) => {
                        tabRefs.current[item.id] = node
                      }}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTab(item.id)}
                      className={cn(
                        'inline-flex min-h-9 items-center justify-center rounded-full px-3 py-1.5 text-[12px] leading-[1.5] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 motion-reduce:transition-none landing-tab:px-4 landing-tab:text-[13px]',
                        active
                          ? 'bg-forest text-cream'
                          : 'text-forest/60 hover:text-forest',
                      )}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              {/* Pembaca layar menerima satu kalimat utuh — bukan angka yang
                  berubah tiap frame saat count-up berjalan. */}
              <p aria-live="polite" className="sr-only">
                {activeTab.label}: {formattedAmount}. {caption}
              </p>

              <div className="mt-8 flex w-full flex-col items-center landing:mt-10">
                <AnimatedRupiah
                  value={amount}
                  className={cn(
                    'block font-display leading-[0.95] font-medium tracking-[-0.055em] whitespace-nowrap text-forest tabular-nums',
                    compactAmount
                      ? 'text-[clamp(26px,9.5vw,42px)] landing-tab:text-[clamp(36px,4.8vw,56px)] landing:text-[clamp(56px,4.6vw,64px)]'
                      : 'text-[clamp(30px,11vw,50px)] landing-tab:text-[clamp(42px,5.8vw,60px)] landing:text-[clamp(64px,5.8vw,80px)]',
                  )}
                />
                <p className="mt-3 max-w-[380px] text-balance text-[13px] leading-[1.5] text-forest-muted sm:text-[14px]">
                  {caption}
                </p>
              </div>

              <Link
                href="#pricing"
                onClick={handleCtaClick}
                className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest px-6 py-2.5 text-[14px] font-medium text-cream transition-all duration-200 hover:scale-[1.02] hover:bg-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                {COPY.cta}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </LandingReveal>

        <p className="mt-6 text-center text-[11px] leading-[1.5] text-forest/35">
          {COPY.disclaimer}
        </p>
      </div>
    </section>
  )
}

/* ── COUNT-UP ANGKA ─────────────────────────────────────────────────────────
   Render server = angka akhir (terbaca tanpa JS), lalu saat masuk viewport
   berdetak dari 0. Perubahan slider menyambung dari angka yang sedang tampil.
   `prefers-reduced-motion` → langsung lompat ke nilai akhir. */
function AnimatedRupiah({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const shownRef = useRef(value)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!inView) return
    if (reduceMotion) {
      shownRef.current = value
      setDisplay(value)
      return
    }

    const firstRun = !startedRef.current
    const from = firstRun ? 0 : shownRef.current
    startedRef.current = true

    const controls = animate(from, value, {
      duration: firstRun ? 0.9 : 0.45,
      ease: 'easeOut',
      onUpdate: (latest) => {
        const rounded = Math.round(latest)
        shownRef.current = rounded
        setDisplay(rounded)
      },
    })

    return () => controls.stop()
  }, [inView, value, reduceMotion])

  return (
    <span ref={ref} className={className}>
      {formatIDR(display)}
    </span>
  )
}

/* ── RANGE RUPIAH ───────────────────────────────────────────────────────────
   Range native (keyboard + tap target besar) dengan trek tipis 3px. Thumb
   dibuat TERANG (canvas + cincin soil) supaya terbaca sebagai pegangan di
   atas bagian trek yang sudah terisi — persis referensi desain. */
function RangeSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  valueText,
  onChange,
  className,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  valueText: string
  onChange: (value: number) => void
  className?: string
}) {
  const percent =
    max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0
  /* Trek tetap 3px (sleek), tapi AREA SENTUH 44px: input transparan setinggi
     h-11 menumpuk di atas trek supaya tetap nyaman digeser satu jempol. */
  const track = `linear-gradient(to right, var(--color-forest) 0%, var(--color-forest) ${percent}%, var(--color-sage) ${percent}%, var(--color-sage) 100%)`

  return (
    <div className={cn('relative flex h-11 w-full items-center', className)}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        aria-valuetext={valueText}
        className="relative z-10 h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-forest/35 focus-visible:ring-offset-2 [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-soil/20 [&::-moz-range-thumb]:bg-canvas [&::-moz-range-thumb]:shadow-landing-thumb [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-soil/20 [&::-webkit-slider-thumb]:bg-canvas [&::-webkit-slider-thumb]:shadow-landing-thumb"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-[3px] -translate-y-1/2 rounded-full"
        style={{ background: track }}
      />
    </div>
  )
}
