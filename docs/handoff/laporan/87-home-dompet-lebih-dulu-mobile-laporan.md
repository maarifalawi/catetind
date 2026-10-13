# Laporan Paket 87 — Home: Dompet Lebih Dulu di Mobile, Switcher Turun ke Dalam Panel Dompet

> **Tanggal:** 13 Okt 2026
> **Kanon kerja:** `docs/handoff/CONTEXT-WAJIB.md` (§2 peta file, §3 warna, §8 validasi)

## Permintaan pemilik produk (3 poin)

1. Switcher konteks (**Pribadi / Bersama / Keluarga**) JANGAN di atas dompet.
   Bingung mau ditaruh di mana (header atau lain). → **dipilih pemilik produk:**
   segmented control 3 tombol **di dalam panel dompet**, tepat di bawah tumpukan kartu.
2. **Tidak ada elemen konten apa pun di atas dompet di tampilan MOBILE** — termasuk
   kartu "Hemat Rp xxx" (`rounded-2xl bg-cream ring-1 ring-soil/12` = `MonthlyTargetCard`).
3. Riwayat transaksi: kenapa ada **"Pengeluaran cepat / Pemasukan cepat"**? Lebih baik
   tidak — langsung nama (mis. "Gacoan"), kategorinya di bawahnya.

## File yang diubah (3)

| File | Perubahan |
|---|---|
| `components/catetind/home-screen.tsx` | Urutan mobile: dompet `order-1`; strip notifikasi jadi sel grid `order-2`; switcher mobile pindah ke dalam panel dompet. Baris desktop digeser +1 (strip = baris 1). |
| `lib/data/money-context.ts` | + `CONTEXT_OPTIONS` (urutan tampil Pribadi→Keluarga→Bersama) supaya dropdown desktop & pill mobile satu urutan. |
| `docs/handoff/CONTEXT-WAJIB.md` | §10.2: aturan urutan Home mobile + catatan nama baris Riwayat (paket 86); §10.3: jumlah test dikoreksi (1162/87). |

Tidak ada file baru; tidak ada komponen baru.

## Keputusan desain (dan alasannya)

1. **Switcher jadi pill pilih-satu DI DALAM panel dompet.** Primitif yang dipakai adalah
   `ChoicePills` (dari `budget-sheet.tsx`) — primitif pilih-satu kanon repo — jadi **nol
   gaya baru** dan **mustahil terpotong** ("Kelua…") karena label full-width & hanya teks.
   Alasan UX: deck dompet MEMANG disaring konteks (`homeWallets(snapshot, context)`), jadi
   kontrolnya menempel pada benda yang ia kendalikan. Desktop TIDAK berubah: tetap
   `ContextMenu` (dropdown label-penuh) di cluster header.
2. **Strip notifikasi jadi SEL GRID.** Dulu ia `<div>` terpisah DI ATAS grid → satu-satunya
   cara membuat dompet benar-benar pertama di mobile adalah memindahkannya ke grid yang
   sama (`order-2` mobile). Desktop dipertahankan lewat `lg:col-span-12 lg:row-start-1`;
   baris bento lain bergeser +1 (`row-start-2..5`). Visual desktop praktis sama.
3. **`ContextMenu` tetap diimpor** — desktop masih memakainya (tidak ada dead import).

## Yang SENGAJA tidak diubah

- **`EmptyAccountNotice` tetap di atas grid.** Ia `null` kecuali akun baru saja dihapus;
  dalam keadaan itu justru WAJIB jadi hal pertama yang dibaca ("janji jujur" paket 43).
  Jadi ia satu-satunya pengecualian sadar dari aturan "tidak ada apa pun di atas dompet"
  — bukan kelalaian.
- **Angka & logika uang tidak disentuh.** `total = cashTotal(snapshot)` (seluruh dompet)
  tetap; strip & kartu-kartu lain tetap membaca store yang sama.

## Poin 3 — akar masalah & status

- **Kode sumber SUDAH benar** (paket 86): `TRANSACTION_DEFAULT_NAME` = `Pengeluaran`/`Pemasukan`
  (tanpa kata "cepat"), `recordDraftTransaction()` memakai `note` → **kategori** → default
  sebagai jaring terakhir. Baris Riwayat: judul = nama, chip **kategori di baris bawah**
  (`history-transaction-row.tsx`). Persis yang diminta.
- **Yang dilihat user = build BASI.** Chunk `.next/dev/server/chunks/ssr/lib_02-jj1v._.js`
  (10 Okt) masih memuat `expense: 'Pengeluaran cepat'`, padahal sumber `lib/data/history.ts`
  berubah 12 Okt; `dev.out.log` berakhir `ELIFECYCLE … exit code 1` (dev server mati).
- **Tindakan:** `.next/dev` (cache dev basi) DIHAPUS. `pnpm dev` berikutnya kompilasi
  ulang bersih. Diverifikasi: `.next/server` + `.next/static` (hasil build baru) **tidak
  memuat** string lama sama sekali.

## Validasi (dijalankan, output apa adanya)

```bash
pnpm exec tsc --noEmit   →  exit 0 (tanpa output/error)
pnpm theme:audit         →  ✓ palet bersih — 503 file diperiksa, tidak ada warna di luar palet
pnpm test                →  Test Files 87 passed (87) · Tests 1162 passed (1162)
pnpm build               →  ✓ sukses (tabel route lengkap, termasuk /app, /wallet, /history)
```

Pemeriksaan tambahan:

```text
grep 'Pengeluaran cepat|Pemasukan cepat' di .next/server + .next/static  →  0 hasil (BERSIH)
.next/dev (cache basi)                                                   →  dihapus
```

## Yang belum diverifikasi lewat mata

- Cek visual 375 px (tidak ada elemen konten di atas dompet; pill tidak terpotong) dan
  1440 px (grid desktop rapi) **belum dijalankan di browser sungguhan** — hanya diverifikasi
  lewat struktur kelas (`order-*`/`lg:*`) + build. Jalankan `pnpm dev` lalu periksa /app.

---

# Bagian 2 — Preferensi "Konteks Uang" + tombol di-center

## Permintaan pemilik produk (2 poin)

1. 3 tombol konteks **dibuat center**.
2. **Opsi**: user bisa memilih mau ditampilkan 3 jenis konteks atau tidak — tidak semua
   user butuh dompet **Keluarga** & **Bersama**. Diminta rekomendasi solusi terbaik.

## Solusi yang dipilih (dan alasannya)

**Bukan menambah pertanyaan baru** — jawabannya sudah ada di onboarding. Onboarding
langkah 1 sudah menanyakan situasi hidup, dan pilihannya menyalakan modul:
`couple` → `joint_wallet`, `sandwich` → `sandwich_generation`. Jadi:

1. **Preferensi** = `UserMoneySettings.enabledContexts` (`lib/user-money-settings.ts`) —
   store yang sama dengan pemasukan/payday, ikut `purgeDeviceData()`. Default `['pribadi']`.
   Diwarisi dari modul onboarding saat pertama dibaca (`contextsFromOnboarding()`), termasuk
   untuk file lama yang belum punya field ini.
2. **Pemilih menyembunyikan diri saat konteks tersedia < 2** → mayoritas user (cuma Pribadi)
   tidak melihat tombol konteks sama sekali. Ini yang menjawab "nggak semua user butuh".
3. **Konteks yang masih berisi dompet tidak bisa dimatikan** (saklar di Pengaturan terkunci
   + alasannya ditulis). Aturan yang sama dijaga `availableContexts()` sebagai jaring kedua.
   Alasan: menyembunyikan konteks = uang user tidak bisa dijangkau.
4. **Saklar ada di Pengaturan → `/settings` (Profil & Akun)**, kartu baru "Konteks Uang",
   tepat sebelum kartu "Dompet Bersama" — di situ juga user mengelola hubungan pasangan.

## File yang diubah (6) / alasan

| File | Perubahan |
|---|---|
| `lib/user-money-settings.ts` | + `enabledContexts` (opsional) + `enabledContextsOf()` + `contextsFromOnboarding()` + parser `contexts()`; **`useUserMoneySettings()` jadi reaktif** (`useSyncExternalStore` + `subscribeUserMoneySettings`, `notify()` di tiap tulis/purge/reset). Sebelumnya nilainya dibaca SEKALI saat mount → saklar di Pengaturan tidak akan menyegarkan halaman lain. |
| `lib/data/money-context.ts` | + `CONTEXT_ORDER`, `availableContexts()`, `contextOptionsFor()`, `CONTEXT_SETTINGS_COPY`; `CONTEXT_OPTIONS` diturunkan dari `CONTEXT_ORDER`. |
| `components/catetind/money-context-provider.tsx` | + `availableContexts` di context value (pilihan user ∪ dompet yang ada), + clamp: konteks aktif yang tak lagi tersedia dikembalikan ke yang pertama (dan IKUT tersimpan). |
| `components/catetind/context-menu.tsx` | Opsi disaring ke konteks tersedia; `return null` saat < 2 opsi. |
| `components/catetind/home-screen.tsx` | Pill memakai `contextOptionsFor(availableContexts)`, `className="justify-center"` (di-center), disembunyikan saat ≤1 opsi. |
| `components/catetind/settings-panel-account.tsx` | + kartu "Konteks Uang" (3 baris, saklar `role="switch"`; Pribadi & konteks berisi dompet terkunci). |

## Keputusan desain yang perlu diingat

- **`availableContexts` = pilihan user ∪ konteks berisi dompet ∪ `pribadi`.** Efek samping
  yang diterima: di demo (ada dompet Keluarga dari seed) saklar Keluarga terkunci — itu
  MEMANG aturannya, dan saklar **Bersama** tetap bisa dicoba untuk melihat efeknya.
- **Satu sumber urutan** (`CONTEXT_ORDER`): pill mobile, dropdown desktop, dan panel
  Pengaturan tidak bisa punya urutan berbeda.
- **Kontrol yang tidak mengontrol apa pun dilarang** (aturan paket 60.3) — karena itu
  pemilih disembunyikan, bukan ditampilkan dengan satu pilihan.

## Validasi Bagian 2 (output apa adanya)

```bash
pnpm exec tsc --noEmit   →  exit 0 (tanpa output/error)
pnpm theme:audit         →  ✓ palet bersih — 503 file diperiksa
pnpm test                →  Test Files 87 passed (87) · Tests 1172 passed (1172)  (+10 kasus baru)
pnpm build               →  exit 0
```

## Yang belum diverifikasi lewat mata (Bagian 2)

- Cek visual: (a) pill di-center di panel dompet; (b) pemilih HILANG saat saklar Keluarga &
  Bersama dimatikan; (c) kartu "Konteks Uang" di `/settings` + saklar terkunci untuk konteks
  berisi dompet. Belum dijalankan di browser — jalankan `pnpm dev`, buka `/settings` lalu `/app`.
- `inventaris_ui_definitif.md:43` masih menulis "Context Switcher pill toggle … sticky header"
  sebagai permintaan PRD. Realitas repo sudah berbeda sejak lama (dropdown non-sticky, paket
  65/75) dan sekarang ditambah pilihan user; dokumen inventaris belum diubah di paket ini.

