# 32 — Target Nabung Bisa Dijangkau dari Luar Home

**Paket:** melengkapi #29 butir 9 · **Fase 10** · **Depends on:** #29 & #15 (modal + hook sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (dilaporkan jujur oleh paket 29: CTA-nya hidup, labelnya belum sepenuhnya benar)

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/home-screen.tsx:117` + `:243` + `:304` | seluruh alur target bulanan hidup **hanya** di Home: hook `useMonthlyReview()` + `MonthlyTargetCard` + `MonthlyReviewModal` |
| 2 | `components/catetind/weekly-recap-modal.tsx:658-670` | kalau prop `onSetTarget` tidak dikirim (kasus `/history`), CTA berlabel **"Atur target nabung"** menjadi `Link href="/budget"` — tujuannya nyata, tapi **bukan** alur target |
| 3 | `components/catetind/history-screen.tsx` (pemanggil `WeeklyRecapModal`) | tidak mengirim `onSetTarget` ⇒ di `/history` label "Atur target nabung" mendarat di halaman yang tidak punya set-target |
| 4 | `lib/data/monthly-review.ts:436-439` | catatan arsitektur yang mengakui hal ini: *"kalau nanti `/budget` & `/history` perlu ikut menampilkan target bulanan, jalur termurah adalah memindahkan dua fungsi baca di bawah…"* |

Jadi ini sisa kecil tapi sejenis: **label menjanjikan satu hal, halaman tujuan menyediakan hal lain.**
Setelah paket 29 (nol kontrol mati), inilah bentuk "janji tak ditepati" yang tersisa.

## Peta baca

- **1749–1877** — Habit Loop 2: Review Mingguan ⇒ **target minggu/bulan berikutnya** (apa yang
  seharusnya terjadi setelah recap dibaca)
- **196–200** — bantuan kontekstual **di dalam** form; jangan mengirim user ke tempat lain untuk
  hal yang bisa dilakukan di tempat
- **542–568** — micro-copy per state (konfirmasi & sukses) — pakai nada yang sama
- **2141–2145** — CTA recap di zona ibu jari (jangan pindahkan CTA-nya, cukup benarkan tujuan)

**Kode acuan:**

- `hooks/use-monthly-review.ts` — state target (baca/tulis) yang sudah ada; **pakai ulang**
- `components/catetind/monthly-review-modal.tsx` + `monthly-target-card.tsx` — modal & kartunya
- `components/catetind/history-screen.tsx:358-368` — kartu pintu recap di `/history`
- `lib/data/monthly-review.ts:618-626` — copy toast & kartu target (semua teks dari sini)
- `lib/data/budget.ts` → `fundSuggestions()` — daftar celengan yang ditawarkan modal target
- `components/catetind/budget-screen.tsx` — pola halaman yang sudah memasang modal/sheet sendiri

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **§5.2 poin 2 — jangan pernah keluar "insight palsu".** Target adalah janji yang paling terasa
   efeknya (uang yang disisihkan), jadi jalur ke sana tidak boleh berujung di tempat lain.
2. **§5.4 — Zero cognitive load & 4-Tap Strict Rule.** User yang baru saja membaca recap di
   `/history` sudah ada di mood "menyusun rencana". Memaksanya pulang ke Home dulu = satu
   perjalanan yang tidak perlu (dan biasanya berhenti di tengah).
3. **§5.1 — audiens cicilan-hidup:** target bulanan adalah satu-satunya bagian app yang bicara
   tentang *masa depan*, bukan sisa hari ini. Membuatnya terkunci di satu halaman menurunkan
   peluang ritualnya terjadi sama sekali.

## Yang harus dibangun

Pilih **satu** dari dua jalan (jelaskan pilihanmu + alasan di komentar & laporan), lalu
selesaikan sampai kedua halaman konsisten:

- **Jalan A — target ikut hidup di `/history`.** `HistoryScreen` memasang `useMonthlyReview()`
  dan mengirim `onSetTarget` ke `WeeklyRecapModal` (recap ditutup dulu, lalu modal target dibuka
  — pola yang persis sama dengan `home-screen.tsx:123-132`). Ini jalur termurah menurut catatan
  `lib/data/monthly-review.ts:436-439`.
- **Jalan B — target jadi ritus `/budget`.** Pindahkan/hadirkan kartu target + modalnya di
  `/budget`, dan ubah fallback CTA recap menjadi tautan ke sana **dengan penanda URL** (pola
  `?tanam=1` / `?add=` dari paket 24 & 29) supaya modalnya benar-benar terbuka — bukan tautan
  yang berhenti di halaman.

Kewajiban untuk kedua jalan:

1. **Label & tujuan harus cocok.** Kalau CTA tetap berbunyi "Atur target nabung", yang terbuka
   harus benar-benar alur target. Kalau hanya bisa mengarah ke halaman lain, labelnya wajib
   jujur menyebut halaman itu — jangan biarkan label menjanjikan modal yang tidak muncul.
2. **Jangan ada dua sumber state target.** Tetap satu: hook `use-monthly-review.ts` (baca/tulis
   `localStorage`-nya sudah ada di sana). Jangan bikin store/context global baru.
3. **Jangan bikin modal kedua.** `MonthlyReviewModal` + `MonthlyTargetCard` dipakai ulang apa adanya.
4. **Copy baru (bila ada) ke `lib/data/monthly-review.ts`.** Nol string di JSX.
5. **Nol kontrol mati & nol overlay bertumpuk:** kalau sebuah modal membuka modal lain, tutup yang
   pertama lebih dulu (aturan yang sudah dipakai Home).

## Acceptance criteria

- [ ] Dari `/history`, CTA recap "Atur target nabung" benar-benar membuka alur target (atau
      membawa ke halaman yang membukanya otomatis) — dibuktikan lewat kode + route 200.
- [ ] Target yang disimpan dari halaman mana pun terbaca sama di kartu target Home
      (satu sumber: `use-monthly-review.ts`).
- [ ] Nol modal/store kedua; `MonthlyReviewModal` dipakai ulang.
- [ ] Tidak ada dua overlay terbuka bersamaan (recap ditutup dulu).
- [ ] Angka lain tidak bergeser: `DAILY_HUD` tetap `800000/4/200000/3600000/false`, dan HTML Home
      hasil prerender tetap `800.000×2 · 200.000×1 · "4 hari"×1`.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Memasang toast "segera tersedia" sebagai ganti alur target.
- Membuat halaman `/target` baru (menambah route di luar `inventaris_ui_definitif.md`).
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, Properti (PRD A12), dan tabel hutang.
- Mengubah angka target/tabungan demo yang sudah jadi patokan audit.

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: jalan mana yang dipilih + alasannya, file yang dibuat/diubah, bukti CTA
recap di `/history` berujung pada alur target, dan hasil ketiga perintah di atas.
