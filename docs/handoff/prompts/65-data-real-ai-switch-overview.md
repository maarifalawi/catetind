# Paket 65 — Tuntas: data real (demo lewat store), semua transaksi ke ledger, AI benar-benar mencatat, switch konteks, & Ringkasan Saldo

> **Cara pakai:** jalankan seluruh instruksi di file ini sebagai SATU paket. Jangan
> berhenti di tengah; kalau ada yang tidak bisa diverifikasi (butuh browser),
> tulis apa adanya di laporan akhir. Kerjakan semua tugas A–F + DoD.

---

## 0. Konteks — apa yang SUDAH selesai (jangan diubah lagi)

Perbaikan sebelumnya sudah masuk & hijau (`tsc` bersih, 807 test lulus, `pnpm build` sukses):

1. **Field "Mau tercapai kapan?"** di `components/catetind/add-goal-sheet.tsx` sudah bisa diklik (`showPicker()`).
2. **Popup dompet** (`components/catetind/overview-panel.tsx`): judul & subjudul sudah Bahasa Indonesia, panel di desktop sudah **tengah** (dialog). `income-card.tsx` sudah menerima data nyata (bukan angka keras), `balance-ring.tsx` trennya dihitung dari ledger.
3. **Filter konteks di Dashboard**: kartu Arus Uang (`cash-flow-card.tsx`), Distribusi (`expense-distribution-card.tsx`), Transaksi Terakhir (`recent-transactions-card.tsx`), dan Jatah Hari Ini (`daily-hud-card.tsx`) sudah menyaring `useMoneyContext`, lewat helper `homeMoneyRowsForContext`/`recordedTransactionsForContext` di `lib/money/context-filter.ts`.
4. **Setoran celengan** sudah menulis baris ledger `saving` (di `components/catetind/budget-screen.tsx`, `handleContribute`).
5. **Gerbang seed** `lib/demo.ts`: `SHOWS_SAMPLE_DATA = DEMO_MODE || NODE_ENV === 'test'` → `pnpm dev` & produksi **kosong**; demo hanya dengan `NEXT_PUBLIC_DEMO=1`.
6. **Layout Riwayat & Insight** (`components/catetind/history-screen.tsx`): urutan **Filter Global → Heatmap → Ritual bulanan → Catatan → Skor → Insight**.

Kalau perubahan paket ini menyentuh poin 1–6, JANGAN merusak perilakunya.

---

## 1. Aturan main WAJIB (kanon repo — dibaca dulu)

Baca `docs/handoff/CONTEXT-WAJIB.md` dan patuhi:

- **Copy user-facing TIDAK ditulis di JSX.** Semua string tinggal di `lib/data/*`. Komponen hanya menyusun tampilan.
- **Satu sumber kebenaran.** Jangan bikin store/bus/daftar kedua. Saldo = `opening + Σ baris ledger` (`lib/money/store.ts` + `lib/money/ledger.ts`). Satu pintu tulis uang = `lib/money/store.ts` (atau `lib/transaction-bus.ts` untuk catatan transaksi).
- **Jujur di setiap klaim** (PRD 244). Dilarang menampilkan/menuliskan angka atau aksi yang tidak benar-benar terjadi. Dilarang tombol mati. Dilarang mengarang data.
- **Data real, tanpa seed.** Data contoh hanya boleh hidup di balik `NEXT_PUBLIC_DEMO=1` atau di TEST.
- **Privasi (§5.7):** nominal yang DIBACA disensor lewat `money()`/`<LockedAmount/>`; nominal yang SEDANG DISUNTING tidak disensor.
- **`prefers-reduced-motion`** dihormati untuk animasi baru.
- **Aksesibilitas:** kontrol klik minimal `<button>`/`role`+`aria-*`; label Bahasa Indonesia jelas.
- **Test dulu, baru klaim.** Logika baru WAJIB ada test murni di `lib/**/*.test.ts`.
- **Gerbang laporan:** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build` semua hijau.

---

## 2. TUGAS A — Akun demo = DATA REAL lewat store (bukan konstanta)

### Masalah
Data contoh masih berupa **konstanta yang di-inject** ke semua store (wallet, kekayaan, celengan, tagihan, joint, riwayat, home-money). Karena itu ia tidak persisten, tidak editable, dan tidak konsisten. Yang diminta: untuk **akun demo yang sedang berjalan**, datanya harus **benar-benar ditulis lewat API store** (jalur tulis yang sama dengan data user) sehingga real: persisten di IndexedDB, bisa diedit/dihapus, muncul di semua halaman karena memang baris sungguhan.

### Akar
- `lib/demo.ts` → `SHOWS_SAMPLE_DATA` (gerbangnya sudah benar).
- Konstanta seed yang di-inject saat `SHOWS_SAMPLE_DATA` true:
  - `lib/wallets.ts` → `WALLET_SEED` (dipakai `app/api/wallets/store.ts` `seedWallets()` + hidrasi `mergeMoneySnapshot` di `lib/money/store.ts`).
  - `lib/money/wealth-store.ts` → `SEED_INVESTMENTS`, `SEED_DEBTS`, `SEED_PAYMENTS`.
  - `lib/money/funds-store.ts` → `SEED_FUNDS`, `SEED_CONTRIBUTIONS`.
  - `lib/money/bills-store.ts`, `lib/money/joint-store.ts` (cek masing-masing).
  - `lib/data/history.ts` → `HISTORY_TRANSACTIONS`; `lib/data/home-money.ts` → `HOME_MONEY_*`; `lib/data/wallet-detail.ts` → `WALLET_DETAIL_TRANSACTIONS`.

### Yang harus dibangun
1. **Jalur "boot demo"** (khusus `NEXT_PUBLIC_DEMO=1`, idempoten):
   - Buat modul, mis. `lib/money/demo-bootstrap.ts`, berisi `seedDemoDataOnce()`.
   - Menulis data contoh **lewat API tulis asli**: dompet via `addWalletAccount()`/`addPoolWallet()`, transaksi via `postTransaction()`/`postExpense`/`postIncome`, celengan via `addFund()` + `contributeToFund()`, tagihan via `lib/money/bills-store.ts`, kekayaan via `lib/money/wealth-store.ts`, joint via `lib/money/joint-store.ts`.
   - Penanda idempotensi (mis. `catet-ind-demo-seeded` di localStorage/IndexedDB) supaya tidak menumpuk tiap reload.
   - Dipanggil sekali dari mount klien (mis. provider/`ScreenShell`/layout dashboard) HANYA saat `DEMO_MODE`.
2. **Putuskan nasib konstanta seed:** boleh tetap ada sebagai **bahan bootstrap demo** & **bahan test**, tapi **tidak boleh lagi di-inject langsung** ke state store sebagai "milik user" di jalur non-demo. Hapus cabang `SHOWS_SAMPLE_DATA ? SEED : []` yang mengisi state awal; state awal SELALU kosong, diisi lewat `seedDemoDataOnce()` saat demo.

### Acceptance criteria
- [ ] `grep SHOWS_SAMPLE_DATA` → hanya `lib/demo.ts` yang mendefinisikannya; sisanya tidak meng-inject state awal.
- [ ] Tanpa env: `wallet`, `wealth`, `budget`, `bills`, `joint`, `history`, Home → semua empty state jujur, nol angka contoh.
- [ ] Dengan `NEXT_PUBLIC_DEMO=1`: data muncul lewat store (hapus di Riwayat → hilang di semua halaman; edit → berubah di semua halaman; refresh → tetap).
- [ ] Test: `seedDemoDataOnce()` idempoten (dipanggil 2x tidak menggandakan).

---

## 3. TUGAS B — SETIAP transaksi dari fitur apa pun WAJIB tercatat di ledger

### Masalah
Pemilik produk: "gua mau SETIAP transaksi dimanapun, itu ke record di sistemnya." Sebagian alur menggerakkan uang hanya di store-nya sendiri (tidak menulis baris ledger), jadi tidak muncul di "Transaksi Terakhir"/Riwayat dan saldo dompet tidak bergerak.

### Sudah beres
- Celengan di `budget-screen.tsx` (menulis `saving`).
- Tagihan: `markBillPaid` → `postExpense` (`lib/money/bills-store.ts`).
- Hutang/piutang: `postDebtSettlement` (`lib/money/store.ts`).
- Kalender: lewat `useTransactionSubmit` (`hooks/use-transaction-submit.ts`).

### Yang HARUS diaudit & disambungkan
Telusuri tiap alur tulis dan pastikan yang menggerakkan uang menulis baris ledger lewat SATU pintu:
1. **Setoran celengan dari SEMUA pintu** — `budget-screen.tsx` DAN `goal-detail-screen.tsx` (keduanya `contributeToFund`), plus `monthly-review-modal.tsx` (setoran target) dan `sweep-sheet`/`sweepIntoFund`.
   - **Rekomendasi kuat:** pindahkan penulisan baris ledger `saving` KE DALAM `contributeToFund()` + `sweepIntoFund()` di `lib/money/funds-store.ts` (bukan di UI), supaya semua pemanggil tercatat. Cek tidak ada import cycle (`funds-store` → `store` → tidak balik).
2. **Investasi** (beli/jual, RDN) — `components/catetind/add-investment-sheet.tsx` + `lib/money/wealth-store.ts`. Kalau menyentuh dompet kas, tulis baris ledger (debit/kredit) lewat `postExpense`/`postIncome`/`postTransaction`.
3. **Properti / Aset Fisik** — `components/catetind/add-physical-asset-sheet.tsx` + `lib/money/physical-store.ts`.
4. **Koreksi/ubah aset kekayaan** — halaman edit di `wealth-*`.
5. **Joint wallet** — `lib/money/joint-store.ts` + `joint-screen.tsx` (kalau menyentuh kas pribadi, pakai `postTransfer`/`postTransaction`).
6. **Onboarding transaksi pertama** — `components/catetind/onboarding-step-first-transaction.tsx`.
7. **Review pengeluaran bulanan / sapu bersih** — kalau menambah setoran celengan, ikut aturan #1.

Jaga kanon: kalau uang keluar dari dompet, HARUS ada baris ledger; kalau memang tidak menyentuh kas (mis. menaikkan valuasi aset), JANGAN tulis baris kas (jangan mengarang pengeluaran).

### Acceptance criteria
- [ ] Transaksi dari SETIAP alur di atas → muncul di "Transaksi Terakhir" (Home) & Riwayat.
- [ ] Saldo dompet yang terlibat berubah konsisten (`opening + Σ baris`); total kas tidak bocor/dobel.
- [ ] `assertLedgerInvariant` lolos untuk semua jalur baru (tambah test).
- [ ] Tidak ada alur tulis uang yang bypass `lib/money/store.ts`.

---

## 4. TUGAS C — Selidiki & bereskan sumber "8 dompet / Rp 3.600.000"

### Gejala
Setelah semua dompet dihapus, halaman Dompet & Akun masih menampilkan "**Total Saldo Rp 3.600.000 · 8 dompet aktif**" + komposisi "Uang Cair Rp 3.600.000 / Aset Ditahan Rp 0" + "Dompet Pribadi: Rp 500.000". Angka ini **tidak sama** dengan seed bawaan (`WALLET_SEED` = 3 dompet / Rp 1.850.000), jadi ada **sumber data lain** yang mengisi 8 dompet.

### Yang harus dilakukan
1. Setelah Tugas A (state awal selalu kosong) dikerjakan, jalankan dengan akun benar-benar bersih (tanpa `NEXT_PUBLIC_DEMO=1`) dan cek apakah angka itu masih muncul.
2. Kalau MASIH muncul, lacak sistematis:
   - `app/api/wallets/route.ts` + `app/api/wallets/store.ts` (jalur server).
   - `app/api/wallets/[id]/route.ts`.
   - `lib/money/store.ts` hidrasi/merge (`mergeMoneySnapshot`, `mergeWithRemote`, `readRemoteMoney`, `migrateLocalDataToServer`) — pastikan data lama di IndexedDB/localStorage/remote tidak "bangkit".
   - `lib/supabase/money-remote.ts` + `lib/supabase/domain-mappers.ts`.
   - IndexedDB lama (key dompet) yang belum dibersihkan saat purge.
3. Perbaiki akarnya. Kalau data menumpuk di storage lokal pengguna, sediakan jalur bersih (`purgeMoneyStore()` + hapus key IndexedDB terkait) dan pastikan tidak ada yang mengisi ulang.
4. Tulis temuan + bukti (angka sebelum/sesudah, atau test) di laporan.

### Acceptance criteria
- [ ] Akun baru/bersih: Dompet & Akun menampilkan **0 dompet**, Rp 0, tanpa baris konteks.
- [ ] Setelah hapus semua dompet: tetap 0 setelah refresh & pindah halaman.
- [ ] Tidak ada sumber kedua yang menambah dompet selain aksi user.

---

## 5. TUGAS D — AI Coach harus MENCATAT beneran & pakai DATA REAL (bukan template)

### Gejala (pemilik produk)
> "gua habis makan 50k, catet ya"
> → "Siap, Jon! Pengeluaran makan Rp 50.000 sudah aku catat ya. Sisa jatah hari ini jadi Rp 100.000..."
> Tapi **tidak ada transaksi** yang masuk, **tidak ada saldo** yang berubah, dan kalau diulang jawabannya **sama** (jatah masih 100k). ⇒ balasan template/halusinasi.

### Akar (sudah dipastikan)
- `app/api/ai/text/route.ts` memanggil `generateText({ system: COACH_SYSTEM_PROMPT, turns })` — **tidak mengirim ringkasan data user** dan **tidak punya kemampuan mencatat**. Sementara `lib/ai/prompts.ts` (COACH_SYSTEM_PROMPT) menulis "Kamu menerima ringkasan data user (...) sisa jatah harian" → model MENGARANG angka.
- `lib/ai-chat.ts`:
  - `PROACTIVE_WELCOME` = template keras ("Sisa jatah kamu hari ini Rp 150.000", "Kopi minggu ini naik 35%").
  - `MOCK_LIMIT_REPLY`, `MOCK_SPENDING_REVIEW_REPLY`, `MOCK_APPRECIATION_REPLY` = balasan kalengan.
- `hooks/use-ai-chat.ts` `aiReply()` = router aturan lokal yang mengembalikan `MOCK_*`.
- `components/catetind/ai-chat-widget.tsx`: pesan **ketikan** → `sendMessage()` → `/api/ai/text` (tidak pernah mencatat). HANYA scan struk/voice yang lewat `useTransactionCapture` (yang benar-benar menulis via `recordTransaction`).

### Yang harus dibangun
1. **Grounding data.** Kirim ringkasan data NYATA dari klien ke `/api/ai/text` (atau hitung di server): pemasukan & pengeluaran bulan ini, kategori teratas, **sisa jatah harian** (`computeDailyHud`), jumlah dompet + total saldo, hutang aktif, progres celengan. Sisipkan ke prompt sistem/turn. Model DILARANG menyebut angka jatah/saldo yang tidak ada di ringkasan itu.
2. **AI benar-benar mencatat.** Untuk pesan berupa ucapan transaksi ("makan 50k", "catet ya", "nabung 200 ribu"):
   - Deteksi intent transaksi → ekstraksi terstruktur (pakai `EXTRACTION_SYSTEM_PROMPT`/`normalizeExtraction` di `lib/ai/extract.ts` — sudut yang SAMA dengan voice/OCR).
   - Tampilkan **kartu konfirmasi** yang sama dengan `AICaptureBubble` (field bisa diedit), lalu saat user menekan "Catat ✓" → `recordTransaction()` → baris BENAR-BENAR masuk Riwayat & saldo berubah → balasan AI menyebut angka NYATA sesudahnya (jatah harian baru dari `computeDailyHud`).
   - JANGAN pernah menjawab "sudah aku catat" sebelum `recordTransaction()` benar-benar mengembalikan transaksi.
3. **Jaring aman jujur.** Kalau provider tak tersambung / tak yakin, AI boleh menjawab dari aturan lokal — TAPI: angka HARUS dari data lokal nyata (bukan konstanta); beri label `ruleBased: true` (mekanismenya sudah ada) dan **jangan** mengklaim aksi yang tak dilakukan.
4. **Kalau user minta "catat" tapi ada yang kurang** (nominal/kategori/dompet), AI menanyakan singkat lalu tetap lewat jalur konfirmasi yang sama.
5. **Hapus/turunkan semua template palsu**: `PROACTIVE_WELCOME` dihitung dari data real (sapaan + sisa jatah harian + satu temuan nyata); `MOCK_*` tidak boleh lagi berisi angka/klaim finansial karangan — kalau perlu contoh, tandai jelas sebagai contoh.
6. **Refleksi real-time.** Setelah pencatatan sukses, kartu Jatah Hari Ini di Home ikut berubah (via store) — buktikan.

### Acceptance criteria
- [ ] "gua habis makan 50k, catet ya" → kartu konfirmasi → setelah konfirmasi: baris muncul di Riwayat & "Transaksi Terakhir", saldo dompet turun, balasan AI menyebut **sisa jatah harian baru yang benar** (dari `computeDailyHud`).
- [ ] Mengulang prompt sama TIDAK menghasilkan angka jatah yang sama ⇒ mencerminkan state terkini.
- [ ] Sapaan pembuka memakai angka NYATA (bukan "Rp 150.000"/"Kopi naik 35%").
- [ ] AI tidak pernah mengklaim aksi yang tidak dieksekusi (uji: provider dimatikan → balasan lokal jujur & tak mengklaim mencatat).
- [ ] Test murni untuk: deteksi intent, mapping hasil ekstraksi, pembentukan ringkasan data.

---

## 6. TUGAS E — Switch "Pribadi/Keluarga/Bersama" KEPOTONG → dropdown di samping search

### Gejala
Di dashboard, tombol switch menampilkan label terpotong: "Kelua...", "Bersam...".

### Akar
`components/catetind/context-switcher.tsx`: grid 3 kolom + `truncate`, jadi pada lebar sempit label panjang terpotong. Dipakai dengan `w-[262px]` di `home-screen.tsx` (desktop) dan `max-w-[320px]` default; plus dipasang di banyak header halaman.

### Yang harus dibangun (opsi yang diminta pemilik produk)
Jadikan **dropdown/pill-menu yang menarik**, ditempatkan **di samping kolom search transaksi** (`home-screen.tsx`, form search di sekitar baris 236).
- Buat komponen baru (mis. `components/catetind/context-menu.tsx`) ATAU mode baru di `context-switcher.tsx` (`variant="menu"`).
- Trigger menampilkan konteks aktif (ikon + label penuh, TIDAK terpotong) + chevron; menu (Vaul sheet di mobile / popover di desktop) berisi 3 opsi dengan ikon, label penuh, tanda centang pada yang aktif. Animasi halus, `prefers-reduced-motion` dihormati, `role="listbox"`/`aria-*` benar, `Esc` menutup.
- Letakkan di samping search di Home (desktop) dan tetap mudah dijangkau di mobile (mis. samping search bila search tampil, atau posisi yang jelas).
- Ganti pemakaian `ContextSwitcher` di header dashboard (dan tempat relevan) dengan varian baru; pastikan **label tak pernah terpotong** dan state tetap `useMoneyContext()` yang sama.

### Acceptance criteria
- [ ] Tidak ada label terpotong ("Kelua…") di lebar mana pun yang didukung.
- [ ] Menu/dropdown di samping search, bisa dibuka dengan keyboard, `Esc` menutup, opsi aktif ditandai.
- [ ] Mengganti konteks dari menu benar-benar mengubah Arus Uang/Distribusi/Transaksi Terakhir/Jatah Hari Ini.
- [ ] Komponen lama: pilih satu — dipertahankan sebagai varian, atau dihapus kalau tak dipakai (jangan tinggalkan kode mati).

---

## 7. TUGAS F — "Ringkasan Saldo" (popup dompet): desain & ukuran lebih maksimal

### Masalah
Popup Ringkasan Saldo (`components/catetind/overview-panel.tsx`) perlu dirapikan lagi — ukuran & tata letaknya belum nyaman dibaca. Diminta: "dibuat lebih maksimal agar nyaman dilihat".

### Konteks kode
- `overview-panel.tsx` (shell dialog + donat + kartu pemasukan), `balance-ring.tsx` (donat), `income-card.tsx` (kartu pemasukan).
- Ukuran desktop dikunci `lg:w-[440px]`, `lg:max-h-[85vh]`; mobile `max-h-[92dvh]`.

### Yang harus dibangun
- Rapikan **hierarki visual & ukuran**: lebar desktop lebih lega (mis. ~480–520px), padding/ritme konsisten, tinggi tidak melar.
- Donat saldo: proporsional, angka utama fokus, tanpa ruang mati. Badge tren nyata tetap ada.
- Kartu Pemasukan: rapikan header, bulan nyata, badge persen (nyata), bar 6 bulan; empty state jujur rapi.
- Tidak ada scroll canggung, teks terpotong, atau overflow; aman di mobile (`dvh`); konsisten dengan bahasa visual sheet lain (`budget-sheet.tsx`).
- Semua copy tetap dari `lib/data/home.ts` (`OVERVIEW_PANEL_COPY`, `HOME_INCOME_COPY`).
- Opsional (kalau pas): tambah ringkasan singkat dompet (jumlah catatan, arus masuk/keluar bulan ini) dari data real.

### Acceptance criteria
- [ ] Popup nyaman di desktop & mobile; tidak ada elemen terpotong/overlap.
- [ ] Ukuran & hierarki konsisten dengan sheet lain; tidak ada angka keras.
- [ ] (Kalau ada) ringkasan baru memakai data ledger NYATA.

---

## 8. Definition of Done (wajib dibuktikan)

- [ ] `pnpm test` → semua hijau (tambah test baru untuk Tugas A, B, D).
- [ ] `pnpm exec tsc --noEmit` → bersih.
- [ ] `pnpm build` → sukses.
- [ ] Tidak ada alur tulis uang yang bypass `lib/money/store.ts`; tidak ada copy user-facing baru di JSX (semua di `lib/data/*`).
- [ ] Akun bersih (tanpa env) benar-benar kosong; jalur demo (`NEXT_PUBLIC_DEMO=1`) berisi data real (editable/persist).
- [ ] AI mencatat beneran + jawab dari data real (bukti: angka jatah berubah setelah mencatat; ulang prompt → angka berbeda).
- [ ] Laporan akhir: file yang diubah + **bukti angka sebelum/sesudah** (bukan klaim), plus daftar batas yang belum bisa diverifikasi tanpa browser.

## 9. Yang DILARANG
- Menambah store/bus kedua, atau menulis saldo ke komponen.
- Mengarang angka/aksi. Mengucapkan "sudah dicatat" tanpa baris yang benar-benar tertulis.
- Mengembalikan seed sebagai data user di jalur non-demo.
- Menulis copy user-facing di JSX.
- Menambah animasi yang mengabaikan `prefers-reduced-motion`.
- Menghapus/menonaktifkan test untuk "menghijaukan" build.



