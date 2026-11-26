# Laporan 110 — Performa Riwayat & Budget + Pembayaran yang Tidak Pernah Terbuka

> **Tanggal:** 26 Nov 2026
> **Pemicu (kutipan pemilik produk):** *“pas di dashboard abis login, tab riwayat & insight ada delay beberapa detik. Sama di bagian budget & target nabung juga runtime nya ga secepet bagian lain”* dan *“pas bagian user mau mesen, itu tab webnya bolak balik doang, gamasuk ke payment gate.”*

## 1. Ringkasan

Dua masalah, dua akar yang berbeda:

1. **Pembayaran tidak pernah terbuka** karena `/checkout/bayar` me-redirect user yang **sudah punya paket** kembali ke `/checkout`, sementara `/checkout` tidak tahu paket apa yang dimiliki dan CTA-nya selalu “Daftar & mulai”. Klik berulang = URL bolak-balik tanpa pernah sampai ke halaman bayar.
2. **Riwayat & Budget terasa lambat** karena store uang menahan data cache sampai seluruh bacaan server selesai, dan kedua halaman mengerjakan/men-mount komponen berat yang tidak terlihat (modal rekap, modal bulanan, lima sheet Budget).

Keduanya diperbaiki tanpa mengubah integrasi Midtrans/Snap dan tanpa mengubah aturan gerbang paket.

## 2. Pembayaran — akar & perbaikan

### Akar
- `app/(public)/checkout/bayar/page.tsx` (sebelum): `if (ownedIsLifetime && rankOf(ownedPlanId) >= plan.rank) redirect('/checkout')`.
- `app/(public)/checkout/page.tsx` (sebelum): hanya meneruskan `initialPlanId` + `initialReferralCode`; paket yang dimiliki tidak pernah dibaca oleh layar.
- `components/catetind/checkout-screen.tsx` (sebelum): harga selalu harga penuh (`offerPrice` tanpa konteks), CTA selalu `CHECKOUT_COPY.cta` = “Daftar & mulai”, dan `handleStart()` selalu `router.push('/checkout/bayar…')` untuk user yang sudah masuk.
- Copy `CHECKOUT_COPY.currentPlanNote` sudah ada tetapi tidak pernah dipakai — tanda keadaan “sudah punya paket” memang belum tersambung.

Untuk akun dengan paket aktif (akun pemilik/reviewer/pelanggan), alurnya menjadi:
`/checkout → klik → /checkout/bayar → 307 /checkout → klik → …`

### Perbaikan
| Berkas | Perubahan |
|---|---|
| `lib/data/pricing.ts` | Helper `planOfferState()` (buy/upgrade/owned) + `isTopTier()`; copy CTA per keadaan, catatan upgrade, panel “sudah di paket tertinggi”. |
| `app/(public)/checkout/page.tsx` | Meneruskan `signedIn`, `ownedPlanId`, `ownedIsLifetime` ke layar. Rekonsiliasi pembayaran **tidak lagi menahan render** kecuali di jalur pemulihan `?lanjut=` (dijalankan `after()` setelah response). |
| `components/catetind/checkout-screen.tsx` | Harga per kartu & ringkasan memakai `priceFor()` (selisih upgrade). Default pilihan = paket satu tingkat di atas paket yang dimiliki. CTA: “Lanjut ke pembayaran” / “Upgrade — bayar {selisih}” / “Buka dashboard”. Tombol sibuk mencegah klik berulang. |
| `app/(public)/checkout/bayar/page.tsx` | `redirect('/checkout')` untuk paket yang sudah dimiliki **dihapus**; halaman merender keadaan “Paket ini sudah kamu miliki” / “Kamu sudah di paket tertinggi”, dengan CTA Dashboard + “Lihat paket upgrade”. |
| `components/catetind/payment-start-screen.tsx` | Menerima `signedIn` (tanpa round-trip `/api/session`), `alreadyOwned`, `topOwned`. Ringkasan menulis “Sudah aktif” (bukan “Rp 0”); tidak ada tombol bayar untuk paket yang sudah dimiliki. |

**Yang tidak berubah:** `/api/payment/charge`, `createSnapCharge`, embed `snap.js`, webhook, dan verifikasi nominal. Aturan gerbang paket di middleware juga tidak disentuh.

## 3. Performa — akar & perbaikan

### Akar
- `lib/money/store.ts` `hydrateMoneyStore()`: cache IndexedDB dibaca, tetapi `commitSafely()` baru dipanggil **setelah** `readRemoteMoney()` selesai (wallets + ledger dipaginasi 500 baris **berurutan** + saldo + migrasi). Selama itu halaman menampilkan keadaan kosong/seed.
- `components/catetind/history-screen.tsx`: `WeeklyRecapModal` selalu di-mount (menghitung `useWeeklyRecap()` walau tertutup), `MonthlyReviewModal` selalu di-mount (DOM penuh + `useLiveFunds()` padahal halaman ini tidak menampilkan celengan), recap bulan lalu dihitung ulang setiap store berubah, dan skor/insight/heatmap dikerjakan walau tab-nya tersembunyi. `filtered` dikelompokkan tiga kali.
- `components/catetind/budget-screen.tsx`: lima sheet berat (tambah budget, celengan, setor, sapu bersih, review) ikut bundel & hidrasi awal walau hanya dibuka lewat aksi user.
- Tidak ada kerangka saat data dimuat → “0 catatan” palsu lalu berubah.

### Perbaikan
| Berkas | Perubahan |
|---|---|
| `lib/money/store.ts` | **Cache-first (stale-while-revalidate):** snapshot perangkat langsung di-`commit` setelah dibaca, lalu server tetap menang saat jawabannya tiba. Tidak ada lagi layar kosong menunggu seluruh bacaan jaringan. |
| `lib/supabase/money-remote.ts` | Halaman pertama ledger (sekaligus `count`) diambil sendiri, sisa halaman diunduh **paralel** (4 sekaligus). Kolom dibaca eksplisit (bukan `select('*')`). Ada jalur cadangan berurutan bila backend tidak mengirim `count`. |
| `components/catetind/history-screen.tsx` | Modal rekap, modal bulanan, detail/aksi/edit transaksi dimuat `next/dynamic` dan baru di-mount saat dibutuhkan (latch supaya animasi tutup tetap utuh); chunk dipanaskan setelah idle. Skor/insight hanya dihitung di tab Insight; heatmap hanya di tab Riwayat. Pencarian memakai `useDeferredValue`; pengelompokan daftar dilakukan sekali. Kerangka tampil selama snapshot belum siap. |
| `hooks/use-monthly-review.ts` | Opsi `recapOnDemand`: `/history` tidak menghitung recap bulan lalu sebelum modalnya dibuka (Home tetap seperti semula). |
| `components/catetind/budget-screen.tsx` | Lima sheet dimuat `next/dynamic` + mount-tertunda saat dibuka; kerangka tampil selama data uang dimuat. |
| `components/catetind/route-warmup.tsx` (baru) | `router.prefetch('/history')` & `/budget` setelah halaman idle — link di drawer mobile tidak sempat di-prefetch sebelum ditekan. Dipasang di `app/(app)/layout.tsx`. |

## 4. Bukti validasi

| Perintah | Hasil |
|---|---|
| `pnpm exec tsc --noEmit` | bersih |
| `pnpm test` | **2130/2130 lulus** (155 berkas) |
| `pnpm build` | lolos (Next 16.3.3, Turbopack) |
| `node scripts/qa/plan-state.mjs` (baru) | **16/16 lulus** — termasuk “halaman bayar TETAP di /checkout/bayar”, `framenavigated=2` (tanpa loop), keadaan paket dimiliki, upgrade Rp30.000, CTA “Lihat paket upgrade” → selisih Sultan Rp170.000, dan tanpa gulir horizontal di 390 px |
| `node scripts/qa/snap-flow.mjs` | **14/14 lulus** — QRIS → `/api/payment/charge` → iframe Snap tetap di `/checkout/bayar` (HP & desktop) |
| `node scripts/qa/perf-tabs.mjs` (baru) | **14/14 lulus** — akun 620 baris: Riwayat **434–892 ms**, Budget **383–876 ms** (beberapa run, mesin lokal); dialog berat `0` saat halaman dibuka; kerangka tampil lalu diganti isi pada cache kosong; sheet “Tambah batas kategori” & modal Rekap Mingguan (dinamis) tetap terbuka saat diklik; tab Insight tetap hidup |
| `node scripts/qa/navigation.mjs` | **29/29 lulus** |
| `node scripts/tools/audit-copy.mjs` | 0 kalimat terlarang |
| `pnpm theme:audit` / `pnpm theme:contrast` | palet & kontras bersih |

Skrip QA baru terdaftar di `package.json`: `qa:plan` dan `qa:perf`.

## 5. Batas jujur

- Angka 434–892 ms (Riwayat) dan 383–876 ms (Budget) diukur di **mesin lokal** terhadap `next start` (production build), tanpa throttling jaringan, pada beberapa run. Itu bukan janji Lighthouse; yang dikunci adalah **perilaku** (kerangka tampil lalu diganti isi; modal tidak ter-mount saat halaman dibuka; tidak ada navigasi berulang) dan besaran yang wajar.
- Unit test urutan hidrasi cache→server tidak ditambahkan karena repo ini tidak memasang DOM environment (jsdom/happy-dom); perilakunya diverifikasi lewat QA Playwright dengan akun & data nyata.
- Rekonsiliasi pembayaran yang tidak lagi menunggu render tetap berjalan (via `after()`), jadi kasus “sudah bayar tapi webhook telat” tetap pulih — tetapi pemulihan **sebelum render** sekarang hanya di jalur `?lanjut=` (jalur yang dipasang middleware).
- Optimasi middleware (dua panggilan jaringan per navigasi: verifikasi sesi + cek paket) **tidak** dikerjakan di paket ini. Jika setelah perubahan ini navigasi masih terasa lambat di jaringan nyata, langkah berikutnya adalah cache cek paket ber-TTL pendek atau verifikasi JWT lokal — keduanya menyentuh gerbang keamanan, jadi harus diputuskan terpisah.

