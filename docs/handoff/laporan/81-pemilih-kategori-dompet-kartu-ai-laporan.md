# 81 — KUNCI GANDA DI KARTU AI, PEMILIH KATEGORI & DOMPET MODERN, DOMPET DEFAULT YANG DIKATAKAN

**Status:** SELESAI (kode + test + gerbang validasi). **Verifikasi browser** tidak
bisa dijalankan di lingkungan ini (tanpa browser/perangkat nyata) — langkah
manualnya ada di §6, apa adanya.

Sumber kebenaran: laporan **79** (catatan dari AI selalu berkonteks),
`docs/handoff/CONTEXT-WAJIB.md` §3 (aturan warna) & §4 (copy wajib di `lib/data/*`),
serta aturan pemilih kustom yang sudah berlaku sejak **paket 69/78**
(`category-picker.tsx`, `wallet-picker.tsx`, `picker-sheet.tsx`).

---

## 1. Ringkas — yang dikeluhkan, dan akarnya

| # | Keluhan | Akar (dari kode) |
|---|---|---|
| 1 | Console error: `Encountered two children with the same key, `OVO`` (dan `DANA`) di `components/catetind/ai-capture-bubble.tsx:408` | Kartu konfirmasi AI memakai `<select key={option}>` yang isinya **NAMA** dompet (`walletOptionsFor().map(o => o.label)`). User boleh punya **dua dompet bernama sama** (`addWalletAccount()` tidak melarang), jadi dua `<option>` lahir dengan kunci identik. Nama dompet memang **bukan identitas** di app ini: pencocokan baris ke dompet BY-NAME (`walletIdOfName()`), jadi dua baris kembar itu bahkan mendarat di dompet yang sama |
| 2 | Pemilihan **kategori & dompet** di HP masih terasa "belum modern" | Dua field itu satu-satunya tempat yang masih `<select>` bawaan — di HP = roda pilihan sistem operasi: tanpa emoji kategori, tanpa pencarian, tanpa saldo dompet, dan (itulah kenapa #1 bisa terjadi) kuncinya nama. Semua pemilih lain di app sudah kustom (paket 69/78) |
| 3 | Pertanyaan produk: "kan ada dompet Pribadi, Bersama, dan Keluarga — kalau menambah transaksi defaultnya pakai dompet yang mana?" | Aturannya sudah ada dan sudah diuji (`defaultWalletNameFor()`, `captureWalletChoice()`), tapi **tidak pernah dikatakan di layar**: kartu diam-diam mengisi dompet, dan user baru tahu saat melihat Riwayat |

**Satu akar untuk #1 & #2, satu kalimat untuk #3.**


---

## 2. Yang dibangun

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/money/store.ts` *(diubah)* | `walletOptionsFor()` — **satu nama = satu baris** (dedupe case-insensitive, yang pertama menang); `captureWalletChoice()` memakai helper baru `captureWalletNames()`; **API baru** `captureWalletOptionsFor(snapshot, ctx)` → `{ id, label, balance }[]` dengan `id` dijamin unik & urut konteks aktif dulu; `CaptureWalletChoice` menambah `fromContext` | Kunci unik harus datang dari SATU tempat, bukan disaring lagi di JSX. Urutan pilihan NAMA dan pilihan lengkap ikut satu helper supaya tidak pernah berbeda |
| 2 | `components/catetind/ai-capture-bubble.tsx` *(diubah)* | `<select>` kategori → `CategoryPicker` (3 lapis, varian ikut tipe); `<select>` dompet → `WalletPicker` (bottom sheet, saldo + ikut tombol mata); opsi dompet dari `captureWalletOptionsFor`; prop baru `masked`; **kalimat baru** saat dompet diisi dari konteks aktif | Menutup galat kunci ganda di akarnya, dan menyamakan bahasa pemilih dengan form Catat & sheet Edit. Dua field itu sekarang selebar kartu (bukan grid 2 kolom) supaya label + saldo tidak terpotong di 375 px |
| 3 | `components/catetind/category-picker.tsx` *(diubah)* | Trigger menampilkan nilai yang **tidak ada di katalog** apa adanya (ikon tag + nama), bukan "Pilih kategori…"; header komentar mencatat aturan itu | Nilai tersimpan bisa datang dari luar katalog: tebakan AI (`Makanan`, `Gaji Utama`), kategori tetap tipe, atau kategori lama di sheet Edit. Field yang sudah terisi tidak boleh terbaca kosong |
| 4 | `components/catetind/wallet-picker.tsx` *(diubah)* | `WalletPickerOption.hint?` (pengganti baris "Saldo …"); trigger menampilkan nama apa adanya kalau nilainya tidak ada di opsi | Dompet data lama / dompet yang baru dihapus tidak boleh diklaim "Saldo Rp 0" — yang diketahui cuma "Belum ada di daftarmu" |
| 5 | `components/dashboard/transaction-input-engine.tsx` *(diubah)* | Mode EDIT: `<select>` kategori & dompet → `CategoryPicker` + `WalletPicker`; `withCurrentValue()`/`categoryOptions`/`editWalletOptions` (daftar nama) diganti `editWalletPickerOptions` (`{id,label,balance,hint}`) | Satu bahasa pemilih di seluruh app; nilai lama tetap aman (muncul di depan daftar, ber-keterangan, tidak mengaku punya saldo) |
| 6 | `lib/transaction-ai.ts` *(diubah)* | `TransactionDraftForm.walletFromContext?: boolean` (opsional) | Kartu perlu tahu dompetnya **disebut user** atau **diisi app** |
| 7 | `hooks/use-transaction-capture.ts` *(diubah)* | `withCaptureWallet()` meneruskan `choice.fromContext` → `walletFromContext` | Keputusannya murni & tinggal di store, hook tidak menghitung ulang |
| 8 | `lib/data/history.ts` *(diubah)* | Copy baru `TRANSACTION_INPUT_COPY.walletNotOwned` | Nol string user-facing di JSX (kontrak §4) |
| 9 | `lib/ai-chat.ts` *(diubah)* | Copy baru `AI_CAPTURE_COPY.walletContextNote(contextLabel, wallet)` | Menjawab pertanyaan produk di tempat kejadiannya, bukan di dokumentasi |
| 10 | `components/catetind/ai-chat-widget.tsx` *(diubah)* | Meneruskan `masked` (dari `usePrivacy()`) ke `AICaptureBubble` | Saldo di pemilih ikut tombol mata privasi global |
| 11 | `lib/money/store.test.ts` *(diubah)* | +4 kasus: dedupe nama kembar (yang pertama menang, saldo dompet yang benar-benar bergerak), urutan kartu AI konteks-aktif-dulu + `id` unik, kekonsistenan urutan dengan `captureWalletChoice().options`, dan `fromContext` (disebut user vs diisi app) | Setiap klaim di laporan ini ada test-nya |

---

## 3. Perilaku sesudah paket ini

| Keadaan | Sebelum | Sesudah |
|---|---|---|
| User punya 2 dompet bernama `OVO` | `<select>` berisi dua opsi `OVO`, React melempar *"two children with the same key"*; barisnya tetap mendarat di dompet pertama | **Satu baris** `OVO` (yang pertama, persis dompet penerima barisnya), kunci = `id` dompet → galatnya hilang karena akarnya hilang |
| Menyentuh pemilih kategori di HP | Roda `<select>` OS: 12 label kanon, tanpa emoji, tanpa pencarian | Bottom sheet 3 lapis: **Sering Dipakai → 9 grup (52 kategori) → pencarian toleran typo**, plus varian Pemasukan |
| Menyentuh pemilih dompet di HP | Roda `<select>` OS: nama dompet saja | Bottom sheet: nama + **saldo live** (ikut sensor privasi) + urut konteks aktif |
| Kategori draft `Makanan` (tebakan AI) | Terpampang di `<select>` | Terpampang di trigger pemilih (ikon tag) — bukan "Pilih kategori…" yang seolah kosong |
| Sheet Edit catatan berdompet lama yang tak ada di ledger | Daftar nama lama + (kalau dipaksa ke pemilih baru) "Saldo Rp 0" | Baris dompet itu ada di daftar, keterangannya **"Belum ada di daftarmu"** — bukan angka yang dikarang |
| Catatan AI yang dompetnya diisi dari konteks aktif | Tidak ada keterangan apa pun | Kalimat: *"Dompet aku isi BCA — dompet konteks Pribadi yang sedang kamu buka. Ganti di kolom Dompet kalau uangnya keluar dari dompet lain ya 🌿"* |

---

## 4. Dompet default — jawaban untuk pertanyaan produk

**Satu aturan, dipakai semua pintu: dompet diambil dari KONTEKS UANG yang sedang
dibuka (Pribadi / Keluarga / Bersama) — dan kalau user menyebut dompetnya sendiri,
yang disebut user menang.**

| Pintu | Default | Ketika konteks itu belum punya dompet |
|---|---|---|
| FAB "Catat" · sheet Edit · Kalender · Joint (`defaultWalletNameFor`) | dompet kanon pertama di konteks aktif (`BCA` di Pribadi, `Tunai` di Keluarga) | **tidak menebak**: form tertahan + arahan menambah dompet (paket 59.4) |
| Kartu konfirmasi AI (`captureWalletChoice`) | (1) dompet yang **disebut/didengar** user, kalau dompet itu memang miliknya · (2) dompet kanon pertama di konteks aktif · (3) dompet pertama di konteks itu | kartu menawarkan **semua** dompet user supaya ia memilih sendiri; "Catat ✓" menahan sampai dipilih |
| Struk / suara / ketikan tanpa dompet | tebakan parser/model (`Tunai`) kalau dompet itu nyata milik user; kalau tidak → dompet konteks aktif | sama seperti di atas |

Konsekuensi yang sekarang **terlihat di layar** (bukan di kepala user):
`walletFromContext` → satu kalimat di kartu; dompet di konteks lain → kalimat
"dompet ini ada di konteks lain"; tebakan tak dikenal → kalimat "AI nebak …".



---

## 5. Batas yang jujur (diketahui, tidak disembunyikan)

1. **Jalur AI masih punya tebakan bawaan `Tunai`.** `lib/transaction-ai.ts`
   (`RECEIPT_DEFAULT_WALLET`) dan `lib/ai/extract.ts` (`TRANSACTION_FALLBACK_WALLET`)
   sama-sama memakai `'Tunai'` saat tidak ada dompet yang disebut, dan prompt
   model pun berbunyi *"pakai \"Tunai\" kalau tidak disebut"*. Karena `Tunai`
   adalah dompet nyata (konteks **Keluarga**), catatan seperti `makan gacoan 30k`
   yang diketik sambil switcher di **Pribadi** akan mendarat di `Tunai` — dan
   kartunya MENGATAKANNYA (*"Dompet Tunai ada di konteks lain…"*). Mengubahnya
   menjadi "tidak disebut = tidak ada tebakan, pakai dompet konteks aktif"
   menyentuh kontrak AI (prompt + `extract.ts` + parser) dan tidak bisa
   diverifikasi tanpa provider sungguhan, jadi **sengaja tidak dikerjakan di
   paket ini** — keputusan produk, bukan bug render. Kalau diambil, paket
   lanjutannya kecil: `?? ''` di parser, `normalizeExtraction` mengembalikan `''`
   (dan nama tak dikenal dibiarkan apa adanya supaya bisa disebut di kartu), plus
   satu baris contoh di prompt.
2. **Dedupe dompet memakai nama, bukan id.** Itu mengikuti semantik store
   (`walletIdOfName()` = yang pertama). Kalau kelak pencocokan baris dipindah ke
   `id`, dedupe ini harus dikaji ulang — jangan dibalik tanpa memindahkan
   pencocokannya lebih dulu.
3. **Kategori dari katalog pemilih ≠ kategori kanon berdiri sendiri.**
   `Kopi & Minuman` (katalog) dan `Makanan` (kanon lama) sama-sama sah
   (`isCanonicalCategory`), tapi anggaran di `/budget` mencocokkan **label**
   (`findBudgetByCategory`). Ini perilaku yang sudah berlaku sejak paket 69 di
   form manual; kartu AI kini ikut kosakata yang sama.
4. **Verifikasi visual belum dijalankan** (tanpa browser): radius/anatomi pemilih
   di dalam panel chat (host pemilih = panel itu sendiri, pola paket 70) hanya
   terbukti lewat bacaan kode + build, bukan tangkapan layar.

---

## 6. Gerbang validasi

```
$ pnpm test
 Test Files  72 passed (72)
      Tests  948 passed (948)      # baseline laporan 80: 944 → +4 kasus

$ pnpm exec tsc --noEmit
(bersih — 0 error)

$ pnpm theme:audit
✓ palet bersih — 463 file diperiksa, tidak ada warna di luar palet.

$ pnpm build
✓ Compiled successfully (route table tampil, tanpa error)
```

Langkah manual yang masih perlu dijalankan di perangkat/browser:

1. Tambah dompet kedua bernama sama (mis. `OVO` dua kali) di `/wallet`.
2. Buka Dashboard → bubble **✨ AI Coach** → ketik `catet makan gacoan 30k`.
3. Di kartu konfirmasi: buka **Kategori** → pastikan sheet 3 lapis muncul **di
   dalam** panel chat (bukan di belakangnya) dan menutup pemilih tidak menutup form.
4. Buka **Dompet** → pastikan `OVO` hanya muncul **satu kali**, saldonya ikut
   tombol mata privasi, dan **Console tidak lagi menampilkan galat kunci ganda**.
5. Ubah switcher ke **Pribadi** → ketik `catet airminum 5k` → kartu harus
   mengatakan dompetnya datang dari konteks mana, dan Riwayat mencatat dompet itu.
