import { cn } from '@/lib/utils'

/* ── CORAK BATIK UNTUK KARTU PAKET ───────────────────────────────────────────
   Lapisan dekoratif di kartu harga yang sedang DIPILIH. Revisi desain: corak
   generik (lingkaran beririsan + tiga lengkung) diganti empat motif batik yang
   benar-benar dikenali sebagai batik Indonesia:

     · KAWUNG (Yogyakarta)  → empat kelopak kolang-kaling mengelilingi satu
       titik, kelopak berisi garis rangkap + isen-isen titik di ujungnya,
       diulang rapat seperti kain kawung klasik;
     · MEGA MENDUNG (Cirebon) → awan berlapis empat garis konsentris dengan
       ekor melengkung, disusun dua baris bergeser seperti langit mendung;
     · PARANG (Solo/Yogyakarta) → pita S (lidah parang) diagonal berisi, diberi
       garis tepi kain dan MLINJON (belah ketupat) emas di ruang antar-bilah;
     · TRUNTUM (Solo) → bunga bintang empat kelopak runcing dengan taburan
       titik (isen-isen) dan inti emas, tersebar selang-seling.

   Emas memakai token `daisy` (kuning brand) hanya untuk aksen kecil — mlinjon &
   inti truntum — supaya terasa batik pesisir, bukan pola vektor generik.

   Kenapa dipisah dari komponen kartu: pola ini dipakai di dua tempat yang
   berbeda render tree (checkout yang client + landing yang server), jadi id
   pattern tidak boleh bertabrakan. Pemanggil mengirim `id` unik per kartu.

   Kenapa memakai MASK: corak harus terasa seperti kain yang tercetak di sudut
   kartu, bukan wallpaper yang menutupi teks. Empat mask di app/globals.css
   memudarkan tiap motif sebelum mencapai tengah, sehingga nominal & daftar
   fitur tetap tajam. Satu motif = satu sudut, jadi kartu terbaca sebagai kain
   bertepi batik dengan bidang tengah yang bersih.

   Komponen ini murni dekorasi: `aria-hidden`, `pointer-events-none`, dan tidak
   pernah mengubah layout (absolute inset-0). */

/** empat arah kelopak kawung & truntum (derajat) */
const CARDINAL = [0, 90, 180, 270] as const

/** isen-isen kawung: satu titik di ujung tiap kelopak */
const KAWUNG_DOTS = [
  [0, -23],
  [0, 23],
  [23, 0],
  [-23, 0],
] as const

/** ceplok pengisi di ruang antar-motif kawung (satu tile berisi empat) */
const KAWUNG_CEPLOK = [
  [21, 21],
  [63, 21],
  [21, 63],
  [63, 63],
] as const

export function BatikBackdrop({
  id,
  className,
}: {
  /** prefix id unik, mis. `checkout-batik-waras` */
  id: string
  /** opacity tambahan; default cukup tipis supaya kontras teks aman */
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        className,
      )}
    >
      {/* PARANG — sudut kiri bawah */}
      <svg className="batik-mask-parang absolute inset-0 size-full text-cream opacity-90">
        <defs>
          <g id={`${id}-parang-unit`}>
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {/* garis tepi kain: dua garis tipis sejajar pita */}
              <path d="M0 4H72" strokeWidth={0.8} strokeOpacity={0.18} />
              <path d="M0 68H72" strokeWidth={0.8} strokeOpacity={0.18} />
              {/* lidah parang: pita S berisi, seperti bilah parang berulang */}
              <path
                d="M12 4C34 4 40 20 24 32C8 44 14 68 38 68L38 56C24 56 22 46 32 38C50 26 48 4 22 4Z"
                fill="currentColor"
                fillOpacity={0.14}
                strokeWidth={0.9}
                strokeOpacity={0.4}
              />
              {/* mlinjon: belah ketupat emas di ruang antar-bilah */}
              <g className="text-daisy">
                <path
                  d="M56 30l6 8l-6 8l-6 -8Z"
                  fill="currentColor"
                  fillOpacity={0.2}
                  strokeWidth={0.9}
                  strokeOpacity={0.55}
                />
              </g>
              {/* cecek: titik-titik kecil pengisi bidang */}
              <circle cx="58" cy="52" r={0.9} fill="currentColor" stroke="none" fillOpacity={0.3} />
              <circle cx="12" cy="14" r={0.9} fill="currentColor" stroke="none" fillOpacity={0.3} />
            </g>
          </g>
          <pattern
            id={`${id}-parang`}
            width="72"
            height="72"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <use href={`#${id}-parang-unit`} />
            <use href={`#${id}-parang-unit`} transform="translate(72 0)" />
            <use href={`#${id}-parang-unit`} transform="translate(-72 0)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-parang)`} />
      </svg>

      {/* KAWUNG — sudut kiri atas */}
      <svg className="batik-mask-kawung absolute inset-0 size-full text-cream opacity-95">
        <defs>
          <g id={`${id}-kawung-unit`}>
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {CARDINAL.map((angle) => (
                <g key={angle} transform={`rotate(${angle})`}>
                  {/* kelopak kolang-kaling: ujung luar membulat, pangkal runcing */}
                  <path
                    d="M0 -7C-7 -13 -9.5 -24 0 -32C9.5 -24 7 -13 0 -7Z"
                    strokeWidth={1.25}
                    strokeOpacity={0.55}
                  />
                  {/* garis rangkap di dalam kelopak (klowongan) */}
                  <path
                    d="M0 -10.5C-4.6 -14.5 -6 -24 0 -29C6 -24 4.6 -14.5 0 -10.5Z"
                    strokeWidth={0.8}
                    strokeOpacity={0.3}
                  />
                </g>
              ))}
              {KAWUNG_DOTS.map(([cx, cy]) => (
                <circle
                  key={`${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={0.8}
                  fill="currentColor"
                  fillOpacity={0.42}
                  stroke="none"
                />
              ))}
              {/* pusat kawung: cincin kecil, bukan titik penuh */}
              <circle r={2} strokeWidth={1} strokeOpacity={0.45} />
            </g>
            {/* ceplok: titik pengisi di ruang antar-empat kelopak */}
            <g fill="currentColor" fillOpacity={0.3}>
              {KAWUNG_CEPLOK.map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1} />
              ))}
            </g>
          </g>
          <pattern id={`${id}-kawung`} width="84" height="84" patternUnits="userSpaceOnUse">
            <use href={`#${id}-kawung-unit`} transform="translate(42 42)" />
            <use href={`#${id}-kawung-unit`} />
            <use href={`#${id}-kawung-unit`} transform="translate(84 0)" />
            <use href={`#${id}-kawung-unit`} transform="translate(0 84)" />
            <use href={`#${id}-kawung-unit`} transform="translate(84 84)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-kawung)`} />
      </svg>


      {/* MEGA MENDUNG — sudut kanan bawah */}
      <svg className="batik-mask-mendung absolute inset-0 size-full text-cream opacity-90">
        <defs>
          <g id={`${id}-mendung-unit`}>
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {/* awan luar */}
              <path
                d="M-44 18C-50 6 -40 -8 -26 -8C-24 -22 -8 -30 4 -24C12 -34 30 -30 34 -16C48 -18 56 -4 49 8C45 16 36 22 26 20C18 26 6 26 -2 20C-10 26 -22 26 -30 20C-38 24 -45 22 -44 18Z"
                strokeWidth={1.5}
                strokeOpacity={0.55}
              />
              {/* tiga lapis awan di dalamnya — gradasi khas mega mendung */}
              <path
                d="M-33 15C-37 7 -30 -2 -21 -2C-19 -12 -8 -17 0 -13C6 -20 18 -17 21 -8C30 -9 35 0 30 8C27 13 21 17 14 15C8 19 0 19 -5 15C-11 19 -19 19 -24 15C-29 17 -33 16 -33 15Z"
                strokeWidth={1.2}
                strokeOpacity={0.36}
              />
              <path
                d="M-22 11C-24 6 -20 1 -14 1C-12 -5 -5 -8 0 -5C4 -9 11 -7 13 -2C19 -2 21 4 18 8C16 11 12 13 8 12C4 14 0 14 -3 12C-7 14 -12 14 -15 11C-18 12 -22 12 -22 11Z"
                strokeWidth={0.95}
                strokeOpacity={0.24}
              />
              <path
                d="M-12 7C-13 4 -10 1 -6 1C-4 -3 1 -4 3 -2C7 -3 11 0 9 3C8 6 5 7 2 6C0 8 -4 8 -6 6C-9 7 -12 7 -12 7Z"
                strokeWidth={0.8}
                strokeOpacity={0.16}
              />
              {/* ekor awan yang melengkung ke bawah */}
              <path
                d="M-44 18C-52 22 -54 30 -46 32C-38 34 -34 26 -40 24"
                strokeWidth={1.15}
                strokeOpacity={0.4}
              />
              {/* cecek di ujung awan */}
              <circle cx={26} cy={20} r={1.3} fill="currentColor" stroke="none" fillOpacity={0.35} />
            </g>
          </g>
          <pattern id={`${id}-mendung`} width="192" height="128" patternUnits="userSpaceOnUse">
            <use href={`#${id}-mendung-unit`} transform="translate(0 30)" />
            <use href={`#${id}-mendung-unit`} transform="translate(96 30)" />
            <use href={`#${id}-mendung-unit`} transform="translate(192 30)" />
            <use href={`#${id}-mendung-unit`} transform="translate(48 94)" />
            <use href={`#${id}-mendung-unit`} transform="translate(144 94)" />
            <use href={`#${id}-mendung-unit`} transform="translate(48 -34)" />
            <use href={`#${id}-mendung-unit`} transform="translate(240 94)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-mendung)`} />
      </svg>


      {/* TRUNTUM — sudut kanan atas */}
      <svg className="batik-mask-truntum absolute inset-0 size-full text-cream opacity-60">
        <defs>
          <g id={`${id}-truntum-unit`}>
            <g fill="none" stroke="currentColor" strokeWidth={0.95} strokeLinecap="round">
              {CARDINAL.map((angle) => (
                <path
                  key={angle}
                  d="M0 -3.5C-2.1 -6 -2.1 -10.5 0 -13C2.1 -10.5 2.1 -6 0 -3.5Z"
                  transform={`rotate(${angle})`}
                />
              ))}
            </g>
            {/* inti bunga: satu titik emas */}
            <g className="text-daisy">
              <circle r={1.15} fill="currentColor" fillOpacity={0.8} />
            </g>
            {/* isen-isen: taburan titik di sekitar bunga */}
            <g fill="currentColor" fillOpacity={0.45}>
              <circle cx={0} cy={-8} r={0.75} />
              <circle cx={8} cy={0} r={0.75} />
              <circle cx={0} cy={8} r={0.75} />
              <circle cx={-8} cy={0} r={0.75} />
            </g>
            <g fill="currentColor" fillOpacity={0.28}>
              <circle cx={6} cy={-6} r={0.6} />
              <circle cx={6} cy={6} r={0.6} />
              <circle cx={-6} cy={6} r={0.6} />
              <circle cx={-6} cy={-6} r={0.6} />
              <circle cx={0} cy={-17} r={0.7} />
              <circle cx={17} cy={0} r={0.7} />
              <circle cx={0} cy={17} r={0.7} />
              <circle cx={-17} cy={0} r={0.7} />
            </g>
          </g>
          <pattern id={`${id}-truntum`} width="64" height="64" patternUnits="userSpaceOnUse">
            <use href={`#${id}-truntum-unit`} transform="translate(16 16)" />
            <use href={`#${id}-truntum-unit`} transform="translate(48 48)" />
            <use href={`#${id}-truntum-unit`} transform="translate(48 -16)" />
            <use href={`#${id}-truntum-unit`} transform="translate(-16 48)" />
            <use href={`#${id}-truntum-unit`} transform="translate(80 16)" />
            <use href={`#${id}-truntum-unit`} transform="translate(16 80)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-truntum)`} />
      </svg>
    </span>
  )
}

