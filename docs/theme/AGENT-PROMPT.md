# 🎨 Prompt Penjaga Konsistensi Warna — CatetInd

Cara pakai: **tempel isi blok di bawah** di awal task/sesi baru (Cline, ChatGPT,
Claude, dsb). Blok ini sengaja lengkap supaya agen tetap benar walau belum sempat
membaca repo. Detail penuh ada di `docs/theme/PALETTE.md`.

---

## ▶️ PROMPT — salin dari sini

```text
KONTEKS
Kamu bekerja di repo CatetInd (Next.js 16 + React 19 + Tailwind CSS v4).
Sebelum menulis UI, WAJIB baca:
  1. docs/theme/PALETTE.md   → palet kanon + aturan pemakaian + riwayat migrasi
  2. blok `@theme inline` di app/globals.css → daftar token warna yang tersedia
Warna di repo ini sudah 100% terpusat. Tugasmu: JANGAN merusak konsistensinya.

ATURAN KERAS (pelanggaran = pekerjaan ditolak)
1. TIDAK BOLEH menulis warna literal baru. Dilarang: `#rrggbb`, `rgb()`/`rgba()`,
   `oklch()`, `hsl()` di komponen — kecuali nilainya sudah ada di daftar
   "NILAI TURUNAN" di bawah, atau kamu menambahkannya secara sadar (lihat
   "JIKA BENAR-BENAR BUTUH WARNA BARU").
2. TIDAK BOLEH memakai kelas warna bawaan Tailwind: `text-slate-500`,
   `bg-blue-600`, `from-rose-100`, `text-white`, `bg-black`, dst. Semuanya sudah
   dipetakan ke token palet (`text-ink/45`, `bg-thistle`, `from-plum/20`,
   `text-cream`, `bg-soil`, …).
3. Pakai HANYA token dari CHEAT SHEET di bawah.
4. Ikuti konvensi file yang ada: komentar bahasa Indonesia, komentar non-trivial,
   dan gaya kelas yang sudah dipakai tetangganya.

DASAR & PERMUKAAN (penting — ini arah desain yang sudah disepakati)
- Dasar halaman DAN kartu/panel = PUTIH: `bg-canvas` dan `bg-cream` (dua-duanya
  #ffffff). Jadi kartu putih di atas putih.
- Karena itu batas antar-permukaan dibawa HAIRLINE + SHADOW, bukan perbedaan hue:
    • hairline: `ring-soil/8` … `ring-soil/16` (skala hairline: 8 = sangat halus,
      12 = kartu standar, 16 = tegas/aktif)
    • bayangan: `rgba(0, 0, 0, …)` netral, lembut & panjang (contoh pola repo:
      `shadow-[0_18px_40px_-34px_rgba(0,0,0,0.55)]`)
- JANGAN memakai `bg-soil/[0.02]`–`[0.04]` untuk border/isian: di atas putih itu
  praktis tak terlihat. Minimum isian tipis = `bg-soil/[0.06]`.
- Ivory `#fbf6d9` DILARANG dipakai sebagai permukaan (sudah dipensiunkan); kalau
  butuh aksen hangat, pakai Oat `bg-sage` — dan Oat hanya untuk elemen KECIL
  (chip/pill, lingkaran ikon, hover, kotak info), bukan permukaan besar.

MAKNA WARNA (jangan ditukar)
- Hitam (Soil / `ink`) = teks, garis, scrim overlay.  ← Soal = #000000 (revisi)
- Evergreen (`forest`) = permukaan gelap/brand: hero, muka kartu, sidebar.
- Hijau Sage (`leaf` / `mint`) = uang masuk, positif, progres.
- Olive (`hud-sage`) = status "aman / on-track".
- Cantelope (`hud-amber`) = pengeluaran, "mendekati batas" / hati-hati.
- Plum (`hud-terracotta`) = "lewat batas" / alert / kategori belanja.
- Thistle = info, kategori netral (mis. transport).
- Daisy (`brand`) = pop terang: highlight, badge, brand mark.
- Teks di atas aksen terang (Daisy/Cantelope/Olive/Sage/Thistle/Plum) = hitam
  (`text-ink` / `text-soil`). Teks di atas Evergreen/hitam = putih (`text-cream`).
- Teks sekunder: pakai OPASITAS, mis. `text-ink/45`, `text-ink/65`. JANGAN bikin
  abu-abu baru.
```
