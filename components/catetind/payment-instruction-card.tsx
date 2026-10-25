'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Copy, ExternalLink, Info, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PAY_CARD_COPY, PAY_METHOD_COPY, formatIDR } from '@/lib/data/pricing'
import type { PaymentMethodId } from '@/lib/payments/methods'
import type { PaymentInstructions, PaymentState } from '@/lib/payments/types'

/* ── KARTU PEMBAYARAN (paket 83) — INSTRUKSI BAYAR DI DALAM APP ──────────────
   Muncul setelah user menekan "Bayar sekarang": QRIS (gambar + isi QR), nomor
   Virtual Account, tautan e-wallet, atau kode Mandiri Bill — semuanya di dalam
   tema app, tanpa pindah domain. Di desktop isinya melebar dua kolom (QR di
   kiri, angka/kode di kanan); di mobile tetap satu kolom.

   Tiga hal yang sengaja TIDAK dilakukan di sini:
     · menggambar QR/VA sendiri — kalau provider tidak mengirim instruksinya,
       kartu mengatakannya apa adanya dan menawarkan ganti metode;
     · mengklaim "sudah dibayar" dari timer — status datang dari SERVER
       (`GET /api/payment/status`, yang membaca DB + Midtrans);
     · membiarkan tagihan kedaluwarsa jadi layar buntu — selalu ada tombol
       "bikin tagihan baru" / "ganti metode". */

const POLL_MS = 4000
/** jeda kecil sebelum pindah halaman supaya user sempat membaca statusnya */
const SETTLED_REDIRECT_MS = 2500

export interface ActiveInvoice {
  orderId: string
  method: PaymentMethodId
  amount: number
  expiresAt: string | null
  instructions: PaymentInstructions | null
}

type CardState = PaymentState | 'checking'

/** sisa waktu mm:ss */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** nilai yang bisa disalin — polanya sama dengan referral-screen (`navigator.clipboard` + toast) */
function CopyField({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(PAY_CARD_COPY.copiedLabel)
    } catch {
      toast.error('Gagal menyalin, salin manual ya.')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3 ring-1 ring-soil/12">
      <div className="min-w-0">
        <p className="text-[10.5px] font-medium tracking-[0.14em] text-forest/40 uppercase">{label}</p>
        <p
          className={`mt-1 truncate font-display font-semibold tabular-nums text-forest ${
            large ? 'text-[20px] landing-tab:text-[22px]' : 'text-[16px]'
          }`}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-forest px-3.5 text-[12px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none"
      >
        <Copy className="size-3.5" strokeWidth={2.4} aria-hidden />
        {copied ? PAY_CARD_COPY.copiedLabel : PAY_CARD_COPY.copyLabel}
      </button>
    </div>
  )
}

export function PaymentInstructionCard({
  invoice,
  sandbox = false,
  onSwitchMethod,
  onNewInvoice,
}: {
  invoice: ActiveInvoice
  /** true = tagihan dari Midtrans sandbox (hanya bisa dibayar lewat simulator) */
  sandbox?: boolean
  /** kembali ke daftar metode (tagihan lama dibatalkan server saat bayar ulang) */
  onSwitchMethod: () => void
  /** minta tagihan baru untuk metode yang sama */
  onNewInvoice: () => void
}) {
  const router = useRouter()
  const [state, setState] = useState<CardState>('checking')
  const [remaining, setRemaining] = useState<number | null>(null)

  const methodCopy = PAY_METHOD_COPY[invoice.method]

  const check = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/payment/status?order_id=${encodeURIComponent(invoice.orderId)}&method=${invoice.method}`,
        { cache: 'no-store' },
      )
      const data = (await res.json().catch(() => null)) as { state?: PaymentState } | null
      setState(data?.state ?? 'unknown')
    } catch {
      setState('unknown')
    }
  }, [invoice.orderId, invoice.method])

  useEffect(() => {
    setState('checking')
    void check()
  }, [check])

  /* polling ±4 detik selagi belum kelar — statusnya milik server, bukan timer */
  useEffect(() => {
    if (state !== 'checking' && state !== 'pending' && state !== 'unknown') return
    const timer = setInterval(() => void check(), POLL_MS)
    return () => clearInterval(timer)
  }, [state, check])

  /* hitungan mundur dari waktu kedaluwarsa PROVIDER (bukan angka karangan) */
  useEffect(() => {
    if (!invoice.expiresAt) {
      setRemaining(null)
      return
    }
    const expiresAt = new Date(invoice.expiresAt).getTime()
    const tick = () => setRemaining(expiresAt - Date.now())
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [invoice.expiresAt])

  /* pembayaran masuk → halaman konfirmasi yang sudah ada (mem-poll status paket) */
  useEffect(() => {
    if (state !== 'settled') return
    const timer = setTimeout(() => {
      router.push(`/checkout/selesai?order_id=${encodeURIComponent(invoice.orderId)}`)
    }, SETTLED_REDIRECT_MS)
    return () => clearTimeout(timer)
  }, [state, invoice.orderId, router])

  const timeUp = remaining !== null && remaining <= 0
  const dead = state === 'expired' || state === 'failed' || (timeUp && state !== 'settled')
  const settled = state === 'settled'
  const instructions = invoice.instructions

  const statusLabel = settled
    ? PAY_CARD_COPY.statusSettled
    : dead
      ? timeUp || state === 'expired'
        ? PAY_CARD_COPY.statusExpired
        : PAY_CARD_COPY.statusFailed
      : state === 'checking'
        ? PAY_CARD_COPY.checkingLabel
        : PAY_CARD_COPY.statusPending
  const StatusIcon = settled ? CheckCircle2 : dead ? XCircle : Clock
  const statusTone = settled
    ? 'bg-mint/25 text-forest ring-mint/50'
    : dead
      ? 'bg-plum/15 text-plum ring-plum/30'
      : 'bg-sage text-forest ring-soil/20'
  const live = !dead && !settled

  return (
    <section className="rounded-[24px] bg-cream p-5 shadow-landing-hairline ring-1 ring-soil/12 landing:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-medium text-forest">{methodCopy.label}</p>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium ring-1 ${statusTone}`}
        >
          <StatusIcon className="size-3.5" strokeWidth={2.4} aria-hidden />
          {statusLabel}
        </span>
      </div>

      {/* nominal + hitungan mundur dalam satu baris (hemat teks, mata langsung ke angka) */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-soil/12 pt-3.5">
        <span className="text-[12.5px] text-forest/50">{PAY_CARD_COPY.totalLabel}</span>
        <span className="flex items-baseline gap-3">
          {live && remaining !== null && (
            <span className="font-medium tabular-nums text-forest/45">
              {formatRemaining(remaining)}
            </span>
          )}
          {dead && <span className="font-medium text-plum">{PAY_CARD_COPY.timeUpLabel}</span>}
          <span className="font-display text-[19px] font-semibold tabular-nums text-forest landing-tab:text-[21px]">
            {formatIDR(invoice.amount)}
          </span>
        </span>
      </div>

      {sandbox && live && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-sage/60 px-4 py-3 text-[11.5px] leading-relaxed text-forest ring-1 ring-soil/15">
          <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          <p>
            <strong className="font-medium">{PAY_CARD_COPY.sandboxTitle}.</strong>{' '}
            {PAY_CARD_COPY.sandboxBody}{' '}
            <a
              href="https://simulator.sandbox.midtrans.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline decoration-forest/30 underline-offset-2 hover:decoration-forest"
            >
              {PAY_CARD_COPY.sandboxCta}
            </a>
          </p>
        </div>
      )}

      {live && instructions?.channel === 'qris' && (
        <div className="mx-auto mt-4 w-full max-w-[420px] rounded-[20px] bg-canvas p-4 ring-1 ring-soil/10 landing:p-5">
          <div className="mx-auto flex w-full max-w-[340px] flex-col items-center text-center">
            <p className="text-[12.5px] font-medium text-forest">{PAY_CARD_COPY.qrisScanTitle}</p>
            {/* <img> biasa: sumbernya URL gambar dari provider, bukan aset app */}
            <img
              src={instructions.qrImageUrl}
              alt={PAY_CARD_COPY.qrAlt}
              width={220}
              height={220}
              className="mt-4 size-[210px] rounded-2xl bg-white object-contain p-3 ring-1 ring-soil/12 landing-tab:size-[220px]"
            />
            <p className="mt-3 text-[11.5px] leading-relaxed text-forest/50">{methodCopy.hint}</p>
          </div>
        </div>
      )}

      {live && instructions?.channel === 'qris' && instructions.qrString && (
        <div className="mt-3">
          <p className="mb-2 text-[11.5px] text-forest/45">{PAY_CARD_COPY.qrStringLabel}</p>
          <CopyField label={methodCopy.label} value={instructions.qrString} />
        </div>
      )}

      {live && instructions?.channel === 'va' && (
        <div className="mt-4">
          <CopyField
            label={`${PAY_CARD_COPY.vaLabel} · ${instructions.bank.toUpperCase()}`}
            value={instructions.vaNumber}
            large
          />
          <p className="mt-2.5 text-[11.5px] text-forest/45">{PAY_CARD_COPY.vaHint}</p>
        </div>
      )}

      {live && instructions?.channel === 'ewallet' && (
        <div className="mt-4">
          <a
            href={instructions.deeplinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none landing-tab:w-auto landing-tab:min-w-[260px]"
          >
            {PAY_CARD_COPY.ewalletCta}
            <ExternalLink className="size-4" strokeWidth={2.4} aria-hidden />
          </a>
          <p className="mt-2.5 text-[11.5px] text-forest/45">{PAY_CARD_COPY.ewalletHint}</p>
        </div>
      )}

      {live && instructions?.channel === 'bill' && (
        <div className="mt-4">
          <div className="grid gap-2.5 landing-tab:grid-cols-2">
            <CopyField label={PAY_CARD_COPY.billerLabel} value={instructions.billerCode} />
            <CopyField label={PAY_CARD_COPY.billKeyLabel} value={instructions.billKey} large />
          </div>
          <p className="mt-2.5 text-[11.5px] text-forest/45">{PAY_CARD_COPY.billHint}</p>
        </div>
      )}

      {live && !instructions && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-plum/10 px-3.5 py-3 text-[12px] leading-relaxed text-forest ring-1 ring-plum/20">
          <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          {PAY_CARD_COPY.noInstructions}
        </p>
      )}

      {settled && (
        <p className="mt-4 rounded-2xl bg-mint/25 px-3.5 py-3 text-[12.5px] font-medium text-forest ring-1 ring-forest/10">
          {PAY_CARD_COPY.settledTitle} · <span className="font-normal">{PAY_CARD_COPY.settledBody}</span>
        </p>
      )}

      {dead && (
        <>
          <p className="mt-4 rounded-2xl bg-plum/10 px-3.5 py-3 text-[12.5px] leading-relaxed text-forest ring-1 ring-plum/20">
            <strong className="font-medium">
              {timeUp || state === 'expired'
                ? PAY_CARD_COPY.expiredTitle
                : PAY_CARD_COPY.failedTitle}
            </strong>{' '}
            <span className="font-normal text-forest/60">
              {timeUp || state === 'expired'
                ? PAY_CARD_COPY.expiredBody
                : PAY_CARD_COPY.failedBody}
            </span>
          </p>
          <div className="mt-3 flex flex-col gap-2 landing-tab:flex-row">
            <button
              type="button"
              onClick={onNewInvoice}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none landing-tab:min-w-[200px]"
            >
              <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden />
              {PAY_CARD_COPY.newInvoiceLabel}
            </button>
            <button
              type="button"
              onClick={onSwitchMethod}
              className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[13.5px] font-medium text-forest/70 ring-1 ring-soil/16 transition-colors duration-200 hover:text-forest motion-reduce:transition-none"
            >
              {PAY_CARD_COPY.switchMethodLabel}
            </button>
          </div>
        </>
      )}

      {live && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-soil/12 pt-3.5">
          <span className="flex items-center gap-2 text-[11.5px] text-forest/45">
            <span className="size-1.5 animate-pulse rounded-full bg-forest/40" aria-hidden />
            {PAY_CARD_COPY.waitingTitle}
          </span>
          <button
            type="button"
            onClick={onSwitchMethod}
            className="text-[11.5px] font-medium text-forest/60 underline decoration-soil/40 underline-offset-4 transition-colors duration-200 hover:text-forest"
          >
            {PAY_CARD_COPY.switchMethodLabel}
          </button>
        </div>
      )}

      <p className="mt-3 text-[10.5px] tabular-nums text-forest/35">
        {PAY_CARD_COPY.orderLabel} {invoice.orderId}
      </p>
    </section>
  )
}
