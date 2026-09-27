# 27 — Angka Budget yang Benar: Prorata Kewajiban Celengan per Periode

**Paket:** melengkapi `/budget` · **Fase 9** · **Depends on:** #26 (pool per window sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (keterbatasan yang dilaporkan jujur di task 26)

Setelah task 26, `income`/`spent`/`installments` sudah ikut window — **kecuali**
`sinkingObligation`, yang tetap **kewajiban bulanan penuh** (`SINKING_OBLIGATION_ALL`
= `sinkingObligationOf(INITIAL_SINKING_FUNDS)` = Rp 3.600.000).

Akibatnya tab **Mingguan** menampilkan jatah harian **Rp 742.100** untuk 1 hari sisa —
"benar menurut rumus", tapi tidak masuk akal untuk user (freelancer yang memilih minggu
justru melihat angka yang bukan uangnya minggu itu). Ini persis tipe angka yang bikin
user berhenti percaya pada pacing (PRD 655–681).

## Peta baca

- **655–681** — 2B.1 Daily HUD / **Pacing Limits**: rumus kanon
  (`available_pool = income − cicilan`, lalu dibagi sisa hari **periode**)
- **1146–1155** — DTI 2E → 2B: cicilan dipotong **sebelum** dibagi hari
- **809–865** — 2C.3 Sinking Fund (apa itu kewajiban bulanan & dari mana datangnya)
- **712–736** — 2B.3 edge case: dry spell & income masuk di tengah periode

**Kode acuan:**

- `lib/data/budget.ts` — `periodPool()`, `periodInstallments()` (task 26: sudah punya aturan
  **jatuh tempo → potong penuh / selain itu prorata per hari-bulan**), `INSTALLMENT_DUE_DAYS`,
  `sinkingObligationOf()`, `SINKING_OBLIGATION_ALL`, `computeDailyHud()`, `DAILY_HUD`
- `components/catetind/budget-screen.tsx` — pemanggil `computeDailyHud({ sinkingObligation, window })`
- `components/catetind/daily-hud-summary.tsx`, `daily-hud-card.tsx` — tampilan Home (JANGAN berubah)

## Yang harus dibangun

1. **`sinkingObligationFor(window)` di `lib/data/budget.ts`** — pakai **rumus prorata yang sama
   persis** dengan `periodInstallments()` (satu aturan, bukan aturan kedua):
   - window yang memuat tanggal "jatuh tempo" celengan → potong penuh;
   - selain itu → prorata per hari-bulan, dijumlahkan untuk window lintas bulan.
   - Kalau celengan tidak punya tanggal jatuh tempo yang bermakna, pakai prorata murni dan
     **tulis asumsinya di komentar** (ini keputusan produk yang paling mungkin direvisi).
   - Kalau rumusnya bisa diekstrak jadi satu helper bersama (mis. `prorateMonthly(amount, window, dueDays)`),
     lakukan — jangan menduplikasi logika.
2. **`computeDailyHud()` memakai kewajiban hasil prorata** saat `window` diberikan;
   **bulan kalender wajib tetap identik** (`DAILY_HUD` = `sinkingObligation: 3600000`).
3. **Home tidak boleh berubah** — `daily-hud-summary.tsx` / `daily-hud-card.tsx` tetap memakai
   `DAILY_HUD` (bulan kalender). Buktikan dengan membandingkan angka sebelum/sesudah.
4. **Rapikan selisih dua mock cicilan (laporkan, jangan ubah angka Home):**
   `lib/data/budget.ts` → `TOTAL_INSTALLMENTS = 800.000`, sedangkan
   `lib/data/wealth.ts` → `totalMonthInstallments(DEBTS)` = **1.070.000** (Kredivo 550k + SpayLater 520k).
   Tugasmu: sisir semua angka cicilan yang di-hardcode (`grep`), lalu pilih **satu konstanta kanon**
   + komentar yang menjelaskan (a) selisihnya, (b) apa yang harus dilakukan di produksi
   (turunan dari tabel debts). **Jangan** mengubah angka Home (`800.000`) — itu angka demo PRD 678;
   kalau kamu yakin harus berubah, laporkan sebagai usulan, jangan kerjakan.
5. **Edge case**: `available` tetap dijaga ≥ 0 (`Math.max(0, …)`); saat prorata membuat jatah 0 →
   state shortfall/dry spell tetap benar; tidak ada pembagian nol.
6. **Copy** tetap di `lib/data/budget.ts`; nol angka baru di JSX.

## Acceptance criteria

- [ ] Tab Mingguan menampilkan kewajiban celengan **prorata** (bukan 3.600.000) → jatah harian wajar.
- [ ] Tab Siklus Gajian memakai prorata untuk rentangnya (termasuk lintas bulan).
- [ ] Tab Bulanan & **Home identik** dengan sebelum task ini (`DAILY_HUD`: remaining 800.000 ·
      daysLeft 4 · dailyBudget 200.000 · sinkingObligation 3.600.000 · shortfall false).
- [ ] Aturan prorata celengan & cicilan memakai **satu helper**, bukan dua salinan logika.
- [ ] Semua angka cicilan yang di-hardcode terdaftar di laporan + satu konstanta kanon terdokumentasi.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Mengubah angka Home/bulanan (task ini hanya menyentuh periode non-bulanan).
- Menyalin rumus prorata jadi dua implementasi berbeda.
- Menyentuh `/wealth` (hutang) — cukup laporkan selisihnya.
