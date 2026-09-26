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

CHEAT SHEET — token yang boleh dipakai
Palet kanon (10): soil · evergreen · ivory · oat · plum · olive · thistle ·
leaf · cantelope · daisy
Alias semantik : ink(=soil) · forest(=evergreen) · forest-soft · brand(=daisy) ·
mint(=leaf) · mint-soft · sage(=oat) · cream(=canvas/putih) ·
hud-sage(=olive) · hud-amber(=cantelope) · hud-terracotta(=plum)
Netral teknis  : canvas(=putih #ffffff)

Semua token di atas tersedia untuk prefix: bg- text- from- via- to- ring- border-
divide- fill- stroke- decoration- outline- + modifier opasitas (`/12`, `/[0.06]`).
Contoh sah: `bg-canvas`, `bg-cream`, `text-ink/55`, `ring-soil/12`, `bg-leaf/25`,
`from-cantelope/25`, `to-plum/10`, `text-hud-terracotta`.

NILAI TURUNAN (boleh sebagai hex literal, HANYA untuk gradien/bayangan/SVG)
evergreen-soft #52685c · evergreen-light #c4c7af · evergreen-deep #1f2823 ·
evergreen-deeper #161c19 · soil-muted #767676 · leaf-light #dbe4c7 ·
olive-light #e6e4c0 · olive-deep #51533d · thistle-light #dbdccf ·
thistle-deep #414853 · plum-light #e7d8c3 · plum-deep #534141 ·
cantelope-light #fbe3c0 · cantelope-mid #e8b06a · cantelope-deep #73533c ·
daisy-light #f6edb7 · daisy-deep #6a612f

SIAPKAN SESUAI KEBUTUHAN
- Gradien muka kartu dompet: stop pertama = warna aksen palet, stop terakhir =
  shade-gelap aksen itu (`…-deep`), teks putih + text-shadow.
- Chip/pill kecil: `bg-<aksen>/15`–`/25` + `text-ink`.
- Kalau butuh hue baru untuk membedakan kategori: ambil dari palet yang sudah
  ada (maks 6 aksen), JANGAN bikin warna baru.

JIKA BENAR-BENAR BUTUH WARNA BARU (jarang; harus sadar)
Lakukan berurutan, jangan setengah jalan:
  1. tambahkan sebagai token di blok `@theme inline` di `app/globals.css`
     (lapis 1 bila warna palet baru, lapis 3 bila turunan),
  2. tambahkan hex-nya ke daftar `ALLOWED` di `scripts/theme/audit-palette.mjs`,
  3. catat di `docs/theme/PALETTE.md` (tabel + alasan),
  4. sebutkan di ringkasan akhir bahwa palet diperluas + alasannya.

CHECKLIST WAJIB SEBELUM MENYELESAIKAN TUGAS
  [ ] `pnpm theme:audit`  → harus "✓ palet bersih" (kalau gagal: betulkan, jangan
      tambahkan pengecualian tanpa alasan kuat)
  [ ] `pnpm build`        → harus "Compiled successfully" tanpa error
  [ ] tidak ada `#rrggbb` / `rgb(` / `oklch(` baru di komponen
  [ ] tidak ada kelas warna bawaan Tailwind (white/black/slate/gray/blue/rose/
      amber/emerald/teal/…)
  [ ] tidak ada permukaan ivory; kartu tetap terbaca (hairline ≥ `/8`)
  [ ] laporan akhir menyebut file yang diubah + hasil audit & build

CATATAN REPO
- `docs/` tidak dirender dan sengaja dikecualikan dari pemindaian kelas Tailwind
  (`@source not '../docs'` di app/globals.css) dan dari audit palet.
- Penjaga otomatis: `pnpm theme:audit` (script: scripts/theme/audit-palette.mjs).
- Kalau perlu mengganti palet secara massal: scripts/theme/apply-palette.mjs
  (`pnpm theme:apply --dry-run` dulu).
```

---

## Versi pendek (kalau prompt panjang tidak muat)

```text
Repo CatetInd. Warna terpusat: baca docs/theme/PALETTE.md + blok `@theme inline`
di app/globals.css, lalu pakai HANYA token itu.
Dasar halaman & kartu = PUTIH (`bg-canvas` / `bg-cream`); batas kartu = hairline
`ring-soil/8`–`/16` + shadow `rgba(0,0,0,…)`. Dilarang: hex/rgb/oklch baru, kelas
warna bawaan Tailwind (`text-slate-500`, `bg-blue-600`, `bg-white`, `bg-black`),
dan permukaan ivory `#fbf6d9`.
Makna: hitam (`ink`) teks · `forest` permukaan gelap · `leaf`/`mint` uang positif ·
`hud-sage`(olive) aman · `hud-amber`(cantelope) hati-hati · `hud-terracotta`(plum)
lewat batas · `thistle` info · `brand`(daisy) highlight. Teks sekunder = opasitas
`text-ink/45`.
Selesai hanya kalau `pnpm theme:audit` bersih dan `pnpm build` sukses.
```

---

## Kenapa prompt ini ada

Palet CatetInd pernah "bocor": ada ratusan hex literal & kelas warna bawaan
Tailwind yang tersebar di 100+ file, sehingga ganti tema butuh kerja manual dan
rawan tidak konsisten. Sekarang warna terpusat di satu blok token + dijaga oleh
`pnpm theme:audit`. Prompt di atas adalah kontrak untuk agen berikutnya supaya
kondisi itu tidak terulang.

