/* ── SIAPA YANG BOLEH MASUK DASHBOARD ADMIN (Founder Command Center) ─────────
   Dashboard Admin membaca SELURUH data bisnis: akun, langganan, pembayaran, dan
   hitungan aktivitas semua user. Karena itu daftar orang yang boleh masuk
   sengaja KECIL dan hidup di satu tempat — file ini.

   Aturan yang mengikat:

     1. EMAIL PEMILIK SELALU BOLEH. `shiimaify@gmail.com` adalah akun pemilik
        produk; ia tidak boleh bergantung pada env yang bisa lupa diisi saat
        deploy. Ini satu-satunya email yang ditulis di kode.
     2. TAMBAHAN DARI ENV, TANPA NILAI CADANGAN. `ADMIN_EMAILS` (dan alias
        `OWNER_EMAILS`) berisi daftar dipisah koma. Kosong = tidak ada admin
        tambahan. `OWNER_TEST_EMAIL` (jalur masuk cepat pemilik) ikut dihitung
        supaya akun uji pemilik tidak terkunci dari dashboardnya sendiri.
     3. PERBANDINGAN PERSIS. Tidak ada domain/alias/wildcard: `nama@domain.com`
        hanya cocok dengan dirinya sendiri (trim + huruf kecil).
     4. KEPUTUSAN MURNI. Fungsi di sini tidak menyentuh jaringan dan tidak
        membaca cookie — route & Server Component yang memverifikasi sesi lebih
        dulu (`lib/admin/guard.ts`). Dengan begitu aturan ini bisa diuji tanpa
        Supabase, dan tidak ada jalur "percaya pada cookie" yang bisa dipalsukan.

   ⚠️ File ini TIDAK boleh diimpor komponen klien untuk MENENTUKAN akses. Satu-
   satunya nilai admin yang boleh sampai ke browser adalah boolean `isAdmin`
   dari `/api/session` — bukan daftar emailnya.
   ────────────────────────────────────────────────────────────────────────── */

import { normalizeOwnerEmail, ownerTestEmail } from '@/lib/data/owner-access'

/** email pemilik produk — selalu punya akses dashboard admin */
export const OWNER_EMAIL = 'shiimaify@gmail.com'

/** env berisi daftar email admin tambahan (dipisah koma) */
export const ADMIN_EMAILS_ENV = 'ADMIN_EMAILS'
/** alias env yang diterima — nama lama/alternatif, isinya sama-sama dibaca */
export const OWNER_EMAILS_ENV = 'OWNER_EMAILS'

/** halaman dashboard admin */
export const ADMIN_PATH = '/admin'

/** email → bentuk kanonik untuk perbandingan (trim + huruf kecil) */
export function normalizeAdminEmail(value: string | null | undefined): string {
  return normalizeOwnerEmail(value)
}

/** "a@x.com, b@y.com ,, " → ['a@x.com','b@y.com'] (unik, sudah dinormalkan) */
export function parseEmailList(raw: string | null | undefined): string[] {
  const seen = new Set<string>()
  for (const part of (raw ?? '').split(',')) {
    const email = normalizeAdminEmail(part)
    /* bentuk minimum yang masuk akal; bukan validasi email penuh — tujuannya
       hanya membuang nilai kosong/spasi yang tidak mungkin cocok */
    if (email.includes('@')) seen.add(email)
  }
  return [...seen]
}

/**
 * Seluruh email yang boleh masuk dashboard admin, urut apa adanya:
 * pemilik → `ADMIN_EMAILS` → `OWNER_EMAILS` → `OWNER_TEST_EMAIL`.
 * Dibaca saat dipanggil (bukan saat modul dimuat) supaya test & hosting yang
 * mengubah env tidak terjebak nilai lama.
 */
export function adminEmails(): string[] {
  const seen = new Set<string>()
  const add = (value: string | null | undefined) => {
    const email = normalizeAdminEmail(value)
    if (email) seen.add(email)
  }

  add(OWNER_EMAIL)
  for (const email of parseEmailList(process.env.ADMIN_EMAILS)) add(email)
  for (const email of parseEmailList(process.env.OWNER_EMAILS)) add(email)
  add(ownerTestEmail())

  return [...seen]
}

/** true HANYA untuk email yang ada di daftar admin (persis, case-insensitive) */
export function isAdminEmail(email: string | null | undefined): boolean {
  const value = normalizeAdminEmail(email)
  return value.length > 0 && adminEmails().includes(value)
}

/** hasil keputusan akses — dipakai bersama oleh halaman & route API */
export type AdminAccessDecision = 'admin' | 'forbidden' | 'unauthenticated'

/**
 * Keputusan dari identitas HASIL VERIFIKASI server.
 *
 * `email` kosong = sesi tidak membawa email → diperlakukan belum masuk. Ini
 * fail-closed: identitas yang tidak lengkap tidak pernah menjadi admin.
 */
export function adminAccessDecision(input: {
  authenticated: boolean
  email: string | null | undefined
}): AdminAccessDecision {
  if (!input.authenticated) return 'unauthenticated'
  const email = normalizeAdminEmail(input.email)
  if (!email) return 'unauthenticated'
  return isAdminEmail(email) ? 'admin' : 'forbidden'
}

/**
 * Halaman tujuan saat akses ditolak.
 *
 * · belum masuk → landing (`/`). Middleware sudah mengarahkan ke `/login`, jadi
 *   nilai ini hanya terpakai kalau halaman sempat dirender tanpa sesi.
 * · user biasa → Dashboard app (`/app`) — "halaman utama aplikasi", bukan
 *   halaman harga, supaya penolakan tidak terasa seperti ajakan membayar.
 */
export function adminDeniedPath(decision: Exclude<AdminAccessDecision, 'admin'>): string {
  return decision === 'unauthenticated' ? '/' : '/app'
}
