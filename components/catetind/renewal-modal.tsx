'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LoaderCircle, ShieldCheck, Sprout, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  RENEWAL_CHECKOUT_HREF,
  RENEWAL_COPY,
  RENEWAL_DATA_NOTE,
  renewalExpiryLabel,
  renewalModalHeadline,
  renewalNextExpiryLabel,
  renewalOptions,
  renewalPlanLabels,
  renewalSuccessBody,
  type RenewalOption,
  type RenewalPeriod,
  type RenewalState,
} from '@/lib/data/renewal'
import { PlantIllustration } from './plant-illustration'

/* ── Modal Renewal + One-Tap Renew (inventaris #m · PRD 4503–4607) ─────────────
   Langganan habis adalah titik churn paling berbahaya, jadi modal ini harus
   terasa seperti PENGINGAT DARI TEMAN — bukan tagihan dari sistem:
     · tanpa hitungan mundur, tanpa warna merah, tanpa "jangan sampai datamu
       hilang" (PRD 4507–4509, 4582–4587);
     · tombol "Nanti aja" sama-sama jelas & sopan;
     · kalau ada token Midtrans tersimpan, tombol primernya jadi One-Tap Renew
       (PRD 4550–4560) — TETAP butuh tap user: tidak ada auto-charge di app ini.

   PEMBAGIAN PERAN dengan `annual-plan-modal.tsx` (supaya tidak ada dua alur yang
   saling menabrakan):
     · `AnnualPlanModal`      = memilih paket/periode & UPGRADE (nambah fitur,
       bayar selisih) — dipakai dari kartu paket aktif di Pengaturan → Langganan.
     · `RenewalModal` (ini)   = MEMPERPANJANG masa aktif yang mau habis, di H-1,
       biasanya satu tap. Ia tidak pernah menawarkan paket lain.
   Dua-duanya membaca harga dari `lib/data/pricing.ts` yang sama, jadi harganya
   tidak mungkin beda cerita.

   BATAS TASK 14 — layar Grace Period / Post-Grace (PRD 4534–4547: halaman jadi
   read-only, input diblokir, tanaman "tidur") TIDAK dibangun di sini: itu gerbang
   GLOBAL untuk seluruh app yang tercatat di ROADMAP-HALAMAN.md §5 butir 3. Modal
   ini hanya pengingatnya, bukan gerbangnya.
   ─────────────────────────────────────────────────────────────────────────── */

/** jeda mock supaya transisinya terasa seperti proses — bukan angka yang diklaim */
const MOCK_PAY_MS = 1400

type Phase = 'offer' | 'processing' | 'done'

/**
 * Modal penuh (overlay) untuk perpanjangan masa aktif: bottom sheet di mobile,
 * dialog tengah di desktop — ritme yang sama dengan `annual-plan-modal.tsx`.
 */
export function RenewalModal({
  open,
  state,
  onDismiss,
  onRenewed,
}: {
  open: boolean
  /** kondisi langganan (mock) — hari tersisa, token tersimpan, harga */
  state: RenewalState
  /** ditutup tanpa perpanjang ("Nanti aja" / silang / ESC) — tanpa nagging */
  onDismiss: () => void
  /** perpanjangan (mock) BERHASIL — penanda siklus ditulis oleh hook pemanggil */
  onRenewed: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('offer')
  /** periode yang sedang/baru diproses — dasar copy sukses & panel konfirmasi */
  const [paidPeriod, setPaidPeriod] = useState<RenewalPeriod | null>(null)
  /** tanggal berakhir baru (dihitung di handler klik, bukan saat render) */
  const [newExpiry, setNewExpiry] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useBodyScrollLock(open)

  /* ESC menutup + fokus pindah ke dialog saat dibuka (a11y) */
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }

    window.addEventListener('keydown', onKeyDown)
    const raf = requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
    }
  }, [open, onDismiss])

  /* ditutup di tengah proses → batalkan timer mock & balik ke tawaran awal */
  useEffect(() => {
    if (open) return
    if (payTimer.current) {
      clearTimeout(payTimer.current)
      payTimer.current = null
    }
    setPhase('offer')
    setPaidPeriod(null)
  }, [open])

  /* bersihin timer saat unmount — tidak ada setState di komponen mati */
  useEffect(
    () => () => {
      if (payTimer.current) clearTimeout(payTimer.current)
    },
    [],
  )

  function handleRenew(option: RenewalOption) {
    if (phase === 'processing') return

    /* Tanpa token tersimpan, PRD 4566–4567 minta jalur "full checkout" — bukan
       alur pembayaran kedua yang dikarang di modal ini. */
    if (!option.oneTap) {
      onDismiss()
      router.push(RENEWAL_CHECKOUT_HREF)
      return
    }

    // TODO: Integrate Midtrans Snap API.
    // Alur produksi: POST /api/payment/renew { use_saved_token: true } → server
    // bikin `snap_token` → `window.snap.pay(snap_token)` → webhook Midtrans yang
    // menambah masa aktif 30/365 hari. Tidak ada auto-charge di mana pun.
    setPhase('processing')
    setPaidPeriod(option.period)

    /* MOCK: timer ini yang nanti digantikan Midtrans Snap */
    payTimer.current = setTimeout(() => {
      payTimer.current = null
      setNewExpiry(renewalNextExpiryLabel(option.period))
      setPhase('done')
      onRenewed()
      toast.success(RENEWAL_COPY.successToast, { description: RENEWAL_COPY.successToastBody })
    }, MOCK_PAY_MS)
  }

  const options = renewalOptions(state)
  const plan = renewalPlanLabels(state)
  /* judul/body mengikuti konteks: pengingat H-1 atau masa aktif yang sudah habis */
  const headline = renewalModalHeadline(state)

  return (
    <div
      className={cn('fixed inset-0 z-[80]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label={RENEWAL_COPY.closeLabel}
        tabIndex={open ? 0 : -1}
        onClick={onDismiss}
        className={cn(
          'absolute inset-0 bg-ink/50 transition-opacity duration-500 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* wrapper: sheet bawah di mobile, dialog tengah di desktop */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center lg:items-center lg:p-6"
        data-lenis-prevent
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="renewal-title"
          aria-describedby="renewal-desc"
          tabIndex={-1}
          className={cn(
            'pointer-events-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.45)] ring-1 ring-soil/12 outline-none transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none lg:max-w-md lg:rounded-[2rem] lg:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.4)]',
            open
              ? 'translate-y-0 opacity-100 lg:scale-100'
              : 'translate-y-full opacity-0 lg:translate-y-6 lg:scale-95',
          )}
        >
          {/* handle drag (visual) + tombol tutup di pojok aman */}
          <div className="relative shrink-0 pt-3">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" aria-hidden />
            <button
              type="button"
              onClick={onDismiss}
              aria-label={RENEWAL_COPY.closeLabel}
              className="absolute top-3 right-4 flex size-8 items-center justify-center rounded-full text-forest/45 transition-colors hover:bg-soil/8 hover:text-forest"
            >
              <X className="size-4" strokeWidth={2.4} aria-hidden />
            </button>
          </div>

          {/* isi modal ikut scroll kalau layar pendek; footer CTA tetap terlihat */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 sm:px-6">
            {phase === 'done' && paidPeriod ? (
              <SuccessPanel
                state={state}
                period={paidPeriod}
                newExpiry={newExpiry}
                onClose={onDismiss}
              />
            ) : (
              <>
                <p className="text-[10px] font-medium tracking-[0.16em] text-forest/55 uppercase">
                  {headline.eyebrow}
                </p>
                <h2
                  id="renewal-title"
                  className="mt-1.5 font-display text-2xl font-medium tracking-tight text-forest"
                >
                  {headline.title}
                </h2>
                <p id="renewal-desc" className="mt-1.5 text-[13px] leading-relaxed text-forest/60">
                  {headline.body}
                </p>

                {/* paket aktif + sisa hari — informasi, bukan alarm */}
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sage/60 px-3.5 py-3 ring-1 ring-soil/8">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12">
                    <Sprout className="size-4" strokeWidth={2.2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium tracking-[0.14em] text-forest/55 uppercase">
                      {RENEWAL_COPY.planLabel}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-medium text-forest">
                      {plan.planName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-forest/55">{plan.planExpiry}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-hud-amber/25 px-2.5 py-1 text-[11px] font-medium text-forest/70 tabular-nums">
                    {plan.daysChip}
                  </span>
                </div>

                {/* TIGA opsi (inventaris #m): bulanan, tahunan, lalu "Nanti aja" */}
                <div className="mt-4 space-y-3.5">
                  {options.map((option) => {
                    const busy = phase === 'processing' && paidPeriod === option.period
                    const primary = option.period === 'monthly'
                    return (
                      <div key={option.period}>
                        <button
                          type="button"
                          onClick={() => handleRenew(option)}
                          disabled={phase === 'processing'}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all',
                            /* primer = sage green (inventaris #m). Teksnya `ink` karena
                               aturan kanon palet: teks di atas aksen terang = ink. */
                            primary
                              ? 'bg-mint text-forest hover:bg-mint/85 active:scale-[0.99]'
                              : 'bg-cream text-forest ring-1 ring-forest/25 hover:bg-sage active:scale-[0.99]',
                            phase === 'processing' && 'cursor-not-allowed opacity-70',
                          )}
                        >
                          <span className="min-w-0 flex-1 text-[13.5px] leading-snug font-medium break-words">
                            {busy ? RENEWAL_COPY.processing : option.label}
                          </span>
                          {option.amount && (
                            <span className="shrink-0 text-right">
                              <span className="block text-[15px] font-medium tabular-nums">
                                {option.amount.value}
                              </span>
                              <span className="block text-[10.5px] font-medium text-forest/60">
                                {option.amount.label}
                              </span>
                            </span>
                          )}
                          {busy && (
                            <LoaderCircle
                              className="size-4 shrink-0 animate-spin"
                              strokeWidth={2.4}
                              aria-hidden
                            />
                          )}
                        </button>
                        <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-forest/55">
                          {option.note}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* trust badge = selling point, bukan disclaimer (PRD 4509/4585) */}
                <div className="mt-4 rounded-2xl bg-sage/60 px-3.5 py-3 ring-1 ring-soil/8">
                  <p className="flex items-start gap-2 text-[11.5px] leading-relaxed font-medium text-forest">
                    <ShieldCheck
                      className="mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2.4}
                      aria-hidden
                    />
                    <span>{RENEWAL_COPY.trustNote}</span>
                  </p>
                  <p className="mt-1 pl-5.5 text-[11px] leading-relaxed text-forest/55">
                    {RENEWAL_DATA_NOTE}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* "Nanti aja" selalu tersedia & sama-sama jelas — tanpa rasa bersalah */}
          {phase !== 'done' && (
            <div className="shrink-0 border-t border-soil/12 px-5 pt-3.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center sm:px-6 lg:pb-5">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full px-4 py-1.5 text-[12.5px] font-medium text-forest/60 underline decoration-soil/25 underline-offset-4 transition-colors hover:text-forest"
              >
                {RENEWAL_COPY.laterCta}
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-forest/55">
                {RENEWAL_COPY.laterHint}
              </p>
              <p className="mt-3 text-[10.5px] leading-relaxed text-forest/55">
                {RENEWAL_COPY.mockNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── panel konfirmasi setelah perpanjangan (mock) ──────────────────────────────
   Bukan struk: user cuma perlu tahu masa aktifnya lanjut, tanaman kembali segar,
   dan tidak ada tagihan yang nyusul. CTA tunggal supaya cepat keluar dari modal. */
function SuccessPanel({
  state,
  period,
  newExpiry,
  onClose,
}: {
  state: RenewalState
  period: RenewalPeriod
  /** tanggal berakhir baru (dihitung di handler klik) */
  newExpiry: string | null
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center pt-1 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-mint/40 text-forest">
        <Check className="size-7" strokeWidth={2.6} aria-hidden />
      </span>

      <h2
        id="renewal-title"
        className="mt-4 font-display text-xl font-medium tracking-tight text-forest"
      >
        {RENEWAL_COPY.successTitle}
      </h2>
      <p id="renewal-desc" className="mt-1.5 text-[13px] leading-relaxed text-forest/60">
        {renewalSuccessBody(period)}
      </p>

      {/* masa aktif yang baru — angka ini yang di produksi datang dari webhook */}
      <div className="mt-4 w-full rounded-2xl bg-sage/60 px-3.5 py-3 text-left ring-1 ring-soil/8">
        <p className="text-[10px] font-medium tracking-[0.14em] text-forest/55 uppercase">
          {RENEWAL_COPY.planLabel}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-forest">{state.planName}</p>
        {newExpiry && (
          <p className="mt-0.5 text-[11px] text-forest/55">{renewalExpiryLabel(newExpiry)}</p>
        )}
      </div>

      {/* tanaman: copy hangat, bukan animasi baru — lihat catatan batas di header */}
      <div className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-mint/20 p-3 text-left ring-1 ring-forest/10">
        <span className="w-12 shrink-0">
          {/* mock: tahap tanaman sekarang — nanti dibaca dari HP tanaman user */}
          <PlantIllustration stage={2} />
        </span>
        <p className="text-[11.5px] leading-relaxed text-forest">{RENEWAL_COPY.successPlant}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-2xl bg-forest py-3.5 text-sm font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.99]"
      >
        {RENEWAL_COPY.successCta}
      </button>
      <p className="mt-3 mb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[10.5px] leading-relaxed text-forest/55">
        {RENEWAL_COPY.trustNote}
      </p>
    </div>
  )
}
