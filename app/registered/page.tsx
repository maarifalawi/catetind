import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { LogoWordmark } from '@/components/catetind/logo-wordmark'
import { LANDING_PATH, REGISTERED_COPY } from '@/lib/data/landing'

/**
 * /registered — halaman "Terima Kasih" setelah registrasi dari landing.
 *
 * Dibaca lewat prop server karena di Next 16 `searchParams` adalah Promise
 * (pola sama dengan `app/budget/page.tsx`); email dari query dipakai menyapa
 * user secara personal. Halaman ini di-`noindex` — ia penutup alur, bukan
 * halaman yang perlu muncul di mesin pencari.
 */
export const metadata: Metadata = {
  title: 'Terima kasih — CatetInd',
  description:
    'Akun CatetInd kamu sudah terdaftar. Kami akan mengirim email saat pembayaran dibuka.',
  robots: { index: false, follow: false },
}

export default async function RegisteredPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  const params = await searchParams
  const raw = params.email
  const email = (Array.isArray(raw) ? raw[0] : raw)?.trim()
  const body = email ? REGISTERED_COPY.body(email) : REGISTERED_COPY.bodyFallback

  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-canvas px-6 py-16 text-forest">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 size-[360px] rounded-full bg-mint/30 blur-[120px]"
      />

      <div className="relative w-full max-w-[520px] text-center">
        <LogoWordmark className="mx-auto h-6" />

        <span className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-mint/25 text-forest ring-1 ring-mint/50">
          <CheckCircle2 className="size-8" strokeWidth={2.4} aria-hidden />
        </span>

        <p className="mt-5 text-[11px] font-medium tracking-[0.16em] text-forest uppercase">
          {REGISTERED_COPY.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
          {REGISTERED_COPY.title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-forest/60">{body}</p>

        <section className="mt-8 rounded-[1.5rem] bg-sage/40 p-5 text-left ring-1 ring-soil/10">
          <h2 className="text-[13px] font-medium text-forest">
            {REGISTERED_COPY.nextStepsTitle}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {REGISTERED_COPY.nextSteps.map((step) => (
              <li key={step} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-forest/65">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={2.6} aria-hidden />
                {step}
              </li>
            ))}
          </ul>
        </section>

        <Link
          href={LANDING_PATH}
          className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14px] font-medium text-cream shadow-[0_16px_34px_-18px_rgba(69,89,78,0.85)] transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none"
        >
          {REGISTERED_COPY.cta}
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={2.4}
            aria-hidden
          />
        </Link>
      </div>
    </main>
  )
}
