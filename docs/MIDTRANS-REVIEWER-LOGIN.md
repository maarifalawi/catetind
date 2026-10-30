# Akun Reviewer Midtrans — SUDAH DIHAPUS

> **Status: dihapus dari aplikasi.** Merchant CatetInd sudah resmi di-ACC
> Midtrans, sehingga pintu masuk khusus reviewer tidak boleh lagi ada.

## Yang dihapus

| Dulu ada | Sekarang |
|---|---|
| `POST /api/auth/reviewer` (membuat sesi lewat Admin API) | **dihapus** — route tidak ada lagi |
| `reviewer@catetind.com` + kode tetap `123456` | **dihapus** — email biasa, OTP normal |
| `lib/data/reviewer-access.ts` | **dihapus** |
| `lib/subscription/reviewer-plan.ts` (bootstrap paket Waras otomatis) | **dihapus** |
| `signInWithReviewerCode()` di `lib/session-client.ts` | **dihapus** |
| Env `REVIEWER_TEST_LOGIN_ENABLED` | **dihapus** — tidak dibaca kode mana pun |

## Kenapa dihapus, bukan sekadar dimatikan

Jalur itu menerima kode **statis** (`123456`) yang tidak pernah kedaluwarsa dan
membuat sesi Supabase sungguhan lewat `SUPABASE_SERVICE_ROLE_KEY`. Selama kode
itu ada, satu-satunya yang melindungi akun reviewer adalah komentar di
dokumen — bukan kontrol teknis. Setelah ACC, tidak ada lagi alasan
mempertahankannya.

## Cara masuk sekarang (untuk semua orang)

1. Buka `https://catetind.com/login`.
2. Tulis email, tekan **Kirim kode masuk**.
3. Ambil kode 6 angka dari inbox email tersebut, lalu masukkan di layar yang sama.

Tidak ada email yang dikecualikan, tidak ada kode cadangan, dan tidak ada route
autentikasi yang melewati inbox.

## Kalau butuh akun uji internal

Buat akun dengan email yang inboxnya benar-benar bisa dibaca tim (mis.
`qa@catetind.com`), lalu beri paket lewat
`scripts/supabase/grant-akses.mjs` atau `user_subscriptions` di Supabase —
bukan dengan menambahkan kembali kode statis di kode aplikasi.

## Dokumen terkait

Konfigurasi pembayaran Production (env, URL dashboard, webhook) ada di
[`MIDTRANS-PRODUCTION.md`](./MIDTRANS-PRODUCTION.md).

