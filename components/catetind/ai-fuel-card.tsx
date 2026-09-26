'use client'

import Link from 'next/link'
import { ArrowUpRight, Mic, RotateCcw } from 'lucide-react'
import {
  AI_PLAN_NAME,
  AI_QUOTA_RESET_DAYS,
  AI_TOKEN_METER,
  AI_VOICE_METER,
  compactNumber,
  estimateRecords,
  formatDuration,
  remainingPercent,
} from '@/lib/ai-quota'
import { NavTooltip } from './nav-tooltip'

/* ── Bahan Bakar AI (sidebar desktop) — versi MINIMALIS ──────────────────────
   Sisa kuota AI (token + voice) di satu kartu kecil yang selalu terlihat.

   Redesign: versi lama terlalu ramai (ring SVG + badge pill + 2 bar + 4 ikon +
   aurora blur + kilau berjalan). Sekarang prinsipnya "satu baris satu makna":

   1. LABEL  → "Bahan Bakar AI" + nama paket di kanan (tanpa badge pill).
   2. ANGKA  → satu angka besar yang langsung dibaca: "99% sisa".
   3. MAKNA  → terjemahan angka teknisnya (token & catatan AI) satu baris saja.
   4. GARIS  → satu hairline 3px sebagai isyarat visual, tanpa kilau.
   5. EKOR   → voice + reset + jalur "Top up" dalam satu baris kecil.

   Framing selalu "sisa" (tanpa kata limit/habis, tanpa merah) — kanon 2B.2/5C.
   Saat sidebar collapsed, kartu mengecil jadi angka persentase + tooltip. */

export function AiFuelCard({ collapsed }: { collapsed: boolean }) {
  const remainingTokens = AI_TOKEN_METER.limit - AI_TOKEN_METER.used
  const tokenLeft = remainingPercent(AI_TOKEN_METER.used, AI_TOKEN_METER.limit)
  const voiceLeftSeconds = AI_VOICE_METER.limitSeconds - AI_VOICE_METER.usedSeconds
  const recordsLeft = estimateRecords(remainingTokens)

  /* satu label untuk tooltip (collapsed) & pembaca layar */
  const summary = `Bahan Bakar AI ${AI_PLAN_NAME}: ${tokenLeft}% sisa · ${compactNumber(
    remainingTokens,
  )} token (≈ ${recordsLeft.toLocaleString('id-ID')} catatan AI) · voice ${formatDuration(
    voiceLeftSeconds,
  )} sisa · reset ${AI_QUOTA_RESET_DAYS} hari lagi`

  /* versi collapsed: cukup angkanya, detail lengkap lewat tooltip.
     Tooltip-nya dibikin MULTILINE (max-w + whitespace-normal): versi sebelumnya
     satu baris panjang yang menjulur keluar tepi layar sehingga teksnya
     terpotong tepat di tengah frasa ("Voice 5 j 59 m sisa..."). */
  if (collapsed) {
    return (
      <Link
        href="/settings/billing"
        aria-label={summary}
        className="group/item relative mt-4 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-[10px] font-semibold tabular-nums text-forest ring-1 ring-ink/[0.06] transition-colors duration-200 hover:bg-sage active:scale-95 motion-reduce:transition-none"
      >
        <span className="relative">{Math.floor(tokenLeft)}%</span>
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
         terbatas — kalau menyusut, barisnya yang paling bawah (voice + reset)
         yang "hilang" lebih dulu. Daftar menu di atasnya yang menggulir. */
      className="group/fuel mt-4 block shrink-0 rounded-[1.35rem] bg-cream p-4 ring-1 ring-ink/[0.06] transition-colors duration-200 hover:bg-sage/70"
    >
      {/* label + nama paket — wrap, bukan truncate, supaya tidak pernah "...' */}
      <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
          Bahan Bakar AI
        </span>
        <span className="text-[11px] font-medium text-ink/45">{AI_PLAN_NAME}</span>
      </span>

      {/* satu angka besar yang langsung terbaca */}
      <span className="mt-2.5 flex items-baseline gap-1.5 text-forest">
        <span className="text-[26px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
          {Math.floor(tokenLeft)}%
        </span>
        <span className="text-[11.5px] font-medium text-ink/45">sisa</span>
      </span>
      <span className="mt-1.5 block break-words text-[11.5px] leading-snug tabular-nums text-ink/50">
        {compactNumber(remainingTokens)} token ≈ {recordsLeft.toLocaleString('id-ID')} catatan AI
      </span>

      {/* hairline sisa kuota — arah isian = kuota yang MASIH tersisa */}
      <span
        role="progressbar"
        aria-label="Sisa kuota AI"
        aria-valuenow={Math.round(tokenLeft)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-3 block h-[3px] w-full overflow-hidden rounded-full bg-ink/[0.08]"
      >
        <span
          className="block h-full rounded-full bg-forest"
          style={{ width: `${Math.max(2, tokenLeft)}%` }}
        />
      </span>

      {/* ekor: DUA baris penuh — sengaja TIDAK memakai `truncate`.
          Sebelumnya "Voice 5 j 59 m · Reset 12 hari" dan "Top up" berebut ruang
          di lebar kartu ~230px sehingga teksnya terpotong "...". Sekarang tiap
          makna punya barisnya sendiri. */}
      <span className="mt-3 block text-[11px]">
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-ink/45">
            <Mic className="size-3 shrink-0" strokeWidth={2.2} aria-hidden />
            Voice {formatDuration(voiceLeftSeconds)} sisa
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-forest">
            Top up
            <ArrowUpRight className="size-3" strokeWidth={2.4} aria-hidden />
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 font-medium tabular-nums text-ink/40">
          <RotateCcw className="size-3 shrink-0" strokeWidth={2.2} aria-hidden />
          Reset {AI_QUOTA_RESET_DAYS} hari lagi
        </span>
      </span>
    </Link>
  )
}
