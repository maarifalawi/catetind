# Laporan 51 — Satu Store untuk Tagihan (+ "Lunas" yang Benar-benar Menggerakkan Uang)

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan **E** laporan 46 · **Fase 13**
· **Depends on:** paket 47 (`scope` di model) · **Menutup:** `bills-screen.tsx:71` (`useState(INITIAL_BILLS)`),
lima handler tulis di halaman itu, ekspor `/settings/data` & `/help` yang membaca konstanta, dan
alur "Hapus Akun" untuk domain tagihan.

> Ringkas: `/bills` **berhenti memegang salinan datanya sendiri**, dan "Tandai Lunas" **berhenti
> menjadi stempel kosong**. Daftar tagihan kini hidup di **`lib/money/bills-store.ts`** (store modul +
> `useSyncExternalStore` + persist IndexedDB key **`bills`**, resep yang sama dengan celengan paket 46
> & kekayaan paket 50), sementara satu tap "Tandai Lunas" membuka **pemilih dompet** dan menulis
> **satu baris ledger** (`postExpense`, kategori `Tagihan`) sebelum stempelnya naik. Kalau user
> menutup sheet tanpa memilih dompet, statusnya **tidak** berubah.

---

## 1. Bukti gap (audit 28 Sep 2026) → status

| # | Bukti (lokasi lama) | Status | Bukti perbaikan |
|---|---|---|---|
| 1 | `bills-screen.tsx:71` `useState(INITIAL_BILLS)` | ✅ FIXED | `useBillsStore()` + `liveBills(snapshot)` — 0 `useState` daftar tagihan di halaman |
| 2 | `bills-screen.tsx:117-135` `handleMarkPaid()` hanya `setBills(... isPaidThisMonth: true)` + toast LUNAS | ✅ FIXED | `handleMarkPaid()` → sheet dompet → `markBillPaid()` (baris kas + status dalam satu panggilan) |
| 3 | `bills-screen.tsx:145-192` hapus + Undo hanya `setBills(...)` | ✅ FIXED | `deleteBill()` (tombstone) + `restoreBill()` — status lunasnya ikut kembali |
| 4 | `bills-screen.tsx:195-210` `handleSaveBill()` tambah & edit | ✅ FIXED | `addBill()` / `editBill()` (id & jejak uang dijaga store) |
| 5 | `lib/data/help.ts:749` ekspor membaca konstanta `INITIAL_BILLS` | ✅ FIXED | `buildHelpExportPayload(now, bills, …)`; `help-center-screen.tsx` mengoper `liveBills(getBillsSnapshot())` |
| 6 | `lib/money/export.ts` tidak memuat tagihan sama sekali | ✅ FIXED | bagian `bills` + `counts.bills` + batas jujur; `EXPORT_SCHEMA_VERSION` naik ke **2** |
| 7 | Perubahan hilang setelah refresh | ✅ FIXED | persist IndexedDB key `bills` (bentuk record: §5 + `laporan/bukti/51-bills-record-contoh.json`) |
| 8 | "Hapus Akun" tidak membersihkan tagihan | ✅ FIXED | `purgeBillsStore()` + `billsCleared` di `PurgeReport` |
| 9 | `shield-meter`, `bill-timeline`, `salary-waterfall` menerima daftar dari state halaman | ✅ FIXED (satu sumber) | daftar yang dioper kini berasal dari store; tidak ada pemanggil lain di repo (diverifikasi grep) |
| 10 | `bill-notif-nudge` disebut membaca daftar tagihan | ⚠️ TIDAK BERLAKU | komponen itu tidak pernah membaca tagihan: isinya izin `Notification` + localStorage (`NOTIF_NUDGE_KEY`) |

**Akar masalahnya satu:** tagihan hidup di `useState` halaman, jadi (a) tidak bertahan setelah
refresh, (b) tidak ikut file ekspor, dan (c) "LUNAS" tidak menyentuh kas sama sekali — jenis temuan
yang sama dengan audit #1 paket 41 dan dilarang kanon "jujur di setiap klaim" (PRD 244).

---


## 2. Keputusan desain & alasannya

### 2.1 Hapus = TOMBSTONE, bukan `filter`
State-nya `{ bills, removedIds, hydrated }`. `deleteBill()` **menyimpan barisnya** dan memasang
tombstone, jadi Undo (`restoreBill()`) mengembalikan tagihan **beserta status "lunas bulan ini" dan
`paidRowId`-nya** — hal yang mustahil kalau hapus cuma `filter`. `liveBills(snapshot)` yang menyaring
tombstone untuk semua pembaca (daftar, tameng, waterfall, timeline, ekspor), sehingga tidak ada satu
pun dari mereka yang perlu tahu soal tombstone.

Bonus jujur: **hapus tagihan tidak menghapus baris kasnya.** Kalau uangnya memang sudah keluar,
menghapus tagihannya bukan alasan menghapus jejak uang itu (dikunci test).

### 2.2 `markBillPaid()` = pembungkus `postExpense()`, bukan salinan logika
Urutannya sengaja: (1) validasi (tagihan ada & belum lunas, dompet dikenal ledger, nominal > 0, saldo
cukup) → (2) baris kas ditulis lewat `postExpense()` — jalur yang sama dengan seluruh pengeluaran lain
di app (`appendRow` → `commit` → penjaga invariant ledger) → (3) baru statusnya berubah + `paidRowId`
disimpan. `null` = ditolak dan **tidak ada satu pun bagian yang ditulis**, bukan ditulis sebagian lalu
diklaim berhasil.

Konsekuensi yang ikut terjaga: double-tap tidak membayar dua kali (tagihan yang sudah lunas ditolak),
dompet asing (`OVO`, yang ada di `BILL_WALLET_OPTIONS` tapi **tidak** ada di ledger) ditolak, dan
pembayaran tidak boleh melebihi isi dompet.

### 2.3 `editBill()` menjaga jejak uang, `addBill()` tidak menerima `paidRowId`
Dua field `isPaidThisMonth` & `paidRowId` **tidak** boleh ikut ditambal dari form edit — kalau boleh,
satu field form bisa mencabut stempel LUNAS tanpa membalikkan baris kasnya (dua cerita lagi). Nilainya
selalu dikembalikan ke nilai lama setelah spread patch, dan `addBill()` sengaja membuang `paidRowId`
dari inputnya: jejak uang hanya boleh lahir dari `markBillPaid()`. Keduanya dikunci test.

### 2.4 `unmarkBillPaid()` = `removeRow` **+ pengembalian uang** (temuan saat implementasi)
Paket ini meminta pembatalan memakai `removeRow`. Saat diuji, ternyata **`removeRow()` tidak
mengembalikan saldo** di repo ini — itu kanon yang disengaja dan sudah dikunci test
(`lib/money/store.test.ts`: *"yang dihapus barisnya, bukan uangnya"*). Artinya `removeRow` saja akan
meninggalkan saldo user terpotong untuk pembayaran yang ia batalkan, tanpa satu baris pun yang bisa
menjelaskannya.

Karena itu `unmarkBillPaid()` melakukan **dua langkah** yang saling melengkapi:
1. `removeRow(paidRowId)` — baris pembayarannya hilang dari SEMUA pembaca (Riwayat, Home, `/wallet`,
   `/wallet/[id]`);
2. `postBalanceAdjustment()` — **satu-satunya jalur mengembalikan uang tanpa menulis ulang riwayat** —
   dengan nama sendiri (`BILL_UNPAID_REVERSAL_NOTE`: "Batal bayar Kredivo") dan kategori `Tagihan`.
   `BalanceAdjustmentInput` diberi `note`/`category` opsional (default copy Smart Sync tetap sama)
   supaya barisnya tidak terbaca sebagai "pemasukan tak tercatat" — kalimat yang membuat user mengira
   mendapat uang entah dari mana.

Membatalkan dua kali ditolak, jadi uangnya tidak pernah kembali dua kali.

### 2.5 Ekspor mengikuti pola paket 46 & 50
`collectExportSources()` membaca `liveBills(getBillsSnapshot())`; file ekspor punya bagian `bills` +
`counts.bills`, dan batas jujurnya menyebut bahwa tagihan dibaca dari store perangkat. Karena bentuk
file berubah, **`EXPORT_SCHEMA_VERSION` naik ke 2** — aturan yang ditulis di file itu sendiri.
`buildHelpExportPayload()` tetap **fungsi murni** (daftar tagihan dioper sebagai argumen dengan default
seed) karena `lib/data/*` tidak menyentuh store React.

### 2.6 Copy toast "Lunas" (keputusan copy — diminta paket ini)
`MARK_PAID_TOAST` berubah dari `${name} LUNAS! ✅` menjadi:

```
MARK_PAID_TOAST(name, amount, walletName) →  "Kredivo Rp 350.000 lunas dari BCA ✅"
```

Alasannya: kalimat "LUNAS" tanpa nominal & dompet adalah bentuk klaim yang justru ditutup paket ini.
Sekarang toast-nya menyebut **berapa** dan **dari mana**, plus satu baris pendukung *"Saldo dompetnya
sudah berkurang & catatannya masuk Riwayat"* dan tombol **Batal** (membalikkan baris kasnya). Kalau
user menutup sheet tanpa memilih, yang muncul justru `MARK_PAID_SHEET_COPY.closedNote` —
*"Belum ada yang dibayar — status tagihannya masih seperti semula."* — bukan stempel.

Catatan angka: contoh di prompt (Kredivo Rp 420.000) hanya ilustrasi; data demo repo ini Kredivo
**Rp 350.000**, dan bukti di §4/§5 memakai angka yang benar-benar ada di repo.

### 2.7 Yang SENGAJA tidak dilakukan
1. **`shield-meter`, `bill-timeline`, `salary-waterfall` tetap presentasional (menerima `bills` lewat
   props).** Alasannya: ketiganya komponen satu tanggung jawab, dan pencarian kode membuktikan **tidak
   ada pemanggil lain** di repo ini selain `bills-screen.tsx` — jadi props yang kini berasal dari store
   sudah berarti satu sumber, tanpa menambah ketergantungan tersembunyi ke store di dalam komponen
   tampilan.
2. **Sheet "Tandai Lunas" tidak punya field tanggal.** Pembayaran selalu tercatat pada `TODAY_ISO`
   demo (`2026-09-25`) — sama seperti patokan `CURRENT_DAY` halaman ini. Tanggal yang bisa dipilih user
   adalah tambahan yang tidak diminta paket ini, dan menambahkannya berarti memindahkan lagi patokan
   bulan demo.
3. **Baris kas lama milik tagihan seed tidak dikarang.** Empat tagihan contoh sudah berstatus "Lunas"
   sejak seed dan **tidak** punya baris ledger (baris itu tidak pernah ada). Karena itu `paidRowId`
   hanya diisi pembayaran yang benar-benar dilakukan user; `unmarkBillPaid()` pada tagihan seed hanya
   mencabut stempelnya dan hasilnya menyebut `row: null` — bukan pura-pura menghapus baris yang tidak
   ada.
4. **Tidak menyentuh kalender** (paket 56 yang mencabut ramalan) dan tidak mengubah `CURRENT_DAY`
   maupun nominal seed tagihan.

---

## 3. File yang dibuat & diubah

| File | Status | Isi |
|---|---|---|
| `lib/money/bills-store.ts` | **baru** | state `{ bills, removedIds, hydrated }` + persist key `bills`; API `addBill`, `editBill`, `deleteBill`, `restoreBill`, `markBillPaid`, `unmarkBillPaid`; selector `liveBills`, `billById`, `unpaidBills`, `billsForContext`, `useBillsStore`; hidrasi `mergeBillsState`; `purgeBillsStore`, `resetBillsStore` |
| `components/catetind/mark-bill-paid-sheet.tsx` | **baru** | sheet "Tandai Lunas": nominal + pemilih dompet (dari ledger, + saldo) + kalimat "uangnya keluar dari …" + pesan saldo kurang |
| `lib/money/bills-store.test.ts` | **baru** | 20 test: tulis baca lintas selector, tombstone + Undo, uang benar-benar bergerak, penolakan, persist/merge, purge, ekspor |
| `lib/money/idb.ts` | diubah | `BILLS_STATE_KEY = 'bills'` (key keempat di database yang sama) + komentar jumlah key |
| `lib/data/bills.ts` | diubah | `Bill.paidRowId?`; `BILL_PAYMENT_CATEGORY`; `MARK_PAID_TOAST(name, amount, wallet)`; `MARK_PAID_SHEET_COPY`; `MARK_PAID_TOAST_EXTRA`; `BILL_UNPAID_REVERSAL_NOTE`; `UPDATE_BILL_TOAST.expired` |
| `components/catetind/bills-screen.tsx` | diubah | buang `useState(INITIAL_BILLS)`; semua tulis lewat store; "Tandai Lunas" membuka sheet dompet + toast nominal/dompet + Batal; hapus/Undo lewat tombstone; `MOVE_DELAY` dihapus (status berubah saat itu juga) |
| `components/catetind/bill-card.tsx` | diubah | komentar aksi geser kanan disesuaikan (membuka pemilih dompet, bukan langsung menstempel) |
| `lib/money/store.ts` | diubah | `BalanceAdjustmentInput.note`/`.category` opsional (dipakai pengembalian uang saat pembatalan) |
| `lib/money/export.ts` | diubah | bagian `bills`, `counts.bills`, batas jujur baru, `EXPORT_SCHEMA_VERSION = 2`, `collectExportSources()` membaca store tagihan |
| `lib/data/help.ts` | diubah | `buildHelpExportPayload(now, bills, sinkingFunds, wealth)` (tetap murni, default seed) |
| `components/catetind/help-center-screen.tsx` | diubah | mengoper `liveBills(getBillsSnapshot())` |
| `lib/account.ts` | diubah | `purgeBillsStore()` + `billsCleared` di `PurgeReport` (dan komentar alur) |
| `lib/money/export.test.ts` | diubah | reset store tagihan + test "ekspor memuat tagihan dari store" |
| `lib/account.test.ts` | diubah | assert `billsCleared` + regresi privasi `mergeBillsState({ purged: true })` |
| `docs/handoff/laporan/bukti/51-bills-record-contoh.json` | **baru** | record nyata yang ditulis ke perangkat (§5) |

---

## 4. Rantai bukti (dijalankan sebagai test, bukan klaim)

| Langkah di paket | Bukti | Test |
|---|---|---|
| (a) tambah tagihan → muncul juga setelah refresh | edit nama & nominal ditulis ke key `bills`, lalu `mergeBillsState(persisted)` mengembalikannya; id sebelum hidrasi ≥ 1.000.000 sehingga tidak menabrak id tersimpan | `bills-store.test.ts` → *"tambah/edit/hapus/lunas ditulis ke perangkat & dibaca kembali oleh mergeBillsState"*, *"tagihan yang lahir SEBELUM hidrasi…"* |
| (b) `markBillPaid` Rp 350.000 dari BCA | saldo BCA `1.450.000 → 1.100.000`, satu baris `expense` kategori `Tagihan` bernama `Kredivo` muncul di `recordedTransactions()`, `bill.isPaidThisMonth = true` + `paidRowId` terisi | *"markBillPaid menulis SATU baris expense…"* |
| (b2) double-tap / penolakan | panggilan kedua `null` tanpa baris kedua; dompet asing (`OVO`), saldo kurang (`Tunai` Rp 50.000), nominal 0, dan tagihan yang sudah lunas → `null`, bills & rows tidak berubah | *"double-tap tidak membayar dua kali"*, *"ditolak (…) → TIDAK ada yang ditulis"* |
| (b3) salah tekan → batal | barisnya hilang dari semua pembaca (tombstone) **dan** saldo pulih ke `1.450.000` via baris koreksi berlabel "Batal bayar Kredivo"; batal dua kali ditolak | *"unmarkBillPaid mencabut barisnya (tombstone) & mengembalikan uangnya"* |
| (c) Undo hapus → statusnya benar | tagihan lunas yang dihapus lalu di-`restoreBill` kembali dengan `isPaidThisMonth: true` dan `paidRowId` yang sama; baris kasnya tidak ikut terhapus | *"restoreBill mengembalikan tagihan BESERTA status…"*, *"hapus tagihan TIDAK menghapus baris kas pembayarannya"* |
| (d) file ekspor memuat tagihan dari store | bagian `bills` + `counts.bills` di `/settings/data` (v2) dan `data.bills` di payload `/help`; tagihan yang dihapus tidak ikut | *"file ekspor /settings/data memuat tagihan dari store…"*, *"payload Pusat Bantuan…"* |
| Hapus Akun | `report.billsCleared = jumlah tagihan`, store kosong, dan `mergeBillsState({ purged: true })` tidak menghidupkan tagihan contoh | `account.test.ts` + *"purgeBillsStore mengosongkan store…"* |

---

## 5. Bentuk state di IndexedDB (key `bills`)

Satu record JSON di store `state`, database `catetind-money`:

```json
{
  "version": 1,
  "purged": false,
  "bills": [ { "id": "1", "emoji": "🏠", "name": "Kos Bulanan", "amount": 1500000, …,
               "isPaidThisMonth": true, "scope": "pribadi" },
             { "id": "5", "name": "Kredivo", "amount": 350000, "isPaidThisMonth": true,
               "scope": "pribadi", "paidRowId": "session-9001" },
             { "id": "1000000", "name": "Gym Bulanan (naik)", "amount": 250000, … } ],
  "removedIds": ["2"]
}
```

Contoh nyata (skenario: tambah Gym Bulanan Rp 200.000 → diubah jadi Rp 250.000 → bayar Kredivo
Rp 350.000 dari BCA → hapus Netflix) tersimpan di
`docs/handoff/laporan/bukti/51-bills-record-contoh.json`, diambil dengan menjalankan probe di
lingkungan test (jalur memory yang sama dengan app saat IndexedDB diblokir). Isinya juga membuktikan:
`removedIds: ["2"]`, `bills: 7`, tagihan lunas memuat `paidRowId: "session-9001"`, saldo BCA
`1.100.000` setelah bayar, dan `riwayatKas` memuat satu baris `Kredivo / Tagihan / BCA`.

---

## 6. Validasi (dijalankan, hasil apa adanya)

```bash
pnpm theme:audit          # ✔ palet bersih — 328 file diperiksa, tidak ada warna di luar palet
pnpm exec tsc --noEmit    # 0 error (exit 0; juga dijalankan dengan --incremental false)
pnpm test                 # 31 file · 433 test hijau (20 test baru bills-store + 1 export + 1 account)
pnpm build                # ✓ Compiled successfully (exit 0), 37 route ter-render
```

Smoke test produksi (`next start -p 3013–3014`, hasil apa adanya dari SSR HTML):

| Route | Status | Bukti di HTML |
|---|---|---|
| `/bills` | 200 | `Tagihan Rutin`, `Tameng Proteksi`, `Waterfall`, `7 Hari ke Depan`, chip **`6 tagihan`**, kartu `Kredivo` & `Cicilan HP`, aksi geser `Tandai Lunas ✓` |
| `/help` | 200 | Pusat Bantuan terbuka (file ekspor baru dibuat saat tombolnya diklik) |
| `/settings/data` | 200 | halaman ekspor terbuka |
| `/wallet` | 200 | halaman dompet terbuka |
| `/history` | 200 | Riwayat terbuka |

Catatan: angka demo **tidak bergeser** — daftar seed tetap 6 tagihan, saldo dompet tetap
BCA Rp 1.450.000 / GoPay Rp 350.000 / Tunai Rp 50.000 sebelum user menekan apa pun.

---

## 7. Hal yang belum bisa diverifikasi (batas jujur)

1. **Perilaku IndexedDB di browser sungguhan** (mode privat, kuota penuh, dua tab) belum diuji di
   perangkat — yang diuji adalah jalur logikanya (persist + `mergeBillsState` + purge) dan jalur
   memory yang sama yang dipakai app saat IndexedDB diblokir.
2. **Tidak ada sinkronisasi antar-perangkat** — sama seperti tiga store lain; di produksi barulah
   `insert`/`update`/`delete` ke tabel `bills` (tabelnya sudah ada + RLS).
3. **Empat tagihan seed yang "Lunas" tidak punya baris ledger** (barisnya tidak pernah ada di ledger
   mock) sehingga `unmarkBillPaid()` pada tagihan itu hanya mencabut stempelnya (`row: null`).
   Pembayaran yang benar-benar dilakukan user selalu punya barisnya.
4. **Pembatalan "Lunas" menulis dua jejak kas** (tombstone baris pembayaran + baris koreksi
   "Batal bayar …"). Akibatnya Riwayat menampilkan baris koreksinya tanpa pasangan baris
   pembayarannya. Ini konsekuensi kanon `removeRow` (lihat §2.4) yang dipilih supaya saldo pulih
   **dan** kewajiban paket "barisnya dibalikkan" tetap dipenuhi; baris yang di-tombstone tetap
   **auditable** di file ekspor (ditandai `removed: true`).
5. **Koreksi saldo pembatalan** dipakai karena itu satu-satunya jalur pengembalian uang tanpa menulis
   ulang riwayat. Alternatif yang sengaja TIDAK diambil: mengubah `walletBalance()` agar melewati
   tombstone — itu akan membalik kanon "hapus catatan ≠ uang kembali" dan mematahkan test
   `lib/money/store.test.ts`.
6. **Belum diuji dengan klik sungguhan di browser**: animasi stempel LUNAS (sekarang langsung di grup
   "Sudah Dibayar"), haptic, buka/tutup sheet, dan toast Batal. Yang diperiksa: jalur kode, SSR HTML,
   dan test lapis data.
7. **Pesan penolakan di sheet** memakai satu kalimat (`MARK_PAID_SHEET_COPY.rejected`) untuk sisa
   alasan penolakan store (mis. tagihan sudah berubah di tab lain); pemeriksaan saldo & nominal
   memiliki kalimatnya sendiri (`insufficient` / `invalid`). Dicatat sebagai calon perbaikan copy.
8. **`bill-notif-nudge`** tetap seperti semula (tidak pernah membaca daftar tagihan) — disebut di
   paket, tapi tidak ada perubahan yang diperlukan di sana.


