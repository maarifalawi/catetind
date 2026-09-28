/* ── SAKLAR DEMO (paket 42 · audit Stage 5 #5) ───────────────────────────────
   Repo ini DESIGN/DEMO, jadi banyak state "yang seharusnya jarang" dipaksa
   tampil supaya bisa direview desainer: rekap bulanan setiap hari, selebrasi
   pasangan palsu, banner rekap mingguan di hari Selasa. Sebelum paket ini
   saklar-saklar itu `true` KERAS di kode — kalau di-ship, user pertama yang
   membuka app akan melihat rekap palsu & pasangan yang tidak pernah ia undang.

   Satu gerbang untuk semuanya: `NEXT_PUBLIC_DEMO`.

     · `NEXT_PUBLIC_DEMO=1`  → perilaku review desain (semua banner dipaksa tampil)
     · tidak diisi / nilai lain → perilaku produksi (default, termasuk `pnpm build`)

   Cara review desain lokal:
     PowerShell → `$env:NEXT_PUBLIC_DEMO='1'; pnpm dev`
     (atau tambahkan barisnya ke `.env.local` — jangan pernah di-set di
     environment produksi, karena nilainya ikut ter-bundle ke klien.)

   Kenapa dibaca di SATU tempat: nilai variabel `NEXT_PUBLIC_*` di-inline Next.js
   ke bundel saat build. Kalau nilainya diisi di environment produksi, saklar ini
   IKUT ter-bundle ke klien (dan ikut terkirim ke setiap browser) — jadi
   "menyalakan demo" di produksi bukan sekadar menyentuh kode, tapi mengubah
   perilaku yang dibaca user. Sebaliknya, build tanpa variabel ini (default,
   termasuk `pnpm build` di repo ini) menghasilkan `false`, dan itu yang
   dibuktikan `lib/demo.test.ts`. Satu gerbang = satu grep yang bisa membuktikan
   semuanya; itulah alasan file ini ada. */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === '1'
