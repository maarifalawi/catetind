import Link from 'next/link'
import { ArrowRight, Lock, ShieldCheck, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoWordmark } from './logo-wordmark'
import { PlantIllustration } from './plant-illustration'
import { ShareAchievementCard } from './share-achievement-card'
import { NO_AUTO_RENEW_BADGE } from '@/lib/data/pricing'
import {
  DEMO_SHARE_STATES,
  SHARE_CARD_PRIVACY_LINE,
  SHARE_CTA,
  SHARE_CTA_HINT,
  SHARE_CTA_HREF,
  SHARE_DEMO_COPY,
  SHARE_GROWING_TITLE,
  SHARE_INVITE_BODY,
  SHARE_INVITE_TITLE,
  SHARE_PAGE_EYEBROW,
  SHARE_PAGE_SUBHEAD,
  SHARE_PRIVACY_NOTE,
  SHARE_THIN_CTA_HINT,
  SHARE_UNAVAILABLE_ART_LABEL,
  SHARE_UNAVAILABLE_BODY,
  SHARE_UNAVAILABLE_CTA,
  SHARE_UNAVAILABLE_CTA_HREF,
  SHARE_UNAVAILABLE_TITLE,
  buildShareHref,
  getShareCard,
  isThinCard,
  shareGrowingNote,
  shareHeadline,
  shareVisitorPledge,
  type ShareCard,
} from '@/lib/data/share'

/* ── Share Preview Publik (/share/[id]) — inventaris #16 · PRD 6547–6633 ──────
   Satu-satunya halaman CatetInd yang dibuka orang yang belum kenal produknya,
   dan ia datang karena rasa bangga seseorang. Tiga aturan mengikat layout ini:

     1. BISA DIBANGGAKAN, TAPI BUNTU — kartu harus estetis & layak di-screenshot
        ulang, dan boleh dibuka siapa pun TANPA login (justru itu pintunya).
        Privacy guard-nya bukan di tampilan, tapi di tipe data: `ShareCard`
        memang tidak punya field uang (lihat `lib/data/share.ts`).
     2. JUJUR — kalau catatannya masih sedikit, kartunya tampil apa adanya
        sebagai "masih tumbuh". Tidak ada testimoni atau angka sosial karangan.
     3. HANGAT, BUKAN HARD-SELL — satu CTA, satu kalimat, tanpa hitungan mundur.

   Komponen ini TANPA `'use client'` dengan sengaja (pola `not-found-screen`):
   seluruh isinya statis, jadi tidak ada state/tanggal hidup yang bisa memicu
   hydration mismatch — dan halaman publik ini jadi seringan mungkin saat dibuka
   dari tautan WhatsApp orang lain.

   Halaman PUBLIK: `PhoneStage plain` di route, tanpa sidebar/FAB, dan
   `MobileBottomNav` + AI chat widget menyembunyikan diri di prefix `/share`.
   ────────────────────────────────────────────────────────────────────────── */

export function SharePreviewScreen({ id }: { id: string }) {
  const card = getShareCard(id)

  if (card === 'unknown') return <UnavailableView />
  return <CardView card={card} />
}

/** label kecil yang dipakai kepala halaman di semua state */
function EyebrowLine({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40',
        className,
      )}
    >
      {SHARE_PAGE_EYEBROW}
    </p>
  )
}

/* ── KARTU ADA: tampilan utama ───────────────────────────────────────────── */
function CardView({ card }: { card: ShareCard }) {
  const thin = isThinCard(card)

  return (
    <div className="mx-auto w-full max-w-[480px] px-5 pb-16 pt-9 lg:max-w-[1180px] lg:px-10 lg:pb-20 lg:pt-14">
      {/* identitas pemilik kartu — nama dulu, baru produknya */}
      <header>
        <LogoWordmark className="h-6" />
        <EyebrowLine className="mt-5" />
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
          {shareHeadline(card.ownerName)}
        </h1>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink/60">
          {SHARE_PAGE_SUBHEAD}
        </p>
      </header>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:mt-9 lg:grid-cols-12 lg:gap-9">
        {/* ── KOLOM KARTU (kiri) — plus dua lapis catatan privasi di bawahnya ── */}
        <div className="flex flex-col gap-3 lg:col-span-5">
          <ShareAchievementCard card={card} />

          <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink/50">
            <Lock className="mt-[1px] size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
            {SHARE_CARD_PRIVACY_LINE}
          </p>
          <p className="text-[11px] leading-relaxed text-ink/40">{SHARE_PRIVACY_NOTE}</p>
        </div>

        {/* ── KOLOM AJAKAN (kanan) — keadaan kartu dulu, baru CTA ─────────── */}
        <div className="flex flex-col gap-5 lg:col-span-6 lg:col-start-7">
          {thin && (
            <section className="rounded-[1.75rem] bg-sage/45 p-5 ring-1 ring-soil/10">
              <span className="flex size-9 items-center justify-center rounded-xl bg-cream text-forest">
                <Sprout className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
              <h2 className="mt-3 font-display text-[15px] font-bold tracking-tight text-ink">
                {SHARE_GROWING_TITLE}
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink/60">
                {shareGrowingNote(card)}
              </p>
            </section>
          )}

          <InviteCard thin={thin} ownerName={card.ownerName} />
          <DemoStateLinks activeId={card.id} />
        </div>
      </div>
    </div>
  )
}

/* ── CTA + janji privasi untuk pengunjung ─────────────────────────────────────
   Tombol utama satu-satunya, diletakkan di ujung kolom (zona ibu jari di mobile)
   dan dibungkus `next/link` — pola CTA navigasi repo. Produk ini tidak memakai
   auto-renew paksa, jadi fakta itu dipakai sebagai penutup yang menenangkan —
   bukan klaim diskon atau urgensi palsu. */
function InviteCard({ thin, ownerName }: { thin: boolean; ownerName: string }) {
  return (
    <section className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-mint/25 text-forest">
        <Sprout className="size-4" strokeWidth={2.2} aria-hidden />
      </span>
      <h2 className="mt-3.5 font-display text-[19px] font-bold tracking-tight text-ink">
        {SHARE_INVITE_TITLE}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink/60">{SHARE_INVITE_BODY}</p>

      <Link
        href={SHARE_CTA_HREF}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest px-6 text-sm font-semibold text-cream shadow-[0_18px_40px_-30px_rgba(0,0,0,0.55)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.99] motion-reduce:transition-none"
      >
        {SHARE_CTA}
        <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
      </Link>
      <p className="mt-2 text-center text-[11.5px] leading-relaxed text-ink/45">
        {thin ? SHARE_THIN_CTA_HINT : SHARE_CTA_HINT}
      </p>

      <p className="mt-3.5 border-t border-soil/12 pt-3.5 text-[11.5px] leading-relaxed text-ink/55">
        {NO_AUTO_RENEW_BADGE}
      </p>

      {/* janji privasi pengunjung — CONTEXT-WAJIB §5.3: halaman yang menyentuh
          data orang lain wajib mengulang janji ini */}
      <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink/45">
        <ShieldCheck className="mt-[1px] size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
        {shareVisitorPledge(ownerName)}
      </p>
    </section>
  )
}

/* ── KARTU TIDAK ADA: empty state hangat (bukan 404 kaku) ─────────────────────
   Tautan kartu gampang terpotong saat dibagikan lewat chat. Orang yang datang
   ke sini belum tentu tahu CatetInd, jadi halamannya tidak boleh terasa seperti
   sistem menegur: jelaskan ringan, tunjukkan tanaman kecil yang masih tumbuh,
   lalu beri satu jalan pulang (pola yang sama dengan `not-found-screen`). */
function UnavailableView() {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-center px-5 pb-16 pt-10 text-center lg:max-w-[560px] lg:pt-16">
      <LogoWordmark className="h-6" />

      <span
        role="img"
        aria-label={SHARE_UNAVAILABLE_ART_LABEL}
        className="mt-8 flex size-32 items-center justify-center rounded-[2.25rem] bg-sage/45 ring-1 ring-soil/8"
      >
        <PlantIllustration
          stage={2}
          className="w-24 motion-reduce:[&_g]:animate-none"
        />
      </span>

      <EyebrowLine className="mt-6" />
      <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
        {SHARE_UNAVAILABLE_TITLE}
      </h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink/60">
        {SHARE_UNAVAILABLE_BODY}
      </p>

      <Link
        href={SHARE_UNAVAILABLE_CTA_HREF}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest px-6 text-sm font-semibold text-cream shadow-[0_18px_40px_-30px_rgba(0,0,0,0.55)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.99] motion-reduce:transition-none sm:w-auto"
      >
        {SHARE_UNAVAILABLE_CTA}
        <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
      </Link>

      <div className="mt-9 w-full">
        <DemoStateLinks activeId="" />
      </div>
    </div>
  )
}

/* ── KAKI DEMO ────────────────────────────────────────────────────────────────
   Tiga state halaman ini cuma bisa direview kalau tautannya terlihat (pola sama
   dengan `/join/[code]`). Permukaannya pucat & teksnya sekunder supaya tidak
   pernah terbaca sebagai aksi produk oleh pengunjung biasa. */
function DemoStateLinks({ activeId }: { activeId: string }) {
  return (
    <section className="rounded-[1.75rem] bg-sage/50 p-5 ring-1 ring-soil/10">
      <h2 className="font-display text-[14px] font-semibold tracking-tight text-ink">
        {SHARE_DEMO_COPY.title}
      </h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink/55">{SHARE_DEMO_COPY.body}</p>

      <p className="mt-3.5 border-t border-soil/12 pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/40">
        {SHARE_DEMO_COPY.statesLabel}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {DEMO_SHARE_STATES.map((state) => {
          const active = state.id === activeId
          return (
            <li key={state.id}>
              <Link
                href={buildShareHref(state.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors duration-200 motion-reduce:transition-none',
                  active
                    ? 'bg-forest text-mint'
                    : 'bg-cream text-ink/60 ring-1 ring-soil/14 hover:text-ink',
                )}
              >
                {state.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}


