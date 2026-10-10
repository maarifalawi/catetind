'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { ContextMenu } from './context-menu'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { WealthNetWorthBar } from './wealth-net-worth-bar'
import { WealthInvestasi } from './wealth-investasi'
import { WealthHutang } from './wealth-hutang'
import { WealthProperti } from './wealth-properti'
import { AddPhysicalAssetSheet, type PhysicalSaveInput } from './add-physical-asset-sheet'
import {
  addPhysicalAsset,
  deletePhysicalAsset,
  editPhysicalAsset,
  livePhysicalAssets,
  restorePhysicalAsset,
  usePhysicalStore,
} from '@/lib/money/physical-store'
import { AddInvestmentSheet, type InvestmentEditDraft, type NewInvestmentTx } from './add-investment-sheet'
import { AddDebtSheet, type NewDebtInput } from './add-debt-sheet'
import { UpdatePriceModal } from './update-price-modal'
import { cashTotal, useMoneyStore, walletOptionsFor } from '@/lib/money/store'
import {
  addDebt,
  addInvestment,
  deleteDebt,
  deleteInvestment,
  editDebt,
  editInvestment,
  liveDebts,
  liveInvestments,
  liveAssetTransactions,
  restoreDebt,
  restoreInvestment,
  settleDebt,
  updateInvestmentPrice,
  useWealthStore,
} from '@/lib/money/wealth-store'
import { cn } from '@/lib/utils'
import {
  ASSET_EDIT_TOAST,
  DEBT_EDIT_TOAST,
  DELETE_ASSET_TOAST,
  DELETE_DEBT_TOAST,
  EMPTY_INVESTASI_COPY,
  EMPTY_INVESTASI_CTA,
  EMPTY_INVESTASI_TITLE,
  PRICE_UPDATE_COPY,
  PHYSICAL_TAB_COPY,
  activeDebtRemaining,
  activeReceivableTotal,
  debtName,
  maskMoney,
  totalPhysicalValue,
  totalPortfolioValue,
  type Debt,
  type DebtView,
  type Investment,
  type PhysicalAsset,
  type WealthTab,
} from '@/lib/data/wealth'
import { DEBT_CASH_COPY, cashDirectionOf, settlementCounterparty } from '@/lib/data/wealth-cash'
/* jendela Undo (5 detik, PRD 2251) — SATU konstanta untuk Riwayat, Tagihan, dan
   hapus di halaman ini, supaya janji durasinya tidak berbeda antar halaman */
import { UNDO_WINDOW_MS } from '@/lib/data/history'
import { WealthDeleteDialog } from './wealth-delete-dialog'
import { useUserMoneySettings } from '@/lib/user-money-settings'
import { CONTEXT_EMPTY_COPY, CONTEXT_LABEL, scopedItems } from '@/lib/data/money-context'

/**
 * Dua panel halaman ini SIMETRIS: Kekayaan (Investasi | Properti) di kiri dan
 * Hutang (Hutang | Piutang) di kanan. Tipe ini yang membatasi tab sisi aset —
 * "Hutang" bukan lagi tab di kartu kiri, ia punya panelnya sendiri di kanan.
 */
type AssetTab = Extract<WealthTab, 'investasi' | 'properti'>

/* ── Kekayaan & Hutang (/app/wealth) — PRD Domain 2E ────────────────────────
   Halaman SIGNATURE CatetInd: satu layar yang menunjukkan gambaran finansial
   lengkap — investasi, properti (V1: placeholder), dan hutang.

   Yang membedakannya dari aplikasi pencatat keuangan biasa bukan jumlah fitur,
   tapi DUA visual:

   1. Tug-of-War Net Worth Bar (Section 3) — Aset vs Hutang dalam satu bar yang
      saling tarik, jadi user tahu "siapa yang menang" dalam sekejap, tanpa
      membaca satu angka pun. Definisi Aset di sini FINAL (audit fintech #1):
      KAS LIKUID (saldo dompet: BCA, GoPay, Tunai) + ASET INVESTASI.
   2. Debt Snowball Tracker (Section 7C) — daftar hutang platform yang diurut
      dari yang paling kecil supaya pelunasan terasa seperti menamatkan level
      game (bar mencair + confetti), bukan sekadar membayar tagihan.

   Catatan integrasi Daily HUD: cicilan platform (`totalMonthInstallments`)
   dipotong dari income pool SEBELUM jatah harian dibagi (Domain 2B). Karena itu
   nilainya ditulis terang-terangan di kartu ringkasan Tab 3.

   Koreksi (paket 17): aset & hutang WAJIB bisa dibetulkan user, karena nilainya
   diisi manual — tidak ada bank-sync (PRD 2E.1). Dua jalur koreksinya:
     - "Edit" di kartu aset → sheet yang sama dengan Tambah Investasi, mode edit.
     - "Update Manual" di kartu aset basi → modal harga sekarang (update-price-modal).

   Koreksi (paket 41 — audit Stage 4): pelunasan hutang & penerimaan piutang
   MENGGERAKKAN KAS. Dulu "Catat Bayar" hanya mengurangi `debt.remaining`, jadi
   Net Worth naik Rp 500.000 setiap user melunasi Rp 500.000 tanpa ada uang
   keluar. Sekarang debet/kreditnya lewat `postDebtSettlement()`
   (`lib/money/store.ts`), piutang ikut sisi ASET, dan kembalian (lebih bayar)
   dicatat sebagai baris `change` + catatan hutang/piutang barunya.

   Koreksi (paket 50 — temuan D laporan 46): halaman ini BERHENTI memegang
   salinan datanya sendiri. Dulu tiga `useState(INITIAL_*)` di dalam komponen
   membuat hutang yang ditambahkan / pelunasan / harga aset yang dikoreksi
   hilang begitu halaman di-refresh **dan** tidak pernah ikut file ekspor.
   Sekarang semua bacaan & tulisan lewat `lib/money/wealth-store.ts` — sumber
   yang sama dengan ekspor `/settings/data`, Pusat Bantuan, dan bar Net Worth.

   Waktu: "sekarang" memakai WAKTU PERANGKAT (store menstempel harga & tanggal
   transaksi dengan jam asli; badge "harga basi" juga diukur terhadap jam asli),
   bukan konstanta tanggal demo.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Jeda sebelum perayaan pelunasan ditutup (ms).
 *
 * Sejak paket 50 catatan hutangnya SUDAH lunas begitu `settleDebt()` menulis —
 * yang ditahan di sini hanya ANIMASI-nya: `WealthHutang` menahan bar yang
 * mencair (`celebrateId`) selama jeda ini, lalu halaman melepasnya sehingga
 * bar-nya hilang dari daftar dan kartu perayaan muncul (pola paket 17).
 */
const SETTLE_DELAY = 2200

export function WealthScreen() {
  /* ── STATE ──────────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked: isMasked } = usePrivacy()
  /* konteks uang (Pribadi/Keluarga/Bersama) — state GLOBAL (paket 47). Dipakai
     untuk menyaring DAFTAR aset & hutang; Net Worth di atas tetap seluruhnya. */
  const { context, setContext } = useMoneyContext()
  /* tab sisi ASET — tab "Hutang" lama dihapus; panel hutang ada di kanan */
  const [assetTab, setAssetTab] = useState<AssetTab>('investasi')
  const [debtView, setDebtView] = useState<DebtView>('hutangku')
  const [showAddInvestment, setShowAddInvestment] = useState(false)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null)
  /**
   * KEKAYAAN — SATU store (paket 50). Halaman ini TIDAK lagi menyimpan salinan
   * aset/hutang/pembayaran: dulu tiga `useState(INITIAL_*)` di sini membuat
   * catatan user hilang setelah refresh dan tidak pernah ikut file ekspor
   * (temuan D laporan 46). Sekarang: baca dari snapshot, tulis lewat API tulis
   * (`addInvestment`, `updateInvestmentPrice`, `editInvestment`,
   * `deleteInvestment`, `addDebt`, `settleDebt`).
   */
  const wealth = useWealthStore()
  /* `live*()` menyaring tombstone (paket 61): catatan yang baru dihapus tidak
     ikut ke daftar, Net Worth, tab, maupun riwayat pembayaran di layar ini —
     dan tidak pula ke file ekspor, yang membaca dua selector yang sama. */
  const investments = liveInvestments(wealth)
  const debts = liveDebts(wealth)
  /* ledger beli/jual NYATA dari store (dulu diisi konstanta mock
     `INITIAL_ASSET_TRANSACTIONS`) — riwayat per aset diturunkan dari sini */
  const assetTransactions = liveAssetTransactions(wealth)
  /* aset fisik / properti (paket 63) — store terpisah, pola sama dengan funds/bills */
  const physicalSnapshot = usePhysicalStore()
  const physicalAssets = livePhysicalAssets(physicalSnapshot)
  const physicalTotal = totalPhysicalValue(physicalAssets)
  const payments = wealth.payments
  /** aset yang sedang dibuka di sheet Edit Aset; null = sheet tertutup */
  const [editingAsset, setEditingAsset] = useState<Investment | null>(null)
  /** hutang/piutang yang sedang dibuka di sheet Edit Utang; null = tertutup */
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  /** catatan yang menunggu konfirmasi hapus — hapus TIDAK pernah langsung jalan */
  const [pendingDeleteDebt, setPendingDeleteDebt] = useState<Debt | null>(null)
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<Investment | null>(null)
  /** aset fisik (properti): sheet tambah/edit + target edit (paket 63) */
  const [showAddPhysical, setShowAddPhysical] = useState(false)
  const [editingPhysical, setEditingPhysical] = useState<PhysicalAsset | null>(null)
  /**
   * Hak Undo per baris: id yang hapusnya MASIH bisa dibatalkan. Selama jendela
   * `UNDO_WINDOW_MS` hidup, tombol Undo di toast mengembalikannya; sesudahnya
   * jejaknya dibuang sehingga Undo yang datang terlambat ditolak dengan kalimat
   * jujur — pola yang sama dengan halaman Tagihan & Riwayat (paket 03).
   */
  const undoDebtRef = useRef<string | null>(null)
  const undoAssetRef = useRef<string | null>(null)
  /** tombstone Undo khusus aset fisik (properti) — pola sama dengan aset/hutang */
  const undoPhysicalRef = useRef<string | null>(null)
  /** aset yang harganya sedang dikoreksi lewat modal "Update Manual" */
  const [priceTarget, setPriceTarget] = useState<Investment | null>(null)
  /** hutang platform yang barnya baru lunas — memicu confetti + kolaps */
  const [celebrateId, setCelebrateId] = useState<string | null>(null)
  /**
   * Pemasukan bulanan untuk pembagi rasio DTI (paket 57).
   *
   * Dulu konstanta demo `MONTHLY_INCOME` (7.500.000) — angka contoh yang dipakai
   * seolah-olah pemasukan user. Sekarang dari konfigurasi uang user
   * (`lib/user-money-settings.ts`, sumber awal = hasil onboarding). Kalau belum
   * diatur, nilainya 0 dan kartu DTI menampilkan "belum bisa dihitung" — bukan
   * "Sehat 0%" yang membaca seperti klaim aman.
   */
  const settings = useUserMoneySettings()
  const monthlyIncome = settings.monthlyIncome

  /** semua timer halaman — dibersihkan saat unmount (pola yang sama dengan
   *  halaman Tagihan) supaya tidak ada set-state pada komponen yang hilang */
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  /* ── ASET FISIK / PROPERTI (paket 63) ──────────────────────────────────────
     Tulis ke store aset fisik; Undo memakai jendela 5 detik yang sama dengan
     hapus aset/hutang supaya janji durasinya tidak berbeda antar kartu. */
  function handleSavePhysical(input: PhysicalSaveInput) {
    if (editingPhysical) {
      const updated = editPhysicalAsset(editingPhysical.id, input)
      setEditingPhysical(null)
      if (updated) toast.success(PHYSICAL_TAB_COPY.toast.edited)
      return
    }
    const created = addPhysicalAsset(input)
    if (created) toast.success(PHYSICAL_TAB_COPY.toast.added)
  }

  function handleDeletePhysical(asset: PhysicalAsset) {
    if (!deletePhysicalAsset(asset.id)) return
    undoPhysicalRef.current = asset.id
    toast(PHYSICAL_TAB_COPY.toast.deleted(asset.name), {
      action: {
        label: PHYSICAL_TAB_COPY.toast.undo,
        onClick: () => {
          if (undoPhysicalRef.current !== asset.id) return
          undoPhysicalRef.current = null
          restorePhysicalAsset(asset.id)
          toast.success(PHYSICAL_TAB_COPY.toast.restoredTitle, {
            description: PHYSICAL_TAB_COPY.toast.restoredBody,
          })
        },
      },
    })
    later(() => {
      if (undoPhysicalRef.current === asset.id) undoPhysicalRef.current = null
    }, UNDO_WINDOW_MS)
  }

  /* ── DATA TURUNAN ───────────────────────────────────────────────────────── */
  /** aset investasi saja (saham/reksadana/emas/crypto) — untuk kartu Tab 1 */
  const totalInvestments = useMemo(() => totalPortfolioValue(investments), [investments])
  /**
   * DAFTAR aset & hutang konteks aktif (paket 47) — yang disaring hanya daftar
   * tab-nya. Angka Net Worth di bawah tetap memakai himpunan PENUH (`investments`,
   * `debts`), persis aturan kanon: konteks menyaring daftar & arus, bukan total.
   */
  const visibleInvestments = useMemo(
    () => scopedItems(investments, context),
    [investments, context],
  )
  const visibleDebts = useMemo(() => scopedItems(debts, context), [debts, context])
  /**
   * KAS LIKUID — saldo seluruh dompet (BCA, GoPay, Tunai) dari SATU store uang
   * (`lib/money/store.ts`), sumber yang sama dengan Home dan halaman Dompet.
   * Audit fintech #1: kas WAJIB ikut jadi sisi ASET pada Net Worth — kalau
   * tidak, uang Rp 1 M di rekening tanpa saham akan ditampilkan sebagai Net
   * Worth nol. Karena `cashTotal()` membaca store, koreksi saldo yang ditulis
   * user di `/wallet` LANGSUNG terlihat di sini (audit #3).
   */
  const snapshot = useMoneyStore()
  const cash = useMemo(() => cashTotal(snapshot), [snapshot])
  const totalDebt = useMemo(() => activeDebtRemaining(debts), [debts])
  /**
   * PIUTANG aktif — uang kita yang masih dipegang orang lain. Sejak paket 41
   * angkanya ikut sisi ASET Net Worth (audit fintech #2); sebelum itu ia cuma
   * pajangan di tab "Piutangku".
   */
  const totalReceivable = useMemo(() => activeReceivableTotal(debts), [debts])
  /**
   * Dompet untuk sheet uang (Catat Bayar / Terima) — dari LEDGER, bukan daftar
   * mock, supaya dompet yang dipilih benar-benar bisa didebit/dikredit.
   */
  const walletOptions = useMemo(() => walletOptionsFor(snapshot), [snapshot])
  /**
   * Riwayat pembayaran yang ikut ditampilkan = milik hutang di DAFTAR tersaring
   * (paket 47). Tanpa ini, "Riwayat Pembayaran" di tab Hutang bisa menyebut
   * pembayaran hutang yang tidak ada di daftar mana pun di layar itu.
   */
  const visiblePayments = useMemo(() => {
    const ids = new Set(visibleDebts.map((debt) => debt.id))
    return payments.filter((payment) => ids.has(payment.debtId))
  }, [payments, visibleDebts])

  /* ── AKSI ───────────────────────────────────────────────────────────────── */

  /** transaksi investasi baru dicatat sebagai posisi baru — SATU tulisan ke
   *  store (`addInvestment`), jadi kartu aset, total portofolio, bar Net Worth,
   *  dan file ekspor membaca aset yang sama.
   *  Arah produksi: `investment_transactions` yang menampung barisnya, lalu
   *  `avg_buy_price` & quantity per aset DIHITUNG dari ledger itu (weighted
   *  average, PRD 2E.1 AC2) — dan aset yang belum punya baris ledger tampil
   *  sebagai empty state riwayat di kartu asetnya. */
  const handleSaveInvestment = useCallback(
    (tx: NewInvestmentTx) => {
      const entry = addInvestment({
        type: tx.assetType,
        name: tx.name,
        quantity: tx.quantity,
        price: tx.price,
        fees: tx.fees,
        /* arah & TANGGAL transaksi ikut tercatat ke ledger riwayat aset */
        side: tx.side,
        dateISO: tx.date,
        /* aset baru masuk ke KONTEKS YANG SEDANG AKTIF (paket 47) — kalau tidak,
           aset yang dicatat saat konteks "Keluarga" tidak akan muncul di tab yang
           user lihat sendiri setelah menyimpan. */
        scope: context,
      })
      /* `null` = input tidak sah → sheet dibiarkan terbuka, tidak ada yang ditulis */
      if (!entry) return
      setShowAddInvestment(false)
      toast.success('Investasi dicatat! 📈', {
        description: `${tx.side === 'buy' ? 'Beli' : 'Jual'} ${entry.name} tersimpan.`,
      })
    },
    [context],
  )

  /** fallback protocol 2E.1 poin 4: tombol "Update Manual" di kartu aset basi
   *  MEMBUKA modal koreksi harga — bukan langsung menulis angka. User harus
   *  melihat harga sekarang & akibatnya dulu sebelum angkanya masuk ke Net Worth. */
  const handleUpdatePrice = useCallback((asset: Investment) => {
    setPriceTarget(asset)
  }, [])

  /** Simpan harga hasil input user: harga pasar, nilai aset, dan stempel waktu
   *  ikut berubah — warning amber di kartu itu langsung hilang (`isStale: false`).
   *  Hitungannya di store (`updateInvestmentPrice`) supaya satu tindakan hanya
   *  punya satu tempat hitung. */
  const handleSavePrice = useCallback(
    (price: number) => {
      const target = priceTarget
      if (!target) return
      const updated = updateInvestmentPrice(target.id, price)
      if (!updated) return
      setPriceTarget(null)
      toast.success(PRICE_UPDATE_COPY.toastTitle, {
        description: PRICE_UPDATE_COPY.toastDescription(updated.name),
      })
    },
    [priceTarget],
  )

  /** "Edit" di kartu aset membuka sheet yang sama dengan Tambah Investasi,
   *  tapi dalam mode edit terisi nilai aset itu (lihat AddInvestmentSheet) */
  const handleEditAsset = useCallback((asset: Investment) => {
    setEditingAsset(asset)
  }, [])

  /** koreksi posisi aset: identitas, kuantitas, dan harga rata-rata beli.
   *  Harga pasar tidak disentuh di sini — jalurnya "Update Manual" di kartu,
   *  supaya stempel "Terakhir diperbarui" selalu berasal dari satu tindakan nyata. */
  const handleSaveAssetEdit = useCallback(
    (draft: InvestmentEditDraft) => {
      const target = editingAsset
      if (!target) return
      const updated = editInvestment(target.id, draft)
      if (!updated) return
      setEditingAsset(null)
      toast.success(ASSET_EDIT_TOAST.title, {
        description: ASSET_EDIT_TOAST.description(updated.name),
      })
    },
    [editingAsset],
  )

  /**
   * Hapus aset: DUA LANGKAH sejak paket 61 (dulu sekali tekan langsung hilang).
   *
   * Menghapus aset mengubah Net Worth, jadi tidak boleh terjadi tanpa
   * konfirmasi — dan sesudahnya masih ada jendela Undo. Ini juga yang membuat
   * aset & hutang punya SATU pengalaman (paket 61.2), bukan dua.
   */
  const handleDeleteAsset = useCallback((asset: Investment) => {
    setPendingDeleteAsset(asset)
  }, [])

  /**
   * Undo hapus aset: cabut tombstone-nya (`restoreInvestment`) sehingga asetnya
   * balik BESERTA nilainya. Undo yang datang setelah jendelanya tutup ditolak
   * dengan kalimat jujur — bukan diam-diam tidak terjadi apa-apa.
   */
  const undoDeleteAsset = useCallback((assetId: string) => {
    if (undoAssetRef.current !== assetId) {
      toast(DELETE_ASSET_TOAST.expired)
      return
    }
    undoAssetRef.current = null
    if (!restoreInvestment(assetId)) {
      toast(DELETE_ASSET_TOAST.expired)
      return
    }
    toast.success(DELETE_ASSET_TOAST.undoneTitle, {
      description: DELETE_ASSET_TOAST.undoneDescription,
    })
  }, [])

  /** hapus aset sesungguhnya — HANYA dipanggil dari dialog konfirmasi */
  const confirmDeleteAsset = useCallback(() => {
    const asset = pendingDeleteAsset
    if (!asset) return
    setPendingDeleteAsset(null)
    /* id tidak ada / sudah terhapus → tidak ada yang berubah, jadi tidak ada
       toast "berhasil" (pola yang sama dengan halaman Tagihan) */
    if (!deleteInvestment(asset.id)) return
    undoAssetRef.current = asset.id
    setExpandedAssetId((prev) => (prev === asset.id ? null : prev))

    toast(DELETE_ASSET_TOAST.title, {
      description: DELETE_ASSET_TOAST.description(asset.name),
      action: { label: DELETE_ASSET_TOAST.undo, onClick: () => undoDeleteAsset(asset.id) },
      /* lama toast = lama hak Undo; keduanya dibaca dari satu konstanta */
      duration: UNDO_WINDOW_MS,
    })
    later(() => {
      if (undoAssetRef.current === asset.id) undoAssetRef.current = null
    }, UNDO_WINDOW_MS)
  }, [pendingDeleteAsset, undoDeleteAsset])

  /**
   * AKSI UANG UTANG/PIUTANG (paket 41 & 50) — satu handler untuk dua arah:
   *   · `Catat Bayar` (platform & personal hutang) → DEBIT dompet (`debt_payment`)
   *   · `Diterima` (piutang)                        → KREDIT dompet (`receivable_payment`)
   *
   * Sejak paket 50 seluruh rangkaiannya SATU tulisan di store (`settleDebt`):
   * rencana pelunasan → baris kas (`postDebtSettlement` → `appendRow` → penjaga
   * invariant) → sisa & status catatan → riwayat `debt_payments` → catatan
   * kembalian. Kalau store menolak (nominal tidak sah / saldo dompet kurang /
   * aksi ini sudah pernah tercatat), fungsi ini mengembalikan `false` dan TIDAK
   * ada state yang berubah — jadi mustahil ada catatan hutang yang "lunas" tanpa
   * uang yang benar-benar keluar (temuan audit #1).
   */
  const handlePayDebt = useCallback(
    (debt: Debt, amount: number, date: string, walletId: string): boolean => {
      const direction = cashDirectionOf(debt)
      const counterparty = settlementCounterparty(debt)
      const result = settleDebt({ debtId: debt.id, walletId, paidAmount: amount, dateISO: date })
      if (!result) return false

      const plan = result.settlement.plan
      const toastCopy = direction === 'in' ? DEBT_CASH_COPY.receive : DEBT_CASH_COPY.pay
      toast.success(toastCopy.toastTitle(counterparty), {
        description: plan.settled ? toastCopy.toastSettled : toastCopy.toastShrinking,
      })
      if (plan.changeAmount > 0) {
        toast.message(DEBT_CASH_COPY.changeRecorded(maskMoney(plan.changeAmount, isMasked)))
      }

      /* Perayaan: catatannya SUDAH lunas (itu fakta yang tersimpan) — yang
         ditahan di sini animasinya saja. `celebrateId` membuat bar khusus itu
         tetap tampil & mencair selama SETTLE_DELAY, lalu halaman melepasnya. */
      if (plan.settled) {
        setCelebrateId(debt.id)
        later(() => setCelebrateId(null), SETTLE_DELAY)
      }
      return true
    },
    [isMasked],
  )

  const handleSaveDebt = useCallback(
    (input: NewDebtInput) => {
      /* hutang/piutang baru masuk ke KONTEKS YANG SEDANG AKTIF (paket 47), supaya
         catatan yang baru dibuat langsung terlihat di tab yang sedang dibuka */
      const created = addDebt({ ...input, scope: context })
      if (!created) return
      setShowAddDebt(false)
      setDebtView(created.direction === 'owed_to_me' ? 'piutangku' : 'hutangku')
      toast.success('Dicatat! 📝', {
        description:
          created.type === 'platform'
            ? `Cicilan ${created.provider} ikut dipotong dari Jatah Harian.`
            : 'Catatan utang/piutang tersimpan.',
      })
    },
    [context],
  )

  /**
   * Buka sheet EDIT untuk satu catatan hutang/piutang (paket 61).
   *
   * Sebelum paket 61 `editDebt()` sudah ada & teruji di store, tapi tidak ada
   * satu pun tombol yang memanggilnya — jadi user yang salah mengetik pokok/sisa
   * hutangnya hanya punya dua pilihan: membiarkan angkanya salah, atau menghapus
   * catatannya. Yang dibuka sekarang adalah sheet yang SAMA dengan Tambah
   * (mode edit), bukan form kedua yang harus dijaga terpisah.
   */
  const handleEditDebt = useCallback((debt: Debt) => {
    setEditingDebt(debt)
  }, [])

  /**
   * Simpan hasil edit: SATU pintu tulis `editDebt()` — tidak ada salinan hasil
   * edit di state halaman (larangan paket 48). Konteks uang catatannya
   * DIPERTAHANKAN dari catatan aslinya: membetulkan angka bukan alasan
   * memindahkan catatan itu ke konteks lain.
   */
  const handleSaveDebtEdit = useCallback(
    (id: string, patch: NewDebtInput) => {
      const target = editingDebt
      if (!target) return
      const updated = editDebt(id, { ...patch, scope: target.scope })
      if (!updated) return
      setEditingDebt(null)
      toast.success(DEBT_EDIT_TOAST.title, {
        description: DEBT_EDIT_TOAST.description(debtName(updated)),
      })
    },
    [editingDebt],
  )

  /** minta konfirmasi hapus catatan hutang/piutang (paket 61) */
  const handleDeleteDebt = useCallback((debt: Debt) => {
    setPendingDeleteDebt(debt)
  }, [])

  /**
   * Undo hapus hutang/piutang: cabut tombstone-nya. Riwayat pembayarannya ikut
   * kembali UTUH karena barisnya tidak pernah dibuang — hanya disembunyikan
   * (`paymentsOf()` yang menyaring saat catatannya bertombstone).
   */
  const undoDeleteDebt = useCallback((debtId: string) => {
    if (undoDebtRef.current !== debtId) {
      toast(DELETE_DEBT_TOAST.expired)
      return
    }
    undoDebtRef.current = null
    if (!restoreDebt(debtId)) {
      toast(DELETE_DEBT_TOAST.expired)
      return
    }
    toast.success(DELETE_DEBT_TOAST.undoneTitle, {
      description: DELETE_DEBT_TOAST.undoneDescription,
    })
  }, [])

  /**
   * Hapus catatan hutang sesungguhnya — HANYA dipanggil dari dialog konfirmasi.
   *
   * Yang ditulis: tombstone di store kekayaan. Yang TIDAK disentuh: baris kas
   * pelunasan yang sudah terjadi (`lib/money/store.ts`) — uang yang sudah
   * berpindah tangan itu fakta, dan menghapus catatannya tidak mengembalikannya
   * (kanon AUDIT §4). Akibatnya ke Net Worth sudah disebut di dialognya.
   */
  const confirmDeleteDebt = useCallback(() => {
    const debt = pendingDeleteDebt
    if (!debt) return
    setPendingDeleteDebt(null)
    if (!deleteDebt(debt.id)) return
    undoDebtRef.current = debt.id

    toast(DELETE_DEBT_TOAST.title, {
      description: DELETE_DEBT_TOAST.description(debtName(debt)),
      action: { label: DELETE_DEBT_TOAST.undo, onClick: () => undoDeleteDebt(debt.id) },
      duration: UNDO_WINDOW_MS,
    })
    later(() => {
      if (undoDebtRef.current === debt.id) undoDebtRef.current = null
    }, UNDO_WINDOW_MS)
  }, [pendingDeleteDebt, undoDeleteDebt])


  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* kolom konten: SENGAJA tanpa batas lebar & tanpa `mx-auto` — persis
          Dashboard (sumber kebenaran layout). Konten memakai seluruh lebar kolom
          dari `ScreenShell`, jadi tepi kiri-kanan kedua halaman lurus. */}
      <div>
        {/* ── SECTION 2: header halaman + toggle privasi ───────────────────
            Judul memakai gaya yang SAMA dengan halaman lain (polos, tanpa kotak
            latar) supaya konsisten di seluruh app. */}
        <header className="flex items-start justify-between gap-4">
          <h1 className="truncate font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            Kekayaan &amp; Hutang
          </h1>
          {/* cluster aksi desktop: pemilih konteks + tombol mata (paket 47).
              Di MOBILE keduanya sudah disediakan header mobile GLOBAL (paket 75)
              — /wealth menampilkan nominal, jadi tombol matanya ikut di sana. */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <ContextMenu value={context} onChange={setContext} className="w-44" />
            <GlobalPrivacyToggle />
          </div>
        </header>

        {/* pemilih konteks (mobile): barisnya sendiri di bawah header —
            pola penempatan yang sama dengan Home & Budget (paket 47) */}
        <div className="mt-4 flex justify-center lg:hidden">
          <ContextMenu value={context} onChange={setContext} className="w-56" />
        </div>

        {/* ── SECTION 3: HERO — Kekayaan Bersih (fokus absolut) ───────────
            Angkanya GLOBAL: seluruh aset, piutang, dan hutang (kanon paket 47
            #1). Komponennya sendiri yang menjumlahkan potongannya. */}
        <div className="mt-5 lg:mt-6">
          <WealthNetWorthBar
            cash={cash}
            investments={totalInvestments}
            physical={physicalTotal}
            receivables={totalReceivable}
            debts={totalDebt}
            masked={isMasked}
          />
        </div>

        {/* ── SECTION 4: DUA KARTU KEMBAR — KEKAYAAN | HUTANG ───────────────
            Grid, lebar maksimum, gap, DAN gaya kartu disalin PERSIS dari
            Dashboard (`home-screen.tsx`) supaya tepi & ritme dua halaman
            identik — `max-w-[1400px] · grid lg:grid-cols-12 · gap-5 lg:gap-6`
            + `rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12`. */}
        <div className="mx-auto mt-5 grid w-full max-w-[1400px] grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
          {/* ── KIRI · KEKAYAAN (aset) ─────────────────────────────────────── */}
          <section aria-label="Kekayaan" className="lg:col-span-6 lg:col-start-1 lg:row-start-1">
            <WealthPanel
              label="Kekayaan"
              total={assetTab === 'investasi' ? totalInvestments : physicalTotal}
              masked={isMasked}
              addLabel={assetTab === 'investasi' ? 'Tambah investasi' : 'Tambah aset'}
              onAdd={
                assetTab === 'investasi'
                  ? () => setShowAddInvestment(true)
                  : () => setShowAddPhysical(true)
              }
              toggle={
                <PanelToggle
                  id="asset"
                  value={assetTab}
                  onChange={(next) => setAssetTab(next as AssetTab)}
                  options={[
                    { id: 'investasi', label: 'Investasi' },
                    { id: 'properti', label: 'Properti' },
                  ]}
                />
              }
            >
              <AnimatePresence mode="wait" initial={false}>
                {assetTab === 'investasi' ? (
                  <motion.div
                    key="asset-investasi"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {visibleInvestments.length === 0 ? (
                      <EmptyInvestasi
                        onAdd={() => setShowAddInvestment(true)}
                        /* aset ada, tapi tidak satu pun milik konteks aktif (paket 47) */
                        contextLine={
                          investments.length > 0
                            ? CONTEXT_EMPTY_COPY.investments.title(CONTEXT_LABEL[context])
                            : undefined
                        }
                      />
                    ) : (
                      <WealthInvestasi
                        investments={visibleInvestments}
                        /* ledger beli/jual nyata dari store kekayaan */
                        transactions={assetTransactions}
                        masked={isMasked}
                        expandedAssetId={expandedAssetId}
                        onToggleExpand={(id) =>
                          setExpandedAssetId((prev) => (prev === id ? null : id))
                        }
                        onAdd={() => setShowAddInvestment(true)}
                        onUpdatePrice={handleUpdatePrice}
                        onEdit={handleEditAsset}
                        onDelete={handleDeleteAsset}
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="asset-properti"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <WealthProperti
                      assets={physicalAssets}
                      masked={isMasked}
                      onAdd={() => setShowAddPhysical(true)}
                      onEdit={(asset) => setEditingPhysical(asset)}
                      onDelete={handleDeletePhysical}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </WealthPanel>
          </section>

          {/* ── KANAN · HUTANG & PIUTANG ───────────────────────────────────── */}
          <section
            aria-label="Hutang dan piutang"
            className="lg:col-span-6 lg:col-start-7 lg:row-start-1"
          >
            <WealthPanel
              label="Hutang"
              total={debtView === 'hutangku' ? totalDebt : totalReceivable}
              masked={isMasked}
              addLabel="Tambah utang atau piutang"
              onAdd={() => setShowAddDebt(true)}
              toggle={
                <PanelToggle
                  id="debt"
                  value={debtView}
                  onChange={(next) => setDebtView(next as DebtView)}
                  options={[
                    { id: 'hutangku', label: 'Hutang' },
                    { id: 'piutangku', label: 'Piutang' },
                  ]}
                />
              }
            >
              <WealthHutang
                debts={visibleDebts}
                payments={visiblePayments}
                view={debtView}
                onChangeView={setDebtView}
                masked={isMasked}
                monthlyIncome={monthlyIncome}
                celebrateId={celebrateId}
                walletOptions={walletOptions}
                onAddDebt={() => setShowAddDebt(true)}
                onPayDebt={handlePayDebt}
                onEditDebt={handleEditDebt}
                onDeleteDebt={handleDeleteDebt}
                /* dokumen hutang ada, tapi tidak satu pun di konteks aktif (paket 47) */
                emptyContextLine={
                  debts.length > 0
                    ? CONTEXT_EMPTY_COPY.debts.title(CONTEXT_LABEL[context])
                    : undefined
                }
              />
            </WealthPanel>
          </section>
        </div>
      </div>

      {/* ── Sheet: tambah/edit investasi (5E) & tambah utang/piutang (7F) ────
          Satu sheet investasi melayani dua mode: `showAddInvestment` = tambah,
          `editingAsset` = edit (sheet dibuka terisi nilai aset itu). */}
      <AddInvestmentSheet
        open={showAddInvestment || editingAsset !== null}
        initial={editingAsset}
        onClose={() => {
          setShowAddInvestment(false)
          setEditingAsset(null)
        }}
        onSave={handleSaveInvestment}
        onEdit={handleSaveAssetEdit}
      />
      {/* Modal kecil "Update Manual" — koreksi harga SATU aset (PRD 2E.1 poin 4) */}
      <UpdatePriceModal
        asset={priceTarget}
        masked={isMasked}
        onClose={() => setPriceTarget(null)}
        onConfirm={handleSavePrice}
      />
      {/* Sheet utang/piutang — satu sheet dua mode (paket 61), sama seperti
          sheet investasi di atas: `showAddDebt` = tambah, `editingDebt` = edit. */}
      <AddDebtSheet
        open={showAddDebt || editingDebt !== null}
        initial={editingDebt}
        onClose={() => {
          setShowAddDebt(false)
          setEditingDebt(null)
        }}
        onSave={handleSaveDebt}
        onEdit={handleSaveDebtEdit}
        defaultView={debtView}
      />

      {/* Sheet aset fisik / properti (paket 63) — satu sheet dua mode, pola
          sama dengan sheet investasi & hutang di atas. */}
      <AddPhysicalAssetSheet
        open={showAddPhysical || editingPhysical !== null}
        editing={editingPhysical}
        scope={context}
        onClose={() => {
          setShowAddPhysical(false)
          setEditingPhysical(null)
        }}
        onSave={handleSavePhysical}
      />

      {/* Dialog konfirmasi hapus (paket 61) — SATU bentuk untuk hutang & aset,
          dibungkus <AnimatePresence> supaya animasi keluarnya tetap jalan.
          Nominalnya lewat `maskMoney`, jadi ikut tersensor saat mode privasi
          menyala (kanon privasi: yang dibaca disensor). */}
      <AnimatePresence>
        {pendingDeleteDebt && (
          <WealthDeleteDialog
            variant="debt"
            kind={pendingDeleteDebt.direction === 'owed_to_me' ? 'piutang' : 'hutang'}
            name={debtName(pendingDeleteDebt)}
            amountLabel={maskMoney(pendingDeleteDebt.remaining, isMasked)}
            onCancel={() => setPendingDeleteDebt(null)}
            onConfirm={confirmDeleteDebt}
          />
        )}
        {pendingDeleteAsset && (
          <WealthDeleteDialog
            variant="asset"
            name={pendingDeleteAsset.name}
            amountLabel={maskMoney(pendingDeleteAsset.currentValue, isMasked)}
            onCancel={() => setPendingDeleteAsset(null)}
            onConfirm={confirmDeleteAsset}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}


/* ── sub-komponen halaman ini ─────────────────────────────────────────────── */

/**
 * Kartu panel premium — SATU bentuk untuk sisi Kekayaan & sisi Hutang supaya
 * kedua kartu benar-benar simetris. Kepala kartu = label mikro + nominal
 * (mengikuti toggle) + satu tombol tambah; isinya bebas.
 */
function WealthPanel({
  label,
  total,
  masked,
  addLabel,
  onAdd,
  toggle,
  children,
}: {
  label: string
  total: number
  masked: boolean
  addLabel: string
  onAdd: () => void
  toggle: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-forest/40">
            {label}
          </p>
          <p className="mt-1.5 truncate font-display text-[1.7rem] font-semibold leading-none tracking-tight text-forest tabular-nums sm:text-[1.95rem]">
            {maskMoney(total, masked)}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel}
          title={addLabel}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest text-cream transition-colors hover:bg-forest-soft active:scale-95 motion-reduce:transition-none"
        >
          <Plus className="size-4" strokeWidth={2.6} aria-hidden />
        </button>
      </div>

      <div className="mt-4">{toggle}</div>

      <div className="mt-4 flex-1">{children}</div>
    </div>
  )
}

/**
 * Toggle dua posisi di dalam kepala kartu — bentuk pill yang sama untuk kedua
 * panel (Kekayaan: Investasi/Properti · Hutang: Hutang/Piutang). Posisi aktif
 * meluncur dengan `layoutId` per kartu (`id`) supaya kedua kartu tidak saling
 * menarik pill satu sama lain.
 */
function PanelToggle({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string
  options: { id: string; label: string }[]
  onChange: (next: string) => void
}) {
  return (
    <div
      role="tablist"
      className="relative flex w-full items-center gap-1 rounded-full bg-sage/70 p-1 ring-1 ring-soil/8"
    >
      {options.map((option) => {
        const isActive = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              'relative flex flex-1 items-center justify-center rounded-full px-3 py-2 text-[12.5px] font-medium transition-colors duration-200',
              isActive ? 'text-cream' : 'text-forest/55 hover:text-forest',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`panel-toggle-${id}`}
                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                className="absolute inset-0 rounded-full bg-forest"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** 8A — empty state investasi: nurturing, langsung kasih jalan keluar */
function EmptyInvestasi({
  onAdd,
  contextLine,
}: {
  onAdd: () => void
  /**
   * Judul khusus konteks (paket 47) — diisi HANYA kalau user punya aset, tapi
   * tidak satu pun di konteks yang sedang dibaca. Kalau daftarnya memang kosong
   * total, copy umum tetap dipakai ("belum ada aset") supaya pesannya tidak
   * menyalahkan konteks.
   */
  contextLine?: string
}) {
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-12 text-center">
      <span aria-hidden className="text-[30px]">
        🌱
      </span>
      <h2 className="mt-3 font-display text-[16px] font-semibold tracking-tight text-forest">
        {contextLine ?? EMPTY_INVESTASI_TITLE}
      </h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-forest/55">
        {contextLine ? CONTEXT_EMPTY_COPY.investments.body : EMPTY_INVESTASI_COPY}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.6} />
        {contextLine ? CONTEXT_EMPTY_COPY.investments.cta : EMPTY_INVESTASI_CTA}
      </button>
    </div>
  )
}

/** Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) — satu bentuk
 *  tombol mata yang sama di semua halaman. Lihat <GlobalPrivacyToggle />. */

