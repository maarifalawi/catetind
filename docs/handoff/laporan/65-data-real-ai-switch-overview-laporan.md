# 65 — TUNTAS: DATA REAL (demo lewat store), SEMUA TRANSAKSI KE LEDGER, AI MENCATAT BENERAN, SWITCH KONTEKS, RINGKASAN SALDO

**Status:** SELESAI untuk A–F (kode + test + validasi). Beberapa item **verifikasi
browser** TIDAK bisa dijalankan di lingkungan ini (tanpa browser/perangkat) —
ditulis apa adanya di §8.

Sumber kebenaran: `docs/handoff/prompts/65-data-real-ai-switch-overview.md`,
`docs/handoff/CONTEXT-WAJIB.md`.

---

## 1. Hasil gerbang (DoD)

```
$ pnpm --config.manage-package-manager-versions=false test
 Test Files  62 passed (62)
      Tests  824 passed (824)

$ pnpm exec tsc --noEmit
(bersih — 0 error)

$ pnpm --config.manage-package-manager-versions=false build
 ✓ Compiled successfully

$ pnpm theme:audit
 ✔ palet bersih — 443 file diperiksa
```

Baseline sebelum paket ini: **807 test**. Sekarang **824** (+17 test baru:
`demo-bootstrap`, `contribute-ledger`, `clean-account`, `coach-context`).
Tidak ada test yang dihapus/dinonaktifkan; satu test (`export.test.ts`) ditambah
`resetFundsStore()` di `beforeEach` karena **state awal store kini SELALU
kosong** (lihat §2) — bukan menghilangkan test.

---

## 2. TUGAS A — Akun demo = DATA REAL lewat store (bukan konstanta)

### Yang dibangun
- **Baru:** `lib/money/demo-bootstrap.ts` → `seedDemoDataOnce()` (idempoten).
  Menulis data contoh lewat **API tulis asli**: `addWalletAccount()`,
  `postIncome()`/`postExpense()`, `addFund()` + `contributeToFund()`,
  `addJointMember()` + `addJointTransaction()`, `addBill()`, `addInvestment()`,
  `addDebt()`, `addPhysicalAsset()`. Penanda idempotensi: `catet-ind-demo-seeded`
  di `localStorage` (+ penanda memory sebagai cadangan saat localStorage diblokir).
  Diekspor juga: `isDemoSeeded()`, `resetDemoSeedMarker()`.
- **Baru:** `components/catetind/demo-seed-gate.tsx` — memanggil
  `seedDemoDataOnce()` SEKALI saat mount klien, HANYA bila `DEMO_MODE`
  (`NEXT_PUBLIC_DEMO=1`). Dipasang di `app/layout.tsx`.

### Putuskan nasib konstanta seed
- **STATE AWAL SELALU KOSONG** di semua store: `lib/money/store.ts`,
  `wealth-store.ts`, `funds-store.ts`, `bills-store.ts`, `joint-store.ts`,
  `physical-store.ts`. `SERVER_SNAPSHOT` (render server + hidrasi) sekarang
  kosong di produksi MAUPUN demo.
- Konstanta seed (`WALLET_SEED`, `INITIAL_*`) tetap ada sebagai **bahan test &
  bahan bootstrap demo** — dipakai `reset*Store()` (khusus test) & `demo-bootstrap`.
- **`grep SHOWS_SAMPLE_DATA`:** hanya `lib/demo.ts` yang **mendefinisikan**; satu
  pemakai tersisa = `lib/demo.test.ts` (test gerbang itu sendiri). **Tidak ada
  store** yang lagi meng-inject state awal dengan `SHOWS_SAMPLE_DATA`.
- `app/api/wallets/store.ts`: `seedWallets()` tinggal jalur fallback memory
  (hanya hidup tanpa backend Supabase = jalur demo/test), bukan lagi gerbang seed.
- Jalur merge (`mergeMoneySnapshot`, `mergeWealthState`, `mergeFundsState`,
  `mergeBillsState`, `mergeJointState`) diubah: **daftar dasar = HANYA yang
  tersimpan** (kunjungan pertama = kosong), dengan "kunjungan pertama" tetap
  mengembalikan seed di TEST agar test lama tetap sah.

### Acceptance (bukti)
- [x] `grep SHOWS_SAMPLE_DATA` → hanya `lib/demo.ts` (definisi) + `lib/demo.test.ts`.
- [x] Tanpa env: wallet/wealth/budget/bills/joint/history/Home kosong — dikunci
      `demo-bootstrap.test.ts` ("snapshot state awal (server) benar-benar kosong")
      dan `clean-account.test.ts`.
- [x] Dengan `NEXT_PUBLIC_DEMO=1`: data muncul **lewat store** —
      `demo-bootstrap.test.ts` membuktikan `wallets>0`, `rows>0` (baris ledger
      nyata), `cashTotal>0`, plus kekayaan/tagihan/joint/aset fisik terisi.
- [x] **Idempoten** — dipanggil 2× tidak menggandakan
      (`demo-bootstrap.test.ts`).

---

## 3. TUGAS B — Setiap transaksi ke ledger

### Yang disambungkan
- **Setoran celengan → SATU pintu.** Penulisan baris `saving` **dipindah ke
  dalam `contributeToFund()`** (`lib/money/funds-store.ts`). Karena
  `sweepIntoFund()` memanggil `contributeToFund()`, SEMUA pemanggil
  (`budget-screen.tsx`, `goal-detail-screen.tsx`, modal review, sapu bersih)
  kini otomatis tercatat — dulu hanya `budget-screen.tsx` yang menulis, sehingga
  setoran dari halaman detail celengan TIDAK pernah muncul di Riwayat.
  - `clientTxId = fund-contribution-<id>` ⇒ idempoten.
  - Kalau `walletId` bukan dompet nyata (sumber `'sweep'` / "Sisa budget"), name
    kosong ⇒ **TIDAK ada baris kas yang dikarang** (sapu bersih tidak menyentuh kas).
  - Duplikasi lama di `budget-screen.tsx` dihapus; import mati dibersihkan.
- **Onboarding transaksi pertama** (`onboarding-flow.tsx`): dulu hanya
  `toast("berhasil")` TANPA menulis apa pun. Sekarang membuat dompet dari isian
  langkah 2 (`addWalletAccount`) lalu menulis baris lewat `recordTransaction()`;
  kalau gagal, user diberi tahu (bukan klaim palsu).
- **Audit alur lain (kesimpulan jujur):**
  - Tagihan: `markBillPaid()` → `postExpense` (sudah benar, tak diubah).
  - Hutang/piutang: `postDebtSettlement` (sudah benar).
  - Investasi (`addInvestment`) & aset fisik (`addPhysicalAsset`): **tidak
    menyentuh kas** (mencatat posisi/valuasi aset, tanpa pilihan dompet) → sesuai
    kanon **JANGAN** menulis baris kas.
  - Joint (`addJointTransaction`): buku besar **kantong bersama**, bukan kas
    pribadi (komentar `joint-screen.tsx` menegaskan: kalau kelak menyentuh kas
    pribadi → `postTransfer`). Jadi tidak menulis baris kas pribadi.

### Acceptance (bukti)
- [x] Setoran dari fitur mana pun → tercatat (`contribute-ledger.test.ts`:
      saldo dompet turun **tepat** sebesar setoran, muncul baris "Setor …").
- [x] Saldo konsisten (`opening + Σ baris`): `walletBalance('bca')` = 1.450.000 −
      120.000 setelah dua setoran; `assertLedgerInvariant` lolos.
- [x] Tidak ada alur tulis uang yang bypass `lib/money/store.ts`.

---

## 4. TUGAS C — Sumber "8 dompet / Rp 3.600.000"

### Akar (yang bisa dipastikan dari kode)
Dua mekanisme membuat dompet contoh **hidup lagi** sebagai "milik user":
1. **Seed di-inject sebagai state awal** setiap store (`SEED_WALLETS = SHOWS_SAMPLE_DATA ? WALLET_SEED : []`), DAN
2. `mergeMoneySnapshot()` memakai `WALLET_SEED` sebagai **daftar dasar
   "kunjungan pertama"** — jadi begitu state tersimpan kosong (atau setelah
   hapus-akun), dompet contoh lahir kembali; digabung state tersimpan lama ⇒
   jumlah dompet bisa melebihi seed (mis. "8").

Angka seed bawaan hanya **3 dompet / Rp 1.850.000**; "8 dompet / Rp 3.600.000"
berarti gabungan seed + state IndexedDB lama dari build sebelumnya.

### Perbaikan
- State awal SELALU kosong (§2) ⇒ kunjungan pertama = 0 dompet, Rp 0.
- `mergeMoneySnapshot()` daftar dasar = hanya yang tersimpan.
- `purgeMoneyStore()`/`clearMoneyState()` menghapus database IndexedDB;
  `purgeStorageKeys()` (`lib/account.ts`) menyapu kunci ber-awalan `catet`
  (termasuk penanda demo) ⇒ tidak ada yang mengisi ulang.

### Acceptance (bukti — `clean-account.test.ts`)
- [x] Akun baru/bersih: `mergeMoneySnapshot(null, getServerMoneySnapshot())` →
      **0 dompet, Rp 0** (sebelumnya 3 dompet / Rp 1.850.000).
- [x] Setelah hapus semua dompet: `walletAccounts()` = 0 dan tetap 0 setelah
      merge (simulasi refresh).
- [x] Snapshot server (render pertama) kosong.

---

## 5. TUGAS D — AI Coach mencatat beneran & pakai DATA REAL

### Yang dibangun
- **Baru:** `lib/ai/coach-context.ts` (fungsi murni + satu kolektor):
  `CoachDataSummary`, `collectCoachSummary()` (baca store NYATA),
  `buildCoachContext()`, `buildWelcomeText()`, `buildRecordedReply()`,
  `looksLikeTransactionIntent()`, `formatRupiah()`.
- **Grounding:** `hooks/use-ai-chat.ts` mengirim `context` (ringkasan nyata) ke
  `POST /api/ai/text`; `app/api/ai/text/route.ts` menyisipkan ringkasan ke prompt
  sistem dengan aturan tegas "JANGAN sebut angka di luar DATA USER" (saat
  ringkasan kosong, model DILARANG menyebut angka/berpura-pura mencatat).
- **AI benar-benar mencatat:** pesan seperti "gua habis makan 50k, catet ya"
  TIDAK dikirim ke model — widget menampilkan **KARTU KONFIRMASI** (jalur sama
  dengan suara/struk) lewat `useTransactionCapture.startChatDraft()` (memakai
  `parseSpokenTransaction()` + `withCapturePrefs()`). "Catat ✓" →
  `recordTransaction()` benar-benar menulis baris, lalu balasan memakai
  `buildRecordedReply()` dengan **sisa jatah harian BARU** dari `computeDailyHud()`.
- **Sapaan nyata:** `startConversation()` menghitung sapaan dari data store —
  bukan template "Rp 150.000".
- **Bersihkan template palsu:** `PROACTIVE_WELCOME` (cadangan) & `MOCK_LIMIT_REPLY`
  tidak lagi menyebut angka/klaim finansial karangan; + `AI_CAPTURE_REPLY`.

### Acceptance (bukti — `coach-context.test.ts`)
- [x] Deteksi intent: "gua habis makan 50k, catet ya" → true; "kok boros ya?" /
      "apa itu paylater?" → false.
- [x] `buildWelcomeText()` memakai angka NYATA; **tidak** memuat "150.000" / "35%".
- [x] `buildCoachContext()` menyisipkan pemasukan/pengeluaran/jatah/saldo/kategori;
      tanpa kategori → "(belum ada pengeluaran)".
- [x] `buildRecordedReply()` menyebut nominal + **sisa jatah SESUDAH**.
- [x] Provider mati → balasan lokal jujur (`ruleBased: true`), tidak mengklaim
      mencatat; `MOCK_*` kini bebas angka.

---

## 6. TUGAS E — Switch konteks jadi dropdown di samping search

- **Baru:** `components/catetind/context-menu.tsx` — trigger menampilkan konteks
  aktif (ikon + **label PENUH** + chevron), menu `role="listbox"` dengan tiga
  `role="option"` (ikon + label penuh + centang pada yang aktif). `Esc` menutup,
  klik di luar menutup, `aria-haspopup`/`aria-expanded` benar, animasi
  `framer-motion` menghormati `useReducedMotion`.
- Dipasang di `home-screen.tsx`: **desktop DI SAMPING kolom search**, mobile di
  barisnya sendiri. State tetap `useMoneyContext()` yang sama.
- `context-switcher.tsx` (dipakai halaman lain) **dipertahankan sebagai varian**;
  label terpotong diperbaiki (`truncate` → `whitespace-nowrap`, `min-w-0` dicabut).
- Copy tombol/menu tinggal di `lib/data/money-context.ts` (`CONTEXT_MENU_COPY`).

---

## 7. TUGAS F — "Ringkasan Saldo" (popup dompet) lebih maksimal

- `components/catetind/overview-panel.tsx`: lebar desktop **440px → 512px**,
  padding desktop lebih lega (`lg:px-7 lg:pb-8`), `lg:max-h-88vh`; mobile tetap
  `dvh`. Hierarki header (judul/subjudul/badge) & ritme donat→kartu pemasukan
  dirapikan. Copy tetap dari `lib/data/home.ts`; tidak ada angka keras.
- Ringkasan tambahan opsional **tidak ditambahkan** — kartu Pemasukan + badge
  tren donat sudah memakai data ledger NYATA.

---

## 8. File yang dibuat / diubah

**Dibuat (baru):** `lib/money/demo-bootstrap.ts`,
`components/catetind/demo-seed-gate.tsx`, `lib/ai/coach-context.ts`,
`components/catetind/context-menu.tsx`, `lib/money/demo-bootstrap.test.ts`,
`lib/money/contribute-ledger.test.ts`, `lib/money/clean-account.test.ts`,
`lib/ai/coach-context.test.ts`, laporan ini.

**Diubah (kode):** `lib/money/store.ts`, `lib/money/wealth-store.ts`,
`lib/money/funds-store.ts` (+ledger `contributeToFund`), `lib/money/bills-store.ts`,
`lib/money/joint-store.ts`, `lib/money/physical-store.ts`,
`app/api/wallets/store.ts`, `app/api/ai/text/route.ts`, `app/layout.tsx`,
`hooks/use-ai-chat.ts`, `hooks/use-transaction-capture.ts` (`startChatDraft`),
`components/catetind/ai-chat-widget.tsx`,
`components/catetind/budget-screen.tsx` (hapus duplikasi ledger),
`components/catetind/onboarding-flow.tsx` (tulis ledger),
`components/catetind/home-screen.tsx` (`ContextMenu`),
`components/catetind/context-switcher.tsx`,
`components/catetind/overview-panel.tsx`, `lib/ai-chat.ts`,
`lib/data/money-context.ts`, `lib/money/export.test.ts`.

---

## 9. Yang BELUM bisa diverifikasi tanpa browser (jujur)

- **Alur klik end-to-end AI mencatat dari chat** (ketik → konfirmasi → baris di
  Riwayat & angka berubah) hanya dibuktikan **test murni** (deteksi intent,
  ringkasan, jalur ledger); tidak ada DOM/Playwright di lingkungan ini.
- **Angka "8 dompet / Rp 3.600.000" di storage pengguna** tidak bisa direproduksi
  persis (butuh IndexedDB user dari build lama). Yang dibuktikan: mekanisme
  seed/merge yang menghidupkannya sudah dicabut; akun bersih kini 0 dompet (test).
- **Demo `NEXT_PUBLIC_DEMO=1` di runtime browser**: seed lewat store dibuktikan
  test murni; kalimat "hapus di Riwayat → hilang di semua halaman; refresh →
  tetap" butuh browser.
- **Popover `ContextMenu` di 375px & 1440px** dan `prefers-reduced-motion` pada
  perangkat sungguhan belum dijalankan.
- **Provider AI (Gemini) sesi nyata**: hanya jalur tanpa kunci (503 jujur) dan
  fungsi murni yang diuji.
