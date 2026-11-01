# Dashboard Admin — Founder Command Center

Halaman: `/admin` · API: `/api/admin/{action,sync,export}`

## Siapa yang boleh masuk

| Pemeriksaan | Di mana | Perilaku kalau gagal |
|---|---|---|
| Sesi Supabase sah (`auth.getUser()`) | `middleware.ts` + `lib/admin/guard.ts` | tanpa sesi → `/login?next=/admin`; route API → `401` |
| Email ada di daftar admin | `lib/admin/access.ts` | user biasa → redirect `/app`; route API → `403` |
| Kunci peran server tersedia | `lib/admin/server.ts` | halaman tetap dirender dengan pesan jujur, data tidak dibaca |

Daftar admin:

1. `shiimaify@gmail.com` — **selalu** boleh (konstanta `OWNER_EMAIL`).
2. `ADMIN_EMAILS` — daftar dipisah koma (server-only).
3. `OWNER_EMAILS` — alias, digabung.
4. `OWNER_TEST_EMAIL` — akun uji pemilik ikut dihitung.

Yang sampai ke browser hanya **boolean** `isAdmin` dari `/api/session`. Daftar
email, kunci peran server, dan seluruh query lintas-user tetap di server.

## Data yang dibaca (dan yang TIDAK)

Sumber kolom: `lib/admin/columns.ts`. Yang dibaca hanya:

- identitas dari `auth.users` + `profiles.nickname`;
- **hitungan** aktivitas: `wallets`, `ledger_rows` (`user_id, ai_generated` saja),
  `bills`, `goals`, `joint_members`, `debts`, `investments`, `physical_assets`,
  `ai_usage`, `ai_addons`, `referrals`, `user_settings.onboarding`;
- langganan: `user_subscriptions`;
- pembayaran: `purchases` (nominal pembelian, status, metode).

**Tidak pernah dibaca:** deskripsi/catatan transaksi, kategori, nama dompet,
saldo dompet, atau nominal transaksi pribadi user. Test
`lib/admin/columns.test.ts` mengunci janji ini.

## Sumber data: live, bukan seed

Jalur admin tidak punya data contoh sama sekali. `loadAdminSnapshot()` hanya
membaca tabel nyata di Supabase; kalau kunci peran server tidak ada, halaman
menampilkan pesan kesalahan dan **tidak** mengarang angka. Akun yang muncul
adalah isi `auth.users` apa adanya — termasuk akun uji yang memang terdaftar di
project itu. Dashboard tidak pernah menyembunyikan atau menambahkan akun.

Sinkronisasi tindakan manual ke seluruh aplikasi:

| Aksi admin | Ditulis ke | Langsung dibaca oleh |
|---|---|---|
| Beri/ubah paket, perpanjang, perbaiki | `user_subscriptions` | `middleware.ts`, `readCallerPlan()` → `/api/subscription`, panel Billing, gerbang fitur |
| Bonus token AI | `ai_addons` | `readAiUsage()` → meter & kartu kuota AI |
| Reset pemakaian AI | `ai_usage` (bulan berjalan) | meter AI (`lib/ai-usage-store.ts`) |
| Cek & sinkron Midtrans | `purchases` + RPC `catetind_fulfill_purchase` | webhook/rekonsiliasi & `user_subscriptions` |

Tidak ada tabel salinan atau cache: halaman app membaca tabel yang sama pada
request berikutnya. Dashboard sendiri `force-dynamic` (tanpa cache), jadi
memuat ulang halaman selalu membaca angka terbaru.

## Isi halaman

- **Ringkasan** — pertumbuhan & keaktifan user, pendapatan bersih (paket vs kuota
  AI, hari ini/bulan ini/sepanjang waktu, rata-rata transaksi, persentase akun
  berbayar), corong 5 tahap + kebocoran terbesar, peta pemakaian 8 fitur,
  rincian paket, radar masa aktif.
- **User** — pencarian nama/email, filter (semua, berbayar, tanpa paket, belum
  onboarding, belum ada transaksi, paket mau habis), lalu panel tindakan:
  1. beri/ubah paket (30 hari atau selamanya);
  2. perpanjang 7/30/90 hari (menumpuk dari sisa masa aktif);
  3. bonus token AI / reset pemakaian bulan berjalan;
  4. sinkronkan hak akses dari pembelian lunas.
- **Langganan** — HANYA tiga paket berbayar yang ada di sistem (Catet Aja,
  Waras, Sultan) dipisah bulanan vs selamanya; akun tanpa langganan dihitung
  terpisah sebagai "belum berlangganan" (tidak ada tier "Gratis"), plus radar
  akan habis (7 hari) & baru habis (14 hari).
- **Pembayaran** — ringkasan metode (hanya transaksi lunas), radar checkout
  menggantung, detektor salah sinkron (dengan perbaikan satu klik), riwayat
  transaksi + tombol **Cek Midtrans** per baris.

## Titik integrasi

| Kebutuhan | Fungsi yang dipakai ulang |
|---|---|
| Status paket | `isSubscriptionActive()` (`lib/subscription/app-access.ts`) |
| Nama paket / peringkat | `normalizeTier()`, `planById()`, `rankOf()` |
| Harga & label | `lib/data/pricing.ts` (tidak ada angka baru) |
| Cek status Midtrans | `reconcileOrder()` (`lib/subscription/reconcile.ts`) |
| Pemenuhan pembayaran | RPC `catetind_fulfill_purchase` (sama dengan webhook) |
| Bulan pemakaian AI | `monthKeyOf()` (`lib/ai-quota.ts`) |

Batas baca: `MAX_ROWS = 20.000` per tabel dan 20.000 akun. Bila tersentuh,
layar menyebut bahwa angka bisa terpotong (`limits.usersTruncated`) — bukan
menampilkan total yang terlihat lengkap.

## Verifikasi

```bash
npx tsc --noEmit
npx vitest run
node scripts/theme/audit-palette.mjs
npx next build
```

Unit test yang menjaga halaman ini:

- `lib/admin/access.test.ts` — daftar admin, env, penolakan email tiruan.
- `lib/admin/guard.test.ts` — tanpa sesi `401`, user biasa `403`, pemilik lolos.
- `lib/admin/snapshot.test.ts` — pendapatan, corong, fitur, radar, mismatch,
  privasi baris user.
- `lib/admin/actions.test.ts` — validasi & perhitungan aksi manual.
- `lib/admin/filters.test.ts` — chip filter & pencarian.
- `lib/admin/csv.test.ts` — escaping CSV & anti-formula.
- `lib/admin/columns.test.ts` — pagar kolom privat.
