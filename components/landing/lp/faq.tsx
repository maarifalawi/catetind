'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, CircleHelp, MessageCircle, Plus } from 'lucide-react'
import { LP_FAQ, type LpFaqCategoryId, type LpFaqItem } from '@/lib/data/landing'
import { cn } from '@/lib/utils'
import { LandingButton } from './button'
import { LandingReveal } from './reveal'

/* ── SECTION #faq ────────────────────────────────────────────────────────────
   Angka dari export (1440):
     h2          56/67.2, highlight lime
     subtitle    18/27, max 540
     panel       surface `g-mint/10` radius 24; rail kategori ±296px +
                 accordion ±904px (dua kolom mulai 1200)
     item        putih radius 20, border halus, padding 24 28, pertanyaan 21
     jawaban     18/27, max 600; hanya satu item terbuka
     kartu kontak 888px, radius 16

   KATEGORI: empat kategori lokal (Umum, Harga & paket, Fitur & AI, Privasi &
   keamanan) berisi 11 pertanyaan yang semuanya berasal dari export/`FAQ_ITEMS`.
   Label Inggris + isi template Makro dari live TIDAK dipakai.

   Desktop memakai rail tombol filter (aria-pressed + aria-controls). Di bawah
   1200 rail diganti dropdown kustom (`role="listbox"`) — bukan <select> polos,
   supaya tampilan tetap dekat export. Keduanya mengubah daftar accordion yang
   SAMA (satu instance, tidak diduplikasi per breakpoint → tidak ada id ganda).

   Accordion: satu item terbuka, item pertama kategori aktif terbuka default,
   `aria-expanded`/`aria-controls`, panel selalu ada di DOM (tinggi 0 saat
   tertutup), animasi tinggi dimatikan untuk `prefers-reduced-motion`. */

function firstItemId(category: LpFaqCategoryId): string | null {
  return LP_FAQ.items.find((item) => item.category === category)?.id ?? null
}

export function LandingFaqLp() {
  const [category, setCategory] = useState<LpFaqCategoryId>('umum')
  const [openId, setOpenId] = useState<string | null>(firstItemId('umum'))

  const selectCategory = (id: LpFaqCategoryId) => {
    setCategory(id)
    /* item pertama kategori aktif terbuka default — tidak pernah tab kosong */
    setOpenId(firstItemId(id))
  }

  const items = LP_FAQ.items.filter((item) => item.category === category)

  return (
    <section
      id="faq"
      aria-labelledby="landing-faq-title"
      className="w-full scroll-mt-24 bg-canvas px-6 py-20 landing-tab:px-10 landing:py-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12">
        <div className="flex flex-col items-center gap-4">
          <LandingReveal y={24} className="inline-flex">
            <span className="inline-flex items-center gap-2 rounded-full bg-sage py-0.5 pr-4 pl-0.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-canvas">
                <CircleHelp className="size-3.5 text-forest" aria-hidden />
              </span>
              <span className="text-[14px] leading-[1.5] text-forest">{LP_FAQ.eyebrow}</span>
            </span>
          </LandingReveal>

          <LandingReveal y={48} delay={0.2} className="w-full">
            <h2
              id="landing-faq-title"
              className="mx-auto max-w-full text-center font-display text-[36px] leading-[1.15] font-medium tracking-[-0.03em] text-forest landing-tab:max-w-[520px] landing-tab:text-[48px] landing:max-w-[720px] landing:text-[56px]"
            >
              {LP_FAQ.titleBefore}
              <span className="whitespace-nowrap">{LP_FAQ.titleEmphasis}</span>
            </h2>
          </LandingReveal>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 landing:grid-cols-[288px_minmax(0,1fr)] landing:gap-6">
          {/* rail kategori — desktop ≥1200 */}
          <div
            role="group"
            aria-label={LP_FAQ.categoryRailLabel}
            className="hidden flex-col gap-1 rounded-[24px] bg-sage/60 p-2 landing:flex"
          >
            {LP_FAQ.categories.map((entry) => {
              const active = entry.id === category
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={active}
                  aria-controls="landing-faq-list"
                  data-landing-category={entry.id}
                  onClick={() => selectCategory(entry.id)}
                  className={cn(
                    'rounded-[16px] px-5 py-4 text-left text-[15px] leading-[1.5] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
                    active
                      ? 'bg-canvas text-forest shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
                      : 'text-forest/55 hover:bg-canvas/60 hover:text-forest',
                  )}
                >
                  {entry.label}
                </button>
              )
            })}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {/* dropdown kategori — tablet & mobile <1200 */}
            <CategoryDropdown value={category} onChange={selectCategory} />

            {/* SATU daftar accordion untuk kedua pola kategori */}
            <div id="landing-faq-list" className="flex flex-col gap-3">
              {items.map((item) => {
                const open = openId === item.id
                return (
                  <FaqRow
                    key={item.id}
                    item={item}
                    open={open}
                    onToggle={() => setOpenId(open ? null : item.id)}
                  />
                )
              })}

              <ContactCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


function CategoryDropdown({
  value,
  onChange,
}: {
  value: LpFaqCategoryId
  onChange: (id: LpFaqCategoryId) => void
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      LP_FAQ.categories.findIndex((entry) => entry.id === value),
    ),
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const activeCategory =
    LP_FAQ.categories.find((entry) => entry.id === value) ?? LP_FAQ.categories[0]

  /* Fokus pindah ke opsi aktif setiap panel dibuka / panah digerakkan. */
  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const choose = (id: LpFaqCategoryId) => {
    onChange(id)
    close(true)
  }

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const count = LP_FAQ.categories.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + delta + count) % count)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(count - 1)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    }
  }

  return (
    <div className="relative landing:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="landing-faq-category-list"
        onClick={() => {
          if (open) {
            close(true)
            return
          }
          setActiveIndex(
            Math.max(
              0,
              LP_FAQ.categories.findIndex((entry) => entry.id === value),
            ),
          )
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          setActiveIndex(
            Math.max(
              0,
              LP_FAQ.categories.findIndex((entry) => entry.id === value),
            ),
          )
          setOpen(true)
        }}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-[16px] border border-soil/10 bg-canvas px-5 text-left text-[16px] leading-[1.5] text-forest shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
      >
        <span>{activeCategory.label}</span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-forest/40 transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <>
          {/* satu backdrop transparan: klik di luar menutup panel */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={LP_FAQ.categorySelectLabel}
            onClick={() => close(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <ul
            id="landing-faq-category-list"
            role="listbox"
            aria-label={LP_FAQ.categoryRailLabel}
            onKeyDown={onListKeyDown}
            className="absolute inset-x-0 top-[calc(100%+8px)] z-40 flex flex-col gap-1 rounded-[16px] bg-canvas p-1 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
          >
            {LP_FAQ.categories.map((entry, index) => {
              const selected = entry.id === value
              return (
                <li key={entry.id}>
                  <button
                    ref={(node) => {
                      optionRefs.current[index] = node
                    }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-landing-category-option={entry.id}
                    onClick={() => choose(entry.id)}
                    className={cn(
                      'flex w-full items-center rounded-[10px] px-4 py-3 text-left text-[16px] leading-[1.5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
                      selected
                        ? 'bg-sage/60 text-forest'
                        : 'text-forest/60 hover:bg-sage/60 hover:text-forest',
                    )}
                  >
                    {entry.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}


function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: LpFaqItem
  open: boolean
  onToggle: () => void
}) {
  const reduceMotion = useReducedMotion()
  const triggerId = `landing-faq-trigger-${item.id}`
  const panelId = `landing-faq-panel-${item.id}`

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[20px] border bg-canvas transition-shadow duration-200 motion-reduce:transition-none',
        open
          ? 'border-forest/15 shadow-[0_18px_48px_-24px_rgba(69,89,78,0.35)]'
          : 'border-soil/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
      )}
    >
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={LP_FAQ.toggle(open, item.question)}
        onClick={onToggle}
        className="flex w-full items-start gap-5 rounded-[20px] px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest/40 landing-tab:px-7 landing-tab:py-6"
      >
        <span
          className={cn(
            'flex-1 pr-4 text-[18px] leading-[1.4] tracking-[-0.01em] transition-colors landing-tab:text-[21px]',
            open ? 'text-forest' : 'text-forest/70',
          )}
        >
          {item.question}
        </span>
        <Plus
          className={cn(
            'mt-1 size-5 shrink-0 text-forest/40 transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-45',
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {/* Panel SELALU ada di DOM supaya `aria-controls` tidak menunjuk elemen
          yang hilang saat tertutup; tinggi 0 + aria-hidden menyembunyikannya. */}
      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!open}
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="max-w-[680px] px-6 pb-6 pr-16 text-[15px] leading-[1.6] text-forest/60 landing-tab:px-7 landing-tab:pb-7 landing-tab:text-[16px]">
          {item.answer}
        </p>
      </motion.div>
    </div>
  )
}

function ContactCard() {
  return (
    <div className="mt-1 flex flex-col gap-6 rounded-[20px] border border-soil/10 bg-canvas px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] landing:flex-row landing:items-center landing:justify-between landing:gap-10 landing:px-8 landing:py-8">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sage/60 px-3 py-1.5 text-[12px] leading-[1.5] font-medium text-forest">
          <MessageCircle className="size-3.5" strokeWidth={1.75} aria-hidden />
          {LP_FAQ.contact.pillLabel}
        </span>
        <h3 className="max-w-[560px] font-display text-[22px] leading-[1.25] font-medium tracking-[-0.02em] text-forest">
          {LP_FAQ.contact.eyebrow}
        </h3>
        <p className="max-w-[520px] text-[14px] leading-[1.5] text-forest/60">
          <span className="font-medium text-forest">{LP_FAQ.contact.title}. </span>
          {LP_FAQ.contact.body}
        </p>
      </div>

      <div className="flex w-fit shrink-0 flex-col items-start gap-2">
        <LandingButton href={LP_FAQ.contact.href} tone="dark" size="sm" className="w-fit">
          {LP_FAQ.contact.ctaLabel}
        </LandingButton>
        <a
          href={LP_FAQ.contact.emailHref}
          className="text-[13px] font-medium text-forest underline-offset-4 hover:underline"
        >
          {LP_FAQ.contact.emailLabel}
        </a>
      </div>
    </div>
  )
}

