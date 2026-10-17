# PROMPT — Milestone B: Port Section Tengah Landing (tempel di New Task)

> Cara pakai: buka **New Task**, paste seluruh isi di bawah ini. Jangan lampirkan
> screenshot/foto ke chat (task sebelumnya mati karena error provider gambar).
> Semua bukti visual cukup dibaca dari file di `docs/landing/shots/`.

---

## 0. Peran & misi

Kamu engineer senior di repo **CatetInd** (`c:\Users\maari\Downloads\catet-ind-dashboard-design`).
Lanjutkan **Milestone B**: port section tengah landing page dari export Framer ke
React + Tailwind, di halaman kerja `/preview-landing`.

**Milestone A SUDAH SELESAI dan ADA DI WORKING TREE (belum di-commit).** Jangan
`git reset`, `git checkout`, atau mengembalikan file apa pun. Jangan mengubah
tampilan navbar/hero/CTA/footer kecuali memang diperlukan oleh section baru.

## 1. Stack & konvensi repo

- Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 (token di
  `app/globals.css`) · framer-motion · Vitest (`environment: node`).
- Package manager **pnpm** (`node_modules` sudah terpasang).
- Landing baru dibangun ulang di `components/landing/lp/*` — **bukan** menempel
  HTML export Framer.
- Komentar kode **Bahasa Indonesia** dan menjelaskan ALASAN, bukan mengulang kode.
- Nol string user-facing di JSX: copy tinggal di `lib/data/landing.ts`.

## 2. Wajib dibaca dulu (jangan menulis kode sebelum ini)

1. `docs/landing/README.md` — status, alat kerja, konvensi, daftar section belum diport.
2. `docs/handoff/CONTEXT-WAJIB.md` — aturan produk, nada copy, larangan klaim.
3. `app/preview-landing/page.tsx`.
4. `components/landing/lp/{navbar,hero,footer,button,marks,reveal}.tsx`.
5. `lib/data/landing.ts` — bagian **LANDING LP** (`LP_NAV`, `LP_NAV_LINKS`,
   `LP_HERO`, `LP_FOOTER`) **dan** data lama yang masih dipakai:
   `LANDING_TIERS`, `RECOMMENDED_TIER`, `PRICING_COPY`, `PRICING_TRUST_BADGES`,
   `FAQ_ITEMS`.
6. `lib/data/pricing.ts` — `PLANS` (harga & fitur kanon; satu-satunya sumber angka).
7. `app/globals.css` — blok **PALET LANDING** (~baris 157–200) + `--font-lp` +
   `--breakpoint-lp-tab: 810px`, `--breakpoint-lp: 1200px`.
8. `docs/landing/framer-spec.json`, `section-*.digest.txt`,
   `digest-ketik-pengeluaran-manual.txt` + `.css` (ini sebenarnya digest seluruh
   `#mission`), `docs/landing/assets.json`.
9. `scripts/landing/{extract-framer-spec,shoot,inspect}.mjs`.
10. `lib/data/landing.test.ts`.

Sumber kebenaran visual: `LP CATETIND.html` (export Framer) dan pembanding live
<https://reserved-calls-942581.framer.app/>.

## 3. Status Milestone A (jangan diulang)

Yang sudah ada dan **sudah benar**:

- `LandingNavbarLp` — pill putih setelah scroll, varian gelap lewat
  `[data-nav-theme="dark"]`, menu mobile < 1200px.
- `LandingHeroLp` — angka & susunan dari export; animasi `LandingReveal`.
- `LandingFooterLp` — CTA "Siap stop boncos bulan ini?" + footer.
- `LandingButton` — tone `dark | light | lime | darkLime`, size `sm | md`.
- `LandingReveal` — spring `bounce .2 duration 1`, `y` 24/48/72/96/128,
  `delay` 0/.2/.4/.6, `trigger="load" | "view"`, hormati `prefers-reduced-motion`.
- `LandingMarkChain` / `LandingMarkBadge` di `marks.tsx`.
- Font landing `font-lp` = Inter Tight (dashboard tetap Inter).
- `/preview-landing` **noindex**, terdaftar di `PUBLIC_ROUTES` dan `FOCUS_ROUTES`.
- Landing lama di `/` (`components/landing/*`) **tetap hidup** sampai seluruh
  section baru selesai & disetujui.

## 4. Scope Milestone B

Urutan render final di `/preview-landing`:

`Navbar → Hero → MISSION (#mission) → PRICING (#pricing) → FAQ (#faq) → CTA → Footer`

### 4A. Section `#mission` (About) — bagian terbesar

Sumber: `<section ... data-framer-name="About" id="mission">` di export.
Isi (urutan DOM; verifikasi dengan digest + screenshot):

1. **Heading besar** — "Uang lo bebas lo pake buat apa aja. Asal lo sadar ke mana
   perginya".
2. **3 benefit tile**:
   - "Gak Buang Waktu" / "Empat detik kelar"
   - "Biar AI Mikir" / "Lo terima beres"
   - "Sadar Sebelum Habis" / "Keliatan semua bocornya"
3. **4 feature card ber-id** (anchor wajib tetap ada):
   - `#card-1` — "Ketik pengeluaran manual? Hari gini? Ngomong aja kelar" ·
     "Waktu lu terlalu berharga buat ngisi form yang ribet. Cukup kirim voice note
     atau foto struk belanja, sisanya biarin AI yang mikir" · caption
     "4 detik kelar. Lu bener-bener terima beres" · gambar `jsno…png`
   - `#card-2` — "Rem darurat biar lo ngga nangis pas akhir bulan" ·
     "Understand which accounts, streams, and patterns generate real cash impact." ·
     "No more unclear or blended revenue sources." · gambar `aadd…png`
   - `#card-3` — "Know what you’ve already committed to" ·
     "See recurring costs, upcoming payments, and contract obligations before they
     hit your balance." · "No more “we forgot this renewal” moments." · gambar `kG7…png`
   - `#card-4` — "Track your company progress over time." ·
     "Makro shows growth, momentum, and long-term progress without manual reporting." ·
     "No more manual tracking of business progress." · gambar `XVPh…png`
4. **4 blok teks lain** (posisi DOM setelah kartu ber-id):
   - "Serius, lo masih nyatet pengeluaran manual?" / "3 detik kelar. Tinggal
     ngomong atau foto struk" / "4 detik kelar. Lu bener-bener terima beres"
   - "Radar tanggal rawan: Ketahui kapan lo gampang kalap." / "Biar ga kaget kenapa
     saldo tiba-tiba ludes" · gambar `JGNl…png`
   - "Financial bestie pribadi lo. 24/7, tanpa nge-judge" / "Tanya apa aja sebelum
     lo checkout atau nongkrong"
   - "Akhirnya lo tau pasti duit lo lari ke mana" / "Duit ga bakal lagi 'nguap'
     tanpa jejak" · gambar `7sb0…png`

   **WAJIB diverifikasi dulu**: blok ke-2 itu kartu tambahan yang memang tampil,
   atau varian breakpoint (desktop vs mobile) yang salah satunya `display:none`.
   Cek lewat `inspect.mjs` pada 1440px dan 390px (visibility + teks yang benar-benar
   terlihat). Jangan menampilkan dua copy berbeda untuk satu slot di layar yang sama.

5. Anchor `#fold-chat`, `#fold-artifacts`, `#fold-board`, `#fold-logic` adalah
   penanda scroll/nav di export. Kalau tidak dipakai, jangan bikin id nganggur;
   kalau dipakai navbar, hubungkan dengan benar.

**Catatan copy:** beberapa baris berbahasa Inggris adalah sisa template
("Know what you’ve already committed to", "Track your company progress over time",
"Makro shows growth…"). Terjemahkan ke Bahasa Indonesia dengan nada CatetInd dan
ganti referensi "Makro" → CatetInd. Jangan biarkan nama template/Makro lolos ke UI.

### 4B. Section `#pricing`

- Eyebrow/judul/subtitle export boleh dipertahankan: "Harga" · "Beresin bocor
  halus, seharga 1 kopi" · "Lebih murah dari sekali nongkrong, tapi bisa nyelametin
  gaji lo jutaan rupiah tiap bulan…".
- Kartu paket **WAJIB** dari `LANDING_TIERS` (harga dibaca dari `PLANS`:
  109.000 / 129.000 / 299.000). **DILARANG** memakai angka export
  (99k/129k/249k), "Try free for 14 days", atau paket 2 akun Rp209.000 — semuanya
  tidak ada di produk.
- Toggle **Lifetime / Langganan** di export: produk hanya menjual akses selamanya
  (`BillingPeriod = 'lifetime'`, paket 84). Jangan bikin kontrol yang tidak
  mengontrol apa pun. Pilihan: tampilkan badge "Sekali bayar" tanpa toggle, atau
  toggle dengan hanya "Lifetime" yang berisi data nyata. Jelaskan keputusanmu.
- CTA kartu → `/checkout?plan=<id>` (cek dulu parameter yang benar-benar dibaca
  halaman checkout) atau pola CTA landing yang sudah ada. Jangan membuat alur bayar
  kedua atau menulis nominal di JSX.
- Kartu "Khusus Pasangan" (2 akun + Joint Wallet Rp209k) **tidak ada di produk**.
  Ganti dengan fakta nyata (Joint Wallet termasuk di Paket Waras) atau hapus.

### 4C. Section `#faq`

- Judul export: "FAQ" + "We have the answers" + subtitle template Inggris.
  Terjemahkan ke nada CatetInd (mis. "Jawaban yang sering ditanya") — jangan
  biarkan copy template Inggris lolos ke UI.
- **6 pertanyaan nyata** di export (semuanya berulang desktop/mobile):
  1. CatetInd itu sebenernya buat siapa sih?
  2. Bedanya sama aplikasi catatan keuangan lain apa?
  3. Harus ngerti keuangan dulu ngga sebelum pake ini?
  4. Ada versi gratis ngga? (jawaban export menyebut garansi 30 hari)
  5. Ini aplikasi web atau harus di-download? (PWA)
  6. CatetInd connect ke rekening bank otomatis ngga?
- Jawaban **jangan disalin mentah** dari template. Sumber yang sudah selaras
  produk: `FAQ_ITEMS` di `lib/data/landing.ts` (7 item, termasuk harga dari
  `PLANS`, kuota AI, refund, Midtrans, keamanan data). Pakai/adaptasi itu; kalau
  memilih jawaban export, verifikasi setiap klaim ke repo (terms/privacy,
  `PRICING_TRUST_BADGES`, `PLANS`) — jangan menambah janji baru.
- Tab kategori export (General / Forecasting / Setup & integrations / Security
  and privacy): hanya ada satu set pertanyaan nyata. Jangan render tab kosong
  atau mengarang isi. Kalau tab dipertahankan, isinya harus nyata.
- Accordion: satu item terbuka, `aria-expanded` + `aria-controls`, tombol
  `type="button"`, animasi tinggi/opacity yang hormat `prefers-reduced-motion`.
- Kartu "Let's connect / WhatsApp": **belum ada nomor WA nyata di repo**.
  JANGAN mengarang nomor. Pilihan jujur: tanya user nomornya, atau arahkan ke
  `mailto:support@catetind.com` / `/help` dengan label yang benar.
- Link `#testimonials`: `LP_NAV_LINKS` ("Review") dan `LP_FOOTER` ("Testimonials")
  menunjuk ke section yang **tidak ada** di export maupun live Framer. Putuskan:
  hapus link itu, atau arahkan ke section yang benar-benar ada. DILARANG
  mengarang testimoni/ulasan.

## 5. Aturan implementasi (mengikat)

- **Nol string user-facing di JSX.** Tambahkan copy baru ke `lib/data/landing.ts`
  sebagai konstanta `LP_MISSION`, `LP_PRICING`, `LP_FAQ` (mengikuti pola
  `as const` + tipe kecil), lalu komponen hanya merender.
- **Warna hanya token `lp-*`** (`bg-lp-surface`, `text-lp-ink`, `bg-lp-lime`, …).
  Jangan menulis hex/rgb mentah di komponen; palet sudah lengkap di
  `app/globals.css`.
- Tipografi: `font-lp` (Inter Tight) sudah dipasang di `<main>` halaman preview.
  Jangan mengubah font dashboard.
- Breakpoint: pakai varian `lp-tab:` (≥810px) dan `lp:` (≥1200px), mobile-first.
- Animasi masuk: `<LandingReveal y={…} delay={…}>` dengan `trigger="view"` untuk
  section di bawah lipatan; jangan menulis ulang spring Framer.
- Gambar: aset sudah ada di `public/landing/*.png` (termasuk varian
  `-512/-1024/-2048`). Jangan memanggil `framerusercontent.com`. Ikuti pola
  `<img>` yang dipakai hero; alt dekoratif `alt=""`, ringkasan di data.
- Komponen server by default; `'use client'` hanya untuk state/animasi
  (accordion, toggle harga bila ada).
- Jangan menyentuh: landing lama `/`, komponen dashboard, route AI/OCR (baru
  selesai), test lain. Jangan commit kecuali diminta.
- Jangan mengubah palet/token yang sudah ada. Kalau benar-benar butuh token baru,
  jelaskan alasannya di laporan.

## 6. Alur kerja yang diharapkan

1. **Ekstrak spesifikasi section.** `SECTION_BOUNDS` di
   `scripts/landing/extract-framer-spec.mjs` baru berisi `navbar`, `hero`,
   `footer`. Tambahkan `mission`, `pricing`, `faq`, `cta` (cari `<section ...>`
   dengan `id="mission"`, `id="pricing"`, `id="faq"`, dan `data-framer-name="CTA"`),
   lalu jalankan:
   - `pnpm landing:spec --section mission`
   - `pnpm landing:spec --section pricing`
   - `pnpm landing:spec --section faq`
   Hasil: `docs/landing/section-<nama>.css` + `.digest.txt` — di sinilah angka
   final (padding, gap, radius, ukuran font, warna) dibaca, bukan dikira-kira.
2. **Baseline visual.** Jalankan `pnpm dev`, buka `/preview-landing`, lalu:
   - `node scripts/landing/shoot.mjs http://localhost:3000/preview-landing b-awal`
   - `node scripts/landing/shoot.mjs https://reserved-calls-942581.framer.app live-b`
   Bandingkan desktop 1440, tablet 1024, mobile 390.
3. **Bangun per section** (mission → pricing → FAQ). Setelah tiap section:
   screenshot + `node scripts/landing/inspect.mjs` untuk elemen kunci, lalu
   perbaiki selisih.
4. Cek responsif: tidak ada horizontal scroll, gambar tidak gepeng, line break
   judul mendekati export.
5. Aksesibilitas: heading berurutan, anchor `#card-1..4`/`#pricing`/`#faq`
   berfungsi, accordion bisa dioperasikan keyboard, kontras teks cukup.
6. Perbarui dokumentasi & test, lalu jalankan validasi penuh.

## 7. File yang diperkirakan disentuh

- **Baru:** `components/landing/lp/mission.tsx` (heading + benefit tiles + feature
  cards), `components/landing/lp/pricing.tsx`, `components/landing/lp/faq.tsx`
  (accordion + kartu kontak). Pecah sub-komponen lokal bila satu file terlalu besar.
- **Diubah:** `app/preview-landing/page.tsx` (susun ulang urutan section),
  `lib/data/landing.ts` (konstanta copy baru + koreksi `LP_NAV_LINKS`/`LP_FOOTER`
  bila link `#testimonials` dihapus), `lib/data/landing.test.ts` (test data baru),
  `docs/landing/README.md` (status & catatan keputusan),
  `scripts/landing/extract-framer-spec.mjs` (SECTION_BOUNDS mission/pricing/faq/cta).
- **Jangan disentuh:** `app/page.tsx`, `components/landing/*` lama, `app/api/**`,
  `app/globals.css` (kecuali benar-benar perlu + jelaskan), file OCR/AI.

## 8. Validasi & Definition of Done

Wajib dijalankan dan hasilnya dilaporkan **apa adanya**:

1. `pnpm exec tsc --noEmit` — bersih.
2. `pnpm test` — baseline saat ini **90 file / 1246 test lulus**; jangan ada yang
   merah. Tambah test murni (node, tanpa DOM) untuk data baru, misalnya:
   - setiap `price` di `LP_PRICING` sama dengan `PLANS[].lifetime`;
   - setiap path gambar ada di `public/landing/`;
   - setiap item FAQ punya `question` & `answer` tidak kosong dan id unik;
   - tidak ada string template Inggris ("Makro", "Track your company progress")
     yang lolos ke data landing.
3. `pnpm build` — sukses.
4. `pnpm theme:audit` — tidak ada pelanggaran baru (warna via token).
5. Screenshot akhir: `node scripts/landing/shoot.mjs http://localhost:3000/preview-landing b-final`
   (plus `--only=desktop|tablet|mobile` bila perlu) dan simpan di `docs/landing/shots/`.
6. `docs/landing/README.md` diperbarui: Milestone B selesai (atau status jujur
   bagian mana yang tertunda), daftar keputusan (toggle harga, kartu pasangan,
   WhatsApp, `#testimonials`), dan sisa perbedaan visual yang diketahui.

## 9. Definisi selesai visual (acceptance)

- `/preview-landing` menampilkan urutan lengkap: hero → mission → pricing → FAQ →
  CTA → footer, tanpa merusak Milestone A.
- Tidak ada copy template Inggris / nama "Makro" / klaim atau harga karangan.
- Harga di layar = harga yang benar-benar ditagih (`PLANS`).
- Tidak ada kontrol mati (toggle/tab/link) dan tidak ada anchor yang menuju
  section yang tidak ada.
- Desktop 1440 mendekati export; tablet 1024 memakai varian `lp-tab`; mobile 390
  tidak pecah dan tidak ada horizontal scroll.
- Semua `#card-1..4`, `#pricing`, `#faq` bisa dituju dari navbar/footer.

## 10. Format laporan akhir

Tulis ringkas dan faktual:

1. **Selesai** — section/komponen apa, file apa.
2. **Keputusan** — toggle Lifetime/Langganan, kartu pasangan, WhatsApp,
   `#testimonials`, terjemahan copy template — beserta alasannya.
3. **Bukti** — path screenshot, output `tsc`, jumlah test, `build`, `theme:audit`.
4. **Belum selesai / risiko** — sebutkan jujur, jangan diklaim selesai.

## 11. Catatan tool chat (bukan bagian tugas)

Task sebelumnya berhenti karena provider menolak gambar di riwayat
(`messages[122].image[2]`). Di task ini **jangan melampirkan screenshot/foto ke
chat**; cukup baca file dari disk dan sebutkan path-nya di laporan. Ini tidak
berhubungan dengan kode landing dan tidak perlu "diperbaiki" di repo.



