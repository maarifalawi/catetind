'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeftRight,
  ChevronRight,
  CircleDollarSign,
  Lock,
  MoreHorizontal,
  Plus,
  Settings2,
  Wallet as WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { SyncBalanceModal } from './sync-balance-modal'
import { AddWalletSheet } from './add-wallet-sheet'
import { TransferSheet } from './transfer-sheet'
import { usePrivacy } from './privacy-provider'
import {
  ContactlessIcon,
  MaskedAmount,
  WALLET_TYPE_LABEL,
  WalletArtDefs,
  WalletFace,
  WalletTypeMark,
} from './wallet-card-face'
import { useCountUp } from '@/hooks/use-count-up'
import { cn } from '@/lib/utils'
import { AMOUNT_LABEL, AMOUNT_LG, AMOUNT_XL } from '@/lib/typography'
import {
  WALLET_BRAND_OPTIONS,
  createWalletAccount,
  formatIDR,
  INITIAL_WALLET_ACCOUNTS,
  nextWalletId,
  walletAccountsTotal,
  type WalletAccount,
  type WalletDraft,
} from '@/lib/wallets'
import { WALLET_CARD_MENU_COPY, WALLET_QUICK_ACTION_COPY } from '@/lib/data/wallet-detail'
import { MONEY_TONE, amountSign, isMoneyMovement, maskMoney } from '@/lib/data/history'
import {
  ADD_WALLET_SHEET_COPY,
  TRANSFER_SHEET_COPY,
  WALLET_NEW_CARD_COPY,
  WALLET_TRANSFER_LOG_COPY,
  buildTransferRecord,
  nextTransferId,
  type WalletTransferRecord,
} from '@/lib/data/add-wallet'

/* ── Dompet & Akun (/wallet) — versi DESKTOP-FIRST ────────────────────────────
   Halaman kelola dompet ala neo-banking. Yang penting dibaca sebelum mengubah:

   1. HEADER: judul halaman (dengan penanda halaman di kiri, sama seperti
      halaman Kekayaan/Tagihan) + SATU tombol privasi di kanan. Tombol itu
      menulis ke PrivacyProvider — state GLOBAL app — jadi sekali klik, nominal
      hero, tile likuiditas, DAN saldo semua kartu di bawah ikut tersensor
      (dulu tombolnya nempel di dalam kartu hero, jadi terkesan cuma menyensor
      kartu itu). Ikon "tambah dompet" kecil di pojok kanan DIHAPUS karena
      menduplikasi section "Tambah Dompet Cepat".
   2. LAYOUT: full-width, tanpa container sempit di tengah. Konten dipecah jadi
      grid 12 kolom — persis ritme Dashboard (home-screen.tsx) — sehingga di
      desktop halaman ini terasa bagian dari aplikasi, bukan mobile yang
      ditempel lebar.
   3. Hero gelap "TOTAL SALDO" (bukan "Total Kekayaan": Net Worth = Kas +
      Investasi + Aset − Hutang, dan itu dihitung di halaman Kekayaan & Hutang)
      dengan nominal count-up, panel kaca "Komposisi" (bar segmen TANPA celah +
      legenda pill), dan dua tile likuiditas (Uang Cair bertinta mint vs Aset
      Ditahan netral). Tekstur batik kawung dipakai tipis sebagai lapisan premium.
   4. "Tambah Dompet Cepat" — REKOMENDASI DINAMIS: brand yang sudah dipakai
      user disaring keluar dari pool kandidat, jadi user yang sudah punya BCA
      tidak akan pernah ditawari BCA lagi (lihat `suggestedBrands`).
   5. Grid kartu dompet — muka kartu MENGIKUTI benda aslinya & resepnya kini
      tinggal di wallet-card-face.tsx (dipakai bersama halaman detail dompet):
        · Bank     → chip EMV + ikon contactless + nomor rekening tersamarkan
        · E-Wallet → monogram brand saja (tanpa chip/contactless/nomor kartu)
        · Tunai    → ilustrasi tumpukan uang kertas (tanpa chip/nomor seri)
   6. Quick action per kartu — popover menu (Buka detail / Pindah Saldo /
      Sesuaikan Saldo) dan Vaul drawer Smart Sync untuk mengoreksi saldo ke angka
      asli yang user baca SENDIRI di m-banking-nya (manual, tanpa open-banking).
      "Buka detail" + lapisan Link di muka kartu membawa user ke /wallet/[id]. */


/**
 * berapa saran yang ditampilkan. 3 brand + 1 slot dashed "Lainnya" = 4 kartu,
 * yang di desktop jatuh rapi sebagai grid 2×2 di rail kanan.
 */
/* Pool brand untuk rail "Tambah Dompet Cepat" TIDAK lagi didefinisikan di file
   ini: daftarnya (nama + warna monogram + bayangan hover) tinggal di
   `WALLET_BRAND_OPTIONS` (lib/wallets.ts) — SATU sumber yang juga dipakai
   pemilih brand di modal Tambah Dompet. Dulu file ini menyimpan salinannya
   sendiri, jadi brand di rail bisa berbeda warna dari brand di modal. */
const SUGGESTION_LIMIT = 3

/** aset yang ditahan/dikunci — mock statis (Rp 0) */
const HELD_ASSETS = 0

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function WalletScreen() {
  const router = useRouter()
  /* ── 1. DATA & STATE ────────────────────────────────────────────────────── */
  /* Privasi = state GLOBAL app (PrivacyProvider), bukan state lokal halaman:
     satu tombol mata menyensor nominal hero, tile likuiditas, DAN saldo semua
     kartu sekaligus — dan tetap sinkron dengan tombol mata di Dashboard. */
  const { masked } = usePrivacy()
  /* Daftar dompet awal dibaca dari SATU sumber (lib/wallets.ts) — bukan array
     lokal lagi. Sebabnya audit fintech #1: saldo di halaman ini adalah "Kas
     Likuid" yang WAJIB ikut dijumlahkan ke sisi Aset pada Net Worth di halaman
     Kekayaan & Hutang (`walletAccountsTotal()`). Kalau angkanya disalin-tempel
     di dua tempat, Net Worth bisa diam-diam salah. */
  const [wallets, setWallets] = useState<WalletAccount[]>(INITIAL_WALLET_ACCOUNTS)
  /** dompet yang sedang dibuka di Smart Sync modal (null = modal tertutup) */
  const [syncTarget, setSyncTarget] = useState<WalletAccount | null>(null)
  /** id dompet yang dropdown "More Options"-nya sedang terbuka */
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  /** modal Tambah Dompet + brand yang dibawa rail ghost card (null = form bersih) */
  const [addOpen, setAddOpen] = useState(false)
  const [addBrand, setAddBrand] = useState<string | null>(null)
  /** dompet sumber yang saldonya sedang dipindah (null = sheet tertutup) */
  const [transferSource, setTransferSource] = useState<WalletAccount | null>(null)
  /** catatan pindah dana sesi ini — bentuknya HistoryTransaction (type 'transfer') */
  const [transfers, setTransfers] = useState<WalletTransferRecord[]>([])
  /**
   * Id dompet yang berasal dari data DEMO (lib/wallets.ts). Dipakai untuk dua
   * hal yang berkaitan dengan halaman detail: dompet yang dibuat user cuma hidup
   * di state halaman ini, sedangkan /wallet/[id] dibaca server dari data demo —
   * jadi kartunya tidak boleh diberi tautan ke halaman yang pasti "tidak
   * ditemukan" hanya supaya terlihat seragam.
   */
  const seededIds = useMemo(
    () => new Set(INITIAL_WALLET_ACCOUNTS.map((account) => account.id)),
    [],
  )

  /** Total Saldo = jumlah saldo seluruh dompet. Halaman ini soal KAS likuid —
      "Total Kekayaan" (Net Worth) dihitung di halaman Kekayaan & Hutang.
      Angkanya dibaca dari `walletAccountsTotal()` (lib/wallets.ts) — helper yang
      SAMA dengan halaman Kekayaan & Hutang, jadi dompet yang baru ditambahkan
      user mustahil "hilang" dari Net Worth. */
  const total = useMemo(() => walletAccountsTotal(wallets), [wallets])
  /** angka yang dianimasikan (count-up). Nilai awal = total, jadi HTML hasil
      render server & render pertama client tetap identik (tanpa hydration
      mismatch) — animasi hanya jalan saat saldonya benar-benar berubah. */
  const counted = useCountUp(total)
  /**
   * Porsi tiap dompet terhadap Total Saldo (%) — SATU sumber angka untuk legenda
   * hero, bar komposisi, label "% dari total", DAN lebar bar di kaki kartu.
   *
   * Dibulatkan dengan metode sisa-terbesar (largest remainder) supaya jumlah
   * semua porsi TEPAT 100. Kalau tiap dompet dibulatkan sendiri-sendiri,
   * 78 + 19 + 3 bisa jadi 99/101 dan angka di layar jadi tidak jujur. Lebar bar
   * selalu dibaca dari angka yang sama, jadi tidak mungkin ada garis berlabel
   * "3%" yang digambar sepanjang 20%.
   */
  const shares = useMemo(() => {
    if (total <= 0) return wallets.map(() => 0)
    const exact = wallets.map((w) => (w.balance / total) * 100)
    const out = exact.map((value) => Math.floor(value))
    let remainder = 100 - out.reduce((sum, value) => sum + value, 0)
    const byFraction = exact
      .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
      .sort((a, b) => b.fraction - a.fraction)
    for (const { i } of byFraction) {
      if (remainder <= 0) break
      out[i] += 1
      remainder -= 1
    }
    return out
  }, [wallets, total])

  /**
   * Rekomendasi "Tambah Dompet Cepat" — DINAMIS, bukan daftar hardcoded:
   * brand yang sudah ada di `wallets` disaring keluar dulu (case-insensitive),
   * baru dijatah `SUGGESTION_LIMIT`. Jadi user yang sudah punya dompet BCA
   * tidak akan ditawari BCA lagi — yang muncul justru bank/e-wallet yang BELUM
   * ia pakai.
   */
  const suggestedBrands = useMemo(() => {
    const owned = new Set(wallets.map((wallet) => wallet.name.toLowerCase()))
    return WALLET_BRAND_OPTIONS.filter((brand) => !owned.has(brand.name.toLowerCase())).slice(
      0,
      SUGGESTION_LIMIT,
    )
  }, [wallets])

  /* ── 2. TAMBAH DOMPET — dari ghost card rail & tombol "Lainnya" ───────────
     Rail "Tambah Dompet Cepat" adalah JALAN MASUK utama menambah dompet, jadi
     menekan brand di sana membuka modal dengan brand + jenis akun SUDAH terisi:
     itulah janji "ghost card" (satu ketukan sudah terasa kena). "Lainnya" membuka
     modal yang sama dalam keadaan bersih. */
  function openAddWallet(brand: string | null) {
    setAddBrand(brand)
    setAddOpen(true)
  }

  /* Warna dompet baru TIDAK datang dari form: indeksnya menentukan resep palet
     (siklus Evergreen → Leaf → Olive, lihat `createWalletAccount`), jadi kartu
     baru mustahil keluar dari sistem warna yang sudah ada. */
  function handleAddWalletSave(draft: WalletDraft) {
    const account: WalletAccount = {
      ...createWalletAccount(draft, wallets.length),
      id: nextWalletId(wallets),
    }
    setWallets((prev) => [...prev, account])
    setAddOpen(false) // tutup seketika; animasi keluar jalan di background
    toast.success(ADD_WALLET_SHEET_COPY.toastTitle, {
      description: ADD_WALLET_SHEET_COPY.toastDescription(account.name),
    })
  }

  /* ── 4. POPOVER: tutup saat klik di luar / Escape ───────────────────────── */
  useEffect(() => {
    if (openMenuId === null) return
    const onPointerDown = (event: PointerEvent) => {
      const el = event.target as HTMLElement | null
      // trigger & menu-nya sendiri bertanda data-wallet-menu-root → jangan ditutup
      if (el?.closest('[data-wallet-menu-root]')) return
      setOpenMenuId(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openMenuId])

  /* ── 5. SMART SYNC: koreksi saldo otomatis ──────────────────────────────── */
  function handleSyncConfirm(newBalance: number) {
    if (!syncTarget) return
    const id = syncTarget.id
    setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, balance: newBalance } : w)))
    setSyncTarget(null) // tutup modal seketika (animasi tutup jalan di background)
    toast.success('Saldo dikoreksi. Pengeluaran Tak Tercatat ditambahkan. 🪄')
  }

  /* ── 6. PINDAH SALDO antar dompet sendiri ────────────────────────────────
     Satu tindakan mengubah TIGA hal: saldo dompet sumber, saldo dompet tujuan,
     dan satu CATATAN bertipe `transfer`. Bentuk catatannya memakai
     `HistoryTransaction` yang sama dengan halaman Riwayat, jadi chip "pindah
     dana" (`isMoneyMovement()`) di sana punya makna yang sama persis — tidak ada
     tipe data kedua yang bisa melenceng diam-diam. */
  function openTransfer(wallet: WalletAccount) {
    setTransferSource(wallet)
  }

  function handleTransferConfirm(destinationId: number, amount: number, note?: string) {
    const source = transferSource
    const destination = wallets.find((wallet) => wallet.id === destinationId)
    if (!source || !destination || amount <= 0) return

    setWallets((prev) =>
      prev.map((wallet) => {
        if (wallet.id === source.id) return { ...wallet, balance: wallet.balance - amount }
        if (wallet.id === destination.id) return { ...wallet, balance: wallet.balance + amount }
        return wallet
      }),
    )
    setTransfers((prev) => [
      buildTransferRecord({
        id: nextTransferId(prev),
        amount,
        fromName: source.name,
        toName: destination.name,
        time: clockLabel(),
        note,
      }),
      ...prev,
    ])
    setTransferSource(null)
    toast.success(TRANSFER_SHEET_COPY.toastTitle, {
      description: TRANSFER_SHEET_COPY.toastDescription(amount, source.name, destination.name),
    })
  }

  /* ── 7. BUKA DETAIL DOMPET (/wallet/[id]) ────────────────────────────────
     Kartu dompet sekarang punya halaman sendiri: saldo + arus 30 hari + daftar
     catatan dompet itu. Dua pintu masuknya: muka kartu (lapisan Link tak
     terlihat di dalam kartu) dan item pertama popover titik tiga ini — supaya
     user yang tidak pernah mencoba menekan kartunya tetap menemukan jalannya. */
  function handleOpenDetail(wallet: WalletAccount) {
    setOpenMenuId(null)
    router.push(`/wallet/${wallet.id}`)
  }

  return (
    <ScreenShell>
      {/* motif batik muka kartu — definisinya pindah ke wallet-card-face.tsx
          supaya halaman Dompet Detail memakai motif yang SAMA PERSIS, bukan
          salinan yang cepat atau lambat berbeda */}
      <WalletArtDefs />
      {/* LAYAR PENUH — sengaja TIDAK dibungkus container sempit di tengah.
          Konten dipecah jadi grid 12 kolom dengan ritme yang sama seperti
          Dashboard (home-screen.tsx): hero 8 kolom + rail "Tambah Dompet Cepat"
          4 kolom, lalu grid kartu dompet selebar layar. */}
      <div className="w-full">
        {/* ── HEADER: judul halaman + toggle privasi GLOBAL ─────────────────
            Ikon "tambah dompet" kecil di pojok kanan DIHAPUS (redundan dengan
            section raksasa "Tambah Dompet Cepat" di bawah) dan posisinya diisi
            tombol mata ini. Karena tombolnya membaca state privasi global, satu
            klik menyensor SELURUH halaman — hero, tile likuiditas, dan saldo
            tiap kartu dompet. */}
        <header className="sticky top-2 z-30 flex items-center justify-between gap-3 rounded-[1.5rem] bg-cream/90 px-4 py-3 shadow-[0_18px_40px_-32px_rgba(69,89,78,0.65)] ring-1 ring-soil/10 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            {/* penanda halaman — tile sage→mint (palet brand), bukan kotak putih polos */}
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest shadow-[0_12px_26px_-16px_rgba(69,89,78,0.75)] ring-1 ring-forest/10">
              <WalletIcon className="size-[18px]" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[19px] font-black tracking-tight text-ink lg:text-[22px]">
                Dompet &amp; Akun
              </h1>
              <p className="truncate text-[11px] text-ink/45">
                Semua saldo kamu dalam satu tempat.
              </p>
            </div>
          </div>
          <GlobalPrivacyToggle />
        </header>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:mt-6 xl:grid-cols-12 xl:gap-6">
          {/* ── HERO (8/12): TOTAL SALDO + KOMPOSISI + LIKUIDITAS ─────────── */}
          <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-forest-soft via-forest to-[#1f2823] p-5 text-cream shadow-[0_30px_70px_-30px_rgba(69,89,78,0.8)] sm:p-6 xl:col-span-8 xl:p-7">
            {/* aurora mint kanan atas (warna brand) + kabut sage/amber hangat —
                tetap di palet CatetInd supaya hero nyambung dengan kartu dompet */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-mint/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 top-1/3 size-64 rounded-full bg-[#45594e]/45 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 right-4 size-52 rounded-full bg-hud-amber/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-28 -left-20 size-64 rounded-full bg-mint-soft/15 blur-3xl"
            />
            {/* motif batik kawung sebagai tekstur premium — memudar dari kiri atas
                supaya nominal di kanan tetap bersih (pattern-nya sama dengan kartu) */}
            <svg
              aria-hidden
              className="absolute inset-0 h-full w-full [mask-image:radial-gradient(120%_120%_at_14%_-12%,black_6%,transparent_68%)]"
            >
              <rect width="100%" height="100%" fill="url(#wallet-art-kawung)" />
            </svg>
            {/* edge light + tekstur titik supaya muka kartu tidak terasa flat */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[2.25rem] ring-1 ring-inset ring-cream/10"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}
            />
            {/* hairline bercahaya di bibir atas — sama seperti kartu dompet, biar
                hero dan grid kartu terasa satu keluarga */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cream/45 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[2.25rem] opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1.2px)] [background-size:10px_10px]"
            />

            {/* di layar lebar hero dipecah dua kolom: nominal+konteks di kiri,
                panel komposisi di kanan — bukan tumpukan panjang yang direntangkan */}
            <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-start">
              {/* KIRI: label, nominal, konteks, lalu likuiditas */}
              <div>
                <span
                  className={cn(
                    AMOUNT_LABEL,
                    'inline-flex items-center gap-2 rounded-full bg-cream/[0.08] px-2.5 py-1.5 text-cream/55 ring-1 ring-inset ring-cream/10',
                  )}
                >
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint/70 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
                  </span>
                  Total Saldo
                </span>

                {/* nominal raksasa — count-up, lalu blur ke titik sensor saat dimask.
                    Tipografinya memakai token yang sama dengan kartu saldo Dashboard. */}
                <div className="mt-4">
                  <MaskedAmount
                    value={formatIDR(counted)}
                    masked={masked}
                    className={cn(AMOUNT_XL, 'text-cream')}
                  />
                </div>

                {/* konteks angka. SENGAJA bukan "tersinkron m-banking": CatetInd
                    100% berbasis input manual/AI + OCR, tanpa open-banking. */}
                <p className="mt-3 text-[11.5px] font-medium text-cream/50">
                  Total dari {wallets.length} dompet aktif
                </p>

                {/* likuiditas: uang cair vs aset ditahan */}
                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  <LiquidityPill
                    icon={CircleDollarSign}
                    label="Uang Cair"
                    value={formatIDR(total)}
                    masked={masked}
                    tone="liquid"
                  />
                  <LiquidityPill
                    icon={Lock}
                    label="Aset Ditahan"
                    value={formatIDR(HELD_ASSETS)}
                    masked={masked}
                    tone="held"
                  />
                </div>
              </div>

              {/* KANAN: komposisi saldo per dompet — panel kaca, bar, lalu legenda pill */}
              <div className="rounded-[1.4rem] bg-cream/[0.07] p-3.5 ring-1 ring-inset ring-cream/10">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream/45">
                    Komposisi
                  </span>
                  <span className="text-[10.5px] font-semibold text-cream/40 tabular-nums">
                    {wallets.length} akun
                  </span>
                </div>

                {/* bar komposisi: TANPA gap & tanpa celah — bar yang mewakili 100%
                    tidak boleh punya celah gelap, karena itu terbaca seolah ada
                    dana yang belum teralokasi. Lebarnya dibaca dari `shares`. */}
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full">
                  {wallets.map((wallet, i) => (
                    <motion.span
                      key={wallet.id}
                      className={cn('h-full', wallet.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${shares[i]}%` }}
                      transition={{ duration: 0.8, delay: 0.15 + i * 0.07, ease: EASE }}
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {wallets.map((wallet, i) => (
                    <span
                      key={wallet.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-cream/[0.06] py-1 pl-1.5 pr-2.5 text-[11px] ring-1 ring-inset ring-cream/[0.08]"
                    >
                      <span
                        className={cn('size-2 rounded-full ring-1 ring-cream/25', wallet.color)}
                      />
                      <span className="font-medium text-cream/80">{wallet.name}</span>
                      <span className="font-semibold tabular-nums text-cream/50">
                        {shares[i]}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
        </section>

        {/* ── RAIL "TAMBAH DOMPET CEPAT" (4/12) ─────────────────────────────
            Rekomendasinya DINAMIS: brand yang sudah dimiliki user disaring keluar
            dari pool, jadi sistem tidak mungkin lagi menawarkan BCA ke user yang
            sudah punya dompet BCA. */}
        <section className="flex flex-col rounded-[1.75rem] bg-cream p-4 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/10 sm:p-5 xl:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
                <Plus className="size-3.5" strokeWidth={2.8} />
              </span>
              <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                Tambah Dompet Cepat
              </h2>
            </div>
            <span className="rounded-full bg-sage px-2.5 py-0.5 text-[10.5px] font-bold text-forest ring-1 ring-forest/10">
              1 ketukan
            </span>
          </div>
          <p className="mt-2 text-[11.5px] text-ink/45">
            Hanya brand yang belum ada di daftar dompetmu.
          </p>
          {suggestedBrands.length === 0 && (
            <p className="mt-3 rounded-2xl bg-cream px-3 py-2 text-[11.5px] text-ink/55">
              Semua brand populer sudah kamu pakai — tambah dompet lain lewat “Lainnya”.
            </p>
          )}

          {/* deret kartu brand: solid + ring (bukan dashed) supaya terasa seperti
              tombol yang benar-benar bisa ditekan.
              · mobile  → deret gulir horizontal (snap), jempol-friendly
              · desktop → grid 2×2 rapi di dalam rail 4 kolom (tidak ada gulir) */}
          <div
            data-lenis-prevent-horizontal
            className="hide-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 pb-3 pt-1 xl:grid xl:grid-cols-2 xl:overflow-visible xl:px-0 xl:pb-1"
          >
            {suggestedBrands.map((brand, i) => (
              <motion.button
                key={brand.name}
                type="button"
                onClick={() => openAddWallet(brand.name)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.04 * i, ease: EASE }}
                className={cn(
                  'group flex w-[104px] shrink-0 snap-start flex-col items-center gap-2.5 rounded-[1.4rem] bg-cream p-3.5 ring-1 ring-soil/10 shadow-[0_14px_30px_-24px_rgba(69,89,78,0.5)] transition-all duration-300 hover:-translate-y-1 active:scale-95 motion-reduce:transition-none xl:w-auto',
                  brand.frame,
                )}
              >
                {/* monogram brand + bubble "+" ala tombol tambah — jadi langsung
                    terbaca "bisa diketuk" tanpa harus membaca teksnya */}
                <span className="relative">
                  <span
                    className={cn(
                      'flex size-11 items-center justify-center rounded-[1rem] text-[15px] font-black ring-1 ring-inset transition-transform duration-300 group-hover:scale-105',
                      brand.tile,
                    )}
                  >
                    {brand.name.charAt(0)}
                  </span>
                  <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-forest text-mint shadow-[0_6px_14px_-6px_rgba(69,89,78,0.95)] ring-2 ring-cream transition-transform duration-300 group-hover:scale-110">
                    <Plus className="size-3" strokeWidth={3.2} />
                  </span>
                </span>
                <span className="text-[12.5px] font-bold tracking-tight text-ink">
                  {brand.name}
                </span>
              </motion.button>
            ))}

            {/* jalur aman kalau brand user tidak ada di daftar brand populer */}
            <button
              type="button"
              onClick={() => openAddWallet(null)}
              className="group flex w-[104px] shrink-0 snap-start flex-col items-center gap-2.5 rounded-[1.4rem] border-2 border-dashed border-ink/[0.1] bg-cream/50 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-forest/25 hover:bg-cream active:scale-95 motion-reduce:transition-none xl:w-auto"
            >
              <span className="flex size-11 items-center justify-center rounded-[1rem] bg-cream text-ink/40 transition-colors group-hover:bg-sage/70 group-hover:text-forest">
                <Plus className="size-5" strokeWidth={2.6} />
              </span>
              <span className="text-[12.5px] font-semibold tracking-tight text-ink/45 transition-colors group-hover:text-ink">
                Lainnya
              </span>
            </button>
          </div>
        </section>
        </div>

        {/* ── CATATAN PINDAH DANA (muncul setelah user memindah saldo) ────────
            Pindah saldo mengubah dua saldo SEKALIGUS, dan itu tetap harus
            meninggalkan jejak. Record-nya memakai `HistoryTransaction` bertipe
            `transfer` — bentuk yang sama dengan baris di halaman Riwayat, jadi
            chip "pindah dana" (`isMoneyMovement()`) di sana & di sini mustahil
            berbeda makna. Panelnya muncul HANYA setelah ada catatan, supaya
            halaman tidak menambah tinggi untuk sesuatu yang belum terjadi. */}
        {transfers.length > 0 && (
          <section className="mt-5 rounded-[1.75rem] bg-cream p-4 shadow-[0_18px_40px_-34px_rgba(69,89,78,0.55)] ring-1 ring-soil/10 sm:p-5 xl:mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
                  <ArrowLeftRight className="size-3.5" strokeWidth={2.6} />
                </span>
                <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                  {WALLET_TRANSFER_LOG_COPY.title}
                </h2>
              </div>
              <span className="rounded-full bg-sage px-2.5 py-0.5 text-[10.5px] font-bold text-forest tabular-nums ring-1 ring-forest/10">
                {WALLET_TRANSFER_LOG_COPY.count(transfers.length)}
              </span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink/45">
              {WALLET_TRANSFER_LOG_COPY.hint}
            </p>
            <ul className="mt-2 divide-y divide-soil/10">
              {transfers.map((record) => {
                const tx = record.transaction
                /* penanda "pindah dana" dibaca dari helper yang SAMA dengan
                   halaman Riwayat — bukan flag kedua yang bisa tidak sinkron */
                const moves = isMoneyMovement(tx)
                const meta = [
                  tx.time,
                  tx.category,
                  moves ? WALLET_TRANSFER_LOG_COPY.movementChip : null,
                  record.note ?? null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <li key={tx.id} className="flex items-center gap-3 py-3">
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage/70 text-[15px] font-semibold text-ink/50"
                    >
                      {amountSign(tx.type)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {record.fromName} → {record.toName}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink/40">
                        {meta}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[13.5px] font-semibold tabular-nums',
                        MONEY_TONE[tx.type].text,
                      )}
                    >
                      {amountSign(tx.type)} {maskMoney(tx.amount, masked)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}


        {/* ── GRID KARTU DOMPET — selebar layar, 1/2/3 kolom ───────────────── */}
        <section className="mt-5 xl:mt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-sage via-cream to-mint-soft text-forest ring-1 ring-forest/10">
                <WalletIcon className="size-3.5" strokeWidth={2.5} />
              </span>
              <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
                Dompet &amp; Akun
              </h2>
              <span className="rounded-full bg-sage px-2 py-0.5 text-[10.5px] font-bold text-forest tabular-nums ring-1 ring-forest/10">
                {wallets.length}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {wallets.map((wallet, i) => (
              <motion.div
                key={wallet.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 * i, ease: EASE }}
                /* wrapper TIDAK overflow-hidden — popover menu-nya perlu ruang
                   keluar dari tepi kartu */
                className="group relative"
              >
                {/* muka kartu (halo + gradien `face` + motif batik + lapisan
                    dekoratif) — resepnya tinggal di wallet-card-face.tsx supaya
                    kartu di halaman ini & di Dompet Detail tidak pernah beda */}
                <WalletFace
                  wallet={wallet}
                  className={cn(
                    'rounded-[1.85rem] p-5 transition-all duration-300 ease-out',
                    'shadow-[0_26px_52px_-26px_rgba(0,0,0,0.6)]',
                    'group-hover:-translate-y-1.5 group-hover:ring-cream/45 group-hover:shadow-[0_36px_66px_-28px_rgba(0,0,0,0.7)]',
                    'motion-reduce:transition-none',
                  )}
                >

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display text-[15.5px] font-bold tracking-tight">
                          {wallet.name}
                        </p>
                        {/* ikon contactless HANYA untuk kartu bank — benda aslinya
                            (uang kertas & saldo e-wallet) tidak punya RFID */}
                        {wallet.type === 'Bank' && (
                          <ContactlessIcon className="size-4 shrink-0 text-cream/55" />
                        )}
                      </div>
                      {/* nomor akun tersamarkan — HANYA kartu bank yang punya nomor.
                          e-wallet & tunai tidak dipaksa memakai nomor seri. */}
                      {wallet.type === 'Bank' && wallet.number && (
                        <p className="mt-1.5 truncate text-[10.5px] font-semibold tracking-[0.2em] text-cream/60 tabular-nums">
                          {wallet.number}
                        </p>
                      )}
                      {/* jenis akun sebagai pil kaca, bukan teks polos */}
                      <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-cream/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-cream/90 ring-1 ring-inset ring-cream/30 backdrop-blur-[2px]">
                        <span aria-hidden className="size-1.5 rounded-full bg-cream/70" />
                        {WALLET_TYPE_LABEL[wallet.type]}
                      </span>
                    </div>
                    {/* elemen kanan atas MENGIKUTI benda aslinya (bank → chip EMV +
                        mutiara · e-wallet → monogram · tunai → tumpukan uang) —
                        resepnya tinggal di wallet-card-face.tsx */}
                    <WalletTypeMark wallet={wallet} chipId={`wallet-chip-${wallet.id}`} />
                  </div>

                  <div className="relative mt-8 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn(AMOUNT_LABEL, 'text-cream/60')}>Saldo</p>
                        {/* dompet yang baru ditambahkan user ditandai jujur: kartunya
                            belum punya halaman detail (lihat catatan di bawah) */}
                        {!seededIds.has(wallet.id) && (
                          <span
                            aria-label={WALLET_NEW_CARD_COPY.ariaLabel}
                            className="inline-flex items-center rounded-full bg-mint/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-cream ring-1 ring-inset ring-cream/30"
                          >
                            {WALLET_NEW_CARD_COPY.badge}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <MaskedAmount
                          value={formatIDR(wallet.balance)}
                          masked={masked}
                          dots="••••"
                          className={AMOUNT_LG}
                        />
                      </div>
                    </div>

                    {/* More Options → popover quick action. `relative z-20` WAJIB:
                        kartu ini punya lapisan tautan tak terlihat (lihat di
                        bawah) yang menutupi seluruh muka kartu, jadi tombol ini
                        harus duduk di atas lapisan itu supaya tetap bisa ditekan. */}
                    <button
                      type="button"
                      data-wallet-menu-root
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === wallet.id ? null : wallet.id))
                      }
                      aria-label={`Opsi untuk ${wallet.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === wallet.id}
                      className="relative z-20 flex size-9 shrink-0 items-center justify-center rounded-full bg-cream/20 text-cream ring-1 ring-inset ring-cream/35 backdrop-blur-[2px] transition-all hover:bg-cream/35 active:scale-95"
                    >
                      <MoreHorizontal className="size-4" strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* porsi dompet ini terhadap Total Saldo — lebar bar & label
                      dibaca dari `shares` yang sama dengan legenda hero, jadi
                      angka di layar mustahil beda dengan gambar barnya. */}
                  <div className="relative mt-5 flex items-center gap-2.5">
                    <span
                      role="progressbar"
                      aria-label={`Porsi ${wallet.name} dari total saldo`}
                      aria-valuenow={shares[i]}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-cream/15"
                    >
                      <motion.span
                        className="block h-full rounded-full bg-gradient-to-r from-cream/60 via-cream/85 to-cream"
                        initial={{ width: 0 }}
                        animate={{ width: `${shares[i]}%` }}
                        transition={{ duration: 0.7, delay: 0.25 + i * 0.07, ease: EASE }}
                      />
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums text-cream/70">
                      {shares[i]}% dari total
                    </span>
                  </div>

                  {/* Seluruh muka kartu bisa DIBUKA ke halaman detail dompet.
                      Tautannya dipasang sebagai lapisan tak terlihat di paling
                      akhir muka kartu (bukan membungkus isi kartu) supaya HTML-nya
                      tetap sah: tidak ada <button> di dalam <a>. Tombol titik
                      tiga di atas sudah diberi `z-20` supaya tetap bisa ditekan.

                      Tautan ini HANYA dipasang untuk dompet demo: halaman
                      /wallet/[id] dibaca SERVER dari INITIAL_WALLET_ACCOUNTS,
                      sementara dompet yang dibuat user hidup di state halaman ini
                      — menautkannya berarti mengirim user ke halaman "Dompet tidak
                      ditemukan". Karena itu kartu baru ditandai "Baru" dan tidak
                      diberi tautan, sementara Pindah Saldo & Sesuaikan Saldo tetap
                      bisa diakses dari popover titik tiga. */}
                  {seededIds.has(wallet.id) && (
                    <Link
                      href={`/wallet/${wallet.id}`}
                      aria-label={`Buka detail ${wallet.name}`}
                      className="absolute inset-0 z-10 rounded-[1.85rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/60"
                    >
                      <span className="sr-only">
                        Lihat saldo, arus 30 hari, dan catatan {wallet.name}
                      </span>
                    </Link>
                  )}
                </WalletFace>

                {/* QUICK ACTIONS — popover, bukan swipe library */}
                <AnimatePresence>
                  {openMenuId === wallet.id && (
                    <motion.div
                      role="menu"
                      data-wallet-menu-root
                      aria-label={`Aksi untuk ${wallet.name}`}
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, y: 6 }}
                      transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                      className="absolute bottom-16 right-3 z-30 w-56 origin-bottom-right rounded-2xl bg-cream/95 p-1.5 shadow-[0_28px_60px_-22px_rgba(69,89,78,0.55)] ring-1 ring-soil/12 backdrop-blur-xl"
                    >
                      {/* dompet yang baru dibuat user belum punya halaman detail
                          (/wallet/[id] dibaca server dari data demo) → itemnya tidak
                          ditawarkan supaya tidak menabrak halaman "tidak ditemukan" */}
                      {seededIds.has(wallet.id) && (
                        <MenuItem
                          icon={ChevronRight}
                          label={WALLET_CARD_MENU_COPY.openDetail}
                          hint={WALLET_CARD_MENU_COPY.openDetailHint}
                          onClick={() => handleOpenDetail(wallet)}
                        />
                      )}
                      <MenuItem
                        icon={ArrowLeftRight}
                        label={WALLET_CARD_MENU_COPY.transfer}
                        hint={WALLET_CARD_MENU_COPY.transferHint}
                        onClick={() => {
                          setOpenMenuId(null)
                          openTransfer(wallet)
                        }}
                      />
                      <MenuItem
                        icon={Settings2}
                        label={WALLET_QUICK_ACTION_COPY.sync}
                        hint={WALLET_CARD_MENU_COPY.syncHint}
                        onClick={() => {
                          setOpenMenuId(null)
                          setSyncTarget(wallet)
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* ── SMART SYNC DRAWER (Magic Vault) ─────────────────────────────────── */}
      <SyncBalanceModal
        wallet={syncTarget}
        open={syncTarget !== null}
        onClose={() => setSyncTarget(null)}
        onConfirm={handleSyncConfirm}
      />

      {/* ── MODAL TAMBAH DOMPET ───────────────────────────────────────────────
          Satu modal untuk dua pintu: ghost card di rail (brand sudah terisi) dan
          tombol "Lainnya" (form bersih). `cardIndex` = posisi dompet baru, yang
          menentukan resep warnanya — warna TIDAK pernah dipilih user. */}
      <AddWalletSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAddWalletSave}
        cardIndex={wallets.length}
        initialBrand={addBrand}
      />

      {/* ── SHEET PINDAH SALDO ────────────────────────────────────────────────
          Menerima seluruh daftar dompet (calon tujuan) dan dompet sumber yang
          sedang dipilih; yang mengubah dua saldo + menulis catatannya adalah
          parent, supaya tidak ada dua tempat yang sama-sama "tahu" saldo. */}
      <TransferSheet
        wallets={wallets}
        source={transferSource}
        open={transferSource !== null}
        onClose={() => setTransferSource(null)}
        onTransfer={handleTransferConfirm}
      />
    </ScreenShell>
  )
}

/**
 * Jam lokal `HH:MM` untuk catatan pindah dana.
 *
 * Dipanggil dari EVENT HANDLER (bukan saat render), jadi tidak pernah membuat
 * HTML server & client berbeda; tanggalnya sendiri tetap memakai konstanta mock
 * `WALLET_TODAY_ISO` supaya sejalan dengan data dompet lainnya.
 */
function clockLabel(date: Date = new Date()): string {
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) — satu bentuk
 * tombol mata yang sama di SEMUA halaman, bukan pill translucent lokal seperti
 * dulu. Menulis ke PrivacyProvider (state GLOBAL app), jadi satu klik menyensor
 * semua nominal: hero, tile likuiditas, DAN saldo tiap kartu dompet.
 */

/**
 * Chip likuiditas di hero gelap.
 * `liquid` = uang cair yang bisa langsung dipakai (aksen leaf),
 * `held` = aset ditahan/dikunci (aksen kaca netral + ikon gembok).
 */
function LiquidityPill({
  icon: Icon,
  label,
  value,
  masked,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  masked: boolean
  tone: 'liquid' | 'held'
}) {
  const isLiquid = tone === 'liquid'
  return (
    <span
      className={cn(
        'flex items-center gap-2.5 rounded-[1.25rem] px-3 py-2.5 ring-1 ring-inset transition-colors',
        isLiquid
          ? 'bg-mint/[0.14] ring-mint/25'
          : 'bg-cream/[0.06] ring-cream/10',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isLiquid ? 'bg-mint/25 text-mint' : 'bg-cream/10 text-cream/60',
        )}
      >
        <Icon className="size-4" strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate text-[10px] font-semibold uppercase tracking-[0.12em]',
            isLiquid ? 'text-mint/70' : 'text-cream/45',
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[13.5px] font-bold tabular-nums text-cream">
          {masked ? '••••' : value}
        </span>
      </span>
    </span>
  )
}

/** Satu baris aksi di popover "More Options" pada kartu dompet. */
function MenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-sage/70"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-forest">
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-ink">{label}</span>
        <span className="mt-0.5 block text-[11px] text-ink/45">{hint}</span>
      </span>
    </button>
  )
}
