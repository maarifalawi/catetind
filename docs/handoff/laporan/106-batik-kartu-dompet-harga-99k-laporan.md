# Laporan · Corak Batik Semua Kartu Dompet + Harga 99K/129K

> **Tanggal:** 15 Nov 2026
> **Pemicu:** “Kembalikan dan sempurnakan tampilan corak batik pada seluruh kartu dompet… SAMA UBAH HARGA Paket Catet Aja JADI 99K, Paket Waras 129K. UBAH JANGAN CUMA DI TAMPILANNYA AJA YA. PAS PAYMENTNYA JUGA.”

## 1. Corak batik kembali (sesi 3 sempat mengosongkan SVG-nya)

| Berkas | Perubahan |
|---|---|
| `components/catetind/batik-cloth.tsx` | Ditulis ulang dari komentar desain aslinya: **kain kawung penuh** (empat kelopak + garis rangkap + mlinjon emas + isen-isen), **sabuk parang** di kaki kartu (mask linear), **cecek** (taburan titik), dan **tepi kain** (bingkai utuh + jahitan putus-putus). Dipakai hero `/wallet` (“Total Saldo”) & `/budget` (“Jatah Hari Ini”). |
| `components/catetind/wallet-card-face.tsx` | `WalletArtDefs` hidup lagi dengan empat motif asli (kawung, mega mendung, parang, rings) + tekstur geometris. `WalletFace` kembali memasang tiga lapisan: tekstur dasar, motif tema dompet (mask lebih luas 20%→86%), dan **sabuk parang** untuk semua jenis dompet. Ditambah `artIdOf()`: motif tak dikenal jatuh ke `kawung` (bukan lapisan kosong). |
| `components/catetind/wallet-card-stack.tsx` | Definisi `card-art-*` dipulihkan (bentuk batik asli), dua lapisan motif dipasang di **setiap kartu deck** (bukan hanya kartu depan), plus `artOf()` fallback. |
| `components/catetind/wallet-screen.tsx` | Merender `<WalletArtDefs />` (tanpa ini `url(#wallet-art-…)` tidak punya definisi) + hero memakai `<BatikCloth />`. |
| `components/catetind/wallet-detail-screen.tsx` | Merender `<WalletArtDefs />` untuk kartu hero detail. |
| `components/catetind/add-wallet-sheet.tsx` | Pratinjau kartu membawa definisi motifnya sendiri (sheet bisa dibuka dari Dashboard yang tidak punya `wallet-art-*`). |
| `components/catetind/wealth-net-worth-bar.tsx` | Dua lapis batik (kawung kiri atas, mega mendung kanan bawah) dipulihkan. |

Penanda resmi: `data-catetind-batik` pada setiap SVG motif, dan
`data-catetind-kartu-dompet` pada setiap muka kartu.

## 2. Permukaan kartu bersih (tanpa kode/nomor)

- `wallet-card-stack.tsx`: `sub` hanya berisi pemilik dompet; badge jaringan
  (VISA/DEBIT/E-WALLET) dihapus; nomor rekening masking tidak pernah dikirim
  ke muka kartu.
- `wallet-screen.tsx`, `wallet-detail-screen.tsx`, `add-wallet-sheet.tsx`:
  baris `•••• 1234` dicabut dari muka kartu. Nomor tetap bisa diisi di form
  identitas (data dompet), hanya tidak dicetak di kartu.
- `wallet-detail-screen.tsx`: subjudul header tidak lagi menampilkan nomor.
- `overview-panel.tsx`: subtitle donat hanya jaringan, bukan nomor.

## 3. Audit visual & unit test

- `scripts/qa/visual-audit.mjs`:
  - SVG di dalam `[data-catetind-batik]` **dikecualikan resmi** dari aturan
    “0 SVG hiasan” (dekorasi yang disengaja, bukan hiasan liar).
  - Pemeriksaan baru: setiap `[data-catetind-kartu-dompet]` wajib punya lapisan
    batik dan tidak boleh mencetak `•••• 1234`.
  - Deck diuji dengan **tiga dompet seed** (bank, e-wallet, tunai) → 5 kartu
    (agregat + 4) semuanya bercorak; daftar `/wallet` 4/4 bercorak; halaman
    detail ikut diperiksa. Tangkapan bukti: `qa-shots/batik-deck-dashboard.png`,
    `qa-shots/batik-wallet-cards.png`.
- `lib/data/wallet-card-batik.test.ts` (baru, 10 kasus): mengunci penanda batik,
  fallback motif, `<WalletArtDefs />` di semua pemakai `<WalletFace/>`,
  pengecualian audit, dan larangan mencetak `wallet.number`/`preview.number`.

## 4. Harga 99K / 129K — tampilan DAN pembayaran

- `lib/data/pricing.ts`: `catet-aja.lifetime = 99_000`, `waras.lifetime = 129_000`
  (dari harga uji Rp1/Rp2). Karena `priceFor()`/`isValidOfferAmount()` di file
  yang sama dipakai `app/api/payment/charge/route.ts`, nominal yang dikirim ke
  Midtrans otomatis 99.000/129.000; selisih upgrade = 30.000.
- Test disesuaikan: `pricing.test.ts`, `upgrade.test.ts`, `landing.test.ts`
  (JSON-LD `lowPrice`, notifikasi pembelian, selisih upgrade).

## 5. Bukti

```
npx next build                  → sukses (semua rute)
npx tsc --noEmit                → exit 0
npx vitest run                  → 152 berkas · 2070 test lulus
node scripts/qa/visual-audit.mjs→ 147/147 lulus · 0 gagal
```

Bukti harga ter-render (HTML produksi lokal): landing memuat `99.000` (4×) &
`129.000` (2×), `109.000` 0×; `/checkout?period=lifetime` memuat 99.000 & 129.000.
