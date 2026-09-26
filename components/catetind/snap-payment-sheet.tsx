'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, LoaderCircle, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ONBOARDING_ROUTE } from '@/lib/onboarding'
import { PAYMENT_SHEET_COPY, formatIDR } from '@/lib/data/pricing'
import { BudgetSheet, SheetSubmit } from './budget-sheet'
import { PAYMENT_METHODS, PaymentLogo, type PaymentMethodId } from './payment-method-logos'

/* ── Simulasi pembayaran (Midtrans Snap) — langkah 2 checkout ─────────────────
   PRD 5909–5912: setelah data diisi, user memilih metode (QRIS, GoPay, OVO,
   DANA, VA) lalu bayar. Setelah pembayaran dikonfirmasi, user TIDAK ditahan di
   layar verifikasi: langsung diarahkan ke onboarding (PRD 5916–5931).

   ARAH PRODUKSI: POST /api/payment/subscribe → server bikin `snap_token` →
   `window.snap.pay(snap_token)` membuka popup Snap asli → webhook Midtrans yang
   menandai akun aktif + masa aktif 365/30 hari. Repo demo belum punya billing
   server, jadi langkah itu disimulasikan APA ADANYA — dan statusnya ditulis
   terus terang di UI ("Demo: pembayaran disimulasikan"), bukan dipura-pura
   seperti transaksi nyata.

   Logo metode memakai `payment-method-logos.tsx` yang monokrom: TIDAK ada logo
   QRIS/bank berlisensi, dan TIDAK ada klaim asosiasi bank.
   ────────────────────────────────────────────────────────────────────────── */

/** jeda mock biar transisi terasa seperti proses — bukan angka yang diklaim */
const MOCK_PAY_MS = 1500
/** jeda sebelum dialihkan otomatis ke onboarding; tombolnya juga tetap bisa ditekan */
const AUTO_REDIRECT_MS = 1800

export function SnapPaymentSheet({
  open,
  onClose,
  planName,
  periodLabel,
  amount,
  customerEmail,
}: {
  open: boolean
  onClose: () => void
  /** nama paket yang dibeli — ditampilkan di ringkasan */
  planName: string
  /** label periode, mis. "/ tahun" atau "sekali bayar" */
  periodLabel: string
  /** nominal final (sudah dipotong diskon teman kalau ada) */
  amount: number
  /**
   * email hasil registrasi di langkah 1 — dipakai sebagai identitas pembeli di
   * ringkasan (di Snap asli ini masuk ke `customer_details`). Hanya hidup di
   * memori sesi ini, tidak disimpan di storage mana pun.
   */
  customerEmail?: string | null
}) {
  const router = useRouter()
  /** metode terpilih — null = tombol Bayar belum aktif */
  const [method, setMethod] = useState<PaymentMethodId | null>(null)
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState(false)
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Semua timer dibersihkan saat unmount supaya tidak ada setState di komponen mati */
  useEffect(
    () => () => {
      if (payTimer.current) clearTimeout(payTimer.current)
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    },
    [],
  )

  /* Sheet ditutup sebelum selesai → batalkan simulasi & balik ke kondisi awal.
     Kalau sudah `done`, bahasanya berbeda: user sedang diarahkan ke onboarding,
     jadi state jangan direset (CTA-nya harus tetap ada). */
  useEffect(() => {
    if (open || done) return
    if (payTimer.current) {
      clearTimeout(payTimer.current)
      payTimer.current = null
    }
    setPaying(false)
  }, [open, done])

  /* Sukses → arahkan ke onboarding (PRD 5919). Tombolnya tetap tersedia supaya
     user yang keburu menutup sheet tidak terjebak di halaman yang sama. */
  useEffect(() => {
    if (!done) return
    redirectTimer.current = setTimeout(() => router.push(ONBOARDING_ROUTE), AUTO_REDIRECT_MS)
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [done, router])

  function handlePay() {
    if (!method || paying) return
    setPaying(true)
    /* MOCK: timer inilah yang nanti digantikan popup Midtrans Snap */
    payTimer.current = setTimeout(() => {
      payTimer.current = null
      setPaying(false)
      setDone(true)
    }, MOCK_PAY_MS)
  }

  function goToOnboarding() {
    if (redirectTimer.current) clearTimeout(redirectTimer.current)
    router.push(ONBOARDING_ROUTE)
  }

  return (
    <BudgetSheet
      open={open}
      onClose={onClose}
      title={done ? PAYMENT_SHEET_COPY.successTitle : PAYMENT_SHEET_COPY.title}
      description={done ? PAYMENT_SHEET_COPY.successBody : PAYMENT_SHEET_COPY.description}
      footer={
        done ? (
          <SheetSubmit onClick={goToOnboarding}>{PAYMENT_SHEET_COPY.successCta}</SheetSubmit>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink/55">{PAYMENT_SHEET_COPY.totalLabel}</span>
              <span className="font-display text-lg font-semibold tabular-nums text-ink">
                {formatIDR(amount)}
              </span>
            </div>

            <SheetSubmit onClick={handlePay} disabled={!method || paying} className="mt-3">
              {paying ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" strokeWidth={2.4} aria-hidden />
                  {PAYMENT_SHEET_COPY.payingLabel}
                </>
              ) : (
                PAYMENT_SHEET_COPY.payLabel
              )}
            </SheetSubmit>

            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-ink/45">
              <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden />
              <span>{PAYMENT_SHEET_COPY.mockNote}</span>
            </p>
          </>
        )
      }
    >
      {done ? (
        /* ── state sukses: user dilepas ke onboarding, bukan ditahan di sini ── */
        <div className="flex flex-col items-center pb-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-mint/40 text-forest">
            <CheckCircle2 className="size-7" strokeWidth={2.2} aria-hidden />
          </span>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink/55">
            {PAYMENT_SHEET_COPY.successRedirecting}
          </p>
        </div>
      ) : (
        <>
          {/* ── ringkasan yang dibayar ─────────────────────────────────────── */}
          <div className="rounded-2xl bg-sage/70 px-3.5 py-3 ring-1 ring-soil/8">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink/40 uppercase">
              {planName}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-xl font-semibold tabular-nums text-ink">
                {formatIDR(amount)}
              </span>
              <span className="text-[11px] font-medium text-ink/50">{periodLabel}</span>
            </p>
            {customerEmail && (
              <p className="mt-1 truncate text-[11px] text-ink/50">{customerEmail}</p>
            )}
          </div>

          {/* ── pilih metode: satu daftar, mark monokrom, tanpa logo berlisensi ── */}
          <p className="mt-5 text-[13px] font-semibold leading-snug text-ink">
            {PAYMENT_SHEET_COPY.methodLegend}
          </p>
          <ul role="radiogroup" aria-label={PAYMENT_SHEET_COPY.methodLegend} className="mt-2.5 space-y-2">
            {PAYMENT_METHODS.map((item) => {
              const active = item.id === method
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMethod(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left ring-1 transition-colors',
                      active
                        ? 'bg-sage/70 ring-forest/35'
                        : 'bg-cream ring-soil/12 hover:bg-sage/40',
                    )}
                  >
                    <PaymentLogo id={item.id} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                      {item.label}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                        active
                          ? 'border-forest bg-forest text-mint'
                          : 'border-ink/20 bg-cream text-transparent',
                      )}
                    >
                      <Check className="size-2.5" strokeWidth={3.6} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {method === 'va' && (
            <p className="mt-2.5 text-[11px] leading-relaxed text-ink/50">
              {PAYMENT_SHEET_COPY.vaHint}
            </p>
          )}

          <p className="mt-5 rounded-2xl bg-mint/25 px-3.5 py-3 text-[11.5px] leading-relaxed font-semibold text-forest ring-1 ring-forest/10">
            {PAYMENT_SHEET_COPY.trustNote}
          </p>
        </>
      )}
    </BudgetSheet>
  )
}
