'use client'

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Mail,
  Search,
  X,
} from 'lucide-react'
import {
  HELP_MOST_ASKED_BADGE,
  HELP_QUICK_ANSWERS,
  HELP_TOPICS,
  PUBLIC_HELP_COPY,
  searchHelp,
  type HelpArticle,
  type HelpArticleHit,
  type HelpTopic,
  type QuickAnswer,
} from '@/lib/data/help'
import {
  LP_SUPPORT_EMAIL,
  LP_SUPPORT_MAILTO,
  LP_WHATSAPP_HREF_WITH_TEXT,
} from '@/lib/data/landing'
import { LandingButton } from './button'
import { LandingReveal } from './reveal'

/* ── PUSAT BANTUAN PUBLIK `/bantuan` ─────────────────────────────────────────
   Halaman ini ditujukan untuk pengunjung yang BELUM masuk — termasuk orang
   yang menekan "Emailmu nggak ketemu? Kabarin kami di Pusat Bantuan" di
   `/login`.

   Kenapa tidak memakai `HelpCenterScreen` (`/help`)? Karena komponen itu
   dibungkus `ScreenShell`: sidebar app (Dompet, Budget, Insight, Pengaturan, …)
   ikut tampil. Itu berarti pengunjung anonim bisa melihat seluruh navigasi app
   sebelum login — persis yang dilarang. Halaman ini sengaja memakai bingkai
   landing (navbar + footer publik) dan hanya memuat artikel bantuan + jalan
   kontak; tidak ada sidebar, tidak ada data keuangan, dan tidak ada tautan
   langsung ke dashboard.

   Yang dibagi dengan `/help` hanya DATANYA (`lib/data/help.ts`): topik,
   artikel, quick answers, dan fungsi `searchHelp()`. Jadi isi bantuan tidak
   pernah bercabang dua versi.

   Interaksi: pencarian real-time (judul + isi), chip topik, dan accordion
   `<details>` native — tanpa state tersembunyi, tetap bisa dibaca saat JS
   belum/tidak jalan. */

export function LandingPublicHelp() {
  const [query, setQuery] = useState('')
  const [topicId, setTopicId] = useState<string>(HELP_TOPICS[0]?.id ?? '')

  const searchId = useId()
  const results = useMemo(() => searchHelp(query), [query])
  const trimmed = query.trim()
  const searching = trimmed.length > 0

  const activeTopic =
    HELP_TOPICS.find((topic) => topic.id === topicId) ?? HELP_TOPICS[0] ?? null

  return (
    <section
      aria-labelledby="landing-help-title"
      className="w-full bg-canvas px-5 pt-[120px] pb-20 landing-tab:px-10 landing-tab:pt-[160px] landing:pt-[180px] landing:pb-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12">
        {/* ── KEPALA HALAMAN ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <LandingReveal y={24} className="inline-flex">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sage py-0.5 pr-4 pl-0.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-canvas">
                <CircleHelp className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[14px] leading-[1.5] text-forest">
                {PUBLIC_HELP_COPY.eyebrow}
              </span>
            </span>
          </LandingReveal>

          <LandingReveal y={48} delay={0.1}>
            <h1
              id="landing-help-title"
              className="max-w-[720px] font-display text-[40px] leading-[1.15] font-medium tracking-[-0.03em] text-forest landing-tab:text-[52px] landing:text-[64px]"
            >
              {PUBLIC_HELP_COPY.title}
            </h1>
          </LandingReveal>

          <LandingReveal y={48} delay={0.2}>
            <p className="max-w-[600px] text-[16px] leading-[1.5] text-forest-muted">
              {PUBLIC_HELP_COPY.subtitle}
            </p>
          </LandingReveal>

          <LandingReveal y={48} delay={0.3}>
            <p className="text-[12px] leading-[1.5] font-medium tracking-[0.02em] text-forest/45">
              {PUBLIC_HELP_COPY.meta}
            </p>
          </LandingReveal>
        </div>

        {/* ── PENCARIAN ──────────────────────────────────────────────────── */}
        <LandingReveal y={48} delay={0.1}>
          <div className="relative flex w-full max-w-[720px] items-center gap-3 rounded-full bg-canvas px-5 py-3.5 ring-1 ring-soil/15 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-forest/30 motion-reduce:transition-none">
            <Search className="size-5 shrink-0 text-forest/45" aria-hidden />
            <label htmlFor={searchId} className="sr-only">
              {PUBLIC_HELP_COPY.searchLabel}
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={PUBLIC_HELP_COPY.searchPlaceholder}
              autoComplete="off"
              className="min-h-6 w-full flex-1 bg-transparent text-[16px] leading-[1.5] text-forest placeholder:text-forest/35 focus:outline-none"
            />
            {searching ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={PUBLIC_HELP_COPY.searchClearLabel}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sage/70 text-forest/70 transition-colors hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </LandingReveal>

        {/* ── ISI: HASIL PENCARIAN atau QUICK ANSWERS + TOPIK ───────────── */}
        {searching ? (
          <SearchResults
            articles={results.articles}
            quickAnswers={results.quickAnswers}
            query={trimmed}
          />
        ) : (
          <div className="flex flex-col gap-14">
            {/* Quick answers — pertanyaan yang paling sering bikin panik */}
            <div className="flex flex-col gap-5">
              <h2 className="font-display text-[24px] leading-[1.25] font-medium tracking-[-0.02em] text-forest landing-tab:text-[32px]">
                {PUBLIC_HELP_COPY.quickTitle}
              </h2>
              <div className="grid gap-2 landing-tab:grid-cols-2">
                {HELP_QUICK_ANSWERS.map((answer) => (
                  <QuickAnswerDetails key={answer.id} answer={answer} />
                ))}
              </div>
            </div>

            {/* Topik + artikel — chip filter, lalu artikel topik aktif */}
            {activeTopic ? (
              <div className="flex flex-col gap-6">
                <h2 className="font-display text-[24px] leading-[1.25] font-medium tracking-[-0.02em] text-forest landing-tab:text-[32px]">
                  {PUBLIC_HELP_COPY.topicsTitle}
                </h2>

                <div
                  role="group"
                  aria-label={PUBLIC_HELP_COPY.topicsLabel}
                  className="flex flex-wrap gap-2"
                >
                  {HELP_TOPICS.map((topic) => (
                    <TopicChip
                      key={topic.id}
                      topic={topic}
                      active={topic.id === activeTopic.id}
                      onSelect={() => setTopicId(topic.id)}
                    />
                  ))}
                </div>

                <div className="rounded-[24px] bg-sage/25 p-5 ring-1 ring-soil/8 landing-tab:p-7">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-[20px] leading-[1.3] font-medium tracking-[-0.02em] text-forest landing-tab:text-[24px]">
                      <span aria-hidden className="mr-2">
                        {activeTopic.emoji}
                      </span>
                      {activeTopic.label}
                    </h3>
                    <p className="max-w-[680px] text-[14px] leading-[1.6] text-forest-muted">
                      {activeTopic.blurb}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-2">
                    {activeTopic.articles.map((article) => (
                      <ArticleDetails key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── KONTAK & PINTU MASUK ───────────────────────────────────────── */}
        <LandingReveal y={48}>
          <div className="grid gap-2 landing:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <div className="flex flex-col justify-between gap-7 rounded-[28px] bg-forest p-6 landing:p-8">
              <div className="flex flex-col gap-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-daisy/90 px-3 py-1.5 text-[12px] leading-[1.5] font-medium text-forest">
                  <Mail className="size-3.5" aria-hidden />
                  {LP_SUPPORT_EMAIL}
                </span>
                <h2 className="max-w-[560px] font-display text-[24px] leading-[1.2] font-medium tracking-[-0.02em] text-cream landing-tab:text-[32px]">
                  {PUBLIC_HELP_COPY.supportTitle}
                </h2>
                <p className="max-w-[560px] text-[14px] leading-[1.6] text-cream-muted">
                  {PUBLIC_HELP_COPY.supportBody}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <LandingButton href={LP_WHATSAPP_HREF_WITH_TEXT} tone="lime" size="sm">
                  {PUBLIC_HELP_COPY.whatsappCta}
                </LandingButton>
                <LandingButton href={LP_SUPPORT_MAILTO} tone="light" size="sm">
                  {PUBLIC_HELP_COPY.emailCta}
                </LandingButton>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-7 rounded-[28px] bg-sage/40 p-6 landing:p-8">
              <div className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-canvas text-forest">
                  <Mail className="size-5" aria-hidden />
                </span>
                <h2 className="text-[20px] leading-[1.25] font-medium tracking-[-0.02em] text-forest landing-tab:text-[24px]">
                  {PUBLIC_HELP_COPY.loginTitle}
                </h2>
                <p className="text-[14px] leading-[1.6] text-forest-muted">
                  {PUBLIC_HELP_COPY.loginBody}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <LandingButton href={PUBLIC_HELP_COPY.loginHref} tone="dark" size="sm">
                  {PUBLIC_HELP_COPY.loginCta}
                </LandingButton>
                <Link
                  href={PUBLIC_HELP_COPY.registerHref}
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-forest underline underline-offset-4 hover:text-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
                >
                  {PUBLIC_HELP_COPY.registerCta}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </LandingReveal>

        <p className="text-center text-[12px] leading-[1.6] text-forest/40">
          {PUBLIC_HELP_COPY.footerNote}
        </p>
      </div>
    </section>
  )
}

/* ── POTONGAN KECIL HALAMAN PUBLIK ─────────────────────────────────────────── */

function TopicChip({
  topic,
  active,
  onSelect,
}: {
  topic: HelpTopic
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={
        active
          ? 'inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 text-[13px] font-medium text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2'
          : 'inline-flex min-h-11 items-center gap-2 rounded-full bg-sage/40 px-4 text-[13px] font-medium text-forest transition-colors hover:bg-sage/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2'
      }
    >
      <span aria-hidden>{topic.emoji}</span>
      {topic.label}
    </button>
  )
}

function ArticleDetails({ article }: { article: HelpArticle }) {
  return (
    <details className="group rounded-[16px] bg-canvas ring-1 ring-soil/10 open:ring-forest/20">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden landing-tab:px-6">
        <span className="text-[15px] leading-[1.4] font-medium text-forest landing-tab:text-[16px]">
          {article.title}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-forest/50 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>

      <div className="px-5 pb-5 landing-tab:px-6 landing-tab:pb-6">
        <ol className="flex flex-col gap-3">
          {article.steps.map((step, index) => (
            <li
              key={`${article.id}-${index}`}
              className="flex gap-3 text-[14px] leading-[1.6] text-forest-muted"
            >
              <span
                aria-hidden
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sage text-[11px] font-semibold text-forest"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {article.proTip ? (
          <p className="mt-4 rounded-[12px] bg-sage/50 px-4 py-3 text-[13px] leading-[1.6] text-forest">
            <span className="font-medium">{PUBLIC_HELP_COPY.proTipLabel}</span>{' '}
            {article.proTip}
          </p>
        ) : null}
      </div>
    </details>
  )
}

function QuickAnswerDetails({ answer }: { answer: QuickAnswer }) {
  return (
    <details className="group rounded-[16px] bg-canvas ring-1 ring-soil/10 open:ring-forest/20">
      <summary className="flex min-h-14 cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-1">
          <span className="text-[15px] leading-[1.4] font-medium text-forest">
            {answer.question}
          </span>
          <span className="text-[11px] leading-[1.5] text-forest/45">
            {answer.topic}
            {answer.mostAsked ? ` · ${HELP_MOST_ASKED_BADGE}` : ''}
          </span>
        </span>
        <ChevronDown
          className="mt-0.5 size-4 shrink-0 text-forest/50 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <p className="px-5 pb-5 text-[14px] leading-[1.6] text-forest-muted">{answer.answer}</p>
    </details>
  )
}

function SearchResults({
  articles,
  quickAnswers,
  query,
}: {
  articles: HelpArticleHit[]
  quickAnswers: QuickAnswer[]
  query: string
}) {
  const empty = articles.length === 0 && quickAnswers.length === 0

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] leading-[1.25] font-medium tracking-[-0.02em] text-forest landing-tab:text-[32px]">
          {PUBLIC_HELP_COPY.resultTitle}
        </h2>
        <p className="text-[13px] leading-[1.5] text-forest/50">“{query}”</p>
      </div>

      {empty ? (
        <div className="rounded-[24px] bg-sage/25 p-6 ring-1 ring-soil/8">
          <p className="text-[18px] leading-[1.3] font-medium text-forest">
            {PUBLIC_HELP_COPY.emptyTitle}
          </p>
          <p className="mt-2 max-w-[560px] text-[14px] leading-[1.6] text-forest-muted">
            {PUBLIC_HELP_COPY.emptyBody}
          </p>
        </div>
      ) : (
        <>
          {quickAnswers.length > 0 ? (
            <div className="grid gap-2 landing-tab:grid-cols-2">
              {quickAnswers.map((answer) => (
                <QuickAnswerDetails key={answer.id} answer={answer} />
              ))}
            </div>
          ) : null}

          {articles.length > 0 ? (
            <div className="flex flex-col gap-3">
              {articles.map((hit) => (
                <div key={hit.article.id} className="flex flex-col gap-1.5">
                  <span className="text-[11px] leading-[1.5] font-medium tracking-[0.04em] text-forest/45 uppercase">
                    <span aria-hidden className="mr-1">
                      {hit.topic.emoji}
                    </span>
                    {hit.topic.label}
                  </span>
                  <ArticleDetails article={hit.article} />
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
