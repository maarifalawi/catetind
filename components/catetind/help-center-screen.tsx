'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Lock,
  Search,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  HELP_BACK_TO_QUICK,
  HELP_CONTACT_LABEL,
  HELP_CONTACT_SUBJECT,
  HELP_CONTACT_TO,
  HELP_DEFAULT_BLURB,
  HELP_DEFAULT_TITLE,
  HELP_EMPTY_BLURB,
  HELP_EMPTY_TITLE,
  HELP_EXPORT_LABEL,
  HELP_EXPORT_TOAST,
  HELP_EYEBROW,
  HELP_FEEDBACK_QUESTION,
  HELP_FEEDBACK_THANKS,
  HELP_GREETING,
  HELP_LEGAL_LINKS,
  HELP_LEGAL_NOTE,
  HELP_OPEN_TOPIC,
  HELP_PRIVACY_SHIELD,
  HELP_PRO_TIP_LABEL,
  HELP_QUICK_ANSWERS,
  HELP_RESULT_TITLE,
  HELP_SEARCH_LABEL,
  HELP_SEARCH_PLACEHOLDER,
  HELP_SIDEBAR_NOTE,
  HELP_SIDEBAR_TITLE,
  HELP_SUPPORT_FOOTNOTE,
  HELP_TITLE,
  HELP_TOPICS,
  buildHelpExportPayload,
  hasSystemIssue,
  helpExportFilename,
  searchHelp,
  systemIndicators,
  topicByLabel,
  totalHelpArticles,
  type HelpArticle,
  type HelpArticleHit,
  type HelpTopic,
  type QuickAnswer,
  type SystemHealth,
  type SystemIndicator,
} from '@/lib/data/help'
import { MetaChip } from './meta-chip'
import { ScreenShell } from './screen-shell'

/* ── Pusat Bantuan (/app/help) — inventaris #30 · Domain 4C ──────────────────
   Tiga lapis pertahanan, persis seperti rencana produk:

     1. PENCARIAN + "SERING BIKIN BINGUNG" → mematikan 90% pertanyaan simpel
        bahkan sebelum user membaca artikel.
     2. ARTIKEL bersuara Minca (langkah pendek, bahasa sehari-hari) → bikin
        membaca terasa murah, bukan pekerjaan.
     3. DEFLECTION LOOP di kaki setiap artikel → tombol "Hubungi Founder"
        SENGAJA disembunyikan sampai user menekan 👎. Artinya: user sudah
        membaca dan tetap tidak terbantu baru boleh menghubungi manusia.

   Konsekuensinya: TIDAK ADA tombol kontak di tempat lain di halaman ini. Satu
   catatan kecil di sidebar hanya memberi tahu DI MANA gerbangnya, tanpa
   membukanya (lihat HELP_SIDEBAR_NOTE).

   Tata letak: melebar penuh ala desktop (`lg:grid-cols-12`, sidebar 3/12),
   sama seperti Tagihan, Joint, dan Ajak Teman — bukan kontainer sempit.
   ────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** status sistem dihitung sekali dari mock — datanya statis, tidak perlu state */
const SYSTEM_INDICATORS = systemIndicators()
const SHOW_SYSTEM_STATUS = hasSystemIssue()
const TOTAL_ARTICLES = totalHelpArticles()

/** nada teks tiap tingkat kesehatan; hanya "down" yang boleh sedikit menonjol */
const HEALTH_TONE: Record<SystemHealth, string> = {
  operational: 'text-ink/65',
  degraded: 'text-ink/70',
  down: 'font-semibold text-plum',
}

/** pilihan user di kaki artikel — 👍 puas, 👎 butuh manusia */
type FeedbackVote = 'up' | 'down'

/* ── AKSI (murni, tidak butuh state komponen) ─────────────────────────────── */

/**
 * 📦 Export Data Saya — PRD Domain 4C (Mekanisme 1).
 *
 * Menyusun file JSON berisi SEMUA data user, lalu menyerahkannya ke perangkat
 * user sendiri. Tidak ada satu byte pun yang lewat ke server kami — itulah
 * "kompensasi" dari keputusan privacy-first: kami tidak bisa melihat data, jadi
 * kami pastikan user selalu bisa mengambilnya sendiri, tanpa minta izin.
 */
function handleExportData() {
  try {
    const blob = new Blob([JSON.stringify(buildHelpExportPayload(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = helpExportFilename()
    document.body.appendChild(link)
    link.click()
    link.remove()
    /* objectURL dilepas setelah browser sempat memulai unduhannya */
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(HELP_EXPORT_TOAST)
  } catch {
    toast.error('Gagal menyiapkan file export. Coba lagi sebentar ya.')
  }
}

/**
 * ✉️ Hubungi Founder — draft email yang sudah terisi info perangkat + waktu.
 *
 * Browser & waktu otomatis dilampirkan karena kami TIDAK bisa membuka data atau
 * log per akun: satu-satunya cara mendebug adalah apa yang user bawa sendiri
 * (screenshot + konteks). Placeholder dalam kurung siku dibiarkan apa adanya
 * supaya user sadar bagian itu wajib dia isi.
 */
function handleContactFounder() {
  const subject = encodeURIComponent(HELP_CONTACT_SUBJECT)
  const body = encodeURIComponent(
    `Halo tim CatetInd,\n\nSaya butuh bantuan soal: [JELASKAN MASALAH]\n\n` +
      `Screenshot terlampir: [LAMPIRKAN SCREENSHOT]\n\n` +
      `---\n` +
      `Info Perangkat:\n` +
      `- Browser: ${navigator.userAgent}\n` +
      `- Waktu: ${new Date().toISOString()}\n`,
  )
  window.open(`mailto:${HELP_CONTACT_TO}?subject=${subject}&body=${body}`)
}

export function HelpCenterScreen() {
  /** topik aktif — `null` = tampilkan konten default "Sering Bikin Bingung" */
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  /** kartu quick answer yang sedang terbuka (boleh lebih dari satu) */
  const [openAnswers, setOpenAnswers] = useState<Record<string, boolean>>({})
  /** hasil vote per artikel — key = HelpArticle.id */
  const [votes, setVotes] = useState<Record<string, FeedbackVote>>({})

  const reduceMotion = useReducedMotion()
  /** penanda awal kolom konten — tujuan lompatan saat user ganti topik */
  const contentRef = useRef<HTMLDivElement | null>(null)

  /** pencarian real-time: memfilter judul + isi artikel dan quick answer */
  const results = useMemo(() => searchHelp(query), [query])
  const activeTopic = useMemo(
    () => HELP_TOPICS.find((topic) => topic.id === activeTopicId) ?? null,
    [activeTopicId],
  )

  /* ── AKSI HALAMAN ───────────────────────────────────────────────────────── */

  /** antar user ke awal kolom konten (di mobile, chip topik ada di atasnya) */
  function scrollToContent() {
    contentRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  function handleSelectTopic(topicId: string) {
    setActiveTopicId(topicId)
    /* ganti topik = ganti konteks: kosongkan pencarian supaya user tidak
       melihat hasil lama yang menempel dari kata kunci sebelumnya */
    setQuery('')
    scrollToContent()
  }

  function handleBackToQuickAnswers() {
    setActiveTopicId(null)
    scrollToContent()
  }

  /** chip topik di kartu quick answer → buka topiknya */
  function handleOpenQuickTopic(item: QuickAnswer) {
    const topic = topicByLabel(item.topic)
    if (topic) handleSelectTopic(topic.id)
  }

  function handleVote(articleId: string, vote: FeedbackVote) {
    setVotes((prev) => ({ ...prev, [articleId]: vote }))
  }

  /* ── RENDER ─────────────────────────────────────────────────────────────── */

  return (
    <ScreenShell>
      {/* ── HEADER — resep kanonik H1 yang sama dengan Dashboard & halaman lain ── */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink/45">{HELP_EYEBROW}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            {HELP_TITLE}
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink/55 lg:mt-3 lg:text-sm">
            {HELP_GREETING}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-3">
            <MetaChip icon={CircleHelp}>{HELP_TOPICS.length} topik</MetaChip>
            <MetaChip icon={BookOpen}>{TOTAL_ARTICLES} artikel</MetaChip>
            <MetaChip icon={ShieldCheck} tone="scope">
              Founder-led support
            </MetaChip>
          </div>
        </div>
      </header>

      {/* ── 2 KOLOM: sidebar topik (3/12) + konten (9/12) ─────────────────────
          Melebar penuh, tanpa kontainer sempit: kolom kiri sticky menemani
          artikel panjang, kolom kanan memakai lebar yang tersedia. */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        {/* ── KIRI (3/12) — navigasi topik ───────────────────────────────────
            Mobile: deret chip yang bisa digeser, sejajar jempol.
            Desktop: daftar vertikal sticky + catatan kecil soal jalur support. */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-6">
            <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:hidden">
              {HELP_TOPICS.map((topic) => {
                const active = topic.id === activeTopicId
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleSelectTopic(topic.id)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium ring-1 transition-colors',
                      active
                        ? 'bg-forest text-cream ring-forest'
                        : 'bg-cream text-ink/60 ring-soil/12 hover:bg-sage/60 hover:text-ink',
                    )}
                  >
                    <span aria-hidden>{topic.emoji}</span>
                    {topic.label}
                  </button>
                )
              })}
            </div>

            <nav aria-label="Topik bantuan" className="hidden lg:block">
              <p className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                {HELP_SIDEBAR_TITLE}
              </p>
              <ul className="mt-3 space-y-0.5">
                {HELP_TOPICS.map((topic) => {
                  const active = topic.id === activeTopicId
                  return (
                    <li key={topic.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectTopic(topic.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2.5 border-l-[3px] py-2.5 pr-2 pl-3 text-left text-[13.5px] transition-colors',
                          active
                            ? 'border-forest bg-sage/60 font-semibold text-ink'
                            : 'border-transparent text-ink/55 hover:border-soil/15 hover:bg-sage/40 hover:text-ink',
                        )}
                      >
                        <span aria-hidden className="text-[15px] leading-none">
                          {topic.emoji}
                        </span>
                        <span className="min-w-0 flex-1">{topic.label}</span>
                        <span className="shrink-0 text-[10.5px] tabular-nums text-ink/35">
                          {topic.articles.length}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 rounded-2xl bg-sage/50 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink/60 ring-1 ring-forest/10">
                💡 {HELP_SIDEBAR_NOTE}
              </p>
            </nav>
          </div>
        </aside>

        {/* ── KANAN (9/12) — status, pencarian, isi ──────────────────────────── */}
        <div ref={contentRef} className="flex min-w-0 flex-col gap-4 lg:col-span-9 lg:gap-5">
          {/* 2A — strip status: HANYA muncul kalau ada subsistem yang tidak normal */}
          {SHOW_SYSTEM_STATUS && <SystemStatusBar indicators={SYSTEM_INDICATORS} />}
          {/* 2B — pencarian besar & menonjol */}
          <SearchBar query={query} onChange={setQuery} />
          {/* ── ISI: hasil pencarian → topik aktif → konten default ───────────── */}
          {!results.idle ? (
            <SearchResults
              query={results.query}
              articles={results.articles}
              quickAnswers={results.quickAnswers}
              openAnswers={openAnswers}
              onToggleAnswer={(id) =>
                setOpenAnswers((prev) => ({ ...prev, [id]: !prev[id] }))
              }
              onOpenTopic={handleOpenQuickTopic}
              votes={votes}
              onVote={handleVote}
            />
          ) : activeTopic ? (
            <TopicArticles
              topic={activeTopic}
              votes={votes}
              onVote={handleVote}
              onBack={handleBackToQuickAnswers}
            />
          ) : (
            <QuickAnswerSection
              title={HELP_DEFAULT_TITLE}
              blurb={HELP_DEFAULT_BLURB}
              items={HELP_QUICK_ANSWERS}
              openAnswers={openAnswers}
              onToggleAnswer={(id) =>
                setOpenAnswers((prev) => ({ ...prev, [id]: !prev[id] }))
              }
              onOpenTopic={handleOpenQuickTopic}
            />
          )}

          {/* jalur support versi mobile — di desktop catatan ini nangkring di sidebar */}
          <p className="rounded-2xl bg-sage/50 px-4 py-3 text-[11.5px] leading-relaxed text-ink/60 ring-1 ring-forest/10 lg:hidden">
            💡 {HELP_SIDEBAR_NOTE}
          </p>
        </div>
      </div>

      {/* ── KAKI HALAMAN: bukti tertulisnya, bukan cuma janji di halaman ini ─────
          Topik "Keamanan & Privasi" di atas adalah klaim. Kebijakan Privasi
          adalah versi tertulis dari klaim itu — dan satu-satunya tautan ke sana
          yang bisa ditempuh orang TANPA masuk ke Pengaturan lebih dulu. */}
      <footer className="mt-6 border-t border-soil/12 pt-5 lg:mt-8">
        <p className="text-[12.5px] leading-relaxed text-ink/60">{HELP_LEGAL_NOTE}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {HELP_LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-sage/70 px-3.5 py-2 text-[12.5px] font-semibold text-forest ring-1 ring-forest/10 transition-colors duration-200 hover:bg-mint/40 focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none motion-reduce:transition-none"
              >
                <ShieldCheck className="size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/**
 * 2A — Strip status sistem. Bentuknya SATU baris ringkas: nama subsistem,
 * emoji penanda, lalu kalimat status. Ia tidak pernah muncul saat semua normal
 * (lihat `SHOW_SYSTEM_STATUS`), jadi halaman tidak punya elemen dekoratif yang
 * diam-diam jadi noise setiap hari.
 */
function SystemStatusBar({ indicators }: { indicators: SystemIndicator[] }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl bg-sage/60 px-4 py-2.5 text-[12px] ring-1 ring-forest/10"
    >
      {indicators.map((item, index) => (
        <span
          key={item.key}
          className={cn(
            'flex items-center gap-1.5',
            /* pemisah tipis antar subsistem, hanya saat muat sebaris */
            index > 0 && 'sm:border-l sm:border-forest/15 sm:pl-4',
          )}
        >
          <span aria-hidden>{item.emoji}</span>
          <span className="font-semibold text-ink">{item.name}:</span>
          <span className={HEALTH_TONE[item.health]}>{item.label}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * 2B — Pencarian besar. Placeholder-nya CONTOH PERTANYAAN (bukan "Cari
 * bantuan…" yang kosong makna) supaya user tahu ia boleh nulis pakai bahasa
 * sehari-hari. Tinggi 14/16 + ikon = elemen paling menonjol di kolom ini.
 */
function SearchBar({ query, onChange }: { query: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-14 items-center gap-3 rounded-2xl bg-cream px-4 ring-1 ring-soil/12 transition-shadow focus-within:ring-2 focus-within:ring-forest/30 lg:h-16 lg:px-5">
      <Search className="size-5 shrink-0 text-ink/35" strokeWidth={2.2} aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder={HELP_SEARCH_PLACEHOLDER}
        aria-label={HELP_SEARCH_LABEL}
        className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/35 lg:text-base"
      />
      {query && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-sage/60 hover:text-ink"
        >
          <X className="size-4" strokeWidth={2.4} />
        </button>
      )}
    </label>
  )
}

/**
 * Accordion halus — pola yang sama dengan `<Reveal>` di budget-sheet.tsx:
 * tinggi 0 → auto, `overflow-hidden` hanya selama animasi. Dipakai kartu
 * quick answer (dan panel support di kaki artikel memakai pola motion yang
 * sama, langsung di tempatnya).
 */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Section 3 — "Sering Bikin Bingung". Ini konten DEFAULT halaman: pertanyaan
 * yang benar-benar bikin panik, bukan daftar fitur. Grid 2–3 kolom mengikuti
 * lebar layar; di HP tetap satu kolom supaya teksnya lega.
 */
function QuickAnswerSection({
  title,
  blurb,
  items,
  openAnswers,
  onToggleAnswer,
  onOpenTopic,
}: {
  title: string
  blurb: string
  items: QuickAnswer[]
  openAnswers: Record<string, boolean>
  onToggleAnswer: (id: string) => void
  onOpenTopic: (item: QuickAnswer) => void
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink lg:text-[28px]">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink/55">{blurb}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
        {items.map((item) => (
          <QuickAnswerCard
            key={item.id}
            item={item}
            open={Boolean(openAnswers[item.id])}
            onToggle={() => onToggleAnswer(item.id)}
            onOpenTopic={onOpenTopic}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * Kartu pertanyaan populer. Seluruh kepala kartu adalah tombol (target klik
 * besar) dan jawabannya terbuka INLINE — user tidak dipaksa pindah halaman
 * hanya untuk tahu jawaban singkat. "Buka topik" sengaja jadi tombol terpisah
 * supaya tidak ada salah klik antara "baca jawaban" dan "masuk topik".
 */
function QuickAnswerCard({
  item,
  open,
  onToggle,
  onOpenTopic,
}: {
  item: QuickAnswer
  open: boolean
  onToggle: () => void
  onOpenTopic: (item: QuickAnswer) => void
}) {
  const topic = topicByLabel(item.topic)
  return (
    <div
      className={cn(
        'rounded-[1.75rem] bg-cream transition-shadow',
        open
          ? 'shadow-[0_18px_40px_-34px_rgba(0,0,0,0.55)] ring-2 ring-forest/25'
          : 'ring-1 ring-soil/12',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-5 text-left sm:p-6"
      >
        <span className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/70 px-2.5 py-0.5 text-[10.5px] font-semibold text-forest ring-1 ring-forest/10">
            {item.topic}
          </span>
          <span className="mt-2 block font-display text-[15.5px] leading-snug font-bold tracking-tight text-ink sm:text-base">
            {item.question}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={2.4}
          className={cn(
            'mt-1 size-4 shrink-0 text-ink/35 transition-transform duration-300',
            open && 'rotate-180',
          )}
        />
      </button>

      <Reveal show={open}>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="text-[13.5px] leading-relaxed text-ink/70">{item.answer}</p>
          {topic && (
            <button
              type="button"
              onClick={() => onOpenTopic(item)}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest/75 underline-offset-4 transition-colors hover:text-forest hover:underline"
            >
              {HELP_OPEN_TOPIC}: {topic.label}
              <ArrowLeft className="size-3.5 rotate-180" strokeWidth={2.4} aria-hidden />
            </button>
          )}
        </div>
      </Reveal>
    </div>
  )
}

/**
 * Section 4 — tampilan satu topik: kepala topik (emoji + sapaan Minca) lalu
 * artikel-artikelnya berurutan. Tetap satu kolom di semua lebar: langkah
 * bernomor yang panjang lebih enak dibaca bertumpuk daripada berdampingan.
 */
function TopicArticles({
  topic,
  votes,
  onVote,
  onBack,
}: {
  topic: HelpTopic
  votes: Record<string, FeedbackVote>
  onVote: (articleId: string, vote: FeedbackVote) => void
  onBack: () => void
}) {
  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sage via-cream to-mint-soft text-[20px] ring-1 ring-forest/10"
          >
            {topic.emoji}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {topic.label}
            </h2>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink/55">
              {topic.blurb}
            </p>
          </div>
        </div>
        {/* jalan pulang ke konten default — tanpa ini user bisa "tersesat" di topik */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-forest/70 underline-offset-4 transition-colors hover:text-forest hover:underline"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.4} aria-hidden />
          {HELP_BACK_TO_QUICK}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:gap-5">
        {topic.articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            vote={votes[article.id]}
            onVote={onVote}
          />
        ))}
      </div>
    </section>
  )
}


/**
 * Section 4 — template SATU artikel: judul, langkah bernomor, callout opsional,
 * lalu kaki feedback. `topicLabel` hanya dipakai di hasil pencarian, tempat
 * artikel muncul jauh dari judul topik pemiliknya.
 */
function ArticleCard({
  article,
  topicLabel,
  vote,
  onVote,
}: {
  article: HelpArticle
  topicLabel?: string
  vote?: FeedbackVote
  onVote: (articleId: string, vote: FeedbackVote) => void
}) {
  return (
    <article className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 sm:p-6">
      {topicLabel && (
        <span className="mb-2 inline-flex items-center rounded-full bg-sage/70 px-2.5 py-0.5 text-[10.5px] font-semibold text-forest ring-1 ring-forest/10">
          {topicLabel}
        </span>
      )}
      <h3 className="font-display text-[17px] font-bold tracking-tight text-ink sm:text-lg">
        {article.title}
      </h3>

      {/* langkah bernomor — nomor digambar DI SINI (bukan di dalam teks data)
          supaya spasi antar langkah lega dan nomornya duduk rapi di lingkaran */}
      <ol className="mt-4 space-y-3.5">
        {article.steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sage text-[11.5px] font-bold tabular-nums text-forest"
            >
              {index + 1}
            </span>
            <span className="text-[14px] leading-relaxed text-ink/75">{step}</span>
          </li>
        ))}
      </ol>

      {article.proTip && <ProTipCallout>{article.proTip}</ProTipCallout>}

      <FeedbackStrip articleId={article.id} vote={vote} onVote={onVote} />
    </article>
  )
}

/**
 * Callout "💡 Perlu Tahu". Memakai pola kotak info yang sudah dipakai halaman
 * lain (Panduan Install, segel privasi di Ajak Teman): permukaan Oat pucat +
 * hairline Evergreen. Oat memang hanya untuk elemen kecil seperti ini.
 */
function ProTipCallout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-sage/70 px-4 py-3.5 ring-1 ring-forest/10">
      <p className="text-[12.5px] leading-relaxed text-ink/75">
        <span className="font-semibold text-ink">{HELP_PRO_TIP_LABEL}</span>
        <span aria-hidden className="mx-1.5 text-ink/30">
          ·
        </span>
        {children}
      </p>
    </div>
  )
}

/**
 * Section 5 — DEFLECTION LOOP. Kaki SETIAP artikel.
 *
 * 👎 membuka panel support; 👍 hanya berterima kasih. Urutannya sengaja begini:
 * user melewati artikel sampai habis dulu, dan hanya yang benar-benar mentok
 * yang memberi sinyal 👎 — di situlah gerbang ke manusia terbuka. Tombol kontak
 * TIDAK hadir di tempat lain mana pun di halaman ini.
 */
function FeedbackStrip({
  articleId,
  vote,
  onVote,
}: {
  articleId: string
  vote?: FeedbackVote
  onVote: (articleId: string, vote: FeedbackVote) => void
}) {
  /* Dibaca sebagai boolean dulu: di dalam cabang "bukan 👍", TypeScript sudah
     menyempitkan `vote` menjadi 'down' | undefined, sehingga perbandingan
     `vote === 'up'` di bawah akan dianggap mustahil (TS2367). */
  const upvoted = vote === 'up'
  const downvoted = vote === 'down'

  return (
    <div className="mt-5 border-t border-soil/12 pt-3.5">
      {upvoted ? (
        /* 👍 → cukup terima kasih, tidak ada panel apa pun yang muncul */
        <p role="status" className="text-[13px] font-semibold text-forest">
          {HELP_FEEDBACK_THANKS}
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-[13px] font-medium text-ink/60">{HELP_FEEDBACK_QUESTION}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onVote(articleId, 'up')}
              aria-pressed={upvoted}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold ring-1 transition-colors active:scale-95',
                upvoted
                  ? 'bg-mint/40 text-forest ring-forest/20'
                  : 'bg-cream text-ink/60 ring-soil/12 hover:bg-sage/60 hover:text-ink',
              )}
            >
              <ThumbsUp className="size-3.5" strokeWidth={2.2} aria-hidden />
              Ya
            </button>
            <button
              type="button"
              onClick={() => onVote(articleId, 'down')}
              aria-pressed={downvoted}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold ring-1 transition-colors active:scale-95',
                downvoted
                  ? 'bg-plum/15 text-plum ring-plum/25'
                  : 'bg-cream text-ink/60 ring-soil/12 hover:bg-sage/60 hover:text-ink',
              )}
            >
              <ThumbsDown className="size-3.5" strokeWidth={2.2} aria-hidden />
              Tidak
            </button>
          </div>
        </div>
      )}

      {/* gerbang ke manusia: TERSEMBUNYI default, hanya 👎 yang membukanya */}
      <AnimatePresence initial={false}>
        {downvoted && (
          <motion.div
            key="support"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: EASE }}
            className="overflow-hidden"
          >
            <SupportPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Panel support (hanya muncul setelah 👎): segel privasi + dua jalan keluar.
 *
 * Keduanya menjawab satu pertanyaan yang sama — "kalau kalian tidak bisa lihat
 * data gue, terus gimana gue dibantu?":
 *   1. Export Data Saya → user memegang datanya sendiri, tanpa minta izin.
 *   2. Hubungi Founder  → draft email + info perangkat, jadi founder bisa
 *      mendebug dari bukti yang user bawa, bukan dari membaca data personal.
 */
function SupportPanel() {
  return (
    <div className="flex flex-col gap-3 pt-4">
      <div className="flex items-start gap-3 rounded-2xl bg-sage/70 px-4 py-3.5 ring-1 ring-forest/10">
        <Lock className="mt-0.5 size-4 shrink-0 text-forest" strokeWidth={2.2} aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-ink/75">{HELP_PRIVACY_SHIELD}</p>
      </div>

      {/* `sm:grid-cols-2` — di HP dua label panjang lebih enak bertumpuk;
          dari tablet ke atas barulah berdampingan seperti rencana desain */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Button
          variant="outline"
          onClick={handleExportData}
          className="h-12 w-full rounded-2xl border-transparent bg-cream px-4 text-[13px] font-semibold text-ink ring-1 ring-soil/12 hover:bg-sage/60 hover:text-ink"
        >
          📦 {HELP_EXPORT_LABEL}
        </Button>
        <Button
          variant="default"
          onClick={handleContactFounder}
          className="h-12 w-full rounded-2xl bg-forest px-4 text-[13px] font-semibold text-cream hover:bg-forest-soft"
        >
          ✉️ {HELP_CONTACT_LABEL}
        </Button>
      </div>

      <p className="text-[11.5px] leading-relaxed text-ink/50">{HELP_SUPPORT_FOOTNOTE}</p>
    </div>
  )
}


/** label kecil pemisah antar kelompok hasil di halaman hasil pencarian */
const RESULT_GROUP_LABEL =
  'text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/40'

/**
 * Hasil pencarian: pertanyaan populer yang cocok, lalu artikelnya. Semua hasil
 * sudah disaring `searchHelp()` saat user mengetik (judul + isi), jadi tidak ada
 * tombol "Cari" yang harus ditekan. Jumlah hasil diumumkan lewat `aria-live`.
 */
function SearchResults({
  query,
  articles,
  quickAnswers,
  openAnswers,
  onToggleAnswer,
  onOpenTopic,
  votes,
  onVote,
}: {
  query: string
  articles: HelpArticleHit[]
  quickAnswers: QuickAnswer[]
  openAnswers: Record<string, boolean>
  onToggleAnswer: (id: string) => void
  onOpenTopic: (item: QuickAnswer) => void
  votes: Record<string, FeedbackVote>
  onVote: (articleId: string, vote: FeedbackVote) => void
}) {
  const empty = articles.length === 0 && quickAnswers.length === 0

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink lg:text-[28px]">
          {HELP_RESULT_TITLE}
        </h2>
        <p aria-live="polite" className="text-[12px] text-ink/45">
          {empty
            ? '0 hasil'
            : `${articles.length} artikel · ${quickAnswers.length} pertanyaan populer`}
        </p>
      </div>
      <p className="mt-1 text-[13px] text-ink/55">
        Hasil buat <span className="font-semibold text-ink/75">“{query}”</span>
      </p>

      {empty ? (
        <EmptyResults />
      ) : (
        <>
          {quickAnswers.length > 0 && (
            <div className="mt-4">
              <p className={RESULT_GROUP_LABEL}>Pertanyaan populer</p>
              <div className="mt-2.5 grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                {quickAnswers.map((item) => (
                  <QuickAnswerCard
                    key={item.id}
                    item={item}
                    open={Boolean(openAnswers[item.id])}
                    onToggle={() => onToggleAnswer(item.id)}
                    onOpenTopic={onOpenTopic}
                  />
                ))}
              </div>
            </div>
          )}

          {articles.length > 0 && (
            <div className="mt-5">
              <p className={RESULT_GROUP_LABEL}>Artikel</p>
              <div className="mt-2.5 flex flex-col gap-4 lg:gap-5">
                {articles.map((hit) => (
                  <ArticleCard
                    key={hit.article.id}
                    article={hit.article}
                    topicLabel={hit.topic.label}
                    vote={votes[hit.article.id]}
                    onVote={onVote}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/**
 * Hasil kosong. Tidak menawarkan tombol kontak (gerbang support hanya lewat 👎
 * di kaki artikel); yang ditawarkan adalah KATA KUNCI alternatif dan topik
 * pilihan — biar user tetap di jalur "cari dulu, baru ngobrol".
 */
function EmptyResults() {
  return (
    <div className="mt-4 rounded-[1.75rem] bg-cream p-6 ring-1 ring-soil/12 sm:p-8">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sage via-cream to-mint-soft text-[20px] ring-1 ring-forest/10"
      >
        🤔
      </span>
      <h3 className="mt-3 font-display text-[17px] font-bold tracking-tight text-ink sm:text-lg">
        {HELP_EMPTY_TITLE}
      </h3>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink/60">
        {HELP_EMPTY_BLURB}
      </p>
    </div>
  )
}

