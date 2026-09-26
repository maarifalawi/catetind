# 05 — 404 / Not Found

**Route:** `app/not-found.tsx` · **Inventaris:** #32 · **Fase 3** · **Depends on:** — (murah & cepat)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**Inventaris:** baris 85 (#32) — *"catch-all · Standard: Nurturing copy + redirect home"*.

**PRD pendukung:**

- **542–568** — nada micro-copy (teman yang suportif, bukan sistem yang mengeluh)
- **2282–2323** — Home screen: pelajari bahasa visual & elemen yang boleh dipakai ulang di layar sederhana
- **2079–2099** — daftar micro-moment (jangan menjadikan error sebagai momen menegur)

**Kode acuan:**

- `components/catetind/screen-shell.tsx`, `phone-stage.tsx` — shell halaman
- `components/catetind/install-guide-screen.tsx` — contoh halaman app yang simpel & ramah
- `components/ui/button.tsx` — tombol primer/sekunder
- `app/insight/page.tsx` — contoh rute yang cuma `redirect()` (pola kalau perlu rute pemulih)

## Kenapa halaman ini ada

404 di app keuangan bukan sekadar "halaman hilang" — ia muncul di momen rawan:
bookmark lama, tautan teman yang salah salin, atau `/share/[id]` yang idnya sudah
dihapus. Nada yang salah di sini (mis. "Not Found 404" teknis) langsung membuyarkan
rasa aman yang dibangun seluruh produk.

Psikologi yang berlaku: **jangan menegur, tunjukkan jalan pulang.** Halaman ini
harus memberi 3 hal dalam sekali lihat: (1) penjelasan ringan apa yang terjadi,
(2) satu tombol pulang yang jelas, (3) pintasan ke 3–4 halaman yang paling mungkin
mereka cari — supaya tidak ada jalan buntu kedua.

## Yang harus dibangun

1. **`app/not-found.tsx`** (Next App Router) — beri komentar singkat kenapa tanpa
   `metadata` (file ini dirender di dalam root layout yang sudah punya metadata).
2. Isi halaman:
   - Visual ringan bernuansa tanaman (emoji/SVG sederhana dari `plant-illustration.tsx`
     bila bentuknya cocok) — **jangan** mengimpor aset baru.
   - Judul `font-display` (resep H1 kanon) yang hangat, mis.
     *"Halaman ini nggak ada di kebun kita 🌱"*.
   - Satu kalimat penjelasan + satu kalimat menenangkan: *"Tautannya mungkin sudah
     dipindah atau salah ketik. Datamu aman — nggak ada yang berubah."*
   - **Tombol primer** `Balik ke Beranda` (`/`) — di zona ibu jari, ukuran nyaman.
   - **Pintasan sekunder** ke: `/wallet`, `/history`, `/budget`, `/help`.
   - Kotak bantuan kecil: *"Nyasar terus? Kabarin kami di Pusat Bantuan ya."* → `/help`.
3. **Copy tinggal di data**, bukan di JSX. Karena halaman ini bukan domain fitur,
   simpan konstanta di `lib/` (mis. `lib/not-found.ts`) atau langsung sebagai
   konstanta bernama di atas komponen dengan komentar — pilih satu dan konsisten.
4. **Uji perilaku**: kunjungi URL acak (mis. `/halaman-ngawur`) dan pastikan muncul
   halaman ini, bottom nav mobile & sidebar desktop tetap konsisten dengan halaman lain.

## Acceptance criteria

- [ ] URL tak dikenal menampilkan halaman 404 ini (bukan layar putih / error bawaan Next).
- [ ] Tampil rapi di 375 px & 1440 px; tombol utama mudah dijangkau ibu jari.
- [ ] Semua tautan di halaman ini menuju route yang ADA (cek satu per satu).
- [ ] Tidak ada copy menyalahkan user, tidak ada istilah teknis ("error", "404" boleh
      hanya sebagai kode kecil non-menonjol, kalau perlu).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menampilkan stack trace, kode error, atau pesan teknis apa pun.
- Memakai gambar/aset baru (semua visual dari komponen & palet yang sudah ada).
- Menambahkan redirect otomatis ke `/` — user harus tetap punya kendali (dan waktu
  membaca apa yang terjadi).
