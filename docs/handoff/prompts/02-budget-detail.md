# 02 — Celengan / Sinking Fund Detail

**Route:** `app/budget/[id]/page.tsx` · **Inventaris:** #25 · **Fase 1** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **809–865** — 2C.3 Sinking Fund Tracker: AC, form progressive disclosure, **metafora tanaman**, copy notifikasi nurturing
- **836–849** — tabel tahap tanaman (Seed → Full bloom) + badge copy per tahap
- **857–861** — contoh notifikasi: hampir tercapai, jauh dari target, tercapai, telat 2 minggu
- **1919–2034** — sistem tanaman (HP, tahap, milestone) sebagai rujukan visual & copy
- **2141–2145** — CTA primer di bawah (zona ibu jari)

**Inventaris:** baris 71 (#25) — "progress bar besar, riwayat kontribusi,
auto-kalkulasi 'nabung Rp X/bulan biar tercapai tepat waktu', projected completion
date, tombol Setor, Lottie plant animation".

**Kode acuan:**

- `components/catetind/budget-screen.tsx` — `handleOpenFund()` (~baris 219) yang **sekarang masih toast**; inilah yang harus diubah jadi navigasi
- `components/catetind/budget-zone-b.tsx`, `sinking-fund-card.tsx` — kartu celengan di halaman induk
- `components/catetind/contribute-sheet.tsx` — sheet "Setor" yang sudah ada (dipakai ulang, jangan bikin baru)
- `components/catetind/plant-illustration.tsx`, `plant-widget.tsx` — visual tanaman yang sudah ada (**tanpa Lottie** — pakai ini)
- `lib/data/budget.ts` — `SinkingFundItem`, `fundPercent()`, `monthlyNeeded()`, `monthsUntil()`,
  `formatDeadline()`, `plantStageFrom()`, `PLANT_STAGES`, `PLANT_STAGE_INDEX`,
  `priorityStyle()`, `WALLET_SOURCES`, `maskNominal()`, `TODAY_ISO`
- `components/catetind/privacy-provider.tsx` — `usePrivacy()`

## Kenapa halaman ini ada

Halaman ini adalah **momen emosional** produk, bukan halaman administrasi. PRD
menulisnya sebagai user story: *"sebagai anak yang menabung untuk biaya operasi mama,
saya ingin melihat progress dengan visualisasi yang memotivasi, sehingga saya tetap
semangat menabung meskipun targetnya masih jauh"* (PRD 811–812).

Psikologi yang berlaku (CONTEXT-WAJIB §5):

- **Tanaman = pengganti angka streak.** User harus merasakan kemajuan lewat visual
  (tahap tanaman + copy tahap), bukan lewat angka yang menghakimi.
- **Jangan menghukum keterlambatan.** Copy telat wajib persis nada PRD 861:
  *"Gapapa, mulai lagi kapan aja ya — kecil-kecilan juga gak masalah 🤍"*
- **Kontribusi terasa ringan.** Auto-kalkulasi harus menampilkan angka **per bulan**
  dan, bila deadline dekat, per minggu — supaya tidak terasa mustahil.

## Yang harus dibangun

1. **Route tipis** `app/budget/[id]/page.tsx` — `params: Promise<{ id: string }>`,
   cari fund di `INITIAL_SINKING_FUNDS` by `id`, `notFound()` bila tidak ada,
   `metadata` judul dinamis.
2. **`components/catetind/goal-detail-screen.tsx`** (pakai `ScreenShell`), isi:
   - **Header**: kembali ke `/budget`, nama celengan, pill prioritas (`priorityStyle`),
     deadline (`formatDeadline`), tombol mata privasi global.
   - **Hero progress**: tanaman (dari `plant-illustration`) + persentase besar `font-display`
     + bar progres + **badge copy per tahap** dari PRD 838–844
     ("Baru ditanam" / "Mulai tumbuh!" / "Tumbuh subur!" / "Hampir mekar!" / "TERCAPAI! 🎉").
   - **Auto-kalkulasi**: `monthlyNeeded()` → *"Kamu perlu nabung **Rp X/bulan** biar tercapai tepat waktu"*
     + **tanggal proyeksi tercapai** (hitung dari kontribusi rata-rata mock; jelaskan asumsinya
     di komentar) + `monthsUntil()` sisa bulan.
   - **Riwayat setoran**: daftar kontribusi (tanggal, nominal, dompet sumber) — data mock baru
     di `lib/data/budget.ts`; komentar arah produksi tabel `sinking_fund_contributions`.
   - **Tombol `Setor`** → pakai `ContributeSheet` yang sudah ada (`contribute-sheet.tsx`),
     dan pastikan progress + riwayat ikut berubah setelah setor.
   - **State tercapai (100%)**: full bloom + confetti sederhana (CSS/Framer Motion,
     hormati `prefers-reduced-motion`) + CTA `"Buat target baru"`.
   - **State terlambat** (belum setor ≥2 minggu): kartu nudge pakai copy PRD 861 — sekali saja,
     tidak mengulang.
   - **Empty state riwayat**: copy nurturing + CTA Setor.
3. **Wiring**: ubah `handleOpenFund()` di `budget-screen.tsx` dari `toast(...)` menjadi
   `router.push('/budget/' + fund.id)`; hapus toast "Halaman detail celengan segera hadir".
4. **Data**: tambah `FUND_CONTRIBUTIONS` + `projectedCompletion()` + konstanta copy di
   `lib/data/budget.ts` (jangan bikin file data baru — domainnya sama).

## Copy & tone

Semua copy tinggal di `lib/data/budget.ts` sebagai konstanta. Nada WAJIB:
ringan, memotivasi, tanpa menyalahkan. Contoh: nudge telat = PRD 861;
hampir tercapai = *"Dikit lagi! Tinggal kurang Rp500.000 dari target 💚 Kamu hebat udah sampai sini."*

## Acceptance criteria

- [ ] `/budget/<id-fund>` terbuka dengan fund yang benar; id salah → `notFound()`.
- [ ] Badge tahap cocok dengan persentase (uji 20% / 40% / 60% / 80% / 100%).
- [ ] Auto-kalkulasi per bulan benar secara matematis: `(target − terkumpul) / sisa bulan`.
- [ ] Setor dari halaman detail benar-benar menambah progress + muncul di riwayat.
- [ ] Nominal tersensor saat tombol mata aktif.
- [ ] CTA `Setor` di zona ibu jari (sticky bawah).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menambah dependency animasi baru (repo ini tanpa Lottie — pakai SVG/CSS/Framer Motion).
- Menghitung ulang persentase sendiri; pakai `fundPercent()` dari `lib/data/budget.ts`.
- Menyalin-tempel angka target dari JSX; semua dari data.
