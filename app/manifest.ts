import type { MetadataRoute } from 'next'

/**
 * PWA Manifest — syarat install ke Home Screen (precondition push notif iOS).
 * Ikon Home Screen/Android memakai aset kotak penuh di `public/icons/`
 * (digenerate scripts/generate-icons.mjs dari wordmark resmi), jadi logo selalu
 * terlihat baik dipakai sebagai ikon biasa maupun ikon maskable.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CatetInd — Track. Grow. Secure.',
    short_name: 'CatetInd',
    description:
      'Catat keuangan harianmu, tanam kebiasaan baik, dan tumbuh bareng tanaman virtualmu.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f8ef',
    theme_color: '#103a2a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
