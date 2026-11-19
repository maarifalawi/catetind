/* ── RUTE PREVIEW DESAIN (DEV SAJA) ──────────────────────────────────────────
   Beberapa layar app hanya bisa dilihat setelah login DAN punya paket aktif
   (`/app/onboarding` salah satunya). Untuk meninjau desainnya — tanpa membuat
   akun, tanpa mengotori akun pemilik — ada rute preview yang merender komponen
   layarnya APA ADANYA: tanpa sesi, tanpa data akun, tanpa gerbang paket.

   ATURAN YANG MENGIKAT (jangan dilonggarkan):

     1. HANYA DI LUAR PRODUKSI. `previewEnabled()` membaca `NODE_ENV`, yang
        di-inline Next saat build; pada `next build`/`next start` nilainya
        `'production'`, jadi cabang di middleware MATI dan halaman preview
        memanggil `notFound()` (pertahanan kedua, tidak bergantung middleware).
     2. TIDAK masuk `PUBLIC_ROUTES`. Daftar itu dipakai gerbang provider klien
        (`SubscriptionGateProvider`, `AppLockProvider`) dan sengaja tidak
        memuat satu pun layar app; rute preview juga tidak hidup di grup
        `(app)`, jadi tidak ada provider app yang terpasang.
     3. TIDAK memberi akses data. Preview merender layar kosong; apa pun yang
        diisi pengunjung tinggal di perangkatnya (localStorage/IndexedDB) dan
        tidak pernah dikirim sebagai milik akun.
     4. Rute preview tidak boleh dipakai untuk menguji alur yang MENULIS ke
        server: `POST /api/onboarding` di sana dijawab 401 karena tidak ada
        sesi — itu memang disengaja.

   Kenapa dipisah ke file murni: `middleware.ts` (edge) dan halaman preview
   (server component) harus membaca SATU daftar dan SATU gerbang, supaya tidak
   pernah ada rute preview yang lolos di produksi karena lupa disamakan. */
import { matchesRoute } from './route-match'

export const PREVIEW_ROUTES = [
  /** `/app/onboarding` tanpa sesi — untuk review desain flow 3 langkah */
  '/preview-onboarding',
] as const

/**
 * true hanya di `next dev` / `vitest`. `next build` & `next start` selalu
 * `false` karena `NODE_ENV` di-inline `'production'` saat build.
 */
export function previewEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/** true kalau pathname adalah rute preview (pencocokan berbatas segmen) */
export function isPreviewRoute(pathname: string): boolean {
  return PREVIEW_ROUTES.some((route) => matchesRoute(pathname, route))
}
