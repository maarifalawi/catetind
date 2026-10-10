import { cn } from '@/lib/utils'
import { PLANT_SLEEP_COPY } from '@/lib/data/renewal'

/* tahap pertumbuhan tanaman - kanon Domain 3B */
export type PlantStage = 1 | 2 | 3 | 4

export const STAGE_NAMES: Record<PlantStage, string> = {
  1: 'Benih',
  2: 'Tunas',
  3: 'Tanaman Muda',
  4: 'Berbunga',
}

/* ── HELAI DAUN (dipakai berulang di tahap 2–4) ──────────────────────────────
   Badan daun + tulang tengah tipis. `deep` memakai gradien lebih tua supaya
   daun di lapis bawah terasa punya kedalaman — bukan tumpukan bentuk yang rata. */
function Leaf({ d, vein, deep = false }: { d: string; vein: string; deep?: boolean }) {
  return (
    <g>
      <path d={d} fill={deep ? 'url(#catetindLeafDeep)' : 'url(#catetindLeaf)'} />
      <path
        d={vein}
        fill="none"
        stroke="#2f3d35"
        strokeWidth="0.9"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
    </g>
  )
}

/* ── BUNGA BERLAPIS (tahap 4) ────────────────────────────────────────────────
   Dua lapis kelopak (belakang lebih pucat, depan lebih pekat) + inti dengan
   serbuk sari. Jumlah kelopak bisa 5 atau 6 supaya tiap kuntum tidak identik —
   tanaman asli tidak pernah simetris sempurna. */
function Bloom({
  cx,
  cy,
  scale = 1,
  rotation = 0,
  petals = 6,
}: {
  cx: number
  cy: number
  scale?: number
  rotation?: number
  petals?: number
}) {
  const angles = Array.from({ length: petals }, (_, i) => (360 / petals) * i)
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotation}) scale(${scale})`}>
      {angles.map((deg) => (
        <ellipse
          key={`back-${deg}`}
          cx="0"
          cy="-11.5"
          rx="6.6"
          ry="11.5"
          fill="url(#catetindPetalBack)"
          transform={`rotate(${deg})`}
        />
      ))}
      {angles.map((deg) => (
        <ellipse
          key={`front-${deg}`}
          cx="0"
          cy="-8.6"
          rx="5"
          ry="8.8"
          fill="url(#catetindPetal)"
          transform={`rotate(${deg + 180 / petals})`}
        />
      ))}
      <circle r="5.6" fill="url(#catetindCore)" />
      {angles.map((deg) => (
        <circle
          key={`pollen-${deg}`}
          cx={Math.cos((deg * Math.PI) / 180) * 3.2}
          cy={Math.sin((deg * Math.PI) / 180) * 3.2}
          r="1"
          fill="#fff7ea"
          opacity="0.9"
        />
      ))}
      <circle r="1.9" fill="#ffffff" opacity="0.65" />
    </g>
  )
}

/**
 * SVG tanaman (resolusi CANDRA: animasi penuh hanya di-lazy-load di detail view
 * — home pakai SVG ringan + sway CSS, tanpa Lottie).
 *
 * `wilted`   = state Tanaman Layu (HP ≤ 20): daun desaturated & merunduk.
 * `sleeping` = state VI "Tanaman Sleep Mode" (inventaris 137 · PRD 4542), dipakai
 *              saat masa aktif langganan habis: greyscale + mata tertutup + ayunan
 *              berhenti. Ini SENGAJA berbeda dari `wilted`: layu = butuh dirawat,
 *              tidur = menunggu — tidak ada rasa bersalah yang perlu dipasang.
 *
 * Semua warna diambil dari palet kanon (mint/forest/plum/cantelope/olive), tanpa
 * hex di luar palet. Gradien memakai id TETAP: tiap instance menggambar definisi
 * yang identik, jadi beberapa tanaman di satu halaman tetap sewarna.
 */
export function PlantIllustration({
  stage,
  wilted = false,
  sleeping = false,
  className,
}: {
  stage: PlantStage
  wilted?: boolean
  /** true = mode "tidur" selama grace/post-grace (tanpa angka HP) */
  sleeping?: boolean
  className?: string
}) {
  const label = sleeping
    ? PLANT_SLEEP_COPY.aria
    : `Tanaman tahap ${STAGE_NAMES[stage]}${wilted ? ' (layu)' : ''}`

  return (
    <svg
      viewBox="0 0 200 220"
      className={cn('h-auto w-full', sleeping && 'grayscale', className)}
      role="img"
      aria-label={label}
    >
      {/* defs - seluruh gradien palet kanon, dipakai lintas tahap */}
      <defs>
        <radialGradient id="catetindGlow" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#91bb9e" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#91bb9e" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#91bb9e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="catetindLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bcdcc3" />
          <stop offset="48%" stopColor="#8fbba0" />
          <stop offset="100%" stopColor="#50695a" />
        </linearGradient>
        <linearGradient id="catetindLeafDeep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9cc4a9" />
          <stop offset="100%" stopColor="#3f5147" />
        </linearGradient>
        <linearGradient id="catetindStem" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7aa98f" />
          <stop offset="100%" stopColor="#45594e" />
        </linearGradient>
        <linearGradient id="catetindPot" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5f776a" />
          <stop offset="100%" stopColor="#3a4b42" />
        </linearGradient>
        <linearGradient id="catetindPotRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#809a88" />
          <stop offset="100%" stopColor="#52685c" />
        </linearGradient>
        <linearGradient id="catetindPetalBack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f3d3c2" />
          <stop offset="100%" stopColor="#d3a2a8" />
        </linearGradient>
        <linearGradient id="catetindPetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f0c2ac" />
          <stop offset="100%" stopColor="#b89191" />
        </linearGradient>
        <radialGradient id="catetindCore" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffe7b4" />
          <stop offset="55%" stopColor="#ffb885" />
          <stop offset="100%" stopColor="#e0996a" />
        </radialGradient>
        <radialGradient id="catetindSheen" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* halo mint lembut di belakang tanaman + bayangan tanah */}
      <ellipse cx="100" cy="118" rx="86" ry="98" fill="url(#catetindGlow)" />
      <ellipse cx="100" cy="212" rx="52" ry="7" fill="#000000" opacity="0.1" />

      {/* seluruh tanaman berayun dari pangkal pot; `wilted` membuatnya merunduk */}
      <g
        className={cn(!wilted && !sleeping && 'animate-[plant-sway_5s_ease-in-out_infinite]')}
        style={{ transformOrigin: '100px 176px' }}
      >
        <g
          className={cn(wilted && 'translate-y-1 rotate-[3deg] opacity-75 saturate-50')}
          style={{ transformOrigin: '100px 170px' }}
        >
          {/* ── TAHAP 1 · BENIH ──────────────────────────────────────────────
              gundukan tanah + biji dengan tunas mungil yang baru pecah keluar */}
          {stage === 1 && (
            <g>
              <path d="M70 168 Q100 145 130 168 Z" fill="#6f5144" />
              <path d="M77 168 Q100 152 123 168 Z" fill="#7d5c4d" />
              <ellipse cx="100" cy="159.5" rx="7" ry="5.4" fill="#c98d96" />
              <ellipse cx="100" cy="159.5" rx="7" ry="5.4" fill="url(#catetindSheen)" />
              <path
                d="M100 157 c 0 -5.4 -3.6 -8.6 -9 -9.6 c 1 5.4 4.4 8.6 9 9.6 Z"
                fill="url(#catetindLeaf)"
              />
            </g>
          )}

          {/* ── TAHAP 2 · TUNAS ───────────────────────────────────────────── */}
          {stage === 2 && (
            <g>
              <path
                d="M100 170 C 100 161 100 152 100 143"
                fill="none"
                stroke="url(#catetindStem)"
                strokeWidth="4.4"
                strokeLinecap="round"
              />
              <Leaf
                d="M100 148 C 88 146 79 138 76 127 C 89 129 97 138 100 146 Z"
                vein="M100 146 C 92 143 84 136 78 129"
              />
              <Leaf
                d="M100 148 C 112 146 121 138 124 127 C 111 129 103 138 100 146 Z"
                vein="M100 146 C 108 143 116 136 122 129"
              />
              <ellipse cx="100" cy="140" rx="3.3" ry="5.2" fill="url(#catetindLeaf)" />
            </g>
          )}

          {/* ── BATANG (tahap 3–4) ────────────────────────────────────────── */}
          {stage >= 3 && (
            <path
              d={stage === 4 ? 'M100 172 C 102 148 98 112 100 82' : 'M100 172 C 101 152 99 128 100 104'}
              fill="none"
              stroke="url(#catetindStem)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          )}
          {/* ── TAHAP 3–4 · DEDAUNAN (empat lapis, makin ke atas makin muda) ── */}
          {stage >= 3 && (
            <g style={{ transformOrigin: '100px 150px' }}>
              <Leaf
                d="M100 152 C 80 150 64 139 58 119 C 79 122 94 133 100 148 Z"
                vein="M100 148 C 88 144 72 134 61 123"
                deep
              />
              <Leaf
                d="M100 152 C 120 150 136 139 142 119 C 121 122 106 133 100 148 Z"
                vein="M100 148 C 112 144 128 134 139 123"
                deep
              />
              <Leaf
                d="M100 132 C 85 130 73 121 68 106 C 84 109 96 118 100 129 Z"
                vein="M100 129 C 91 125 80 118 71 109"
              />
              <Leaf
                d="M100 132 C 115 130 127 121 132 106 C 116 109 104 118 100 129 Z"
                vein="M100 129 C 109 125 120 118 129 109"
              />
              <Leaf
                d="M100 114 C 90 112 82 105 79 93 C 90 96 98 103 100 111 Z"
                vein="M100 111 C 94 108 87 102 82 96"
              />
              <Leaf
                d="M100 114 C 110 112 118 105 121 93 C 110 96 102 103 100 111 Z"
                vein="M100 111 C 106 108 113 102 118 96"
              />
              {/* sulur keriting kecil — sentuhan hidup yang tidak kaku */}
              <path
                d="M124 116 C 133 112 136 103 131 96"
                fill="none"
                stroke="#7aa98f"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.8"
              />
            </g>
          )}

          {/* ── TAHAP 3 · KUNCUP & DAUN PUCUK (belum berbunga) ────────────── */}
          {stage === 3 && (
            <g>
              <path
                d="M100 107 c -3.4 0 -6 -3.1 -6 -6.8 c 0 -3.9 2.7 -7 6 -7 c 3.3 0 6 3.1 6 7 c 0 3.7 -2.6 6.8 -6 6.8 Z"
                fill="url(#catetindLeafDeep)"
              />
              <path
                d="M100 107 v-9.4"
                stroke="#2f3d35"
                strokeWidth="0.9"
                strokeOpacity="0.35"
                strokeLinecap="round"
              />
              <ellipse cx="86" cy="110" rx="2.6" ry="4.4" fill="#8fbba0" transform="rotate(-24 86 110)" />
              <ellipse cx="114" cy="112" rx="2.4" ry="4" fill="#8fbba0" transform="rotate(22 114 112)" />
            </g>
          )}

          {/* ── TAHAP 4 · BERBUNGA (kuntum berlapis + serbuk sari) ────────── */}
          {stage === 4 && (
            <g>
              {/* dua daun tambahan di bawah supaya terasa rimbun, bukan sebatang */}
              <Leaf
                d="M100 162 C 86 160 74 152 70 140 C 84 142 95 150 100 158 Z"
                vein="M100 158 C 92 154 82 147 74 142"
                deep
              />
              <Leaf
                d="M100 162 C 114 160 126 152 130 140 C 116 142 105 150 100 158 Z"
                vein="M100 158 C 108 154 118 147 126 142"
                deep
              />
              {/* satu kuntum utama + dua kuntum samping (ukuran & kelopak beda) */}
              <Bloom cx={100} cy={76} scale={1.15} />
              <Bloom cx={71} cy={101} scale={0.8} rotation={-14} petals={5} />
              <Bloom cx={129} cy={96} scale={0.72} rotation={16} petals={5} />
              {/* kuncup yang belum mekar */}
              <ellipse cx="86" cy="82" rx="3.4" ry="5.6" fill="url(#catetindPetalBack)" transform="rotate(-18 86 82)" />
              <ellipse cx="119" cy="70" rx="3" ry="5" fill="url(#catetindPetalBack)" transform="rotate(20 119 70)" />
              {/* serbuk sari beterbangan halus */}
              <circle cx="56" cy="66" r="1.6" fill="#ffb885" opacity="0.7" />
              <circle cx="146" cy="78" r="1.3" fill="#ffb885" opacity="0.6" />
              <circle cx="86" cy="44" r="1.5" fill="#ecd768" opacity="0.75" />
              <circle cx="122" cy="52" r="1.2" fill="#ecd768" opacity="0.6" />
              <circle cx="68" cy="124" r="1.2" fill="#91bb9e" opacity="0.7" />
              <circle cx="134" cy="118" r="1.1" fill="#91bb9e" opacity="0.6" />
            </g>
          )}
        </g>
      </g>

      {/* ── POT (digambar SETELAH tanaman: batang keluar dari balik bibirnya) ── */}
      <g>
        <path
          d="M63 176 h74 l-7.8 29 a7 7 0 0 1 -6.9 4.9 H77.7 a7 7 0 0 1 -6.9 -4.9 Z"
          fill="url(#catetindPot)"
        />
        {/* kilau vertikal tipis di badan pot */}
        <path d="M74 180 l-3.4 24 a4 4 0 0 0 2 2 l3 -26 Z" fill="#ffffff" opacity="0.08" />
        {/* bibir pot + highlight atasnya */}
        <rect x="56" y="166" width="88" height="14" rx="7" fill="url(#catetindPotRim)" />
        <rect x="61" y="167.6" width="78" height="3.6" rx="1.8" fill="#ffffff" opacity="0.22" />
        {/* garis mint tipis sebagai aksen brand */}
        <path
          d="M70 189 q30 9 60 0"
          fill="none"
          stroke="#91bb9e"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M79 197 q21 6 42 0"
          fill="none"
          stroke="#91bb9e"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.35"
        />
      </g>

      {/* wajah tidur di pot (state VI) — dua mata tertutup, tanpa senyum lebar.
          Warnanya memakai evergreen yang SUDAH ada di ilustrasi ini (bukan hex
          baru) dan posisinya di pot supaya geometri tanaman tidak berubah. */}
      {sleeping && (
        <g stroke="#45594e" strokeWidth="2.2" strokeLinecap="round" fill="none" aria-hidden>
          <path d="M82 190 q5 5 10 0" />
          <path d="M108 190 q5 5 10 0" />
        </g>
      )}
    </svg>
  )
}
