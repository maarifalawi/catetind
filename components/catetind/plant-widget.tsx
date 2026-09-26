'use client'

import { memo, useState } from 'react'
import { Droplet, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlantIllustration, STAGE_NAMES, type PlantStage } from './plant-illustration'
import { PlantDetailModal } from './plant-detail-modal'

/* mock state tanaman - nanti dihitung dari habit loop (Domain 3B) */
const MOCK = {
  stage: 3 as PlantStage,
  hp: 82, // Health Points tanaman (streak tersembunyi di balik ini)
  activeDays: 21, // "kamu udah catat 21 hari bulan ini" - framing positif
  wilted: false, // state Layu saat HP <=20
}

/* "nutrisi" tanaman = sinking fund yang sedang dikejar. Dulu widget ini berdiri
   sendiri tanpa konteks ("apa yang bikin tanaman ini tumbuh?"), padahal PRD
   Domain 3B mengikat pertumbuhan tanaman ke progress Tabungan Impian. Angka ini
   nanti dibaca dari sinking_funds; sekarang mock yang selaras dengan kartu
   Tabungan Impian (goal utama, 50%). */
const NUTRITION = {
  goal: 'Liburan ke Jepang',
  pct: 50,
}

/** widget tanaman di homescreen - "teman visual", tap -> Plant Detail (modal j) */
/** Dibungkus `memo` — kartu ini tidak menerima props, jadi tidak perlu ikut
 *  re-render saat HomeScreen mengubah state popup. State lokalnya sendiri
 *  (buka/tutup detail tanaman) tetap bekerja normal karena state itu ada DI
 *  DALAM komponen ini, bukan di parent. */
export const PlantWidget = memo(function PlantWidget() {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <>
              <section
        aria-label="Tanaman kamu"
        className="flex h-full flex-col rounded-[2rem] bg-cream p-6 shadow-[0_4px_24px_-4px_rgba(80,58,58,0.06)] ring-1 ring-soil/5"
      >
        {/* header - konsisten dengan kartu lain */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-sage text-forest">
              <Sprout className="size-4" strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Tanamanmu</p>
                            <p className="text-xs text-ink/45">
                Tahap {MOCK.stage} - {STAGE_NAMES[MOCK.stage]}
              </p>
            </div>
          </div>
          {/* HP visual halus - droplet, bukan angka streak */}
          <span
            className="flex items-center gap-0.5"
            title={`Kesehatan tanaman ${MOCK.hp}%`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Droplet
                key={i}
                className={cn(
                  'size-3',
                  i < Math.round((MOCK.hp / 100) * 5)
                    ? 'fill-mint text-mint-soft'
                    : 'text-soil/10',
                )}
                strokeWidth={1.6}
              />
            ))}
          </span>
        </div>

        {/* area tanaman - tap untuk buka detail */}
                <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label="Lihat detail tanaman"
          className="group relative mt-3 flex flex-1 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-sage/50 via-cream to-cream px-4 pb-6 pt-8 ring-1 ring-soil/[0.04] shadow-[0_4px_20px_-4px_rgba(80,58,58,0.08)] transition-all duration-300 hover:from-sage/70 hover:shadow-[0_8px_32px_-4px_rgba(80,58,58,0.12)]"
        >
          {/* glow mint lembut di belakang tanaman */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-8 h-20 w-36 rounded-full bg-mint/20 blur-2xl"
          />
          <PlantIllustration
            stage={MOCK.stage}
            wilted={MOCK.wilted}
            className="relative w-40 transition-transform duration-300 group-hover:scale-[1.03] sm:w-44"
          />
                    <span className="mt-4 text-[11px] font-medium text-ink/40 transition-colors group-hover:text-forest">
            Tap untuk lihat detail
          </span>
          {/** sparkle kecil di samping teks untuk sentuhan modern */}
          <span className="absolute -top-1 -right-1 opacity-60 group-hover:opacity-100 group-hover:animate-pulse">
            <Sprout className="size-3 text-mint" strokeWidth={2.8} />
          </span>
        </button>

        {/* konteks: apa yang membuat tanaman ini tumbuh — jahitan antara widget
            tanaman dan Tabungan Impian (PRD Domain 2C & 3B) */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-sage/60 px-3 py-2 ring-1 ring-forest/[0.06]">
          <Sprout className="size-3.5 shrink-0 text-forest" strokeWidth={2.4} aria-hidden />
          <p className="text-[11.5px] leading-snug text-ink/65">
            Tumbuh dari <b className="font-semibold text-forest">{NUTRITION.goal}</b>{' '}
            <span className="tabular-nums">({NUTRITION.pct}%)</span> — setor lagi
            biar naik tahap 🌿
          </p>
        </div>

        {/* footer - progress menuju tahap berikutnya, mengisi bawah kartu */}
        <div className="mt-3 border-t border-soil/[0.06] pt-3.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-ink/45">
              Menuju tahap {Math.min(MOCK.stage + 1, 4)} - {' '}
              {STAGE_NAMES[Math.min(MOCK.stage + 1, 4) as PlantStage]}
            </span>
            <span className="font-semibold text-forest tabular-nums">68%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-forest to-mint"
              style={{ width: '68%' }}
            />
          </div>
        </div>
      </section>

      <PlantDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        plant={MOCK}
      />
    </>
  )
})
