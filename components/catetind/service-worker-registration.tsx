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
      /* dev: jangan tinggalkan SW lama yang menahan chunk basi di Cache Storage */
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => {
          /* diabaikan — tidak ada yang bisa dipulihkan dari sini */
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
