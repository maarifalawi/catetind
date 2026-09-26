# 03 — Modal Edit & Hapus: Tagihan + Transaksi

**Paket:** melengkapi `/bills` dan `/history` (tidak ada route baru) · **Fase 2** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **334–455** — 2A.2 Mode 1 (Manual Quick-add): pola form transaksi kanon
- **542–568** — micro-copy & micro-interaction per state (termasuk konfirmasi & success)
- **2223–2230** — gesture: swipe kiri = hapus (dengan konfirmasi), swipe kanan = edit
- **2253–2265** — rotasi copy toast sukses (8 variasi) — pakai ini, jangan satu kalimat kaku

**Kode acuan:**

- `components/catetind/bills-screen.tsx` — `handleEdit()` (~baris 124) masih
  `toast.success('Edit ...', { description: 'Sheet edit tagihan segera hadir.' })`
- `components/catetind/add-bill-sheet.tsx` — form tagihan lengkap (emoji picker, nominal, due date, toggle berulang)
- `components/catetind/history-screen.tsx` — `handleEdit()` (~baris 141) masih toast
- `components/dashboard/transaction-input-engine.tsx` — **engine input transaksi kanon**
  (dipakai bottom sheet mobile, modal web, dan onboarding)
- `components/dashboard/transaction-bottom-sheet.tsx`, `transaction-web-modal.tsx` — pembungkus engine
- `components/catetind/transaction-detail-sheet.tsx` — sheet detail transaksi (tempat tombol "Edit"/"Hapus" berada)
- `components/catetind/budget-sheet.tsx` — primitif sheet bersama (`RupiahField`, `SheetSubmit`, `useFocusOnOpen`)
- `lib/data/bills.ts` (`Bill`), `lib/data/history.ts` (`HistoryTransaction`)
- `components/catetind/settings-ui.tsx` — primitif `Toggle`, `ToggleRow`, `SettingsField` bila butuh kontrol baru

## Kenapa paket ini ada

Dua halaman yang sudah "selesai" masih punya tombol yang **berbohong**: menekan Edit
memunculkan toast "segera hadir". Untuk audiens yang catatannya sering salah kategori
(kasus paling umum: Minca salah nebak, lihat `lib/data/help.ts` artikel
"Minca Salah Nebak Kategori, Gimana?"), **edit adalah jalur utama perbaikan data** —
bukan fitur sekunder.

Psikologi yang berlaku (CONTEXT-WAJIB §5):

- **Jangan membuat user merasa salah.** Copy edit/hapus netral & menenangkan —
  tidak ada "kok salah input?".
- **Pulihkan rasa aman setelah hapus.** Hapus WAJIB konfirmasi + sediakan **Undo**
  lewat toast (PRD 2225). Menghapus data keuangan tanpa jaring pengaman memicu
  kecemasan yang bertentangan dengan filosofi produk.
- **Kurangi friksi.** Edit memakai sheet yang **sudah terisi** (pre-filled) — user
  hanya mengubah yang salah, bukan mengisi ulang dari nol.

## Yang harus dibangun

1. **Edit tagihan** — ubah `add-bill-sheet.tsx` supaya bisa dipakai dua mode
   (add & edit): tambah prop opsional `initial?: Bill` dan sesuaikan judul/CTA
   (`"Tambah Tagihan"` ⇄ `"Edit Tagihan"`), tanpa mengubah API pemakaian yang ada
   (backward compatible untuk `/bills` bagian tambah). Hubungkan `handleEdit()` di
   `bills-screen.tsx` ke sheet ini dan **hapus toast placeholder**-nya.
2. **Edit transaksi** — tambah prop opsional `initial?: HistoryTransaction` (dan
   `onSave`) pada `transaction-input-engine.tsx`, sehingga engine yang sama bisa
   membuka diri dalam mode edit dengan nilai terisi: tipe, nominal, deskripsi,
   kategori, dompet, tanggal. Pertahankan perilaku lama untuk pemakaian add.
   Hubungkan tombol Edit di `history-screen.tsx` dan di `transaction-detail-sheet.tsx`.
3. **Hapus dengan pengaman** — konfirmasi dulu (sheet kecil atau dialog konsisten
   dengan repo), lalu `toast` dengan aksi **Undo** yang mengembalikan item; hapus
   baru benar-benar terjadi setelah undo-window lewat.
4. **Swipe gesture (opsional, hanya kalau tidak mengganggu)** — swipe kanan = edit,
   swipe kiri = hapus pada baris transaksi sesuai PRD 2223–2230. Kalau implementasi
   berisiko menabrak popover/tombol yang sudah ada, **jangan dipaksa**: cukup pastikan
   aksi titik-tiga / sheet detail memanggil sheet edit & konfirmasi hapus yang baru.
5. **Copy** — tambahkan konstanta copy (judul sheet edit, label CTA, teks konfirmasi,
   varian toast sukses) di `lib/data/bills.ts` dan `lib/data/history.ts`.

## Acceptance criteria

- [ ] Edit tagihan membuka sheet **terisi data tagihan tersebut**; simpan → kartunya berubah di `/bills`.
- [ ] Edit transaksi membuka engine **terisi data transaksi tersebut**; simpan → barisnya berubah,
      dan total grup harian ikut menyesuaikan.
- [ ] Hapus selalu lewat konfirmasi + ada Undo yang benar-benar memulihkan item.
- [ ] Tidak ada lagi toast "segera hadir" untuk Edit di `/bills` dan `/history`.
- [ ] Mode add pada kedua sheet/engine tetap berfungsi seperti sebelumnya (regresi nol).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menduplikasi form: **jangan** bikin `edit-bill-sheet.tsx` yang menyalin 90% `add-bill-sheet.tsx`.
  Pakai satu komponen dengan mode.
- Menghapus data tanpa konfirmasi/Undo.
- Menambah library gesture baru di luar yang sudah ada di `package.json`
  (`framer-motion` sudah cukup; cek dulu apakah repo memakai `@use-gesture/react` sebelum memakainya).
