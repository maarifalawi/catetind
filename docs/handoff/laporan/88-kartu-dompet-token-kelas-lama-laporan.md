# Laporan Paket 88 — Kartu Dompet Terang & Nominal Tak Terbaca: Kelas Warna Lama di Data

> **Tanggal:** 13 Okt 2026
> **Kanon kerja:** `docs/handoff/CONTEXT-WAJIB.md` (§3 warna, §10.3 validasi)
> **Keluhan pemilik produk:** “Perbaiki bagian dompetnya, jangan light gitu.
> nominalnya kurang keliatan.” (tangkapan layar: 3 kartu di `/wallet` — BCA,
> GoPay, Tunai — tampak terang/keputihan dengan `Rp …` putih yang nyaris hilang.)

## Akar masalah — bukan soal kontras CSS, tapi KELAS WARNA YANG HILANG

Muka kartu dompet **tidak** ditentukan komponen: kelas gradiennya disimpan di
DATABASE (`wallets.face`, `wallets.color`, `wallets.band_class`,
`wallets.face_class`). Tailwind hanya meng-generate kelas yang literalnya muncul
di source, jadi kelas yang datang dari data **tidak pernah ikut dipindai**.

Baris dompet di server masih memuat kelas **pra-tokenisasi palet**:

```text
face       : "bg-gradient-to-br from-[#52685c] via-[#45594e] to-[#161c19]"
color      : "bg-gradient-to-r from-[#c4c7af] to-[#45594e]"
face_class : "from-[#52685c] via-[#45594e] to-[#161c19]"
band_class : "from-[#e6e4c0] via-[#ffffff] to-[#e6e4c0]"
```

Kelas itu dulu hidup karena literalnya masih ada di source. Setelah paket
tokenisasi (`scripts/theme/tokenize-literal-colors.mjs`) menggantinya jadi
`from-forest-soft`, kelas lamanya **hilang dari CSS** — dibuktikan langsung di
bundel: `from-[#52685c]`, `to-[#161c19]`, `from-[#c4c7af]` = **0 kemunculan**,
sementara `from-forest-soft` = 1. Akibatnya `linear-gradient()` kehilangan
seluruh stop-nya: gradien tidak tergambar, dan yang tersisa hanya lapisan kaca +
noise (putih) di atas kanvas putih → **kartu terang, teks `text-cream` nyaris
tak terbaca**.

Dua keadaan lain berujung sama dan ikut ditutup: kolom warna yang memang **kosong**
(ditemukan satu baris begitu di server, lahir dari jalur yang tidak menyimpan
warna), dan hex yang tidak punya token.

Reproduksi terkontrol (render CSS nyata di browser headless): kartu dengan
`face` terisi = hijau gelap & nominal tajam; kartu dengan `face` kosong = **sama
persis dengan tangkapan layar user**. Jadi diagnosis ini terukur, bukan dugaan.

## Yang diperbaiki (6 berkas — 3 file baru + 1 migrasi baru, 3 file diedit)

| File | Perubahan |
|---|---|
| `lib/wallet-card-colors.ts` **(baru)** | Tabel `hex lama → token` (CERMIN dari tabel codemod tokenisasi) + `tokenizeCardClasses()` + `usableCardColor()`. Memuat dokumentasi kenapa warna kartu hidup di data & kenapa hex arbitrer tidak bisa digenerate. |
| `lib/wallets.ts` | `toWalletAccount()` / `toHomeWallet()` kini lewat `cardFaceOf`/`cardGlowOf`/`cardStopsOf`/`cardBandOf`: kelas lama di-tokenkan lebih dulu, lalu jatuh ke resep kanon `WALLET_SEED[0]` kalau tetap tidak bisa dipakai. `face` kosong tapi `faceClass` terisi → arah gradien ditambahkan di sini, jadi muka `/wallet` & deck Home tidak mungkin beda warna. |
| `app/api/wallets/store.ts` | `toSeed()` dulu menulis `color: ''` + `face: ''` — itulah jalan lahirnya baris tanpa gradien. Sekarang resepnya diambil dari `walletCardRecipe(index)`, sama seperti `addWalletAccount()` di store klien. |
| `supabase/migrations/20261013130000_catetind_token_kelas_kartu_dompet.sql` **(baru)** | Merapikan DATA yang sudah tersimpan: `face`/`color`/`band_class`/`face_class` → token. Idempotent (`where … like '%[#%'`), plus mengisi `face` dari `face_class` bila kosong. Fungsi bantunya dibuang lagi setelah dipakai. |
| `lib/wallet-card-colors.test.ts` **(baru, 11 kasus)** | Mengunci dua janji: kelas lama dipetakan ke token kanon, dan tidak ada jalur yang mengembalikan warna tak-terpakai. |
| `docs/handoff/CONTEXT-WAJIB.md` | §3 mendapat larangan ke-6 (menyimpan kelas warna hex arbitrer ke data) + jumlah test dikoreksi (1183/88). |

## Keputusan desain yang perlu diingat

1. **Penambal di sisi app, bukan hanya migrasi.** Migrasi hanya berjalan kalau
   `pnpm supabase:migrate` dijalankan; tanpa itu pemasangan yang sudah terlanjur
   ada tetap melihat kartu terang. Karena itu normalisasi dilakukan di lapis data
   app — dan sengaja di **`toWalletAccount`/`toHomeWallet`**, satu-satunya pintu
   yang dilewati SEMUA sumber dompet (baris Supabase **maupun** cache IndexedDB),
   jadi tidak ada jalur yang lolos.
2. **Token, bukan warna baru.** Pemetaannya memakai tabel yang SAMA dengan
   codemod tokenisasi, sehingga hasil perbaikan **identik** dengan resep kanon:
   BCA `from-forest-soft via-forest to-evergreen-deeper`, GoPay `from-mint …`,
   Tunai `from-hud-sage via-olive-deep to-soil`. Tidak ada hue baru, dan
   `pnpm theme:audit` tetap hijau (505 file).
3. **Jaring terakhir = kartu brand (Evergreen).** Kalau sebuah baris tidak punya
   warna sama sekali, kartunya memakai resep kanon pertama — pilihan yang stabil
   dan sama di Home, `/wallet`, maupun `/wallet/[id]` (resep berdasar indeks
   sengaja dihindari: indeks deck tersaring konteks, jadi dua halaman bisa
   berbeda warna untuk dompet yang sama).
4. **`glowClass` tidak disentuh.** Halo yang tidak tampil tidak menghilangkan
   nominal, dan kolomnya memang opsional (deck punya bawaannya sendiri).
5. **Bukan penebalan bayangan atau gaya baru.** Keluhan “jangan light gitu”
   dijawab dengan MENGEMBALIKAN gradien yang hilang — bukan dengan mengubah
   desain kartu. Setelah perbaikan, nominal putih kembali duduk di atas muka
   kartu gelap seperti yang selalu dimaksudkan.


## Validasi (output apa adanya)

```bash
pnpm exec vitest run lib/wallet-card-colors.test.ts  →  Test Files 1 passed · Tests 11 passed
pnpm exec tsc --noEmit                               →  exit 0 (tanpa output)
pnpm test                                            →  Test Files 88 passed · Tests 1183 passed
pnpm theme:audit                                     →  ✓ palet bersih — 505 file diperiksa
```

Pemeriksaan data (read-only, service role) sebelum perbaikan: 5 baris dompet,
satu di antaranya `face`/`color`/`band_class`/`face_class` **kosong**, sisanya
memuat kelas `from-[#…]` — itulah baris yang direparasi migrasi ini.

## Yang belum diverifikasi lewat mata

Tampilan sesungguhnya di browser dengan sesi user (halaman `/wallet` perlu
login). Yang sudah diverifikasi: CSS bundel (kelas lama benar-benar tidak ada),
kartu dirender di browser headless memakai kelas hasil tokenisasi (gelap,
nominal terbaca), dan test murni untuk kedua jalur (`legacy` & `kosong`).
Jalankan `pnpm dev`, buka `/wallet` — lalu `pnpm supabase:migrate` sekali supaya
kolom di database ikut bersih.

