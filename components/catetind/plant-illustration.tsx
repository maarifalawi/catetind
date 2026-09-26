import { cn } from '@/lib/utils'

/* tahap pertumbuhan tanaman - kanon Domain 3B */
export type PlantStage = 1 | 2 | 3 | 4

export const STAGE_NAMES: Record<PlantStage, string> = {
  1: 'Benih',
  2: 'Tunas',
  3: 'Tanaman Muda',
  4: 'Berbunga',
}

/**
 * SVG tanaman statis untuk homescreen (resolusi CANDRA: animasi Lottie penuh
 * hanya di-lazy-load di detail view - home pakai SVG ringan + sway CSS).
 * `wilted` = state Tanaman Layu (HP <=20): daun desaturated & turun.
 */
export function PlantIllustration({
  stage,
  wilted = false,
  className,
}: {
  stage: PlantStage
  wilted?: boolean
  className?: string
}) {
  return (
        <svg
      viewBox="0 0 200 220"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label={`Tanaman tahap ${STAGE_NAMES[stage]}${wilted ? ' (layu)' : ''}`}
    >
      {/* defs - gradien warna untuk efek modern */}
      <defs>
        <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#91bb9e" />
          <stop offset="100%" stopColor="#45594e" />
        </linearGradient>
        <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#91bb9e" />
          <stop offset="100%" stopColor="#91bb9e" />
        </linearGradient>
        {/* Highlight cahaya di daun - efek fresi */}
        <radialGradient id="leafHighlight" cx="30%" cy="30%" r="70%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#fbf6d9" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fbf6d9" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* bayangan tanah lembut */}
      <ellipse cx="100" cy="212" rx="46" ry="6" fill="#503a3a" opacity="0.08" />

      {/* batang + dedaunan + bunga - berayun dari pangkal pot */}
      <g
        className={cn(
          !wilted && 'animate-[plant-sway_5s_ease-in-out_infinite]',
          wilted && 'opacity-75 saturate-50',
        )}
        style={{ transformOrigin: '100px 176px' }}
      >
        {stage === 1 && (
          /* benih - gundukan tanah + biji kecil */
          <g>
            <path
              d="M84 176 Q100 162 116 176 Z"
              fill="#b89191"
              opacity="0.85"
            />
            <ellipse cx="100" cy="168" rx="5.5" ry="4.5" fill="#ffb885" />
            <circle cx="98" cy="166.5" r="1.4" fill="#ebe4de" />
          </g>
        )}

        {stage >= 2 && (
          /* batang */
          <path
            d={stage === 2 ? 'M100 176 C 100 166 100 160 100 152' : 'M100 176 C 101 158 99 138 100 108'}
            fill="none"
            stroke="#45594e"
            strokeWidth={stage === 2 ? 4 : 5}
            strokeLinecap="round"
          />
        )}

        {stage === 2 && (
          /* tunas - sepasang daun mungil */
          <g>
                        <path
              d="M100 154 C 90 152 84 146 82 138 C 92 139 99 145 100 152 Z"
              fill="url(#leafGrad1)"
            />
            <path
              d="M100 154 C 110 152 116 146 118 138 C 108 139 101 145 100 152 Z"
              fill="url(#leafGrad1)"
            />
          </g>
        )}

        {stage >= 3 && (
          /* tanaman muda - dua pasang daun */
          <g
            className={cn(wilted && 'rotate-6')}
            style={{ transformOrigin: '100px 120px' }}
          >
                        <path
              d="M100 148 C 82 146 70 136 66 120 C 84 121 96 131 100 144 Z"
              fill="url(#leafGrad1)"
            />
            <path
              d="M100 148 C 118 146 130 136 134 120 C 116 121 104 131 100 144 Z"
              fill="url(#leafGrad1)"
            />
            <path
              d="M100 126 C 86 124 77 116 74 104 C 88 105 97 113 100 123 Z"
              fill="url(#leafGrad2)"
            />
            <path
              d="M100 126 C 114 124 123 116 126 104 C 112 105 103 113 100 123 Z"
              fill="url(#leafGrad2)"
            />
            {/** Highlight cahaya pada setiap daun untuk efek modern */}
            <path
              d="M100 148 C 82 146 70 136 66 120 C 84 121 96 131 100 144 Z"
              fill="url(#leafHighlight)"
              opacity={wilted ? 0.1 : 0.25}
            />
            <path
              d="M100 126 C 114 124 123 116 126 104 C 112 105 103 113 100 123 Z"
              fill="url(#leafHighlight)"
              opacity={wilted ? 0.1 : 0.25}
            />
          </g>
        )}

        {stage === 4 && (
          /* bunga di pucuk - kelopak plum lembut + inti cantelope */
          <g style={{ transformOrigin: '100px 96px' }}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse
                key={deg}
                cx="100"
                cy="84"
                rx="7"
                ry="12"
                fill="#b89191"
                opacity="0.9"
                transform={`rotate(${deg} 100 96)`}
              />
            ))}
            <circle cx="100" cy="96" r="6.5" fill="#ffb885" />
            <circle cx="100" cy="96" r="3" fill="#ebe4de" />
          </g>
        )}
      </g>

      {/* pot - rim + body */}
      <rect x="58" y="168" width="84" height="12" rx="6" fill="#52685c" />
      <path
        d="M64 180 h72 l-7.5 28 a6 6 0 0 1 -5.8 4.6 H77.3 a6 6 0 0 1 -5.8 -4.6 Z"
        fill="#45594e"
      />
      {/* aksen mint di pot */}
      <circle cx="100" cy="196" r="5" fill="#91bb9e" opacity="0.9" />
    </svg>
  )
}
