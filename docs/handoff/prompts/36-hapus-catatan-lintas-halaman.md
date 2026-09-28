# 36 — Hapus Catatan Sesi Lintas Halaman (Event "removed" di Bus)

**Paket:** konsistensi transaksi lintas halaman · **Fase 12** · **Depends on:** #33 (pintu tulis &
langganan bus sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (batas yang paket 33 sendiri nyatakan terbuka)

Paket 33 menutup "mencatat = no-op". Yang **belum** ditutup adalah sisi kebalikannya: **hapus**
sebuah catatan sesi tidak pernah terdengar halaman lain, walau titik hapusnya memang ada di sana.

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/recent-transactions-card.tsx:393-400` | `deleteTx()` membuang baris sesi dari state kartu ini saja (`setRecordedTxs`) — **tidak** menyentuh bus. Komentarnya menunjuk solusinya sendiri: *"tambahkan event 'transaction-removed' di bus, jangan diakali di komponen"* |
| 2 | `lib/transaction-bus.ts:30`, `:59-63`, `:133-148` | bus hanya punya **satu** event (`TRANSACTION_RECORDED_EVENT`) + `readRecordedTransactions()`; tidak ada API hapus & tidak ada event hapus |
| 3 | `components/catetind/history-screen.tsx:106`, `:169-173` | `removedIds` juga **page-local** — hapus di `/history` tidak terlihat di Home/`/wallet` |
| 4 | `components/catetind/wallet-detail-screen.tsx:106`, `:143-153` | idem untuk `/wallet/[id]` |
| 5 | `components/catetind/history-screen.tsx:140-143` | `/history` **sudah** berlangganan bus — jadi jalur penerimaannya tinggal ditambah, bukan dibangun dari nol |

Akibatnya di layar: user menghapus catatan yang salah dari kartu Home (gesture swipe kiri yang memang
disediakan app), lalu membuka `/history` dan barisnya **masih ada**. Itu kelas kepercayaan yang sama
dengan "kecatat palsu" yang baru saja ditutup paket 33 — hanya satu tingkat lebih kecil.

## Peta baca

- **244** — "jujur di setiap klaim" (hapus yang tidak benar-benar terhapus = klaim palsu)
- **204–205** — gesture bahasa produk: *swipe kiri = hapus* — jadi hapus harus benar-benar berlaku
- **3064–3504** — privasi/RLS: di produksi hapus = `DELETE` di server, bukan state halaman
- **178–191** — Home: kartu ringkasan wajib mencerminkan data user, bukan salinan beku

**Kode acuan:**

- `lib/transaction-bus.ts` — pola `recordTransaction()` + `subscribeRecordedTransactions()` yang
  dipakai ulang apa adanya; tambahkan pasangan `removed` dengan gaya komentar yang sama
- `lib/ai-quota-bus.ts` — pola bus kedua di repo (contoh batas jujur bus sesi)
- `components/catetind/history-screen.tsx:106`, `:140-143`, `:166-173` — pola `removedIds` + langganan
- `components/catetind/recent-transactions-card.tsx:383-400` — titik hapus yang harus bicara ke bus
- `components/catetind/transaction-actions.tsx` — `ConfirmDeleteDialog` + jendela Undo yang sudah ada

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **§5.1–5.2 — kepercayaan pada angka.** Baris yang "sudah dihapus" tapi muncul lagi membuat user
   tidak percaya pada **daftar** maupun pada total yang dihitung dari daftar itu.
2. **§5.3 poin 3 — nol pemicu kecemasan.** User yang menghapus catatan lalu melihatnya lagi akan
   menduga uangnya masih tercatat (padahal tidak) — atau sebaliknya.
3. **§5.4 — satu tindakan, satu hasil.** Undo/hapus yang tidak konsisten di dua halaman memaksa
   user mengingat "di halaman mana tadi gue hapus" — kognisi ekstra yang app ini janji hilangkan.

## Yang harus dibangun

1. **Tambah API hapus + event di bus** (`lib/transaction-bus.ts`), mengikuti pola yang sudah ada:
   `removeRecordedTransaction(id)` (buang dari array `recorded` + `window.dispatchEvent(CustomEvent)`)
   dan `TRANSACTION_REMOVED_EVENT` / `subscribeRemovedTransactions(listener)`. Tulis di komentar:
   di produksi ini `DELETE /api/transactions/:id`, dan bus ini hilang.
2. **Halaman yang menampilkan catatan sesi berlangganan event hapus** supaya barisnya ikut hilang:
   `recent-transactions-card.tsx` (Home), `history-screen.tsx` (`/history`),
   `wallet-detail-screen.tsx` (`/wallet/[id]`).
3. **Hapus dari halaman mana pun = hapus di bus untuk baris SESI.** Jangan menyentuh baris **seed**
   (mock, tidak punya sumber bersama) — dan katakan itu apa adanya di komentar/laporan supaya batasnya jelas.
4. **Undo tetap bekerja.** Kalau user menekan Undo di jendela yang masih hidup, barisnya harus
   kembali **dan** kembali juga di halaman lain (tulis di laporan bagaimana kamu menjaganya — mis.
   tulis ulang lewat `recordTransaction()` yang sudah ada, tanpa membuat id baru).
5. **Jangan menambah bus/store kedua** dan jangan memindahkan sumber data ke `localStorage`
   (persist antar-refresh = batas repo demo, bukan bug).

## Acceptance criteria

- [ ] Hapus catatan sesi di Home → barisnya hilang juga dari `/history` dan `/wallet/[id]` (dibuktikan
      lewat kode + probe/listener; laporkan batas yang belum bisa diuji di browser).
- [ ] Hapus catatan sesi di `/history` atau `/wallet/[id]` → ikut hilang di Home.
- [ ] Baris **seed** tetap berperilaku seperti sebelumnya (tidak ada regresi pada daftar mock).
- [ ] Undo (bila jendelanya masih hidup) memulihkan baris konsisten di semua halaman itu.
- [ ] Nol bus/store kedua; `lib/transaction-bus.ts` tetap satu-satunya jalur.
- [ ] Angka patokan tidak bergeser: `DAILY_HUD` = `remaining 800000 · daysLeft 4 · dailyBudget
      200000 · sinkingObligation 3600000 · shortfall false`; HTML Home tetap `Rp 800.000×2 ·
      Rp 200.000×1 · "4 hari"×1`.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menambah backend/API nyata, dependency baru, Zustand/IndexedDB, atau `localStorage` untuk bus ini.
- Membuat salinan daftar transaksi kedua yang bisa berbeda dari bus.
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, Properti (PRD A12), tabel hutang, atau
  angka patokan demo.
- Mengklaim persist antar-refresh.

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: daftar halaman yang kini menerima event hapus (file:line), keputusan soal
baris seed vs baris sesi, cara Undo dijaga, batas yang **belum** bisa diverifikasi (mis. tanpa browser),
dan hasil ketiga perintah di atas.

