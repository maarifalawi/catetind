'use client'

import Link from 'next/link'
import { AlertTriangle, CalendarDays, HandCoins, Settings2 } from 'lucide-react'
import {
  BUDGET_REMAINING_HINT,
  HUD_COPY,
  MONEY_SETTINGS_HREF,
  maskNominal,
  type BudgetHud,
  type PeriodIncome,
  type PeriodWindow,
} from '@/lib/data/budget'
import { TransactionBottomSheet } from '@/components/dashboard/transaction-bottom-sheet'
import { BatikCloth } from './batik-cloth'

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

   Sejak periode non-bulanan hidup (2B untuk freelancer), chip PERIODE AKTIF
   (`window.label`) tetap muncul di varian "belum diatur" & "jatah ditahan".
   Hero-nya sendiri kini HANYA berisi judul + nominal (revisi 11 Nov 2026):
   cincin persen, caption "HARI INI", chip periode, dan ikon di samping judul
   dicabut karena semuanya mengulang informasi yang sudah ada di Dashboard atau
   di tab periode tepat di bawah kartu. Pacing tetap memakai jendela yang sama
   dengan daftar budget di bawahnya — tab Mingguan membagi sisa uang dengan
   sisa hari MINGGU itu. */

/** chip periode aktif — dipakai varian "belum diatur" & "jatah ditahan" supaya
 *  user tahu angka itu dihitung untuk jendela yang mana. */
function PeriodChip({ window: period }: { window: PeriodWindow }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/70 px-2.5 py-1 text-[11.5px] font-medium text-forest ring-1 ring-soil/8">
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
    <section aria-label={HUD_COPY.title} data-catetind-jatah="hari-ini" className="w-full">
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
            <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-forest-muted">
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
            <p className="mt-3 text-[15.5px] font-medium leading-snug text-forest">
              {HUD_COPY.notConfiguredTitle}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-forest-muted">
              {HUD_COPY.notConfiguredBody}
            </p>
            <Link
              href={MONEY_SETTINGS_HREF}
              aria-label={HUD_COPY.notConfiguredA11y}
              className="mt-4 rounded-full bg-forest px-4 py-2.5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
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
            <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-forest-muted">
              <span className="flex size-6 items-center justify-center rounded-full bg-mint/25 text-forest">
                <HandCoins className="size-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              {HUD_COPY.title}
            </span>
            <PeriodChip window={period} />
          </div>
          <div className="relative mt-4 flex flex-col items-center rounded-[1.25rem] bg-sage/40 px-6 py-7 text-center ring-1 ring-soil/8">
            <span className="text-[26px]">💼</span>
            <p className="mt-3 text-[15.5px] font-medium leading-snug text-forest">
              {HUD_COPY.drySpellTitle}
            </p>
            {/* CTA nyata: buka Transaction Input Engine dengan tipe Pemasukan */}
            <TransactionBottomSheet
              defaultType="income"
              trigger={
                <button
                  type="button"
                  className="mt-4 rounded-full bg-forest px-4 py-2.5 text-[13.5px] font-medium text-cream transition-colors hover:bg-forest-soft active:scale-95"
                >
                  {HUD_COPY.drySpellCta}
                </button>
              }
            />
          </div>
        </div>
      ) : hud.shortfall ? (
        /* ── SHORTFALL — saldo tidak cukup untuk celengan bulan ini ───────── */
        <div className="relative overflow-hidden rounded-[1.6rem] bg-cream p-4 ring-1 ring-hud-terracotta/20 shadow-[0_18px_40px_-38px_rgba(0,0,0,0.5)]">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <p className="text-[13.5px] font-medium text-hud-terracotta">{HUD_COPY.title}</p>
              <PeriodChip window={period} />
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-hud-terracotta/12 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-hud-terracotta ring-1 ring-hud-terracotta/20">
              <AlertTriangle className="size-3" strokeWidth={2.6} aria-hidden />
              {HUD_COPY.shortfallBadge}
            </span>
          </div>

          <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-hud-terracotta tabular-nums">
            {maskNominal(hud.dailyBudget, masked)}
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-forest-muted">
            {HUD_COPY.shortfallCaption}
          </p>

          {/* pesan AI — menahan tanpa menuduh (nada PRD) */}
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-cream/70 px-3.5 py-3 ring-1 ring-hud-terracotta/15">
            <p className="text-[13px] font-medium leading-relaxed text-forest-soft">
              {HUD_COPY.shortfallBody}
            </p>
          </div>

          {/* meta — kenapa ditahan: kurang sekian dari celengan bulan ini */}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hud-terracotta/15 pt-2.5 text-[12px] text-forest-muted">
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
          </p>
        </div>
      ) : (
        /* ── 3A. DAILY HUD NORMAL — HERO GELAP + KAIN BATIK ──────────────────
            Revisi 11 Nov 2026 (permintaan pemilik produk): kartu ini terlalu
            banyak teks — "Sisa periode: Rp …", penjelasan asal angkanya, "1%
            terpakai periode ini", dan tautan Pengaturan semuanya menumpuk di
            dalam kartu sampai angka utamanya tenggelam. Coraknya juga belum
            terasa batik. Sekarang:

              · latar = KAIN BATIK sungguhan (`BatikCloth` — kawung di seluruh
                bidang + sabuk parang di kaki kartu + tepi kain), jadi coraknya
                benar-benar terbaca sebagai batik, bukan sekadar gradasi hijau;
              · isi kartu tinggal DUA hal: label "Jatah Hari Ini" (medium, bukan
                bold) dan nominal jatah harian di bawahnya. Cincin persen, chip
                periode, ikon, dan caption "HARI INI" DICABUT;
              · angka pendukung ("Sisa periode") + pintu ke Pengaturan pindah
                ke BARIS DI BAWAH kartu — informasi tetap ada, tetapi tidak
                lagi menenggelamkan angka utama.

            Angka & warna tetap dari `computeDailyHud()`: tidak ada nilai baru
            yang dikarang di sini. */
        <>
          <div className="relative overflow-hidden rounded-[2rem] bg-forest text-cream shadow-[0_34px_70px_-38px_rgba(0,0,0,0.9)] ring-1 ring-forest/40">
            {/* corak batik — murni dekorasi, tidak menangkap klik */}
            <BatikCloth id="budget-hud-batik" />
            {/* Dua scrim LOKAL (kelasnya di app/globals.css): hanya area judul &
                nominal yang digelapkan — sisi kanan (cincin) dan sabuk parang di
                tepi bawah tetap terbuka, jadi batiknya tetap kelihatan. */}
            <span aria-hidden className="batik-scrim-title pointer-events-none absolute inset-0" />
            <span aria-hidden className="batik-scrim-amount pointer-events-none absolute inset-0" />
            {/* dua glow lembut — mint di kanan atas, sage di kiri bawah. Cuma
                cahaya, bukan informasi: `aria-hidden` + pointer-events-none. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-mint/20 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-28 -left-16 size-52 rounded-full bg-mint/10 blur-3xl"
            />

            <div className="relative px-5 py-6 sm:px-7 sm:py-7">
              {/* HANYA judul + nominal (permintaan pemilik produk, 11 Nov 2026):
                  cincin persen, caption "HARI INI", chip periode, dan ikon di
                  samping judul DICABUT. Alasannya sederhana — di hero /budget
                  user cuma mencari satu angka: berapa uang yang boleh dipakai
                  hari ini. Persentase sudah dibaca di kartu Dashboard, dan chip
                  periode cuma mengulang tab "Bulanan" tepat di bawah kartu.
                  Judulnya juga diturunkan bobotnya (medium, bukan semibold)
                  supaya nominal tetap satu-satunya fokus. */}
              <p className="text-[14.5px] font-medium tracking-tight text-cream/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
                {HUD_COPY.title}
              </p>
              <p className="mt-2.5 whitespace-nowrap text-[clamp(2.25rem,8vw,3.75rem)] font-semibold leading-none tracking-tight tabular-nums [text-shadow:0_2px_3px_rgba(0,0,0,0.35),0_12px_32px_rgba(0,0,0,0.55)]">
                {maskNominal(hud.dailyBudget, masked)}
              </p>
            </div>

            {/* benang emas di tepi bawah kain — penutup visual, bukan informasi */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-daisy/45 to-transparent"
            />
          </div>

          {/* ── DI LUAR KARTU: sisa periode + pintu Pengaturan ────────────────
              Dulu dua baris ini hidup DI DALAM kartu. Sekarang cukup satu baris
              tenang di bawahnya. Penjelasan panjang "Sisa dari pemasukan …
              dikurangi cicilan & tagihan rutin" tetap tersedia sebagai tooltip
              (`title`), jadi informasinya tidak hilang — hanya tidak lagi
              memakan ruang kartu. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            <p
              title={BUDGET_REMAINING_HINT(maskNominal(income.amount, masked))}
              className="cursor-help text-[12px] font-medium text-forest-muted"
            >
              {HUD_COPY.remainingLead}{' '}
              <b className="font-semibold text-forest tabular-nums">
                {maskNominal(hud.remaining, masked)}
              </b>
            </p>
            <Link
              href={MONEY_SETTINGS_HREF}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-forest-muted underline decoration-soil/30 underline-offset-4 transition-colors hover:text-forest hover:decoration-forest/50"
            >
              <Settings2 className="size-3.5" strokeWidth={2.4} aria-hidden />
              {HUD_COPY.moneySettingsCta}
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
