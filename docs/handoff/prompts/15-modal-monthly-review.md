# 15 — Monthly Review & Target Setup

**Paket:** modal penuh (inventaris #i) · **Fase 6** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **1878–1918** — **Habit Loop 3: "Set dan Review Target Tabungan Bulanan"**
  (trigger tanggal 1–3, rutinitas, reward) — wireframe-nya ada di **1893+**
- **574–590** — **ambang data minimum** (savings rate butuh **10 transaksi + 1 pemasukan**,
  minimum periode 2+ minggu; sebelum itu WAJIB tampilkan kartu "aku masih belajar")
- **571–572** — DIAN: *"Jangan pernah berikan false insight. User Gen-Z alergi terhadap
  over-claiming… Kalau data sedikit, bilang aja lagi ngumpulin data."*
- **542–568** — nada micro-copy (teman yang suportif)
- **2141–2145** — CTA di zona ibu jari (bawah), bukan header

**Inventaris:** baris 105 (#i) — Panel 1 recap bulan lalu (total pemasukan/pengeluaran/
savings rate, target tercapai ✅/⏳, tanaman snapshot); Panel 2 set target bulan ini
(pre-filled dari bulan lalu, *"Mau coba hemat berapa?"*, quick-pick sinking fund);
CTA `"Let's go! 🌿"` atau `"Skip, nanti aja"`.

**Kode acuan:**

- `components/catetind/weekly-recap-modal.tsx` (985 baris) — **preseden utama**: modal
  penuh multi-panel dengan navigasi slide; tiru struktur & gayanya
- `components/catetind/annual-plan-modal.tsx` — pola modal penuh + tombol keputusan
- `lib/weekly-recap.ts` — bentuk data recap ringkas (`WEEK_DATA`, `WEEK_PLANT`)
- `lib/data/history.ts` — `summarizeTransactions()`, `topExpenseCategory()`, `maskMoney()`
- `lib/data/budget.ts` — `INITIAL_SINKING_FUNDS`, `monthlyNeeded()`, `fundPercent()`,
  `WALLET_SOURCES`, `TODAY_ISO`
- `components/catetind/home-banner.tsx` — pola `localStorage` untuk "muncul sekali"
- `components/catetind/plant-illustration.tsx` — snapshot tanaman

## Kenapa paket ini ada

Ini "ritual" bulanan produk: momen user berhenti sejenak dan **memutuskan** target
bulan baru. Nilainya bukan pada laporan (itu sudah ada di `/history`), tapi pada
**satu keputusan kecil yang mudah dilakukan** — karena itu panel 2 harus bisa
diselesaikan dalam < 20 detik dengan pilihan cepat.

Dua pagar psikologis yang menentukan baik/buruknya modal ini:

- **Jangan mengarang angka.** Kalau data bulan lalu tipis, tampilkan kartu sabar
  (PRD 571–586) — bukan savings rate hasil pembagian yang menyesatkan.
- **Jangan menuntut.** Kalau user menekan `"Skip, nanti aja"`, ia harus merasa
  tidak masalah. Tidak ada modal kedua, tidak ada toast menyindir.

## Yang harus dibangun

1. **`lib/data/monthly-review.ts`** (baru):
   - `interface MonthlyRecap { monthLabel, totalIncome, totalExpense, savingsRate,
     targetAchieved: boolean, plantStage }` + `TARGET_TRANSACTION_THRESHOLD = 10`.
   - `canShowRecap(recap)` / `recapReadiness()` → `{ ready: boolean; progressLabel: string }`
     (mis. `"[7/10 transaksi] untuk unlock ringkasan"`).
   - `shouldShowMonthlyReview(dismissedFor?: string, day = todayIso())` → hanya tanggal
     1–3 dan belum ditutup bulan ini.
   - `MONTHLY_REVIEW_COPY` — semua teks (judul, sapaan, label panel, CTA, kartu sabar).
2. **`components/catetind/monthly-review-modal.tsx`** (modal penuh, 2 panel):
   - **Panel 1 — Recap bulan lalu**: pemasukan, pengeluaran, savings rate, status target
     (✅ tercapai / ⏳ belum), snapshot tanaman. **Wajib pakai penanda privasi global**
     (`usePrivacy()`) untuk semua nominal.
   - **Panel 2 — Set target bulan ini**: nilai **pre-filled dari bulan lalu** (bisa
     dikurangi/ditambah), pertanyaan persis inventaris *"Mau coba hemat berapa?"*,
     quick-pick kontribusi celengan (pilih fund + nominal saran dari `monthlyNeeded()`).
   - **CTA**: `"Let's go! 🌿"` (simpan) dan `"Skip, nanti aja"` (tutup, sopan).
   - Kalau recap belum siap → tampilkan **kartu sabar** + progress, dan **tetap izinkan**
     user mengatur target (jangan memblokir keputusan hanya karena data tipis).
3. **Persistensi yang jujur (tanpa refactor besar)**:
   - Simpan hasil target di `localStorage` (pola `home-banner.tsx`), plus penanda
     "sudah dibuka bulan ini".
   - Tampilkan ringkasan target di Home sebagai kartu kecil (efek nyata, bukan tersimpan sunyi).
   - **Dilarang** membuat store global baru / menambal banyak berkas demi ini — kalau
     efek lintas halaman butuh itu, cukup tampilkan ringkasan di Home dan tulis
     alasannya di komentar (plus catat sebagai usul di laporan).
   - Quick-pick celengan **mengarahkan** ke `/budget` (atau membuka `ContributeSheet`
     yang sudah ada) — jangan menduplikasi logika setoran.
4. **Trigger**: auto-popup tanggal 1–3 saat Home dibuka + **cara membuka ulang secara
   manual** (mis. dari kartu target bulan ini di Home), supaya bisa ditinjau kapan saja.

## Acceptance criteria

- [ ] Modal hanya muncul tanggal 1–3 dan hanya sekali per bulan; ada jalan buka ulang manual.
- [ ] Semua nominal tersensor saat tombol mata privasi aktif.
- [ ] Jika data < 10 transaksi → **tidak ada** savings rate; yang tampil kartu sabar + progress.
- [ ] Target pre-filled dari bulan lalu, bisa diubah, dan tersimpan setelah `"Let's go! 🌿"`.
- [ ] `"Skip, nanti aja"` menutup tanpa nag dan tanpa jejak negatif.
- [ ] CTA di zona ibu jari; panel bisa diselesaikan < 20 detik.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menampilkan angka/klaim dari data yang belum memenuhi ambang (pelanggaran prinsip #2).
- Copy menyalahkan hasil bulan lalu ("kamu boros banget bulan ini").
- Membuat store/context global baru hanya untuk fitur ini.
