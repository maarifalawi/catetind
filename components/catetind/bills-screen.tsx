'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Plus, Receipt, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { MetaChip } from './meta-chip'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { ShieldMeter } from './shield-meter'
import { SalaryWaterfall } from './salary-waterfall'
import { BillTimeline } from './bill-timeline'
import { BillCard, type StampState } from './bill-card'
import { BillNotifNudge } from './bill-notif-nudge'
import { AddBillSheet, type NewBill } from './add-bill-sheet'
import { MarkBillPaidSheet } from './mark-bill-paid-sheet'
import { ConfirmDialog } from './confirm-dialog'
import { ContextSwitcher } from './context-switcher'
import { useMoneyContext } from './money-context-provider'
import { cn } from '@/lib/utils'
import {
  ADD_BILL_TOAST,
  BILL_FILTERS,
  CONFIRM_DELETE_BILL_COPY,
  CONFIRM_UNPAID_COPY,
  CURRENT_DAY,
  DELETE_BILL_TOAST,
  MARK_PAID_SHEET_COPY,
  MARK_PAID_TOAST,
  MARK_PAID_TOAST_EXTRA,
  TODAY_ISO,
  UNDO_WINDOW_MS,
  UNPAID_TOAST,
  UPDATE_BILL_TOAST,
  WATERFALL_NO_INCOME_COPY,
  billFilterCounts,
  billWalletName,
  burnPercentage,
  filterBills,
  groupBills,
  maskMoney,
  totalMonthlyBills,
  type Bill,
  type BillFilter,
} from '@/lib/data/bills'
import { MONEY_SETTINGS_HREF } from '@/lib/data/budget'
import {
  CONTEXT_EMPTY_COPY,
  CONTEXT_LABEL,
  SCOPE_NOTE,
  contextCaption,
} from '@/lib/data/money-context'
import {
  addBill,
  billsForContext,
  deleteBill,
  editBill,
  liveBills,
  markBillPaid,
  restoreBill as restoreBillInStore,
  unmarkBillPaid,
  useBillsStore,
} from '@/lib/money/bills-store'
import { defaultWalletNameFor, useMoneyStore, walletIdOfName, walletOptionsFor } from '@/lib/money/store'
import { useUserMoneySettings } from '@/lib/user-money-settings'
import { dayOfMonth } from '@/lib/time'
import { useTodayISO } from '@/lib/use-today-iso'

/* ── Tagihan Rutin (/app/bills) ──────────────────────────────────────────────
   Halaman ini SENGAJA bukan tabel daftar tagihan. Alurnya dibikin seperti
   checklist game:

   1. Tameng Proteksi  — tiap tagihan yang lunas menutup satu lajur perisai.
   2. Waterfall Gaji   — gaji "dimakan" potongan demi potongan, terbesar dulu.
   3. Timeline 7 hari  — tagihan terdekat; tap untuk lompat ke kartunya.
   4. Kartu tagihan    — TOMBOL yang selalu terlihat untuk "Tandai Lunas" /
                         "Batal lunas" (paket 60.4, supaya bisa dipakai di
                         desktop tanpa gesture), sementara geser kanan tetap
                         jadi jalur cepat untuk cap LUNAS (haptic + stempel
                         karet) dan geser kiri untuk Edit / Hapus.

   Privasi memakai state GLOBAL (<GlobalPrivacyToggle /> + usePrivacy) supaya
   tombol mata di halaman ini menyensor nominal yang sama dengan halaman lain.
   (Sebelumnya halaman ini punya `isMasked` lokal yang tidak pernah berubah —
   toggle-nya nyata-nyata tidak menyensor apa pun.) "Hari ini" dibaca dari
   `useTodayISO()` (paket 57): status "telat" memakai tanggal yang berjalan,
   bukan konstanta `CURRENT_DAY` — konstanta itu tinggal sebagai jangkar seed.
   ────────────────────────────────────────────────────────────────────────── */

/** jeda sampai stempel "fresh" menyusut jadi stempel samar milik kartu lunas.
 *  (Dulu ada jeda 600ms sebelum kartunya pindah grup supaya stempelnya sempat
 *  terlihat. Sejak paket 51 statusnya berubah BEGITU baris kasnya tertulis —
 *  uangnya harus bergerak saat itu juga, bukan setengah detik kemudian.) */
const STAMP_SETTLE = 1600
/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function BillsScreen() {
  /* ── STATE ──────────────────────────────────────────────────────────────── */
  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked } = usePrivacy()
  /* konteks uang (Pribadi/Keluarga/Bersama) — state GLOBAL yang sama dengan
     switcher halaman lain (paket 47). Daftar tagihan mengikutinya; ringkasan
     (tameng, waterfall, % beban tetap) tetap menghitung SEMUA tagihan. */
  const { context, setContext } = useMoneyContext()
  const [activeFilter, setActiveFilter] = useState<BillFilter>('semua')
  const [showAddBill, setShowAddBill] = useState(false)
  /** tagihan yang sedang dibuka di sheet EDIT (null = sheet-nya mode tambah) */
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  /** tagihan yang menunggu konfirmasi hapus — hapus TIDAK pernah langsung jalan */
  const [pendingDelete, setPendingDelete] = useState<Bill | null>(null)
  /** tagihan yang sedang dibayar (null = sheet "Tandai Lunas" tertutup) */
  const [payTarget, setPayTarget] = useState<Bill | null>(null)
  /**
   * Tagihan yang minta DIBATALKAN lunasnya (paket 60.4). Pintu ini lahir karena
   * "Batal lunas" dulu cuma bisa lewat tombol Undo di toast — 5 detik setelah
   * membayar, tidak ada lagi jalan membatalkannya. Sekarang tombolnya selalu
   * terlihat untuk tagihan yang punya catatan pembayaran, dan karena uangnya
   * benar-benar kembali ke dompet, ia selalu lewat konfirmasi dulu.
   */
  const [unpaidTarget, setUnpaidTarget] = useState<Bill | null>(null)
  /** jejak Undo HAPUS yang MASIH berlaku (dikosongkan begitu jendelanya lewat) */
  const undoRef = useRef<string | null>(null)
  /** jejak Undo "LUNAS" yang masih berlaku — untuk mencabut stempel + barisnya */
  const paidUndoRef = useRef<string | null>(null)
  /** true = sheet bayar ditutup karena baris kasnya sudah tertulis (bukan batal) */
  const paidRef = useRef(false)
  /** tagihan yang stempel LUNAS-nya baru saja dicap (animasi + haptic) */
  const [stampId, setStampId] = useState<string | null>(null)

  /* ── SATU SUMBER TAGIHAN (paket 51 · temuan E laporan 46) ────────────────
     Daftar tagihan sekarang hidup di `lib/money/bills-store.ts`, bukan di
     `useState` halaman ini. Sebelumnya: tagihan yang ditambah/diubah/dihapus
     hilang setelah refresh, dan "Tandai Lunas" cuma menempelkan stempel — kasnya
     tidak bergerak sama sekali. Dengan store ini, halaman Tagihan, file ekspor
     (`/settings/data` & `/help`), dan alur "Hapus Akun" membaca data yang SAMA. */
  const billsStore = useBillsStore()
  const bills = useMemo(() => liveBills(billsStore), [billsStore])
  /* Kas tetap milik store uang (paket 40): pilihan dompet di sheet "Tandai Lunas"
     dibaca dari ledger yang asli, lengkap dengan saldonya. */
  const money = useMoneyStore()
  const walletChoices = useMemo(() => walletOptionsFor(money), [money])
  /** kartu yang sedang disorot karena tanggalnya dipilih di timeline */
  const [highlightId, setHighlightId] = useState<string | null>(null)

  /* ── JANGKAR TANGGAL + PEMASUKAN USER (paket 57) ─────────────────────────
     `today` diisi setelah mount, jadi render server tidak menyebut tanggal
     perangkat. Sebelumnya `currentDay` dipatok 25 dan gaji memakai konstanta
     7.500.000: status telat bisa salah ("telat 3 hari" padahal hari ini 28) dan
     Waterfall Gaji membagi tagihan dengan pemasukan yang bukan milik user. */
  const today = useTodayISO()
  const todayIso = today || TODAY_ISO
  const settings = useUserMoneySettings()
  const currentDay = today ? dayOfMonth(today, CURRENT_DAY) : CURRENT_DAY
  const monthlyIncome = settings.monthlyIncome

  /** semua timer halaman — dibersihkan saat unmount supaya tidak ada set state
   *  pada komponen yang sudah hilang */
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  /* ── DATA TURUNAN ───────────────────────────────────────────────────────── */
  /** tagihan konteks aktif (paket 47) — dasar chip jumlah & angka filter.
   *  Penyaringnya `billsForContext()` dari store (memakai `scopedItems` kanon),
   *  jadi tidak ada logika penyaring kedua di komponen. */
  const scopedBills = useMemo(() => billsForContext(billsStore, context), [billsStore, context])
  /** angka di pill filter dihitung dari DAFTAR YANG DISARING (scopedBills), bukan
   *  dari seluruh tagihan: pill "Telat (1)" yang membuka daftar kosong adalah
   *  janji palsu — angka itu milik daftar yang benar-benar ia saring. */
  const counts = useMemo(
    () => billFilterCounts(scopedBills, currentDay),
    [scopedBills, currentDay],
  )
  const visibleBills = useMemo(
    () => filterBills(scopedBills, activeFilter, currentDay),
    [scopedBills, activeFilter, currentDay],
  )
  const groups = useMemo(() => groupBills(visibleBills, currentDay), [visibleBills, currentDay])
  /** TOTAL & beban tetap = SEMUA tagihan (kanon paket 47 #1: konteks menyaring
   *  daftar, bukan total). Angkanya dipakai MetaChip, tameng, dan waterfall. */
  const totalAmount = useMemo(() => totalMonthlyBills(bills), [bills])
  const burn = useMemo(() => burnPercentage(bills, monthlyIncome), [bills, monthlyIncome])
  /** tagihan yang benar-benar ada di list "Aktif" (belum lunas) — dipakai
   *  timeline supaya kalender & daftar tidak kontradiksi (audit #3) */
  const activeBills = useMemo(() => bills.filter((bill) => !bill.isPaidThisMonth), [bills])
  /** Dompet awal di sheet "Tandai Lunas": dompet tagihannya (kalau masih ada di
   *  ledger), kalau tidak → dompet pertama konteks uang aktif (paket 47). Dua
   *  jawaban itu bisa dijelaskan ke user; tidak ada tebakan baru. */
  const defaultPayWalletId = useMemo(() => {
    if (!payTarget) return walletChoices[0]?.id ?? ''
    if (walletChoices.some((option) => option.id === payTarget.walletId)) return payTarget.walletId
    return walletIdOfName(money, defaultWalletNameFor(context))
  }, [payTarget, walletChoices, money, context])
  /**
   * Nominal yang BENAR-BENAR dibayar (dibaca dari baris kasnya), dipakai dialog
   * "Batal lunas" — bukan `bill.amount`, karena tagihan dengan nominal fleksibel
   * bisa dibayar berapa saja (paket 51). Kalau barisnya tidak ketemu, jatuh ke
   * nominal tagihannya supaya dialog tidak menyebut Rp 0 yang menyesatkan.
   */
  const unpaidAmountLabel = useMemo(() => {
    if (!unpaidTarget) return ''
    const row = money.rows.find((item) => item.id === unpaidTarget.paidRowId)
    return maskMoney(row?.amount ?? unpaidTarget.amount, masked)
  }, [unpaidTarget, money, masked])

  /* ── AKSI ───────────────────────────────────────────────────────────────── */

  /**
   * 7C — "Tandai Lunas" (paket 51): sekarang MEMBUKA pemilih dompet, bukan
   * langsung menempelkan stempel. Sebabnya bisa dibuktikan: stempel LUNAS tanpa
   * uang keluar adalah klaim palsu (temuan E laporan 46). Uangnya benar-benar
   * keluar dari dompet yang dipilih user di `confirmBillPaid()` di bawah.
   */
  function handleMarkPaid(bill: Bill) {
    if (bill.isPaidThisMonth) return
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30])
      }
    } catch {
      /* iOS Safari tanpa Vibration API — abaikan */
    }
    setPayTarget(bill)
  }

  /**
   * Baris kasnya ditulis DI SINI (lewat `markBillPaid` → `postExpense`), baru
   * stempelnya naik. `false` = store menolak (dompet tidak dikenal / saldo
   * kurang) dan TIDAK ada yang berubah — sheet yang menampilkan alasannya,
   * bukan layar yang berbunyi "lunas".
   */
  function confirmBillPaid(amount: number, walletName: string): boolean {
    if (!payTarget) return false
    const result = markBillPaid(payTarget.id, walletName, amount)
    if (!result) return false

    paidRef.current = true
    setPayTarget(null)
    paidUndoRef.current = result.bill.id
    setStampId(result.bill.id)
    /* Toast-nya menyebut NOMINAL + DOMPET — itulah bukti yang bisa dicek user
       sendiri di /wallet, Home, dan Riwayat. */
    toast.success(
      MARK_PAID_TOAST(result.bill.name, maskMoney(result.amount, masked), result.walletName),
      {
        description: MARK_PAID_TOAST_EXTRA.description,
        action: { label: MARK_PAID_TOAST_EXTRA.undo, onClick: () => undoPaid(result.bill.id) },
        /* lama toast = lama hak membatalkan; keduanya dibaca dari satu konstanta */
        duration: UNDO_WINDOW_MS,
      },
    )
    later(() => {
      if (paidUndoRef.current === result.bill.id) paidUndoRef.current = null
    }, UNDO_WINDOW_MS)
    later(() => setStampId((current) => (current === result.bill.id ? null : current)), STAMP_SETTLE)
    return true
  }

  /**
   * Batal "Lunas" (salah tekan): `unmarkBillPaid()` mencabut stempelnya DAN
   * membalikkan baris kasnya (`removeRow`), jadi saldo dompetnya pulih — bukan
   * cuma tanda di layar yang hilang.
   */
  function undoPaid(billId: string) {
    if (paidUndoRef.current !== billId) {
      toast(MARK_PAID_TOAST_EXTRA.expired)
      return
    }
    paidUndoRef.current = null
    const result = unmarkBillPaid(billId)
    if (!result) {
      toast(MARK_PAID_TOAST_EXTRA.expired)
      return
    }
    setStampId((current) => (current === billId ? null : current))
    toast.success(MARK_PAID_TOAST_EXTRA.undoneTitle, {
      description: MARK_PAID_TOAST_EXTRA.undoneDescription,
    })
  }

  /**
   * Batal "Lunas" lewat TOMBOL (paket 60.4) — dua langkah jujur:
   *   1. `handleUnmarkPaid` menahan niatnya (dialog konfirmasi), karena uangnya
   *      benar-benar berpindah balik ke dompet;
   *   2. `confirmUnpaid` memanggil `unmarkBillPaid()` — baris kasnya dibalikkan
   *      (`removeRow` + koreksi saldo), jadi saldo dompetnya pulih — lalu
   *      menyebut NOMINAL & DOMPET yang menerima uang itu kembali.
   *
   * Beda dari tombol Undo di toast: jalur ini TIDAK dibatasi jendela 5 detik.
   * Alasannya: Undo di toast adalah jaring pengaman untuk salah tekan pada
   * detik-detik setelah aksi; tombol "Batal lunas" di kartu adalah keputusan
   * sadar, dan tagihan yang salah ditandai lunas kemarin pun harus bisa
   * dibetulkan hari ini.
   */
  function handleUnmarkPaid(bill: Bill) {
    setUnpaidTarget(bill)
  }

  function confirmUnpaid() {
    if (!unpaidTarget) return
    const bill = unpaidTarget
    setUnpaidTarget(null)

    const result = unmarkBillPaid(bill.id)
    if (!result) {
      /* statusnya keburu berubah (mis. di tab lain) → tidak ada yang dibatalkan */
      toast(UNPAID_TOAST.rejected)
      return
    }
    setStampId((current) => (current === bill.id ? null : current))

    if (!result.row) {
      /* tagihan contoh yang stempelnya tidak punya baris kas: stempelnya dicabut,
         tapi TIDAK ada uang yang kembali — dan itu dikatakan apa adanya */
      toast(UNPAID_TOAST.noRow)
      return
    }

    const walletLabel =
      walletChoices.find((option) => option.id === result.row?.walletId)?.label ??
      billWalletName(bill.walletId)
    toast.success(UNPAID_TOAST.title(bill.name), {
      description: UNPAID_TOAST.description(maskMoney(result.row.amount, masked), walletLabel),
    })
  }

  /**
   * Sheet bayar ditutup tanpa menekan simpan → tidak ada yang dibayar, dan itu
   * DIKATAKAN apa adanya supaya user tidak menduga tagihannya sudah lunas.
   */
  function closePaySheet() {
    const paid = paidRef.current
    paidRef.current = false
    setPayTarget(null)
    if (!paid) toast(MARK_PAID_SHEET_COPY.closedNote)
  }

  /** 7D — Edit: buka sheet yang SAMA dengan sheet tambah, tapi terisi data
   *  tagihan ini (paket 03). Tidak ada toast "segera hadir" lagi: menekan Edit
   *  langsung membawa user ke form yang bisa langsung dibetulkan. */
  function handleEdit(bill: Bill) {
    setEditingBill(bill)
  }

  /** 7D — Hapus: tolak dulu, jangan langsung hilang (aksi merusak + Undo) */
  function handleDelete(bill: Bill) {
    setPendingDelete(bill)
  }

  /**
   * Hapus sesungguhnya: `deleteBill()` memasang TOMBSTONE di store — barisnya
   * tetap disimpan beserta status lunasnya — TAPI hak mengembalikannya masih
   * hidup selama UNDO_WINDOW_MS (PRD 2251). Toast-nya membawa tombol Undo;
   * setelah jendelanya tutup, jejaknya dibuang sehingga undo yang datang
   * terlambat ditolak dengan jujur — bukan diam-diam tidak terjadi apa-apa.
   *
   * Baris kas pembayarannya sengaja TIDAK ikut dihapus: kalau uangnya memang
   * sudah keluar, menghapus tagihannya bukan alasan menghapus jejak uang itu.
   */
  function confirmDelete() {
    if (!pendingDelete) return
    const bill = pendingDelete
    if (!deleteBill(bill.id)) {
      /* sudah dihapus sebelumnya (mis. dari perangkat lain) — tidak ada yang
         berubah, jadi tidak ada toast "berhasil" */
      setPendingDelete(null)
      return
    }
    undoRef.current = bill.id
    setPendingDelete(null)

    toast(DELETE_BILL_TOAST.title, {
      description: DELETE_BILL_TOAST.description(bill.name),
      action: { label: DELETE_BILL_TOAST.undo, onClick: () => undoDelete(bill.id) },
      /* lama toast = lama hak undo; keduanya dibaca dari satu konstanta */
      duration: UNDO_WINDOW_MS,
    })

    later(() => {
      if (undoRef.current === bill.id) undoRef.current = null
    }, UNDO_WINDOW_MS)
  }

  /** Undo: cabut tombstone-nya — tagihannya balik BESERTA status "lunas bulan
   *  ini"-nya, jadi jendela Undo tidak pernah menelan status yang benar. */
  function undoDelete(billId: string) {
    if (undoRef.current !== billId) {
      toast(DELETE_BILL_TOAST.expired)
      return
    }
    undoRef.current = null
    if (!restoreBillInStore(billId)) {
      toast(DELETE_BILL_TOAST.expired)
      return
    }
    toast.success(DELETE_BILL_TOAST.undoneTitle, {
      description: DELETE_BILL_TOAST.undoneDescription,
    })
  }

  /** 9D — tagihan baru masuk sebagai lajur kosong berikutnya di tameng */
  function handleSaveBill(data: NewBill) {
    /* Mode EDIT: id & status "lunas bulan ini" dipertahankan — yang berubah cuma
       field yang benar-benar dikoreksi user (termasuk tenor & catatannya). Yang
       mengubahnya store, jadi halaman lain & file ekspor ikut melihatnya. */
    if (editingBill) {
      const updated = editBill(editingBill.id, data)
      setEditingBill(null)
      if (!updated) {
        toast.error(UPDATE_BILL_TOAST.expired)
        return
      }
      toast.success(UPDATE_BILL_TOAST.title, { description: UPDATE_BILL_TOAST.description })
      return
    }

    /* `scope` ditempelkan DI SINI, dari konteks yang sedang aktif (paket 47):
       tagihan yang dicatat saat konteks "Keluarga" masuk konteks Keluarga, jadi
       ia langsung terlihat di daftar yang user lihat sendiri. Sheet-nya sengaja
       tidak punya kontrol konteks — konteks itu satu state global.
       `id` dibuat store (dan langsung disimpan ke perangkat), jadi tagihan baru
       tidak lagi hilang saat halaman di-refresh (temuan E laporan 46). */
    addBill({ ...data, isPaidThisMonth: false, scope: context })
    setActiveFilter('semua')
    setShowAddBill(false)
    toast.success(ADD_BILL_TOAST.title)
  }

  /** 5 — tap tanggal di timeline: buka filternya, gulir ke kartu, sorot sebentar */
  function handlePickBill(bill: Bill) {
    setActiveFilter('semua')
    setHighlightId(bill.id)
    later(() => {
      const element = document.getElementById(`bill-card-${bill.id}`)
      if (!element) return
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      try {
        element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
      } catch {
        /* browser lawas tanpa scrollIntoView halus — kartunya tetap terlihat */
      }
    }, 80)
    later(() => setHighlightId((current) => (current === bill.id ? null : current)), 1800)
  }

  /** nomor urut global antar grup supaya animasi masuk kartu beruntun */
  let rowIndex = 0


  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <ScreenShell>
      {/* ── HEADER — kerangka sama dengan Dashboard/Budget (audit UX #1) ────
          Container `max-w-[640px]` + header sticky yang "bleed" ke tepi
          DIHAPUS: itu penyebab seluruh halaman terkurung jadi satu kolom
          sempit di tengah. Sekarang konten melebar penuh (full-width) dan
          dipecah 2 kolom di desktop. */}
      <header className="flex items-start justify-between lg:hidden">
        <LogoWordmark className="h-5" />
        <GlobalPrivacyToggle />
      </header>

      {/* switcher konteks (mobile): baris sendiri di bawah header — persis pola
          Home & Budget (paket 47). */}
      <div className="mt-4 flex justify-center lg:hidden">
        <ContextSwitcher value={context} onChange={setContext} />
      </div>

      <div className="mt-4 lg:mt-0 lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink/45">
            {contextCaption(context)} · pengeluaran tetap bulan ini
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
            Tagihan Rutin
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-3">
            {/* chip ini menghitung SEMUA tagihan (bukan yang tersaring) supaya
                tidak ada dua angka untuk satu label di satu layar */}
            <MetaChip icon={Receipt}>{bills.length} tagihan</MetaChip>
            <MetaChip icon={WalletIcon}>{maskMoney(totalAmount, masked)}/bulan</MetaChip>
            <MetaChip icon={Flame}>{burn}% dari gaji</MetaChip>
          </div>
          {/* catatan cakupan: tameng, waterfall, dan chip di atas = SELURUH
              tagihan, sementara daftar di kanan mengikuti konteks aktif */}
          <p className="mt-1.5 text-[11.5px] font-medium text-ink/45">{SCOPE_NOTE.bills}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <ContextSwitcher value={context} onChange={setContext} className="w-[280px]" />
          <GlobalPrivacyToggle />
        </div>
      </div>

        {bills.length === 0 ? (
          /* 10. EMPTY STATE — tameng kelabu 0/0 + ajakan mencatat tagihan pertama */
          <EmptyState masked={masked} currentDay={currentDay} onAdd={() => setShowAddBill(true)} />
        ) : scopedBills.length === 0 ? (
          /* EMPTY STATE PER KONTEKS (paket 47): tagihan ada, tapi tidak satu pun
             milik konteks aktif. Daftar kosong tanpa penjelasan = user mengira
             datanya hilang; di sini alasannya disebut + ada CTA menambah. */
          <div className="mt-5 lg:mt-6">
            <ShieldMeter bills={[]} masked={masked} currentDay={currentDay} variant="compact" />
            <div className="mt-5 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
              <h2 className="font-display text-[16px] font-bold tracking-tight text-ink">
                {CONTEXT_EMPTY_COPY.bills.title(CONTEXT_LABEL[context])}
              </h2>
              <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink/55">
                {CONTEXT_EMPTY_COPY.bills.body}
              </p>
              <button
                type="button"
                onClick={() => setShowAddBill(true)}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
              >
                <Plus className="size-4" strokeWidth={2.6} />
                {CONTEXT_EMPTY_COPY.bills.cta}
              </button>
            </div>
          </div>
        ) : (
          /* ── FULL-WIDTH 2 KOLOM (audit UX #1) ─────────────────────────────
             KIRI  (5/12) — insight & visual : tameng, waterfall gaji, timeline
             KANAN (7/12) — list actionable : filter, daftar tagihan, + tambah
             Di mobile tetap satu kolom (insight dulu, lalu list). */
          <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
              {/* 3. TAMENG PROTEKSI */}
              <ShieldMeter bills={bills} masked={masked} currentDay={currentDay} className="mt-0" />

              {/* 8. NUDGE NOTIFIKASI — hanya saat izin belum pernah diminta */}
              <BillNotifNudge className="mt-0" />

              {/* 4. WATERFALL GAJI — pembaginya pemasukan user (paket 57).
                  Kalau belum diatur, kartu diganti kalimat jujur + tautan ke
                  Pengaturan: membagi dengan konstanta demo (atau nol) dua-duanya
                  klaim palsu. */}
              {monthlyIncome > 0 ? (
                <SalaryWaterfall
                  bills={bills}
                  masked={masked}
                  monthlyIncome={monthlyIncome}
                  className="mt-0"
                />
              ) : (
                <section
                  aria-label={WATERFALL_NO_INCOME_COPY.title}
                  className="rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12"
                >
                  <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
                    {WATERFALL_NO_INCOME_COPY.title}
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/55">
                    {WATERFALL_NO_INCOME_COPY.body}
                  </p>
                  <Link
                    href={MONEY_SETTINGS_HREF}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-[12px] font-semibold text-cream transition-colors hover:bg-forest-soft"
                  >
                    {WATERFALL_NO_INCOME_COPY.cta}
                  </Link>
                </section>
              )}

              {/* 5. TIMELINE 7 HARI — hanya tagihan yang ada di list Aktif */}
              <BillTimeline
                bills={activeBills}
                currentDay={currentDay}
                todayIso={todayIso}
                onPick={handlePickBill}
                className="mt-0"
              />
            </div>

            <section aria-label="Daftar tagihan" className="flex flex-col lg:col-span-7">
              {/* kepala daftar: judul + tombol tambah ringkas (audit #7 —
                  tidak lagi membentang penuh seperti footer di dasar layar) */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                    Daftar Tagihan
                  </h2>
                  {/* jumlah tagihan di KONTEKS AKTIF (paket 47) — pill filter di
                      bawah memakai angka yang sama, jadi tidak ada dua hitungan */}
                  <span className="rounded-full bg-sage px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-forest ring-1 ring-forest/10">
                    {scopedBills.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBill(true)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-forest px-3.5 text-[12px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
                >
                  <Plus className="size-4" strokeWidth={2.6} />
                  Tagihan
                </button>
              </div>

              {/* 6. FILTER PILLS — angkanya selalu dari semua tagihan */}
              <div
                role="group"
                aria-label="Filter tagihan"
                className="hide-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:px-0"
              >
                {BILL_FILTERS.map((pill) => {
                  const count = counts[pill.id]
                  const active = activeFilter === pill.id
                  const isLate = pill.id === 'telat'
                  const isPaidPill = pill.id === 'lunas'
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveFilter(pill.id)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 active:scale-95',
                        active
                          ? 'bg-forest text-mint shadow-[0_10px_22px_-14px_rgba(69,89,78,0.75)]'
                          : isLate && count > 0
                            ? 'bg-hud-terracotta/15 text-hud-terracotta ring-1 ring-inset ring-hud-terracotta/30'
                            : isPaidPill
                              ? 'bg-hud-sage/15 text-[#000000] ring-1 ring-inset ring-hud-sage/25'
                              : 'bg-cream text-ink/60 ring-1 ring-soil/14 hover:bg-cream hover:text-ink',
                      )}
                    >
                      {/* titik berdenyut kalau memang ada yang telat */}
                      {isLate && count > 0 && !active && (
                        <span className="relative flex size-1.5">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-hud-terracotta/70 motion-reduce:animate-none" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-hud-terracotta" />
                        </span>
                      )}
                      {isPaidPill ? 'Lunas ✓' : pill.label}
                      <span
                        className={cn('tabular-nums', active ? 'text-mint/70' : 'text-ink/40')}
                      >
                        ({count})
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* 7. DAFTAR TAGIHAN — dikelompokkan per status */}
              <div className="mt-3 flex flex-col gap-6 pb-1">
                {groups.length === 0 ? (
                  <p className="rounded-2xl bg-cream/70 px-4 py-6 text-center text-[12.5px] font-medium text-ink/45 ring-1 ring-soil/8">
                    Gak ada tagihan di filter ini. Coba “Semua” ya 🌿
                  </p>
                ) : (
                  groups.map((group) => (
                    <motion.section
                      key={group.meta.status}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.32, ease: EASE }}
                    >
                      {/* kepala grup — label inline (header halaman tidak lagi
                          sticky, jadi chip tidak perlu menempel ke viewport) */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full bg-cream/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ring-soil/10',
                            group.meta.labelClass,
                          )}
                        >
                          <span aria-hidden>{group.meta.icon}</span>
                          {group.meta.label}
                        </span>
                        <span
                          aria-hidden
                          className={cn('h-px flex-1 rounded-full opacity-40', group.meta.barClass)}
                        />
                        <span className="shrink-0 text-[10.5px] font-bold tabular-nums text-ink/35">
                          {group.items.length}
                        </span>
                      </div>

                      <motion.ul layout className="mt-2 flex flex-col gap-2">
                        {group.items.map((bill) => {
                          const delay = 60 + rowIndex++ * 45
                          const stamp: StampState =
                            stampId === bill.id
                              ? 'fresh'
                              : bill.isPaidThisMonth
                                ? 'settled'
                                : 'none'
                          return (
                            <BillCard
                              key={bill.id}
                              bill={bill}
                              masked={masked}
                              currentDay={currentDay}
                              stamp={stamp}
                              highlighted={highlightId === bill.id}
                              delay={delay}
                              onMarkPaid={handleMarkPaid}
                              onUnmarkPaid={handleUnmarkPaid}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          )
                        })}
                      </motion.ul>
                    </motion.section>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

      {/* bottom sheet (mobile) / dialog (desktop) — SATU sheet untuk dua mode:
          mode TAMBAH (`initial` kosong) dan mode EDIT (paket 03). `initial`-lah
          yang menentukan modenya, jadi tidak ada dua form yang harus dijaga
          supaya perilakunya tetap sama. */}
      <AddBillSheet
        open={showAddBill || editingBill !== null}
        initial={editingBill}
        onClose={() => {
          setShowAddBill(false)
          setEditingBill(null)
        }}
        onSave={handleSaveBill}
      />

      {/* sheet "Tandai Lunas" (paket 51) — pemilih DOMPET, bukan stempel. Ini
          satu-satunya jalan stempel LUNAS muncul: baris kasnya ditulis lebih dulu
          (`markBillPaid` → `postExpense`), jadi tidak ada status lunas tanpa uang
          yang benar-benar keluar dari dompet yang dipilih user. */}
      <MarkBillPaidSheet
        bill={payTarget}
        masked={masked}
        walletOptions={walletChoices}
        defaultWalletId={defaultPayWalletId}
        onClose={closePaySheet}
        onConfirm={confirmBillPaid}
      />

      {/* konfirmasi hapus: aksi merusak selalu ditolak dulu, baru boleh jalan.
          Setelah dikonfirmasi pun masih ada Undo di toast-nya (paket 03). */}
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDialog
            titleId="hapus-tagihan-judul"
            overlayLabel={CONFIRM_DELETE_BILL_COPY.overlay}
            title={CONFIRM_DELETE_BILL_COPY.title}
            body={CONFIRM_DELETE_BILL_COPY.body(pendingDelete.name)}
            safety={CONFIRM_DELETE_BILL_COPY.safety}
            cancelLabel={CONFIRM_DELETE_BILL_COPY.cancel}
            confirmLabel={CONFIRM_DELETE_BILL_COPY.confirm}
            onCancel={() => setPendingDelete(null)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>

      {/* konfirmasi "Batal lunas" (paket 60.4): uangnya kembali ke dompet, jadi
          nominal & akibatnya disebut lebih dulu — termasuk bahwa catatan
          pembayarannya tetap tersimpan di Riwayat. */}
      <AnimatePresence>
        {unpaidTarget && (
          <ConfirmDialog
            titleId="batal-lunas-judul"
            overlayLabel={CONFIRM_UNPAID_COPY.overlay}
            title={CONFIRM_UNPAID_COPY.title}
            body={CONFIRM_UNPAID_COPY.body(unpaidTarget.name, unpaidAmountLabel)}
            note={CONFIRM_UNPAID_COPY.note}
            cancelLabel={CONFIRM_UNPAID_COPY.cancel}
            confirmLabel={CONFIRM_UNPAID_COPY.confirm}
            onCancel={() => setUnpaidTarget(null)}
            onConfirm={confirmUnpaid}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/** 10. Empty state nurturing: belum ada tagihan rutin sama sekali */
function EmptyState({
  masked,
  currentDay,
  onAdd,
}: {
  masked: boolean
  /** hari ke berapa hari ini — dari tanggal perangkat (paket 57), bukan CURRENT_DAY */
  currentDay: number
  onAdd: () => void
}) {
  return (
    <div className="mt-5">
      {/* tameng 0/0 — kelabu penuh, tanpa ringkasan uang */}
      <ShieldMeter bills={[]} masked={masked} currentDay={currentDay} variant="compact" />

      <div className="mt-5 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-forest/15 bg-cream/50 px-6 py-10 text-center">
        <h2 className="font-display text-[16px] font-bold tracking-tight text-ink">
          Belum ada tagihan rutin
        </h2>
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink/55">
          Kos, Netflix, cicilan HP — catat biar jatah harian kamu lebih akurat 📋🌿
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Tambah Tagihan Pertama
        </button>
      </div>
    </div>
  )
}

/* Toggle privasi halaman ini memakai komponen baku GLOBAL (audit UX #4):
   <GlobalPrivacyToggle /> — ikon bulat di mobile, pill berlabel "Sembunyikan" /
   "Tampilkan" di desktop. State sensor dibaca dari PrivacyProvider (usePrivacy)
   sehingga benar-benar menyensor seluruh halaman dan sinkron dengan halaman
   lain. */
