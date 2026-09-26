# 07 — Instalasi PWA (`/install`): QR Handoff & Ilustrasi Langkah

**Route:** `app/install/page.tsx` (sudah ada — ini penyelesaiannya) · **Inventaris:** #6 · **Fase 3**

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**Inventaris:** baris 17 (#6) — *"Cara Install PWA: step-by-step per platform:
iOS Safari, Android Chrome, Desktop"*.

**PRD pendukung:**

- **18** (Evidence Ledger baris 2) — Fundy menaruh "Cara Install untuk
  iPhone/Android/Windows/Mac" di menu; panduan install lintas platform = harapan pasar
- **2384–2430** — 4A. PWA resilience: konteks "kenapa PWA" & keterbatasannya
  (push notification di iOS, cache) — bahan copy jujur, bukan janji berlebihan
- **2079–2099** — micro-moment: bantu di momen yang tepat, jangan mengganggu

**Kode acuan:**

- `components/catetind/install-guide-screen.tsx` — layar utama panduan
- `components/catetind/install-qr-handoff.tsx` — **berisi placeholder nyata**:
  `[QR Code segera hadir]` (baris ~48)
- `components/catetind/manual-tutorial.tsx` — **berisi placeholder nyata**:
  TODO + `[Ilustrasi segera hadir]` (baris ~96–98)
- `components/catetind/ios-install-arrow.tsx` — **preseden diagram SVG** (pola yang
  harus diikuti untuk ilustrasi baru: SVG kecil, `currentColor`/kelas token, tanpa hex)
- `components/catetind/install-cta.tsx`, `install-reward-banner.tsx`

## Kenapa task ini ada

Halaman install sudah dirancang bagus, tapi **dua blok intinya bohong**: ada kotak
bertulisan "[QR Code segera hadir]" dan "[Ilustrasi segera hadir]". Untuk panduan
teknis, tempat kosong justru lebih buruk daripada tidak ada — user yang gagal install
tidak akan kembali. Panduan install adalah titik **drop-off** paling mahal (user sudah
menyimpan niat, tapi tersangkut di langkah teknis).

Psikologi yang berlaku: **tunjukkan, jangan jelaskan.** Satu diagram posisi tombol
Share di iOS Safari menuntaskan lebih banyak kebingungan daripada tiga paragraf.

## Yang harus dibangun

1. **Ganti blok QR di `install-qr-handoff.tsx` dengan alur "Lanjutkan di HP" yang
   benar-benar berfungsi** (tanpa dependency baru):
   - Tombol **`Bagikan link`** memakai `navigator.share()` bila tersedia, dan
     **`Salin link`** (`navigator.clipboard.writeText`) sebagai fallback universal
     (pola ini sudah dipakai `referral-screen.tsx` — tiru persis: deteksi
     ketersediaan API + toast konfirmasi).
   - Tampilkan link-nya sebagai teks mono agar bisa dibaca/diketik manual, dan
     instruksi jujur: *"Buka link ini di HP kamu, lalu 'Add to Home Screen'."*
   - Sediakan **teks status** yang berubah setelah aksi (mis. `"Link tersalin ✓"`),
     bukan diam-diam.
   - **Kalau** pemilik produk mengizinkan dependency baru (tanyakan/tandai di laporan),
     QR sungguhan boleh dibuat karena hanya butuh 1 paket kecil; kalau tidak, alur
     di atas sudah cukup dan **jangan** menyisakan label "segera hadir".
2. **Buat `components/catetind/install-step-visual.tsx`** — diagram SVG per langkah
   (iOS Safari: tombol Share di toolbar bawah; Android Chrome: menu titik-tiga +
   "Tambahkan ke layar utama"; Desktop: ikon install di address bar).
   - Ikuti pola `ios-install-arrow.tsx`: SVG inline, `aria-hidden`, ukuran ringkas,
     warna lewat `currentColor`/kelas token palet — **dilarang hex**.
   - Pakai di `manual-tutorial.tsx` menggantikan kotak dashed `[Ilustrasi segera hadir]`,
     dan hapus komentar `TODO`-nya.
   - Bila satu langkah tidak punya visual yang jelas, **hapus kotak placeholder**-nya
     (lebih jujur daripada kotak kosong).
3. **Copy** tinggal di data (perluas konstanta di `manual-tutorial.tsx` /
   `install-guide-screen.tsx` atau pindahkan ke `lib/data/install.ts` bila mulai
   banyak). Nada: menuntun, sabar, tanpa jargon.
4. **Uji di 375 px** — panduan ini hampir selalu dibuka dari HP.

## Acceptance criteria

- [ ] Tidak ada lagi teks `segera hadir` / `[Ilustrasi …]` / `[QR Code …]` di halaman install.
- [ ] `Bagikan link` & `Salin link` benar-benar bekerja (uji clipboard; fallback saat
      `navigator.share` tidak ada).
- [ ] Setiap langkah platform punya visual nyata, atau tidak punya blok visual sama sekali.
- [ ] Diagram SVG memakai token palet (nol hex/rgb) dan ikut mode kontras teks.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Membiarkan satu pun kotak "segera hadir" di halaman install.
- Menambahkan dependency tanpa mencatatnya di laporan.
- Menyalin ikon browser/OS berlisensi apa pun (buat diagram abstrak dari bentuk geometris).
