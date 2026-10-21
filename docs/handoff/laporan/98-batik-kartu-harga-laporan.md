# Laporan Paket 98 — Corak Batik Khas Indonesia pada Kartu Harga

> **Tanggal:** 19 Okt 2026
> **Pemicu:** “pas pemilihan harga kan itu jadi batik gitu ya, ada coraknya. itu di improve lagi. biar bener bener sama kaya batik khas indonesia.”
> **Hasil:** corak generik (lingkaran beririsan + lengkung gelombang) diganti empat motif batik yang punya nama dan bentuk asli; tiap motif mengunci satu sudut kartu.

## Masalah pada corak lama

`BatikBackdrop` hanya menggambar dua pola:

1. **“Kawung”** berupa lima lingkaran saling beririsan — di mata user ini terbaca sebagai cincin/gelembung, bukan kawung.
2. **“Mega mendung”** berupa tiga kurva sinus — terbaca sebagai gelombang laut, bukan awan Cirebon.
3. Keduanya memakai satu mask radial raksasa (135% × 115%), sehingga pola menyebar hampir ke seluruh kartu dan bersaing dengan nominal.
4. Tidak ada isen-isen, cecek, mlinjon, garis rangkap, atau aksen emas — unsur yang membuat batik terasa dicap tangan, bukan pola vektor.

## Motif pengganti

| Motif | Asal | Bentuk yang digambar sekarang | Penempatan |
|---|---|---|---|
| **Kawung** | Yogyakarta | empat kelopak kolang-kaling (ujung luar membulat, pangkal runcing) mengelilingi cincin kecil; tiap kelopak punya garis rangkap + isen-isen titik; ceplok mengisi ruang antar-motif; tile 84 px diulang rapat termasuk potongan di sudut tile | kiri atas |
| **Mega Mendung** | Cirebon | awan berlapis **empat** garis konsentris dengan ekor melengkung ke bawah; dua baris bergeser (offset 48 px) + cecek di ujung awan; tile 192 × 128 px | kanan bawah |
| **Parang** | Solo/Yogyakarta | pita **lidah parang** berbentuk S berisi, dua garis tepi kain sejajar, dan **mlinjon** (belah ketupat) di ruang antar-bilah; pola diputar 45° supaya jalannya diagonal seperti parang asli | kiri bawah |
| **Truntum** | Solo | bunga bintang empat kelopak runcing, inti emas, taburan isen-isen delapan titik (4 diagonal + 4 mata angin); tersebar selang-seling | kanan atas |

Aksen emas memakai token **`daisy`** (`--color-brand`), bukan hex lepas, dan hanya untuk mlinjon + inti truntum — secukupnya seperti batik pesisir, tanpa mengubah palet kartu.

## Aturan tata letak

- **Satu motif = satu sudut.** Empat mask di `app/globals.css` dipersempit dari 135% × 115% menjadi 62–88% × 42–58%, jadi pola berhenti sebelum kolom nominal & daftar fitur.
- Mask, bukan opacity: hanya pola yang memudar; teks di atasnya tetap 100% tajam.
- Urutan lapisan: parang → kawung → mega mendung → truntum. Intensitas per lapisan 90 / 95 / 90 / 60, lalu pemanggil tetap boleh menurunkan overall lewat `className="opacity-90"` seperti sebelumnya.
- Semua tetap `aria-hidden` + `pointer-events-none` + `absolute inset-0`; tidak ada perubahan layout, ukuran, atau markup teks.

## Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `components/landing/lp/batik-backdrop.tsx` | Ditulis ulang: empat motif batik asli (kawung, mega mendung, parang, truntum), unit pattern dipakai ulang lewat `<use>` dengan id ber-prefix `${id}`, aksen `text-daisy`. |
| `app/globals.css` | `.batik-mask-kawung` & `.batik-mask-mendung` dipersempit; tambah `.batik-mask-parang` & `.batik-mask-truntum`; komentar peta motif → sudut diperbarui. |

Tidak ada perubahan pada `pricing.tsx` / `checkout-screen.tsx`: keduanya sudah memanggil `BatikBackdrop` dengan id unik, jadi corak baru langsung terpakai di **landing #pricing** dan **checkout**.


## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | lulus, 0 error |
| `npx vitest run` | **95 file / 1.393 test lulus** (tidak ada test yang menyentuh SVG dekoratif, jadi tidak ada regresi) |
| Landing `/#pricing` (desktop 1440 px) | kartu Waras: kawung di kiri atas, truntum di kanan atas, parang di kiri bawah, mega mendung di kanan bawah; nominal & fitur tetap tajam |
| `/checkout` (desktop 1440 px) | kartu terpilih yang sama; teks “Rp 129.000” dan daftar fitur tidak tertutup pola |
| Mobile 390 px (`/#pricing`) | motif ikut mengecil secara proporsional lewat mask persen; tidak ada kartu yang penuh corak |

Screenshot bukti (folder `docs/landing/shots/`, di-gitignore):

- `pricing-final-desktop-clip.png`
- `checkout-batik-desktop.png`
- `kartu-aktif-v2-desktop-clip.png`
- `pricing-mobile-mobile-clip.png`

## Cara memeriksa cepat

1. Buka **`/`** → scroll ke **#pricing**. Kartu tengah (Waras) harus memperlihatkan empat corak berbeda di empat sudutnya, dengan mlinjon & inti truntum berwarna kuning tipis.
2. Buka **`/checkout`** → pilih paket lain. Corak berpindah mengikuti kartu yang aktif, bukan menumpuk di semua kartu.
3. Perbesar ke 200%: garis motif harus tetap mengikuti skala px (bukan ikut meregang mengisi kartu), tanda bahwa pattern memakai `userSpaceOnUse`.
