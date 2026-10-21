'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { usePrivacy } from './privacy-provider'
import { BillsOverview } from './bills-overview'
import { BillTimeline } from './bill-timeline'
import { BillCard, type StampState } from './bill-card'
import { BillNotifNudge } from './bill-notif-nudge'
import { AddBillSheet, type NewBill } from './add-bill-sheet'
import { MarkBillPaidSheet } from './mark-bill-paid-sheet'
import { ConfirmDialog } from './confirm-dialog'
import { ContextMenu } from './context-menu'
import { useMoneyContext } from './money-context-provider'
import { cn } from '@/lib/utils'
import {
  ADD_BILL_TOAST,
  BILL_FILTERS,
  CLEAR_PAID_TOAST,
  CONFIRM_CLEAR_PAID_COPY,
  CONFIRM_DELETE_BILL_COPY,
  CONFIRM_UNPAID_COPY,
  CURRENT_DAY,
  BILL_ADD_PLACEHOLDER,
  DELETE_BILL_TOAST,
  MARK_PAID_SHEET_COPY,
  MARK_PAID_TOAST,
  MARK_PAID_TOAST_EXTRA,
  TODAY_ISO,
  UNDO_WINDOW_MS,
  UNPAID_TOAST,
  UPDATE_BILL_TOAST,
  billFilterCounts,
  billWalletName,
  filterBills,
  groupBills,
  maskMoney,
  type Bill,
  type BillFilter,
} from '@/lib/data/bills'
import {
  CONTEXT_EMPTY_COPY,
  CONTEXT_LABEL,
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
import { dayOfMonth } from '@/lib/time'
import { useTodayISO } from '@/lib/use-today-iso'

/* ── Tagihan Rutin (/app/bills) ──────────────────────────────────────────────
   Desain halaman ini sengaja TIPIS: satu ringkasan, satu strip tanggal, satu
   daftar berwarna lembut, satu ajakan menambah.

   1. Ringkasan   — hanya nominal belum dibayar, cincin persentase, bar progres,
                    dan satu baris status. Tidak ada "Gaji terpakai": porsi
                    pemasukan adalah cerita Dashboard & Budget.
   2. Kalender 14 hari — tanggal + satu titik aksen untuk hari yang punya tagihan.
                    Ketuk tanggalnya → bubble berisi nama & nominal saja.
                    Tidak ada baris pratinjau duplikat dan tidak ada legenda.
   3. Daftar       — baris diberi tint Earth Pastel per status (hangat = belum
                    dibayar, hijau dingin = lunas, plum tipis = telat). Saat
                    tagihannya ≤5, tab filter diganti pembatas grup yang tenang.
   4. Kartu tagihan — tombol "Bayar →" selalu terlihat; geser kanan tetap jadi
                    jalur cepat cap LUNAS, geser kiri untuk Edit / Hapus.

   Privasi memakai state GLOBAL (<GlobalPrivacyToggle /> + usePrivacy) supaya
   tombol mata di halaman ini menyensor nominal yang sama dengan halaman lain.
   "Hari ini" dibaca dari `useTodayISO()` (paket 57): status "telat" memakai
   tanggal yang berjalan, bukan konstanta `CURRENT_DAY` — konstanta itu tinggal
   sebagai jangkar seed.
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
  /**
   * "Bersihkan" = HAPUS semua tagihan lunas sekaligus (bukan disembunyikan).
   * Aksi merusak, jadi selalu lewat dialog konfirmasi lebih dulu — dan setelah
   * dihapus masih ada jendela Undo yang sama dengan hapus satu tagihan.
   */
  const [pendingClearPaid, setPendingClearPaid] = useState<Bill[] | null>(null)
  /** jejak Undo BERSIHKAN (banyak id sekaligus) */
  const clearUndoRef = useRef<string[] | null>(null)

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

  /* ── JANGKAR TANGGAL (paket 57) ───────────────────────────────────────────
     `today` diisi setelah mount, jadi render server tidak menyebut tanggal
     perangkat. Sebelumnya `currentDay` dipatok 25, sehingga status telat bisa
     salah ("telat 3 hari" padahal hari ini 28). */
  const today = useTodayISO()
  const todayIso = today || TODAY_ISO
  const currentDay = today ? dayOfMonth(today, CURRENT_DAY) : CURRENT_DAY

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
  /* Jumlah tagihan ≤5 → tidak ada tab sama sekali. Tiga baris isi yang dipecah
     menjadi "Semua · Aktif · Lunas" membuat halaman terasa lebih rumit daripada
     isinya; pembatas grup di daftar sudah cukup memisahkan status. */
  const showFilterRail = scopedBills.length > 5
  /* Pil berisi 0 disembunyikan — deretan "Semua · Aktif · Telat 0 · Lunas"
     terlalu ramai dan "Telat 0" tidak punya tujuan. "Semua" selalu ada, dan
     pil yang sedang AKTIF tetap ditampilkan supaya user bisa keluar darinya. */
  const visibleFilters = useMemo(
    () =>
      showFilterRail
        ? BILL_FILTERS.filter(
            (pill) => pill.id === 'semua' || pill.id === activeFilter || counts[pill.id] > 0,
          )
        : [],
    [showFilterRail, activeFilter, counts],
  )
  const effectiveFilter: BillFilter = showFilterRail ? activeFilter : 'semua'
  const visibleBills = useMemo(
    () => filterBills(scopedBills, effectiveFilter, currentDay),
    [scopedBills, effectiveFilter, currentDay],
  )
  const groups = useMemo(() => groupBills(visibleBills, currentDay), [visibleBills, currentDay])
  /** tagihan yang benar-benar ada di list "Aktif" (belum lunas) — dipakai
   *  timeline supaya kalender & daftar tidak kontradiksi (audit #3) */
  /** tagihan AKTIF (belum lunas) milik konteks yang sedang dilihat — dipakai
   *  kalender 14 hari. Memakai `scopedBills` supaya agenda dan daftar bercerita
   *  sama; sebelumnya strip membaca SEMUA konteks sehingga tanggal yang
   *  ditandai bisa tidak punya kartu di daftar. */
  const activeBills = useMemo(
    () => scopedBills.filter((bill) => !bill.isPaidThisMonth),
    [scopedBills],
  )
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

  /**
   * "Bersihkan" = hapus SEMUA tagihan lunas yang tadi tampil, sekaligus.
   * Sebelum menghapus, statusnya dibaca ULANG dari store: bisa saja salah satu
   * sudah dibatalkan lunas di tab lain antara dialog dibuka dan tombol ditekan —
   * tagihan seperti itu tidak boleh ikut terhapus.
   *
   * Baris kas pembayarannya TIDAK ikut dihapus (sama seperti hapus satuan):
   * uangnya memang sudah keluar, jadi jejaknya tetap ada di Riwayat.
   */
  function confirmClearPaid() {
    if (!pendingClearPaid) return
    const targets = pendingClearPaid
    setPendingClearPaid(null)

    const stillPaid = new Set(
      bills.filter((bill) => bill.isPaidThisMonth).map((bill) => bill.id),
    )
    const ids = targets.map((bill) => bill.id).filter((id) => stillPaid.has(id))
    const deleted: string[] = []
    for (const id of ids) {
      if (deleteBill(id)) deleted.push(id)
    }

    if (deleted.length === 0) {
      toast(CLEAR_PAID_TOAST.failed)
      return
    }

    clearUndoRef.current = deleted
    toast.success(CLEAR_PAID_TOAST.title(deleted.length), {
      description: CLEAR_PAID_TOAST.description,
      action: { label: CLEAR_PAID_TOAST.undo, onClick: () => undoClearPaid(deleted) },
      /* lama toast = lama hak undo; keduanya dibaca dari satu konstanta */
      duration: UNDO_WINDOW_MS,
    })

    later(() => {
      if (clearUndoRef.current === deleted) clearUndoRef.current = null
    }, UNDO_WINDOW_MS)
  }

  /** Undo BERSIHKAN: kembalikan semua tagihan yang baru dihapus dalam batch. */
  function undoClearPaid(batch: string[]) {
    if (clearUndoRef.current !== batch) {
      toast(CLEAR_PAID_TOAST.expired)
      return
    }
    clearUndoRef.current = null
    let restored = 0
    for (const id of batch) {
      if (restoreBillInStore(id)) restored += 1
    }
    if (restored === 0) {
      toast(CLEAR_PAID_TOAST.expired)
      return
    }
    toast.success(CLEAR_PAID_TOAST.undoneTitle, {
      description: CLEAR_PAID_TOAST.undoneDescription,
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
      {/* HEADER — judul saja. Eyebrow "Kewajiban bulanan" dicabut: "Tagihan
          Rutin" sudah menjelaskan dirinya sendiri. Pemilih konteks & tombol
          mata di kanan. */}
      <header className="mt-4 flex items-start justify-between gap-3 lg:mt-0">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            Tagihan Rutin
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <ContextMenu value={context} onChange={setContext} className="w-32 sm:w-36" />
          <GlobalPrivacyToggle className="hidden lg:flex" />
        </div>
      </header>

        {bills.length === 0 ? (
          /* 10. EMPTY STATE — ajakan mencatat tagihan pertama */
          <EmptyState onAdd={() => setShowAddBill(true)} />
        ) : scopedBills.length === 0 ? (
          /* EMPTY STATE PER KONTEKS (paket 47): tagihan ada, tapi tidak satu pun
             milik konteks aktif. Daftar kosong tanpa penjelasan = user mengira
             datanya hilang; di sini alasannya disebut + ada CTA menambah. */
          <div className="mt-4 lg:mt-6">
            <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-forest/15 bg-cream px-6 py-10 text-center">
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-forest">
                {CONTEXT_EMPTY_COPY.bills.title(CONTEXT_LABEL[context])}
              </h2>
              <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-forest-muted">
                {CONTEXT_EMPTY_COPY.bills.body}
              </p>
              <button
                type="button"
                onClick={() => setShowAddBill(true)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
              >
                <Plus className="size-4" strokeWidth={2.6} />
                {CONTEXT_EMPTY_COPY.bills.cta}
              </button>
            </div>
          </div>
        ) : (
          /* ── RINGKASAN → AGENDA → DAFTAR ────────────────────────────────
             Satu kartu ringkasan (nominal + progres), lalu strip 7 hari, lalu
             daftar. Semua permukaan memakai radius dan hairline yang sama
             supaya halaman terbaca sebagai satu kolom. */
          <div className="mt-5 flex flex-col lg:mt-6">
            {/* Di layar lebar ringkasan & agenda berdampingan supaya kartu
                ringkasan tidak membentang kosong selebar konten. */}
            <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
              <BillsOverview bills={scopedBills} masked={masked} currentDay={currentDay} />

              {/* 5. KALENDER 14 HARI — hanya tagihan yang ada di list Aktif */}
              <BillTimeline
                bills={activeBills}
                currentDay={currentDay}
                todayIso={todayIso}
                masked={masked}
                onPick={handlePickBill}
              />
            </div>

            {/* 8. NUDGE NOTIFIKASI — hanya saat izin belum pernah diminta */}
            <BillNotifNudge className="mt-3" />

            {/* 6. FILTER + TAMBAH — muncul HANYA saat daftar cukup panjang untuk
                benar-benar disaring (>5 tagihan). Angka dihitung dari daftar
                yang disaring, bukan dari seluruh tagihan. */}
            {showFilterRail && (
              <div className="mt-6 flex items-center gap-2">
              <div className="hide-scrollbar -ml-5 flex flex-1 overflow-x-auto pl-5 pr-1 sm:-ml-8 sm:pl-8 lg:ml-0 lg:pl-0">
                <div
                  role="group"
                  aria-label="Filter tagihan"
                  className="flex shrink-0 items-center gap-0.5 rounded-full bg-sage/60 p-1"
                >
                  {visibleFilters.map((pill) => {
                    const count = counts[pill.id]
                    const active = activeFilter === pill.id
                    const isLate = pill.id === 'telat'
                    const showLateDot = isLate && count > 0 && !active
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveFilter(pill.id)}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25',
                          active
                            ? 'bg-cream text-forest shadow-[0_2px_10px_-4px_rgba(0,0,0,0.25)]'
                            : 'text-forest-muted hover:bg-cream/70 hover:text-forest',
                        )}
                      >
                        {showLateDot && (
                          <span className="relative flex size-1.5" aria-hidden>
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-hud-terracotta/70 motion-reduce:animate-none" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-hud-terracotta" />
                          </span>
                        )}
                        <span className="whitespace-nowrap">
                          {pill.label}
                        </span>
                        <span
                          className={cn(
                            'tabular-nums',
                            active
                              ? 'text-forest-muted'
                              : count > 0
                                ? 'text-forest-muted'
                                : 'text-forest-muted/60',
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBill(true)}
                aria-label="Tambah tagihan rutin"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-forest px-3 text-[12px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                <Plus className="size-4" strokeWidth={2.6} aria-hidden />
                <span className="hidden sm:inline">Tagihan</span>
              </button>
              </div>
            )}

            {/* 7. DAFTAR TAGIHAN — dikelompokkan per status, 2 kolom di desktop */}
            <div
              className={cn(
                'flex flex-col gap-5 pb-1',
                showFilterRail ? 'mt-4' : 'mt-6',
              )}
            >
                {groups.length === 0 ? (
                  <p className="rounded-[1.25rem] bg-cream px-4 py-6 text-center text-[12.5px] font-medium text-forest-muted ring-1 ring-soil/8">
                    Gak ada tagihan di filter ini.
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
                      {/* kepala grup — SATU baris tenang: label muted + jumlah,
                          ditutup hairline. Grup "Sudah dibayar" punya aksi
                          Bersihkan = HAPUS semua baris lunas, lewat konfirmasi. */}
                      <div className="flex items-center gap-3 px-1">
                        <h3 className="shrink-0 text-[11px] font-medium tabular-nums text-forest-muted">
                          {group.meta.label} · {group.items.length}
                        </h3>
                        <span aria-hidden className="h-px flex-1 bg-soil/10" />
                        {group.meta.status === 'paid' && (
                          <button
                            type="button"
                            onClick={() => setPendingClearPaid(group.items)}
                            title="Hapus tagihan yang sudah dibayar dari daftar rutin"
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold text-hud-terracotta transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
                          >
                            Bersihkan
                          </button>
                        )}
                      </div>

                      <motion.ul
                        id={`bills-group-${group.meta.status}`}
                        layout
                        className="mt-2.5 grid gap-2 lg:grid-cols-2"
                      >
                        {group.items.map((bill) => {
                          const delay = 60 + rowIndex++ * 45
                          /* hanya kartu yang BARU dibayar yang dicap; kartu
                             lunas menetap tidak lagi diberi watermark */
                          const stamp: StampState = stampId === bill.id ? 'fresh' : 'none'
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

              {/* CTA TAMBAH — bentuknya mengikuti kartu ajakan di Budget:
                  putus-putus + tint Oat tipis (bukan blok warna pekat). Ikon +
                  di lingkaran cream, judul tebal, sub-teks pendek, chevron. */}
              <button
                type="button"
                onClick={() => setShowAddBill(true)}
                className="group mt-3 flex w-full items-center gap-3.5 rounded-[1.5rem] border border-dashed border-forest/20 bg-sage/20 px-4 py-4 text-left transition-colors hover:border-forest/30 hover:bg-sage/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-[0.99]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/[0.06] transition-transform duration-200 group-hover:scale-105">
                  <Plus className="size-5" strokeWidth={2.6} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-tight text-forest">
                    {BILL_ADD_PLACEHOLDER.title}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-tight text-forest-muted">
                    {BILL_ADD_PLACEHOLDER.body}
                  </span>
                </span>
                <ArrowRight
                  className="size-[18px] shrink-0 text-forest/45 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-forest"
                  strokeWidth={2.2}
                  aria-hidden
                />
              </button>
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

      {/* konfirmasi "Bersihkan": menghapus SEMUA tagihan lunas sekaligus —
          aksi merusak, jadi ditolak dulu; setelah itu pun masih ada Undo. */}
      <AnimatePresence>
        {pendingClearPaid && (
          <ConfirmDialog
            titleId="bersihkan-lunas-judul"
            overlayLabel={CONFIRM_CLEAR_PAID_COPY.overlay}
            title={CONFIRM_CLEAR_PAID_COPY.title(pendingClearPaid.length)}
            body={CONFIRM_CLEAR_PAID_COPY.body}
            safety={CONFIRM_CLEAR_PAID_COPY.safety}
            note={CONFIRM_CLEAR_PAID_COPY.note}
            cancelLabel={CONFIRM_CLEAR_PAID_COPY.cancel}
            confirmLabel={CONFIRM_CLEAR_PAID_COPY.confirm}
            onCancel={() => setPendingClearPaid(null)}
            onConfirm={confirmClearPaid}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}

/* ── komponen kecil halaman ini ───────────────────────────────────────────── */

/** 10. Empty state nurturing: belum ada tagihan rutin sama sekali */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-5 lg:mt-6">
      <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-forest/15 bg-cream px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-sage/60 text-forest">
          <Plus className="size-5" strokeWidth={2.4} aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-[16px] font-semibold tracking-tight text-forest">
          Belum ada tagihan rutin
        </h2>
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-forest-muted">
          Kos, langganan, cicilan — catat biar jatah harianmu lebih akurat.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Tambah Tagihan
        </button>
      </div>
    </div>
  )
}

/* Toggle privasi halaman ini memakai komponen baku GLOBAL (audit UX #4):
   <GlobalPrivacyToggle /> — state sensor dibaca dari PrivacyProvider (usePrivacy)
   sehingga benar-benar menyensor seluruh halaman dan sinkron dengan halaman lain.
   Di halaman ini tombolnya hanya tampil di desktop (`hidden lg:flex`); di mobile
   header global sudah memuatnya (lib/shows-amounts.ts mencakup '/bills'). */
