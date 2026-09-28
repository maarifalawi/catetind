'use client'

import Link from 'next/link'
import { Check, Info, Mic, ScanLine, Sparkles, X } from 'lucide-react'
import { RupiahField } from './budget-sheet'
import { AIAvatar } from './ai-avatar'
import { cn } from '@/lib/utils'
import { AI_CAPTURE_COPY } from '@/lib/ai-chat'
import {
  TRANSACTION_CATEGORY_OPTIONS,
  TRANSACTION_INPUT_COPY,
  TRANSACTION_TYPE_LABEL,
  TRANSACTION_WALLET_OPTIONS,
} from '@/lib/data/history'
import {
  LOW_CONFIDENCE_THRESHOLD,
  type ExtractedField,
  type TransactionDraftForm,
} from '@/lib/transaction-ai'
import type { CapturePhase, VoiceSupport } from '@/hooks/use-transaction-capture'
import type { TransactionType } from '@/lib/types'

/* ── Bubble alur voice & scan struk di dalam chat (prompt 20) ───────────────
   Satu komponen, empat wujud — semuanya memakai kerangka bubble AI yang sama
   supaya alur ini tetap terasa bagian dari percakapan, bukan panel asing:

     reading   → "Lagi baca struknya... ✨" (loading DI DALAM bubble, bukan
                 spinner layar penuh — user tetap bisa melihat konteks chat)
     listening → gelombang suara + transkrip hidup + tombol Selesai
     confirm   → SEMUA field bisa diedit (PRD 409), ditandai amber per field
                 yang keyakinannya rendah (PRD A11), micro-copy PRD 550
     problem   → penjelasan + jalan keluar; tidak pernah menyebut istilah mesin

   Yang tidak dilakukan komponen ini: menyimpan apa pun. Menekan "Catat ✓" cuma
   memanggil `onConfirm` — hook yang memutuskan. */

/** tinggi tiap bar gelombang suara (px) — versi ramping untuk lebar bubble chat */
const VOICE_WAVE = [8, 16, 24, 14, 20, 12]

/** kontrol kecil di dalam bubble — senada dengan field mode edit engine */
const CAPTURE_CONTROL =
  'w-full rounded-xl bg-soil/[0.09] px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none ring-1 ring-transparent transition-all focus:bg-cream focus:ring-forest/15'

/**
 * Urutan pil tipe — sama dengan mesin input manual (Pengeluaran default).
 *
 * PAKET 55: `transfer` DIHAPUS dari daftar. Parser suara memang bisa MENDENGAR
 * kata "transfer" (`lib/transaction-ai.ts`) — tapi yang bisa dilakukan kartu ini
 * cuma mencatat satu sisi uang, karena tidak ada tempat menanyakan dompet tujuan.
 * Baris `transfer` satu sisi = uang keluar dari dompet dan tidak mendarat di
 * mana pun (temuan uji pemakaian 28 Sep 2026). Karena itu tipe itu tidak
 * ditawarkan di sini; kalau parser mendengarnya, kartu konfirmasi MENGATAKAN
 * kenapa dan mengarahkan user ke alur Pindah Dana (lihat `transferHint`).
 */
const TYPE_ORDER: TransactionType[] = ['expense', 'income', 'saving']

/** kerangka bubble: avatar AI + kartu selebar area pesan (form butuh ruang) */
function CaptureShell({
  children,
  label,
}: {
  children: React.ReactNode
  /** aria-live untuk state yang berubah sendiri (membaca / mendengar) */
  label?: string
}) {
  return (
    <div className="flex items-start gap-2" role="status" aria-live="polite" aria-label={label}>
      <AIAvatar className="mt-0.5 size-7" />
      <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md bg-cream px-3.5 py-3 text-sm leading-relaxed text-ink shadow-sm ring-1 ring-soil/12">
        {children}
      </div>
    </div>
  )
}

/**
 * Satu field di kartu konfirmasi. Saat keyakinan AI rendah, field-nya dibungkus
 * sorotan amber tipis + satu kalimat jujur di bawahnya (PRD A11) — bukan ikon
 * peringatan merah, karena ini ajakan memeriksa, bukan kesalahan user.
 */
function CaptureField({
  label,
  flagged,
  children,
  className,
}: {
  label: string
  flagged: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-1.5 transition-colors',
        flagged && 'bg-hud-amber/[0.14] ring-1 ring-hud-amber/45',
        className,
      )}
    >
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-ink/45">
        {label}
      </span>
      {children}
      {flagged && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-ink/60">
          <Info className="mt-px size-3 shrink-0" strokeWidth={2.4} aria-hidden />
          {AI_CAPTURE_COPY.lowFieldHint}
        </p>
      )}
    </div>
  )
}

/** pil pilih-satu tipe transaksi — hemat ruang (paket 55: tiga tipe uang) */
function TypePills({
  value,
  onChange,
}: {
  value: TransactionType
  onChange: (type: TransactionType) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {TYPE_ORDER.map((type) => {
        const active = type === value
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            aria-pressed={active}
            className={cn(
              'rounded-xl px-1 py-2 text-[10.5px] font-semibold leading-tight transition-all active:scale-[0.97]',
              active
                ? 'bg-forest text-cream ring-1 ring-forest'
                : 'bg-soil/[0.09] text-ink/50 hover:bg-soil/[0.12]',
            )}
          >
            {TRANSACTION_TYPE_LABEL[type]}
          </button>
        )
      })}
    </div>
  )
}

/* ── wujud 1: AI lagi membaca struk ─────────────────────────────────────────── */
function ReadingBubble() {
  return (
    <CaptureShell label={AI_CAPTURE_COPY.readingTitle}>
      <div className="flex items-center gap-3">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <ScanLine className="size-5" strokeWidth={2} aria-hidden />
          {/* denyut halus — dimatikan otomatis saat `prefers-reduced-motion` */}
          <span aria-hidden className="ai-scan-pulse absolute inset-0 rounded-full bg-mint/40" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <Sparkles className="size-3.5 text-forest" strokeWidth={2.4} aria-hidden />
            {AI_CAPTURE_COPY.readingTitle}
          </span>
          <span className="mt-0.5 block text-[11.5px] text-ink/50">
            {AI_CAPTURE_COPY.readingHint}
          </span>
        </span>
      </div>
    </CaptureShell>
  )
}

/* ── wujud 2: AI lagi mendengar (transkrip tampil SEBELUM diproses) ─────────── */
function ListeningBubble({
  liveTranscript,
  onFinish,
}: {
  liveTranscript: string
  onFinish: () => void
}) {
  return (
    <CaptureShell label={AI_CAPTURE_COPY.listeningTitle}>
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-hud-terracotta/15 text-hud-terracotta">
          <Mic className="size-4" strokeWidth={2.1} aria-hidden />
          <span aria-hidden className="ai-scan-pulse absolute inset-0 rounded-full bg-hud-amber/30" />
        </span>
        <span className="flex h-7 items-center gap-1" aria-hidden>
          {VOICE_WAVE.map((height, index) => (
            <span
              key={index}
              className="sound-wave-bar w-1 rounded-full bg-hud-amber"
              style={{ height, animationDelay: `${index * 90}ms` }}
            />
          ))}
        </span>
        <span className="text-[12.5px] font-bold text-ink">{AI_CAPTURE_COPY.listeningTitle}</span>
      </div>

      {/* transkrip hidup: apa yang benar-benar didengar mesin STT, tampil
          SEBELUM diproses (PRD 516) — bukan ringkasan bikinan AI */}
      <p
        className={cn(
          'mt-2.5 rounded-xl bg-soil/[0.07] px-3 py-2 text-[12.5px] leading-relaxed',
          liveTranscript ? 'text-ink' : 'text-ink/40',
        )}
      >
        {liveTranscript || AI_CAPTURE_COPY.listeningPlaceholder}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onFinish}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-forest text-[12.5px] font-bold text-cream transition-all hover:bg-forest-soft active:scale-[0.98]"
        >
          <Check className="size-4" strokeWidth={2.6} aria-hidden />
          {AI_CAPTURE_COPY.finish}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-ink/45">{AI_CAPTURE_COPY.listeningHint}</p>
    </CaptureShell>
  )
}

/* ── wujud 3: kartu konfirmasi — semua field bisa diedit (PRD 409/518) ────────
   Micro-copy PRD 550 dibuka di atas form: "AI udah bantu catat. Cek dulu ya,
   udah pas belum datanya?" — kalimat kolaboratif, bukan "tersimpan!" yang
   mengunci keputusan sebelum user melihatnya. */
function ConfirmBubble({
  draft,
  formError,
  onDraftChange,
  onConfirm,
  onCancel,
}: {
  draft: TransactionDraftForm
  formError: string | null
  onDraftChange: (patch: Partial<TransactionDraftForm>, touched?: ExtractedField) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const flagged = (field: ExtractedField) => draft.lowFields.includes(field)
  const title =
    draft.source === 'receipt'
      ? AI_CAPTURE_COPY.confirmReceiptTitle
      : AI_CAPTURE_COPY.confirmVoiceTitle

  return (
    <CaptureShell>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-forest-soft">
        <Sparkles className="size-3.5" strokeWidth={2.4} aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink/70">
        {AI_CAPTURE_COPY.confirmIntro}
      </p>

      {/* PRD A11: confidence < 0.5 → AI mengaku belum yakin, user tetap bisa simpan */}
      {draft.confidence < LOW_CONFIDENCE_THRESHOLD && (
        <p className="mt-2 rounded-xl bg-hud-amber/[0.14] px-2.5 py-2 text-[11.5px] font-medium leading-relaxed text-ink ring-1 ring-hud-amber/40">
          {AI_CAPTURE_COPY.lowConfidenceAlarm}
        </p>
      )}

      {/* jejak jujur untuk voice: persis apa yang didengar mesin STT */}
      {draft.transcript && (
        <div className="mt-2 rounded-xl bg-soil/[0.07] px-3 py-2">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            {AI_CAPTURE_COPY.transcriptLabel}
          </span>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink/70">“{draft.transcript}”</p>
        </div>
      )}

      <div className="mt-3 space-y-2">
        <CaptureField label={AI_CAPTURE_COPY.fieldLabels.type} flagged={false}>
          <TypePills value={draft.type} onChange={(type) => onDraftChange({ type })} />
        </CaptureField>

        {/* ── AI MENDENGAR “PINDAH DANA” (paket 55) ──────────────────────────
            Parser suara memang mengenali kata transfer, tapi jalur ini tidak
            bisa mencatatnya dengan benar: pindah dana butuh dompet TUJUAN, dan
            kartu konfirmasi ini tidak punya tempat menanyakannya. Catatan
            sepihak seperti itu membuat saldo dompet berbeda dari cerita — jadi
            yang ditampilkan bukan form palsu, tapi arahan ke alur yang benar
            (PRD 2A.6: satu aksi, satu pintu). Tombol "Catat" pun ditahan oleh
            `confirmCapture()` dengan pesan yang sama. */}
        {draft.type === 'transfer' && (
          <div className="rounded-xl bg-hud-amber/[0.14] px-2.5 py-2 ring-1 ring-hud-amber/40">
            <p className="text-[11.5px] font-medium leading-relaxed text-ink">
              {AI_CAPTURE_COPY.needTransferFlow}
            </p>
            <Link
              href="/wallet"
              className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-forest underline decoration-dotted underline-offset-4"
            >
              {AI_CAPTURE_COPY.transferFlowCta}
            </Link>
          </div>
        )}

        <CaptureField label={AI_CAPTURE_COPY.fieldLabels.name} flagged={flagged('name')}>
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ name: event.target.value }, 'name')}
            aria-label={AI_CAPTURE_COPY.fieldLabels.name}
            placeholder={AI_CAPTURE_COPY.untitled}
            className={CAPTURE_CONTROL}
          />
        </CaptureField>

        <CaptureField label={AI_CAPTURE_COPY.fieldLabels.amount} flagged={flagged('amount')}>
          <RupiahField
            digits={draft.amountDigits}
            onDigitsChange={(digits) => onDraftChange({ amountDigits: digits }, 'amount')}
            placeholder="0"
          />
        </CaptureField>

        <CaptureField label={AI_CAPTURE_COPY.fieldLabels.date} flagged={flagged('date')}>
          <input
            type="date"
            value={draft.date}
            onChange={(event) => onDraftChange({ date: event.target.value }, 'date')}
            aria-label={AI_CAPTURE_COPY.fieldLabels.date}
            className={CAPTURE_CONTROL}
          />
        </CaptureField>

        <div className="grid grid-cols-2 gap-2">
          <CaptureField label={AI_CAPTURE_COPY.fieldLabels.category} flagged={flagged('category')}>
            <select
              value={draft.category}
              onChange={(event) => onDraftChange({ category: event.target.value }, 'category')}
              aria-label={AI_CAPTURE_COPY.fieldLabels.category}
              className={CAPTURE_CONTROL}
            >
              {/* PAKET 54: field ini bisa KOSONG dengan sengaja — saat user
                  mematikan "Kategorisasi Otomatis oleh AI". Tanpa opsi kosong
                  ini, `<select>` akan MENAMPILKAN "Makanan" sementara nilainya
                  '', dan user diberi tahu kategori yang tidak akan tersimpan.
                  Kategori tetap harus dipilih user sebelum "Catat ✓". */}
              <option value="" disabled>
                {TRANSACTION_INPUT_COPY.categoryPlaceholder}
              </option>
              {TRANSACTION_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </CaptureField>

          <CaptureField label={AI_CAPTURE_COPY.fieldLabels.wallet} flagged={flagged('wallet')}>
            <select
              value={draft.wallet}
              onChange={(event) => onDraftChange({ wallet: event.target.value }, 'wallet')}
              aria-label={AI_CAPTURE_COPY.fieldLabels.wallet}
              className={CAPTURE_CONTROL}
            >
              {TRANSACTION_WALLET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </CaptureField>
        </div>
      </div>

      {/* guard lembut: nominal wajib — catatan nol rupiah tidak berarti apa-apa */}
      {formError && (
        <p role="alert" className="mt-2 text-[11.5px] font-semibold text-hud-terracotta">
          {formError}
        </p>
      )}

      {/* aksi primer di zona ibu jari: selebar bubble, selalu di bawah form */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-soil/[0.09] px-3.5 text-[12.5px] font-semibold text-ink/70 transition-colors hover:bg-soil/[0.13] active:scale-[0.98]"
        >
          <X className="size-3.5" strokeWidth={2.4} aria-hidden />
          {AI_CAPTURE_COPY.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-forest text-[13px] font-bold text-cream shadow-[0_14px_28px_-16px_rgba(69,89,78,0.7)] transition-all hover:bg-forest-soft active:scale-[0.98]"
        >
          {AI_CAPTURE_COPY.save}
        </button>
      </div>
    </CaptureShell>
  )
}

/* ── wujud 4: alur tidak bisa jalan / gagal ─────────────────────────────────
   Aturan prompt 20: "jangan ada tombol mati tanpa penjelasan". Jadi setiap
   kegagalan (perangkat tanpa Speech API, izin mikrofon ditolak, tidak ada
   suara, mesin STT putus) berakhir di bubble ini: penjelasan + jalan keluar
   "ketik aja" + tombol coba lagi kalau memang masih mungkin dicoba. Tidak ada
   kode error mentah yang bocor ke user. */
function ProblemBubble({
  problem,
  canRetry,
  onRetry,
  onFallback,
}: {
  problem: string
  canRetry: boolean
  onRetry: () => void
  onFallback: () => void
}) {
  return (
    <CaptureShell label={problem}>
      <div className="flex items-start gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
          <Info className="size-4" strokeWidth={2.2} aria-hidden />
        </span>
        <p className="min-w-0 text-[12.5px] leading-relaxed text-ink/75">{problem}</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex h-10 items-center justify-center rounded-xl bg-soil/[0.09] px-3.5 text-[12px] font-semibold text-ink/70 transition-colors hover:bg-soil/[0.13] active:scale-[0.98]"
          >
            {AI_CAPTURE_COPY.problemRetry}
          </button>
        )}
        <button
          type="button"
          onClick={onFallback}
          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-forest text-[12px] font-bold text-cream transition-all hover:bg-forest-soft active:scale-[0.98]"
        >
          {AI_CAPTURE_COPY.problemFallback}
        </button>
      </div>
    </CaptureShell>
  )
}

/**
 * Bubble alur voice/scan struk. Widget cukup menyerahkan state dari
 * `useTransactionCapture` dan menerima aksi user — tidak ada logika di sini.
 */
export function AICaptureBubble({
  phase,
  draft,
  liveTranscript,
  problem,
  formError,
  voiceSupport,
  onDraftChange,
  onConfirm,
  onCancel,
  onFinishVoice,
  onRetryVoice,
}: {
  phase: CapturePhase
  draft: TransactionDraftForm | null
  liveTranscript: string
  problem: string | null
  formError: string | null
  voiceSupport: VoiceSupport
  onDraftChange: (patch: Partial<TransactionDraftForm>, touched?: ExtractedField) => void
  onConfirm: () => void
  /** batal / tutup alur tanpa menyimpan */
  onCancel: () => void
  onFinishVoice: () => void
  onRetryVoice: () => void
}) {
  if (phase === 'reading') return <ReadingBubble />
  if (phase === 'listening') {
    return <ListeningBubble liveTranscript={liveTranscript} onFinish={onFinishVoice} />
  }
  if (phase === 'problem') {
    return (
      <ProblemBubble
        problem={problem ?? AI_CAPTURE_COPY.voiceFailed}
        /* tombol coba-lagi hanya muncul kalau perangkatnya memang punya STT */
        canRetry={voiceSupport === 'yes'}
        onRetry={onRetryVoice}
        onFallback={onCancel}
      />
    )
  }
  if (phase === 'confirm' && draft) {
    return (
      <ConfirmBubble
        draft={draft}
        formError={formError}
        onDraftChange={onDraftChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
  }
  return null
}
