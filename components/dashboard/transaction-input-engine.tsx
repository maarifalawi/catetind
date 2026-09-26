'use client'

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeftRight,
  Camera,
  Check,
  Mic,
  PiggyBank,
  ScanLine,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIDR } from '@/lib/wallets'
import { SUBSCRIPTION_LOCK_COPY } from '@/lib/data/renewal'
import { useSubscriptionGate } from '@/components/catetind/subscription-gate-provider'
import { SubscriptionLockNote } from '@/components/catetind/subscription-lock-note'
import { MOCK_RECEIPT_AMOUNT, MOCK_RECEIPT_READ_MS, receiptNoteFromFileName } from '@/lib/transaction-ai'
import {
  EDIT_TRANSACTION_COPY,
  TRANSACTION_CATEGORY_OPTIONS,
  TRANSACTION_INPUT_COPY,
  TRANSACTION_WALLET_OPTIONS,
  type HistoryTransaction,
} from '@/lib/data/history'

/* ── Transaction Input Engine (inventaris 97a/b/c) ────────────────────────────
   Falsafah "Zero Cognitive Load & 4-Tap Strict Rule": tidak ada menu "mau input
   bagaimana?". Panel langsung membuka form manual — OCR & Voice cuma
   quick-action sekunder di dalam panel yang sama.

   Satu engine, dua shell (biar perilaku mobile & web tidak pernah divergen):
   • layout="sheet"  → di dalam Vaul bottom sheet (TransactionBottomSheet)
   • layout="dialog" → di dalam modal tengah web (TransactionWebModal)

   Sejak paket 03 engine juga melayani MODE EDIT lewat prop `initial`: formnya
   terbuka sudah terisi (pre-filled) sehingga user cuma perlu membetulkan yang
   salah — bukan mengisi ulang dari nol. Mode tambah tidak berubah sama sekali. */

export type TransactionTypeId = 'expense' | 'income' | 'saving' | 'transfer'

/**
 * Payload submit engine.
 *
 * `category`/`wallet`/`date` HANYA terisi di mode edit: di mode tambah, tiga
 * nilai itu belum ada di form (ditentukan AI/backend), sedangkan di mode edit
 * semuanya sudah punya nilai dan bisa dikoreksi user. Karena opsional, shell
 * lama (bottom sheet, modal web, onboarding, joint wallet, kalender) tidak perlu
 * diubah sama sekali.
 */
export interface TransactionDraft {
  amount: number
  note: string
  type: TransactionTypeId
  category?: string
  wallet?: string
  /** tanggal lokal `YYYY-MM-DD` */
  date?: string
}

/** mode tampilan stage tengah engine */
type SheetMode = 'manual' | 'ocr' | 'voice'

type TransactionType = {
  id: TransactionTypeId
  label: string
  icon: LucideIcon
  /** kelas pil saat aktif — accent per tipe (plum/olive/cantelope) */
  active: string
  /** kategori yang "ditebak AI" (mock Domain 2A.2 Smart Default) */
  suggested: string
  /** pool copy toast gamified — `{amount}` diganti nominal terformat */
  cheers: string[]
}

const TYPES: TransactionType[] = [
  {
    id: 'expense',
    label: 'Pengeluaran',
    icon: TrendingDown,
    active: 'bg-hud-terracotta/[0.12] text-hud-terracotta ring-hud-terracotta/25',
    suggested: 'Makanan',
    cheers: [
      'Sip, {amount} dicatat! 🌿',
      'Mantap, pengeluaran kopi masih aman! 🎉',
      'Beres, {amount} kecatat rapi ✨',
      'Catat 1, aman 1 — {amount} tersimpan 🌱',
    ],
  },
  {
    id: 'income',
    label: 'Pemasukan',
    icon: TrendingUp,
    active: 'bg-sage text-forest ring-forest/15',
    suggested: 'Gaji',
    cheers: [
      'Asik, {amount} masuk! 🌿',
      'Mantap, pemasukan {amount} nambah! 🎉',
      'Yeay, {amount} udah kecatat ✨',
    ],
  },
  {
    id: 'saving',
    label: 'Tabungan',
    icon: PiggyBank,
    active: 'bg-hud-amber/[0.18] text-[#b89191] ring-hud-amber/40',
    suggested: 'Dana Darurat',
    cheers: [
      'Sip, nabung {amount} lagi! 🌱',
      'Tabungan nambah {amount} 🎉',
      'Mantap, {amount} disisihkan buat masa depan ✨',
    ],
  },
  {
    id: 'transfer',
    label: 'Transfer',
    icon: ArrowLeftRight,
    active: 'bg-hud-sage/[0.3] text-[#000000] ring-hud-sage/50',
    suggested: 'Antar Dompet',
    cheers: [
      'Oke, {amount} dipindahin! 🌿',
      'Transfer {amount} kecatat 🎉',
      'Sip, {amount} pindah dompet ✨',
    ],
  },
]

/** tinggi tiap bar gelombang suara (px) — mode voice */
const WAVE = [10, 20, 32, 18, 26, 14, 22]

/** daftar opsi + nilai lama yang belum ada di daftar (supaya tidak hilang diam-diam) */
function withCurrentValue(options: readonly string[], current?: string): string[] {
  const list = [...options]
  if (current && !list.includes(current)) list.push(current)
  return list
}

/** getar fisik sukses — browser tanpa Vibration API (iOS Safari) cukup diabaikan */
function haptic(pattern: number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* haptic itu bonus, bukan syarat sukses — jangan sampai blokir submit */
  }
}

/** gaya kontrol kecil mode edit — senada dengan field catatan di atasnya */
const EDIT_CONTROL_CLASS =
  'w-full rounded-xl bg-soil/[0.09] px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none ring-1 ring-transparent transition-all focus:bg-cream focus:ring-forest/15'

export function TransactionInputEngine({
  active,
  defaultType = 'expense',
  layout = 'sheet',
  initial = null,
  onSubmitted,
  sourceLabel,
  extraFields,
  onAmountChange,
}: {
  /** panel sedang terbuka — pemicu reset form + auto-focus (bekerja baik saat
      engine di-unmount maupun dibiarkan ter-mount oleh shell yang inert) */
  active: boolean
  /** tipe terpilih saat panel dibuka */
  defaultType?: TransactionTypeId
  /** 'sheet' = bottom sheet mobile (padat) · 'dialog' = modal web (lega) */
  layout?: 'sheet' | 'dialog'
  /**
   * Transaksi yang sedang diubah. Diisi = engine masuk MODE EDIT: tipe, nominal,
   * deskripsi (nama), kategori, dompet, dan tanggal semuanya terisi dari data
   * lamanya. `null` (default) = perilaku lama persis (mode tambah).
   */
  initial?: HistoryTransaction | null
  /** dipanggil setelah submit valid — shell yang menutup panelnya. Payload
      dikirim supaya shell bisa menyisipkan transaksi ke daftar (halaman Joint
      Wallet memakainya untuk memperbarui timeline tanpa memuat ulang halaman) */
  onSubmitted: (payload: TransactionDraft) => void
  /** opsional: label sumber dana (mis. dompet bersama) yang auto-terpilih */
  sourceLabel?: string
  /** opsional: field tambahan khusus konteks (dipakai halaman Joint Wallet
      untuk pemilih split & toggle privasi) — dirender di bawah tombol Catat */
  extraFields?: ReactNode
  /** opsional: laporan nominal yang sedang diketik (dipakai Split Bill Sheet
      supaya tahu total yang dibagi) */
  onAmountChange?: (amount: number) => void
}) {
  const isDialog = layout === 'dialog'
  const isEdit = initial !== null
  /* Masa aktif habis → engine ini pintu input uang, jadi tombol "Catat" mati.
     Ditempel DI ENGINE, bukan di tiap shell (bottom sheet, modal web, joint,
     kalender, edit transaksi), supaya nol titik yang bisa terlewat. Form-nya
     tetap bisa dibuka & dibaca — yang berhenti hanya penyimpanannya. */
  const { inputLocked } = useSubscriptionGate()

  const [typeId, setTypeId] = useState<TransactionTypeId>(defaultType)
  /** digit mentah tanpa titik — satu-satunya sumber kebenaran format Rupiah */
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  /* tiga field yang HANYA hidup di mode edit — nilainya dari transaksi aslinya */
  const [category, setCategory] = useState('')
  const [wallet, setWallet] = useState('')
  const [date, setDate] = useState('')
  const [mode, setMode] = useState<SheetMode>('manual')

  const amountRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mockTimer = useRef<number | null>(null)

  const type = TYPES.find((item) => item.id === typeId) ?? TYPES[0]
  const amount = Number(digits || '0')
  /** 25000 → "25.000" (auto-format Indonesia seketika saat diketik) */
  const display = digits ? amount.toLocaleString('id-ID') : ''
  /* daftar pilihan kategori & dompet: nilai lama yang tidak ada di daftar kanon
     (mis. kategori 'Proyek' dari halaman Dompet Detail) DITAMBAHKAN sebagai
     opsi — tanpa itu, sekadar membuka sheet edit akan diam-diam mengubah data
     user jadi kategori lain. */
  const categoryOptions = withCurrentValue(TRANSACTION_CATEGORY_OPTIONS, initial?.category)
  const walletOptions = withCurrentValue(TRANSACTION_WALLET_OPTIONS, initial?.wallet)
  /* font menyesuaikan panjang angka — nominal besar tetap muat & tetap center */
  const amountFont = isDialog
    ? display.length <= 7
      ? 'text-[3.25rem]'
      : 'text-[2.4rem]'
    : display.length <= 7
      ? 'text-[2.75rem] sm:text-[3.25rem]'
      : 'text-[2.1rem] sm:text-[2.6rem]'

  function clearMock() {
    if (mockTimer.current !== null) {
      window.clearTimeout(mockTimer.current)
      mockTimer.current = null
    }
  }

  /* Reset form tiap kali panel dibuka: mode tambah = form KOSONG + auto-focus
     nominal (user langsung bisa mengetik tanpa tap tambahan); mode edit = form
     TERISI dari data lamanya dan TANPA auto-focus, karena yang perlu dibetulkan
     belum tentu nominalnya — memaksa keyboard numerik terbuka di mode edit
     justru menambah langkah (harus ditutup dulu sebelum mengubah kategori). */
  useEffect(() => {
    if (!active) {
      clearMock()
      return
    }
    setTypeId(initial?.type ?? defaultType)
    setDigits(initial ? String(initial.amount) : '')
    setNote(initial?.name ?? '')
    setCategory(initial?.category ?? '')
    setWallet(initial?.wallet ?? '')
    setDate(initial?.date ?? '')
    setMode('manual')
    if (initial) return
    const id = window.setTimeout(() => amountRef.current?.focus(), 110)
    return () => window.clearTimeout(id)
  }, [active, defaultType, initial])

  /* buang timer mock saat unmount supaya tidak setState di komponen mati */
  useEffect(() => () => clearMock(), [])

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    // buang semua non-digit lalu batasi 9 digit (maks Rp 999.999.999)
    const next = event.target.value.replace(/\D/g, '').slice(0, 9)
    setDigits(next)
    /* laporan ke shell luar (opsional) — dipakai Split Bill Sheet halaman Joint
       Wallet untuk tahu total yang sedang dibagi, tanpa mengubah perilaku
       shell lama yang tidak mengirim prop ini. */
    onAmountChange?.(Number(next || '0'))
  }

  /** Enter / "done" di keyboard numerik = langsung Catat (hemat satu tap) */
  function handleAmountKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  /** 📸 OCR (mock Domain 2A.2 Mode 2) — pilih foto struk lewat kamera native. */
  function handlePickPhoto() {
    if (mode === 'ocr') {
      clearMock()
      setMode('manual')
      return
    }
    fileRef.current?.click()
  }

  function handlePhotoChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // file yang sama tetap bisa dipilih ulang
    if (!file) return

    clearMock()
    setMode('ocr')
    mockTimer.current = window.setTimeout(() => {
      /* Nominal, nama catatan, dan tempo "baca struk" datang dari
         `lib/transaction-ai.ts` — sumber yang SAMA dengan alur scan di chat AI
         Coach (prompt 20). Jadi tidak ada dua logika OCR: kalau nanti hasil
         aslinya datang dari /api/ocr, keduanya ikut berubah sekali jalan.
         Perilaku engine sendiri tidak berubah sedikit pun: selalu struk 87.500
         dengan nama dari nama file. */
      setDigits(String(MOCK_RECEIPT_AMOUNT))
      onAmountChange?.(MOCK_RECEIPT_AMOUNT)
      setNote(receiptNoteFromFileName(file.name))
      setMode('manual')
      amountRef.current?.focus()
    }, MOCK_RECEIPT_READ_MS)
  }

  /** 🎤 Voice (mock Domain 2A.2 Mode 3) — gelombang suara hangat saat listening. */
  function handleVoiceToggle() {
    if (mode === 'voice') {
      clearMock()
      setMode('manual')
      return
    }
    clearMock()
    setMode('voice')
    mockTimer.current = window.setTimeout(() => {
      setDigits('25000') // hasil "beli kopi 25 ribu"
      onAmountChange?.(25000)
      setNote('Beli kopi')
      setMode('manual')
      amountRef.current?.focus()
    }, 3000)
  }

  /**
   * ANTI-BLOCKING (Domain 2A.4): tutup panel 0ms → haptic → toast.
   * Tidak ada modal sukses full-screen, tidak ada `await`, tidak ada spinner.
   */
  function handleSubmit() {
    /* Kunci ganda: tombolnya sudah `disabled`, tapi Enter di keyboard numerik
       memanggil fungsi ini langsung — jadi guard-nya harus ada di sini, bukan
       hanya di markup. */
    if (inputLocked) {
      toast(SUBSCRIPTION_LOCK_COPY.inputHint)
      return
    }

    if (amount <= 0) {
      // guard lembut — tetap non-blocking, panel sengaja TIDAK ditutup
      toast('Isi nominalnya dulu ya 🌿')
      amountRef.current?.focus()
      return
    }

    /* MODE EDIT: engine berhenti di menyampaikan hasil. Toast "Sip, udah dicatet!"
       justru salah di sini (catatannya lama, bukan baru) dan pujian yang tidak
       nyambung bikin app terasa tidak mendengarkan — jadi yang tampil adalah
       toast "diperbarui" dari halaman pemanggil. Haptiknya tetap sama. */
    if (initial) {
      onSubmitted({
        amount,
        note: note.trim() || initial.name,
        type: typeId,
        category: category || initial.category,
        wallet: wallet || initial.wallet,
        date: date || initial.date,
      })
      haptic([30, 50, 30])
      return
    }

    const pool = type.cheers
    const cheer = pool[Math.floor(Math.random() * pool.length)] ?? pool[0]
    const message = cheer.replace('{amount}', formatIDR(amount))

    onSubmitted({ amount, note: note.trim(), type: typeId }) // 1. tutup seketika; animasi tutup jalan di background
    haptic([30, 50, 30]) // 2. haptic fisik

    toast.success(message) // 3. toast non-blocking, copy gamified acak

    /* Catatan: form TIDAK dikosongkan di sini. Reset dilakukan di effect saat
       panel dibuka lagi, supaya animasi tutup tetap menampilkan nominal yang
       barusan dicatat — kalau dibersihkan sekarang, angkanya berkedip. */
  }

  return (
    <div className="flex flex-col">
      {/* sumber dana terpilih (opsional) — halaman Joint Wallet memakai ini untuk
          menegaskan dompet bersama sudah otomatis jadi sumber transaksi */}
      {sourceLabel && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-hud-sage/15 px-3.5 py-2.5 text-[12px] font-semibold text-[#000000] ring-1 ring-hud-sage/30">
          <Wallet className="size-3.5" strokeWidth={2.4} />
          Dompet: {sourceLabel}
        </div>
      )}

      {/* ── 1. TYPE SELECTOR — satu baris horizontal, 4 pil ──────────────
          Pengeluaran DEFAULT (accent terracotta). Tap langsung, tanpa menu
          "mau input bagaimana". */}
      <div className={cn('grid grid-cols-4', isDialog ? 'gap-2.5' : 'gap-2')}>
        {TYPES.map((item) => {
          const active = item.id === typeId
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTypeId(item.id)
                setMode('manual')
                amountRef.current?.focus()
              }}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-center justify-center',
                'transition-all duration-150 active:scale-[0.96]',
                isDialog
                  ? 'gap-1.5 rounded-2xl px-2 py-3.5'
                  : 'gap-1 rounded-2xl px-1 py-2.5',
                active
                  ? cn('font-bold ring-1', item.active)
                  : 'bg-soil/[0.09] font-medium text-ink/45 hover:bg-soil/[0.09]',
              )}
            >
              <Icon
                className={isDialog ? 'size-5' : 'size-[18px]'}
                strokeWidth={2.1}
              />
              <span
                className={cn(
                  'leading-none whitespace-nowrap',
                  isDialog ? 'text-[11.5px]' : 'text-[10.5px]',
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── 2. STAGE — manual ⇄ OCR loading ⇄ voice listening ─────────── */}
      <div
        className={cn(
          'mt-4 flex flex-col justify-center',
          isDialog ? 'min-h-[210px]' : 'min-h-[188px]',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-center"
            >
              {/* nominal RAKSASA — prefix "Rp" + spacer kembar supaya angkanya
                  benar-benar center panel, bukan center area sisa */}
              <div className="flex w-full items-baseline justify-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    'w-9 shrink-0 text-right font-bold text-ink/25',
                    isDialog ? 'text-2xl' : 'text-xl',
                  )}
                >
                  Rp
                </span>
                <input
                  ref={amountRef}
                  /* autoFocus={active}: di bottom sheet engine di-mount saat
                     dibuka (fokus seketika), sedangkan modal web di-mount sejak
                     awal dengan active=false — supaya field tersembunyi ini
                     tidak mencuri fokus saat halaman baru dimuat. Di mode edit
                     fokus sengaja TIDAK diambil: yang perlu dibetulkan belum
                     tentu nominalnya, dan keyboard yang muncul sendiri justru
                     menghalangi field kategori/dompet/tanggal di bawahnya. */
                  autoFocus={active && !isEdit}
                  value={display}
                  onChange={handleAmountChange}
                  onKeyDown={handleAmountKeyDown}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="0"
                  aria-label="Nominal transaksi"
                  className={cn(
                    'min-w-0 flex-1 bg-transparent text-center font-black leading-none',
                    'tracking-tighter text-ink tabular-nums outline-none',
                    'placeholder:text-ink/15',
                    amountFont,
                  )}
                />
                <span aria-hidden className="w-9 shrink-0" />
              </div>

              {/* badge kategori "tebakan AI" (mock Smart Default).
                  Di mode edit badge ini sengaja TIDAK tampil: kategorinya bukan
                  "tebakan" lagi — nilainya sudah ada dan bisa dikoreksi lewat
                  field Kategori di bawah, jadi label "(AI Suggested)" di sini
                  cuma jadi klaim palsu. */}
              {!isEdit && (
                <div
                  className={cn(
                    'mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1.5 font-semibold text-forest ring-1 ring-mint/40',
                    isDialog ? 'text-xs' : 'text-[11.5px]',
                  )}
                >
                  <Sparkles className="size-3.5" strokeWidth={2.4} />
                  {type.suggested}
                  <span className="font-medium text-forest/50">(AI Suggested)</span>
                </div>
              )}

              {/* catatan opsional — satu baris, tidak wajib diisi */}
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Catatan (Opsional)"
                aria-label="Catatan transaksi (opsional)"
                className="mt-4 h-12 w-full rounded-2xl bg-soil/[0.09] px-4 text-[13.5px] font-medium text-ink outline-none ring-1 ring-transparent transition-all placeholder:text-ink/30 focus:bg-cream focus:ring-forest/15"
              />

              {/* ── MODE EDIT: tiga field detail yang nilainya SUDAH ADA ────────
                  Di mode tambah, kategori/dompet/tanggal ditentukan AI (lihat
                  badge "AI Suggested") sehingga user tidak perlu memilih apa
                  pun. Di mode edit nilai itu sudah ada dan justru bagian yang
                  paling sering salah (kasus paling umum: Minca salah nebak
                  kategori) — karena itu ketiganya bisa dikoreksi di sini. */}
              {isEdit && initial && (
                <div className="mt-3 w-full">
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <EditField label={EDIT_TRANSACTION_COPY.categoryLabel}>
                      <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        aria-label={EDIT_TRANSACTION_COPY.categoryLabel}
                        className={EDIT_CONTROL_CLASS}
                      >
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </EditField>

                    <EditField label={EDIT_TRANSACTION_COPY.walletLabel}>
                      <select
                        value={wallet}
                        onChange={(event) => setWallet(event.target.value)}
                        aria-label={EDIT_TRANSACTION_COPY.walletLabel}
                        className={EDIT_CONTROL_CLASS}
                      >
                        {walletOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </EditField>

                    <EditField label={EDIT_TRANSACTION_COPY.dateLabel}>
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        aria-label={EDIT_TRANSACTION_COPY.dateLabel}
                        className={EDIT_CONTROL_CLASS}
                      />
                    </EditField>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
                    {EDIT_TRANSACTION_COPY.hint}
                  </p>
                </div>
              )}
            </motion.div>
          )}
          {mode === 'ocr' && (
            <motion.div
              key="ocr"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="flex flex-col items-center text-center"
            >
              <span className="relative flex size-14 items-center justify-center rounded-full bg-sage text-forest">
                <ScanLine className="size-6" strokeWidth={2} />
                <span className="absolute inset-0 animate-ping rounded-full bg-mint/40" />
              </span>
              <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-ink">
                <Sparkles className="size-4 text-forest" strokeWidth={2.4} />
                Lagi baca struknya...
              </p>
              <p className="mt-1 text-xs text-ink/45">
                AI CatetInd lagi cocokin nominal &amp; tanggalnya
              </p>
            </motion.div>
          )}

          {mode === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="flex flex-col items-center text-center"
            >
              {/* mikropon + cincin denyut hangat */}
              <span className="relative flex size-14 items-center justify-center rounded-full bg-hud-terracotta/15 text-hud-terracotta">
                <Mic className="size-6" strokeWidth={2.1} />
                <span className="absolute inset-0 animate-ping rounded-full bg-hud-amber/30" />
              </span>

              {/* gelombang suara — tiap bar delay-nya digeser inline */}
              <div
                className="mt-4 flex h-9 items-center justify-center gap-1.5"
                aria-hidden
              >
                {WAVE.map((height, index) => (
                  <span
                    key={index}
                    className="sound-wave-bar w-1.5 rounded-full bg-hud-amber"
                    style={{ height, animationDelay: `${index * 90}ms` }}
                  />
                ))}
              </div>

              <p className="mt-4 text-sm font-bold text-ink">
                Ngobrol aja, misal: beli kopi 25 ribu
              </p>
              <p className="mt-1 text-xs text-ink/45">
                Lagi dengerin... ketuk mic buat batal
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* ── 3. AKSI — 📸 & 🎤 mengapit CTA "Catat" ─────────────────────
          layout dialog (web): tombol sekunder jadi pil berlabel karena
          ruangnya lega; layout sheet (mobile): tetap ikon bulat 56px. */}
      <div className={cn('flex items-center gap-3', isDialog ? 'mt-6' : 'mt-5')}>
        <button
          type="button"
          onClick={handlePickPhoto}
          aria-label={
            mode === 'ocr' ? 'Batal scan struk' : 'Scan struk dengan kamera'
          }
          className={cn(
            'flex shrink-0 items-center justify-center',
            'transition-all duration-150 active:scale-95',
            isDialog
              ? 'h-14 gap-2 rounded-2xl px-5 text-[13px] font-semibold max-lg:px-3.5'
              : 'size-14 rounded-full',
            mode === 'ocr'
              ? 'bg-forest text-cream'
              : 'bg-soil/[0.1] text-ink/70 ring-1 ring-soil/12 hover:bg-soil/[0.1]',
          )}
        >
          {mode === 'ocr' ? (
            <X className="size-5" />
          ) : (
            <Camera className="size-5" strokeWidth={2.1} />
          )}
          {isDialog && (
            <span className="hidden lg:inline">
              {mode === 'ocr' ? 'Batal' : 'Scan Struk'}
            </span>
          )}
        </button>

        {/* input file native: kamera belakang di HP, galeri/file picker di web */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden
          onChange={handlePhotoChosen}
          className="sr-only"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={inputLocked}
          aria-disabled={inputLocked || undefined}
          className={cn(
            'flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-bold transition-all duration-150',
            inputLocked
              ? 'cursor-not-allowed bg-ink/[0.07] text-ink/35'
              : 'bg-forest text-cream shadow-[0_14px_28px_-14px_rgba(69,89,78,0.7)] hover:bg-forest-soft active:scale-[0.98]',
          )}
        >
          {isEdit ? TRANSACTION_INPUT_COPY.submitEdit : TRANSACTION_INPUT_COPY.submit}
          <Check className="size-5" strokeWidth={2.8} />
        </button>

        <button
          type="button"
          onClick={handleVoiceToggle}
          aria-label={
            mode === 'voice' ? 'Batal input suara' : 'Catat pakai suara'
          }
          className={cn(
            'flex shrink-0 items-center justify-center',
            'transition-all duration-150 active:scale-95',
            isDialog
              ? 'h-14 gap-2 rounded-2xl px-5 text-[13px] font-semibold max-lg:px-3.5'
              : 'size-14 rounded-full',
            mode === 'voice'
              ? 'bg-forest text-cream'
              : 'bg-soil/[0.1] text-ink/70 ring-1 ring-soil/12 hover:bg-soil/[0.1]',
          )}
        >
          {mode === 'voice' ? (
            <X className="size-5" />
          ) : (
            <Mic className="size-5" strokeWidth={2.1} />
          )}
          {isDialog && (
            <span className="hidden lg:inline">
              {mode === 'voice' ? 'Batal' : 'Input Suara'}
            </span>
          )}
        </button>
      </div>

      {/* penjelasan kenapa tombol Catat mati — hanya saat masa aktif habis */}
      {inputLocked && (
        <SubscriptionLockNote className={isDialog ? 'mt-3' : 'mt-2.5'} />
      )}

      {/* field tambahan khusus konteks (opsional) — halaman Joint Wallet memakai
          slot ini untuk pemilih split & toggle "Sembunyikan dari pasangan" */}
      {extraFields && <div className="mt-4">{extraFields}</div>}

      {/* petunjuk pintasan keyboard — cuma relevan di web */}
      {isDialog && (
        <p className="mt-4 text-center text-[11.5px] text-ink/35">
          Tekan{' '}
          <kbd className="rounded-md bg-soil/[0.11] px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-ink/50">
            Enter
          </kbd>{' '}
          buat simpan ·{' '}
          <kbd className="rounded-md bg-soil/[0.11] px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-ink/50">
            Esc
          </kbd>{' '}
          buat tutup
        </p>
      )}
    </div>
  )
}

/* ── komponen kecil engine ─────────────────────────────────────────────────── */

/** label + kontrol untuk field detail yang cuma muncul di mode edit */
function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-[11px] font-semibold text-ink/50">{label}</span>
      {children}
    </label>
  )
}
