'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Mic, Plus, ScanLine, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import {
  AI_QUOTA_REMAINING,
  QUICK_REPLIES,
  type ChatMessage,
} from '@/lib/ai-chat'

/** avatar kecil AI — dipakai di header panel & di samping bubble AI */
function AIAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-forest text-mint',
        className ?? 'size-7',
      )}
    >
      <Sparkles className="size-[55%]" strokeWidth={2} />
    </span>
  )
}

/** E. satu bubble chat — user di kanan, AI di kiri dengan avatar */
function ChatBubble({ message }: { message: ChatMessage }) {
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
            ? 'bg-sage text-ink ring-mint/50'
            : 'bg-cream text-ink ring-soil/12',
        )}
      >
        {appreciation && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-forest-soft">
            <Sparkles className="size-3" />
            Apresiasi
          </span>
        )}
        <p>{message.content}</p>

        {/* D. Quick Action — tombol aksi inline di dalam bubble AI */}
        {message.action && (
          // TODO: Connect to budget creation API
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-xs font-semibold text-cream transition hover:bg-forest-soft active:scale-[0.98]"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            {message.action.label}
          </button>
        )}
      </div>
    </div>
  )
}

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
  const [open, setOpen] = useState(false)
  // A. titik notifikasi berdenyut — AI punya insight proaktif (mock: ada saat
  // load, mis. "spending spike terdeteksi"); hilang setelah panel dibuka
  const [hasInsight, setHasInsight] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, isTyping, input, setInput, sendMessage, startConversation } =
    useAIChat()

  // kunci scroll background selama panel terbuka — mobile saja; di desktop
  // panel mengambang 420x550 dan scroll halaman tetap diizinkan
  useBodyScrollLock(open, true)

  function openPanel() {
    setOpen(true)
    setHasInsight(false)
    startConversation() // seed sapaan proaktif hanya kalau history masih kosong
  }

  // auto-scroll ke pesan terbaru setiap ada perubahan
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping, open])

  // tutup panel dengan Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // bersihkan timer notice saat unmount
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    },
    [],
  )

  function showNotice(text: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    setNotice(text)
    noticeTimer.current = setTimeout(() => setNotice(null), 2500)
  }

  function handleVoice() {
    // TODO: Implement Web Speech API for voice-to-text, then parse with DeepSeek V3
    showNotice('Fitur voice input segera hadir...')
  }

  function handleScan() {
    // TODO: Trigger receipt OCR flow (GPT-4o-mini) from domain4_prd.md
    showNotice('Fitur scan struk segera hadir...')
  }

  /* Di onboarding, bubble AI disembunyikan: alurnya full-screen dan posisi
     bubble (bottom-24) bakal ketutupan CTA sticky onboarding. Guard ditaruh
     setelah semua hook supaya urutan hook tetap stabil. */
  if (pathname.startsWith('/app/onboarding')) return null

  return (
    <>
      {/* A. Floating bubble — hanya tampil saat panel tertutup.
          Mobile: di ATAS bottom nav (bottom-24, karena nav = bottom-5 + h-16).
          Desktop: pojok kanan bawah area konten (sidebar ada di kiri). */}
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label="Buka AI Coach"
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
            aria-label="AI Coach CatetInd"
            className="animate-in slide-in-from-bottom-6 fade-in fixed inset-x-0 bottom-0 z-[60] flex h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-2xl ring-1 ring-soil/12 duration-300 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:h-[550px] lg:w-[420px] lg:rounded-3xl"
          >
            {/* header — avatar, judul, fuel gauge kuota AI, tombol tutup */}
            <header className="flex items-center gap-3 border-b border-soil/12 bg-cream/85 px-4 py-3 backdrop-blur">
              <AIAvatar className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold tracking-tight text-ink">
                    AI Coach
                  </p>
                  <p className="shrink-0 text-[11px] font-medium text-ink/45">
                    {AI_QUOTA_REMAINING}% sisa
                  </p>
                </div>
                {/* AI Token Fuel Gauge (Domain 5C) — mint → amber → terracotta */}
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soil/[0.09]">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      AI_QUOTA_REMAINING <= 10
                        ? 'bg-[#b89191]'
                        : AI_QUOTA_REMAINING <= 30
                          ? 'bg-cantelope'
                          : 'bg-mint',
                    )}
                    style={{ width: `${AI_QUOTA_REMAINING}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup AI Coach"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-soil/[0.1] text-ink/60 transition-colors hover:bg-sage hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </header>

            {/* area pesan */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
            >
              {messages.map((m) => (
                <ChatBubble key={m.id} message={m} />
              ))}

              {isTyping && <TypingIndicator />}

              {/* C. quick-suggestion chips — hanya tampil tepat setelah sapaan */}
              {messages.length === 1 && !isTyping && (
                <div className="flex flex-wrap gap-2 pl-9 pt-1">
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
                sendMessage()
              }}
              className="relative border-t border-soil/12 bg-cream/85 p-3 backdrop-blur"
              style={{
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
              }}
            >
              {/* H. placeholder overlay untuk shortcut voice/scan */}
              {notice && (
                <div
                  role="status"
                  className="animate-in fade-in slide-in-from-bottom-1 absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-cream shadow-lg duration-200"
                >
                  {notice}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanya apa aja soal keuanganmu..."
                  aria-label="Ketik pesan untuk AI Coach"
                  className="h-10 min-w-0 flex-1 rounded-full bg-soil/[0.1] px-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-forest/20"
                />
                <button
                  type="button"
                  onClick={handleVoice}
                  aria-label="Voice input"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink/60 ring-1 ring-soil/12 transition-colors hover:bg-sage hover:text-ink"
                >
                  <Mic className="size-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={handleScan}
                  aria-label="Scan struk"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink/60 ring-1 ring-soil/12 transition-colors hover:bg-sage hover:text-ink"
                >
                  <ScanLine className="size-[18px]" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  aria-label="Kirim pesan"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest text-cream transition-all hover:bg-forest-soft active:scale-95 disabled:opacity-35 disabled:hover:bg-forest"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </>
  )
}
