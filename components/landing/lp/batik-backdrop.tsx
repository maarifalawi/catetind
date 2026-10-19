import { cn } from '@/lib/utils'

/* ── CORAK BATIK UNTUK KARTU PAKET ───────────────────────────────────────────
   Lapisan dekoratif di kartu harga yang sedang DIPILIH. Resepnya sengaja sama
   dengan muka kartu dompet (`wallet-card-face.tsx`): batik kawung + mega
   mendung, garis putih tipis di atas permukaan hijau tua.

   Kenapa dipisah dari komponen kartu: pola ini dipakai di dua tempat yang
   berbeda render tree (checkout yang client + landing yang server), jadi id
   pattern tidak boleh bertabrakan. Pemanggil mengirim `id` unik per kartu.

   Kenapa memakai MASK: corak harus terasa seperti kain yang tercetak di sudut
   kartu, bukan wallpaper yang menutupi teks. Mask radial (lihat
   `.batik-mask-kawung` / `.batik-mask-mendung` di app/globals.css) memudarkan
   pola sebelum mencapai tengah, sehingga nominal & daftar fitur tetap tajam.

   Komponen ini murni dekorasi: `aria-hidden`, `pointer-events-none`, dan tidak
   pernah mengubah layout (absolute inset-0). */

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
      {/* kawung — lingkaran saling beririsan, dari sudut kiri atas */}
      <svg className="batik-mask-kawung absolute inset-0 size-full text-cream">
        <defs>
          <pattern id={`${id}-kawung`} width="64" height="64" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="32" cy="32" r="23" strokeOpacity="0.5" />
              <circle cx="0" cy="0" r="23" strokeOpacity="0.34" />
              <circle cx="64" cy="0" r="23" strokeOpacity="0.34" />
              <circle cx="0" cy="64" r="23" strokeOpacity="0.34" />
              <circle cx="64" cy="64" r="23" strokeOpacity="0.34" />
            </g>
            <circle cx="32" cy="32" r="4" fill="currentColor" fillOpacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-kawung)`} />
      </svg>

      {/* mega mendung — lengkung awan berlapis, dari sudut kanan bawah */}
      <svg className="batik-mask-mendung absolute inset-0 size-full text-cream">
        <defs>
          <pattern id={`${id}-mendung`} width="88" height="44" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor">
              <path d="M0 44 Q22 8 44 44 Q66 8 88 44" strokeOpacity="0.42" strokeWidth="1.7" />
              <path d="M0 31 Q22 -5 44 31 Q66 -5 88 31" strokeOpacity="0.26" strokeWidth="1.5" />
              <path d="M0 18 Q22 -18 44 18 Q66 -18 88 18" strokeOpacity="0.16" strokeWidth="1.3" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-mendung)`} />
      </svg>
    </span>
  )
}
