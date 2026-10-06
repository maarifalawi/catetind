import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Lock, ShieldCheck, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  WELCOME_CARDS,
  WELCOME_COPY,
  WELCOME_LEGAL_LINKS,
  WELCOME_LINKS,
  WELCOME_TRUST_CHIPS,
  type WelcomeTone,
} from '@/lib/data/welcome'
import { LogoWordmark } from './logo-wordmark'

/* ── Halaman depan (/welcome) — inventaris #2 · halaman PUBLIK/pre-app ────────
   Layar pertama yang dilihat orang sebelum punya akun. Arah visualnya sengaja
   BEDA dari layar app di dalam (putih rata + hairline): di sini kanvasnya
   HITAM rata, tipografinya besar & rapat, dan warna palet muncul lewat kartu
   mini yang mengapung — supaya terasa seperti halaman depan produk, bukan
   dashboard.

   Empat keputusan yang mengikat komponen ini:

     1. TIDAK memakai `PhoneStage`: bingkai itu berkanvas PUTIH untuk layar app.
        Halaman ini mengurus bingkai + tinggi layarnya sendiri (`bg-ink`).
     2. Judul dibelah tiga baris (lihat `WELCOME_COPY.headlineLines`) — ritme
        em-dash yang sama dengan arah visual referensi.
     3. Kartu & chip kepercayaan datang dari `lib/data/welcome.ts`; komponen ini
        nol string user-facing (CONTEXT-WAJIB §4).
     4. Kartu hero `aria-hidden`: itu ILUSTRASI, bukan data. Pembaca layar tidak
        boleh mengiranya saldo nyata.
   ────────────────────────────────────────────────────────────────────────── */

/** permukaan tiap tone — sekaligus warna lingkaran ikon di sudut kartu */
const CARD_TONE: Record<WelcomeTone, { surface: string; iconWrap: string }> = {
  daisy: { surface: 'bg-daisy text-forest', iconWrap: 'bg-ink/10 text-forest' },
  forest: { surface: 'bg-forest text-cream', iconWrap: 'bg-cream/15 text-cream' },
  mint: { surface: 'bg-mint text-forest', iconWrap: 'bg-forest/15 text-forest' },
}

/** kunci ikon di data → komponen Lucide (data tidak boleh impor React) */
const TRUST_ICON: Record<string, LucideIcon> = {
  shield: ShieldCheck,
  lock: Lock,
  zap: Zap,
}

/**
 * Slot tata letak kartu hero: posisi, rotasi, urutan tumpuk, serta tempo
 * mengapungnya. Rotasi ada di pembungkus luar dan float di dalam, supaya
 * `transform` animasi tidak menimpa rotasi.
 */
const CARD_SLOTS = [
  {
    className: 'left-0 top-1 z-10 w-[45%] max-w-[208px] -rotate-[7deg]',
    delay: '0s',
    duration: '6.4s',
  },
  {
    className: 'right-0 top-9 z-20 w-[52%] max-w-[246px] rotate-[4deg]',
    delay: '0.9s',
    duration: '7.6s',
  },
  {
    className: 'bottom-0 left-[15%] z-30 w-[47%] max-w-[220px] rotate-[3deg]',
    delay: '1.7s',
    duration: '6.9s',
  },
] as const

export function WelcomeScreen() {
  return (
    <main className="relative isolate flex min-h-[100dvh] w-full flex-col overflow-hidden bg-ink text-cream">
      {/* ── cahaya lembut di latar: hijau (brand) + kuning (pop) — bukan gradien
             penuh supaya kanvas tetap terasa hitam rata ─────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-24 size-[420px] rounded-full bg-forest/45 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-32 size-[360px] rounded-full bg-daisy/10 blur-[140px]"
      />

      <div className="relative mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-6 pt-8 pb-10 lg:px-12 lg:pt-10 lg:pb-14">
        {/* ── 1. bar brand: logo + pintu masuk ──────────────────────────────── */}
        <header className="flex items-center justify-between gap-4">
          <LogoWordmark className="h-6 lg:h-7" tone="light" />
          <Link
            href={WELCOME_LINKS.login}
            className="rounded-full px-4 py-2 text-[13px] font-medium text-cream/70 ring-1 ring-cream/15 transition-colors duration-200 hover:bg-cream/10 hover:text-cream motion-reduce:transition-none"
          >
            {WELCOME_COPY.loginLink}
          </Link>
        </header>

        {/* ── 2. hero: satu janji, tiga tarikan napas ───────────────────────── */}
        <section className="mt-14 lg:mt-20">
          <p className="text-[11px] font-medium tracking-[0.18em] text-cream/45 uppercase">
            {WELCOME_COPY.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.03em] text-cream lg:text-[5rem]">
            {WELCOME_COPY.headlineLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-[14.5px] leading-relaxed text-cream/60 lg:text-[16px]">
            {WELCOME_COPY.subtitle}
          </p>
        </section>

        {/* ── 3. kartu mini yang mengapung — ILUSTRASI produk (aria-hidden) ── */}
        <section aria-hidden className="relative mt-12 h-[240px] w-full lg:mt-16 lg:h-[300px]">
          {WELCOME_CARDS.map((card, index) => {
            const slot = CARD_SLOTS[index] ?? CARD_SLOTS[0]
            const tone = CARD_TONE[card.tone]
            return (
              <div key={card.id} className={cn('absolute', slot.className)}>
                <div
                  className="animate-welcome-float motion-reduce:animate-none"
                  style={{ animationDelay: slot.delay, animationDuration: slot.duration }}
                >
                  <div
                    className={cn(
                      'rounded-[1.6rem] p-4 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.85)] ring-1 ring-cream/10 lg:p-5',
                      tone.surface,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-medium tracking-[0.14em] uppercase opacity-60">
                        {card.tag}
                      </span>
                      <span
                        className={cn(
                          'flex size-7 items-center justify-center rounded-full',
                          tone.iconWrap,
                        )}
                      >
                        <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
                      </span>
                    </div>
                    <p className="mt-4 text-[13px] font-medium lg:text-[14px]">{card.label}</p>
                    <p className="mt-0.5 font-display text-[19px] font-medium tabular-nums lg:text-[22px]">
                      {card.amount}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        {/* ── 4. CTA + kepercayaan + kaki ───────────────────────────────────── */}
        <footer className="mt-auto pt-12 lg:pt-16">
          <Link
            href={WELCOME_LINKS.register}
            className="group flex h-14 w-full max-w-[440px] items-center gap-3 rounded-full bg-cream/10 pr-6 pl-2 ring-1 ring-cream/15 backdrop-blur-sm transition-colors duration-200 hover:bg-cream/[0.16] motion-reduce:transition-none"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-daisy text-forest transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
              <ArrowRight className="size-[18px]" strokeWidth={2.6} aria-hidden />
            </span>
            <span className="flex-1 text-left text-[15.5px] font-medium tracking-[-0.01em] text-cream">
              {WELCOME_COPY.ctaPrimary}
            </span>
          </Link>
          <p className="mt-3 text-[11.5px] leading-relaxed text-cream/45">{WELCOME_COPY.ctaNote}</p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {WELCOME_TRUST_CHIPS.map((chip) => {
              const Icon = TRUST_ICON[chip.icon] ?? ShieldCheck
              return (
                <li
                  key={chip.id}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-cream/65 ring-1 ring-cream/12"
                >
                  <Icon className="size-3.5 text-mint" strokeWidth={2.4} aria-hidden />
                  {chip.label}
                </li>
              )
            })}
          </ul>

          <div className="mt-10 flex flex-col gap-4 border-t border-cream/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-cream/55">
              {WELCOME_COPY.loginLead}{' '}
              <Link
                href={WELCOME_LINKS.login}
                className="font-medium text-cream underline underline-offset-2 transition-colors hover:text-daisy motion-reduce:transition-none"
              >
                {WELCOME_COPY.loginLink}
              </Link>
            </p>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-cream/40">
              {WELCOME_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-cream/70 motion-reduce:transition-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="text-cream/30">{WELCOME_COPY.legalNote}</li>
            </ul>
          </div>
        </footer>
      </div>
    </main>
  )
}
