# 80 — AI COACH MENOLAK DI LUAR KONTEKS & TIDAK LAGI MENGAKU SUDAH MENCATAT

**Status:** SELESAI (kode + test + gerbang validasi). **Verifikasi browser** tidak
bisa dijalankan di lingkungan ini (tanpa browser/perangkat) — langkah manualnya ada
di §6, apa adanya.

Sumber kebenaran: laporan **65 Tugas D** (chat → kartu konfirmasi),
laporan **79** (catatan dari AI selalu berkonteks), `docs/handoff/CONTEXT-WAJIB.md`
§"jujur di setiap klaim" + guardrail OJK (PRD 5042–5071).

---

## 1. Ringkas — apa yang dikeluhkan, apa akarnya

Uji pakai 8 Okt 2026, dua pesan berbeda ke AI Coach:

| # | Yang user tulis | Yang terjadi | Akar (dari kode) |
|---|---|---|---|
| 1 | `makn gacoan 30k` | AI menjawab **"sudah tercatat sebagai pengeluaranmu"** — tapi Riwayat **kosong** | `looksLikeTransactionIntent()` (`lib/ai/coach-context.ts`) mencocokkan kata kunci **PERSIS**: butuh angka DAN kata dari daftar `makan|minum|beli|…`. "makn" bukan "makan" ⇒ tidak dikenali ⇒ pesan dikirim ke model chat. Model itu **tidak punya kemampuan mencatat** (`POST /api/ai/text` hanya mengembalikan teks), tapi tidak ada pagar yang memeriksa balasannya ⇒ klaim palsu lolos ke user |
| 2 | `Catet makan gacoan 30k` | Kartu konfirmasi muncul (benar) | Bukan bukti AI pintar membaca: yang jalan cuma pola `explicitRecord = /(catet\|catat)\b/`. Tanpa kata "catet", kalimat bertypo jatuh ke jalur #1 |
| 3 | (permintaan produk) pertanyaan di luar konteks | AI menjawab **apa pun** — koding, tugas sekolah, politik, resep | Tidak ada gerbang konteks, baik di klien (`hooks/use-ai-chat.ts`) maupun di server (`app/api/ai/text/route.ts`). Prompt lama sama sekali tidak menyebut skop |

**Dua akar, dua perbaikan:** (a) gerbang niat yang **toleran salah ketik** +
**pagar klaim aksi** deterministik, (b) **gerbang konteks** yang menolak — di klien
(tanpa memanggil model) dan di server (sebagai pagar terakhir + keputusan skop dari
model lewat envelope JSON).

---

## 2. Hasil gerbang (DoD)

```
$ pnpm test
 Test Files  72 passed (72)
      Tests  944 passed (944)

$ pnpm exec tsc --noEmit
(bersih — 0 error)

$ pnpm build
✓ Compiled successfully
```

Baseline sebelum paket ini (laporan 79): **921 test / 71 file**. Sekarang **944 /
72** (+1 file test baru `lib/ai/coach-guard.test.ts`, +23 kasus). Tidak ada test yang
dihapus atau dilonggarkan.

---

## 3. Yang dibangun

### 3.1 Satu modul aturan bahasa, dipakai DUA sisi

`lib/ai/coach-guard.ts` *(baru — murni: tanpa store, tanpa jaringan, tanpa JSX)*

| Fungsi | Gunanya |
|---|---|
| `editDistance(a, b)` | jarak edit (Levenshtein) dua baris, tanpa dependency baru |
| `mentionsWord(text, keywords, { allowSuffix })` | cocok **PERSIS** (+ imbuhan opsional). Dipakai daftar yang salah tafsirnya **mahal** (topik luar konteks) |
| `mentionsWordLoose(text, keywords)` | cocok **TOLERAN typo**: ≤3 huruf harus persis, 4–6 huruf toleran 1, ≥7 huruf toleran 2. Dipakai gerbang niat mencatat, tempat salah tafsirnya **murah** |
| `detectOutOfScope(text)` | `true` = tolak. Ada kata keuangan ⇒ **tidak** ditolak; ada topik luar konteks ⇒ ditolak; selain itu ⇒ diteruskan ke model |
| `claimsRecordedAction(reply)` | `true` = balasan mengklaim sudah menulis data ("sudah aku catat", "sudah tercatat", "saldomu sudah aku kurangi", …) |

Ambang typo dibuktikan langsung: `makn→makan` (1) dan `sarapn→sarapan` (1) dikenali,
sementara `kapan→makan` (**2**) tidak — itulah alasan ambangnya tidak seragam.

### 3.2 Perubahan per file

| # | File | Perubahan | Alasan |
|---|---|---|---|
| 1 | `lib/ai/coach-guard.ts` *(baru)* | Empat pagar di §3.1 | Satu tempat aturan bahasa; dipakai klien & server supaya perilakunya mustahil berbeda |
| 2 | `lib/ai/coach-context.ts` *(diubah)* | `looksLikeTransactionIntent()` ditulis ulang: 3 sinyal (perintah mencatat · nominal + kata aksi/nama warung **toleran typo** · nominal + kalimat pendek bukan pertanyaan/status ledger). Daftar `PLACE_WORDS` (warteg, gacoan, indomaret, …) memisahkan "tanpa kata kerja" dari kata aksi | Menutup akar #1: `makn gacoan 30k`, `minm 20k`, `gacoan 30k` sekarang **selalu** jadi kartu konfirmasi — jalur yang AMAN, karena yang menulis tetap tombol "Catat ✓" |
| 3 | `lib/ai-chat.ts` *(diubah)* | `AI_OUT_OF_SCOPE_REPLY` + `AI_NO_RECORD_REPLY` (copy kanon, `ruleBased: true`) | Copy user-facing tidak boleh dikarang model (aturan repo) dan tidak boleh ditulis di JSX |
| 4 | `lib/ai/prompts.ts` *(diubah)* | `COACH_SYSTEM_PROMPT` + dua seksi baru: **SKOP** (tolak yang bukan keuangan pribadi user) dan **LARANGAN MENGAKU MELAKUKAN AKSI**; ekspor baru `COACH_REPLY_ENVELOPE_PROMPT` (`{"inScope": bool, "reply": string}`) | Guardrail lama cuma "jangan pernah mengaku menjalankan aksi" tanpa definisi skop — tidak cukup menahan halusinasi |
| 5 | `app/api/ai/text/route.ts` *(diubah)* | (a) pagar konteks deterministik **sebelum** provider dipanggil; (b) balasan diminta sebagai envelope JSON → `inScope:false` = `blocked:'scope'`; (c) `claimsRecordedAction()` pada balasan → `blocked:'claim'`; (d) envelope tak terbaca → jaring aman `generateText` (bentuk lama) + pagar klaim tetap berlaku. Balasan sukses menyertakan `blocked: null` | Keputusan skop diambil **model**, tapi keputusan apa yang **ditampilkan** tetap di app; chat tidak pernah mati karena perubahan format |
| 6 | `hooks/use-ai-chat.ts` *(diubah)* | Gerbang konteks di `sendMessage()` (tolak **tanpa** memanggil model, tanpa `recordAiUsage`); `blocked:'scope'/'claim'` dari server → copy kanon; jaring kedua di klien kalau balasan server (versi lama) masih mengklaim mencatat | Penolakan tetap sama setiap kali, kuota AI user tidak terbakar untuk pertanyaan yang tidak akan dijawab |
| 7 | `components/catetind/ai-chat-widget.tsx` *(diubah)* | `handleSend()` memeriksa gerbang konteks **lebih dulu** daripada gerbang niat transaksi | "resep nasi goreng 30k" tidak boleh berubah jadi kartu konfirmasi gara-gara kata "nasi"; sebaliknya "beli tiket film 100k" tetap catatan pengeluaran |
| 8 | `lib/transaction-ai.ts` *(diubah)* | Kata warung ditambahkan ke kategori **Makanan** (gacoan, seblak, mixue, hokben, martabak, dimsum, …) | Jaring aman lokal: `makn gacoan 30k` tidak lagi jatuh ke kategori "Lainnya" yang bikin user memperbaiki manual |
| 9 | `lib/ai/coach-guard.test.ts` *(baru)* + 3 test lama diperluas | 12 kasus aturan bahasa + typo, tolakan, klaim; `route.test.ts` +6 kasus (tolakan tanpa provider, `inScope:false`, klaim, envelope rusak, jaring aman); `coach-context.test.ts` +2 describe; `transaction-ai.test.ts` +1 kasus | Setiap klaim di laporan ini ada test-nya |

---

## 4. Perilaku sesudah paket ini (kasus uji pakai)

| Yang user tulis | Sesudah paket 80 |
|---|---|
| `makn gacoan 30k` | **Kartu konfirmasi** muncul (nama `Makn gacoan`, Rp 30.000, kategori Makanan). Tidak ada kalimat "sudah tercatat" sebelum user menekan "Catat ✓". Setelah ditekan → balasan menyebut angka NYATA sesudahnya (`buildRecordedReply`) |
| `Catet makan gacoan 30k` | Sama seperti sebelumnya (kartu konfirmasi) — sekarang satu jalur, bukan dua aturan berbeda |
| `berapa sisa jatahku?` / `kok boros ya?` | Dijawab model dengan angka dari blok `DATA USER` (tidak berubah) |
| `buatkan script python buat scraping` | **DITOLAK** — copy kanon app, tanpa memanggil model sama sekali |
| `kamu pakai model apa?` | **DITOLAK** (pertanyaan tentang AI-nya sendiri, bukan soal uang user) |
| `harga bitcoin hari ini berapa?` | Dijawab model — topik keuangan tetap dilayani, dengan guardrail edukatif + disclaimer (tidak berubah) |
| Balasan model (kapan pun) berbunyi "sudah aku catat" | Server mengembalikan `blocked:'claim'`; yang tampil `AI_NO_RECORD_REPLY` yang menyebut satu-satunya jalan benar: kartu konfirmasi → "Catat ✓" |

---

## 5. Batas yang jujur (diketahui, tidak disembunyikan)

1. **Gerbang konteks berbasis daftar kata**, bukan klasifikasi semantik. Kalimat di
   luar konteks yang tidak memuat kata di `OUT_OF_SCOPE_TOPICS` tetap sampai ke model.
   Lapis kedua (envelope JSON + seksi SKOP di prompt) yang menangani kasus itu, dan
   lapis ketiga (`claimsRecordedAction`) menahan bahaya utamanya.
2. **`detectOutOfScope` sengaja TIDAK menolak kalimat yang menyebut kata keuangan.**
   Pilihan sadar: menolak pertanyaan sah lebih merugikan daripada menjawab satu
   pertanyaan nyasar.
3. **Sinyal ke-3 gerbang niat** (nominal + kalimat pendek) bisa memunculkan kartu
   konfirmasi untuk kalimat ambigu seperti `aduh 30k lagi`. Harganya satu ketukan
   "Batal" — jauh lebih murah daripada klaim palsu "sudah tercatat" yang menipu user.
4. **Envelope JSON menambah satu mode panggilan** ke provider; jumlah panggilan tetap
   satu per pesan (jaring aman `generateText` hanya jalan kalau envelope tak terbaca).
   Latency-nya belum diukur di perangkat nyata — butuh browser.
5. **Kata warung** di `PLACE_WORDS`/kategori Makanan adalah daftar yang tumbuh; ia
   menambah akurasi, bukan syarat mutlak (jalur model tetap membaca kalimat aslinya).

---

## 6. Langkah verifikasi manual (butuh browser — belum dijalankan di sini)

1. Buka `/app` → bubble **✨ AI Coach**.
2. Ketik `makn gacoan 30k` → yang muncul **kartu konfirmasi** ("Tulisanmu udah aku
   rapikan"), **bukan** balasan "sudah tercatat".
3. Tekan **Catat ✓** → cek `/history`: barisnya benar-benar ada, dan balasan AI
   menyebut sisa jatah harian **sesudah** mencatat.
4. Ketik `buatkan script python buat scraping` → balasan tolakan ("Yang ini di luar
   kemampuanku ya…") + tombol "Lihat jatah & budget"; kuota AI **tidak** turun.
5. Ketik `berapa sisa jatah harianku?` → dijawab model dengan angka nyata.
