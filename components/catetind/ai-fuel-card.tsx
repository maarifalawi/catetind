'use client'

import Link from 'next/link'
import {
  AI_FUEL_COPY,
  AI_PLAN_LOCKED_COPY,
  AI_QUOTA_EXHAUSTED_COPY,
  AI_QUOTA_RESET_FALLBACK,
  AI_UNLIMITED_BADGE,
  planQuota,
} from '@/lib/ai-quota'
import { useAiQuota } from '@/hooks/use-ai-quota'
import { useAiQuotaReset } from '@/hooks/use-ai-quota-reset'
import { useSubscriptionGate } from './subscription-gate-provider'
import { NavTooltip } from './nav-tooltip'

/* ── Bahan Bakar AI (sidebar) — SATU ANGKA, SATU BARIS MAKNA ─────────────────
   Sisa kuota AI di satu kartu kecil yang selalu terlihat. Prinsipnya: sekali
   lirik langsung terbaca.

    1. KEPALA → "Bahan Bakar AI" + nama paket (`lib/data/pricing.ts`).
    2. ANGKA  → satu nilai besar: "23% sisa" (atau "Tanpa batas").
    3. MAKNA  → terjemahan angkanya, satu baris: "≈ 718 catatan AI lagi".
    4. GARIS  → satu hairline 3px, tanpa kilau.
    5. EKOR   → voice + reset dalam SATU baris kecil, tanpa ikon.

   Yang sengaja TIDAK ada di kartu ini: paragraf fair-use, rincian token mentah,
   dan tautan "Top up" terpisah — SELURUH kartu sudah menuju /settings/billing,
   tempat semua rincian itu hidup. Framing selalu "sisa" (tanpa kata limit/habis,
   tanpa merah); satuan voice = PANGGILAN (kanon PRD), bukan jam.
   Saat sidebar collapsed, kartu mengecil jadi angka + tooltip. */

export function AiFuelCard({ collapsed }: { collapsed: boolean }) {
  /* NOL angka di komponen ini — semuanya dari satu snapshot kuota hidup
     (`useAiQuota()` → `lib/ai-usage-store.ts` + `lib/ai-quota.ts`), jadi kartu
     sidebar tidak mungkin beda cerita dengan /settings/billing atau /terms,
     dan angkanya BENAR-BENAR turun setiap kali user memakai AI. */
  const quota = useAiQuota()
  const recordsLeft = quota.recordsLeft
  /* tanggal reset NYATA (paket 86): dibaca setelah mount lewat hook. Selama
     belum terbaca kita menyebut keadaannya apa adanya (`AI_QUOTA_RESET_FALLBACK`)
     alih-alih memajang tanggal mock yang tidak pernah berubah. */
  const reset = useAiQuotaReset()
  const resetDaysLabel = reset ? `${reset.daysUntil} hari lagi` : AI_QUOTA_RESET_FALLBACK
  /* Paket aktif dibaca dari gerbang global — labenya sama dengan /settings/billing
     & /checkout, dan kuota yang berlaku ditentukan `planQuota()` (paket tanpa AI
     tidak punya kuota sama sekali; Paket Sultan tanpa batas). */
  const { plan, planId, planKnown } = useSubscriptionGate()
  const pq = planQuota(planId)
  const planName = plan?.name ?? 'Belum ada paket'

  /* satu label untuk tooltip (collapsed) & pembaca layar — versi ringkas dari
     isi kartu, bukan daftar angka mentah. */
  const summary = pq.unlimited
    ? `${AI_FUEL_COPY.cardTitle} ${planName}: ${AI_UNLIMITED_BADGE} · ${quota.voiceCallsRemaining} panggilan`
    : `${AI_FUEL_COPY.cardTitle} ${planName}: ${quota.remainingPct}% ${AI_FUEL_COPY.remainingLabel} · ${AI_FUEL_COPY.recordsLeft(
        recordsLeft,
      )} · ${quota.voiceCallsRemaining} panggilan · Reset ${resetDaysLabel}`

  /* PAKET TANPA AI (paket 84): kartu tidak menampilkan tangki kosong yang
     membingungkan — cukup nama paket + satu pernyataan, tanpa paragraf.
     Penjelasan lengkapnya tetap dibacakan lewat `aria-label`. */
  if (planKnown && !pq.aiEnabled) {
    return (
      <Link
        href="/checkout"
        aria-label={`${AI_PLAN_LOCKED_COPY.cardTitle}. ${AI_PLAN_LOCKED_COPY.body}`}
        className="group/lock mt-4 block shrink-0 rounded-[1.35rem] bg-cream p-4 ring-1 ring-ink/[0.06] transition-colors duration-200 hover:bg-sage/70"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-forest/40">
            {AI_FUEL_COPY.cardTitle}
          </span>
          <span className="truncate text-[11px] font-medium text-forest/45">{planName}</span>
        </span>
        <span className="mt-2 block text-[12.5px] font-medium leading-snug text-forest">
          {AI_PLAN_LOCKED_COPY.cardTitle}
        </span>
      </Link>
    )
  }

  /* versi collapsed: cukup angkanya, detail lengkap lewat tooltip.
     Paket tanpa batas memakai "∞" — bukan "100%" yang menyiratkan tangki penuh. */
  if (collapsed) {
    return (
      <Link
        href="/settings/billing"
        aria-label={summary}
        className="group/item relative mt-4 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-[12px] font-medium tabular-nums text-forest ring-1 ring-ink/[0.06] transition-colors duration-200 hover:bg-sage active:scale-95 motion-reduce:transition-none"
      >
        <span className="relative" aria-hidden>
          {pq.unlimited ? '∞' : `${quota.remainingPct}%`}
        </span>
        <NavTooltip
          label={summary}
          className="max-w-[240px] whitespace-normal text-left leading-snug"
        />
      </Link>
    )
  }

  return (
    <Link
      href="/settings/billing"
      aria-label={summary}
      /* shrink-0: kartu ini tidak boleh ikut menyusut saat tinggi sidebar
         terbatas — kalau menyusut, barisnya yang paling bawah yang "hilang"
         lebih dulu. Daftar menu di atasnya yang menggulir. */
      className="group/fuel mt-4 block shrink-0 rounded-[1.35rem] bg-cream p-4 ring-1 ring-ink/[0.06] transition-colors duration-200 hover:bg-sage/70"
    >
      {/* 1 · KEPALA — judul + nama paket, satu baris, tanpa pill */}
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-forest/40">
          {AI_FUEL_COPY.cardTitle}
        </span>
        <span className="truncate text-[11px] font-medium text-forest/45">{planName}</span>
      </span>

      {/* 2 · ANGKA — satu nilai besar yang langsung terbaca */}
      <span className="mt-2 flex items-baseline gap-1.5 text-forest">
        {pq.unlimited ? (
          <span className="text-[20px] font-medium leading-none tracking-[-0.03em]">
            {AI_UNLIMITED_BADGE}
          </span>
        ) : (
          <>
            <span className="text-[26px] font-medium leading-none tracking-[-0.04em] tabular-nums">
              {quota.remainingPct}%
            </span>
            <span className="text-[11.5px] font-medium text-forest/45">
              {AI_FUEL_COPY.remainingLabel}
            </span>
          </>
        )}
      </span>

      {!pq.unlimited && (
        <>
          {/* 3 · MAKNA — terjemahan angkanya, bukan istilah teknis */}
          <span className="mt-1 block text-[11.5px] leading-snug tabular-nums text-forest/50">
            {AI_FUEL_COPY.recordsLeft(recordsLeft)}
          </span>

          {/* 4 · GARIS — arah isian = kuota yang MASIH tersisa */}
          <span
            role="progressbar"
            aria-label={quota.exhausted ? AI_QUOTA_EXHAUSTED_COPY.progressLabel : 'Sisa kuota AI'}
            aria-valuenow={quota.remainingPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-3 block h-[3px] w-full overflow-hidden rounded-full bg-ink/[0.08]"
          >
            <span
              className="block h-full rounded-full bg-forest"
              style={{ width: `${Math.max(2, quota.remainingPct)}%` }}
            />
          </span>
        </>
      )}

      {/* 5 · EKOR — voice + reset dalam SATU baris kecil, tanpa ikon.
          Saat kuota benar-benar habis, "Kuota habis" menggantikan "Reset" supaya
          keadaan itu terbaca tanpa menambah baris/paragraf baru. */}
      <span className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium tabular-nums text-forest/40">
        <span>{quota.voiceCallsRemaining} panggilan</span>
        <span aria-hidden className="text-forest/25">
          ·
        </span>
        <span>
          {!pq.unlimited && quota.exhausted
            ? `${AI_QUOTA_EXHAUSTED_COPY.badge} · Reset ${resetDaysLabel}`
            : `Reset ${resetDaysLabel}`}
        </span>
      </span>
    </Link>
  )
}
