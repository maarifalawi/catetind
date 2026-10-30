'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Heart, HeartHandshake, Pencil, Plus } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { useSubscriptionGate } from './subscription-gate-provider'
import { LockedFeatureNote } from './locked-feature-note'
import { ConfirmDialog } from './confirm-dialog'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { ContextMenu } from './context-menu'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { useMoneyStore, walletOptionsFor } from '@/lib/money/store'
import { JointSettlementCard } from './joint-settlement-card'
import { JointEntrySheet } from './joint-entry-sheet'
import { JointTimeline } from './joint-timeline'
import { JointSplitSheet, type JointSplitDraft } from './joint-split-sheet'
import { JointSettlementModal } from './joint-settlement-modal'
import { JointAddSheet } from './joint-add-sheet'
import { JointInviteCodeModal, JointInviteFlow, JointJoinedCelebration } from './joint-invite-flow'
import { JointPushBanner } from './joint-recap-banners'
import {
  DEMO_JOINED_CELEBRATION,
  DEMO_REALTIME_MOCK,
  JOINT_DELETE_COPY,
  JOINT_ADDED_TOAST,
  JOINT_MONTH_KEY,
  JOINT_MONTH_LABEL,
  PUSH_ALERT_THRESHOLD,
  REALTIME_ARRIVAL,
  REALTIME_ARRIVAL_DELAY,
  REALTIME_TYPING_DELAY,
  computeSettlement,
  moneyLabel,
  splitSpecOf,
  type JointSettlementRecord,
  type JointTransaction,
  type SettlementMethod,
} from '@/lib/data/joint'
import {
  addJointTransaction,
  applyJointRow,
  carryOverRecordFor,
  clearJointArrivalBadge,
  createJointPocket,
  deleteJointTransaction,
  jointDeleteState,
  jointLedgerFeed,
  jointNotes,
  jointParticipants,
  jointPartnerJoined,
  recordSettlement,
  renameJointWallet,
  restoreJointTransaction,
  undoSettlement,
  /* alias: halaman ini punya state pajangan `paidBy` untuk form tambah, jadi
     setter store-nya diberi nama sendiri supaya tidak tertukar */
  setPaidBy as setJointPaidBy,
  settlementRecordFor,
  updateSplit,
  useJointStore,
} from '@/lib/money/joint-store'
import { UNDO_WINDOW_MS } from '@/lib/data/history'
import { trackMoneyEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'

/* â”€â”€ Joint Wallet (/app/joint) â€” PRD Domain 2D â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   "Multiplayer mode" CatetInd: satu dompet untuk dua orang. Halaman ini harus
   terasa seperti MILESTONE hubungan â€” hangat, intim, sedikit playful â€” bukan
   buku besar korporat. Dua visual tanda tangannya:

   1. Kartu Settlement tunggal â€” arah transfer + nominal + satu CTA; tidak ada
      lagi panci timbangan, banner rekap, dan kartu settle duplikat.
   2. Cerita Kita â€” daftar transaksi bergaya halaman Riwayat (kepala hari garis
      rambut, baris kartu tipis, satu tap target â†’ bottom sheet).

   DUA KOREKSI BESAR (audit fintech #1 & #4):
   â€¢ TIDAK ADA "saldo bersama". Ini shared ledger â€” uang tidak dikumpulkan di
     satu rekening, jadi hero-nya adalah TOTAL PENGELUARAN BERSAMA bulan ini
     (angka yang memang ada di catatan), bukan saldo fiktif.
   â€¢ Layout DESKTOP 2 KOLOM dan melebar penuh: kiri = settlement, kanan =
     aktivitas (Cerita Kita).

   Aturan hitungnya ada di `lib/data/joint.ts` (paidBy vs weighedPaidBy) â€”
   jangan menghitung ulang nominal di komponen.

   Lapisan "trust"-nya: toggle privasi (ðŸ”’) yang menyembunyikan detail transaksi
   dari pasangan tanpa mengubah nominal yang ikut dihitung (audit #3).

   PEMILIK DATA (paket 52 Â· temuan F laporan 46): halaman ini berhenti memegang
   salinan datanya sendiri. Kantong, buku besar, penanda settle, dan daftar
   anggota hidup di `lib/money/joint-store.ts` (persist IndexedDB key `joint`),
   jadi refresh tidak mengembalikannya ke seed dan dua tab melihat state yang
   sama. Yang tinggal di sini HANYA state pajangan: sheet terbuka/tutup, draft
   pembagian, nominal yang sedang diketik, dan indikator "sedang mencatat".

   Realtime: baris dari server masuk lewat STORE (`applyRemoteJointRow()`).
   Di demo TANPA sesi Supabase, yang hidup tetap TIMER MOCK di bawah â€” dan itu
   jujur disebut mock: hanya menyala saat `DEMO_REALTIME_MOCK`
   (`NEXT_PUBLIC_DEMO=1`), tidak pernah menimpa baris yang sudah ada (dedupe di
   store), dan tidak diklaim sebagai sinkronisasi antar-perangkat.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function JointScreen() {
  /* â”€â”€ 1. DATA & STATE (Section 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  /* Sumber tunggal: kantong bersama (store). `me` & `partner` diambil dari
     KEANGGOTAAN SUNGGUHAN (uuid + nama panggilan dari server). Tidak ada lagi
     identitas contoh di jalur produksi, jadi nama orang karangan tidak
     mungkin muncul untuk akun nyata. */
  const joint = useJointStore()
  const participants = useMemo(() => jointParticipants(joint), [joint])
  const me = participants.me
  const partner = participants.partner
  const wallet = joint.wallet
  const partnerJoined = jointPartnerJoined(joint)

  /* paket user (paket 84) â€” menentukan apakah Joint Wallet terbuka. Dipanggil
     di sini (bukan di bawah) supaya urutan hook stabil & early-return kunci
     paket tetap legal. */
  const { planKnown, canUse } = useSubscriptionGate()

  /* konteks uang (Pribadi/Keluarga/Bersama) â€” state GLOBAL (paket 47).
     Halaman ini MEMANG konteks `bersama` (PRD Domain 2D): kantong ini khusus
     uang patungan, jadi kalau konteks aktif bukan `bersama`, halaman tidak
     menampilkan daftar kosong tanpa sebab â€” ia menjelaskan + menyediakan satu
     ketukan untuk pindah (`setContext('bersama')`). */
  const { context, setContext } = useMoneyContext()

  /* privasi nominal: state GLOBAL (PrivacyProvider) */
  const { masked: isMasked } = usePrivacy()
  /* pilihan dompet pribadi untuk "Sumber Dana" & settle â€” dibaca dari store uang
     (dompet hidup saja), jadi dompet yang baru ditambah langsung bisa dipakai */
  const moneySnapshot = useMoneyStore()
  const cashWalletOptions = useMemo(
    () => walletOptionsFor(moneySnapshot).map((option) => ({ id: option.id, label: option.label })),
    [moneySnapshot],
  )

  /* Timer mock realtime di bawah menembak toast dari dalam callback, jadi ia
     membaca sensor lewat ref ini â€” nilai TERKINI selalu dipakai, tapi mengubah
     tombol mata tidak me-restart urutan "sedang mencatat â†’ transaksi masuk"
     (yang bikin transaksi & toast tampil dua kali). */
  const maskedRef = useRef(isMasked)
  maskedRef.current = isMasked

  /* â”€â”€ SUMBER TUNGGAL: kantong bersama (store) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [nameDraft, setNameDraft] = useState(wallet.name)
  const [editingName, setEditingName] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  /**
   * Selebrasi "pasangan bergabung" HANYA boleh menyala dari KEANGGOTAAN NYATA.
   *
   * Dulu nilainya dipicu tombol simulasi penggabungan di perangkat
   * sendiri. Tombol itu sudah dihapus; sekarang selebrasi menyala saat jumlah
   * anggota yang dibaca dari server BERTAMBAH selama halaman terbuka â€” bukti
   * bahwa seseorang benar-benar menerima undangannya. `DEMO_JOINED_CELEBRATION`
   * tetap ada untuk review desain (dan tetap mati di kedua mode bawaan).
   */
  const [showCelebration, setShowCelebration] = useState(DEMO_JOINED_CELEBRATION)
  const knownMemberCount = useRef(joint.members.length)
  useEffect(() => {
    const count = joint.members.length
    if (count > knownMemberCount.current && count > 1) setShowCelebration(true)
    knownMemberCount.current = count
  }, [joint.members.length])

  /**
   * Settlement bukan lagi state halaman: penanda per bulannya hidup di store,
   * dan baris ledger-nya DITURUNKAN dari penanda itu (`jointLedgerFeed`) â€” jadi
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
  /** kantong yang nalangin di form tambah â€” default Aku (Stage 2 #3) */
  const [paidBy, setPaidBy] = useState<string>(me.id)
  /** dompet pribadi untuk catatan/kas (opsional) â€” kosong = tanpa kas */
  const [cashWalletId, setCashWalletId] = useState('')
  const [settleWalletId, setSettleWalletId] = useState('')
  /* mock Supabase Realtime (5C) */
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [pushTx, setPushTx] = useState<JointTransaction | null>(null)
  /** catatan bareng yang menunggu konfirmasi hapus (paket 61.3) â€” tidak pernah langsung hilang */
  const [pendingDeleteTx, setPendingDeleteTx] = useState<JointTransaction | null>(null)
  /** id catatan yang detailnya sedang dibuka di bottom sheet (null = tertutup) */
  const [detailTxId, setDetailTxId] = useState<string | null>(null)
  /** salinan terakhir untuk sheet â€” supaya animasi tutup tidak kehilangan isinya */
  const [detailTxSnapshot, setDetailTxSnapshot] = useState<JointTransaction | null>(null)
  /** hak Undo hapus: id baris yang masih bisa dikembalikan selama jendelanya hidup */
  const undoJointRef = useRef<string | null>(null)

  /* Penanda settle (Stage 2 #5) tidak lagi dipulihkan lewat efek mount: ia hidup
     di store, dan halaman cuma membaca turunannya â€” lihat blok "DATA TURUNAN"
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
  /* â”€â”€ DATA TURUNAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  /**
   * Pembagian tidak lagi ditempel dari `splitOverrides` milik halaman: pilihan
   * user DITULIS ke catatannya (`updateSplit()` di store), jadi label timeline,
   * angka timbangan, dan baris ledger membaca objek yang sama â€” tidak ada dua
   * sumber kebenaran yang bisa berbeda cerita.
   */
  const feed = useMemo(() => jointLedgerFeed(joint, JOINT_MONTH_KEY), [joint])
  /** bulan ini sudah disettle? â†’ timbangan dikunci rata (Stage 2 #5) */
  const settled = settlementRecordFor(joint, JOINT_MONTH_KEY) !== null
  /** sisa bulan lalu yang belum tertutup â†’ baris pembuka bulan ini */
  const carryOverRecord = carryOverRecordFor(joint, JOINT_MONTH_KEY)

  const settlement = useMemo(() => computeSettlement(feed, { settled }), [feed, settled])

  /* â”€â”€ MOCK SUPABASE REALTIME (Section 5C) â€” demo yang jujur disebut demo â”€â”€â”€
     Dua tahap: indikator "Dany sedang mencatat..." â†’ catatan partner masuk
     (slide-in dari kanan) + toast ringan.

     PAKET 52: timer ini BUKAN realtime. Ia hidup HANYA saat `DEMO_REALTIME_MOCK`
     (`NEXT_PUBLIC_DEMO=1`) dan hanya kalau kantong ini sudah punya anggota lain;
     di build produksi saklarnya mati, jadi tidak ada satu pun catatan yang
     "muncul sendiri". Barisnya masuk lewat STORE (`applyJointRow`) â€” jalur yang
     sama dengan baris dari Postgres Changes â€” sehingga dedupe & penyimpanannya
     gratis: kalau id-nya sudah ada, tidak ada yang ditulis dan toast-nya tidak
     diulang. Konsekuensinya jujur: animasi "baris partner masuk" hanya terjadi
     sekali per perangkat, karena barisnya kini benar-benar tersimpan. */
  useEffect(() => {
    if (!DEMO_REALTIME_MOCK || !partner) return

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
          )}`,
        )
      }
      /* badge "Baru" dilepas lagi setelah animasi slide-in selesai */
      later(() => clearJointArrivalBadge(REALTIME_ARRIVAL.id), 4200)
    }, REALTIME_ARRIVAL_DELAY)

    return () => {
      window.clearTimeout(typing)
      window.clearTimeout(arrival)
    }
  }, [partner, later])

  /* â”€â”€ REALTIME SUNGGUHAN â€” sekarang milik STORE (paket 52) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     Langganan Postgres Changes pada `joint_transactions` tidak lagi dipegang
     halaman ini. `lib/money/joint-store.ts` yang membaca id dompet dari tabel
     `joint_wallets` (bukan id kanon `joint_1` yang tidak pernah ada di sana),
     menarik baris yang sudah ada, lalu membuka channel untuk id itu dan
     menerima tiap baris lewat `applyRemoteJointRow()`. Alasannya sederhana:
     kalau halaman yang berlangganan, dua tab bisa punya dua channel untuk satu
     kantong yang sama â€” dan baris yang diterima salah satu tab tidak pernah
     sampai ke tab lain. Channel tetap dibuang saat tab disembunyikan
     (`lib/supabase/realtime.ts`). */


  /* â”€â”€ HANDLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const saveWalletName = useCallback(() => {
    const next = nameDraft.trim()
    setEditingName(false)
    if (!next || next === wallet.name) return
    /* satu pintu: nama kantong ditulis ke store (persist IndexedDB) â€” dulu
       `setWallet()` halaman saja, jadi nama yang diubah user hilang saat refresh */
    const saved = renameJointWallet(next)
    if (saved) toast.success('Nama dompet diperbarui ðŸ’š')
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
   * dibuka lagi supaya user tinggal menekan "Catat" â€” total â‰¤ 3 tap dari FAB
   * (Atur pembagian â†’ preset 60/40 â†’ Simpan Pembagian).
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
         dikirim cuma MODE-nya (+ persen untuk mode persentase) â€” nominalnya,
         bahkan untuk mode nominal, tidak pernah ikut. */
      const split = draft.split
      trackMoneyEvent(
        'joint_split_changed',
        split.type === 'percentage'
          ? {
              mode: split.type,
              me_percent: split.percents[me.id] ?? null,
              partner_percent: partner ? (split.percents[partner.id] ?? null) : null,
            }
          : { mode: split.type },
      )
      if (splitTarget === 'new') {
        setDraftSplit(draft)
        toast.success('Pembagian disiapkan', {
          description: 'Berlaku saat transaksinya dicatat.',
        })
        /* lanjutkan form-nya: nominal, "siapa yang nalangin", & toggle privasi
           tidak perlu diisi ulang karena semuanya milik halaman, bukan sheet */
        setShowAddSheet(true)
        return
      }
      if (!splitTarget) return
      /* pembagian pilihan user DITULIS ke catatannya (store) â€” bukan disimpan
         sebagai override di halaman, supaya angka yang dilihat halaman lain &
         ekspor membaca pembagian yang sama */
      const updated = updateSplit(splitTarget, split)
      if (updated) toast.success('Pembagian diperbarui')
      else toast.error('Catatan itu tidak bisa diubah pembagiannya')
    },
    [splitTarget, me.id, partner],
  )

  /**
   * transaksi baru dari FAB: disisipkan ke timeline (dan ikut hitungan
   * settlement + hero "Total Pengeluaran Bersama" â€” TIDAK ada saldo dompet
   * yang dikurangi, karena dompet ini buku besar bersama, bukan rekening).
   *
   * KEPUTUSAN TERTULIS (paket 37/49) â€” buku besar BERSAMA ini SENGAJA terpisah
   * dari ledger pribadi (`lib/money/store.ts`), dan itu bukan kelalaian:
   *
   *   1. Yang menanggung uangnya adalah orang, bukan dompet. Satu pengeluaran
   *      bareng punya `paidByUserId` + pembagian (`SplitSpec`) yang tidak punya
   *      padanan di ledger pribadi â€” memaksakannya ke sana berarti mengarang
   *      dompet pribadi yang tidak ada, atau menggeser saldo dompet user tanpa
   *      satu pun rupiah benar-benar berpindah.
   *   2. Cerita yang dibaca user juga beda: Riwayat pribadi menjawab "dompetku
   *      berapa", halaman ini menjawab "siapa berutang berapa". Menggabungkan
   *      keduanya membuat dua pertanyaan itu dijawab satu angka.
   *   3. Karena itu pemilik data di sini adalah STORE kantong bersama
   *      (`lib/money/joint-store.ts` â€” paket 52), dan toast-nya
   *      (`JOINT_ADDED_TOAST`) muncul setelah baris itu BENAR-BENAR ditulis â€”
   *      bukan setelah `bus` pribadi yang tidak tahu apa-apa.
   *
   * Yang wajib tetap berlaku: kalau alur joint ini kelak menyentuh kas pribadi
   * (mis. menarik biaya bareng dari BCA), jalurnya `postTransfer()` /
   * `postTransaction()` di store uang â€” bukan disisipkan diam-diam ke daftar di
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
      /** dompet pribadi yang benar-benar mengeluarkan uang (opsional) */
      cashWalletId?: string
    }) => {
      const tx = addJointTransaction({
        description: input.description,
        amount: input.amount,
        /* kategori datang dari PILIHAN USER di form (paket 54). Sebelumnya
           halaman ini tidak pernah mengirimkannya, jadi setiap catatan baru
           masuk sebagai `JOINT_DEFAULT_CATEGORY` dan rincian kategori di halaman
           ini tidak pernah mencerminkan apa yang user pilih. Catatan privat
           tetap dianonimkan store (`PRIVATE_CATEGORY`) â€” aturan privasi, bukan
           kelalaian. */
        category: input.category,
        isPrivate: input.isPrivate,
        /* kantong yang keluar uang datang dari pemilih "Siapa yang nalangin?"
           (Stage 2 #3) â€” bukan lagi selalu pencatat. */
        paidByUserId: input.paidByUserId,
        /* saat privat, pembagiannya TIDAK dikirim: porsi catatan privat bukan
           urusan pasangan â€” dan store memaksa pembagiannya jadi bagi rata,
           sementara NOMINALnya tetap ikut ditimbang (audit fintech #3). */
        split: input.isPrivate ? null : (input.split?.split ?? null),
        /* dompet pribadi (opsional). Store hanya menulis baris kas kalau yang
           menalangi memang pemilik sesi â€” kalau pasangan yang nalangin, dompet
           user tidak boleh ikut terdebit. */
        ...(input.cashWalletId ? { cashWalletId: input.cashWalletId } : {}),
      })

      /* store menolak (nominal â‰¤ 0 / kantong bukan anggota) â†’ TIDAK ada yang
         ditulis, jadi jangan mengabarkan "tersimpan" */
      if (!tx) {
        toast.error('Catatan bareng gagal disimpan, cek nominalnya ya')
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
   * (Stage 2 #5 Â· dipindah ke store di paket 52).
   *
   * Yang ditulis hanya PENANDA bulan itu (`recordSettlement`) ke store; baris
   * ledger `settlement {from, to, amount, method, month}` DITURUNKAN dari
   * penanda tersebut oleh `jointLedgerFeed()` â€” ditandai `isSettlement` supaya
   * tidak ikut "Total Pengeluaran Bersama", tapi tetap masuk lapisan net
   * sehingga timbangannya benar-benar rata. Karena barisnya turunan (id-nya
   * `settle-<bulan>-<dari>-<ke>`), refresh berkali-kali tidak pernah
   * menggandakannya.
   *
   * `carryOver` = bagian utang yang TIDAK tertutup transfer ini. Alur sekarang
   * selalu mentransfer penuh (tombolnya baru muncul di atas ambang settle), jadi
   * nilainya 0 â€” tapi jalurnya tetap ada & teruji: sisanya otomatis jadi
   * pembuka bulan berikutnya lewat `buildCarryOverEntry()`.
   */
  const handleSettle = useCallback(
    (method: SettlementMethod, cashWalletIdFromModal?: string) => {
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
        /* dompet pribadi (opsional). Kalau diisi, `recordSettlement()` menulis
           baris kas untuk SISI PEMILIK SESI saja â€” pengirim: keluar, penerima:
           masuk. Jadi uangnya benar-benar pindah, dan Riwayat menceritakannya. */
        ...(cashWalletIdFromModal ? { cashWalletId: cashWalletIdFromModal } : {}),
      }
      const stored = recordSettlement(record)
      if (!stored) {
        toast.error('Settle-nya gagal disimpan, coba lagi ya')
        return
      }
      if (cashWalletIdFromModal && !stored.cashRowId) {
        /* dompet tidak dikenal / saldo kurang: penanda bulan tetap tersimpan
           (kesepakatan dua orang itu fakta), tapi katakan uangnya tidak bergerak */
        toast('Settle ditandai, tapi dompetnya belum bergerak', {
          description: 'Cek saldo dompet yang dipilih, atau catat transfernya manual.',
        })
      }
      setSettleWalletId('')
      /* JEJAK (paket 43): settle menyelesaikan kewajiban bulan ini. Yang dikirim
         hanya arah + metode transfernya â€” nominal transfer TIDAK dikirim. */
      trackMoneyEvent('settlement_recorded', {
        scope: 'joint',
        direction: stored.from === me.id ? 'out' : 'in',
        method,
      })
    },
    [settlement, me.id],
  )

  /** pasangan bergabung (8C): selebrasi singkat. Keanggotaannya SUDAH ditulis
   *  server saat seseorang menerima undangan, jadi menutup overlay ini tidak
   *  mengubah status apa pun â€” tidak ada lagi "gabung" yang dikarang lokal. */
  const finishCelebration = useCallback(() => {
    setShowCelebration(false)
    later(() => toast.success('Dompet bersama kalian aktif'), 400)
  }, [later])

  /**
   * Koreksi kantong yang keluar uang ("Siapa yang nalangin?" yang salah pilih).
   * Uangnya tidak berpindah, tapi timbangan & arah transfer ikut berubah â€” dan
   * itu memang tujuannya (audit fintech #4).
   */
  const handleChangePaidBy = useCallback(
    (tx: JointTransaction, userId: string) => {
      const updated = setJointPaidBy(tx.id, userId)
      if (!updated) return
      /* nama yang disebut = peserta SUNGGUHAN (me/partner dari store), bukan id */
      toast.success(`Dicatat dari kantong ${userId === me.id ? me.name : (partner?.name ?? 'Pasangan')}`)
    },
    [me.id, me.name, partner?.name],
  )

  /**
   * HAPUS SATU BARIS catatan bareng (paket 61.3) â€” tolak dulu, jangan langsung
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
       berubah â€” dan alasannya dikatakan, bukan diam-diam tidak terjadi apa-apa */
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
        ? /* bentuk kanonik lewat `splitSpecOf()` â€” jalur migrasi data lama
             (splitType/splits) hidup di lib, bukan di komponen */
          { split: splitSpecOf(splitTargetTx) }
        : undefined

  /* baris settlement bukan "catatan": kalau yang ada cuma baris settle, empty
     state-nya harus tetap muncul */
  const isEmptyJoint = partnerJoined && jointNotes(joint).length === 0
  /** catatan yang dibuka di bottom sheet â€” dicari dari feed supaya ikut ter-update */
  const detailTx = detailTxId ? (feed.find((tx) => tx.id === detailTxId) ?? null) : null
  const detailTxView = detailTx ?? detailTxSnapshot

  /* â”€â”€ KUNCI PAKET (paket 84) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     Joint Wallet hanya ada di paket Waras ke atas. Halaman ini tetap BISA
     dibuka (bukan 404, bukan layar kosong) dan menjelaskan sebabnya + jalan
     keluarnya. Early-return ini legal karena SELURUH hook di komponen ini sudah
     dipanggil di atas (hook terakhir: `confirmDeleteJointTx`). */
  if (planKnown && !canUse('joint-wallet')) {
    return (
      <ScreenShell>
        <div className="w-full max-w-[560px]">
          <LockedFeatureNote capability="joint-wallet" />
        </div>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      {/* FULL-WIDTH (audit #4): halaman ini dulu dikurung dalam satu kolom
          720px di tengah sehingga separuh layar desktop terbuang. Sekarang
          konten melebar penuh (offset sidebar ditangani ScreenShell) dan
          dipecah dua kolom di desktop â€” lihat grid di bawah. */}
      <div className="w-full">
        {/* â”€â”€ KONTEKS UANG (paket 47) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            Halaman ini MEMANG konteks `bersama` (PRD 2D) dan punya DUA wujud:
            flow "Ajak Pasangan" (belum gabung) dan kantong bersama. Bar konteks
            ini diletakkan di ATAS percabangan itu supaya kedua wujud sama-sama
            punya switcher (mobile + desktop) dan sama-sama jujur saat konteks
            aktif bukan `bersama`. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end lg:gap-4">
          {/* dua penempatan seperti Home/Budget: satu untuk mobile, satu untuk
              desktop (paket 47) â€” bukan satu kontrol yang direntangkan */}
          <div className="flex justify-center lg:hidden">
            {/* PAKET 75: dropdown label-penuh, sama dengan semua halaman lain
                (menggantikan segmented control lama). */}
            <ContextMenu value={context} onChange={setContext} className="w-56" />
          </div>
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <ContextMenu value={context} onChange={setContext} className="w-44" />
            <GlobalPrivacyToggle />
          </div>
        </div>

        {partner ? (
          <>
            {/* â”€â”€ MODERN HERO (redesign): chip partner + total + split bar â”€â”€
                Satu blok ringkas menggantikan header lama yang memuat dua baris
                penjelas dan tiga kartu statistik. Tidak ada paragraf onboarding:
                hanya identitas, angka bulan ini, dan porsi masing-masing. */}
            <header className="mt-3 rounded-[1.75rem] bg-cream px-5 py-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hud-sage/20 text-forest ring-1 ring-hud-sage/30">
                    <Heart className="size-[18px]" strokeWidth={2.2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate font-display text-[20px] font-semibold tracking-tight text-forest lg:text-[22px]">
                      {me.name} &amp; {partner.name}
                    </h1>

                    {/* nama dompet tetap bisa diubah â€” satu tap, tanpa paragraf */}
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
                        className="mt-0.5 w-full rounded-lg bg-cream px-1.5 py-0.5 text-[13px] font-medium text-forest outline-none ring-2 ring-forest/35"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(wallet.name)
                          setEditingName(true)
                        }}
                        aria-label="Ubah nama dompet bersama"
                        className="group mt-0.5 flex max-w-full items-center gap-1.5 text-left"
                      >
                        <span className="truncate text-[12.5px] font-medium text-forest/45">
                          {wallet.name}
                        </span>
                        <Pencil
                          aria-hidden
                          className="size-3 shrink-0 text-forest/25 transition-colors group-hover:text-forest/50"
                          strokeWidth={2.4}
                        />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-hud-sage/20 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-wide text-forest ring-1 ring-hud-sage/30">
                    <span aria-hidden className="size-1.5 rounded-full bg-hud-sage" />
                    Aktif
                  </span>
                </div>
              </div>

              {/* focal nominal: total pengeluaran bersama bulan ini */}
              <div className="mt-5">
                <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-forest/40">
                  Total Pengeluaran Bersama
                </p>
                <p className="mt-1 font-display text-[32px] font-semibold leading-none tabular-nums tracking-tight text-forest">
                  {moneyLabel(settlement.totalSpent, isMasked)}
                </p>
                <p className="mt-1 text-[12.5px] font-medium text-forest/45">{JOINT_MONTH_LABEL}</p>
              </div>

              {/* contribution split bar â€” dua segmen, persen + nominal */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-[12.5px] font-medium text-forest">
                  <span>
                    {me.name}{' '}
                    <span className="text-forest/45">({settlement.myPct}%)</span>
                  </span>
                  <span>
                    {partner.name}{' '}
                    <span className="text-forest/45">({settlement.partnerPct}%)</span>
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`Porsi pengeluaran ${me.name} ${settlement.myPct} persen, ${partner.name} ${settlement.partnerPct} persen`}
                  className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-soil/[0.07]"
                >
                  <span
                    aria-hidden
                    className="h-full bg-hud-sage transition-[width] duration-500"
                    style={{ width: `${settlement.myPct}%` }}
                  />
                  <span
                    aria-hidden
                    className="h-full bg-hud-amber transition-[width] duration-500"
                    style={{ width: `${settlement.partnerPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[12.5px] font-medium tabular-nums text-forest/55">
                  <span>{moneyLabel(settlement.myTotalSpent, isMasked)}</span>
                  <span>{moneyLabel(settlement.partnerTotalSpent, isMasked)}</span>
                </div>
              </div>
            </header>
            {/* â”€â”€ SECTION 11: banner gaya push (pengeluaran > Rp 500.000) â”€â”€ */}
            <JointPushBanner
              tx={pushTx}
              masked={isMasked}
              onDismiss={() => setPushTx(null)}
              onOpenSplit={openSplitFor}
              me={me}
              partner={partner}
            />

            {/* â”€â”€ DUA KOLOM DI DESKTOP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                Mobile: satu kolom â€” settlement dulu, lalu Cerita Kita.
                Desktop â‰¥ lg: KIRI 5/12 = SATU kartu settlement (sticky),
                KANAN 7/12 = daftar transaksi. Tidak ada lagi ringkasan
                bertumpuk (timbangan + 3 kartu statistik + 2 banner rekap). */}
            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
              <div className="lg:col-span-5 lg:sticky lg:top-4">
                <JointSettlementCard
                  settlement={settlement}
                  masked={isMasked}
                  me={me}
                  partner={partner}
                  onSettle={() => setShowSettlementModal(true)}
                />
              </div>

              {/* â”€â”€ KANAN (7/12): Cerita Kita â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <section className="lg:col-span-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-tight text-forest">
                    <Heart className="size-4 text-hud-terracotta" strokeWidth={2.3} />
                    Cerita Kita
                  </h2>
                  <span className="shrink-0 text-[11.5px] font-medium text-forest/35">
                    {feed.length} catatan
                  </span>
                </div>

                {isEmptyJoint ? (
                  /* SECTION 12: pasangan sudah gabung tapi belum ada transaksi */
                  <div className="mt-4 rounded-[1.75rem] border-2 border-dashed border-hud-sage/45 bg-cream px-6 py-10 text-center">
                    <span aria-hidden className="text-[30px]">
                      ðŸŒ±
                    </span>
                    <h3 className="mt-3 font-display text-[18px] font-semibold tracking-tight text-forest">
                      Dompet bersama kalian masih kosong
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-forest/55">
                      Siapa yang catat duluan? Ayo mulai! ðŸ’š
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        onClick={() => setShowAddSheet(true)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-[14.5px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
                      >
                        Aku duluan! âœ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info(`Notifikasi dikirim ke ${partner.name}! ðŸ“©`)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-cream px-5 text-[14.5px] font-medium text-forest ring-1 ring-soil/16 transition-colors hover:bg-cream active:scale-[0.99]"
                      >
                        <HeartHandshake className="size-4" strokeWidth={2.3} />
                        Tantang {partner.name}! ðŸ’¬
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
                    onOpenEntry={(tx) => {
                      setDetailTxSnapshot(tx)
                      setDetailTxId(tx.id)
                    }}
                  />
                )}
              </section>
            </div>
          </>
        ) : (
          /* â”€â”€ SECTION 8: invite flow (belum ada anggota lain) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
             Wujud ini berarti "belum ada pasangan SUNGGUHAN", bukan "pasangan
             belum menekan tombol simulasi". */
          <JointInviteFlow
            defaultWalletName={wallet.name}
            onCreated={(name) => {
              /* KANTONG BARU = nama baru + BUKU BESAR KOSONG (paket 61.3).
                 `createJointPocket()` menandai seluruh catatan contoh terhapus,
                 jadi kantong yang baru dibuat tidak tampil berisi "Groceries
                 Superindo" â€” satu-satunya cara klaim "baru dibuat" bisa
                 dipercaya. Ditulis ke store (persist), bukan ke state halaman. */
              if (!createJointPocket(name)) return
              setShowInviteModal(true)
            }}
          />
        )}
      </div>
      {/* â”€â”€ SECTION 9: FAB (+) halaman ini â€” Catat transaksi bareng â”€â”€â”€â”€â”€â”€â”€â”€
          Di mobile tombol ini MENGGANTIKAN FAB bottom-nav (nav menyembunyikan
          FAB-nya saat berada di /joint) supaya tetap hanya ada SATU tombol
          tambah, tapi isinya form khas dompet bersama. */}
      {partner && (
        <button
          type="button"
          onClick={() => setShowAddSheet(true)}
          aria-label="Catat transaksi bareng"
          className={cn(
            'fixed bottom-8 left-1/2 z-50 flex size-14 -translate-x-1/2 items-center justify-center rounded-full',
            'bg-forest text-mint shadow-[0_18px_36px_-14px_rgba(0,0,0,0.65)] ring-1 ring-forest/25',
            'transition-transform duration-150 hover:scale-105 active:scale-95',
            'lg:bottom-8 lg:left-auto lg:right-24 lg:h-12 lg:w-auto lg:translate-x-0 lg:gap-2 lg:px-5 lg:text-[14px] lg:font-medium',
          )}
        >
          <Plus className="size-6 lg:size-4" strokeWidth={2.4} />
          <span className="hidden lg:inline">Catat Bareng</span>
        </button>
      )}

      {/* â”€â”€ Sheet & modal (mobile: bottom sheet Â· desktop: dialog) â”€â”€â”€â”€â”€â”€â”€â”€â”€
          Semuanya butuh DUA peserta sungguhan, jadi hanya dirender saat
          `partner` ada. Sebelumnya semuanya dirender dengan identitas contoh. */}
      {partner && (
        <>
          {/* 9 â€” form transaksi bareng: engine standar + field split & privasi */}
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
        walletOptions={cashWalletOptions}
        cashWalletId={cashWalletId}
        onCashWalletChange={setCashWalletId}
      />

      {/* 6 â€” Split Bill: satu instance per target (key) supaya formnya fresh */}
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

      {/* 6b â€” Detail catatan: dibuka dari SATU tap pada baris Cerita Kita.
          Sheet ditutup dulu sebelum Split Sheet dibuka (pola yang sama dengan
          form tambah â†’ split) supaya dua Drawer tidak hidup bersamaan. */}
      <JointEntrySheet
        open={detailTx !== null}
        tx={detailTxView}
        masked={isMasked}
        me={me}
        partner={partner}
        onClose={() => setDetailTxId(null)}
        onOpenSplit={(tx) => {
          setDetailTxId(null)
          openSplitFor(tx)
        }}
        onChangePaidBy={handleChangePaidBy}
        deleteState={detailTxView ? jointDeleteState(joint, detailTxView) : undefined}
        onDelete={setPendingDeleteTx}
      />

      {/* 7 â€” Settlement modal (satu-satunya aksi transfer, dibuka dari kartu settle) */}
      <JointSettlementModal
        open={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        settlement={settlement}
        masked={isMasked}
        onSettle={handleSettle}
        carryOverRecord={carryOverRecord}
        me={me}
        partner={partner}
        walletOptions={cashWalletOptions}
        cashWalletId={settleWalletId}
        onCashWalletChange={setSettleWalletId}
        onUndoSettle={() => {
          const undone = undoSettlement(JOINT_MONTH_KEY)
          if (!undone) {
            toast('Tidak ada settle yang bisa dibatalkan bulan ini')
            return
          }
          toast.success('Settle dibatalkan', {
            description: undone.cashRowId
              ? 'Uangnya kembali ke dompet yang tadi dipakai.'
              : 'Penanda bulan ini sudah dilepas.',
          })
        }}
      />

      {/* 8B â€” kode undangan & 8C â€” selebrasi pasangan bergabung */}
      <JointInviteCodeModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        walletId={wallet.id}
        walletName={wallet.name}
        me={me}
        partner={partner}
      />
          <JointJoinedCelebration
            open={showCelebration}
            onStart={finishCelebration}
            me={me}
            partner={partner}
          />
        </>
      )}


      {/* 61.3 â€” konfirmasi hapus SATU baris catatan bareng. Bentuknya dialog
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
                <b className="font-medium text-forest tabular-nums">
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

/** Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) â€” satu bentuk
 *  tombol mata yang sama di semua halaman. Lihat <GlobalPrivacyToggle />. */
