# HANDOFF — CatetInd paket 83: UI PEMBAYARAN SENDIRI (Midtrans Core API)

> **Prompt untuk TASK BARU.** Isinya sengaja lengkap: status proyek, semua keputusan,
> kredensial, dan gotcha dari sesi sebelumnya — supaya task baru TIDAK kekurangan informasi.
> **Baca sampai habis dulu sebelum menulis kode.**

## 0. PERAN & GAYA KERJA
- Kamu MELANJUTKAN pekerjaan CatetInd. Bahasa obrolan: Indonesia santai-profesional (user pakai "gua/lu").
- SEMUA kode & komentar proyek berbahasa INDONESIA → tulis dengan gaya yang sama.
- **ATURAN KERAS:** JANGAN pernah membuat UI/route yang "mengaku sudah jalan" padahal belum.
  Kalau belum bisa → jawab JUJUR (503 / empty state / kata "belum aktif"), bukan token atau tanda palsu.
- Setiap keputusan penting (harga, alur, kredensial) **LAPORKAN** ke user, jangan diam-diam.
- Sebelum mengubah sesuatu → BACA file relevan. Setelah mengubah → WAJIB verifikasi:
  `pnpm test` + `pnpm exec tsc --noEmit` + `pnpm build`.

## 1. PROYEK
- Root: `c:\Users\maari\Downloads\catet-ind-dashboard-design` (Windows + PowerShell).
- Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · pnpm ·
  Supabase (Postgres+Auth) · Midtrans · DeepSeek · Web Push.
- PWA mobile-first, bahasa Indonesia.
- Git: `github.com/maarifalawi/catetind`, branch `main`. **LIVE di `https://catetind.com`** (Vercel).
- Perintah: `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm test` · `pnpm exec tsc --noEmit`
- Skrip DB: `pnpm supabase:migrate` · `pnpm supabase:verify`

## 2. TUGAS BESAR TASK INI
**Ganti alur pembayaran dari halaman Snap Midtrans (hosted) → halaman pembayaran MILIK SENDIRI
di dalam app, memakai Midtrans CORE API.**

- Alasan dari user: halaman Snap terasa "halaman baru yang beda". User mau UI yang **KONSISTEN**
  dengan tema app (cream / forest / sage), tanpa user pindah ke domain Midtrans.
- Hasil yang diinginkan: user klik "Bayar sekarang" → tampil **QRIS / nomor VA / tombol e-wallet
  DI DALAM app** → status ter-update otomatis → langganan aktif → user lanjut pakai app.
- **Yang TIDAK boleh berubah:** webhook + RPC pemenuhan + tabel `purchases`/`user_subscriptions`,
  harga & katalog, dan seluruh aturan keamanan di §3.2/§6.

## 3. STATUS REPO SEKARANG (semua ini SUDAH jadi — jangan diulang dari nol)

### 3.1 Infrastruktur & deploy
- App live: `https://catetind.com` (Vercel production). Alias: `https://catetind.vercel.app`.
- Domain `catetind.com` dibeli di **Hostinger**; `A @ → 216.198.79.1` (Vercel).
  **MX + TXT SPF/DKIM tetap milik Hostinger** (email bisnis) — JANGAN diubah.
- Supabase: project ref `wmswtoyikvgzcvbgdceo`, org `luygqolodvtmydqurnzf`, region `ap-northeast-2`.
- Supabase Auth:
  - `site_url = https://catetind.com`
  - `uri_allow_list = http://localhost:3000, http://localhost:3000/**, https://catetind.vercel.app, https://catetind.vercel.app/**, https://catetind.com, https://catetind.com/**`

### 3.2 Database (SUDAH dimigrasi — JANGAN reset tanpa izin user)
9 file migrasi di `supabase/migrations/` (idempotent, semua sudah terpasang):
**32 tabel, 75 policy RLS.** Yang relevan untuk task ini:
- `purchases` — `order_id`, `user_id`, `status` (`pending`/`settlement`/…), `tier_name`, `billing_period`.
  RLS: user boleh SELECT miliknya & INSERT baris `pending` miliknya; **TIDAK ada UPDATE/DELETE**.
- `user_subscriptions` — `tier_name`, `is_active`, `is_lifetime`, `started_at`, `expires_at`.
  RLS: user hanya SELECT miliknya; penulisan HANYA lewat RPC.
- RPC `public.catetind_fulfill_purchase(p_order_id, p_status, p_amount, p_payment_method, p_midtrans_tx_id)`
  → `security definer`, **hanya `service_role`** yang boleh EXECUTE (anon → **401**). Idempoten by `order_id`.
  Return: `[{ claimed_slot, claimed_price, claimed_tier, already_processed }]`.
- `pnpm supabase:verify` → harus tetap berbunyi: *"Aman: tidak ada data yang bisa dibaca tanpa sesi"*.

### 3.3 PEMBAYARAN yang ada SEKARANG (INI yang mau diganti)

**Katalog:** 3 tier × (bulanan, tahunan) — "seumur hidup"/Founding Member **TIDAK dijual**:
- `catet-aja`: Rp49.000/tahun · Rp6.000/bulan
- `waras` (hero/rekomendasi): Rp109.000/tahun · Rp14.000/bulan
- `sultan`: Rp199.000/tahun · Rp25.000/bulan
- Diskon kode teman 10% dihitung **SERVER** (Waras tahunan → Rp98.100). Harga bulanan diturunkan dari
  tahunan. **SATU sumber harga: `lib/data/pricing.ts`** — fungsi `SELLABLE_PERIODS`, `isSellablePeriod`,
  `offerPrice`, `isValidOfferAmount`, `buildPayHref`.

**Alur sekarang = REDIRECT ke halaman Snap:**
1. `/checkout` (pilih paket + periode) → CTA.
   - Sudah login → `buildPayHref(plan, period, kode)` → `/checkout/bayar?plan=..&period=..&kode=..`
   - Belum login → sheet registrasi → `registerAccount()` → auto-login → `/checkout/bayar`;
     kalau wajib verifikasi email → `/login/verify?next=<href bayar>`.
2. `/checkout/bayar` (`PaymentStartScreen`) → `POST /api/payment/create` →
   `{ ok, orderId, token, redirectUrl }` → `window.location.assign(redirectUrl)` **(halaman Snap Midtrans)**.
3. Snap callbacks: `finish = ${origin}/checkout/selesai?order_id=…`, `error = …&status=error`
   (origin diambil dari header `Origin` request — TIDAK ada domain yang di-hardcode).
4. Midtrans → `POST /api/payment/webhook` (verifikasi SHA512) → RPC pemenuhan (kunci service role).
5. `/checkout/selesai` (`PaymentDoneScreen`) → poll `GET /api/subscription` (±30 detik) → "Langgananmu aktif 🎉".

**Kontrak route yang SUDAH ada (jaga/tambahkan, jangan rusak):**
- `POST /api/payment/create` (`app/api/payment/create/route.ts`)
  - `requireUser()` dulu (identitas dari sesi cookie, BUKAN body).
  - Guard: (paket + periode + nominal) dicocokkan ke harga kanon → salah = **422**.
  - Tulis baris `purchases` `pending` **atas nama user** (RLS) sebelum provider dipanggil.
  - Panggil `createSnapTransaction()`; balas `{ ok, orderId, token, redirectUrl }`.
  - Tanpa `MIDTRANS_SERVER_KEY` → **503** `"Pembayaran belum aktif"`.
  - `orderId` = `${purpose}-${userId.slice(0,8)}-${Date.now()}`.
- `POST /api/payment/webhook` (`app/api/payment/webhook/route.ts`)
  - **503** tanpa key · **403** tanda tangan salah · pemenuhan via RPC service-role.
  - Balas `{ ok, handled, orderId, status, settled, alreadyProcessed, slot }`.
  - Order tak dikenal → **200 `handled:false`** (jangan bikin Midtrans retry selamanya).
- `GET /api/subscription` — `{ ok, configured, active, subscription:{tier,lifetime,active,startedAt,expiresAt} }`.
  Tanpa sesi → **401**.

**File pembayaran:** `lib/payments/midtrans.ts` (`midtransConfigured`, `midtransServerKey`,
`midtransSnapEndpoint`, `verifyMidtransSignature`, `createSnapTransaction`), `lib/payments/types.ts`
(`PaymentIntent`, `PaymentToken`, `PaymentUnavailableReason`), `components/catetind/payment-start-screen.tsx`,
`components/catetind/payment-done-screen.tsx`, `app/checkout/{page.tsx,bayar/page.tsx,selesai/page.tsx}`.
Uji manual pemenuhan: `node scripts/supabase/smoke-pembayaran.mjs` (bikin + hapus user uji sendiri).

### 3.4 Auth & email (SUDAH jalan)
- Login = **kode OTP 6 angka**: `/login` → `signInWithOtp` → `verifyOtp`. Magic link juga hidup
  (`/login/verify?code=` / `#access_token=`).
- `/login/verify` mendukung **`?next=`**, disaring `safeNextPath()` di `lib/data/auth.ts`
  (penjaga open-redirect: hanya jalur absolut-situs; tolak `http(s)://`, `//host`, `\`, `..`, spasi).
- Supabase Auth: `mailer_autoconfirm=false`, **`mailer_otp_length=6`**, `rate_limit_email_sent=30`,
  kooldown kirim-ulang per email ~60 detik (429 `over_email_send_rate_limit`).
- Template email Magic Link & Confirmation sudah memuat `{{ .Token }}` (subjek "Kode masuk CatetInd").
- **SMTP = Hostinger** `smtp.hostinger.com:465`, user & `smtp_admin_email` = `halo@catetind.com`,
  `smtp_sender_name` = "CatetInd". Bisa kirim ke **siapa saja** (Resend sandbox sudah ditinggalkan).
  Catatan: pengiriman pertama setelah ubah config kadang 500 — retry sekali biasanya langsung 200.

### 3.5 AI (SUDAH DeepSeek, bukan Gemini)
- `lib/ai/provider.ts` → `POST https://api.deepseek.com/chat/completions` (kompatibel OpenAI),
  baca `choices[0].message.content`, `reasoning_effort: 'low'`, mode JSON lewat `response_format`.
- Model: **`deepseek-flash`** (teks **dan** gambar/vision). Env: `DEEPSEEK_API_KEY` (+ opsional
  `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL_TEXT`, `DEEPSEEK_MODEL_VISION`).
- Route: `/api/ai/text` (coach — ada pagar skop & pagar klaim), `/api/ai/ocr`, `/api/ai/categorize`.

### 3.6 Test & verifikasi (angka baseline saat handoff)
- `pnpm test` → **991 test / 76 file lulus**
- `pnpm exec tsc --noEmit` → **exit 0**
- `pnpm build` → **exit 0**

## 4. FAKTA MIDTRANS CORE API (dipakai task ini)

> Sumber: dokumentasi resmi Midtrans. **Semua sandbox** — `MIDTRANS_IS_PRODUCTION=0`, JANGAN dinyalakan
> sampai user mengganti ke kunci produksi.

- Base URL sandbox: **`https://api.sandbox.midtrans.com`**
- Auth: header `Authorization: Basic <base64(serverKey + ":")>` — perhatikan **titik dua** setelah key,
  dan **key ditulis apa adanya** (JANGAN di-encode ganda).
- Header lain: `Accept: application/json`, `Content-Type: application/json`.

### 4.1 Bikin tagihan — `POST /v2/charge`
Body umum:
```json
{
  "payment_type": "qris",
  "transaction_details": { "order_id": "subscribe-xxxxxxxx-1730000000000", "gross_amount": 109000 },
  "item_details": [{ "id": "waras", "price": 109000, "quantity": 1, "name": "CatetInd Waras — Tahunan" }],
  "customer_details": { "first_name": "Rina", "email": "rina@email.com" },
  "custom_expiry": { "expiry_duration": 60, "unit": "minute" }
}
```
Per metode (fase 1):
- **QRIS** — `"payment_type": "qris"` (opsional `"qris": { "acquirer": "gopay" }`).
  Balasan berisi `actions: [{ name: "generate-qr-code", method: "GET", url: "…" }]` (URL gambar QR —
  boleh langsung dipasang di `<img>`) dan/atau `qr_string`.
- **Bank Transfer / VA** — `"payment_type": "bank_transfer"`, `"bank_transfer": { "bank": "bca" }`
  (atau `"permata"`, `"bni"`, `"bri"`, `"cimb"`). Balasan berisi `va_numbers: [{ bank, va_number }]`
  dan `expiry_time`. Khusus **Permata** nomornya di `permata_va_number`.
- **GoPay** — `"payment_type": "gopay"` → `actions` (`generate-qr-code` / `deeplink-redirect`).
- **ShopeePay** — `"payment_type": "shopeepay"` → `actions: [{ name: "deeplink-redirect" }]`.
- **Mandiri Bill** — `"payment_type": "echannel"`, `"echannel": { "bill_info1": "Pembayaran:", "bill_info2": "Langganan CatetInd" }`
  → balasan `biller_code` + `bill_key`.

### 4.2 Cek status — `GET /v2/{order_id}/status`
Auth Basic yang sama. Balasan memuat `transaction_status`, `fraud_status`, `gross_amount`, `payment_type`,
`transaction_id`, `expiry_time`. Belum ada → **404**.

`transaction_status`: `capture` · `settlement` · `pending` · `deny` · `cancel` · `expire` · `failure` · `refund` · `partial_refund` · `authorize`.
`fraud_status`: `accept` · `deny` · `challenge`.

### 4.3 Notifikasi (WEBHOOK) — sudah ada, pakai yang sama
- Midtrans POST JSON ke notification URL. Verifikasi: `SHA512(order_id + status_code + gross_amount + serverKey)`
  harus sama dengan `signature_key`.
- **Bisa di-override per transaksi lewat header di `/v2/charge`** (DOKUMENTASI RESMI, dan ini keuntungan
  besar pindah ke Core API):
  - `X-Append-Notification: https://a/hook,https://b/hook` (menambah, maks 3 URL)
  - `X-Override-Notification: https://a/hook,https://b/hook` (menimpa setelan dashboard, maks 3 URL)
  - Kalau keduanya dipakai, **override menang**.
  → Artinya app bisa menetapkan URL webhook SENDIRI per transaksi (ambil dari header `Origin` request),
    jadi **tidak bergantung setelan dashboard** dan otomatis benar di localhost (ngrok) maupun produksi.
    **Ini yang direkomendasikan.**
- Setelan dashboard kalau tetap dipakai: **Settings → `Payment` → Payment notification URL**
  (BUKAN `Payment Link`). Nilai saat ini: `https://catetind.com/api/payment/webhook`.

### 4.4 Uji & simulasi (sandbox)
- Simulator pembayaran: **`https://simulator.sandbox.midtrans.com/`**
- `order_id` WAJIB unik — memakai ulang `order_id` yang sudah dibayar ditolak provider
  (balas error "order_id has been used"). Jadi: **satu baris `purchases` = satu `order_id`**, dan kalau
  user menekan bayar dua kali, **pakai order yang sama** (idempoten), jangan bikin order baru.

## 5. RANCANGAN YANG DIHARAPKAN (boleh diperbaiki, tapi wajib menjaga §6)

### 5.1 Pengalaman user (tema app, TANPA pindah domain)
1. `/checkout/bayar` — user memilih **metode bayar** di dalam app (kartu pilihan bergaya app:
   QRIS, BCA/BRI/BNI/Permata VA, GoPay, ShopeePay, Mandiri Bill). Nominal & paket tetap dari
   `lib/data/pricing.ts` (server yang memutuskan, bukan klien).
2. Tekan **"Bayar sekarang"** → app memanggil `POST /api/payment/charge` (baru) → server:
   bikin/pakai-ulang baris `purchases` `pending`, lalu `POST /v2/charge` ke Midtrans dengan
   `X-Override-Notification: <origin>/api/payment/webhook`.
3. Server mengembalikan **data pembayaran** ke UI:
   `{ orderId, method, qrUrl?, qrString?, vaNumber?, billerCode?, billKey?, deeplink?, expiresAt }`.
4. UI menampilkan **kartu pembayaran** dalam tema app:
   - QRIS: `<img src=qrUrl>` + `qr_string` (tombol salin) + hitungan mundur.
   - VA: nomor VA besar + tombol salin + nama bank + hitungan mundur.
   - e-wallet: tombol deeplink (kalau ada) + instruksi.
5. UI **polling** `GET /api/payment/status?order_id=…` (baru; server yang menanyakan Midtrans
   `GET /v2/{order_id}/status` — JANGAN taruh server key di browser) tiap ±3–5 detik.
   - `pending` → tunggu; `settlement`/`capture` → sukses.
   - `expire`/`cancel`/`deny`/`failure` → tampilkan **jalan keluar jelas** (bikin tagihan baru), bukan layar buntu.
6. Sukses → pindah ke `/checkout/selesai` (halaman yang SUDAH ada) yang mem-poll `GET /api/subscription`
   sampai langganan benar-benar aktif. **Jangan** menampilkan "aktif" sebelum `/api/subscription` bilang aktif.

### 5.2 Server (kontrak baru yang direkomendasikan)
- `POST /api/payment/charge` — body `{ purpose, planId, period, amount, method }`
  - `requireUser()` dulu; guard harga kanon (**422** kalau nominal tidak cocok) — **sama seperti `/api/payment/create`**.
  - `method` ∈ metode yang memang aktif di akun Midtrans (kalau ragu: mulai QRIS + 1 VA).
  - Simpan/pakai-ulang baris `purchases` (order idempoten per user+paket+periode yang belum dibayar).
  - Panggil Core API `/v2/charge` lewat `lib/payments/midtrans.ts` (fungsi baru, mis. `createCoreCharge()`).
  - Balas data yang dibutuhkan UI saja (JANGAN bocorkan server key / raw provider payload).
- `GET /api/payment/status?order_id=…` — `requireUser()`; pastikan order itu **milik pemanggil**
  (baca `purchases` dengan token user → RLS yang menyaring). Balas status Midtrans + status baris DB.
- `lib/payments/midtrans.ts` ditambah: `createCoreCharge(intent, method)`, `fetchTransactionStatus(orderId)`,
  `midtransCoreEndpoint()`. **Pertahankan** `verifyMidtransSignature()` apa adanya (webhook memakainya).
- `lib/payments/types.ts` ditambah tipe hasil charge per metode (union bertag `method`).

### 5.3 Data & pemenuhan — JANGAN DIUBAH
Webhook + RPC tetap satu-satunya jalur yang boleh mengaktifkan langganan. Polling status di UI **hanya
untuk tampilan**; kalau Midtrans bilang `settlement` tapi webhook belum sampai, tampilkan status jujur
(**"pembayaran diterima, langganan sedang diaktifkan"**) dan terus poll `/api/subscription`.

## 6. ATURAN KERAS (keamanan & kejujuran) — TIDAK BOLEH DILANGGAR
1. **Nominal & paket SELALU ditentukan server** dari `lib/data/pricing.ts`. Body request TIDAK dipercaya.
2. **Identitas SELALU dari sesi cookie** (`requireUser()`) — jangan pernah dari `user_id` di body/query.
3. `MIDTRANS_SERVER_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `VAPID_PRIVATE_KEY`
   **hanya di server**. TIDAK pernah `NEXT_PUBLIC_*`, tidak pernah ke browser, tidak di-commit.
4. Verifikasi **SHA512** webhook wajib. Tanda tangan salah → **403**. Tanpa key → **503** (fail-closed).
5. RLS jangan dimatikan. Penulisan `user_subscriptions` hanya lewat RPC.
6. **Jangan pernah** menampilkan "sudah dibayar"/"langganan aktif" dari asumsi klien atau timer —
   hanya dari jawaban server yang membaca DB/Midtrans.
7. Jangan menambah UI/route yang "menyamar" sebagai pembayaran nyata (QR palsu, VA karangan, timer mock).

## 7. KREDENSIAL & ENV (semua yang dibutuhkan)

> 🔐 **Nilai rahasia SENGAJA TIDAK ditulis di dokumen ini.** (Saat pertama dicoba, GitHub
> **Push Protection menolak push-nya** karena memuat key asli — dan itu memang benar.)
> **Semua nilai ada di `.env.local`** di root repo (gitignored). Baca file itu langsung;
> jangan pernah menyalin nilainya ke repo, dokumen, atau chat.

### 7.1 Variabel aplikasi — nama + sifat (nilai: lihat `.env.local`)

| Variabel | Sifat | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | publik | `https://wmswtoyikvgzcvbgdceo.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publik | publishable key — aman di browser; yang melindungi = RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 **rahasia** | dipakai HANYA webhook; **mem-bypass RLS** |
| `DEEPSEEK_API_KEY` | 🔒 **rahasia** | server-only |
| `DEEPSEEK_BASE_URL` · `_MODEL_TEXT` · `_MODEL_VISION` | opsional | kosongkan = default (`https://api.deepseek.com` · `deepseek-flash`) |
| `MIDTRANS_MERCHANT_ID` | non-rahasia | `M130180776` |
| `MIDTRANS_SERVER_KEY` | 🔒 **rahasia** | **SANDBOX** walau formatnya `Mid-…` (lihat §9) |
| `MIDTRANS_CLIENT_KEY` | non-rahasia | tidak dipakai di alur Core API |
| `MIDTRANS_IS_PRODUCTION` | non-rahasia | **`0`** (sandbox) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | publik | Web Push |
| `VAPID_PRIVATE_KEY` | 🔒 **rahasia** | Web Push |
| `VAPID_SUBJECT` | non-rahasia | `mailto:halo@catetind.com` |

### 7.2 Hanya untuk kerja lokal (JANGAN ke repo / JANGAN di Vercel)

- **Supabase Personal Access Token** (`sbp_…`) → untuk `pnpm supabase:migrate` & Management API
  (`PATCH https://api.supabase.com/v1/projects/wmswtoyikvgzcvbgdceo/config/auth`, header
  `Authorization: Bearer <token>`, body JSON ditulis ke FILE lalu `curl.exe --data-binary "@file"`).
  **Nilainya minta ke user** — jangan ditulis ke repo/dokumen. Contoh pakai:
  `$env:SUPABASE_ACCESS_TOKEN='…'; pnpm supabase:migrate`
  ⚠️ User punya **DUA** token dari org berbeda. Pakai yang untuk project `wmswtoyikvgzcvbgdceo`
  (org `luygqolodvtmydqurnzf`). Yang satunya milik **ORG LAIN** (ISLI Ops / project
  `xkzggrtomtukyuqhcbie`) — **JANGAN dipakai**.
- **SMTP email produksi = Hostinger**: `smtp.hostinger.com:465`, user `halo@catetind.com`.
  Password mailbox ada di user — jangan minta dicetak ke chat, jangan tulis ke repo.
- **JANGAN set** `NEXT_PUBLIC_DEMO` (kalau `1`, data demo/seed muncul ke user).

### 7.3 Env di Vercel (Production + Preview + Development)
Isi mengikuti tabel §7.1 — **nilainya disalin dari `.env.local`**.
Di UI Vercel: `NEXT_PUBLIC_*` → Type **Config**; `SUPABASE_SERVICE_ROLE_KEY` / `DEEPSEEK_API_KEY` /
`MIDTRANS_SERVER_KEY` / `VAPID_PRIVATE_KEY` → Type **Secret**.
(Vercel MENOLAK `NEXT_PUBLIC_*` bertipe Secret → pesan
*"public framework prefix cannot use visibility: secret"*.)

## 8. CARA VERIFIKASI (wajib tiap selesai perubahan)

1. **Gerbang wajib:** `pnpm test` (baseline **991 lulus / 76 file**) · `pnpm exec tsc --noEmit` (exit 0) ·
   `pnpm build` (exit 0). ⚠️ `pnpm build` **dan** `pnpm dev` sama-sama memakai `.next` → **matikan dev dulu**
   (`taskkill /F /T /PID <pid>`), build, baru nyalakan lagi.
2. **Pemenuhan ke DB asli:** `node scripts/supabase/smoke-pembayaran.mjs` — harus menampilkan
   `already_processed:false` → langganan `expires_at` +365 hari → ulang = `already_processed:true` →
   anon **401**. Lalu bikin user uji + baris `pending` HIAPUS sendiri (skripnya sudah begitu).
3. **Webhook HTTP lokal** (tanpa Midtrans): hitung `sha512(order_id + status_code + gross_amount + serverKey)`
   dengan `node -e`, lalu POST ke `http://localhost:3000/api/payment/webhook`:
   tanda tangan salah → **403**, benar → **200 `settled:true`**, diulang → `alreadyProcessed:true`.
4. **Produksi:** `curl.exe -s -o NUL -w "%{http_code}" https://catetind.com/login` → **200**;
   webhook tanda tangan palsu → **403**; `GET /api/subscription` tanpa cookie → **401**.
5. **Bikin sesi asli TANPA membaca inbox** (hemat waktu):
   - `POST {SUPABASE_URL}/auth/v1/admin/generate_link` (header `apikey` + `Authorization: Bearer <service_role>`)
     body `{"type":"magiclink","email":"<email>"}` → respons memuat **`email_otp`** (kode 6 angka) & `hashed_token`.
   - `POST {SUPABASE_URL}/auth/v1/verify` (header `apikey: <anon>`) body `{"type":"email","email":"<email>","token":"<email_otp>"}`
     → dapat `access_token`, `refresh_token`, `user`.
   - Cookie sesi app = `sb-wmswtoyikvgzcvbgdceo-auth-token` = `base64-` + base64url(JSON.stringify({access_token, refresh_token, token_type:'bearer', expires_at, expires_in, user})).
   - Pakai cookie itu untuk memanggil `GET /api/subscription` / `POST /api/payment/*` atas nama user.
   - **Bersihkan** setelah selesai (hapus baris `purchases` uji + user uji kalau ada).
6. **Uji mata manusia** (yang tidak bisa diotomasi): buka `https://catetind.com/checkout` → pilih paket →
   bayar lewat metode yang baru → **selesaikan di `https://simulator.sandbox.midtrans.com/`** → balik ke
   `/checkout/selesai` → "Langgananmu aktif 🎉". Cek juga `Midtrans → Transactions → <trx> → Notification Log`.

## 9. GOTCHA (dari sesi sebelumnya — hemat waktu)
- **Vitest TIDAK memuat `.env.local`** → test jalan tanpa Supabase/Midtrans (fallback memory/no-network). Itu BENAR, bukan bug.
- **Kunci Midtrans sandbox formatnya `Mid-…`** (tanpa `SB-`) tapi **tetap sandbox**. Cek cepat
  (nilai key diambil dari `.env.local`, JANGAN ditulis di sini):
  `curl.exe -s -u "<MIDTRANS_SERVER_KEY>:" https://api.sandbox.midtrans.com/v2/TES/status` → 200;
  `https://api.midtrans.com/...` → **401**. `MIDTRANS_IS_PRODUCTION=0` WAJIB.
- **PowerShell: JSON inline untuk `curl.exe` sering rusak** (`bad_json`). Selalu tulis JSON ke file
  (`[IO.File]::WriteAllText`) lalu `curl.exe --data-binary "@file"`, hapus file setelahnya.
- **Menjalankan uji/long-running:** hentikan dev server dengan `taskkill /F /T /PID $proc.Id` (kalau tidak, port 3000 nyangkut).
- **`next-env.d.ts` berubah tiap build** — normal, abaikan.
- **`git status` bisa berisi banyak perubahan lama** yang BUKAN dari sesi ini — **JANGAN revert**.
- **Vercel**: env `NEXT_PUBLIC_*` TIDAK boleh bertipe "Secret" → pilih **Config**. Kalau ditolak, itu alasannya.
- **Supabase Management API** `PATCH /config/auth`: body ditulis ke file. Field berguna: `site_url`,
  `uri_allow_list`, `smtp_*`, `mailer_otp_length`, `rate_limit_email_sent`. Nilai `smtp_pass` dibaca balik
  sebagai hash panjang (bukan plaintext) — itu normal, bukan tanda salah set.
- **Cooldown OTP per email ~60 detik** → `429 over_email_send_rate_limit` ("…after NN seconds"). Tunggu, jangan panik.
- **Pertama kali ubah SMTP** bisa balas `500 "Error sending magic link email"` — **retry sekali** biasanya 200.
- **`order_id` Midtrans harus unik & tidak boleh dipakai ulang setelah dibayar** → pakai ulang order yang
  sama untuk percobaan bayar berulang (idempoten), jangan bikin order baru tiap klik.
- **Service worker (`public/sw.js`) mem-cache `/_next/static` dengan stale-while-revalidate** — aman di
  produksi (nama ber-hash), tapi di **dev** bisa menyajikan chunk basi ("module factory is not available").
  Solusinya di browser: DevTools → Application → Storage → **Clear site data**, lalu reload.
- **Resend sandbox** sudah TIDAK dipakai (dulu cuma bisa kirim ke pemilik akun). Jangan dihidupkan lagi.
- **Jangan hidupkan seed/demo**: jangan set `NEXT_PUBLIC_DEMO`. Di `NODE_ENV=test` seed memang tampil (banyak test bergantung) — itu sengaja.

## 10. LARANGAN
- JANGAN taruh kunci rahasia (`MIDTRANS_SERVER_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`,
  `VAPID_PRIVATE_KEY`, password SMTP) di kode klien, `NEXT_PUBLIC_*`, repo, atau `.env.example`
  (di `.env.example` hanya NAMA variabel, nilai kosong).
- JANGAN memanggil Midtrans dari browser (server key bocor). Semua panggilan provider lewat route server.
- JANGAN mematikan RLS / memercayai `user_id` dari body. Identitas SELALU dari sesi cookie (`requireUser`).
- JANGAN mengubah **harga & katalog** (3 tier × bulanan/tahunan; "seumur hidup"/Founding Member tidak dijual)
  tanpa izin user. Sumber harga tunggal: `lib/data/pricing.ts`.
- JANGAN menambah route/komponen yang "menyamar" sebagai pembayaran nyata (timer mock, token palsu, QR karangan).
- JANGAN reset database / jalankan migrasi destruktif tanpa izin user.
- JANGAN mencetak kredensial ke chat berulang-ulang; kalau perlu nilai, tunjuk ke `.env.local`.

## 11. LANGKAH PERTAMA YANG DIHARAPKAN DARI KAMU
1. **Konfirmasi pemahaman** ke user dalam 3–5 baris + sebutkan rencana kasar paket ini.
2. **Tanya SATU hal yang benar-benar nge-block** (jangan tanya yang bisa dijawab sendiri):
   metode bayar mana yang mau diaktifkan di **fase 1** (mis. rekomendasi: **QRIS + BCA VA + GoPay**).
   Sisanya bisa nyusul. (Kalau user tidak peduli → ambil rekomendasi itu dan lanjut.)
3. Baca dulu file: `lib/payments/midtrans.ts`, `lib/payments/types.ts`, `app/api/payment/create/route.ts`,
   `app/api/payment/webhook/route.ts`, `app/api/subscription/route.ts`, `lib/data/pricing.ts`,
   `components/catetind/payment-start-screen.tsx`, `payment-done-screen.tsx`.
4. **Smoke test provider DULU** sebelum membangun UI: `POST /v2/charge` QRIS nominal kecil (mis. Rp1.000)
   ke sandbox pakai `curl.exe` → pastikan bentuk balasan (`actions[].url`, `qr_string`) persis seperti §4.
   Kalau metode belum aktif di akun → laporkan jujur, jangan pura-pura bisa.
5. Bangun bertahap: (a) `lib/payments` + route charge/status + test, (b) UI metode & kartu pembayaran,
   (c) polling & status akhir, (d) hubungkan ke `/checkout/selesai`.
6. **Commit + push** tiap langkah selesai (user ingin perubahan tersimpan di GitHub `main`).
   Pesan commit bahasa Indonesia, ringkas, pola `feat(pembayaran): …`.
7. Lapor hasil apa adanya + bukti (kode HTTP / output command / isi Notification Log).

## 12. DEFINISI SELESAI (acceptance)
- [ ] User bisa bayar **tanpa meninggalkan domain `catetind.com`** — QRIS/VA/e-wallet tampil di dalam app.
- [ ] Nominal & paket **ditentukan server**; body klien tidak dipercaya (ada test-nya).
- [ ] Webhook + RPC tetap satu-satunya jalur aktivasi; **tanda tangan salah → 403**.
- [ ] Status pembayaran ter-update otomatis di halaman; `expire`/gagal punya **jalan keluar** (bukan layar buntu).
- [ ] Langganan baru muncul di `/api/subscription` setelah pembayaran sandbox sukses (dibuktikan, bukan diklaim).
- [ ] Alur lama (Snap redirect) dihapus **atau** dijaga jelas sebagai fallback — jangan dua-duanya setengah jalan;
      kalau dihapus, `midtransSnapEndpoint()`/`createSnapTransaction()` ikut dibersihkan beserta test-nya.
- [ ] `pnpm test` (≥991 lulus) · `pnpm exec tsc --noEmit` (0) · `pnpm build` (0) — semua hijau.
- [ ] Diterapkan di produksi: commit → push → deploy Vercel sukses → uji sekali lagi di `https://catetind.com`.
- [ ] Setelah semua beres: **ingatkan user untuk ROTATE kredensial** (Midtrans regenerate server+client key,
      Supabase rotate service role, DeepSeek key baru, VAPID baru) lalu update `.env.local` + Vercel.

> 📌 Catatan penutup: setelan Midtrans yang sudah dipasang user — **Settings → `Payment` → Payment
> notification URL = `https://catetind.com/api/payment/webhook`** — boleh dibiarkan; dengan
> `X-Override-Notification` di `/v2/charge`, app tidak lagi bergantung pada setelan itu.
