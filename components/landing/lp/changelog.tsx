import { List } from 'lucide-react'
import {
  CHANGELOG_ENTRIES,
  CHANGELOG_META,
  type ChangelogEntry,
} from '@/lib/data/changelog'

/* ── HALAMAN /changelog ──────────────────────────────────────────────────────
   Struktur DISAMAKAN dengan export Framer `BAGIAN CHANGELOG`:

     section          bg abu-terang, padding 0 40
     container        max 1200, hero padding 180 0 120
     hero             pill putih "Changelog" + H1 64/80 normal + subjudul
     entry            grid 333px + 1fr, gap 80
     kolom kiri       tanggal 14px kiri, pill versi kanan, garis bawah
                      (padding-top 58, padding-bottom 14)
     kartu kanan      putih, radius 24, padding 60
     judul rilis      18/27 semibold + garis bawah 16px
     paragraf         18/27, max 620
     grup             "Baru / Peningkatan / Perbaikan" bertumpuk, bukan 3 kolom

   Warna memakai token CatetInd (`sage` untuk latar, `forest` untuk teks) —
   bukan hex baru. Tanpa `'use client'`: seluruh isi statis & tanpa JS. */

export function LandingChangelogLp() {
  return (
    <div className="w-full bg-canvas font-sans text-forest">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="w-full px-6 pt-[120px] pb-12 landing-tab:px-10 landing-tab:pt-[160px] landing:pt-[180px] landing:pb-[120px]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-canvas py-0.5 pr-4 pl-0.5 ring-1 ring-soil/10">
            <span className="flex size-6 items-center justify-center rounded-full bg-sage">
              <List className="size-3.5 text-forest" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[14px] leading-[1.5] text-forest">{CHANGELOG_META.eyebrow}</span>
          </span>

          <h1
            id="landing-changelog-title"
            className="w-full text-center font-display text-[40px] leading-[1.1] font-normal tracking-[-0.03em] text-forest landing-tab:text-[52px] landing:text-[64px] landing:leading-[80px]"
          >
            {CHANGELOG_META.title}
          </h1>

          <p className="max-w-[560px] text-center text-[16px] leading-[1.6] text-forest/60 landing-tab:text-[18px] landing:leading-[27px]">
            {CHANGELOG_META.description}
          </p>
        </div>
      </section>

      {/* ── DAFTAR RILIS ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="landing-changelog-title"
        className="w-full px-6 pb-20 landing-tab:px-10 landing:pb-[120px]"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 landing:gap-20">
          {CHANGELOG_ENTRIES.map((entry, index) => (
            <ChangelogEntryBlock key={entry.id} entry={entry} latest={index === 0} />
          ))}
        </div>
      </section>
    </div>
  )
}

/* ── satu rilis: tanggal & versi di kiri, kartu putih di kanan ────────────── */

function ChangelogEntryBlock({ entry, latest }: { entry: ChangelogEntry; latest: boolean }) {
  return (
    <article
      id={entry.id}
      className="scroll-mt-28 landing:scroll-mt-32 landing:grid landing:grid-cols-[333px_minmax(0,1fr)] landing:gap-20"
    >
      {/* kolom kiri — STATIS (tidak sticky): versi ikut tergulir bersama kartu */}
      <div className="flex items-center justify-between gap-3 border-b border-soil/10 pb-3.5 landing:mt-[58px] landing:self-start">
        <time dateTime={entry.dateIso} className="text-[14px] leading-[21px] text-forest/45">
          {entry.dateHuman}
        </time>
        <span
          className={
            latest
              ? 'inline-flex items-center rounded-full bg-forest px-4 py-1 text-[14px] leading-[21px] text-cream'
              : 'inline-flex items-center rounded-full bg-sage px-4 py-1 text-[14px] leading-[21px] text-forest/70'
          }
        >
          {entry.version}
        </span>
      </div>

      {/* kartu rilis */}
      <div className="mt-5 min-w-0 rounded-[24px] border border-soil/10 bg-canvas p-6 shadow-[0_24px_60px_-48px_rgba(69,89,78,0.35)] landing:mt-0 landing:p-[60px]">
        <h2 className="border-b border-soil/10 pb-4 text-[18px] leading-[27px] font-semibold text-forest">
          {entry.title}
        </h2>

        <div className="mt-6 max-w-[620px] space-y-6">
          {entry.summary.map((paragraph) => (
            <p
              key={paragraph}
              className="text-[16px] leading-[27px] text-forest/60 landing-tab:text-[18px]"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {entry.image && (
          <img
            src={entry.image}
            alt={entry.imageAlt ?? ''}
            width={1200}
            height={840}
            loading="lazy"
            className="mt-8 w-full max-w-[620px] rounded-[16px] object-cover ring-1 ring-soil/10"
          />
        )}

        <div className="mt-8 max-w-[620px] space-y-6">
          {entry.groups.map((group) => (
            <section key={group.title}>
              <h3 className="text-[16px] leading-[27px] text-forest/75 landing-tab:text-[18px]">
                {group.title}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-[10px] size-1.5 shrink-0 rounded-full bg-mint"
                    />
                    <span className="min-w-0 text-[15px] leading-[1.6] text-forest/60 landing-tab:text-[16px]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}
