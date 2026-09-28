# 48 — Edit Catatan Berlaku di SEMUA Halaman (bukan hanya di `/history`)

**Paket:** temuan B dari laporan 46 · **Fase 13** · **Depends on:** — (independen)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + laporan 46 §6 (tabel temuan B).

## Bukti gap (audit 28 Sep 2026)

Hapus catatan sudah benar lintas halaman (tombstone di store, paket 40/42). **Edit belum.**

| Bukti | Isi |
|---|---|
| `components/catetind/history-screen.tsx:109` | `const [editedTxs, setEditedTxs] = useState<Record<number, HistoryTransaction>>({})` — state HALAMAN |
| `history-screen.tsx:215-222` | `handleSaveEdit(next)` → `setEditedTxs((prev) => ({ ...prev, [next.id]: next }))` + toast `UPDATE_TRANSACTION_TOAST` |
| `lib/money/store.ts:1125-1146` | pola yang sudah ada untuk HAPUS: `removeRow()` menulis `removedIds` (tombstone) + `restoreRow()` — inilah resep yang harus ditiru untuk EDIT |
| `lib/money/store.ts` (`recordedTransactions`, `toHistoryTransaction`) | membaca baris ledger store + konstanta `lib/data/history.ts` − tombstone |

Akibat yang bisa dibuktikan: user mengubah nominal "Kopi Kenangan" di Riwayat → Home
(`recent-transactions-card`), `/wallet/<id>`, dan grafik arus uang **tetap** menampilkan angka lama;
setelah refresh, edit itu malah hilang sama sekali. Satu tindakan, dua cerita (PRD 244).

## Peta baca

- `docs/handoff/prompts/36-hapus-catatan-lintas-halaman.md` — pola tombstone & alasan kenapa
  halaman tidak boleh memegang salinan data (kerjakan semangatnya, bukan menyalin kodenya).
- `docs/handoff/prompts/40-stage4a-satu-ledger-kas.md` — kontrak satu store & invariant ledger.
- **Kode acuan:**
  - `lib/money/store.ts` → `removeRow`, `restoreRow`, `tombstoneKey`, `commit`, `assertSnapshot`,
    `PersistedMoney`, `mergeMoneySnapshot`, `purgeMoneyStore`
  - `components/catetind/edit-transaction-sheet.tsx` — form editnya (jangan diubah selain jalur simpan)
  - `components/catetind/history-screen.tsx:118-131` — pola baca-setelah-mount + langganan store
  - `lib/data/history.ts` → `HISTORY_TRANSACTIONS` (baris mock), `groupTransactionsByDate`,
    `TRANSACTION_CATEGORY_OPTIONS`
- **PRD 244** ("jujur di setiap klaim"), **PRD 178–191** (kartu Home harus bergerak mengikuti data user).

## Yang dikerjakan (urutan)

1. **Store: satu pintu tulis untuk edit** (`lib/money/store.ts`)
   - `rowOverrides: Record<string, RowPatch>` di state + di bentuk yang ditulis ke IndexedDB
     (`PersistedMoney`) — **persis pola `removedIds`**, termasuk:
     · kunci dinormalkan lewat `tombstoneKey()` (id `9001` vs `session-9001` = satu baris yang sama);
     · ikut dibersihkan `purgeMoneyStore()` dan tidak menghidupkan data contoh setelah hapus akun;
     · digabung saat `mergeMoneySnapshot()` (union, sama seperti tombstone).
   - `editRow(id, patch): MoneyRow | HistoryTransaction | null`:
     · baris STORE (`session-*`) → **perbarui barisnya** (amount/walletId/type/category/note/dateISO).
       Saldo tidak perlu dihitung manual: store selalu **menurunkan** saldo dari
       `opening + Σ baris` (`balancesOf`), jadi memindahkan `walletId` pun otomatis benar — dan
       `assertSnapshot()` tetap dipanggil sebelum state dipasang.
     · baris MOCK (konstanta `lib/data/history.ts`) → cukup simpan `patch` di `rowOverrides`;
       konstanta demo TIDAK boleh disunting.
     · `null` = input tidak sah (nominal ≤ 0, tipe asing, dompet tidak dikenal) → **tidak menulis apa pun**.
2. **Penerapan yang konsisten** — `recordedTransactions()` & `toHistoryTransaction()` menerapkan
   urutan yang jelas: **hapus (tombstone) menang atas edit**; baris yang di-edit tampil dengan nilai
   baru di SEMUA pemanggil (Home, `/history`, `/wallet/[id]`, arus uang). Tidak boleh ada selector
   kedua yang lupa menerapkan override.
3. **Halaman berhenti memegang salinan** — `history-screen.tsx`: hapus `editedTxs` + `setEditedTxs`;
   `handleSaveEdit` memanggil `editRow()` lalu menutup sheet + toast yang sudah ada
   (`UPDATE_TRANSACTION_TOAST`) — toast **hanya** kalau penulisan berhasil (bukan selalu).
4. **Test murni** di `lib/money/store.test.ts` (tanpa browser):
   - edit baris store (nominal & dompet) → saldo dompet asal/tujuan ikut bergerak, Σ baris tetap
     = Σ saldo − Σ opening;
   - edit nominal baris MOCK → tidak menggerakkan saldo, TAPI muncul di daftar Home & Riwayat;
   - edit bertahan setelah `mergeMoneySnapshot()` (simulasi refresh) dan kunci id `9001` vs
     `session-9001` menunjuk baris yang sama;
   - `purgeMoneyStore()` menghapus override (bukan menghidupkannya kembali);
   - edit baris yang sudah dihapus TIDAK menghidupkannya kembali.

## Larangan

- Menyimpan hasil edit di state halaman (itu justru bug yang ditutup).
- Menyunting konstanta `lib/data/history.ts` dari UI.
- Menambah jalur tulis kedua (bus/API baru) — semua lewat `lib/money/store.ts`.
- Membuat kalimat toast/modal baru di JSX (copy lama sudah ada; kalau perlu kalimat baru → `lib/data/*`).
- Mengubah angka demo (nominal mock, `SPENT_THIS_MONTH`, `DAILY_HUD`).

## Bukti yang harus ditunjukkan

- `pnpm test` (test baru di atas hijau; test lama tetap hijau), `pnpm exec tsc --noEmit`,
  `pnpm build`, `pnpm theme:audit`.
- Alur yang dibuktikan berurutan: `editRow()` → angka di (a) Riwayat, (b) Home, (c) `/wallet/<id>`
  berubah bersama; lalu simulasi refresh (`mergeMoneySnapshot`) → tetap baru.
- Laporan: file dibuat/diubah, bentuk `rowOverrides` di IndexedDB, dan hal yang belum bisa
  diverifikasi (mis. uji tap di perangkat).
