import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { usePrivacy } from './privacy-provider'
import {
  HOME_HUD_COPY,
  HUD_COPY,
  MONEY_SETTINGS_HREF,
  TODAY_ISO,
  SPENDING_REVIEW_COPY,
  computeDailyHud,
  hudStatusFor,
  periodIncome,
  periodWindowForTab,
  spentInWindow,
  spentOn,
  type HudStatus,
} from '@/lib/data/budget'
import { useLiveFunds } from '@/lib/money/funds-store'
import { useMoneyStore } from '@/lib/money/store'
import { recordedTransactionsForContext } from '@/lib/money/context-filter'
import { useMoneyContext } from './money-context-provider'
import { hasConfiguredIncome, useUserMoneySettings } from '@/lib/user-money-settings'
import { useTodayISO } from '@/lib/use-today-iso'
import { openAICoachWithSeed } from '@/lib/ai-chat-bus'
import { formatIDR } from '@/lib/wallets'
import { LockedAmount } from './locked-amount'

/* ── Kartu Jatah Hari Ini (Home) ─────────────────────────────────────────────
   Angkanya TIDAK ditulis di kartu ini: semuanya datang dari `computeDailyHud()`
   di `lib/data/budget.ts`, rumus yang SAMA dengan kartu di tab Bulanan /budget.

   PAKET 57 — sumber angkanya berubah, dan itu inti audit AKAR D:

     · pemasukan & cicilan → KONFIGURASI USER (`lib/user-money-settings.ts`,
       diisi di onboarding atau Pengaturan), bukan `MONTHLY_INCOME` 7.500.000;
     · uang keluar         → baris ledger NYATA (`recordedTransactions()`), bukan
       `SPENT_THIS_MONTH` 2.300.000 — jadi mencatat pengeluaran Rp 50.000
       benar-benar menurunkan jatah harian;
     · kewajiban celengan  → daftar celengan yang HIDUP (`useLiveFunds()`;
       tombstone celengan yang dihapus user tidak ikut dipotong — paket 60.2);
     · jendela periode     → `periodWindowForTab("monthly", todayISO())`.

   PAKET 58 — bentuknya DIPADATKAN (58.5 · permintaan user). Kartu ini dulu
   memakai ring 104px + saldo `text-3xl` + tiga baris footer, sehingga tingginya
   mendikte tinggi baris pertama Home. Sekarang bentuknya: ANGKA UTAMA (28px)
   + satu bar progres + SATU baris konteks (sisa · hari tersisa · cicilan).
   Yang TIDAK hilang: judul, subjudul, chip status, caption angka, persen
   terpakai, sisa periode, hari tersisa, cicilan, dan CTA Review saat lewat
   jatah. Bar-nya memakai `role="progressbar"` + `aria-valuenow` (lebih baik
   daripada ring yang dulu `aria-hidden`), animasinya dihormati
   `prefers-reduced-motion` lewat `motion-reduce:transition-none`.

   Baris copy status (`STATUS.copy`) dirender saat status ≠ `onTrack` — chip
   statusnya sendiri selalu ada; saat on-track kalimat itu hanya pengulangan
   yang menambah tinggi, dan kanon 58.5 meminta "angka utama + 1 baris konteks
   + bar progres". */

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup (lihat catatan di
 *  cash-flow-card.tsx). Membaca context privasi global untuk menyensor nominal. */
/* Nominal di kartu ini DISENSOR di tempat (paket 59 · 59.5): dulu `hide(fmt(...))`
   mengganti stringnya, sehingga "Rp 85.000" → "Rp •••••••" mengubah lebar teks
   dan baris di sekitarnya ikut bergeser tiap kali tombol mata ditekan. Sekarang
   pemformatnya `formatIDR()` (formatter kanon repo — bukan `toLocaleString`
   lokal) dan penyensornya `<LockedAmount/>`, yang mengunci lebar ke teks
   terpanjang di antara angka & titiknya. */
export const DailyHudCard = memo(function DailyHudCard() {
  const { masked } = usePrivacy()
  /* "hari ini" dari jam perangkat — `''` pada render pertama (hidrasi aman) */
  const today = useTodayISO()
  /* konfigurasi uang user + celengan hidup + baris ledger NYATA */
  const settings = useUserMoneySettings()
  const funds = useLiveFunds()
  const snapshot = useMoneyStore()
  const { context } = useMoneyContext()
  const ledger = useMemo(
    () => recordedTransactionsForContext(snapshot, context),
    [snapshot, context],
  )

  /* jendela bulan berjalan: panjang pembagi & posisi hari ini ikut tanggal asli */
  const window = useMemo(() => periodWindowForTab('monthly', today || TODAY_ISO), [today])
  const spent = useMemo(() => spentInWindow(ledger, window), [ledger, window])
  /* uang keluar HARI INI saja — dipakai turunan "sisa jatah hari ini" & bar
     (paket 66), supaya mencatat pengeluaran hari ini LANGSUNG terlihat. */
  const spentToday = useMemo(() => spentOn(ledger, today || window.startISO), [ledger, today, window])

  const configured = hasConfiguredIncome(settings)
  const hud = useMemo(
    () =>
      computeDailyHud({
        monthlyIncome: settings.monthlyIncome,
        totalInstallments: settings.totalInstallments,
        sinkingFunds: funds,
        spent,
        spentToday,
        window,
      }),
    [settings.monthlyIncome, settings.totalInstallments, funds, spent, spentToday, window],
  )
  /* pemasukan periode = konfigurasi user ATAU catatan nyata di jendela ini */
  const income = useMemo(
    () => periodIncome(window, ledger, settings.monthlyIncome),
    [window, ledger, settings.monthlyIncome],
  )

  /* ── "TERPAKAI" = PEMAKAIAN JATAH HARI INI (paket 66) ──────────────────────
     Dulu bar ini mengukur kolam PERIODE (`periodUsagePct`): pengeluaran
     Rp 600.000 di kolam puluhan juta cuma 2%, dan angka utama (rata-rata sisa
     periode ÷ hari) juga nyaris tak bergerak — dua-duanya jadi terasa "tidak
     nyambung" dengan catatan user. Sekarang bar & angka utama bicara soal HARI
     INI (`hud.todayUsedPct`), jadi satu catatan langsung menggerakkan kartu. */
  const usedPct = hud.todayUsedPct
  /* status kanon PRD 2B.2 dari SATU fungsi murni (`hudStatusFor`, paket 76) —
     chip status & warna meter memakai ambang yang sama, jadi mustahil berbeda */
  const status: HudStatus = hudStatusFor(usedPct)
  const STATUS = HOME_HUD_COPY.status[status]

  return (
    <section
      data-catetind-jatah="hari-ini"
      aria-label={HOME_HUD_COPY.title}
      /* `flex-1` (bukan `h-full`): kartu ini hidup di dalam sel grid yang
         `flex flex-col` bersama `DailyNudge`, jadi ia harus TUMBUH mengisi sisa
         tinggi sel — pasangan ROW 3 (bento 50/50) jadi sama tinggi dengan
         "Distribusi Pengeluaran" tanpa satu piksel ruang mati. */
      className="flex flex-1 flex-col rounded-2xl bg-cream p-4 ring-1 ring-soil/12 sm:p-5"
    >
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-forest-muted">{HOME_HUD_COPY.title}</p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            status === 'onTrack' && 'bg-hud-sage/15 text-hud-sage',
            status === 'approaching' && 'bg-hud-amber/15 text-hud-terracotta',
            status === 'over' && 'bg-hud-terracotta/15 text-hud-terracotta',
          )}
        >
          {STATUS.label}
        </span>
      </div>

      {!configured ? (
        /* ── BELUM DIATUR — paling jujur: jangan tampilkan angka contoh ──── */
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-cream px-6 py-6 text-center ring-1 ring-soil/8">
          <p className="text-[14px] font-medium text-forest">{HUD_COPY.notConfiguredTitle}</p>
          <Link
            href={MONEY_SETTINGS_HREF}
            aria-label={HUD_COPY.notConfiguredA11y}
            className="mt-4 flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
          >
            <Settings2 className="size-4" strokeWidth={2.4} aria-hidden />
            {HUD_COPY.notConfiguredCta}
          </Link>
        </div>
      ) : !income.hasIncome ? (
        /* ── Dry Spell (PRD 2B.3) — pemasukan belum masuk di periode ini ── */
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-cream px-6 py-6 text-center ring-1 ring-soil/8">
          <p className="text-[14px] font-medium text-forest">{HUD_COPY.drySpellTitle}</p>
          <TransactionBottomSheet
            defaultType="income"
            trigger={
              <button
                type="button"
                className="mt-4 flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
              >
                {HUD_COPY.drySpellCta}
              </button>
            }
          />
        </div>
      ) : hud.shortfall ? (
        /* ── Jatah ditahan (audit UX #2) — jangan pernah "Rp 0" tanpa sebab */
        <div className="mt-5 rounded-2xl bg-hud-terracotta/[0.08] px-4 py-6 text-center ring-1 ring-hud-terracotta/20">
          <p className="text-base font-medium text-hud-terracotta">{HUD_COPY.shortfallBadge}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-forest-muted">{HUD_COPY.shortfallBody}</p>
        </div>
      ) : (
        /* ── HUD PADAT (58.5 · 66): angka utama + bar progres ────────────────
           Angkanya `remainingToday` (sisa jatah HARI INI) dan bar-nya
           `todayUsedPct` — dua-duanya turunan `computeDailyHud` yang SAMA dengan
           /budget. Caption "sisa jatah hari ini", subjudul "Budget harian
           dinamis", baris "Sisa bulan · n hari lagi · Cicilan terpotong", dan
           tautan "Atur pemasukan & cicilan" DIHAPUS (permintaan pemilik produk):
           judul kartu sudah jelas, dan pembagi jatah diatur dari Pengaturan. */
        <>
          {/* ── ANGKA UTAMA = FOKUS TIPOGRAFI KARTU (mandat bento 68) ─────────
              Sisa jatah HARI INI dibesarkan (40px, semibold, tracking rapat) dan
              ditempatkan di ruang yang tumbuh (`flex-1`), jadi ia jadi
              satu-satunya pusat pandang kartu — bukan bar atau ring. */}
          <div className="mt-4 flex flex-1 flex-col justify-center">
            <p className="text-[40px] font-semibold leading-none tracking-tight text-forest tabular-nums">
              <LockedAmount value={formatIDR(hud.remainingToday)} masked={masked} />
            </p>
          </div>

          {/* ── SATU BILAH PROGRES TIPIS + SATU BARIS KONTEKS ────────────────
              Mandat "Jatah Hari Ini" minimalis: angka besar di atas, satu bar
              ramping, lalu satu keterangan super singkat (sisa hari menuju
              gajian). Kotak-kotak kecil "Keluar hari ini" dan "Sisa periode"
              DICABUT — dua angka pendukung itu hanya menambah kepadatan visual
              tanpa mengubah keputusan user di layar ini. */}
          <div className="mt-5">
            <div
              role="progressbar"
              aria-label={HOME_HUD_COPY.title}
              aria-valuenow={Math.min(100, Math.round(usedPct * 100))}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.07]"
            >
              <span
                className={cn(
                  'block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                  status === 'over' ? 'bg-hud-terracotta' : 'bg-forest',
                )}
                style={{ width: `${Math.min(100, Math.max(usedPct * 100, 1))}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] font-medium text-forest-muted">
              {hud.daysLeft} {HOME_HUD_COPY.daysLeftSuffix}
            </p>
          </div>

          {/* kalimat status: hanya saat statusnya perlu dibicarakan (chip status
              selalu tampil di header) */}
          {status !== 'onTrack' && (
            <p className="mt-2 text-[12.5px] font-medium leading-snug text-forest-soft">{STATUS.copy}</p>
          )}

          {/* CTA ke AI Coach saat over — tanpa ikon hiasan */}
          {status === 'over' && (
            <button
              type="button"
              onClick={() => openAICoachWithSeed(SPENDING_REVIEW_COPY.coachSeed)}
              className="mt-2 flex w-fit items-center rounded-full bg-hud-terracotta/10 px-3 py-1.5 text-[12.5px] font-medium text-hud-terracotta transition-colors hover:bg-hud-terracotta/20"
            >
              {HOME_HUD_COPY.reviewCta}
            </button>
          )}
        </>
      )}
    </section>
  )
})
