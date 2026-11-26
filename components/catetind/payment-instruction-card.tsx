'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Copy, ExternalLink, Info, RefreshCw, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
  /** instruksi QR/VA dari Core API (jalur lama) — Snap tidak mengirimnya */
  instructions: PaymentInstructions | null
  /**
   * Halaman pembayaran Midtrans (Snap). Sejak revisi ini halamannya DI-EMBED
   * di kartu (`snap.embed(token, { embedId })`), jadi `redirectUrl` hanya
   * dipakai sebagai jalan keluar kalau iframe diblokir browser/jaringan.
   */
  redirectUrl?: string | null
  /** token Snap — dipakai `snap.js` untuk menggambar instruksi bayar */
  token?: string | null
  /** konfigurasi `snap.js` dari server (client key + URL skrip sesuai mode) */
  snap?: { clientKey: string; scriptUrl: string } | null
}

type CardState = PaymentState | 'checking'

/** sisa waktu mm:ss */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/* ── SNAP DI DALAM HALAMAN INI (bukan tab baru) ──────────────────────────────
   Keluhan pemilik produk: memilih QRIS lalu menekan "Bayar" membuka halaman
   Midtrans di TAB BARU, dan di sana user harus memilih metode LAGI. Dua
   langkah tambahan untuk satu niat yang sudah jelas.

   `snap.js` bisa menggambar halaman pembayarannya langsung di elemen halaman
   kita — tetapi lewat API `snap.embed(token, { embedId })`, BUKAN
   `snap.pay()`. `snap.pay()` hanya menerima opsi popup; menyelipkan `embedId`
   di sana ditolak oleh skripnya sendiri (`Unsupported option embedId`), dan
   itulah sebabnya kartu ini dulu selalu berakhir dengan pesan "instruksi bayar
   tidak bisa ditampilkan" + tautan tab baru — di localhost MAUPUN produksi.
   Jadi: satu klik → instruksi QRIS/VA muncul di kartu ini juga. Metode sudah
   terkunci dari server (`enabled_payments`, lihat `snapEnabledPayments`), jadi
   tidak ada pemilihan kedua. `redirectUrl` tetap disediakan sebagai jalan
   keluar kalau iframe diblokir (mode privat/kebijakan jaringan kantor). */
const SNAP_EMBED_ID = 'catetind-snap-embed'
const SNAP_SCRIPT_ID = 'catetind-snap-script'

interface SnapGlobal {
  /** gambar halaman pembayaran DI DALAM elemen ber-`embedId` (mode embedded) */
  embed: (token: string, options: Record<string, unknown>) => void
  /** tutup halaman yang sedang tampil → state kembali `initialized` */
  hide: () => void
}

/* `snap.embed()` menolak dipanggil selagi halaman sebelumnya masih tampil
   ("Invalid state transition from PopupInView"), sedangkan kartu ini dipasang
   ulang setiap kali user menekan "Ganti metode" lalu "Bayar sekarang". Token
   yang sedang terpasang karena itu dicatat di tingkat MODUL: sebelum
   menggambar yang baru, yang lama ditutup dulu. */
let embeddedSnapToken: string | null = null

/** gambar halaman pembayaran Snap di dalam kartu (menggantikan yang lama) */
function embedSnapInCard(snap: SnapGlobal, token: string, options: Record<string, unknown>) {
  if (embeddedSnapToken !== null) {
    try {
      snap.hide()
    } catch {
      /* state-nya sudah bersih; `embed` di bawah yang menentukan hasilnya */
    }
    embeddedSnapToken = null
  }
  snap.embed(token, options)
  embeddedSnapToken = token
}

function snapGlobal(): SnapGlobal | null {
  if (typeof window === 'undefined') return null
  const holder = window as unknown as { snap?: SnapGlobal }
  return holder.snap ?? null
}

/** muat `snap.js` sekali per halaman; `false` = skrip tidak bisa dipakai */
function loadSnapScript(scriptUrl: string, clientKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (snapGlobal()) return resolve(true)

    const existing = document.getElementById(SNAP_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(snapGlobal())))
      existing.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.id = SNAP_SCRIPT_ID
    script.src = scriptUrl
    /* client key memang publik (dipakai snap.js); server key TIDAK pernah ke sini */
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    script.onload = () => resolve(Boolean(snapGlobal()))
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
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
        <p className="text-[11.5px] font-medium tracking-[0.14em] text-forest-muted uppercase">{label}</p>
        <p
          className={`mt-1 truncate font-display font-semibold tabular-nums text-forest ${
            large ? 'text-[20px] landing-tab:text-[22px]' : 'text-[17px]'
          }`}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-forest px-3.5 text-[13px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none"
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
  /* Halaman pembayaran Snap (kalau ada). Sejak revisi ini ia DI-EMBED di kartu;
     `redirectUrl` cuma jalan keluar kalau iframe diblokir. Status tetap dibaca
     dari server, jadi kartu ini tidak pernah "mengarang lunas". */
  const snapRedirect = invoice.redirectUrl ?? null
  const snapToken = invoice.token ?? null
  const snapScriptUrl = invoice.snap?.scriptUrl ?? null
  const snapClientKey = invoice.snap?.clientKey ?? null
  const snapEmbed = Boolean(snapToken && snapScriptUrl && snapClientKey)
  const [embedState, setEmbedState] = useState<'idle' | 'loading' | 'ready' | 'blocked'>('idle')

  /* Muat `snap.js` lalu gambar halaman pembayarannya di elemen `SNAP_EMBED_ID`.
     Kalau skripnya tidak bisa dimuat (diblokir), kartu memberi tahu apa adanya
     dan menyisakan tautan "buka di tab baru" — bukan layar buntu. */
  useEffect(() => {
    if (dead || settled) return
    if (!snapToken || !snapScriptUrl || !snapClientKey) return
    let cancelled = false
    setEmbedState('loading')

    void (async () => {
      const loaded = await loadSnapScript(snapScriptUrl, snapClientKey)
      if (cancelled) return
      const snap = snapGlobal()
      if (!loaded || !snap) {
        setEmbedState('blocked')
        return
      }
      try {
        embedSnapInCard(snap, snapToken, {
          embedId: SNAP_EMBED_ID,
          /* ketiga callback hanya memicu baca status ke server; keputusan
             "lunas" tetap milik server, bukan milik Snap di browser */
          onSuccess: () => void check(),
          onPending: () => void check(),
          onError: () => void check(),
          onClose: () => void check(),
        })
        if (!cancelled) setEmbedState('ready')
      } catch {
        if (!cancelled) setEmbedState('blocked')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dead, settled, snapToken, snapScriptUrl, snapClientKey, check])

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

  /**
   * QRIS = SATU LAYAR, TANPA INFORMASI DOBEL.
   *
   * Kalau tagihannya QRIS (dan iframe Snap tersedia), layar ini MENGGANTIKAN
   * kartu pembayaran — bukan ditambahkan di atasnya. Alasannya keluhan pemilik
   * produk: satu halaman menampilkan nominal dua kali, status dua kali, dua
   * tombol keluar, plus nomor order yang tidak dipakai siapa pun.
   *
   * Yang TIDAK dirender sama sekali di jalur ini (semuanya sudah ada di halaman
   * QR milik provider, atau memang tidak perlu): judul kartu, pill status,
   * label "Total", "Menunggu pembayaran selesai", "Ganti metode", "Cek status",
   * "Perbesar QR", "Scan dari aplikasi apa pun", dan nomor order. Status tetap
   * dicek otomatis tiap ±4 detik oleh efek polling di atas — jadi tombol "Cek
   * status" memang tidak dibutuhkan.
   */
  const qrisStage = live && snapEmbed && invoice.method === 'qris'
  const switchRef = useRef(onSwitchMethod)
  useEffect(() => {
    switchRef.current = onSwitchMethod
  }, [onSwitchMethod])
  useEffect(() => {
    if (!qrisStage) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') switchRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [qrisStage])

  if (qrisStage) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={PAY_CARD_COPY.qrisFullAria}
        className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-canvas p-4 landing:p-6"
      >
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-3 pb-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium tracking-[0.16em] text-forest-muted uppercase">
              {methodCopy.label}
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-forest">
                {formatIDR(invoice.amount)}
              </span>
              {remaining !== null && (
                <span className="text-[13px] font-medium tabular-nums text-forest-muted">
                  {formatRemaining(remaining)}
                </span>
              )}
            </p>
          </div>
          {/* satu-satunya tombol: kembali ke pilihan metode (tagihannya tetap hidup) */}
          <button
            type="button"
            onClick={onSwitchMethod}
            aria-label={PAY_CARD_COPY.qrisFullClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-forest ring-1 ring-soil/15 transition-colors duration-200 hover:bg-sage/60 motion-reduce:transition-none"
          >
            <X className="size-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>

        {/* QR dari provider — satu-satunya isi layar */}
        <div
          id={SNAP_EMBED_ID}
          className="mx-auto min-h-[480px] w-full max-w-[720px] flex-1 overflow-hidden rounded-[20px] bg-canvas ring-1 ring-soil/12"
        />

        {embedState === 'loading' && (
          <p
            className="mx-auto mt-3 max-w-[720px] text-center text-[13px] text-forest-muted"
            role="status"
          >
            {PAY_CARD_COPY.snapLoading}
          </p>
        )}

        {/* iframe diblokir = satu-satunya keadaan yang butuh jalan keluar */}
        {embedState === 'blocked' && (
          <div className="mx-auto mt-3 w-full max-w-[720px] text-center">
            <p className="text-[12.5px] leading-relaxed text-forest-muted">
              {PAY_CARD_COPY.snapBlocked}
            </p>
            {snapRedirect && (
              <a
                href={snapRedirect}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-[13px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none"
              >
                <ExternalLink className="size-3.5" strokeWidth={2.4} aria-hidden />
                {PAY_CARD_COPY.snapCta}
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="rounded-[24px] bg-cream p-5 shadow-landing-hairline ring-1 ring-soil/12 landing:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14.5px] font-medium text-forest">{methodCopy.label}</p>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1 ${statusTone}`}
        >
          <StatusIcon className="size-3.5" strokeWidth={2.4} aria-hidden />
          {statusLabel}
        </span>
      </div>

      {/* nominal + hitungan mundur dalam satu baris (hemat teks, mata langsung ke angka) */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-soil/12 pt-3.5">
        <span className="text-[13.5px] text-forest-muted">{PAY_CARD_COPY.totalLabel}</span>
        <span className="flex items-baseline gap-3">
          {live && remaining !== null && (
            <span className="font-medium tabular-nums text-forest-muted">
              {formatRemaining(remaining)}
            </span>
          )}
          {dead && <span className="font-medium text-plum">{PAY_CARD_COPY.timeUpLabel}</span>}
          <span className="font-display text-[20px] font-semibold tabular-nums text-forest landing-tab:text-[21px]">
            {formatIDR(invoice.amount)}
          </span>
        </span>
      </div>

      {sandbox && live && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-sage/60 px-4 py-3 text-[12.5px] leading-relaxed text-forest ring-1 ring-soil/15">
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

      {/* Cadangan: kalau konfigurasi `snap.js` belum ada di server (client key
          kosong), kartu tetap memberi JALAN keluar ke halaman pembayaran —
          bukan layar buntu tanpa tombol. */}
      {live && !snapEmbed && snapRedirect && (
        <div className="mt-4 rounded-2xl bg-canvas px-4 py-4 ring-1 ring-soil/12">
          <p className="text-[13.5px] font-medium text-forest">{PAY_CARD_COPY.snapTitle}</p>
          <div className="mt-3 flex flex-col gap-2 landing-tab:flex-row">
            <a
              href={snapRedirect}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none landing-tab:min-w-[220px]"
            >
              <ExternalLink className="size-4" strokeWidth={2.4} aria-hidden />
              {PAY_CARD_COPY.snapCta}
            </a>
            <button
              type="button"
              onClick={() => void check()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium text-forest-soft ring-1 ring-soil/16 transition-colors duration-200 hover:text-forest motion-reduce:transition-none"
            >
              <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden />
              {PAY_CARD_COPY.snapChecking}
            </button>
          </div>
        </div>
      )}


      {live && snapEmbed && invoice.method !== 'qris' && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-canvas ring-1 ring-soil/12">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soil/12 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-forest">{PAY_CARD_COPY.snapTitle}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-forest-muted">
                {PAY_CARD_COPY.snapBody}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void check()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-forest-soft ring-1 ring-soil/16 transition-colors duration-200 hover:text-forest motion-reduce:transition-none"
            >
              <RefreshCw className="size-3.5" strokeWidth={2.4} aria-hidden />
              {PAY_CARD_COPY.snapChecking}
            </button>
          </div>

          {embedState === 'loading' && (
            <p className="px-4 py-6 text-center text-[13px] text-forest-muted" role="status">
              {PAY_CARD_COPY.snapLoading}
            </p>
          )}
          {embedState === 'blocked' && (
            <p className="px-4 py-4 text-[12.5px] leading-relaxed text-forest-muted" role="status">
              {PAY_CARD_COPY.snapBlocked}
            </p>
          )}

          {/* di sinilah snap.js menggambar halaman pembayarannya. Tingginya
              sengaja besar: iframe Snap memakai `height:100%` (min 560px), jadi
              kotak yang pendek membuat instruksi VA/QR-nya menggulir sendiri. */}
          <div id={SNAP_EMBED_ID} className="h-[560px] w-full bg-cream landing:h-[680px]" />

          {snapRedirect && (
            <div className="border-t border-soil/12 px-4 py-3">
              <a
                href={snapRedirect}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-forest-muted underline decoration-soil/40 underline-offset-4 transition-colors hover:text-forest"
              >
                <ExternalLink className="size-3.5" strokeWidth={2.2} aria-hidden />
                {PAY_CARD_COPY.snapCta}
              </a>
            </div>
          )}
        </div>
      )}

      {live && instructions?.channel === 'qris' && (
        <div className="mx-auto mt-4 w-full max-w-[420px] rounded-[20px] bg-canvas p-4 ring-1 ring-soil/10 landing:p-5">
          <div className="mx-auto flex w-full max-w-[340px] flex-col items-center text-center">
            <p className="text-[13.5px] font-medium text-forest">{PAY_CARD_COPY.qrisScanTitle}</p>
            {/* <img> biasa: sumbernya URL gambar dari provider, bukan aset app */}
            <img
              src={instructions.qrImageUrl}
              alt={PAY_CARD_COPY.qrAlt}
              width={220}
              height={220}
              className="mt-4 size-[210px] rounded-2xl bg-cream object-contain p-3 ring-1 ring-soil/12 landing-tab:size-[220px]"
            />
            <p className="mt-3 text-[12.5px] leading-relaxed text-forest-muted">{methodCopy.hint}</p>
          </div>
        </div>
      )}

      {live && instructions?.channel === 'qris' && instructions.qrString && (
        <div className="mt-3">
          <p className="mb-2 text-[12.5px] text-forest-muted">{PAY_CARD_COPY.qrStringLabel}</p>
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
          <p className="mt-2.5 text-[12.5px] text-forest-muted">{PAY_CARD_COPY.vaHint}</p>
        </div>
      )}

      {live && instructions?.channel === 'ewallet' && (
        <div className="mt-4">
          <a
            href={instructions.deeplinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14.5px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none landing-tab:w-auto landing-tab:min-w-[260px]"
          >
            {PAY_CARD_COPY.ewalletCta}
            <ExternalLink className="size-4" strokeWidth={2.4} aria-hidden />
          </a>
          <p className="mt-2.5 text-[12.5px] text-forest-muted">{PAY_CARD_COPY.ewalletHint}</p>
        </div>
      )}

      {live && instructions?.channel === 'bill' && (
        <div className="mt-4">
          <div className="grid gap-2.5 landing-tab:grid-cols-2">
            <CopyField label={PAY_CARD_COPY.billerLabel} value={instructions.billerCode} />
            <CopyField label={PAY_CARD_COPY.billKeyLabel} value={instructions.billKey} large />
          </div>
          <p className="mt-2.5 text-[12.5px] text-forest-muted">{PAY_CARD_COPY.billHint}</p>
        </div>
      )}

      {live && !instructions && !snapRedirect && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-plum/10 px-3.5 py-3 text-[13px] leading-relaxed text-forest ring-1 ring-plum/20">
          <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
          {PAY_CARD_COPY.noInstructions}
        </p>
      )}

      {settled && (
        <p className="mt-4 rounded-2xl bg-mint/25 px-3.5 py-3 text-[13.5px] font-medium text-forest ring-1 ring-forest/10">
          {PAY_CARD_COPY.settledTitle} · <span className="font-normal">{PAY_CARD_COPY.settledBody}</span>
        </p>
      )}

      {dead && (
        <>
          <p className="mt-4 rounded-2xl bg-plum/10 px-3.5 py-3 text-[13.5px] leading-relaxed text-forest ring-1 ring-plum/20">
            <strong className="font-medium">
              {timeUp || state === 'expired'
                ? PAY_CARD_COPY.expiredTitle
                : PAY_CARD_COPY.failedTitle}
            </strong>{' '}
            <span className="font-normal text-forest-muted">
              {timeUp || state === 'expired'
                ? PAY_CARD_COPY.expiredBody
                : PAY_CARD_COPY.failedBody}
            </span>
          </p>
          <div className="mt-3 flex flex-col gap-2 landing-tab:flex-row">
            <button
              type="button"
              onClick={onNewInvoice}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-[14.5px] font-medium text-cream transition-colors duration-200 hover:bg-forest-soft motion-reduce:transition-none landing-tab:min-w-[200px]"
            >
              <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden />
              {PAY_CARD_COPY.newInvoiceLabel}
            </button>
            <button
              type="button"
              onClick={onSwitchMethod}
              className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[14.5px] font-medium text-forest-soft ring-1 ring-soil/16 transition-colors duration-200 hover:text-forest motion-reduce:transition-none"
            >
              {PAY_CARD_COPY.switchMethodLabel}
            </button>
          </div>
        </>
      )}

      {live && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-soil/12 pt-3.5">
          <span className="flex items-center gap-2 text-[12.5px] text-forest-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-forest/40" aria-hidden />
            {snapEmbed || snapRedirect ? PAY_CARD_COPY.snapWaiting : PAY_CARD_COPY.waitingTitle}
          </span>
          <button
            type="button"
            onClick={onSwitchMethod}
            className="text-[12.5px] font-medium text-forest-muted underline decoration-soil/40 underline-offset-4 transition-colors duration-200 hover:text-forest"
          >
            {PAY_CARD_COPY.switchMethodLabel}
          </button>
        </div>
      )}

      <p className="mt-3 text-[11.5px] tabular-nums text-forest-muted">
        {PAY_CARD_COPY.orderLabel} {invoice.orderId}
      </p>
    </section>
  )
}
