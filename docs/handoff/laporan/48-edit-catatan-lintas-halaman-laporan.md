# Laporan 48 — Edit Catatan Berlaku di SEMUA Halaman (bukan hanya di `/history`)

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan B laporan 46 · **Fase 13**

> Ringkas: "Edit" berhenti jadi urusan SATU halaman. Sebelumnya hasil edit hidup di
> `useState(editedTxs)` milik `/history` (dan salinan serupa di `/wallet/[id]`), jadi nilai baru
> hanya terlihat di halaman yang mengeditnya — Home, detail dompet, dan grafik "Arus Uang"
> tetap menampilkan angka lama, lalu setelah refresh edit itu hilang sama sekali.
> Sekarang edit menempuh **jalur yang sama dengan hapus & catat**: satu pintu tulis
> (`editRow()` di `lib/money/store.ts`), satu state, dan satu penerap untuk semua daftar
> (`applyRowOverride()`). Baris store benar-benar diperbarui di barisnya (saldo ikut bergerak,
> server menerima `PATCH`), sedangkan baris mock disimpan sebagai `rowOverrides` — konstanta
> `lib/data/*` tidak pernah disunting.

---

## 1. Bukti gap yang ditutup (temuan B laporan 46 → status)

| # | Gejala | Status | Bukti |
|---|---|---|---|
| 1 | `history-screen.tsx` menyimpan hasil edit di state halaman (`editedTxs`) | ✅ FIXED | §4 — `editedTxs` **dihapus**; `handleSaveEdit()` memanggil `editRow()` |
| 2 | Home (`recent-transactions-card`) menampilkan angka lama setelah edit | ✅ FIXED | §3 — baris seed & catatan sesi melewati `applyRowOverride()`; strip "Bulan ini" ikut |
| 3 | `/wallet/[id]` menampilkan angka lama + punya salinan `editedTxs` sendiri | ✅ FIXED | §4 — salinan dihapus, daftar & ringkasan 30 hari membaca store |
| 4 | Grafik "Arus Uang" (`cash-flow-card`) tidak pernah melihat edit | ✅ FIXED | §3 — himpunan baris yang sama, dengan override |
| 5 | Edit hilang setelah refresh (tidak ada tulisan ke store/penyimpanan) | ✅ FIXED | §2 — `rowOverrides` ikut ditulis ke IndexedDB & digabung saat hidrasi |
| 6 | Baris store yang diedit tidak pernah sampai ke server | ✅ FIXED | §2 — `updateRemoteRow()` (`PATCH` pada `id`), bukan `insert` yang dijawab 23505 |

Dampak yang tadinya bisa dibuktikan (dan sekarang tidak lagi): mengubah nominal "Kopi Kenangan"
di Riwayat → Home, `/wallet/<id>`, dan grafik tetap menampilkan angka lama; setelah refresh edit
itu malah hilang. Satu tindakan, dua cerita (PRD 244).

---

## 2. Store: satu pintu tulis untuk edit (`lib/money/store.ts`)

### Bentuk state & yang ditulis ke IndexedDB

`MoneySnapshot.rowOverrides: Readonly<Record<string, RowPatch>>` (baru) — kunci = `tombstoneKey(id)`,
persis pola `removedIds`, sehingga id `9001` (Riwayat) dan `session-9001` (Home) menunjuk baris yang sama.
`PersistedMoney.rowOverrides` ditulis oleh `commit()` dan dibaca `mergeMoneySnapshot()` /
`mergeWithRemote()` (union; tulisan sesi ini menang kalau kuncinya sama).

Contoh isi record `money` di IndexedDB (`saveMoneyState`) setelah satu edit:

```json
{
  "wallets": [ /* … WalletSeed … */ ],
  "rows": [ /* … baris ledger … */ ],
  "removedIds": ["session-7"],
  "rowOverrides": {
    "session-2": { "amount": 45000 },
    "seed-2": { "amount": 9000000, "name": "Gaji Bulanan (revisi)" }
  },
  "syncedIds": ["tx-…"],
  "purged": false
}
```

`purgeMoneyStore()` (hapus akun) kini menulis `rowOverrides: {}` — bukan hanya di memory, tapi juga di
state tersimpan, supaya tidak ada satu pun jejak "data contoh" yang hidup kembali.

### API baru

| Fungsi | Kegunaan |
|---|---|
| `editRow(id, patch)` | **satu-satunya pintu edit.** Mengembalikan baris hasil tulisan, atau `null` = tidak menulis apa pun |
| `rowOverrideOf(snapshot, id)` | patch satu baris (kunci `tombstoneKey`) |
| `applyRowOverride(snapshot, row)` | menerapkan patch ke baris yang sedang dipajang (generic: `HistoryTransaction`/`HomeMoneyRow`) |
| `RowPatch` | field yang boleh diubah: `name`, `amount`, `type`, `category`, `wallet`, `walletId`, `dateISO`, `aiGenerated` |

### Kontrak `editRow()`

1. **Baris yang sudah dihapus tidak dihidupkan kembali** → `null`, tanpa tulisan (hapus menang atas edit).
2. **Input tidak sah tidak menulis apa pun** → `null`: nominal ≤ 0 / bukan angka, tipe di luar
   `expense|income|transfer|saving`, `walletId` yang tidak ada di ledger, tanggal bukan `YYYY-MM-DD`.
3. **Baris STORE (`session-*`)** → barisnya diperbarui (`note`, `amount`, `type`, `category`,
   `dateISO`, `walletId`+`walletName`), lalu `commit()` (yang menjalankan `assertSnapshot()`) dan
   `updateRemoteRow()` (Supabase `PATCH` by `id`; RLS `ledger_rows_owner_update` yang menjaga).
   Saldo tidak dihitung ulang di mana pun — store selalu menurunkannya dari `opening + Σ baris`.
4. **Baris MOCK (konstanta `lib/data/*`)** → patch disimpan di `rowOverrides`; konstanta demo TIDAK
   disunting. Katalognya dibaca dari tiga konstanta yang memang tampil di daftar: `HISTORY_TRANSACTIONS`
   (Riwayat), `HOME_MONEY_ROWS` (Home + grafik arus uang), `WALLET_DETAIL_TRANSACTIONS` (`/wallet/[id]`).
5. **Urutan yang berlaku rata:** hapus (tombstone) **>** edit (`rowOverrides`) **>** baris aslinya.
   Urutan itu ditulis di SATU tempat — `recordedTransactions()` — supaya tidak ada daftar kedua yang
   lupa menerapkannya.


---

## 3. Keputusan desain (dan alasannya)

### 3.1 Dompet yang belum ada di ledger → "belum terhubung", bukan penolakan membisu

Prompt paket ini menyebut `dompet tidak dikenal` sebagai input tidak sah. Aturan itu **ditegakkan di
lapis id** (`walletId` yang tidak ada di ledger ⇒ patch ditolak, tidak ada tulisan) — tapi untuk
NAMA dompet yang datang dari sheet Edit, aturannya dibuat sama dengan `postTransaction`:
nama dompet yang belum jadi dompet di ledger membuat barisnya `walletId: ''` ("belum terhubung"),
bukan menebak dompet terdekat **dan bukan pula menolak seluruh edit secara diam-diam**.

Alasannya konkret dan bisa dijangkau di demo ini: `TRANSACTION_WALLET_OPTIONS` berisi `OVO`,
sementara ledger hanya punya `bca`/`gopay`/`tunai`. Tiga baris mock Riwayat memakai OVO
(`HISTORY_TRANSACTIONS` id 5, 11, 12) dan user bisa mencatat catatan baru dengan OVO. Kalau nama
dompet asing menolak seluruh patch, maka "ubah nominal Kopi Kenangan" akan **gagal tanpa suara**
(sheet tertutup, tanpa toast) — dan itu kelas bug "tombol yang diam-diam tidak bekerja" yang sudah
dihapus paket 33. Dengan aturan ini hasilnya konsisten dengan catatan baru ber-OVO: barisnya tampil
jujur sebagai OVO dan tidak menggerakkan saldo dompet mana pun (uangnya keluar dari dompet asalnya,
karena barisnya memang tidak lagi milik dompet itu).

### 3.2 Jenis baris ledger dipertahankan saat nominalnya diedit

Baris `balance_adjustment` (koreksi saldo) dan `change` (kembalian) nominalnya BERTANDA, sementara
sheet menampilkannya sebagai pengeluaran/pemasukan biasa. Kalau user hanya mengubah nominal, jenis
aslinya dipertahankan (tanda ikut) — jadi "Pengeluaran Tak Tercatat 50.000" yang diubah jadi 20.000
tetap tercatat sebagai selisih −20.000, bukan berubah jadi pengeluaran biasa. Jenis barunya hanya
dipakai kalau user benar-benar mengganti tipe di sheet.

### 3.3 Pindah dana: dompet lawan dilepas saat jenisnya berubah

Ledger menolak `expense` yang masih membawa `counterWalletId` (invarian "jenis ini tidak boleh punya
dompet lawan"), dan membiarkannya berarti dompet tujuan tetap menerima uang dari baris yang sudah
bukan transfer lagi. Jadi: jenis berubah dari `transfer` → `expense` **melepas** dompet lawannya.
Sebaliknya, kalau dompet SUMBER dipilih sama dengan dompet lawan (uangnya jadi tidak pindah ke
mana-mana), patch ditolak seluruhnya (`null`) — bukan ditulis setengah jalan.

### 3.4 Edit baris store dikirim ke server lewat `updateRemoteRow()`, bukan `pushRowToServer()`

`pushRowToServer()` adalah INSERT, sedangkan `ledger_rows` punya `unique (user_id, client_tx_id)`:
baris yang diedit sudah ada di sana, jadi jawabannya `23505` — kode yang justru diterjemahkan sebagai
"sudah tersimpan", padahal isinya masih versi lama. Karena itu ditambahkan satu fungsi di adapter
Supabase yang sudah ada (`lib/supabase/money-remote.ts`) memakai `update` pada `id` baris
(`primary key (user_id, id)`; RLS `ledger_rows_owner_update` yang menjaga). Tidak ada jalur tulis
kedua: halamannya tetap cuma memanggil `editRow()`.

### 3.5 Tidak ada event analitik baru

Katalog `lib/analytics.ts` adalah daftar TERTUTUP enam event yang dikunci audit
(`analytics.test.ts`: *"mendaftarkan tepat enam event kritikal yang diminta audit"*). Menambah
`transaction_updated` berarti mengubah keputusan audit itu — di luar lingkup paket ini, dan
dilaporkan di sini sebagai pilihan sadar (bukan kelalaian).

### 3.6 Baris mock hanya punya NAMA dompet

Baris mock tidak punya baris ledger, jadi `walletId` di patch diterjemahkan ke nama dompetnya
(`walletNameOf()`), dan `applyRowOverride()` hanya menimpa field yang memang DIMILIKI barisnya —
baris Home tidak punya `wallet`, baris Riwayat tidak punya `title`. Satu fungsi penerap cukup untuk
dua bentuk baris, tanpa field karangan.

### 3.7 Toast hanya saat penulisan berhasil

`handleSaveEdit()` selalu menutup sheet, tapi toast `UPDATE_TRANSACTION_TOAST` (copy lama — tidak ada
string baru di JSX) hanya berbunyi kalau `editRow()` mengembalikan baris. Input tidak sah atau baris
yang sudah dihapus → halaman tidak mengklaim "tersimpan".

---

## 4. Halaman berhenti memegang salinan

| Berkas | Sebelum | Sesudah |
|---|---|---|
| `components/catetind/history-screen.tsx` | `useState<Record<number, HistoryTransaction>>(editedTxs)` + `editedTxs[tx.id] ?? tx` saat menyusun daftar | state dihapus; daftar mock melewati `applyRowOverride(snapshot, tx)` (`:189-191`); `handleSaveEdit()` → `editRow(next.id, {…})` (`:272-286`) |
| `components/catetind/wallet-detail-screen.tsx` | `editedTxs` + `editedTxs[tx.id] ?? tx` di dua cabang daftar | state dihapus; kedua cabang melewati `applyRowOverride()` (`:157-163`); `handleSaveEdit()` → `editRow()` (`:210-222`) |
| `components/catetind/recent-transactions-card.tsx` | konstanta tingkat modul `GROUPS` dari seed (tanpa override) | `seedGroups(snapshot)` (`:174-181`) + `applyRowOverride()` di baris seed & strip periode (`:411-415`) |
| `components/catetind/cash-flow-card.tsx` | `HOME_MONEY_ROWS.filter(¬removed)` | `…filter(¬removed).map(applyRowOverride)` (`:145-151`) |
| `lib/supabase/money-remote.ts` | hanya `pushRowToServer` (insert) & `deleteRemoteRow` | `updateRemoteRow()` (`:146-155`) |
| `lib/money/store.ts` | tombstone + pintu catat | `RowPatch`, `rowOverrides`, `editRow()`, `rowOverrideOf()`, `applyRowOverride()` (`:146-179`, `:601-649`, `:1281-1503`) |

Daftar penerima nilai baru (yang wajib konsisten): **Riwayat**, **Home** ("Transaksi Terakhir" +
strip "Bulan ini"), **grafik "Arus Uang"**, dan **`/wallet/[id]`** (daftar, ringkasan 30 hari, tren).
`/wallet/[id]` juga otomatis benar saat dompet barisnya dipindah: filter `tx.wallet === wallet.name`
membaca nilai baru, jadi barisnya berpindah halaman tanpa kode tambahan.

---

## 5. Test murni (tanpa browser) — `pnpm test`

Seluruhnya di `lib/money/store.test.ts` (10 kasus baru dalam satu `describe` "edit catatan = satu
pintu tulis lintas halaman (paket 48)") + 1 kasus di `lib/money/store-remote-merge.test.ts`:

| # | Kasus | Yang dijaga |
|---|---|---|
| 1 | edit baris store: nominal & dompet | saldo dompet asal/tujuan bergerak, `cashTotal` benar, barisnya DIPERBARUI (bukan ditambah); Σ baris = Σ saldo − Σ opening (dihitung ulang lewat `netEffect()`, bukan `assertSnapshot` yang sama) |
| 2 | satu edit terbaca sama di Riwayat, Home, `/wallet/[id]` | daftar Riwayat, himpunan baris Home + strip `summarizeHomeMoney` (naik persis sebesar nilai BARU), dan saring dompet halaman dompet |
| 3 | edit nominal baris MOCK | tidak ada baris ledger baru, `cashTotal` tidak bergerak, konstanta `HISTORY_TRANSACTIONS`/`HOME_MONEY_ROWS` tetap utuh, tapi `applyRowOverride()` (yang dibaca Home & Riwayat) menampilkan nilai baru |
| 4 | bertahan setelah refresh (`mergeMoneySnapshot`) | baris store & override baris mock tetap baru; kunci id `9001` vs `session-9001` menunjuk baris yang sama |
| 5 | `purgeMoneyStore()` | override dibuang, bukan dihidupkan kembali |
| 6 | edit baris yang sudah dihapus | `null`, baris tetap terhapus, nominal tidak berubah diam-diam |
| 7 | input tidak sah | nominal 0/negatif/NaN, tipe asing, `walletId` asing, tanggal salah format, id tak dikenal → semuanya `null` tanpa tulisan |
| 8 | jenis baris dipertahankan | koreksi saldo tetap `balance_adjustment` (nominal bertanda), bukan berubah jadi expense |
| 9 | ganti jenis transfer | dompet lawan dilepas saat jadi `expense`; dompet lawan tidak boleh jadi sumber (`null`) |
| 10 | dompet belum ada di ledger | baris jadi `walletId: ''` + nama apa adanya; saldo dompet lama kembali, total kas benar |
| 11 | (`store-remote-merge.test.ts`) hidrasi dari server | `rowOverrides` lokal tetap berlaku (server tidak menyimpannya) |

Test lama tetap hijau; dua ekspektasi yang memang berubah karena bentuk state bertambah juga
diperbarui secara eksplisit: `lib/account.test.ts` (isi penyimpanan setelah hapus akun kini memuat
`rowOverrides: {}`) dan literal `MoneySnapshot` di `store.test.ts` / `store-remote-merge.test.ts`.

---

## 6. Validasi (dijalankan, hasil apa adanya)

```bash
pnpm theme:audit
> node scripts/theme/audit-palette.mjs
✓ palet bersih — 321 file diperiksa, tidak ada warna di luar palet.

pnpm exec tsc --noEmit
exit=0                                   # tidak ada satu pun error TypeScript

pnpm test
 Test Files  27 passed (27)
      Tests  370 passed (370)
   Duration  2.65s

pnpm build
✓ Compiled successfully in 1795ms
✓ Generating static pages using 19 workers (34/34) in 588ms
Route (app) … 34 route terdaftar (semua route lama tetap ada)
```

Smoke test produksi (`next start`, server dimatikan lagi setelahnya):

| Route | Status | Catatan |
|---|---|---|
| `/` | 200 | 201.346 byte HTML — kartu Home dirender dari seed (tanpa override di kunjungan pertama, sesuai harapan) |
| `/history` | 200 | 189.358 byte; "Ayam Geprek Bu Rini", "Kopi Kenangan Oat Latte", "Rp 25.000", "Rp 32.000" ada di HTML |
| `/wallet/bca` | 200 | 111.164 byte |
| `/wallet/gopay` | 200 | 93.896 byte |

Log server bersih (hanya banner Next 16.3.3 + "Ready in 179ms") — tidak ada error runtime di keempat
halaman yang paling banyak menyentuh store.

---

## 7. Batas jujur — yang belum bisa diverifikasi di sini

1. **Tap/geser di perangkat sungguhan.** Lingkungan ini tidak punya browser/driver, jadi alur
   "geser kanan → Edit → Simpan" dibuktikan lewat fungsi yang benar-benar dipanggil halaman
   (`editRow`, `applyRowOverride`, `recordedTransactions`) + SSR keempat route, bukan lewat klik.
   Yang belum diuji: animasi sheet Vaul saat menyimpan, dan perilaku papan tombol saat mengedit nominal.
2. **Sinkronisasi dua perangkat.** `updateRemoteRow()` memakai `PATCH` pada `id` baris dengan RLS
   `ledger_rows_owner_update` (sudah ada di migrasi paket 45), tapi belum diuji terhadap project
   Supabase sungguhan di sini — tidak ada sesi/kredensial di lingkungan ini.
3. **Edit saat offline (dengan sesi Supabase).** Jalur lokal selalu berhasil (baris + IndexedDB),
   tapi kalau `PATCH` gagal, pada pembacaan berikutnya versi SERVER yang menang
   (`mergeWithRemote`) — jadi edit itu bisa kembali ke nilai lama setelah refresh. Tidak dibuat
   antrean edit karena paket ini melarang jalur tulis kedua; batas ini ditulis di komentar
   `updateRemoteRow()`.
4. **Ekspor data (`lib/money/export.ts`).** Baris store yang diedit ikut ekspor (ekspor membaca
   `snapshot.rows`), tapi override baris MOCK tidak ikut — sama seperti batas lama yang sudah
   tertulis di file itu ("transaksi contoh dari masa lalu hidup di konstanta `lib/data/*` dan ikut
   apa adanya"). Belum diubah di paket ini.
5. **Tombol Edit di kartu Home masih belum membuka sheet.** `recent-transactions-card.tsx` (`:249-258`)
   menyediakan gesture "geser kanan = Edit" tapi tombolnya masih hanya menutup tray (no-op) — di luar
   lingkup paket 48 (paket ini menutup kebocoran lintas halaman, bukan menambah pintu edit baru).
   Mesinnya sekarang SUDAH siap: `editRow('seed-2', …)` + `applyRowOverride()` terbukti bekerja untuk
   baris Home (lihat test #3), jadi paket berikutnya tinggal menyambungkan sheet-nya.
6. **`/budget` (dan kartu "Jatah Hari Ini") masih membaca konstanta mock apa adanya.**
   `periodIncome(period)` & `SPENT_TODAY` di `lib/data/budget.ts` membaca `HISTORY_TRANSACTIONS`
   langsung (dan `SPENT_TODAY` dihitung sekali saat modul dimuat), jadi nominal baris mock yang
   diedit tidak mengubah angka di sana. Ini **batas lama, bukan regresi paket ini**: baris mock yang
   DIHAPUS pun tidak pernah mengubah angka-angka itu. Menyambungkannya berarti menyentuh
   `lib/data/budget.ts` + angka kanon `DAILY_HUD`/`SPENT_THIS_MONTH` yang justru dilarang diubah oleh
   prompt paket ini, jadi dilaporkan terbuka di sini.

