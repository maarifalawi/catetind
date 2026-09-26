# 04 — Modal Tambah Dompet + Sheet Pindah Saldo

**Paket:** melengkapi `/wallet` (tidak ada route baru) · **Fase 2** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**Inventaris:** baris 111 (#o — "Tambah Wallet / Akun Baru (Modal): pilih tipe
(Bank/Cash/E-Wallet), pilih logo bank dari daftar, isi nama + saldo awal manual")
dan Asumsi A1 ("Tipe Transaksi Tabungan & Transfer") di
`CatetInd_Master_PRD_Lengkap.md` baris 1692.

**PRD pendukung:**

- **542–568** — micro-copy & feedback per state (sukses/gagal)
- **194–200** — pola yang patut ditiru: bantuan kontekstual **di dalam form**, bukan menyuruh keluar ke Help Center
- **2223–2230** — bahasa gesture produk

**Kode acuan:**

- `components/catetind/wallet-screen.tsx` — sumber utama: `useState(INITIAL_WALLET_ACCOUNTS)`,
  rail "Tambah Dompet Cepat", `GHOST_BRAND_POOL`/`SUGGESTION_LIMIT`, `handleGhostTap()` (~baris 198),
  popover aksi kartu (**"Pindah Saldo"** ~baris 771 → `handleTransfer()` ~baris 241 masih toast)
- `components/catetind/budget-sheet.tsx` — primitif sheet bersama (`RupiahField`, `SheetSubmit`, `useFocusOnOpen`)
- `components/catetind/add-bill-sheet.tsx` — **contoh terbaik** sheet tambah-data yang sudah jadi
- `components/catetind/sync-balance-modal.tsx` — modal "Sesuaikan Saldo" (gaya dialog modal; acuan bila ingin modal, bukan sheet)
- `lib/wallets.ts` — `WalletAccount`, `INITIAL_WALLET_ACCOUNTS`, `WALLET_POOL`, `formatIDR()`
- `lib/data/budget.ts` — `WALLET_SOURCES` (daftar dompet + `tile`/`dot`), `lib/data/bills.ts` — `BILL_WALLET_OPTIONS`

## Kenapa paket ini ada

Rail "Tambah Dompet Cepat" adalah **satu-satunya** jalan menambah dompet, dan
sekarang jalannya mati: tiap brand cuma memunculkan toast *"Modal tambah dompet akan
langsung terisi brand ini."* Halaman Dompet jadi buntu di langkah pertama — padahal
dompet adalah fondasi seluruh app (Daily HUD, budget, tagihan, wealth semua membaca
saldo dompet).

Psikologi yang berlaku (CONTEXT-WAJIB §5):

- **Kurangi friksi sampai minimal.** Dompet = gerbang masuk; form panjang di sini
  membuat user menyerah sebelum produk terasa berguna. Isi hanya yang wajib,
  sisanya opsional.
- **Satu tap sudah terasa "kena".** Menekan kartu BCA di rail harus membuka form
  **yang brand-nya sudah terisi** — inilah janji "ghost card", jadi harus ditepati.
- **Pindah saldo bukan tindakan menakutkan.** Copy ringan, tanpa istilah bank
  ("debit/kredit/mutasi"), dan selalu ada ringkasan sebelum disimpan.

## Yang harus dibangun

1. **`components/catetind/add-wallet-sheet.tsx`** (baru, pakai primitif `budget-sheet.tsx`):
   - Field: **jenis akun** (Bank / E-Wallet / Cash), **nama akun** (placeholder nyata:
     `"Contoh: BCA Tabungan, GoPay, Dompet Tunai"`), **nomor tersamarkan** (opsional,
     mis. `•••• 0849`), **saldo sekarang** (default `0`, boleh dikosongkan).
   - Bantuan kontekstual **di dalam form** (bukan link keluar): *"Boleh buat lebih dari
     satu akun dari platform yang sama."*
   - Prop opsional `initialBrand?: string` → dipakai rail ghost card supaya brand & jenis
     sudah terisi saat sheet dibuka.
   - Simpan → tambahkan ke state `wallets` di `wallet-screen.tsx` (pola yang sudah ada),
     lalu toast sukses.
   - **Warna kartu dompet baru wajib diambil dari resep yang SUDAH ada** di
     `INITIAL_WALLET_ACCOUNTS` (`color`, `face`, `art` — siklus berurutan). **Dilarang**
     mengarang gradien/hex baru; palet sudah mewah dan kartu harus tetap satu sistem.
2. **`components/catetind/transfer-sheet.tsx`** (baru):
   - Pilih **dompet tujuan** (selain dompet sumber), isi **nominal** (`RupiahField`),
     tanggal otomatis hari ini, catatan opsional.
   - Validasi jujur & ramah: nominal ≤ saldo sumber; dompet tujuan ≠ sumber. Pesan
     pakai nada menemani, bukan menyalahkan (mis. *"Saldo BCA tinggal Rp150.000 — kecilin
     nominalnya dulu ya."*).
   - Simpan → **dua sisi berubah**: saldo sumber berkurang, saldo tujuan bertambah
     (state lokal), plus entri transaksi bertipe `transfer` supaya chip "pindah dana"
     di `/history` konsisten (`isMoneyMovement()` di `lib/data/history.ts`).
   - Ringkasan sebelum simpan: `"Rp 250.000 dari BCA → GoPay"`.
3. **Wiring** di `wallet-screen.tsx`:
   - `handleGhostTap()` → buka `AddWalletSheet` dengan `initialBrand` (bukan toast lagi).
   - Kartu "Dompet lain" → buka `AddWalletSheet` kosong.
   - Popover "**Pindah Saldo**" → buka `TransferSheet` (bukan toast lagi).
   - Hapus semua toast "segera hadir" di berkas ini yang sudah tergantikan.
4. **Data baru** di `lib/wallets.ts`: opsi jenis akun, opsi brand (Bank/E-Wallet),
   `nextWalletId()`, dan formatter yang sudah ada (`formatIDR`).

## Acceptance criteria

- [ ] Menekan brand di rail "Tambah Dompet Cepat" → sheet terbuka dengan brand & jenis terisi.
- [ ] Dompet baru langsung muncul di `/wallet` dengan kartu berwarna palet yang valid,
      dan ikut menambah angka **total saldo** (jangan hardcode; pakai `walletAccountsTotal`).
- [ ] Pindah Saldo mengubah **dua** saldo sekaligus dan tercatat sebagai `transfer`.
- [ ] Transfer melebihi saldo ditolak dengan copy ramah (bukan pesan error merah).
- [ ] Nominal di sheet ikut tombol mata privasi global.
- [ ] Tidak ada lagi toast "segera hadir" untuk aksi tambah dompet / pindah saldo.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menulis `#hex`/`rgb()` atau kelas warna bawaan Tailwind untuk muka kartu dompet baru.
- Memakai `prompt()`/`window.confirm()` bawaan browser.
- Membuat form dompet yang berbeda dari gaya `add-bill-sheet.tsx` (harus terasa satu keluarga).
