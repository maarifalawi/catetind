# Laporan Paket 97 — Integritas Kode Teman (Diskon 10% + Reward Pengundang)

> **Tanggal:** 19 Okt 2026
> **Pemicu:** “Kode dari teman (opsional) ini udah fix berfungsi apa ngga? terus potongannya berapa?”
> **Hasil:** fitur belum utuh saat ditinjau; sekarang diskon, relasi, dan reward dijaga server.

## Jawaban angka

Diskon teman = **10%** dari harga yang ditagih (`REFERRAL_DISCOUNT_PCT = 10`), dibulatkan ke rupiah utuh:

| Paket | 30 hari | Diskon | Lifetime | Diskon |
|---|---:|---:|---:|---:|
| Catet Aja | 49.000 → **44.100** | 4.900 | 109.000 → **98.100** | 10.900 |
| Waras | 79.000 → **71.100** | 7.900 | 129.000 → **116.100** | 12.900 |
| Sultan | 199.000 → **179.100** | 19.900 | 299.000 → **269.100** | 29.900 |

Reward pengundang = **601.500 token AI** (`REFERRAL_REWARD_TOKENS = AI_BASE_TOKENS_TOTAL`), diberikan webhook setelah pembelian paket lunas; top-up token tidak memicu reward.

## Akar masalah yang ditutup

1. **Diskon tampil hanya dari bentuk kode.** Tombol “Pakai” di `/checkout` memakai regex, bukan database. Kode karangan seperti `ABCD` langsung menampilkan diskon; user login kemudian melihat harga berubah di halaman bayar.
2. **Nominal diskon diterima tanpa kode.** `isValidOfferAmount()` menerima `applyReferralDiscount(base)` tanpa bukti kode; `/api/payment/charge` tidak menerima kode sama sekali.
3. **Pembayaran diskon tidak pernah dipenuhi.** `purchases.expected_amount` menyimpan harga PENUH, sedangkan Midtrans ditagih nominal DISKON. Webhook membandingkan keduanya → `amount_mismatch`, paket tidak aktif.
4. **Reward tidak pernah cair.** `record_referral` hanya menulis `referred_email`; `referred_user_id` tidak pernah diisi, padahal webhook mencari relasi lewat kolom itu.
5. **User lama tidak tercatat.** Relasi hanya ditulis saat registrasi (butuh email); user yang sudah punya akun dan memakai kode di halaman bayar tidak pernah menjadi referral.

## Aturan yang sekarang berlaku

- Diskon 10% **hanya sah** kalau kode ada di database, bukan kode milik akun sendiri, dan nominalnya persis harga diskon.
- `purchases.referral_code` menyimpan kode yang diverifikasi; `purchases.expected_amount` = nominal yang **benar-benar ditagih**.
- Relasi ditulis sebelum tagihan dibuat (`record_referral`), lalu `referred_user_id` dilengkapi RPC/trigger. **First referrer wins**: email yang sudah terhubung ke pengundang lain ditolak.
- Tagihan pending lama hanya dipakai ulang kalau nominal & kodenya sama. Tagihan beda dibatalkan; kalau ternyata sudah settled, tidak ada tagihan kedua.
- Webhook memberi reward hanya untuk pembelian paket yang lunas, idempoten per `order_id`/`referral_id`.

## Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `lib/data/pricing.ts` | `isValidOfferAmount(..., { referral })`: diskon hanya sah dengan bukti kode. Copy “Memeriksa kode…” & “tidak bisa memeriksa”. |
| `app/api/payment/charge/route.ts` | Terima `code`; validasi RPC `validate_referral_code`; tolak self-referral; catat relasi; simpan `referral_code`; `expected_amount = amount`; reuse pending hanya jika nominal+kode sama; lindungi order settled. |
| `app/api/referral/validate/route.ts` | `record_referral` yang mengembalikan `false` → 422 dengan pesan `conflict` (bukan sukses palsu). |
| `lib/data/referral.ts` | Copy `conflict` untuk kode yang valid tetapi tidak boleh dipakai. |
| `components/catetind/checkout-screen.tsx` | Tombol “Pakai” memanggil `/api/referral/validate`; kode dari URL diverifikasi saat mount; status memeriksa/error; CTA dikunci selama verifikasi; request lama tidak menimpa input baru. |
| `components/catetind/payment-start-screen.tsx` | Mengirim `code` yang sudah terverifikasi ke `/api/payment/charge`; reset diskon saat kode berubah. |
| `supabase/migrations/20261019120000_catetind_referral_integrity.sql` | `purchases.referral_code`; `record_referral` mengisi `referred_user_id`, menolak self/different referrer; trigger `auth.users`; backfill relasi lama. |
| Test: `pricing`, `charge`, `referral/validate`, `webhook` | +kasus diskon tanpa kode, kode palsu, self-referral, relasi gagal, `expected_amount` diskon, pending beda nominal, order settled, dan pembayaran diskon dipenuhi. |
| `docs/STATUS-HALAMAN.md` | Status Two-Sided Referral & §9.7 diperbarui; dashboard `/referral` tetap ditandai contoh. |

## Alur akhir

1. `/checkout` — kode diperiksa ke `/api/referral/validate`; diskon baru tampil setelah `verified: true`.
2. `/checkout/bayar` — kode diverifikasi lagi; total diskon dihitung dari `priceFor()`.
3. `POST /api/payment/charge` — kode diverifikasi ulang, relasi dicatat, `expected_amount` = nominal tagihan, `referral_code` disimpan.
4. Webhook Midtrans — nominal cocok → paket dipenuhi; relasi ditemukan lewat `referred_user_id` → reward 601.500 token ke pengundang (sekali per relasi/order).

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx vitest run` | **92 file / 1.367 test lulus** |
| `npx tsc --noEmit` | bersih |
| `npm run build` | sukses (44 halaman statis) |
| Migrasi ke project `wmswtoyikvgzcvbgdceo` | `20261019120000_catetind_referral_integrity.sql` **diterapkan** |
| Verifikasi objek DB | `purchases.referral_code`, index, `record_referral`, trigger `catetind_on_auth_user_link_referral` ada |
| Smoke test DB transaksional | **OK**: kode sah → relasi + `referred_user_id`; pengundang kedua ditolak; self-referral ditolak; trigger mengisi user id akun baru; **rollback** |
| RPC dengan anon key | **OK**: kode asli mengembalikan pemiliknya; kode palsu `null` |
| HTTP `POST /api/referral/validate` (dev server + DB asli) | **OK**: kode sah `verified:true, discountPct:10`; kode palsu **422** |
| `GET /checkout` | **OK**: field “Kode dari teman (opsional)” termuat |
| `npm run supabase:verify` | **Aman**: tidak ada data yang bisa dibaca tanpa sesi |
| Data produksi setelah uji | tidak berubah: 7 user · 3 kode · 0 referral · 3 purchases |

## Catatan deploy

- Migrasi **sudah diterapkan** ke project `wmswtoyikvgzcvbgdceo`. Untuk project lain/CI,
  jalankan `SUPABASE_ACCESS_TOKEN=… node scripts/supabase/apply-migrations.mjs` sebelum deploy kode.
- Tanpa kolom `purchases.referral_code`, insert pembelian akan ditolak dan charge membalas 502
  (fail-closed, bukan menagih tanpa catatan).
- Backfill mengisi `referred_user_id` untuk relasi lama yang emailnya sudah punya akun; reward
  berikutnya untuk relasi itu bisa langsung dikaitkan webhook.
- Pembayaran Midtrans **tidak** di-charge pada verifikasi ini (tidak membuat tagihan nyata);
  yang diuji adalah aturan harga/relasi/reward + route validasi + webhook lewat unit test.
- Data kode & riwayat di halaman `/referral` masih MOCK (`REFERRAL_IS_SAMPLE`) — bukan bagian paket ini.
