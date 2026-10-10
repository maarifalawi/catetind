'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { WalletCardStack } from './wallet-card-stack'
import { CashFlowCard } from './cash-flow-card'
import { DailyHudCard } from './daily-hud-card'
import { DailyNudge } from './daily-nudge'
import { GlobalPrivacyToggle } from './global-privacy-toggle'
import { NotificationBell } from './notification-bell'
import { PlantWidget } from './plant-widget'
import { ContextMenu } from './context-menu'
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
import { cashTotal, useMoneyStore } from '@/lib/money/store'
import type { DeckSelection } from '@/lib/wallets'
import { HISTORY_SEARCH_PARAM, historySearchHref } from '@/lib/data/history'
import { HOME_HEADER_COPY } from '@/lib/data/home'

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
    /* Jam perangkat dibaca SETELAH mount (hidrasi aman) DAN diperbarui tiap
       menit. Dulu nilainya dipasang sekali saja, jadi sapaan menempel di
       "Selamat pagi" sepanjang tab dibiarkan terbuka — keluhan nyata pemilik
       produk: "udah sore, tulisannya masih selamat pagi". Satu interval kecil
       di komponen ini cukup: ia satu-satunya pemakai `now`. */
    const tick = () => setNow(new Date())
    tick()
    const timer = window.setInterval(tick, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const snapshot = useMoneyStore()
  /* Deck dompet & total saldonya dari SATU store uang. Dulu Home menjumlahkan
     daftar dompet versi Home (Rp 4.309.573) sementara Dompet & Kekayaan memakai
     daftar versi halaman Dompet (Rp 1.850.000) — dua angka untuk satu user
     (temuan audit #1 & #2). Sekarang angkanya turunan `opening + Σ baris ledger`.

     PAKET 44 — konteks uang TIDAK LAGI menyentuh angka total:
       · `total`        = `cashTotal(snapshot)` = SELURUH dompet, sama dengan
                          hero `/wallet` & kas likuid Kekayaan;
       · `contextWallets` = daftar dompet KONTEKS AKTIF (chip jumlah dompet) —
                             angka yang SAMA dengan deck & badge /wallet.
     PAKET 64 menghapus baris kecil "Dompet Pribadi: Rp X · Total Saldo = semua
     dompet" dari header: chip di bawah Context Switcher cukup memuat dua fakta
     ringan (jumlah dompet & jumlah transaksi), dan angka total sudah punya
     tempatnya sendiri di kartu dompet + panel Overview. */
  /* PAKET 70 — `contextWallets` & `transactions` DIHAPUS bersama chip
     "N dompet · N transaksi". `total` tetap: ia dipakai panel Overview sebagai
     angka SELURUH dompet (konteks uang tidak pernah menyentuhnya). */
  const total = useMemo(() => cashTotal(snapshot), [snapshot])

  const hour = now?.getHours() ?? 12
  const sapaan = !now ? 'Selamat datang' : hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'

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
        {/* PAKET 75: header mobile MILIK DASHBOARD DIHAPUS. Dulu di sini ada
            `MobileStickyHeader` dengan logo + tombol mata + lonceng + hamburger +
            AVATAR. Sekarang semuanya disediakan SATU header mobile GLOBAL yang
            dirender `ScreenShell` (`app-mobile-header`) untuk semua halaman —
            termasuk Dashboard — dan avatar profilnya dicabut (permintaan produk).
            Isi halaman ini mulai dari baris konteks di bawah. */}
        {/* switcher konteks — state GLOBAL (audit UX #6). Di MOBILE ia duduk di
            barisnya sendiri (menu dropdown label-penuh, paket 65 — tidak ada lagi
            label terpotong "Kelua…"); di DESKTOP ia pindah ke cluster aksi,
            tepat DI SAMPING kolom search. Dulu versi desktopnya ada di Sidebar,
            tapi blok "Konteks Uang" dihapus dari Sidebar → di desktop switcher-nya
            hilang sama sekali dan konteks terkunci di "Pribadi" (audit 46).
            Sengaja TIDAK sticky: saat halaman di-scroll ia ikut naik. */}
        <div className="mt-4 flex justify-center lg:hidden">
          <ContextMenu value={moneyCtx} onChange={setContext} className="w-56" />
        </div>
        {/* Metadata ringkas — PAKET 70: chip "N dompet · N transaksi" DIHAPUS
            dari Dashboard (mobile maupun desktop) atas permintaan pemilik produk:
            dua angka itu bukan keputusan yang diambil user di layar ini, dan jumlah
            transaksinya menyesatkan karena daftar di layar ini cuma 7 hari terakhir.
            Definisi HOME_TOTAL_COPY.walletsChip/transactionsChip tetap ada di
            lib/data/home.ts — dipakai halaman Dompet & Akun. */}
        {/* keadaan kosong (paket 43): hanya muncul setelah akun dihapus — lihat
            komponennya untuk alasan mengapa satu kalimat ini wajib ada */}
        <EmptyAccountNotice />
        <div className="mt-4 lg:mt-0 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0">
            {/* sapaan khusus desktop — di mobile blok ini dihilangkan supaya user
                langsung sampai ke kartu dompet. Baris tanggal panjang
                ("Senin, 5 Oktober 2026") DIHAPUS (permintaan pemilik produk):
                di layar ini ia tidak menambah keputusan apa pun. */}
            <h1 className="hidden font-display text-3xl font-semibold tracking-tight text-forest lg:block lg:text-4xl">
              {sapaan}, Jon 🌿
            </h1>
            {/* meta ringkas sebagai chip — di DESKTOP saja (mobile punya baris
                sendiri yang di-TENGAHKAN di bawah Context Switcher) */}
            <div className="hidden flex-wrap items-center gap-2 lg:mt-3 lg:flex">
              {/* chip "N dompet · N transaksi" dihapus di paket 70 (lihat catatan
                  di header mobile di atas) — yang tersisa di cluster ini cuma
                  kontrol yang benar-benar dipakai user desktop: konteks uang. */}
              {/* ── KONTEKS UANG (audit 46) ────────────────────────────────────
                  Dulu di sini chip BACAAN "Pribadi", lalu segmented control yang
                  MEMOTONG label panjang. Sejak paket 65 kontrol konteks pindah ke
                  cluster aksi — DI SAMPING kolom search — dalam bentuk menu
                  dropdown label-penuh (`ContextMenu`). State-nya tetap
                  `useMoneyContext()` yang sama. */}
            </div>
            {/* ── KONTEKS AKTIF (paket 44) ─────────────────────────────────────
                DIHAPUS di paket 64. Baris sementara "Dompet Pribadi: Rp X · Total
                Saldo = semua dompet" terlalu bertele-tele untuk header: chip di
                bawah Context Switcher (mobile) & di cluster ini (desktop) sudah
                memuat dua fakta yang benar-benar dibutuhkan, dan angka totalnya
                sudah punya tempat sendiri di kartu dompet + panel Overview. */}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            {/* Pencarian transaksi (desktop). Dulu kolom mati: bisa diketik, tapi
                tidak ada value/onChange + tidak ada tujuan. Sekarang form
                sungguhan menuju /history membawa `?q=` — halaman yang memang
                memiliki pencariannya (app/history/page.tsx). Enter dan tombol
                panah dua-duanya mengirim. */}
            {/* kontrol konteks uang (paket 65) — DI SAMPING kolom search, menu
                dropdown label-penuh supaya "Keluarga"/"Bersama" tidak terpotong */}
            <ContextMenu value={moneyCtx} onChange={setContext} className="w-44" />
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="flex h-11 w-48 items-center gap-2.5 rounded-full bg-cream px-3.5 ring-1 ring-soil/12 transition-shadow focus-within:ring-2 focus-within:ring-forest/30 xl:w-64"
            >
              <Search className="size-4 shrink-0 text-forest/40" aria-hidden />
              <input
                type="search"
                name={HISTORY_SEARCH_PARAM}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={HOME_HEADER_COPY.searchPlaceholder}
                aria-label={HOME_HEADER_COPY.searchAria}
                className="w-full min-w-0 bg-transparent text-sm text-forest outline-none placeholder:text-forest/35"
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
            {/* Lonceng notifikasi → panel keadaan kosong (paket 64). Halaman
                pengaturannya tetap terjangkau lewat CTA di dalam panel. */}
            <NotificationBell />
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-soil/12">
              <Image src="/avatar-maarif.png" alt="Jon Snow" fill sizes="44px" className="object-cover" />
            </span>
          </div>
        </div>
        {/* ── SUSUNAN BENTO GRID 12 KOLOM, DI-TENGAHKAN (paket 68) ────────────
            Desktop memakai bento grid 12 kolom YANG DI-TENGAHKAN (`max-w-1400px`
            + `mx-auto`) dengan EMPAT baris terurut atas→bawah dan NOL ruang mati:
              ROW 1 · Dompet (6/12) + Arus Uang (6/12) — 50/50;
              ROW 2 · Transaksi Terakhir (12/12) — daftarnya multi-kolom;
              ROW 3 · Jatah Hari Ini (6/12) + Distribusi Pengeluaran (6/12);
              ROW 4 · Tabungan Impian (6/12) + Tanamanmu (6/12).
            Tiap sel `h-full`/`flex-1` supaya kartunya benar-benar MENGISI sel
            (bukan sekadar duduk di atasnya). Posisi desktop dipatok lewat
            `lg:col-start-*` + `lg:row-start-*`, jadi TIDAK bergantung urutan DOM;
            di MOBILE urutan dijaga `order-*` yang direset `lg:order-none` — satu
            versi markup untuk dua breakpoint. */}
        <div className="flex flex-col">
          {/* banner conditional: masa aktif / kuota AI / sinking fund — sengaja
              di LUAR bento grid supaya terbaca sebagai strip notifikasi teratas */}
          <div className="mt-4 space-y-2.5 lg:mt-5">
            <HomeBanners
              renewalState={renewal.state}
              renewalHandled={renewal.renewed}
              onOpenRenewal={renewal.openModal}
            />
            {/* Rekap mingguan & target bulan ini DIPINDAH ke strip ini (paket
                68). Keduanya memang berbentuk strip notifikasi/CTA — bukan kartu
                data — dan memindahkannya membebaskan bento grid supaya persis
                EMPAT baris sesuai mandat: ROW 1 dompet + arus uang, ROW 2
                transaksi, ROW 3 jatah + distribusi, ROW 4 tabungan + tanaman.
                Perilaku & kondisinya TIDAK berubah: `monthly.ready` tetap
                menahan render sampai penanda localStorage dibaca supaya kartu
                target tidak berkedip dari "belum ada" ke nominalnya. */}
            <WeeklyRecapBanner onOpen={openRecap} />
            {monthly.ready && (
              <MonthlyTargetCard
                savedThisMonth={monthly.savedThisMonth}
                amount={monthly.saved?.amount ?? 0}
                fundId={monthly.saved?.fundId ?? null}
                onOpen={monthly.openModal}
              />
            )}
          </div>

          {/* ── BENTO GRID 12 KOLOM (paket 68 · mandat bento) ────────────────── */}
          <div className="mx-auto mt-5 grid w-full max-w-[1400px] grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-12 lg:gap-6">
            {/* ── ROW 1 · DOMPET (6/12, kolom 1) ───────────────────────────────
                SETENGAH lebar: 4/12 terbukti terlalu sempit untuk tumpukan kartu
                3D dompet, jadi ia dipulihkan ke 6/12 (ukuran yang dulu memang
                diminta pemilik produk — "dompet setengah layar"). `h-full` di
                sel + di pembungkus `p-4` supaya tepinya sejajar sel tetangga.
                Di MOBILE ia kartu PERTAMA (order-1). */}
            <div className="order-1 h-full lg:order-none lg:col-span-6 lg:col-start-1 lg:row-start-1">
              <div className="h-full rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12">
                <WalletCardStack onOpen={handleDeckOpen} />
              </div>
            </div>
            {/* ── ROW 1 · ARUS UANG (6/12, kolom 7–12) ──────────────────────────
                Sepasang 50/50 dengan Dompet (yang dilebarkan atas permintaan
                pemilik produk). Grafik garis minimalis tetap dapat ~660px di
                layar lebar — lebih dari cukup. `h-full` membuatnya sama tinggi
                dengan Dompet (kartu `flex-1` + grafik `flex-1` ⇒ tanpa ruang
                mati). Di MOBILE baris kedua (order-2). */}
            <div className="order-2 h-full lg:order-none lg:col-span-6 lg:col-start-7 lg:row-start-1">
              <CashFlowCard />
            </div>
            {/* ── ROW 2 · TRANSAKSI TERAKHIR — membentang PENUH 12 kolom ───────
                Isinya dibatasi di dalam kartunya (maks baris + 7 hari terakhir)
                DAN disebar multi-kolom, jadi tidak ada satu baris pun yang
                terasa melar di lebar penuh. Di MOBILE (order-3). */}
            <div className="order-3 lg:order-none lg:col-span-12 lg:col-start-1 lg:row-start-2">
              <RecentTransactionsCard />
            </div>
            {/* ── ROW 3 · JATAH HARI INI (+ Nudge AI) — kiri 6/12 ──────────────
                `h-full` + `flex flex-col`: DailyHudCard (`flex-1`) tumbuh mengisi
                sel, jadi tingginya PERSIS sama dengan Distribusi Pengeluaran di
                sebelahnya (bento 50/50). Di MOBILE (order-4). */}
            <div className="order-4 flex h-full flex-col gap-5 lg:order-none lg:col-span-6 lg:col-start-1 lg:row-start-3 lg:gap-6">
              <DailyHudCard />
              <DailyNudge />
            </div>
            {/* ── ROW 3 · DISTRIBUSI PENGELUARAN — kanan 6/12 ──────────────────
                Daftar bar horizontal bulat (bukan pie/donut). Di MOBILE (order-5). */}
            <div className="order-5 h-full lg:order-none lg:col-span-6 lg:col-start-7 lg:row-start-3">
              <ExpenseDistributionCard />
            </div>
            {/* ── ROW 4 · TABUNGAN IMPIAN — kiri 6/12 ──────────────────────────
                Kartunya sudah `h-full` ⇒ daftar celengan mengisi sel. Di MOBILE
                (order-6). */}
            <div className="order-6 h-full lg:order-none lg:col-span-6 lg:col-start-1 lg:row-start-4">
              <MyGoalsCard />
            </div>
            {/* ── ROW 4 · TANAMANMU — kanan 6/12 ───────────────────────────────
                SEPASANG 50/50 dengan Tabungan Impian — tata letak ini FINAL
                (permintaan pemilik produk). Saat tahap 4 "Berbunga", yang berubah
                adalah BENTUK di dalam kartunya (ilustrasi jadi latar penuh yang
                rimbun), BUKAN lebar kolomnya: kartu tetap 6/12 supaya barisnya
                tidak menyisakan lubang. Di MOBILE (order-7). */}
            <div className="order-7 h-full lg:order-none lg:col-span-6 lg:col-start-7 lg:row-start-4">
              <PlantWidget onReplayCelebration={celebration.replay} />
            </div>
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
