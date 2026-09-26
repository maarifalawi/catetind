import Link from 'next/link'
import {
  CircleHelp,
  Home,
  PieChart,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { ScreenShell } from './screen-shell'
import { PlantIllustration } from './plant-illustration'
import {
  NOT_FOUND_ART_LABEL,
  NOT_FOUND_BODY,
  NOT_FOUND_EYEBROW,
  NOT_FOUND_FOOTNOTE,
  NOT_FOUND_HELP_BODY,
  NOT_FOUND_HELP_CTA,
  NOT_FOUND_HOME_CTA,
  NOT_FOUND_SHORTCUTS,
  NOT_FOUND_SHORTCUTS_TITLE,
  NOT_FOUND_TITLE,
} from '@/lib/data/not-found'

/* ── 404 / Not Found (inventaris #32) ─────────────────────────────────────────
   Halaman "tersesat" bukan kesempatan mendesain keindahan — ia momen panik
   kecil. Jadi urutannya sengaja: tunjukkan bahwa TIDAK ADA yang rusak dulu,
   baru beri jalan pulang. Tiga hal harus didapat user dalam sekali lihat
   (psikologi "jangan menegur, tunjukkan jalan pulang"):

     1. penjelasan ringan apa yang terjadi      → kepala halaman (tunas + H1 + body)
     2. satu tombol pulang yang jelas           → CTA utama, tepat di bawah teks
     3. pintasan ke halaman yang mungkin dicari → 4 kartu (wallet/history/budget/help)

   Keputusan desain:
   · TANPA state & tanpa `'use client'` — halaman ini statis murni, jadi tidak
     ada satu pun angka/tanggal hidup yang bisa memicu hydration mismatch.
   · TETAP di dalam `ScreenShell` supaya sidebar desktop (dan bottom nav mobile
     dari root layout) konsisten dengan halaman app lain — user yang tersesat
     tidak boleh kehilangan navigasi. Kontennya diletakkan di kolom 3–11 dari
     grid 12 kolom (bukan container sempit di tengah layar) agar tetap mengikuti
     ritme tata letak app di 1440px.
   · Ilustrasi memakai `PlantIllustration` yang SUDAH ada (stage 2 Tunas: masih
     kecil, masih tumbuh — pas untuk "halaman yang belum ada"), tanpa aset baru.
     Ayunannya dimatikan bila `prefers-reduced-motion`.
   · Tombol memakai resep tombol repo (h-12, `rounded-2xl`, `bg-forest` +
     `text-cream`) dan dirender sebagai `next/link` — sama seperti semua CTA
     navigasi lain di repo (mis. empty state `history-screen.tsx`); `ui/button`
     adalah primitif `<button>` Base UI dan tidak dipakai untuk navigasi.
   ────────────────────────────────────────────────────────────────────────── */

/** ikon per pintasan dipetakan di sini supaya `lib/data/not-found.ts` tetap murni */
const SHORTCUT_ICON: Record<string, LucideIcon> = {
  '/wallet': Wallet,
  '/history': PieChart,
  '/budget': Target,
  '/help': CircleHelp,
}

export function NotFoundScreen() {
  return (
    <ScreenShell>
      {/* kolom 3–11: mengikuti grid app, tapi sengaja lapang supaya terasa jeda */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 lg:col-start-3">
          {/* ── 1. KEPALA — tenangkan dulu, jelaskan kemudian ─────────────── */}
          <header className="flex flex-col items-center text-center">
            {/* `role="img"` di pembungkus = satu pengumuman bermakna untuk
                screen reader; SVG di dalamnya otomatis tidak ikut dibacakan */}
            <span
              role="img"
              aria-label={NOT_FOUND_ART_LABEL}
              className="flex size-32 items-center justify-center rounded-[2.25rem] bg-sage/45 ring-1 ring-soil/8 lg:size-36"
            >
              {/* `w-full` bawaan PlantIllustration ditimpa lebar eksplisit;
                  ayunan `plant-sway` dimatikan bila user minta gerak minimal */}
              <PlantIllustration
                stage={2}
                className="w-24 motion-reduce:[&_g]:animate-none lg:w-28"
              />
            </span>

            <p className="mt-5 text-[13px] font-medium text-ink/45">{NOT_FOUND_EYEBROW}</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink lg:text-4xl">
              {NOT_FOUND_TITLE}
            </h1>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink/60 lg:text-sm">
              {NOT_FOUND_BODY}
            </p>
          </header>

          {/* ── 2. CTA UTAMA — di bawah teks, bukan di header, supaya di 375px
                 jatuh di zona ibu jari: satu tekanan, langsung pulang ─────── */}
          <div className="mt-7 flex flex-col items-center lg:mt-8">
            <Link
              href="/"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest px-6 text-sm font-semibold text-cream shadow-[0_18px_40px_-30px_rgba(0,0,0,0.55)] transition-colors duration-200 hover:bg-forest-soft active:scale-[0.99] motion-reduce:transition-none sm:w-auto"
            >
              <Home className="size-4" strokeWidth={2.4} aria-hidden />
              {NOT_FOUND_HOME_CTA}
            </Link>
          </div>

          {/* ── 3. PINTASAN — halaman yang paling mungkin user cari ───────── */}
          <section className="mt-10 lg:mt-12" aria-labelledby="not-found-shortcuts">
            <h2
              id="not-found-shortcuts"
              className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40"
            >
              {NOT_FOUND_SHORTCUTS_TITLE}
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
              {NOT_FOUND_SHORTCUTS.map((shortcut) => {
                const Icon = SHORTCUT_ICON[shortcut.href] ?? CircleHelp
                return (
                  <li key={shortcut.href} className="h-full">
                    <Link
                      href={shortcut.href}
                      className="flex h-full flex-col gap-2 rounded-2xl bg-cream p-3.5 ring-1 ring-soil/12 transition-colors duration-200 hover:bg-sage/50 motion-reduce:transition-none"
                    >
                      <span className="flex size-9 items-center justify-center rounded-xl bg-sage/60 text-forest ring-1 ring-soil/8">
                        <Icon className="size-4" strokeWidth={2.2} aria-hidden />
                      </span>
                      <span className="text-[13px] font-semibold leading-snug text-ink">
                        {shortcut.label}
                      </span>
                      <span className="text-[11.5px] leading-relaxed text-ink/50">
                        {shortcut.blurb}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ── 4. KOTAK BANTUAN — pintu kedua, tanpa nada mendesak ───────── */}
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl bg-sage/40 px-4 py-4 ring-1 ring-forest/10 sm:flex-row sm:justify-between sm:gap-4">
            <p className="text-center text-[12.5px] leading-relaxed text-ink/70 sm:text-left">
              🌿 {NOT_FOUND_HELP_BODY}
            </p>
            <Link
              href="/help"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-forest px-4 text-[12.5px] font-semibold text-cream transition-colors duration-200 hover:bg-forest-soft active:scale-[0.98] motion-reduce:transition-none"
            >
              {NOT_FOUND_HELP_CTA}
            </Link>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink/40 italic">
            {NOT_FOUND_FOOTNOTE}
          </p>
        </div>
      </div>
    </ScreenShell>
  )
}
