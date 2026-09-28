# 33 — Transaksi Baru Benar-benar Tercatat (bukan cuma toast)

**Paket:** inti produk · **Fase 11** · **Depends on:** #20 (`lib/transaction-bus.ts` sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (asli: ketemu saat uji pakai langsung, 27 Sep 2026)

User mencatat transaksi lewat **FAB `+`**, sheet-nya menutup, toast gamified muncul
(*"Sip, Rp 25.000 kecatat 🎉"*), **tapi barisnya tidak ada di mana pun**. Rantai sebabnya:

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/dashboard/transaction-bottom-sheet.tsx:71` | `onSubmitted={() => setOpen(false)}` — **payload dibuang**. Tidak ada satu pun penulisan. |
| 2 | `components/dashboard/transaction-web-modal.tsx:162` | `onSubmitted={close}` — versi desktop melakukan hal yang sama. |
| 3 | `components/dashboard/transaction-input-engine.tsx:383-386` | engine `onSubmitted(...)` **lalu menembak `toast.success(message)`** — toast sukses ditembak oleh pihak yang **tidak tahu** apakah catatannya tersimpan. Inilah sumber klaim "kecatat" yang tidak benar. |
| 4 | `lib/transaction-bus.ts:49` | `recordTransaction()` — satu-satunya pintu penulisan. Pemanggilnya **cuma satu**: `hooks/use-transaction-capture.ts:336` (jalur **Scan struk / Voice** di AI Coach). Jalur manual tidak pernah menyentuhnya. |
| 5 | `components/catetind/history-screen.tsx:128-129` | `/history` **sudah** membaca & berlangganan bus — jadi halaman ini tidak pernah perlu diubah; yang kurang cuma **penulisnya**. |
| 6 | `components/catetind/recent-transactions-card.tsx:43-65` | kartu "Transaksi terakhir" Home memakai konstanta `GROUPS` (**mock keras**, tanpa prop/state) ⇒ mustahil menampilkan catatan baru. |
| 7 | `components/catetind/wallet-detail-screen.tsx:96-107` | `/wallet/[id]` memakai `walletTransactions()` + state edit/hapus lokal; **tidak** berlangganan bus. |
| 8 | `components/catetind/daily-hud-card.tsx:98` · `daily-hud-summary.tsx:77` · `recent-transactions-card.tsx:313` · `wallet-detail-screen.tsx:398/621` · `history-screen.tsx:634` · `MobileBottomNav.tsx:167` | **semua** pintu masuk engine memakai `TransactionBottomSheet` ⇒ semuanya ikut mewarisi no-op yang sama |

Konsekuensinya: aksi **paling utama** aplikasi pencatat keuangan (mencatat) adalah no-op yang
mengaku berhasil. Catatan: paket 29 memang menghidupkan *tombol-tombol*-nya (sebelumnya benar-benar
mati) — yang belum pernah dikerjakan adalah **menyimpan hasilnya**. Jadi ini sisa yang lebih dalam,
bukan regresi paket 29.

## Peta baca

- **385–412** — Transaction Input Engine (confirm, auto-kategori; form padat, 4 tap)
- **2133–2290** — FAB & ergonomi mobile (titik "+" paling mudah dijangkau = pintu utama)
- **2388–2398 + A2 (4013)** — retry queue sesi & keputusan produksi: `POST /api/transactions`
- **244** — "jujur di setiap klaim" (dasar larangan toast sukses palsu)
- **178–191** — Home: kartu ringkasan harus bergerak mengikuti data user, bukan pajangan statis

**Kode acuan:**

- `lib/transaction-bus.ts` — bus sesi + `recordTransaction()` (tulis), `readRecordedTransactions()`
  (baca setelah mount), `subscribeRecordedTransactions()` (langganan). **Pakai apa adanya.**
- `lib/ai-quota-bus.ts` — pola bus kedua di repo ini (contoh gaya komentar & batas jujurnya)
- `components/catetind/history-screen.tsx:118-131` — pola baca-setelah-mount + langganan (tiru)
- `lib/data/history.ts` → `TRANSACTION_CATEGORY_OPTIONS`, `TRANSACTION_WALLET_OPTIONS`,
  `localISODate()`, `groupTransactionsByDate()` — helper yang sudah ada, jangan bikin baru
- `components/catetind/history-transaction-row.tsx` — baris transaksi yang sudah hidup
- `lib/data/add-wallet.ts` · `lib/wallets.ts` → `getWalletsByContext()`, `useMoneyContext()`
  (untuk default dompet dari konteks uang aktif)

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **§5.2 poin 1 & kanon 244 — jujur di setiap klaim.** Toast *"kecatat"* yang bohong adalah
   pelanggaran paling mahal yang bisa dilakukan app ini: user kehilangan uang yang ia pikir tercatat.
2. **§5.1–5.2 — audiens yang sudah capek ditipu.** Bukan soal bug kecil: sekali user menemukan
   catatannya tidak ada di Riwayat, seluruh angka app (Jatah Harian, budget, saldo) ikut kehilangan
   kredibilitas.
3. **§5.4 — habit loop butuh reward yang nyata.** Reward-nya (tanaman tumbuh, apresiasi AI, recap)
   hanya bermakna kalau catatannya benar-benar masuk; kalau tidak, mencoba 3 kali lalu berhenti
   = churn di hari pertama.

## Yang harus dibangun

1. **Shell engine menulis, bukan membuang payload.** Di `transaction-bottom-sheet.tsx` dan
   `transaction-web-modal.tsx`: `onSubmitted(payload)` → `recordTransaction({ … })` (dari
   `lib/transaction-bus.ts`) → baru tutup panel. Satu helper kecil di `lib/` (mis.
   `draftToNewTransaction(payload, fallbackWallet)`) supaya dua shell tidak menyalin logika.
2. **Default yang jujur untuk field yang belum ada di form (mode tambah):**
   - `name`: `payload.note` kalau ada; kalau kosong pakai placeholder netral dari `lib/data/*`
     (mis. "Pengeluaran cepat") — **jangan** mengarang nama merchant.
   - `category`: `payload.category ?? 'Lainnya'` (nilai sah dari `TRANSACTION_CATEGORY_OPTIONS`).
   - `wallet`: `payload.wallet ??` dompet pertama dari konteks uang aktif (`useMoneyContext()` +
     `getWalletsByContext()`); kalau kosong → `'Tunai'`.
   - `date`: `payload.date ?? localISODate()`.
   Tulis di komentar bahwa di produksi kategori datang dari AI/backend dan dompet dipilih user —
   jadi default ini **jujur untuk demo**, bukan tebakan yang disembunyikan.
3. **Guard mode edit.** Kalau `initial !== null` (engine mode edit), shell **tidak boleh** memanggil
   `recordTransaction()` — jalur edit punya pemiliknya sendiri (`edit-transaction-sheet.tsx` →
   halaman yang memperbarui baris). Shell bawah/modal web saat ini tidak pernah mengirim `initial`,
   tapi tulis guard + komentarnya supaya tidak salah pakai di masa depan.
4. **Toast hanya diucapkan kalau tulisan benar-benar terjadi.** Pindahkan tanggung jawab toast sukses
   dari engine (`transaction-input-engine.tsx:379-386`) ke shell yang tahu hasilnya: engine tetap
   memanggil `onSubmitted` + haptik, lalu shell menembak `toast.success(...)` **setelah**
   `recordTransaction()` mengembalikan transaksi. Copy cheers tetap gamified & pindah ke `lib/data/*`
   bila perlu. Nol jalur yang bisa menampilkan sukses tanpa penulisan.
5. **Permukaan yang menampilkan transaksi ikut berlangganan bus:**
   - `/history` — sudah benar; pastikan **tidak** dobel (bus dibaca sekali) dan urutannya terbaru dulu.
   - Home `recent-transactions-card.tsx` — `GROUPS` mock dipakai sebagai **benih**, lalu digabung
     catatan sesi (`readRecordedTransactions()` saat mount + `subscribeRecordedTransactions()`).
     Format waktu/tanggal harus deterministik (lihat pola `groupTransactionsByDate()` di
     `lib/data/history.ts`) supaya HTML server & client tetap identik — jangan `toLocaleDateString()`
     yang bikin hydration mismatch (peringatan yang sudah ditulis di ROADMAP §3).
   - `/wallet/[id]` — catatan sesi yang `wallet`-nya cocok ikut tampil di daftar dompet itu.
   - Pemetaan kategori → ikon/`tile` warna: pakai yang sudah ada; kalau perlu tabel baru, taruh di
     `lib/data/*` + komentar (warna hanya dari palet).
6. **Jujur soal yang TIDAK ikut berubah — dan JANGAN dipalsukan.** Saldo dompet
   (`INITIAL_WALLET_ACCOUNTS`), `SPENT_THIS_MONTH`/`DAILY_HUD` pacing, `spent` per kategori budget,
   streak & tahap tanaman **tetap mock statis**: menautkannya butuh satu sumber uang (Tier 2) dan itu
   menggeser angka patokan demo. Tulis batas ini (a) di komentar kode dan (b) di laporan sebagai usulan
   terpisah untuk pemilik produk — jangan diam-diam dibiarkan dan jangan diklaim sudah sinkron.
7. **Batas sesi tetap dinyatakan apa adanya:** catatan hilang saat halaman di-refresh
   (`lib/transaction-bus.ts:11-14`). Perbarui komentar itu supaya menyebut **semua** jalur input
   (manual + AI), bukan hanya AI Coach.

## Acceptance criteria

- [ ] Catat dari FAB `+` → sheet menutup → barisnya **muncul di `/history`** (paling atas) tanpa reload.
- [ ] Catatan yang sama muncul di kartu **"Transaksi terakhir" Home** dan di `/wallet/<id>` dompet
      yang dipakai (kalau dompetnya cocok dengan halaman itu).
- [ ] Semua pintu lain ikut berfungsi: CTA empty state `/history`, CTA `+ Catat Transaksi` Home,
      tombol di `/wallet/[id]`, CTA Dry Spell `/budget` & Home, modal web desktop.
- [ ] **Tidak ada toast sukses tanpa penulisan**: telusuri semua `toast.success` di jalur input —
      tiap satunya harus berada setelah pemanggilan `recordTransaction()`.
- [ ] Mode edit tidak menambah baris baru (uji: jumlah baris di `/history` sebelum = sesudah, isi
      barisnya berubah).
- [ ] Angka patokan tidak bergeser: `DAILY_HUD` = `remaining 800000 · daysLeft 4 · dailyBudget
      200000 · sinkingObligation 3600000 · shortfall false`; saldo dompet mock & `INITIAL_BUDGETS`
      tidak disentuh.
- [ ] Nol string copy hardcoded di JSX (cheer/toast/label ke `lib/data/*`).
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menampilkan "kecatat/berhasil" dari jalur yang tidak menulis apa pun.
- Mengubah angka patokan demo (saldo dompet mock, `SPENT_THIS_MONTH`, `TOTAL_INSTALLMENTS`,
  `DAILY_HUD`, `INITIAL_BUDGETS`, `INITIAL_SINKING_FUNDS`) — Tier 2 (saldo & pacing ikut bergerak)
  adalah keputusan pemilik produk, cukup **dilaporkan** sebagai usulan.
- Menambah backend/API baru, dependency baru, atau Zustand/IndexedDB (repo demo: pola bus sesi
  yang sudah ada + komentar arah produksi).
- Mengklaim persist antar-refresh.
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, Properti (PRD A12), dan alur AI capture
  yang sudah benar (kecuali berbagi helper).

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: daftar pintu masuk yang kini menulis (file:line), keputusan default
kategori/dompet + alasannya, tempat toast dipindahkan, bukti bahwa angka patokan tidak bergeser,
batas yang **belum** tersinkron (jujur), dan hasil ketiga perintah di atas.
