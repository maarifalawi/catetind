'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, Lock, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { formatIDR } from '@/lib/weekly-recap'
import {
  AI_ADDON_PACKAGES,
  AI_RESET_RULE_COPY,
  AI_TOPUP_COPY,
  formatTokens,
  planQuota,
  type AiAddonPackageId,
} from '@/lib/ai-quota'
import { PaymentInstructionCard, type ActiveInvoice } from './payment-instruction-card'
import { useSubscriptionGate } from './subscription-gate-provider'

/* ── Add-on AI Token (Domain 5C) ───────────────────────────────────────────────
   Paket, harga, token, dan seluruh copy-nya tinggal di `lib/ai-quota.ts`:
   granularitasnya sengaja kecil & bahasanya kasual ("Receh / Sedang / Gede") —
   penamaan kanon PRD 4790–4798, bukan "Basic/Pro/Enterprise". Modal ini tidak
   menyimpan nominal apa pun, jadi harga di halaman lain tidak bisa berbeda.

   PAKET 85 — PEMBAYARAN NYATA (bukan lagi simulasi). "Bayar Sekarang" memanggil
   `POST /api/payment/charge` dengan `purpose: 'topup'`; server membaca harga dari
   `lib/ai-quota.ts`, menulis baris `purchases`, lalu mengembalikan INSTRUKSI BAYAR
   yang digambar `payment-instruction-card.tsx` (komponen yang sama dengan checkout
   paket) — tidak ada komponen pembayaran kedua dan tidak ada Snap. Tokennya dicatat
   SERVER lewat webhook (`ai_addons`), jadi tidak lagi hilang saat ganti perangkat.

   Modal ini juga TIDAK boleh dibuka oleh paket tanpa AI: tidak ada kuota yang perlu
   ditambah. Kalau paket belum diketahui, perilaku lama dipertahankan (jangan
   mengunci karena ketidaktahuan). */

/**
 * Modal Top Up AI Token — bottom sheet di mobile, dialog tengah di desktop.
 * Mulai TANPA paket terpilih supaya state "disabled" tombol Bayar Sekarang
 * kelihatan jelas (selectedPackage === null).
 */
export function TopUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  /** paket yang dipilih user — ini yang bikin tombol Bayar Sekarang aktif */
  const [selectedPackage, setSelectedPackage] = useState<AiAddonPackageId | null>(null)
  const [paying, setPaying] = useState(false)
  /* tagihan aktif dari `/api/payment/charge` — begitu ada, modal menampilkan
     INSTRUKSI BAYAR (bukan lagi simulasi timer) */
  const [invoice, setInvoice] = useState<ActiveInvoice | null>(null)
  /** pesan jujur saat tagihan tidak bisa dibuat (mis. pembayaran belum aktif) */
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

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

  /* kalau ditutup di tengah proses, kembalikan tombol ke keadaan normal */
  useEffect(() => {
    if (open) return
    setPaying(false)
    setError(null)
  }, [open])

  /* saat modal DIBUKA: mulai dari daftar paket, bukan tagihan lama */
  useEffect(() => {
    if (!open) return
    setInvoice(null)
    setError(null)
  }, [open])

  const selected = AI_ADDON_PACKAGES.find((pkg) => pkg.id === selectedPackage) ?? null

  /**
   * Bikin tagihan NYATA lewat `/api/payment/charge` (`purpose: 'topup'`). Server
   * yang memutuskan nominalnya dari `lib/ai-quota.ts`; klien cuma mengirim pilihan
   * paket. Balasannya berisi INSTRUKSI BAYAR yang digambar `PaymentInstructionCard`
   * — jalur yang sama dengan checkout pembelian paket.
   *
   * Yang TIDAK dilakukan di sini: menambah token di klien begitu tombol ditekan.
   * Token dicatat SERVER lewat webhook (`ai_addons`), jadi tidak ada "token masuk"
   * yang belum benar-benar dibayar.
   */
  const handlePay = useCallback(async () => {
    if (!selectedPackage || paying) return
    const pkg = AI_ADDON_PACKAGES.find((item) => item.id === selectedPackage)
    if (!pkg) return
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/payment/charge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          purpose: 'topup',
          packageId: pkg.id,
          amount: pkg.price,
          method: 'qris',
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        orderId?: string
        amount?: number
        expiresAt?: string | null
        instructions?: ActiveInvoice['instructions']
        error?: string
      } | null
      if (!res.ok || !data?.ok || !data.orderId) {
        /* jujur: pembayaran belum tersedia / ditolak — jangan mengaku token masuk */
        setError(data?.error ?? AI_TOPUP_COPY.notConfigured)
        return
      }
      setInvoice({
        orderId: data.orderId,
        method: 'qris',
        amount: data.amount ?? pkg.price,
        expiresAt: data.expiresAt ?? null,
        instructions: data.instructions ?? null,
      })
    } catch {
      setError(AI_TOPUP_COPY.notConfigured)
    } finally {
      setPaying(false)
    }
  }, [selectedPackage, paying])

  /* Modal ini TIDAK BOLEH dibuka oleh paket tanpa AI (paket 85): tidak ada kuota
     yang perlu ditambah. Kalau paket belum diketahui (`planKnown` false, mis. build
     demo), modal tetap tampil — jangan mengunci karena ketidaktahuan. */
  const { planId, planKnown } = useSubscriptionGate()
  if (planKnown && !planQuota(planId).aiEnabled) return null

  return (
    <div
      className={cn('fixed inset-0 z-[80]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label={AI_TOPUP_COPY.backdropLabel}
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
            'pointer-events-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.55)] ring-1 ring-soil/12 outline-none transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:max-w-lg lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.5)]',
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
              <h2 id="topup-title" className="text-xl font-medium tracking-tight text-forest">
                {AI_TOPUP_COPY.title}
              </h2>
              <p
                id="topup-desc"
                className="mt-0.5 text-[13px] leading-relaxed break-words text-forest/55"
              >
                {AI_TOPUP_COPY.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={AI_TOPUP_COPY.closeLabel}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage"
            >
              <X className="size-4" strokeWidth={2.2} />
            </button>
          </div>

          {invoice ? (
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-1 sm:px-6">
              <PaymentInstructionCard
                invoice={invoice}
                onSwitchMethod={() => setInvoice(null)}
                onNewInvoice={() => void handlePay()}
              />
            </div>
          ) : (
            <>
          {/* daftar paket — scroll kalau layar pendek */}
          <div
            data-lenis-prevent
            className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-1 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div
              role="radiogroup"
              aria-label={AI_TOPUP_COPY.packageLegend}
              className="grid gap-2.5 pt-2 sm:grid-cols-3"
            >
              {AI_ADDON_PACKAGES.map((pkg) => {
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
                        ? 'bg-mint ring-2 ring-forest shadow-[0_14px_28px_-16px_rgba(0,0,0,0.55)]'
                        : 'bg-cream ring-1 ring-soil/12 hover:ring-forest/25',
                      active && !onAccent && 'ring-2 ring-forest',
                      active && onAccent && 'ring-[3px]',
                    )}
                  >
                    {onAccent && (
                      <span className="absolute -top-2 right-3 rounded-full bg-forest px-2.5 py-[3px] text-[10px] font-medium tracking-wide text-mint">
                        {AI_TOPUP_COPY.bestBadge}
                      </span>
                    )}

                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'text-[13px] font-medium leading-snug',
                          onAccent ? 'text-forest' : 'text-forest',
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
                              ? 'border-forest/40 bg-cream/60 text-transparent'
                              : 'border-ink/20 bg-cream text-transparent',
                        )}
                        aria-hidden
                      >
                        <Check className="size-2.5" strokeWidth={3.6} />
                      </span>
                    </span>

                    <span
                      className={cn(
                        'mt-2 text-lg font-medium tracking-tight tabular-nums',
                        onAccent ? 'text-forest' : 'text-forest',
                      )}
                    >
                      {formatIDR(pkg.price)}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium',
                        onAccent ? 'text-forest/60' : 'text-forest/40',
                      )}
                    >
                      {AI_TOPUP_COPY.onceLabel}
                    </span>

                    <span
                      className={cn(
                        'mt-2.5 block text-[11px] font-medium',
                        onAccent ? 'text-forest' : 'text-forest/80',
                      )}
                    >
                      +{formatTokens(pkg.tokens)} token AI
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block text-[10px] leading-relaxed',
                        onAccent ? 'text-forest/60' : 'text-forest/45',
                      )}
                    >
                      {pkg.note}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="mt-3 mb-1 text-[11px] leading-relaxed text-forest/40">
              {AI_RESET_RULE_COPY}
            </p>
          </div>

          {/* footer — total, CTA, trust badge */}
          <div className="shrink-0 border-t border-soil/12 px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-5">
            {error && (
              <p className="mb-3 rounded-2xl bg-plum/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest ring-1 ring-plum/20">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-forest/55">
                {selected ? selected.name : AI_TOPUP_COPY.emptySelection}
              </span>
              <span
                className={cn(
                  'shrink-0 font-medium tabular-nums',
                  selected ? 'text-forest' : 'text-forest/35',
                )}
              >
                {selected ? formatIDR(selected.price) : '-'}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={!selectedPackage || paying}
              className={cn(
                'mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-colors',
                selectedPackage && !paying
                  ? 'bg-forest text-mint hover:bg-forest-soft active:scale-[0.99]'
                  : 'cursor-not-allowed bg-ink/[0.07] text-forest/35',
              )}
            >
              {paying ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} />
                  {AI_TOPUP_COPY.payingCta}
                </>
              ) : (
                AI_TOPUP_COPY.payCta
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-forest/45">
              <Lock className="size-3 shrink-0" strokeWidth={2.4} />
              {AI_TOPUP_COPY.trustNote}
            </p>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
