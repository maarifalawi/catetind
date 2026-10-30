import Link from 'next/link'
import {
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  Info,
  Lock,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalDocument, LegalNote, LegalSection } from '@/lib/legal/types'

/* ── Kerangka halaman PUBLIK dokumen legal (inventaris #4 /privacy & #5 /terms) ─
   Dipakai dua dokumen dengan bentuk data yang sama (`LegalDocument`), supaya
   Kebijakan Privasi dan Syarat & Ketentuan tidak pernah tampil sebagai dua
   desain yang berbeda.

   BENTUKNYA DOKUMEN, BUKAN CHANGELOG. Semua bagian langsung terbaca dari atas
   ke bawah (tanpa kartu-kartu accordion): daftar isi menempel di kiri pada
   desktop, isi dokumen di kanan. Itu pola yang dipakai halaman legal sungguhan
   dan lebih cepat dipindai daripada 14 kartu terpisah.

   Keputusan layout:
     1. LEBAR TERKENDALI. Konten dibatasi `max-w-[1200px]` dan di tengah —
        sama seperti section landing. Bukan full-bleed; monitor lebar tetap
        punya margin yang enak dilihat.
     2. HALAMAN MEMBACA. Kolom teks `max-w-[68ch]`, paragraf 15–16px dengan
        line-height longgar, angka bagian kecil sebagai penanda urutan.
     3. DAFTAR ISI BEKERJA. Satu komponen (`LegalToc`) dipakai dua bentuk:
        `<details>` ringkas di mobile dan kolom sticky 3/12 di desktop. Anchor
        biasa (`href="#id"`); Lenis di root sudah `anchors: true`.
     4. `scroll-mt-28` di tiap section supaya anchor tidak tertutup navbar.
     5. TANPA `'use client'` DAN TANPA ANIMASI MASUK. Dokumen hukum harus tetap
        terbaca utuh walau JavaScript gagal dimuat.
   ────────────────────────────────────────────────────────────────────────── */

const KIND_ICON: Record<'privacy' | 'terms' | 'security', LucideIcon> = {
  privacy: ShieldCheck,
  terms: ScrollText,
  security: Lock,
}

export type LegalShellKind = keyof typeof KIND_ICON

export function LegalShell({
  document,
  kind,
}: {
  document: LegalDocument
  kind: LegalShellKind
}) {
  const Icon = KIND_ICON[kind]

  return (
    <div className="w-full bg-canvas font-sans text-forest">
      {/* ── KEPALA: identitas → judul → satu kalimat → tanggal/versi ───────── */}
      <header className="mx-auto w-full max-w-[1200px] px-5 pt-[130px] pb-10 landing-tab:px-10 landing-tab:pt-[170px] landing:pt-[180px] landing:pb-12">
        <div className="flex w-full flex-col items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-sage py-0.5 pr-4 pl-0.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-canvas">
              <Icon className="size-3.5 text-forest" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[14.5px] leading-[1.5] text-forest">{document.eyebrow}</span>
          </span>

          <h1
            id="legal-title"
            className="max-w-[860px] text-center font-display text-[38px] leading-[1.1] font-medium tracking-[-0.03em] text-forest landing-tab:text-[52px] landing:text-[60px]"
          >
            {document.title}
          </h1>

          <p className="max-w-[640px] text-center text-[16px] leading-[1.6] text-forest/60 landing-tab:text-[18px]">
            {document.intro[0]}
          </p>

          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13.5px] leading-[1.5] text-forest/45">
            <time dateTime={document.updatedIso}>
              {document.updatedLabel} {document.updatedHuman}
            </time>
            <span aria-hidden>·</span>
            <span>{document.versionLabel}</span>
          </p>
        </div>
      </header>
      {/* ── ISI DOKUMEN: daftar isi + artikel (bukan kartu changelog) ──────── */}
      <section
        aria-labelledby="legal-title"
        className="mx-auto w-full max-w-[1200px] px-5 pb-16 landing-tab:px-10 landing:pb-[120px]"
      >
        <div className="grid w-full grid-cols-1 gap-8 landing:grid-cols-12 landing:gap-10">
          {/* mobile: daftar isi dilipat supaya isi tidak terdorong terlalu jauh */}
          <details className="group rounded-[20px] bg-sage/60 px-5 py-4 ring-1 ring-soil/10 landing:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-medium tracking-[0.16em] text-forest/55 uppercase [&::-webkit-details-marker]:hidden">
              {document.tocLabel}
              <ChevronDown
                className="size-4 shrink-0 text-forest/50 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>
            <LegalToc document={document} className="mt-3" />
          </details>

          {/* desktop: kolom 3/12 yang menempel saat halaman digulir */}
          <nav
            aria-label={document.tocLabel}
            className="hidden landing:sticky landing:top-28 landing:col-span-3 landing:block landing:self-start"
          >
            <div className="rounded-[20px] bg-sage/60 p-5 ring-1 ring-soil/10">
              <p className="px-1 text-[11.5px] font-medium tracking-[0.16em] text-forest/50 uppercase">
                {document.tocLabel}
              </p>
              <LegalToc document={document} className="mt-3" />
            </div>
          </nav>

          {/* artikel: satu permukaan putih, semua bagian langsung terbaca */}
          <article className="min-w-0 rounded-[24px] border border-soil/10 bg-canvas p-6 landing:col-span-9 landing:p-10">
            {document.sections.map((section, index) => (
              <LegalSectionBlock key={section.id} section={section} index={index} />
            ))}
          </article>
        </div>

        {/* ── KAKI DOKUMEN: tautan + catatan status, tanpa kotak besar ────── */}
        <div className="mt-10 grid gap-5 border-t border-soil/10 pt-8 landing:grid-cols-[220px_minmax(0,1fr)] landing:gap-10">
          <h2 className="text-[12px] font-medium tracking-[0.16em] text-forest/45 uppercase">
            {document.related.title}
          </h2>

          <div className="flex min-w-0 flex-col gap-6">
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {document.related.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1.5 rounded-[4px] text-[15px] leading-[1.5] font-medium text-forest underline decoration-soil/20 underline-offset-4 transition-colors hover:decoration-forest focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none"
                  >
                    {link.label}
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-forest/40 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex max-w-[68ch] flex-col gap-2.5">
              <p className="flex items-start gap-2 text-[12.5px] leading-[1.65] text-forest/55">
                <CircleAlert
                  className="mt-0.5 size-3.5 shrink-0 text-plum"
                  strokeWidth={2}
                  aria-hidden
                />
                <span>
                  <span className="font-medium text-forest/80">
                    {document.reviewNote.label}
                  </span>{' '}
, {document.reviewNote.body}
                </span>
              </p>

              <p className="text-[12px] leading-[1.65] text-forest/40">{document.demoNote}</p>

              <p className="flex items-start gap-2 text-[12px] leading-[1.65] text-forest/40">
                <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2} aria-hidden />
                <span>{document.disclaimer}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/**
 * Daftar isi. SATU markup, dua bungkus (details mobile & nav sticky desktop),
 * supaya nomor urut dan judul bagian tidak pernah ditulis dua kali.
 */
function LegalToc({ document, className }: { document: LegalDocument; className?: string }) {
  return (
    <ol className={cn('flex flex-col gap-0.5', className)}>
      {document.sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="group flex items-start gap-2.5 rounded-[12px] px-2.5 py-2 text-[14px] leading-[1.45] text-forest/60 transition-colors duration-200 hover:bg-canvas hover:text-forest focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none motion-reduce:transition-none"
          >
            <span
              aria-hidden
              className="mt-px text-[11.5px] font-medium tabular-nums text-forest/35 transition-colors group-hover:text-forest/60"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0">{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}

/**
 * Satu bagian dokumen: nomor → H2 → paragraf → daftar butir → catatan opsional.
 *
 * `scroll-mt-28` ada di sini, bukan di shell, supaya setiap section yang
 * ditambahkan ke file data otomatis dapat perilaku anchor yang sama di bawah
 * navbar landing yang fixed.
 */
function LegalSectionBlock({ section, index }: { section: LegalSection; index: number }) {
  return (
    <section
      id={section.id}
      className={cn(
        'scroll-mt-28 landing:scroll-mt-32',
        index > 0 && 'mt-8 border-t border-soil/10 pt-8',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sage text-[12px] font-medium tabular-nums text-forest/55"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2 className="font-display text-[20px] leading-[1.3] font-medium tracking-[-0.02em] text-forest landing-tab:text-[24px]">
          {section.title}
        </h2>
      </div>

      <div className="mt-3 max-w-[68ch] space-y-3 landing-tab:pl-10">
        {section.paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="text-[16px] leading-[1.7] text-forest/70 landing-tab:text-[17px]"
          >
            {paragraph}
          </p>
        ))}

        {section.bullets && section.bullets.length > 0 && (
          <ul className="space-y-2.5 pt-1">
            {section.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[10px] size-1.5 shrink-0 rounded-full bg-mint" />
                <span className="min-w-0 text-[16px] leading-[1.7] text-forest/70 landing-tab:text-[17px]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {section.note && <LegalNoteBox note={section.note} className="landing-tab:ml-10" />}
    </section>
  )
}

/**
 * Kotak catatan tipis di dalam bagian.
 *
 * `info` → permukaan Oat pucat. `review` → prem pucat sebagai penanda jujur
 * bahwa klaimnya belum final; teks tetap `forest` karena prem di atas
 * permukaan terang tidak mencapai kontras baca 4.5:1.
 */
function LegalNoteBox({ note, className }: { note: LegalNote; className?: string }) {
  const review = note.tone === 'review'
  const NoteIcon = review ? CircleAlert : Info

  return (
    <div
      className={cn(
        'mt-4 max-w-[68ch] rounded-[16px] px-4 py-3 ring-1 ring-inset',
        review ? 'bg-plum/10 ring-plum/25' : 'bg-sage/60 ring-soil/10',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[12.5px] leading-[1.5] font-medium text-forest">
        <NoteIcon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        {note.label}
      </p>
      <p className="mt-1 text-[13.5px] leading-[1.65] text-forest/70">{note.body}</p>
    </div>
  )
}
