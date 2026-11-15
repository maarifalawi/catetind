import { cn } from '@/lib/utils'

/* ── KAIN BATIK UNTUK KARTU HERO ────────────────────────────────────────────
   Dipakai dua kartu hero yang berbagi permukaan forest gelap:
     · /budget  → "Jatah Hari Ini" (`daily-hud-summary.tsx`)
     · /wallet  → "Total Saldo" (`wallet-screen.tsx`)

   Revisi 11 Nov 2026 (pemilik produk): "ada corak batiknya, bener-bener batik
   yang keliatan gitu". `BatikBackdrop` (dipakai kartu paket) sengaja memudar ke
   tengah lewat mask radial karena kartunya penuh teks & daftar harga — di kartu
   hero hasilnya cuma terlihat seperti gradasi hijau, bukan batik.

   Komponen ini menenun motif yang SAMA (kawung + parang) tetapi sebagai KAIN
   PENUH, bukan hiasan sudut:

     · KAWUNG (Yogyakarta) — empat kelopak kolang-kaling mengelilingi satu inti
       mlinjon emas, berisi garis rangkap + isen-isen titik, diulang rapat
       seperti kain kawung klasik. Motif yang paling gampang dikenali sebagai
       batik.
     · PARANG (Solo/Yogyakarta) — pita S diagonal berisi mlinjon emas,
       dipasang sebagai sabuk di tepi bawah kartu (mask linear), jadi terasa
       seperti kain yang dilipat sekali di kaki kartu.
     · TEPI KAIN — dua garis bingkai (satu utuh, satu putus-putus ala cecek)
       supaya motif terasa bercap sampai pinggir, bukan pola yang berhenti di
       sudut rounded.

   Kontrasnya dinaikkan (stroke cream 45–60%) supaya motifnya benar-benar
   terbaca di atas forest, tetapi tetap tipis dibanding teks: nominal & judul
   memakai cream pekat + text-shadow dari pemanggil.

   Murni dekorasi: `aria-hidden`, `pointer-events-none`, dan selalu
   `absolute inset-0` — tidak pernah mengubah layout. `id` wajib unik karena
   repo ini merender dua pohon (server & client) dalam satu halaman.

   `data-catetind-batik` adalah PENANDA RESMI yang dibaca
   `scripts/qa/visual-audit.mjs`: SVG corak batik di dalam kartu dompet/hero
   diizinkan dan tidak lagi dihitung sebagai "SVG hiasan". */

/** empat arah kelopak kawung (derajat) */
const CARDINAL = [0, 90, 180, 270] as const

/** isen-isen kawung: titik di ujung tiap kelopak */
const KAWUNG_DOTS = [
  [0, -29],
  [29, 0],
  [0, 29],
  [-29, 0],
] as const

/** posisi motif dalam satu sel pattern: tengah + empat sudut = seamless */
const KAWUNG_CELLS = [
  [16, 16],
  [-16, -16],
  [48, -16],
  [-16, 48],
  [48, 48],
] as const

export function BatikCloth({
  id,
  className,
}: {
  /** prefix id unik, mis. `budget-hud-batik` atau `wallet-hero-batik` */
  id: string
  className?: string
}) {
  const unit = `${id}-kawung-unit`
  const kawung = `${id}-kawung`
  const parang = `${id}-parang`
  const cecek = `${id}-cecek`
  const beltFade = `${id}-belt-fade`
  const beltMask = `${id}-belt-mask`

  return (
    <>
      <svg
        aria-hidden
        data-catetind-batik
        className={cn('pointer-events-none absolute inset-0 h-full w-full text-cream', className)}
      >
        <defs>
          {/* satu motif kawung: empat kelopak + garis rangkap + inti mlinjon emas */}
          <g id={unit}>
            {CARDINAL.map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <ellipse cx="0" cy="-20" rx="9.2" ry="15" />
                <ellipse cx="0" cy="-20" rx="4.6" ry="8.2" />
              </g>
            ))}
            <path d="M0 -5.6 5.6 0 0 5.6 -5.6 0Z" className="text-daisy" fill="currentColor" stroke="none" />
            {KAWUNG_DOTS.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" fill="currentColor" stroke="none" />
            ))}
          </g>

          {/* kain kawung: motif diulang rapat 64×64 */}
          <pattern id={kawung} width="64" height="64" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1.15" strokeOpacity="0.6">
              {KAWUNG_CELLS.map(([x, y]) => (
                <use key={`${x}-${y}`} href={`#${unit}`} x={x} y={y} />
              ))}
            </g>
          </pattern>
          {/* sabuk parang: pita S diagonal dengan mlinjon emas */}
          <pattern
            id={parang}
            width="46"
            height="46"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeOpacity="0.48"
              strokeLinecap="round"
            >
              <path d="M-23 12 Q-11.5 2 0 12 T23 12 T46 12" />
              <path d="M-23 30 Q-11.5 20 0 30 T23 30 T46 30" />
            </g>
            <g className="text-daisy" fill="currentColor" stroke="none" opacity="0.6">
              <path d="M12 18 16 23 12 28 8 23Z" />
              <path d="M35 34 39 39 35 44 31 39Z" />
            </g>
          </pattern>

          {/* cecek: taburan titik pengisi, ciri batik tulis */}
          <pattern id={cecek} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="0.9" fill="currentColor" opacity="0.4" />
            <circle cx="13" cy="13" r="0.9" fill="currentColor" opacity="0.3" />
          </pattern>

          {/* mask sabuk: putih = terlihat, jadi motif hanya memenuhi kaki kartu */}
          <linearGradient id={beltFade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.45" stopColor="white" stopOpacity="0.45" />
            <stop offset="1" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id={beltMask}>
            <rect width="100%" height="100%" fill={`url(#${beltFade})`} />
          </mask>
        </defs>

        {/* seluruh bidang = kain kawung */}
        <rect width="100%" height="100%" fill={`url(#${kawung})`} />
        {/* isen-isen titik di atas kain */}
        <rect width="100%" height="100%" fill={`url(#${cecek})`} />
        {/* sabuk parang di kaki kartu */}
        <rect
          width="100%"
          height="100%"
          fill={`url(#${parang})`}
          mask={`url(#${beltMask})`}
          opacity="0.9"
        />
      </svg>

      {/* tepi kain: bingkai utuh + jahitan putus-putus ala cecek */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-[1.75rem] border border-cream/20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-[1.6rem] border border-dashed border-cream/15"
      />
    </>
  )
}
