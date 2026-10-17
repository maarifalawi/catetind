# Panduan Screenshot QA Landing

Dokumen ini ada karena satu kesalahan yang berulang: **screenshot `fullPage`
landing lebih tinggi dari batas gambar**, jadi hasilnya ditolak pembaca gambar
dengan pesan `You have uploaded an unsupported image`.

Landing CatetInd tingginya **±11.400 px** di desktop (1440×11425). File-nya cuma
±0.8 MB, tapi **tinggi 11 ribuan piksel** itulah yang bikin gagal — bukan ukuran
file, dan bukan formatnya.

## Aturan pakai

| Kebutuhan | Perintah |
| --- | --- |
| Lihat satu section (paling aman) | `pnpm shots <url> <nama> --clip='#pricing'` |
| Lihat beberapa section sekaligus | `pnpm shots <url> <nama> fullPage --maxHeight=3000` |
| Satu layar viewport (default) | `pnpm shots <url> <nama>` |
| Versi ringan untuk dibagikan | tambahkan `--format=jpeg --quality=80` |
| Mobile / tablet saja | tambahkan `--only=mobile` / `--only=tablet` |
| Buka menu dulu | tambahkan `--click='#landing-nav-menu'` |

Contoh nyata:

```bash
pnpm shots http://localhost:3111/ harga --only=desktop --clip='#pricing'
pnpm shots http://localhost:3111/ faq --only=mobile --clip='#faq'
pnpm shots http://localhost:3111/ full --only=desktop fullPage --maxHeight=3000 --format=jpeg
```

Hasil ada di `docs/landing/shots/`. Script akan mencetak dimensi tiap file dan
menandai `⚠ TERLALU BESAR` kalau masih melewati batas aman.

## Batas aman yang dipakai script

- lebar ≤ 2000 px
- tinggi ≤ 4000 px per gambar
- ukuran file ≤ 4 MB

Kalau `fullPage` lebih tinggi dari `--maxHeight` (default 3000), file otomatis
dipecah jadi `<nama>-<viewport>-part1`, `part2`, … sehingga tiap bagian tetap
bisa dibaca.

## Dua jebakan lain yang sudah ditangani script

1. **Gambar `loading="lazy"` kosong.** Dulu section di bawah lipatan tampil
   kotak abu-abu karena halaman tidak pernah di-scroll. Sekarang script menyusuri
   halaman dulu (`warmLazyContent`) baru memotret.
2. **Animasi belum selesai.** Pakai `--wait=6000` (atau lebih) untuk hasil final;
   default 4000 ms cukup untuk sebagian besar section, tapi hero butuh lebih.

## Kalau yang gagal adalah upload dari kamu (`.messages[..].image[0]`)

Pesan `You have uploaded an unsupported image` **juga** muncul untuk gambar yang
kamu kirim ke chat, sebelum gambarnya sampai ke siapa pun. Formatnya biasanya
sebenarnya sah (PNG/JPEG) — yang ditolak adalah **ukuran/dimensinya**.

Pemicu yang paling sering:

- screenshot **full-page** browser (mis. 1440×11425)
- screenshot **4K/Retina** (3840×2160 ke atas)
- screenshot HP (1080×2400) yang masih PNG besar
- hasil **paste** dari clipboard (sering bitmap mentah yang isinya bukan PNG asli)

Perbaiki dengan alat ini:

```powershell
# 1) gambar biasa / foto / 4K → dikecilkan + JPEG
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/tools/compress-image.ps1 `
  -Path "C:\Users\maari\Pictures\Screenshot 2026-10-17 101010.png"

# 2) halaman panjang → dipotong jadi bagian yang masih terbaca
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/tools/compress-image.ps1 `
  -Path "C:\Users\maari\Pictures\full-page.png" -Slice -MaxHeight 1800 -MaxWidth 1200
```

Hasil: `<nama>-web.jpg` (target aman: ≤1600 px lebar, ≤2000 px tinggi, ±0.1 MB)
atau `<nama>-part1.jpg`, `part2`, … untuk mode `-Slice`.

Cek dimensi sebelum mengirim:

```powershell
Add-Type -AssemblyName System.Drawing
$i=[System.Drawing.Image]::FromFile("C:\path\gambar.png"); "$($i.Width)x$($i.Height)"; $i.Dispose()
```

Kalau angkanya di atas ±2000 px di salah satu sisi, kecilkan/potong dulu.

**Paling praktis:** kalau yang mau dilihat adalah UI CatetInd, tidak perlu upload
sama sekali — minta screenshot lewat `pnpm shots --clip=...` (bagian atas
dokumen ini). Hasilnya selalu kecil dan pasti terbaca.

## Yang **jangan** dilakukan


- `fullPage` tanpa `--maxHeight` pada halaman ini → hampir pasti menghasilkan
  gambar 1440×11425 yang gagal dibaca.
- Memotret seluruh halaman lalu mengecilkannya manual: teks jadi tidak terbaca,
  jadi tidak berguna untuk QA visual.
