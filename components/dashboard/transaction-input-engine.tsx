'use client'

import {
  useEffect,
  useMemo,
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
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { newClientTxId } from '@/lib/client-tx'
import { AI_QUOTA_EXHAUSTED_COPY } from '@/lib/ai-quota'
import {
  AMOUNT_MAX_DIGITS,
  formatAmountDigits,
  parseAmountInput,
  type AmountInputProblem,
} from '@/lib/money/amount-input'
import { amountInputFont } from '@/lib/typography'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { SUBSCRIPTION_LOCK_COPY } from '@/lib/data/renewal'
import { useSubscriptionGate } from '@/components/catetind/subscription-gate-provider'
import { SubscriptionLockNote } from '@/components/catetind/subscription-lock-note'
import { MOCK_RECEIPT_AMOUNT, MOCK_RECEIPT_READ_MS, receiptNoteFromFileName } from '@/lib/transaction-ai'
import {
  EDIT_TRANSACTION_COPY,
  TRANSACTION_CATEGORY_OPTIONS,
  TRANSACTION_FIXED_CATEGORY,
  TRANSACTION_INPUT_COPY,
  TRANSACTION_WALLET_OPTIONS,
  manualCategoryChoice,
  type HistoryTransaction,
} from '@/lib/data/history'
import { CategoryPicker } from '@/components/catetind/category-picker'
import { WalletPicker } from '@/components/catetind/wallet-picker'
import { useMoneyContext } from '@/components/catetind/money-context-provider'
import { usePrivacy } from '@/components/catetind/privacy-provider'
import { defaultWalletNameFor, useMoneyStore, walletOptionsFor } from '@/lib/money/store'
/* ── Transaction Input Engine (inventaris 97a/b/c) ────────────────────────────
   Falsafah "Zero Cognitive Load & 4-Tap Strict Rule": tidak ada menu "mau input
   bagaimana?". Panel langsung membuka form manual — OCR & Voice cuma
   quick-action sekunder di dalam panel yang sama.

   Satu engine, dua shell (biar perilaku mobile & web tidak pernah divergen):
   • layout="sheet"  → di dalam Vaul bottom sheet (TransactionBottomSheet)
   • layout="dialog" → di dalam modal tengah web (TransactionWebModal)

   Sejak paket 03 engine juga melayani MODE EDIT lewat prop `initial`: formnya
   terbuka sudah terisi (pre-filled) sehingga user cuma perlu membetulkan yang
   salah — bukan mengisi ulang dari nol. Mode tambah tidak berubah sama sekali.

   PAKET 42 (audit Stage 5) menambahkan empat hal yang semuanya di file ini:
     1. KUNCI SUBMIT + `clientTxId` → double-tap / Enter-lalu-tap tidak pernah
        jadi dua catatan (kuncinya diteruskan ke store lewat draft);
     2. NOMINAL MANUSIAWI → "2,5jt" = 2.500.000 (dulu 15!), batas 13 digit, dan
        input yang tak terbaca DIKATAKAN, bukan dibuang diam-diam;
     3. CHIP KONFIRMASI → nilai hasil parsing singkatan ditampilkan sebelum
        disimpan ("Rp 2.500.000?");
     4. KUOTA AI HABIS → tombol scan struk & input suara mati dengan penjelasan,
        sementara Catat manual tetap jalan penuh.

   PAKET 44 menahan pesan masalah sampai field ditinggalkan (blur) / submit,
   supaya user tidak dimarahi di tengah ketikan.

   PAKET 53 mengubah DUA hal di field nominal:
     1. TITIK RIBUAN DIRAPIKAN SAAT MENGETIK — field menampilkan `display` dari
        `parseAmountInput()` (bukan teks mentah), jadi "2000000" langsung terbaca
        "2.000.000" dan "2.000000" ikut dirapikan. Aman karena field ini
        `inputMode="numeric"`, ter-center, dan kursor selalu di ujung (lihat
        komentar kebijakan di `lib/money/amount-input.ts`);
     2. TIPOGRAFI — bobot turun dari `font-black` ke resep kanon angka app
        (`AMOUNT_INPUT*` di `lib/typography.ts`), dengan tiga tingkat ukuran yang
        mengecil saat angka makin panjang supaya 13 digit tetap muat di 375 px.
   Blur/submit menormalkan field ke bentuk kanon (`formatAmountDigits`) supaya
   satu nominal hanya punya SATU bentuk di layar — termasuk input singkatan.

   PAKET 54 (uji pemakaian 28 Sep 2026) mencabut TEBAKAN KATEGORI dari jalur
   manual, karena kategori disimpan sebagai fakta tanpa pernah dipilih user dan
   Riwayat jadi penuh kategori karangan:
     1. form TAMBAH punya PEMILIH KATEGORI sendiri — sumbernya hanya
        `TRANSACTION_CATEGORY_OPTIONS` (daftar kanon, satu-satunya yang sah);
     2. badge "AI Suggested" + field `suggested` per tipe DIHAPUS: tidak ada lagi
        kategori yang tampil mengaku hasil AI lalu tersimpan tanpa persetujuan;
     3. form TERTAHAN tanpa pilihan user (tombol Catat nonaktif + petunjuk dari
        `lib/data/history.ts`); `'Lainnya'` tidak pernah dikirim diam-diam —
        kecuali Tabungan/Transfer, yang kategorinya memang aturan dan alasannya
        ditulis di layar (bukan tebakan, bukan pilihan).
   Aturan nilainya tinggal di `manualCategoryChoice()` (`lib/data/history.ts`),
   jadi yang diuji murni & yang dipakai engine adalah aturan yang sama. */

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
  /**
   * Kunci idempotensi aksi tulis (paket 42). Diisi engine untuk mode TAMBAH;
   * shell meneruskannya ke store, dan store menolak baris kedua dengan kunci
   * yang sama — jadi double-tap/Enter-lalu-tap tidak pernah jadi dua catatan.
   * Mode edit sengaja tidak mengirimnya (edit tidak menulis baris baru).
   */
  clientTxId?: string
}

/** mode tampilan stage tengah engine */
type SheetMode = 'manual' | 'ocr' | 'voice'

type TransactionType = {
  id: TransactionTypeId
  label: string
  icon: LucideIcon
  /** kelas pil saat aktif — accent per tipe (plum/olive/cantelope) */
  active: string
}

/**
 * Daftar tipe uang di engine.
 *
 * Field `suggested` DIHAPUS di paket 54: dulu tiap tipe membawa kategori
 * "tebakan AI" (Pengeluaran→Makanan, Pemasukan→Gaji Utama, Tabungan→Dana
 * Darurat) yang ikut TERSIMPAN tanpa user pernah memilihnya. Sekarang kategori
 * datang dari pilihan user (form tambah) atau dari aturan tipe
 * (`TRANSACTION_FIXED_CATEGORY` di `lib/data/history.ts`) — tidak ada tebakan.
 *
 * Chip `transfer` DIHAPUS di paket 55 — keputusannya sengaja (opsi b), bukan
 * lupa:
 *
 *   Engine ini TIDAK PUNYA dompet tujuan (formnya cuma membawa satu nama dompet
 *   dari konteks aktif), jadi chip Transfer di sini menulis baris `transfer` SATU
 *   SISI: uangnya keluar dari dompet dan tidak mendarat di mana pun — persis
 *   keluhan "fitur transfer masih ngambang". Sejak paket 55 store MENOLAK
 *   tulisan seperti itu (`postTransaction` mengembalikan `null` untuk
 *   `type: 'transfer'`), dan chip yang selalu gagal lebih buruk daripada chip
 *   yang tidak ada.
 *
 *   Pintu pindah dana sekarang berada di tempat yang memang punya kedua ujungnya:
 *   sheet `TransferFlow` (dari-dompet → ke-dompet → berapa) yang dibuka dari
 *   popover kartu dompet di /wallet, tombol “Pindah Dana” di /wallet/[id], entri
 *   menu “Lainnya” di bottom nav, dan sidebar desktop. Satu aksi, satu alur.
 */
const TYPES: TransactionType[] = [
  {
    id: 'expense',
    label: 'Pengeluaran',
    icon: TrendingDown,
    active: 'bg-hud-terracotta/[0.12] text-hud-terracotta ring-hud-terracotta/25',
  },
  {
    id: 'income',
    label: 'Pemasukan',
    icon: TrendingUp,
    active: 'bg-sage text-forest ring-forest/15',
  },
  {
    id: 'saving',
    label: 'Tabungan',
    icon: PiggyBank,
    active: 'bg-hud-amber/[0.18] text-[#b89191] ring-hud-amber/40',
  },
]

/**
 * Meta tipe yang TIDAK ditawarkan lagi sebagai pilihan BARU, tapi tetap harus
 * bisa ditampilkan kalau baris yang sedang dibuka MEMANG sudah bertipe itu
 * (mode edit) — paket 55.
 *
 * Alasannya: baris `transfer` yang dibuat lewat alur Pindah Dana tetap bisa
 * dibuka di sheet Edit dari Riwayat. Kalau chipnya hilang sama sekali dari
 * daftar, header tipe di sheet itu tidak menunjukkan apa-apa padahal barisnya
 * jelas-jelas pindah dana — dan menekan chip mana pun di situ berarti mengubah
 * baris pindah dana menjadi catatan belanja (yang melepas dompet lawannya).
 * Karena itu tipenya ditampilkan apa adanya, tapi tidak pernah jadi tawaran.
 */
const RETIRED_TYPES: TransactionType[] = [
  {
    id: 'transfer',
    label: 'Transfer',
    icon: ArrowLeftRight,
    active: 'bg-hud-sage/[0.3] text-forest ring-hud-sage/50',
  },
]

/**
 * SEMUA tipe yang tersedia di engine. Dipakai sebagai nilai default prop
 * `types`, jadi shell yang tidak peduli urusan ini tidak berubah perilakunya.
 */
const ALL_TYPE_IDS: readonly TransactionTypeId[] = TYPES.map((item) => item.id)

/**
 * Kelas kolom sesuai jumlah tipe yang DITAWARKAN shell.
 *
 * Sengaja peta kelas literal (bukan `grid-cols-${n}` atau `style`): kelas yang
 * dirakit dinamis tidak terlihat oleh pemindai Tailwind, dan nilai yang tidak
 * ada di peta jatuh ke 4 kolom — grid tetap rapi walau daftarnya keliru.
 */
const TYPE_COLUMNS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

/** tinggi tiap bar gelombang suara (px) — mode voice */
const WAVE = [10, 20, 32, 18, 26, 14, 22]
/**
 * Lama kunci submit (paket 42). Cukup lama untuk menelan double-tap & Enter-tap,
 * cukup pendek supaya tombol tidak terasa "nyangkut" kalau shell-nya tidak
 * menutup panel (mis. dari halaman Joint yang membiarkan sheet terbuka).
 */
const SUBMIT_LOCK_MS = 600

/** masalah input nominal → kalimat yang menyebut jalan keluarnya (`lib/data/history.ts`) */
function amountProblemCopy(problem: AmountInputProblem): string {
  switch (problem) {
    case 'tooBig':
      return TRANSACTION_INPUT_COPY.amountTooBig(AMOUNT_MAX_DIGITS)
    case 'negative':
      return TRANSACTION_INPUT_COPY.amountNegative
    case 'fraction':
      return TRANSACTION_INPUT_COPY.amountFraction
    default:
      return TRANSACTION_INPUT_COPY.amountUnsupported
  }
}

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
  'w-full rounded-xl bg-soil/[0.09] px-3 py-2.5 text-[12.5px] font-medium text-forest outline-none ring-1 ring-transparent transition-all focus:bg-cream focus:ring-forest/15'

export function TransactionInputEngine({
  active,
  defaultType = 'expense',
  layout = 'sheet',
  initial = null,
  onSubmitted,
  sourceLabel,
  extraFields,
  onAmountChange,
  onTransferRequest,
  types = ALL_TYPE_IDS,
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
  /**
   * Pintu "Pindah Dana" (paket 70). Dikirim = pill Pindah Dana ikut tampil di
   * baris tipe, dan menekannya HANYA memanggil callback ini — shell yang menutup
   * panelnya lalu membuka alur pindah dana yang sebenarnya (`TransferFlow` →
   * `postTransfer`, satu baris dua sisi).
   *
   * Kenapa bukan "tipe keempat" di engine: form ini cuma punya SATU dompet
   * (sumber), sedangkan pindah dana wajib punya dompet TUJUAN. Kalau engine
   * menulis tipe `transfer` sendiri, uangnya keluar tanpa mendarat di mana pun —
   * persis bug "transfer ngambang" yang ditutup paket 55. Jadi pintunya
   * diarahkan, bukan diduplikasi: satu aksi, satu alur tulis.
   *
   * Shell yang tidak mengirim prop ini (kalender, joint, edit) berperilaku persis
   * seperti sebelumnya — tidak ada pill baru.
   */
  onTransferRequest?: () => void
  /**
   * Tipe yang DITAWARKAN shell ini (paket 49). Default = ketiga tipe uang yang
   * memang bisa dicatat dari form ini (Pengeluaran/Pemasukan/Tabungan), jadi
   * shell lama tetap berperilaku sama.
   *
   * PAKET 55: `transfer` TIDAK PERNAH ditawarkan — form ini tidak punya dompet
   * tujuan, jadi catatan transfer dari sini selalu sepihak (uang keluar tanpa
   * mendarat di dompet mana pun). Pindah dana punya alurnya sendiri
   * (`TransferFlow`) yang menanyakan dompet asal DAN tujuan. Halaman Kalender
   * memakai prop ini untuk membatasi catatannya ke pemasukan & pengeluaran.
   *
   * Dikirim sebagai array KONSTAN (bukan literal di dalam render) supaya
   * identitasnya stabil — engine memakai nilai ini sebagai dependensi effect
   * reset form.
   */
  types?: readonly TransactionTypeId[]
}) {
  const isDialog = layout === 'dialog'
  const isEdit = initial !== null
  /* Masa aktif habis → engine ini pintu input uang, jadi tombol "Catat" mati.
     Ditempel DI ENGINE, bukan di tiap shell (bottom sheet, modal web, joint,
     kalender, edit transaksi), supaya nol titik yang bisa terlewat. Form-nya
     tetap bisa dibuka & dibaca — yang berhenti hanya penyimpanannya. */
  const { inputLocked } = useSubscriptionGate()
  /* Kuota AI yang BENAR-BENAR terpakai (paket 42): dua quick-action di stage ini
     (scan struk & input suara) memang memanggil AI, jadi keduanya mati saat kuota
     habis — dengan penjelasan, dan TANPA mengunci pencatatan manual. */
  const quota = useAiQuota()
  const quotaExhausted = quota.exhausted
  /* PAKET 69 - SUMBER DOMPET: daftar dompet datang dari LEDGER nyata
     (`walletOptionsFor`) + konteks uang aktif, bukan konstanta mock: dompet yang
     baru ditambahkan user langsung muncul, yang sudah dihapus tidak pernah
     ditawarkan lagi. Saldonya ikut tombol mata privasi global. */
  const walletSnapshot = useMoneyStore()
  const { context } = useMoneyContext()
  const { masked } = usePrivacy()
  const pickerWalletOptions = useMemo(() => walletOptionsFor(walletSnapshot), [walletSnapshot])
  const contextDefaultWallet = useMemo(() => defaultWalletNameFor(context), [context])

  const [typeId, setTypeId] = useState<TransactionTypeId>(defaultType)
  /**
   * Apa yang benar-benar diketik user — digit, titik ribuan, atau singkatan.
   *
   * PAKET 53: isi state ini adalah `display` dari parser (bukan teks mentah
   * DOM), jadi titik ribuan sudah rapi di sini: "2000000" → "2.000.000".
   * Singkatan ("2,5jt") & input bermasalah sengaja tetap mentah (lihat
   * kebijakan di `lib/money/amount-input.ts`).
   */
  const [amountText, setAmountText] = useState('')
  /**
   * Field nominal sudah DITINGGALKAN (blur) atau submit sudah dicoba?
   *
   * PAKET 44 — "jangan marah saat user masih mengetik". Sebelumnya pesan masalah
   * muncul di setiap ketikan, sehingga mengetik "25.000" berhenti di "25." atau
   * "2,5" dan langsung teriak "Nominalnya belum kebaca" padahal user baru setengah
   * jalan. Sekarang `problem` hanya DIKATAKAN setelah:
   *   · user meninggalkan field (blur) — di situ ia memang sudah selesai mengetik, atau
   *   · user menekan Catat/Enter (submit) — di situ ia perlu tahu kenapa tertahan.
   * Ketikan berikutnya melepas penanda ini lagi (`handleAmountChange`), jadi begitu
   * user membetulkan angkanya, pesan lama tidak menempel di layar.
   */
  const [amountSettled, setAmountSettled] = useState(false)
  const [note, setNote] = useState('')
  /* tiga field yang HANYA hidup di mode edit — nilainya dari transaksi aslinya */
  const [category, setCategory] = useState('')
  const [wallet, setWallet] = useState('')
  const [date, setDate] = useState('')
  const [mode, setMode] = useState<SheetMode>('manual')
  /** tombol Catat sedang memproses satu penyimpanan (paket 42) */
  const [submitting, setSubmitting] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  /* fokus pemilih kategori — dipakai saat Enter ditekan tanpa kategori dipilih */
  const categoryRef = useRef<HTMLSelectElement>(null)
  const mockTimer = useRef<number | null>(null)
  /**
   * KUNCI SUBMIT (paket 42) — sengaja `ref`, bukan state: dua pemanggilan
   * SINKRON dalam satu tick (Enter di keyboard numerik lalu tap tombol, atau
   * double-tap cepat) membaca state yang BELUM di-render ulang, jadi `useState`
   * saja tidak cukup menutup lubang itu.
   */
  const submitLock = useRef(false)
  const unlockTimer = useRef<number | null>(null)
  /**
   * KUNCI IDEMPOTENSI aksi tulis — dibuat sekali per PEMBUKAAN panel dan
   * diteruskan ke store lewat draft. Jadi tap kedua (walau lolos kunci) tetap
   * ditolak sebagai pengulangan, bukan jadi catatan kedua.
   */
  const clientTxId = useRef('')

  /* tipe yang benar-benar ditawarkan shell ini (default: Pengeluaran/Pemasukan/Tabungan) */
  const typeOptions = useMemo(
    () => TYPES.filter((item) => types.includes(item.id)),
    [types],
  )
  /* daftar kosong = kesalahan pemanggil, bukan alasan panel kosong: engine jatuh
     ke daftar penuh supaya pintu input tidak pernah mati tanpa penjelasan */
  const offeredTypes = typeOptions.length > 0 ? typeOptions : TYPES
  /**
   * Yang benar-benar DIRENDER: tawaran shell, ditambah tipe baris yang sedang
   * diedit kalau tipe itu sudah tidak ditawarkan lagi (`RETIRED_TYPES` — paket
   * 55). Tanpa ini, membuka baris pindah dana di sheet Edit akan menampilkan
   * pemilih tipe tanpa satu pun chip aktif.
   */
  const visibleTypes = useMemo(() => {
    const current = initial ? RETIRED_TYPES.find((item) => item.id === initial.type) : undefined
    if (!current) return offeredTypes
    if (offeredTypes.some((item) => item.id === current.id)) return offeredTypes
    return [...offeredTypes, current]
  }, [initial, offeredTypes])

  /* Pintu Pindah Dana ikut SATU BARIS dengan tipe (paket 70): shell yang
     mengirim `onTransferRequest` mendapat pill tambahan. Di MODE EDIT pill ini
     sengaja tidak tampil — yang diurus di situ justru koreksi baris lama. */
  const showTransferDoor = !isEdit && Boolean(onTransferRequest)
  const typeColumnCount = visibleTypes.length + (showTransferDoor ? 1 : 0)

  /* `type` (objek tipe terpilih) TIDAK LAGI dihitung di sini (paket 54): satu-
     satunya yang pernah dibacanya adalah `type.suggested` (kategori tebakan),
     dan itu sudah dihapus. Yang dibutuhkan sekarang `typeId` — kategori tetapnya
     datang dari `TRANSACTION_FIXED_CATEGORY`. */
  /* NOMINAL: parsing manusiawi (paket 42) — "1,5jt" = 1.500.000, bukan Rp 15.
     Sejak paket 53 yang DIHITUNG dan yang DITAMPILKAN sama-sama dari hasil
     parsing ini: `display`-nya yang dipasang ke field, jadi titik ribuan rapi
     saat mengetik. */
  const amountInput = parseAmountInput(amountText)
  const amount = amountInput.amount ?? 0
  const amountProblem = amountInput.problem
  /**
   * Masalah nominal baru "bicara" setelah blur/submit (paket 44) — bukan di tiap
   * ketikan. Ketikan berikutnya menutupnya lagi (`setAmountSettled(false)` di
   * `handleAmountChange`), karena saat itu user sedang membetulkan, bukan butuh
   * diingatkan ulang.
   */
  const showAmountProblem = amountProblem !== null && amountSettled
  /**
   * CHIP KONFIRMASI ("Rp 1.500.000?") — muncul saat `shorthand` (rb/jt, user harus
   * melihat angka penuhnya) ATAU saat field sudah ditinggalkan dengan angka yang
   * sah. Jadi nominal apa pun yang baru di-blur selalu bisa dicek sekali lagi
   * sebelum disimpan — termasuk angka biasa yang tidak lewat singkatan.
   */
  const showAmountConfirm =
    amountInput.amount !== null &&
    amountInput.amount > 0 &&
    (amountInput.shorthand || (amountSettled && amountProblem === null))
  const display = amountInput.display
  /* KATEGORI (paket 54): form TAMBAH tidak menebak. Nilainya = pilihan user,
     kecuali tipe yang kategorinya memang aturan (Tabungan/Transfer) — lihat
     `TRANSACTION_FIXED_CATEGORY`. Aturan "apa yang boleh tersimpan" tinggal di
     `manualCategoryChoice()` (`lib/data/history.ts`) dan diuji murni di sana. */
  const fixedCategory = TRANSACTION_FIXED_CATEGORY[typeId]
  const categoryChoice = manualCategoryChoice({
    editing: isEdit,
    type: typeId,
    picked: category,
    currentCategory: initial?.category,
  })
  /**
   * Petunjuk "pilih kategori dulu" — baru muncul saat form selebihnya sudah
   * siap (nominal sudah diketik/ditinggalkan). Sebelum itu user belum selesai
   * dengan langkah pertamanya, jadi tidak ada yang perlu dimarahi (sama seperti
   * kebijakan pesan nominal di paket 44).
   */
  const showCategoryNeeded = categoryChoice.needsChoice && (amountSettled || amount > 0)

  /* PAKET 69 - DOMPET. Tiga keadaan, dan bedanya penting: (1) shell yang SUDAH
     menetapkan dompetnya (tombol Catat di halaman dompet / Joint) mengirim
     `sourceLabel` - dompetnya tetap, tidak ditanyakan lagi; (2) form TAMBAH
     biasa - user memilih sendiri, belum memilih = form tertahan; (3) mode EDIT -
     dompet data lama, selalu ada. `decidedWallet` yang dikirim ke store, jadi
     yang tampil di form mustahil berbeda dari yang bergerak saldonya. */
  const walletIsFixed = !isEdit && Boolean(sourceLabel)
  const decidedWallet = walletIsFixed ? (sourceLabel ?? '') : wallet
  const walletNeeded = !isEdit && decidedWallet.trim().length === 0
  const showWalletNeeded = walletNeeded && (amountSettled || amount > 0)
  /* daftar pilihan kategori & dompet: nilai lama yang tidak ada di daftar kanon
     (mis. kategori 'Proyek' dari halaman Dompet Detail) DITAMBAHKAN sebagai
     opsi — tanpa itu, sekadar membuka sheet edit akan diam-diam mengubah data
     user jadi kategori lain. */
  const categoryOptions = withCurrentValue(TRANSACTION_CATEGORY_OPTIONS, initial?.category)
  const walletOptions = withCurrentValue(TRANSACTION_WALLET_OPTIONS, initial?.wallet)
  /* font menyesuaikan panjang angka — memakai banyak DIGIT (bukan panjang string:
     titik ribuan ikut terhitung di `display`) dan token dari `lib/typography.ts`,
     jadi tidak ada lagi ukuran/bobot karangan di file ini (paket 53). */
  const amountFont = amountInputFont(amountText.replace(/\D/g, '').length)

  function clearMock() {
    if (mockTimer.current !== null) {
      window.clearTimeout(mockTimer.current)
      mockTimer.current = null
    }
  }

  /**
   * Lepas kunci submit. Dipanggil sengaja dua kali: (1) setelah jeda aman
   * (`SUBMIT_LOCK_MS`) supaya tombol tidak terkunci selamanya kalau shell-nya
   * ternyata tidak menutup panel, dan (2) saat panel dibuka lagi. Yang membuat
   * catatan ganda mustahil tetap `clientTxId`, bukan timer ini.
   */
  function releaseSubmitLock() {
    if (unlockTimer.current !== null) {
      window.clearTimeout(unlockTimer.current)
      unlockTimer.current = null
    }
    submitLock.current = false
    setSubmitting(false)
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
    /* tipe awal: tipe data lama (mode edit) atau default shell. Kalau default
       shell tidak ditawarkan di panel ini (mis. kalender yang cuma punya
       pemasukan & pengeluaran), pakai tipe pertama yang memang ada — panel
       tidak pernah terbuka dalam keadaan tanpa tipe terpilih (paket 49). */
    const starterType = offeredTypes.some((item) => item.id === defaultType)
      ? defaultType
      : offeredTypes[0].id
    setTypeId(initial?.type ?? starterType)
    /* nominal dari data lama diformat ribuan ("1.500.000") supaya bisa dibaca
       sekilas, persis seperti yang tampil setelah user mengetiknya sendiri */
    setAmountText(initial ? parseAmountInput(String(initial.amount)).display : '')
    /* panel baru dibuka = belum ada masalah nominal yang perlu diumumkan; pesan
       /chip konfirmasi hanya muncul setelah user blur atau menekan Catat (paket 44) */
    setAmountSettled(false)
    setNote(initial?.name ?? '')
    setCategory(initial?.category ?? '')
    /* mode TAMBAH: dompet mulai dari dompet DEFAULT konteks uang aktif (dulu
       nilai ini tidak pernah tampil di form - paket 69). Konteks yang belum
       punya dompet menjawab '', dan pemilihnya yang meminta user memilih; mode
       EDIT tetap memakai dompet data lamanya apa adanya. */
    setWallet(initial?.wallet ?? contextDefaultWallet)
    setDate(initial?.date ?? '')
    setMode('manual')
    releaseSubmitLock()
    /* kunci idempotensi BARU tiap panel dibuka; di mode edit dibiarkan kosong
       karena mode edit tidak pernah menulis baris baru (lihat `useTransactionSubmit`) */
    clientTxId.current = initial ? '' : newClientTxId()
    if (initial) return
    const id = window.setTimeout(() => amountRef.current?.focus(), 110)
    return () => window.clearTimeout(id)
  }, [active, defaultType, initial, offeredTypes])

  /* buang timer mock & timer kunci saat unmount supaya tidak setState di
     komponen yang sudah mati */
  useEffect(
    () => () => {
      clearMock()
      if (unlockTimer.current !== null) window.clearTimeout(unlockTimer.current)
    },
    [],
  )

  /**
   * Setiap ketikan = titik ribuan dirapikan (paket 53).
   *
   * Yang dipasang ke field adalah `display` hasil parser, bukan teks mentah DOM:
   * "2000000" → "2.000.000", "2.000000" → "2.000.000" (titik lama dibuang lalu
   * dikelompokkan ulang). Singkatan & input bermasalah tetap apa adanya — lihat
   * kebijakan panjang di `lib/money/amount-input.ts` (termasuk syarat "kursor
   * selalu di ujung" yang membuat ini aman).
   *
   * PAKET 44 tetap berlaku: masalah nominal belum diumumkan di sini, karena user
   * masih mengetik (pesannya baru muncul saat blur/submit).
   */
  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    const next = parseAmountInput(event.target.value)
    setAmountText(next.display)
    /* user masih mengetik → masalah nominal belum diumumkan (baru saat blur/submit) */
    setAmountSettled(false)
    /* laporan ke shell luar (opsional) — dipakai Split Bill Sheet halaman Joint
       Wallet untuk tahu total yang sedang dibagi, tanpa mengubah perilaku
       shell lama yang tidak mengirim prop ini. */
    onAmountChange?.(next.amount ?? 0)
  }

  /**
   * Field ditinggalkan = momen MENORMALKAN + momen JUJUR (paket 44 & 53):
   *   · nominal yang sah dirapikan ke BENTUK KANON (`formatAmountDigits`), jadi
   *     singkatan pun berubah jadi digit bergrup — "2jt" → "2.000.000" — dan
   *     satu angka hanya punya satu bentuk di layar;
   *   · masalah input (kalau ada) baru dikatakan di sini, bersamaan dengan chip
   *     konfirmasi yang menampilkan angka yang akan disimpan.
   */
  function handleAmountBlur() {
    setAmountSettled(true)
    const next = parseAmountInput(amountText)
    if (next.problem) return
    setAmountText(next.amount === null ? next.display : formatAmountDigits(next.amount))
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
    /* Kuota AI habis = AI tidak bisa membaca struk. Tombolnya memang sudah mati,
       tapi guard ini menjaga jalur lain (mis. Enter) tetap jujur. */
    if (quotaExhausted) {
      toast(AI_QUOTA_EXHAUSTED_COPY.ocrOff)
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
      setAmountText(parseAmountInput(String(MOCK_RECEIPT_AMOUNT)).display)
      /* hasil AI dipasang sudah "settled": chip konfirmasi langsung tampil supaya
         user melihat angka yang benar-benar akan disimpan (paket 44) — nominal dari
         mesin justru yang paling perlu dikonfirmasi manusia. */
      setAmountSettled(true)
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
    /* alasan yang sama dengan OCR: mengaku "mendengar" padahal kuota AI habis
       adalah janji yang tidak bisa ditepati */
    if (quotaExhausted) {
      toast(AI_QUOTA_EXHAUSTED_COPY.voiceOff)
      return
    }
    clearMock()
    setMode('voice')
    mockTimer.current = window.setTimeout(() => {
      setAmountText(parseAmountInput('25000').display) // hasil "beli kopi 25 ribu"
      /* sama seperti OCR: hasil mesin langsung "settled" → chip konfirmasi tampil */
      setAmountSettled(true)
      onAmountChange?.(25000)
      setNote('Beli kopi')
      setMode('manual')
      amountRef.current?.focus()
    }, 3000)
  }

  /**
   * ANTI-BLOCKING (Domain 2A.4): serahkan payload 0ms → haptic → (shell menutup
   * panel & menembak toast). Tidak ada modal sukses full-screen, tidak ada
   * `await`, tidak ada spinner.
   *
   * PAKET 33: engine BERHENTI di menyerahkan payload. Toast sukses TIDAK lagi
   * ditembak dari sini — engine tidak tahu apakah catatannya tersimpan, dan dulu
   * itulah sumber klaim "kecatat" yang tidak benar. Shell yang menyimpannya
   * (`useTransactionSubmit` → `recordDraftTransaction`) yang menembak toast,
   * memakai copy dari `lib/data/history.ts`. Kalau ada shell baru: pakai hook
   * yang sama, jangan menembak sukses sendiri.
   */
  function handleSubmit() {
    /* TIGA lapis penjaga (paket 42 — audit #1):
         1. kunci SUBMIT sinkron di sini (Enter di keyboard numerik memanggil
            fungsi ini langsung, jadi guard-nya tidak boleh hanya di markup);
         2. `clientTxId` yang sama untuk satu pembukaan panel → store menolak
            baris kembar walau tap kedua lolos;
         3. tombolnya `disabled` selama `submitting` (umpan balik visual). */
    if (submitLock.current || submitting) return

    if (inputLocked) {
      toast(SUBSCRIPTION_LOCK_COPY.inputHint)
      return
    }

    /* Input nominal yang tidak terbaca DIKATAKAN, bukan dibuang diam-diam.
       PAKET 44: submit = salah satu momen sah untuk mengumumkan masalah, jadi
       penandanya dipasang lebih dulu supaya kalimatnya ikut tampil di field
       (bukan cuma lewat toast yang bisa lewat begitu saja). */
    if (amountProblem) {
      setAmountSettled(true)
      toast(amountProblemCopy(amountProblem))
      amountRef.current?.focus()
      return
    }

    if (amount <= 0) {
      // guard lembut — tetap non-blocking, panel sengaja TIDAK ditutup
      toast(TRANSACTION_INPUT_COPY.amountNeeded)
      amountRef.current?.focus()
      return
    }

    /* FORM TAMBAH: kategori = PILIHAN USER (paket 54). Tombolnya memang sudah
       nonaktif selama belum ada pilihan, tapi Enter di keyboard numerik memanggil
       fungsi ini langsung — jadi penjaganya harus hidup di sini juga. Panelnya
       TIDAK ditutup dan formnya tidak dikosongkan: user tinggal memilih.
       (Mode edit tidak pernah sampai ke sini: kategorinya sudah ada di data.) */
    const chosenCategory = categoryChoice.category
    if (chosenCategory === null) {
      toast(TRANSACTION_INPUT_COPY.categoryNeeded)
      categoryRef.current?.focus()
      return
    }

    /* Sumber dompet juga wajib jelas (paket 69): kalau konteks uang belum punya
       dompet & user belum memilih, formnya DITAHAN dengan arahan - bukan
       menempel ke dompet lain diam-diam (pagar paket 59 yang sekarang terlihat
       di form, bukan cuma di toast shell). */
    if (walletNeeded) {
      toast(TRANSACTION_INPUT_COPY.walletNeeded)
      return
    }

    /* Bentuk kanon juga saat submit (paket 53): panel biasanya langsung ditutup,
       tapi jalur yang membiarkannya terbuka (submit gagal di store, mode edit,
       Enter di keyboard) tetap menampilkan satu bentuk angka saja. */
    setAmountText(formatAmountDigits(amount))

    /* kunci dipasang SEBELUM `onSubmitted` — di sinilah double-tap dulu lolos */
    submitLock.current = true
    setSubmitting(true)
    unlockTimer.current = window.setTimeout(releaseSubmitLock, SUBMIT_LOCK_MS)

    /* MODE EDIT: engine berhenti di menyampaikan hasil. Toast "Sip, udah dicatet!"
       justru salah di sini (catatannya lama, bukan baru) dan pujian yang tidak
       nyambung bikin app terasa tidak mendengarkan — jadi yang tampil adalah
       toast "diperbarui" dari halaman pemanggil. Haptiknya tetap sama. */
    if (initial) {
      onSubmitted({
        amount,
        note: note.trim() || initial.name,
        type: typeId,
        category: chosenCategory || initial.category,
        wallet: wallet || initial.wallet,
        date: date || initial.date,
      })
      haptic([30, 50, 30])
      return
    }

    /* Kategori yang dikirim = pilihan user (form TAMBAH) atau kategori tetap
       tipe (Tabungan/Transfer) — tidak pernah tebakan lagi (paket 54). Nilainya
       dijamin salah satu kategori kanon oleh `manualCategoryChoice()`, jadi
       barisnya pasti terjaring filter kategori di Riwayat.
       `clientTxId` = kunci idempotensi aksi tulis ini (paket 42). */
    onSubmitted({
      amount,
      note: note.trim(),
      type: typeId,
      category: chosenCategory,
      /* dompet PILIHAN USER (paket 69): dikirim eksplisit supaya dompet yang
         terlihat di form = dompet yang saldonya bergerak */
      wallet: decidedWallet,
      clientTxId: clientTxId.current,
    })
    haptic([30, 50, 30]) // getar fisik sukses — bonus, bukan syarat (lihat `haptic`)

    /* Catatan: form TIDAK dikosongkan di sini. Reset dilakukan di effect saat
       panel dibuka lagi, supaya animasi tutup tetap menampilkan nominal yang
       barusan dicatat — kalau dibersihkan sekarang, angkanya berkedip.

       Toast & penutupan panel dipegang shell (lihat doc di atas fungsi ini). */
  }

  return (
    <div className="flex flex-col">
      {/* sumber dana terpilih (opsional) — halaman Joint Wallet memakai ini untuk
          menegaskan dompet bersama sudah otomatis jadi sumber transaksi */}
      {sourceLabel && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-hud-sage/15 px-3.5 py-2.5 text-[12px] font-medium text-forest ring-1 ring-hud-sage/30">
          <Wallet className="size-3.5" strokeWidth={2.4} />
          Dompet: {sourceLabel}
        </div>
      )}

      {/* ── 1. TYPE SELECTOR — satu baris horizontal ────────────────────────
          Pengeluaran DEFAULT (accent terracotta). Tap langsung, tanpa menu
          "mau input bagaimana". Jumlah pilnya mengikuti tipe yang ditawarkan
          shell (default 3; kalender cuma 2 — paket 49). */}
      <div
        className={cn(
          'grid',
          TYPE_COLUMNS[typeColumnCount] ?? 'grid-cols-4',
          isDialog ? 'gap-2.5' : 'gap-2',
        )}
      >
        {visibleTypes.map((item) => {
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
                  ? cn('font-medium ring-1', item.active)
                  : 'bg-soil/[0.09] font-medium text-forest/45 hover:bg-soil/[0.09]',
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

        {/* ── PINTU PINDAH DANA (paket 70) ───────────────────────────────────
            Pill ini BUKAN tipe transaksi: ia tidak mengubah form, ia memindahkan
            user ke alur yang memang punya DUA ujung (dompet asal → dompet tujuan).
            Jadi tidak ada satu pun jalur tulis transfer yang lahir di sini — dan
            karena alur itu menulis lewat `postTransfer()`, saldo dua dompet +
            Riwayat + kartu Home bergerak bersamaan. */}
        {showTransferDoor && (
          <button
            type="button"
            onClick={() => onTransferRequest?.()}
            aria-label={TRANSACTION_INPUT_COPY.transferDoorHint}
            title={TRANSACTION_INPUT_COPY.transferDoorHint}
            className={cn(
              'flex flex-col items-center justify-center',
              'transition-all duration-150 active:scale-[0.96]',
              isDialog ? 'gap-1.5 rounded-2xl px-2 py-3.5' : 'gap-1 rounded-2xl px-1 py-2.5',
              'bg-soil/[0.09] font-medium text-forest/45 hover:bg-soil/[0.09]',
            )}
          >
            <ArrowLeftRight className={isDialog ? 'size-5' : 'size-[18px]'} strokeWidth={2.1} />
            <span
              className={cn(
                'leading-none whitespace-nowrap',
                isDialog ? 'text-[11.5px]' : 'text-[10.5px]',
              )}
            >
              {TRANSACTION_INPUT_COPY.transferDoorLabel}
            </span>
          </button>
        )}
      </div>

      {/* ── 2. STAGE — manual ⇄ OCR loading ⇄ voice listening ─────────── */}
      <div
        className={cn(
          'mt-4 flex flex-col justify-center',
          /* saat ada field tambahan (halaman Joint), stage diringkas supaya
             tombol Catat & opsi pembagian tetap muat satu layar tanpa scroll */
          extraFields
            ? isDialog
              ? 'min-h-[150px]'
              : 'min-h-[140px]'
            : isDialog
              ? 'min-h-[210px]'
              : 'min-h-[188px]',
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
                  benar-benar center panel, bukan center area sisa.
                  Tinggi baris DIPAKU (`min-h`) dan isinya di-center: ukuran font
                  mengecil saat angka makin panjang (paket 53), jadi tanpa paku ini
                  chip bantuan di bawahnya ikut naik-turun tiap digit. */}
              <div
                className={cn(
                  'flex w-full items-center justify-center gap-2',
                  isDialog ? 'min-h-[3.25rem]' : 'min-h-[2.75rem] sm:min-h-[3.25rem]',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    /* bobot prefix sengaja setara nominal (semibold, bukan bold):
                       angka di sampingnya kini semibold, dan prefix yang lebih
                       tebal dari nominalnya justru bikin mata tertarik ke "Rp" */
                    'w-9 shrink-0 text-right font-medium text-forest/25',
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
                  onBlur={handleAmountBlur}
                  onKeyDown={handleAmountKeyDown}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="0"
                  aria-label="Nominal transaksi"
                  aria-invalid={showAmountProblem || undefined}
                  aria-describedby="tx-amount-help"
                  className={cn(
                    /* TIPOGRAFI NOMINAL (paket 53): kelas datang dari token
                       `lib/typography.ts` (`AMOUNT_INPUT*` lewat `amountInputFont`)
                       — bukan `font-black tracking-tighter` seperti dulu, karena
                       input yang sedang diketik harus terasa ringan sementara
                       identitas angka app ini semibold. */
                    'min-w-0 flex-1 bg-transparent text-center text-forest outline-none',
                    'placeholder:text-forest/15',
                    amountFont,
                  )}
                />
                <span aria-hidden className="w-9 shrink-0" />
              </div>

              {/* ── BANTUAN NOMINAL (paket 42, disetel ulang paket 44) ─────────
                  Tiga keadaannya saling menggantikan, sesuai isi field:
                    1. belum ada masalah → petunjuk singkatan + batas digit;
                    2. input tidak terbaca **dan** field sudah ditinggalkan /
                       submit dicoba → KALIMAT masalahnya. Selama user masih
                       mengetik, kalimat ini sengaja TIDAK muncul (paket 44);
                    3. hasil parsing singkatan, atau field baru di-blur dengan
                       angka sah → chip konfirmasi "Rp 2.500.000?" supaya user
                       melihat angka yang benar-benar akan disimpan. */}
              {showAmountProblem ? (
                <p
                  id="tx-amount-help"
                  role="alert"
                  className={cn(
                    'mt-2.5 max-w-[20rem] text-center leading-relaxed text-hud-terracotta',
                    isDialog ? 'text-[12.5px]' : 'text-[11.5px]',
                  )}
                >
                  {amountProblemCopy(amountProblem)}
                </p>
              ) : showAmountConfirm ? (
                <p
                  id="tx-amount-help"
                  className={cn(
                    'mt-2.5 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-sage/40 px-3 py-1.5 font-medium text-forest ring-1 ring-mint/40',
                    isDialog ? 'text-xs' : 'text-[11.5px]',
                  )}
                >
                  {TRANSACTION_INPUT_COPY.amountConfirm(amount)}
                  <span className="font-medium text-forest/55">
                    {TRANSACTION_INPUT_COPY.amountConfirmHint}
                  </span>
                </p>
              ) : (
                <p
                  id="tx-amount-help"
                  className={cn(
                    'mt-2.5 text-center leading-relaxed text-forest/40',
                    isDialog ? 'text-[12px]' : 'text-[11px]',
                  )}
                >
                  {TRANSACTION_INPUT_COPY.amountHint(AMOUNT_MAX_DIGITS)}
                </p>
              )}

              {/* ── KATEGORI (paket 54) ────────────────────────────────────────
                  Form TAMBAH TIDAK menebak kategori lagi. Dua wujudnya:
                    • tipe yang punya pilihan (Pengeluaran/Pemasukan) → pemilih
                      kategori, sumbernya hanya `TRANSACTION_CATEGORY_OPTIONS`;
                      belum memilih = form tertahan (tombol Catat nonaktif);
                    • tipe yang kategorinya memang ATURAN (Tabungan/Transfer) →
                      kategori tetapnya disebut apa adanya + alasannya, jadi tidak
                      ada kontrol mati dan tidak ada tebakan yang disembunyikan.
                  Di mode edit blok ini tidak tampil: nilainya sudah ada di data
                  dan dikoreksi lewat field Kategori di bawah. */}
              {!isEdit && (
                <div className="mt-4 w-full text-left">
                  {fixedCategory ? (
                    <div className="rounded-2xl bg-cream px-3.5 py-2.5 ring-1 ring-soil/12">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-forest">
                        <Tag className="size-3.5 shrink-0 text-forest" strokeWidth={2.3} aria-hidden />
                        {TRANSACTION_INPUT_COPY.categoryLabel}
                        <span className="inline-flex items-center rounded-full bg-sage px-2.5 py-0.5 text-[11.5px] font-medium text-forest">
                          {fixedCategory.category}
                        </span>
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-forest/45">
                        {fixedCategory.reason}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* PAKET 69: kategori dipilih lewat CategoryPicker 3
                          layer (Quick Pick -> 9 grup -> fuzzy search). Nilainya
                          TETAP kategori kanon yang sama (paket 54); yang berubah
                          cuma cara memilihnya. Varian mengikuti tipe:
                          Pengeluaran pakai 9 grup, Pemasukan pakai 7 chips. */}
                      <EditField label={TRANSACTION_INPUT_COPY.categoryLabel}>
                        <CategoryPicker
                          value={category}
                          onChange={setCategory}
                          variant={typeId === 'income' ? 'income' : 'expense'}
                          invalid={showCategoryNeeded}
                          describedBy="tx-category-help"
                          ariaLabel={TRANSACTION_INPUT_COPY.categoryLabel}
                        />
                      </EditField>
                      <p
                        id="tx-category-help"
                        className={cn(
                          'mt-1.5 text-[11px] leading-relaxed',
                          showCategoryNeeded ? 'font-medium text-forest/70' : 'text-forest/45',
                        )}
                      >
                        {showCategoryNeeded
                          ? TRANSACTION_INPUT_COPY.categoryNeeded
                          : TRANSACTION_INPUT_COPY.categoryHint}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* PAKET 69 - SUMBER DOMPET: form TAMBAH sekarang menanyakan
                  dompetnya (dulu tidak ada, jadi user tidak pernah tahu uangnya
                  keluar dari mana). Kalau shell sudah menetapkannya
                  (`sourceLabel`), yang tampil baris TETAP + alasannya - bukan
                  pemilih mati tanpa penjelasan. */}
              {!isEdit && (
                <div className="mt-4 w-full text-left">
                  {walletIsFixed ? (
                    <div className="rounded-2xl bg-cream px-3.5 py-2.5 ring-1 ring-soil/12">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-forest">
                        <Wallet className="size-3.5 shrink-0 text-forest" strokeWidth={2.3} aria-hidden />
                        {TRANSACTION_INPUT_COPY.walletLabel}
                        <span className="inline-flex items-center rounded-full bg-sage px-2.5 py-0.5 text-[11.5px] font-medium text-forest">
                          {sourceLabel}
                        </span>
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-forest/45">
                        {TRANSACTION_INPUT_COPY.walletHint}
                      </p>
                    </div>
                  ) : (
                    <>
                      <EditField label={TRANSACTION_INPUT_COPY.walletLabel}>
                        <WalletPicker
                          value={wallet}
                          options={pickerWalletOptions}
                          onChange={setWallet}
                          masked={masked}
                          invalid={showWalletNeeded}
                          describedBy="tx-wallet-help"
                        />
                      </EditField>
                      <p
                        id="tx-wallet-help"
                        className={cn(
                          'mt-1.5 text-[11px] leading-relaxed',
                          showWalletNeeded ? 'font-medium text-forest/70' : 'text-forest/45',
                        )}
                      >
                        {showWalletNeeded
                          ? TRANSACTION_INPUT_COPY.walletNeeded
                          : TRANSACTION_INPUT_COPY.walletHint}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* catatan opsional — satu baris, tidak wajib diisi */}
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Catatan (Opsional)"
                aria-label="Catatan transaksi (opsional)"
                className="mt-4 h-12 w-full rounded-2xl bg-soil/[0.09] px-4 text-[13.5px] font-medium text-forest outline-none ring-1 ring-transparent transition-all placeholder:text-forest/30 focus:bg-cream focus:ring-forest/15"
              />

              {/* ── MODE EDIT: tiga field detail yang nilainya SUDAH ADA ────────
                  Di mode tambah, kategori/dompet/tanggal tidak ditentukan AI:
                  kategori dipilih user (blok di atas), dompet & tanggal dari
                  konteks. Di mode edit ketiganya sudah punya nilai dan justru
                  bagian yang paling sering salah (kasus paling umum: Minca salah
                  nebak kategori) — karena itu bisa dikoreksi di sini, dan nilai
                  lama yang tidak ada di daftar kanon tetap disertakan
                  (`withCurrentValue`). */}
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
                  <p className="mt-2 text-[11px] leading-relaxed text-forest/45">
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
              <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-forest">
                <Sparkles className="size-4 text-forest" strokeWidth={2.4} />
                Lagi baca struknya...
              </p>
              <p className="mt-1 text-xs text-forest/45">
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

              <p className="mt-4 text-sm font-medium text-forest">
                Ngobrol aja, misal: beli kopi 25 ribu
              </p>
              <p className="mt-1 text-xs text-forest/45">
                Lagi dengerin... ketuk mic buat batal
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* ── 3. AKSI — 📸 & 🎤 mengapit CTA "Catat" ─────────────────────
          layout dialog (web): tombol sekunder jadi pil berlabel karena
          ruangnya lega; layout sheet (mobile): tetap ikon bulat 56px.

          Catatan urutan (Stage 2): baris aksinya sengaja berada SETELAH field
          tambahan di bawah ini — opsi pembagian dulu, baru tombol simpan. */}
      {/* ── 3a. FIELD TAMBAHAN KONTEKS (opsional) ──────────────────────
          Halaman Joint Wallet memakai slot ini untuk pemilih split, pemilih
          "Siapa yang nalangin?", & toggle privasi. Stage 2: posisinya DI ATAS
          tombol Catat supaya opsi pembagian terlihat SEBELUM user menyimpan —
          dulu user bisa mencatat tanpa pernah melihat opsinya sama sekali. */}
      {extraFields && (
        <div className="mt-4">{extraFields}</div>
      )}

      <div
        className={cn(
          'flex items-center gap-3',
          extraFields ? 'mt-3' : isDialog ? 'mt-6' : 'mt-5',
        )}
      >
        <button
          type="button"
          onClick={handlePickPhoto}
          /* kuota AI habis → OCR mati (paket 42); alasannya ditulis di bawah baris
             aksi, bukan dibiarkan sebagai tombol yang tidak menjawab */
          disabled={quotaExhausted}
          aria-disabled={quotaExhausted || undefined}
          aria-describedby={quotaExhausted ? 'tx-ai-off' : undefined}
          aria-label={
            mode === 'ocr' ? 'Batal scan struk' : 'Scan struk dengan kamera'
          }
          className={cn(
            'flex shrink-0 items-center justify-center',
            'transition-all duration-150 active:scale-95 disabled:active:scale-100',
            isDialog
              ? 'h-14 gap-2 rounded-2xl px-5 text-[13px] font-medium max-lg:px-3.5'
              : 'size-14 rounded-full',
            quotaExhausted
              ? 'cursor-not-allowed bg-soil/[0.07] text-forest/30 ring-1 ring-soil/12'
              : mode === 'ocr'
                ? 'bg-forest text-cream'
                : 'bg-soil/[0.1] text-forest/70 ring-1 ring-soil/12 hover:bg-soil/[0.1]',
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
          /* Tiga alasan tombol ini bisa mati, dan ketiganya dijelaskan di layar
             (tidak ada tombol mati tanpa sebab):
               · `inputLocked`  → masa aktif langganan habis (SubscriptionLockNote)
               · `submitting`   → satu simpanan sedang jalan ("Menyimpan…")
               · belum ada kategori (paket 54) → petunjuk "Pilih kategori dulu"
                 tepat di bawah pemilihnya (`tx-category-help`) */
          disabled={inputLocked || submitting || categoryChoice.needsChoice || walletNeeded}
          aria-disabled={
            inputLocked || submitting || categoryChoice.needsChoice || walletNeeded || undefined
          }
          aria-describedby={
            categoryChoice.needsChoice
              ? 'tx-category-help'
              : walletNeeded
                ? 'tx-wallet-help'
                : undefined
          }
          className={cn(
            'flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-medium transition-all duration-150',
            inputLocked || submitting || categoryChoice.needsChoice || walletNeeded
              ? 'cursor-not-allowed bg-ink/[0.07] text-forest/35'
              : 'bg-forest text-cream shadow-[0_14px_28px_-14px_rgba(69,89,78,0.7)] hover:bg-forest-soft active:scale-[0.98]',
          )}
        >
          {submitting
            ? TRANSACTION_INPUT_COPY.submitting
            : isEdit
              ? TRANSACTION_INPUT_COPY.submitEdit
              : TRANSACTION_INPUT_COPY.submit}
          <Check className="size-5" strokeWidth={2.8} />
        </button>

        <button
          type="button"
          onClick={handleVoiceToggle}
          /* kuota AI habis → input suara mati (paket 42), dengan penjelasan
             di bawah baris aksi. Catat manual tetap jalan penuh. */
          disabled={quotaExhausted}
          aria-disabled={quotaExhausted || undefined}
          aria-describedby={quotaExhausted ? 'tx-ai-off' : undefined}
          aria-label={
            mode === 'voice' ? 'Batal input suara' : 'Catat pakai suara'
          }
          className={cn(
            'flex shrink-0 items-center justify-center',
            'transition-all duration-150 active:scale-95 disabled:active:scale-100',
            isDialog
              ? 'h-14 gap-2 rounded-2xl px-5 text-[13px] font-medium max-lg:px-3.5'
              : 'size-14 rounded-full',
            quotaExhausted
              ? 'cursor-not-allowed bg-soil/[0.07] text-forest/30 ring-1 ring-soil/12'
              : mode === 'voice'
                ? 'bg-forest text-cream'
                : 'bg-soil/[0.1] text-forest/70 ring-1 ring-soil/12 hover:bg-soil/[0.1]',
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

      {/* penjelasan kenapa scan struk & input suara mati (paket 42): kuota AI
          habis. Dua tombol itu memang dimatikan, tapi yang TIDAK ikut mati
          disebutkan juga — user butuh tahu ia masih bisa mencatat. */}
      {quotaExhausted && (
        <p
          id="tx-ai-off"
          role="status"
          className={cn(
            'rounded-2xl bg-hud-amber/15 px-3.5 py-2.5 leading-relaxed text-forest/65 ring-1 ring-hud-amber/25',
            isDialog ? 'mt-3 text-[12.5px]' : 'mt-2.5 text-[11.5px]',
          )}
        >
          <span className="mr-1.5 inline-flex items-center rounded-full bg-hud-amber/40 px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-forest/70 uppercase">
            {AI_QUOTA_EXHAUSTED_COPY.badge}
          </span>
          {AI_QUOTA_EXHAUSTED_COPY.body}
        </p>
      )}

      {/* petunjuk pintasan keyboard — cuma relevan di web */}
      {isDialog && (
        <p className="mt-4 text-center text-[11.5px] text-forest/35">
          Tekan{' '}
          <kbd className="rounded-md bg-soil/[0.11] px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-forest/50">
            Enter
          </kbd>{' '}
          buat simpan ·{' '}
          <kbd className="rounded-md bg-soil/[0.11] px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-forest/50">
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
      <span className="mb-1 block text-[11px] font-medium text-forest/50">{label}</span>
      {children}
    </label>
  )
}
