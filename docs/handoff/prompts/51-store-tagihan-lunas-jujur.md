# 51 — Satu Store untuk Tagihan (+ "Lunas" yang Benar-benar Menggerakkan Uang)

**Paket:** temuan E dari laporan 46 · **Fase 13** · **Depends on:** 47 (untuk `scope` di model)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + laporan 46 §2 (resep store) & §6 tabel temuan E.

## Bukti gap (audit 28 Sep 2026)

| Bukti | Isi |
|---|---|
| `components/catetind/bills-screen.tsx:71` | `const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS)` — daftar tagihan hidup di HALAMAN |
| `bills-screen.tsx:117-135` | `handleMarkPaid()` hanya `setBills(prev.map(... isPaidThisMonth: true))` + `toast.success(MARK_PAID_TOAST)` |
| `bills-screen.tsx:145-192` | hapus + Undo juga hanya `setBills(...)` |
| `bills-screen.tsx:195-210` | `handleSaveBill()` (tambah & edit) → `setBills(...)` |
| `lib/data/help.ts:749` | file ekspor membaca **konstanta** `INITIAL_BILLS` |
| `components/catetind/shield-meter.tsx`, `bill-timeline.tsx`, `salary-waterfall.tsx`, `bill-notif-nudge.tsx` | semuanya membaca daftar yang dioper halaman — begitu halaman berubah, semuanya ikut, tapi **tidak ada yang tahu setelah refresh** |

Dua masalah, satu akar:

1. **Tidak bertahan & tidak lintas halaman** — tagihan baru / perubahan nominal / status lunas hilang
   setelah refresh dan tidak ada di file ekspor.
2. **"Lunas" tidak menggerakkan uang** — stempel LUNAS + toast "sudah dibayar" muncul, tapi tidak ada
   satu baris pun di ledger (`lib/money/ledger.ts`), jadi saldo dompet tidak berkurang. Ini jenis
   temuan yang SAMA dengan audit #1 paket 41 ("melunasi tanpa uang keluar") dan dilarang oleh kanon
   "jujur di setiap klaim" (PRD 244).

## Peta baca

- **Resep wajib (tiru):** `lib/money/funds-store.ts` (+ testnya) dan `lib/money/wealth-store.ts`
  (paket 50) — store modul, `hydrated`, selector, `purgeBillsStore()`, persist IndexedDB per bagian.
- `lib/money/idb.ts` → `loadDeviceState`/`saveDeviceState`; key `bills` di database `catetind-money`.
- `lib/money/store.ts` → `postExpense()`/`postTransaction()` (+ `defaultWalletNameFor`),
  `walletOptionsFor()`, `recordedTransactions()`.
- `lib/data/bills.ts` → `Bill`, `BillStatus`, `groupBills()`, `totalMonthlyBills()`,
  `burnPercentage()`, `getBillStatus()`, `upcomingDays()`, `MARK_PAID_TOAST`, `DELETE_BILL_TOAST`,
  `billWalletOptions`.
- `components/catetind/wealth-hutang.tsx:94-98` — pola "Catat Bayar" (sheet dompet + `postDebtSettlement`)
  yang harus ditiru untuk "Tandai Lunas" tagihan.
- `components/catetind/bills-screen.tsx:106-108` + `bill-timeline.tsx` — alasan kenapa daftar & timeline
  wajib membaca satu sumber (audit #3 lama: "kalender & daftar tidak kontradiksi").

## Yang dikerjakan (urutan)

1. **Store baru `lib/money/bills-store.ts`** — state `{ bills, hydrated }`, API tulis:
   - `addBill(input)`, `editBill(id, patch)`, `deleteBill(id)` + `restoreBill(id)` (Undo! — pola
     tombstone atau simpan baris yang dihapus sampai Undo lewat, jangan cuma `filter`),
   - `markBillPaid(id, walletName)` → menulis **satu baris ledger** lewat `postExpense()` (kategori
     `'Tagihan'`, catatan = nama tagihan) **dan** menandai `isPaidThisMonth` — dua-duanya dalam satu
     pemanggilan, dan `null` = ditolak (dompet tidak dikenal/saldo kurang) → tidak ada yang ditulis,
   - `unmarkBillPaid(id)` (kalau user salah tekan) — **wajib** membalikkan barisnya juga
     (`removeRow`), bukan hanya stempelnya,
   - selector: `useBillsStore()`, `getBillsSnapshot()`, `billById`, `unpaidBills`,
     `billsForContext(scope)`.
2. **Semua pembaca tagihan lewat store** — `bills-screen.tsx` (hapus `useState(INITIAL_BILLS)`),
   `bill-timeline`, `shield-meter`, `salary-waterfall`, `bill-notif-nudge`, dan file ekspor
   (`lib/data/help.ts` + `lib/money/export.ts` kalau memuat tagihan) membaca snapshot store.
3. **"Tandai Lunas" jujur & bergerak** — satu tap membuka pemilih dompet (reuse pola
   `wealth-hutang.tsx` "Catat Bayar"; daftar dompet dari `walletOptionsFor(snapshot)`, default
   dompet konteks aktif), lalu:
   - toast menyebut nominal **dan** dompet ("Kredivo Rp 420.000 lunas dari BCA") — copy di `lib/data/*`;
   - saldo dompet itu benar-benar turun (bisa dibuktikan di `/wallet`, Home, dan Riwayat);
   - kalau user menolak memilih dompet (tutup sheet), statusnya **tidak** berubah — jangan
     menempelkan stempel LUNAS tanpa uang keluar.
4. **Undo & hapus** — Undo setelah hapus mengembalikan tagihan **dan** statusnya; baris ledger yang
   sudah tertulis TIDAK dihapus diam-diam (kalau user memang sudah membayar, uangnya tetap keluar).
5. **Hapus Akun** — `purgeBillsStore()` dipanggil `lib/account.ts`, jumlahnya dilaporkan
   (`billsCleared` di `PurgeReport`) dan tidak menghidupkan seed setelah refresh.
6. **Test murni** (`lib/money/bills-store.test.ts`):
   - tambah/edit/hapus tagihan bertahan setelah `mergeBillsState()` (simulasi refresh);
   - `markBillPaid` → saldo dompet turun + baris `expense` kategori `'Tagihan'` muncul di
     `recordedTransactions()`; `unmarkBillPaid` → baris itu hilang (tombstone) dan saldo pulih;
   - `markBillPaid` dengan dompet asing/saldo kurang → `null`, `bills` & `rows` tidak berubah;
   - `purgeBillsStore()` mengosongkan store.

## Larangan

- Memakai localStorage untuk daftar tagihan (harus IndexedDB lewat `lib/money/idb.ts`).
- Menandai "Lunas" tanpa baris ledger (itu bug yang ditutup), atau menulis baris ledger tanpa
  menandai status (dua cerita lagi).
- Mengubah bulan/tanggal patokan demo (`CURRENT_DAY`) atau nominal seed tagihan.
- Menyalin logika `getBillStatus()`/`groupBills()` ke komponen.
- Menyentuh kalender (paket 56 yang mencabut ramalan; kalender punya seed sendiri).

## Bukti yang harus ditunjukkan

- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Rantai bukti satu tagihan: (a) tambah tagihan → muncul juga setelah refresh; (b) `markBillPaid`
  Rp 420.000 dari BCA → saldo BCA turun Rp 420.000, baris muncul di Riwayat, stempel LUNAS muncul;
  (c) Undo hapus → tagihan kembali dengan status yang benar; (d) file ekspor (`moneyExportJson()` /
  `buildHelpExportPayload()`) memuat tagihan dari store, bukan konstanta.
- Laporan: file dibuat/diubah + keputusan copy toast "Lunas" + hal yang belum bisa diverifikasi.
