# 79 — CATATAN DARI AI SELALU BERKONTEKS & COPY MENGIKUTI SUMBER

**Status:** SELESAI (kode + test + validasi gerbang). **Verifikasi browser** tidak
bisa dijalankan di lingkungan ini (tanpa browser/perangkat) — daftar langkah
manualnya ada di §6, apa adanya.

Sumber kebenaran: laporan **47** (kanon konteks), laporan **48 §3.1** (dompet
yang belum ada di ledger), laporan **54** (saklar AI), laporan **59 §59.4**
(konteks tanpa dompet tidak menempel ke dompet lain), laporan **65 Tugas D**
(chat → kartu konfirmasi).

---

## 1. Ringkas — dua keluhan user, dua akar

| # | Keluhan (uji pakai 8 Okt 2026) | Akar (dari kode) | Sesudah paket ini |
|---|---|---|---|
| 1 | "Catat pakai AI muncul transaksi, tapi ada tulisan **Belum berkonteks**" | Kartu konfirmasi AI menawarkan dompet dari daftar **statis** (`TRANSACTION_WALLET_OPTIONS`: BCA/GoPay/OVO/Tunai) dan menulis nama itu apa adanya. Nama yang tak ada di ledger user ⇒ `walletId: ''` ⇒ `walletContextOf()` = `'unknown'` ⇒ badge "Belum berkonteks" **dan** saldo dompet mana pun tidak bergerak (`lib/money/store.ts:1395-1418`) | Dropdown dompet = **dompet nyata user**; tebakan AI yang tidak dimiliki diganti dompet konteks aktif **dan disebutkan di kartu**; konteks tanpa dompet **menahan simpan** (bukan menulis baris tanpa dompet) |
| 2 | "Gua ngetik, kok tulisannya **dari ucapan**? Padahal gua nggak voice" | `startChatDraft()` memakai `parseSpokenTransaction()` dan `draftFormFrom()` menyalin `source: 'voice'` — jadi kartu memakai judul "Ucapanmu udah aku rapikan", label "Yang aku denger", dan nama jatuh `Catatan dari suara`. Jalur ketikan **tidak pernah** lewat model | Sumber baru `'chat'`: judul "Tulisanmu udah aku rapikan", label "Yang kamu tulis", nama dirangkai dari ketikan user, dan ketikan **dikirim ke model** (`POST /api/parse-voice`) lebih dulu |

---

## 2. Hasil gerbang (DoD)

```
$ pnpm exec vitest run
 Test Files  71 passed (71)
      Tests  921 passed (921)

$ pnpm exec tsc --noEmit
(bersih — 0 error)

$ pnpm build
✓ Compiled successfully
```

Baseline sebelum paket ini: **916 test / 70 file**. Sekarang **921 / 71** (+5 test
baru di `lib/transaction-ai.test.ts` + `lib/money/ai-capture-wallet.test.ts`, dan
7 kasus tambahan di file test yang sudah ada). Tidak ada test yang dihapus atau
dilonggarkan.


---

## 3. Yang dibangun (per file)

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/money/store.ts` *(diubah)* | API baru **`captureWalletChoice(snapshot, ctx, guessed)`** → `{ value, options, unknownGuess, outsideContext }` | Satu keputusan murni untuk "dompet apa yang dipakai kartu AI": tebakan AI kalau memang dompet user, kalau tidak dompet konteks aktif; `''` = konteks ini belum punya dompet (tidak ditambal dompet konteks lain — paket 59) |
| 2 | `hooks/use-transaction-capture.ts` *(diubah)* | `prepareDraft()` = preferensi AI + dompet nyata (dipakai ketiga pintu: struk/suara/chat); `context` dioper pemanggil; `startChatDraft` **async** lewat model + fase `parsing`; pagar dompet di `confirmCapture()` | Ketiga pintu berbagi satu jalur; tidak ada baris tanpa dompet yang lahir dari AI; fase sendiri supaya kartu tidak bilang "baca struk" saat merapikan tulisan |
| 3 | `lib/transaction-ai.ts` *(diubah)* | `CaptureSource = 'receipt' \| 'voice' \| 'chat'`; `parseTypedTransaction()`; satu mesin `parseTextTransaction()`; `nameFrom(text, minWords)` (ucapan 2 kata, ketikan 1 kata); `FALLBACK_CHAT_NAME`; kata perintah di ekor dibuang; kategori **minuman** ditambah; `TransactionDraftForm.unknownWalletGuess` & `walletOutsideContext` | Teks ketikan ≠ ucapan (nama, copy, kata jatuh) tanpa menduplikasi aturan nominal/kategori/dompet |
| 4 | `app/api/parse-voice/route.ts` *(diubah)* | Menerima `source: 'voice' \| 'chat'`; prompt berkata "Ucapan user"/"Tulisan user"; `normalizeExtraction(source, …)`; komentar menjelaskan perannya kini lebih luas dari namanya | Ketikan ikut dibaca model — kemampuan AI benar-benar dipakai, bukan cuma aturan kata kunci |
| 5 | `lib/ai/extract.ts` *(diubah)* | Nama fallback per sumber (`chat` → "Catatan dari chat"); komentar: dompet keluarannya masih **tebakan**, yang mengubah jadi dompet user adalah `captureWalletChoice()` | Satu nilai jujur untuk tiap sumber; batas tanggung jawab modul ditulis jelas |
| 6 | `lib/ai-chat.ts` *(diubah)* | `confirmTitle` per sumber; `transcriptLabel` per sumber; `parsingTitle/Hint`; `walletGuessNote()`, `walletOtherContextNote()`, `needWallet`, `noWalletToPick`, `walletAddCta`; `lowConfidenceAlarm` tidak lagi "hasil scan"; placeholder composer menyebut ketikan transaksi; `AI_STATUS_COPY.worksNow` menyebut ketikan | Copy user-facing tinggal di `lib/` (aturan repo) dan tidak lagi mengklaim sesuatu yang tidak terjadi |
| 7 | `components/catetind/ai-capture-bubble.tsx` *(diubah)* | Dropdown dompet = `walletOptionsFor(snapshot)` (+ nilai terpilih kalau belum ada di daftar); catatan jujur saat tebakan diganti / dompet di konteks lain; empty state "+ Tambah dompet" saat user belum punya dompet; judul & label per sumber; wujud `parsing` | Semua keputusan tak terlihat dibuat terlihat, dan tidak ada tombol mati tanpa penjelasan |
| 8 | `components/dashboard/transaction-input-engine.tsx` *(diubah)* | Pemilih dompet mode **EDIT** memakai `pickerWalletOptions` (dompet ledger, sumber yang sama dengan mode tambah) + nilai lama bila tak ada di daftar | Daftar statis di sheet Edit juga bisa melahirkan baris "Belum berkonteks" — dan kini ia sekaligus jalan keluar untuk baris lama bertanda itu |
| 9 | `components/catetind/ai-chat-widget.tsx` *(diubah)* | `useMoneyContext()` → `context` dioper ke hook; fase `parsing` menutup composer & memberi tombol Batal | Konteks uang aktif menentukan dompet default AI; dua alur tidak bisa jalan bersamaan |

---

## 4. Keputusan desain (dan alasannya)

### 4.1 Dompet = dompet MILIK user, dan penggantiannya disebut
Kartu konfirmasi AI sekarang menawarkan **hanya dompet hidup dari ledger**
(konteks aktif lebih dulu, lalu konteks lain — pola yang sama dengan picker mode
tambah & sheet Pindah Dana). Aturannya:

1. tebakan AI **ada** di daftar ⇒ dipakai apa adanya (`unknownGuess: ''`);
2. tebakan tidak ada ⇒ dipakai dompet kanon pertama di konteks aktif, dan kartu
   menulis *"AI nebak dompetnya OVO, tapi dompet itu belum ada di daftarmu — jadi
   aku isi BCA"*;
3. konteks aktif **belum punya dompet** dan tebakan juga bukan dompet user ⇒
   dompet kartu `''`; kartu menjelaskan + menautkan "+ Tambah dompet di Dompet &
   Akun", dan jalur tulisnya menahan simpan (`noWalletToPick`).

Butir 3 sengaja **tidak** menambal dompet konteks lain: itu persis temuan audit #1
paket 59 (catatan dari "Bersama" memotong saldo Tunai tanpa user sadari).

### 4.2 Dompet user yang ada di konteks LAIN tetap dipakai — tapi dikatakan
Kalau switcher di "Bersama" lalu AI menebak `Tunai` (dompet Keluarga yang memang
milik user), catatannya sah: dompetnya nyata, tampil di kartu, dan itu yang
terbaca dari kalimat user. Yang tidak boleh: user menemukan sendiri di Riwayat
bahwa catatannya masuk konteks lain — jadi kartu menyebutnya
(`walletOtherContextNote`, dari `captureWalletChoice().outsideContext`).

### 4.3 Dua pagar, nol baris tanpa dompet
Pagar pertama di hook (`confirmCapture`), pagar terakhir di store
(`postTransaction` menolak `wallet` kosong). Kartu tetap mempertahankan draft-nya
supaya isian user tidak hilang — sama seperti guard "belum ada dompet" di jalur
manual (`use-transaction-submit.ts`, paket 59).

### 4.4 Ketikan ≠ ucapan (dan tetap satu mesin)
`source` diperluas jadi tiga nilai; `parseTextTransaction()` jadi satu-satunya
mesin, pembungkusnya cuma menentukan nama & kata jatuh. Nama dari ketikan boleh
satu kata ("airminum 5k" → "Airminum"); ucapan tetap butuh dua kata (satu kata
hasil STT terlalu mudah salah dengar). Kata perintah di **ekor** ("... catet ya")
dibuang, kata yang sama di tengah nama tidak pernah dipotong.

### 4.5 Ketikan lewat model, aturan lokal jadi jaring aman
`POST /api/parse-voice` sekarang menerima `source: 'chat'`. Ini menjawab keluhan
"AI-nya belum maksimal": sebelumnya jalur ketikan **hanya** regex kata kunci di
klien, sedangkan struk & suara memakai model. Kalau provider tidak bisa
dihubungi, parser lokal yang sama tetap dipakai — tidak ada nilai yang dikarang di
jalur mana pun, dan sumbernya tetap `'chat'` supaya copy-nya benar.

---

## 5. Acceptance (bukti)

| Kriteria | Bukti |
|---|---|
| Catatan dari jalur AI tidak lagi lahir "Belum berkonteks" | `lib/money/ai-capture-wallet.test.ts` — kasus LAMA (tebakan OVO ⇒ `hasUnknownContext === true`, saldo tak bergerak, tampil di 3 konteks) berdampingan dengan kasus SESUDAH (`walletId: 'bca'`, saldo BCA −Rp 27.000, hanya muncul di Pribadi) |
| Ketikan tidak lagi disebut "ucapan" | `lib/transaction-ai.test.ts` — `source: 'chat'` vs `'voice'`; `parseTypedTransaction('airminum 5k')` → nama `Airminum`, kategori `Makanan`, `lowFields: []`; versi ucapan tetap `Catatan dari suara` |
| Nama fallback per sumber | `lib/ai/extract.test.ts` — `chat` → "Catatan dari chat", `voice` → "Catatan dari suara", `receipt` → "…struk" |
| Dompet kartu selalu dompet user | `lib/money/store.test.ts` — 5 kasus `captureWalletChoice` (tebakan cocok, beda huruf besar/kecil, tak cocok ⇒ default konteks + `unknownGuess`, konteks tanpa dompet kanon ⇒ dompet user yang ada, tanpa dompet sama sekali ⇒ `''` + `options: []`) |
| Konteks tanpa dompet tidak menulis apa pun | `lib/money/ai-capture-wallet.test.ts` (kasus terakhir) + pagar `postTransaction` |
| Tidak ada regresi | 921 test hijau; `tsc` bersih; `build` sukses |

---

## 6. Verifikasi browser (belum dijalankan di lingkungan ini)

Prekondisi: `NEXT_PUBLIC_DEMO=1` + `pnpm dev` (akun demo mengisi BCA, GoPay, Tunai
di konteks Pribadi).

1. Dashboard → bubble ✨ AI Coach → ketik **"airminum 5k"** → Kirim.
2. Fase pertama harus berbunyi **"Lagi aku rapikan tulisanmu…"** (ikon ✨), bukan
   "Lagi baca struknya".
3. Kartu konfirmasi: judul **"Tulisanmu udah aku rapikan"**, blok jejak berlabel
   **"Yang kamu tulis"**, Nama catatan **"Airminum"**, Kategori **Makanan**,
   Dompet berisi dompet **milikmu** (mis. BCA), tanpa tanda amber.
4. Ketik **"makan pakai ovo 27rb"** → kartu menulis catatan penggantian ("AI nebak
   dompetnya OVO…"), Dompet tetap dompet milikmu, **tidak** ada pilihan "OVO" di
   dropdown.
5. Tekan **Catat ✓** → Riwayat: barisnya **tanpa** badge "Belum berkonteks",
   muncul hanya di konteks dompetnya, dan saldo dompet itu berkurang.
6. Pindah konteks ke **Bersama** (tanpa dompet) → ketik transaksi lagi → kartu
   menjelaskan belum ada dompet + tautan "+ Tambah dompet", dan **Catat ✓**
   ditolak dengan kalimat yang sama (draft tidak hilang).
7. Riwayat → baris **lama** yang masih "Belum berkonteks" → Edit → kolom Dompet
   kini berisi dompet nyata; pilih salah satu → simpan → badge hilang.
8. Nominal > saldo → toast "Saldo tidak mencukupi" tetap muncul (paket 74 utuh).

---

## 7. Yang TIDAK dikerjakan (apa adanya)

- **Baris lama yang sudah bertanda "Belum berkonteks" tidak diubah otomatis.**
  Konteks diturunkan dari dompet, dan menebak dompet untuk baris lama justru yang
  dilarang paket 59. Jalan keluarnya dua: tambah dompetnya (nama harus sama, mis.
  "OVO") **atau** perbaiki barisnya lewat sheet Edit — yang sejak paket ini
  menawarkan dompet nyata.
- **Dompet Bersama (`/joint`) tidak ikut ditawarkan** di kartu AI: kantong bersama
  hidup di store sendiri, bukan di daftar dompet kanon. Sama seperti jalur manual.
- **Verifikasi browser** (§6) belum dijalankan: lingkungan ini tanpa browser.

| 10 | `lib/transaction-ai.test.ts` *(baru)* | 6 test: ketikan vs ucapan | Mengunci pemisahan sumber |
| 11 | `lib/money/ai-capture-wallet.test.ts` *(baru)* | 5 test: urutan yang sama dengan hook (parser → dompet → tulis), termasuk keadaan LAMA vs SESUDAH | Bukti akar **dan** perbaikan, bukan hanya klaim |
| 12 | `lib/money/store.test.ts` · `lib/ai/extract.test.ts` *(diubah)* | +5 kasus `captureWalletChoice`; +2 kasus sumber `chat` | Keputusan & nilai fallback dikunci di lapis murni |
