import { memo } from 'react'
import { CircleDashed, HandCoins, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrivacy } from './privacy-provider'
import {
  DAILY_HUD,
  HOME_HUD_COPY,
  HUD_COPY,
  MONTHLY_WINDOW,
  SPENDING_REVIEW_COPY,
  SPENT_TODAY,
  hasIncomeInWindow,
  type HudStatus,
} from '@/lib/data/budget'
import { openAICoachWithSeed } from '@/lib/ai-chat-bus'

/* ── Kartu Jatah Hari Ini (Home) ─────────────────────────────────────────────
   Angkanya TIDAK dihitung lagi di sini: satu-satunya sumber adalah `DAILY_HUD`
   di `lib/data/budget.ts` — konstanta kanon yang juga dipakai tab Bulanan
   halaman /budget. Dulu kartu ini punya mock sendiri (8,5jt / 15 hari), jadi
   Home dan /budget bisa menampilkan jatah harian yang berbeda untuk bulan yang
   SAMA. Sekarang ketidaksamaan itu mustahil: keduanya membaca angka yang sama,
   dan `MONTHLY_WINDOW` memastikan pembaginya 27/30 seperti `CURRENT_DAY`/
   `DAYS_IN_MONTH`.

   `SPENT_TODAY` (pengeluaran hari berjalan) TIDAK lagi konstanta lokal di sini:
   sejak prompt 19 ia diambil dari `lib/data/budget.ts`, yang menghitungnya dari
   catatan bertanggal `TODAY_ISO`. Alasannya satu sumber: kalau angka di kartu
   ini dan panel "Review Pengeluaran Hari Ini" dihitung terpisah, Home bisa bilang
   43% terpakai sementara panel bilang jatahnya sudah lewat — untuk hari yang
   sama. Ia tetap bukan bagian dari formula jatah harian. */

/** Dry Spell (Domain 2B.3): tidak ada pemasukan di bulan berjalan → ganti card */
const DRY_SPELL = !hasIncomeInWindow(MONTHLY_WINDOW)

const usedPct =
  DAILY_HUD.dailyBudget > 0 ? Math.min(SPENT_TODAY / DAILY_HUD.dailyBudget, 1) : 0
/* status & warna kanon PRD 2B.2 diambil dari satu sumber copy di lib/data */
const status: HudStatus =
  usedPct < 0.75 ? 'onTrack' : usedPct < 1 ? 'approaching' : 'over'
const STATUS = HOME_HUD_COPY.status[status]

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`

/* geometri ring */
const SIZE = 120
const STROKE = 11
const R = (SIZE - STROKE) / 2 - 2


/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup (lihat catatan di
 *  cash-flow-card.tsx). Membaca context privasi global untuk menyensor nominal. */
export const DailyHudCard = memo(function DailyHudCard() {
  const { hide } = usePrivacy()

  return (
    <section
      aria-label="Jatah hari ini"
      className="flex h-full flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12"
    >
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-sage text-forest">
            <HandCoins className="size-3.5" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{HOME_HUD_COPY.title}</p>
            <p className="text-[10px] text-ink/45">{HOME_HUD_COPY.subtitle}</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            status === 'onTrack' && 'bg-hud-sage/15 text-[#b5b987]',
            status === 'approaching' && 'bg-hud-amber/15 text-[#b89191]',
            status === 'over' && 'bg-hud-terracotta/15 text-hud-terracotta',
          )}
        >
          {STATUS.label}
        </span>
      </div>

      {DRY_SPELL ? (
        /* ── Dry Spell — PACING LIMITS DISEMBUNYIKAN (PRD 2B.3) ── */
        <div className="mt-5 flex flex-col items-center rounded-2xl bg-cream px-6 py-8 text-center ring-1 ring-soil/8">
          <span className="flex size-12 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12">
            <CircleDashed className="size-6" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">{HUD_COPY.drySpellTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/50">{HUD_COPY.drySpellBody}</p>
          <button
            type="button"
            className="mt-5 flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
          >
            {HUD_COPY.drySpellCta}
          </button>
        </div>
      ) : DAILY_HUD.shortfall ? (
        /* ── Jatah ditahan (audit UX #2) — jangan pernah tampilkan "Rp 0"
              tanpa penjelasan. Jarang muncul karena mock HUD disetel sehat;
              naikkan SPENT_THIS_MONTH di lib/data/budget.ts untuk mengujinya. */
        <div className="mt-5 rounded-2xl bg-hud-terracotta/[0.08] px-4 py-6 text-center ring-1 ring-hud-terracotta/20">
          <p className="text-base font-semibold text-hud-terracotta">
            {HUD_COPY.shortfallBadge}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink/60">
            {HUD_COPY.shortfallBody}
          </p>
        </div>
      ) : (
        /* ── HUD normal — ring kompak + nominal di LUAR ring (anti overlap center) ── */
        <>
          <div className="mt-3 flex flex-1 items-center gap-4">
            <div className="relative shrink-0">
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="size-[104px] -rotate-90"
                aria-hidden
              >
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke="#ebe4de"
                  strokeWidth={STROKE}
                />
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={STATUS.ring}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={`${usedPct} 1`}
                  className="animate-[donut-grow_1.1s_ease-out_both]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold tracking-tight text-ink tabular-nums">
                  {Math.round(usedPct * 100)}%
                </span>
                <span className="text-[10px] text-ink/45">{HOME_HUD_COPY.usedCaption}</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-3xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                {hide(fmt(DAILY_HUD.dailyBudget))}
              </p>
              <p className="mt-0.5 text-[10px] text-ink/45">{HOME_HUD_COPY.dailyCaption}</p>
              <p className="mt-1.5 text-[12px] font-medium leading-snug text-ink/70">
                {STATUS.copy}
              </p>
              {/* kompromi DIAN: CTA ke AI Coach saat over — tanpa intimidasi.
                  Tombolnya dulu MATI (tanpa onClick); sejak prompt 19 ia benar-
                  benar membuka AI Coach dengan pertanyaan sudah terisi, sama
                  seperti CTA berlabel sama di /budget. */}
              {status === 'over' && (
                <button
                  type="button"
                  onClick={() => openAICoachWithSeed(SPENDING_REVIEW_COPY.coachSeed)}
                  className="mt-2 flex items-center gap-1.5 rounded-full bg-hud-terracotta/10 px-3 py-1.5 text-[12px] font-semibold text-hud-terracotta transition-colors hover:bg-hud-terracotta/20"
                >
                  <Sparkles className="size-3.5" strokeWidth={2.2} aria-hidden />
                  {HOME_HUD_COPY.reviewCta}
                </button>
              )}
            </div>
          </div>

          {/* footer meta — mengisi bawah kartu, jadi tidak ada ruang kosong */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-soil/12 pt-2.5 text-[11px] text-ink/55">
            <span>
              {HOME_HUD_COPY.remainingLead}{' '}
              <b className="font-semibold text-ink tabular-nums">
                {hide(fmt(DAILY_HUD.remaining))}
              </b>
            </span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span className="tabular-nums">
              {DAILY_HUD.daysLeft} {HOME_HUD_COPY.daysLeftSuffix}
            </span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span>
              {HOME_HUD_COPY.installmentsLead}{' '}
              <span className="tabular-nums">{hide(fmt(DAILY_HUD.installments))}</span>
            </span>
          </div>
        </>
      )}
    </section>
  )
})

