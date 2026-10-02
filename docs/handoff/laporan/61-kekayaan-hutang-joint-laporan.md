# Laporan 61 — Kekayaan & Hutang + Joint (Uang Bersama)

**Status:** ✅ SELESAI · **Paket:** 61
**Prompt:** `docs/handoff/prompts/61-kekayaan-hutang-joint.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`
**Acuan terkait:** laporan 50 (hutang/aset) & 52 (joint)

> Kerangka ini diisi oleh paket 61. Judul bagian jangan dihapus — isi selnya.

## 1. Ringkas (3–5 baris)

1. **Hutang & piutang akhirnya punya EDIT dan HAPUS.** `editDebt()`/`deleteDebt()` sudah ada &
   teruji di store sejak paket 50 tapi **nol pemanggil** (diakui laporan 50 §8 poin 4) — sekarang
   ada tombolnya, dibuka lewat sheet yang SAMA dengan Tambah (mode edit, pola sheet Investasi).
2. **"Catat Bayar / Diterima" sekarang LANGSUNG TERLIHAT.** Dulu hanya ada di dalam panel yang
   harus di-expand (atau di balik geseran kanan yang tak terlihat); sekarang tiap kartu hutang
   platform & personal punya baris aksi tetap: `[Catat Bayar] [Edit] [Hapus]`.
3. **Hapus berubah dari "buang baris" menjadi TOMBSTONE + Undo**, untuk hutang **dan** aset —
   satu dialog, satu jendela Undo, satu nada copy (kanon AUDIT §4.6).
4. **Joint: hapus PER BARIS ada (sebelumnya nol), kantong baru benar-benar KOSONG, dan tiga
   keadaan halaman dinyatakan di layar** — termasuk pernyataan bahwa kantong bersama tidak
   menyentuh kas pribadi.
5. Empat perintah validasi hijau: **618 test / 39 file** (naik dari 603), `tsc` 0 error,
   build sukses, palet bersih.

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/money/wealth-store.ts` | +`removedIds` (ber-prefix `debt:`/`inv:`) di state/persisted/merge; `deleteDebt`/`deleteInvestment` jadi tombstone; +`restoreDebt`/`restoreInvestment`; +`liveDebts`/`liveInvestments`; guard tombstone di `editDebt`/`editInvestment`/`updateInvestmentPrice`/`settleDebt`; `debtById`/`investmentById`/`paymentsOf` menyaring tombstone | Kanon AUDIT §4.6: hapus = tombstone, bukan hapus fisik. Tanpa itu, Undo mustahil dan hapus bisa "hilang" saat seluruh daftar kosong (seed hidup lagi) |
| 2 | `components/catetind/wealth-delete-dialog.tsx` | **BARU** — satu dialog hapus untuk hutang & aset | 61.2: "satu pengalaman, bukan dua" |
| 3 | `lib/data/wealth.ts` | +`DEBT_SHEET_COPY`, `DEBT_SHEET_FIELD_COPY`, `WEALTH_ROW_ACTION` (+`aria`), `DEBT_STATUS_COPY`, `DELETE_DEBT_COPY`, `DELETE_ASSET_COPY`, `DELETE_DEBT_TOAST`, `DELETE_ASSET_TOAST`, `DEBT_EDIT_TOAST`, +`debtName()`; import `UNDO_WINDOW_MS` | Copy user-facing wajib di `lib/data/*` (kanon §2), dan durasi Undo dibaca dari satu konstanta |
| 4 | `components/catetind/confirm-dialog.tsx` | +prop opsional `note` | Dialog hapus kekayaan butuh satu kalimat fakta ("baris kas tidak ikut hilang") yang terpisah dari "apa yang hilang" |
| 5 | `components/catetind/add-debt-sheet.tsx` | +mode EDIT (`initial`, `onEdit`), +kolom **sisa**, judul/deskripsi/tombol dari data, arah disembunyikan untuk platform, field tanggal tidak dipajang di mode edit | Satu sheet dua mode (pola sheet Investasi). Kolom sisa ada karena `Debt` menyimpan POKOK & SISA — dan angka yang dihitung di Net Worth adalah sisanya |
| 6 | `components/catetind/wealth-hutang.tsx` | +`DebtActionRow` (baris aksi selalu terlihat) di kartu platform & personal; +prop `onEditDebt`/`onDeleteDebt`; tombol bayar ganda di panel detail dihapus | 61.1: aksi utama harus langsung terlihat dan aksi Edit/Hapus harus ada |
| 7 | `components/catetind/wealth-screen.tsx` | `liveDebts`/`liveInvestments`; +state edit/hapus +ref Undo; +`handleEditDebt`, `handleSaveDebtEdit`, `handleDeleteDebt`, `undoDeleteDebt`, `confirmDeleteDebt`; `handleDeleteAsset` jadi dua langkah + Undo; +2 dialog di `<AnimatePresence>` | Halaman pemilik state: dialog & jendela Undo; satu pintu tulis (`editDebt`/`deleteDebt`/`restoreDebt`) |
| 8 | `lib/money/export.ts`, `components/catetind/help-center-screen.tsx` | daftar kekayaan dibaca lewat `liveDebts()`/`liveInvestments()` | Ekspor & Pusat Bantuan tidak boleh memuat catatan yang sudah dihapus user |
| 9 | `lib/money/joint-store.ts` | +`removedIds` (state/persisted/merge); +`deleteJointTransaction`, `restoreJointTransaction`, `createJointPocket`, `jointDeleteState`; `jointLedgerFeed`/`jointNotes` menyaring tombstone; guard di `updateSplit`/`setPaidBy` | 61.3: hapus per baris + kantong baru kosong. Aturan "bulan yang sudah settle dikunci" hidup di SATU tempat |
| 10 | `lib/data/joint.ts` | +`JOINT_STATE_COPY` (3 keadaan), `JOINT_PERSONAL_CASH_COPY`, `JOINT_DELETE_COPY`; +`created?` di `JointWallet`; import `UNDO_WINDOW_MS` | Keadaan halaman & relasi dengan kas pribadi harus DIKATAKAN, bukan ditebak; `created` memisahkan "belum ada kantong" dari "menunggu pasangan" |
| 11 | `components/catetind/joint-state-card.tsx` | **BARU** — kartu tiga keadaan + catatan hubungan dengan kas pribadi | Satu tempat menjelaskan alur `/joint` |
| 12 | `components/catetind/joint-timeline.tsx` | +prop `deleteState`/`onDelete`; tombol Hapus di detail kartu + `lockedNote` untuk bulan yang sudah settle | Pintu hapus per baris; alasan "kenapa tidak ada tombol" dituliskan |
| 13 | `components/catetind/joint-screen.tsx` | +`jointState`; +`JointStateCard`; `onCreated` → `createJointPocket()`; +handler hapus/Undo + `ConfirmDialog`; timeline menerima `deleteState`/`onDelete` | Pemilik state & dialog; kantong baru = nama baru + buku besar kosong |
| 14 | `lib/money/wealth-store.test.ts` | +8 kasus (edit setelah bayar, delete setelah bayar, tombstone, Undo, investasi, tolak lunas baris terhapus) + `netWorthOfStores()` memakai `live*()` | 61.1 & 61.2 |
| 15 | `lib/money/joint-store.test.ts` | +7 kasus (delete mengubah timbangan, bulan settle dikunci, baris turunan, Undo, tombstone bertahan, kantong baru kosong + bertahan, invariant kas pribadi) | 61.3 |

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 61.1 | Hutang/piutang: bayar terlihat, edit, hapus | ✅ | `DebtActionRow` di `wealth-hutang.tsx` (tombol bayar SELALU tampil + Edit + Hapus, tinggi 40 px); `AddDebtSheet` mode edit; `wealth-screen.tsx` → `editDebt()`/`deleteDebt()`/`restoreDebt()`; dialog `WealthDeleteDialog` + toast Undo 5 detik (`UNDO_WINDOW_MS`) |
| 61.1 | Copy konfirmasi jujur (tidak menghapus baris kas + akibat ke Net Worth) | ✅ | `DELETE_DEBT_COPY` (`lib/data/wealth.ts`): `bodyTail` menyebut arah akibatnya ("hutang hilang → Net Worth **naik** sebesar itu"), `cashNote` = "Pembayaran yang sudah kamu catat TIDAK ikut terhapus … barisnya tetap ada di Riwayat. Saldo dompetmu tidak berubah sama sekali."; dibuktikan test *"deleteDebt menyembunyikan catatannya, TAPI baris kas & saldo dompet tetap"* |
| 61.1 | Empty state + cara memilih yang jelas di Hutangku & Piutangku | ✅ (tidak diubah, sudah ada) | `EmptyDebtState` + segmented `Hutangku/Piutangku` (2 opsi, `role="tablist"`); empty state per-view + `contextLine` khusus konteks uang |
| 61.1 | Skenario AC lengkap + tabel saldo & Net Worth per langkah | ✅ | §4 tabel pertama (**diukur**, bukan dihitung tangan) |
| 61.1 | Test ≥ 6 kasus `editDebt` + kombinasi (edit setelah bayar, delete setelah bayar) | ✅ **8 kasus** | `lib/money/wealth-store.test.ts` → describe *"hapus = tombstone + undo (paket 61)"* |
| 61.2 | Pola konfirmasi + Undo aset SAMA dengan hutang | ✅ | Hapus aset kini lewat `WealthDeleteDialog` varian `asset` + toast Undo yang sama; sebelumnya langsung hilang tanpa konfirmasi (`wealth-screen.tsx:286-290` versi lama). Test: *"deleteInvestment + restoreInvestment: nilai portofolio & Net Worth kembali utuh"* |
| 61.2 | Tabel pola sama (buat/edit/hapus/undo) untuk aset & hutang | ✅ | §4 tabel ketiga |
| 61.3 | Tiga keadaan `/joint` dituliskan & tampilkan di layar | ✅ | `JOINT_STATE_COPY` (`empty`/`waiting`/`active`) + kartu `JointStateCard` di ATAS percabangan; keadaan ditentukan `wallet.created` (bukan ditebak dari nama seed) |
| 61.3 | Kantong BARU harus KOSONG | ✅ | `createJointPocket()` menandai semua baris seed terhapus (tombstone) + `settlements` dikosongkan + `createdAt` = hari ini + `created: true`; `onCreated` mengarah ke sana. Diukur: catatan `8 → 0`, dan **tetap 0** setelah `mergeJointState()` (simulasi refresh) |
| 61.3 | Nyatakan relasi dengan kas pribadi di UI | ✅ | `JOINT_PERSONAL_CASH_COPY` di `JointStateCard` (tampil di ketiga keadaan) |
| 61.3 | Hapus transaksi joint PER BARIS, hanya yang BELUM disettle, copy menyebut akibat ke saldo patungan | ✅ | `deleteJointTransaction()` (+ `jointDeleteState()` sebagai satu aturan yang dipakai UI & store); tombol Hapus di `joint-timeline.tsx`; `JOINT_DELETE_COPY` menyebut "saldo patungan kalian berdua ikut terhitung ulang"; bulan yang sudah settle → `lockedNote`, bukan tombol yang diam-diam hilang |
| 61.3 | Jelaskan apa yang terjadi pada `isEmptyJoint` saat partner belum gabung | ✅ | `isEmptyJoint` tetap `partnerJoined && jointNotes(joint).length === 0` (`joint-screen.tsx`) — artinya: **selama pasangan belum bergabung, empty state itu TIDAK dipakai**; yang tampil adalah flow undangan. Setelah paket 61 keadaan itu tidak lagi ambigu karena `JointStateCard` menyebutkan langkahnya, dan kantong baru benar-benar kosong sehingga begitu pasangan bergabung, empty state-nya jujur |
| 61.3 | Test ≥ 6 kasus hapus + invariant "kantong tidak menyentuh kas pribadi" | ✅ **7 kasus** | `lib/money/joint-store.test.ts` → describe *"hapus satu baris & kantong baru kosong (paket 61.3)"*, termasuk invariant `cashTotal()` & jumlah baris kas |

## 4. SEBELUM → SESUDAH (angka)

Semua angka di bawah **diukur** dengan skrip ukur sementara di atas store asli (seed kanon:
BCA = Rp 1.450.000, kas total = Rp 1.850.000, hutang aktif seed = Rp 3.450.000, Net Worth seed =
Rp 14.699.330), lalu skripnya dihapus — bukan dihitung tangan.

### 4.1 Siklus hutang (61.1) — `addDebt` → `settleDebt` → `editDebt` → `deleteDebt` → `restoreDebt`

| Langkah | Saldo BCA | Hutang aktif (Net Worth) | Net Worth | Catatan | Baris kas |
|---|---|---|---|---|---|
| L0 seed (sebelum apa-apa) | Rp 1.450.000 | Rp 3.450.000 | Rp 14.699.330 | 5 | 0 |
| L1 buat hutang **Rp 1.000.000** (Dita) | Rp 1.450.000 | Rp 4.450.000 | **Rp 13.699.330** (−1.000.000) | 6 | 0 |
| L2 catat bayar **Rp 400.000** dari BCA | **Rp 1.050.000** (−400.000) | Rp 4.050.000 | **Rp 13.699.330** (TIDAK berubah) | 6 | **1** |
| L3 edit → pokok Rp 900.000, **sisa Rp 500.000** | Rp 1.050.000 | Rp 3.950.000 | **Rp 13.799.330** (+100.000) | 6 | 1 |
| L4 **hapus** catatan (tombstone) | Rp 1.050.000 (uang **tidak** kembali) | Rp 3.450.000 | **Rp 14.299.330** (+500.000) | 5 | **1** (tetap) |
| L5 **Undo** (restore) | Rp 1.050.000 | Rp 3.950.000 | **Rp 13.799.330** (kembali persis) | 6 | 1 |

Cara reproduksi di browser: `/wealth` → tab **Hutang** → **Tambah Utang/Piutang** (mis. Rp 1.000.000)
→ pada kartunya tekan **Catat Bayar** (Rp 400.000, dompet BCA) → tekan ikon **✏️ Edit** (ubah pokok
& sisa) → tekan ikon **🗑️ Hapus** → tekan **Undo** di toast. Bandingkan dengan kartu Net Worth di
atas tab dan halaman `/history` (baris kas tetap ada di sana).

| Yang diukur | Sebelum (paket 50–60) | Sesudah (paket 61) | Cara reproduksi |
|---|---|---|---|
| Aksi "Catat Bayar" terlihat tanpa aksi lain | Hanya di dalam kartu yang di-*expand* (`wealth-hutang.tsx` panel detail) | Baris aksi tetap di tiap kartu (`DebtActionRow`) | Buka `/wealth` → tab Hutang, lihat kartu tanpa menyentuh apa pun |
| Edit pokok/sisa hutang | **Tidak ada tombol sama sekali** (`editDebt()` nol pemanggil) | Sheet mode edit (pokok + **sisa**) | Tombol ✏️ di kartu |
| Hapus catatan hutang | **Tidak ada tombol sama sekali** (`deleteDebt()` nol pemanggil) | Dialog konfirmasi → tombstone → toast **Undo 5 detik** | Tombol 🗑️ di kartu |
| Hapus = hapus fisik? | Ya (`filter()`), Undo mustahil | **Tidak** — tombstone; baris & riwayat pembayarannya disimpan | Test *"restoreDebt mengembalikan catatan + riwayat + Net Worth seperti semula"* |
| Baris kas pelunasan saat catatan dihapus | Tetap | Tetap (disebut eksplisit di dialog) | Test *"deleteDebt menyembunyikan catatannya, TAPI baris kas & saldo dompet tetap"* |

### 4.2 Pola yang sama untuk aset & hutang (61.2)

| Aksi | Hutang/piutang | Aset investasi |
|---|---|---|
| **Buat** | sheet Tambah (tab Hutang) | sheet Tambah Investasi (tab Investasi) |
| **Edit** | tombol ✏️ → sheet yang sama, mode edit | geser kiri → Edit → sheet yang sama, mode edit |
| **Hapus** | tombol 🗑️ → `WealthDeleteDialog` (varian `debt`) | geser kiri → Hapus → **`WealthDeleteDialog` (varian `asset`)** ← dulu tanpa konfirmasi |
| **Undo** | toast `DELETE_DEBT_TOAST` (5 detik) | toast `DELETE_ASSET_TOAST` (5 detik) ← dulu tidak ada |
| **Efek ke angka** | hutang hilang → Net Worth **naik** sebesar sisa | aset hilang → Net Worth **turun** sebesar nilai pasar |

Angka aset (diukur): Net Worth `Rp 13.799.330` → hapus BBCA (nilai `Rp 4.937.500`) →
**`Rp 8.861.830`** (−4.937.500), saldo BCA **tetap** Rp 1.050.000, jumlah aset 4 → 3.
Undo → Net Worth kembali `Rp 13.799.330`, aset kembali 4.

### 4.3 Tiga keadaan `/joint` (61.3)

| Keadaan | Yang tampil | Bukti terukur |
|---|---|---|
| **1. Belum ada kantong** | Kartu "Langkah 1 dari 3 — Belum ada kantong bersama" + CTA "Buat Dompet & Ajak Pasangan" (isi nama) + catatan "kantong baru selalu KOSONG" | `keadaan=empty`; nama masih seed `"Dompet Kita 💚"`, `wallet.created` kosong |
| **2. Kantong ada, partner belum gabung** | Kartu "Langkah 2 dari 3 — Menunggu pasanganmu bergabung" + kode undangan (`JointInviteCodeModal`, status menunggu) | setelah `createJointPocket('Dompet Kita Berdua')`: `keadaan=waiting`, **catatan=0**, feed=0 |
| **3. Partner sudah gabung** | Kartu "Langkah 3 dari 3 — Kantong kalian sudah aktif" + buku besar, catat bareng, settle | setelah `addJointMember(partner)`: `keadaan=active`, anggota `user_a,user_b` |

### 4.4 Hapus satu baris joint (61.3) — dampak ke timbangan & settlement

| Langkah (baris "Nonton bareng" Rp 400.000, ditanggung Jon, bagi rata) | Catatan | Total pengeluaran bersama | `myNet` | `partnerNet` | `settlementAmount` |
|---|---|---|---|---|---|
| H0 sebelum dihapus | 1 | Rp 400.000 | Rp 200.000 | −Rp 200.000 | Rp 200.000 |
| **H1 sesudah dihapus** | 0 | **Rp 0** | **Rp 0** | **Rp 0** | **Rp 0** |
| H2 sesudah **Undo** | 1 | Rp 400.000 | Rp 200.000 | −Rp 200.000 | Rp 200.000 |

| Yang diukur | Sebelum | Sesudah |
|---|---|---|
| Fungsi hapus di `joint-store.ts` | **0** (nol) | `deleteJointTransaction()` + `restoreJointTransaction()` |
| Baris bulan yang **sudah** disettle | — | **ditolak** oleh store + alasannya ditulis di kartu (`lockedNote`) |
| Kantong baru dibuat | berisi 8 catatan contoh (`INITIAL_JOINT_TRANSACTIONS`) & tanggal seed | **0 catatan** (dan tetap 0 setelah refresh), tanggal = hari ini, `created: true` |
| **Kantong joint menyentuh kas pribadi?** | TIDAK | **TIDAK** — `cashTotal()` tetap `Rp 1.850.000` dan jumlah baris kas tidak berubah setelah catat bareng + settle + ganti kantong (diuji; kalimatnya juga tampil di UI) |
| Jumlah test repo | 603 test / 39 file | **618 test / 39 file** (+15) |

## 5. Test

| File test | Jumlah kasus (paket 61) | Hasil |
|---|---|---|
| `lib/money/wealth-store.test.ts` | **+8** (total file 21 → 29) | ✅ semua lulus |
| `lib/money/joint-store.test.ts` | **+7** (total file 25 → 32) | ✅ semua lulus |
| seluruh repo | **618 test / 39 file** (sebelum paket 61: **603 / 39**) | ✅ 0 gagal, 0 `.skip` |

Kasus baru `wealth-store.test.ts` (describe *"hapus = tombstone + undo (paket 61)"*):

1. `editDebt` membetulkan pokok & sisa **tanpa** menyentuh kas maupun riwayatnya (edit **setelah** ada pembayaran).
2. `editDebt` menurunkan status dari sisa (`0` = `settled`, naik lagi = `active`) & menolak nilai tidak sah.
3. `deleteDebt` menyembunyikan catatannya, **tapi baris kas & saldo dompet tetap** (delete **setelah** pembayaran).
4. `restoreDebt` mengembalikan catatan + riwayat + Net Worth seperti semula.
5. Undo yang tidak sah gagal jujur — `restore*` → `null`, `delete*` dua kali → `false`.
6. Tombstone bertahan setelah state dibaca ulang (`mergeWealthState`) & **hapus SEMUA hutang tidak menghidupkan seed**.
7. `deleteInvestment` + `restoreInvestment`: nilai portofolio & Net Worth kembali utuh (+ edit/harga ditolak di balik tombstone).
8. Catatan yang sudah dihapus tidak bisa dilunasi → tidak ada baris kas baru.

Kasus baru `joint-store.test.ts` (describe *"hapus satu baris & kantong baru kosong (paket 61.3)"*):

1. `deleteJointTransaction` mengubah **timbangan & posisi bersih**, bukan cuma daftarnya (Σ net tetap 0).
2. Bulan yang sudah ditandai settle **DIKUNCI** → hapus ditolak, tidak ada yang ditulis (`jointDeleteState` = `locked`).
3. Baris turunan (settle/pembuka bulan) tidak bisa dihapus dari pintu ini (`none`).
4. Undo mengembalikan baris **beserta angka timbangannya** (dan hapus dua kali tidak menulis dua kali).
5. Tombstone bertahan setelah `mergeJointState()` & tidak menghidupkan catatan contoh.
6. `createJointPocket`: kantong baru **KOSONG**, bertahan setelah refresh, tanggalnya hari ini, nama kosong ditolak.
7. Kantong baru tidak membawa penanda settle lama & **tetap TIDAK menyentuh kas pribadi** (invariant `cashTotal()`).

## 6. Validasi (output apa adanya)

```bash
pnpm test
#  ✓ 39 file test lulus
#     Test Files  39 passed (39)
#          Tests  618 passed (618)
#       Duration  2.74s

pnpm exec tsc --noEmit
# (tidak ada keluaran — 0 error)
# EXIT=0

pnpm build
# ✓ Compiled successfully in 1284ms
# ✓ Generating static pages using 19 workers (34/34) in 715ms
# EXIT=0
# (rute /wealth, /joint, /history, /wallet, … semuanya terbentuk)

pnpm theme:audit
# ✓ palet bersih — 347 file diperiksa, tidak ada warna di luar palet.
# EXIT=0
```

Catatan mesin: `pnpm --version` di sini **9.12.0** (sedangkan `package.json` menulis
`packageManager: pnpm@12.3.4`), dan keempat perintah di atas jalan **tanpa** flag tambahan.
`pnpm build` dijalankan terakhir setelah semua perubahan.

## 7. Batas jujur

1. **Uji visual 375 px / 1440 px TIDAK dijalankan.** Lingkungan kerja ini tidak punya browser, jadi
   yang bisa saya buktikan hanya: `tsc` bersih, 618 test hijau, build sukses, dan palet bersih.
   Yang belum terverifikasi: tidak ada horizontal scroll di 375 px, bottom nav tidak menutupi
   baris aksi kartu terakhir, dan grid 1440 px. Baris aksi kartu hutang tingginya 40 px dan
   tombol nominalnya `flex-1 min-w-0 truncate` (dirancang agar tetap satu baris di 375 px), tapi
   itu **klaim desain, bukan hasil ukur**.
2. **Realtime `/joint` hanya nyata kalau ada sesi Supabase** (batas yang sudah dinyatakan laporan 52
   §3). Paket 61 tidak mengubah lapisan realtime sama sekali: tanpa sesi, yang hidup tetap timer
   mock (`DEMO_REALTIME_MOCK`), dan tidak ada sinkronisasi antar-perangkat. Yang diuji di paket ini
   adalah **store & aturannya**, bukan jaringan.
3. **Tidak memverifikasi perilaku di perangkat sungguhan** (Safari/iOS `pointerCapture`,
   `navigator.share`, pembacaan IndexedDB nyata). Store-nya sudah teruji murni + persist
   IndexedDB-nya sama dengan empat store lain yang sudah ada.
4. **Deviasi sadar dari AUDIT §1.9 (gesture):** kartu hutang platform **masih** memakai *swipe kanan
   = "Catat Bayar"*, sedangkan kanon bilang *swipe kanan = edit, swipe kiri = hapus*. Saya TIDAK
   mengubah gesturnya di paket ini karena (a) prompt 61 hanya mewajibkan aksinya **terlihat**, dan
   sekarang memang terlihat semua, (b) mengganti arah gestur adalah perubahan perilaku yang lebih
   besar daripada yang diminta, dan (c) menghapusnya berarti menghapus affordance lama tanpa
   diminta. Ini **belum diperbaiki**, dan saya tidak mengklaim sebaliknya (lihat §8.1).
5. **`debtPayments` di file ekspor masih memuat riwayat pembayaran catatan yang sudah dihapus.**
   Sengaja: baris kas pelunasan itu fakta, dan `deleteDebt` tidak pernah menghapusnya. Yang
   disaring tombstone adalah daftar **`debts`** dan **`investments`**; `payments` sengaja dibiarkan
   utuh — kalau pemilik repo ingin ekspor hanya memuat catatan yang masih ada, itu keputusan produk
   (§8.3).
6. **Undo hanya hidup selama jendelanya (5 detik) dan selama tab tidak di-reload.** Setelah itu
   tombolnya tidak ada lagi; tombstone-nya tetap tersimpan di perangkat (tidak ada data yang
   hilang), tapi tidak ada UI untuk membatalkan lewat jalan lain. Persis pola Tagihan & Riwayat.
7. **"Kantong baru" hanya bisa dibuat dari flow undangan** (saat pasangan belum gabung). Di keadaan 3
   (kantong aktif) tidak ada tombol "buat/ganti kantong" — dan paket ini tidak menambahkannya
   (di luar daftar item prompt; lihat §8.4).
8. **`editDebt` boleh mengubah ARAH** (hutang ⇄ piutang) karena formnya sama dengan "Tambah", dan
   salah pilih arah termasuk salah ketik yang wajar. Akibatnya ke Net Worth berubah (hutang → aset),
   dan itu **tidak** diberi dialog konfirmasi tersendiri (§8.2).
9. **Kolom "Sisa" dibatasi ≤ pokok.** Kalau memang uangnya sudah keluar lebih besar, jalurnya
   "Catat Bayar" (supaya ada baris kasnya) — dan itu tertulis di form, bukan diam-diam ditolak.
10. **Paket 60 belum punya laporan** (masih kerangka 1,5 KB) padahal AUDIT §9 menaruhnya sebelum 61.
    Paket 61 dikerjakan di atas baseline repo yang **hijau** (603 test / 39 file sebelum perubahan,
    diukur ulang di awal sesi ini), bukan di atas laporan 60 yang lengkap. Saya tidak menyentuh
    berkas paket 60.
11. **`removedIds` kekayaan ber-prefix (`debt:` / `inv:`)** dan itu wajib: id seed berimpit antar
    daftar. Ini tertangkap test paket 61 sendiri (sebelum dirilis): dengan kunci telanjang,
    menghapus hutang `'1'` ikut menghilangkan saham `'1'` dari portofolio — Net Worth salah
    Rp 6.548.630. Kalau paket 62 (hapus data semua jalur) menyentuh tombstone, tempatnya
    `purgeWealthStore()`/`purgeJointStore()`, bukan `filter()` di komponen.

## 8. Pertanyaan terbuka

1. **Gesture kanon AUDIT §1.9 vs perilaku kartu hutang.** Sekarang aksinya sudah selalu terlihat,
   jadi gestur sebenarnya tidak lagi perlu. Pilihannya: (a) ubah jadi kanan = Edit / kiri = Hapus
   (mengikuti kanon), (b) hapus gesturnya sama sekali karena redundan dengan baris aksi, atau
   (c) biarkan seperti sekarang. Saya memilih (c) + menuliskannya di §7.4 — keputusan ini milik
   pemilik repo.
2. **Batas `remaining` saat edit.** Paket 61 mengizinkan user membetulkan "sisa belum dibayar"
   (dibatasi ≤ pokok) supaya salah ketik tidak permanen. Kalau maksud produknya "sisa hanya boleh
   berubah lewat Catat Bayar", tinggal hapus kolom sisa dari sheet edit — `editDebt()` di store
   tetap menerima `remaining` (dipakai test & migrasi).
3. **Riwayat pembayaran catatan yang dihapus di file ekspor** (§7.5): dipertahankan (fakta kas) atau
   ikut disaring tombstone supaya isi ekspor = yang terlihat di layar?
4. **Kantong joint yang sudah aktif**: perlu pintu "buat kantong baru / mulai ulang" (mis. setelah
   pasangan tidak lagi dipakai)? `createJointPocket()` sudah siap dipanggil, tapi belum ada UI-nya
   di keadaan 3 — dan menambahkannya berarti menyediakan aksi merusak untuk angka bersama, yang
   butuh keputusan copy & konfirmasi sendiri.
5. **Kasus tepi hari**: `createJointPocket()` memakai tanggal PERANGKAT (`new Date()`) sebagai
   `createdAt`. Kalau jam perangkat user salah, "Bersama sejak …" ikut salah. Alternatifnya memakai
   `useTodayISO()`/jam server — paket 61 memilih tanggal perangkat karena jalur ini hanya berjalan
   dari klik user (bukan render), jadi tidak ada risiko hydration mismatch.
