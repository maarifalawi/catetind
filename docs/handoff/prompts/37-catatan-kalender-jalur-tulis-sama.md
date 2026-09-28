# 37 — Catatan dari `/calendar` (dan `/joint`) Masuk Jalur Catatan yang Sama

**Paket:** konsistensi jalur input · **Fase 12** · **Depends on:** #33 (bus + `useTransactionSubmit`
sudah ada)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (audit 27 Sep 2026 — kelas yang sama dengan paket 33, satu pintu lagi)

Paket 33 memperbaiki **panel input utama** (`TransactionBottomSheet` & `TransactionWebModal`). Ada
satu pintu lain yang memakai engine yang sama tetapi **tetap** menyimpan di state halamannya sendiri,
sambil tetap mengucapkan "tersimpan":

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/add-calendar-note-sheet.tsx:106` | memakai `TransactionInputEngine` yang sama dengan panel utama |
| 2 | `components/catetind/cashflow-calendar-screen.tsx:184-201` | hasilnya ditulis ke `noteEntries` (**state halaman**) via `setNoteEntries`, bukan ke `lib/transaction-bus.ts` |
| 3 | `components/catetind/cashflow-calendar-screen.tsx:192-193` | komentarnya sendiri menyebut entri ini *"uang yang benar-benar tercatat"* dan `status: 'cleared'` — padahal ia **tidak** pernah muncul di `/history`, kartu Home, atau `/wallet/[id]` |
| 4 | `components/catetind/cashflow-calendar-screen.tsx:210` | `toast.success('Catatan <tanggal> tersimpan 🌱')` — benar tersimpan **di halaman itu**, tapi user wajar membacanya sebagai "tercatat di riwayat" |
| 5 | `components/catetind/joint-add-sheet.tsx:151` | juga memakai engine yang sama, tapi menyimpan ke buku besar **bersama** (`joint-screen.tsx:237-273`) — ini boleh terpisah; yang wajib cuma keputusannya **ditulis** |

Jadi user yang mencatat pengeluaran dari `/calendar` tidak akan menemukannya di Riwayat — persis
jenis "satu tindakan, dua cerita" yang baru saja ditutup paket 33 untuk panel utama.

## Peta baca

- **385–412** — Transaction Input Engine (satu engine, banyak shell)
- **2388–2398 + A2 (4013)** — arah produksi: `POST /api/transactions` sebagai satu-satunya penulis
- **244** — "jujur di setiap klaim" (toast "tersimpan" harus bisa ditelusuri)
- **178–191** — kartu Home bergerak mengikuti data user (dasar `recent-transactions-card`)

**Kode acuan:**

- `hooks/use-transaction-submit.ts` — hook "tulis → tutup → toast" yang **sudah ada** (pakai apa adanya)
- `lib/transaction-bus.ts` — `recordTransaction()` / `recordDraftTransaction()`
- `components/dashboard/transaction-bottom-sheet.tsx` — contoh shell yang sudah menulis dengan benar
- `components/catetind/cashflow-calendar-screen.tsx:184-210` — titik yang harus diputuskan
- `components/catetind/joint-screen.tsx:237-273` — pemilik data Joint yang menembak toast-nya sendiri

## Kenapa ini penting (psikologi audiens — CONTEXT-WAJIB §5)

1. **§5.2 poin 2 — jangan pernah keluar "insight palsu".** Toast "tersimpan" yang tidak muncul di
   Riwayat adalah versi kecil dari "kecatat" palsu yang baru ditutup.
2. **§5.4 — Zero Cognitive Load.** User tidak boleh harus tahu bahwa "catat di kalender" dan
   "catat dari FAB" itu dua tempat berbeda. Satu app, satu riwayat.
3. **§5.3 poin 3 — nol pemicu kecemasan.** Catat pengeluaran dari kalender, buka Riwayat, tidak ada.
   User lalu menduga catatannya hilang.

## Yang harus dibangun

Keputusan harus eksplisit per pintu masuknya:

1. **`/calendar` — pilih satu dari dua jalan, lalu tulis alasannya di komentar + laporan:**
   - **Jalan A (disarankan) — jadi catatan sungguhan.** `handleSaveNote` menulis ke bus lewat
     `useTransactionSubmit`/`recordDraftTransaction` (satu hook yang sama), sehingga barisnya muncul
     di `/history`, kartu Home, dan `/wallet/[id]` — **dan** entri kalender tetap tampil di grid
     (jangan sampai muncul dua kali dengan makna berbeda; jelaskan model datanya).
   - **Jalan B — kalender memang buku terpisah.** Pertahankan `noteEntries`, tapi ubah copy-nya
     supaya jujur (mis. "tersimpan di kalender") dan hapus klaim `status: 'cleared'` yang
     menyiratkan uang sudah tercatat di Riwayat. **Jangan** biarkan komentar `:192` berbunyi
     "uang yang benar-benar tercatat".
2. **`/joint` — cukup keputusan tertulis.** Tambahkan komentar di `joint-add-sheet.tsx` /
   `joint-screen.tsx` yang menyatakan buku besar bersama **sengaja** terpisah dari Riwayat pribadi
   (dan kenapa). Jangan dihubungkan diam-diam ke bus pribadi.
3. **Tidak ada toast "tersimpan" tanpa penelusuran.** Setelah perubahan ini, setiap toast yang
   mengklaim pencatatan harus bisa ditunjuk tujuannya (bus / halaman yang memuatnya).
4. **Jangan menambah bus/store/route kedua**; jangan mengubah angka patokan demo.

## Acceptance criteria

- [ ] Catat pengeluaran dari `/calendar`: hasilnya punya tujuan yang bisa ditelusuri (bus → `/history`
      atau copy jujur yang menyebut kalender) — bukan state halaman yang mengaku "tercatat".
- [ ] Semua `toast.success` di jalur input `/calendar` & `/joint` bisa dipertanggungjawabkan (laporkan
      daftar situsnya beserta tujuan datanya).
- [ ] Nol string copy user-facing baru di JSX (semua ke `lib/data/*`).
- [ ] Nol bus/store/route kedua; `lib/transaction-bus.ts` dipakai apa adanya.
- [ ] Angka patokan tidak bergeser: `DAILY_HUD` = `remaining 800000 · daysLeft 4 · dailyBudget
      200000 · sinkingObligation 3600000 · shortfall false`; HTML Home tetap `Rp 800.000×2 ·
      Rp 200.000×1 · "4 hari"×1`.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menampilkan "tercatat/tersimpan" dari jalur yang tidak menulis apa pun yang bisa ditelusuri.
- Menghubungkan buku besar Joint ke bus transaksi pribadi secara diam-diam.
- Menambah backend/API/dependency baru, atau `localStorage` sebagai pengganti bus.
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, Properti (PRD A12), dan tabel hutang.

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm theme:audit
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: jalan yang dipilih untuk `/calendar` + alasannya, daftar pintu input yang kini
menulis/memakai jalur yang sama, keputusan tertulis untuk `/joint`, bukti angka patokan tidak
bergeser, dan hasil ketiga perintah di atas.

