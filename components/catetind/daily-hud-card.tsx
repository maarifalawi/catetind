import { memo } from 'react'
import { CircleDashed, HandCoins, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrivacy } from './privacy-provider'

/* ── mock data — nanti dari Supabase (Domain 2B.1) ─────────────────────── */
const MONTHLY_INCOME = 8_500_000 // pemasukan bulan berjalan
const INSTALLMENTS = 800_000 // cicilan platform/fintech aktif (2E Debt Manager)
const SPENT_THIS_MONTH = 4_550_000
const SPENT_TODAY = 85_000
const DAYS_LEFT = 15 // termasuk hari ini
/* Dry Spell (Domain 2B.3): bulan tanpa income → ganti seluruh card */
const DRY_SPELL = false

/* formula kanon PRD 2B.1 — jatah harian dinamis */
const availablePool = MONTHLY_INCOME - INSTALLMENTS
const remaining = availablePool - SPENT_THIS_MONTH
const dailyBudget = Math.max(0, remaining / DAYS_LEFT)
const usedPct = dailyBudget > 0 ? Math.min(SPENT_TODAY / dailyBudget, 1) : 0

/* status & warna kanon PRD 2B.2 — resolusi BIMA: soft, BUKAN merah */
type HudStatus = 'onTrack' | 'approaching' | 'over'
const STATUS: Record<HudStatus, { label: string; ring: string; copy: string }> =
  {
    onTrack: {
      label: 'On track',
      ring: '#b5b987',
      copy: 'Masih banyak ruang hari ini! 🌿',
    },
    approaching: {
      label: 'Hampir habis',
      ring: '#ffb885',
      copy: 'Pelan-pelan ya, sisa jatah harianmu tinggal dikit 🌤️',
    },
    over: {
      label: 'Lewat jatah',
      ring: '#b89191',
      copy: 'Gapapa, besok kita atur ulang bareng! 🌱',
    },
  }
const status: HudStatus =
  usedPct < 0.75 ? 'onTrack' : usedPct < 1 ? 'approaching' : 'over'

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
            <p className="text-sm font-semibold text-ink">Jatah Hari Ini</p>
            <p className="text-[10px] text-ink/45">Budget harian dinamis</p>
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
          {STATUS[status].label}
        </span>
      </div>

      {DRY_SPELL ? (
        /* ── Dry Spell — PACING LIMITS DISEMBUNYIKAN (PRD 2B.3) ── */
        <div className="mt-5 flex flex-col items-center rounded-2xl bg-cream px-6 py-8 text-center ring-1 ring-soil/8">
          <span className="flex size-12 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/12">
            <CircleDashed className="size-6" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">
            Belum ada pemasukan bulan ini
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/50">
            Yuk catat begitu masuk! 💪
          </p>
          <button
            type="button"
            className="mt-5 flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-forest-soft active:scale-[0.97]"
          >
            + Catat Pemasukan
          </button>
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
                  stroke={STATUS[status].ring}
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
                <span className="text-[10px] text-ink/45">terpakai</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-3xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                {hide(fmt(dailyBudget))}
              </p>
              <p className="mt-0.5 text-[10px] text-ink/45">sisa jatah hari ini</p>
              <p className="mt-1.5 text-[12px] font-medium leading-snug text-ink/70">
                {STATUS[status].copy}
              </p>
              {/* kompromi DIAN: CTA ke AI Coach saat over — tanpa intimidasi */}
              {status === 'over' && (
                <button
                  type="button"
                  className="mt-2 flex items-center gap-1.5 rounded-full bg-hud-terracotta/10 px-3 py-1.5 text-[12px] font-semibold text-hud-terracotta transition-colors hover:bg-hud-terracotta/20"
                >
                  <Sparkles className="size-3.5" strokeWidth={2.2} />
                  Review Pengeluaran Hari Ini
                </button>
              )}
            </div>
          </div>

          {/* footer meta — mengisi bawah kartu, jadi tidak ada ruang kosong */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-soil/12 pt-2.5 text-[11px] text-ink/55">
            <span>
              Sisa bulan{' '}
              <b className="font-semibold text-ink tabular-nums">
                {hide(fmt(remaining))}
              </b>
            </span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span className="tabular-nums">{DAYS_LEFT} hari lagi</span>
            <span aria-hidden className="size-1 rounded-full bg-ink/20" />
            <span>
              Cicilan terpotong{' '}
              <span className="tabular-nums">{hide(fmt(INSTALLMENTS))}</span>
            </span>
          </div>
        </>
      )}
    </section>
  )
})

