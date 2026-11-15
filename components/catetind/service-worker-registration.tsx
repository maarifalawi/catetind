'use client'

import { useEffect } from 'react'

/* ── Service Worker: HANYA PRODUKSI (paket 91 · perbaikan bug dev) ────────────
   `public/sw.js` menyajikan `/_next/static/**` dengan STALE-WHILE-REVALIDATE.
   Aturan itu BENAR untuk aset produksi (namanya ber-hash, jadi versi lama tidak
   pernah "salah versi") — tapi di `pnpm dev` nama chunk Turbopack TIDAK stabil
   antar-edit. Akibatnya, begitu sebuah modul berubah (mis. `lib/data/home-money.ts`
   bertambah ekspor `todayCashFlowPoint`), browser masih menjalankan chunk LAMA
   dari Cache Storage sementara modul yang mengimpornya sudah baru → melempar
   `... is not a function` dan halaman jatuh ke error segment. Gejalanya
   membingungkan: file di editor sudah berubah, tapi layar (dan chart) tidak.

   Karena itu di non-produksi SW ini (a) TIDAK didaftarkan dan (b) kalau versi
   lama masih terpasang dari sesi sebelumnya, diunregister + seluruh cache-nya
   dibersihkan — supaya `pnpm dev` selalu menyajikan kode SEGAR. Gerbang
   `process.env.NODE_ENV === 'production'`-nya sama dengan `<Analytics/>` di
   `app/layout.tsx`. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      /* dev: jangan tinggalkan SW lama yang menahan chunk basi di Cache Storage.
         Yang dibuang HANYA registrasi lain (mis. `sw.js` produksi dari sesi
         sebelumnya). SW push dev dibiarkan hidup supaya subscription perangkat
         tidak ikut dicabut setiap kali halaman dimuat ulang. */
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) =>
          Promise.all(
            regs
              .filter(
                (reg) =>
                  !reg.active?.scriptURL.endsWith('/sw-push-dev.js') &&
                  !reg.installing?.scriptURL.endsWith('/sw-push-dev.js') &&
                  !reg.waiting?.scriptURL.endsWith('/sw-push-dev.js'),
              )
              .map((reg) => reg.unregister()),
          ),
        )
        /* Push butuh service worker. Di dev kita daftarkan SW khusus push
           (`public/sw-push-dev.js`: hanya handler `push` + `notificationclick`,
           TANPA handler `fetch`), jadi (a) chunk dev tetap selalu segar dan
           (b) `navigator.serviceWorker.ready` resolve → tombol "Aktifkan
           Notifikasi" tidak lagi berputar selamanya di localhost. */
        .then(() => navigator.serviceWorker.register('/sw-push-dev.js'))
        .catch(() => {
          /* diabaikan — tanpa SW, tombol aktivasi akan memberi tahu user */
        })
      if ('caches' in window) {
        void caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {
            /* diabaikan */
          })
      }
      return
    }

    /* produksi: register sekali per sesi — dibutuhkan untuk Web Push */
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* gagal register (mis. bukan HTTPS) — push dinonaktifkan saja */
    })
  }, [])
  return null
}
