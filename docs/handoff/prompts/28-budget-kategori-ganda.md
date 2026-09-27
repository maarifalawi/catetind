# 28 — Insight → Budget: Jangan Sampai Kategori Ganda

**Paket:** melengkapi alur `/history` → `/budget` (dibuat task 24) · **Fase 9** · **Depends on:** #24

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (asumsi produk yang dilaporkan task 24 dan perlu ditutup)

Task 24 menyambungkan insight **"Atur Limit Kopi"** → `/budget?add=Kopi` → `AddBudgetSheet`
dengan kategori terpilih. Masalahnya: sheet itu selalu mode **TAMBAH**, sedangkan
`INITIAL_BUDGETS` (mock) **sudah punya** baris kategori `Kopi`.

Akibatnya: user menekan "Atur Limit Kopi" pada kategori yang limitnya sudah ada →
muncul **baris Kopi kedua**. Dua baris untuk kategori yang sama = limit jadi ambigu,
persentase pacing bercabang, dan user tidak punya cara menghapusnya dengan yakin.
Menambah data yang bertentangan dengan data yang sudah ada = pengalaman yang membuat
user berhenti percaya pada angka app (kanon "jujur di setiap klaim", PRD 244).

## Peta baca

- **641–711** — 2B. Variable Income Budgeting & pacing per kategori (satu limit → satu progres)
- **196–200** — pola yang patut ditiru: bantuan kontekstual **di dalam** form
- **542–568** — micro-copy per state (termasuk konfirmasi & sukses) — pakai nada yang sama
- **303–334 / 2A.1** — "Zero Cognitive Load": jangan membuat user memilih antara
  "tambah" vs "ubah" — sistem yang tahu bedanya

**Kode acuan:**

- `components/catetind/add-budget-sheet.tsx` — sheet budget (progressive disclosure:
  kategori → limit), sudah punya `initialCategory` dari task 24
- `components/catetind/budget-screen.tsx` — pemilik state `budgets` + jalur `?add=` (task 24)
- `components/catetind/budget-zone-a.tsx` + `budget-category-card.tsx` — tampilan limit & progres
- `lib/data/budget.ts` — `INITIAL_BUDGETS`, `BUDGET_CATEGORY_OPTIONS`, `categoryOptionOf()`,
  `BUDGET_ADD_PARAM`, `budgetAddHref()`
- `lib/data/history.ts` — kategori transaksi nyata (sumber kategori untuk insight)

## Yang harus dibangun

1. **Satu kategori = satu budget** (tetapkan sebagai aturan, tulis di komentar):
   tambahkan helper murni di `lib/data/budget.ts`, mis.
   `findBudgetByCategory(budgets, category)` + `budgetSheetMode(budgets, category)` →
   `{ mode: 'create' | 'edit'; existing?: BudgetItem }`.
2. **`AddBudgetSheet` mendukung mode edit limit** (backward compatible):
   - prop opsional baru (mis. `initialLimit?: number` dan/atau `mode?: 'create' | 'edit'`),
   - judul & CTA berubah: `"Buat Budget"` ⇄ `"Atur Ulang Limit"` / `"Simpan Limit"`,
   - nilai limit ter-prefill dari baris yang ada,
   - simpan di mode edit → **mengubah baris yang ada**, bukan menambah.
3. **`budget-screen.tsx` memutuskan mode** dari kategori yang datang via `?add=`:
   kategori sudah ada → sheet terbuka dalam mode edit; kategori baru → mode create.
   (Tulis di komentar: keputusan ini yang mencegah baris ganda.)
4. **Copy jujur + spesifik** di `lib/data/budget.ts`: toast berbeda untuk create vs edit
   (mis. *"Limit Kopi diperbarui 🌿"* vs *"Budget Kopi dibuat 🎉"*), label sheet, dan
   (opsional) satu baris konteks di sheet: *"Kategori ini sudah punya limit — ubah angkanya ya."*
5. **Jangan menyentuh** alur insight di `/history` (route/`href`-nya sudah benar) kecuali
   perlu menyesuaikan label CTA agar cocok untuk kedua kondisi (create/edit).
6. **Kalau kamu menemukan kebutuhan nyata** untuk dua budget pada kategori yang sama,
   **jangan diimplementasikan** — laporkan sebagai usulan (aturan "satu kategori satu budget"
   mengikuti tampilan `budget-category-card` yang membaca satu limit per kategori).

## Acceptance criteria

- [ ] Klik `Atur Limit Kopi` di `/history` (kategori sudah ada) → sheet berjudul **"Atur Ulang Limit"**, terisi limit lama; simpan → **limit baris itu berubah**, jumlah baris budget **tidak bertambah**.
- [ ] Kategori yang **belum** ada (uji dengan kategori lain dari insight) → tetap mode tambah dan baris baru muncul.
- [ ] `grep` tidak menemukan jalur lain yang bisa menambah budget dengan kategori duplikat dari data yang sudah ada.
- [ ] Toast & judul sheet membedakan create vs edit, semua teks dari `lib/data/*`.
- [ ] `/budget` biasa (tanpa `?add=`) tetap membuka sheet mode tambah kosong seperti sebelumnya (regresi nol).
- [ ] Angka Home & tab Bulanan tidak berubah.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Membiarkan dua baris budget dengan kategori sama.
- Membuat sheet/modal budget kedua (pakai `add-budget-sheet.tsx` dengan mode).
- Mengubah `INITIAL_BUDGETS` supaya "seolah" tidak ada duplikat (itu menyembunyikan masalah).
