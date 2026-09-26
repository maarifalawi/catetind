'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeftRight,
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
import { usePrivacy } from './privacy-provider'
import { cn } from '@/lib/utils'
import { AMOUNT_LABEL, AMOUNT_LG, AMOUNT_XL } from '@/lib/typography'
import { formatIDR, INITIAL_WALLET_ACCOUNTS, type WalletAccount } from '@/lib/wallets'

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
   5. Grid kartu dompet — muka kartu MENGIKUTI benda aslinya:
        · Bank     → chip EMV + ikon contactless + nomor rekening tersamarkan
        · E-Wallet → monogram brand saja (tanpa chip/contactless/nomor kartu)
        · Tunai    → ilustrasi tumpukan uang kertas (tanpa chip/nomor seri)
   6. Quick action per kartu — popover menu (Pindah Saldo / Sesuaikan Saldo) dan
      Vaul drawer Smart Sync untuk mengoreksi saldo ke angka asli yang user baca
      SENDIRI di m-banking-nya (manual, tanpa integrasi open-banking). */

/**
 * Pool kandidat brand untuk slot "Tambah Dompet Cepat".
 *
 * `tile` = warna monogram, `frame` = bayangan saat kartu di-hover.
 *
 * Paletnya ikut bahasa warna kanon CatetInd (Evergreen, Leaf, Olive, Thistle,
 * Plum, Cantelope, Daisy — lihat docs/theme/PALETTE.md), bukan warna acak,
 * supaya halaman Dompet & Akun nyambung dengan Home, Riwayat, dan sidebar.
 * Kelas ditulis LITERAL supaya terbaca scanner Tailwind.
 *
 * PENTING: ini POOL, bukan daftar yang langsung tampil. Yang dirender adalah
 * `suggestedBrands` — hasil penyaringan terhadap dompet yang SUDAH dimiliki user.
 */
const GHOST_BRAND_POOL = [
  {
    name: 'BCA',
    tile: 'bg-gradient-to-br from-sage via-mint-soft to-mint text-forest ring-mint/40',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(69,89,78,0.55)]',
  },
  {
    name: 'GoPay',
    tile: 'bg-gradient-to-br from-[#dbdccf] via-[#91a0b8] to-[#91a0b8] text-[#503a3a] ring-[#91a0b8]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(145,160,184,0.75)]',
  },
  {
    name: 'GoPay',
    tile: 'bg-gradient-to-br from-[#dbe4c7] via-[#91bb9e] to-[#91bb9e] text-[#503a3a] ring-[#91bb9e]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(145,187,158,0.75)]',
  },
  {
    name: 'Mandiri',
    tile: 'bg-gradient-to-br from-[#f6edb7] via-[#ecd768] to-[#ecd768] text-[#503a3a] ring-[#ecd768]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(236,215,104,0.85)]',
  },
  {
    name: 'BNI',
    tile: 'bg-gradient-to-br from-[#fbe3c0] via-[#ffb885] to-[#ffb885] text-[#503a3a] ring-[#ffb885]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(255,184,133,0.8)]',
  },
  {
    name: 'OVO',
    tile: 'bg-gradient-to-br from-[#e7d8c3] via-[#b89191] to-[#b89191] text-[#503a3a] ring-[#b89191]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(184,145,145,0.8)]',
  },
  {
    name: 'Dana',
    tile: 'bg-gradient-to-br from-[#e6e4c0] via-[#b5b987] to-[#b5b987] text-[#503a3a] ring-[#b5b987]/50',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(181,185,135,0.9)]',
  },
  {
    name: 'Jago',
    tile: 'bg-gradient-to-br from-sage via-[#c4c7af] to-[#c4c7af] text-[#503a3a] ring-[#c4c7af]/60',
    frame: 'hover:shadow-[0_22px_40px_-26px_rgba(196,199,175,0.9)]',
  },
] as const

/**
 * berapa saran yang ditampilkan. 3 brand + 1 slot dashed "Lainnya" = 4 kartu,
 * yang di desktop jatuh rapi sebagai grid 2×2 di rail kanan.
 */
const SUGGESTION_LIMIT = 3

/** label jenis akun berbahasa Indonesia (data `type` tetap Inggris) */
const TYPE_LABEL: Record<WalletAccount['type'], string> = {
  Bank: 'Bank',
  'E-Wallet': 'E-Wallet',
  Cash: 'Tunai',
}


/** bayangan teks lembut — nama & saldo tetap terbaca di atas stop gradien termuda */
const CARD_TEXT_SHADOW = '[text-shadow:0_1px_9px_rgba(36,26,26,0.55)]'

/** aset yang ditahan/dikunci — mock statis (Rp 0) */
const HELD_ASSETS = 0

/** cubic-bezier khas app: masuk cepat lalu settle lembut */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function WalletScreen() {
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

  /** Total Saldo = jumlah saldo seluruh dompet. Halaman ini soal KAS likuid —
      "Total Kekayaan" (Net Worth) dihitung di halaman Kekayaan & Hutang. */
  const total = useMemo(() => wallets.reduce((sum, w) => sum + w.balance, 0), [wallets])
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
    return GHOST_BRAND_POOL.filter((brand) => !owned.has(brand.name.toLowerCase())).slice(
      0,
      SUGGESTION_LIMIT,
    )
  }, [wallets])

  /* ── 2. ONBOARDING 1 KETUKAN dari ghost card ────────────────────────────── */
  function handleGhostTap(brand: string) {
    // TODO: Open Add Wallet Modal pre-filled with this brand.
    if (brand === 'Dompet lain') {
      toast('Tambah dompet', {
        description: 'Pilih jenisnya dulu: bank, e-wallet, atau uang tunai.',
      })
      return
    }
    toast(`Tambah ${brand}`, {
      description: 'Modal tambah dompet akan langsung terisi brand ini.',
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

  /* ── 6. QUICK TRANSFER (placeholder) ────────────────────────────────────── */
  function handleTransfer(wallet: WalletAccount) {
    // TODO: buka Transfer Sheet (pilih dompet tujuan + nominal).
    toast(`Pindah Saldo dari ${wallet.name}`, {
      description: 'Pilih dompet tujuan — segera hadir.',
    })
  }

  return (
    <ScreenShell>
      {/* motif batik untuk muka kartu — didefinisikan sekali di sini lalu dipakai
          ulang tiap kartu lewat url(#wallet-art-…). Prefix `wallet-art` supaya
          tidak bentrok dengan id pattern deck di Home (card-art-…). */}
      <svg aria-hidden className="absolute size-0">
        <defs>
          {/* batik kawung: lingkaran-lingkaran saling beririsan */}
          <pattern id="wallet-art-kawung" width="72" height="72" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeOpacity="0.14" strokeWidth="1.6">
              <circle cx="36" cy="36" r="26" />
              <circle cx="0" cy="0" r="26" />
              <circle cx="72" cy="0" r="26" />
              <circle cx="0" cy="72" r="26" />
              <circle cx="72" cy="72" r="26" />
            </g>
            <circle cx="36" cy="36" r="5" fill="white" fillOpacity="0.14" />
          </pattern>
          {/* batik mega mendung: lengkung awan berlapis */}
          <pattern id="wallet-art-mendung" width="90" height="44" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white">
              <path d="M0 44 Q22.5 8 45 44 Q67.5 8 90 44" strokeOpacity="0.16" strokeWidth="1.8" />
              <path d="M0 32 Q22.5 -4 45 32 Q67.5 -4 90 32" strokeOpacity="0.1" strokeWidth="1.6" />
              <path d="M0 20 Q22.5 -16 45 20 Q67.5 -16 90 20" strokeOpacity="0.07" strokeWidth="1.4" />
            </g>
          </pattern>
          {/* batik parang: gelombang diagonal berirama */}
          <pattern id="wallet-art-parang" width="48" height="48" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeLinecap="round">
              <path d="M-12 36 Q0 24 12 36 T36 36 T60 36" strokeOpacity="0.15" strokeWidth="2" />
              <path d="M-12 20 Q0 8 12 20 T36 20 T60 20" strokeOpacity="0.1" strokeWidth="1.8" />
              <path d="M-12 44 Q0 32 12 44 T36 44 T60 44" strokeOpacity="0.07" strokeWidth="1.4" />
            </g>
          </pattern>
          {/* rings: garis kontur topografi konsentris */}
          <pattern id="wallet-art-rings" width="150" height="150" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="white" strokeWidth="1.6">
              <circle cx="150" cy="0" r="34" strokeOpacity="0.17" />
              <circle cx="150" cy="0" r="62" strokeOpacity="0.13" />
              <circle cx="150" cy="0" r="90" strokeOpacity="0.1" />
              <circle cx="150" cy="0" r="118" strokeOpacity="0.07" />
            </g>
          </pattern>
        </defs>
      </svg>
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
                onClick={() => handleGhostTap(brand.name)}
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
              onClick={() => handleGhostTap('Dompet lain')}
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
                {/* halo warna dompet di belakang kartu — mekar saat hover supaya
                    kartu terasa "menyala", bukan kotak datar (wrapper sengaja
                    tidak overflow-hidden, jadi cahayanya boleh keluar tepi) */}
                <div
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute -inset-x-3 -bottom-4 top-6 rounded-[2.6rem] opacity-40 blur-2xl transition-all duration-500 ease-out',
                    'group-hover:-bottom-6 group-hover:opacity-70 motion-reduce:transition-none',
                    wallet.color,
                  )}
                />
                <article
                  className={cn(
                    'relative overflow-hidden rounded-[1.85rem] p-5 text-cream ring-1 ring-inset ring-cream/30',
                    'shadow-[0_26px_52px_-26px_rgba(36,26,26,0.6)] transition-all duration-300 ease-out',
                    'group-hover:-translate-y-1.5 group-hover:ring-cream/45 group-hover:shadow-[0_36px_66px_-28px_rgba(36,26,26,0.7)]',
                    'motion-reduce:transition-none',
                    CARD_TEXT_SHADOW,
                    wallet.face,
                  )}
                >
                  {/* lapisan kaca: sorot lembut kiri atas + sudut gelap → kedalaman */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-cream/20 via-cream/[0.04] to-soil/25"
                  />
                  {/* kilau holografik blush-lila menyapu diagonal — ciri kartu edisi khusus */}
                  <div
                    aria-hidden
                    className="absolute inset-0 [background-image:linear-gradient(112deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0)_32%,rgba(231,216,195,0.42)_56%,rgba(231,216,195,0.3)_72%,rgba(255,255,255,0)_92%)]"
                  />
                  {/* scrim halus di sisi kiri — jaga kontras teks di atas stop terang */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-r from-[#1f2823]/35 via-transparent to-transparent"
                  />
                  {/* tekstur noise halus supaya muka kartu tidak terasa flat */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1.2px)] [background-size:9px_9px]"
                  />
                  {/* aksen batik khas kartu (parang/mendung/kawung/rings) — tema
                      per dompet seperti kartu bank edisi batik. Duduk di atas
                      warna dasar & di bawah teks, memudar dari kanan atas supaya
                      nama + saldo tetap terbaca. */}
                  <svg
                    aria-hidden
                    className="absolute inset-0 h-full w-full [mask-image:radial-gradient(150%_135%_at_92%_-18%,black_14%,transparent_74%)]"
                  >
                    <rect width="100%" height="100%" fill={`url(#wallet-art-${wallet.art})`} />
                  </svg>
                  <div
                    aria-hidden
                    className="absolute -right-12 -top-16 size-40 rounded-full bg-cream/25 blur-3xl"
                  />
                  {/* highlight tipis di bibir atas kartu */}
                  <div
                    aria-hidden
                    className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cream/50 to-transparent"
                  />
                  {/* kilau menyapu saat kartu di-hover */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[320%] -skew-x-12 bg-gradient-to-r from-transparent via-cream/30 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[420%] motion-reduce:transition-none"
                  />

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
                        {TYPE_LABEL[wallet.type]}
                      </span>
                    </div>
                    {/* elemen kanan atas MENGIKUTI benda aslinya:
                        bank → chip EMV + untaian mutiara · e-wallet → monogram
                        brand · tunai → ilustrasi tumpukan uang kertas */}
                    {wallet.type === 'Bank' ? (
                      <div className="flex shrink-0 flex-col items-end gap-2.5">
                        {/* chip EMV mock di kanan atas */}
                        <ChipIcon
                          id={`wallet-chip-${wallet.id}`}
                          className="mt-0.5 h-6 w-8 shrink-0 drop-shadow-[0_2px_5px_rgba(36,26,26,0.35)]"
                        />
                        {/* untaian mutiara kecil di bawah chip — sentuhan perhiasan */}
                        <span aria-hidden className="flex items-center gap-1 pr-0.5">
                          <span className="size-1 rounded-full bg-cream/45" />
                          <span className="size-1.5 rounded-full bg-cream/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                          <span className="size-1 rounded-full bg-cream/40" />
                        </span>
                      </div>
                    ) : wallet.type === 'E-Wallet' ? (
                      /* e-wallet = aplikasi digital, bukan kartu plastik: cukup
                         logo/monogram brand — tanpa chip EMV & tanpa contactless */
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream/20 text-[13px] font-black text-cream ring-1 ring-inset ring-cream/30">
                        {wallet.name.charAt(0)}
                      </span>
                    ) : (
                      /* tunai = uang kertas: yang relevan hanya tumpukan
                         lembarannya, bukan chip kuningan atau nomor seri */
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream/20 text-cream ring-1 ring-inset ring-cream/30">
                        <CashStackIcon className="size-5" />
                      </span>
                    )}
                  </div>

                  <div className="relative mt-8 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn(AMOUNT_LABEL, 'text-cream/60')}>Saldo</p>
                      <div className="mt-2">
                        <MaskedAmount
                          value={formatIDR(wallet.balance)}
                          masked={masked}
                          dots="••••"
                          className={AMOUNT_LG}
                        />
                      </div>
                    </div>

                    {/* More Options → popover quick action */}
                    <button
                      type="button"
                      data-wallet-menu-root
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === wallet.id ? null : wallet.id))
                      }
                      aria-label={`Opsi untuk ${wallet.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === wallet.id}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream/20 text-cream ring-1 ring-inset ring-cream/35 backdrop-blur-[2px] transition-all hover:bg-cream/35 active:scale-95"
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
                </article>

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
                      <MenuItem
                        icon={ArrowLeftRight}
                        label="Pindah Saldo"
                        hint="Transfer antar dompet"
                        onClick={() => {
                          setOpenMenuId(null)
                          handleTransfer(wallet)
                        }}
                      />
                      <MenuItem
                        icon={Settings2}
                        label="Sesuaikan Saldo"
                        hint="Smart Sync"
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
    </ScreenShell>
  )
}

/**
 * Toggle privasi halaman kini komponen baku GLOBAL (audit UX #7) — satu bentuk
 * tombol mata yang sama di SEMUA halaman, bukan pill translucent lokal seperti
 * dulu. Menulis ke PrivacyProvider (state GLOBAL app), jadi satu klik menyensor
 * semua nominal: hero, tile likuiditas, DAN saldo tiap kartu dompet.
 */

/**
 * Angka saldo dengan transisi privasi.
 *
 * Saat `masked` true, nominal mem-blur lalu memudar dan digantikan titik sensor.
 * Lebar layout tetap dikunci oleh nominal aslinya (opacity-0 tapi masih memakai
 * ruang) supaya tidak ada "lompatan" tata letak saat di-toggle.
 *
 * Catatan: `className` HANYA untuk tipografi/warna — jangan taruh margin di
 * sini, karena kelas yang sama dipakai juga oleh lapisan titik yang
 * ber-posisi absolut.
 */
function MaskedAmount({
  value,
  masked,
  className,
  dots = '••••••',
}: {
  value: string
  masked: boolean
  className?: string
  /** titik sensor yang menggantikan nominal */
  dots?: string
}) {
  const fade = 'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
  return (
    <span className="relative inline-flex items-center">
      <span
        aria-hidden={masked}
        className={cn(fade, masked ? 'blur-[7px] opacity-0' : 'blur-0 opacity-100', className)}
      >
        {value}
      </span>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center tracking-[0.18em]',
          fade,
          masked ? 'blur-0 opacity-100' : 'blur-[7px] opacity-0',
          className,
        )}
      >
        {dots}
      </span>
    </span>
  )
}

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



/**
 * Chip EMV mock di sudut kanan atas muka kartu.
 *
 * `id` wajib unik per kartu: gradient emasnya didefinisikan inline, jadi id yang
 * sama di beberapa instance akan membuat DOM punya id duplikat.
 */
function ChipIcon({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6edb7" />
          <stop offset="45%" stopColor="#ecd768" />
          <stop offset="100%" stopColor="#ffb885" />
        </linearGradient>
      </defs>
      <rect
        x="0.8"
        y="0.8"
        width="30.4"
        height="22.4"
        rx="4.2"
        fill={`url(#${id})`}
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.9"
      />
      <g stroke="rgba(115,83,60,0.45)" strokeWidth="0.9" fill="none">
        <path d="M0.8 8.4h9.6M0.8 15.6h9.6" />
        <path d="M21.6 0.8v22.4" />
        <path d="M21.6 8.4h9.6M21.6 15.6h9.6" />
        <rect x="10.4" y="8.4" width="11.2" height="7.2" rx="1.6" />
      </g>
    </svg>
  )
}

/** Ikon contactless (tiga busur) di samping nama dompet. */
function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8.6 7.4a9.6 9.6 0 0 1 0 9.2M12.4 5.4a13.4 13.4 0 0 1 0 13.2M16.2 3.4a17.2 17.2 0 0 1 0 17.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Ilustrasi uang kertas (varian muka kartu Tunai).
 *
 * Uang fisik TIDAK punya chip EMV, contactless, atau nomor seri — jadi elemen
 * kanan atas kartu Tunai memakai tumpukan lembaran ini, bukan chip kuningan
 * yang hanya masuk akal di muka kartu bank.
 */
function CashStackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      {/* tiga lembar kertas bertingkat = tumpukan uang */}
      <g stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <rect x="7" y="5" width="20" height="11" rx="2.2" opacity="0.45" />
        <rect x="5.5" y="9.5" width="20" height="11" rx="2.2" opacity="0.75" />
        <rect x="4" y="14" width="20" height="11" rx="2.2" />
      </g>
      {/* ornamen tengah lembaran (bukan chip) */}
      <circle cx="14" cy="19.5" r="2.6" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75">
        <path d="M18.6 17.6h3.6M18.6 21.4h3.6" />
      </g>
    </svg>
  )
}

/**
 * Count-up halus untuk angka besar (Total Saldo).
 *
 * Nilai awal SELALU sama dengan `value`, jadi HTML hasil render server dan
 * render pertama client identik (tidak ada hydration mismatch) — animasi hanya
 * dipicu saat `value` benar-benar berubah, mis. setelah Smart Sync mengoreksi
 * saldo. `fromRef` diperbarui tiap frame supaya animasi baru tetap menyambung
 * mulus dari angka yang sedang tampil kalau nilainya berubah di tengah jalan.
 */
function useCountUp(value: number, duration = 620) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    if (from === value) return
    // hormati preferensi aksesibilitas: lompat langsung ke angka akhir
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = value
      setDisplay(value)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = Math.round(from + (value - from) * eased)
      fromRef.current = current
      setDisplay(current)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return display
}

