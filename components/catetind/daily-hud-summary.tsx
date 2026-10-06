'use client'

import Link from 'next/link'
import { AlertTriangle, CalendarDays, HandCoins, Settings2, Sparkles } from 'lucide-react'
import {
  HUD_COPY,
  MONEY_SETTINGS_HREF,
  maskNominal,
  type BudgetHud,
  type PeriodIncome,
  type PeriodWindow,
} from '@/lib/data/budget'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'

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

/** chip periode aktif — satu tempat supaya ketiga varian kartu seragam */
function PeriodChip({ window: period }: { window: PeriodWindow }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/70 px-2.5 py-1 text-[10.5px] font-medium text-forest ring-1 ring-soil/8">
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
  return (
    <section aria-label={HUD_COPY.title} className="w-full">
      {!income.configured ? (
        /* ── BELUM DIATUR (paket 57) — bukan Dry Spell ───────────────────────
            Pemasukan bulanan belum pernah diisi → jatah harian memang tidak bisa
            dihitung dari apa pun. Kartu ini jujur menyebut kenapa kosong dan
            menunjuk satu pintu masuk: field PEMASUKAN BULANAN + TOTAL CICILAN
            BULANAN di Pengaturan → Profil & Akun (paket 57.4). Angka contoh TIDAK
            ditampilkan, karena itulah temuan AKAR D audit 2026-09. */
        <div className="rounded-[1.6rem] bg-cream p-4 ring-1 ring-soil/12 shadow-[0_12px_28px_-24px_rgba(69,89,78,0.5)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[12.5px] font-medium text-forest/55">{HUD_COPY.title}</p>
            <PeriodChip window={period} />
          </div>
          <div className="flex flex-col items-center rounded-[1.3rem] bg-cream px-6 py-7 text-center ring-1 ring-soil/8">
            <span className="flex size-12 items-center justify-center rounded-full bg-sage/60 text-forest ring-1 ring-soil/8">
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
        <div className="rounded-[1.6rem] bg-cream p-4 ring-1 ring-soil/12 shadow-[0_12px_28px_-24px_rgba(69,89,78,0.5)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[12.5px] font-medium text-forest/55">{HUD_COPY.title}</p>
            <PeriodChip window={period} />
          </div>
          <div className="flex flex-col items-center rounded-[1.3rem] bg-cream px-6 py-7 text-center ring-1 ring-soil/8">
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
        /* ── 3A. DAILY HUD NORMAL — jatah aman SETELAH celengan ───────────── */
        <div className="rounded-[1.6rem] bg-cream p-4 ring-1 ring-soil/12 shadow-[0_12px_28px_-24px_rgba(69,89,78,0.5)]">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-forest/55">
                <span className="flex size-6 items-center justify-center rounded-full bg-sage text-forest">
                  <HandCoins className="size-3.5" strokeWidth={2.4} aria-hidden />
                </span>
                {HUD_COPY.title}
              </span>
              {/* periode aktif + rentang tanggalnya (mis. `Siklus 25 Sep – 24 Okt`) */}
              <span className="mt-1.5 block">
                <PeriodChip window={period} />
              </span>
            </span>
            {/* Audit UX #5 mengganti tombol "Sinkron Dashboard" jadi "Pin ke
                Dashboard"; PAKET 60.3 MENGHAPUS tombol itu seluruhnya. Alasannya
                jujur: ia cuma membalik state halaman ini sementara `DailyHudCard`
                di Home tidak menerima prop apa pun — tidak ada satu piksel di
                Dashboard yang berubah. Kalimat "Atur pemasukan & cicilan" di kaki
                kartu sudah jadi satu-satunya pintu aksi yang benar-benar bekerja. */}
          </div>

          <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-forest tabular-nums">
            {maskNominal(hud.dailyBudget, masked)}
          </p>

          <p className="mt-2 text-[12px] font-medium text-forest/55">
            {HUD_COPY.remainingLead}{' '}
            <b className="font-semibold text-forest tabular-nums">
              {maskNominal(hud.remaining, masked)}
            </b>{' '}
            · {hud.daysLeft} {HUD_COPY.daysLeftSuffix}
          </p>

          {/* PRD 2B.3 — pemasukan masuk di tengah periode: jatah harian sudah
              dihitung ulang dari sisa hari, dan user diberi tahu kenapa berubah */}
          {income.midPeriod && income.latestDateLabel && (
            <p className="mt-2 inline-flex items-start gap-1.5 rounded-xl bg-hud-sage/15 px-2.5 py-1.5 text-[10.5px] font-medium leading-snug text-forest">
              <Sparkles className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden />
              {HUD_COPY.midIncome(income.latestDateLabel)}
            </p>
          )}

          {/* kenapa pool-nya lebih kecil — cicilan & celengan dipotong DULU */}
          <p className="mt-2 border-t border-soil/12 pt-2 text-[10.5px] text-forest/35">
            {HUD_COPY.poolNote(
              maskNominal(hud.installments, masked),
              maskNominal(hud.sinkingObligation, masked),
            )}
          </p>

          {/* pintu MENGUBAH angka yang barusan dipakai (paket 57.4): pemasukan &
              cicilan hidup di Pengaturan → Profil & Akun. Tanpa tautan ini,
              "Jatah Hari Ini" hanya bisa dilihat, tidak bisa dibetulkan. */}
          <Link
            href={MONEY_SETTINGS_HREF}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-forest underline underline-offset-2 transition-colors hover:text-forest"
          >
            <Settings2 className="size-3.5" strokeWidth={2.4} aria-hidden />
            {HUD_COPY.moneySettingsCta}
          </Link>
        </div>
      )}
    </section>
  )
}
