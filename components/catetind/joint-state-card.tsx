'use client'

import { HeartHandshake, Hourglass, ListChecks, Wallet } from 'lucide-react'
import { JOINT_PERSONAL_CASH_COPY, JOINT_STATE_COPY, JOINT_STEP_COPY } from '@/lib/data/joint'
import { cn } from '@/lib/utils'

/* ── KONDISI KANTONG BERSAMA: TIGA KEADAAN (paket 61.3) ─────────────────────
   Halaman `/joint` punya tiga wujud yang sangat berbeda, dan sebelum paket 61
   perpindahannya tidak pernah dikatakan: user menekan "Buat Dompet & Ajak
   Pasangan", layar berubah, lalu ia harus menebak apa yang barusan terjadi —
   apakah kantongnya sudah jadi? apakah catatan yang dilihatnya miliknya atau
   data contoh? karena itu kartu ini MENGATAKAN keadaannya:

     keadaan 1 (empty)   — belum ada kantong → langkah & apa yang terjadi;
     keadaan 2 (waiting) — kantong ada, pasangan belum gabung → kode undangan;
     keadaan 3 (active)  — pasangan sudah gabung → buku besar terbuka.

   Kalimatnya tinggal di `lib/data/joint.ts` (`JOINT_STATE_COPY`), dan satu blok
   di bawahnya menyatakan RELASI kantong ini dengan kas pribadi
   (`JOINT_PERSONAL_CASH_COPY`): kantong bersama tidak menyentuh saldo dompet
   siapa pun, dan itu fakta teknis yang tidak boleh ditebak user. */

const STATE_ICON = {
  empty: HeartHandshake,
  waiting: Hourglass,
  active: ListChecks,
} as const

const STATE_TONE = {
  empty: 'bg-hud-amber/20 text-hud-terracotta ring-hud-amber/40',
  waiting: 'bg-hud-amber/15 text-hud-terracotta ring-hud-amber/30',
  active: 'bg-hud-sage/25 text-forest ring-hud-sage/40',
} as const

export function JointStateCard({ state }: { state: 'empty' | 'waiting' | 'active' }) {
  const copy = JOINT_STATE_COPY[state]
  const Icon = STATE_ICON[state]
  /* H9-2 - indeks langkah yang sedang berjalan (0..2) */
  const stepIndex = state === 'empty' ? 0 : state === 'waiting' ? 1 : 2

  return (
    <section className="mt-3 rounded-[1.75rem] bg-cream px-5 py-4 ring-1 ring-soil/10">
      {/* H9-2 (audit UI/UX): bar progres 3 langkah supaya user tahu ia sedang
          di langkah mana. */}
      <div role="group" aria-label={JOINT_STEP_COPY.aria} className="mb-3.5 flex items-center gap-1.5">
        {JOINT_STEP_COPY.steps.map((label, i) => {
          const done = state === 'active' || i < stepIndex
          const current = !done && i === stepIndex
          const mark = done
            ? JOINT_STEP_COPY.marks.done
            : current
              ? JOINT_STEP_COPY.marks.current
              : JOINT_STEP_COPY.marks.todo
          return (
            <div key={label} className="flex flex-1 items-center gap-1.5">
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]',
                  done ? 'bg-mint/40' : current ? 'bg-hud-amber/30' : 'bg-soil/[0.08]',
                )}
                aria-hidden
              >
                {mark}
              </span>
              <span
                className={cn(
                  'truncate text-[10.5px] font-medium',
                  done || current ? 'text-forest/70' : 'text-forest/40',
                )}
              >
                {label}
              </span>
              {i < JOINT_STEP_COPY.steps.length - 1 && (
                <span aria-hidden className="h-px flex-1 bg-soil/12" />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset',
            STATE_TONE[state],
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2.3} aria-hidden />
        </span>
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-soil/[0.1] px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-forest/50">
            {copy.badge}
          </span>
          <h2 className="mt-1.5 font-display text-[15px] font-semibold tracking-tight text-forest">
            {copy.title}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-forest/55">{copy.body}</p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-forest/45">{copy.note}</p>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sage/50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-forest/65">
        <Wallet className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
        {JOINT_PERSONAL_CASH_COPY}
      </p>
    </section>
  )
}
