# Akun Reviewer Midtrans — Login Tanpa Inbox Email

Dokumen ini untuk **Midtrans Merchant Verification**. Reviewer manusia perlu
masuk ke CatetInd dan mencoba alur checkout tanpa akses ke inbox email kita.

## Kredensial yang diberikan ke Midtrans

| Field | Nilai |
|---|---|
| URL login | `https://catetind.com/login` |
| Email | `reviewer@catetind.com` |
| Kode akses (OTP) | `123456` |

Kode `123456` **hanya berlaku untuk email itu**. Email lain tetap memakai OTP
normal yang dikirim Supabase ke inbox masing-masing.

## Cara kerja (teknis)

1. Reviewer mengetik `reviewer@catetind.com` di `/login`, lalu menekan
   **Kirim kode masuk**. Untuk email ini aplikasi **tidak** memanggil SMTP —
   layar langsung pindah ke langkah kode.
2. Reviewer mengetik `123456` dan menekan **Masuk sekarang**.
3. Browser memanggil `POST /api/auth/reviewer`:
   - route memvalidasi email + kode reviewer (`lib/data/reviewer-access.ts`);
   - akun `reviewer@catetind.com` dipastikan ada & terkonfirmasi
     (`admin.createUser`, `email_confirm: true`);
   - `admin.generateLink({ type: 'magiclink' })` membuat `hashed_token`
     **tanpa mengirim email**.
4. Browser menukar `hashed_token` menjadi sesi lewat
   `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`.
   Cookie sesi ditulis `@supabase/ssr` — **sama persis** dengan login OTP biasa,
   jadi middleware, gerbang paket, dan RLS tidak punya pengecualian apa pun.
5. Setelah masuk, reviewer mendarat di `/app` → gerbang paket mengarahkannya ke
   `/checkout` (akun reviewer belum punya langganan — memang begitu seharusnya).
   Di sana reviewer bisa memilih paket dan menjalankan alur pembayaran Midtrans
   sandbox/production sesuai konfigurasi server.

## Konfigurasi yang dibutuhkan

| Env | Fungsi |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **wajib** di server — dipakai Admin API untuk membuat sesi reviewer. Tidak pernah dikirim ke browser. |
| `REVIEWER_TEST_LOGIN_ENABLED` | opsional. Kosong/`1` = aktif (default). `0`/`false`/`off` = matikan jalur reviewer. |

Email dan kode reviewer **tidak** bisa diubah lewat env: keduanya konstanta di
`lib/data/reviewer-access.ts`, supaya aturan "hanya `reviewer@catetind.com`"
tidak bisa berubah karena salah konfigurasi.

## Batas keamanan

- Hanya email persis `reviewer@catetind.com` (trim + case-insensitive). Subdomain,
  `+alias`, atau domain lain ditolak.
- Hanya kode persis `123456`.
- Pesan error tidak membedakan "email salah" dan "kode salah", dan tidak
  membocorkan detail Supabase.
- Rate-limit 20 percobaan / 10 menit per IP (best-effort per instance server).
- Akun reviewer adalah **akun biasa**: RLS `user_id = auth.uid()` tetap berlaku,
  dan gerbang paket tetap mendorongnya ke `/checkout` selama belum membayar.
- Kunci `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di route server
  (`app/api/auth/reviewer/route.ts`), tidak pernah di variabel `NEXT_PUBLIC_*`.

## Uji manual cepat

```bash
# 1) kredensial salah → 401
curl -i -X POST https://catetind.com/api/auth/reviewer \
  -H 'Content-Type: application/json' \
  -d '{"email":"someone@example.com","code":"123456"}'

# 2) kredensial reviewer → 200 + tokenHash
curl -i -X POST https://catetind.com/api/auth/reviewer \
  -H 'Content-Type: application/json' \
  -d '{"email":"reviewer@catetind.com","code":"123456"}'
```

Uji end-to-end lewat browser: `/login` → email reviewer → kode `123456` →
halaman `/checkout` terbuka dengan sesi aktif.

## Mematikan jalur reviewer

Set `REVIEWER_TEST_LOGIN_ENABLED=0` lalu redeploy. Route akan menjawab `403`
dan layar login kembali memakai OTP email biasa untuk semua alamat.
