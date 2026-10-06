'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cleanDigits, groupDigits } from '@/lib/money/amount-input'
import { AMOUNT_INPUT_FIELD } from '@/lib/typography'
import { useIsBottomSheet } from '@/hooks/use-sheet-drag'
import {
  useSheetBackgroundIsolation,
  useSheetViewportCage,
} from '@/hooks/use-sheet-viewport-cage'
import { useSubscriptionGate } from './subscription-gate-provider'
import { SubscriptionLockNote } from './subscription-lock-note'

/* ── Shell + atom form bersama untuk semua bottom sheet halaman Budget ───────
   Semua modal di /app/budget memakai satu shell ini supaya tempo buka/tutup,
   radius, dan ritme spasinya identik:

   - Mobile: Vaul bottom sheet (drag handle + sheet nempel bawah).
   - Desktop (lg): panel yang sama berubah jadi dialog di tengah layar.
     Posisinya diatur lewat utility `translate` (properti CSS terpisah dari
     `transform` yang dipakai Vaul untuk menganimasikan geser-naik), jadi
     keduanya tidak saling menimpa.

   Form-nya sendiri memakai progressive disclosure: tiap langkah dibungkus
   <RevealStep> sehingga muncul mengembang halus setelah langkah sebelumnya
   selesai — layar tetap terasa lega meskipun fiturnya banyak.
   ────────────────────────────────────────────────────────────────────────── */

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
export const SHEET_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function BudgetSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** area aksi tetap di bawah sheet — tidak ikut scroll */
  footer?: ReactNode
}) {
  /* ── Input focus lifecycle (mobile) ───────────────────────────────────────
     Shell ini dipakai SEMUA sheet CatetInd (~18 berkas: registrasi di /checkout
     dan tiap form tambah di /app/*), jadi perilaku keyboard virtual-nya dijaga
     di satu tempat ini saja — lihat hooks/use-sheet-viewport-cage.ts.
       • `useSheetViewportCage` menyematkan sheet ke visual viewport; cuma perlu
         saat sheet benar-benar tampil sebagai bottom sheet (yaitu < lg).
       • `useSheetBackgroundIsolation` membekukan latar (overflow hidden + inert)
         supaya elemen fixed/sticky latar tidak ikut bergeser saat keyboard naik. */
  const isBottomSheet = useIsBottomSheet()
  const cageRef = useSheetViewportCage(open && isBottomSheet)
  useSheetBackgroundIsolation(open)

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      autoFocus={false}
      /* KEYBOARD VIRTUAL — sengaja BUKAN `repositionInputs` (pendekatan paket 64
         yang lama). Bawaan Vaul itu hanya mendengarkan `visualViewport` *resize*,
         lalu menulis `style.height` + `style.bottom` relatif ke LAYOUT viewport.
         Di iOS Safari keyboard TIDAK menyusutkan layout viewport dan visual
         viewport juga BERGESER lewat event `scroll` — kombinasi itu yang melepas
         footer sheet dari dasarnya sampai mengambang di tengah layar. Kita ambil
         alih total: kandang setinggi visual viewport + sheet `bottom-0` di
         dalamnya, jadi geometrinya benar di iOS Safari maupun Chrome Android. */
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          data-catetind-overlay="true"
          className="fixed inset-0 z-[70] bg-ink/60"
        />

        {/* KANDANG VISUAL VIEWPORT — `top` & tingginya diisi dari
            `window.visualViewport` (event `resize` + `scroll`); gaya
            `position`/`transform` ada di app/globals.css
            (`[data-catetind-sheet-cage]`). Karena kandang punya `transform`,
            sheet `fixed` di dalamnya berhenti di dasar KANDANG — bukan di dasar
            layout viewport yang tidak ikut menyusut di iOS. */}
        <div ref={cageRef} data-catetind-sheet-cage="true">
          <Drawer.Content
            data-catetind-sheet="true"
            aria-label={title}
            className={cn(
              /* mobile — bottom sheet menempel DASAR KANDANG. `max-h-full`
                 adalah satu-satunya batas tinggi yang benar-benar mengikuti
                 ruang di atas keyboard (100vh/dvh statis di iOS). */
              'pointer-events-auto fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-[#ffffff] shadow-[0_-24px_60px_-24px_rgba(69,89,78,0.55)] outline-none',
              /* desktop — dialog tengah (translate = properti terpisah dari transform Vaul) */
              'lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:max-h-[86dvh] lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(69,89,78,0.5)]',
            )}
          >
            {/* drag handle khas Vaul — di desktop panel mengambang, jadi tak perlu */}
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10 lg:hidden" />
            {/* glow mint tipis di bibir atas sheet */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[2rem] bg-gradient-to-b from-mint/[0.18] to-transparent"
            />

            {/* HEADER — dipaku ke atas sheet: `shrink-0`, tidak pernah ikut
                mengecil maupun menggulir saat keyboard muncul */}
            <div className="relative flex shrink-0 items-start justify-between gap-3 px-5 pt-4 lg:px-6">
              <div className="min-w-0">
                <Drawer.Title className="font-display text-xl font-medium leading-tight tracking-tight text-forest">
                  {title}
                </Drawer.Title>
                {description ? (
                  <Drawer.Description className="mt-1 text-[13px] leading-relaxed text-forest/55">
                    {description}
                  </Drawer.Description>
                ) : (
                  <Drawer.Description className="sr-only">{title}</Drawer.Description>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage active:scale-95"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>

            {/* BODY — satu-satunya area yang boleh MENYUSUT & menggulir saat
                keyboard terbuka. `min-h-0` wajib: tanpa itu flex item menolak
                mengecil di bawah tinggi kontennya (Safari), sehingga footer
                terdorong keluar layar. `data-catetind-sheet-body` dipakai
                `revealFieldInSheet` untuk menggeser field yang fokus ke dalam
                pandangan. */}
            <div
              data-catetind-sheet-body="true"
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 lg:px-6"
            >
              {children}
            </div>

            {/* FOOTER — relatif terhadap tinggi DINAMIS sheet, bukan `fixed
                bottom-0`. Karena sheet menempel dasar kandang (visual viewport),
                footer otomatis menempel tepat di atas keyboard dan tidak pernah
                mengambang di tengah area input. */}
            {footer && (
              <div
                data-catetind-sheet-footer="true"
                className="shrink-0 border-t border-soil/12 bg-cream/70 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-6 lg:pb-5"
              >
                {footer}
              </div>
            )}
          </Drawer.Content>
        </div>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/**
 * Satu langkah form yang muncul mengembang SETELAH langkah sebelumnya selesai
 * (progressive disclosure). Tinggi `auto` dianimasikan supaya tidak ada lompatan
 * layout saat step baru masuk.
 *
 * `overflow-hidden` hanya dipasang SAAT beranimasi: kalau dibiarkan, ring fokus
 * (2px di luar kotak) input di dalamnya akan terpotong di tepi wrapper.
 */
export function RevealStep({
  show,
  children,
  className,
}: {
  show: boolean
  children: ReactNode
  className?: string
}) {
  const [clipped, setClipped] = useState(false)
  /* `prefers-reduced-motion` dihormati (pola yang sama dengan
     `joint-balance-scale`/`shield-meter`): langkahnya tetap MUNCUL, tapi tanpa
     gerak mengembang — yang berubah cuma kedatangannya, bukan informasinya. */
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: SHEET_EASE }}
          onAnimationStart={() => setClipped(true)}
          onAnimationComplete={() => setClipped(false)}
          className={cn(clipped ? 'overflow-hidden' : 'overflow-visible', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Input nominal Rupiah: satu state `digits` (angka mentah) → tampilan otomatis
 * berformat `1.500.000`. `inputMode="numeric"` memunculkan keypad angka di HP.
 *
 * PAKET 53 — satu aturan pengelompokan untuk seluruh app: tampilannya dihitung
 * `groupDigits()` dari `lib/money/amount-input.ts`, modul yang sama dengan field
 * nominal engine. Sebelumnya baris ini memakai `Number(digits).toLocaleString('id-ID')`
 * — hasilnya sama untuk angka biasa, tapi itu artinya app punya DUA cara
 * mengelompokkan ribuan (dan cara kedua itu bergantung ICU mesin, padahal pola
 * repo ini menuntut hasil deterministik yang sama di server & klien).
 *
 * Bobot & ritme angkanya ikut token `AMOUNT_INPUT_FIELD` supaya nominal yang
 * diketik terasa sama dengan yang diketik di engine — hanya ukurannya yang
 * berbeda karena kolomnya lebih kecil.
 *
 * Beda yang DISENGAJA dari engine: batasnya 12 digit (`Rp 999.999.999.999`),
 * bukan 13 digit. Angka itu batas form sheet sejak awal dan dipakai juga oleh
 * form lain di halaman yang sama (`sync-balance-modal`); menaikkannya adalah
 * keputusan produk tersendiri, jadi jangan disamakan diam-diam di sini.
 */
export function RupiahField({
  label,
  digits,
  onDigitsChange,
  placeholder = 'Rp 15.000.000',
  hint,
  size = 'md',
  inputRef,
  className,
}: {
  label?: string
  /** digit mentah tanpa pemisah — satu-satunya sumber kebenaran nilai */
  digits: string
  onDigitsChange: (digits: string) => void
  placeholder?: string
  hint?: ReactNode
  size?: 'md' | 'lg'
  inputRef?: RefObject<HTMLInputElement | null>
  className?: string
}) {
  const display = digits ? groupDigits(cleanDigits(digits)) : ''

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    /* buang semua non-digit + nol di depan (satu bentuk untuk satu nominal),
       lalu batasi 12 digit (maks Rp 999.999.999.999) */
    const next = cleanDigits(event.target.value.replace(/\D/g, ''))
    onDigitsChange(next.slice(0, 12))
  }

  return (
    <label className={cn('block', className)}>
      {label && <span className="text-[13px] font-medium leading-snug text-forest">{label}</span>}
      <span
        className={cn(
          'mt-2 flex items-center gap-2 rounded-2xl bg-cream px-4 ring-1 ring-soil/16 transition-shadow focus-within:ring-2 focus-within:ring-forest/35',
          size === 'lg' ? 'py-3.5' : 'py-3',
        )}
      >
        <span
          className={cn('shrink-0 font-medium text-forest/35', size === 'lg' ? 'text-lg' : 'text-sm')}
        >
          Rp
        </span>
        <input
          ref={inputRef}
          value={display}
          onChange={handleChange}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder.replace(/^Rp\s*/, '')}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-forest outline-none placeholder:font-medium placeholder:text-forest/25',
            AMOUNT_INPUT_FIELD,
            size === 'lg' ? 'text-xl' : 'text-[15px]',
          )}
        />
      </span>
      {hint && (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-forest/45">{hint}</span>
      )}
    </label>
  )
}

/** Deret pill pilih-satu (periode budget, prioritas, reminder) — mikro, hemat ruang */
export function ChoicePills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-all duration-200 active:scale-95',
              active
                ? 'bg-forest text-mint shadow-[0_10px_22px_-14px_rgba(69,89,78,0.75)]'
                : 'bg-cream text-forest/60 ring-1 ring-soil/14 hover:bg-cream hover:text-forest',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Fokus satu input setelah sheet selesai beranimasi buka (keyboard HP tidak "nabrak") */
export function useFocusOnOpen(
  open: boolean,
  ref: RefObject<HTMLInputElement | null>,
  delay = 220,
) {
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (!open) return
    timer.current = window.setTimeout(() => ref.current?.focus(), delay)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [open, ref, delay])
}

/** Tombol aksi utama sheet — satu gaya untuk semua alur supaya konsisten.
 *
 *  `gate` = tombol ini MENAMBAH data keuangan, jadi ia ikut terkunci saat masa
 *  aktif langganan habis (task 23). Opt-in, bukan default: `SheetSubmit` juga
 *  dipakai alur yang HARUS tetap jalan — registrasi & pembayaran di `/checkout`
 *  (halaman publik), serta "lanjut ngobrol sama Minca" di review pengeluaran.
 *  Kuncinya diambil dari provider global, jadi tidak ada boolean yang perlu
 *  dioper berlapis-lapis dari halaman. */
export function SheetSubmit({
  children,
  onClick,
  disabled,
  className,
  gate = false,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
  /** true = tombol simpan/tambah data keuangan */
  gate?: boolean
}) {
  const { inputLocked } = useSubscriptionGate()
  const locked = gate && inputLocked
  const inert = Boolean(disabled) || locked

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={inert}
        aria-disabled={locked || undefined}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-all',
          inert
            ? 'cursor-not-allowed bg-ink/[0.07] text-forest/35'
            : 'bg-forest text-mint hover:bg-forest-soft active:scale-[0.99]',
          className,
        )}
      >
        {children}
      </button>
      {locked && <SubscriptionLockNote />}
    </div>
  )
}