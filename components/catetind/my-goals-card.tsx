import { ArrowUpRight, ChevronDown, Goal, Plus } from 'lucide-react'

/* goal utama — tampil di gauge setengah lingkaran */
const PRIMARY = {
  name: 'Liburan ke Jepang',
  saved: 'Rp 5.000.000',
  target: 'Rp 10.000.000',
  pct: 50,
}

/* goal sekunder — mini list dengan progress bar tipis */
const SECONDARY: { name: string; pct: number; color: string }[] = [
  { name: 'Dana Darurat', pct: 72, color: '#103a2a' },
  { name: 'MacBook Air M4', pct: 56, color: '#b7e04b' },
  { name: 'Dana Umroh', pct: 24, color: '#fb7185' },
]

/* geometri gauge setengah lingkaran (semi-circle) */
const CX = 100
const CY = 104
const R = 80
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`
/* ujung arc mengikuti persentase — sweep kiri → kanan */
const TIP_ANGLE = Math.PI * (1 - PRIMARY.pct / 100)
const TIP_X = CX + R * Math.cos(TIP_ANGLE)
const TIP_Y = CY - R * Math.sin(TIP_ANGLE)

/* font nominal mengecil otomatis kalau angkanya makin panjang — anti ketiban */
const SAVED_SIZE =
  PRIMARY.saved.length > 18
    ? 'text-sm'
    : PRIMARY.saved.length > 14
      ? 'text-base'
      : 'text-lg'

export function MyGoalsCard() {
  return (
    <div className="flex flex-col rounded-[2rem] bg-white p-4 ring-1 ring-black/5 sm:p-5">
      {/* header — konsisten dengan kartu lain */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
            <Goal className="size-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Tabungan Impian</p>
            <p className="text-xs text-ink/45">Sinking funds</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Tambah goal baru"
          className="flex size-8 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/10 transition-colors hover:bg-sage active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.4} />
        </button>
      </div>

      {/* hero card — light & lembut: gauge persen + rincian nominal */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-b from-sage/70 via-cream to-cream p-5 ring-1 ring-black/[0.04] sm:p-6">
        {/* glow mint sangat lembut di belakang gauge */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-6 h-24 w-44 -translate-x-1/2 rounded-full bg-mint/20 blur-3xl"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {PRIMARY.name}
            </p>
            <p className="mt-0.5 text-[11px] text-ink/45">Goal utama</p>
          </div>
          <button
            type="button"
            aria-label="Lihat detail goal"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5 transition-colors hover:bg-sage"
          >
            <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>

        {/* gauge setengah lingkaran — pusat hanya menampilkan persen (selalu muat) */}
        <div className="relative mx-auto mt-3 w-full max-w-[224px]">
          <svg viewBox="0 0 200 116" className="block h-auto w-full" aria-hidden>
            <defs>
              <linearGradient id="goalArcLight" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#17543c" />
                <stop offset="100%" stopColor="#b7e04b" />
              </linearGradient>
            </defs>
            {/* track */}
            <path
              d={ARC}
              fill="none"
              stroke="rgba(18,40,31,0.08)"
              strokeWidth={13}
              strokeLinecap="round"
            />
            {/* progress — keyframe donut-grow (dasharray inline) */}
            <path
              d={ARC}
              fill="none"
              stroke="url(#goalArcLight)"
              strokeWidth={13}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${PRIMARY.pct / 100} 1`}
              className="animate-[donut-grow_1.1s_cubic-bezier(0.22,1,0.36,1)_backwards]"
              style={{
                filter: 'drop-shadow(0 6px 14px rgba(16,58,42,0.22))',
                animationDelay: '150ms',
              }}
            />
            {/* indikator di ujung arc */}
            <g
              className="animate-[fade-pop_0.45s_ease_both]"
              style={{ animationDelay: '950ms' }}
            >
              <circle
                cx={TIP_X}
                cy={TIP_Y}
                r={8}
                fill="#b7e04b"
                stroke="#f4f8ef"
                strokeWidth={2.5}
              />
              <circle cx={TIP_X} cy={TIP_Y} r={3} fill="#103a2a" />
            </g>
          </svg>

          {/* persen di tengah arc */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-0.5 text-center">
            <span className="text-[28px] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {PRIMARY.pct}%
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/40">
              tercapai
            </span>
          </div>
        </div>

        {/* nominal — di luar gauge, angka besar tidak pernah menimpa chart */}
        <div className="relative mt-4 border-t border-black/[0.06] pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-ink/40">
              Terkumpul
            </p>
            <p
              className={`truncate font-semibold text-ink tabular-nums ${SAVED_SIZE}`}
            >
              {PRIMARY.saved}
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45">
              Target
            </p>
            <p className="truncate text-sm font-medium text-ink/55 tabular-nums">
              {PRIMARY.target}
            </p>
          </div>
        </div>
      </div>

      {/* goal sekunder — mini list modern dengan progress bar tipis */}
      <div className="mt-3 flex flex-col gap-2">
        {SECONDARY.map((goal) => (
          <div
            key={goal.name}
            className="rounded-xl bg-cream px-3.5 py-3 ring-1 ring-black/[0.03] transition-colors hover:bg-sage/60"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: goal.color }}
                />
                <p className="truncate text-[13px] font-medium text-ink">
                  {goal.name}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs font-semibold text-ink/60 tabular-nums">
                  {goal.pct}%
                </span>
                <button
                  type="button"
                  aria-label={`Detail ${goal.name}`}
                  className="flex size-6 items-center justify-center rounded-full text-ink/35 transition-colors hover:bg-black/5 hover:text-ink"
                >
                  <ChevronDown className="size-3.5" strokeWidth={2.2} />
                </button>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: `${goal.pct}%`, backgroundColor: goal.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

