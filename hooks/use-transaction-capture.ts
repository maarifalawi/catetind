'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AI_CAPTURE_COPY } from '@/lib/ai-chat'
import type { HistoryTransaction } from '@/lib/data/history'
import { recordTransaction } from '@/lib/transaction-bus'
import {
  MOCK_RECEIPT_READ_MS,
  draftFormFrom,
  mockReceiptScan,
  parseSpokenTransaction,
  type ExtractedField,
  type TransactionDraftForm,
} from '@/lib/transaction-ai'

/* ── useTransactionCapture — mesin dua pintu masuk "AI-conversational-first" ──
   prompt 20: 📸 scan struk & 🎤 voice di dalam widget AI Coach.

   Yang diurus hook ini (bukan widget):
     1. membaca file struk → "AI" mengisi draft (mock, PRD 385–412);
     2. menjalankan Web Speech API `lang='id-ID'` (PRD A3 — tanpa layanan
        berbayar) dan menyimpan transkrip SEBELUM diproses (PRD 516);
     3. menyusun kartu konfirmasi yang semua fieldnya bisa diedit (PRD 409);
     4. mengaku jujur saat gagal: perangkat tanpa Speech API, izin mikrofon
        ditolak, tidak ada suara, mesin STT putus.

   Yang TIDAK dilakukannya: menyimpan tanpa konfirmasi user. `confirmCapture()`
   hanya jalan kalau user benar-benar menekan "Catat ✓".

   Widget-nya hidup di root layout (tidak unmount saat pindah halaman), jadi
   draft yang belum diputuskan tetap ada saat panel ditutup & dibuka lagi —
   sama seperti riwayat percakapan. Refresh halaman mengosongkannya. */

export type CapturePhase = 'idle' | 'reading' | 'listening' | 'confirm' | 'problem'

/** dukungan STT baru dipastikan SETELAH mount (SSR tidak punya `window`) */
export type VoiceSupport = 'unknown' | 'yes' | 'no'

/* ── Web Speech API — tipe minimum milik sendiri ────────────────────────────
   lib.dom TypeScript belum memuat `SpeechRecognition` (hanya *Alternative /
   *Result / *ResultList), jadi bentuk yang kita pakai dideklarasikan di sini.
   Ini murni tipe: tidak ada dependency baru dan tidak ada polyfill (A3: STT
   tetap jalan di browser user, zero server cost). */
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: { readonly transcript: string } | undefined
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: {
    readonly length: number
    [index: number]: SpeechRecognitionResultLike | undefined
  }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { readonly error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

/** `SpeechRecognition` atau `webkitSpeechRecognition` — null kalau tidak ada */
function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** kode error STT → copy yang menyebut jalan keluarnya, bukan istilah mesin */
function voiceProblemCopy(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return AI_CAPTURE_COPY.voiceDenied
    case 'no-speech':
      return AI_CAPTURE_COPY.voiceNoSpeech
    case 'audio-capture':
      return AI_CAPTURE_COPY.voiceNoMic
    case 'network':
      return AI_CAPTURE_COPY.voiceNetwork
    default:
      return AI_CAPTURE_COPY.voiceFailed
  }
}

export function useTransactionCapture({
  onUserEcho,
}: {
  /** dipanggil saat user mengirim sesuatu (foto / suara) supaya jejaknya muncul
   *  sebagai bubble user — percakapan jadi transparan: user bisa melihat persis
   *  apa yang AI terima */
  onUserEcho: (text: string) => void
}) {
  const [phase, setPhase] = useState<CapturePhase>('idle')
  const [draft, setDraft] = useState<TransactionDraftForm | null>(null)
  /** transkrip hidup selama mendengar — ditampilkan SEBELUM diproses */
  const [liveTranscript, setLiveTranscript] = useState('')
  /** copy penjelasan saat alur tidak bisa jalan / gagal */
  const [problem, setProblem] = useState<string | null>(null)
  /** galat validasi form konfirmasi (mis. nominal belum diisi) */
  const [formError, setFormError] = useState<string | null>(null)
  const [voiceSupport, setVoiceSupport] = useState<VoiceSupport>('unknown')

  const readTimer = useRef<number | null>(null)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  /** transkrip final yang sudah terkumpul (handler `onend` membacanya) */
  const transcriptRef = useRef('')

  /* dukungan Speech API baru dicek setelah mount: HTML server & render pertama
     client harus identik dulu (pola yang sama dengan pembacaan
     `prefers-reduced-motion` di repo ini) */
  useEffect(() => {
    setVoiceSupport(getSpeechRecognition() ? 'yes' : 'no')
  }, [])

  const clearReadTimer = useCallback(() => {
    if (readTimer.current !== null) {
      window.clearTimeout(readTimer.current)
      readTimer.current = null
    }
  }, [])

  /** lepas semua handler lalu matikan mesin STT — dipanggil di setiap transisi */
  const releaseVoice = useCallback(() => {
    const rec = recognition.current
    if (!rec) return
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      rec.abort()
    } catch {
      /* mesin sudah mati sendiri — tidak ada yang perlu dibereskan */
    }
    recognition.current = null
  }, [])

  /* bersihkan timer & mikrofon saat widget tak lagi terpasang */
  useEffect(
    () => () => {
      clearReadTimer()
      releaseVoice()
    },
    [clearReadTimer, releaseVoice],
  )

  /* ── 📸 SCAN STRUK ────────────────────────────────────────────────────────
     File dipilih lewat `<input type="file" accept="image/*"
     capture="environment">` (kamera belakang di HP, file picker di web) — alur
     native yang sama dengan engine input manual. Yang dibaca dari file hanya
     NAMANYA: mock "OCR" menurunkan merchant & keyakinan dari situ, lalu hasilnya
     masuk kartu konfirmasi. Produksi: filenya dikirim ke /api/ocr (GPT-4o-mini). */
  const startReceiptScan = useCallback(
    (file: File) => {
      releaseVoice()
      clearReadTimer()
      setDraft(null)
      setProblem(null)
      setFormError(null)
      setLiveTranscript('')
      setPhase('reading')
      onUserEcho(AI_CAPTURE_COPY.photoEcho(file.name))

      readTimer.current = window.setTimeout(() => {
        readTimer.current = null
        setDraft(draftFormFrom(mockReceiptScan(file.name)))
        setPhase('confirm')
      }, MOCK_RECEIPT_READ_MS)
    },
    [clearReadTimer, onUserEcho, releaseVoice],
  )

  /* ── 🎤 VOICE ─────────────────────────────────────────────────────────────
     STT terjadi di browser (PRD A3). Transkrip interim langsung ditampilkan,
     jadi user melihat apa yang didengar SEBELUM apa pun disimpan (PRD 516). */
  const startVoice = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) {
      /* tidak ada tombol mati tanpa penjelasan: alasan + jalan keluarnya */
      setProblem(AI_CAPTURE_COPY.voiceUnsupported)
      setPhase('problem')
      return
    }

    clearReadTimer()
    releaseVoice()
    transcriptRef.current = ''
    setDraft(null)
    setProblem(null)
    setFormError(null)
    setLiveTranscript('')
    setPhase('listening')

    const rec = new Ctor()
    rec.lang = 'id-ID'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

    /*
     * `onend` tetap menyala SETELAH `onerror`, dan sebagian browser bisa
     * memanggilnya dua kali. Satu penutup untuk sesi ini mencegah draft ganda
     * atau pesan ganda dari satu ucapan — plus memastikan tidak ada setState
     * dari mesin yang sudah lepas.
     */
    let settled = false
    const settle = () => {
      if (settled) return false
      settled = true
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      recognition.current = null
      return true
    }

    rec.onresult = (event) => {
      let finalText = transcriptRef.current
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (!result) continue
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) finalText = `${finalText} ${text}`.trim()
        else interim = `${interim} ${text}`.trim()
      }
      transcriptRef.current = finalText
      setLiveTranscript(`${finalText} ${interim}`.trim())
    }

    rec.onerror = (event) => {
      if (event.error === 'aborted') return // user sendiri yang menghentikan
      if (!settle()) return
      setProblem(voiceProblemCopy(event.error))
      setPhase('problem')
    }

    rec.onend = () => {
      if (!settle()) return
      /* Dua sebab `onend`: user menekan "Selesai", atau mesin berhenti sendiri
         setelah jeda. Dua-duanya diperlakukan sama — hasil yang sudah
         kedengeran langsung dirapikan; kalau memang belum ada apa-apa, bilang
         jujur daripada berpura-pura sibuk mendengar selamanya. */
      const transcript = transcriptRef.current.trim()
      if (!transcript) {
        setProblem(AI_CAPTURE_COPY.voiceNoSpeech)
        setPhase('problem')
        return
      }
      onUserEcho(transcript)
      setDraft(draftFormFrom(parseSpokenTransaction(transcript), transcript))
      setPhase('confirm')
    }

    recognition.current = rec
    try {
      rec.start()
    } catch {
      /* mis. izin masih menunggu atau mesin STT sedang dipakai proses lain */
      settle()
      setProblem(AI_CAPTURE_COPY.voiceFailed)
      setPhase('problem')
    }
  }, [clearReadTimer, onUserEcho, releaseVoice])

  /** tombol "Selesai" — hentikan mendengar, hasilnya diproses oleh `onend` */
  const finishVoice = useCallback(() => {
    try {
      recognition.current?.stop()
    } catch {
      /* sudah berhenti sendiri */
    }
  }, [])

  /* ── KARTU KONFIRMASI ────────────────────────────────────────────────────
     Semua perubahan dilakukan user, bukan AI. Field yang disentuh user langsung
     dicabut dari daftar "perlu dicek": tanda amber itu artinya "aku belum yakin",
     dan begitu user memutuskan nilainya, keraguan itu memang selesai. */
  const updateDraft = useCallback(
    (patch: Partial<TransactionDraftForm>, touched?: ExtractedField) => {
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              ...patch,
              lowFields: touched ? prev.lowFields.filter((field) => field !== touched) : prev.lowFields,
            }
          : prev,
      )
      setFormError(null)
    },
    [],
  )

  /** keluar dari alur tanpa menyimpan — tidak ada apa pun yang ditulis */
  const cancelCapture = useCallback(() => {
    clearReadTimer()
    releaseVoice()
    transcriptRef.current = ''
    setPhase('idle')
    setDraft(null)
    setProblem(null)
    setFormError(null)
    setLiveTranscript('')
  }, [clearReadTimer, releaseVoice])

  /**
   * Simpan hasil konfirmasi. HANYA di sini transaksi benar-benar ditulis —
   * dan hanya karena user menekan "Catat ✓" (prompt 20: dilarang menyimpan
   * tanpa konfirmasi). Nominal wajib > 0: tanpa angka, catatannya tidak berarti.
   *
   * @returns transaksi yang tercatat, atau null kalau masih ada yang kurang
   */
  const confirmCapture = useCallback((): HistoryTransaction | null => {
    if (!draft) return null
    const amount = Number(draft.amountDigits || '0')
    if (amount <= 0) {
      setFormError(AI_CAPTURE_COPY.needAmount)
      return null
    }

    const transaction = recordTransaction({
      name: draft.name.trim() || AI_CAPTURE_COPY.untitled,
      amount,
      type: draft.type,
      category: draft.category,
      wallet: draft.wallet,
      date: draft.date,
    })

    transcriptRef.current = ''
    setPhase('idle')
    setDraft(null)
    setProblem(null)
    setFormError(null)
    setLiveTranscript('')
    return transaction
  }, [draft])

  /** alur sedang berjalan (membaca / mendengar / menunggu keputusan user) */
  const busy = phase !== 'idle'

  return {
    phase,
    busy,
    draft,
    liveTranscript,
    problem,
    formError,
    voiceSupport,
    startReceiptScan,
    startVoice,
    finishVoice,
    cancelCapture,
    updateDraft,
    confirmCapture,
  }
}
