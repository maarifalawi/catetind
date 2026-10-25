/* ── AKUN REVIEWER MIDTRANS (verifikasi merchant) ────────────────────────────
   Login CatetInd memakai OTP yang dikirim ke inbox email. Reviewer manusia dari
   Midtrans tidak punya akses ke inbox kita, jadi mereka butuh SATU pintu masuk
   khusus yang tidak bergantung pada email sama sekali.

   Aturan yang mengikat file ini (jangan dilonggarkan tanpa alasan kuat):

     1. EMAIL TETAP. Hanya `reviewer@catetind.com` (persis, case-insensitive)
        yang boleh memakai jalur ini. Tidak ada env override untuk email —
        supaya "hanya email reviewer" tidak bisa berubah karena salah set env.
     2. KODE TETAP. Hanya `123456`. Kode ini BUKAN password akun nyata: ia hanya
        membuka akun UJI yang datanya terpisah dan tetap tunduk pada RLS.
     3. TANPA EMAIL. Kode ini tidak dikirim ke mana pun dan tidak memanggil SMTP;
        sesi reviewer dibuat server lewat Supabase Admin API (lihat
        `app/api/auth/reviewer/route.ts`) memakai `SUPABASE_SERVICE_ROLE_KEY`.
     4. NORMALISASI. Email di-trim + lowercase; kode di-trim. Selain itu ditolak
        — termasuk `reviewer@catetind.com.evil.com`, `reviewer+x@…`, dan
        subdomain lain.

   File ini murni data + validasi (tanpa React, tanpa jaringan) supaya bisa diuji
   langsung dan dipakai bersama oleh layar login (klien) dan route server. */

/** email satu-satunya yang boleh memakai jalur reviewer */
export const REVIEWER_TEST_EMAIL = 'reviewer@catetind.com'

/** kode akses tetap untuk reviewer — diberikan ke Midtrans di catatan verifikasi */
export const REVIEWER_TEST_OTP = '123456'

/** nama panggilan yang dipakai sapaan app untuk akun reviewer */
export const REVIEWER_TEST_NICKNAME = 'Midtrans Reviewer'

/** pesan yang ditampilkan kalau jalur reviewer dimatikan lewat env */
export const REVIEWER_DISABLED_MESSAGE = 'Login reviewer sedang dimatikan di server ini.'

/** server belum bisa membuat sesi (kunci peran server / Supabase belum siap) */
export const REVIEWER_UNAVAILABLE_MESSAGE =
  'Login reviewer belum bisa dipakai sekarang. Hubungi admin CatetInd ya.'

/** email/kode tidak cocok — sengaja TIDAK menyebut bagian mana yang salah */
export const REVIEWER_CREDENTIALS_MESSAGE = 'Email atau kode reviewer tidak cocok.'

/** Supabase menolak pembuatan tautan sesi (jangan bocorkan pesan mentahnya) */
export const REVIEWER_SESSION_FAILED_MESSAGE =
  'Sesi reviewer belum bisa dibuat. Coba lagi sebentar ya.'

/** terlalu banyak percobaan dari alamat yang sama */
export const REVIEWER_RATE_LIMIT_MESSAGE =
  'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'

/** email → bentuk kanonik untuk perbandingan (trim + lowercase) */
export function normalizeReviewerEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/** true HANYA untuk `reviewer@catetind.com` — bukan domain/subdomain lain */
export function isReviewerEmail(value: string | null | undefined): boolean {
  return normalizeReviewerEmail(value) === REVIEWER_TEST_EMAIL
}

/**
 * true kalau pasangan email + kode adalah kredensial reviewer yang sah.
 * Dipakai di klien (memilih jalur verifikasi) DAN di server (satu-satunya
 * gerbang sebelum Admin API dipanggil).
 */
export function isReviewerTestCode(
  email: string | null | undefined,
  code: string | null | undefined,
): boolean {
  if (!isReviewerEmail(email)) return false
  return (code ?? '').trim() === REVIEWER_TEST_OTP
}

/**
 * Env `REVIEWER_TEST_LOGIN_ENABLED` → boolean. Default AKTIF karena alur ini
 * memang harus bisa dipakai reviewer Midtrans di produksi tanpa konfigurasi
 * tambahan. Nilai `0` / `false` / `off` mematikannya (mis. saat audit internal).
 *
 * Nilai env diterima sebagai parameter (bukan dibaca di sini) supaya modul ini
 * tetap aman diimpor komponen klien — `process.env` rahasia tidak boleh
 * tersentuh bundel browser.
 */
export function reviewerLoginEnabled(rawFlag: string | null | undefined): boolean {
  const flag = (rawFlag ?? '').trim().toLowerCase()
  return flag !== '0' && flag !== 'false' && flag !== 'off'
}
