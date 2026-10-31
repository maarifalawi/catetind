# Masuk Cepat Pemilik — kode tetap tanpa email

> **Untuk siapa:** SATU akun pemilik/uji yang dipilih lewat env
> `OWNER_TEST_EMAIL` (bukan akun pelanggan).
> **Apa yang berubah:** akun itu bisa masuk dengan kode tetap dari
> `OWNER_TEST_OTP` dan **tidak ada email yang dikirim**. Semua email lain tetap
> memakai OTP biasa.

Kredensialnya **tidak pernah ditulis di kode** — repo ini publik. Nilainya hanya
ada di `.env.local` (lokal) dan di environment server hosting. Kalau env kosong,
jalur ini mati total dan tidak ada nilai cadangan.

## Setup

`.env.local` (lokal) dan Environment Variables di hosting (Production):

```env
# AKUN PEMILIK — server-only, JANGAN pakai awalan NEXT_PUBLIC_
OWNER_TEST_EMAIL=nama@email-pemilik.com
OWNER_TEST_OTP=123456
# opsional: 0/false/off = matikan jalur ini sama sekali
OWNER_TEST_LOGIN_ENABLED=1
```

Syarat lain: `SUPABASE_SERVICE_ROLE_KEY` terpasang di environment server (bukan
`NEXT_PUBLIC_*`). Kunci itu memang sudah dibutuhkan webhook Midtrans.

## Yang terjadi saat login

| Langkah | Email lain | Email di `OWNER_TEST_EMAIL` |
|---|---|---|
| Tekan **Kirim kode masuk** | Supabase mengirim OTP 6 angka ke inbox | **tidak ada email** — layar langsung ke langkah kode |
| Ketik kode dari env | ditolak (bukan kode asli) | diterima |
| Sesi | `verifyOtp` di browser | `POST /api/auth/owner` membuat sesi di **server** |

Jalur pemilik tetap menghasilkan **sesi Supabase sungguhan**: cookie
`sb-<ref>-auth-token` ditulis `@supabase/ssr`, RLS berlaku, dan gerbang paket di
middleware tetap berjalan. Yang dilewati hanya pengiriman email — bukan
autentikasi.

## Bagian kodenya

| Berkas | Peran |
|---|---|
| `lib/data/owner-access.ts` | membaca `OWNER_TEST_EMAIL` / `OWNER_TEST_OTP`, validasi, pesan (server-only) |
| `app/api/auth/owner/route.ts` | `POST` dua tahap: probe `{ email }` → `{ fastLogin }`, lalu kredensial `{ email, code }` → Admin API `generateLink` (tanpa email) + `verifyOtp({ token_hash })` **di server** |
| `lib/session-client.ts` | `sendLoginLink` bertanya dulu ke route (probe) sebelum memanggil SMTP; `verifyEmailOtp` memakai jalur server saat diminta |
| `components/catetind/login-screen.tsx` | copy langkah kode yang jujur ("tidak ada email yang dikirim") |

Browser **tidak pernah** menerima kredensial pemilik maupun `token_hash`:
nilai env dibaca di server, token dibuat, ditukar, dan disimpan sebagai cookie
seluruhnya di server. Beda dari jalur reviewer Midtrans lama yang sudah dihapus
(lihat [`MIDTRANS-REVIEWER-LOGIN.md`](./MIDTRANS-REVIEWER-LOGIN.md)).

## Cara mematikan (disarankan saat audit / setelah tidak dipakai)

Pilih salah satu, lalu redeploy:

```env
OWNER_TEST_LOGIN_ENABLED=0
```

atau kosongkan `OWNER_TEST_EMAIL` / `OWNER_TEST_OTP`. Akibatnya probe menjawab
`fastLogin:false`, route tidak pernah membuat sesi, dan layar masuk kembali 100%
OTP-email. Tidak ada kode yang perlu diubah.

## Risiko yang harus disadari

Kode dari env bersifat **statis dan tidak kedaluwarsa**. Siapa pun yang tahu
alamat email itu DAN kodenya bisa masuk ke akun tersebut. Karena itu:

- jangan pernah memakai jalur ini untuk akun pelanggan;
- batas percobaan adalah 10 kali / 10 menit per IP (best-effort, per instance
  server) — cukup mencegah tebakan buta, **bukan** pengganti kode acak;
- kredensialnya hanya di env server. Kalau `.env.local` bocor, ganti nilainya
  dan redeploy — tidak ada yang perlu di-commit ulang;
- kalau akun pemilik mulai menyimpan data sensitif, matikan jalur ini dan pakai
  OTP email biasa.

## Memberi paket tanpa pembayaran

Jalur ini **tidak** menyentuh paket. Untuk mengubah paket akun, pakai skrip yang
sudah ada:

```bash
node scripts/supabase/grant-akses.mjs <email-pemilik> sultan
```

Skrip itu menulis `user_subscriptions` (`tier_name = 'sultan'`,
`is_lifetime = true`, `is_active = true`) memakai kunci peran server.
