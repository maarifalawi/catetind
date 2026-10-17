import Link from 'next/link'
import { ArrowRight, CheckCircle2, LifeBuoy, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { LP_CONTACT, type LpContactHelpCard } from '@/lib/data/landing'
import { LandingContactForm } from './contact-form'
import { LandingReveal } from './reveal'

/* ── HALAMAN /contact ────────────────────────────────────────────────────────
   Komposisi: copy + trust chips di kiri, kartu form gelap di kanan (header
   "Tanya Langsung" + panel putih), lalu tiga kartu bantuan. Mobile/tablet
   menumpuk; dua kolom mulai 1200.

   Identitas visual = Earth Pastel: halaman putih, kartu form `bg-forest`,
   panel input putih, aksen Sage/Mint/Daisy. Tidak ada klaim template yang
   tidak bisa dibuktikan repo; WhatsApp & email memakai konstanta data. */

const HELP_ICON = {
  whatsapp: MessageCircle,
  mail: Mail,
  help: LifeBuoy,
} as const

export function LandingContactLp() {
  return (
    <section
      aria-labelledby="landing-contact-title"
      className="w-full bg-canvas px-6 pt-[120px] pb-20 landing-tab:px-10 landing-tab:pt-[160px] landing:pt-[180px] landing:pb-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12">
        <div className="grid gap-10 landing:grid-cols-2 landing:items-start landing:gap-12">
          {/* kiri: copy + trust chips */}
          <div className="flex flex-col gap-6 landing:pt-8">
            <LandingReveal y={24} delay={0} className="inline-flex">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-canvas py-0.5 pr-4 pl-0.5 ring-1 ring-soil/10">
                <span className="flex size-6 items-center justify-center rounded-full bg-sage">
                  <Sparkles className="size-3.5 text-forest" aria-hidden />
                </span>
                <span className="text-[14px] leading-[1.5] text-forest">
                  {LP_CONTACT.eyebrow}
                </span>
              </span>
            </LandingReveal>

            <LandingReveal y={48} delay={0.2}>
              <h1
                id="landing-contact-title"
                className="max-w-[520px] font-display text-[40px] leading-[1.15] font-medium tracking-[-0.03em] text-forest landing-tab:text-[52px] landing:text-[64px]"
              >
                {LP_CONTACT.title}
              </h1>
            </LandingReveal>

            <LandingReveal y={72} delay={0.4}>
              <p className="max-w-[480px] text-[16px] leading-[1.5] text-forest/60 landing-tab:text-[18px]">
                {LP_CONTACT.body}
              </p>
            </LandingReveal>

            <LandingReveal y={72} delay={0.6}>
              <ul className="flex flex-wrap gap-2">
                {LP_CONTACT.trustChips.map((chip) => (
                  <li
                    key={chip}
                    className="inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-[12px] leading-[1.5] text-forest/70"
                  >
                    <CheckCircle2 className="size-3.5 shrink-0 text-forest" aria-hidden />
                    {chip}
                  </li>
                ))}
              </ul>
            </LandingReveal>
          </div>

          {/* kanan: kartu form gelap */}
          <LandingReveal y={72} delay={0.3} className="w-full">
            <div className="flex flex-col gap-6 rounded-[36px] bg-forest p-3 landing:p-4">
              <div className="flex flex-col gap-2 px-4 pt-3 landing:px-6">
                <h2 className="text-[28px] leading-[1.25] tracking-[-0.03em] text-cream landing:text-[32px]">
                  {LP_CONTACT.form.title}
                </h2>
                <p className="text-[14px] leading-[1.5] text-cream/70">
                  {LP_CONTACT.form.subtitle}
                </p>
              </div>
              <div className="rounded-[16px] bg-canvas p-5 landing:p-8">
                <LandingContactForm />
              </div>
            </div>
          </LandingReveal>
        </div>

        {/* tiga pintu bantuan */}
        <div className="grid gap-2 landing-tab:grid-cols-3">
          {LP_CONTACT.helpCards.map((card) => (
            <HelpCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </section>
  )
}

function HelpCard({ card }: { card: LpContactHelpCard }) {
  const Icon = HELP_ICON[card.icon]
  const ctaClass =
    'inline-flex w-fit items-center gap-2 rounded-[4px] text-[14px] leading-[1.5] font-medium text-forest underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40'

  return (
    <article className="flex flex-col justify-between gap-8 rounded-[16px] bg-canvas p-6 ring-1 ring-soil/10">
      <div className="flex flex-col gap-4">
        <span className="flex size-12 items-center justify-center rounded-[8px] bg-sage text-forest">
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="text-[20px] leading-[1.25] tracking-[-0.02em] text-forest">
            {card.title}
          </h3>
          <p className="text-[14px] leading-[1.5] text-forest/60">{card.body}</p>
        </div>
      </div>

      {/* WhatsApp/email memakai <a> supaya aplikasi eksternal terbuka tanpa
          router Next; tautan WA wajib tab baru + rel noopener. */}
      {card.href.startsWith('http') ? (
        <a href={card.href} target="_blank" rel="noopener noreferrer" className={ctaClass}>
          {card.ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </a>
      ) : card.href.startsWith('mailto:') ? (
        <a href={card.href} className={ctaClass}>
          {card.ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </a>
      ) : (
        <Link href={card.href} className={ctaClass}>
          {card.ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </article>
  )
}
