'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowLeftRight,
  Plus,
  ReceiptText,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Trash2,
  TrendingUp,
  Wallet as WalletIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { ConfirmDialog } from './confirm-dialog'
import { usePrivacy } from './privacy-provider'
import { SyncBalanceModal } from './sync-balance-modal'
import { TransferFlow } from './transfer-flow'
import {
  ContactlessIcon,
  MaskedAmount,
  WALLET_TYPE_LABEL,
  WalletArtDefs,
  WalletFace,
  WalletTypeMark,
} from './wallet-card-face'
import { HistoryTransactionRow } from './history-transaction-row'
import { TransactionDetailSheet } from './transaction-detail-sheet'
import { ConfirmDeleteDialog, TransactionActionsSheet } from './transaction-actions'
import { EditTransactionSheet } from './edit-transaction-sheet'
import { WalletDetailTrend } from './wallet-detail-trend'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import {
  applyRowOverride,
  cancelTransferRow,
  editRow,
  incomingTransfersFor,
  isRowRemoved,
  postBalanceAdjustment,
  removeRow,
  removeWalletAccount,
  restoreRow,
  restoreWalletAccount,
  undoTransferCancellation,
  useMoneyStore,
  walletAccountOf,
  walletBalance,
  walletRecordCount,
  walletTransactionsOf,
  type TransferCancellation,
  type WalletRemoval,
} from '@/lib/money/store'
import { useCountUp } from '@/hooks/use-count-up'
import { cn } from '@/lib/utils'
import { AMOUNT_XL } from '@/lib/typography'
import { formatIDR, type WalletAccount } from '@/lib/wallets'
import { TRANSFER_SHEET_COPY } from '@/lib/data/add-wallet'
import {
  DELETE_TRANSACTION_TOAST,
  MONEY_TONE,
  UNDO_WINDOW_MS,
  UPDATE_TRANSACTION_TOAST,
  groupTransactionsByDate,
  localISODate,
  maskMoney,
  netLabel,
  type HistoryTransaction,
} from '@/lib/data/history'
import {
  INSIGHT_MIN_TRANSACTIONS,
  WALLET_DELETE_COPY,
  WALLET_DELETE_TOAST,
  WALLET_DETAIL_COPY,
  WALLET_DETAIL_WINDOW_DAYS,
  WALLET_EMPTY_COPY,
  WALLET_LIST_COPY,
  WALLET_PATIENT_COPY,
  WALLET_PERIOD_COPY,
  WALLET_QUICK_ACTION_COPY,
  WALLET_SYNC_ADJUSTMENT_COPY,
  walletDeleteBalanceLabel,
  walletSparkline,
  walletSummary30d,
  walletTransactions,
  type WalletPeriodSummary,
} from '@/lib/data/wallet-detail'

/* ── Dompet Detail (/wallet/[id]) — inventaris #13 ────────────────────────────
   Pertanyaan yang dijawab halaman ini bukan "berapa total uangku", tapi
   "dompet INI gimana kondisinya?" — rekening yang sebentar lagi dipakai bayar
   sesuatu. Karena itu isinya dompet-lokal semua:

     1. HEADER — kembali ke /wallet, nama + jenis + nomor tersamarkan, dan
        tombol mata privasi GLOBAL yang sama dengan halaman lain.
     2. HERO — memakai <WalletFace/> yang SAMA dengan deck di /wallet (gradien
        `face` + motif batik + chip EMV). Saldonya dari `WalletAccount.balance`,
        bukan angka karangan; count-up-nya memakai hook bersama.
     3. RINGKAS 30 HARI — Masuk / Keluar / Net (label bebas istilah akuntansi).
        Garis "Arah Saldo" HANYA muncul kalau catatannya >= 7 (PRD 574–590);
        di bawah itu yang muncul KARTU SABAR berisi progress — bukan trend yang
        diklaim dari 2–3 transaksi.
     4. DAFTAR TRANSAKSI dompet ini, dikelompokkan per hari (helper yang sama
        dengan Riwayat & Insight), tiap baris bisa dibuka detailnya.
     5. AKSI CEPAT di STICKY BAWAH (zona ibu jari, PRD 2141–2145) — "Catat
        transaksi" & "Sesuaikan Saldo". Tidak ada aksi primer di header.

   Net minus sengaja ditulis netral (tinta biasa + tanda "−"), BUKAN merah:
   saldo turun bukan pelanggaran. Merah hanya untuk aksi merusak (Hapus). */

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function WalletDetailScreen({ walletId }: { walletId: string }) {
  /* privasi = state GLOBAL app; satu klik menyensor SEMUA nominal halaman ini,
     termasuk angka di tooltip grafik */
  const { masked } = usePrivacy()

  /* Dompet & saldonya dari SATU store uang (`lib/money/store.ts`) — bukan lagi
     prop yang dirender server dari konstanta. Sebabnya audit #6: koreksi saldo
     yang ditulis user di halaman lain tidak pernah terlihat di sini, karena
     halaman ini memegang salinan `wallet.balance` sejak HTML pertama. Sekarang
     saldonya `opening + Σ baris ledger`, jadi koreksi di `/wallet` langsung
     terbaca di sini (dan sebaliknya). */
  const snapshot = useMoneyStore()
  const wallet = walletAccountOf(snapshot, walletId)

  const router = useRouter()
  const [syncOpen, setSyncOpen] = useState(false)
  /** alur pindah dana dari dompet halaman ini (paket 55) */
  const [transferOpen, setTransferOpen] = useState(false)
  /** dialog konfirmasi hapus DOMPET ini (paket 62) */
  const [deleteWalletOpen, setDeleteWalletOpen] = useState(false)
  /** bukti hapus dompet yang hak Undo-nya masih hidup (bukan bahan render) */
  const undoWalletRef = useRef<WalletRemoval | null>(null)
  const undoWalletTimer = useRef<number | null>(null)
  const [selected, setSelected] = useState<HistoryTransaction | null>(null)
  /** baris yang sheet aksi titik-tiganya sedang terbuka */
  const [menuTx, setMenuTx] = useState<HistoryTransaction | null>(null)
  /** transaksi yang sheet EDIT-nya sedang terbuka (paket 03) */
  const [editingTx, setEditingTx] = useState<HistoryTransaction | null>(null)
  const [pendingDelete, setPendingDelete] = useState<HistoryTransaction | null>(null)
  /** id yang hak Undo-nya MASIH hidup + timer jendelanya */
  const undoRef = useRef<number | null>(null)
  const undoTimer = useRef<number | null>(null)
  /**
   * Pembatalan pindah dana yang sedang bisa di-Undo (paket 55). Disimpan di ref
   * karena ia bukan untuk dirender: isinya dua baris koreksi yang harus dicabut
   * bersama tombol Undo, dan hanya aksi Undo yang membacanya.
   */
  const undoCancelRef = useRef<TransferCancellation | null>(null)
  /** tanggal hari ini baru dihitung SETELAH mount, supaya label "Hari Ini" /
     "Kemarin" tidak pernah beda antara HTML server & client */
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(localISODate())
  }, [])

  /* timer jendela Undo dibersihkan saat halaman ditinggalkan */
  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
      if (undoWalletTimer.current !== null) window.clearTimeout(undoWalletTimer.current)
    },
    [],
  )

  /* ── data turunan ──────────────────────────────────────────────────────── */
  /* Catatan yang tampil di halaman ini HANYA milik dompet ini, dan identitasnya
     DOMPET-ID — bukan nama (`paket 59 · 59.3`):
       · `walletTransactionsOf()`  → baris ledger ber-`walletId` dompet ini;
       · `incomingTransfersFor()`  → sisi MASUK pindah dana (baris `transfer`
         menyimpan dompet ASAL di kolom `wallet`, jadi tanpa ini halaman dompet
         tujuan tidak menampilkan apa pun padahal saldonya baru saja bertambah);
       · `walletTransactions()`    → baris CONTOH dompet ini dari konstanta
         `lib/data/wallet-detail.ts`; kuncinya juga id dompet, jadi tidak pernah
         bocor ke dompet lain.
     Dulu baris sesi dicocokkan `tx.wallet === wallet.name`: dua dompet yang
     namanya sama (kasus nyata — user menambah "BCA" kedua) saling menampilkan
     catatan satu sama lain. Baris lama tanpa `walletId` (dompetnya belum ada di
     ledger) SENGAJA tidak dipaksa masuk ke dompet mana pun; ia tetap tampil di
     Riwayat dengan penanda "Belum berkonteks". */
  const txs = useMemo(
    () =>
      wallet
        ? [
            ...walletTransactionsOf(snapshot, wallet.id),
            ...incomingTransfersFor(snapshot, wallet.id),
            ...walletTransactions(wallet.id)
              .filter((tx) => !isRowRemoved(snapshot, tx.id))
              .map((tx) => applyRowOverride(snapshot, tx)),
          ]
        : [],
    [wallet, snapshot],
  )
  const summary = useMemo(() => walletSummary30d(txs, today), [txs, today])
  const groups = useMemo(() => groupTransactionsByDate(txs, today), [txs, today])
  const balance = wallet?.balance ?? 0
  const trend = useMemo(
    () =>
      wallet && txs.length >= INSIGHT_MIN_TRANSACTIONS ? walletSparkline(wallet, txs, today) : [],
    [wallet, txs, today],
  )
  const counted = useCountUp(balance)

  /* ── aksi ──────────────────────────────────────────────────────────────── */

  /**
   * Smart Sync: user menulis saldo ASLI yang ia baca sendiri di m-banking-nya.
   * Yang ditulis bukan cuma angka di layar, tapi BARIS LEDGER
   * (`balance_adjustment` bertanda) — sehingga selisihnya benar-benar jadi
   * catatan di Riwayat, persis seperti yang dijanjikan modal, dan Net Worth ikut
   * bergerak. Kalau saldonya sudah sama, tidak ada baris yang dibuat.
   */
  function handleSyncConfirm(newBalance: number) {
    if (!wallet) return
    const row = postBalanceAdjustment({ walletId: wallet.id, newBalance })
    setSyncOpen(false) // tutup seketika; animasi keluar jalan di background
    if (row) {
      toast.success(WALLET_QUICK_ACTION_COPY.syncToastTitle)
      return
    }
    toast.success(WALLET_SYNC_ADJUSTMENT_COPY.modalHint.none)
  }

  /** Edit: buka sheet yang sudah terisi data catatan ini (paket 03) */
  function handleEdit(tx: HistoryTransaction) {
    setSelected(null)
    setMenuTx(null)
    setEditingTx(tx)
  }

  /**
   * Simpan hasil edit lewat SATU pintu tulis (`editRow` di store uang) — baris
   * store diperbarui di barisnya, baris mock lewat `rowOverrides` yang diterapkan
   * SEMUA halaman (Riwayat, Home, grafik arus uang). Dulu versi barunya hidup di
   * `useState` halaman ini saja, jadi halaman lain tetap menampilkan angka lama
   * (temuan B laporan 46). Toast hanya berbunyi kalau penulisannya berhasil.
   */
  function handleSaveEdit(next: HistoryTransaction) {
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
  }

  /**
   * Undo hapus: hak mengembalikan catatan hidup selama UNDO_WINDOW_MS (PRD
   * 2251). Sesudah jendelanya tutup, jejaknya dibuang — tombol yang datang
   * terlambat ditolak dengan jujur, bukan diam-diam tidak bekerja.
   */
  function restoreTransaction(id: number) {
    if (undoRef.current !== id) {
      toast(DELETE_TRANSACTION_TOAST.expired)
      return
    }
    undoRef.current = null
    /* kalau yang tadi dibatalkan adalah pindah dana, Undo-nya juga mencabut dua
       baris koreksinya — bukan cuma mengembalikan catatannya (paket 55) */
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
  }

  /**
   * Hapus catatan. Satu jenis baris diperlakukan istimewa: `transfer`.
   *
   * Baris pindah dana menggerakkan DUA dompet, jadi tombstone saja akan
   * menyisakan uang di dompet tujuan sementara dompet asal tetap kosong. Karena
   * itu `cancelTransferRow()` (store) menghapus barisnya SEKALIGUS menulis dua
   * baris koreksi yang mengembalikan uangnya — dan mengembalikan `null` kalau
   * barisnya bukan pindah dana (atau uangnya sudah terpakai di tujuan).
   * Kalau `null`, jatuh ke jalur hapus biasa: satu pintu, dua kemungkinan yang
   * dikatakan apa adanya lewat toast.
   */
  function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    undoRef.current = id
    const cancellation =
      pendingDelete.type === 'transfer' ? cancelTransferRow(id) : null
    undoCancelRef.current = cancellation
    /* `cancelTransferRow` sudah menulis tombstone-nya sendiri */
    if (!cancellation) removeRow(id)
    setPendingDelete(null)
    setSelected(null)

    if (cancellation) {
      toast.success(TRANSFER_SHEET_COPY.cancelToastTitle, {
        description: TRANSFER_SHEET_COPY.cancelToastDescription(
          cancellation.fromName,
          cancellation.toName,
        ),
        action: { label: DELETE_TRANSACTION_TOAST.undo, onClick: () => restoreTransaction(id) },
        duration: UNDO_WINDOW_MS,
      })
    } else {
      toast.success(DELETE_TRANSACTION_TOAST.title, {
        description: DELETE_TRANSACTION_TOAST.description,
        action: { label: DELETE_TRANSACTION_TOAST.undo, onClick: () => restoreTransaction(id) },
        duration: UNDO_WINDOW_MS,
      })
    }

    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => {
      if (undoRef.current === id) undoRef.current = null
      undoCancelRef.current = null
    }, UNDO_WINDOW_MS)
  }

  /* aksi dari sheet titik tiga (alternatif non-gesture) */
  function menuOpenDetail() {
    setSelected(menuTx)
    setMenuTx(null)
  }
  function menuEdit() {
    if (menuTx) handleEdit(menuTx)
    setMenuTx(null)
  }

  function menuDelete() {
    setPendingDelete(menuTx)
    setMenuTx(null)
  }

  /* ── HAPUS DOMPET (paket 62) ──────────────────────────────────────────────
     Aksi yang sama dengan popover kartu di `/wallet` — hanya pintunya yang
     berbeda, jadi dialog, satu pintu tulis (`removeWalletAccount`), dan jendela
     Undo-nya juga sama persis. Bedanya satu: setelah dompetnya benar-benar
     hilang, halaman ini tidak punya bahan render lagi (store mengembalikan
     `null`), jadi user diantar ke `/wallet` — dan tombol Undo di toast tetap
     bekerja dari halaman itu. */
  function confirmWalletDelete() {
    if (!wallet) return
    const removal = removeWalletAccount(wallet.id)
    setDeleteWalletOpen(false)
    if (!removal) {
      toast(WALLET_DELETE_TOAST.expired)
      return
    }

    undoWalletRef.current = removal
    if (undoWalletTimer.current !== null) window.clearTimeout(undoWalletTimer.current)
    undoWalletTimer.current = window.setTimeout(() => {
      if (undoWalletRef.current?.walletId === removal.walletId) undoWalletRef.current = null
    }, UNDO_WINDOW_MS)

    toast.success(WALLET_DELETE_TOAST.title(removal.name), {
      description: WALLET_DELETE_TOAST.description,
      action: { label: WALLET_DELETE_TOAST.undo, onClick: () => undoWalletDelete(removal) },
      duration: UNDO_WINDOW_MS,
    })

    router.push('/wallet')
  }

  /** Undo: dompetnya balik ke daftar — user tetap boleh balik ke halaman ini. */
  function undoWalletDelete(removal: WalletRemoval) {
    if (undoWalletRef.current?.walletId !== removal.walletId) {
      toast(WALLET_DELETE_TOAST.expired)
      return
    }
    undoWalletRef.current = null
    if (!restoreWalletAccount(removal)) {
      toast(WALLET_DELETE_TOAST.expired)
      return
    }
    toast.success(WALLET_DELETE_TOAST.undoneTitle, {
      description: WALLET_DELETE_TOAST.undoneDescription,
    })
  }

  /** nomor baris global supaya animasi masuk tetap berurutan antar grup */
  let rowIndex = 0

  /* id di URL tidak ketemu (mis. `/wallet/999`) → halaman penjelas, bukan layar
     kosong. SENGAJA bukan `notFound()`: dompet yang dibuat user baru ada setelah
     IndexedDB selesai dibaca, jadi render pertama (yang masih memakai snapshot
     server) tidak boleh langsung memutuskan halaman ini tidak ada. */
  if (!wallet) {
    return (
      <ScreenShell>
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center rounded-[2rem] bg-cream px-6 py-14 text-center ring-1 ring-soil/12">
          <span className="flex size-14 items-center justify-center rounded-full bg-sage text-forest">
            <WalletIcon className="size-6" strokeWidth={2} />
          </span>
          <p className="mt-5 font-display text-xl font-medium tracking-tight text-forest">
            {WALLET_DETAIL_COPY.notFoundTitle}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-forest/55">
            {WALLET_DETAIL_COPY.notFoundHint}
          </p>
          <Link
            href="/wallet"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
          >
            <ArrowLeft className="size-4" strokeWidth={2.4} aria-hidden />
            {WALLET_DETAIL_COPY.notFoundAction}
          </Link>
        </div>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      {/* definisi motif batik — dibuat sekali, dipakai muka kartu hero */}
      <WalletArtDefs />

      <div className="w-full">
        {/* ── HEADER: kembali + identitas dompet + toggle privasi GLOBAL ───────
            SENGAJA TIDAK STICKY (paket 82). Permintaan pemilik produk: "header
            gausah ikut kalau di-scroll". Dulu bar ini `sticky top-2 z-30` +
            backdrop-blur, jadi ia mengambang dan menutupi daftar transaksi saat
            user menggulir; sekarang ia mengalir bersama konten. Kartu latar +
            bayangannya juga dicabut supaya tidak ada blok berat di atas hero —
            identitas dompet sudah dibawa muka kartu di bawahnya. */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/wallet"
              aria-label={WALLET_DETAIL_COPY.back}
              className="flex size-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-cream text-forest ring-1 ring-soil/12 transition-colors hover:bg-sage/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 lg:h-11 lg:w-auto lg:px-3.5"
            >
              <ArrowLeft className="size-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
              <span className="hidden text-[12.5px] font-medium lg:inline">
                {WALLET_DETAIL_COPY.backLabel}
              </span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[19px] font-semibold tracking-tight text-forest lg:text-[22px]">
                {wallet.name}
              </h1>
              <p className="truncate text-[11px] text-forest/45">
                {WALLET_TYPE_LABEL[wallet.type]}
                {wallet.number ? ` · ${wallet.number}` : ''}
              </p>
            </div>
          </div>
          <GlobalPrivacyToggle />
        </header>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:mt-6 xl:grid-cols-2 xl:gap-6">
          {/* ── HERO (50/50): muka kartu dompet + saldo ─────────────────────
              Muka kartunya SENGAJA memakai <WalletFace/> — resep yang sama
              dengan deck di /wallet. Kalau mau mengubah tampilan kartu dompet,
              ubah di wallet-card-face.tsx supaya dua halaman ikut berubah.
              PAKET 82: kolomnya dulu 7/12 sehingga kartu terasa kegedean —
              sekarang dibelah rata dengan ringkasan 30 hari di sebelahnya, dan
              kartunya `h-full` supaya tidak menyisakan ruang kosong di kolom. */}
          <div className="group relative xl:col-span-1">
            <WalletFace
              wallet={wallet}
              haloClassName="absolute -inset-x-4 -bottom-6 top-8 rounded-[3rem] opacity-50 blur-2xl transition-all duration-500 ease-out group-hover:-bottom-8 group-hover:opacity-70 motion-reduce:transition-none"
              className="flex h-full flex-col rounded-[2.25rem] border border-cream/10 p-5 shadow-sm sm:p-6"
            >
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-[17px] font-medium tracking-tight sm:text-[19px]">
                      {wallet.name}
                    </p>
                    {/* ikon contactless hanya untuk kartu bank — benda aslinya
                        (uang kertas & saldo e-wallet) tidak punya RFID */}
                    {wallet.type === 'Bank' && (
                      <ContactlessIcon className="size-4 shrink-0 text-cream/55" />
                    )}
                  </div>
                  <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-cream/20 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-cream/90 ring-1 ring-inset ring-cream/30 backdrop-blur-[2px]">
                    <span aria-hidden className="size-1.5 rounded-full bg-cream/70" />
                    {WALLET_TYPE_LABEL[wallet.type]}
                  </span>
                  {wallet.number && wallet.type === 'Bank' && (
                    <p className="mt-2 truncate text-[10.5px] font-medium tracking-[0.2em] text-cream/60 tabular-nums">
                      {wallet.number}
                    </p>
                  )}
                </div>
                <WalletTypeMark wallet={wallet} chipId={`wallet-detail-chip-${wallet.id}`} />
              </div>

              <div className="relative mt-auto pt-7">
                {/* label mikro "Saldo" DIHAPUS (paket 77) — sama seperti muka
                    kartu di /wallet: nama dompet di atasnya + angka besar di
                    bawahnya sudah menjelaskan diri, dan label itu terulang di
                    setiap muka kartu. Kalimat "Dibaca dari catatanmu sendiri,
                    bukan sambungan ke m-banking." juga DIHAPUS (permintaan
                    pemilik produk, paket 82 round 3) — muka kartu hero tinggal
                    identitas + saldo. */}
                <MaskedAmount
                  value={formatIDR(counted)}
                  masked={masked}
                  className={cn(AMOUNT_XL, 'text-cream')}
                />
              </div>
            </WalletFace>
          </div>

          {/* ── SISI KANAN (1/2): ringkas 30 hari + (kartu sabar) ────────────
              `xl:col-span-1` — BUKAN nomor kolom grid 12. Induknya
              `xl:grid-cols-2` (dibelah rata dengan hero, paket 82). Sisa
              `col-span-5` dari tata letak lama (7/12 + 5/12, paket 40) membuat
              kolom ini melebar ke kolom implisit lalu TERDORONG ke baris
              berikutnya — separuh kanan baris hero jadi kosong. Satu kolom = satu
              kolom: kartu ringkasan duduk tepat di samping muka kartu. */}
          <div className="flex flex-col gap-4 xl:col-span-1">
            {summary ? (
              <PeriodSummaryCard summary={summary} trend={trend} masked={masked} />
            ) : txs.length > 0 ? (
              /* ada catatan, tapi tidak satu pun di 30 hari terakhir → dikatakan,
                 bukan dihilangkan diam-diam dari layar */
              <section className="rounded-[1.75rem] bg-cream p-5 text-[12.5px] leading-relaxed text-forest/60 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/10">
                {WALLET_PERIOD_COPY.emptyWindow(WALLET_DETAIL_WINDOW_DAYS)}
              </section>
            ) : null}
            {/* kartu sabar hanya saat ADA catatan tapi belum cukup (0 < n < 7):
                dompet yang benar-benar kosong sudah punya empty state + CTA di
                bawah — dua blok yang menjelaskan hal yang sama cuma menambah
                bising (dan `0/7` bukan informasi, itu kebisingan). */}
            {txs.length > 0 && txs.length < INSIGHT_MIN_TRANSACTIONS && (
              <PatientInsightCard count={txs.length} />
            )}
          </div>
        </div>

        {/* ── DAFTAR TRANSAKSI DOMPET INI ────────────────────────────────── */}
        <section className="mt-5 xl:mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
              <ReceiptText className="size-3.5" strokeWidth={2.5} />
            </span>
            <h2 className="font-display text-[17px] font-semibold tracking-tight text-forest">
              {WALLET_LIST_COPY.title}
            </h2>
            <span className="rounded-full bg-sage px-2 py-0.5 text-[10.5px] font-semibold text-forest tabular-nums ring-1 ring-forest/10">
              {WALLET_LIST_COPY.count(txs.length)}
            </span>
          </div>

          {groups.length === 0 ? (
            <EmptyTransactions walletName={wallet.name} />
          ) : (
            <div className="mt-4 space-y-5">
              {groups.map((group) => (
                <section key={group.date}>
                  {/* kepala hari: label + garis + (pindah dana) + TOTAL HARIAN
                      dalam pill netral (tinta + tanda −/+), bukan merah untuk
                      net minus — saldo turun bukan pelanggaran. */}
                  <div className="flex items-center gap-2.5">
                    <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-forest/45">
                      {group.label}
                    </p>
                    <span className="h-px min-w-4 flex-1 bg-soil/[0.09]" aria-hidden />
                    {group.moved > 0 && (
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-forest/40">
                        ⇄ {maskMoney(group.moved, masked)}
                      </span>
                    )}
                    <span className="shrink-0 rounded-full bg-sage/60 px-2.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-forest/75">
                      {netLabel(group.net, masked)}
                    </span>
                  </div>

                  {/* JARAK, BUKAN GARIS RAMBUT (paket 82 · aturan pemilik
                      produk): setiap catatan dipisah `gap-1.5` seperti daftar
                      transaksi di Dashboard & Riwayat, jadi tidak ada dua
                      catatan yang menempel. `divide-y` dicabut. */}
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {group.items.map((tx) => {
                      const delay = 60 + rowIndex++ * 45
                      return (
                        <HistoryTransactionRow
                          key={tx.id}
                          tx={tx}
                          masked={masked}
                          delay={delay}
                          /* nama dompet disembunyikan: SELURUH daftar ini dompet
                             yang sama, jadi menulisnya tiap baris cuma bising */
                          showWallet={false}
                          onOpen={setSelected}
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

        {/* ── AKSI CEPAT — STICKY DI ZONA IBU JARI (PRD 2141–2145) ───────────
            Tiga aksi primer halaman ini duduk di BAWAH, bukan di header: ibu jari
            menjangkau dasar layar, sedangkan header adalah hard-reach area.

            “Pindah Dana” (paket 55) ditambahkan di sini karena halaman inilah
            satu-satunya tempat yang tahu dompet MANA yang sedang dibaca:
            sebelumnya alur pindah dana hanya bisa dibuka dari popover kartu di
            /wallet, dan halaman ini hanya menyebutnya di komentar — pintu yang
            benar-benar tidak ada.

            `bottom-[5.5rem]` di mobile = duduk TEPAT DI ATAS bottom nav
            (nav = bottom-5 + tinggi 16 ≈ 84px); di desktop nav-nya hilang jadi
            bar-nya turun ke dasar kolom; `max-w-xl` di tengah menjaga bar supaya tidak
            menabrak FAB AI Coach yang mengambang di kanan bawah. */}
        <div className="sticky bottom-[5.5rem] z-30 mt-6 lg:bottom-5">
          {/* Bar aksi mengambang (paket 82): SATU tombol primer berlabel + tiga
              aksi sekunder IKON-SAJA (masing-masing punya aria-label + tooltip).
              Dulu keempatnya tombol penuh bergaya sama, jadi tidak ada arah baca
              dan bar-nya terasa berat. Sekarang hierarkinya jelas dalam sekali
              lirik, dan bar-nya duduk di tengah kolom (`max-w-xl`) supaya tidak
              menabrak FAB AI Coach yang mengambang di kanan bawah. */}
          <div className="mx-auto flex max-w-xl items-center gap-1.5 rounded-2xl bg-cream/95 p-1.5 shadow-[0_20px_44px_-24px_rgba(0,0,0,0.4)] ring-1 ring-soil/12 backdrop-blur-md">
            <TransactionBottomSheet
              defaultType="expense"
              walletName={wallet.name}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.99]"
                >
                  <Plus className="size-4" strokeWidth={2.6} aria-hidden />
                  {WALLET_QUICK_ACTION_COPY.add}
                </button>
              }
            />
            <IconAction
              onClick={() => setSyncOpen(true)}
              label={WALLET_QUICK_ACTION_COPY.sync}
              hint={WALLET_QUICK_ACTION_COPY.syncHint}
            >
              <SlidersHorizontal className="size-[18px]" strokeWidth={2.4} aria-hidden />
            </IconAction>
            {/* dompet asalnya SUDAH jelas (halaman ini) → user tidak memilih dua
                kali; alurnya tetap sheet yang sama dengan pintu lain */}
            <IconAction
              onClick={() => setTransferOpen(true)}
              label={WALLET_QUICK_ACTION_COPY.transferLabel}
              hint={WALLET_QUICK_ACTION_COPY.transferHint}
            >
              <ArrowLeftRight className="size-[18px]" strokeWidth={2.4} aria-hidden />
            </IconAction>
            {/* Aksi merusak: tetap TERLIHAT di bar aksi (bukan cuma di popover),
                tapi ikon-saja bernada plum — ia tidak boleh tampil sebesar aksi
                primer. `aria-label` menyebut dompetnya supaya pembaca layar tahu
                apa yang akan dihapus (paket 62). */}
            <IconAction
              onClick={() => setDeleteWalletOpen(true)}
              label={WALLET_DELETE_COPY.action}
              a11yLabel={WALLET_DELETE_COPY.actionA11y(wallet.name)}
              hint={WALLET_DELETE_COPY.actionHint}
              tone="danger"
            >
              <Trash2 className="size-[18px]" strokeWidth={2.4} aria-hidden />
            </IconAction>
          </div>
        </div>
      </div>

      {/* ── ALUR PINDAH DANA (paket 55) ────────────────────────────────────────
          Satu host alur yang sama dipakai popover kartu /wallet, tombol di sini,
          menu “Lainnya”, dan sidebar desktop. `source` = dompet halaman ini. */}
      <TransferFlow open={transferOpen} onOpenChange={setTransferOpen} source={wallet} />

      {/* ── SMART SYNC (Magic Vault) — koreksi saldo ke angka ASLI ──────────
          Modal yang sama dengan halaman Dompet & Akun: user menulis saldo yang
          ia baca sendiri di m-banking-nya (tanpa open-banking), selisihnya
          dihitung live, lalu hero & grafik halaman ini ikut bergerak. */}
      <SyncBalanceModal
        wallet={syncOpen ? wallet : null}
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        onConfirm={handleSyncConfirm}
      />

      {/* detail transaksi — modal di desktop, bottom sheet di mobile */}
      <TransactionDetailSheet
        tx={selected}
        masked={masked}
        onClose={() => setSelected(null)}
        onEdit={handleEdit}
        onDelete={setPendingDelete}
      />

      {/* sheet aksi titik tiga — wujud yang sama dengan Riwayat & Insight */}
      <TransactionActionsSheet
        tx={menuTx}
        masked={masked}
        onClose={() => setMenuTx(null)}
        onOpenDetail={menuOpenDetail}
        onEdit={menuEdit}
        onDelete={menuDelete}
      />

      {/* sheet EDIT transaksi (paket 03) — engine yang sama dengan tombol "+" */}
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
            masked={masked}
            onCancel={() => setPendingDelete(null)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>

      {/* ── KONFIRMASI HAPUS DOMPET (paket 62) ─────────────────────────────────
          Dialog yang SAMA dengan hapus catatan; angkanya dibaca dari snapshot
          hidup (jumlah catatan yang menyentuh dompet ini + saldonya, disensor
          kalau tombol mata sedang ON). */}
      <AnimatePresence>
        {deleteWalletOpen && (
          <ConfirmDialog
            titleId="hapus-dompet-detail-judul"
            overlayLabel={WALLET_DELETE_COPY.overlay}
            title={WALLET_DELETE_COPY.title(wallet.name)}
            body={
              <>
                {WALLET_DELETE_COPY.bodyLead(wallet.name)}
                <b className="font-medium text-forest">
                  {walletDeleteBalanceLabel(walletBalance(snapshot, wallet.id), masked)}
                </b>
                {WALLET_DELETE_COPY.bodyTail(walletRecordCount(snapshot, wallet.id))}
                <span className="mt-2 block">{WALLET_DELETE_COPY.keepNote}</span>
                <span className="mt-2 block">{WALLET_DELETE_COPY.moveFirstHint}</span>
              </>
            }
            safety={WALLET_DELETE_COPY.safety(UNDO_WINDOW_MS / 1000)}
            cancelLabel={WALLET_DELETE_COPY.cancel}
            confirmLabel={WALLET_DELETE_COPY.confirm}
            onCancel={() => setDeleteWalletOpen(false)}
            onConfirm={confirmWalletDelete}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/**
 * Tombol aksi SEKUNDER (ikon-saja) di bar aksi bawah halaman detail dompet.
 *
 * Bentuknya satu tempat supaya tiga aksi sekunder (Sesuaikan Saldo, Pindah
 * Dana, Hapus) MUSTAHIL berbeda ukuran/warna. Karena ikonnya tidak berlabel,
 * tiap tombol WAJIB punya `aria-label` yang menyebut aksinya + `title` sebagai
 * tooltip untuk pengguna mouse; `a11yLabel` dipakai kalau nama untuk pembaca
 * layar perlu lebih spesifik daripada label tampil (mis. hapus → "Hapus dompet
 * BCA"). Nada `danger` (plum) hanya untuk aksi merusak.
 */
function IconAction({
  onClick,
  label,
  a11yLabel,
  hint,
  tone = 'neutral',
  children,
}: {
  onClick: () => void
  /** nama aksi (dipakai sebagai aria-label & tooltip bila yang lain kosong) */
  label: string
  /** nama yang lebih spesifik untuk pembaca layar; default = `label` */
  a11yLabel?: string
  /** tooltip tambahan (mis. konsekuensi aksinya) */
  hint?: string
  tone?: 'neutral' | 'danger'
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={a11yLabel ?? label}
      title={hint ?? label}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 active:scale-95',
        tone === 'danger'
          ? 'text-plum hover:bg-plum/12 focus-visible:ring-plum/40'
          : 'text-forest/70 hover:bg-sage/70 hover:text-forest focus-visible:ring-forest/25',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Ringkas 30 hari: tiga angka (Masuk / Keluar / Net) + garis arah saldo.
 *
 * Net ditulis dengan tinta netral apa pun tandanya — turun bukan kesalahan.
 * "Masuk" memakai hijau uang-masuk & "Keluar" terracotta, konsisten dengan
 * MONEY_TONE di daftar transaksi (bahasa warna uang yang sama di seluruh app).
 */
function PeriodSummaryCard({
  summary,
  trend,
  masked,
}: {
  summary: WalletPeriodSummary
  trend: ReturnType<typeof walletSparkline>
  masked: boolean
}) {
  return (
    <section className="flex flex-1 flex-col rounded-[1.75rem] bg-cream p-4 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.5)] ring-1 ring-soil/10 sm:p-5">
      {/* kepala SATU baris: judul di kiri, jendela yang BENAR-BENAR dipakai di
          kanan. Sebelumnya keduanya dua baris terpisah; menyatukannya memangkas
          satu baris tinggi tanpa menghilangkan bukti rentangnya. */}
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
          <TrendingUp className="size-3.5" strokeWidth={2.6} />
        </span>
        <h2 className="font-display text-[15.5px] font-semibold tracking-tight text-forest">
          {WALLET_PERIOD_COPY.title}
        </h2>
        <span className="ml-auto min-w-0 truncate text-[10.5px] tabular-nums text-forest/40">
          {WALLET_PERIOD_COPY.windowHint(summary.fromLabel, summary.toLabel, summary.count)}
        </span>
      </div>

      {/* tiga angka dipisah hairline, BUKAN tiga kotak abu — lebih tenang,
          lebih padat, dan angkanya jadi satu baris baca yang utuh */}
      <dl className="mt-4 grid grid-cols-3 divide-x divide-soil/[0.08]">
        <PeriodStat
          label={WALLET_PERIOD_COPY.income}
          value={maskMoney(summary.income, masked)}
          tone={MONEY_TONE.income.text}
        />
        <PeriodStat
          label={WALLET_PERIOD_COPY.expense}
          value={maskMoney(summary.expense, masked)}
          tone={MONEY_TONE.expense.text}
        />
        <PeriodStat
          label={WALLET_PERIOD_COPY.net}
          value={netLabel(summary.net, masked)}
          tone="text-forest"
        />
      </dl>

      {/* grafik hanya kalau datanya memang cukup (>= 7 catatan). `mt-auto` →
          grafiknya menempel ke dasar kartu, jadi kolom kanan yang lebih pendek
          dari hero TIDAK menyisakan ruang kosong (paket 82). `pt-4` menjaga
          jarak minimum saat isinya justru lebih tinggi dari hero. */}
      {trend.length >= 2 && (
        <WalletDetailTrend points={trend} masked={masked} className="mt-auto pt-4" />
      )}
    </section>
  )
}

/**
 * Satu angka periode — rata kiri tanpa kotak latar, hanya dipisah hairline
 * antar kolom (`divide-x` di induk). Nominalnya `truncate` supaya angka panjang
 * (Rp 1.234.567) tidak pernah mendorong kolom tetangga keluar barisnya.
 */
function PeriodStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-forest/40">
        {label}
      </dt>
      <dd className={cn('mt-1 truncate text-[13.5px] font-semibold tabular-nums', tone)}>{value}</dd>
    </div>
  )
}

/**
 * KARTU SABAR — "jujur soal data tipis" (celah kompetitif kita, PRD 572).
 *
 * Muncul selama catatan dompet ini masih di bawah ambang insight. Isinya
 * progress menuju ambang, BUKAN kesimpulan finansial: klaim trend dari 2–3
 * transaksi itu gimmick yang merusak trust (PRD 584–590).
 */
function PatientInsightCard({ count }: { count: number }) {
  const progress = Math.min(count, INSIGHT_MIN_TRANSACTIONS)
  const pct = Math.round((progress / INSIGHT_MIN_TRANSACTIONS) * 100)

  return (
    <section className="rounded-[1.75rem] bg-cream p-5 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/10">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
          <Sparkles className="size-[18px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[14.5px] font-semibold tracking-tight text-forest">
            {WALLET_PATIENT_COPY.title}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-forest/60">
            {WALLET_PATIENT_COPY.body}
          </p>
        </div>
      </div>

      {/* progress [x/7] — engagement tanpa klaim prematur */}
      <div className="mt-4 flex items-center gap-3">
        <span
          role="progressbar"
          aria-label={WALLET_PATIENT_COPY.progress(count)}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={INSIGHT_MIN_TRANSACTIONS}
          className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-sage/70"
        >
          <motion.span
            className="block h-full rounded-full bg-gradient-to-r from-forest-soft to-leaf"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: EASE }}
          />
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-forest">
          {WALLET_PATIENT_COPY.progress(count)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-forest/40">
        {WALLET_PATIENT_COPY.progressHint(INSIGHT_MIN_TRANSACTIONS - progress)}
      </p>
    </section>
  )
}

/** empty state nurturing: dompet ini belum punya satu catatan pun */
function EmptyTransactions({ walletName }: { walletName: string }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
      {/* ilustrasi sederhana dari ikon yang sudah dipakai empty state app
          (bukan aset gambar terpisah yang harus dimuat) */}
      <div
        className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-forest/20 bg-cream/60"
        aria-hidden
      >
        <Sprout className="size-7 text-forest/45" strokeWidth={1.8} />
      </div>
      <p className="mt-4 max-w-xs text-[13.5px] font-medium leading-relaxed text-forest">
        {WALLET_EMPTY_COPY.body}
      </p>
      <p className="mt-1.5 max-w-xs text-[11.5px] leading-relaxed text-forest/45">
        {WALLET_EMPTY_COPY.hint}
      </p>
      <div className="mt-5">
        {/* `walletName` = dompet halaman ini, jadi CTA-nya benar-benar menulis ke
            dompet ini (dulu catatan dari sini jatuh ke dompet default konteks —
            paket 59 · 59.3/59.4) dan sheet-nya menampilkan tujuannya */}
        <TransactionBottomSheet
          walletName={walletName}
          trigger={
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
            >
              <Plus className="size-4" strokeWidth={2.6} aria-hidden />
              {WALLET_QUICK_ACTION_COPY.add}
            </button>
          }
        />
      </div>
    </div>
  )
}

