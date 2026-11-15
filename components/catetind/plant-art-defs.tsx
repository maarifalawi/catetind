/**
 * Definisi gradien KEPINGAN PUZZLE â€” SATU-SATUNYA di seluruh dokumen.
 *
 * Nama komponen & file dipertahankan (`PlantArtDefs`, `plant-*`) supaya
 * pemanggilnya (`app/layout.tsx`) tidak perlu diubah saat metafora berganti
 * dari tanaman ke puzzle; yang berubah adalah ISI-nya: tidak ada lagi gradien
 * daun/pot/bunga, hanya gradien kepingan.
 *
 * Kenapa definisi dipasang SEKALI di root: dulu setiap ilustrasi menulis
 * `<defs>` sendiri dengan id yang sama. Ketika ada beberapa ilustrasi di satu
 * halaman â€” dan salah satunya berada di tab/section yang `display:none` â€”
 * browser menyelesaikan `url(#id)` ke elemen PERTAMA dengan id itu, yang bisa
 * berada di dalam section tersembunyi. Akibatnya kepingan yang terlihat
 * kehilangan gradiennya (tampak putih/transparan). Id yang dipakai sekarang:
 *
 *   Â· `catetindPuzzleFill`  â€” kepingan yang SUDAH terpasang (olive â†’ forest)
 *   Â· `catetindPuzzleEmpty` â€” kepingan yang BELUM terpasang (kanvas terang)
 *   Â· `catetindGlow`        â€” halo mint di belakang papan
 *   Â· `catetindSheen`       â€” kilau tipis (aksen premium)
 *
 * SVG-nya berukuran 0 dan `aria-hidden`, jadi tidak memakan layout. Semua warna
 * berasal dari palet kanon (hex yang sudah dipakai ilustrasi lama), tanpa warna
 * baru di luar palet.
 */
export function PlantArtDefs() {
  /* SAPU BERSIH SVG HIASAN (sesi 3): gradien/pola tanaman dicabut.
     Komponen dipertahankan (dipasang di root layout) agar tidak ada impor
     yang rusak; isinya kini kosong. */
  return null
}
