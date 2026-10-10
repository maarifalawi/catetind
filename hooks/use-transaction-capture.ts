'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AI_CAPTURE_COPY } from '@/lib/ai-chat'
import { readAiPrefs, withCapturePrefs } from '@/lib/ai-prefs'
import { recordAiUsage } from '@/lib/ai-usage-store'
import type { HistoryTransaction } from '@/lib/data/history'
import { captureWalletChoice, getMoneySnapshot, walletIdOfName } from '@/lib/money/store'
import { recordTransaction } from '@/lib/transaction-bus'
import {
  draftFormFrom,
  parseSpokenTransaction,
  parseTypedTransaction,
  type ExtractedField,
  type ExtractedTransaction,
  type TransactionDraftForm,
} from '@/lib/transaction-ai'
import type { MoneyContext } from '@/lib/types'

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

   PAKET 54: draft yang datang dari AI melewati `withCapturePrefs()` dulu —
   itulah tempat dua saklar di Pengaturan ("Kategorisasi/Penamaan Otomatis oleh
   AI", `lib/ai-prefs.ts`) benar-benar bekerja. Saklar mati = field itu
   dikosongkan supaya user yang mengisi di kartu konfirmasi; jalur manual tidak
   membaca preferensi ini sama sekali karena di sana tidak ada tebakan.

   Widget-nya hidup di root layout (tidak unmount saat pindah halaman), jadi
   draft yang belum diputuskan tetap ada saat panel ditutup & dibuka lagi —
   sama seperti riwayat percakapan. Refresh halaman mengosongkannya.

   PAKET 79 — TIGA PINTU, SATU MESIN. Ketikan transaksi di chat
   (`startChatDraft`) sekarang masuk jalur yang sama dengan struk & suara:
   mula-mula MODEL di server (`POST /api/parse-voice`), lalu parser aturan lokal
   sebagai jaring aman. Sumbernya ditandai (`'chat'`) supaya kartu konfirmasi
   memakai kalimat yang benar — tidak lagi "ucapanmu"/"yang aku denger" untuk
   teks yang user ketik. Dompet draft juga SELALU dompet milik user
   (`withCaptureWallet()`): tebakan AI yang tak ada di daftar diganti dompet
   konteks aktif + disebutkan apa adanya di kartu, sehingga tidak ada lagi baris
   lahir "Belum berkonteks" dari jalur ini. */

export type CapturePhase = 'idle' | 'reading' | 'parsing' | 'listening' | 'confirm' | 'problem'

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

/* ── JEMBATAN KE ROUTE AI (paket 63) ─────────────────────────────────────────
   Dua pintu masuk (struk & ucapan) sekarang memanggil route NYATA
   (`POST /api/ai/ocr`, `POST /api/parse-voice`) yang memakai model di server.
   Kalau provider tak bisa dihubungi, perilakunya DIBEDAKAN dengan sengaja:

     · STRUK — mock "OCR" (menebak merchant dari NAMA FILE) TIDAK dipakai lagi:
       menampilkan tebakan sebagai hasil baca struk adalah klaim palsu. Gagal =
       state problem jujur + ajakan foto ulang / isi manual.
     · UCAPAN — transkripnya NYATA (dari Web Speech API), jadi parser aturan lokal
       tetap jujur dipakai sebagai jaring aman saat provider mati. */

/** File gambar → base64 tanpa prefix data URL (mimeType dikirim terpisah) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

/** payload route AI → `ExtractedTransaction`, atau `null` kalau bentuknya asing */
function readTransaction(payload: unknown): ExtractedTransaction | null {
  const transaction = (payload as { transaction?: unknown } | null)?.transaction
  if (!transaction || typeof transaction !== 'object') return null
  return transaction as ExtractedTransaction
}

/**
 * Dompet draft = DOMPET MILIK USER (paket 79) — bukan nama kanon tebakan AI.
 *
 * Temuan yang ditutup di sini: kartu konfirmasi AI dulu menulis nama dompet dari
 * daftar statis (`BCA/GoPay/OVO/Tunai`). Begitu nama itu tidak ada di ledger
 * user, barisnya lahir dengan `walletId: ''` — tampil di SEMUA konteks dengan
 * badge **"Belum berkonteks"** dan tidak memotong saldo dompet mana pun.
 *
 * Aturannya sekarang: tebakan AI dipakai KALAU dompetnya memang dimiliki user;
 * kalau tidak, draft memakai dompet pertama di konteks aktif (pola yang sama
 * dengan FAB/modal/kalender) DAN tebakan aslinya disimpan di
 * `unknownWalletGuess` supaya kartu konfirmasi mengatakannya apa adanya.
 * Tidak ada penggantian dompet yang disembunyikan, dan tidak ada baris tanpa
 * dompet yang lahir dari jalur AI.
 */
function withCaptureWallet(draft: TransactionDraftForm, ctx: MoneyContext): TransactionDraftForm {
  const choice = captureWalletChoice(getMoneySnapshot(), ctx, draft.wallet)
  return {
    ...draft,
    wallet: choice.value,
    unknownWalletGuess: choice.unknownGuess,
    walletOutsideContext: choice.outsideContext,
    /* dompetnya diisi app dari konteks aktif, bukan disebut user — kartu
       mengatakannya (paket 81). Dihitung di store (`captureWalletChoice`), bukan
       di sini: keputusannya murni dan sudah diuji di `lib/money/store.test.ts`. */
    walletFromContext: choice.fromContext,
  }
}

/** preferensi AI + dompet nyata — dua penyesuaian yang SELALU berlaku bersama */
function prepareDraft(
  extracted: ExtractedTransaction,
  transcript: string | undefined,
  ctx: MoneyContext,
): TransactionDraftForm {
  return withCapturePrefs(withCaptureWallet(draftFormFrom(extracted, transcript), ctx))
}

export function useTransactionCapture({
  onUserEcho,
  context,
}: {
  /** dipanggil saat user mengirim sesuatu (foto / suara) supaya jejaknya muncul
   *  sebagai bubble user — percakapan jadi transparan: user bisa melihat persis
   *  apa yang AI terima */
  onUserEcho: (text: string) => void
  /**
   * Konteks uang yang sedang aktif (Pribadi/Keluarga/Bersama).
   *
   * DIOPER pemanggil, bukan dibaca hook ini: konteks hidup di provider komponen
   * (`components/catetind/money-context-provider.tsx`) dan arah impor repo ini
   * selalu komponen → hook/lib. Nilainya menentukan dompet default draft AI saat
   * tebakan AI tidak ada di daftar dompet user (paket 79).
   */
  context: MoneyContext
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
  /** aksi terakhir (struk/ucapan) — tombol "Coba lagi" di state problem mengulanginya */
  const retryRef = useRef<(() => void) | null>(null)

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
     capture="environment">` (kamera belakang di HP, file picker di web). Berkasnya
     dikirim sebagai base64 ke `POST /api/ai/ocr` (model vision di server, PRD
     385–412), lalu hasilnya masuk kartu konfirmasi. Gagal = state problem jujur;
     TIDAK ada tebakan yang dipajang seolah hasil baca struk. */
  const startReceiptScan = useCallback(
    (file: File) => {
      releaseVoice()
      clearReadTimer()
      setDraft(null)
      setProblem(null)
      setFormError(null)
      setLiveTranscript('')
      setPhase('reading')
      /* METERING AI (paket 42): struk yang dibaca = satu panggilan OCR. */
      recordAiUsage('ocr')
      onUserEcho(AI_CAPTURE_COPY.photoEcho(file.name))
      /* "Coba lagi" di state problem mengulang pemindaian FILE yang sama */
      retryRef.current = () => startReceiptScan(file)

      void (async () => {
        try {
          const base64 = await fileToBase64(file)
          const res = await fetch('/api/ai/ocr', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ image: base64, mimeType: file.type || undefined }),
          })
          const payload = res.ok ? await res.json() : null
          const transaction = readTransaction(payload)
          if (transaction) {
            /* preferensi user + DOMPET NYATA diterapkan SEBELUM draft masuk kartu
               konfirmasi (paket 54 & 79): kalau "Kategorisasi/Penamaan Otomatis"
               dimatikan, field itu kosong dan user yang mengisinya; dan dompet
               tebakan AI diganti dompet milik user supaya barisnya tidak lahir
               "Belum berkonteks". */
            setDraft(prepareDraft(transaction, undefined, context))
            setPhase('confirm')
            return
          }
        } catch {
          /* jaringan/berkas gagal → problem di bawah */
        }
        setProblem(AI_CAPTURE_COPY.scanFailed)
        setPhase('problem')
      })()
    },
    [clearReadTimer, context, onUserEcho, releaseVoice],
  )

  /* ── MERAPIKAN TRANSKRIP → DRAFT ─────────────────────────────────────────────
     Transkripnya NYATA (Web Speech API). Di sini ia dikirim ke
     `POST /api/parse-voice` (model di server) untuk diubah jadi draft; kalau
     provider tak bisa dihubungi, parser aturan lokal merapikan transkrip yang
     sama — hasilnya tetap jujur karena tidak ada yang dikarang. */
  const resolveVoiceDraft = useCallback(
    async (transcript: string) => {
      try {
        const res = await fetch('/api/parse-voice', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ transcript, source: 'voice' }),
        })
        const payload = res.ok ? await res.json() : null
        const transaction = readTransaction(payload)
        if (transaction) {
          setDraft(prepareDraft(transaction, transcript, context))
          setPhase('confirm')
          return
        }
      } catch {
        /* jatuh ke parser aturan lokal di bawah */
      }
      setDraft(prepareDraft(parseSpokenTransaction(transcript), transcript, context))
      setPhase('confirm')
    },
    [context],
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
    /* "Coba lagi" di state problem mengulang mendengarkan */
    retryRef.current = () => startVoice()

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
      /* METERING AI (paket 42): hanya transkrip yang BERHASIL jadi draft yang
         dihitung — percobaan tanpa suara tidak mengambil kuota user */
      recordAiUsage('voice')
      onUserEcho(transcript)
      /* draft dibentuk ASINKRON: transkrip → model di server (atau parser aturan
         lokal saat provider tak bisa dihubungi). Selama menunggu, bubble tetap
         menampilkan state "mendengar" — tidak ada state palsu yang dikarang. */
      void resolveVoiceDraft(transcript)
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
  }, [clearReadTimer, onUserEcho, releaseVoice, resolveVoiceDraft])

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
   * Buka kartu konfirmasi dari PESAN CHAT (paket 65 · Tugas D, diperluas paket 79).
   *
   * Kalimat transaksi yang DIKETIK user ("gua habis makan 50k, catet ya") dirapikan
   * dengan sudut yang sama dengan input suara: mula-mula lewat MODEL di server
   * (`POST /api/parse-voice`, `source: 'chat'`) — supaya kemampuan AI-nya benar-
   * benar dipakai, bukan cuma aturan kata kunci. Kalau provider tak bisa
   * dihubungi, `parseTypedTransaction()` merapikan teks yang sama di klien; tidak
   * ada nilai yang dikarang di jalur mana pun.
   *
   * Sumbernya ditandai `'chat'` sehingga kartu konfirmasi TIDAK bicara soal suara
   * ("ucapanmu"/"yang aku denger") dan nama catatannya diambil dari ketikan user.
   * Tidak ada uang yang ditulis di sini; user tetap harus menekan "Catat ✓"
   * (`confirmCapture`).
   * @returns `true` kalau alur dimulai (kartu konfirmasi menyusul setelah dibaca)
   */
  const resolveChatDraft = useCallback(
    async (text: string) => {
      try {
        const res = await fetch('/api/parse-voice', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ transcript: text, source: 'chat' }),
        })
        const payload = res.ok ? await res.json() : null
        const transaction = readTransaction(payload)
        if (transaction) {
          setDraft(prepareDraft(transaction, text, context))
          setPhase('confirm')
          return
        }
      } catch {
        /* jatuh ke parser aturan lokal di bawah */
      }
      setDraft(prepareDraft(parseTypedTransaction(text), text, context))
      setPhase('confirm')
    },
    [context],
  )

  const startChatDraft = useCallback(
    (transcript: string): boolean => {
      const text = transcript.trim()
      if (!text) return false
      releaseVoice()
      clearReadTimer()
      transcriptRef.current = text
      setDraft(null)
      setLiveTranscript('')
      setProblem(null)
      setFormError(null)
      /* fase 'parsing' (bukan 'reading'): kartu di layar mengatakan yang benar —
         tulisan user sedang dirapikan, bukan struk sedang dibaca */
      setPhase('parsing')
      retryRef.current = () => {
        setPhase('parsing')
        void resolveChatDraft(text)
      }
      void resolveChatDraft(text)
      return true
    },
    [clearReadTimer, releaseVoice, resolveChatDraft],
  )

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

    /* KATEGORI (paket 54): draft bisa datang tanpa kategori — keadaan sah saat
       user mematikan "Kategorisasi Otomatis oleh AI" di Pengaturan. Kartu
       konfirmasi sudah meminta pilihan itu (opsi kosong, bukan kategori yang
       disembunyikan); penjaganya di sini supaya catatan yang kategori belum
       diputuskan tidak tersimpan sebagai 'Lainnya' — di Riwayat itu terbaca
       seolah user memilih, padahal ia belum memilih apa pun. */
    if (!draft.category) {
      setFormError(AI_CAPTURE_COPY.needCategory)
      return null
    }

    /* PINDAH DANA (paket 55): parser suara bisa menghasilkan tipe `transfer`
       (mis. "transfer 200 ribu ke gopay"), tapi kartu konfirmasi ini tidak punya
       dompet TUJUAN — jalur ini hanya bisa mencatat satu sisi. Store pun menolak
       baris seperti itu (`postTransaction` → `null`), dan dulu penolakan itu
       muncul sebagai "nominalnya tidak sah" yang tidak masuk akal. Jadi
       ditahan di sini dengan kalimat yang benar + arahan ke alur Pindah Dana. */
    if (draft.type === 'transfer') {
      setFormError(AI_CAPTURE_COPY.needTransferFlow)
      return null
    }

    /* ── DOMPET WAJIB DOMPET MILIK USER (paket 79) ───────────────────────────
       Jaring aman terakhir jalur AI. Kartu konfirmasi sudah menawarkan dompet
       nyata user dan mengganti tebakan AI yang tidak ada di daftar, tapi pagar ini
       memastikan TIDAK ADA baris yang lahir tanpa dompet dari jalur ini: baris
       seperti itu tampil "Belum berkonteks" di semua konteks dan tidak memotong
       saldo dompet mana pun — persis yang dikeluhkan user. Kalau user belum punya
       dompet sama sekali, yang dikatakan adalah cara menambahkannya (bukan
       menuliskan catatan ke dompet karangan). */
    const snapshot = getMoneySnapshot()
    const choice = captureWalletChoice(snapshot, context, draft.wallet)
    if (choice.options.length === 0) {
      setFormError(AI_CAPTURE_COPY.noWalletToPick)
      return null
    }
    if (!walletIdOfName(snapshot, draft.wallet)) {
      setFormError(AI_CAPTURE_COPY.needWallet)
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

    /* METERING AI (paket 42, disesuaikan paket 54): jalur INI benar-benar memakai
       AI untuk mengisi kategori & menamai catatan — tapi hanya kalau saklarnya
       menyala. Dicatat setelah barisnya tertulis (bukan saat draft dibuat),
       supaya yang dihitung cuma catatan yang benar-benar tersimpan; sementara
       jalur MANUAL tidak lagi menghitung apa pun karena AI tidak dipanggil di
       sana (dulu setiap catatan manual dihitung sebagai satu 'categorize'). */
    const prefs = readAiPrefs()
    if (prefs.autoCategory || prefs.autoNaming) recordAiUsage('categorize')

    transcriptRef.current = ''
    setPhase('idle')
    setDraft(null)
    setProblem(null)
    setFormError(null)
    setLiveTranscript('')
    return transaction
  }, [context, draft])

  /** ulangi aksi AI terakhir (foto struk atau mendengarkan) — tombol "Coba lagi" */
  const retryCapture = useCallback(() => {
    retryRef.current?.()
  }, [])

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
    retryCapture,
    cancelCapture,
    updateDraft,
    confirmCapture,
    /** dari pesan chat: buka kartu konfirmasi (paket 65 · Tugas D) */
    startChatDraft,
  }
}
