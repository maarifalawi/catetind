# 41 — Stage 4B · Utang/Piutang Menyentuh Kas + Net Worth & Kebijakan Privasi

**Paket:** audit fintech lanjutan · **Depends on:** #40 (ledger kas & store harus ada dulu)

> Baca `docs/handoff/CONTEXT-WAJIB.md` + `FIXPLAN-AUDIT.md` Stage 4. Semua pergerakan kas WAJIB lewat `lib/money/store.ts` dari paket #40 — jangan bikin jalur kedua.

## Bukti gap

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/wealth-screen.tsx:247-288` | "Catat Bayar" mengurangi `debt.remaining` **tanpa** mendebit dompet. Net Worth = kas + investasi − hutang ⇒ **setiap pelunasan Rp 500.000 menaikkan Net Worth Rp 500.000 tanpa uang keluar** |
| 2 | `lib/data/wealth.ts:583-598` | `activeReceivableTotal()` (piutang) ada, tapi `activeDebtRemaining()` yang dipakai bar → piutang **tidak pernah** masuk sisi Aset |
| 3 | `wealth-screen.tsx:115-116, 329-332` | `WealthNetWorthBar` hanya menerima `cash` + `debts`, tidak ada piutang |
| 4 | `wealth-hutang.tsx:129` | piutang cuma pajangan di tab "Piutangku" |
| 5 | seluruh repo | **tidak ada konsep kembalian**: tidak ada `paidAmount` vs `owedAmount`, tidak ada tipe baris `change` → "teman hutang Rp 50.000, bayar pakai uang Rp 100.000" tidak bisa dicatat |
| 6 | `lib/data/joint.ts:565-587` + `joint-stats-row.tsx:149` | transaksi 🔒 privat menyumbang slice **beserta nominal** ke kartu rincian bersama → pasangan bisa membaca nominal yang seharusnya rahasia (dan tetap ditagih 50% diam-diam) |

## Yang harus dibangun

1. **Bayar utang = debit kas.** `DebtPayment` menyimpan `walletId` (bukan hanya `walletName` string) + baris ledger `expense`/`debt_payment`. Uang benar-benar keluar dari dompet yang dipilih.
2. **Pelunasan piutang = kredit kas.** Aksi "Diterima" pada piutang menulis baris `income`/`receivable_payment` ke dompet tujuan.
3. **Kembalian.** Konfirmasi pembayaran menerima `paidAmount` + `owedAmount`; selisihnya jadi baris `change` (kas masuk bila lebih bayar dari orang lain, kas keluar bila kita mengembalikan). Contoh wajib lulus: utang Rp 50.000 dibayar Rp 100.000 → piutang Rp 50.000 **lunas** + kas **+Rp 50.000** tercatat sebagai kembalian yang harus dikembalikan/diterima (pilih satu semantik dan tulis di komentar + test).
4. **Piutang masuk Net Worth.** Bar Tug-of-War: `assets = kas + investasi + piutang`, `debts = hutang aktif`; tambahkan satu baris kecil "Piutang" supaya konversinya terlihat. Label & copy mengikuti kanon (tanpa nada menuduh).
5. **Kebijakan privasi jadi eksplisit.** Tambah satu konstanta di `lib/data/joint-ledger.ts`, mis. `PRIVATE_EXPENSE_POLICY: 'shared' | 'excluded'`, dengan default **`'shared'`** (nominal tetap ikut kewajiban) **plus disclosure**: kartu rincian bersama menyebut nominal yang ditanggung pasangan ("Kamu menanggung Rp 75.000 dari 1 catatan yang tidak bisa kamu lihat") dan **slice nominal privat dihapus dari breakdown bersama**. Tulis test untuk dua nilai kebijakan supaya pilihan produk bisa dibalik satu baris.
6. Semua perubahan di atas punya test unit murni (tanpa React) di file `*.test.ts` sebelah modulnya.

## Acceptance criteria

- [ ] Bayar utang Rp 500.000 dari BCA → saldo BCA turun Rp 500.000 **dan Net Worth tidak berubah** (tempel angka sebelum/sesudah).
- [ ] Piutang Rp 50.000 dilunasi → kas bertambah Rp 50.000; bar Aset ikut naik; piutang hilang dari sisi liabilitas.
- [ ] Kasus kembalian Rp 100.000 untuk utang Rp 50.000 tercatat utuh (piutang lunas + kembalian tercatat) — ada test-nya.
- [ ] `PRIVATE_EXPENSE_POLICY` punya test untuk kedua nilai; default `'shared'` + disclosure; slice nominal privat tidak lagi bocor di breakdown bersama.
- [ ] Invariant ledger tetap lulus (`Σ baris = Σ saldo − Σ opening`) setelah pembayaran utang/piutang/kembalian.
- [ ] **23 test lama tetap hijau**; `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` hijau.

## Dilarang

- Menulis saldo langsung (`setState` saldo) — semua lewat baris ledger.
- Menambah dependency/backend; mengubah angka test joint yang sudah dikunci.
- Menghapus fitur piutang atau menyembunyikan hutang dari user supaya angkanya "kelihatan bagus".

## Validasi

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: angka Net Worth sebelum/sesudah pelunasan utang, skema baris ledger baru, semantik kembalian yang dipilih + alasannya, dan nilai `PRIVATE_EXPENSE_POLICY` final.
