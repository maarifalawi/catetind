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
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { ArrowRight, Calculator, Pencil } from 'lucide-react'
import {
  DEFAULT_PAIN_RESULT_TAB,
  PAIN_CALCULATOR_COPY,
  PAIN_CALCULATOR_DEFAULTS,
  PAIN_RESULT_TABS,
  clampLeak,
  clampLeakSlider,
  computeGaibResult,
  formatCompactIDR,
  formatIDR,
  formatLeakInput,
  formatLeakTyping,
  investmentGainBadge,
  parseLeakInput,
  resultAmountForTab,
  resultCaptionForTab,
  type PainResultTabId,
} from '@/lib/data/pain-calculator'
import { cn } from '@/lib/utils'
import { BatikBackdrop } from './lp/batik-backdrop'
import { LandingReveal } from './lp/reveal'

/* ── KALKULATOR UANG GAIB (SECTION 2) ────────────────────────────────────────
   Dua kolom: kiri terang untuk mengatur angka, kanan panel gelap untuk hasil.

     kiri  → judul + SATU kontrol: "Uang Gaib / Bulan"
             (angka bisa diketik manual + slider sampai Rp 5 juta)
     kanan → tab rentang + SATU angka besar + CTA

   Slider GAJI sudah dihapus: section ini soal kebocoran, bukan soal besar
   kecilnya pemasukan. Nominal di atas Rp 5 juta tetap bisa dimasukkan lewat
   input manual, jadi tidak ada user yang "kehabisan" batas.

   Hanya satu angka hasil yang tampil pada satu waktu. Tab mengganti angka
   (1 tahun / 5 tahun / diinvestasikan) tanpa memuat ulang apa pun; hitungan
   tetap client-side lewat useMemo, dan count-up memakai requestAnimationFrame
   (bukan framer-motion — pustaka itu tidak boleh masuk bundel landing). */

const COPY = PAIN_CALCULATOR_COPY
const DEFAULTS = PAIN_CALCULATOR_DEFAULTS

export function LandingPainCalculator() {
  const reduceMotion = usePrefersReducedMotion()
  const [leak, setLeak] = useState<number>(DEFAULTS.defaultLeak)
  /* `draft` = teks mentah selama field angka sedang diketik. Saat null, field
     menampilkan bentuk kanon `formatLeakInput(leak)`. */
  const [draft, setDraft] = useState<string | null>(null)
  const [tab, setTab] = useState<PainResultTabId>(DEFAULT_PAIN_RESULT_TAB)
  const tabRefs = useRef<Record<PainResultTabId, HTMLButtonElement | null>>({
    yearly: null,
    fiveYear: null,
    invested: null,
  })

  const result = useMemo(() => computeGaibResult(leak), [leak])
  const amount = resultAmountForTab(tab, result)
  const caption = resultCaptionForTab(tab, result)
  const formattedAmount = formatIDR(amount)
  /* nominal panjang (miliaran) memakai skala lebih kecil supaya tidak meluber
     dari kolom kanan — heuristik berbasis jumlah karakter, bukan tebak-tebakan */
  const compactAmount = formattedAmount.length > 13
  const activeTab = PAIN_RESULT_TABS.find((item) => item.id === tab) ?? PAIN_RESULT_TABS[0]

  /* slider tidak pernah melewati batas atasnya, walau nominal manual lebih besar */
  const sliderValue = clampLeakSlider(leak)
  const inputValue = draft ?? formatLeakInput(leak)

  /** geser slider → batas 5jt, sekaligus menutup mode ketik manual */
  function handleSliderChange(next: number) {
    setDraft(null)
    setLeak(clampLeakSlider(next))
  }

  /** ketik manual → angka bebas sampai batas manual (bukan batas slider) */
  function handleLeakTyping(raw: string) {
    /* `formatLeakTyping` memberi titik ribuan SELAMA mengetik; huruf/koma
       (singkatan "2jt", "1,5jt") dibiarkan utuh supaya bisa diselesaikan, dan
       blur yang merapikannya jadi angka penuh. */
    const clean = raw.replace(/[^\d.,a-zA-Z]/g, '').slice(0, 24)
    const display = formatLeakTyping(clean)
    const parsed = parseLeakInput(display)
    if (parsed === null) {
      setDraft(display)
      return
    }
    const next = clampLeak(parsed)
    setLeak(next)
    /* kalau ketikan melewati batas manual, field ikut menampilkan angka yang
       benar-benar dipakai hasil — jangan sampai ada dua nominal berbeda. */
    setDraft(next !== parsed ? formatLeakInput(next) : display)
  }

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
      <div className="mx-auto w-full max-w-[1120px]">
        <LandingReveal
          y={32}
          className="grid overflow-hidden rounded-[26px] bg-canvas shadow-landing-card ring-1 ring-soil/10 landing-tab:grid-cols-[1.06fr_1fr] landing-tab:rounded-[32px]"
        >
          {/* ── KIRI: penanda + judul + SATU kontrol (bocor halus) ────────── */}
          <div className="flex flex-col justify-center p-6 text-center sm:p-8 landing:p-12 landing-tab:text-left">
            <span className="mx-auto inline-flex w-fit items-center gap-2 rounded-full bg-sage/70 py-1 pr-3.5 pl-1 ring-1 ring-soil/5 landing-tab:mx-0">
              <span className="flex size-6 items-center justify-center rounded-full bg-canvas ring-1 ring-soil/5">
                <Calculator className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[12.5px] leading-[1.5] font-medium text-forest">
                {COPY.eyebrow}
              </span>
            </span>

            <h2
              id="pain-calculator-title"
              className="mx-auto mt-6 max-w-[380px] font-display text-[clamp(34px,6vw,56px)] leading-[1.03] font-medium tracking-[-0.045em] text-forest landing-tab:mx-0"
            >
              {COPY.titleLead} {COPY.titleEmphasis} {COPY.titleTail}
            </h2>

            <div className="mt-9">
              <label
                htmlFor="pain-leak"
                className="text-[11px] leading-[1.5] font-medium tracking-[0.16em] text-forest-muted uppercase"
              >
                {COPY.leakLabel}
              </label>

              {/* Angka besar = field yang bisa diketik langsung. Ring & latar
                  sage menandai area sentuh tanpa garis tebal. */}
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sage/40 px-4 py-3.5 ring-1 ring-inset ring-soil/5 transition-[background-color,box-shadow] duration-200 focus-within:bg-sage/60 focus-within:ring-forest/25 motion-reduce:transition-none">
                <input
                  id="pain-leak"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={inputValue}
                  onChange={(event) => handleLeakTyping(event.target.value)}
                  onBlur={() => setDraft(null)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  aria-label={COPY.leakInputAria}
                  className="w-full min-w-0 bg-transparent text-center font-display text-[clamp(28px,7.4vw,44px)] leading-none font-medium tracking-[-0.045em] text-forest tabular-nums outline-none landing-tab:text-left"
                />
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas text-forest-muted ring-1 ring-soil/5"
                >
                  <Pencil className="size-3.5" />
                </span>
              </div>

              <RangeSlider
                id="pain-leak-slider"
                label={COPY.leakLabel}
                value={sliderValue}
                min={DEFAULTS.leakMin}
                max={DEFAULTS.leakMax}
                step={DEFAULTS.leakStep}
                valueText={formatIDR(sliderValue)}
                onChange={handleSliderChange}
                className="mt-4"
              />

              <div className="flex items-center justify-between text-[11.5px] leading-none text-forest-muted tabular-nums">
                <span>{formatCompactIDR(DEFAULTS.leakMin)}</span>
                <span>{formatCompactIDR(DEFAULTS.leakMax)}</span>
              </div>
            </div>
          </div>

          {/* ── KANAN: hasil di atas bidang gelap ber-corak batik ─────────── */}
          <div className="relative flex flex-col justify-center gap-10 overflow-hidden bg-gradient-to-br from-evergreen-deep via-forest to-evergreen-deep p-6 text-center text-cream sm:p-8 landing:p-12 landing-tab:text-left">
            {/* corak batik resmi landing (empat motif, mask radial ke tengah) */}
            <BatikBackdrop id="pain-result-batik" tone="cream" className="opacity-60" />
            <span
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-mint/15 blur-3xl"
            />

            <div className="relative flex flex-col">
              <p className="text-[10.5px] leading-[1.5] font-medium tracking-[0.18em] text-cream-muted uppercase">
                {COPY.resultLabel}
              </p>

              <div
                role="group"
                aria-label={COPY.tabsAria}
                onKeyDown={handleTabKeyDown}
                className="mx-auto mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-cream/10 p-1 ring-1 ring-cream/15 landing-tab:mx-0"
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
                        'inline-flex min-h-9 items-center justify-center rounded-full px-3 py-1.5 text-[12px] leading-[1.5] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 motion-reduce:transition-none landing-tab:px-4 landing-tab:text-[13px]',
                        active
                          ? 'bg-cream text-forest'
                          : 'text-cream/75 hover:text-cream',
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
                {tab === 'invested' && result.investmentGain > 0
                  ? ` ${investmentGainBadge(result.investmentGain)}.`
                  : ''}
              </p>

              <div className="mt-9">
                <AnimatedRupiah
                  value={amount}
                  className={cn(
                    'block text-center font-display leading-[0.95] font-medium tracking-[-0.055em] whitespace-nowrap text-cream tabular-nums landing-tab:text-left',
                    compactAmount
                      ? 'text-[clamp(24px,9vw,40px)] landing-tab:text-[clamp(32px,4.4vw,46px)] landing:text-[clamp(44px,4vw,52px)]'
                      : 'text-[clamp(30px,11vw,50px)] landing-tab:text-[clamp(40px,5.4vw,56px)] landing:text-[clamp(56px,5.4vw,68px)]',
                  )}
                />
                <p className="mx-auto mt-3 max-w-[340px] text-balance text-center text-[13px] leading-[1.6] text-cream-muted sm:text-[14px] landing-tab:mx-0 landing-tab:text-left">
                  {caption}
                </p>
                {tab === 'invested' && result.investmentGain > 0 ? (
                  <p className="mx-auto mt-2 max-w-[340px] text-balance text-center text-[12px] leading-[1.6] text-cream-muted landing-tab:mx-0 landing-tab:text-left">
                    {investmentGainBadge(result.investmentGain)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <Link
                href="#pricing"
                onClick={handleCtaClick}
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cream px-6 py-3 text-[14px] font-medium text-forest transition-colors duration-200 hover:bg-cream-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 focus-visible:ring-offset-2 focus-visible:ring-offset-forest motion-reduce:transition-none"
              >
                {COPY.cta}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  )
}

/* ── COUNT-UP ANGKA ─────────────────────────────────────────────────────────
   Render server = angka akhir (terbaca tanpa JS), lalu saat masuk viewport
   berdetak dari 0. Perubahan slider menyambung dari angka yang sedang tampil.
   `prefers-reduced-motion` → langsung lompat ke nilai akhir.

   DULU memakai framer-motion (`useInView` + `animate`), dan itu menyeret
   seluruh pustaka animasi ke landing. Sekarang: IntersectionObserver +
   requestAnimationFrame dengan easing kubik yang sama (ease-out). */
function AnimatedRupiah({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduceMotion = usePrefersReducedMotion()
  const [inView, setInView] = useState(false)
  const [display, setDisplay] = useState(value)
  const shownRef = useRef(value)
  const startedRef = useRef(false)

  /* "sekali terlihat" — observer langsung dilepas supaya tidak ada beban sisa */
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

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
    const duration = firstRun ? 900 : 450
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (value - from) * eased)
      shownRef.current = current
      setDisplay(current)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        shownRef.current = value
        setDisplay(value)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, reduceMotion])

  return (
    <span ref={ref} className={className}>
      {formatIDR(display)}
    </span>
  )
}

/* ── RANGE RUPIAH ───────────────────────────────────────────────────────────
   Range native (keyboard + tap target besar) dengan trek ramping 4px. Thumb
   dibuat TERANG dengan cincin forest supaya terbaca sebagai pegangan di atas
   bagian trek yang sudah terisi — bersih, tanpa bayangan berlebih. */
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
  /* Trek tetap ramping, tapi AREA SENTUH 44px: input transparan setinggi
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
        className="relative z-10 h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-forest/35 focus-visible:ring-offset-2 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-forest [&::-moz-range-thumb]:bg-canvas [&::-moz-range-thumb]:shadow-landing-thumb [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-forest [&::-webkit-slider-thumb]:bg-canvas [&::-webkit-slider-thumb]:shadow-landing-thumb"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-1 -translate-y-1/2 rounded-full"
        style={{ background: track }}
      />
    </div>
  )
}
