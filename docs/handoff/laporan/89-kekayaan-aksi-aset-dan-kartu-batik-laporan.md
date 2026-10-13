# Laporan Paket 89 — Aksi Aset Investasi yang Terlihat + Kartu "Kekayaan Bersih" Bercorak Batik

> **Tanggal:** 13 Okt 2026
> **Kanon kerja:** `docs/handoff/CONTEXT-WAJIB.md` (§2 struktur, §3 warna, §7 no dead affordance, §9 DoD)
> **Keluhan pemilik produk:** “Di Kekayaan & Hutang, gua ngga bisa hapus list
> investasi.. ngga ada tombol edit atau hapus. terus bagian Kekayaan Bersih, itu
> dibuat lebih modern dan minimalist lagi coba. pake corak batik kartunya.”

## Akar masalah — aksi Edit/Hapus aset cuma ada di belakang GESTUR

`AssetCard` di `wealth-investasi.tsx` menyimpan seluruh aksinya di lapisan
`<div>` yang tertutup kartu; ia baru terbuka kalau kartu **digeser kiri**
(`dx`, ambang snap 44 px, lebar tersingkap 168 px). Tidak ada satu pun tombol
yang terlihat sebelum user mencoba menggeser — dan di desktop (mouse) gesturnya
praktis mustahil ditemukan. Di kartu HUTANG, cara yang sama sudah dipensiunkan
di paket 61.1 (`DebtActionRow`: aksi selalu terlihat); kartu ASET ketinggalan,
jadi satu halaman punya dua bahasa aksi — dan user menyimpulkan asetnya tidak
bisa dihapus.

Efek samping yang ikut hilang: karena kartu memegang pointer
(`setPointerCapture`), klik pada tombol DI DALAM kartu (banner “Update Manual”,
pill “Update Harga”) pernah di-retarget browser dan butuh penanda `data-no-drag`.
Baris aksi yang baru membuat seluruh tambalan itu tidak perlu lagi.

## Yang diperbaiki (3 berkas)

| File | Perubahan |
|---|---|
| `components/catetind/wealth-investasi.tsx` | **`AssetActionRow` (baru)** — baris `[✏️ Edit] [🗑️ Hapus]` yang SELALU terlihat di bawah setiap kartu aset: tinggi 40 px (zona jempol), `flex-1`, berLABEL teks, `aria-label` menyebut nama aset, warna & bentuk sama dengan `DebtActionRow` (amber = mengubah, terracotta = membuang). Seluruh mesin geser dihapus: state `dx`/`dragging`, `startX`, `moved`, `clamp`, `onPointerDown/Move/Up/Cancel`, `settle`, `handleClick`, lapisan aksi `absolute`, `animate={{ x: dx }}`, `style={{ touchAction }}`, kelas `touch-pan-y`, dan dua `data-no-drag`. Kartu kini `<motion.button onClick={onToggle}>` biasa: tap = riwayat beli/jual. |
| `components/catetind/wealth-net-worth-bar.tsx` | Kartu hero dirombak minimalis: gradien Evergreen berlapis (`forest-soft → forest → evergreen-deep`) + **corak batik dua lapis** (kawung & mega mendung, resep identik `brand-panel.tsx`/`wallet-card-face.tsx`, id diprefiks `networth-batik-`), tekstur titik, hairline bercahaya di bibir atas. Bar rasio ditipiskan (2,5 px → 1,5 px) dan dipisah hairline dari angka; legenda pindah ke satu **strip kaca** dua kolom dengan pembatas hairline vertikal. Nominal turun sedikit (2,9 rem → 2,75 rem) supaya proporsinya tetap seimbang di desktop. Baru: satu baris jujur `NET_WORTH_COPY.empty` saat aset & hutang dua-duanya nol. |
| `lib/data/wealth.ts` | `NET_WORTH_COPY` (baru): `aria`, `label`, `asset`, `debt`, `empty`. Label & legenda kartu hero sebelumnya literal di JSX; sekarang satu tempat (kanon §2: copy user-facing dari `lib/data/*`). |

## Keputusan desain yang perlu diingat

1. **Aksi terlihat > gestur tersembunyi.** Sama seperti keputusan paket 61.1 di
   kartu hutang: kemampuan yang hanya muncul setelah user "menebak" gestur
   dianggap tidak ada. Karena baris aksi menggantikan geseran, gestur aset
   dihapus sekaligus (opsi (b) yang dicatat di laporan 61 §7.4) — bukan
   dipertahankan sebagai jalur kedua yang sudah tidak berguna.
2. **Baris aksi di LUAR `<button>` kartu.** Kalau ia diletakkan di dalam kartu,
   akan ada tombol bersarang di dalam tombol (HTML tidak sah + fokus keyboard
   kacau). Posisi di bawah kartu juga membuat aksi tetap terlihat saat kartu
   dilipat.
3. **Label teks, bukan ikon telanjang.** Keluhan aslinya "ngga ada tombol edit
   atau hapus", jadi tombolnya menyebut dirinya sendiri — ikon saja masih bisa
   terbaca sebagai hiasan.
4. **Batik sebagai lapisan bertopeng, bukan hiasan di atas teks.** Pola dipasang
   di dua `<svg>` dengan `mask-image` radial (kawung dari kiri atas, mega mendung
   dari kanan bawah) sehingga corak hanya menyentuh sudut kartu dan angka tetap
   bersih. Warnanya putih murni dengan `strokeOpacity` 0,07–0,16 — tingkat yang
   sama dengan muka kartu dompet, jadi kartu Kekayaan & kartu dompet terasa satu
   keluarga (dan `theme:audit` tetap hijau: tidak ada hex baru).
5. **Minimalis = mengurangi, bukan menambah.** Tidak ada chip, badge, atau
   paragraf baru di kartu hero. Yang berkurang: blob blur 3xl → aurora
   terkontrol, bar 2,5 px → 1,5 px, teks label 10,5 px → 10 px, dan jarak antar
   blok kini dijaga hairline, bukan ruang kosong besar.
6. **Nol definisi data yang disentuh.** Rumus Net Worth tetap `netWorthParts()`;
   kartu hero hanya menerima potongan dan menjumlahkan sendiri seperti sebelumnya.

## Validasi (output apa adanya)

```bash
pnpm exec tsc --noEmit      →  TSC OK (exit 0, tanpa output)
pnpm test                   →  Test Files 88 passed · Tests 1183 passed
pnpm theme:audit            →  ✓ palet bersih — 505 file diperiksa
```

Pemeriksaan render (uji sementara, dihapus setelah dipakai — bukan bagian repo):
kedua komponen dirender lewat `renderToStaticMarkup` dan diperiksa:

```text
kartu Kekayaan Bersih  → memuat "Kekayaan Bersih", "networth-batik-kawung",
                         "networth-batik-mendung", "Aset", "Hutang", dan
                         Net Worth 16.500.000 dari potongan yang dioper
kartu aset investasi   → memuat tombol "Edit" & "Hapus" per aset,
                         NOL kemunculan "data-no-drag" & "touch-pan-y"
```

## Yang belum diverifikasi

`pnpm build` **tidak dijalankan** di sesi ini karena sebuah `next dev` sudah
berjalan di direktori yang sama (PID 51752, port 3000) dan build produksi
membersihkan `.next` — menjalankannya berisiko memutus server dev yang sedang
dipakai. Tampilan akhir di browser juga belum diperiksa lewat mata (`/wealth`
ada di balik gerbang sesi), jadi klaim tata letak di 375 px dan 1440 px masih
klaim desain. Cara memeriksa cepat: jelajahi `/wealth`, tab **Investasi** — di
bawah setiap kartu aset harus ada dua tombol `Edit` / `Hapus`, dan kartu paling
atas harus berlatar hijau gelap BERCORAK batik dengan angka Net Worth yang tetap
tajam.
