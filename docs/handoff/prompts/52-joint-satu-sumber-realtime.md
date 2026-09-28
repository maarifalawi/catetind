# 52 — `/joint` (Kantong Bersama) Punya Satu Sumber + Realtime yang Nyata

**Paket:** temuan F dari laporan 46 · **Fase 13** · **Depends on:** 47 (konteks "bersama")

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + laporan 46 §6 (temuan F) + laporan 45
> (`docs/handoff/laporan/45-stage7-supabase-backend-laporan.md`) bagian "masih mock / batas jujur".

## Bukti gap (audit 28 Sep 2026)

| Bukti | Isi |
|---|---|
| `components/catetind/joint-screen.tsx:100-106` | `useState(INITIAL_JOINT_WALLET)` + `useState(INITIAL_JOINT_TRANSACTIONS)` — kantong & buku besar bersama hidup di HALAMAN |
| `joint-screen.tsx:93-99, 419` | "realtime" di demo hanya timer mock; penanda `settled`/carry-over ditulis ke localStorage |
| laporan 45 ("masih mock") | *"/joint masih memakai id dompet kanon (`joint-1`) sehingga realtime belum menerima baris sampai `/joint` membaca `joint_wallets`"* |
| `lib/data/joint-ledger.ts` + `joint.test.ts` + `joint-settlement.test.ts` | mesin bersama (SplitSpec, sharesOf, ledgerTotals, computeSettlement) sudah benar & teruji — yang salah cuma PEMILIK state-nya |
| `components/catetind/joint-timeline.tsx`, `joint-balance-scale.tsx`, `joint-stats-row.tsx`, `joint-recap-banners.tsx`, `joint-settlement-modal.tsx`, `joint-add-sheet.tsx`, `joint-split-sheet.tsx` | semuanya menerima props dari halaman → begitu halaman punya salinan kedua, seluruh layar ikut salah |

Akibat yang bisa dibuktikan: menambah transaksi bersama, mengubah pembagian, atau menyelesaikan
settle lalu **refresh** → hitungan kembali ke seed; nama kantong yang diubah user hilang; dua tab
yang berbeda tidak melihat keadaan yang sama.

## Peta baca

- **Resep wajib (tiru):** `lib/money/funds-store.ts` (store modul + `hydrated` + persist IDB +
  `purgeXStore`) dan `lib/money/wealth-store.ts` (paket 50).
- `lib/money/idb.ts` → `loadDeviceState`/`saveDeviceState`; key `joint` (database `catetind-money`).
- `lib/data/joint.ts` → `INITIAL_JOINT_WALLET`, `INITIAL_JOINT_TRANSACTIONS`, `JOINT_MONTH_KEY`,
  `splitSpecOf`, `computeSettlement`, `paidBy`/`weighedPaidBy`, `categoryBreakdown`.
- `lib/data/joint-ledger.ts` → `SplitSpec`, `sharesOf`, `allocateMoney`, `ledgerTotals`, `withinMonth`
  (JANGAN diubah; ini mesin yang sudah benar).
- `lib/data/joint-settlement.ts` → `buildCarryOverEntry`, penanda settle per bulan.
- `lib/supabase/realtime.ts` + `supabase/migrations/*` → tabel `joint_wallets`/`joint_transactions`
  (+ RLS) yang sudah ada; `lib/demo.ts` → `DEMO_REALTIME_MOCK`, `DEMO_PARTNER_JOINED`.
- laporan 44 §9 & laporan 46 §2 — gaya keputusan yang ditulis apa adanya (termasuk batas jujur).

## Aturan kanon

- **Kantong bersama BUKAN bagian Total Saldo.** `cashTotal()` tetap hanya dompet pribadi user
  (`lib/money/store.ts`). Jangan mencampur buku besar bersama ke ledger pribadi.
- Mesin bersama yang sudah ada (`joint-ledger.ts`, `joint.ts`) **tidak boleh ditulis ulang** —
  paket ini memindahkan PEMILIK state, bukan rumusnya.
- Semua angka yang tampil (timbangan, net, transfer yang harus dilakukan, breakdown) tetap turunan
  dari fungsi murni yang sudah ada; komponen tidak boleh menghitung ulang.

## Yang dikerjakan (urutan)

1. **Store baru `lib/money/joint-store.ts`** — state
   `{ wallet: JointWallet, transactions: JointTransaction[], settlements: JointSettlementRecord | null, carryOver, members, hydrated }`.
   API tulis: `addJointTransaction(input)`, `updateSplit(id, split: SplitSpec)`, `setPaidBy(id, userId)`,
   `renameJointWallet(name)`, `recordSettlement(record)` (+ `buildCarryOverEntry` untuk bulan berikutnya),
   `resetJointStore()` (khusus test) & `purgeJointStore()` (Hapus Akun).
   Persist lewat `saveDeviceState('joint', …)`; hidrasi ditunda sampai pelanggan pertama (anti
   hydration mismatch, pola funds-store).
2. **`/joint` berhenti memegang salinan** — `joint-screen.tsx` membaca `useJointStore()`; hapus
   `useState(INITIAL_JOINT_*)` dan semua `setTransactions`/`setWallet` lokal. Sub-komponen tetap
   menerima props dari halaman (tidak perlu dirombak), tapi sumbernya satu store.
3. **Penanda settle & carry-over pindah ke store** (bukan localStorage lagi). Kalau ada nilai lama
   di localStorage, baca sekali sebagai migrasi lalu tulis ke store (jangan kehilangan status
   "sudah settle" milik user), dan tulis di komentar bahwa jalur localStorage itu legacy.
4. **Realtime yang nyata, demo yang jujur**
   - Kalau sesi Supabase ada: ambil `wallet.id` dari tabel `joint_wallets` (bukan id kanon `joint-1`),
     lalu `subscribe` channel realtime untuk `joint_transactions` milik wallet itu; baris masuk
     diterapkan lewat store (`applyRemoteJointRow()`), dengan dedupe by id.
   - Kalau Supabase tidak ada (demo): pertahankan timer mock, TAPI (a) hanya hidup saat
     `DEMO_REALTIME_MOCK` menyala, (b) label "demo" tidak boleh dihilangkan dari komentar & laporan,
     (c) transaksi mock tidak boleh menimpa baris yang sudah ada (dedupe).
5. **Konteks "bersama"** — halaman ini selalu konteks `bersama`; kalau konteks aktif ≠ bersama,
   tampilkan catatan + tombol pindah konteks (paket 47 poin 4) alih-alih daftar kosong.
6. **Hapus Akun** — `purgeJointStore()` dipanggil `lib/account.ts` + jumlahnya di `PurgeReport`.
7. **Test murni** (`lib/money/joint-store.test.ts`):
   - tambah transaksi & ubah pembagian bertahan setelah `mergeJointState()` (simulasi refresh);
   - `recordSettlement` mengunci timbangan (net = 0) dan menyisakan `carryOver` untuk bulan depan;
   - baris realtime yang sama datang dua kali → tidak digandakan (dedupe by id);
   - `purgeJointStore()` mengosongkan store & tidak menghidupkan seed;
   - kantong bersama **tidak** mengubah `cashTotal()` (invariant terpisah).

## Larangan

- Menulis ulang mesin split/settlement (sudah teruji).
- Mencampur baris bersama ke `lib/money/store.ts` (ledger pribadi).
- Mengklaim "realtime" tanpa menyebut bahwa di demo ia timer mock.
- Menyimpan state bersama hanya di localStorage.
- Menambah tabel/migrasi Supabase baru (tabelnya sudah ada + RLS); kalau memang butuh kolom baru,
  tulis alasannya di laporan dan buat migrasinya idempotent.

## Bukti yang harus ditunjukkan

- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Rantai bukti: (a) tambah transaksi bersama Rp 300.000 split 60/40 → timbangan berubah, net tetap
  0, dan **tetap** begitu setelah refresh; (b) settle → timbangan rata + carry-over muncul di bulan
  berikutnya; (c) dua tab (atau simulasi `applyRemoteJointRow`) melihat baris yang sama tanpa dobel.
- Laporan: file dibuat/diubah, keadaan IndexedDB (key `joint`), status realtime (nyata vs mock) apa
  adanya, dan hal yang belum bisa diverifikasi (uji dua perangkat sungguhan).
