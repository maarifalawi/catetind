import { cn } from '@/lib/utils'

/* â”€â”€ CORAK BATIK UNTUK KARTU PAKET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Lapisan dekoratif di kartu harga yang sedang DIPILIH. Revisi desain: corak
   generik (lingkaran beririsan + tiga lengkung) diganti empat motif batik yang
   benar-benar dikenali sebagai batik Indonesia:

     Â· KAWUNG (Yogyakarta)  â†’ empat kelopak kolang-kaling mengelilingi satu
       titik, kelopak berisi garis rangkap + isen-isen titik di ujungnya,
       diulang rapat seperti kain kawung klasik;
     Â· MEGA MENDUNG (Cirebon) â†’ awan berlapis empat garis konsentris dengan
       ekor melengkung, disusun dua baris bergeser seperti langit mendung;
     Â· PARANG (Solo/Yogyakarta) â†’ pita S (lidah parang) diagonal berisi, diberi
       garis tepi kain dan MLINJON (belah ketupat) emas di ruang antar-bilah;
     Â· TRUNTUM (Solo) â†’ bunga bintang empat kelopak runcing dengan taburan
       titik (isen-isen) dan inti emas, tersebar selang-seling.

   Emas memakai token `daisy` (kuning brand) hanya untuk aksen kecil â€” mlinjon &
   inti truntum â€” supaya terasa batik pesisir, bukan pola vektor generik.

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
  /* SAPU BERSIH SVG HIASAN (sesi 3): motif batik di kartu paket = dekorasi murni. */
  void id
  void className
  return null
}
