'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, Lock, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { formatIDR } from '@/lib/weekly-recap'

/* ── Add-on AI Token (Domain 5C) ───────────────────────────────────────────────
   Granularitas sengaja kecil & bahasa kasual ("Ngopi / Nongkrong / Sultan") supaya
   harga terasa fair — bukan "Basic/Pro/Enterprise". Nama & harga ini FINAL untuk
   halaman Billing. */

export type TopUpPackageId = 'ngopi' | 'nongkrong' | 'sultan'

export type TopUpPackage = {
  id: TopUpPackageId
  name: string
  price: number
  /** bonus token + estimasi pemakaian biar user bisa hitung sendiri (transparan) */
  tokens: string
  note: string
  /** paket decoy terbaik — di-highlight penuh pakai accent color brand (mint) */
  best?: boolean
}

export const TOP_UP_PACKAGES: TopUpPackage[] = [
  {
    id: 'ngopi',
    name: 'Paket Ngopi',
    price: 19_000,
    tokens: '+200.000 token AI',
    note: '≈ 50 chat + 20 scan struk',
  },
  {
    id: 'nongkrong',
    name: 'Paket Nongkrong',
    price: 29_000,
    tokens: '+400.000 token AI',
    note: '≈ 100 chat + 40 scan struk',
    best: true,
  },
  {
    id: 'sultan',
    name: 'Paket Sultan Sebulan',
    price: 49_000,
    tokens: '+800.000 token AI',
    note: '≈ 200 chat + 80 scan struk',
  },
]

/**
 * Modal Top Up AI Token — bottom sheet di mobile, dialog tengah di desktop.
 * Mulai TANPA paket terpilih supaya state "disabled" tombol Bayar Sekarang
 * kelihatan jelas (selectedPackage === null).
 */
export function TopUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  /** paket yang dipilih user — ini yang bikin tombol Bayar Sekarang aktif */
  const [selectedPackage, setSelectedPackage] = useState<TopUpPackageId | null>(null)
  const [paying, setPaying] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useBodyScrollLock(open)

  /* ESC menutup panel + fokus pindah ke dialog saat dibuka (a11y) */
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    const raf = requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
    }
  }, [open, onClose])

  /* kalau ditutup di tengah proses, batalkan timer mock & kembalikan tombol normal */
  useEffect(() => {
    if (open) return
    if (payTimer.current) {
      clearTimeout(payTimer.current)
      payTimer.current = null
    }
    setPaying(false)
  }, [open])

  /* bersihin timer saat unmount biar tidak ada setState di komponen mati */
  useEffect(
    () => () => {
      if (payTimer.current) clearTimeout(payTimer.current)
    },
    [],
  )

  const selected = TOP_UP_PACKAGES.find((pkg) => pkg.id === selectedPackage) ?? null

  function handlePay() {
    if (!selectedPackage || paying) return

    // TODO: Integrate Midtrans Snap API for payment processing.
    // Alur produksi: POST /api/payment/topup → server bikin snap token →
    // window.snap.pay(snapToken) → webhook Midtrans nambah addon_tokens_remaining.
    setPaying(true)

    /* MOCK alur pembayaran: timer ini yang nanti digantikan Midtrans Snap */
    payTimer.current = setTimeout(() => {
      payTimer.current = null
      setPaying(false)
      onClose()
    }, 1600)
  }

  return (
    <div
      className={cn('fixed inset-0 z-[80]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Tutup top up AI token"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/50 transition-opacity duration-500 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* wrapper: sheet nempel bawah di mobile, panel ngambang di tengah di desktop */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center lg:items-center lg:p-6"
        data-lenis-prevent
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="topup-title"
          aria-describedby="topup-desc"
          tabIndex={-1}
          className={cn(
            'pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-[0_-24px_60px_-24px_rgba(16,58,42,0.55)] ring-1 ring-black/5 outline-none transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:max-w-lg lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(16,58,42,0.5)]',
            open
              ? 'translate-y-0 opacity-100 lg:scale-100'
              : 'translate-y-full opacity-0 lg:translate-y-6 lg:scale-95',
          )}
        >
          {/* handle drag (visual) */}
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/15" aria-hidden />

          {/* header — tetap diam, tidak ikut scroll */}
          <div className="flex shrink-0 items-start gap-3 px-5 pt-4 sm:px-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-forest">
              <Sparkles className="size-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="topup-title" className="text-xl font-semibold tracking-tight text-ink">
                Top Up AI Token
              </h2>
              <p
                id="topup-desc"
                className="mt-0.5 text-[13px] leading-relaxed break-words text-ink/55"
              >
                Tambah napas AI biar pencatatanmu tetap otomatis ⚡
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5 transition-colors hover:bg-sage"
            >
              <X className="size-4" strokeWidth={2.2} />
            </button>
          </div>

          {/* daftar paket — scroll kalau layar pendek */}
          <div
            data-lenis-prevent
            className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div
              role="radiogroup"
              aria-label="Pilih paket top up AI token"
              className="grid gap-2.5 pt-2 sm:grid-cols-3"
            >
              {TOP_UP_PACKAGES.map((pkg) => {
                const active = pkg.id === selectedPackage
                const onAccent = Boolean(pkg.best)

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={cn(
                      'relative flex flex-col rounded-2xl p-3.5 text-left transition-all duration-200',
                      /* Paket Paling Laris: fill accent color + border tebal biar paling menonjol */
                      onAccent
                        ? 'bg-mint ring-2 ring-forest shadow-[0_14px_28px_-16px_rgba(16,58,42,0.55)]'
                        : 'bg-white ring-1 ring-black/[0.06] hover:ring-forest/25',
                      active && !onAccent && 'ring-2 ring-forest',
                      active && onAccent && 'ring-[3px]',
                    )}
                  >
                    {onAccent && (
                      <span className="absolute -top-2 right-3 rounded-full bg-forest px-2.5 py-[3px] text-[10px] font-semibold tracking-wide text-mint">
                        Paling Laris
                      </span>
                    )}

                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'text-[13px] font-semibold leading-snug',
                          onAccent ? 'text-forest' : 'text-ink',
                        )}
                      >
                        {pkg.name}
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                          active
                            ? 'border-forest bg-forest text-mint'
                            : onAccent
                              ? 'border-forest/40 bg-white/60 text-transparent'
                              : 'border-ink/20 bg-white text-transparent',
                        )}
                        aria-hidden
                      >
                        <Check className="size-2.5" strokeWidth={3.6} />
                      </span>
                    </span>

                    <span
                      className={cn(
                        'mt-2 text-lg font-semibold tracking-tight tabular-nums',
                        onAccent ? 'text-forest' : 'text-ink',
                      )}
                    >
                      {formatIDR(pkg.price)}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium',
                        onAccent ? 'text-forest/60' : 'text-ink/40',
                      )}
                    >
                      sekali bayar
                    </span>

                    <span
                      className={cn(
                        'mt-2.5 block text-[11px] font-semibold',
                        onAccent ? 'text-forest' : 'text-forest/80',
                      )}
                    >
                      {pkg.tokens}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block text-[10px] leading-relaxed',
                        onAccent ? 'text-forest/60' : 'text-ink/45',
                      )}
                    >
                      {pkg.note}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="mt-3 mb-1 text-[11px] leading-relaxed text-ink/40">
              Token tambahan nggak hangus tiap bulan — cuma kuota dasar yang di-reset.
            </p>
          </div>

          {/* footer — total, CTA, trust badge */}
          <div className="shrink-0 border-t border-black/[0.06] px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink/55">
                {selected ? selected.name : 'Belum ada paket dipilih'}
              </span>
              <span
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  selected ? 'text-ink' : 'text-ink/35',
                )}
              >
                {selected ? formatIDR(selected.price) : '—'}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={!selectedPackage || paying}
              className={cn(
                'mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-colors',
                selectedPackage && !paying
                  ? 'bg-forest text-mint hover:bg-forest-soft active:scale-[0.99]'
                  : 'cursor-not-allowed bg-ink/[0.07] text-ink/35',
              )}
            >
              {paying ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} />
                  Memproses…
                </>
              ) : (
                'Bayar Sekarang'
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink/45">
              <Lock className="size-3 shrink-0" strokeWidth={2.4} />
              Bayar sekali. Tanpa perpanjangan otomatis.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
