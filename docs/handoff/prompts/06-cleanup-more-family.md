# 06 — Bersih-bersih Navigasi: `/more` & `/family`

**Fase 3** · **Depends on:** — (task pendek, ±30 menit)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Peta baca

**PRD:**

- **594–639** — 2A.6 Navigasi Sekunder: **"CatetInd menggunakan SATU sumber kebenaran
  untuk navigasi sekunder"**, tab ke-5 "Lainnya" = **Vaul bottom sheet** (bukan halaman).
  Bagian ini juga memuat pelajaran dari Fundy: *dua jalur navigasi paralel = redundan & membingungkan.*
- **783–807** — 2C.2 Context Switching UI: **Pribadi / Keluarga / Bersama** hidup sebagai
  **konteks**, bukan halaman terpisah.
- **3303–3352** — Domain 4C Skenario 3 "Family Wallet (Sandwich Generation)" — rujukan RLS/peran
  (bahan kalau nanti mau membangun keluarga sebagai modul, lihat §Alternatif).

**Kode acuan:**

- `app/more/page.tsx` — **stub**: hanya `<h1>Lainnya</h1>`
- `components/MobileBottomNav.tsx` — sudah memakai `Drawer` (Vaul) untuk "Lainnya" sesuai PRD 2A.6
- `components/catetind/desktop-sidebar.tsx` — memuat entri `{ href: '/family', icon: Heart, label: 'Family Wallet' }`
- `app/family/page.tsx` — markup mentah (`text-xl font-bold`), bukan design system, dan **tidak ada di inventaris**
- `components/catetind/context-switcher.tsx` + `money-context-provider.tsx` — konteks Pribadi/Keluarga/Bersama yang asli
- `temp-write-sidebar.js` (root repo) — skrip sekali-pakai yang menambahkan entri `/family` itu

## Kenapa task ini ada

Dua route ini adalah **sisa proses**, bukan desain: `/more` dibuat sebelum menu
"Lainnya" menjadi drawer, dan `/family` masuk lewat skrip sekali-pakai. Keduanya
tidak bisa dijangkau (`grep` `href="/more"` = 0 hasil) atau tidak sesuai PRD
(Keluarga = konteks). Membiarkannya berarti aplikasi punya dua sumber navigasi —
persis kesalahan Fundy yang PRD larang.

Psikologi/perilaku: **satu jalur = kepastian.** User yang baru belajar app tidak
boleh menemukan dua pintu berbeda menuju hal yang sama, apalagi satu di antaranya
halaman kosong.

## Yang harus dibangun

1. **Hapus `app/more/`** — route yatim; menu "Lainnya" sudah ditangani
   `MobileBottomNav` (Drawer) dan sidebar desktop sudah punya semua menu.
2. **Hapus `app/family/` dan entri `/family` di `components/catetind/desktop-sidebar.tsx`**
   — "Keluarga" adalah **konteks** (ada di `ContextSwitcher` + `MoneyContextProvider`),
   bukan halaman. Pastikan ikon `Heart` yang jadi tidak terpakai ikut dibersihkan dari import.
3. **Hapus `temp-write-sidebar.js`** (skrip sekali-pakai di root) — dan sekalian audit
   file skrip sekali-pakai lain di root (`fix_slides2.py`): hapus bila sudah tidak dipakai,
   atau pindahkan ke `scripts/` bila masih relevan. Laporkan keputusanmu.
4. **Verifikasi jejak**: cari sisa referensi (`/more`, `/family`, "Family Wallet",
   `MorePage`, `FamilyPage`) di seluruh `app/`, `components/`, `lib/` dan pastikan nol
   tautan mati. Sekaligus pastikan `ContextSwitcher` benar-benar masih bisa memilih
   konteks "Keluarga" di Home & Budget (jangan sampai membersihkan route malah
   mematikan fitur konteks).
5. **Catat di satu tempat** (komentar singkat di `desktop-sidebar.tsx` atau
   `ROADMAP-HALAMAN.md` §3) bahwa penghapusan ini keputusan sadar, supaya tidak
   "dihidupkan lagi" oleh task berikutnya tanpa diskusi.

## Acceptance criteria

- [ ] `app/more/` dan `app/family/` tidak ada lagi; `temp-write-sidebar.js` bersih.
- [ ] `grep -r "href=\"/family\"\|\"/more\"" app components lib` → **nol hasil**.
- [ ] Sidebar desktop & drawer mobile menampilkan menu yang sama (tidak ada menu yatim).
- [ ] Konteks "Keluarga" masih bisa dipilih dan masih memfilter data (uji di `/` dan `/budget`).
- [ ] Tidak ada halaman/komponen yang mengimpor komponen dari dua folder yang dihapus.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Mengganti `/family` dengan halaman kosong baru atau teaser "segera hadir" —
  kalau belum jadi modul nyata, **hapus**, jangan tinggalkan hantu.
- Menghapus `ContextSwitcher` / `MoneyContextProvider` (itu fitur asli, bukan sisa).

## Alternatif (kalau pemilik produk memutuskan Family Wallet jadi modul nyata)

Jangan dikerjakan di task ini. Modul "Keluarga" berarti inventaris baru: halaman
anggota keluarga, peran & visibilitas, aktivitas keluarga, dan perhitungan bersama —
dasarnya PRD 758–807 (2C) + 3303–3352 (4C Skenario 3). Kalau diambil, buat prompt
baru + tambahkan entri ke `inventaris_ui_definitif.md` dulu, baru dikerjakan.
