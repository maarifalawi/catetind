# Laporan 49 — Catatan dari `/calendar` Masuk Jalur Tulis yang Sama (lanjutan #37)

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan C laporan 46 · **Fase 13**
· **Menutup juga:** poin 1, 2, 4 prompt #37 (`/calendar` — Jalan A) + keputusan tertulis `/joint`

> Ringkas: catatan dari modal kalender berhenti jadi **daftar yang hidup di halaman**. Sebelumnya
> `cashflow-calendar-screen.tsx` menyimpan hasilnya ke `useState(noteEntries)` lalu menembak
> `toast.success("Catatan … tersimpan 🌱")` — padahal baris itu tidak pernah muncul di `/history`,
> kartu Home, maupun saldo dompet, dan dompetnya di-*hardcode* `"Tunai"`.
> Sekarang: **kalender hanya MEMBACA ledger**, dan menulis lewat **pintu yang sama** dengan FAB &
> modal web (`useTransactionSubmit()` → `recordDraftTransaction()` → `lib/money/store.ts`).

---

## 1. Jalan yang dipilih untuk `/calendar` + alasannya

**Jalan A (disarankan prompt) — catatan kalender adalah catatan SUNGGUHAN.** Alasan:

1. **PRD 244 "jujur di setiap klaim" + `CONTEXT-WAJIB` §5.4.** Satu tindakan harus satu catatan di
   satu tempat. Selama daftarnya hidup di halaman, kalender selalu *bisa* bercerita beda dengan
   Riwayat — dan user yang mencari catatannya di Riwayat akan menyimpulkan uangnya hilang
   (§5.3 poin 3: nol pemicu kecemasan).
2. **Tidak ada alasan produk untuk jalan B.** Entri kalender bukan jenis data lain: ia
   pengeluaran/pemasukan user, benda yang sama dengan yang di Riwayat. Yang berbeda hanya **cara
   masuknya** (tanggal dikunci dari kalender = backdating), dan itu urusan form, bukan urusan model
   data. Jalan B (`noteEntries` dipertahankan + copy "tersimpan di kalender") akan menormalkan
   "ledger kedua" yang justru baru saja dihapus paket 40/48.
3. **Tulang punggungnya sudah ada.** `useTransactionSubmit()` (paket 33) + store satu pintu
   (paket 40) + tombstone/override (paket 36/48) tinggal dipakai; tidak ada bus/route baru.

### Model data grid setelah perubahan (kenapa tidak dobel)

| Sumber | Isi | Peran |
|---|---|---|
| `CALENDAR_ENTRIES` (`lib/data/calendar.ts`) | seri demo deterministik (gaji, tagihan terjadwal, belanja rutin ber-seed) | **panggung demo**: grid tidak pernah kosong saat pertama dibuka |
| baris ledger (`lib/money/store.ts`) | catatan yang BENAR-BENAR ditulis user (dari kalender, FAB, modal web, AI capture, transfer) | **data user**: ikut Riwayat, Home, saldo |

Keduanya digabung di satu grid oleh `calendarEntriesFromLedger()`; id entri turunan diberi awalan
`ledger-<seq>` sehingga tidak mungkin bertabrakan dengan id mock (`bill-…`, `income-…`, `routine-…`).
Tidak ada baris yang dihitung dua kali: catatan user **tidak pernah** ditulis ke `CALENDAR_ENTRIES`
(konstanta itu read-only dan tidak disentuh) — jadi tidak ada "makna ganda" untuk satu baris.

---

## 2. Temuan audit 28 Sep 2026 → status

| # | Temuan (lokasi lama) | Status | Bukti |
|---|---|---|---|
| 1 | `cashflow-calendar-screen.tsx:95` daftar catatan hidup di halaman (`useState<CalendarEntry[]>([])`) | ✅ FIXED | `noteEntries` **dihapus**; entri hari = `calendarEntriesFromLedger(snapshot, bounds)` (§3) |
| 2 | `:175-210` `handleSaveNote()` menulis ke `setNoteEntries` + toast "Catatan … tersimpan 🌱" | ✅ FIXED | `handleSaveNote()` kini memanggil `submit()` (hook yang sama dengan FAB); toast milik hook, muncul setelah tulis |
| 3 | `:192-196` komentar "uang yang benar-benar tercatat" + `status:'cleared'` untuk uang yang tidak pernah tercatat | ✅ FIXED | klaim itu sekarang **benar**: status `'cleared'` diberikan `calendarEntryFromTransaction()` untuk baris ledger sungguhan |
| 4 | `:196` `wallet: 'Tunai'` hardcoded padahal user boleh mencatat dari BCA/GoPay | ✅ FIXED | dompet = `defaultWalletNameFor(context)`, diisi eksplisit ke draft **dan ditampilkan** di modal (chip "Dompet: BCA") |
| 5 | `add-calendar-note-sheet.tsx:106` memakai engine yang sama tapi tidak menulis | ✅ FIXED | sheet menyerahkan draft bertanggal ke pemanggil → hook menulis → store; sheet **tidak** menutup diri & **tidak** menembak toast lagi |
| 6 | `:177-182` `money_movement` diberi kategori `'Tabungan'` + nama "Pindah dana" tanpa perpindahan dana | ✅ FIXED | `CALENDAR_NOTE_TYPES = ['expense','income']` — "Pindah dana" tidak ditawarkan (§4) |


---

## 3. File yang dibuat & diubah

| File | Perubahan |
|---|---|
| `lib/data/calendar.ts` *(diubah)* | **jembatan ledger → grid**: `calendarEntriesFromLedger()`, `calendarEntryFromTransaction()`, `calendarLedgerType()`, `CALENDAR_LEDGER_EMOJI`, `calendarEntryVisible()`, `CALENDAR_NOTE_TYPES`; `CalendarEntry.context?: RowContext` |
| `lib/data/calendar.test.ts` *(baru)* | 10 test murni: alur catat → Riwayat/Home/saldo/grid, hapus tombstone, override edit, jendela periode, konteks (termasuk kanon #2), pindah dana bukan belanja |
| `hooks/use-transaction-submit.ts` *(diubah)* | opsi eksplisit `TransactionSubmitOptions.backdated` + keputusan tulis dipisah jadi fungsi murni `shouldWriteDraft()` |
| `hooks/use-transaction-submit.test.ts` *(baru)* | 6 test murni untuk guard "draft mode edit jangan ditulis sebagai catatan baru" |
| `components/dashboard/transaction-input-engine.tsx` *(diubah)* | prop opsional `types` (shell boleh menawarkan sebagian tipe) + `TYPE_COLUMNS` + tipe awal mengikuti daftar yang ditawarkan |
| `components/catetind/add-calendar-note-sheet.tsx` *(diubah)* | `onSave`+menutup sendiri → `onSubmit` (penulis yang menutup); tanggal dibawa ke draft; `types={CALENDAR_NOTE_TYPES}`; `sourceLabel={walletName}`; tipe `CalendarNoteInput = TransactionDraft & { date: string }` |
| `components/catetind/cashflow-calendar-screen.tsx` *(diubah)* | `noteEntries` + `nowTime()` dihapus; baca `useMoneyStore()`; `calendarEntriesFromLedger()`/`calendarEntryVisible()`; tulis lewat `useTransactionSubmit(defaultWallet, masked, { backdated: true })`; toast "tersimpan 🌱" dihapus |
| `components/catetind/joint-screen.tsx` *(diubah — komentar saja)* | **keputusan tertulis**: buku besar bersama SENGAJA terpisah dari ledger pribadi (paket 37 poin 2) |
| `docs/handoff/laporan/49-catatan-kalender-jalur-tulis-sama-laporan.md` *(baru)* | laporan ini |

Tidak ada dependency baru, tidak ada bus/store/route kedua, `lib/transaction-bus.ts` dipakai apa
adanya, dan angka demo (`CALENDAR_ENTRIES`, `DAILY_HUD`, saldo kanon) tidak disentuh.

### Kode baru yang penting (ringkas)

```ts
// lib/data/calendar.ts — dibaca halaman, diuji test
export function calendarEntriesFromLedger(
  snapshot: MoneySnapshot,
  bounds: PeriodBounds,
  scope: MoneyContext | 'all' = 'all',
): CalendarEntry[] {
  const tagged = tagTransactionsForContext(recordedTransactions(snapshot), snapshot)
  return tagged
    .filter((tx) => isWithinPeriod(tx.date, bounds))                       // jendela periode
    .filter((tx) => scope === 'all' || matchesContext(tx.context, scope))  // kanon #2
    .map((tx) => calendarEntryFromTransaction(tx, fallbackScope))
}
```

```ts
// hooks/use-transaction-submit.ts
export function shouldWriteDraft(
  draft: DraftTransactionInput,
  options: TransactionSubmitOptions = {},
): boolean {
  if (draft.wallet && draft.date && !options.backdated) return false // draft mode edit
  return true
}
```

`recordedTransactions()` sudah menyaring **tombstone** dan menerapkan **override edit** (paket 48),
jadi kalender otomatis ikut ketika baris dihapus/diedit di Riwayat — bukan lewat langganan kedua.

---

## 4. Keputusan soal `money_movement` (dan kenapa "Pindah dana" hilang dari form)

* **Tipe yang ditawarkan kalender**: hanya `expense` & `income` (`CALENDAR_NOTE_TYPES`). "Pindah
  dana"/"Tabungan" **tidak** ditawarkan selama alur pindah dana belum ada — catatan sepihak yang
  mengaku pindah dana tidak menggerakkan dompet lawan, jadi saldonya jadi tidak masuk akal. Alur
  sungguhannya (dua sisi ledger, `postTransfer()`) adalah paket **55**.
* **Engine diperluas, bukan diakali**: prop `types` di `TransactionInputEngine` (default keempat
  tipe) supaya shell lain tidak berubah perilakunya; kelas kolomnya tetap literal Tailwind
  (`grid-cols-2`).
* **Tetap bisa MENAMPILKAN pindah dana**: baris `transfer`/`saving` yang datang dari jalur lain
  (mis. "Pindah Dana" di `/wallet`) dipetakan `calendarLedgerType()` → `money_movement` dan dihitung
  `moved` — **tidak** masuk belanja variabel/tagihan. Dikunci test: pindah Rp 100.000 →
  `cell.moved = 100.000`, `cell.totalSpend = 0`.
* **Tidak ada enum baru**: pemetaan hanya menyentuh `TransactionType` (`lib/types.ts`) →
  `CalendarEntryType` yang sudah ada.

## 5. Dompet: dari mana, dan batasnya

* Modal kalender **tidak punya pemilih dompet** (form TAMBAH engine memang tanpa field dompet —
  hanya mode edit yang punya). Jadi jalur yang dipakai adalah opsi yang prompt sebut eksplisit:
  **dompet pertama di konteks uang aktif** (`defaultWalletNameFor(context)`), sama dengan dua shell
  input lain (FAB & modal web).
* Supaya tidak jadi "default tersembunyi" lagi, dompet itu **ditampilkan** di modal lewat
  `sourceLabel` engine (chip "Dompet: BCA") dan **dikirim eksplisit** di draft
  (`wallet: defaultWallet`), bukan cuma diandalkan sebagai fallback hook.
* **Batas jujur yang diwarisi**: konteks **Bersama** tidak punya dompet kanon di ledger, jadi
  `defaultWalletNameFor('bersama')` jatuh ke `Tunai` (konteks Keluarga). Artinya catatan yang ditulis
  sambil membuka konteks Bersama **muncul di kalender Keluarga** — karena uangnya memang keluar dari
  dompet Keluarga. Perilakunya sama dengan `/history`, dan perbaikannya adalah jalur input dompet
  bersama (paket 52/55), bukan menyembunyikan fakta itu di kalender.

---

## 6. Pintu input `/calendar` & `/joint` — daftar toast & tujuan datanya

Setelah paket ini, **setiap** toast di kedua jalur itu bisa ditunjuk tujuannya:

| Jalur | Toast | Ditembak oleh | Yang benar-benar tertulis |
|---|---|---|---|
| `/calendar` → modal catatan | `successCheerFor()` (`lib/data/history.ts`, lewat `useTransactionSubmit`) | `hooks/use-transaction-submit.ts` **setelah** `recordDraftTransaction()` | baris ledger di `lib/money/store.ts` → Riwayat, kartu Home, `/wallet/[id]`, grid kalender |
| `/calendar` → modal catatan (offline) | `OFFLINE_COPY.savedOfflineTitle/Body` | idem | idem (baris lokal + masuk antrean `syncedIds`) |
| `/calendar` → [Bayar Sekarang] | "`<tagihan>` ditandai lunas 🎉" | `handlePayForecast()` di screen | **hanya state halaman** (`paidForecastIds`) — lihat §10 poin 3 |
| `/joint` → FAB catat bareng | `JOINT_ADDED_TOAST` | `joint-screen.tsx` setelah timeline diperbarui | `transactions` milik halaman Joint (buku besar bersama — sengaja terpisah, §7) |
| `/joint` → pembagian | "Pembagian disiapkan ✓" / "Pembagian diperbarui ✓" | `joint-screen.tsx` | `splitOverrides`/`draftSplit` halaman Joint |

Toast **"Catatan … tersimpan 🌱"** milik jalur kalender yang lama **dihapus** — bukan diganti kata
lain: kalimat yang berbunyi sekarang adalah kalimat apresiasi kanon yang sama dengan FAB/modal web,
dan jumlahnya satu (bukan dua toast untuk satu tindakan).

## 7. Keputusan tertulis untuk `/joint`

Ditulis di `components/catetind/joint-screen.tsx` (pemilik datanya), tepat di depan
`handleAddTransaction`:

* yang menanggung uangnya adalah **orang** (`paidByUserId` + `SplitSpec`), bukan dompet — tidak ada
  padanannya di ledger pribadi; memaksakannya berarti mengarang dompet atau menggeser saldo tanpa
  rupiah benar-benar berpindah;
* pertanyaannya juga beda (Riwayat: "dompetku berapa" · Joint: "siapa berutang berapa");
* karena itu buku besar bersama **sengaja terpisah** dan toast-nya muncul setelah **timeline Joint**
  benar-benar diperbarui — bukan setelah bus pribadi yang tidak tahu apa-apa;
* catatan ke depan: kalau alur joint menyentuh kas pribadi, jalurnya `postTransfer()`/
  `postTransaction()` di store, bukan disisipkan diam-diam ke daftar halaman.

## 8. Bukti angka (dijalankan, bukan diklaim)

`lib/data/calendar.test.ts` menguji alur ini; berikut **keluaran nyata** satu probe yang memakai
fungsi yang sama dengan halaman (skrip bukti sementara, dihapus setelah angkanya dicatat):

| Langkah | Angka/nama yang terbaca |
|---|---|
| (0) sebelum mencatat | saldo BCA **Rp 1.450.000** · entri grid dari ledger pada `2026-09-22` = **0** |
| (1) catat Rp 85.000 "Makan malam" dari `/calendar`, dompet **BCA**, tanggal `2026-09-22` | — |
| (a) Riwayat (`recordedTransactions()`) | `["Makan malam"]` · id ledger **9001** |
| (b) kartu Home (`homeMoneyRowFrom()` — yang dibaca `recent-transactions-card`) | `"Makan malam · Rp 85.000 · 2026-09-22 <jam lokal>"` |
| (c) saldo BCA | **Rp 1.365.000** (turun Rp 85.000) |
| (d) entri kalender hari itu | `Makan malam \| BCA \| Makanan \| variable_expense \| cleared \| <jam>` · 1 entri · `variableSpend` hari itu **Rp 85.000** |
| (e) setelah baris itu **dihapus di Riwayat** | Riwayat `[]` · nama hilang dari kalender · entri hari itu **0** · `variableSpend` **0** |
| (f) saldo BCA setelah dihapus | **Rp 1.365.000** — tombstone menyembunyikan baris, **tidak** membatalkan uangnya (§10 poin 1) |

Jam pada baris (a)–(d) datang dari **baris ledger** (`row.time`), bukan dirakit halaman — itulah
sebabnya jam di kalender & Riwayat mustahil berbeda (fungsi `nowTime()` lokal dihapus).

## 9. Test & hasil validasi (apa adanya)

```
pnpm test                 → 29 file, 386 test LULUS
                            (lib/data/calendar.test.ts: 10 · hooks/use-transaction-submit.test.ts: 6)
pnpm theme:audit          → ✔ palet bersih — 323 file diperiksa, tidak ada warna di luar palet.
pnpm exec tsc --noEmit    → tanpa keluaran (0 error)
pnpm build                → ✔ Compiled successfully in 4.4s · Finished TypeScript in 4.1s
                            ✔ Generating static pages (34/34) in 590ms · /calendar tetap prerendered
```

Checklist manual `CONTEXT-WAJIB` §8: tidak ada string copy user-facing baru di JSX (satu kalimat
justru dihapus; chip "Dompet:" milik engine), tidak ada tautan baru, tidak ada animasi baru
(`prefers-reduced-motion` tidak terpengaruh), chip tipe tetap `aria-pressed` dan tombol ikon tetap
punya `aria-label`, empty state per konteks tidak berubah, dan **hidrasi aman**: bacaannya adalah
`useMoneyStore()` yang di server mengembalikan `SERVER_SNAPSHOT` (`rows: []`) — HTML server identik
dengan render pertama client, baris ledger baru muncul setelah hidrasi.

## 10. Hal yang belum bisa diverifikasi & yang sengaja dibiarkan

1. **Hapus catatan tidak mengembalikan saldo** (baris (f) §8). Ini **perilaku lama** yang sudah
   tercatat di laporan 43 §"belum bisa diverifikasi" poin 5 — bukan akibat paket ini — dan test saya
   mengunci perilaku itu apa adanya (`walletBalance` tetap Rp 1.365.000) supaya perubahan rumus uang
   tidak lolos tanpa disadari. Keputusan produknya masih terbuka: hapus = "sembunyikan" atau
   "batalkan (reversal)".
2. **Uji browser 375 px / 1440 px belum dijalankan** (tidak ada browser di lingkungan ini). Yang bisa
   dipastikan dari kode: tata letak halaman tidak berubah (grid & panel detail sama); yang berubah
   hanya isi modal — 2 chip tipe (`grid-cols-2`) dan satu chip dompet.
3. **[Bayar Sekarang] masih aksi tampilan.** Ia menandai ramalan lunas di state halaman dan
   toast-nya berbunyi "ditandai lunas" (bukan "tersimpan"), jadi tidak ada klaim uang tercatat.
   Mengubahnya jadi pembayaran sungguhan = alur uang keluar dari kalender (butuh pemilih dompet +
   kategori) dan ramalannya sendiri sedang ditinjau di paket 56 — di luar paket ini; batas itu
   ditulis di komentar `handlePayForecast()`.
4. **Pemilih dompet di modal kalender belum ada.** Yang dipakai adalah jalur "dompet pertama konteks
   aktif" (§5). Kalau produk ingin user memilih dompet dari kalender, pemilih itu harus ditambahkan
   ke engine mode TAMBAH — dan itu mengubah dua shell lain juga, jadi lebih tepat dikerjakan bersama
   alur transfer (paket 55).
5. **`/joint` tidak dihubungkan ke bus pribadi** — memang tidak boleh (§7). Yang belum ada: jembatan
   resmi antara "siapa menalangi berapa" dan kas pribadi di ledger; itu paket 52/55.
6. **Verifikasi audit independen** (marker ✅ di `ROADMAP-HALAMAN.md`) belum ditambahkan: di repo ini
   baris itu ditulis oleh langkah audit, bukan oleh pelaksana.
