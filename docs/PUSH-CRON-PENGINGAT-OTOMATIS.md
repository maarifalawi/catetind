# Pengingat Otomatis (Web Push + Vercel Cron)

Sistem notifikasi terjadwal CatetInd: tagihan jatuh tempo, sapaan jatah jajan
pagi, dan rekap santai Minggu malam. Dokumen ini menjelaskan apa yang berjalan,
di mana kodenya, dan apa yang harus disiapkan saat deploy.

## 1. Peta berkas

| Berkas | Perannya |
|---|---|
| `lib/push/plan.ts` | Otak perencanaan (murni, tanpa I/O): WIB, jendela H-3…H, prioritas pesan, anti-spam 1/hari, copy pesan |
| `lib/push/deliver.ts` | Kirim paralel berkelompok + pembersihan endpoint mati (404/410) + validasi `url` internal |
| `lib/push/cron.ts` | Mesin cron: baca `push_subscriptions`/`bills`/`user_settings`, kirim, cap stempel, catat riwayat |
| `lib/push/auth.ts` | Otorisasi endpoint cron (`CRON_SECRET`, constant-time, fail-closed) |
| `lib/push/types.ts` | Tipe laporan yang dipakai server **dan** kartu admin |
| `app/api/cron/reminders/route.ts` | Endpoint yang dipanggil Vercel Cron (GET/POST) |
| `app/api/admin/push-cron/route.ts` | Kontrol manual dari `/admin` (sesi admin, bukan `CRON_SECRET`) |
| `components/admin/admin-push-card.tsx` | Kartu "Pengingat push": Jalankan sekarang · Mode simulasi · Hasil terakhir |
| `public/sw.js` | `push` + `notificationclick`: tampilkan notifikasi, arahkan ke `/bills`, `/app`, atau `/history` |
| `vercel.json` | Jadwal UTC |
| `supabase/migrations/20261106120000_catetind_push_cron.sql` | `user_settings.push_state` + tabel `push_cron_runs` |

## 2. Jadwal (UTC → WIB)

| Cron (UTC) | WIB | Isi |
|---|---|---|
| `0 1 * * *` | 08:00 setiap hari | Tagihan jatuh tempo, atau sapaan jatah jajan bila tidak ada tagihan mendesak |
| `0 13 * * 0` | 20:00 setiap Minggu | Rekap santai penutup pekan |

Konversi dilakukan eksplisit di `lib/push/plan.ts` (`WIB_OFFSET_MINUTES = 420`),
bukan mengandalkan zona waktu server — Vercel berjalan di UTC.

## 3. Aturan produk yang dikunci

1. **Prioritas**: `bills` → `daily` → `weekly`. Tagihan mendesak selalu menang,
   termasuk pada Minggu malam (rekap digantikan peringatan tagihan).
2. **Anti-spam**: maksimal **satu** notifikasi per user per hari kalender WIB.
   Stempel `user_settings.push_state.lastSentAt/lastDay` ditulis hanya untuk user
   yang minimal satu perangkatnya benar-benar menerima pesan.
3. **Minggu**: jadwal pagi melewati user yang menyalakan rekap mingguan supaya
   slot harinya dipakai rekap 20:00 (kalau tidak, aturan 1/hari membuang rekap).
4. **Saklar `notif_prefs`**: `tagihan-jatuh-tempo`, `reminder-harian`, dan
   `laporan-mingguan` dibaca dari jsonb akun (default menyala, id asing diabaikan).
5. **Langganan mati**: respons 404/410 dari layanan push → baris
   `push_subscriptions` dihapus otomatis. Galat lain hanya dilaporkan.
6. **Isi notifikasi**: ikon `/icons/icon-192.png`, `tag` per jenis
   (`catetind-bills` / `catetind-daily` / `catetind-weekly`) sehingga pesan sejenis
   saling memperbarui, dan `url` wajib path internal.

## 4. Yang wajib disiapkan saat deploy

1. **`CRON_SECRET`** di Environment Variables Vercel (produksi + preview).
   Vercel mengirim `Authorization: Bearer <CRON_SECRET>` otomatis. Kosong =
   endpoint menjawab **401** (fail-closed) — jangan biarkan terbuka.
2. **VAPID**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT`. Kunci di `.env.local` repo ini adalah kunci demo — rotasi
   sebelum produksi.
3. **`SUPABASE_SERVICE_ROLE_KEY`**: dipakai cron untuk membaca langganan lintas
   user (RLS `user_id = auth.uid()` menutup jalur ini untuk sesi biasa).
4. **Migrasi**: `pnpm supabase:migrate` (butuh `SUPABASE_ACCESS_TOKEN`) agar
   kolom `push_state` dan tabel `push_cron_runs` ada. Tanpa itu, cron tetap
   berjalan tetapi riwayat eksekusi tidak tercatat (kartu admin menampilkan
   pesan galatnya, bukan "belum pernah jalan").

## 5. Cara menguji

Simulasi lokal (tidak menembakkan push):

```bash
curl -X POST "http://localhost:3000/api/cron/reminders?mode=morning&dryRun=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Uji nyata ke perangkat sendiri: buka `/settings/notifications` → aktifkan push →
tekan **Kirim Push Test** (memastikan langganan tersimpan), lalu di `/admin` →
kartu **Pengingat push** → **Mode simulasi** dulu, baru **Jalankan sekarang**.

## 6. Batas yang disebut apa adanya

- Tabel `bills` **tidak** menyimpan status "sudah dibayar bulan ini" (status itu
  diturunkan dari ledger di perangkat), jadi filter "belum dibayar" memakai kolom
  `active`. Tagihan yang sudah dibayar lewat app masih bisa ikut diingatkan
  selama barisnya aktif dan jatuh tempo di jendela H-3…H.
- Notifikasi hanya sampai bila perangkat sudah subscribe push dan izin browser
  diberikan; iOS mensyaratkan install ke Home Screen lebih dulu.
- Satu eksekusi dibatasi 500 kiriman & 2000 langganan; bila batas tersentuh,
  laporan menyebutkannya (`note`) — bukan diam-diam mengirim sebagian.
