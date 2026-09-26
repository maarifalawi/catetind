# 24 — Tutup Tombol Mati & CTA Placeholder (sisa terakhir)

**Paket:** perbaikan kecil lintas halaman · **Fase 8** · **Depends on:** #21 (kuota sudah satu sumber)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (audit ulang setelah task 17–23 — tinggal 2 buah)

| # | Lokasi | Masalah |
|---|---|---|
| 1 | `components/catetind/home-banner.tsx:182-189` | Tombol **`Beli Add-On →`** (banner "Kuota AI-mu menyusut", muncul saat pemakaian > 70%) **tidak punya `onClick` sama sekali** — tombol mati di beranda |
| 2 | `components/catetind/insight-cards.tsx:67` | Insight `spending-spike` punya `actions: [{ label: 'Atur Limit Kopi' }]` **tanpa `href`** → jatuh ke `onAction`, dan `components/catetind/history-screen.tsx:238-241` masih membalas **toast** *"Aksi insight '…' segera tersedia."* |

Catatan penting: di file yang sama sudah ada komitmen tertulis
(`insight-cards.tsx:51`) — *"insight tanpa CTA = dead-end"* — dan PRD **2A.5**
mensyaratkan kartu savings-rate punya CTA nyata ke Sinking Fund/Reksadana (itu **sudah** benar).
Yang tersisa hanya satu aksi: **Atur Limit Kopi**.

## Peta baca

**PRD:**

- **570–593** — 2A.5 Insight/Alert System (termasuk resolusi: insight harus punya tindak lanjut)
- **4759–4900** — 5C Token AI & add-on (sumber aksi "Beli Add-On")
- **4892–4937** — Fuel Gauge: framing **sisa**, tanpa kata habis/limit, tanpa warna merah
- **178–191** — Home: banner kontekstual sebagai trigger (nudge di momen yang tepat)

**Kode acuan:**

- `components/catetind/top-up-modal.tsx` — modal beli add-on **sudah ada** & (setelah task 21)
  sudah membaca paket dari satu sumber kuota. **Pakai ulang, jangan bikin modal baru.**
- `components/catetind/billing-panel.tsx` — contoh pemanggil `TopUpModal` (tiru pola buka/tutupnya)
- `components/catetind/add-budget-sheet.tsx` — sheet tambah budget **dengan progressive disclosure**
  (kategori → limit); kategori dari `BUDGET_CATEGORY_OPTIONS` di `lib/data/budget.ts`
- `components/catetind/insight-cards.tsx` — `ActionButton` (baris 190–210) sudah mendukung
  **dua bentuk**: `href` (navigasi) dan `onAction` (callback) → pakai salah satu, jangan keduanya
- `lib/data/history.ts` — mock transaksi & kategori (untuk memetakan "Kopi" → kategori nyata)

## Kenapa dua hal ini penting

Keduanya adalah **janji yang tidak ditepati** tepat di momen paling sensitif:

1. Banner kuota muncul justru saat user **butuh** menambah token — dan tombolnya diam.
   (Kanon 5C: top-up harus terasa mudah, bukan ditahan.)
2. Insight "boros di Kopi" memberi tahu masalah **tanpa memberi jalan keluar** — ini
   persis pola yang PRD larang ("pujian/peringatan tanpa tindak lanjut = dead-end").

## Yang harus dibangun

1. **`Beli Add-On →` bekerja**: buka `TopUpModal` (reuse). Setelah "pembelian" berhasil
   (mock), kuota bertambah sesuai sumber tunggal kuota, dan banner kuota di Home ikut
   hilang/menyesuaikan (jangan biarkan banner bertahan padahal user baru beli).
   Tulis komentar bahwa pembayaran tetap mock (Midtrans nyata = di luar scope demo).
2. **`Atur Limit Kopi` bekerja**: buka `AddBudgetSheet` **dengan kategori sudah terpilih**
   (mis. `Makanan`, sesuaikan dengan kategori nyata di `lib/data/history.ts`) →
   user langsung di langkah nominal.
   - Tambahkan prop opsional `initialCategory?: string` di `add-budget-sheet.tsx`
     (backward compatible untuk `/budget`).
   - Simpan → budget baru muncul di state halaman `/history`? **Tidak ada state bersama** →
     pilih yang jujur: simpan ke `localStorage` (pola yang sudah dipakai repo) **atau**
     arahkan ke `/budget` dengan sheet terbuka. Tulis keputusanmu + alasannya di komentar.
   - **Hapus** `handleInsightAction` beserta toastnya di `history-screen.tsx` bila sudah
     tidak ada aksi yang memakainya (cek: semua aksi lain punya `href`).
3. **Sweep terakhir — buktikan nol tombol mati.** Jalankan dan laporkan hasilnya:
   ```bash
   grep -rn "segera tersedia\|segera hadir" components app lib
   ```
   Hasil yang diterima: **hanya** komentar/stale yang jelas bukan teks user-facing
   (mis. catatan "dulu ini toast segera hadir"), dan badge Properti di `/wealth`
   (`wealth-screen.tsx:389-392`) yang **memang** di luar V1 per PRD **A12**.
4. **Jangan menyentuh** harga paket langganan (keputusan pemilik produk — `ROADMAP-HALAMAN.md` §3).

## Acceptance criteria

- [ ] Klik `Beli Add-On` di Home → modal top-up terbuka (bukan tombol diam).
- [ ] Setelah top-up: sisa kuota bertambah dan banner kuota di Home menyesuaikan.
- [ ] Klik `Atur Limit Kopi` → sheet budget terbuka **dengan kategori terpilih**; simpan → budget tercatat.
- [ ] `grep "segera tersedia"` → **0 hasil**; `grep "segera hadir"` → hanya komentar non-UI + badge Properti.
- [ ] Nol tombol `<button>` di banner/insight yang tanpa `onClick`, `href`, atau `type="submit"` fungsional.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Membuat modal top-up kedua, atau menyalin harga/token di komponen.
- Menghidupkan Properti (di luar V1).
- Mengganti dead-end jadi toast/pesan baru — harus jadi aksi nyata.
