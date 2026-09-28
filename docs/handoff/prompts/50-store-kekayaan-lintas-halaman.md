# 50 — Satu Store untuk Kekayaan (Hutang, Piutang, Investasi, Aset)

**Paket:** temuan D dari laporan 46 · **Fase 13** · **Depends on:** 47 (untuk `scope` di model)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + **laporan 46 §2** (resep store yang baru
> dipakai untuk celengan) + laporan 46 §6 tabel temuan D.

## Bukti gap (audit 28 Sep 2026)

`/wealth` memegang SALINAN datanya sendiri:

| Bukti | Isi |
|---|---|
| `components/catetind/wealth-screen.tsx:95-98` | `useState(INITIAL_INVESTMENTS)`, `useState(INITIAL_DEBTS)`, `useState(INITIAL_DEBT_PAYMENTS)` |
| `wealth-screen.tsx:152,176,182,209,216,245` | `handleSaveInvestment`, `handleUpdatePrice`, `handleSavePrice`, `handleEditAsset`, `handleSaveAssetEdit`, `handleDeleteAsset` → semuanya `setInvestments(...)` |
| `wealth-screen.tsx:269,348` | `handlePayDebt`, `handleSaveDebt` → `setDebts(...)`/`setPayments(...)` |
| `lib/money/export.ts:215-218` | file ekspor membaca **konstanta** `INITIAL_DEBTS`, `INITIAL_DEBT_PAYMENTS`, `INITIAL_INVESTMENTS` |
| `lib/data/help.ts:750-752` | ekspor dari Pusat Bantuan juga konstanta |
| `components/catetind/wealth-net-worth-bar.tsx:56` | `netWorthParts({ cash, investments, receivables, debts })` — benar, tapi masukannya dari state halaman |

Akibat yang bisa dibuktikan: tambah hutang / "Catat Bayar" / update harga di `/wealth` **tidak
muncul** di file ekspor (`/settings/data`, `/help`) dan hilang total setelah refresh; user mengira
sudah menyimpan, padahal datanya tidak pernah keluar dari halaman itu (PRD 244, laporan 46 §6 pola
akar B–F).

## Peta baca

- **Resep wajib (tiru apa adanya):** `lib/money/funds-store.ts` + `lib/money/funds-store.test.ts` —
  store modul + `useSyncExternalStore` + `hydrated` + persist IndexedDB per bagian +
  `purgeXStore()` + selector. Paket 46 sudah membuktikan pola ini jalan di repo ini.
- `lib/money/idb.ts` → `loadDeviceState`/`saveDeviceState` + `DEVICE KEYS` (key `wealth`, database
  `catetind-money` yang sama supaya "Hapus Akun" tetap membersihkan semuanya).
- `lib/money/store.ts` → `postDebtSettlement()` (satu-satunya debit/kredit kas pelunasan),
  `walletOptionsFor()`, `useMoneyStore()`.
- `lib/data/wealth.ts` → `Investment`, `Debt`, `DebtPayment`, `netWorthParts()`,
  `activeDebtRemaining()`, `totalPortfolioValue()`, `activeReceivableTotal()`.
- `lib/data/wealth-cash.ts` → `planDebtSettlement()`, `applySettlement()`, `cashDirectionOf()`.
- `docs/handoff/prompts/41-stage4b-utang-piutang-net-worth.md` — kontrak rumus Net Worth yang sudah
  disepakati (jangan diubah).

## Yang dikerjakan (urutan)

1. **Store baru `lib/money/wealth-store.ts`** — bentuk state `{ investments, debts, payments, hydrated }`,
   API tulis (semua memakai satu `commit` + `persist`, id dari `nextId()` pola funds-store):
   - `addInvestment(input)`, `updateInvestmentPrice(id, price)`, `editInvestment(id, patch)`,
     `deleteInvestment(id)`;
   - `addDebt(input)`, `deleteDebt(id)`, `editDebt(id, patch)`;
   - `settleDebt(input)` — **membungkus** `postDebtSettlement()` (kas) + `applySettlement()` (sisa
     hutang/piutang) + menyimpan `DebtPayment`, dan mengembalikan hasilnya supaya toast/celebrasi
     memakai fakta yang benar-benar terjadi. `null` = ditolak (saldo kurang/dompet asing) → **tidak
     ada yang ditulis**;
   - selector: `useWealthStore()`, `getWealthSnapshot()`, `investmentById`, `debtById`,
     `paymentsOf(debtId)`.
   - **Ruang id sebelum hidrasi** (≥ 1.000.000) seperti funds-store, supaya penulisan sebelum
     IndexedDB terbaca tidak menabrakan id dengan data tersimpan.
2. **`/wealth` berhenti memegang salinan** — hapus tiga `useState(INITIAL_*)`; semua handler di
   `wealth-screen.tsx` memanggil store. `totalInvestments`/`totalDebt`/`cash` dihitung dari
   snapshot store + `useMoneyStore()` seperti sekarang (rumus tidak berubah).
3. **Ekspor & Pusat Bantuan ikut store** — `lib/money/export.ts` (`collectExportSources`) dan
   `lib/data/help.ts` (`buildHelpExportPayload`) membaca snapshot store (pola paket 46 untuk
   celengan), sehingga file ekspor memuat hutang/piutang/investasi yang BENAR-BENAR dimiliki user.
4. **Hapus Akun** — `lib/account.ts` memanggil `purgeWealthStore()` + laporkan jumlahnya di
   `PurgeReport` (pola `fundsCleared`).
5. **Sinkron ke arah sebaliknya** — setelah `settleDebt()`, `/wealth`, kartu kas, `/wallet`,
   Riwayat, dan ekspor membaca keadaan yang sama (testnya di poin 6). Jangan menambah tulisan
   langsung ke `snapshot.wallets`/`rows`.
6. **Test murni** `lib/money/wealth-store.test.ts` + tambahan di `lib/money/store.test.ts`:
   - tambah hutang → `activeDebtRemaining()` & Net Worth ikut berubah, dan ekspor memuatnya;
   - `settleDebt` → kas turun (BCA), sisa hutang turun, satu baris `debt_payment` tercatat, Net Worth
     tidak naik hanya karena melunasi (aturan laporan 41);
   - update harga aset → `totalPortfolioValue()` berubah;
   - `purgeWealthStore()` mengosongkan store & tidak menghidupkan seed (juga setelah hidrasi ulang);
   - hidrasi: state tersimpan jadi dasar, item baru sebelum hidrasi tidak hilang/diduplikasi.

## Larangan

- Mengubah rumus/definisi Net Worth (`netWorthParts`, `activeDebtRemaining`, `cashDirectionOf`).
- Menyimpan saldo dompet di store kekayaan (kas tetap milik `lib/money/store.ts`).
- Menambah dependency, endpoint API, atau tabel Supabase baru (UI belum pindah ke server).
- Menyimpan data kekayaan di localStorage (harus IndexedDB lewat `lib/money/idb.ts`).
- Mengubah seed demo (`INITIAL_DEBTS`, `INITIAL_INVESTMENTS`, `INITIAL_DEBT_PAYMENTS`) selain
  menambah `scope` (paket 47).

## Bukti yang harus ditunjukkan

- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Rantai bukti: tambah hutang Rp 1.000.000 di `/wealth` → angka Net Worth halaman berubah **dan**
  file ekspor (`moneyExportJson()`) memuatnya; `settleDebt` Rp 500.000 dari BCA → saldo BCA di
  `/wallet` turun Rp 500.000 + baris muncul di Riwayat + sisa hutang turun Rp 500.000.
- Laporan: file dibuat/diubah, bentuk state di IndexedDB (key `wealth`), dan hal yang belum bisa
  diverifikasi.
