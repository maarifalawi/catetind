'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlantIllustration, STAGE_NAMES, type PlantStage } from './plant-illustration'

type PlantState = {
  stage: PlantStage
  hp: number
  activeDays: number
  wilted: boolean
}

const STAGES: PlantStage[] = [1, 2, 3, 4]

/**
 * Plant Detail View (inventaris modal j, Domain 3B):
 * animasi tanaman + breakdown stats. Framing selalu positif -
 * TIDAK ada angka streak tertulis ("kamu skip Y hari" dilarang, baris 1780).
 */
export function PlantDetailModal({
  open,
  onClose,
  plant,
}: {
  open: boolean
  onClose: () => void
  plant: PlantState
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detail tanaman"
                className="w-full max-w-sm rounded-3xl bg-cream p-6 shadow-[0_20px_60px_-12px_rgba(80,58,58,0.15)] ring-1 ring-soil/12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Tanamanmu 🌿
          </h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-cream text-ink ring-1 ring-soil/12 transition-colors hover:bg-sage"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* tanaman besar */}
        <div className="relative mt-2 flex justify-center rounded-2xl bg-gradient-to-b from-sage/60 to-cream py-4 ring-1 ring-soil/8">
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-4 h-16 w-32 rounded-full bg-mint/25 blur-2xl"
          />
          <PlantIllustration
            stage={plant.stage}
            wilted={plant.wilted}
            className="relative w-40"
          />
        </div>

        {/* progres tahap - dots Benih -> Berbunga */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            {STAGES.map((s) => (
              <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'size-2.5 rounded-full transition-colors',
                    s < plant.stage && 'bg-forest',
                    s === plant.stage && 'bg-mint ring-4 ring-mint/25',
                    s > plant.stage && 'bg-soil/10',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    s === plant.stage ? 'text-forest' : 'text-ink/40',
                  )}
                >
                  {STAGE_NAMES[s]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* stats - framing positif semua */}
        <div className="mt-5 space-y-2.5">
          <StatRow label="Kesehatan tanaman">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-soil/[0.11]">
                <span
                  className={cn(
                    'block h-full rounded-full',
                    plant.hp > 20 ? 'bg-hud-sage' : 'bg-hud-terracotta',
                  )}
                  style={{ width: `${plant.hp}%` }}
                />
              </span>
              <b className="font-semibold text-ink tabular-nums">{plant.hp}%</b>
            </span>
          </StatRow>
          <StatRow label="Hari aktif bulan ini">
            <b className="font-semibold text-ink tabular-nums">
              {plant.activeDays} hari
            </b>
          </StatRow>
        </div>

        <p className="mt-5 rounded-2xl bg-cream/70 px-4 py-3 text-center text-[13px] leading-relaxed text-ink/60 ring-1 ring-soil/8">
          Kamu udah catat <b className="text-forest">{plant.activeDays} hari</b>{' '}
          bulan ini - tanamanmu tumbuh karena konsistensimu. Lanjutin ya! 💚
        </p>
      </div>
    </div>
  )
}

function StatRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink/55">{label}</span>
      {children}
    </div>
  )
}
