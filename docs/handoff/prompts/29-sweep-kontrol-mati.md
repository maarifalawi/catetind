# 29 — Sweep Kontrol Mati (tombol & input tanpa aksi)

**Paket:** perbaikan lintas halaman · **Fase 9** · **Depends on:** #24 (pola `?add=` sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (hasil scan 30-baris `<button` tanpa `onClick`/`href`/`submit`/`trigger`)

**MATI** = sudah diverifikasi manual tidak punya aksi. **VERIFIKASI** = kandidat yang wajib
kamu cek dulu (mungkin false positive karena dibungkus `trigger=`).

| # | Lokasi | Status |
|---|---|---|
| 1 | `components/catetind/home-screen.tsx:108` — tombol **Menu** (header mobile) | **MATI** |
| 2 | `components/catetind/home-screen.tsx:148` — tombol **Notifications** (ada dot notif) | **MATI** |
| 3 | `components/catetind/home-screen.tsx:142-145` — input **"Cari transaksi..."** (desktop), tanpa `value`/`onChange` | **MATI** |
| 4 | `components/catetind/my-goals-card.tsx:106` — tombol **"+ Tambah goal baru"** | **MATI** |
| 5 | `components/catetind/my-goals-card.tsx:128` — tombol **"Lihat detail goal"** | **MATI** |
| 6 | `components/catetind/my-goals-card.tsx:207` — chevron **detail per goal** (ChevronDown) | **MATI** |
| 7 | `components/catetind/recent-transactions-card.tsx:308` — CTA **"+ Catat Transaksi"** (empty state) | **MATI** |
| 8 | `components/catetind/balance-ring.tsx:165` — tombol **Insights** & `:184` `OrbitButton` (aria "Quick action") | **MATI** |
| 9 | `components/catetind/income-card.tsx:33` — dropdown bulan **"February"** (ChevronDown, tak bisa diklik) | **MATI** |
| 10 | `components/catetind/weekly-recap-modal.tsx:639` — **"Set target minggu depan"** | **MATI** |
| 11 | `components/catetind/weekly-recap-modal.tsx:647` — **"Lihat rencana tabungan cerdas"** | **MATI** |
| 12 | `billing-panel.tsx:501` · `budget-screen.tsx:336` · `daily-hud-card.tsx:93` | **VERIFIKASI** |

Catatan penting: `daily-hud-summary.tsx:80` & `wallet-detail-screen.tsx:623` **bukan** mati —
keduanya dibungkus `<TransactionBottomSheet trigger={…}>`. Itu pola yang BENAR untuk tombol
yang membuka sheet; tiru pola itu.

**Kenapa penting:** Home adalah layar pertama. Tiga kontrol mati di sana (Menu, Notifications,
pencarian) bikin aplikasi terasa belum jadi. Dan `weekly-recap-modal` mematikan CTA yang
PRD **2141–2145** minta ditaruh di zona ibu jari — CTA-nya sudah ada, aksinya yang belum.

## Peta baca

- **2141–2145** — CTA recap ditaruh di BAWAH slide (zona ibu jari)
- **594–639** — 2A.6 "**SATU** sumber kebenaran untuk navigasi sekunder" (dasar keputusan tombol `Menu`)
- **1827–1877** — Habit Loop 2 (Review Mingguan): apa yang seharusnya terjadi setelah recap dibaca
- **178–191** — Home: nudge kontekstual, bukan pajangan

**Kode acuan:**

- `components/dashboard/transaction-bottom-sheet.tsx` — pembungkus engine (pola `trigger=`)
- `components/catetind/add-goal-sheet.tsx` — sheet tambah celengan (sudah ada)
- `lib/data/budget.ts` — `budgetAddHref()` / `BUDGET_ADD_PARAM` (dibuat task 24) → pakai pola ini
- `app/budget/page.tsx` — preseden `searchParams` memberi tahu sheet apa yang harus terbuka
- `components/MobileBottomNav.tsx` — pemilik menu "Lainnya" (satu-satunya navigasi sekunder)
- `components/catetind/monthly-target-card.tsx` + `monthly-review-modal.tsx` — tujuan nyata "set target"
- `lib/data/budget.ts` → `INITIAL_SINKING_FUNDS` — sumber id untuk rute `/budget/<id>`

## Yang harus dibangun

Untuk **setiap** item di tabel: pilih **satu** dari dua jalan yang jujur — **beri aksi nyata**
atau **hapus kontrolnya**. Tidak ada opsi "biarkan, nanti saja".

1. **Menu (mobile)** → **hapus**. Navigasi sekunder sudah 100% ditangani bottom-nav "Lainnya"
   (kanon 2A.6 + keputusan task 06). Tulis alasannya di komentar.
2. **Notifications (desktop)** → arahkan ke `/settings/notifications` (route sudah ada),
   pertahankan dot sebagai indikator.
3. **Input "Cari transaksi..." (desktop)** → jadikan pencarian sungguhan: kirim ke
   `/history?q=<kata>` lewat form (Enter/submit), lalu buat `/history` membaca `searchParams`
   untuk mengisi kolom pencariannya (pola `app/budget/page.tsx`).
   *Cadangan yang masih jujur:* ganti input itu jadi tombol `Cari transaksi` → `/history`
   (tempat pencariannya memang hidup). Pilih salah satu, jelaskan alasannya di komentar + laporan.
4. **Tambah goal (`my-goals-card:106`)** → buka `AddGoalSheet` (bungkus `trigger=`),
   atau tautkan ke `/budget` memakai pola `budgetAddHref()` yang sudah ada.
5. **Detail goal (`my-goals-card:128` dan chevron `:207`)** → keduanya `Link` ke
   `/budget/<id-fund>` dari data celengan yang dipakai kartu itu. Jangan biarkan chevron
   yang seolah bisa expand tapi tidak.
6. **"+ Catat Transaksi" (`recent-transactions-card:308`)** → bungkus `TransactionBottomSheet`.
7. **`balance-ring`** → `Insights` → `/history`; orbit `Users` → `/joint`;
   orbit `BarChart3` → `/history`. (Kalau ada yang tidak punya tujuan masuk akal, hapus orbitnya
   dan jelaskan.) Ingat komponen ini tampil di Home lewat `overview-panel`.
8. **Dropdown bulan (`income-card:33`)** → data mock hanya 1 bulan: jadikan **label statis**
   (bukan `<button>`), hapus chevron. Kalau ingin tetap selektabel, sediakan daftar bulan nyata.
9. **Weekly recap (2 CTA)** → `Set target minggu depan` menyambung ke alur target yang SUDAH ada
   (`monthly-target-card` / `MonthlyReviewModal` / `/budget?add=`), dan
   `Lihat rencana tabungan cerdas` → `/budget`. Pastikan modalnya menutup setelah aksi.
10. **Item VERIFIKASI** → cek dulu: kalau ternyata dibungkus `trigger=`/`asChild` → laporkan
    sebagai **false positive** (jangan diubah). Khusus `daily-hud-card.tsx`: cek apakah komponen
    itu masih dipakai halaman mana pun; kalau **tidak dipakai** → hapus komponennya
    (pola task 22) dan laporkan.
11. **Scan ulang harus nol.** Jalankan metode yang sama seperti audit ini, tempel hasilnya:
    ```powershell
    Get-ChildItem -Path 'components','app' -Recurse -Filter '*.tsx' |
      ForEach-Object { $f=$_; $l=Get-Content $f.FullName
        for ($i=0; $i -lt $l.Count; $i++) { if ($l[$i] -match '<button') {
          $b=($l[$i..([Math]::Min($i+30,$l.Count-1))] -join ' ')
          if ($b -notmatch 'onClick|href=|submit|disabled|asChild|trigger=') {
            $f.FullName + ':' + ($i+1) } } } }
    ```
    Hasil yang diterima: **kosong**, atau daftar sisa yang kamu jelaskan kenapa bukan mati.
    Sekalian sisir input mati: `<input` di header Home tanpa `value` + `onChange`.

## Acceptance criteria

- [ ] Nol kontrol mati dari tabel; masing-masing punya aksi nyata **atau** sudah dihapus.
- [ ] Home: menu/notifikasi/pencarian berperilaku jelas; "+ Catat Transaksi" membuka sheet input.
- [ ] `my-goals-card`: tombol tambah & detail benar-benar membuka sesuatu.
- [ ] `weekly-recap-modal`: kedua CTA punya tujuan nyata.
- [ ] Scan ulang (§11) → **nol** kandidat, atau penjelasan eksplisit untuk tiap sisa.
- [ ] Item VERIFIKASI dilaporkan: false positive vs benar-benar mati.
- [ ] Nol copy baru di JSX (semua ke `lib/data/*`); tidak menyentuh harga/legal/Properti.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Mengganti dead-end dengan toast "segera tersedia".
- Membuat jalur navigasi sekunder kedua (kanon 2A.6).
- Menyentuh `lib/data/pricing.ts`, Properti (PRD A12), `/terms`, `/privacy`.

