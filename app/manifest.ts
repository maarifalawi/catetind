import type { MetadataRoute } from 'next'

/**
 * PWA Manifest — syarat install ke Home Screen (precondition push notif iOS).
 * Ikon Home Screen/Android memakai aset kotak penuh di `public/icons/`
 * (digenerate scripts/generate-icons.mjs dari wordmark resmi), jadi logo selalu
 * terlihat baik dipakai sebagai ikon biasa maupun ikon maskable.
 *
 * PAKET 84 — dua keputusan yang sengaja diambil:
 *
 *   1. `orientation: 'portrait'` DIHAPUS. Seluruh halaman sudah punya tata letak
 *      lanskap (`lg:`): Dashboard berbentuk bento grid, `/login` & `/checkout`
 *      dua kolom. Memaksa portrait justru merusak tampilan tablet & foldable,
 *      dan tidak ada satu pun layar yang butuh dipaksa berdiri.
 *   2. `shortcuts` DITAMBAH. App ini dipasang justru supaya cepat dipakai
 *      mencatat, jadi aksi-aksi paling sering diberi pintasan yang bisa
 *      ditekan lama dari ikon Home Screen.
 *
 * `start_url: '/app'` dan `scope: '/'` DIBIARKAN: `start_url: '/'` pernah
 * membuka halaman pemasaran tiap kali ikon ditekan, padahal user memasang app
 * ini untuk MENCATAT; `scope` tetap supaya /share & /join tidak keluar dari
 * jendela PWA.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CatetInd | Catet Keuangan 4 Detik, Tanpa Ribet',
    short_name: 'CatetInd',
    description:
      'Catat keuangan harianmu, tanam kebiasaan baik, dan tumbuh bareng tanaman virtualmu.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    shortcuts: [
      /* pintasan "Catat" mendarat di Dashboard: di sana FAB catat berada, jadi
         tidak ada dua pintu masuk yang harus dijaga terpisah. */
      { name: 'Catat', short_name: 'Catat', url: '/app' },
      { name: 'Wallet', short_name: 'Wallet', url: '/wallet' },
      { name: 'Budget', short_name: 'Budget', url: '/budget' },
    ],
    background_color: '#ffffff',
    theme_color: '#45594e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

