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
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { FinancialHealthCard } from './financial-health-card'
import { InsightCards } from './insight-cards'
import { SpendingHeatmap } from './spending-heatmap'
import { HistoryTransactionRow } from './history-transaction-row'
import { TransactionDetailSheet } from './transaction-detail-sheet'
import { ConfirmDeleteDialog, TransactionActionsSheet } from './transaction-actions'
import { EditTransactionSheet } from './edit-transaction-sheet'
import { WeeklyRecapModal } from './weekly-recap-modal'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { cn } from '@/lib/utils'
import { readRecordedTransactions, subscribeRecordedTransactions } from '@/lib/transaction-bus'
import {
  CATEGORY_FILTERS,
  HEALTH_SCORE,
  HISTORY_TRANSACTIONS,
  INITIAL_FILTERS,
  MONEY_LEGEND,
  TIME_FILTERS,
  TOTAL_TRANSACTIONS,
  TYPE_FILTERS,
  UNDO_WINDOW_MS,
  WALLET_FILTERS,
  DELETE_TRANSACTION_TOAST,
  UPDATE_TRANSACTION_TOAST,
  filterHistoryTransactions,
  groupTransactionsByDate,
  localISODate,
  maskMoney,
  netLabel,
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

export function HistoryScreen() {
  /* ── state ─────────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) — toggle di header
     menyensor halaman ini dengan state yang sama seperti halaman lain */
  const { masked: isMasked } = usePrivacy()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<HistoryFilters>(INITIAL_FILTERS)
  /** filter yang sheet opsinya sedang terbuka (null = tertutup) */
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<HistoryTransaction | null>(null)
  const totalTransactions = TOTAL_TRANSACTIONS

  /** catatan yang dihapus user di sesi ini (mock — nanti dari backend) */
  const [removedIds, setRemovedIds] = useState<number[]>([])
  /** transaksi VERSI BARU hasil edit, per id (mock — nanti dari backend) */
  const [editedTxs, setEditedTxs] = useState<Record<number, HistoryTransaction>>({})
  /** transaksi yang menunggu konfirmasi hapus */
  const [pendingDelete, setPendingDelete] = useState<HistoryTransaction | null>(null)
  /** transaksi yang sheet EDIT-nya sedang terbuka (paket 03) */
  const [editingTx, setEditingTx] = useState<HistoryTransaction | null>(null)
  /** transaksi yang sheet aksi (ikon titik tiga) sedang terbuka */
  const [menuTx, setMenuTx] = useState<HistoryTransaction | null>(null)
  /** id yang hak Undo-nya MASIH hidup (dikosongkan begitu jendelanya lewat) */
  const undoRef = useRef<number | null>(null)
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
  /** catatan yang dicatat dari AI Coach (prompt 20) — hidup di memory sesi */
  const [recordedTxs, setRecordedTxs] = useState<HistoryTransaction[]>([])

  /* Transaksi hasil "Scan struk"/"Voice" di AI Coach disimpan di
     `lib/transaction-bus.ts` dan dibaca SETELAH mount: HTML server tidak boleh
     berbeda dari render pertama client (pola sama dengan `lib/data/renewal.ts`).
     Selama halaman ini terbuka, catatan baru langsung masuk lewat langganan
     event — jadi user melihat barisnya muncul tanpa reload. */
  useEffect(() => {
    setRecordedTxs(readRecordedTransactions())
    return subscribeRecordedTransactions((tx) => setRecordedTxs((prev) => [...prev, tx]))
  }, [])

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
  /* catatan yang dihapus keluar dari daftar; catatan yang diedit tampil versi
     barunya — sehingga total harian (dayNet) & ringkasan di kepala daftar ikut
     menyesuaikan dengan sendirinya, tanpa perhitungan ulang terpisah.
     Catatan dari AI Coach (prompt 20) duduk paling atas — barulah baru dicatat,
     dan `groupTransactionsByDate` yang mengelompokkannya ke tanggalnya. */
  const transactions = useMemo(
    () => [
      ...recordedTxs,
      ...HISTORY_TRANSACTIONS.filter((tx) => !removedIds.includes(tx.id)).map(
        (tx) => editedTxs[tx.id] ?? tx,
      ),
    ],
    [recordedTxs, removedIds, editedTxs],
  )
  const filtered = useMemo(
    () => filterHistoryTransactions(transactions, activeFilters, searchQuery, today),
    [transactions, activeFilters, searchQuery, today],
  )
  const groups = useMemo(() => groupTransactionsByDate(filtered, today), [filtered, today])
  const summary = useMemo(() => summarizeTransactions(filtered), [filtered])
  const hasIncome = useMemo(() => transactions.some((tx) => tx.type === 'income'), [transactions])

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

  const handleEdit = useCallback((tx: HistoryTransaction) => {
    /* Edit adalah jalur UTAMA perbaikan data (paket 03): tombolnya membuka sheet
       yang SUDAH TERISI data catatan itu. Detail & sheet titik tiga ditutup dulu
       supaya tidak ada dua panel bertumpuk di layar yang sama. */
    setSelectedTransaction(null)
    setMenuTx(null)
    setEditingTx(tx)
  }, [])

  /** simpan hasil edit: baris & total harian diganti versi barunya */
  const handleSaveEdit = useCallback((next: HistoryTransaction) => {
    setEditedTxs((prev) => ({ ...prev, [next.id]: next }))
    setEditingTx(null)
    toast.success(UPDATE_TRANSACTION_TOAST.title, {
      description: UPDATE_TRANSACTION_TOAST.description,
    })
  }, [])

  /** Undo: catatannya balik ke posisi semula tanpa perlu ditulis ulang */
  const restoreTransaction = useCallback((id: number) => {
    if (undoRef.current !== id) {
      toast(DELETE_TRANSACTION_TOAST.expired)
      return
    }
    undoRef.current = null
    setRemovedIds((prev) => prev.filter((item) => item !== id))
    toast.success(DELETE_TRANSACTION_TOAST.undoneTitle, {
      description: DELETE_TRANSACTION_TOAST.undoneDescription,
    })
  }, [])

  /**
   * Hapus sesungguhnya: catatannya keluar dari riwayat, TAPI hak
   * mengembalikannya masih hidup selama UNDO_WINDOW_MS (PRD 2251). Sesudah
   * jendelanya tutup, jejaknya dibuang sehingga undo yang terlambat ditolak
   * dengan jujur — bukan tombol yang diam-diam tidak bekerja.
   */
  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    undoRef.current = id
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setPendingDelete(null)
    setSelectedTransaction(null)

    toast.success(DELETE_TRANSACTION_TOAST.title, {
      description: DELETE_TRANSACTION_TOAST.description,
      action: { label: DELETE_TRANSACTION_TOAST.undo, onClick: () => restoreTransaction(id) },
      /* lama toast = lama hak undo; keduanya dari satu konstanta */
      duration: UNDO_WINDOW_MS,
    })

    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => {
      if (undoRef.current === id) undoRef.current = null
    }, UNDO_WINDOW_MS)
  }, [pendingDelete, restoreTransaction])


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
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
          Riwayat &amp; Insight
        </h1>
        <GlobalPrivacyToggle />
      </header>

      {/* ── FILTER GLOBAL — tepat di bawah judul, di ATAS semua konten ──────────
          Audit hierarki (Gestalt): dulu search + filter nyempil di TENGAH
          halaman (antara insight dan list) sehingga terlihat hanya berlaku
          untuk list di bawahnya. Sekarang dia duduk paling atas & diberi label
          "Filter Global" supaya jelas dia menyaring seluruh layar. */}
      <section className="mt-5 rounded-[1.75rem] bg-cream p-3 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-3.5 lg:mt-6">
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/40">
            <SlidersHorizontal className="size-3.5" strokeWidth={2.4} aria-hidden />
            Filter Global
          </span>
          {/* reset muncul HANYA saat ada yang perlu direset — hemat ruang & teks */}
          {(activeFilterCount > 0 || searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-ink/55 ring-1 ring-soil/8 transition-colors hover:bg-sage/60 hover:text-ink active:scale-95"
            >
              <RotateCcw className="size-3" strokeWidth={2.4} aria-hidden />
              Reset
            </button>
          )}
        </div>

        {/* pencarian: placeholder adalah CONTOH PROMPT, bukan "Cari catatan",
            supaya user tahu search-nya bisa bahasa sehari-hari */}
        <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-full bg-cream/80 px-4 ring-1 ring-inset ring-soil/8 transition-shadow focus-within:bg-cream focus-within:ring-2 focus-within:ring-forest/20">
          <Search className="size-4 shrink-0 text-ink/35" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Cari "pengeluaran kopi bulan lalu"…'
            aria-label="Cari catatan dengan bahasa sehari-hari"
            className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink/35"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-sage/60 hover:text-ink"
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
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full py-2 pl-3.5 pr-3 text-[12.5px] font-semibold transition-all duration-200 active:scale-95',
                  active
                    ? 'bg-forest text-cream shadow-[0_10px_22px_-16px_rgba(69,89,78,0.9)]'
                    : 'bg-cream text-ink/55 ring-1 ring-soil/10 hover:bg-sage/60 hover:text-ink',
                )}
              >
                {active ? selected?.label : row.label}
                <ChevronDown
                  className={cn('size-3.5', active ? 'text-cream/70' : 'text-ink/35')}
                  strokeWidth={2.6}
                />
              </button>
            )
          })}
        </div>
      </section>

      {/* banner rekap mingguan — HANYA Jumat–Sabtu–Minggu, dan bisa di-dismiss */}
      {recapWindow && !recapDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-5 flex items-center gap-2 rounded-[1.6rem] bg-gradient-to-r from-forest to-forest-soft pl-4 pr-2 text-cream ring-1 ring-soil/12 lg:mt-6"
        >
          {/* TODO (PRD Domain 3A Habit Loop 2): buka modal Rekap Mingguan
              full-screen 5 slide — sudah tersedia sebagai WeeklyRecapModal */}
          <button
            type="button"
            onClick={() => setRecapOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
          >
            <span aria-hidden className="text-[16px]">
              📈
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] font-semibold">
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

      {/* hero: kalibrasi profil AI / skor kewarasan + insight AI */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <FinancialHealthCard totalTransactions={totalTransactions} score={HEALTH_SCORE} />
        </div>
        <div className="lg:col-span-7">
          {/* CTA tiap insight punya tujuan nyata: "Atur Limit Kopi" membuka sheet
              budget dengan kategori Kopi sudah terpilih di /budget (prompt 24). */}
          <InsightCards totalTransactions={totalTransactions} hasIncome={hasIncome} />
        </div>
      </div>

      {/* heatmap keborosan 30 hari */}
      <div className="mt-5 lg:mt-6">
        <SpendingHeatmap masked={isMasked} />
      </div>

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
              <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">Catatan</h2>
              <p className="text-[11.5px] text-ink/45">
                {summary.count} transaksi
                {groups.length > 0 ? ` · ${groups.length} hari` : ''}
              </p>
            </div>
          </div>
          {/* pill jumlah hanya muncul saat ada filter — di keadaan normal
              subjudul di kiri sudah cukup, jadi tidak ada angka kembar */}
          {(activeFilterCount > 0 || searchQuery) && (
            <span className="rounded-full bg-cream px-3 py-1.5 text-[11.5px] font-semibold tabular-nums text-ink/60 ring-1 ring-soil/12">
              {summary.count} dari {transactions.length}
            </span>
          )}
        </div>

        {/* legenda makna warna — swatch & label dibaca dari `MONEY_TONE`,
            sumber yang sama dengan baris transaksinya, jadi mustahil beda */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-ink/45">
          <span className="font-medium">Keterangan</span>
          {MONEY_LEGEND.map((tone) => (
            <span key={tone.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn('size-3 rounded-[4px] ring-1 ring-inset ring-soil/12', tone.dot)}
              />
              {tone.label}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState onReset={resetFilters} hasFilters={activeFilterCount > 0 || !!searchQuery} />
        ) : (
          <div className="mt-5 space-y-5">
            {groups.map((group) => (
              <section key={group.date}>
                {/* kepala hari: label + garis + (pindah dana) + net harian.
                    Semua angka polos berwarna, tanpa pill — jadi mata membaca
                    kolom angka yang lurus, bukan deretan chip. */}
                <div className="flex items-center gap-2.5">
                  <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">
                    {group.label}
                  </p>
                  <span className="h-px min-w-4 flex-1 bg-soil/[0.09]" aria-hidden />
                  {group.moved > 0 && (
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink/40">
                      ⇄ {maskMoney(group.moved, isMasked)}
                    </span>
                  )}
                  <span
                    className={cn(
                      'shrink-0 text-[11.5px] font-bold tabular-nums',
                      group.net < 0
                        ? 'text-hud-terracotta'
                        : group.net > 0
                          ? 'text-forest'
                          : 'text-ink/35',
                    )}
                  >
                    {netLabel(group.net, isMasked)}
                  </span>
                </div>

                <ul className="mt-0.5 divide-y divide-soil/10">
                  {group.items.map((tx) => {
                    const delay = 60 + rowIndex++ * 45
                    return (
                      <HistoryTransactionRow
                        key={tx.id}
                        tx={tx}
                        masked={isMasked}
                        delay={delay}
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
              <Drawer.Title className="px-1 font-display text-[15px] font-bold tracking-tight text-ink">
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
                          ? 'bg-forest/[0.06] font-semibold text-forest'
                          : 'font-medium text-ink/65 hover:bg-cream',
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

      {/* Rekap Mingguan 5 slide (inventaris g) */}
      <WeeklyRecapModal open={recapOpen} onClose={() => setRecapOpen(false)} />
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/** Empty state nurturing (PRD State I): tidak ada catatan sama sekali
 *  atau hasil filter/pencarian kosong */
function EmptyState({ onReset, hasFilters }: { onReset: () => void; hasFilters: boolean }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-12 text-center">
      {/* TODO: ganti dengan ilustrasi empty state yang lucu */}
      <div
        className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-cream/60"
        aria-hidden
      >
        <Sprout className="size-7 text-forest/45" strokeWidth={1.8} />
      </div>
      <p className="mt-4 max-w-xs text-[13.5px] font-medium leading-relaxed text-ink">
        Belum ada catatan di sini 🌱
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <TransactionBottomSheet
          trigger={
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
            >
              Catat Sekarang
            </button>
          }
        />
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center rounded-2xl bg-cream px-4 text-[13.5px] font-semibold text-ink/70 ring-1 ring-soil/12 transition-colors hover:bg-sage/50"
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
