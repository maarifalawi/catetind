'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Drawer } from 'vaul'
import {
  Check,
  ChevronDown,
  ReceiptText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sprout,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { ContextMenu } from './context-menu'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { FinancialHealthCard } from './financial-health-card'
import { InsightCards } from './insight-cards'
import { SpendingHeatmap } from './spending-heatmap'
import { HistoryTransactionRow } from './history-transaction-row'
import { TransactionDetailSheet } from './transaction-detail-sheet'
import { ConfirmDeleteDialog, TransactionActionsSheet } from './transaction-actions'
import { ConfirmDialog } from './confirm-dialog'
import { EditTransactionSheet } from './edit-transaction-sheet'
import { WeeklyRecapModal } from './weekly-recap-modal'
import { MonthlyReviewModal } from './monthly-review-modal'
import { MonthlyTargetCard } from './monthly-target-card'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { useMonthlyReview } from '@/hooks/use-monthly-review'
import { cn } from '@/lib/utils'
import {
  cancelTransferRow,
  editRow,
  recordedTransactions,
  removeRow,
  removeRows,
  restoreRow,
  restoreRows,
  undoTransferCancellation,
  useMoneyStore,
  type TransferCancellation,
} from '@/lib/money/store'
import { TRANSFER_SHEET_COPY } from '@/lib/data/add-wallet'
import { tagTransactionsForContext, matchesContext, type ContextTransaction } from '@/lib/money/context-filter'
import {
  CONTEXT_EMPTY_COPY,
  CONTEXT_LABEL,
} from '@/lib/data/money-context'
import {
  CATEGORY_FILTERS,
  DELETE_TRANSACTION_TOAST,
  HISTORY_CLEAR_ALL_COPY,
  HISTORY_CLEAR_ALL_TOAST,
  HISTORY_NO_DATA_COPY,
  INITIAL_FILTERS,
  TIME_FILTERS,
  TYPE_FILTERS,
  UNDO_WINDOW_MS,
  UPDATE_TRANSACTION_TOAST,
  WALLET_FILTERS,
  buildHistoryInsights,
  filterHistoryTransactions,
  financialHealthScore,
  groupTransactionsByDate,
  localISODate,
  maskMoney,
  netLabel,
  savingsRatePct,
  summarizeTransactions,
  type FilterOption,
  type HistoryFilters,
  type HistoryTransaction,
} from '@/lib/data/history'

/* ── Riwayat & Insight (/app/history) ────────────────────────────────────────
   Otak analitik CatetInd: skor kewarasan finansial, insight AI, heatmap
   keborosan, pencarian + chip filter (opsinya di bottom sheet), dan daftar
   transaksi yang dikelompokkan per tanggal (dengan total harian). Interaksi
   baris: tap → Detail, geser kanan → Edit, geser kiri → Hapus + konfirmasi.

   Privasi: satu state `isMasked` mengunci SEMUA nominal di halaman ini. */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ── FILTER BAR (1 baris, hemat teks) ────────────────────────────────────────
   Dulu tiap filter punya satu BARIS pill sendiri (Waktu / Wallet / Tipe /
   Kategori) — 4 baris pill + label kecil = ramai dan susah dibaca. Sekarang
   cukup satu baris chip: chip menampilkan nama filter saat masih "Semua", dan
   menampilkan PILIHANNYA saat aktif. Opsi lengkapnya dibuka di bottom sheet,
   jadi tidak ada lagi dinding pill. */
type FilterKey = keyof HistoryFilters

const FILTER_ROWS: { key: FilterKey; label: string; options: FilterOption<string>[] }[] = [
  { key: 'time', label: 'Waktu', options: TIME_FILTERS },
  { key: 'wallet', label: 'Dompet', options: WALLET_FILTERS },
  { key: 'type', label: 'Tipe', options: TYPE_FILTERS },
  { key: 'category', label: 'Kategori', options: CATEGORY_FILTERS },
]

export function HistoryScreen({ initialQuery }: { initialQuery?: string }) {
  /* ── state ─────────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) — toggle di header
     menyensor halaman ini dengan state yang sama seperti halaman lain */
  const { masked: isMasked } = usePrivacy()
  /* konteks uang (Pribadi/Keluarga/Bersama) — state GLOBAL (paket 47). Daftar,
     ringkasan, insight, dan heatmap halaman ini mengikutinya; angka yang memang
     total (skor kewarasan) tetap seluruh catatan. */
  const { context, setContext } = useMoneyContext()
  /* Kata kunci awal dari URL (`/history?q=...`) — jalur pintas dari kolom cari di
     header Home (paket 29). Nilainya datang sebagai PROP SERVER, bukan
     `useSearchParams()`: HTML server & render pertama client jadi identik (tidak
     ada kedipan kolom kosong → terisi), dan tidak perlu Suspense boundary.
     Setelahnya kolom ini tetap milik user — ia bisa mengubah/menghapusnya. */
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '')
  const [activeFilters, setActiveFilters] = useState<HistoryFilters>(INITIAL_FILTERS)
  /** filter yang sheet opsinya sedang terbuka (null = tertutup) */
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<HistoryTransaction | null>(null)

  /**
   * Catatan yang dihapus user + catatan sesi — keduanya dari SATU store uang
   * (`lib/money/store.ts`). Tidak ada state `removedIds` per halaman lagi: dulu
   * hapus di Home tidak terlihat di sini (dan sebaliknya) karena daftar hapusnya
   * hidup di masing-masing komponen (audit #7).
   */
  const snapshot = useMoneyStore()
  const recordedTxs = useMemo(() => recordedTransactions(snapshot), [snapshot])
  /** transaksi yang menunggu konfirmasi hapus */
  const [pendingDelete, setPendingDelete] = useState<HistoryTransaction | null>(null)
  /** transaksi yang sheet EDIT-nya sedang terbuka (paket 03) */
  const [editingTx, setEditingTx] = useState<HistoryTransaction | null>(null)
  /** transaksi yang sheet aksi (ikon titik tiga) sedang terbuka */
  const [menuTx, setMenuTx] = useState<HistoryTransaction | null>(null)
  /** id yang hak Undo-nya MASIH hidup (dikosongkan begitu jendelanya lewat) */
  const undoRef = useRef<number | null>(null)
  /**
   * Pembatalan pindah dana yang sedang bisa di-Undo (paket 55) — ref, bukan
   * state: isinya dipakai HANYA oleh tombol Undo (dua baris koreksi yang harus
   * dicabut bersamanya), bukan untuk dirender.
   */
  const undoCancelRef = useRef<TransferCancellation | null>(null)
  /** timer jendela Undo — dibersihkan saat unmount supaya tidak ada timer nyasar */
  const undoTimer = useRef<number | null>(null)
  const [recapOpen, setRecapOpen] = useState(false)
  const [recapDismissed, setRecapDismissed] = useState(false)
  /** banner rekap hanya Jumat–Minggu; dihitung di client supaya HTML server
   *  dan client identik (pola yang sama dengan WeeklyRecapBanner di Home) */
  const [recapWindow, setRecapWindow] = useState(false)
  /** tanggal hari ini — juga dihitung setelah mount supaya label "Hari Ini"
   *  / "Kemarin" tidak pernah beda antara server & client */
  const [today, setToday] = useState('')
  /* Target bulanan (paket 32) — alur target ikut hidup di /history supaya CTA
     recap "Atur target nabung" tidak lagi menjanjikan modal lalu mendarat di
     halaman lain. State-nya TETAP satu: hook yang sama dengan Home (localStorage
     `catet-ind-monthly-target`), jadi target yang disimpan di sini langsung
     terbaca kartu Target di Home — bukan store/context kedua.
     `auto: false` = ritual tanggal 1–3 tetap milik Home: di halaman riwayat,
     modal ini hanya terbuka karena aksi user (kartu Target atau CTA recap). */
  const monthly = useMonthlyReview({ auto: false })

  /* Catatan sesi dari store uang (bukan bus lagi) — lihat `useMoneyStore` di
     atas. Baris yang sudah dihapus (tombstone) juga tersaring dari mock
     `HISTORY_TRANSACTIONS`, jadi halaman ini & Home tidak pernah beda daftar. */

  useEffect(() => {
    setToday(localISODate())
    const day = new Date().getDay() // 0 = Minggu, 5 = Jumat, 6 = Sabtu
    setRecapWindow(day === 0 || day === 5 || day === 6)
  }, [])

  /* timer Undo dibersihkan saat halaman ditinggalkan */
  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    },
    [],
  )

  /* ── data turunan ──────────────────────────────────────────────────────── */
  /* HANYA catatan NYATA dari store (`recordedTransactions`) — tidak ada lagi
     baris contoh yang disuntikkan (revisi "tanpa seed"). Catatan yang dihapus
     sudah disaring tombstone di dalam `recordedTransactions()`, dan catatan yang
     diedit tampil versi barunya, sehingga total harian (dayNet) & ringkasan di
     kepala daftar ikut menyesuaikan sendiri. Tag konteks dibaca dari DOMPET
     barisnya (`tagTransactionsForContext`), sama seperti halaman lain. */
  const transactions = useMemo<ContextTransaction[]>(
    () => tagTransactionsForContext(recordedTxs, snapshot),
    [recordedTxs, snapshot],
  )
  /**
   * DAFTAR & ARUS IKUT KONTEKS (paket 47).
   *
   * Konteks dibaca dari DOMPET catatan (`lib/money/context-filter.ts`), bukan
   * dari kolom `context` di baris: dompet sudah satu-satunya pemilik fakta itu.
   * Catatan yang dompetnya belum ada di daftar dompet TIDAK hilang — ia ditandai
   * "Belum berkonteks" dan tetap tampil di semua konteks (aturan kanon #2).
   */
  const visibleTransactions = useMemo(
    () => transactions.filter((tx) => matchesContext(tx.context, context)),
    [transactions, context],
  )
  const filtered = useMemo(
    () => filterHistoryTransactions(visibleTransactions, activeFilters, searchQuery, today),
    [visibleTransactions, activeFilters, searchQuery, today],
  )
  const groups = useMemo(() => groupTransactionsByDate(filtered, today), [filtered, today])
  const summary = useMemo(() => summarizeTransactions(filtered), [filtered])
  /**
   * Jumlah catatan yang DIKONTEKS ini punya (sebelum filter/pencarian user) —
   * dipakai pill "x dari y", empty state, dan ambang insight: kalau konteksnya
   * memang belum punya catatan, insight yang mengklaim sesuatu soal konteks itu
   * harus ikut hilang (kanon "jangan pernah kasih false insight").
   */
  const contextCount = visibleTransactions.length

  /* ── ANGKA KARTU HERO: DIHITUNG DARI CATATAN, BUKAN DIPATOK ─────────────────
     Semua angka di blok ini lahir dari catatan NYATA user (tanpa seed):
       · `totalTransactions` = jumlah catatan nyata yang belum dihapus tombstone;
       · `healthScore`       = rasio pemasukan vs pengeluaran, `null` kalau belum
                               bisa dihitung (data < 30 atau belum ada pemasukan);
       · `insights`          = kartu AI yang angkanya dari catatan KONTEKS AKTIF
                               (ambangnya di `buildHistoryInsights`). */
  const totalTransactions = recordedTxs.length
  const healthScore = useMemo(() => financialHealthScore(transactions), [transactions])
  const savingsRate = useMemo(() => savingsRatePct(transactions), [transactions])
  const insights = useMemo(
    () => buildHistoryInsights(visibleTransactions, today),
    [visibleTransactions, today],
  )

  const activeFilterCount =
    (activeFilters.time !== 'all' ? 1 : 0) +
    (activeFilters.wallet !== 'all' ? 1 : 0) +
    (activeFilters.type !== 'all' ? 1 : 0) +
    (activeFilters.category !== 'all' ? 1 : 0)

  /** baris filter yang sedang dibuka (judul + daftar opsinya) */
  const openFilterRow = FILTER_ROWS.find((row) => row.key === openFilter) ?? null

  /* ── aksi ──────────────────────────────────────────────────────────────── */

  const resetFilters = useCallback(() => {
    setActiveFilters(INITIAL_FILTERS)
    setSearchQuery('')
  }, [])

  /* "Atur target nabung" di recap mingguan menyambung ke alur target yang sama
     dengan Home (`useMonthlyReview` + `MonthlyReviewModal`). Recap ditutup DULU
     supaya tidak ada dua overlay bertumpuk di layar — aturan yang sama dengan
     `monthly.open && !renewal.open` di Home. `monthly.openModal` disimpan sebagai
     variabel supaya callback ini stabil antar render. */
  const openMonthlyTarget = monthly.openModal
  const handleSetRecapTarget = useCallback(() => {
    setRecapOpen(false)
    openMonthlyTarget()
  }, [openMonthlyTarget])

  const handleEdit = useCallback((tx: HistoryTransaction) => {
    /* Edit adalah jalur UTAMA perbaikan data (paket 03): tombolnya membuka sheet
       yang SUDAH TERISI data catatan itu. Detail & sheet titik tiga ditutup dulu
       supaya tidak ada dua panel bertumpuk di layar yang sama. */
    setSelectedTransaction(null)
    setMenuTx(null)
    setEditingTx(tx)
  }, [])

  /**
   * Simpan hasil edit lewat SATU pintu tulis (`editRow` di store uang).
   *
   * Baris store (`session-*`) → barisnya benar-benar diperbarui, jadi Home,
   * `/wallet/[id]`, dan grafik arus uang membaca angka yang sama.
   * Baris MOCK → override di store (konstanta `lib/data/*` tidak disunting).
   * Toast hanya berbunyi kalau store benar-benar menulis sesuatu — `null` berarti
   * input ditolak atau barisnya sudah dihapus, dan itu bukan "tersimpan".
   */
  const handleSaveEdit = useCallback((next: HistoryTransaction) => {
    const written = editRow(next.id, {
      name: next.name,
      amount: next.amount,
      type: next.type,
      category: next.category,
      wallet: next.wallet,
      dateISO: next.date,
      aiGenerated: next.aiGenerated,
    })
    setEditingTx(null)
    if (!written) return
    toast.success(UPDATE_TRANSACTION_TOAST.title, {
      description: UPDATE_TRANSACTION_TOAST.description,
    })
  }, [])

  /** Undo: catatannya balik ke posisi semula — tombstone di store dibuang */
  const restoreTransaction = useCallback((id: number) => {
    if (undoRef.current !== id) {
      toast(DELETE_TRANSACTION_TOAST.expired)
      return
    }
    undoRef.current = null
    /* kalau yang dibatalkan tadi adalah pindah dana, Undo juga mencabut dua
       baris koreksi pengembalian uangnya (paket 55) */
    const cancellation = undoCancelRef.current
    undoCancelRef.current = null
    if (cancellation) {
      undoTransferCancellation(cancellation)
      toast.success(DELETE_TRANSACTION_TOAST.undoneTitle, {
        description: DELETE_TRANSACTION_TOAST.undoneDescription,
      })
      return
    }
    restoreRow(id)
    toast.success(DELETE_TRANSACTION_TOAST.undoneTitle, {
      description: DELETE_TRANSACTION_TOAST.undoneDescription,
    })
  }, [])

  /**
   * Hapus sesungguhnya: catatannya keluar dari riwayat, TAPI hak
   * mengembalikannya masih hidup selama UNDO_WINDOW_MS (PRD 2251). Sesudah
   * jendelanya tutup, jejaknya dibuang sehingga undo yang terlambat ditolak
   * dengan jujur — bukan tombol yang diam-diam tidak bekerja.
   *
   * PAKET 55 — baris `transfer` diperlakukan istimewa: ia menggerakkan DUA
   * dompet, jadi tombstone saja menyisakan uang di dompet tujuan sementara
   * dompet asal tetap kosong. `cancelTransferRow()` menghapus catatannya
   * SEKALIGUS mengembalikan uangnya ke kedua sisi lewat dua baris koreksi; kalau
   * barisnya bukan pindah dana (atau uangnya sudah terpakai di tujuan), ia
   * mengembalikan `null` dan jalur hapus biasa yang dipakai.
   */
  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    undoRef.current = id
    const cancellation =
      pendingDelete.type === 'transfer' ? cancelTransferRow(id) : null
    undoCancelRef.current = cancellation
    /* `cancelTransferRow` sudah menulis tombstone-nya sendiri */
    if (!cancellation) removeRow(id)
    setPendingDelete(null)
    setSelectedTransaction(null)

    if (cancellation) {
      toast.success(TRANSFER_SHEET_COPY.cancelToastTitle, {
        description: TRANSFER_SHEET_COPY.cancelToastDescription(
          cancellation.fromName,
          cancellation.toName,
        ),
        action: { label: DELETE_TRANSACTION_TOAST.undo, onClick: () => restoreTransaction(id) },
        /* lama toast = lama hak undo; keduanya dari satu konstanta */
        duration: UNDO_WINDOW_MS,
      })
    } else {
      toast.success(DELETE_TRANSACTION_TOAST.title, {
        description: DELETE_TRANSACTION_TOAST.description,
        action: { label: DELETE_TRANSACTION_TOAST.undo, onClick: () => restoreTransaction(id) },
        /* lama toast = lama hak undo; keduanya dari satu konstanta */
        duration: UNDO_WINDOW_MS,
      })
    }

    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => {
      if (undoRef.current === id) undoRef.current = null
      undoCancelRef.current = null
    }, UNDO_WINDOW_MS)
  }, [pendingDelete, restoreTransaction])

  /* ── HAPUS SEMUA RIWAYAT (paket 59 · item 59.2) ──────────────────────────────
     Satu pintu tulis: `removeRows()` (store) menulis SEMUA tombstone dalam satu
     commit — bukan perulangan `removeRow()` yang berarti N tulisan & N siaran.

     Hak Undo-nya memakai jendela yang SAMA (`UNDO_WINDOW_MS`) dan mekanisme yang
     SAMA dengan hapus satu catatan: selama jendelanya hidup, `restoreRows()`
     mengembalikan seluruh daftar; sesudahnya tombol yang datang terlambat
     ditolak dengan kalimat jujur (`DELETE_TRANSACTION_TOAST.expired`).

     Catatan yang dihapus di sini TIDAK mengembalikan uang (kanon §4.5) — kalau
     user ingin uangnya balik, jalurnya `cancelTransferRow` satu per satu
     (paket 55). Karena itu dialognya menyebut dampaknya SEBELUM ditekan. */
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const undoClearRef = useRef<number[] | null>(null)

  const restoreCleared = useCallback((ids: number[]) => {
    if (undoClearRef.current !== ids) {
      toast(DELETE_TRANSACTION_TOAST.expired)
      return
    }
    undoClearRef.current = null
    restoreRows(ids)
    toast.success(HISTORY_CLEAR_ALL_TOAST.undoneTitle, {
      description: HISTORY_CLEAR_ALL_TOAST.undoneDescription,
    })
  }, [])

  const confirmClearAll = useCallback(() => {
    setClearAllOpen(false)
    /* yang dihapus = SELURUH catatan user (semua konteks), bukan cuma yang lolos
       filter — tombolnya bernama "Hapus Semua Riwayat" dan dialognya menyebut
       cakupan itu apa adanya. `transactions` sudah bebas tombstone. */
    const ids = transactions.map((tx) => tx.id)
    const removed = removeRows(ids)
    if (removed === 0) return /* tidak ada yang berubah: jangan mengaku menghapus */
    undoClearRef.current = ids
    toast.success(HISTORY_CLEAR_ALL_TOAST.title(removed), {
      description: HISTORY_CLEAR_ALL_TOAST.description,
      action: { label: HISTORY_CLEAR_ALL_TOAST.undo, onClick: () => restoreCleared(ids) },
      duration: UNDO_WINDOW_MS,
    })
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => {
      undoClearRef.current = null
      if (undoRef.current !== null) undoRef.current = null
    }, UNDO_WINDOW_MS)
  }, [transactions, restoreCleared])


  /* ── aksi dari sheet titik tiga (alternatif non-gesture) ──────────────── */
  const menuOpenDetail = useCallback(() => {
    setSelectedTransaction(menuTx)
    setMenuTx(null)
  }, [menuTx])

  const menuEdit = useCallback(() => {
    if (menuTx) handleEdit(menuTx)
    setMenuTx(null)
  }, [menuTx, handleEdit])

  const menuDelete = useCallback(() => {
    setPendingDelete(menuTx)
    setMenuTx(null)
  }, [menuTx])

  /** nomor baris global supaya animasi masuk tetap berurutan antar grup */
  let rowIndex = 0

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* header halaman + toggle privasi */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            Riwayat &amp; Insight
          </h1>
        </div>
        {/* cluster aksi desktop: pemilih konteks + tombol mata global (paket 47).
            Di MOBILE keduanya sudah disediakan header mobile GLOBAL (paket 75) —
            termasuk tombol mata, karena /history menampilkan nominal — jadi blok
            mobile-nya sengaja tidak digambar lagi di sini (dulu ada, = dua mata). */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <ContextMenu value={context} onChange={setContext} className="w-44" />
          <GlobalPrivacyToggle />
        </div>
      </header>

      {/* pemilih konteks (mobile) — baris sendiri di bawah header, pola Home/Budget */}
      <div className="mt-4 flex justify-center lg:hidden">
        <ContextMenu value={context} onChange={setContext} className="w-56" />
      </div>

      {/* ── FILTER GLOBAL — tepat di bawah judul, di ATAS semua konten ──────────
          Audit hierarki (Gestalt): dulu search + filter nyempil di TENGAH
          halaman (antara insight dan list) sehingga terlihat hanya berlaku
          untuk list di bawahnya. Sekarang dia duduk paling atas & diberi label
          "Filter Global" supaya jelas dia menyaring seluruh layar. */}
      <section className="mt-5 rounded-[1.75rem] bg-cream p-3 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-3.5 lg:mt-6">
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-forest/40">
            <SlidersHorizontal className="size-3.5" strokeWidth={2.4} aria-hidden />
            Filter Global
          </span>
          {/* reset muncul HANYA saat ada yang perlu direset — hemat ruang & teks */}
          {(activeFilterCount > 0 || searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-forest/55 ring-1 ring-soil/8 transition-colors hover:bg-sage/60 hover:text-forest active:scale-95"
            >
              <RotateCcw className="size-3" strokeWidth={2.4} aria-hidden />
              Reset
            </button>
          )}
        </div>

        {/* pencarian: placeholder adalah CONTOH PROMPT, bukan "Cari catatan",
            supaya user tahu search-nya bisa bahasa sehari-hari */}
        <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-full bg-cream/80 px-4 ring-1 ring-inset ring-soil/8 transition-shadow focus-within:bg-cream focus-within:ring-2 focus-within:ring-forest/20">
          <Search className="size-4 shrink-0 text-forest/35" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Cari "pengeluaran kopi bulan lalu"…'
            aria-label="Cari catatan dengan bahasa sehari-hari"
            className="w-full bg-transparent text-[13.5px] text-forest outline-none placeholder:text-forest/35"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-forest/40 transition-colors hover:bg-sage/60 hover:text-forest"
            >
              <X className="size-3.5" strokeWidth={2.4} />
            </button>
          )}
        </label>

        {/* chip filter: nama filter saat "Semua", nama pilihannya saat aktif */}
        <div className="hide-scrollbar mt-2.5 flex gap-2 overflow-x-auto px-0.5 py-0.5">
          {FILTER_ROWS.map((row) => {
            const value = activeFilters[row.key]
            const active = value !== 'all'
            const selected = row.options.find((opt) => opt.id === value)
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => setOpenFilter(row.key)}
                aria-label={`Filter ${row.label}`}
                aria-expanded={openFilter === row.key}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full py-2 pl-3.5 pr-3 text-[12.5px] font-medium transition-all duration-200 active:scale-95',
                  active
                    ? 'bg-forest text-cream shadow-[0_10px_22px_-16px_rgba(69,89,78,0.9)]'
                    : 'bg-cream text-forest/55 ring-1 ring-soil/10 hover:bg-sage/60 hover:text-forest',
                )}
              >
                {active ? selected?.label : row.label}
                <ChevronDown
                  className={cn('size-3.5', active ? 'text-cream/70' : 'text-forest/35')}
                  strokeWidth={2.6}
                />
              </button>
            )
          })}
        </div>
      </section>

      {/* ── KAPAN KAMU SERING BOROS? (heatmap) — tepat di bawah Filter Global,
          sesuai urutan yang diminta: filter → keborosan → ritual → catatan →
          skor → insight. Pola mengikuti konteks aktif (paket 47). */}
      {/* hanya ada pola kalau ada pengeluaran NYATA di konteks ini — kalau tidak,
          heatmap dibiarkan tidak muncul (jangan gambar pola dari data kosong) */}
      {visibleTransactions.some((tx) => tx.type === 'expense') && (
        <div className="mt-5 lg:mt-6">
          <SpendingHeatmap masked={isMasked} transactions={visibleTransactions} today={today} />
        </div>
      )}

      {/* banner rekap mingguan — HANYA Jumat–Sabtu–Minggu, dan bisa di-dismiss */}
      {recapWindow && !recapDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-5 flex items-center gap-2 rounded-[1.6rem] bg-gradient-to-r from-forest to-forest-soft pl-4 pr-2 text-cream ring-1 ring-soil/12 lg:mt-6"
        >
          {/* Buka modal Rekap Mingguan (5 slide). Komponennya SUDAH ada dan
              dipasang di bagian bawah halaman ini; kartu ini pintu manualnya di
              /history (di Home pintunya adalah banner rekap). */}
          <button
            type="button"
            onClick={() => setRecapOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
          >
            <span aria-hidden className="text-[16px]">
              📈
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] font-medium">
              Recap mingguan siap
            </span>
            <span aria-hidden className="pr-1 text-cream/60">
              →
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRecapDismissed(true)}
            aria-label="Tutup banner rekap mingguan"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-cream/60 transition-colors hover:bg-cream/10 hover:text-cream"
          >
            <X className="size-3.5" strokeWidth={2.6} />
          </button>
        </motion.div>
      )}

      {/* kartu Target bulan ini (paket 32) — slot yang sama dengan Home:
          tepat di bawah "pintu" recap. Dua pintu ke alur yang sama: recap
          (recapnya dibaca dulu) dan kartu ini (targetnya ditinjau langsung,
          bahkan di hari kerja saat banner recap sedang tidak muncul).
          `monthly.ready` menahan render sampai penanda localStorage dibaca,
          supaya kartunya tidak berkedip dari "belum ada" ke nominalnya. */}
      {monthly.ready && (
        <div className="mt-2.5">
          <MonthlyTargetCard
            savedThisMonth={monthly.savedThisMonth}
            amount={monthly.saved?.amount ?? 0}
            fundId={monthly.saved?.fundId ?? null}
            onOpen={monthly.openModal}
          />
        </div>
      )}

      {/* ── 0 CATATAN = TIDAK ADA YANG DIKLAIM (paket 59 · 59.1) ────────────
         Dulu di keadaan ini kartu kalibrasi menuliskan "0/30 transaksi" dan
         insight menyebut angka mock — dua permukaan yang bicara tentang data
         yang tidak ada. Sekarang keduanya digantikan SATU kartu jujur berisi
         apa yang bisa dihitung (belum apa-apa) + CTA mencatat.

         Heatmap, skor, & insight ikut tidak dirender di sini: grafik pola
         pengeluaran yang digambar dari data tanpa catatan akan terbaca sebagai
         klaim. */}
      {totalTransactions === 0 && (
        <section className="mt-5 flex flex-col items-center rounded-[2rem] bg-cream px-6 py-10 text-center shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 lg:mt-6">
          <span
            className="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-cream/60"
            aria-hidden
          >
            <Sprout className="size-6 text-forest/45" strokeWidth={1.8} />
          </span>
          <h2 className="mt-4 font-display text-[16px] font-semibold tracking-tight text-forest">
            {HISTORY_NO_DATA_COPY.title}
          </h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-forest/60">
            {HISTORY_NO_DATA_COPY.body}
          </p>
          <div className="mt-5">
            <TransactionBottomSheet
              trigger={
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
                >
                  <ReceiptText className="size-4" strokeWidth={2.6} aria-hidden />
                  {HISTORY_NO_DATA_COPY.cta}
                </button>
              }
            />
          </div>
        </section>
      )}

      {/* ── CATATAN: daftar transaksi dikelompokkan per tanggal ─────────────────
          REDESIGN. Versi lama bertumpuk tiga lapis: kartu putih → kartu krem per
          hari → kartu putih per transaksi, dengan banyak pill (label hari, chip
          "pindah dana" biru, pill net harian, pill "PINDAH DANA" per baris).
          Sekarang: SATU kartu putih, kepala hari jadi baris garis-rambut, dan
          baris transaksi dipisah garis tipis — tidak ada kotak di dalam kotak.
          Warna nominal seragam lewat `MONEY_TONE` (hijau masuk · terracotta
          keluar · tinta netral untuk pindah dana). */}
      <section className="mt-5 rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6 lg:mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-sage text-forest">
              <ReceiptText className="size-[18px]" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-forest">Catatan</h2>
              <p className="text-[11.5px] text-forest/45">
                {summary.count} transaksi
                {groups.length > 0 ? ` · ${groups.length} hari` : ''}
              </p>
            </div>
          </div>
          {/* ── AKSI HAPUS SEMUA (paket 59 · 59.2) ──────────────────────────
              Tombolnya hanya ada kalau memang ada yang bisa dihapus: aksi
              merusak yang tidak punya sasaran cuma bikin ragu. Ditaruh di
              kepala section "Catatan" (bukan di menu tersembunyi) karena
              scope-nya memang section ini — dan dialognya yang menjelaskan
              dampaknya, bukan labelnya. */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {(activeFilterCount > 0 || searchQuery) && (
              <span className="rounded-full bg-cream px-3 py-1.5 text-[11.5px] font-medium tabular-nums text-forest/60 ring-1 ring-soil/12">
                {summary.count} dari {contextCount}
              </span>
            )}
            {totalTransactions > 0 && (
              <button
                type="button"
                onClick={() => setClearAllOpen(true)}
                aria-label={HISTORY_CLEAR_ALL_COPY.actionA11y(totalTransactions)}
                className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-[11.5px] font-medium text-plum ring-1 ring-plum/25 transition-colors hover:bg-plum/10 active:scale-[0.97]"
              >
                <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
                {HISTORY_CLEAR_ALL_COPY.action}
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            onReset={resetFilters}
            hasFilters={activeFilterCount > 0 || !!searchQuery}
            /* konteks yang memang belum punya catatan: sebut apa adanya + CTA
               (paket 47) — bukan "belum ada catatan di sini" yang bikin user
               mengira datanya hilang */
            emptyContext={contextCount === 0}
            contextLabel={CONTEXT_LABEL[context]}
          />
        ) : (
          <div className="mt-5 space-y-5">
            {groups.map((group) => (
              <section key={group.date}>
                {/* kepala hari: label + garis + (pindah dana) + net harian.
                    Semua angka polos berwarna, tanpa pill — jadi mata membaca
                    kolom angka yang lurus, bukan deretan chip. */}
                <div className="flex items-center gap-2.5">
                  <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-forest/45">
                    {group.label}
                  </p>
                  <span className="h-px min-w-4 flex-1 bg-soil/[0.09]" aria-hidden />
                  {group.moved > 0 && (
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-forest/40">
                      ⇄ {maskMoney(group.moved, isMasked)}
                    </span>
                  )}
                  <span
                    className={cn(
                      'shrink-0 text-[11.5px] font-semibold tabular-nums',
                      group.net < 0
                        ? 'text-hud-terracotta'
                        : group.net > 0
                          ? 'text-forest'
                          : 'text-forest/35',
                    )}
                  >
                    {netLabel(group.net, isMasked)}
                  </span>
                </div>

                {/* pemisah antar transaksi = JARAK, bukan garis rambut.
                    Sejak paket 78 tiap baris adalah kartu tipis ber-tint
                    keluarga kategori (`visual.row` + rounded, lihat
                    history-transaction-row.tsx), jadi `divide-y divide-soil/10`
                    yang dulu dipakai untuk daftar rata kini justru menempelkan
                    kartu satu sama lain (keluhan "mepet"). Pola yang dipakai di
                    sini SAMA dengan daftar transaksi Dashboard
                    (`recent-transactions-card.tsx`): kolom flex + `gap-1.5`,
                    dengan `mt-2` supaya baris pertama tidak menempel ke kepala
                    hari. Nol warna baru — hanya jarak. */}
                <ul className="mt-2 flex flex-col gap-1.5">
                  {group.items.map((tx) => {
                    const delay = 60 + rowIndex++ * 45
                    return (
                      <HistoryTransactionRow
                        key={tx.id}
                        tx={tx}
                        masked={isMasked}
                        delay={delay}
                        /* penanda "Belum berkonteks" (paket 47) — baris yang
                           dompetnya belum ada di daftar dompet tetap tampil di
                           semua konteks, jadi ia harus berlabel apa adanya */
                        unknownContext={tx.unknownContext}
                        onOpen={setSelectedTransaction}
                        onEdit={handleEdit}
                        onDelete={setPendingDelete}
                        onMenu={setMenuTx}
                      />
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      {/* ── SKOR KEWARASAN + INSIGHT AI — paling bawah, sesuai urutan yang
          diminta: filter → keborosan → ritual → catatan → skor → insight.
          Skor dihitung dari SELURUH catatan (metrik global user), sedangkan
          insight lahir dari catatan KONTEKS AKTIF — konteks yang datanya tipis
          tidak diberi klaim sama sekali. */}
      {totalTransactions > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-5">
            <FinancialHealthCard
              totalTransactions={totalTransactions}
              score={healthScore}
              savingsRate={savingsRate}
            />
          </div>
          <div className="lg:col-span-7">
            <InsightCards insights={insights} />
          </div>
        </div>
      )}

      {/* ── SHEET OPSI FILTER ───────────────────────────────────────────────────
          Satu sheet dipakai ulang untuk keempat filter: judul = nama filternya,
          barisnya = opsi + centang. Memilih opsi langsung menutup sheet supaya
          alurnya satu tarikan napas (pilih → lihat hasil). */}
      <Drawer.Root open={openFilterRow !== null} onOpenChange={(open) => !open && setOpenFilter(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70] bg-ink/40" />
          <Drawer.Content
            aria-label={openFilterRow ? `Filter ${openFilterRow.label}` : 'Filter'}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[80vh] w-full max-w-md flex-col rounded-t-[2rem] bg-cream shadow-2xl outline-none"
          >
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/10" />

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4" data-lenis-prevent>
              <Drawer.Title className="px-1 font-display text-[15px] font-medium tracking-tight text-forest">
                {openFilterRow?.label}
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Pilih {openFilterRow?.label} untuk menyaring catatan
              </Drawer.Description>

              <div className="mt-3 space-y-1">
                {openFilterRow?.options.map((opt) => {
                  const isActive = activeFilters[openFilterRow.key] === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const key = openFilterRow.key
                        setActiveFilters((f) => ({ ...f, [key]: opt.id }))
                        setOpenFilter(null)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left text-[14px] transition-colors',
                        isActive
                          ? 'bg-forest/[0.06] font-medium text-forest'
                          : 'font-medium text-forest/65 hover:bg-cream',
                      )}
                    >
                      {opt.label}
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full transition-colors',
                          isActive ? 'bg-forest text-cream' : 'ring-1 ring-inset ring-ink/10',
                        )}
                      >
                        {isActive && <Check className="size-3" strokeWidth={3.2} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── SHEET AKSI BARIS (ikon titik tiga) — komponen bersama ─────────────
          Affordance non-gesture untuk Lihat detail / Edit / Hapus. Menggantikan
          teks instruksi manual "Geser: kanan Edit · kiri Hapus" yang dihapus —
          kontrolnya sekarang benar-benar bisa ditekan, bukan hafalan gesture.
          Wujudnya dipakai bersama halaman Dompet Detail (transaction-actions). */}
      <TransactionActionsSheet
        tx={menuTx}
        masked={isMasked}
        onClose={() => setMenuTx(null)}
        onOpenDetail={menuOpenDetail}
        onEdit={menuEdit}
        onDelete={menuDelete}
      />

      {/* detail transaksi — modal (desktop) / bottom sheet (mobile) */}
      <TransactionDetailSheet
        tx={selectedTransaction}
        masked={isMasked}
        onClose={() => setSelectedTransaction(null)}
        onEdit={handleEdit}
        onDelete={setPendingDelete}
      />

      {/* sheet EDIT transaksi (paket 03) — engine yang sama dengan tombol "+",
          tapi terbuka sudah terisi data catatan ini */}
      <EditTransactionSheet
        tx={editingTx}
        onSave={handleSaveEdit}
        onClose={() => setEditingTx(null)}
      />

      {/* konfirmasi hapus */}
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDeleteDialog
            tx={pendingDelete}
            masked={isMasked}
            onCancel={() => setPendingDelete(null)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>

      {/* konfirmasi HAPUS SEMUA RIWAYAT (paket 59 · 59.2) — memakai bentuk
          dialog yang sama dengan hapus tagihan/transaksi (`ConfirmDialog`),
          dengan isi yang menyebut jumlah catatan DAN fakta bahwa saldo tidak
          ikut kembali. Mesin Undo-nya dijelaskan sebagai `safety`, bukan
          disembunyikan sampai setelah ditekan. */}
      <AnimatePresence>
        {clearAllOpen && (
          <ConfirmDialog
            titleId="hapus-semua-riwayat-judul"
            overlayLabel={HISTORY_CLEAR_ALL_COPY.cancel}
            title={HISTORY_CLEAR_ALL_COPY.title}
            body={
              <>
                {HISTORY_CLEAR_ALL_COPY.body(totalTransactions)}{' '}
                <b className="font-medium text-forest">{HISTORY_CLEAR_ALL_COPY.balanceNote}</b>
              </>
            }
            safety={HISTORY_CLEAR_ALL_COPY.safety(UNDO_WINDOW_MS / 1000)}
            cancelLabel={HISTORY_CLEAR_ALL_COPY.cancel}
            confirmLabel={HISTORY_CLEAR_ALL_COPY.confirm}
            onCancel={() => setClearAllOpen(false)}
            onConfirm={confirmClearAll}
          />
        )}
      </AnimatePresence>

      {/* Rekap Mingguan 5 slide (inventaris g). `onSetTarget` WAJIB & diisi
          (paket 32): CTA "Atur target nabung" di slide Rencana Minggu Depan
          membuka modal target di bawah — recap ditutup dulu oleh handler. */}
      <WeeklyRecapModal
        open={recapOpen}
        onClose={() => setRecapOpen(false)}
        onSetTarget={handleSetRecapTarget}
      />

      {/* Modal Monthly Review & Target Setup (inventaris #i) — komponen yang SAMA
          dengan Home, bukan modal kedua. Di sini `open` hanya bisa jadi true dari
          aksi user (`auto: false`): kartu Target di atas atau CTA recap. */}
      <MonthlyReviewModal
        open={monthly.open}
        monthKey={monthly.monthKey}
        saved={monthly.saved}
        onClose={monthly.close}
        onSave={monthly.saveTarget}
      />
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/** Empty state nurturing (PRD State I): tidak ada catatan sama sekali
 *  atau hasil filter/pencarian kosong */
function EmptyState({
  onReset,
  hasFilters,
  emptyContext = false,
  contextLabel,
}: {
  onReset: () => void
  hasFilters: boolean
  /**
   * true = konteks aktif memang belum punya satu catatan pun (paket 47), jadi
   * pesannya menyebut konteks + menjelaskan catatan baru akan masuk ke situ.
   */
  emptyContext?: boolean
  contextLabel?: string
}) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-12 text-center">
      <div
        className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-cream/60"
        aria-hidden
      >
        <Sprout className="size-7 text-forest/45" strokeWidth={1.8} />
      </div>
      <p className="mt-4 max-w-xs text-[13.5px] font-medium leading-relaxed text-forest">
        {emptyContext && contextLabel
          ? CONTEXT_EMPTY_COPY.history.title(contextLabel)
          : 'Belum ada catatan di sini 🌱'}
      </p>
      {emptyContext && (
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-forest/55">
          {CONTEXT_EMPTY_COPY.history.body}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <TransactionBottomSheet
          trigger={
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
            >
              {emptyContext ? CONTEXT_EMPTY_COPY.history.cta : 'Catat Sekarang'}
            </button>
          }
        />
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center rounded-2xl bg-cream px-4 text-[13.5px] font-medium text-forest/70 ring-1 ring-soil/12 transition-colors hover:bg-sage/50"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

/* Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7): satu bentuk
   tombol mata yang sama di semua halaman — lihat <GlobalPrivacyToggle />. */

/* ── catatan: baris filter lama (Waktu/Wallet/Tipe/Kategori) sudah digantikan
   chip + bottom sheet di atas, jadi tidak ada lagi 4 baris pill di halaman. */
