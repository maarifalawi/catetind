# 26 — Pacing per-Periode: Pool Uang Ikut Window (bukan pool bulanan)

**Paket:** penyempurnaan modul Budget (dilaporkan sebagai keterbatasan di task 18) · **Fase 8** · **Depends on:** #18, #19

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (keterbatasan yang dilaporkan jujur di task 18)

> *"Pool uang pada tab Mingguan/Siklus tetap **pool bulanan** (yang berganti hanya panjang
> pembagi). Versi produksi idealnya men-scope pemasukan/pengeluaran per window."*
> — laporan task 18

Artinya: `MONTHLY_INCOME` / `TOTAL_INSTALLMENTS` / `SPENT_THIS_MONTH` di `lib/data/budget.ts`
masih konstanta **bulanan**, sementara `periodWindow()` (dari task 18) sudah mengganti
**panjang pembagi** saja. Untuk tab Mingguan, jatah harian jadi tidak realistis
(mis. `Rp 800.000/hari` karena sisa bulanan dibagi 1 hari) — padahal PRD 641–758 seluruhnya
dibangun untuk **income tidak tetap** yang berpikir per minggu/siklus gajian.

## Peta baca

**PRD:**

- **655–681** — 2B.1 Daily HUD / **Pacing Limits** — rumus intinya: `available_pool` dibagi
  jumlah hari **periode yang berjalan**
- **1146–1155** — integrasi DTI 2E → 2B: **cicilan dipotong dari income pool SEBELUM dibagi
  hari** (`available_pool = monthly_income − total_monthly_installments`). Ini yang harus
  dianalogikan untuk minggu/siklus.
- **712–736** — 2B.3 edge case: **dry spell** & **income masuk di tengah periode**
- **2282–2323** — Home: pacing bulan kalender (bukan diubah di task ini)

**Kode acuan (sudah ada dari task 18 & 19):**

- `lib/data/budget.ts` — `periodWindow()`, `MONTHLY_WINDOW`, `computeDailyHud({ window })`,
  `pacingOf()`, `DAILY_HUD`, konstanta bulanan (`MONTHLY_INCOME`, `TOTAL_INSTALLMENTS`,
  `SPENT_THIS_MONTH`, `HAS_INCOME_THIS_MONTH`), `periodIncome()`
- `components/catetind/spending-review-sheet.tsx` — panel review (task 19) memakai
  `periodIncome(MONTHLY_WINDOW)` → harus ikut ikut window aktif
- `lib/data/history.ts` — mock transaksi ber-tanggal `YYYY-MM-DD` (sumber pemasukan/
  pengeluaran per rentang) + helper tanggal (`localISODate`, filter rentang)
- `components/catetind/budget-zone-a.tsx` — tab periode + kartu HUD/pacing

## Yang harus dibangun

1. **Pool per window di `lib/data/budget.ts`** (logika murni, tanpa React):
   - `periodPool(window)` → `{ income, spent, installments, available }`:
     - `income` = Σ transaksi `type: 'income'` **di dalam** `[startISO, endISO]`
     - `spent` = Σ transaksi `type: 'expense'` di dalam window
     - `installments` = cicilan yang jatuh di window; **aturan sederhana yang ditulis di
       komentar**: cicilan bulanan **diprorata** berdasarkan jumlah window yang tumpang
       tindih dengan bulan berjalan (mis. 1 bulan = 4 minggu → ¼ per minggu), kecuali
       tanggal jatuh temponya tepat di window tersebut (dipotong penuh).
     - `available = income − installments` (kanon PRD 1154 — cicilan dipotong lebih dulu,
       dan **tidak boleh negatif**: pakai `Math.max(0, …)`)
   - `computeDailyHud({ window })` memakai `periodPool()` — bukan konstanta bulanan.
   - **Pertahankan** konstanta bulanan lama sebagai **fallback/dokumentasi** selama masih
     dipakai Home; jangan hapus sebelum semua konsumen pindah.
2. **Konsistensi menyeluruh**: `spending-review-sheet.tsx`, kartu HUD, dan banner
   over-budget memakai `periodWindow()` + `periodPool()` **yang aktif di tab itu** —
   jadi angka panel review = angka HUD di layar yang sama (AC yang sudah dipegang task 19).
3. **Edge case (wajib diuji)**:
   - **Dry spell** → tidak ada income di window ⇒ **pacing ditahan/hilang** + kartu khusus
     (kanon state XIII). Kalau cicilan > income, jangan tampilkan jatah negatif.
   - **Income masuk di tengah window** → jatah harian menyesuaikan **hanya untuk sisa hari**.
   - Window panjang 0 hari (guard pembagian nol) & window lintas bulan (mis. 28 Feb).
4. **Regression bulanan = identitas nilai.** Untuk `MONTHLY_WINDOW`, hasilnya harus **sama
   persis** seperti sebelum task ini. Pakai angka laporan task 18 sebagai patokan:
   `remaining 800000 · daysLeft 4 · dailyBudget 200000 · sinkingObligation 3600000 · shortfall false`
   dan Home tetap: `Rp 200.000 / Sisa bulan Rp 800.000 / 4 hari lagi`.
5. **Copy** tetap di `lib/data/budget.ts`; tidak ada angka baru di JSX.
6. **Catat asumsi prorata cicilan** di komentar (dan di laporan) — itu keputusan produk
   yang paling mungkin direvisi nanti.

## Acceptance criteria

- [ ] Tab Mingguan memakai pemasukan & pengeluaran **minggu itu saja** (bukan bulanan) — bukti cocokkan dengan Σ transaksi rentang minggu tersebut.
- [ ] Tab Siklus Gajian memakai rentang siklus (mis. 25 Sep – 24 Okt), bukan bulan kalender.
- [ ] Tab Bulanan **identik** dengan nilai sebelum task ini (angka patokan di atas).
- [ ] Home (bulan kalender) **tidak berubah** sama sekali.
- [ ] Dry spell: pacing hilang/ditahan, tidak ada jatah negatif, CTA `[+ Catat Pemasukan]` tetap ada.
- [ ] Panel Review (task 19) menampilkan angka yang sama dengan HUD pada tab yang sama.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Membuat sumber transaksi baru/mock kedua (pakai `lib/data/history.ts` yang sudah ada).
- Menghapus konstanta bulanan yang masih dibaca Home sebelum diganti.
- Mengubah angka di Home (task ini hanya menyentuh periode non-bulanan).
