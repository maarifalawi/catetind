# Laporan — Hero Landing: Adegan "Ponsel di Tangan"

> **Tanggal:** 15 Okt 2026
> **Kanon kerja:** `docs/handoff/CONTEXT-WAJIB.md` (§2 struktur & konvensi kode, §3 palet, §7 no dead asset, §8 checklist validasi)
> **Permintaan pemilik produk (asli):** "bisa gak lu bikin photo ini seolah olah
> jadi in frame di tangan orang gitu, yang lagi megang ipone, seperti gambar yang
> kedua saya berikan. taro di landing page"

## Ringkas

Hero landing (Section 1) tidak lagi memakai mockup kartu HUD, tapi **satu adegan
product shot**: layar Home CatetInd di dalam bingkai iPhone yang digenggam tangan,
dengan empat kartu kaca melayang di sekelilingnya — pola yang sama dengan gambar
referensi yang dikirim pemilik produk.

Yang penting untuk diketahui: **adegannya tidak memakai satu pun berkas gambar.**
Bingkai iPhone = CSS, layarnya = **replika LIVE dari Home `/app`** (header, deck
dompet, kartu "Transaksi Terakhir", strip ringkasan periode, bottom nav), tangannya
= SVG. Konsekuensinya: tajam di semua kerapatan layar, nol tambahan berat halaman,
dan **angkanya mustahil basi** karena dibaca dari `lib/data/landing.ts` yang sama
dengan hero. Kalau pemilik produk tetap ingin screenshot asli, sudah disediakan
sakelarnya (lihat bagian "Menukar layar dengan screenshot asli").

## Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `components/landing/hero-device.tsx` | **BARU** — seluruh adegan: bingkai iPhone, replika layar, dua lapis tangan (SVG), kartu kaca melayang |
| `components/landing/hero.tsx` | Mockup HUD + tanaman diganti `<HeroDevice/>`; ringkasan a11y pindah ke `HERO_DEVICE_ARIA` |
| `lib/data/landing.ts` | Blok data baru: `HERO_DEVICE`, `HERO_DEVICE_MONTHLY_SUMMARY`, `HERO_DEVICE_FLOAT`, `HERO_DEVICE_ARIA`, `HERO_DEVICE_SCREENSHOT`, `HERO_DEVICE_STATUS_TIME` |
| `lib/data/landing.test.ts` | 8 test baru yang mengunci "satu cerita angka" di seluruh hero |
| `app/globals.css` | Token `--animate-hero-device` + keyframes `hero-device-float` |

## Tiga keputusan yang mengikat bentuknya

### 1. Satu sumber angka — hero adalah cermin app, bukan iklan terpisah

Saldo kartu agregat (`Rp 2.120.000`) **dijumlahkan** dari daftar dompet di data
(BCA 1.650.000 · GoPay 320.000 · ShopeePay 85.000 · Tunai 65.000), dan `net`
strip ringkasan **dihitung** dari pemasukan − pengeluaran. Kelima baris catatan
memakai nama/kategori/jam yang persis sama dengan seed persona demo di
`lib/money/demo-bootstrap.ts`, jadi pengunjung yang mendaftar lalu membuka `/app`
melihat catatan yang sama seperti di landing.

Semua kalimat layar yang **sudah punya rumah** di app dibaca dari sana:
`HOME_MONEY_COPY` (judul kartu, "Lihat semua", "Bulan ini", "masuk,"/"keluar —
net"), `HOME_MONEY_DAY_LABEL` ("Hari ini"), `OVERVIEW_PANEL_COPY.badgeAll`
("Semua Dompet"). Tidak ada satu pun kalimat yang ditulis dua kali.

Test di `lib/data/landing.test.ts` menahan penyimpangan yang paling mudah terjadi:
`net = total saldo` (di persona demo sisa gaji memang berakhir di dompet),
`net = pemasukan − pengeluaran`, label tumpukan = dompet terdalam lebih dulu, dan
kartu melayang memakai angka yang sama dengan layar.

### 2. Satu sistem ukuran: `cqw` (container query)

Layar app di hero hanya ±200 px lebar. Ukuran px apa pun akan terlihat salah
begitu ponselnya mengecil di mobile, jadi setiap ukuran di dalam layar ditulis
sebagai **persen lebar layar** (`text-[3.4cqw]` ≈ 3,4% lebar layar). Hasilnya
komposisinya identik di HP maupun desktop — seperti screenshot yang diperkecil,
bukan layout kedua yang harus dirawat terpisah. Bingkai iPhone pun begitu: ia
punya `@container` sendiri, jadi proporsi tombol samping, Dynamic Island, dan
radius sudutnya tetap sama di semua ukuran.

### 3. Geometri tangan & ponsel satu koordinat

Ponsel diletakkan di "panggung" ber-viewBox 430×560; tangan digambar sebagai dua
lapis SVG ber-viewBox **yang sama**: telapak + pergelangan di BELAKANG ponsel,
empat ujung jari di DEPAN layar supaya terlihat benar-benar menggenggam. Karena
satu sistem koordinat, tepi jari mustahil melenceng dari tepi ponsel — tidak ada
satu pun nilai px absolut di adegan ini.

Warna tangan memakai turunan palet kanon (`oat` → `plum-light` → `plum`, shade
`plum-deep`), bukan warna kulit literal: penjaga palet (`pnpm theme:audit`) tidak
boleh dilanggar, dan tangan jadi terasa satu keluarga dengan ilustrasi tanaman di
app. Ibu jari sengaja TIDAK digambar — dengan cengkeraman begini ia memang ada di
balik bodi ponsel, jadi menampilkannya justru salah anatomi.

## Menukar layar dengan screenshot asli

Sakelar satu baris, tanpa menyentuh komponen:

1. simpan berkasnya di `public/` (mis. `public/hero-home-catetind.png`);
2. isi `HERO_DEVICE_SCREENSHOT` di `lib/data/landing.ts` dengan `'/hero-home-catetind.png'`.

Selama nilainya `null` (default), hero memakai replika UI live. Cabang gambarnya
memakai `next/image` dengan `fill` + `object-cover object-top` di dalam layar yang
sama, jadi bingkai, tangan, dan kartu melayang tidak berubah sedikit pun.

## Bukti ukur (bukan perkiraan)

Diukur di halaman yang benar-benar dirender (Chrome headless, media iframe):

| Yang diukur | Hasil |
|---|---|
| Panggung @390 px | `20,312 → 370,767` (350 px, rasio 430:560 ✓) |
| Ponsel @390 px | `108,330 → 283,690` (175 px = 50% panggung, rasio bodi iPhone ✓) |
| Isi layar | `clientHeight/scrollHeight = 352/352` → **tidak ada yang terpotong** |
| Kartu transaksi | `192/192` → **tidak meluber** |
| Strip ringkasan periode | `visible=true` di dasar kartu (versi pertama: terpotong) |
| `document.scrollWidth` @390 / @1440 | `390 / 1440` → **nol overflow horizontal** |
| Kartu melayang @1440 | 4 tampil, tiap kartu menimpa tepi ponsel 8–25 px, teks tidak tertutup |
| Tinggi baris catatan | 24 px @ layar 166 px (±14,5cqw) |

Angka-angka itu yang menentukan pengecilan proporsi di dalam layar: versi pertama
kartu transaksinya meluber 30 px sehingga strip ringkasan periode — yang justru
ada di gambar referensi — ikut terpotong. Setelah padding baris/kartu, tinggi deck,
dan ukuran kontrol deck diturunkan, seluruh isi layar pas.

## Yang diuji

```
pnpm exec tsc --noEmit                 ✓ bersih
pnpm test                              ✓ 89 berkas, 1225 test lulus (8 di antaranya baru)
node scripts/theme/audit-palette.mjs   ✓ 509 berkas, nol warna di luar palet
pnpm build                             ✓ exit 0 (landing tetap statis/ISR-ready)
```

Pemeriksaan visual juga dilakukan pada hasil render nyata (1440 px, 900 px, dan
390 px): memastikan ujung jari tidak menutupi teks catatan (yang tertimpa hanya
tile ikonnya) dan kartu melayang tidak menutupi angka kartu di sebelahnya.

## Batasan & lanjutan yang mungkin diminta

- **Tangannya ilustrasi vektor, bukan foto.** Foto tangan manusia tidak bisa
  dibuat dari kode dan tidak boleh diambil sembarangan (lisensi + palet). Kalau
  pemilik produk ingin foto asli, yang dibutuhkan satu PNG latar transparan di
  `public/` (mis. `public/hand-holding-iphone.png`); menggantinya berarti menukar
  dua komponen `HandBehind`/`HandFront` dengan satu `<Image>` — geometri panggung
  & posisi ponselnya sudah siap dipakai apa adanya.
- **Kartu melayang hanya tampil dari `xl` ke atas.** Di bawah itu kolomnya sempit
  dan empat kartu kaca justru menutupi ponselnya sendiri (di `lg` kartu kanan juga
  terpotong tepi viewport — itu sebabnya ambangnya `xl`, bukan `lg`).
- **Layar menampilkan catatan "hari ini" saja** (lima baris), persis seperti
  tangkapan layar pemilik produk. Rekap hari lain tidak ditambah supaya tinggi
  layar tetap pas tanpa perlu menggulir.
- **Angka hero = persona demo.** Bila persona di `lib/money/demo-bootstrap.ts`
  diubah, angka di `HERO_DEVICE`/`HERO_DEVICE_FLOAT` wajib disamakan. Test akan
  menahan kalau `net` dan total saldo jadi berbeda cerita, tapi ia tidak bisa tahu
  kalau keduanya diubah "sama-sama salah".
