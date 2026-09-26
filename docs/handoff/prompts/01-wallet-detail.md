# 01 — Dompet Detail

**Route:** `app/wallet/[id]/page.tsx` · **Inventaris:** #13 · **Fase 1** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD** (`CatetInd_Master_PRD_Lengkap.md`):

- **772–807** — 2C.1 Wallet Separation (pemisahan dompet per peran & konteks)
- **574–590** — ambang data minimum sebelum boleh menampilkan insight
- **2141–2145** — CTA primer di zona ibu jari (bawah), bukan header
- **2864–2965** — System Prompt AI Coach: identitas, tone, & batasan OJK (dipakai bila
  halaman menampilkan pesan AI)

**Inventaris:** `inventaris_ui_definitif.md` baris 45 (#13).

**Kode acuan (baca dulu, ikuti gayanya):**

- `app/wallet/page.tsx` + `components/catetind/wallet-screen.tsx` (halaman induk)
- `lib/wallets.ts` — `WalletAccount` (`id` bertipe **number**), `INITIAL_WALLET_ACCOUNTS`, `formatIDR()`
- `components/catetind/sync-balance-modal.tsx` — modal "Sesuaikan Saldo" yang bisa dipakai ulang
- `components/catetind/history-transaction-row.tsx` + `transaction-detail-sheet.tsx`
- `lib/data/history.ts` — helper siap pakai: `groupTransactionsByDate`, `resolveDayLabel`,
  `maskMoney`, `amountSign`, `summarizeTransactions`, `MASKED_AMOUNT`
- `components/catetind/privacy-provider.tsx` — `usePrivacy()` → `{ masked }`
- `app/api/wallets/[id]/route.ts` — pola `params: Promise<{ id: string }>` di Next 16

## Kenapa halaman ini ada

Satu-satunya pertanyaan yang bikin user membuka app ini bukan "berapa total uangku",
tapi **"dompet ini gimana kondisinya?"** — rekening yang mau dipakai bayar sesuatu.
Halaman ini harus menjawabnya dalam sekali pandang, di **zona ibu jari**, tanpa
istilah akuntansi.

Psikologi yang berlaku (CONTEXT-WAJIB §5):

- **Jujur soal data tipis.** Kalau transaksi dompet ini belum cukup, katakan apa
  adanya — jangan bikin klaim trend dari 2 transaksi (celah kompetitif kita, PRD 572).
- **Jangan menghakimi.** Saldo kecil bukan "boros". Net minus ditulis netral, bukan merah.
- **Privasi.** Nominal wajib ikut tombol mata global (`usePrivacy()`), termasuk angka
  di chart tooltip.

## Yang harus dibangun

1. **Route tipis** `app/wallet/[id]/page.tsx` — `async`, `params: Promise<{ id: string }>`,
   cari dompet lewat `INITIAL_WALLET_ACCOUNTS.find((w) => w.id === Number(params.id))`,
   dan `notFound()` kalau tidak ada. Bungkus `PhoneStage`, `metadata` judul dinamis
   `"<Nama Dompet> — CatetInd"`.
2. **`components/catetind/wallet-detail-screen.tsx`** (pakai `ScreenShell`) berisi:
   - **Header**: tombol kembali ke `/wallet`, nama dompet + jenis (`Bank`/`E-Wallet`/`Cash`),
     nomor tersamarkan, dan **tombol mata privasi global** (pola sama dengan header `/wallet`).
   - **Hero saldo**: pakai keluarga visual kartu yang SUDAH ada — gradien `WalletAccount.face`
     + motif `art` + keluarga warna palet yang sama; saldo besar `font-display`. Jangan
     mendesain muka kartu baru yang berbeda dari deck di `/wallet`.
   - **Ringkas periode** (30 hari terakhir): uang masuk, uang keluar, net — tiga angka,
     plus **mini trend** (Recharts area/line) dari data mock baru.
   - **Daftar transaksi dompet ini**, dikelompokkan per tanggal (pakai helper
     `groupTransactionsByDate` + `resolveDayLabel` + pill total harian), tiap baris
     pakai `history-transaction-row`, klik → `transaction-detail-sheet`.
   - **Aksi cepat (sticky bawah, zona ibu jari)**: `Catat transaksi` dan
     `Sesuaikan Saldo` (pakai ulang `SyncBalanceModal`).
   - **Empty state** bila belum ada transaksi: ilustrasi/emoji sederhana + copy nurturing + CTA.
   - **Kartu sabar insight** bila transaksi < 7: progress `[x/7 transaksi]` + ajakan
     mencatat, BUKAN klaim trend.
3. **`lib/data/wallet-detail.ts`** (baru) — data mock per dompet: transaksi (pakai tipe &
   bentuk `HistoryTransaction` supaya komponennya bisa dipakai ulang), `walletSparkline()`,
   `walletSummary30d()`, dan konstanta copy. Komentar arah produksi:
   `SELECT … WHERE wallet_id = $1 ORDER BY occurred_at DESC`.
4. **Wiring masuk** di `components/catetind/wallet-screen.tsx`: kartu dompet harus bisa
   **dibuka** ke `/wallet/[id]` (mis. nama/kartu jadi `Link`, atau tambahkan item menu
   pertama "Buka detail"). Jangan hapus popover "Pindah Saldo"/"Sesuaikan Saldo" yang ada.

## Copy & tone (contoh yang wajib dipakai, tinggal di `lib/data/wallet-detail.ts`)

- Empty: `"Belum ada catatan di dompet ini 🌱 Yuk catat yang pertama."`
- Kartu sabar: `"Aku lagi belajar pola dompet ini. Terus catat ya, nanti aku kasih ringkasan yang beneran berguna 📊"`
- Label ringkas: `"Masuk"`, `"Keluar"`, `"Net"` — bukan "debit/kredit".
- Bahasa Indonesia, tanpa menyalahkan, tanpa tanda seru berlebihan.

## Acceptance criteria

- [ ] `/wallet/1` (dan id lain yang ada) terbuka dengan data dompet yang BENAR — bukan dompet lain.
- [ ] Id yang tidak ada → `notFound()` (setelah prompt 05 selesai: halaman 404 nurturing).
- [ ] Nominal tersensor saat tombol mata aktif (termasuk tooltip chart).
- [ ] Ada empty state + kartu sabar insight; tidak ada klaim trend dari data tipis.
- [ ] Aksi primer di bawah (sticky), bukan di header.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menulis `#hex`/`rgb()` atau kelas warna bawaan Tailwind.
- Menyalin angka saldo dari data lain; saldo WAJIB dari `WalletAccount.balance`.
- Membuat komponen kartu dompet versi baru (duplikasi visual dengan `/wallet`).
- Meninggalkan `TODO` atau tombol yang tidak melakukan apa-apa.
