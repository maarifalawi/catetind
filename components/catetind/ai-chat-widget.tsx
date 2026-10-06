'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Check, Mic, Plus, ScanLine, Send, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useTransactionCapture } from '@/hooks/use-transaction-capture'
import { AICaptureBubble } from './ai-capture-bubble'
import { AIAvatar } from './ai-avatar'
import { usePrivacy } from './privacy-provider'
import { useSubscriptionGate } from './subscription-gate-provider'
import { SUBSCRIPTION_LOCK_COPY } from '@/lib/data/renewal'
import {
  AI_CAPTURE_COPY,
  AI_CAPTURE_REPLY,
  AI_CHAT_COPY,
  AI_CONNECT_HREF,
  QUICK_REPLIES,
  type ChatMessage,
} from '@/lib/ai-chat'
import {
  buildRecordedReply,
  collectCoachSummary,
  formatRupiah,
  looksLikeTransactionIntent,
} from '@/lib/ai/coach-context'
import { AI_QUOTA_EXHAUSTED_COPY } from '@/lib/ai-quota'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { AI_CHAT_SEED_EVENT, type AIChatSeedDetail } from '@/lib/ai-chat-bus'

/** E. satu bubble chat — user di kanan, AI di kiri dengan avatar */
function ChatBubble({ message, onAction }: { message: ChatMessage; onAction: () => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-forest px-3.5 py-2.5 text-sm leading-relaxed text-cream shadow-sm">
          {message.content}
        </div>
      </div>
    )
  }

  const appreciation = message.kind === 'appreciation'

  return (
    <div className="flex items-start gap-2">
      <AIAvatar className="mt-0.5 size-7" />
      <div
        className={cn(
          'max-w-[82%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ring-1',
          // Domain 3C — pesan apresiasi dapat treatment visual beda (highlight olive
          // + prefix sparkle) supaya kebaca sebagai "pujian", bukan coaching biasa
          appreciation
            ? 'bg-sage text-forest ring-mint/50'
            : 'bg-cream text-forest ring-soil/12',
        )}
      >
        {appreciation && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-forest-soft">
            <Sparkles className="size-3" />
            {AI_CHAT_COPY.appreciationBadge}
          </span>
        )}
        {/* PAKET 44 — label kejujuran: balasan ini datang dari aturan lokal, bukan
            model. Selama provider LLM belum tersambung, bubble-nya wajib mengaku;
            kalau labelnya tidak ada, user membaca kalimat ini sebagai jawaban AI
            sungguhan (temuan uji pemakaian #5). */}
        {message.ruleBased && (
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-forest/35">
            {AI_CHAT_COPY.ruleBasedBadge}
          </span>
        )}
        <p>{message.content}</p>

        {/* D. Quick Action — tombol aksi inline di dalam bubble AI.
            Sejak prompt 20 tombolnya BENAR-BENAR jalan: `href` menuju route
            yang sudah ada (mis. /budget untuk bikin limit, /history untuk
            melihat catatan yang baru disimpan), dan panelnya ditutup supaya
            halaman tujuannya tidak ketutupan dialog. */}
        {message.action && (
          <Link
            href={message.action.href}
            onClick={onAction}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-xs font-medium text-cream transition hover:bg-forest-soft active:scale-[0.98]"
          >
            {message.action.kind === 'create' ? (
              <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
            ) : (
              <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
            )}
            {message.action.label}
          </Link>
        )}
      </div>
    </div>
  )
}

/** route yang menampilkan bubble AI Coach — HANYA Dashboard.
 *  Sejak landing pindah ke root `/`, dashboard tinggal di `/app`. */
const AI_CHAT_ROUTES: string[] = ['/app']

/** indikator "AI lagi ngetik" — tiga titik berdenyut berurutan */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <AIAvatar className="mt-0.5 size-7" />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-cream px-4 py-3.5 shadow-sm ring-1 ring-soil/12">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="ai-typing-dot size-1.5 rounded-full bg-forest/50"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Floating AI Chat — AI Coach CatetInd.
 * Di-mount sekali di root layout: bubble & state percakapan persisten
 * saat pindah halaman, reset saat full refresh (lihat useAIChat).
 */
export function AIChatWidget() {
  const pathname = usePathname()
  /* nominal di bubble/panel chat ikut toggle privasi global (tombol mata di
     header) — biar sensor layar berlaku juga untuk catatan yang baru dicatat */
  const { money } = usePrivacy()
  /* masa aktif habis → "Catat ✓" di kartu konfirmasi AI tidak boleh menyimpan.
     Percakapan & pemindaian struk tetap jalan (tidak ada yang dikunci diam-diam);
     yang ditahan hanya komitmen terakhirnya. */
  const { inputLocked } = useSubscriptionGate()
  const [open, setOpen] = useState(false)
  // A. titik notifikasi berdenyut — AI punya insight proaktif (mock: ada saat
  // load, mis. "spending spike terdeteksi"); hilang setelah panel dibuka
  const [hasInsight, setHasInsight] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  /** input file native untuk scan struk (kamera belakang di HP, galeri di web) */
  const fileRef = useRef<HTMLInputElement>(null)

  const { messages, isTyping, input, setInput, sendMessage, startConversation, appendMessage, modelConnected } =
    useAIChat()

  /**
   * Jejak user masuk ke percakapan sebagai pesan user biasa: nama file struk
   * yang dipilih, atau transkrip yang barusan didengar mesin STT. Jadi user bisa
   * melihat persis apa yang AI terima sebelum memutuskan menyimpan — bukan
   * kotak hitam.
   */
  const echoToConversation = useCallback(
    (text: string) => {
      appendMessage({ role: 'user', kind: 'coaching', content: text })
    },
    [appendMessage],
  )

  /* Dua pintu masuk AI-conversational-first (prompt 20) — logikanya di hook:
     baca struk (mock OCR), dengar suara (Web Speech API), dan kartu konfirmasi
     yang wajib dilewati sebelum apa pun tersimpan. */
  const capture = useTransactionCapture({ onUserEcho: echoToConversation })

  /* Kuota AI hidup (paket 42): gauge di header membaca angka ini, dan dua pintu
     yang butuh AI (voice & scan struk) dimatikan saat kuota benar-benar habis —
     dengan penjelasan, bukan tombol mati tanpa alasan. Percakapan & pencatatan
     manual tidak dikunci: itu alasan app ini ada. */
  const quota = useAiQuota()
  const quotaExhausted = quota.exhausted

  /* sementara draft menunggu keputusan user, dua pintu masuk ditutup: tidak ada
     gunanya membuka alur kedua di atas draft yang belum dijawab */
  const captureLocked = capture.phase === 'confirm' || capture.phase === 'problem'
  const voiceUnavailable = capture.voiceSupport === 'no'

  // kunci scroll background selama panel terbuka — mobile saja; di desktop
  // panel mengambang 420x550 dan scroll halaman tetap diizinkan
  useBodyScrollLock(open, true)

  function openPanel() {
    setOpen(true)
    setHasInsight(false)
    startConversation() // seed sapaan proaktif hanya kalau history masih kosong
  }

  /* Buka dari luar widget (prompt 19): panel "Review Pengeluaran Hari Ini" di
     /budget (dan CTA "Review Pengeluaran Hari Ini" di kartu Jatah Home) mengirim
     pertanyaan seed lewat bus event — lihat lib/ai-chat-bus.ts untuk alasan
     memilih bus, bukan menaikkan state chat ke provider. Yang terjadi di sini
     sama persis dengan user menekan bubble ✨ lalu mengetik pertanyaannya
     sendiri: panel terbuka, sapaan proaktif disemai kalau history masih kosong,
     lalu pertanyaannya terkirim sebagai pesan user. */
  useEffect(() => {
    function handleSeed(event: Event) {
      const seed = (event as CustomEvent<AIChatSeedDetail>).detail?.seed ?? ''
      setOpen(true)
      setHasInsight(false)
      startConversation()
      if (seed) sendMessage(seed)
    }

    window.addEventListener(AI_CHAT_SEED_EVENT, handleSeed)
    return () => window.removeEventListener(AI_CHAT_SEED_EVENT, handleSeed)
  }, [sendMessage, startConversation])

  // auto-scroll ke pesan terbaru setiap ada perubahan (termasuk bubble alur
  // voice/scan yang muncul & berganti wujud)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping, open, capture.phase])

  // tutup panel dengan Escape — draft yang sedang dikonfirmasi TIDAK dibuang
  // (state-nya milik hook di widget), jadi user bisa lanjut setelah membuka ulang
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  /* ── 📸 scan struk: file picker native, bukan kamera palsu di dalam UI ──── */
  function handleScanClick() {
    if (capture.phase === 'reading') {
      capture.cancelCapture() // tombol yang sama membatalkan baca struk
      return
    }
    fileRef.current?.click()
  }

  function handleReceiptChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    /* reset supaya memilih file yang SAMA dua kali tetap memicu onChange */
    event.target.value = ''
    if (!file) return
    capture.startReceiptScan(file)
  }

  /* ── 🎤 voice: tombol yang sama jadi "Selesai" saat sedang mendengar ────── */
  function handleVoiceClick() {
    if (capture.phase === 'listening') {
      capture.finishVoice()
      return
    }
    capture.startVoice()
  }

  /* ── "Catat ✓" di kartu konfirmasi — satu-satunya jalan menuju penyimpanan ─ */
  function handleConfirmCapture() {
    /* masa aktif habis: jangan simpan, tapi jangan buang draftnya juga — user
       bisa membaca kembali isiannya begitu masa aktifnya lanjut (task 23) */
    if (inputLocked) {
      toast(SUBSCRIPTION_LOCK_COPY.inputHint)
      return
    }
    try {
      const transaction = capture.confirmCapture()
      if (!transaction) return // masih ada yang kurang; kartunya sudah menjelaskan
      const amountLabel = money(transaction.amount) // hormati sensor layar
      /* ── BALASAN MENYEBUT ANGKA NYATA SESUDAHNYA (paket 65 · Tugas D) ────────
         Baris benar-benar sudah tertulis di sini, jadi AI boleh mengaku mencatat —
         DAN menyebut sisa jatah harian BARU dari `computeDailyHud()` (dibaca dari
         store), bukan angka lama. Kalau ringkasan gagal dibaca, jatuh ke kalimat
         tanpa angka supaya tidak mengarang. */
      let replyContent = AI_CAPTURE_COPY.saved(transaction.name, amountLabel)
      try {
        const remaining = formatRupiah(collectCoachSummary().remainingToday)
        replyContent = buildRecordedReply(transaction.name, amountLabel, remaining)
      } catch {
        /* biarkan kalimat tanpa angka */
      }
      appendMessage({
        role: 'ai',
        kind: 'coaching',
        content: replyContent,
        action: { label: AI_CAPTURE_REPLY.viewHistory, href: '/history' },
      })
      toast.success(AI_CAPTURE_COPY.savedToast.title, {
        description: AI_CAPTURE_COPY.savedToast.description(amountLabel),
      })
    } catch {
      /* Produksi: kegagalan `POST /api/transactions`. Draftnya sengaja TIDAK
         dibuang — user tidak boleh kehilangan isian hanya karena jaringan. */
      appendMessage({ role: 'ai', kind: 'coaching', content: AI_CAPTURE_COPY.saveFailed })
    }
  }

  /* ── KIRIM PESAN (paket 65 · Tugas D) ──────────────────────────────────────
     Kalau pesan user terdengar seperti UCAPAN TRANSAKSI ("gua habis makan 50k,
     catet ya"), kita TIDAK memanggil model: kita tampilkan KARTU KONFIRMASI —
     jalur yang sama dengan input suara/struk — karena AI tidak boleh mengaku
     mencatar sebelum barisnya benar-benar ditulis. Pesan biasa tetap ke model. */
  function handleSend() {
    const text = input.trim()
    if (!text || captureLocked) return
    if (looksLikeTransactionIntent(text)) {
      appendMessage({ role: 'user', kind: 'coaching', content: text })
      setInput('')
      capture.startChatDraft(text)
      return
    }
    sendMessage()
  }

  /* ── CAKUPAN TOMBOL AI (paket 64): KHUSUS DASHBOARD ─────────────────────────
     Permintaan produk: bubble AI Coach hanya boleh muncul di route Dashboard
     (`/`), tidak lagi mengambang di setiap halaman. Alasannya: tombol yang selalu
     ada di semua layar berhenti terasa seperti ajakan dan mulai terasa seperti
     gangguan — terutama di halaman publik (/login, /checkout, dokumen legal) dan
     di alur fokus (onboarding, /join, /share) yang memang harus lurus.
     Daftar ini SATU sumber kebenaran cakupannya; jangan menambah route di tempat
     lain. Guard ditaruh setelah semua hook supaya urutan hook tetap stabil. */
  if (!AI_CHAT_ROUTES.includes(pathname)) return null

  return (
    <>
      {/* A. Floating bubble — hanya tampil saat panel tertutup.
          Mobile: di ATAS bottom nav (bottom-24, karena nav = bottom-5 + h-16).
          Desktop: pojok kanan bawah area konten (sidebar ada di kiri). */}
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label={AI_CHAT_COPY.openLabel}
          className="animate-bubble-in fixed bottom-24 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-forest text-mint shadow-[0_18px_40px_-12px_rgba(69,89,78,0.45)] ring-1 ring-forest/20 transition-transform duration-150 hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8"
        >
          <Sparkles className="size-6" strokeWidth={2} />
          {hasInsight && (
            <span className="absolute -right-0.5 -top-0.5 flex size-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-80" />
              <span className="relative inline-flex size-3.5 rounded-full bg-mint ring-2 ring-cream" />
            </span>
          )}
        </button>
      )}

      {open && (
        <>
          {/* backdrop gelap — mobile saja; desktop panel mengambang tanpa dim */}
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="animate-in fade-in fixed inset-0 z-[55] bg-ink/40 duration-200 lg:hidden"
          />

          {/* B. Chat panel — mobile: overlay slide-up hampir full-screen;
              desktop: panel fixed ±420x550 di pojok kanan bawah */}
          <section
            role="dialog"
            aria-modal="true"
            aria-label={AI_CHAT_COPY.panelLabel}
            className="animate-in slide-in-from-bottom-6 fade-in fixed inset-x-0 bottom-0 z-[60] flex h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-2xl ring-1 ring-soil/12 duration-300 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:h-[550px] lg:w-[420px] lg:rounded-3xl"
          >
            {/* header — avatar, judul, fuel gauge kuota AI, tombol tutup */}
            <header className="flex items-center gap-3 border-b border-soil/12 bg-cream/85 px-4 py-3 backdrop-blur">
              <AIAvatar className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium tracking-tight text-forest">
                    {AI_CHAT_COPY.title}
                  </p>
                  <p className="shrink-0 text-[11px] font-medium text-forest/45">
                    {AI_CHAT_COPY.quota(quota.remainingPct)}
                  </p>
                </div>
                {/* AI Token Fuel Gauge (Domain 5C) — mint → amber → prem.
                    Ambangnya dibaca dari SISA kuota, sejalan dengan sidebar.
                    Angkanya HIDUP sejak paket 42: setiap pesan, scan struk, dan
                    input suara benar-benar mengurangi kuota yang tampil di sini. */}
                <div
                  role="progressbar"
                  aria-label={
                    quotaExhausted ? AI_QUOTA_EXHAUSTED_COPY.progressLabel : 'Sisa kuota AI'
                  }
                  aria-valuenow={quota.remainingPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-soil/[0.09]"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      quota.remainingPct <= 10
                        ? 'bg-plum'
                        : quota.remainingPct <= 30
                          ? 'bg-cantelope'
                          : 'bg-mint',
                    )}
                    style={{ width: `${quota.remainingPct}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={AI_CHAT_COPY.closeLabel}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-soil/[0.1] text-forest/60 transition-colors hover:bg-sage hover:text-forest"
              >
                <X className="size-4" />
              </button>
            </header>

            {/* ── STATUS AI (paket 44 · disesuaikan paket 63) ──────────────────
                Satu kalimat jujur, SEKALI, dan hanya saat memang benar: banner
                ini muncul HANYA saat server tak punya kunci AI (`modelConnected
                === false`). Begitu model menjawab, bannernya hilang — dulu ia
                selalu tampil, dan setelah AI tersambung kalimat "belum pakai
                model" jadi tidak benar. */}
            {modelConnected === false && (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-soil/12 bg-sage/25 px-4 py-2 text-[11px] leading-relaxed text-forest">
                <span>{AI_CHAT_COPY.notConnectedNote}</span>
                <Link
                  href={AI_CONNECT_HREF}
                  onClick={() => setOpen(false)}
                  title={AI_CHAT_COPY.connectHint}
                  className="font-medium underline underline-offset-2 hover:text-forest-soft"
                >
                  {AI_CHAT_COPY.connectLabel}
                </Link>
              </div>
            )}

            {/* area pesan */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
            >
              {messages.map((m) => (
                <ChatBubble key={m.id} message={m} onAction={() => setOpen(false)} />
              ))}

              {/* Alur voice & scan struk (prompt 20) — bubble-nya hidup di dalam
                  percakapan: baca struk → kartu konfirmasi yang bisa diedit →
                  catat, atau penjelasan jujur kalau perangkatnya tidak mendukung. */}
              <AICaptureBubble
                phase={capture.phase}
                draft={capture.draft}
                liveTranscript={capture.liveTranscript}
                problem={capture.problem}
                formError={capture.formError}
                voiceSupport={capture.voiceSupport}
                onDraftChange={capture.updateDraft}
                onConfirm={handleConfirmCapture}
                onCancel={capture.cancelCapture}
                onFinishVoice={capture.finishVoice}
                onRetryVoice={capture.retryCapture}
              />

              {isTyping && <TypingIndicator />}

              {/* C. quick-suggestion chips — hanya tampil tepat setelah sapaan
                  dan tidak saat alur voice/scan sedang berjalan */}
              {messages.length === 1 && !isTyping && !capture.busy && (
                <div
                  role="group"
                  aria-label={AI_CHAT_COPY.quickRepliesLabel}
                  className="flex flex-wrap gap-2 pl-9 pt-1"
                >
                  {QUICK_REPLIES.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => sendMessage(chip)}
                      className="rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-forest ring-1 ring-forest/15 transition hover:bg-sage active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                /* saat draft menunggu keputusan, pesan baru tidak dikirim supaya
                   urutan percakapan tidak membingungkan — alasannya tertulis di
                   atas composer, bukan diam-diam diabaikan */
                if (captureLocked) return
                handleSend()
              }}
              className="relative border-t border-soil/12 bg-cream/85 p-3 backdrop-blur"
              style={{
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
              }}
            >
              {/* pengingat lembut saat kartu konfirmasi masih menunggu jawaban */}
              {captureLocked && (
                <p role="status" className="mb-2 text-[11px] leading-relaxed text-forest/45">
                  {AI_CAPTURE_COPY.finishDraftFirst}
                </p>
              )}

              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={AI_CHAT_COPY.inputPlaceholder}
                  aria-label={AI_CHAT_COPY.inputLabel}
                  className="h-10 min-w-0 flex-1 rounded-full bg-soil/[0.1] px-4 text-sm text-forest outline-none placeholder:text-forest/35 focus:ring-2 focus:ring-forest/20"
                />
                <button
                  type="button"
                  onClick={handleVoiceClick}
                  disabled={isTyping || captureLocked || quotaExhausted || capture.phase === 'reading'}
                  aria-label={
                    capture.phase === 'listening'
                      ? AI_CAPTURE_COPY.voiceStopLabel
                      : AI_CAPTURE_COPY.voiceLabel
                  }
                  aria-describedby={
                    quotaExhausted
                      ? 'ai-quota-off'
                      : voiceUnavailable
                        ? 'ai-voice-fallback'
                        : undefined
                  }
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full ring-1 transition-colors active:scale-95 disabled:opacity-35',
                    capture.phase === 'listening'
                      ? 'bg-forest text-cream ring-forest hover:bg-forest-soft'
                      : 'bg-cream text-forest/60 ring-soil/12 hover:bg-sage hover:text-forest',
                    voiceUnavailable && 'text-forest/35',
                  )}
                >
                  {capture.phase === 'listening' ? (
                    <Check className="size-[18px]" strokeWidth={2.6} />
                  ) : (
                    <Mic className="size-[18px]" />
                  )}
                </button>

                {/* 📸 scan struk — membuka file picker native (kamera belakang di
                    HP lewat `capture="environment"`) */}
                <button
                  type="button"
                  onClick={handleScanClick}
                  disabled={isTyping || captureLocked || quotaExhausted}
                  aria-label={
                    capture.phase === 'reading' ? AI_CAPTURE_COPY.cancel : AI_CAPTURE_COPY.scanLabel
                  }
                  aria-describedby={quotaExhausted ? 'ai-quota-off' : undefined}
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full ring-1 transition-colors active:scale-95 disabled:opacity-35',
                    capture.phase === 'reading'
                      ? 'bg-forest text-cream ring-forest hover:bg-forest-soft'
                      : 'bg-cream text-forest/60 ring-soil/12 hover:bg-sage hover:text-forest',
                  )}
                >
                  {capture.phase === 'reading' ? (
                    <X className="size-[18px]" strokeWidth={2.4} />
                  ) : (
                    <ScanLine className="size-[18px]" />
                  )}
                </button>

                {/* input file native: kamera belakang di HP, galeri/file picker di web */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptChosen}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isTyping || captureLocked}
                  aria-label={AI_CHAT_COPY.sendLabel}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest text-cream transition-all hover:bg-forest-soft active:scale-95 disabled:opacity-35 disabled:hover:bg-forest"
                >
                  <Send className="size-4" />
                </button>
              </div>

              {/* jalan keluar di perangkat tanpa Speech API — selalu terlihat,
                  bukan cuma sesaat setelah tombolnya ditekan */}
              {voiceUnavailable && (
                <p id="ai-voice-fallback" className="mt-2 text-[11px] leading-relaxed text-forest/45">
                  {AI_CAPTURE_COPY.voiceUnsupported}
                </p>
              )}

              {/* KUOTA HABIS (paket 42): dua ikon di atas mati, dan alasannya
                  ditulis di sini — plus penegasan bahwa catat manual tetap jalan. */}
              {quotaExhausted && (
                <p id="ai-quota-off" className="mt-2 text-[11px] leading-relaxed text-forest/55">
                  {AI_QUOTA_EXHAUSTED_COPY.body}
                </p>
              )}
            </form>
          </section>
        </>
      )}
    </>
  )
}
