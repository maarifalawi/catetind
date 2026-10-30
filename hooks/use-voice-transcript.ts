'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AI_CAPTURE_COPY } from '@/lib/ai-chat'

/* ── useVoiceTranscript — mesin STT browser, SATU salinan (paket 101) ─────────
   Web Speech API sudah dipakai kartu AI Coach sejak prompt 20, tapi form Catat
   (`transaction-input-engine.tsx`) masih memakai timer MOCK: 3 detik lalu
   mengisi "Beli kopi / Rp 25.000". Akibatnya tombol 🎤 terlihat bekerja padahal
   tidak pernah mendengar apa pun.

   Supaya tidak ada dua mesin STT yang bisa menyimpang, seluruh bagian rapuh
   dari Web Speech API tinggal di sini dan dipakai DUA pintu:
     · `hooks/use-transaction-capture.ts` (kartu konfirmasi di AI Coach)
     · `components/dashboard/transaction-input-engine.tsx` (form Catat)

   Yang ditangani hook ini — dan tidak perlu diulang pemanggil:
     · `lang='id-ID'`, interim results, `maxAlternatives=1`;
     · transkrip interim ditampilkan SEBELUM diproses (PRD 516);
     · `onend` tetap menyala setelah `onerror` dan bisa dua kali → satu penutup
       per sesi (`settled`) supaya tidak ada draft/pesan ganda;
     · setiap kode error diterjemahkan ke kalimat yang menyebut jalan keluarnya,
       bukan istilah mesin.

   STT tetap di perangkat user (PRD A3): hook ini TIDAK mengirim audio ke server.
   Yang dikirim ke model hanyalah TEKS hasil transkrip, dan itu dilakukan
   pemanggil lewat `POST /api/parse-voice`. */

/** dukungan STT baru dipastikan SETELAH mount (SSR tidak punya `window`) */
export type VoiceSupport = 'unknown' | 'yes' | 'no'

/** keadaan mikrofon: sedang mendengar, atau tidak */
export type VoiceState = 'idle' | 'listening'

/* lib.dom TypeScript belum memuat `SpeechRecognition` (hanya *Alternative /
 *Result / *ResultList), jadi bentuk yang kita pakai dideklarasikan di sini.
   Ini murni tipe: tidak ada dependency baru dan tidak ada polyfill (A3). */
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

export function useVoiceTranscript({
  onFinal,
  onProblem,
}: {
  /** transkrip final siap diproses (dipanggil SEKALI per sesi bicara) */
  onFinal: (transcript: string) => void
  /** alasan mikrofon tidak bisa dipakai / tidak ada suara — copy siap tampil */
  onProblem: (message: string) => void
}) {
  const [state, setState] = useState<VoiceState>('idle')
  /** transkrip hidup (final + interim) — ditampilkan SEBELUM diproses */
  const [transcript, setTranscript] = useState('')
  const [support, setSupport] = useState<VoiceSupport>('unknown')

  const recognition = useRef<SpeechRecognitionLike | null>(null)
  /** transkrip final yang sudah terkumpul (handler `onend` membacanya) */
  const finalRef = useRef('')
  /* pemanggil boleh memberi callback baru tiap render; hook selalu memanggil
     versi TERBARU tanpa memulai ulang sesi bicara */
  const handlers = useRef({ onFinal, onProblem })
  useEffect(() => {
    handlers.current = { onFinal, onProblem }
  }, [onFinal, onProblem])

  /* dukungan Speech API baru dicek setelah mount: HTML server & render pertama
     client harus identik dulu (pola yang sama dengan `prefers-reduced-motion`) */
  useEffect(() => {
    setSupport(getSpeechRecognition() ? 'yes' : 'no')
  }, [])

  /** lepas semua handler lalu matikan mesin STT — dipanggil di setiap transisi */
  const release = useCallback(() => {
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

  /* bersihkan mikrofon saat pemilik hook tak lagi terpasang */
  useEffect(() => release, [release])


  /**
   * Mulai mendengar. `false` = perangkat tidak punya Speech API (alasannya sudah
   * dikirim lewat `onProblem`, jadi pemanggil tidak perlu menyusun kalimat).
   */
  const start = useCallback((): boolean => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) {
      handlers.current.onProblem(AI_CAPTURE_COPY.voiceUnsupported)
      return false
    }

    release()
    finalRef.current = ''
    setTranscript('')
    setState('listening')

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
      setState('idle')
      return true
    }

    rec.onresult = (event) => {
      let finalText = finalRef.current
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (!result) continue
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) finalText = `${finalText} ${text}`.trim()
        else interim = `${interim} ${text}`.trim()
      }
      finalRef.current = finalText
      setTranscript(`${finalText} ${interim}`.trim())
    }

    rec.onerror = (event) => {
      if (event.error === 'aborted') return // user sendiri yang menghentikan
      if (!settle()) return
      handlers.current.onProblem(voiceProblemCopy(event.error))
    }

    rec.onend = () => {
      if (!settle()) return
      /* Dua sebab `onend`: user menekan "Selesai", atau mesin berhenti sendiri
         setelah jeda. Dua-duanya diperlakukan sama — hasil yang sudah kedengeran
         langsung diproses; kalau memang belum ada apa-apa, bilang jujur daripada
         berpura-pura sibuk mendengar selamanya. */
      const text = finalRef.current.trim()
      if (!text) {
        handlers.current.onProblem(AI_CAPTURE_COPY.voiceNoSpeech)
        return
      }
      handlers.current.onFinal(text)
    }

    recognition.current = rec
    try {
      rec.start()
      return true
    } catch {
      /* mis. izin masih menunggu atau mesin STT sedang dipakai proses lain */
      settle()
      handlers.current.onProblem(AI_CAPTURE_COPY.voiceFailed)
      return false
    }
  }, [release])

  /** tombol "Selesai" — hentikan mendengar, hasilnya diproses oleh `onend` */
  const stop = useCallback(() => {
    try {
      recognition.current?.stop()
    } catch {
      /* sudah berhenti sendiri */
    }
  }, [])

  /** batalkan tanpa memproses apa pun (tutup panel / pindah alur) */
  const cancel = useCallback(() => {
    release()
    finalRef.current = ''
    setTranscript('')
    setState('idle')
  }, [release])

  return { state, transcript, support, start, stop, cancel }
}
