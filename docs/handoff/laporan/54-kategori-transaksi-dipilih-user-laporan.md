# Laporan 54 — Kategori Transaksi Dipilih USER, Bukan Ditebak Sistem

**Status:** selesai diimplementasikan & divalidasi · **Paket:** temuan uji pemakaian **28 Sep 2026** ·
**Fase 13** · **Depends on:** 47 (`scope` & copy konteks) · **Berkaitan dengan:** 53 (field nominal di
engine yang sama) · **Menutup:** `transaction-input-engine.tsx` → `category: type.suggested` (baris 566–572
versi lama), badge `(AI Suggested)` (baris 1040), dan saklar `catet-ai-prefs` yang tidak dibaca siapa pun.

> Ringkas: **jalur manual tidak lagi menebak kategori.** Form tambah punya pemilih kategori sendiri
> (sumbernya hanya `TRANSACTION_CATEGORY_OPTIONS`), formnya **tertahan** sampai user memilih, dan yang
> tersimpan adalah pilihan itu — tombol "Catat" nonaktif dengan petunjuk *"Pilih kategori dulu"*.
> Tabungan & Transfer tidak bertanya karena kategorinya **memang aturan**, dan alasan itu ditulis di layar
> (`'Tabungan'`/`'Transfer'`, bukan `'Dana Darurat'` tebakan lama).
>
> **Keputusan poin 5 prompt: FUNGSIKAN (jalan b), bukan hapus.** Saklar "Kategorisasi Otomatis oleh AI"
> (`catet-ai-prefs`) sekarang benar-benar dibaca — di **jalur AI capture saja** (scan struk & input suara),
> bukan di jalur manual yang sudah tidak punya tebakan. Saklar "Penamaan Otomatis Transaksi" di kartu yang
> sama ikut difungsikan di jalur yang sama, karena meninggalkan satu saklar mati di kartu itu melanggar
> aturan yang sama. Alasan + batasnya: §2.5.

---

## 1. Bukti gap yang dilaporkan → status

| # | Temuan audit 28 Sep 2026 | Status | Bukti di kode/test |
|---|---|---|---|
| 1 | `transaction-input-engine.tsx:120-146` — tiap tipe punya `suggested` (Pengeluaran→`'Makanan'`, Pemasukan→`'Gaji Utama'`, Tabungan→`'Dana Darurat'`, Transfer→`'Transfer'`) | ✅ FIXED | field `suggested` **dihapus** dari `TransactionType` & `TYPES`; kategori tetap pindah ke `TRANSACTION_FIXED_CATEGORY` (`lib/data/history.ts`) = `'Tabungan'`/`'Transfer'` **saja** |
| 2 | `:566-572` — submit mode TAMBAH mengirim `category: type.suggested` | ✅ FIXED | submit mengirim `manualCategoryChoice({ editing:false, type, picked: category }).category` — pilihan user, atau kategori tetap tipe; `null` → submit ditahan (guard di `handleSubmit`) |
| 3 | `:1040` (+ `:587`) — badge "AI Suggested" menampilkan tebakan itu sebagai keputusan AI | ✅ FIXED | blok badge **dihapus**; di tempatnya muncul pemilih kategori (expense/income) atau baris kategori tetap + alasannya (saving/transfer). Sisa kata "AI Suggested" di repo hanya ada di komentar yang menjelaskan pencabutannya |
| 4 | `:314, 788-800` — pemilih kategori HANYA ada di mode edit | ✅ FIXED | mode TAMBAH punya `<select>` kategori (12 opsi kanon + opsi kosong "Pilih kategori…"); mode EDIT tetap seperti semula (`withCurrentValue` + select) |
| 5 | `settings-panel-preferences.tsx:483-550` — saklar `catet-ai-prefs` tidak dibaca siapa pun | ✅ FIXED (jalan b) | kunci + pembaca + penulis pindah ke `lib/ai-prefs.ts`; dibaca `hooks/use-transaction-capture.ts` (`withCapturePrefs`) di kedua pintu AI capture; dikunci `lib/ai-prefs.test.ts` |
| 6 | Kategori disimpan tanpa persetujuan user → Riwayat & filter kategori salah | ✅ FIXED | kategori non-kanon **tidak bisa** tersimpan dari jalur manual: `manualCategoryChoice()` menolak (`null`) → `lib/data/history.test.ts` + Skenario E `lib/money/smoke-money-flow.test.ts` (baris yang benar-benar tersimpan + `filterHistoryTransactions` menemukannya) |
| 7 | Jalur AI tetap boleh menebak — asal transparan | ✅ DIJAGA | `lib/transaction-ai.ts` **tidak diubah**; kartu konfirmasi tetap menampilkan kategori hasil ekstraksi yang bisa dikoreksi + `LOW_CONFIDENCE_THRESHOLD` tetap dipakai. Yang berubah: field kategori di kartu konfirmasi kini punya **opsi kosong** supaya `category: ''` tidak menampilkan "Makanan" palsu saat AI-dimati (§2.6) |

---

## 2. Keputusan desain & alasannya

### 2.1 Pemilih kategori berbentuk `<select>`, bukan chip `ChoicePills`

Prompt memberi dua pilihan ("chips `ChoicePills` atau select — pilih yang paling ringkas untuk satu baris
form"). Yang dipilih **select native**, karena:

- daftar kanon berisi **12 label** — chips akan jadi 3–4 baris di 375 px dan mendorong tombol "Catat"
  (aksi primer, wajib di zona ibu jari) keluar dari satu layar;
- **satu baris form** benar-benar tercapai: `EditField` + kontrol setinggi ±40 px, sebaris dengan field
  catatan di atasnya;
- gayanya **sudah ada di engine ini** (`EDIT_CONTROL_CLASS`, label `EditField`) dan di kartu konfirmasi AI
  capture (`CAPTURE_CONTROL`) — tidak ada kontrol "versi kedua" yang perlu dirawat;
- nilainya langsung label kanon yang memang dipakai kolom `category` di ledger, tanpa peta id→label
  tambahan (peta itulah yang dulu membuat filter Riwayat dan mode edit bicara beda bahasa).

### 2.2 Tabungan & Transfer: kategori tetap, disebut apa adanya + alasannya

`lib/data/history.ts` → `TRANSACTION_FIXED_CATEGORY`:

| Tipe | Kategori tetap | Alasan yang tampil di layar (`reason`) |
|---|---|---|
| `saving` | `Tabungan` | *"Setoran selalu tercatat "Tabungan" — bukan tebakan: uangnya pindah ke celengan, bukan dibelanjakan."* |
| `transfer` | `Transfer` | *"Pindah dana selalu tercatat "Transfer" — bukan tebakan: uangnya cuma pindah dompet, bukan pengeluaran baru."* |

Keduanya **bukan** tebakan lama (`'Dana Darurat'`/`'Transfer'` dari `suggested`), dan bukan pertanyaan yang
jawabannya dibuang. Di UI tipe ini menampilkan kotak kecil: ikon tag + label "Kategori" + pill kategori
tetapnya + satu baris alasannya. Jadi tidak ada kontrol mati di tipe ini — ada penjelasan.

### 2.3 Form tertahan tanpa pilihan user — tapi tidak menagih sejak panel dibuka

- Keputusan nilai ada di **satu fungsi murni** `manualCategoryChoice()` (`lib/data/history.ts`) yang dipakai
  langsung engine: `{ editing:false, type:'expense', picked:'' }` → `{ category: null, needsChoice: true }`.
- **Tombol "Catat" nonaktif** selama `needsChoice` (`disabled` + `aria-disabled` +
  `aria-describedby="tx-category-help"`). Kenapa bukan toast saja: tombol aktif yang menolak saat ditekan
  membuat user menebak-nebak. Yang dipilih: tombolnya jujur mati, dan **sebabnya tertulis** tepat di bawah
  pemilihnya.
- **Kapan petunjuk "Pilih kategori dulu" muncul:** setelah form selebihnya siap
  (`showCategoryNeeded = needsChoice && (amountSettled || amount > 0)`). Sebelum user mengetik nominal yang
  tampil adalah petunjuk netral *"Kategori ini yang dipakai filter Riwayat & rincian pengeluaranmu."* —
  alasannya sama dengan kebijakan paket 44: jangan mengomeli user di tengah langkah pertamanya.
- **Jalur Enter tetap dijaga:** `handleAmountKeyDown` memanggil `handleSubmit()` langsung (tanpa lewat
  tombol), jadi `handleSubmit` punya guard sendiri: toast `TRANSACTION_INPUT_COPY.categoryNeeded` + fokus
  otomatis ke pemilih kategori, panel **tidak** ditutup, isian tidak dikosongkan.
- **`'Lainnya'` tidak pernah dikirim diam-diam.** Kalau user memilih "Lainnya", itu pilihan sadar dan
  tersimpan sebagai `'Lainnya'`; kalau tidak memilih, formnya tertahan.
- Semua kalimat tinggal di `TRANSACTION_INPUT_COPY` (`categoryLabel`, `categoryPlaceholder`,
  `categoryHint`, `categoryNeeded`) — **nol string baru di JSX**.

### 2.4 Satu aturan untuk semua tipe, diuji murni

| Kondisi | Hasil `manualCategoryChoice()` |
|---|---|
| TAMBAH + `saving`/`transfer` | kategori tetap tipe (`Tabungan`/`Transfer`), `needsChoice: false` |
| TAMBAH + `expense`/`income` + pilihan kanon | pilihan user apa adanya, `needsChoice: false` |
| TAMBAH + belum memilih | `category: null`, `needsChoice: true` (form tertahan) |
| TAMBAH + nilai **non-kanon** (`'Proyek'`, `'Antar Dompet'`) | `category: null` → **ditolak** (tidak ada baris yang mustahil difilter di Riwayat) |
| EDIT | koreksi user, atau nilai lama apa adanya (termasuk nilai non-kanon lama) |

Engine hanya **memakai** fungsi ini (tidak menyalin aturannya), jadi yang diuji di `lib/data/history.test.ts`
adalah aturan yang benar-benar berjalan.

### 2.5 Keputusan poin 5: saklar Pengaturan **difungsikan** (jalan b), bukan dihapus

**Yang dipilih: (b).** Alasan:

1. Setelah paket ini **jalur AI memang masih menebak** kategori & nama — di situ, dan hanya di situ
   (`mockReceiptScan()` / `parseSpokenTransaction()` di `lib/transaction-ai.ts`). Menghapus saklarnya (a)
   berarti mencabut satu-satunya kontrol user atas tebakan yang masih ada, padahal PRD Domain 4B
   menghendakinya dan halaman `/settings/ai` sudah menyediakannya sejak paket 44.
2. Ini satu-satunya jalan yang membuat **klaimnya bisa ditepati**: helper saklarnya sekarang menyebut batas
   persisnya — *"Khusus scan struk & input suara …"* — dan ditutup satu kalimat yang menegaskan apa yang
   **tidak** diubah: *"Catatan yang kamu input manual selalu pakai kategori yang kamu pilih sendiri."*
3. Menghapus tombol adalah perbaikan yang tidak bisa diaudit lagi dari UI (tidak ada jejak bahwa user
   pernah punya pilihan itu); memfungsikannya bisa diuji dan diverifikasi — sekarang ada test untuk baca,
   tulis, dan penerapan saklarnya ke draft.

Implementasinya:

| Bagian | Isi |
|---|---|
| `lib/ai-prefs.ts` (baru) | `AI_PREFS_KEY = 'catet-ai-prefs'` (nama lama supaya preferensi user tidak hilang), `AiPrefs`, `AI_PREFS_DEFAULT`, `readAiPrefs()`, `writeAiPrefs()`, `withCapturePrefs()`, `AI_PREFS_COPY` |
| `components/catetind/settings-panel-preferences.tsx` | baca **dan** tulis lewat `lib/ai-prefs.ts` (dulu kunci privat + `localStorage` langsung); label & helper dari `AI_PREFS_COPY`; satu kalimat batas di bawah kartu |
| `hooks/use-transaction-capture.ts` | `withCapturePrefs(draftFormFrom(...))` di **kedua** pintu (struk & ucapan) → saklar mati = field itu kosong, user yang mengisi di kartu konfirmasi |
| `components/catetind/ai-capture-bubble.tsx` | opsi kosong (`value=""`, disabled) + placeholder, supaya kategori kosong **tidak** menampilkan "Makanan" palsu |
| `lib/ai-chat.ts` | copy `AI_CAPTURE_COPY.needCategory` + `AI_STATUS_COPY.worksNow` dikoreksi (klaim lama *"saran kategori bawaan saat mencatat"* sudah tidak benar) |

**Yang terjadi saat saklar dimatikan:** kategori dikosongkan di draft, `confirmCapture()` menolak simpan
tanpa kategori dengan copy `needCategory`. Kalimatnya **bukan** "AI belum yakin" dan `lowFields` sengaja
tidak ditambahi — tidak ada tebakan yang perlu diragukan, user memang diminta memilih (§2.6).

### 2.6 Jalur AI tetap boleh menebak — dan tetap transparan

- `lib/transaction-ai.ts` **tidak disentuh** (larangan prompt). Metrik keyakinan, `lowFields`, dan ambang
  `LOW_CONFIDENCE_THRESHOLD` tetap dipakai apa adanya.
- Satu-satunya perubahan di kartu konfirmasi: field kategori punya opsi kosong. Tanpa itu `<select>` akan
  menampilkan opsi pertama ("Makanan") sementara nilainya `''` — user diberi tahu kategori yang tidak akan
  tersimpan. Itu bentuk "beda cerita" yang paket ini tutup.

### 2.7 Metering `categorize` dipindahkan supaya tidak menagih AI yang tidak dipanggil

`lib/transaction-bus.ts` dulu memanggil `recordAiUsage('categorize')` untuk **setiap catatan baru** dengan
komentar *"badge AI Suggested di panel = nilai yang tersimpan"*. Setelah paket ini kalimat itu tidak benar
lagi, jadi:

- `recordTransaction()` **berhenti** mencatat `categorize` (pembacaan `rowForClientTxId()` yang dulu hanya
  untuk itu ikut dihapus, bersama import yang jadi mati);
- pemakaian `categorize` dicatat di `useTransactionCapture.confirmCapture()` — **setelah** barisnya tertulis
  (prinsip paket 42: hanya yang benar-benar tersimpan yang dihitung) dan **hanya kalau** saklar
  kategori/penamaan menyala;
- angkanya jadi wajar: catatan manual berhenti menagih jatah AI, sedangkan scan struk & input suara tetap
  seperti sebelumnya (`ocr`/`voice` saat membaca + `categorize` saat disimpan).

Tanpa perubahan ini, meter akan terus "bergerak" untuk pekerjaan yang tidak terjadi — jenis klaim palsu yang
sama dengan yang paket ini cabut.

### 2.8 Dua jalur manual lain ikut ditertibkan (agar tidak ada dua cerita)

| Jalur | Temuan | Perbaikan |
|---|---|---|
| Joint (`joint-add-sheet.tsx` → `joint-screen.tsx`) | memakai engine yang sama, tapi `category` dari payload **dibuang** → pemilih kategori baru akan jadi kontrol mati, dan setiap catatan bersama selalu masuk `JOINT_DEFAULT_CATEGORY` | `payload.category` diteruskan sampai `addJointTransaction()`, jadi rincian kategori `/joint` mencerminkan pilihan user. Catatan **privat** tetap dianonimkan store (`PRIVATE_CATEGORY`) — aturan privasi paket 38/52, dan sekarang user diberi tahu lebih dulu lewat `PRIVATE_CATEGORY_NOTE` di kartu privasi |
| Onboarding (`onboarding-step-first-transaction.tsx`) | baris *"Makanan · tebakan AI"* di bawah nominal — padahal `OnboardingResult.firstTransaction` cuma menyimpan tipe/nominal/deskripsi, jadi kategorinya **tidak pernah disimpan** dan label itu murni karangan | field `suggested` + baris tersebut dihapus, dengan alasan ditulis di komentar file |

`lib/data/add-wallet.ts` (`transferCategory: 'Transfer'`) sengaja **tidak** diubah: itu kategori aturan
untuk pindah dompet (setara kategori tetap Transfer di engine), dan alur transfer sungguhannya adalah paket
55.

### 2.9 Mode edit tidak berubah perilakunya (dengan sengaja)

`withCurrentValue(TRANSACTION_CATEGORY_OPTIONS, initial?.category)` tetap dipakai: kategori lama yang tidak
ada di daftar kanon tetap **disertakan** sebagai opsi, dan `manualCategoryChoice({ editing: true, … })`
mengembalikan koreksi user atau nilai lamanya apa adanya. Membuka sheet edit tidak pernah mengubah data user
diam-diam — dikunci test *"tidak menyentuh kategori = nilai lamanya tetap dikirim apa adanya"* (termasuk
nilai `'Proyek'`).

---

## 3. File yang dibuat / diubah

| File | Status | Isi |
|---|---|---|
| `lib/data/history.ts` | diubah | `TRANSACTION_FIXED_CATEGORY` (+`reason`), `manualCategoryChoice()` + `ManualCategoryChoice`, copy kategori di `TRANSACTION_INPUT_COPY`, komentar `TRANSACTION_FALLBACK_CATEGORY` diarahkan ulang (jaring pengaman, bukan default form) |
| `components/dashboard/transaction-input-engine.tsx` | diubah | `suggested` + badge "AI Suggested" **dihapus**; pemilih kategori mode TAMBAH (select kanon + opsi kosong + `aria-describedby`/`aria-invalid`); baris kategori tetap Tabungan/Transfer + alasannya; submit & guard memakai `manualCategoryChoice()`; tombol "Catat" nonaktif saat kategori belum dipilih; komentar penjelas di header file |
| `lib/data/history.test.ts` | **baru** | 9 test: pilihan user per tipe, form tertahan, kategori tetap saving/transfer, keempat tipe selalu kanon-atau-tertahan, non-kanon ditolak, mode edit mengirim koreksi/nilai lama |
| `lib/ai-prefs.ts` | **baru** | satu sumber preferensi AI (baca/tulis `catet-ai-prefs`), `withCapturePrefs()`, `AI_PREFS_COPY` + penjelasan kenapa hanya jalur AI capture yang membacanya |
| `lib/ai-prefs.test.ts` | **baru** | 13 test: default tanpa window, kunci lama, isi tersimpan, JSON rusak/asing, tulis–baca bolak-balik, storage diblokir, dan penerapan saklar ke draft (termasuk "draft asli tidak diubah") |
| `components/catetind/settings-panel-preferences.tsx` | diubah | panel AI memakai `lib/ai-prefs.ts` (baca & tulis), label/helper dari `AI_PREFS_COPY`, satu kalimat batas di bawah kartu |
| `hooks/use-transaction-capture.ts` | diubah | `withCapturePrefs()` di kedua pintu AI capture; guard kategori saat wajib pilih; metering `categorize` dipindah ke sini |
| `components/catetind/ai-capture-bubble.tsx` | diubah | opsi kosong + placeholder di pemilih kategori kartu konfirmasi |
| `lib/ai-chat.ts` | diubah | `AI_CAPTURE_COPY.needCategory`; `AI_STATUS_COPY.worksNow` dikoreksi |
| `lib/transaction-bus.ts` | diubah | berhenti mencatat `categorize` di jalur manual + komentar `recordDraftTransaction` mengikuti kenyataan baru |
| `lib/ai-usage-store.ts` | diubah | daftar pemicu meter: `categorize` = jalur AI capture (saat saklarnya menyala), bukan "setiap catatan baru" |
| `components/catetind/joint-add-sheet.tsx` | diubah | `category` diteruskan dari payload + `PRIVATE_CATEGORY_NOTE` di kartu privasi |
| `components/catetind/joint-screen.tsx` | diubah | `handleAddTransaction` meneruskan `category` ke `addJointTransaction()` |
| `lib/data/joint.ts` | diubah | copy `PRIVATE_CATEGORY_NOTE` (kenapa kategori catatan privat dianonimkan) |
| `components/catetind/onboarding-step-first-transaction.tsx` | diubah | `suggested` + baris "· tebakan AI" dihapus (kategorinya tidak pernah disimpan), import `Sparkles` dibuang |
| `lib/money/smoke-money-flow.test.ts` | diubah | Skenario E (5 test): baris yang tersimpan = pilihan user, kategori tetap saving/transfer, form tertahan tidak menulis apa pun, non-kanon ditolak, dan `filterHistoryTransactions` menemukan barisnya |
| `docs/handoff/laporan/54-kategori-transaksi-dipilih-user-laporan.md` | **baru** | laporan ini |

**Tidak diubah (sengaja):** `lib/transaction-ai.ts` (mesin OCR/voice — larangan prompt),
`lib/data/add-wallet.ts` (kategori aturan untuk pindah dompet, paket 55), mode edit engine
(`withCurrentValue` + select kategori), dan seluruh angka kanon uang (`WALLET_SEED.opening`, settlement
joint, `DAILY_HUD`).

---

## 4. Bukti

### 4.1 Perintah validasi (dijalankan di repo ini, hasil apa adanya)

```
$ pnpm test
 ✓ lib/data/history.test.ts (9 tests) 8ms
 ✓ lib/ai-prefs.test.ts (13 tests) 9ms
 ✓ lib/money/smoke-money-flow.test.ts (11 tests) 21ms
 Test Files  34 passed (34)
      Tests  496 passed (496)
   Duration  2.29s

$ pnpm exec tsc --noEmit
(no output — exit code 0)

$ pnpm build
✓ Compiled successfully in 1157ms
✓ Generating static pages using 19 workers (34/34) in 603ms
(build exit code: 0)

$ pnpm theme:audit
✓ palet bersih — 334 file diperiksa, tidak ada warna di luar palet.
```

Catatan: baseline CONTEXT-WAJIB menyebut "319 test / 24 file" — angka itu sudah bertambah oleh paket 47–53
yang juga belum di-commit. Yang baru dari paket ini: **+22 test** (`history.test.ts` 9, `ai-prefs.test.ts`
13) dan **+5 test** di Skenario E `smoke-money-flow.test.ts` (6 → 11). Tidak ada `.skip`.

### 4.2 Apa yang dikunci test (jelas, bukan "kelihatannya jalan")

| Klaim paket | Bukti otomatis |
|---|---|
| Kategori yang tersimpan = pilihan user, **bukan** `suggested`, untuk keempat tipe | `history.test.ts` (4 tipe; kategori tetap saving/transfer) + Skenario E (`expense`→"Makanan", `income`→"Gaji Utama", `saving`→"Tabungan", `transfer`→"Transfer" pada baris yang benar-benar tersimpan) |
| Form tertahan tanpa kategori | `history.test.ts` (`{ category: null, needsChoice: true }`, dan **bukan** `TRANSACTION_FALLBACK_CATEGORY`) + Skenario E (`recordManual('expense','')` → `null`, store tetap kosong) |
| Tidak ada nilai di luar `TRANSACTION_CATEGORY_OPTIONS` yang bisa tersimpan dari jalur manual | `history.test.ts` (`'Proyek'` → `null`) + Skenario E (`'Antar Dompet'` di tipe transfer tetap tersimpan sebagai `'Transfer'`, dan `'Proyek'` ditolak) |
| Mode edit tetap mengirim koreksi user (tanpa mengosongkan data lama) | `history.test.ts` dua kasus (`'Transportasi'` menang; `''` → nilai lama `'Proyek'` apa adanya) |
| Riwayat menemukan barisnya lewat filter kategori | Skenario E memakai `filterHistoryTransactions()` yang sama dengan halaman Riwayat: filter `makanan` menemukan "Beli kopi"; "Tabungan" masuk bucket `lainnya` (tidak hilang dari filter mana pun) |
| Saklar `catet-ai-prefs` benar-benar bekerja | `ai-prefs.test.ts`: baca (default/tersimpan/rusak), tulis (termasuk storage diblokir & bolak-balik), dan penerapan ke draft capture (`category: ''` saat saklar mati, `name: ''` saat penamaan mati, draft asli tidak berubah) |

### 4.3 Alur bukti yang diminta prompt — apa yang sudah & belum terverifikasi

| Langkah alur bukti | Status |
|---|---|
| Catat "beli kopi 25rb" tanpa memilih kategori → tombol Catat nonaktif + petunjuknya muncul | **Logika terverifikasi:** tombol memang `disabled` saat `needsChoice`, petunjuknya dari `categoryNeeded`, dan jalur Enter dijaga guard yang diuji. **Tampilan** belum diuji di browser sungguhan (repo ini tanpa Playwright/jsdom) — daftar uji manualnya di §6 |
| Pilih "Makanan" → tersimpan sebagai "Makanan" | ✅ otomatis (Skenario E: baris hasil `recordedTransactions()` berkategori `Makanan`; jalur `manualCategoryChoice` + `recordDraftTransaction` sama dengan yang dipakai tombol "Catat") |
| Buka Riwayat → filternya menemukan baris itu | ✅ otomatis (`filterHistoryTransactions` dengan filter `makanan`/`lainnya`) |
| Baris dari jalur AI capture tetap punya kategori hasil ekstraksi | ✅ otomatis (saklar ON: draft dari `mockReceiptScan`/`parseSpokenTransaction` tetap membawa kategorinya — `ai-prefs.test.ts`; `lib/transaction-ai.ts` tidak diubah sehingga hasil ekstraksinya identik) |
| Jalur joint & kalender memakai pemilih yang sama (bukan dua perilaku) | ✅ satu engine: `add-calendar-note-sheet.tsx` & `joint-add-sheet.tsx` menyematkan `TransactionInputEngine`; joint kini meneruskan `payload.category` |

### 4.4 Yang saya periksa manual di kode (karena tidak ada runner browser)

- Sisa kata "AI Suggested"/`suggested` di jalur manual hanya ada di komentar yang menjelaskan
  pencabutannya (sisa `suggestedBrands` dompet & `suggestedTarget` review bulanan tidak berhubungan).
- Pemilih kategori hanya dirender saat `!isEdit`; mode edit tetap memakai tiga field lamanya
  (`withCurrentValue` tidak diubah).
- Tidak ada kalimat baru di JSX: copy baru tinggal di `TRANSACTION_INPUT_COPY` (`lib/data/history.ts`),
  `AI_CAPTURE_COPY`/`AI_STATUS_COPY` (`lib/ai-chat.ts`), `AI_PREFS_COPY` (`lib/ai-prefs.ts`), dan
  `PRIVATE_CATEGORY_NOTE` (`lib/data/joint.ts`).
- Warna & ukuran yang dipakai hanya token palet (`bg-cream`, `ring-soil/12`, `bg-sage`, `text-forest`,
  `text-ink/45`, `ring-hud-amber/45`) — `pnpm theme:audit` bersih (334 file diperiksa).
- Tidak ada animasi baru → tidak ada tambahan `prefers-reduced-motion` yang perlu dijaga.
- `aria`: pemilih kategori punya `aria-label`, `aria-describedby` ke petunjuknya, `aria-invalid` saat
  tertahan; tombol "Catat" menyebut sebab matinya lewat `aria-describedby`; opsi kosong tidak pernah jadi
  nilai tersimpan.

---

## 5. Yang belum bisa saya verifikasi (jujur) & temuan sampingan

1. **Belum dijalankan di browser/HP.** Repo ini tidak punya Playwright/jsdom, jadi yang terbukti adalah
   keputusan & jalur tulisnya (test murni + build). Tampilan tombol nonaktif, kemunculan petunjuk, dan
   perilaku `<select>` native di Safari iOS belum saya lihat sendiri — checklist di §6.
2. **Saklar "Gaya Bicara Minca" masih belum dibaca siapa pun** (`mincaMode` disimpan, tapi tidak ada kode
   yang membacanya — AI Coach masih menjawab dari aturan lokal). Ini **di luar** rentang temuan paket 54
   (yang menyebut baris 483–550, sedangkan bagian gaya bicara ada di 555+), jadi tidak saya ubah — tapi
   saya sebut di sini supaya tidak dianggap "sudah beres". Kalau prinsipnya "jangan ada saklar mati", ini
   kandidat paket berikutnya.
3. **Catatan pertama onboarding tidak pernah masuk ledger.** `OnboardingResult.firstTransaction`
   (tipe/nominal/deskripsi) disimpan di localStorage dan **tidak dibaca siapa pun** (grep `firstTransaction`
   → hanya penulisnya). Yang aman saya lakukan di paket ini adalah mencabut klaim kategorinya; klaim
   *"catatan pertamamu berhasil"* pada toast step itu masalah lain (sejenis temuan paket 33) dan tidak saya
   sentuh agar tidak memperluas scope. Alasan ini tertulis di komentar file + §2.8.
4. **Kategori catatan privat joint sengaja dianonimkan** (`PRIVATE_CATEGORY = '🔒'`): pilihan user di kartu
   privat tidak dipakai store. Itu aturan privasi paket 38/52 (kategori bisa membocorkan isi), bukan bug —
   yang diperbaiki adalah memberi tahu user lebih dulu (`PRIVATE_CATEGORY_NOTE`) supaya tidak ada langkah
   yang terasa sia-sia tanpa alasan.
5. **Angka kanon uang tidak bergeser**: `PRIVATE_EXPENSE_POLICY`, settlement joint (Rp 25.000 / Rp 250.000),
   `DAILY_HUD`, dan `WALLET_SEED.opening` (Rp 1.850.000) tidak tersentuh — test joint & uang tetap hijau
   tanpa penyesuaian.
6. **`lib/data/add-wallet.ts`** masih menulis kategori `'Transfer'` untuk pindah dompet (kategori aturan,
   bukan tebakan) — alur transfer sungguhannya paket 55.
7. **Kerja ini belum di-commit** (mengikuti kondisi repo: paket 38–53 juga masih di working tree).

---

## 6. Daftar uji manual di perangkat (untuk pemilik produk)

1. **375 px — FAB (+)**: buka panel, ketik `beli kopi 25rb` → tombol **Catat** tampak mati dan di bawah
   pemilih kategori muncul *"Pilih kategori dulu ya 🌿 Cuma kategori yang kamu pilih yang disimpan."* →
   pilih **Makanan** → tombol hidup → Catat → buka **Riwayat** → filter kategori **Makanan** menemukan
   "Beli kopi" dengan nominal Rp 25.000.
2. **Tekan Enter di keyboard numerik tanpa memilih kategori** → toast petunjuk muncul, fokus pindah ke
   pemilih kategori, panel tetap terbuka (tidak ada catatan yang lahir).
3. **Ganti tipe ke Tabungan lalu Transfer** → kotak "Kategori" menampilkan pill **Tabungan**/**Transfer**
   + satu baris alasannya; tombol Catat aktif tanpa memilih apa pun.
4. **1440 px (modal web)**: buka "Tambah Transaksi" → pemilih kategori tampil satu baris; pilih kategori →
   tekan **Enter** → tersimpan sekali (tidak dobel).
5. **Mode edit**: Riwayat → geser kanan (edit) → kategori lama tampil terpilih; ubah ke kategori lain →
   Simpan → baris di Riwayat ikut berubah. Coba juga catatan lama yang kategorinya di luar daftar kanon
   (mis. `'Proyek'` dari Dompet Detail) → membuka sheet edit saja tidak boleh mengubahnya.
6. **Pengaturan → AI** (`/settings/ai`): matikan **Kategorisasi Otomatis oleh AI** → buka AI Coach → scan
   struk (atau input suara) → kartu konfirmasi menampilkan kategori **kosong** ("Pilih kategori…"); tekan
   "Catat ✓" → muncul ajakan memilih kategori; pilih satu → tersimpan. Nyalakan lagi saklarnya → kategori
   terisi otomatis seperti sebelumnya.
7. **Reduced motion** (iOS: Aksesibilitas → Kurangi Gerak): panel tambah & kartu konfirmasi tetap bisa
   dipakai (paket ini tidak menambah animasi baru).
8. **`/joint`**: catat bareng dengan kategori **Makanan** → bongkar rincian "Total Bersama" → irisan
   **Makanan** bertambah. Lalu nyalakan 🔒 **Sembunyikan dari pasangan**: kartu privasi menyebut bahwa
   kategorinya disimpan anonim, dan barisnya di timeline tampil **🔒 Privat**.
