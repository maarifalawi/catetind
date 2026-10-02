'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Heart, HeartHandshake, Pencil, Plus, ReceiptText, Scale } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { ConfirmDialog } from './confirm-dialog'
import { JointStateCard } from './joint-state-card'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { ContextSwitcher } from './context-switcher'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { JointBalanceScale } from './joint-balance-scale'
import { JointStatsRow } from './joint-stats-row'
import { JointTimeline } from './joint-timeline'
import { JointSplitSheet, type JointSplitDraft } from './joint-split-sheet'
import { JointSettlementModal } from './joint-settlement-modal'
import { JointAddSheet } from './joint-add-sheet'
import { JointInviteCodeModal, JointInviteFlow, JointJoinedCelebration } from './joint-invite-flow'
import {
  JointMonthlyRecapBanner,
  JointPushBanner,
  JointWeeklyRecapBanner,
} from './joint-recap-banners'
import {
  DEMO_FORCE_MONTHLY_RECAP,
  DEMO_FORCE_WEEKLY_RECAP,
  DEMO_JOINED_CELEBRATION,
  DEMO_REALTIME_MOCK,
  JOINT_DELETE_COPY,
  JOINT_ME,
  JOINT_ADDED_TOAST,
  JOINT_MONTH_KEY,
  JOINT_MONTH_LABEL,
  JOINT_PARTNER,
  PUSH_ALERT_THRESHOLD,
  REALTIME_ARRIVAL,
  REALTIME_ARRIVAL_DELAY,
  REALTIME_TYPING_DELAY,
  computeSettlement,
  jointDateLong,
  moneyLabel,
  recapBannerVisibility,
  splitSpecOf,
  type JointPerson,
  type JointSettlementRecord,
  type JointTransaction,
  type SettlementMethod,
} from '@/lib/data/joint'
import {
  addJointMember,
  addJointTransaction,
  applyJointRow,
  carryOverRecordFor,
  clearJointArrivalBadge,
  createJointPocket,
  deleteJointTransaction,
  jointDeleteState,
  jointLedgerFeed,
  jointNotes,
  jointPartnerJoined,
  recordSettlement,
  renameJointWallet,
  restoreJointTransaction,
  /* alias: halaman ini punya state pajangan `paidBy` untuk form tambah, jadi
     setter store-nya diberi nama sendiri supaya tidak tertukar */
  setPaidBy as setJointPaidBy,
  settlementRecordFor,
  updateSplit,
  useJointStore,
} from '@/lib/money/joint-store'
import { UNDO_WINDOW_MS } from '@/lib/data/history'
import { trackMoneyEvent } from '@/lib/analytics'
import { JOINT_CONTEXT_COPY, CONTEXT_LABEL, contextCaption } from '@/lib/data/money-context'
import { cn } from '@/lib/utils'

/* ── Joint Wallet (/app/joint) — PRD Domain 2D ───────────────────────────────
   "Multiplayer mode" CatetInd: satu dompet untuk dua orang. Halaman ini harus
   terasa seperti MILESTONE hubungan — hangat, intim, sedikit playful — bukan
   buku besar korporat. Dua visual tanda tangannya:

   1. Balance Scale Settlement Gauge (Section 3) — timbangan yang miring ke sisi
      yang nalangin lebih banyak, plus copy "siapa transfer berapa ke siapa".
   2. Together Timeline (Section 5) — catatan dua orang dijalin di satu garis
      waktu berselang-seling kiri/kanan, seperti buku harian bersama.

   DUA KOREKSI BESAR (audit fintech #1 & #4):
   • TIDAK ADA "saldo bersama". Ini shared ledger — uang tidak dikumpulkan di
     satu rekening, jadi hero-nya adalah TOTAL PENGELUARAN BERSAMA bulan ini
     (angka yang memang ada di catatan), bukan saldo fiktif.
   • Layout DESKTOP 2 KOLOM dan melebar penuh: kiri = ringkasan (timbangan,
     statistik pembayar, banner rekap), kanan = aktivitas (Cerita Kita).

   Aturan hitungnya ada di `lib/data/joint.ts` (paidBy vs weighedPaidBy) —
   jangan menghitung ulang nominal di komponen.

   Lapisan "trust"-nya: toggle privasi (🔒) yang menyembunyikan detail transaksi
   dari pasangan tanpa mengubah nominal yang ikut dihitung (audit #3).

   PEMILIK DATA (paket 52 · temuan F laporan 46): halaman ini berhenti memegang
   salinan datanya sendiri. Kantong, buku besar, penanda settle, dan daftar
   anggota hidup di `lib/money/joint-store.ts` (persist IndexedDB key `joint`),
   jadi refresh tidak mengembalikannya ke seed dan dua tab melihat state yang
   sama. Yang tinggal di sini HANYA state pajangan: sheet terbuka/tutup, draft
   pembagian, nominal yang sedang diketik, dan indikator "sedang mencatat".

   Realtime: baris dari server masuk lewat STORE (`applyRemoteJointRow()`).
   Di demo TANPA sesi Supabase, yang hidup tetap TIMER MOCK di bawah — dan itu
   jujur disebut mock: hanya menyala saat `DEMO_REALTIME_MOCK`
   (`NEXT_PUBLIC_DEMO=1`), tidak pernah menimpa baris yang sudah ada (dedupe di
   store), dan tidak diklaim sebagai sinkronisasi antar-perangkat.
   ────────────────────────────────────────────────────────────────────────── */

export function JointScreen() {
  /* ── 1. DATA & STATE (Section 1) ───────────────────────────────────────── */
  const me: JointPerson = JOINT_ME
  const partner: JointPerson = JOINT_PARTNER

  /* konteks uang (Pribadi/Keluarga/Bersama) — state GLOBAL (paket 47).
     Halaman ini MEMANG konteks `bersama` (PRD Domain 2D): kantong ini khusus
     uang patungan, jadi kalau konteks aktif bukan `bersama`, halaman tidak
     menampilkan daftar kosong tanpa sebab — ia menjelaskan + menyediakan satu
     ketukan untuk pindah (`setContext('bersama')`). */
  const { context, setContext } = useMoneyContext()

  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked: isMasked } = usePrivacy()
  /* Timer mock realtime di bawah menembak toast dari dalam callback, jadi ia
     membaca sensor lewat ref ini — nilai TERKINI selalu dipakai, tapi mengubah
     tombol mata tidak me-restart urutan "sedang mencatat → transaksi masuk"
     (yang bikin transaksi & toast tampil dua kali). */
  const maskedRef = useRef(isMasked)
  maskedRef.current = isMasked

  /* ── SUMBER TUNGGAL: kantong bersama (store) ───────────────────────────── */
  const joint = useJointStore()
  const wallet = joint.wallet
  const partnerJoined = jointPartnerJoined(joint)
  /**
   * KEADAAN KANTONG yang sedang dilihat (paket 61.3) — dibaca dari store, bukan
   * dari state pajangan halaman:
   *   1. `empty`   → belum ada kantong (belum pernah dibuat);
   *   2. `waiting` → kantong sudah dibuat, pasangan belum bergabung;
   *   3. `active`  → pasangan sudah bergabung → buku besar terbuka.
   *
   * Dua keadaan pertama dulu tampak SAMA (nama seed "Dompet Kita 💚" sudah
   * terisi), jadi user tidak pernah tahu langkahnya sudah sampai mana. Penanda
   * `wallet.created` dipasang `createJointPocket()` — bukan ditebak dari nama.
   */
  const jointState: 'empty' | 'waiting' | 'active' = partnerJoined
    ? 'active'
    : wallet.created
      ? 'waiting'
      : 'empty'
  const [nameDraft, setNameDraft] = useState(wallet.name)
  const [editingName, setEditingName] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCelebration, setShowCelebration] = useState(DEMO_JOINED_CELEBRATION)
  /**
   * Settlement bukan lagi state halaman: penanda per bulannya hidup di store,
   * dan baris ledger-nya DITURUNKAN dari penanda itu (`jointLedgerFeed`) — jadi
   * membuka halaman berkali-kali tidak pernah menggandakan barisnya, dan bulan
   * berikutnya otomatis menerima sisa yang belum tertutup.
   */
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  /** catatan yang sedang diatur pembagiannya ('new' = catatan baru di form) */
  const [splitTarget, setSplitTarget] = useState<string | null>(null)
  const [showSplitSheet, setShowSplitSheet] = useState(false)
  /** pembagian untuk catatan yang belum dicatat */
  const [draftSplit, setDraftSplit] = useState<JointSplitDraft | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [privateOn, setPrivateOn] = useState(false)
  /** kantong yang nalangin di form tambah — default Aku (Stage 2 #3) */
  const [paidBy, setPaidBy] = useState<string>(me.id)
  /* mock Supabase Realtime (5C) */
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [pushTx, setPushTx] = useState<JointTransaction | null>(null)
  /** catatan bareng yang menunggu konfirmasi hapus (paket 61.3) — tidak pernah langsung hilang */
  const [pendingDeleteTx, setPendingDeleteTx] = useState<JointTransaction | null>(null)
  /** hak Undo hapus: id baris yang masih bisa dikembalikan selama jendelanya hidup */
  const undoJointRef = useRef<string | null>(null)
  /**
   * Banner rekap mana yang boleh tampil (Section 10 + audit #8).
   * Gate tanggal dihitung SETELAH MOUNT (null = belum siap → tidak render apa
   * pun) supaya HTML server & client identik, lalu `recapBannerVisibility()`
   * menerapkan hierarki bulanan > mingguan supaya dua banner raksasa tidak
   * pernah bertumpuk di satu layar.
   */
  const [recapWindow, setRecapWindow] = useState<{ monthly: boolean; weekly: boolean } | null>(null)
  useEffect(() => {
    setRecapWindow(
      recapBannerVisibility(new Date(), {
        forceMonthly: DEMO_FORCE_MONTHLY_RECAP,
        forceWeekly: DEMO_FORCE_WEEKLY_RECAP,
      }),
    )
  }, [])
  const showMonthlyRecap = recapWindow?.monthly ?? false
  const showWeeklyRecap = recapWindow?.weekly ?? false

  /* Penanda settle (Stage 2 #5) tidak lagi dipulihkan lewat efek mount: ia hidup
     di store, dan halaman cuma membaca turunannya — lihat blok "DATA TURUNAN"
     di bawah (`settlementRecordFor`, `carryOverRecordFor`, `jointLedgerFeed`). */

  /** semua timer halaman dibersihkan saat unmount (pola yang sama dengan
   *  halaman Tagihan & Kekayaan) supaya tidak ada set-state di komponen mati */
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  /* ── DATA TURUNAN ──────────────────────────────────────────────────────── */
  /**
   * Pembagian tidak lagi ditempel dari `splitOverrides` milik halaman: pilihan
   * user DITULIS ke catatannya (`updateSplit()` di store), jadi label timeline,
   * angka timbangan, dan baris ledger membaca objek yang sama — tidak ada dua
   * sumber kebenaran yang bisa berbeda cerita.
   */
  const feed = useMemo(() => jointLedgerFeed(joint, JOINT_MONTH_KEY), [joint])
  /** bulan ini sudah disettle? → timbangan dikunci rata (Stage 2 #5) */
  const settled = settlementRecordFor(joint, JOINT_MONTH_KEY) !== null
  /** sisa bulan lalu yang belum tertutup → baris pembuka bulan ini */
  const carryOverRecord = carryOverRecordFor(joint, JOINT_MONTH_KEY)

  const settlement = useMemo(() => computeSettlement(feed, { settled }), [feed, settled])

  /* ── MOCK SUPABASE REALTIME (Section 5C) — demo yang jujur disebut demo ───
     Dua tahap: indikator "Dany sedang mencatat..." → catatan partner masuk
     (slide-in dari kanan) + toast ringan.

     PAKET 52: timer ini BUKAN realtime. Ia hidup HANYA saat `DEMO_REALTIME_MOCK`
     (`NEXT_PUBLIC_DEMO=1`) dan hanya kalau kantong ini sudah punya anggota lain;
     di build produksi saklarnya mati, jadi tidak ada satu pun catatan yang
     "muncul sendiri". Barisnya masuk lewat STORE (`applyJointRow`) — jalur yang
     sama dengan baris dari Postgres Changes — sehingga dedupe & penyimpanannya
     gratis: kalau id-nya sudah ada, tidak ada yang ditulis dan toast-nya tidak
     diulang. Konsekuensinya jujur: animasi "baris partner masuk" hanya terjadi
     sekali per perangkat, karena barisnya kini benar-benar tersimpan. */
  useEffect(() => {
    if (!DEMO_REALTIME_MOCK || !partnerJoined) return

    const typing = window.setTimeout(() => setPartnerTyping(true), REALTIME_TYPING_DELAY)
    const arrival = window.setTimeout(() => {
      setPartnerTyping(false)
      const stored = applyJointRow(REALTIME_ARRIVAL)
      /* hanya baris yang BENAR-BENAR baru yang dikabarkan */
      if (stored) {
        toast(
          `${partner.avatar} ${partner.name} baru catat: ${stored.description} ${moneyLabel(
            stored.amount,
            maskedRef.current,
          )} 🛒`,
        )
      }
      /* badge "Baru" dilepas lagi setelah animasi slide-in selesai */
      later(() => clearJointArrivalBadge(REALTIME_ARRIVAL.id), 4200)
    }, REALTIME_ARRIVAL_DELAY)

    return () => {
      window.clearTimeout(typing)
      window.clearTimeout(arrival)
    }
  }, [partnerJoined, partner.avatar, partner.name, later])

  /* ── REALTIME SUNGGUHAN — sekarang milik STORE (paket 52) ────────────────
     Langganan Postgres Changes pada `joint_transactions` tidak lagi dipegang
     halaman ini. `lib/money/joint-store.ts` yang membaca id dompet dari tabel
     `joint_wallets` (bukan id kanon `joint_1` yang tidak pernah ada di sana),
     menarik baris yang sudah ada, lalu membuka channel untuk id itu dan
     menerima tiap baris lewat `applyRemoteJointRow()`. Alasannya sederhana:
     kalau halaman yang berlangganan, dua tab bisa punya dua channel untuk satu
     kantong yang sama — dan baris yang diterima salah satu tab tidak pernah
     sampai ke tab lain. Channel tetap dibuang saat tab disembunyikan
     (`lib/supabase/realtime.ts`). */


  /* ── HANDLER ───────────────────────────────────────────────────────────── */

  const saveWalletName = useCallback(() => {
    const next = nameDraft.trim()
    setEditingName(false)
    if (!next || next === wallet.name) return
    /* satu pintu: nama kantong ditulis ke store (persist IndexedDB) — dulu
       `setWallet()` halaman saja, jadi nama yang diubah user hilang saat refresh */
    const saved = renameJointWallet(next)
    if (saved) toast.success('Nama dompet diperbarui 💚')
  }, [nameDraft, wallet.name])

  /** buka Split Bill Sheet untuk transaksi tertentu, atau untuk transaksi baru */
  const openSplitFor = useCallback((tx: JointTransaction) => {
    setSplitTarget(tx.id)
    setShowSplitSheet(true)
  }, [])

  /**
   * Buka Split Bill Sheet untuk transaksi BARU.
   *
   * Stage 2 #4 & #6: sheet add DITUTUP dulu sebelum sheet split dibuka. Dulu
   * dua `Drawer.Root` z-[70] bisa hidup bersamaan (nested Vaul), sehingga fokus
   * & tombol back jadi tidak menentu. Setelah pembagian disimpan, sheet add
   * dibuka lagi supaya user tinggal menekan "Catat" — total ≤ 3 tap dari FAB
   * (Atur pembagian → preset 60/40 → Simpan Pembagian).
   */
  const openSplitForNew = useCallback(() => {
    setShowAddSheet(false)
    setSplitTarget('new')
    setShowSplitSheet(true)
  }, [])

  const handleSaveSplit = useCallback(
    (draft: JointSplitDraft) => {
      setShowSplitSheet(false)
      /* JEJAK (paket 43): pembagian menentukan siapa menanggung berapa. Yang
         dikirim cuma MODE-nya (+ persen untuk mode persentase) — nominalnya,
         bahkan untuk mode nominal, tidak pernah ikut. */
      const split = draft.split
      trackMoneyEvent(
        'joint_split_changed',
        split.type === 'percentage'
          ? {
              mode: split.type,
              me_percent: split.percents[me.id] ?? null,
              partner_percent: split.percents[partner.id] ?? null,
            }
          : { mode: split.type },
      )
      if (splitTarget === 'new') {
        setDraftSplit(draft)
        toast.success('Pembagian disiapkan ✓', {
          description: 'Berlaku saat transaksinya dicatat.',
        })
        /* lanjutkan form-nya: nominal, "siapa yang nalangin", & toggle privasi
           tidak perlu diisi ulang karena semuanya milik halaman, bukan sheet */
        setShowAddSheet(true)
        return
      }
      if (!splitTarget) return
      /* pembagian pilihan user DITULIS ke catatannya (store) — bukan disimpan
         sebagai override di halaman, supaya angka yang dilihat halaman lain &
         ekspor membaca pembagian yang sama */
      const updated = updateSplit(splitTarget, split)
      if (updated) toast.success('Pembagian diperbarui ✓')
      else toast.error('Catatan itu tidak bisa diubah pembagiannya')
    },
    [splitTarget, me.id, partner.id],
  )

  /**
   * transaksi baru dari FAB: disisipkan ke timeline (dan ikut hitungan
   * settlement + hero "Total Pengeluaran Bersama" — TIDAK ada saldo dompet
   * yang dikurangi, karena dompet ini buku besar bersama, bukan rekening).
   *
   * KEPUTUSAN TERTULIS (paket 37/49) — buku besar BERSAMA ini SENGAJA terpisah
   * dari ledger pribadi (`lib/money/store.ts`), dan itu bukan kelalaian:
   *
   *   1. Yang menanggung uangnya adalah orang, bukan dompet. Satu pengeluaran
   *      bareng punya `paidByUserId` + pembagian (`SplitSpec`) yang tidak punya
   *      padanan di ledger pribadi — memaksakannya ke sana berarti mengarang
   *      dompet pribadi yang tidak ada, atau menggeser saldo dompet user tanpa
   *      satu pun rupiah benar-benar berpindah.
   *   2. Cerita yang dibaca user juga beda: Riwayat pribadi menjawab "dompetku
   *      berapa", halaman ini menjawab "siapa berutang berapa". Menggabungkan
   *      keduanya membuat dua pertanyaan itu dijawab satu angka.
   *   3. Karena itu pemilik data di sini adalah STORE kantong bersama
   *      (`lib/money/joint-store.ts` — paket 52), dan toast-nya
   *      (`JOINT_ADDED_TOAST`) muncul setelah baris itu BENAR-BENAR ditulis —
   *      bukan setelah `bus` pribadi yang tidak tahu apa-apa.
   *
   * Yang wajib tetap berlaku: kalau alur joint ini kelak menyentuh kas pribadi
   * (mis. menarik biaya bareng dari BCA), jalurnya `postTransfer()` /
   * `postTransaction()` di store uang — bukan disisipkan diam-diam ke daftar di
   * sini.
   */
  const handleAddTransaction = useCallback(
    (input: {
      description: string
      amount: number
      /** kategori pilihan user dari form engine (paket 54) */
      category?: string
      isPrivate: boolean
      split: JointSplitDraft | null
      /** kantong yang keluar uang (dari pemilih "Siapa yang nalangin?") */
      paidByUserId: string
    }) => {
      const tx = addJointTransaction({
        description: input.description,
        amount: input.amount,
        /* kategori datang dari PILIHAN USER di form (paket 54). Sebelumnya
           halaman ini tidak pernah mengirimkannya, jadi setiap catatan baru
           masuk sebagai `JOINT_DEFAULT_CATEGORY` dan rincian kategori di halaman
           ini tidak pernah mencerminkan apa yang user pilih. Catatan privat
           tetap dianonimkan store (`PRIVATE_CATEGORY`) — aturan privasi, bukan
           kelalaian. */
        category: input.category,
        isPrivate: input.isPrivate,
        /* kantong yang keluar uang datang dari pemilih "Siapa yang nalangin?"
           (Stage 2 #3) — bukan lagi selalu pencatat. Catatan yang Dany talangi
           tetap dihitung sebagai pengeluaran Dany walau Jon yang mengetiknya
           (audit fintech #4). */
        paidByUserId: input.paidByUserId,
        /* saat privat, pembagiannya TIDAK dikirim: porsi catatan privat bukan
           urusan pasangan — dan store memaksa pembagiannya jadi bagi rata,
           sementara NOMINALnya tetap ikut ditimbang (audit fintech #3). */
        split: input.isPrivate ? null : (input.split?.split ?? null),
      })

      /* store menolak (nominal ≤ 0 / kantong bukan anggota) → TIDAK ada yang
         ditulis, jadi jangan mengabarkan "tersimpan" */
      if (!tx) {
        toast.error('Catatan bareng gagal disimpan — cek nominalnya ya')
        return
      }

      setDraftSplit(null)
      setPrivateOn(false)
      setPendingAmount(0)
      setPaidBy(me.id)

      /* Konfirmasi ditembak DI SINI (bukan oleh panel input) sejak paket 33:
         panel cuma menyerahkan draft, pemilik datanya yang tahu catatannya
         tersimpan. */
      toast.success(JOINT_ADDED_TOAST)

      /* Section 11: pengeluaran bareng > Rp 500.000 memicu banner gaya push */
      if (!input.isPrivate && tx.amount > PUSH_ALERT_THRESHOLD) setPushTx(tx)
    },
    [me.id],
  )

  /**
   * "Tandai Sudah Settle" = MENULIS penanda, bukan sekadar mengubah tampilan
   * (Stage 2 #5 · dipindah ke store di paket 52).
   *
   * Yang ditulis hanya PENANDA bulan itu (`recordSettlement`) ke store; baris
   * ledger `settlement {from, to, amount, method, month}` DITURUNKAN dari
   * penanda tersebut oleh `jointLedgerFeed()` — ditandai `isSettlement` supaya
   * tidak ikut "Total Pengeluaran Bersama", tapi tetap masuk lapisan net
   * sehingga timbangannya benar-benar rata. Karena barisnya turunan (id-nya
   * `settle-<bulan>-<dari>-<ke>`), refresh berkali-kali tidak pernah
   * menggandakannya.
   *
   * `carryOver` = bagian utang yang TIDAK tertutup transfer ini. Alur sekarang
   * selalu mentransfer penuh (tombolnya baru muncul di atas ambang settle), jadi
   * nilainya 0 — tapi jalurnya tetap ada & teruji: sisanya otomatis jadi
   * pembuka bulan berikutnya lewat `buildCarryOverEntry()`.
   */
  const handleSettle = useCallback(
    (method: SettlementMethod) => {
      const record: JointSettlementRecord = {
        month: settlement.month,
        from: settlement.whoOwes.id,
        to: settlement.whoIsOwed.id,
        amount: settlement.settlementAmount,
        method,
        carryOver: Math.max(
          0,
          Math.round(Math.abs(settlement.myNet) - settlement.settlementAmount),
        ),
      }
      const stored = recordSettlement(record)
      if (!stored) {
        toast.error('Settle-nya gagal disimpan — coba lagi ya')
        return
      }
      /* JEJAK (paket 43): settle menyelesaikan kewajiban bulan ini. Yang dikirim
         hanya arah + metode transfernya — nominal transfer TIDAK dikirim. */
      trackMoneyEvent('settlement_recorded', {
        scope: 'joint',
        direction: stored.from === me.id ? 'out' : 'in',
        method,
      })
    },
    [settlement, me.id],
  )

  /** pasangan bergabung (8C): selebrasi singkat → kantong bersama aktif */
  const handlePartnerJoined = useCallback(() => {
    setShowInviteModal(false)
    setShowCelebration(true)
  }, [])

  /**
   * Selebrasi selesai = pasangan BENAR-BENAR tercatat sebagai anggota
   * (`addJointMember`) — dulu cuma `setPartnerJoined(true)` di halaman, jadi
   * status "sudah gabung" hilang setiap refresh.
   */
  const finishCelebration = useCallback(() => {
    setShowCelebration(false)
    addJointMember(partner.id)
    later(() => toast.success('Dompet bersama kalian aktif 💚'), 400)
  }, [later, partner.id])

  /**
   * Koreksi kantong yang keluar uang ("Siapa yang nalangin?" yang salah pilih).
   * Uangnya tidak berpindah, tapi timbangan & arah transfer ikut berubah — dan
   * itu memang tujuannya (audit fintech #4).
   */
  const handleChangePaidBy = useCallback((tx: JointTransaction, userId: string) => {
    const updated = setJointPaidBy(tx.id, userId)
    if (!updated) return
    toast.success(`Dicatat dari kantong ${userId === JOINT_ME.id ? me.name : partner.name} ✓`)
  }, [me.name, partner.name])

  /**
   * HAPUS SATU BARIS catatan bareng (paket 61.3) — tolak dulu, jangan langsung
   * hilang. Syarat boleh-tidaknya ada di store (`deleteJointTransaction()`):
   * hanya catatan di bulan yang BELUM disettle, karena bulan yang sudah
   * disepakati tidak boleh berubah angka di belakang pasangan.
   */
  const undoDeleteJointTx = useCallback((txId: string) => {
    if (undoJointRef.current !== txId) {
      toast(JOINT_DELETE_COPY.toastExpired)
      return
    }
    undoJointRef.current = null
    if (!restoreJointTransaction(txId)) {
      toast(JOINT_DELETE_COPY.toastExpired)
      return
    }
    toast.success(JOINT_DELETE_COPY.toastUndoneTitle, {
      description: JOINT_DELETE_COPY.toastUndoneDescription,
    })
  }, [])

  const confirmDeleteJointTx = useCallback(() => {
    const tx = pendingDeleteTx
    if (!tx) return
    setPendingDeleteTx(null)
    /* store bisa MENOLAK (bulan sudah disettle): kalau ditolak, tidak ada yang
       berubah — dan alasannya dikatakan, bukan diam-diam tidak terjadi apa-apa */
    if (!deleteJointTransaction(tx.id)) {
      toast(JOINT_DELETE_COPY.lockedNote)
      return
    }
    undoJointRef.current = tx.id

    toast(JOINT_DELETE_COPY.toastTitle, {
      description: JOINT_DELETE_COPY.toastDescription(tx.description),
      action: {
        label: JOINT_DELETE_COPY.toastUndo,
        onClick: () => undoDeleteJointTx(tx.id),
      },
      duration: UNDO_WINDOW_MS,
    })
    later(() => {
      if (undoJointRef.current === tx.id) undoJointRef.current = null
    }, UNDO_WINDOW_MS)
  }, [pendingDeleteTx, undoDeleteJointTx, later])

  /* nilai awal Split Bill Sheet: pembagian transaksi terpilih / draft transaksi baru */
  const splitTargetTx =
    splitTarget && splitTarget !== 'new' ? feed.find((tx) => tx.id === splitTarget) : undefined
  const splitTotal = splitTarget === 'new' ? pendingAmount : (splitTargetTx?.amount ?? 0)
  const splitInitial: JointSplitDraft | undefined =
    splitTarget === 'new'
      ? (draftSplit ?? undefined)
      : splitTargetTx
        ? /* bentuk kanonik lewat `splitSpecOf()` — jalur migrasi data lama
             (splitType/splits) hidup di lib, bukan di komponen */
          { split: splitSpecOf(splitTargetTx) }
        : undefined

  /* baris settlement bukan "catatan": kalau yang ada cuma baris settle, empty
     state-nya harus tetap muncul */
  const isEmptyJoint = partnerJoined && jointNotes(joint).length === 0
  return (
    <ScreenShell>
      {/* FULL-WIDTH (audit #4): halaman ini dulu dikurung dalam satu kolom
          720px di tengah sehingga separuh layar desktop terbuang. Sekarang
          konten melebar penuh (offset sidebar ditangani ScreenShell) dan
          dipecah dua kolom di desktop — lihat grid di bawah. */}
      <div className="w-full">
        {/* ── KONTEKS UANG (paket 47) ─────────────────────────────────────────
            Halaman ini MEMANG konteks `bersama` (PRD 2D) dan punya DUA wujud:
            flow "Ajak Pasangan" (belum gabung) dan kantong bersama. Bar konteks
            ini diletakkan di ATAS percabangan itu supaya kedua wujud sama-sama
            punya switcher (mobile + desktop) dan sama-sama jujur saat konteks
            aktif bukan `bersama`. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <p className="text-center text-[11.5px] font-medium text-ink/45 lg:text-left">
            {contextCaption(context)}
          </p>
          {/* dua penempatan seperti Home/Budget: satu untuk mobile, satu untuk
              desktop (paket 47) — bukan satu kontrol yang direntangkan */}
          <div className="flex justify-center lg:hidden">
            <ContextSwitcher value={context} onChange={setContext} className="max-w-[300px]" />
          </div>
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <ContextSwitcher value={context} onChange={setContext} className="w-[280px]" />
            <GlobalPrivacyToggle />
          </div>
        </div>

        {/* notice jujur: halaman ini milik konteks Bersama — bukan daftar kosong
            tanpa penjelasan, tapi satu ketukan untuk pindah ke sana */}
        {context !== 'bersama' && (
          <div className="mt-3 flex flex-col gap-3 rounded-[1.75rem] border-2 border-dashed border-hud-amber/40 bg-cream/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-[14.5px] font-bold tracking-tight text-ink">
                {JOINT_CONTEXT_COPY.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink/55">
                {JOINT_CONTEXT_COPY.body(CONTEXT_LABEL[context])}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setContext('bersama')}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.98]"
            >
              <HeartHandshake className="size-4" strokeWidth={2.4} />
              {JOINT_CONTEXT_COPY.cta}
            </button>
          </div>
        )}

        {/* ── 61.3: KONDISI KANTONG (tiga keadaan) + relasi dengan kas pribadi ──
            Diletakkan di ATAS percabangan supaya ketiga wujud halaman membaca
            langkah yang sama: 1) belum ada kantong, 2) menunggu pasangan,
            3) kantong aktif. Sebelumnya perpindahan antar keadaan tidak pernah
            dikatakan, dan "belum ada kantong" tidak bisa dibedakan dari
            "menunggu pasangan" karena nama kantong seed sudah terisi. */}
        <JointStateCard state={jointState} />

        {!partnerJoined ? (
          /* ── SECTION 8: invite flow (halaman berubah total) ────────────── */
          <JointInviteFlow
            defaultWalletName={wallet.name}
            partner={partner}
            onCreated={(name) => {
              /* KANTONG BARU = nama baru + BUKU BESAR KOSONG (paket 61.3).
                 `createJointPocket()` menandai seluruh catatan contoh terhapus,
                 jadi kantong yang baru dibuat tidak tampil berisi "Groceries
                 Superindo" — satu-satunya cara klaim "baru dibuat" bisa
                 dipercaya. Ditulis ke store (persist), bukan ke state halaman. */
              if (!createJointPocket(name)) return
              setShowInviteModal(true)
            }}
            onSimulatePartnerJoined={handlePartnerJoined}
          />
        ) : (
          <>
            {/* ── SECTION 2: header (nama dompet editable) + saldo ────────── */}
            <header className="sticky top-2 z-30 rounded-[1.5rem] bg-[#ffffff]/90 px-4 py-3.5 shadow-[0_18px_40px_-32px_rgba(69,89,78,0.65)] ring-1 ring-soil/10 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-hud-sage/60 via-cream to-hud-amber/40 text-forest ring-1 ring-forest/10">
                    <Heart className="size-[18px]" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    {editingName ? (
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        onBlur={saveWalletName}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveWalletName()
                          if (event.key === 'Escape') {
                            setEditingName(false)
                            setNameDraft(wallet.name)
                          }
                        }}
                        aria-label="Nama dompet bersama"
                        className="w-full rounded-xl bg-cream px-2.5 py-1 font-display text-[19px] font-black tracking-tight text-ink outline-none ring-2 ring-forest/35 lg:text-[22px]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(wallet.name)
                          setEditingName(true)
                        }}
                        aria-label="Ubah nama dompet bersama"
                        className="group flex max-w-full items-center gap-1.5 text-left"
                      >
                        <h1 className="truncate font-display text-[19px] font-black tracking-tight text-ink lg:text-[22px]">
                          {wallet.name}
                        </h1>
                        <Pencil
                          aria-hidden
                          className="size-3.5 shrink-0 text-ink/25 transition-colors group-hover:text-ink/50"
                          strokeWidth={2.4}
                        />
                      </button>
                    )}

                    {/* indikator pasangan: dua avatar + hati di antaranya */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
                      <span aria-hidden>{me.avatar}</span>
                      <span aria-hidden className="text-[10px]">
                        💚
                      </span>
                      <span aria-hidden>{partner.avatar}</span>
                      <span className="font-semibold text-ink/60">
                        {me.name} &amp; {partner.name}
                      </span>
                      <span className="text-ink/40">
                        · Bersama sejak {jointDateLong(wallet.createdAt)}
                      </span>
                    </p>
                  </div>
                </div>

                <GlobalPrivacyToggle />
              </div>

              {/* HERO (audit fintech #1): dompet ini SHARED LEDGER — uang tidak
                  dikumpulkan di satu rekening, jadi "saldo bersama" itu angka
                  fiktif dan dihapus. Yang benar-benar bisa dipertanggungjawabkan
                  adalah TOTAL PENGELUARAN BERSAMA bulan ini. */}
              <div className="mt-3 border-t border-soil/10 pt-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/40">
                  <ReceiptText className="size-3.5 shrink-0" strokeWidth={2.4} />
                  Total Pengeluaran Bersama
                  <span className="rounded-full bg-hud-sage/20 px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-[#000000] ring-1 ring-hud-sage/30">
                    {JOINT_MONTH_LABEL}
                  </span>
                </p>
                <p className="mt-1 font-display text-[28px] font-black leading-none tabular-nums tracking-tight text-ink">
                  {moneyLabel(settlement.totalSpent, isMasked)}
                </p>
                <p className="mt-1.5 text-[10.5px] leading-snug text-ink/45">
                  Catatan gabungan {me.name} &amp; {partner.name} — bukan saldo rekening bersama. Uang
                  tetap di dompet masing-masing, dihitung impas pas settle.
                </p>
              </div>
            </header>
            {/* ── SECTION 11: banner gaya push (pengeluaran > Rp 500.000) ── */}
            <JointPushBanner
              tx={pushTx}
              masked={isMasked}
              onDismiss={() => setPushTx(null)}
              onOpenSplit={openSplitFor}
            />

            {/* ── DUA KOLOM DI DESKTOP (audit #4) ────────────────────────────
                Mobile & tablet: tetap satu kolom dengan urutan alur cerita
                (timbangan → statistik → rekap → Cerita Kita).
                Desktop ≥ lg: grid 12 kolom — KIRI 5/12 = RINGKASAN (timbangan,
                statistik pembayar, banner rekap), KANAN 7/12 = AKTIVITAS (feed
                "Cerita Kita"). Tanpa container sempit di tengah layar. */}
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-6">
              {/* ── KIRI (5/12): ringkasan ─────────────────────────────────── */}
              <div className="lg:col-span-5">
                {/* ── SECTION 3: Balance Scale Settlement Gauge (hero visual) ── */}
                <section className="mt-4 rounded-[1.75rem] bg-[#ffffff] px-4 pb-4 pt-5 ring-1 ring-soil/10 sm:px-6 lg:mt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-[15px] font-black tracking-tight text-ink">
                        <Scale className="size-4 text-hud-terracotta" strokeWidth={2.3} />
                        Timbangan Kita
                      </h2>
                      <p className="mt-0.5 text-[11.5px] text-ink/45">
                        Sisi yang turun = yang nalangin lebih banyak (patungan saja)
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-hud-sage/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#000000] ring-1 ring-hud-sage/30">
                      {JOINT_MONTH_LABEL.split(' ')[0]}
                    </span>
                  </div>

                  <div className="mt-3">
                    <JointBalanceScale
                      settlement={settlement}
                      masked={isMasked}
                      me={me}
                      partner={partner}
                      onSettle={() => setShowSettlementModal(true)}
                    />
                  </div>
                </section>

                {/* ── SECTION 4: stats row (tiap kartu bisa dibuka) ──────────── */}
                <section className="mt-4">
                  <JointStatsRow
                    settlement={settlement}
                    transactions={feed}
                    masked={isMasked}
                    me={me}
                    partner={partner}
                  />
                  {/* pembeda dua lapisan angka (audit #2 & #3): kartu = seluruh
                      catatan, panci timbangan = patungan saja */}
                  <p className="mt-2.5 text-[10.5px] leading-relaxed text-ink/40">
                    Kartu di atas = seluruh uang yang keluar dari kantong {me.name} &amp;{' '}
                    {partner.name} bulan ini (traktiran &amp; 🔒 privat ikut). Panci timbangan di
                    atasnya cuma menimbang yang patungan.
                  </p>
                </section>

                {/* ── SECTION 10: rekap (audit #8 — bulanan menang atas mingguan) ── */}
                <JointMonthlyRecapBanner
                  settlement={settlement}
                  masked={isMasked}
                  me={me}
                  partner={partner}
                  show={showMonthlyRecap}
                  onOpenSettlement={() => setShowSettlementModal(true)}
                />
                <JointWeeklyRecapBanner show={showWeeklyRecap} />
              </div>

              {/* ── KANAN (7/12): aktivitas ─────────────────────────────────── */}
              {/* ── SECTION 5: Together Timeline / SECTION 12: empty state ──── */}
              <section className="mt-6 lg:col-span-7 lg:mt-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-[15px] font-black tracking-tight text-ink">
                      <Heart className="size-4 text-hud-terracotta" strokeWidth={2.3} />
                      Cerita Kita
                    </h2>
                    <p className="mt-0.5 text-[11.5px] text-ink/45">
                      Jejak catatan kalian, terjalin dalam satu garis waktu
                    </p>
                  </div>
                  <span className="shrink-0 text-[10.5px] font-semibold text-ink/35">
                    {feed.length} catatan
                  </span>
                </div>

                {isEmptyJoint ? (
                  /* SECTION 12: pasangan sudah gabung tapi belum ada transaksi */
                  <div className="mt-4 rounded-[1.75rem] border-2 border-dashed border-hud-sage/45 bg-[#ffffff] px-6 py-10 text-center">
                    <span aria-hidden className="text-[30px]">
                      🌱
                    </span>
                    <h3 className="mt-3 font-display text-[17px] font-black tracking-tight text-ink">
                      Dompet bersama kalian masih kosong
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">
                      Siapa yang catat duluan? Ayo mulai! 💚
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        onClick={() => setShowAddSheet(true)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-[13.5px] font-semibold text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
                      >
                        Aku duluan! ✋
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info(`Notifikasi dikirim ke ${partner.name}! 📩`)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-cream px-5 text-[13.5px] font-semibold text-ink ring-1 ring-soil/16 transition-colors hover:bg-cream active:scale-[0.99]"
                      >
                        <HeartHandshake className="size-4" strokeWidth={2.3} />
                        Tantang {partner.name}! 💬
                      </button>
                    </div>
                  </div>
                ) : (
                  <JointTimeline
                    transactions={feed}
                    masked={isMasked}
                    me={me}
                    partner={partner}
                    partnerTyping={partnerTyping}
                    onOpenSplit={openSplitFor}
                    onChangePaidBy={handleChangePaidBy}
                    /* boleh-hapus dihitung dari SATU aturan di store, jadi
                       tombol tidak pernah muncul untuk baris yang akan ditolak
                       (bulan yang sudah disettle) */
                    deleteState={(tx) => jointDeleteState(joint, tx)}
                    onDelete={setPendingDeleteTx}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </div>
      {/* ── SECTION 9: FAB (+) halaman ini — Catat transaksi bareng ────────
          Di mobile tombol ini MENGGANTIKAN FAB bottom-nav (nav menyembunyikan
          FAB-nya saat berada di /joint) supaya tetap hanya ada SATU tombol
          tambah, tapi isinya form khas dompet bersama. */}
      {partnerJoined && (
        <button
          type="button"
          onClick={() => setShowAddSheet(true)}
          aria-label="Catat transaksi bareng"
          className={cn(
            'fixed bottom-8 left-1/2 z-50 flex size-14 -translate-x-1/2 items-center justify-center rounded-full',
            'bg-forest text-mint shadow-[0_18px_36px_-14px_rgba(69,89,78,0.65)] ring-1 ring-forest/25',
            'transition-transform duration-150 hover:scale-105 active:scale-95',
            'lg:bottom-8 lg:left-auto lg:right-24 lg:h-12 lg:w-auto lg:translate-x-0 lg:gap-2 lg:px-5 lg:text-[13px] lg:font-bold',
          )}
        >
          <Plus className="size-6 lg:size-4" strokeWidth={2.4} />
          <span className="hidden lg:inline">Catat Bareng</span>
        </button>
      )}

      {/* ── Sheet & modal (mobile: bottom sheet · desktop: dialog) ───────── */}
      {/* 9 — form transaksi bareng: engine standar + field split & privasi */}
      <JointAddSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        walletName={wallet.name}
        splitDraft={draftSplit}
        privateOn={privateOn}
        paidBy={paidBy}
        onAmountChange={setPendingAmount}
        onOpenSplit={openSplitForNew}
        onTogglePrivate={() => setPrivateOn((prev) => !prev)}
        onPaidByChange={setPaidBy}
        onSubmitted={handleAddTransaction}
        me={me}
        partner={partner}
      />

      {/* 6 — Split Bill: satu instance per target (key) supaya formnya fresh */}
      <JointSplitSheet
        key={splitTarget ?? 'none'}
        open={showSplitSheet}
        onClose={() => setShowSplitSheet(false)}
        total={splitTotal}
        initial={splitInitial}
        onSave={handleSaveSplit}
        me={me}
        partner={partner}
      />

      {/* 7 — Settlement modal (dari Balance Scale atau banner rekap) */}
      <JointSettlementModal
        open={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        settlement={settlement}
        masked={isMasked}
        onSettle={handleSettle}
        carryOverRecord={carryOverRecord}
        me={me}
        partner={partner}
      />

      {/* 8B — kode undangan & 8C — selebrasi pasangan bergabung */}
      <JointInviteCodeModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        walletId={wallet.id}
        walletName={wallet.name}
        onSimulateJoin={handlePartnerJoined}
        me={me}
        partner={partner}
      />
      <JointJoinedCelebration
        open={showCelebration}
        onStart={finishCelebration}
        me={me}
        partner={partner}
      />

      {/* 61.3 — konfirmasi hapus SATU baris catatan bareng. Bentuknya dialog
          kanon yang sama dengan hapus catatan lain (`ConfirmDialog`), dan
          nominalnya ikut tersensor saat mode privasi menyala. */}
      <AnimatePresence>
        {pendingDeleteTx && (
          <ConfirmDialog
            titleId="hapus-catatan-bareng-judul"
            overlayLabel={JOINT_DELETE_COPY.overlay}
            title={JOINT_DELETE_COPY.title}
            body={
              <>
                {JOINT_DELETE_COPY.bodyLead(pendingDeleteTx.description)}
                <b className="font-semibold text-ink tabular-nums">
                  {moneyLabel(pendingDeleteTx.amount, isMasked)}
                </b>{' '}
                {JOINT_DELETE_COPY.bodyTail}
              </>
            }
            note={JOINT_DELETE_COPY.cashNote}
            safety={JOINT_DELETE_COPY.safety}
            cancelLabel={JOINT_DELETE_COPY.cancel}
            confirmLabel={JOINT_DELETE_COPY.confirm}
            onCancel={() => setPendingDeleteTx(null)}
            onConfirm={confirmDeleteJointTx}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}

/** Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) — satu bentuk
 *  tombol mata yang sama di semua halaman. Lihat <GlobalPrivacyToggle />. */
