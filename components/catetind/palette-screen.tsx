'use client'

import { useState } from 'react'
import { Check, Copy, Palette } from 'lucide-react'
import { toast } from 'sonner'
import {
  PALETTE_GROUPS,
  PALETTE_LAYERS,
  PALETTE_MEANINGS,
  PALETTE_PAGE_COPY,
  type PaletteEntry,
  type PaletteGroup,
  type PaletteMeaning,
} from '@/lib/data/palette'
import { cn } from '@/lib/utils'
import { ScreenShell } from './screen-shell'

/* ── HALAMAN REVIEW DESAIN PALET (/palette) ───────────────────────────────────
   Permukaan visual untuk memeriksa sistem warna kanon "Earth Pastel" — bukan
   halaman fitur. Keputusan yang mengikat:

     1. TANPA DATA & TANPA HEX BARU DI SINI. Seluruh isi datang dari
        `lib/data/palette.ts`; komponen hanya merender KELAS token
        (`swatchClass`/`onClass`). Hex yang tampil adalah label yang ikut data.
     2. `'use client'` HANYA karena tombol salin butuh state (`copiedHex`).
        State-nya mulai `null` di server & client, jadi tidak ada hydration
        mismatch.
     3. Kartu putih-di-atas-putih: batas dibawa `ring-soil/12` + shadow lembut
        (pola kartu yang sama dengan Riwayat/Kalender), bukan perbedaan hue.
     4. Kerangka `ScreenShell` supaya halaman ini punya sidebar desktop & ada
        jalan kembali, sama seperti halaman app lain.
     5. Kelas ditulis LITERAL (bukan dirakit) supaya terbaca scanner Tailwind.
   ────────────────────────────────────────────────────────────────────────── */

export function PaletteScreen() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  /* pola salin repo (referral-screen / payment-instruction-card): tulis ke
     clipboard lalu konfirmasi lewat toast; gagal pun hanya diberi tahu. */
  async function handleCopy(entry: PaletteEntry) {
    try {
      await navigator.clipboard.writeText(entry.hex)
      setCopiedHex(entry.hex)
      toast.success(PALETTE_PAGE_COPY.copiedToast(entry.hex))
    } catch {
      toast.error(PALETTE_PAGE_COPY.copyFailedToast)
    }
  }

  return (
    <ScreenShell>
      <div className="w-full">
        {/* ── KEPALA: eyebrow → judul → pembuka → sumber ─────────────────────── */}
        <header className="max-w-[68ch]">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-forest/55">
            {PALETTE_PAGE_COPY.eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-forest lg:text-4xl">
            {PALETTE_PAGE_COPY.title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-forest/70">{PALETTE_PAGE_COPY.lede}</p>
          <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-forest/50">
            <Palette className="mt-[1px] size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
            <span>{PALETTE_PAGE_COPY.sourceNote}</span>
          </p>
        </header>

        {/* ── ARSITEKTUR 3 LAPIS — konteks sebelum grid warna ──────────────── */}
        <section aria-label="Arsitektur token warna" className="mt-6 grid gap-3 sm:grid-cols-3">
          {PALETTE_LAYERS.map((layer) => (
            <div key={layer.step} className="rounded-2xl bg-sage/60 p-4 ring-1 ring-forest/10">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-forest/55">
                {layer.step}
              </p>
              <p className="mt-1 font-display text-[16px] font-semibold tracking-tight text-forest">
                {layer.title}
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-forest/65">{layer.body}</p>
            </div>
          ))}
        </section>

        <p className="mt-4 text-[12.5px] text-forest/45">{PALETTE_PAGE_COPY.hint}</p>

        {/* ── GRID WARNA: kanon → alias → turunan → netral → grafik ───────── */}
        {PALETTE_GROUPS.map((group) => (
          <PaletteGroupSection
            key={group.id}
            group={group}
            copiedHex={copiedHex}
            onCopy={handleCopy}
          />
        ))}

        {/* ── MAKNA WARNA: status jatah harian + arah uang ─────────────────── */}
        <section className="mt-5 rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6">
          <h2 className="font-display text-[19px] font-semibold tracking-tight text-forest">
            {PALETTE_PAGE_COPY.meaningTitle}
          </h2>
          <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-forest/60">
            {PALETTE_PAGE_COPY.meaningDesc}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PALETTE_MEANINGS.map((meaning) => (
              <PaletteMeaningRow key={meaning.label} meaning={meaning} />
            ))}
          </ul>
        </section>
      </div>
    </ScreenShell>
  )
}

/** satu lapis arsitektur token: kepala + keterangan + grid swatch */
function PaletteGroupSection({
  group,
  copiedHex,
  onCopy,
}: {
  group: PaletteGroup
  copiedHex: string | null
  onCopy: (entry: PaletteEntry) => void
}) {
  return (
    <section
      aria-labelledby={`palette-${group.id}`}
      className="mt-5 rounded-[2rem] bg-cream p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] ring-1 ring-soil/12 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id={`palette-${group.id}`}
          className="font-display text-[19px] font-semibold tracking-tight text-forest"
        >
          {group.title}
        </h2>
        <span className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-forest/45">
          {PALETTE_PAGE_COPY.countLabel(group.entries.length)}
        </span>
      </div>
      <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-forest/60">
        {group.description}
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {group.entries.map((entry) => (
          <PaletteSwatch
            key={entry.name}
            entry={entry}
            copied={copiedHex === entry.hex}
            onCopy={onCopy}
          />
        ))}
      </ul>
    </section>
  )
}

/**
 * satu kartu warna: swatch (dengan contoh "Aa" memakai `onClass` untuk menguji
 * kontras) → nama → hex → peran. Seluruh kartu adalah tombol salin.
 */
function PaletteSwatch({
  entry,
  copied,
  onCopy,
}: {
  entry: PaletteEntry
  copied: boolean
  onCopy: (entry: PaletteEntry) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onCopy(entry)}
        aria-label={PALETTE_PAGE_COPY.a11yCopy(entry.name, entry.hex)}
        className="group flex w-full flex-col rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
      >
        <span
          className={cn(
            'relative flex h-24 items-end justify-end rounded-2xl p-2.5 ring-1 ring-inset ring-soil/10',
            entry.swatchClass,
          )}
        >
          <span aria-hidden className={cn('text-[14px] font-medium leading-none', entry.onClass)}>
            Aa
          </span>
          {/* ikon salin: selalu tampak di sentuh, muncul saat hover/fokus di
              desktop. `aria-hidden` karena aksi sudah dinamai lewat aria-label. */}
          <span
            aria-hidden
            className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-cream/85 text-forest shadow-sm opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
          >
            {copied ? (
              <Check className="size-3.5" strokeWidth={2.6} />
            ) : (
              <Copy className="size-3.5" strokeWidth={2.4} />
            )}
          </span>
        </span>
        <span className="mt-2 flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-medium text-forest">{entry.name}</span>
          {entry.alias ? (
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-forest/40">
              = {entry.alias}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[12.5px] tracking-tight text-forest/55">{entry.hex}</span>
        <span className="mt-1 block text-[12.5px] leading-relaxed text-forest/60">{entry.note}</span>
      </button>
    </li>
  )
}

/** satu baris makna warna: titik swatch + label + artinya */
function PaletteMeaningRow({ meaning }: { meaning: PaletteMeaning }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-sage/50 px-3.5 py-3 ring-1 ring-forest/10">
      <span aria-hidden className={cn('mt-1 size-3 shrink-0 rounded-full', meaning.dotClass)} />
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-forest">
          {meaning.label}
          <span className="ml-1.5 text-[12px] font-normal text-forest/45">{meaning.hex}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-forest/65">{meaning.note}</p>
      </div>
    </li>
  )
}

