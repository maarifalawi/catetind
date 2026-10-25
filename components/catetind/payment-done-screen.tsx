'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Clock, RotateCw, XCircle } from 'lucide-react'
import { PAY_DONE_COPY } from '@/lib/data/pricing'

/* SELESAI BAYAR (/checkout/selesai) -------------------------------------------
   Halaman setelah pembayaran. Statusnya DIBACA dari database
   (`GET /api/subscription`), bukan disimpulkan dari `?status=` - jadi user tidak
   pernah dibilang "aktif" sebelum pembayarannya benar-benar tercatat.

   PAKET 99 — “CEK LAGI” YANG BENAR-BENAR BEKERJA:
   dulu tombol ini hanya membaca ulang database. Kalau webhook Midtrans belum
   masuk (localhost pasti begitu; di produksi pun notifikasi bisa gagal), hasilnya
   SELAMANYA “belum tercatat” — tombol yang tidak mengubah apa pun terasa mati.
   Sekarang setiap percobaan memanggil `POST /api/payment/reconcile`: server
   mencocokkan order `pending` ke Midtrans dan memenuhinya kalau sudah lunas.
   Jadi halaman ini bisa menyembuhkan dirinya sendiri, tanpa menunggu webhook.

   Tampilannya satu kartu tenang di tengah, tanpa footer landing (permintaan
   pemilik produk): setelah membayar, yang perlu dibaca hanya status + tombol
   masuk. Order id tetap dibawa sebagai atribut audit (`data-order-id`), bukan
   sebagai baris teks yang menambah kebisingan. */

type PayState = 'checking' | 'active' | 'pending'

/** balasan `/api/payment/reconcile` — bentuknya sama dengan `/api/subscription` */
interface SubscriptionResponse {
  ok?: boolean
  active?: boolean
  isLifetime?: boolean
  error?: string
}

/** jeda antar percobaan otomatis (±1 menit total, cukup untuk webhook telat) */
const POLL_MS = 3000
const MAX_AUTO_ATTEMPTS = 20
/** jeda kecil sebelum pindah ke Dashboard supaya status “aktif” sempat terbaca */
const REDIRECT_MS = 1800

export function PaymentDoneScreen({ orderId, failed }: { orderId: string | null; failed: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<PayState>('checking')
  const [attempts, setAttempts] = useState(0)
  const [isLifetime, setIsLifetime] = useState(false)
  /** tombol “Cek lagi” sedang bekerja (spinner) */
  const [busy, setBusy] = useState(false)
  /** keterangan setelah pemeriksaan MANUAL, supaya tombolnya tidak terasa bisu */
  const [note, setNote] = useState<string | null>(null)

  const readSubscription = useCallback(async (): Promise<SubscriptionResponse | null> => {
    try {
      const res = await fetch('/api/subscription', { cache: 'no-store' })
      if (!res.ok) return null
      return (await res.json()) as SubscriptionResponse
    } catch {
      return null
    }
  }, [])

  /**
   * `manual` = user menekan “Cek lagi”.
   *
   * Urutannya sengaja: rekonsiliasi DULU (server ↔ Midtrans → pemenuhan), baru
   * membaca paket. Kalau route rekonsiliasi tidak tersedia/gagal (mis. sesi
   * sudah habis di tab lain), jatuh ke pembacaan paket biasa — halaman tetap
   * jujur, tidak pernah mengaku aktif tanpa bukti.
   */
  const check = useCallback(
    async ({ manual = false }: { manual?: boolean } = {}) => {
      if (manual) {
        setBusy(true)
        setNote(null)
        /* percobaan manual MENGHIDUPKAN lagi polling otomatis: kalau webhook
           baru masuk 10 detik kemudian, halaman tetap menangkapnya. */
        setAttempts(0)
      }

      try {
        let data: SubscriptionResponse | null = null
        try {
          const res = await fetch('/api/payment/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderId ? { order_id: orderId } : {}),
            cache: 'no-store',
          })
          if (res.ok) data = (await res.json()) as SubscriptionResponse
        } catch {
          /* fallback di bawah */
        }

        if (!data?.ok) data = await readSubscription()

        setIsLifetime(data?.isLifetime === true)
        if (data?.active) {
          setState('active')
          setNote(null)
          return
        }

        setState('pending')
        if (manual) setNote(PAY_DONE_COPY.stillPendingNote)
      } catch {
        setState('pending')
        if (manual) setNote(PAY_DONE_COPY.stillPendingNote)
      } finally {
        if (manual) setBusy(false)
      }
    },
    [orderId, readSubscription],
  )

  useEffect(() => {
    void check()
  }, [check])

  /* Polling otomatis hanya saat masih `pending`: kalau sudah aktif, atau user
     sedang menekan tombol, tidak perlu request tambahan. */
  useEffect(() => {
    if (state !== 'pending' || busy || attempts >= MAX_AUTO_ATTEMPTS) return
    const timer = setTimeout(() => {
      setAttempts((value) => value + 1)
      void check()
    }, POLL_MS)
    return () => clearTimeout(timer)
  }, [state, busy, attempts, check])

  /* Akses aktif → langsung ke Dashboard. `/app` tetap dijaga middleware, jadi
     kalau sesinya sudah habis user mendarat di `/login?next=/app` — bukan
     halaman kosong. Dulu tautannya selalu ke `/login`, sehingga user yang SUDAH
     masuk diminta memasukkan kode email sekali lagi. */
  useEffect(() => {
    if (state !== 'active') return
    const timer = setTimeout(() => router.replace('/app'), REDIRECT_MS)
    return () => clearTimeout(timer)
  }, [state, router])

  const showFailed = failed && state === 'pending'
  const title =
    state === 'active'
      ? PAY_DONE_COPY.activeTitle
      : showFailed
        ? PAY_DONE_COPY.failedTitle
        : state === 'pending'
          ? PAY_DONE_COPY.pendingTitle
          : PAY_DONE_COPY.checkingTitle
  const body =
    state === 'active'
      ? isLifetime
        ? PAY_DONE_COPY.activeBodyLifetime
        : PAY_DONE_COPY.activeBodyMonthly
      : showFailed
        ? PAY_DONE_COPY.failedBody
        : state === 'pending'
          ? PAY_DONE_COPY.pendingBody
          : PAY_DONE_COPY.checkingBody

  const Icon = state === 'active' ? CheckCircle2 : showFailed ? XCircle : Clock
  const tone =
    state === 'active'
      ? 'bg-mint/20 text-forest ring-mint/40'
      : showFailed
        ? 'bg-plum/10 text-plum ring-plum/25'
        : 'bg-sage text-forest ring-soil/15'

  return (
    <section
      data-order-id={orderId ?? undefined}
      className="relative isolate flex min-h-[calc(100dvh-72px)] w-full items-center justify-center overflow-hidden bg-canvas px-5 pt-[120px] pb-16 landing-tab:px-8 landing-tab:pt-[150px] landing:pb-20"
    >
      {/* latar lembut: dua pendar warna palet + garis cahaya tipis */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(80%_100%_at_50%_0%,var(--color-mint-soft)_0%,var(--color-canvas)_62%,var(--color-canvas)_100%)] opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 -z-10 size-72 rounded-full bg-mint/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-10 -z-10 size-64 rounded-full bg-cantelope/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-[520px]">
        <div className="relative overflow-hidden rounded-[32px] bg-canvas/90 px-6 py-10 text-center shadow-landing-soft ring-1 ring-soil/[0.07] backdrop-blur-xl landing-tab:px-10 landing-tab:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(145,187,158,0.16),transparent_72%)]"
          />

          <div className="relative" aria-live="polite">
            {/* ikon status dengan cincin lembut — satu-satunya ornamen di kartu */}
            <span className="relative mx-auto flex size-20 items-center justify-center">
              {state === 'active' ? (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full bg-mint/20 motion-reduce:animate-none"
                />
              ) : null}
              <span
                className={`relative flex size-16 items-center justify-center rounded-full ring-1 ${tone}`}
              >
                <Icon className="size-7" strokeWidth={2.2} aria-hidden />
              </span>
            </span>

            <h1
              id="pay-done-title"
              className="mt-6 text-balance font-display text-[28px] leading-[1.15] font-semibold tracking-normal text-forest landing-tab:text-[36px]"
            >
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-[34ch] text-balance text-[13.5px] leading-[1.7] text-forest-muted">
              {body}
            </p>
            {note && (
              <p
                role="status"
                className="mx-auto mt-3 max-w-[38ch] rounded-2xl bg-daisy-light/60 px-3.5 py-2.5 text-balance text-[12px] leading-relaxed text-daisy-deep ring-1 ring-daisy-deep/15"
              >
                {note}
              </p>
            )}
            {state === 'active' && (
              <p className="mt-3 text-[11.5px] text-forest/45">{PAY_DONE_COPY.autoRedirectNote}</p>
            )}

            <div className="mt-8 flex flex-col items-center justify-center gap-2 landing-tab:flex-row">
              {state === 'active' ? (
                /* Tautan LANGSUNG ke Dashboard. `/app` tetap dijaga middleware:
                   pengunjung tanpa sesi otomatis dipindah ke `/login?next=/app`.
                   Sebelumnya tautan ini SELALU ke `/login`, sehingga user yang
                   baru membayar (dan masih punya sesi) diminta memasukkan kode
                   email sekali lagi. */
                <Link
                  href="/app"
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream shadow-landing-cta transition-all duration-300 hover:-translate-y-0.5 hover:bg-forest-soft motion-reduce:transition-none landing-tab:w-auto landing-tab:min-w-[220px]"
                >
                  {PAY_DONE_COPY.appCta}
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    strokeWidth={2.4}
                    aria-hidden
                  />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void check({ manual: true })}
                    disabled={busy}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[13.5px] font-medium text-cream shadow-landing-cta transition-all duration-300 hover:-translate-y-0.5 hover:bg-forest-soft disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 motion-reduce:transition-none landing-tab:w-auto landing-tab:min-w-[170px]"
                  >
                    <RotateCw
                      className={`size-4 ${busy ? 'animate-spin motion-reduce:animate-none' : ''}`}
                      strokeWidth={2.4}
                      aria-hidden
                    />
                    {busy || state === 'checking'
                      ? PAY_DONE_COPY.retryChecking
                      : PAY_DONE_COPY.retryLabel}
                  </button>
                  <Link
                    href="/checkout"
                    className="inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-[13.5px] font-medium text-forest-muted ring-1 ring-soil/10 transition-colors hover:bg-sage/50 hover:text-forest landing-tab:w-auto"
                  >
                    {PAY_DONE_COPY.homeCta}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}