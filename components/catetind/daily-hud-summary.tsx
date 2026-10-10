'use client'

import Link from 'next/link'
import { AlertTriangle, CalendarDays, HandCoins, Settings2, Sparkles } from 'lucide-react'
import {
  HUD_COPY,
  MONEY_SETTINGS_HREF,
  maskNominal,
  periodUsagePct,
  type BudgetHud,
  type PeriodIncome,
  type PeriodWindow,
} from '@/lib/data/budget'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { HudRing } from './hud-ring'

/* ── Jatah Hari Ini — KARTU SUPER-HERO (full-width, di atas dua kolom) ───────
   Audit UX #3: Jatah Harian adalah metrik GLOBAL (pemasukan − cicilan −
   celengan − pengeluaran), jadi tidak boleh dikurung di dalam kolom "Budget
   Kategori". Kartu ini membentang penuh SEBELUM halaman terbelah dua.

   Audit UX #2: angkanya dihitung SETELAH sinking fund. Kalau saldo tidak cukup
   memenuhi target celengan bulan ini, kartunya pindah ke nada terracotta dan
   jatah harian DITAHAN (bukan ditampilkan seolah aman dibelanjakan).

   Audit UX #5: tombol "Sinkron Dashboard" dihapus — app punya satu sumber
   kebenaran. Penggantinya dulu tombol "Pin ke Dashboard"; PAKET 60.3 menghapus
   juga tombol itu, karena ia hanya membalik state halaman /budget sementara
   `DailyHudCard` di Home tidak menerima prop apa pun (lihat `HUD_COPY`).

   Sejak periode non-bulanan hidup (2B untuk freelancer), kartu ini juga
   menampilkan PERIODE AKTIF + rentang tanggalnya (`window.label`), memakai
   jendela yang sama dengan daftar budget di bawahnya. Pacing-nya makanya selalu
   pas: tab Mingguan membagi sisa uang dengan sisa hari MINGGU itu. */

/** chip periode aktif — satu tempat supaya ketiga varian kartu seragam.
 *  `tone="dark"` dipakai hero evergreen gelap (redesain paket 82) supaya chip-nya
 *  tetap terbaca di atas permukaan forest. */
function PeriodChip({
  window: period,
  tone = 'light',
}: {
  window: PeriodWindow
  tone?: 'light' | 'dark'
}) {
  return (
    <span
      className={
        tone === 'dark'
          ? 'inline-flex items-center gap-1.5 rounded-full bg-cream/12 px-2.5 py-1 text-[10.5px] font-medium text-cream/80 ring-1 ring-cream/15'
          : 'inline-flex items-center gap-1.5 rounded-full bg-sage/70 px-2.5 py-1 text-[10.5px] font-medium text-forest ring-1 ring-soil/8'
      }
    >
      <CalendarDays className="size-3" strokeWidth={2.6} aria-hidden />
      {period.label}
    </span>
  )
}

export function DailyHudSummary({
  hud,
  masked,
  window: period,
  income,
}: {
  hud: BudgetHud
  masked: boolean
  /** periode aktif — sumber label, rentang tanggal, & panjang pembagi pacing */
  window: PeriodWindow
  /** pemasukan di jendela periode (dry spell & catatan pemasukan tengah periode) */
  income: PeriodIncome
}) {
  /** porsi kolam PERIODE yang sudah terpakai (0..1) — dasar bar di hero */
  const periodPct = periodUsagePct(hud.availablePool, hud.spent)
  return (
    <section aria-label={HUD_COPY.title} className="w-full">
      {!income.configured ? (
        /* ── BELUM DIATUR (paket 57) — bukan Dry Spell ───────────────────────
            Pemasukan bulanan belum pernah diisi → jatah harian memang tidak bisa
            dihitung dari apa pun. Kartu ini jujur menyebut kenapa kosong dan
            menunjuk satu pintu masuk: field PEMASUKAN BULANAN + TOTAL CICILAN
            BULANAN di Pengaturan → Profil & Akun (paket 57.4). Angka contoh TIDAK
            ditampilkan, karena itulah temuan AKAR D audit 2026-09. */
        <div className="relative overflow-hidden rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 shadow-[0_20px_44px_-36px_rgba(0,0,0,0.5)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-mint/15 blur-3xl"
          />
          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-forest/60">
              <span className="flex size-6 items-center justify-center rounded-full bg-mint/25 text-forest">
                <HandCoins className="size-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              {HUD_COPY.title}
            </span>
            <PeriodChip window={period} />
          </div>
          <div className="relative mt-4 flex flex-col items-center rounded-[1.25rem] bg-sage/40 px-6 py-7 text-center ring-1 ring-soil/8">
            <span className="flex size-12 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/8">
              <Settings2 className="size-5" strokeWidth={2.2} aria-hidden />
            </span>
            <p className="mt-3 text-[14.5px] font-medium leading-snug text-forest">
              {HUD_COPY.notConfiguredTitle}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-forest/55">
              {HUD_COPY.notConfiguredBody}
            </p>
            <Link
              href={MONEY_SETTINGS_HREF}
              aria-label={HUD_COPY.notConfiguredA11y}
              className="mt-4 rounded-full bg-forest px-4 py-2.5 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
            >
              {HUD_COPY.notConfiguredCta}
            </Link>
          </div>
        </div>
      ) : !income.hasIncome ? (
        /* ── 3B. DRY SPELL — menggantikan SELURUH HUD (tanpa Rp 0/hari) ──── */
        <div className="relative overflow-hidden rounded-[1.75rem] bg-cream p-5 ring-1 ring-soil/12 shadow-[0_20px_44px_-36px_rgba(0,0,0,0.5)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-mint/15 blur-3xl"
          />
          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-forest/60">
              <span className="flex size-6 items-center justify-center rounded-full bg-mint/25 text-forest">
                <HandCoins className="size-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              {HUD_COPY.title}
            </span>
            <PeriodChip window={period} />
          </div>
          <div className="relative mt-4 flex flex-col items-center rounded-[1.25rem] bg-sage/40 px-6 py-7 text-center ring-1 ring-soil/8">
            <span className="text-[26px]">💼</span>
            <p className="mt-3 text-[14.5px] font-medium leading-snug text-forest">
              {HUD_COPY.drySpellTitle}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-forest/55">
              {HUD_COPY.drySpellBody}
            </p>
            {/* CTA nyata: buka Transaction Input Engine dengan tipe Pemasukan */}
            <TransactionBottomSheet
              defaultType="income"
              trigger={
                <button
                  type="button"
                  className="mt-4 rounded-full bg-forest px-4 py-2.5 text-[12.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
                >
                  {HUD_COPY.drySpellCta}
                </button>
              }
            />
          </div>
        </div>
      ) : hud.shortfall ? (
        /* ── SHORTFALL — saldo tidak cukup untuk celengan bulan ini ───────── */
        <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-hud-terracotta/[0.14] via-cream to-hud-amber/[0.14] p-4 ring-1 ring-hud-terracotta/25 shadow-[0_14px_30px_-24px_rgba(184,145,145,0.85)]">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <p className="text-[12.5px] font-medium text-hud-terracotta">{HUD_COPY.title}</p>
              <PeriodChip window={period} />
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-hud-terracotta/12 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-hud-terracotta ring-1 ring-hud-terracotta/20">
              <AlertTriangle className="size-3" strokeWidth={2.6} aria-hidden />
              {HUD_COPY.shortfallBadge}
            </span>
          </div>

          <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-hud-terracotta tabular-nums">
            {maskNominal(hud.dailyBudget, masked)}
          </p>
          <p className="mt-1.5 text-[12px] font-medium text-forest/55">
            {HUD_COPY.shortfallCaption}
          </p>

          {/* pesan AI — menahan tanpa menuduh (nada PRD) */}
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-cream/70 px-3.5 py-3 ring-1 ring-hud-terracotta/15">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-hud-terracotta" strokeWidth={2.4} aria-hidden />
            <p className="text-[12px] font-medium leading-relaxed text-forest/70">
              {HUD_COPY.shortfallBody}
            </p>
          </div>

          {/* meta — kenapa ditahan: kurang sekian dari celengan bulan ini */}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hud-terracotta/15 pt-2.5 text-[11px] text-forest/55">
            <span>
              {HUD_COPY.shortfallShortBy}{' '}
              <b className="font-semibold text-hud-terracotta tabular-nums">
                {maskNominal(Math.abs(hud.remaining), masked)}
              </b>
            </span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span>
              {HUD_COPY.shortfallObligationLead}{' '}
              <b className="font-medium text-forest tabular-nums">
                {maskNominal(hud.sinkingObligation, masked)}
              </b>
            </span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span className="tabular-nums">
              {hud.daysLeft} {HUD_COPY.daysLeftSuffix}
            </span>
          </p>
        </div>
      ) : (
        /* ── 3A. DAILY HUD NORMAL — HERO GELAP (redesain paket 82) ───────────
            Kartu ini satu-satunya permukaan evergreen gelap di halaman /budget;
            ia naik jadi focal point dan berkata "ini uangmu untuk hari ini".
            Bentuknya: judul + chip periode · angka jatah harian besar + CINCIN
            pemakaian hari ini (`HudRing`) · satu baris statistik (sisa periode ·
            hari lagi · persen terpakai) · catatan pemasukan tengah periode ·
            pintu ke Pengaturan. Angka & warna tetap dari `computeDailyHud()`,
            jadi tidak ada nilai baru yang dikarang di sini. */
        <div className="relative overflow-hidden rounded-[2rem] bg-forest px-5 py-5 text-cream shadow-[0_30px_64px_-34px_rgba(69,89,78,0.85)] sm:px-6 sm:py-6">
          {/* dua glow lembut — mint di kanan atas, sage di kiri bawah. Cuma
              cahaya, bukan informasi: `aria-hidden` + pointer-events-none. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-mint/20 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-16 size-52 rounded-full bg-hud-sage/10 blur-3xl"
          />

          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-cream/70">
              <span className="flex size-6 items-center justify-center rounded-full bg-cream/12 text-cream">
                <HandCoins className="size-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              {HUD_COPY.title}
            </span>
            <PeriodChip window={period} tone="dark" />
          </div>

          {/* angka utama + cincin — cincin duduk di kanan supaya mata berhenti
              dulu di nominal yang benar-benar boleh dibelanjakan hari ini.
              Ukuran angka pakai `clamp` supaya nominal panjang (Rp 1.250.000)
              TIDAK menabrak cincin di layar sempit — ia mengecil sendiri.
              Caption "hari ini" WAJIB: tanpa itu angka cincin (0% saat belum ada
              pengeluaran hari ini) terbaca seolah "tidak ada yang terpakai",
              padahal periode ini sudah ada pengeluaran. Persen PERIODE duduk di
              bar bawah — dua angka itu tidak lagi saling membingungkan. */}
          <div className="relative mt-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium text-cream/55">{HUD_COPY.mainLead}</p>
              <p className="mt-1.5 text-[clamp(1.75rem,7vw,2.5rem)] font-semibold leading-none tracking-tight tabular-nums">
                {maskNominal(hud.dailyBudget, masked)}
              </p>
            </div>
            <span className="flex shrink-0 flex-col items-center gap-1">
              <HudRing
                usedPct={hud.todayUsedPct}
                ariaLabel={HUD_COPY.ringAria(Math.round(hud.todayUsedPct * 100))}
              />
              <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-cream/45">
                {HUD_COPY.todayCaption}
              </span>
            </span>
          </div>

          {/* statistik periode (angka NYATA dari `hud`) + bar pemakaian kolam
              periode. Bar-nya menjawab "sudah kepakai berapa persen dari uang
              periode ini" — pertanyaan yang dulu tidak terjawab karena meternya
              hanya mengukur pemakaian HARI INI. */}
          <div className="relative mt-5 space-y-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] font-medium text-cream/60">
              <span>
                {HUD_COPY.remainingLead}{' '}
                <b className="font-semibold text-cream tabular-nums">
                  {maskNominal(hud.remaining, masked)}
                </b>
              </span>
              <span aria-hidden className="size-1 rounded-full bg-cream/30" />
              <span className="tabular-nums">
                {hud.daysLeft} {HUD_COPY.daysLeftSuffix}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={HUD_COPY.periodUsed(Math.round(periodPct * 100))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(periodPct * 100)}
            >
              <div className="h-1 w-full overflow-hidden rounded-full bg-cream/15">
                <div
                  className="h-full rounded-full bg-mint transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{ width: `${Math.round(periodPct * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10.5px] font-medium text-cream/50 tabular-nums">
                {HUD_COPY.periodUsed(Math.round(periodPct * 100))}
              </p>
            </div>
          </div>

          {/* PRD 2B.3 — pemasukan masuk di tengah periode: jatah harian sudah
              dihitung ulang dari sisa hari, dan user diberi tahu kenapa berubah */}
          {income.midPeriod && income.latestDateLabel && (
            <p className="relative mt-3 inline-flex items-start gap-1.5 rounded-xl bg-cream/10 px-2.5 py-1.5 text-[10.5px] font-medium leading-snug text-cream/85">
              <Sparkles className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden />
              {HUD_COPY.midIncome(income.latestDateLabel)}
            </p>
          )}

          {/* pintu MENGUBAH angka yang barusan dipakai (paket 57.4): pemasukan &
              cicilan hidup di Pengaturan → Profil & Akun. Tanpa tautan ini,
              "Jatah Hari Ini" hanya bisa dilihat, tidak bisa dibetulkan. */}
          <Link
            href={MONEY_SETTINGS_HREF}
            className="relative mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-cream/55 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream/60"
          >
            <Settings2 className="size-3.5" strokeWidth={2.4} aria-hidden />
            {HUD_COPY.moneySettingsCta}
          </Link>
        </div>
      )}
    </section>
  )
}
