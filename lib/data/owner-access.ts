/* ── AKSES PEMILIK: KODE TETAP, TANPA EMAIL ──────────────────────────────────
   Login normal CatetInd memakai OTP 6 angka yang dikirim Supabase ke inbox.
   Pemilik aplikasi butuh SATU pintu masuk yang tidak bergantung pada kotak
   masuk email sama sekali — mis. untuk menguji build produksi dari perangkat
   yang inboxnya tidak bisa dibuka. File ini adalah satu-satunya tempat aturan
   itu didefinisikan.

   Aturan yang mengikat file ini (jangan dilonggarkan tanpa alasan kuat):

     1. DARI ENV. Email & kode TIDAK ditulis di kode: `OWNER_TEST_EMAIL` dan
        `OWNER_TEST_OTP`. Repo ini publik, jadi kredensial tidak boleh ikut
        ter-commit. Env kosong = jalur ini MATI (tidak ada nilai cadangan).
     2. EMAIL TETAP. Hanya email di `OWNER_TEST_EMAIL` (persis, case-insensitive)
        yang boleh memakai jalur ini — bukan domain/subdomain/alias turunannya.
     3. KODE TETAP. Hanya `OWNER_TEST_OTP` (6 angka). Kode ini BUKAN password
        kedua: ia hanya membuka akun pemilik yang datanya tetap tunduk pada RLS.
     4. TANPA EMAIL. Kode ini tidak pernah dikirim ke mana pun dan tidak
        memanggil SMTP; sesi dibuat server lewat Supabase Admin API (lihat
        `app/api/auth/owner/route.ts`) memakai `SUPABASE_SERVICE_ROLE_KEY`.
     5. BISA DIMATIKAN. Env `OWNER_TEST_LOGIN_ENABLED` bernilai `0` / `false` /
        `off` mematikan jalur ini tanpa mengubah kode (mis. saat audit).

   ⚠️ RISIKO YANG HARUS DISADARI: siapa pun yang tahu alamat email ini DAN kode
   aksesnya bisa masuk ke akun tersebut. Karena itu jalur ini hanya pantas untuk
   akun pemilik/uji — bukan akun pelanggan. Cara memasang & mematikannya ada di
   `docs/OWNER-FAST-LOGIN.md`.

   File ini murni data + validasi (tanpa React, tanpa jaringan) dan HANYA boleh
   diimpor dari server — nilainya dibaca dari `process.env` yang tidak
   ber-awalan `NEXT_PUBLIC_`. */

/**
 * Email pemilik dari env `OWNER_TEST_EMAIL`. **Kosong = jalur ini mati.**
 *
 * Tidak ada nilai bawaan di kode dengan sengaja: repo ini publik, jadi
 * kredensial tidak boleh ikut ter-commit. Nilainya hanya ada di `.env.local`
 * dan di environment hosting (server-only, bukan `NEXT_PUBLIC_*`).
 */
export function ownerTestEmail(): string {
  return normalizeOwnerEmail(process.env.OWNER_TEST_EMAIL)
}

/**
 * Kode akses tetap dari env `OWNER_TEST_OTP`. **Kosong = jalur ini mati.**
 * Harus tepat 6 angka supaya cocok dengan form OTP di layar masuk.
 */
export function ownerTestOtp(): string {
  return (process.env.OWNER_TEST_OTP ?? '').trim()
}

/** true = kedua env terpasang dan bentuknya masuk akal → jalur bisa dipakai */
export function ownerFastLoginConfigured(): boolean {
  return ownerTestEmail().includes('@') && /^\d{6}$/.test(ownerTestOtp())
}

/**
 * Nama panggilan yang dipakai kalau akunnya belum ada. Bukan rahasia, jadi
 * boleh punya nilai cadangan; bisa ditimpa `OWNER_TEST_NICKNAME`.
 */
export function ownerTestNickname(): string {
  return (process.env.OWNER_TEST_NICKNAME ?? '').trim() || 'Pemilik'
}

/** jalur kode tetap dimatikan lewat env */
export const OWNER_DISABLED_MESSAGE = 'Masuk cepat pemilik sedang dimatikan di server ini.'

/** server belum bisa membuat sesi (kunci peran server / Supabase belum siap) */
export const OWNER_UNAVAILABLE_MESSAGE =
  'Masuk cepat pemilik belum bisa dipakai sekarang. Hubungi admin CatetInd ya.'

/** email/kode tidak cocok — sengaja TIDAK menyebut bagian mana yang salah */
export const OWNER_CREDENTIALS_MESSAGE = 'Email atau kode akses pemilik tidak cocok.'

/** Supabase menolak pembuatan sesi (jangan bocorkan pesan mentahnya) */
export const OWNER_SESSION_FAILED_MESSAGE =
  'Sesi pemilik belum bisa dibuat. Coba lagi sebentar ya.'

/** terlalu banyak percobaan dari alamat yang sama */
export const OWNER_RATE_LIMIT_MESSAGE =
  'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'

/** email → bentuk kanonik untuk perbandingan (trim + lowercase) */
export function normalizeOwnerEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/** true HANYA untuk email di `OWNER_TEST_EMAIL` — bukan domain/subdomain lain */
export function isOwnerTestEmail(value: string | null | undefined): boolean {
  const configured = ownerTestEmail()
  return configured.length > 0 && normalizeOwnerEmail(value) === configured
}

/**
 * true kalau pasangan email + kode adalah kredensial pemilik yang sah.
 * Dipakai di server (satu-satunya gerbang sebelum Admin API dipanggil).
 * Selalu `false` kalau env belum diisi — jadi tidak ada kode cadangan.
 */
export function isOwnerTestCode(
  email: string | null | undefined,
  code: string | null | undefined,
): boolean {
  if (!isOwnerTestEmail(email)) return false
  const otp = ownerTestOtp()
  return otp.length > 0 && (code ?? '').trim() === otp
}

/**
 * Env `OWNER_TEST_LOGIN_ENABLED` → boolean.
 *
 * Default AKTIF supaya pemilik bisa memakainya tanpa konfigurasi tambahan;
 * nilai `0` / `false` / `off` mematikannya. Nilai env diterima sebagai parameter
 * (bukan dibaca di sini) supaya modul ini tetap aman diimpor komponen klien —
 * `process.env` rahasia tidak boleh tersentuh bundel browser.
 */
export function ownerLoginEnabled(rawFlag: string | null | undefined): boolean {
  const flag = (rawFlag ?? '').trim().toLowerCase()
  return flag !== '0' && flag !== 'false' && flag !== 'off'
}
