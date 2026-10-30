# Midtrans Production — Konfigurasi, URL, dan Webhook

Dokumen ini adalah rujukan tunggal setelah merchant CatetInd **resmi di-ACC**
Midtrans. Semua nilai di bawah berasal dari kode yang ada di repo ini, bukan
dari ingatan.

- Key Name: `M130180776-DEFAULT-PAYMENT-CLIENT`
- Merchant ID: `M130180776`
- Mode: **Production** (`api.midtrans.com` — bukan `api.sandbox.midtrans.com`)

## 1. Environment variable untuk hosting / Vercel

Isi di **Project → Settings → Environment Variables**, scope **Production**
(ulangi juga di Preview kalau preview dipakai untuk uji bayar).

| Nama env | Nilai | Rahasia? |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | `Mid-server-…` (lihat `.env.local`/Vercel — **tidak** ditulis di repo) | 🔒 **ya** — jangan pernah `NEXT_PUBLIC_` |
| `MIDTRANS_CLIENT_KEY` | `Mid-client-…` (sama: baca dari dashboard, jangan ditulis di sini) | tidak (tidak dipakai alur Core API, tapi didokumentasikan) |
| `MIDTRANS_MERCHANT_ID` | `M130180776` | tidak |
| `MIDTRANS_IS_PRODUCTION` | `1` | tidak |

> ⚠️ Kunci server **tidak boleh** ditulis di dokumen ini. Dokumen ini ikut
> di-commit; kunci yang pernah tertulis di repo harus dianggap bocor dan
> dirotasi di Dashboard Midtrans (Settings → Access Keys → regenerate) sebelum
> go-live.

Wajib juga (sudah dipakai jalur pembayaran):

| Nama env | Nilai |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | kunci **service role** project Supabase — dipakai webhook & `/api/payment/status` untuk memenuhi pembelian |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wmswtoyikvgzcvbgdceo.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | kunci publishable Supabase |

Catatan penting:

- `MIDTRANS_IS_PRODUCTION` menerima `1`, `true`, `yes`, `on` (trim +
  case-insensitive). **Kosong / nilai lain = sandbox.** Jadi kalau variabel ini
  lupa diisi, tagihan akan dikirim ke sandbox dan ditolak provider (`401`).
- `MIDTRANS_SERVER_KEY` **hanya** dibaca di server (`lib/payments/midtrans.ts`).
  Jangan pernah memberinya awalan `NEXT_PUBLIC_`.
- `MIDTRANS_CLIENT_KEY` tidak dipakai alur Core API di app ini (tidak ada
  `window.snap.pay`), tetapi tetap didaftarkan supaya nilainya tercatat.

## 2. URL untuk Dashboard Midtrans

**Settings → Configuration** di dashboard **Production**:

| Field | Nilai |
|---|---|
| Payment Notification URL | `https://catetind.com/api/payment/webhook` |
| Finish Redirect URL | `https://catetind.com/checkout/selesai` |
| Unfinish Redirect URL | `https://catetind.com/checkout/selesai?status=pending` |
| Error Redirect URL | `https://catetind.com/checkout/selesai?status=error` |

Kenapa ketiganya menuju halaman yang sama: `/checkout/selesai` **tidak**
mempercayai query string sebagai bukti pembayaran. Statusnya dibaca dari
database (`GET /api/subscription`) dan dicocokkan ulang ke provider lewat
`POST /api/payment/reconcile`. `?status=error` hanya mengubah nada halaman
menjadi "pembayaran belum selesai".

Route yang benar-benar ada di repo:

| Route | Berkas | Peran |
|---|---|---|
| `POST /api/payment/webhook` | `app/api/payment/webhook/route.ts` | notifikasi Midtrans (signature SHA512) |
| `POST /api/payment/charge` | `app/api/payment/charge/route.ts` | membuat tagihan Core API |
| `GET /api/payment/status` | `app/api/payment/status/route.ts` | polling status + pemenuhan cadangan |
| `POST\|GET /api/payment/reconcile` | `app/api/payment/reconcile/route.ts` | "Cek lagi" di `/checkout/selesai` |
| `GET /checkout/selesai` | `app/checkout/selesai/page.tsx` | halaman kembali (finish/unfinish/error) |

Catatan: `/api/payment/charge` menitipkan URL notifikasi **per transaksi**
lewat header `X-Override-Notification`, dan ShopeePay menerima `callback_url`
ke `/checkout/selesai?order_id=…`. Jadi alur tetap benar walau dashboard belum
diisi — tetapi isian dashboard di atas tetap WAJIB untuk transaksi yang dibuat
dari kanal lain dan untuk audit Midtrans.

## 3. Verifikasi tanda tangan webhook

`lib/payments/midtrans.ts` → `verifyMidtransSignature()`:

```
sha512(order_id + status_code + gross_amount + serverKey)
```

- `serverKey` = `MIDTRANS_SERVER_KEY` (kunci **Production** di atas).
- Rumus sandbox dan production **identik**; yang berubah hanya kuncinya.
- Tanpa kunci → `false` (fail-closed). Webhook menjawab **503**.
- Tanda tangan tidak cocok → **403**, tidak ada baris DB yang disentuh.
- Perbandingan memakai `timingSafeEqual` (bukan `===`).
- Tanda tangan yang sah tetapi nominalnya beda dari `purchases.expected_amount`
  → **200** `{ ok:false, reason:'amount-mismatch' }`, pembelian TIDAK dipenuhi.

Pemenuhan langganan (`supabase/migrations/20261014120000_catetind_prepaid_30_hari.sql`
→ RPC `catetind_fulfill_purchase`):

| `billing_period` pembelian | Efek di `user_subscriptions` |
|---|---|
| `monthly` (30 hari) | `expires_at` = sisa hari + `30 days` (menumpuk), `is_lifetime = false` |
| `lifetime` | `is_lifetime = true`, `expires_at = NULL`, tidak pernah menurunkan rank |

- Hanya `transaction_status` **`settlement`** atau **`capture`** yang mengaktifkan.
- `capture` **wajib** `fraud_status = 'accept'`; `challenge`/`deny` tidak
  mengaktifkan apa pun (webhook membalas 200 `handled:false`).
- Idempoten per `order_id` (notifikasi ganda tidak memperpanjang dua kali).

## 4. Kanal pembayaran & Snap API (probe 30 Oktober 2026)

Merchant self-onboarded `M130180776` punya **Snap API aktif**, tetapi **Core API
`/v2/charge` ditolak** untuk semua kanal:

| Uji | Endpoint | Hasil |
|---|---|---|
| Core charge (8 kanal, Rp1.000) | `POST https://api.midtrans.com/v2/charge` | `402 Payment channel is not activated.` (semua) |
| Snap token (Rp1.000, `order_id` uji) | `POST https://app.midtrans.com/snap/v1/transactions` | **`201 { token, redirect_url }`** |
| Snap token dengan `order_id` yang SAMA | idem | **`201`** → order pending boleh di-token ulang |
| Snap token per `enabled_payments` | idem | `201` untuk `other_qris`, `gopay`, `bni_va`, `bri_va`, `echannel`, `permata_va` |

Token Snap **tidak** membuat invoice sampai halaman pembayaran dibuka user, jadi
probe di atas tidak meninggalkan tagihan menggantung (tidak ada yang perlu
dibatalkan). Catatan: token juga `201` untuk `bca_va` yang **tidak** aktif —
karena itu daftar kanal tetap mengikuti dashboard, bukan hasil token.

### Kanal yang dijual (`lib/payments/methods.ts`)

| Tombol di checkout | Dashboard Midtrans | `enabled_payments` Snap |
|---|---|---|
| QRIS | GoPay Dynamic QRIS | `['other_qris', 'gopay']` |
| GoPay | GoPay | `['gopay']` |
| BNI Virtual Account | BNI VA | `['bni_va']` |
| BRI Virtual Account | BRI VA | `['bri_va']` |
| Mandiri Bill Payment | Bank Mandiri | `['echannel']` |
| Permata Virtual Account | PermataBank VA | `['permata_va']` |

Tidak dijual: **BCA VA** & **ShopeePay** (tidak ada di *Active payment methods*).
CIMB Niaga VA aktif di dashboard tetapi belum punya metode di aplikasi ini.

### Alur di aplikasi

1. `/checkout/bayar` → pilih metode → `POST /api/payment/charge`.
2. Route menulis baris `purchases` **pending** atas nama user, lalu membuat token
   Snap (`enabled_payments` sesuai metode) dan membalas `redirectUrl` + `token`.
3. UI menampilkan **satu aksi utama** “Buka halaman pembayaran” (menuju
   `redirect_url`) + tombol “Cek status pembayaran”; status dipoll dari
   `/api/payment/status`.
4. Setelah bayar, `callbacks.finish` mengembalikan user ke
   `/checkout/selesai?order_id=…`; webhook Midtrans (payload & tanda tangan yang
   sama) memenuhi langganan lewat `catetind_fulfill_purchase`.

### Order pending dipakai ulang, bukan ditagih dua kali

Token Snap dibuat per percobaan. Kalau user menekan bayar lagi untuk niat yang
sama (nominal + kode teman sama), route membuat **token baru untuk `order_id`
yang sama** — baris `purchases` tetap satu, dan webhook tetap mengenali ordernya.
Kalau order itu ternyata sudah dibayar (webhook belum sempat mencatat), route
melaporkan `settled` dan **tidak** membuat tagihan kedua.

### Lifecycle status

`GET /v2/{order_id}/status` membalas **404** selama transaksi belum lahir di
Midtrans (token belum dibuka). Itu **bukan** error:

- `/api/payment/status` → `state: 'pending'` + catatan “belum dibuka di Midtrans”;
- `/api/payment/reconcile` → alasan `pending` (tidak ada klaim gagal/lunas);
- `settlement` / `capture` (`fraud_status = accept`) → dipenuhi lewat
  `catetind_fulfill_purchase`;
- `expire` / `cancel` / `deny` → status terminal dicatat lewat RPC yang sama.

## 5. Checklist setelah deploy

1. `MIDTRANS_IS_PRODUCTION=1` dan `MIDTRANS_SERVER_KEY` Production ada di env
   hosting (bukan hanya di `.env.local`).
2. Dashboard Midtrans Production → Configuration → keempat URL terisi.
3. Deploy ulang (variabel env baru hanya terbaca setelah redeploy).
4. Uji transaksi kecil (mis. QRIS Rp1.000) lewat aplikasi:
   - `/checkout/bayar` → pilih metode → “Buka halaman pembayaran” membuka
     halaman Snap pada metode itu (bukan daftar semua kanal);
   - setelah dibayar, `callbacks.finish` membawa user ke
     `/checkout/selesai?order_id=…`;
   - `POST /api/payment/webhook` menerima notifikasi dan membalas `ok: true`;
   - baris `purchases.status` berubah `settlement`;
   - `user_subscriptions.expires_at` bertambah 30 hari (atau `is_lifetime`
     true untuk pembelian lifetime).
5. Kalau webhook membalas `403`: kunci `MIDTRANS_SERVER_KEY` masih kunci
   sandbox / ada spasi tambahan di env.
6. Kalau “Buka halaman pembayaran” membalas halaman Snap yang kosong/kanal tidak
   tersedia: kanal itu belum aktif di *Payment Methods* dashboard, atau
   `enabled_payments`-nya salah — periksa `snapEnabledPayments()`.

## 6. Login reviewer

Jalur login khusus reviewer (`reviewer@catetind.com` + kode `123456`) sudah
**dihapus** dari kode. Lihat [`MIDTRANS-REVIEWER-LOGIN.md`](./MIDTRANS-REVIEWER-LOGIN.md).
