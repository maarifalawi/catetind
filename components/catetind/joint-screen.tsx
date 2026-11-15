'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Heart, LogOut, Pencil, Plus, Trash2, UserMinus } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { useSubscriptionGate } from './subscription-gate-provider'
import { LockedFeatureNote } from './locked-feature-note'
import { ConfirmDialog } from './confirm-dialog'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { ContextMenu } from './context-menu'
import { useMoneyContext } from './money-context-provider'
import { usePrivacy } from './privacy-provider'
import { JointSettlementCard } from './joint-settlement-card'
import { JointEntrySheet } from './joint-entry-sheet'
import { JointTimeline } from './joint-timeline'
import { JointSplitSheet, type JointSplitDraft } from './joint-split-sheet'
import { JointSettlementModal } from './joint-settlement-modal'
import { JointAddSheet } from './joint-add-sheet'
import { JointInviteCodeModal, JointInviteFlow, JointJoinedCelebration } from './joint-invite-flow'
import { JointEntryChoice, JointJoinCodeForm } from './joint-join-flow'
import { JointPushBanner } from './joint-recap-banners'
import {
  DEMO_JOINED_CELEBRATION,
  DEMO_REALTIME_MOCK,
  DEFAULT_SETTLEMENT_METHOD,
  JOINT_DELETE_COPY,
  JOINT_ADDED_TOAST,
  JOINT_EXPENSE_CARD_LABEL,
  JOINT_INCOME_CARD_LABEL,
  JOINT_LEAVE_COPY,
  JOINT_MEMBER_LIST_TITLE,
  JOINT_MEMBER_ME_BADGE,
  JOINT_MEMBER_OWNER_BADGE,
  JOINT_REMOVE_MEMBER_COPY,
  JOINT_SETTLE_ALL_HINT,
  JOINT_SETTLE_ROW_FAIL,
  JOINT_SETTLE_ROW_TOAST,
  JOINT_SOLO_OWNER_COPY,
  JOINT_TODAY_ISO,
  JOINT_WALLET_DELETE_COPY,
  PUSH_ALERT_THRESHOLD,
  REALTIME_ARRIVAL,
  REALTIME_ARRIVAL_DELAY,
  REALTIME_TYPING_DELAY,
  computeSettlement,
  jointMonthLabel,
  moneyLabel,
  splitSpecOf,
  type JointPerson,
  type JointSettlementRecord,
  type JointTransaction,
  type SettlementMethod,
} from '@/lib/data/joint'
import {
  addJointTransaction,
  applyJointRow,
  carryOverRecordFor,
  clearJointArrivalBadge,
  consumeJointPocketRemoved,
  createJointPocket,
  deleteJointPocket,
  deleteJointTransactionEverywhere,
  jointDeleteState,
  jointLedgerFeed,
  jointMemberList,
  jointNotes,
  jointParticipants,
  jointPartnerJoined,
  jointRemoteReadFailed,
  leaveJointPocket,
  recordSettlement,
  refreshRemoteJoint,
  removeJointMember,
  renameJointWallet,
  restoreJointTransaction,
  retryPendingJointRows,
  settleJointTransfer,
  undoSettlement,
  /* alias: halaman ini punya state pajangan `paidBy` untuk form tambah, jadi
     setter store-nya diberi nama sendiri supaya tidak tertukar */
  setPaidBy as setJointPaidBy,
  settlementRecordFor,
  updateSplit,
  useJointStore,
} from '@/lib/money/joint-store'
import { UNDO_WINDOW_MS } from '@/lib/data/history'
import { useTodayISO } from '@/lib/use-today-iso'
import { trackMoneyEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'

/* ── Joint Wallet (/app/joint) — PRD Domain 2D ───────────────────────────────
   "Multiplayer mode" CatetInd: satu dompet untuk dua orang. Halaman ini harus
   terasa seperti MILESTONE hubungan — hangat, intim, sedikit playful — bukan
   buku besar korporat. Dua visual tanda tangannya:

   1. Kartu Settlement tunggal — arah transfer + nominal + satu CTA; tidak ada
      lagi panci timbangan, banner rekap, dan kartu settle duplikat.
   2. Cerita Kita — daftar transaksi bergaya halaman Riwayat (kepala hari garis
      rambut, baris kartu tipis, satu tap target → bottom sheet).

   DUA KOREKSI BESAR (audit fintech #1 & #4):
   • TIDAK ADA "saldo bersama". Ini shared ledger — uang tidak dikumpulkan di
     satu rekening, jadi hero-nya adalah TOTAL PENGELUARAN BERSAMA bulan ini
     (angka yang memang ada di catatan), bukan saldo fiktif.
   • Layout DESKTOP 2 KOLOM dan melebar penuh: kiri = settlement, kanan =
     aktivitas (Cerita Kita).

   Aturan hitungnya ada di `lib/data/joint.ts` (paidBy vs weighedPaidBy) —
   jangan menghitung ulang nominal di komponen.

   Transparansi: SEMUA anggota melihat isi catatan (toggle "Sembunyikan dari
   pasangan" dihapus atas permintaan pemilik produk). Yang tersisa dari lapisan
   privasi hanya sensor NOMINAL global (tombol mata di header) — itu menyensor
   tampilan, bukan menyembunyikan data dari anggota lain.

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

export function JointScreen({
  initialEntry = 'choice',
}: {
  /**
   * Pintu masuk awal saat BELUM ada pasangan:
   *   · `choice` — dua pilihan (buat / gabung), keadaan bawaan;
   *   · `join`   — langsung ke form kode, dipakai tautan `/joint?kode=1`
   *                (mis. dari Pengaturan) supaya orang yang diundang tidak
   *                perlu mencari tombolnya sendiri.
   */
  initialEntry?: 'choice' | 'join'
} = {}) {
  /* ── 1. DATA & STATE (Section 1) ───────────────────────────────────────── */
  /* Sumber tunggal: kantong bersama (store). `me` & `partner` diambil dari
     KEANGGOTAAN SUNGGUHAN (uuid + nama panggilan dari server). Tidak ada lagi
     identitas contoh di jalur produksi, jadi nama orang karangan tidak
     mungkin muncul untuk akun nyata. */
  const joint = useJointStore()
  const participants = useMemo(() => jointParticipants(joint), [joint])
  const me = participants.me
  const partner = participants.partner
  /* SELURUH anggota (2 orang atau lebih) — kantong bersama tidak lagi terbatas
     satu pasangan, jadi pemilih pembayar, kartu settle, dan timeline membaca
     daftar ini. */
  const people = useMemo(() => jointMemberList(joint), [joint])
  const wallet = joint.wallet
  const partnerJoined = jointPartnerJoined(joint)

  /* BULAN YANG DILIHAT — dulu halaman ini dipaku ke BULAN CONTOH (`2026-09`),
     sehingga catatan yang dibuat hari ini tidak pernah masuk hitungan ("Total
     Pengeluaran Bersama" tetap Rp 0 padahal timeline penuh). Sekarang:
       · bulan bawaan = bulan berjalan;
       · kalau bulan berjalan belum ada catatan TAPI bulan lain punya, halaman
         membuka bulan terakhir yang ada datanya — supaya user tidak melihat
         Rp 0 padahal catatannya ada (kasus nyata: catatan uji bertanggal
         25 Sep 2026 dibuka di bulan November);
       · user bisa pindah bulan dengan panah di kartu hero, jadi riwayat lama
         tetap bisa diperiksa dan disettle. */
  const today = useTodayISO()
  const currentMonthKey = (today || JOINT_TODAY_ISO).slice(0, 7)
  const [monthCursor, setMonthCursor] = useState<string | null>(null)
  const monthsWithNotes = useMemo(() => {
    const seen = new Set<string>()
    for (const tx of jointNotes(joint)) {
      const month = tx.date.slice(0, 7)
      if (month) seen.add(month)
    }
    return [...seen].sort().reverse()
  }, [joint])
  const monthKey =
    monthCursor ?? (monthsWithNotes.includes(currentMonthKey) || monthsWithNotes.length === 0
      ? currentMonthKey
      : monthsWithNotes[0])
  const monthLabel = jointMonthLabel(monthKey)
  /** geser satu bulan (dipakai tombol panah di kartu hero) */
  const shiftMonth = useCallback(
    (delta: number) => {
      const [year, month] = monthKey.split('-').map(Number)
      if (!year || !month) return
      const next = new Date(Date.UTC(year, month - 1 + delta, 1))
      setMonthCursor(
        `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`,
      )
    },
    [monthKey],
  )

  /* paket user (paket 84) — menentukan apakah PEMBUAT dompet boleh membuat
     dompet baru. Dipanggil di sini (bukan di bawah) supaya urutan hook stabil. */
  const { planKnown, canUse } = useSubscriptionGate()
  /**
   * AKSES ANGGOTA (aturan produk): yang berlangganan cukup PEMBUAT dompet.
   * Anggota yang DIUNDANG — termasuk akun gratis — membuka seluruh fitur selama
   * dompetnya aktif (ada anggota lain di roster). Karena itu kunci halaman
   * TIDAK boleh dipasang di level halaman; yang dikunci hanya aksi "Buat".
   */
  const memberAccess = partnerJoined
  const canCreateWallet = !planKnown || canUse('joint-wallet')
  /** pemilik dompet: hanya dia yang boleh menghapus dompet / mengeluarkan anggota */
  const isOwner = joint.ownerId === null || joint.ownerId === me.id
  /**
   * Pemilik SENDIRIAN yang dompetnya masih punya riwayat (anggota terakhir baru
   * keluar). Tanpa cabang ini layar jatuh ke "Mau mulai dari mana?" padahal
   * dompet & catatannya masih ada — pemilik jadi tidak bisa mengundang lagi
   * atau menghapus dompetnya dari layar itu.
   */
  const soloOwnerWithHistory = !partnerJoined && isOwner && jointNotes(joint).length > 0

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
  const [nameDraft, setNameDraft] = useState(wallet.name)
  const [editingName, setEditingName] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  /**
   * Layar mana yang terbuka saat kantong BELUM punya pasangan:
   * `choice` (dua pilihan) → `create` (nama dompet + kode) atau `join` (input
   * kode). State ini murni tampilan; keanggotaan tetap ditulis server.
   */
  const [entryMode, setEntryMode] = useState<'choice' | 'create' | 'join'>(initialEntry)
  /**
   * Selebrasi "pasangan bergabung" HANYA boleh menyala dari KEANGGOTAAN NYATA.
   *
   * Dulu nilainya dipicu tombol simulasi penggabungan di perangkat
   * sendiri. Tombol itu sudah dihapus; sekarang selebrasi menyala saat jumlah
   * anggota yang dibaca dari server BERTAMBAH selama halaman terbuka — bukti
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
  /**
   * ISIAN FORM CATAT BARENG yang sedang berjalan (nominal, catatan, kategori,
   * tipe). Disimpan di HALAMAN, bukan cuma di dalam sheet, karena sheet ini
   * harus ditutup sebentar setiap kali user membuka "Atur Pembagian" — dan
   * state internal engine hilang saat sheet ditutup.
   *
   * `null` = belum ada isian (form baru). Dikosongkan HANYA saat form catatnya
   * ditutup user atau catatannya tersimpan — bukan saat mampir ke pembagian.
   */
  const [addDraft, setAddDraft] = useState<{
    amount: number
    note: string
    category: string
    type: 'expense' | 'income'
  } | null>(null)
  /**
   * true = sheet add ditutup BUKAN karena user, melainkan karena kita
   * memindahkannya ke sheet pembagian. `onClose` yang ikut terpanggil saat itu
   * tidak boleh mengosongkan draft.
   */
  const keepDraftOnClose = useRef(false)
  /** kantong yang nalangin di form tambah — default Aku (Stage 2 #3) */
  const [paidBy, setPaidBy] = useState<string>(me.id)
  /* mock Supabase Realtime (5C) */
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [pushTx, setPushTx] = useState<JointTransaction | null>(null)
  /** catatan bareng yang menunggu konfirmasi hapus (paket 61.3) — tidak pernah langsung hilang */
  const [pendingDeleteTx, setPendingDeleteTx] = useState<JointTransaction | null>(null)
  /** dompet bersama yang menunggu konfirmasi HAPUS (bukan sekadar keluar) */
  const [pendingDeleteWallet, setPendingDeleteWallet] = useState(false)
  /** anggota yang menunggu konfirmasi DIKELUARKAN (khusus pemilik) */
  const [pendingRemoveMember, setPendingRemoveMember] = useState<JointPerson | null>(null)
  /** konfirmasi KELUAR mandiri (anggota bukan pemilik) */
  const [pendingLeave, setPendingLeave] = useState(false)
  /** id catatan yang detailnya sedang dibuka di bottom sheet (null = tertutup) */
  const [detailTxId, setDetailTxId] = useState<string | null>(null)
  /** salinan terakhir untuk sheet — supaya animasi tutup tidak kehilangan isinya */
  const [detailTxSnapshot, setDetailTxSnapshot] = useState<JointTransaction | null>(null)
  /** hak Undo hapus: id baris yang masih bisa dikembalikan selama jendelanya hidup */
  const undoJointRef = useRef<string | null>(null)
  /**
   * true = bacaan server terakhir gagal padahal dompetnya sudah pernah tersinkron.
   * Dipakai empty state supaya layar TIDAK berkata "dompet masih kosong" saat
   * sebenarnya cuma gagal memuat (temuan: akun kedua 0 catatan, server berisi 3).
   */
  const [remoteStale, setRemoteStale] = useState(false)

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

  /* ── SEGARKAN DARI SERVER SAAT HALAMAN DIBUKA ────────────────────────────
     Store sudah memasang langganan realtime saat hidrasi, tapi bacaan awal itu
     terjadi SEKALI (saat tab pertama dibuka). Kalau catatan ditambah dari
     perangkat lain sementara channel sempat terlepas (tab disembunyikan), daftar
     di layar bisa tertinggal. Satu bacaan ulang di sini menutup celah itu — dan
     kalau tidak ada sesi/backend, `refreshRemoteJoint()` pulang tanpa mengubah
     apa pun (`false`). */
  const syncFromServer = useCallback(async () => {
    await refreshRemoteJoint()
    /* Baris yang sebelumnya gagal terkirim dicoba lagi setiap kali layar
       disegarkan — supaya catatan yang sempat lokal tidak tertinggal
       selamanya di satu akun. */
    await retryPendingJointRows()
    /* Bedakan "dompet memang kosong" dari "server belum bisa dibaca": layar
       tidak boleh mengklaim kosong saat datanya cuma gagal dimuat. */
    setRemoteStale(jointRemoteReadFailed())
    if (!consumeJointPocketRemoved()) return
    /* Dompet di server sudah tidak ada (dihapus pemilik) atau keanggotaan kita
       dilepas. State perangkat sudah dibersihkan store; layar kembali ke dua
       pilihan tanpa dompet hantu. */
    setEntryMode('choice')
    toast('Dompet bersama sudah tidak ada', {
      description:
        'Mungkin pemilik menghapusnya atau kamu dikeluarkan. Kamu bisa membuat dompet baru atau gabung pakai kode.',
    })
  }, [])

  useEffect(() => {
    void syncFromServer()
    /* Saat tab/aplikasi dibuka kembali, periksa lagi: dompet bisa saja dihapus
       pemilik sementara tab ini disembunyikan (channel realtime ikut dilepas
       saat tab hidden — lihat `lib/supabase/realtime.ts`). */
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void syncFromServer()
    }
    /* Jaringan kembali → kesempatan pertama mengirim baris yang tertahan. */
    const onOnline = () => void syncFromServer()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [syncFromServer])

  /* ── CATATAN YANG BELUM SAMPAI KE SERVER ────────────────────────────────────
     Baris `pendingSync` tetap tampil (offline-first), tapi user diberi tahu
     SEKALI per baris bahwa pasangannya belum melihatnya. Sebelum ini, catatan
     yang gagal terkirim terlihat identik dengan yang sudah tersinkron — persis
     kebingungan "di akun pertama ada, di akun kedua kosong". */
  const warnedPending = useRef<Set<string>>(new Set())
  useEffect(() => {
    const pending = joint.transactions.filter(
      (tx) => tx.pendingSync && !warnedPending.current.has(tx.id),
    )
    if (pending.length === 0) return
    for (const tx of pending) warnedPending.current.add(tx.id)
    toast('Catatan ini belum terkirim ke server', {
      description:
        'Pasangan kamu belum bisa lihat catatan ini. Aku coba kirim ulang otomatis, cek koneksi juga ya.',
    })
  }, [joint.transactions])
  /* ── DATA TURUNAN ──────────────────────────────────────────────────────── */
  /**
   * Pembagian tidak lagi ditempel dari `splitOverrides` milik halaman: pilihan
   * user DITULIS ke catatannya (`updateSplit()` di store), jadi label timeline,
   * angka timbangan, dan baris ledger membaca objek yang sama — tidak ada dua
   * sumber kebenaran yang bisa berbeda cerita.
   */
  const feed = useMemo(() => jointLedgerFeed(joint, monthKey), [joint, monthKey])
  /** bulan ini sudah disettle? → timbangan dikunci rata (Stage 2 #5) */
  const settled = settlementRecordFor(joint, monthKey) !== null
  /** sisa bulan lalu yang belum tertutup → baris pembuka bulan ini */
  const carryOverRecord = carryOverRecordFor(joint, monthKey)

  const settlement = useMemo(
    () =>
      computeSettlement(feed, {
        settled,
        month: monthKey,
        members: joint.members.length > 0 ? joint.members : undefined,
        people,
        viewerId: me.id,
      }),
    [feed, settled, monthKey, joint.members, people, me.id],
  )

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

  /* ── FORM CATAT BARENG: DRAFT, BUKA, TUTUP, PINDAH KE PEMBAGIAN ───────────
     Aturan yang dijaga di sini (permintaan pemilik produk, 11 Nov 2026):

       · mampir ke "Atur Pembagian"    → nominal & catatan TETAP;
       · menutup form Catat Bareng     → draft dikosongkan (form fresh lagi);
       · catatan tersimpan             → draft dikosongkan.

     Draft disimpan di `addDraft` dan dipulangkan ke engine sebagai
     `resumeDraft` — engine sendiri mengosongkan form setiap kali dibuka, jadi
     tanpa titipan ini nominal yang barusan diketik akan hilang. */

  /** engine melaporkan isian terbaru (nominal/catatan/kategori/tipe) */
  const handleDraftChange = useCallback(
    (draft: { amount: number; note: string; category: string; type: string }) => {
      setAddDraft({
        amount: draft.amount,
        note: draft.note,
        category: draft.category,
        /* kantong bersama hanya punya dua jenis catatan; tipe lain tidak
           mungkin datang dari sheet ini, tapi dinormalkan supaya tipe state
           tidak melebar ke union milik engine */
        type: draft.type === 'income' ? 'income' : 'expense',
      })
    },
    [],
  )

  /** FAB / tombol "catat": SELALU mulai dari form kosong */
  const openAddSheet = useCallback(() => {
    keepDraftOnClose.current = false
    setAddDraft(null)
    setDraftSplit(null)
    setPaidBy(me.id)
    setShowAddSheet(true)
  }, [me.id])

  /** form ditutup USER (X, geser, Esc) — bukan karena pindah ke pembagian */
  const handleAddSheetClose = useCallback(() => {
    setShowAddSheet(false)
    if (keepDraftOnClose.current) return
    setAddDraft(null)
    setDraftSplit(null)
    setPaidBy(me.id)
  }, [me.id])

  /**
   * Buka Split Bill Sheet untuk transaksi BARU.
   *
   * Stage 2 #4 & #6: sheet add DITUTUP dulu sebelum sheet split dibuka. Dulu
   * dua `Drawer.Root` z-[70] bisa hidup bersamaan (nested Vaul), sehingga fokus
   * & tombol back jadi tidak menentu. Setelah pembagian disimpan — atau user
   * kembali — sheet add dibuka lagi dengan isian yang SAMA (bukan kosong).
   */
  const openSplitForNew = useCallback(() => {
    /* tandai: penutupan sheet berikutnya bukan kehendak user */
    keepDraftOnClose.current = true
    setShowAddSheet(false)
    setSplitTarget('new')
    setShowSplitSheet(true)
  }, [])

  /**
   * Kembali dari sheet pembagian ke langkah SEBELUMNYA (tombol ← di header).
   * Untuk catatan baru → form Catat Bareng; untuk catatan lama → detailnya.
   */
  const backFromSplit = useCallback(() => {
    const target = splitTarget
    setShowSplitSheet(false)
    if (target === 'new') {
      keepDraftOnClose.current = false
      setShowAddSheet(true)
      return
    }
    if (target) setDetailTxId(target)
  }, [splitTarget])

  /** tombol X di sheet pembagian: kembali ke form (baru) atau tutup saja */
  const closeSplitSheet = useCallback(() => {
    setShowSplitSheet(false)
    if (splitTarget === 'new') {
      keepDraftOnClose.current = false
      setShowAddSheet(true)
    }
  }, [splitTarget])

  const handleSaveSplit = useCallback(
    (draft: JointSplitDraft) => {
      setShowSplitSheet(false)
      /* pembagian sudah disimpan = penutupan sheet berikutnya sudah bukan
         "pindah langkah", jadi flag penahan draft dilepas lagi */
      keepDraftOnClose.current = false
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
      /* pembagian pilihan user DITULIS ke catatannya (store) — bukan disimpan
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
      /** jenis catatan: pengeluaran atau pemasukan bersama */
      kind: 'expense' | 'income'
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
           ini tidak pernah mencerminkan apa yang user pilih. */
        category: input.category,
        /* JENIS catatan diteruskan apa adanya. Dulu pilihan "Pemasukan" dibuang
           di jalur ini, sehingga uang masuk tersimpan & terhitung sebagai
           pengeluaran. */
        kind: input.kind,
        /* kantong yang keluar uang datang dari pemilih "Siapa yang nalangin?"
           (Stage 2 #3) — bukan lagi selalu pencatat. */
        paidByUserId: input.paidByUserId,
        /* pembagian hanya relevan untuk pengeluaran; store memaksa bagi rata
           untuk pemasukan (porsi kewajiban semuanya nol). */
        split: input.kind === 'income' ? null : (input.split?.split ?? null),
        /* TIDAK mengirim `cashWalletId`: catatan bersama murni buku besar dan
           tidak menggeser saldo dompet pribadi. Store masih menerima field itu
           untuk data lama — lihat catatan di `joint-add-sheet.tsx`. */
      })

      /* store menolak (nominal ≤ 0 / kantong bukan anggota) → TIDAK ada yang
         ditulis, jadi jangan mengabarkan "tersimpan" */
      if (!tx) {
        toast.error('Catatan bareng gagal disimpan, cek nominalnya ya')
        return
      }

      /* catatan tersimpan = draft form selesai; buka lagi berarti form baru */
      keepDraftOnClose.current = false
      setAddDraft(null)
      setDraftSplit(null)
      setPaidBy(me.id)
      /* catatan baru bertanggal HARI INI → buka bulan berjalan supaya barisnya
         langsung terlihat (user mungkin sedang menelusuri bulan lama) */
      setMonthCursor(null)

      /* Konfirmasi ditembak DI SINI (bukan oleh panel input) sejak paket 33:
         panel cuma menyerahkan draft, pemilik datanya yang tahu catatannya
         tersimpan. */
      toast.success(
        input.kind === 'income' ? 'Pemasukan bersama tersimpan 💚' : JOINT_ADDED_TOAST,
      )

      /* Section 11: pengeluaran bareng > Rp 500.000 memicu banner gaya push */
      if (input.kind === 'expense' && tx.amount > PUSH_ALERT_THRESHOLD) setPushTx(tx)
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
      /* ── GRUP 3–4 ORANG: satu penanda bulan TIDAK cukup ───────────────────
         Daftar transfer bisa berisi B→A dan C→A. "Lunasi semua" berarti
         mencatat SATU baris pelunasan per pasangan (penerima manfaat 100%),
         bukan menutup seluruh bulan dengan satu arah transfer. */
      if (people.length > 2) {
        let recorded = 0
        for (const row of settlement.transfers) {
          const stored = settleJointTransfer({
            month: settlement.month,
            from: row.from.id,
            to: row.to.id,
            amount: row.amount,
            method,
            /* tanpa `cashWalletId`: settle hanya mencatat kesepakatan, saldo
               dompet pribadi tidak disentuh (permintaan pemilik produk) */
          })
          if (stored) recorded += 1
        }
        if (recorded === 0) {
          toast.error('Pelunasan gagal dicatat, coba lagi ya')
          return
        }
        toast.success(`${recorded} pelunasan tercatat`, { description: JOINT_SETTLE_ALL_HINT })
        return
      }

      const now = new Date()
      const settledTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes(),
      ).padStart(2, '0')}`

      /* ── BULAN INI SUDAH PERNAH DISETTLE ──────────────────────────────────
         Catatan baru setelah settle menciptakan utang BARU. Menimpanya dengan
         penanda bulan akan menghapus efek transfer pertama dari hitungan (net
         tidak pernah kembali nol), jadi sisa ini dicatat sebagai BARIS
         pelunasan tersendiri — mekanisme yang sama dengan grup 3+ orang. */
      if (settlementRecordFor(joint, settlement.month)) {
        const extra = settleJointTransfer({
          month: settlement.month,
          from: settlement.whoOwes.id,
          to: settlement.whoIsOwed.id,
          amount: settlement.settlementAmount,
          method,
          dateISO: today,
          timeLabel: settledTime,
        })
        if (!extra) {
          toast.error('Sisa settle gagal dicatat, coba lagi ya')
          return
        }
        trackMoneyEvent('settlement_recorded', {
          scope: 'joint',
          direction: extra.paidByUserId === me.id ? 'out' : 'in',
          method,
        })
        return
      }

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
        /* waktu SUNGGUHAN tombol ini ditekan — dipakai baris timeline, supaya
           akun pasangan membaca tanggal & jam yang sama (dulu dikarang:
           `1 <bulan> · 20:30`) */
        settledAt: today,
        settledTime,
        /* tanpa `cashWalletId`: lihat catatan di kelompok 3–4 orang di atas */
      }
      const stored = recordSettlement(record)
      if (!stored) {
        toast.error('Settle-nya gagal disimpan, coba lagi ya')
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
    [settlement, me.id, people.length, today, joint],
  )

  /**
   * PELUNASAN SATU BARIS TRANSFER (grup 3–4 orang).
   *
   * Setiap baris di kartu settle punya tombolnya sendiri: B→A dan C→A adalah
   * dua transaksi berbeda. Menekan "Lunasi" di baris B→A menulis satu baris
   * pelunasan dengan pembayar B dan penerima manfaat 100% A; utang C ke A TIDAK
   * berubah. Baris itu langsung dikirim ke server (`settleJointTransfer` →
   * `syncJointRow`), jadi perangkat anggota lain menerimanya lewat realtime.
   */
  const handleSettleTransfer = useCallback(
    (row: { from: JointPerson; to: JointPerson; amount: number }) => {
      const stored = settleJointTransfer({
        month: monthKey,
        from: row.from.id,
        to: row.to.id,
        amount: row.amount,
        method: DEFAULT_SETTLEMENT_METHOD,
      })
      if (!stored) {
        toast.error(JOINT_SETTLE_ROW_FAIL)
        return
      }
      toast.success(JOINT_SETTLE_ROW_TOAST(row.from.name, row.to.name))
    },
    [monthKey],
  )

  /** KELUAR mandiri (anggota bukan pemilik): lepas keanggotaan di server, lalu
   *  bersihkan penyimpanan dompet di perangkat ini. Dompet anggota lain tetap. */
  const confirmLeavePocket = useCallback(() => {
    setPendingLeave(false)
    void leaveJointPocket().then(({ serverOk }) => {
      setEntryMode('choice')
      if (serverOk) {
        toast.success('Kamu sudah keluar dari dompet bersama', {
          description: 'Dompet & catatan anggota lain tetap aman.',
        })
        return
      }
      toast('Kamu keluar dari perangkat ini', {
        description:
          'Server tidak bisa dihubungi. Keanggotaanmu mungkin masih tercatat — coba lagi saat online.',
      })
    })
  }, [])

  /** PEMILIK mengeluarkan anggota tertentu. Riwayat catatannya tetap tampil. */
  const confirmRemoveMember = useCallback(() => {
    const member = pendingRemoveMember
    if (!member) return
    setPendingRemoveMember(null)
    void removeJointMember(member.id).then(({ removed }) => {
      if (removed) {
        toast.success(`${member.name} dikeluarkan dari dompet bersama`, {
          description: 'Riwayat catatan yang pernah ia buat tetap tampil.',
        })
        return
      }
      toast.error('Anggota itu belum bisa dikeluarkan. Coba lagi ya.')
    })
  }, [pendingRemoveMember])

  /** pasangan bergabung (8C): selebrasi singkat. Keanggotaannya SUDAH ditulis
   *  server saat seseorang menerima undangan, jadi menutup overlay ini tidak
   *  mengubah status apa pun — tidak ada lagi "gabung" yang dikarang lokal. */
  const finishCelebration = useCallback(() => {
    setShowCelebration(false)
    later(() => toast.success('Dompet bersama kalian aktif'), 400)
  }, [later])

  /**
   * Koreksi kantong yang keluar uang ("Siapa yang nalangin?" yang salah pilih).
   * Uangnya tidak berpindah, tapi timbangan & arah transfer ikut berubah — dan
   * itu memang tujuannya (audit fintech #4).
   */
  const handleChangePaidBy = useCallback(
    (tx: JointTransaction, userId: string) => {
      const updated = setJointPaidBy(tx.id, userId)
      if (!updated) return
      /* nama yang disebut = peserta SUNGGUHAN (dari daftar anggota), bukan id */
      const name = people.find((person) => person.id === userId)?.name ?? 'Anggota'
      toast.success(`Dicatat dari kantong ${name}`)
    },
    [people],
  )

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
    /* SERVER ditanya DULU: baris baru hilang dari layar kalau server benar-benar
       menerima penghapusannya. Kalau hanya tombstone lokal, anggota lain tetap
       melihat catatan yang sama — persis keluhan "di akun kedua masih ada". */
    void deleteJointTransactionEverywhere(tx.id).then(({ removed, reason }) => {
      if (!removed) {
        toast(
          reason === 'locked' ? JOINT_DELETE_COPY.lockedNote : JOINT_DELETE_COPY.toastFailedTitle,
          reason === 'locked' ? undefined : { description: JOINT_DELETE_COPY.toastFailedDescription },
        )
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
    })
  }, [pendingDeleteTx, undoDeleteJointTx, later])

  /**
   * HAPUS DOMPET BERSAMA (bukan "keluar"). Ditolak dulu lewat `ConfirmDialog`,
   * lalu `deleteJointPocket()` menghapus baris dompet di server (cascade ke
   * anggota & catatan) dan membersihkan state perangkat. Kalau server tidak bisa
   * dihubungi / yang menekan bukan pemilik, UI mengatakannya apa adanya —
   * tidak mengklaim "sudah terhapus" untuk data yang masih ada di database.
   */
  const confirmDeleteWallet = useCallback(() => {
    setPendingDeleteWallet(false)
    void deleteJointPocket().then(({ serverOk }) => {
      if (serverOk) {
        toast.success('Dompet bersama dihapus', {
          description: 'Catatan di dalamnya ikut terhapus dari server.',
        })
        return
      }
      toast('Dompet dihapus dari perangkat ini', {
        description:
          'Server tidak bisa dihubungi (atau kamu bukan pemiliknya). Catatan di server mungkin masih ada.',
      })
    })
  }, [])

  /* nilai awal Split Bill Sheet: pembagian transaksi terpilih / draft transaksi baru */
  const splitTargetTx =
    splitTarget && splitTarget !== 'new' ? feed.find((tx) => tx.id === splitTarget) : undefined
  const splitTotal = splitTarget === 'new' ? (addDraft?.amount ?? 0) : (splitTargetTx?.amount ?? 0)
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
  /** catatan yang dibuka di bottom sheet — dicari dari feed supaya ikut ter-update */
  const detailTx = detailTxId ? (feed.find((tx) => tx.id === detailTxId) ?? null) : null
  const detailTxView = detailTx ?? detailTxSnapshot

  /* ── AKSES (paket 84 → direvisi sesi ini) ─────────────────────────────────
     Halaman ini SELALU bisa dibuka — termasuk akun gratis — karena pintu
     "Gabung Pakai Kode" harus tersedia. Kunci paket sekarang hanya pada aksi
     MEMBUAT dompet (dipercabangan `entryMode === 'create'`) dan pada anggota
     aktif yang selalu terbuka penuh tanpa langganan sendiri. */

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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end lg:gap-4">
          {/* dua penempatan seperti Home/Budget: satu untuk mobile, satu untuk
              desktop (paket 47) — bukan satu kontrol yang direntangkan */}
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
            {/* ── MODERN HERO (redesign): chip partner + total + split bar ──
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
                      {people.map((person) => person.name).join(' & ')}
                    </h1>

                    {/* nama dompet tetap bisa diubah — satu tap, tanpa paragraf */}
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
                        <span className="truncate text-[12.5px] font-medium text-forest-muted">
                          {wallet.name}
                        </span>
                        <Pencil
                          aria-hidden
                          className="size-3 shrink-0 text-forest-muted transition-colors group-hover:text-forest-muted"
                          strokeWidth={2.4}
                        />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-hud-sage/20 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-wide text-forest ring-1 ring-hud-sage/30">
                    <span aria-hidden className="size-1.5 rounded-full bg-hud-sage" />
                    Aktif · {people.length} orang
                  </span>
                  {/* HAPUS DOMPET BERSAMA — aksi merusak, jadi selalu lewat
                      ConfirmDialog (tidak pernah sekali tap). */}
                  {/* HAPUS DOMPET BERSAMA — khusus PEMILIK. Aksi merusak untuk
                      SEMUA anggota, jadi selalu lewat ConfirmDialog. Anggota
                      bukan pemilik memakai "Keluar" di kartu anggota. */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteWallet(true)}
                      aria-label={JOINT_WALLET_DELETE_COPY.action}
                      title={JOINT_WALLET_DELETE_COPY.action}
                      className="flex size-8 items-center justify-center rounded-full bg-plum/10 text-plum ring-1 ring-plum/20 transition-colors hover:bg-plum/20 active:scale-95"
                    >
                      <Trash2 className="size-4" strokeWidth={2.3} aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              {/* ── RINGKASAN UANG BULAN INI (dua kartu terpisah) ─────────────
                  Pemasukan bersama DULU cuma badge kecil di bawah angka
                  pengeluaran, jadi mudah disalahartikan sebagai pengurang
                  pengeluaran. Ia bukan: uang masuk ke kas bersama dan hanya
                  menambah talangan penyetornya. Sekarang dua kartu sejajar —
                  pengeluaran & pemasukan — dengan tanda `+` yang jelas. */}
              <div className="mt-5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Bulan sebelumnya"
                    className="flex size-6 items-center justify-center rounded-full bg-soil/[0.06] text-forest-muted transition-colors hover:bg-soil/[0.12] hover:text-forest active:scale-95"
                  >
                    <ChevronLeft className="size-3.5" strokeWidth={2.6} aria-hidden />
                  </button>
                  <p className="min-w-[7.5rem] text-center text-[12.5px] font-medium text-forest-muted">
                    {monthLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    disabled={monthKey >= currentMonthKey}
                    aria-label="Bulan berikutnya"
                    className="flex size-6 items-center justify-center rounded-full bg-soil/[0.06] text-forest-muted transition-colors hover:bg-soil/[0.12] hover:text-forest active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight className="size-3.5" strokeWidth={2.6} aria-hidden />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="rounded-2xl bg-forest/[0.045] px-4 py-3.5 ring-1 ring-soil/10">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-forest-muted">
                      {JOINT_EXPENSE_CARD_LABEL}
                    </p>
                    <p className="mt-1 font-display text-[26px] font-semibold leading-none tabular-nums tracking-tight text-forest">
                      {moneyLabel(settlement.totalSpent, isMasked)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-hud-sage/15 px-4 py-3.5 ring-1 ring-hud-sage/35">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-forest-muted">
                      {JOINT_INCOME_CARD_LABEL}
                    </p>
                    <p className="mt-1 font-display text-[26px] font-semibold leading-none tabular-nums tracking-tight text-forest">
                      +{moneyLabel(settlement.totalIncome, isMasked)}
                    </p>
                  </div>
                </div>
              </div>

              {/* contribution split bar — satu segmen per anggota (2 orang atau
                  lebih). Angka ini adalah KONTRIBUSI setelah pelunasan: settle
                  memindahkan beban, jadi setelah B melunasi bagiannya bar
                  kembali 50%–50%. Label sengaja tanpa kata "bayar". */}
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12.5px] font-medium text-forest">
                  {settlement.members.map((row) => (
                    <span key={row.person.id}>
                      {row.person.id === me.id ? 'Kamu' : row.person.name}{' '}
                      <span className="text-forest-muted">{row.contributionPct}%</span>
                    </span>
                  ))}
                </div>
                <div
                  role="img"
                  aria-label={settlement.members
                    .map(
                      (row) =>
                        `${row.person.id === me.id ? 'Kamu' : row.person.name} ${row.contributionPct} persen`,
                    )
                    .join(', ')}
                  className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-soil/[0.07]"
                >
                  {settlement.members.map((row, index) => (
                    <span
                      key={row.person.id}
                      aria-hidden
                      className={cn(
                        'h-full transition-[width] duration-500',
                        index % 2 === 0 ? 'bg-hud-sage' : 'bg-hud-amber',
                      )}
                      style={{ width: `${row.contributionPct}%` }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12.5px] font-medium tabular-nums text-forest-muted">
                  {settlement.members.map((row) => (
                    <span key={row.person.id}>{moneyLabel(row.contribution, isMasked)}</span>
                  ))}
                </div>
              </div>
            </header>
            {/* ── SECTION 11: banner gaya push (pengeluaran > Rp 500.000) ── */}
            <JointPushBanner
              tx={pushTx}
              masked={isMasked}
              onDismiss={() => setPushTx(null)}
              onOpenSplit={openSplitFor}
              me={me}
              partner={partner}
            />

            {/* ── DUA KOLOM DI DESKTOP ──────────────────────────────────────
                Mobile: satu kolom — settlement dulu, lalu Cerita Kita.
                Desktop ≥ lg: KIRI 5/12 = SATU kartu settlement (sticky),
                KANAN 7/12 = daftar transaksi. Tidak ada lagi ringkasan
                bertumpuk (timbangan + 3 kartu statistik + 2 banner rekap). */}
            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
              <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-4">
                {/* ── ANGGOTA DOMPET (kelola 3–4 orang) ─────────────────────
                    Pemilik bisa mengeluarkan anggota tertentu; anggota lain bisa
                    keluar mandiri. Keduanya lewat dialog konfirmasi, dan
                    keanggotaan di server yang menentukan — bukan state lokal. */}
                <section
                  aria-label={JOINT_MEMBER_LIST_TITLE}
                  className="rounded-[1.75rem] bg-cream p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-forest-muted">
                      {JOINT_MEMBER_LIST_TITLE}
                    </p>
                    <span className="rounded-full bg-hud-sage/20 px-2 py-0.5 text-[11px] font-medium text-forest ring-1 ring-hud-sage/30">
                      {people.length} orang
                    </span>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {people.map((person) => {
                      const owner = joint.ownerId === person.id
                      const self = person.id === me.id
                      return (
                        <li
                          key={person.id}
                          className="flex items-center gap-2.5 rounded-2xl bg-sage/35 px-3 py-2 ring-1 ring-soil/10"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-full text-[17px] ring-1',
                              person.tint,
                            )}
                          >
                            {person.avatar}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-forest">
                              {person.name}
                            </span>
                            <span className="mt-0.5 block text-[11.5px] leading-tight text-forest-muted">
                              {owner
                                ? JOINT_MEMBER_OWNER_BADGE
                                : self
                                  ? JOINT_MEMBER_ME_BADGE
                                  : 'Anggota'}
                            </span>
                          </span>
                          {isOwner && !self && !owner && (
                            <button
                              type="button"
                              onClick={() => setPendingRemoveMember(person)}
                              aria-label={JOINT_REMOVE_MEMBER_COPY.action(person.name)}
                              title={JOINT_REMOVE_MEMBER_COPY.action(person.name)}
                              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-plum/10 text-plum ring-1 ring-plum/20 transition-colors hover:bg-plum/20 active:scale-95"
                            >
                              <UserMinus className="size-4" strokeWidth={2.3} aria-hidden />
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  {/* anggota bukan pemilik: keluar mandiri. Pemilik memakai tombol
                      hapus dompet di header (bukan keluar) — supaya tidak ada
                      dompet tanpa pemilik. */}
                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => setPendingLeave(true)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-plum/10 text-[13px] font-medium text-plum ring-1 ring-plum/20 transition-colors hover:bg-plum/20 active:scale-[0.99]"
                    >
                      <LogOut className="size-3.5" strokeWidth={2.4} aria-hidden />
                      {JOINT_LEAVE_COPY.action}
                    </button>
                  )}
                </section>

                <JointSettlementCard
                  settlement={settlement}
                  masked={isMasked}
                  people={people}
                  monthLabel={monthLabel}
                  onSettle={() => setShowSettlementModal(true)}
                  onSettleTransfer={handleSettleTransfer}
                />
              </div>

              {/* ── KANAN (7/12): Cerita Kita ──────────────────────────────── */}
              <section className="lg:col-span-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-tight text-forest">
                    <Heart className="size-4 text-hud-terracotta" strokeWidth={2.3} />
                    Cerita Kita
                  </h2>
                  <span className="shrink-0 text-[11.5px] font-medium text-forest-muted">
                    {feed.length} catatan
                  </span>
                </div>

                {isEmptyJoint ? (
                  remoteStale ? (
                    /* GAGAL MEMUAT ≠ KOSONG. Dulu layar tetap berkata "dompet
                       masih kosong" walau bacaan server gagal — klaim palsu
                       yang bikin user mengira datanya hilang (akun kedua: 0
                       catatan padahal server berisi 3). */
                    <div data-catetind-empty className="mt-4 rounded-[1.75rem] border-2 border-dashed border-hud-sage/45 bg-cream px-6 py-10 text-center">
                      <span aria-hidden className="text-[30px]">
                        📡
                      </span>
                      <h3 className="mt-3 font-display text-[18px] font-semibold tracking-tight text-forest">
                        Data belum kebaca dari server
                      </h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-forest-muted">
                        Bukan berarti dompet kamu kosong — sambungannya yang lagi goyang. Coba
                        muat ulang dulu ya.
                      </p>
                      <div className="mt-5 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setRemoteStale(false)
                            void syncFromServer()
                          }}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-[14.5px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
                        >
                          Coba muat ulang
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* SECTION 12: pasangan sudah gabung tapi belum ada transaksi */
                    <div data-catetind-empty className="mt-4 rounded-[1.75rem] border-2 border-dashed border-hud-sage/45 bg-cream px-6 py-10 text-center">
                      <span aria-hidden className="text-[30px]">
                        🧩
                      </span>
                      <h3 className="mt-3 font-display text-[18px] font-semibold tracking-tight text-forest">
                        Dompet bersama kalian masih kosong
                      </h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-forest-muted">
                        Siapa yang catat duluan? Ayo mulai! 💚
                      </p>
                      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          onClick={openAddSheet}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-[14.5px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
                        >
                          Aku duluan! ✋
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info(`Notifikasi dikirim ke ${partner.name}! 📩`)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-cream px-5 text-[14.5px] font-medium text-forest ring-1 ring-soil/16 transition-colors hover:bg-cream active:scale-[0.99]"
                        >
                          Tantang {partner.name}! 💬
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* AREA GULIR SENDIRI — daftar catatan bersama bisa panjang
                     (ratusan baris), dan dulu ia memanjangkan SELURUH halaman
                     ke bawah sehingga kartu settlement & tombol lain hilang dari
                     layar. Sekarang daftarnya punya tinggi maksimum sendiri:
                     mobile ±60vh, desktop mengikuti tinggi layar (kartu kiri
                     `sticky`, jadi keduanya tetap sejajar). Header hari di dalam
                     daftar ikut sticky supaya tanggal tidak hilang saat digulir.
                     `data-lenis-prevent` memisahkan gulirnya dari smooth-scroll
                     halaman. */
                  <div
                    data-lenis-prevent
                    className="mt-1 max-h-[60vh] overflow-y-auto overscroll-contain pr-1 lg:max-h-[calc(100vh-19rem)]"
                  >
                    <JointTimeline
                      transactions={feed}
                      masked={isMasked}
                      me={me}
                      partner={partner}
                      people={people}
                      partnerTyping={partnerTyping}
                      onOpenEntry={(tx) => {
                        setDetailTxSnapshot(tx)
                        setDetailTxId(tx.id)
                      }}
                      canDelete={(tx) => jointDeleteState(joint, tx) === 'allowed'}
                      onRequestDelete={setPendingDeleteTx}
                    />
                  </div>
                )}
              </section>
            </div>
          </>
        ) : entryMode === 'join' ? (
          /* ── SECTION 8B: GABUNG PAKAI KODE (sisi B) ──────────────────────
             Sebelum ini tidak ada tempat memasukkan kode di dalam aplikasi:
             orang yang diundang harus membuka tautan `/join/<kode>`. Form ini
             memanggil RPC `catetind_accept_invite` (menulis `joint_members`),
             lalu store membaca ulang kantong dari server — jadi begitu berhasil,
             blok di atas (kantong aktif) yang dirender, bukan layar ini. */
          <JointJoinCodeForm
            onBack={() => setEntryMode('choice')}
            onJoined={() => setEntryMode('choice')}
          />
        ) : entryMode === 'create' ? (
          /* ── SECTION 8: pembuat undangan (belum ada anggota lain) ─────────
             Wujud ini berarti "belum ada pasangan SUNGGUHAN", bukan "pasangan
             belum menekan tombol simulasi".

             KUNCI PAKET HANYA DI SINI: membuat dompet = fitur berbayar. Akun
             gratis tetap bisa memilih "Gabung Pakai Kode" di layar sebelumnya
             dan — setelah diterima — memakai seluruh fitur tanpa membeli. */
          canCreateWallet ? (
            <JointInviteFlow
              defaultWalletName={wallet.name}
              onBack={() => setEntryMode('choice')}
              onCreated={(name) => {
                /* KANTONG BARU = nama baru + BUKU BESAR KOSONG (paket 61.3).
                   `createJointPocket()` menandai seluruh catatan contoh terhapus,
                   jadi kantong yang baru dibuat tidak tampil berisi "Groceries
                   Superindo" — satu-satunya cara klaim "baru dibuat" bisa
                   dipercaya. Ditulis ke store (persist), bukan ke state halaman. */
                if (!createJointPocket(name)) return
                setShowInviteModal(true)
              }}
            />
          ) : (
            <div className="mt-6 w-full max-w-[560px]">
              <LockedFeatureNote capability="joint-wallet" />
              <button
                type="button"
                onClick={() => setEntryMode('choice')}
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-cream text-[14px] font-medium text-forest ring-1 ring-soil/14 transition-colors hover:bg-sage/40 active:scale-[0.99]"
              >
                Kembali ke pilihan
              </button>
            </div>
          )
        ) : soloOwnerWithHistory ? (
          /* Pemilik sendirian setelah anggota terakhir keluar — dompet & riwayat
             tetap miliknya. Dua jalan yang masuk akal: undang lagi, atau hapus. */
          <div className="mt-6 w-full max-w-[560px] rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-muted">
              {JOINT_SOLO_OWNER_COPY.eyebrow}
            </p>
            <h1 className="mt-1.5 font-display text-[22px] font-semibold tracking-tight text-forest">
              {wallet.name}
            </h1>
            <p className="mt-1 text-[13px] font-medium text-forest">{JOINT_SOLO_OWNER_COPY.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-forest-muted">
              {JOINT_SOLO_OWNER_COPY.body}
            </p>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-forest text-[14px] font-medium text-mint transition-colors hover:bg-forest-soft active:scale-[0.99]"
            >
              {JOINT_SOLO_OWNER_COPY.invite}
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteWallet(true)}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-plum/10 text-[14px] font-medium text-plum ring-1 ring-plum/20 transition-colors hover:bg-plum/20 active:scale-[0.99]"
            >
              {JOINT_SOLO_OWNER_COPY.remove}
            </button>
          </div>
        ) : (
          /* ── SECTION 8A: DUA PILIHAN ──────────────────────────────────────
             Yang mengajak membuat dompet; yang diundang memasukkan kode. Dulu
             hanya pilihan pertama yang ada, sehingga akun kedua tidak punya
             jalan masuk sama sekali kalau undangannya berupa kode. */
          <JointEntryChoice
            onCreate={() => setEntryMode('create')}
            onJoin={() => setEntryMode('join')}
          />
        )}
      </div>
      {/* ── SECTION 9: FAB (+) halaman ini — Catat transaksi bareng ────────
          Di mobile tombol ini MENGGANTIKAN FAB bottom-nav (nav menyembunyikan
          FAB-nya saat berada di /joint) supaya tetap hanya ada SATU tombol
          tambah, tapi isinya form khas dompet bersama.

          POSISI = SLOT TENGAH NAV (paket 101): nav bawah kini benar-benar
          tampil di /joint (dulu hilang karena `/joint` salah cocok dengan
          `/join`). FAB ini duduk di placeholder `size-14` milik nav — jadi
          geometrinya DISAMAKAN dengan FAB "Catat" halaman lain: `bottom-10`
          membuat tepi bawahnya 40px dari layar, sama seperti FAB nav di
          `/app` (diukur di viewport 390×844: y=748, protrudes 12px di atas
          nav). Sebelumnya `bottom-8` membuatnya terlihat seperti tombol yatim
          yang mengambang rendah.

          Z-INDEX (revisi 11 Nov 2026): dulu `z-50`, sedangkan nav bawah
          `z-[60]` — akibatnya nav MENUTUPI tombol ini dan yang terlihat hanya
          busur hijaunya yang mengintip di atas nav ("tombol tambah ada di
          belakang, ketutupan"). Sekarang FAB berada di `z-[65]`: di atas nav,
          tetapi tetap di bawah bottom sheet (`z-[70]`) dan dialog (`z-[80]`)
          yang boleh menimpanya. */}
      {partner && (
        <button
          type="button"
          onClick={openAddSheet}
          aria-label="Catat transaksi bareng"
          style={{ marginBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
          className={cn(
            'fixed bottom-10 left-1/2 z-[65] flex size-14 -translate-x-1/2 items-center justify-center rounded-full',
            'bg-forest text-mint shadow-[0_18px_36px_-14px_rgba(0,0,0,0.65)] ring-1 ring-forest/25',
            'transition-transform duration-150 hover:scale-105 active:scale-95',
            'lg:bottom-8 lg:left-auto lg:right-24 lg:h-12 lg:w-auto lg:-translate-x-0 lg:gap-2 lg:px-5 lg:text-[14px] lg:font-medium',
          )}
        >
          <Plus className="size-6 lg:size-4" strokeWidth={2.4} />
          <span className="hidden lg:inline">Catat Bareng</span>
        </button>
      )}

      {/* ── Sheet & modal (mobile: bottom sheet · desktop: dialog) ─────────
          Semuanya butuh DUA peserta sungguhan, jadi hanya dirender saat
          `partner` ada. Sebelumnya semuanya dirender dengan identitas contoh. */}
      {partner && (
        <>
          {/* 9 — form transaksi bareng: engine standar + pemilih pembagian.
              "Sumber Dana" (dompet pribadi) DIHAPUS: kantong bersama murni buku
              besar — mencatat di sini tidak menggeser saldo dompet mana pun. */}
          <JointAddSheet
            open={showAddSheet}
            onClose={handleAddSheetClose}
            walletName={wallet.name}
            splitDraft={draftSplit}
            paidBy={paidBy}
            onDraftChange={handleDraftChange}
            resumeDraft={addDraft}
            onOpenSplit={openSplitForNew}
            onPaidByChange={setPaidBy}
            onSubmitted={handleAddTransaction}
            people={people}
            memberAccess={memberAccess}
          />

          {/* 6 — Split Bill: satu instance per target (key) supaya formnya fresh.
              "kembali" (←) dan "tutup" (X) sama-sama mengembalikan user ke form
              Catat Bareng dengan isian yang SAMA; untuk catatan lama, ← kembali
              ke detail catatannya. */}
          <JointSplitSheet
            key={splitTarget ?? 'none'}
            open={showSplitSheet}
            onClose={closeSplitSheet}
            onBack={backFromSplit}
            total={splitTotal}
            initial={splitInitial}
            onSave={handleSaveSplit}
            people={people}
            memberAccess={memberAccess}
          />

          {/* 6b — Detail catatan: dibuka dari SATU tap pada baris Cerita Kita.
              Sheet ditutup dulu sebelum Split Sheet dibuka (pola yang sama dengan
              form tambah → split) supaya dua Drawer tidak hidup bersamaan. */}
          <JointEntrySheet
            open={detailTx !== null}
            tx={detailTxView}
            masked={isMasked}
            people={people}
            onClose={() => setDetailTxId(null)}
            onOpenSplit={(tx) => {
              setDetailTxId(null)
              openSplitFor(tx)
            }}
            onChangePaidBy={handleChangePaidBy}
            deleteState={detailTxView ? jointDeleteState(joint, detailTxView) : undefined}
            onDelete={setPendingDeleteTx}
          />

          {/* 7 — Settlement modal (satu-satunya aksi transfer, dibuka dari kartu settle) */}
          <JointSettlementModal
            open={showSettlementModal}
            onClose={() => setShowSettlementModal(false)}
            settlement={settlement}
            masked={isMasked}
            onSettle={handleSettle}
            carryOverRecord={carryOverRecord}
            settledRecord={settlementRecordFor(joint, monthKey)}
            today={today}
            people={people}
            monthLabel={monthLabel}
            memberAccess={memberAccess}
            onUndoSettle={() => {
              const undone = undoSettlement(monthKey)
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

          {/* 8C — selebrasi anggota baru bergabung */}
          <JointJoinedCelebration
            open={showCelebration}
            onStart={finishCelebration}
            me={me}
            partner={partner}
          />
        </>
      )}

      {/* 8B — kode undangan: SENGAJA di luar blok `partner &&`.
          Modal ini justru dibuka saat pasangan BELUM ada (tepat setelah user
          menekan "Buat Dompet & Ajak Pasangan"). Sebelumnya ia berada di dalam
          `partner &&`, jadi `setShowInviteModal(true)` berhasil tetapi modalnya
          tidak pernah dirender — pemilik produk melaporkannya sebagai "klik
          tombolnya, nggak terjadi apa-apa". */}
      <JointInviteCodeModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        walletId={wallet.id}
        walletName={wallet.name}
        me={me}
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
            cancelLabel={JOINT_DELETE_COPY.cancel}
            confirmLabel={JOINT_DELETE_COPY.confirm}
            onCancel={() => setPendingDeleteTx(null)}
            onConfirm={confirmDeleteJointTx}
          />
        )}
      </AnimatePresence>

      {/* HAPUS DOMPET BERSAMA — konfirmasi kanon yang sama dengan hapus catatan
          (bukan `window.confirm`), karena aksinya merusak untuk SEMUA anggota. */}
      <AnimatePresence>
        {pendingDeleteWallet && (
          <ConfirmDialog
            titleId="hapus-dompet-bersama-judul"
            overlayLabel={JOINT_WALLET_DELETE_COPY.overlay}
            title={JOINT_WALLET_DELETE_COPY.title}
            cancelLabel={JOINT_WALLET_DELETE_COPY.cancel}
            confirmLabel={JOINT_WALLET_DELETE_COPY.confirm}
            onCancel={() => setPendingDeleteWallet(false)}
            onConfirm={confirmDeleteWallet}
          />
        )}
      </AnimatePresence>

      {/* KELUAR MANDIRI (anggota bukan pemilik). Keanggotaan dilepas di server
          dan penyimpanan dompet di perangkat ini dibersihkan. */}
      <AnimatePresence>
        {pendingLeave && (
          <ConfirmDialog
            titleId="keluar-dompet-bersama-judul"
            overlayLabel={JOINT_LEAVE_COPY.overlay}
            title={JOINT_LEAVE_COPY.title}
            cancelLabel={JOINT_LEAVE_COPY.cancel}
            confirmLabel={JOINT_LEAVE_COPY.confirm}
            onCancel={() => setPendingLeave(false)}
            onConfirm={confirmLeavePocket}
          />
        )}
      </AnimatePresence>

      {/* KELUARKAN ANGGOTA (khusus pemilik). */}
      <AnimatePresence>
        {pendingRemoveMember && (
          <ConfirmDialog
            titleId="keluarkan-anggota-judul"
            overlayLabel={JOINT_REMOVE_MEMBER_COPY.overlay}
            title={JOINT_REMOVE_MEMBER_COPY.title(pendingRemoveMember.name)}
            cancelLabel={JOINT_REMOVE_MEMBER_COPY.cancel}
            confirmLabel={JOINT_REMOVE_MEMBER_COPY.confirm}
            onCancel={() => setPendingRemoveMember(null)}
            onConfirm={confirmRemoveMember}
          />
        )}
      </AnimatePresence>
    </ScreenShell>
  )
}

/** Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) — satu bentuk
 *  tombol mata yang sama di semua halaman. Lihat <GlobalPrivacyToggle />. */
