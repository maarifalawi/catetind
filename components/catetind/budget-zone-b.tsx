'use client'

import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { SinkingFundCard } from './sinking-fund-card'
import {
  BUDGET_ADD_PLACEHOLDER,
  BUDGET_ZONE_B_COPY,
  NUDGE_COPY,
  SOCIAL_PROOF_COPY,
  fundsTotals,
  maskNominal,
  type SinkingFundItem,
} from '@/lib/data/budget'

/* ── ZONA B — Celengan Impian (sinking funds) ────────────────────────────────
   Kartu tanaman yang tumbuh, nudge penyemangat kalau belum setor bulan ini,
   empty state, dan social proof. Semua elemen tambahan hanya muncul saat
   relevan — begitu ada setoran, kartu nudge hilang sendiri.

   REDESAIN (paket 101 · permintaan pemilik produk: "antar celengannya dibuat
   batas, jangan digabung") — daftar TIDAK lagi satu kartu panjang ber-hairline.
   Tiap celengan sekarang kartu sendiri (`space-y-3`), jadi batasnya terbaca
   sebelum user membaca isinya:

     · ringkasan agregat = kartu terpisah di atas, gradien mint→sage yang lembut;
     · tiap celengan   = kartu putih dengan ring tipis + shadow lembut;
     · pintu tanam baru = kartu bergaris putus-putus (bukan baris di dalam kartu);
     · empty state punya CTA-nya sendiri, jadi tidak muncul dua ajakan sekaligus.

   Warna tetap keluarga brand (forest · cream · sage · mint · plum); yang
   ditegaskan adalah chrome kartu, bukan warna baru. ────────────────────────── */

export function BudgetZoneB({
  funds,
  masked,
  currentDay,
  onAddGoal,
  onContribute,
  onOpenFund,
  onDeleteGoal,
}: {
  funds: SinkingFundItem[]
  masked: boolean
  currentDay: number
  onAddGoal: () => void
  onContribute: (fund: SinkingFundItem) => void
  onOpenFund: (fund: SinkingFundItem) => void
  /** hapus celengan (paket 60.2) — halaman yang memasang konfirmasi + Undo */
  onDeleteGoal: (fund: SinkingFundItem) => void
}) {
  /* nudge hanya bila belum ada setoran bulan ini dan bulan sudah berjalan
     (bukan di hari-hari pertama, biar tidak nagih) */
  const showNudge =
    funds.length > 0 && currentDay > 5 && funds.every((fund) => !fund.contributedThisMonth)
  /* ringkasan agregat — menjumlah daftar yang SAMA dengan kartu di bawah, jadi
     strip atas & bar tiap tanaman tak bisa berbeda angka */
  const totals = fundsTotals(funds)

  return (
    <div className="space-y-4">
      {/* ── nudge lembut — "gapapa, mulai lagi kapan aja" ─────────────────── */}
      {showNudge && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-sage/60 via-sage/40 to-mint/15 p-4 ring-1 ring-soil/[0.06]"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-[17px] ring-1 ring-soil/[0.06]">
              🌿
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] leading-relaxed text-forest-muted">{NUDGE_COPY}</p>
              <button
                type="button"
                onClick={() => onContribute(funds[0])}
                className="mt-2.5 rounded-full bg-cream px-3.5 py-2 text-[13px] font-medium text-forest ring-1 ring-forest/10 transition-colors hover:bg-cream/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
              >
                {BUDGET_ZONE_B_COPY.nudgeCta}
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── RINGKASAN AGREGAT — kartu sendiri, terpisah dari daftar ────────
          Total terkumpul dari total target semua celengan di konteks ini —
          jawaban cepat "seberapa jauh impianku" sebelum membaca tiap tanaman.
          Isian bar-nya MINT (keluarga "tumbuh"): untuk celengan makin penuh =
          makin baik, jadi tidak ada nada peringatan. */}
      {funds.length > 0 && (
        <section
          aria-label={BUDGET_ZONE_B_COPY.summaryLead}
          className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-mint/25 via-sage/40 to-cream p-4 ring-1 ring-soil/[0.06] shadow-[0_18px_44px_-40px_rgba(69,89,78,0.55)]"
        >
          {/* halo mint — dekorasi, tidak membawa informasi */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-9 -top-12 size-28 rounded-full bg-mint/20 blur-2xl"
          />

          <div className="relative flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-muted">
                {BUDGET_ZONE_B_COPY.summaryLead}
              </p>
              <p className="mt-1.5 truncate text-[24px] font-semibold leading-none tracking-tight tabular-nums text-forest">
                {maskNominal(totals.current, masked)}
              </p>
              <p className="mt-1.5 text-[12px] font-medium tabular-nums text-forest-muted">
                {BUDGET_ZONE_B_COPY.summaryOf(maskNominal(totals.target, masked))}
              </p>
            </div>
            <span className="flex shrink-0 flex-col items-end">
              <span className="font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-forest">
                {Math.round(totals.percent)}%
              </span>
              <span className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-forest-muted">
                {BUDGET_ZONE_B_COPY.summaryPctSuffix}
              </span>
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={BUDGET_ZONE_B_COPY.summaryAria(
              maskNominal(totals.current, masked),
              maskNominal(totals.target, masked),
              Math.round(totals.percent),
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(totals.percent)}
            className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream/80"
          >
            <div
              className="h-full rounded-full bg-mint transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ width: `${totals.percent}%` }}
            />
          </div>
        </section>
      )}

      {/* ── DAFTAR CELENGAN / EMPTY STATE ────────────────────────────────
          Tiap celengan = kartu sendiri (`space-y-3`). Sebelumnya semua celengan
          menumpang di satu kartu panjang ber-hairline, jadi batas antar impian
          tidak terbaca — user harus memilah barisnya sendiri. */}
      {funds.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-forest/15 bg-sage/25 px-5 py-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-cream text-[22px] ring-1 ring-soil/[0.06]">
            🌱
          </span>
          <p className="mx-auto mt-3 max-w-[19rem] text-[13.5px] leading-relaxed text-forest-muted">
            {BUDGET_ZONE_B_COPY.emptyBody}
          </p>
          <button
            type="button"
            onClick={onAddGoal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-mint/30 px-4 py-2.5 text-[13px] font-medium text-forest ring-1 ring-mint/60 transition-colors hover:bg-mint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
          >
            <Sprout className="size-3.5" strokeWidth={2.6} aria-hidden />
            {BUDGET_ZONE_B_COPY.emptyCta}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {funds.map((fund, index) => (
            <motion.li
              key={fund.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 * index, ease: [0.22, 1, 0.36, 1] }}
            >
              <SinkingFundCard
                fund={fund}
                masked={masked}
                onOpen={onOpenFund}
                onContribute={onContribute}
                onDelete={onDeleteGoal}
              />
            </motion.li>
          ))}
        </ul>
      )}

      {/* ── TANAM CELENGAN BARU — kartu putus-putus, bukan baris di dalam
          kartu daftar. Saat daftar kosong, CTA empty state yang mengambil
          peran ini supaya tidak ada dua ajakan yang sama di satu layar. */}
      {funds.length > 0 && (
        <button
          type="button"
          onClick={onAddGoal}
          className="group flex w-full items-center gap-3 rounded-[1.4rem] border border-dashed border-forest/20 bg-sage/20 px-4 py-3.5 text-left transition-colors hover:border-forest/30 hover:bg-sage/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-[0.99]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-forest ring-1 ring-soil/[0.06] transition-transform duration-300 group-hover:scale-105">
            <Sprout className="size-4" strokeWidth={2.4} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-medium text-forest">
              {BUDGET_ADD_PLACEHOLDER.goalTitle}
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-forest-muted">
              {BUDGET_ADD_PLACEHOLDER.goalBody}
            </span>
          </span>
        </button>
      )}

      <p className="px-1 text-center text-[11.5px] leading-relaxed text-forest/30">
        {SOCIAL_PROOF_COPY}
      </p>
    </div>
  )
}
