'use client'

import { Trash2 } from 'lucide-react'
import {
  BUDGET_CARD_ACTION_COPY,
  PACING_HEX,
  PACING_HINT_COPY,
  pacingOf,
  pacingPercent,
  pacingStatusLabel,
  ratioLabel,
  type BudgetItem,
  type PeriodWindow,
} from '@/lib/data/budget'

/* ── Satu baris budget kategori (Zona A) ─────────────────────────────────────
   Emoji + nama kategori, nominal terpakai/limit, bar progres berwarna kanon
   (sage → amber → terracotta), plus "ghost pacing line": garis tipis 2px di
   posisi pengeluaran ideal hari ini. Garis itu dihitung dari `window` (periode
   yang sedang aktif) — jadi di tab Mingguan ia bergerak relatif Senin–Minggu,
   bukan selalu bulan kalender. Kalau bar berwarna sudah melewati garis itu,
   artinya belanja lebih cepat dari pacing — ditampilkan sebagai informasi,
   bukan teguran (nada PRD: nurturing, bukan menghakimi).

   PAKET 78 — MINIMALISME (permintaan pemilik produk: "rely on progress bars,
   clean typography, dan whitespace"). Yang DIHAPUS dari kartu ini:
     · baris mikro "Budget bulanan" — periodenya sudah terbaca dari pil periode
       tepat di atas daftar, jadi ia cuma mengulang;
     · tooltip garis pacing — satu paragraf melayang muncul tiap kali mouse
       lewat. Penjelasannya TIDAK hilang: garis itu tetap punya `aria-label`
       (`PACING_HINT_COPY`) + `title` bawaan browser, jadi pembaca layar & mouse
       tetap tahu artinya tanpa ada kotak gelap menutupi kartu tetangga;
     · `pacingOf().copy` — kalimat "Pelan-pelan ya, sisa tinggal Rp 120.000 🌤️"
       mengulang angka yang sudah duduk di baris nominal. Kartu sekarang cuma
       menampilkan status tiga kata (`pacingStatusLabel`) dengan warna yang sama.

   Yang TETAP (kanon, jangan dihapus): nama kategori, angka terpakai/limit, bar
   progres, GARIS PACING 2px (fungsional — ia yang mengatakan "lebih cepat/lebih
   lambat dari rencana"), tombol hapus dengan `aria-label` bernama kategori, dan
   CTA `Review Pengeluaran →` yang hanya muncul saat kategorinya over budget.

   PAKET 60.1 — tombol HAPUS ditambahkan di baris atas kartu. Sebelumnya kartu
   ini hanya punya "ghost pacing line" (hint) dan CTA `Review Pengeluaran →`
   saat over budget: tidak ada satu pun jalan untuk mencabut target yang user
   pasang sendiri. Tombolnya ikon kecil dengan `aria-label` yang menyebut nama
   kategorinya (`BUDGET_CARD_ACTION_COPY.delete`) — keputusan & konfirmasinya
   milik halaman (`budget-screen`), karena di sanalah jendela Undo hidup.
   ────────────────────────────────────────────────────────────────────────── */

/* REDESAIN (paket 82): teks status TIDAK lagi punya tabel warna sendiri.
   Dulu ada `TONE_TEXT` yang memetakan `amber` ke hex PLUM (#b89191) — berbeda
   dari warna bar-nya (#ffb885), padahal komentarnya menjanjikan "warna yang
   SAMA dengan bar-nya". Sekarang teks status mengambil warnanya LANGSUNG dari
   `PACING_HEX[tone]` (sumber tunggal, sama dengan bar & pil persen), jadi tidak
   mungkin lagi ada dua warna untuk satu status. */

export function BudgetCategoryCard({
  budget,
  masked,
  window,
  onReview,
  onDelete,
}: {
  budget: BudgetItem
  masked: boolean
  /** periode aktif — menentukan posisi garis pacing ideal */
  window: PeriodWindow
  /** CTA sekunder `Review Pengeluaran →` — aktif saat kategori over budget */
  onReview?: () => void
  /** hapus kategori ini (buka konfirmasi di halaman pemilik state) */
  onDelete?: (budget: BudgetItem) => void
}) {
  /* `copy` dari `pacingOf()` sengaja TIDAK diambil: kartu memakai status tiga
     kata (paket 78), sedangkan kalimatnya tetap hidup untuk panel review. */
  const { tone, percent, fasterThanPacing } = pacingOf(budget, masked, window)
  const over = percent >= 100
  const pacing = pacingPercent(window)
  const fill = Math.min(100, percent)
  const pacingHint = fasterThanPacing ? PACING_HINT_COPY.faster : PACING_HINT_COPY.base

  return (
    /* REDESAIN paket 82 (round 2). Kartu dibaca atas→bawah dalam TIGA pita:
       ① ikon · nama + terpakai/limit · pil persen · hapus
       ② bar progres + garis pacing ideal
       ③ status tiga kata (kiri) · CTA Review saat over (kanan)
       Rasio terpakai/limit dinaikkan ke bawah nama (tidak lagi jadi baris
       sendiri di kaki kartu) dan CTA Review naik sebaris dengan status — jadi
       satu pita lebih sedikit dan daftar terasa lebih lega. Nol informasi yang
       hilang: nama, rasio, persen, bar, garis pacing, status, hapus, & CTA
       review semuanya tetap ada. */
    <article className="rounded-[1.4rem] bg-cream p-3.5 ring-1 ring-soil/10 transition-all duration-300 hover:ring-soil/16 hover:shadow-[0_18px_40px_-26px_rgba(0,0,0,0.4)]">
      {/* ① identitas · angka · aksi */}
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage/60 text-[17px] ring-1 ring-soil/8">
          {budget.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[14px] font-medium leading-tight tracking-tight text-forest">
              {budget.category}
            </span>
            {/* persen — angka kedua paling terbaca di kartu, diwarnai status yang
                SAMA dengan bar-nya (satu makna, satu warna) */}
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums"
              style={{
                color: PACING_HEX[tone],
                backgroundColor: `${PACING_HEX[tone]}1f`,
              }}
            >
              {Math.round(percent)}%
            </span>
          </div>
          {/* nominal terpakai/limit — sub-baris nama (dulu baris terpisah di kaki) */}
          <p className="mt-0.5 min-w-0 truncate text-[11px] tabular-nums text-forest/45">
            {ratioLabel(budget.spent, budget.limit, masked)}
          </p>
        </div>

        {/* hapus (paket 60.1) — ikon saja, tapi SELALU punya nama yang bisa
            dibaca pembaca layar & tooltip; keputusan ada di halaman */}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(budget)}
            aria-label={BUDGET_CARD_ACTION_COPY.delete(budget.category)}
            title={BUDGET_CARD_ACTION_COPY.delete(budget.category)}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-forest/30 transition-colors hover:bg-plum/12 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 active:scale-95"
          >
            <Trash2 className="size-3.5" strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </div>

      {/* ② bar progres + garis pacing ideal (kanon, jangan dihapus) */}
      <div className="relative mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-soil/[0.07]">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: `${fill}%`, backgroundColor: PACING_HEX[tone] }}
          />
        </div>

        {/* ghost pacing line — 2px, nol tambahan ruang vertikal. Penjelasannya
            hidup di `aria-label` (`role="img"`, jadi ikut dibaca pembaca layar
            di alur bacanya) + `title` bawaan browser untuk pengguna mouse
            (paket 78) — bukan tooltip melayang yang menutupi kartu tetangga.
            Tidak dibuat fokusable karena garis ini tidak punya aksi apa pun. */}
        <span
          role="img"
          aria-label={pacingHint}
          title={pacingHint}
          className="absolute -bottom-1.5 -top-1.5 w-0.5 -translate-x-1/2 cursor-help rounded-full bg-ink/15 transition-colors hover:bg-ink/25"
          style={{ left: `${pacing}%` }}
        />
      </div>

      {/* ③ status tiga kata (kiri) · CTA Review saat over (kanan) — satu baris */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className="shrink-0 font-medium" style={{ color: PACING_HEX[tone] }}>
          {pacingStatusLabel(tone)}
        </span>
        {over && (
          <button
            type="button"
            onClick={onReview}
            className="shrink-0 text-[11px] font-medium text-hud-terracotta underline decoration-hud-terracotta/40 decoration-dotted underline-offset-4 transition-colors hover:decoration-hud-terracotta"
          >
            Review Pengeluaran →
          </button>
        )}
      </div>
    </article>
  )
}
