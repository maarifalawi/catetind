# Laporan 104 — Placeholder terbaca sebagai tempat isi · kembali dari Atur Pembagian · Joint murni buku besar

Tanggal: 11 Nov 2026 · Permintaan pemilik produk (satu paket, empat bagian):

1. **Semua placeholder** harus terlihat sebagai *tempat mengisi*, bukan seperti teks biasa —
   user tidak tahu kolomnya bisa diketik.
2. Dari form **Catat Bareng** → **Atur Pembagian** → sheet baru itu jangan cuma punya tombol
   tutup; harus ada **kembali**, dan **nominal yang sudah diisi tidak boleh hilang** (kecuali
   user menutup form catatnya).
3. **Hapus "Sumber Dana"**; Dompet Bersama harus **murni** dan tidak mengganggu dompet di
   Dashboard/Riwayat/Budget (aturan awalnya memang begitu).
4. Hapus deretan teks penjelas di form & sheet pembagian (13 kalimat, lihat §4).

---

## 1. Placeholder = petunjuk, bukan isi

### Akar masalah
- Resep "placeholder = miring + lebih lembut + bobot normal" sebenarnya **sudah ada** di repo,
  tapi hanya di SATU field (`onboarding-step-first-transaction.tsx`, lengkap dengan komentarnya).
  Field lain memakai `placeholder:text-forest-muted` — warna & bobot yang SAMA dengan teks yang
  diketik, jadi terbaca sebagai isi.
- Tiga field nominal besar justru memakai `placeholder:text-forest/[0.14]` / `/15` → praktis
  tak terlihat.
- Empat field angka/teks tidak punya "cangkang" sama sekali (`bg-transparent`, tanpa ring):
  nominal engine, nominal onboarding (2 layar), saldo onboarding.

### Perbaikan
- **`app/globals.css`** — aturan global (di luar `@layer`, pola yang sama dengan aturan global
  lain supaya menang dari utility Tailwind tanpa `!important`):
  ```css
  input::placeholder,
  textarea::placeholder {
    color: var(--color-forest-muted);
    font-style: italic;
    font-weight: 400;
    opacity: 1;
  }
  ```
  Efek: **semua** placeholder (47 atribut di ~35 file) kini miring & terbaca — pembeda jelas dari
  teks tegak yang diketik. Tidak perlu menyentuh satu per satu.
- **Cangkang field** untuk input yang telanjang, memakai idiom yang sudah ada di
  `sync-balance-modal.tsx` (`border-2 border-dashed border-oat` + `focus-within:border-mint`):
  `transaction-input-engine.tsx` (nominal), `onboarding-step-first-transaction.tsx` (nominal),
  `onboarding-step-income.tsx` (pemasukan bulanan + saldo dompet).
- Utility `placeholder:text-forest/[0.14]` di tiga field itu **dihapus** supaya tidak ada lagi
  niat "sembunyikan placeholder" yang bertabrakan dengan aturan global.
- Teks placeholder **tidak** diubah — yang diperbaiki cara tampilnya.

---

## 2. Atur Pembagian: tombol kembali + isian tidak hilang

### Akar masalah
`openSplitForNew()` menutup sheet input sebelum membuka sheet pembagian (dua `Drawer.Root`
z-[70] tidak boleh hidup bersamaan). Saat `active` jadi `false`, effect reset engine
(`transaction-input-engine.tsx`) mengosongkan ref kunci pembukaan; begitu sheet dibuka lagi,
engine menganggapnya **panel baru** dan mengosongkan nominal, catatan, kategori, serta tipe.
Komentar lama di `joint-screen.tsx` ("tidak perlu diisi ulang") ternyata tidak berlaku untuk
state internal engine. Sheet pembagian juga hanya punya tombol X.

### Perbaikan
| File | Perubahan |
|---|---|
| `components/dashboard/transaction-input-engine.tsx` | prop baru `resumeDraft` (isian awal saat panel dibuka) + `onDraftChange` (laporan isian ke shell). `onAmountChange` **dihapus** — satu pintu laporan saja. Auto-focus tidak diambil kalau isinya dipulihkan. |
| `lib/data/transaction-form-reset.ts` | fungsi murni `transactionFormResume()` (nominal → bentuk kanon ribuan, tipe pilihan user menang atas tipe bawaan). |
| `lib/data/transaction-form-reset.test.ts` | 4 test baru (1966 test total). |
| `components/catetind/budget-sheet.tsx` | prop opsional `onBack` → tombol **←** di kiri judul. Sheet lain tidak berubah. |
| `components/catetind/joint-split-sheet.tsx` | meneruskan `onBack`. |
| `components/catetind/joint-add-sheet.tsx` | meneruskan `resumeDraft` & `onDraftChange` ke engine. |
| `components/catetind/joint-screen.tsx` | `pendingAmount` → `addDraft {amount, note, category, type}`; FAB selalu membuka form kosong; penutupan sheet saat pindah ke pembagian ditandai `keepDraftOnClose` supaya tidak ikut mengosongkan draft; `onClose`/`onBack` sheet pembagian kembali ke form (draft utuh). |

Perilaku akhir:

| Aksi | Nominal & catatan | Pembagian |
|---|---|---|
| Buka "Atur Pembagian" | tetap | tetap |
| Di sheet pembagian tekan **←** atau **X** | **tetap** | tetap seperti sebelumnya |
| Simpan pembagian | tetap | tersimpan, form lanjut |
| Tutup form Catat (X/geser) | **hilang** | hilang |
| Catat berhasil | hilang | hilang |

Catatan: untuk sheet pembagian yang dibuka dari **detail catatan lama**, **←** kembali ke detail
catatannya, sedangkan **X** hanya menutup sheet.


---

## 3. "Sumber Dana" dihapus — Joint kembali murni buku besar

### Aturan yang berlaku (dan aturan awalnya)
`lib/data/joint.ts` (header) menulis model akuntansinya: Dompet Bersama adalah **shared ledger**,
bukan rekening. `JointWallet` sengaja tidak punya `balance`; yang dihitung adalah
`net = bayar − kewajiban` per anggota, dan settle hanya menandai kesepakatan per bulan.
Keputusan paket 37/49 juga menegaskan catatan bareng **tidak** masuk ledger pribadi.

Jadi **aturan awalnya memang joint tidak menyentuh dompet**. "Sumber Dana" (dan pilihan dompet di
modal Lunasi) adalah pengecualian yang ditambahkan belakangan.

### Perbaikan (pilihan pemilik produk: hapus dua-duanya, store tetap)
- `components/catetind/joint-add-sheet.tsx` — blok **Sumber Dana** + prop
  `walletOptions`/`cashWalletId`/`onCashWalletChange` dihapus; submit tidak lagi mengirim
  `cashWalletId`.
- `components/catetind/joint-settlement-modal.tsx` — blok **"Dompet untuk transfer (opsional)"**
  dihapus; `onSettle` sekarang `(method) => void`.
- `components/catetind/joint-screen.tsx` — state `cashWalletId`, `settleWalletId`,
  `moneySnapshot`/`cashWalletOptions` (+ import store uang) dihapus; `handleSettle` tidak lagi
  menerima/meneruskan `cashWalletId`, dan toast "dompetnya belum bergerak" ikut hilang.
- **`lib/money/joint-store.ts` & test-nya TIDAK diubah.** Dukungan `cashWalletId`/`cashRowId`
  tetap dipertahankan supaya catatan/settle **data lama** masih bisa mencabut/mengembalikan baris
  kasnya saat dihapus (dan supaya test yang mengunci jalur itu tetap hijau).
- Banner "Dompet: <nama dompet bersama>" tetap ada — itu label dompet bersama, read-only, tidak
  menggeser saldo.

Dampak: mencatat pengeluaran bareng **tidak lagi** mengubah saldo dompet pribadi mana pun dan
tidak memunculkan baris di Riwayat/Budget/Dashboard. Yang bergerak hanya angka bersama
(total, timbangan, siapa berutang ke siapa).

---

## 4. Teks yang dihapus

| Teks | Lokasi |
|---|---|
| "Bisa diubah kapan aja sebelum dicatat" | `joint-add-sheet.tsx` |
| "Uangnya keluar dari kantong siapa, bukan siapa yang mengetik." | `PAID_BY_HINT` (dihapus dari `lib/data/joint.ts`) + pemakaian di `joint-add-sheet.tsx` **dan** `joint-entry-sheet.tsx` |
| "Pilih tipe … Pemasukan … pemasukan tidak dihitung sebagai pengeluaran." | `joint-add-sheet.tsx` |
| "Biar adil, biar gak ada yang ngerasa berat sebelah. 💚" | `description` BudgetSheet di `joint-split-sheet.tsx` |
| "Centang siapa yang ikut …" · "Atur persentase tiap anggota …" · "Isi nominal tiap anggota …" · "100% ditanggung satu orang" | field `hint` di `SPLIT_MODES` (dihapus seluruhnya) + paragraf hint di sheet |
| "Dibagi rata ke N dari N orang … per orang." | `JOINT_SPLIT_EQUAL_SELECTED` (dihapus) + barisnya |
| "Ketik di salah satu sisi, sisi satunya menyesuaikan sendiri supaya tetap pas …" | `joint-split-sheet.tsx` (peringatan "Isi nominal transaksinya dulu ya…" tetap) |
| "Semua anggota bisa mencatat, melihat, dan melunasi." | `JOINT_MEMBER_ACTIVE_COPY` (dihapus) + pemakaian di `joint-screen.tsx` |

**Tetap dipertahankan** (string berbeda, masih dipakai sebagai validasi): `JOINT_SPLIT_PERCENT_HINT`
("Total persentase harus tepat 100%."), `JOINT_SPLIT_MISMATCH`, `JOINT_SPLIT_PARTICIPANTS_HINT`,
label "Siapa yang nalangin?".

---

## Verifikasi

- `npx tsc --noEmit` → **0 error**
- `npx vitest run` → **143 file / 1966 test lulus** (4 test baru `transactionFormResume`)
- `npm run build` → sukses (semua route ter-generate)

## Cek manual yang disarankan

1. `/joint` → FAB **Catat Bareng**: isi `50.000` + catatan → **Atur pembagian** → tekan **←**
   (lalu ulangi dengan **X**) → nominal, catatan, tipe, dan kategori masih ada; pembagian tetap.
2. Tutup form Catat (X) → buka lagi → form **kosong**.
3. Catat transaksi → sukses → buka lagi → form kosong.
4. Pastikan tidak ada lagi blok **Sumber Dana** di form dan **Dompet untuk transfer** di modal
   Lunasi; catat transaksi bareng → saldo dompet pribadi di Dashboard **tidak berubah**.
5. Semua placeholder tampil miring; field nominal (Home, onboarding, Joint) punya cangkang garis
   putus-putus yang berubah mint saat fokus.
