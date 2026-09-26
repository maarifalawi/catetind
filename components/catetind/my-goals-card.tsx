'use client'

import { memo } from 'react'
import { ArrowUpRight, ChevronDown, Goal, Plus, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlantIllustration, STAGE_NAMES, type PlantStage } from './plant-illustration'
import { usePrivacy } from './privacy-provider'

/* goal utama — pct dipakai untuk menentukan TAHAP tanaman, bukan cuma angka */
const PRIMARY = {
  name: 'Liburan ke Jepang',
  saved: 5_000_000,
  target: 10_000_000,
  pct: 50,
}

/* goal sekunder — mini list dengan batang tumbuh (bukan progress bar generik) */
const SECONDARY: { name: string; pct: number }[] = [
  { name: 'Dana Darurat', pct: 72 },
  { name: 'MacBook Air M4', pct: 56 },
  { name: 'Dana Umroh', pct: 24 },
]

/* ── Metafora Tanaman untuk Sinking Fund (PRD Domain 2C & 3B) ────────────────
   Sebelumnya Tabungan Impian digambar sebagai circular progress bar biasa,
   sementara widget "Tanamanmu" berdiri sendiri tanpa konteks — jadi gamifikasi
   terasa gimmick dan user tidak tahu APA yang membuat tanaman itu tumbuh.

   Sekarang keduanya dijahit jadi satu: progress tabungan = TAHAP tanaman.
   Setiap setoran = menyiram. Tidak ada angka streak, tidak ada hukuman. */
export function stageFromPercent(pct: number): PlantStage {
  if (pct < 25) return 1 // Benih
  if (pct < 50) return 2 // Tunas
  if (pct < 80) return 3 // Tanaman Muda
  return 4 // Berbunga
}

/* label ringkas untuk batang tumbuh 4 titik */
const SHORT_STAGE: Record<PlantStage, string> = {
  1: 'Benih',
  2: 'Tunas',
  3: 'Muda',
  4: 'Berbunga',
}

/* warna pastel yang benar-benar berbeda per goal (olive · daisy · plum) —
   senada dengan palet distribusi pengeluaran, jadi bahasa warna app konsisten */
const TINTS = [
  'bg-[#b5b987]/25 text-forest',
  'bg-[#ffb885]/25 text-[#b89191]',
  'bg-[#b89191]/15 text-hud-terracotta',
]

/** batang tumbuh: benih → tunas → muda → berbunga. Warnanya menanjak dari
 *  cokelat tanah ke olive lalu leaf — "tumbuh", bukan "progress bar". */
function GrowthTrack({ pct, stage }: { pct: number; stage: PlantStage }) {
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-soil/[0.09]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#b89191] via-[#b5b987] to-mint"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        {([1, 2, 3, 4] as PlantStage[]).map((s) => (
          <span
            key={s}
            className={cn(
              'text-[9.5px] font-medium tabular-nums transition-colors',
              s === stage
                ? 'font-semibold text-forest'
                : s < stage
                  ? 'text-forest/45'
                  : 'text-ink/30',
            )}
          >
            {SHORT_STAGE[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup. */
export const MyGoalsCard = memo(function MyGoalsCard() {
  const { money } = usePrivacy()
  const stage = stageFromPercent(PRIMARY.pct)

  return (
    <div className="flex h-full flex-col rounded-[2rem] bg-cream p-4 ring-1 ring-soil/12 sm:p-5">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <Goal className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Tabungan Impian</p>
            <p className="text-xs text-ink/45">Tiap setoran = nyiram tanaman</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Tambah goal baru"
          className="flex size-8 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/16 transition-colors hover:bg-sage active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.4} />
        </button>
      </div>

      {/* hero — tanaman sebagai wajah dari progress tabungan (bukan donat/gauge) */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-b from-sage/70 via-cream to-cream p-4 ring-1 ring-soil/8 sm:p-5">
        {/* glow mint sangat lembut di belakang tanaman */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-6 top-6 h-28 w-40 rounded-full bg-mint/20 blur-3xl"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{PRIMARY.name}</p>
            <p className="mt-0.5 text-[11px] text-ink/45">Goal utama · tanaman impian</p>
          </div>
          <button
            type="button"
            aria-label="Lihat detail goal"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
          >
            <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>

        {/* tanaman + tahap + batang tumbuh, sejajar supaya hemat tinggi */}
        <div className="relative mt-2 flex items-center gap-4">
          <PlantIllustration stage={stage} className="w-24 shrink-0 sm:w-28" />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/85 px-2.5 py-1 text-[11px] font-semibold text-forest ring-1 ring-forest/10">
              <Sprout className="size-3" strokeWidth={2.4} aria-hidden />
              Tahap {stage} · {STAGE_NAMES[stage]}
            </span>
            <p className="mt-2 text-[11.5px] leading-snug text-ink/55">
              {stage === 4
                ? 'Sudah berbunga! Tanaman ini tumbuh dari konsistensi setoranmu 🌸'
                : 'Tiap setoran bikin tanaman ini naik tahap. Rawat terus ya 🌿'}
            </p>
            <div className="mt-2.5">
              <GrowthTrack pct={PRIMARY.pct} stage={stage} />
            </div>
          </div>
        </div>

        {/* nominal — di luar area tanaman, angka besar tidak menimpa ilustrasi */}
        <div className="relative mt-4 border-t border-soil/12 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-ink/40">
              Terkumpul
            </p>
            <p className="truncate text-base font-semibold text-ink tabular-nums">
              {money(PRIMARY.saved)}
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45">
              Target
            </p>
            <p className="truncate text-sm font-medium text-ink/55 tabular-nums">
              {money(PRIMARY.target)}
            </p>
          </div>
        </div>
      </div>


      {/* goal sekunder — tiap goal punya batang tumbuhnya sendiri (4 segmen),
          jadi bahasa visualnya sama dengan tanaman utama di atas */}
      <div className="mt-3 flex flex-col gap-2">
        {SECONDARY.map((goal, i) => {
          const goalStage = stageFromPercent(goal.pct)
          return (
            <div
              key={goal.name}
              className="rounded-xl bg-cream px-3.5 py-2.5 ring-1 ring-soil/8 transition-colors hover:bg-sage/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full',
                      TINTS[i % TINTS.length],
                    )}
                  >
                    <Sprout className="size-3" strokeWidth={2.4} aria-hidden />
                  </span>
                  <p className="truncate text-[13px] font-medium text-ink">{goal.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10.5px] font-semibold text-forest">
                    {SHORT_STAGE[goalStage]}
                  </span>
                  <span className="text-xs font-semibold text-ink/55 tabular-nums">
                    {goal.pct}%
                  </span>
                  <button
                    type="button"
                    aria-label={`Detail ${goal.name}`}
                    className="flex size-6 items-center justify-center rounded-full text-ink/35 transition-colors hover:bg-soil/8 hover:text-ink"
                  >
                    <ChevronDown className="size-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
              {/* batang tumbuh mini: 4 segmen = 4 tahap */}
              <div className="mt-2 flex gap-1" aria-hidden>
                {([1, 2, 3, 4] as PlantStage[]).map((s) => (
                  <span
                    key={s}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      s <= goalStage
                        ? 'bg-gradient-to-r from-[#b5b987] to-mint'
                        : 'bg-soil/[0.09]',
                    )}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

