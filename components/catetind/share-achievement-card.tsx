import { BadgeCheck, CalendarDays, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoWordmark } from './logo-wordmark'
import { PlantIllustration } from './plant-illustration'
import {
  SHARE_CARD_DOMAIN,
  SHARE_HASHTAG,
  SHARE_STAGE_CAPTION,
  achievementRows,
  extraMilestones,
  shareCardLead,
  type ShareCard,
} from '@/lib/data/share'

/* ── Kartu Pencapaian (PRD 6547–6576) — SATU komponen, dua pemakai ───────────
   Dipakai oleh halaman publik `/share/[id]` dan oleh panel bagikan di dalam app,
   supaya yang di-share user PERSIS sama dengan yang dilihat penerimanya. Kalau
   kartu ini digambar dua kali, cepat atau lambat keduanya akan berbeda isi —
   dan yang berbeda itu bocor di halaman publik.

   Keputusan desain:
   · Permukaan Evergreen gelap (`forest`) — kartu ini memang pajangan, bukan
     formulir. Di antara kanvas putih app, inilah satu-satunya tempat yang
     "berteriak" dan itu disengaja: layak di-screenshot ulang (PRD 6576).
   · Jendela tanaman PUTIH di tengah kartu: pot & daun SVG memakai Evergreen,
     jadi di atas latar gelap ia butuh alas terang supaya tetap terbaca —
     sekaligus mengikuti aturan permukaan repo (putih = `bg-canvas`).
   · Tanpa satu pun tombol di dalam kartu: kalau ada aksi, screenshot-nya jadi
     angkuh. Aksi hidup di luar kartu (CTA & panel bagikan).
   ────────────────────────────────────────────────────────────────────────── */

export function ShareAchievementCard({
  card,
  className,
}: {
  card: ShareCard
  className?: string
}) {
  const rows = achievementRows(card)
  const extra = extraMilestones(card)

  return (
    <article
      aria-label={`Kartu pencapaian ${card.ownerName}, ${card.monthLabel}`}
      className={cn(
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest to-forest-soft p-5 text-cream ring-1 ring-soil/12 shadow-[0_26px_60px_-38px_rgba(0,0,0,0.55)] sm:p-6',
        className,
      )}
    >
      {/* kepala — wordmark di kiri (pemiliknya jelas), bulan di kanan */}
      <header className="flex items-center justify-between gap-3">
        <LogoWordmark tone="light" className="h-4" />
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream/15 px-2.5 py-1 text-[10.5px] font-medium text-cream/85">
          <CalendarDays className="size-3" strokeWidth={2.4} aria-hidden />
          {card.monthLabel}
        </span>
      </header>

      {/* tiga baris pencapaian — jumlah catatan, hari konsisten, milestone */}
      <div className="mt-5">
        <p className="font-display text-[19px] font-medium leading-snug tracking-tight text-cream">
          {shareCardLead(card.ownerName)}
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {rows.map((row) => {
            /* milestone yang belum ada ditandai tunas, bukan centang: jangan
               terlihat seperti pencapaian yang sudah tercapai (PRD 5174–5177) */
            const stillGrowing = row.key === 'milestone' && card.milestones.length === 0
            const Icon = stillGrowing ? Sprout : BadgeCheck
            return (
              <li key={row.key} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full',
                    stillGrowing ? 'bg-cream/12 text-cream/60' : 'bg-mint/25 text-mint',
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
                </span>
                <span className="text-[13.5px] font-medium leading-snug tabular-nums text-cream">
                  {row.text}
                </span>
              </li>
            )
          })}
        </ul>

        {/* milestone kedua dan seterusnya jadi pil kecil — tidak menambah baris
            keempat supaya ritme "3 pencapaian" tetap terbaca */}
        {extra.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {extra.map((milestone) => (
              <li
                key={milestone}
                className="rounded-full bg-mint/20 px-2.5 py-1 text-[11px] font-medium text-cream/85"
              >
                + {milestone}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* jendela tanaman — ilustrasi yang SUDAH ada di app, tanpa aset baru */}
      <div className="mt-5 rounded-[1.75rem] bg-canvas px-4 pb-2.5 pt-3 ring-1 ring-cream/20">
        <PlantIllustration
          stage={card.plantStage}
          className="mx-auto w-[116px] motion-reduce:[&_g]:animate-none"
        />
        <p className="mt-1 text-center text-[12px] font-medium text-forest/70">
          {SHARE_STAGE_CAPTION[card.plantStage]}
        </p>
      </div>

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-cream/15 pt-3">
        <p className="font-display text-[15px] font-medium tracking-tight text-mint">
          {SHARE_HASHTAG}
        </p>
        <p className="font-mono text-[10.5px] text-cream/50">{SHARE_CARD_DOMAIN}</p>
      </footer>
    </article>
  )
}
