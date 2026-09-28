'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Bell, Receipt, Search, Wallet as WalletIcon } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { LogoWordmark } from './logo-wordmark'
import { MetaChip } from './meta-chip'
import { WalletCardStack } from './wallet-card-stack'
import { CashFlowCard } from './cash-flow-card'
import { DailyHudCard } from './daily-hud-card'
import { DailyNudge } from './daily-nudge'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { PlantWidget } from './plant-widget'
import { ContextSwitcher } from './context-switcher'
import { useMoneyContext } from './money-context-provider'
import { WeeklyRecapBanner } from './weekly-recap-banner'
import { WeeklyRecapModal } from './weekly-recap-modal'
import { HomeBanners } from './home-banner'
import { EmptyAccountNotice } from './empty-account-notice'
import { RenewalModal } from './renewal-modal'
import { MonthlyReviewModal } from './monthly-review-modal'
import { MonthlyTargetCard } from './monthly-target-card'
import { MilestoneCelebration } from './milestone-celebration'
import { useRenewalReminder } from '@/hooks/use-renewal-reminder'
import { useMonthlyReview } from '@/hooks/use-monthly-review'
import { useMilestoneCelebration } from '@/hooks/use-milestone-celebration'
import { ExpenseDistributionCard } from './expense-distribution-card'
import { MyGoalsCard } from './my-goals-card'
import { RecentTransactionsCard } from './recent-transactions-card'
import { OverviewPanel } from './overview-panel'
import { homeWallets, cashTotal, cashTotalByContext, useMoneyStore } from '@/lib/money/store'
import type { DeckSelection } from '@/lib/wallets'
import { getTransactionsByContext } from '@/lib/data/transactions'
import { HISTORY_SEARCH_PARAM, historySearchHref } from '@/lib/data/history'
import { HOME_HEADER_COPY, HOME_TOTAL_COPY } from '@/lib/data/home'
import { usePrivacy } from './privacy-provider'
import type { Transaction } from '@/lib/types'

export function HomeScreen() {
  const [overviewOpen, setOverviewOpen] = useState(false)
  /* Kartu mana yang dipencet di deck dompet — panel "Your Balance Overview"
     mengikuti pilihan ini (kartu A → saldo A, kartu B → saldo B). Nilai awal =
     kartu "Semua Dompet"; totalnya dihitung ulang dari store setiap render, jadi
     ikut berubah begitu ada baris ledger baru (catatan, koreksi saldo). */
  const [overviewSelection, setOverviewSelection] = useState<DeckSelection | null>(null)
  /* konteks uang (Pribadi/Keluarga/Bersama) kini GLOBAL (audit UX #6) — satu
     sumber kebenaran yang sama dengan switcher di Sidebar, bukan state lokal. */
  const { context: moneyCtx, setContext } = useMoneyContext()
  const [recapOpen, setRecapOpen] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  /* kata kunci kolom cari di header desktop. Controlled (value + onChange)
     SENGAJA: kolom ini dulu uncontrolled tanpa handler sama sekali, jadi huruf
     yang diketik user tidak pernah dipakai apa pun. Sekarang isinya dikirim ke
     halaman Riwayat (lihat handleSearchSubmit). */
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    setNow(new Date())
  }, [])

  const snapshot = useMoneyStore()
  /* nominal yang tampil di baris konteks ikut tombol mata global (paket 31/44) —
     sensor layar harus berlaku juga untuk angka baru yang kita tambahkan di sini */
  const { money } = usePrivacy()
  /* Deck dompet & total saldonya dari SATU store uang. Dulu Home menjumlahkan
     daftar dompet versi Home (Rp 4.309.573) sementara Dompet & Kekayaan memakai
     daftar versi halaman Dompet (Rp 1.850.000) — dua angka untuk satu user
     (temuan audit #1 & #2). Sekarang angkanya turunan `opening + Σ baris ledger`.

     PAKET 44 — konteks uang TIDAK LAGI menyentuh angka total:
       · `total`        = `cashTotal(snapshot)` = SELURUH dompet, sama dengan
                          hero `/wallet` & kas likuid Kekayaan;
       · `allWallets`   = daftar semua dompet, dipakai chip jumlah dompet;
       · `contextTotal` = saldo SATU konteks, ditampilkan sebagai baris kecil
                          "Dompet Pribadi: Rp X" saat konteks aktif — penjelasan
                          kenapa daftarnya lebih pendek.
     Sebelumnya chip ini memakai daftar tersaring sehingga satu layar memuat dua
     angka dompet yang berbeda ("2 dompet" vs "3 dompet aktif" di kartu). */
  const allWallets = useMemo(() => homeWallets(snapshot, 'all'), [snapshot])
  const total = useMemo(() => cashTotal(snapshot), [snapshot])
  const contextTotal = useMemo(
    () => cashTotalByContext(snapshot, moneyCtx),
    [snapshot, moneyCtx],
  )
  const transactions = useMemo(
    () => getTransactionsByContext(moneyCtx) as Transaction[],
    [moneyCtx],
  )

  const hour = now?.getHours() ?? 12
  const sapaan = !now ? 'Selamat datang' : hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'
  const tanggal = now ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now) : ' '
  /* label konteks dengan huruf kapital di awal: "pribadi" → "Pribadi" */
  const contextLabel = moneyCtx.charAt(0).toUpperCase() + moneyCtx.slice(1)

  /* CATATAN PERFORMA — efek "background zoom-out" (scale + opacity ke seluruh
     dashboard) SENGAJA DIHAPUS. Alasannya: begitu seluruh halaman di-scale atau
     di-opacity, Chromium tidak bisa memakai ulang hasil render kartu-kartu
     ber-`backdrop-blur` di dalamnya (deck dompet), sehingga SELURUH halaman
     di-raster ulang tiap frame selama 500ms — persis yang bikin animasi
     buka/tutup Overview & Rekap terasa patah-patah. Fokus user sekarang dijaga
     oleh lapisan gelap milik panel itu sendiri (bg-ink/50 di overview-panel.tsx
     & weekly-recap-modal.tsx), yang biayanya jauh lebih murah. */

  /* Handler stabil (useCallback): dipakai sebagai props kartu yang sudah
     dibungkus `memo`, supaya klik popup tidak memicu re-render dashboard.
     Bonus: effect di OverviewPanel/WeeklyRecapModal yang bergantung pada
     `onClose` juga tidak ikut jalan ulang tiap render. */
  const handleDeckOpen = useCallback((selection: DeckSelection) => {
    setOverviewSelection(selection)
    setOverviewOpen(true)
  }, [])
  const closeOverview = useCallback(() => setOverviewOpen(false), [])
  const openRecap = useCallback(() => setRecapOpen(true), [])
  const closeRecap = useCallback(() => setRecapOpen(false), [])

  /* Cari transaksi dari Home = PINDAH ke halaman yang punya pencariannya,
     membawa kata kuncinya (`/history?q=...`). Dulu kolom di header cuma hiasan:
     bisa diketik, tapi tidak ada satu pun yang membacanya. Sekarang Enter atau
     tombol kirim benar-benar menyaring daftar di /history — halaman itu membaca
     `?q=` lewat prop server (app/history/page.tsx).
     Kata kunci kosong tidak dikirim: user dibawa ke Riwayat apa adanya, bukan ke
     pencarian kosong dengan URL yang berisi `q=`. */
  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const query = searchQuery.trim()
      router.push(query ? historySearchHref(query) : '/history')
    },
    [router, searchQuery],
  )
  /* pengingat perpanjangan (task 14): modal H-1 + banner-nya satu paket.
     Logika "kapan muncul" ada di hook — Home cuma memasang & meneruskan. */
  const renewal = useRenewalReminder()
  /* ritual bulanan (task 15): trigger tanggal 1–3 + target tersimpan.
     Logikanya juga di hook; Home cuma memasang kartu & modalnya. */
  const monthly = useMonthlyReview()
  /* perayaan milestone (inventaris #k, task 16): streak 7/14/21/30 dari state
     mock `lib/data/milestones.ts`. Logikanya di hook — Home cuma memasang
     overlay & meneruskan pintu "Lihat perayaan" ke Plant Detail. */
  const celebration = useMilestoneCelebration()

  /* "Atur target nabung" di recap mingguan menyambung ke alur target yang SUDAH
     ada di app (modal Target bulanan yang dikelola `useMonthlyReview`). Recap
     ditutup DULU supaya tidak ada dua overlay bertumpuk — aturan yang sama
     dengan `monthly.open && !renewal.open` di bawah. `monthly.openModal` diambil
     sebagai variabel supaya callback ini stabil antar render. */
  const openMonthlyTarget = monthly.openModal
  const handleSetRecapTarget = useCallback(() => {
    setRecapOpen(false)
    openMonthlyTarget()
  }, [openMonthlyTarget])
  /* Perayaan MENUNGGU popup lain tutup dulu: jangan dua overlay bertumpuk di
     layar yang sama (alasan yang sama dengan `monthly.open && !renewal.open`). */
  const celebrationBlocked = renewal.open || monthly.open || overviewOpen || recapOpen

  return (
    <ScreenShell>
      <div>
        <header className="flex items-start justify-between lg:hidden">
          <LogoWordmark className="h-5" />
          <div className="flex items-center gap-2">
            {/* sensor layar global — versi kompak untuk header mobile */}
            <GlobalPrivacyToggle className="size-9" />
            {/* Tombol "Menu" DIHAPUS (paket 29). Alasannya kanon 2A.6: navigasi
                sekunder cuma boleh punya SATU sumber kebenaran, dan itu sudah
                dipegang bottom-nav "Lainnya" (components/MobileBottomNav.tsx —
                daftar lengkap 3 grup, sama dengan sidebar desktop). Tombol ini
                dulu tidak membuka apa pun: duplikat yang mati, bukan jalan pintas. */}
            <span className="relative size-9 overflow-hidden rounded-full ring-1 ring-soil/12">
              <Image src="/avatar-maarif.png" alt="Jon Snow" fill sizes="36px" className="object-cover" />
            </span>
          </div>
        </header>
        {/* switcher konteks — state GLOBAL (audit UX #6). Di MOBILE ia duduk di
            barisnya sendiri; di DESKTOP ia ikut ke cluster aksi (baris judul) di
            bawah. Dulu versi desktopnya ada di Sidebar, tapi blok "Konteks Uang"
            dihapus dari Sidebar → di desktop switcher-nya hilang sama sekali dan
            konteks terkunci di "Pribadi" (audit 46). Sengaja TIDAK sticky: saat
            halaman di-scroll ia ikut naik (tidak menutupi konten). */}
        <div className="mt-4 flex justify-center lg:hidden">
          <ContextSwitcher value={moneyCtx} onChange={setContext} />
        </div>
        {/* keadaan kosong (paket 43): hanya muncul setelah akun dihapus — lihat
            komponennya untuk alasan mengapa satu kalimat ini wajib ada */}
        <EmptyAccountNotice />
        <div className="mt-4 lg:mt-0 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0">
            {/* tanggal & sapaan khusus desktop — di mobile blok ini dihilangkan
                supaya user langsung sampai ke kartu dompet */}
            <p className="hidden text-[13px] font-medium text-ink/45 lg:block">{tanggal}</p>
            <h1 className="mt-1 hidden font-display text-3xl font-semibold tracking-tight text-ink lg:block lg:text-4xl">
              {sapaan}, Jon 🌿
            </h1>
            {/* meta ringkas sebagai chip — menggantikan baris teks "Konteks: …"
                yang dulu bertumpuk jadi banyak tingkat, terutama di mobile */}
            <div className="flex flex-wrap items-center gap-2 lg:mt-3">
              <MetaChip icon={WalletIcon}>{HOME_TOTAL_COPY.walletsChip(allWallets.length)}</MetaChip>
              <MetaChip icon={Receipt}>{transactions.length} transaksi</MetaChip>
              {/* ── KONTEKS UANG (audit 46) ────────────────────────────────────
                  Dulu di sini cuma ada chip BACAAN "Pribadi", karena switcher
                  aslinya hidup di Sidebar — dan blok itu sudah dihapus dari
                  Sidebar. Hasilnya user DESKTOP tidak punya cara berpindah ke
                  Keluarga/Bersama sama sekali. Sekarang chip itu diganti kontrol
                  yang benar-benar bisa ditekan: tiga pilihan Pribadi / Keluarga /
                  Bersama, sumber state yang sama dengan versi mobile di atas. */}
              <ContextSwitcher
                value={moneyCtx}
                onChange={setContext}
                className="hidden w-[262px] lg:flex"
              />
            </div>
            {/* ── KONTEKS AKTIF (paket 44) ─────────────────────────────────────
                Konteks uang SELALU punya nilai (Pribadi/Keluarga/Bersama — tidak
                ada keadaan "semua"), jadi baris ini selalu tampil dan selalu
                relevan: ia memisahkan dua angka yang dulu tercampur di layar ini:
                  1. "Total Saldo" (kartu dompet + panel Overview) = SELURUH dompet;
                  2. saldo konteks yang sedang dipilih — itulah kenapa daftar di
                     halaman lain lebih pendek.
                Baris ini menjelaskan (2), jadi user tidak menyimpulkan totalnya
                salah. Sama-sama lewat `money()` supaya tombol mata tetap berlaku. */}
            <p className="mt-2 text-[11.5px] font-medium text-ink/55">
              {HOME_TOTAL_COPY.contextLine(contextLabel, money(contextTotal))}
              <span className="text-ink/35"> · {HOME_TOTAL_COPY.scopeNote}</span>
            </p>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            {/* Pencarian transaksi (desktop). Dulu kolom mati: bisa diketik, tapi
                tidak ada value/onChange + tidak ada tujuan. Sekarang form
                sungguhan menuju /history membawa `?q=` — halaman yang memang
                memiliki pencariannya (app/history/page.tsx). Enter dan tombol
                panah dua-duanya mengirim. */}
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="flex h-11 w-48 items-center gap-2.5 rounded-full bg-cream px-3.5 ring-1 ring-soil/12 transition-shadow focus-within:ring-2 focus-within:ring-forest/30 xl:w-64"
            >
              <Search className="size-4 shrink-0 text-ink/40" aria-hidden />
              <input
                type="search"
                name={HISTORY_SEARCH_PARAM}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={HOME_HEADER_COPY.searchPlaceholder}
                aria-label={HOME_HEADER_COPY.searchAria}
                className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
              />
              <button
                type="submit"
                aria-label={HOME_HEADER_COPY.searchSubmit}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest text-mint transition-colors hover:bg-forest-soft"
              >
                <ArrowRight className="size-3.5" strokeWidth={2.6} aria-hidden />
              </button>
            </form>
            {/* Global Eye — sensor SEMUA nominal di layar (KRL/kafe friendly) */}
            <GlobalPrivacyToggle />
            {/* Notifikasi: dot tetap jadi penanda "ada yang baru", tapi tombolnya
                kini benar-benar menuju halaman pengaturannya. Route-nya sudah ada
                sejak dulu (`/settings/notifications` → `NotificationSettings` yang
                tersambung Web Push) — yang kurang cuma tautannya. */}
            <Link
              href="/settings/notifications"
              aria-label={HOME_HEADER_COPY.notificationsLabel}
              className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
            >
              <Bell className="size-4" aria-hidden />
              <span className="absolute right-3 top-3 size-2 rounded-full bg-mint ring-2 ring-cream" />
            </Link>
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-soil/12">
              <Image src="/avatar-maarif.png" alt="Jon Snow" fill sizes="44px" className="object-cover" />
            </span>
          </div>
        </div>
        {/* banner conditional: masa aktif / kuota AI / sinking fund (HomeBanners)
            + rekap mingguan akhir pekan (WeeklyRecapBanner). Dua-duanya hanya
            muncul saat kondisinya terpenuhi, jadi tinggi halaman ikut menyesuaikan. */}
        <div className="mt-4 space-y-2.5 lg:mt-5">
          <HomeBanners
            renewalState={renewal.state}
            renewalHandled={renewal.renewed}
            onOpenRenewal={renewal.openModal}
          />
          <WeeklyRecapBanner onOpen={openRecap} />
          {/* kartu target bulan ini — efek NYATA dari ritual Monthly Review dan
              satu-satunya jalan membukanya lagi setelah auto-popup 1–3 lewat.
              `monthly.ready` menahan render sampai penanda localStorage dibaca,
              supaya kartunya tidak berkedip dari "belum ada" ke nominalnya. */}
          {monthly.ready && (
            <MonthlyTargetCard
              savedThisMonth={monthly.savedThisMonth}
              amount={monthly.saved?.amount ?? 0}
              fundId={monthly.saved?.fundId ?? null}
              onOpen={monthly.openModal}
            />
          )}
        </div>

        {/* ── baris 1 ────────────────────────────────────────────────────────
            Hierarki visual baru: kartu dompet DIPERKECIL (7 → 5 kolom) karena
            saldo dompet sifatnya pasif, sementara kolom Jatah Hari Ini dapat
            7 kolom (dulu 5) — plus slot Nudge AI di bawahnya. Jatah Harian
            adalah alasan user membuka app 3x sehari, jadi ia yang dominan. */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-5">
            <div className="flex h-full flex-col justify-center rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-5">
              <WalletCardStack onOpen={handleDeckOpen} />
            </div>
          </div>
          <div className="flex flex-col gap-5 lg:col-span-7">
            <DailyHudCard />
            <DailyNudge />
          </div>
        </div>

        {/* ── baris 2: tanaman (metafora pertumbuhan) + arus uang dua seri ──── */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
          <div className="h-full lg:col-span-5">
            <PlantWidget onReplayCelebration={celebration.replay} />
          </div>
          <div className="h-full lg:col-span-7">
            <CashFlowCard />
          </div>
        </div>

        {/* ── baris 3: transaksi terakhir + distribusi & tabungan impian ────── */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
          <div className="h-full lg:col-span-7">
            <RecentTransactionsCard />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <ExpenseDistributionCard />
            <MyGoalsCard />
          </div>
        </div>
      </div>
      <OverviewPanel
        open={overviewOpen}
        onClose={closeOverview}
        selection={overviewSelection ?? undefined}
        allTotal={total}
      />
      {/* `onSetTarget` = CTA "Atur target nabung" di slide Rencana Minggu Depan.
          Home punya modal targetnya (`useMonthlyReview`), jadi recap cuma minta
          — Home yang menutup recap lalu membuka modalnya. `/history` sekarang
          melakukan hal yang sama lewat hook yang sama (paket 32), jadi prop ini
          terisi di dua tempat dan tidak ada lagi label yang mendarat di
          halaman lain. */}
      <WeeklyRecapModal open={recapOpen} onClose={closeRecap} onSetTarget={handleSetRecapTarget} />
      {/* ritual bulanan (inventaris #i): auto-popup tanggal 1–3 saja.
          `!renewal.open` = modal ini MENUNGGU modal Renewal ditutup dulu supaya
          user tidak dihadapkan dua popup bertumpuk di layar yang sama. */}
      <MonthlyReviewModal
        open={monthly.open && !renewal.open}
        monthKey={monthly.monthKey}
        saved={monthly.saved}
        onClose={monthly.close}
        onSave={monthly.saveTarget}
      />
      {/* modal perpanjangan: muncul sendiri 1x di H-1, bisa dibuka ulang dari
          banner Renewal di atas — sumber kondisi & harganya lib/data/renewal.ts */}
      <RenewalModal
        open={renewal.open}
        state={renewal.state}
        onDismiss={renewal.dismiss}
        onRenewed={renewal.markRenewed}
      />
      {/* perayaan milestone (inventaris #k) — auto-dismiss ~2.5 detik, bisa
          langsung ditutup, dan milestone yang sama tidak muncul dua kali
          (penanda di `milestoneStorageKey()`). Pintu meninjau ulangnya ada di
          Plant Detail: tombol "Lihat perayaan" di dalam kartu tanaman. */}
      <MilestoneCelebration
        open={celebration.open && !celebrationBlocked}
        milestone={celebration.milestone}
        onClose={celebration.dismiss}
      />
    </ScreenShell>
  )
}
