import Link from 'next/link'
import { ArrowUpRight, CircleHelp, Lock, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalDocument, LegalNote, LegalSection } from '@/lib/legal/types'
import { LogoWordmark } from './logo-wordmark'

/* ── Kerangka halaman PUBLIK dokumen legal (inventaris #4 /privacy & #5 /terms) ─
   Dipakai dua dokumen dengan bentuk data yang sama (`LegalDocument`), supaya
   Kebijakan Privasi dan Syarat & Ketentuan tidak pernah tampil sebagai dua
   desain yang berbeda.

   Keputusan yang mengikat layout ini:

     1. PUBLIK, BUKAN HALAMAN APP. Tanpa `ScreenShell`/sidebar, tanpa bottom nav,
        tanpa FAB AI (keduanya menyembunyikan diri di prefix `/privacy`). Orang
        bisa membuka dokumen ini sebelum punya akun — dan itu memang disengaja.
     2. HALAMAN MEMBACA. Lebar teks dibatasi `max-w-[68ch]` supaya mata tidak
        menyapu baris sepanjang layar desktop, dan H1 memakai resep kanon repo
        (`font-display text-3xl … lg:text-4xl`) — bukan `font-black`.
     3. DAFTAR ISI YANG BEKERJA. Satu `<nav>` yang berganti bentuk: kartu ringkas
        2 kolom di atas konten saat mobile, kolom sticky 3/12 di desktop.
        Semuanya anchor biasa (`href="#id"`) — Lenis di root sudah memakai
        `anchors: true`, jadi tidak perlu JS tambahan di sini.
     4. `scroll-mt-24` di setiap section supaya anchor tidak mendarat menempel di
        tepi atas viewport (Lenis membaca `scroll-margin-top` elemen target).
     5. TANPA `'use client'`. Seluruh isinya statis (tanggal versi = konstanta di
        file data), jadi halaman terpanjang di repo ini justru ringan: tidak ada
        state, tidak ada risiko hydration mismatch.
   ────────────────────────────────────────────────────────────────────────── */

export function LegalShell({ document }: { document: LegalDocument }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 pt-9 pb-16 lg:max-w-[1120px] lg:px-10 lg:pt-14 lg:pb-20">
      {/* ── KEPALA DOKUMEN: identitas → judul → status versi → pembuka ─────── */}
      <header>
        <LogoWordmark className="h-6" />
        <p className="mt-5 text-[11px] font-semibold tracking-[0.16em] text-ink/55 uppercase">
          {document.eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
          {document.title}
        </h1>

        {/* baris meta: inilah "Terakhir diperbarui" yang diminta prompt halaman.
            `dateTime` memakai ISO yang dipatok di file data, bukan tanggal hidup. */}
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink/60">
          <span>
            {document.updatedLabel}:{' '}
            <time dateTime={document.updatedIso} className="font-semibold text-ink/80">
              {document.updatedHuman}
            </time>
          </span>
          <span aria-hidden className="text-ink/30">
            ·
          </span>
          <span className="font-semibold text-ink/80">{document.versionLabel}</span>
          <span aria-hidden className="text-ink/30">
            ·
          </span>
          <span>{document.sections.length} bagian</span>
        </p>

        <div className="mt-3.5 max-w-2xl space-y-2.5 text-[13.5px] leading-relaxed text-ink/65">
          {document.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </header>

      {/* ── KISI 12 KOLOM: peta dokumen (3/12) + isi bacaan (8/12, mulai kolom 5)
             — sisa 1 kolom jadi napas di kanan, sama seperti halaman app ──── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-9 lg:grid-cols-12 lg:gap-10">
        {/* Daftar isi. Satu elemen, dua bentuk:
            • mobile  → kartu Oat pucat di ATAS isi (dibaca sebagai peta dokumen)
            • desktop → kolom 3/12 yang menempel saat halaman digulir. `lg:self-start`
              wajib: grid item yang stretched setinggi baris tidak punya ruang
              untuk bergerak, jadi sticky-nya tidak akan terasa sama sekali. */}
        <nav
          aria-labelledby="legal-toc-title"
          className="rounded-[1.5rem] bg-sage/50 p-4 ring-1 ring-forest/10 lg:sticky lg:top-6 lg:col-span-3 lg:self-start lg:rounded-none lg:bg-transparent lg:p-0 lg:ring-0"
        >
          <p
            id="legal-toc-title"
            className="px-1 text-[10.5px] font-semibold tracking-[0.14em] text-ink/55 uppercase"
          >
            {document.tocLabel}
          </p>
          <ol className="mt-2.5 space-y-0.5 lg:mt-3">
            {document.sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex items-baseline gap-2 rounded-xl px-1.5 py-1.5 text-[12.5px] leading-snug text-ink/60 transition-colors duration-200 hover:bg-cream hover:text-ink focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none motion-reduce:transition-none lg:rounded-none lg:border-l-[3px] lg:border-transparent lg:px-3 lg:py-2 lg:hover:border-soil/15 lg:hover:bg-sage/60"
                >
                  <span
                    aria-hidden
                    className="text-[10.5px] font-semibold tabular-nums text-ink/45 lg:text-ink/35"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="flex min-w-0 flex-col gap-7 lg:col-span-8 lg:col-start-5 lg:gap-9">
          {document.sections.map((section) => (
            <LegalSectionBlock key={section.id} section={section} />
          ))}
        </article>
      </div>

      {/* ── KAKI DOKUMEN ──────────────────────────────────────────────────── */}
      <footer className="mt-10 border-t border-soil/12 pt-6 lg:mt-14">
        {/* kejujuran soal status build — pola yang sama dengan /login & /checkout */}
        <p className="flex items-start gap-2.5 rounded-2xl bg-sage/60 px-4 py-3.5 text-[12.5px] leading-relaxed text-ink/65 ring-1 ring-forest/10">
          <Sprout className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={2.2} aria-hidden />
          <span>{document.demoNote}</span>
        </p>

        <LegalNoteBox note={document.reviewNote} className="mt-3.5" />

        <h2 className="mt-7 font-display text-[17px] font-semibold tracking-tight text-ink">
          {document.related.title}
        </h2>
        {/* 2 kolom di tablet, 4 di desktop: kedua dokumen legal membawa 4 tautan,
            dan kolom ke-4 yang kosong lebih rapi daripada kartu yang melebar
            sendiri di baris kedua */}
        <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {document.related.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex h-full flex-col rounded-2xl bg-cream p-4 ring-1 ring-soil/12 transition-colors duration-200 hover:bg-sage/50 focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none motion-reduce:transition-none"
              >
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                  {link.label}
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-ink/40"
                    strokeWidth={2.4}
                    aria-hidden
                  />
                </span>
                <span className="mt-1 text-[11.5px] leading-relaxed text-ink/60">{link.desc}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* catatan sepasang dokumen (privasi ⇄ syarat): dua halaman yang saling
            menyebut, selalu diterbitkan bersamaan */}
        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink/60">
          <CircleHelp className="mt-[1px] size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
          <span>{document.related.crossNote}</span>
        </p>

        <p className="mt-5 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink/55">
          <Lock className="mt-[1px] size-3 shrink-0" strokeWidth={2.2} aria-hidden />
          <span>{document.disclaimer}</span>
        </p>
      </footer>
    </div>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/**
 * Satu bagian dokumen: H2 → paragraf → daftar butir → catatan opsional.
 *
 * `scroll-mt-24` ada di sini, bukan di shell, supaya setiap section yang
 * ditambahkan ke file data otomatis dapat perilaku anchor yang sama.
 */
function LegalSectionBlock({ section }: { section: LegalSection }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <h2 className="font-display text-[19px] font-bold tracking-tight text-ink lg:text-[21px]">
        {section.title}
      </h2>

      <div className="mt-2.5 max-w-[68ch] space-y-3">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-[14px] leading-relaxed text-ink/70">
            {paragraph}
          </p>
        ))}

        {section.bullets && section.bullets.length > 0 && (
          <ul className="space-y-2.5 pt-1">
            {section.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                {/* titik penanda — bukan ikon baru, supaya daftarnya tetap tenang */}
                <span
                  aria-hidden
                  className="mt-[9px] size-1.5 shrink-0 rounded-full bg-forest/50"
                />
                <span className="min-w-0 text-[14px] leading-relaxed text-ink/70">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {section.note && <LegalNoteBox note={section.note} />}
    </section>
  )
}

/**
 * Kotak catatan di dalam/atau di kaki dokumen.
 *
 * `info`   → permukaan Oat pucat + hairline Evergreen (pola callout "Perlu Tahu"
 *            yang sudah dipakai Pusat Bantuan & halaman lain).
 * `review` → permukaan prem pucat (`plum/12`) sebagai penanda jujur bahwa sebuah
 *            klaim belum final. HUENYA yang membedakan, BUKAN warna hurufnya:
 *            teks tetap `ink`, karena prem di atas permukaan terang hanya
 *            mencapai kontras ~2,4:1 (di bawah ambang baca 4.5:1) — sedangkan
 *            sebagai isian + hairline prem tetap terbaca sebagai "nada alert"
 *            tanpa mengorbankan keterbacaan paragraf.
 */
function LegalNoteBox({ note, className }: { note: LegalNote; className?: string }) {
  const review = note.tone === 'review'

  return (
    <div
      className={cn(
        'mt-4 rounded-2xl px-4 py-3.5 ring-1 ring-inset',
        review ? 'bg-plum/12 ring-plum/30' : 'bg-sage/70 ring-forest/10',
        className,
      )}
    >
      <p className="max-w-[68ch] text-[12.5px] leading-relaxed text-ink/75">
        <span className="font-semibold text-ink">{note.label}</span>
        <span aria-hidden className="mx-1.5 text-ink/30">
          ·
        </span>
        {note.body}
      </p>
    </div>
  )
}
