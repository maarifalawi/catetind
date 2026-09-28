# 49 — Catatan dari `/calendar` Masuk Jalur Catatan yang Sama (lanjutan #37)

**Paket:** temuan C dari laporan 46 · **Fase 13** · **Depends on:** #33 (bus + `useTransactionSubmit`
sudah ada) · **Sama dengan:** `docs/handoff/prompts/37-catatan-kalender-jalur-tulis-sama.md`

> **Kerjakan `37` dulu kalau belum.** Prompt ini BUKAN pekerjaan tandingan: ia mengunci sisa temuan
> yang belum tercakup di 37 + menambah bukti baru dari audit 28 Sep 2026. Kalau 37 sudah tuntas,
> pakai ini sebagai daftar verifikasi + dua perbaikan tambahan (poin 3 & 4 di bawah).

## Bukti gap (audit 28 Sep 2026 — masih terbuka)

| Bukti | Isi |
|---|---|
| `components/catetind/cashflow-calendar-screen.tsx:95` | `const [noteEntries, setNoteEntries] = useState<CalendarEntry[]>([])` — daftar catatan hidup di HALAMAN |
| `cashflow-calendar-screen.tsx:175-210` | `handleSaveNote()` menulis ke `setNoteEntries` + `toast.success(\`Catatan … tersimpan 🌱\`)` |
| `cashflow-calendar-screen.tsx:192-196` | komentarnya sendiri menyebut *"uang yang benar-benar tercatat"* dengan `status: 'cleared'` — padahal ia tidak pernah muncul di `/history`, kartu Home, atau `/wallet/[id]` |
| `cashflow-calendar-screen.tsx:196` | `wallet: 'Tunai'` **hardcoded** — padahal user boleh mencatat pengeluaran dari BCA/GoPay |
| `components/catetind/add-calendar-note-sheet.tsx:106` | sheet ini memakai `TransactionInputEngine` yang SAMA dengan panel utama |
| `cashflow-calendar-screen.tsx:177-182` | tipe `money_movement` diberi kategori `'Tabungan'` + nama default "Pindah dana" tanpa ada perpindahan dana yang benar-benar terjadi |

Konsistensi yang sudah benar dan harus ditiru: `hooks/use-transaction-submit.ts` +
`lib/transaction-bus.ts` → `recordDraftTransaction()` → `lib/money/store.ts` (satu pintu tulis,
idempotensi `clientTxId`, toast hanya setelah tulisan berhasil).

## Aturan kanon

- **Satu tindakan = satu catatan di SATU tempat.** Kalau kalender menyimpan daftarnya sendiri, ia
  akan selalu bisa bercerita beda dengan Riwayat (`CONTEXT-WAJIB` §5.4, PRD 244).
- Kalender adalah **pembaca**, bukan penyimpan: daftar hari = hasil turunan dari store + konstanta
  demo, disaring tombstone & (setelah paket 48) override edit.
- Toast tidak boleh bilang "tersimpan"/"tercatat" kalau tidak ada yang tertulis.

## Yang dikerjakan

1. **Tulis lewat satu pintu.** `handleSaveNote()` → `useTransactionSubmit(fallbackWallet, masked)`
   (dompet default = `defaultWalletNameFor(context)`, pola yang sama dengan dua shell input lain).
   Hapus `setNoteEntries` sebagai jalur tulis.
2. **Baca lewat satu pintu.** Daftar entri hari = `recordedTransactions(snapshot)` yang tanggalnya
   di dalam window kalender (memakai helper tanggal yang SUDAH ada: `localISODate`,
   `withinPeriod`/`periodBounds`) — bukan daftar kedua. Hapus state `noteEntries`.
3. **Dompet jujur.** Jangan hardcode `'Tunai'`: pakai pemilih dompet dari engine (sheet-nya sudah
   memuatnya) atau dompet pertama di konteks aktif; simpan `walletId`/nama yang benar-benar dipilih.
4. **`money_movement` ditertibkan.** Selama belum ada alur pindah dana di kalender (paket 55),
   jangan menawarkan "Pindah dana" sebagai tipe catatan: catatan kalender hanya pemasukan &
   pengeluaran. Kalau produk memang ingin memindahkan dana dari kalender, jalurnya WAJIB
   `postTransfer()` (dua sisi ledger) — bukan catatan sepihak yang mengaku "pindah dana".
5. **Toast & copy** dari `lib/data/*` (`TRANSACTION_INPUT_COPY`/`OFFLINE_COPY` dipakai apa adanya) —
   tidak ada kalimat baru di JSX.
6. **Test murni**: catat dari kalender → baris muncul di `recordedTransactions()` (Riwayat) dan
   saldo dompet yang dipilih ikut bergerak; hapus baris itu di Riwayat → hilang juga dari kalender
   (tombstone yang sama).

## Larangan

- Menyimpan catatan kalender di localStorage/IndexedDB terpisah dari ledger uang.
- Membuat tipe transaksi/enum baru di luar `lib/types.ts` (`TransactionType`).
- Menyentuh angka demo & `CALENDAR_ENTRIES` seed selain yang diminta di atas.
- Menambah dependency baru (kalender tetap `date-fns` + helper repo).

## Bukti yang harus ditunjukkan

- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm theme:audit`.
- Alur berurutan: catat pengeluaran dari `/calendar` (dompet BCA) → (a) muncul di `/history`,
  (b) kartu Home "Transaksi Terakhir", (c) saldo BCA di `/wallet` turun, (d) hilang dari kalender
  setelah dihapus di Riwayat. Empat angka/nama dicatat sebagai bukti, bukan diklaim.
- Laporan jujur: file dibuat/diubah + keputusan soal `money_movement` + hal yang belum bisa
  diverifikasi.
