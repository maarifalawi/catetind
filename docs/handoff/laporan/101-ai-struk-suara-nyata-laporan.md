# Laporan paket 101 — Scan struk & input suara di form Catat akhirnya benar-benar AI

**Halaman:** form Catat (`TransactionInputEngine`, dipakai bottom sheet mobile, modal web, Kalender, Joint, sheet Edit) + kartu AI Coach · **Route:** `POST /api/ai/ocr`, `POST /api/parse-voice`

## 1. Temuan: kenapa struk nyata terbaca "Rp 87.500"

Laporan pemilik produk (screenshot form Catat): struk **TOKO ABANG** dengan `Subtotal Rp 200.000.000` / `Bayar Rp 200.000.000` / `Kembali 0` masuk sebagai **Rp 87.500**, catatan **"Struk Screenshot 2026-10-30 14…"**, kategori kosong ("Pilih kategori…"). Semua gejalanya punya satu sebab yang bisa dibuktikan di kode:

| # | Bukti di kode (sebelum) | Akibat yang dilihat user |
|---|---|---|
| 1 | `transaction-input-engine.tsx → handlePhotoChosen()` menulis `MOCK_RECEIPT_AMOUNT` setelah `setTimeout(…, MOCK_RECEIPT_READ_MS)` | Foto struk **tidak pernah dikirim ke mana pun**; nominal selalu **Rp 87.500** |
| 2 | Baris yang sama memakai `receiptNoteFromFileName(file.name)` | Catatan lahir dari **nama berkas** ("Struk Screenshot 2026-10-30 14…"), bukan dari toko di struk |
| 3 | `handleVoiceToggle()` memakai `setTimeout(…, 3000)` lalu menulis `'25000'` + `'Beli kopi'` | Tombol 🎤 **tidak pernah mendengar**; hasilnya selalu "Beli kopi Rp 25.000" |
| 4 | Engine tidak pernah mengisi kategori dari AI (jalur tambah hanya pilihan user) | Setelah "scan", kategori tetap kosong → tombol Catat tertahan |
| 5 | `lib/ai/extract.ts` memakai `Math.round(Number(raw.amount))` | Model yang menjawab `"Rp 200.000.000"` / `"200.000.000"` jadi **NaN → 0** ("nominal belum kebaca") |
| 6 | `EXTRACTION_SYSTEM_PROMPT` tidak mengatur angka mana yang jadi `amount` | Struk berisi puluhan angka: model bisa mengambil **harga item**, bukan total |
| 7 | Kategori & dompet dicocokkan **case-sensitive** (`includes(value)`) | Model yang menulis `"belanja"`/`"bca"` dibuang ke `''` → "Lainnya" / kategori kosong |
| 8 | Mesin STT adalah salinan kedua di `hooks/use-transaction-capture.ts` | Tidak ada cara membuat form Catat "mendengar" tanpa menyalin ulang seluruh logika Web Speech API |


## 2. Yang diubah

| File | Perubahan |
|---|---|
| `components/dashboard/transaction-input-engine.tsx` | 📸 → `requestReceiptTransaction()` (model vision); 🎤 → `useVoiceTranscript()` + `POST /api/parse-voice`; hasilnya mengisi **nominal, nama, kategori, tipe** (dan **dompet** khusus ucapan) lewat satu `applyExtraction()`; fase baru `parsing`; banner jujur (`aiNotice`) saat AI ragu / total tak terbaca; pembatalan lewat `AbortController`; timer mock & konstanta mock dihapus |
| `lib/ai-capture-client.ts` *(baru)* | Satu jembatan klien untuk tiga pintu: `receiptImageToJpeg()` (HEIC → JPEG di browser, dipindah dari hook), `requestReceiptTransaction()`, `requestTextTransaction()`, `readExtractedTransaction()`; kegagalan selalu jadi copy yang bisa dibaca user, tidak pernah melempar |
| `hooks/use-voice-transcript.ts` *(baru)* | Mesin Web Speech API **satu-satunya** (`lang='id-ID'`, interim, guard `onend` ganda, terjemahan kode error → copy) dipakai kartu AI Coach **dan** form Catat |
| `hooks/use-transaction-capture.ts` | Memakai dua modul di atas (STT & route tidak lagi disalin); fase `parsing` saat transkrip dirapikan; `parsingSource` ('voice'/'chat') supaya kalimatnya tidak salah sebut; pembatalan struk & parsing lewat `AbortController`; `readTimer`/`transcriptRef` yang sudah mati dihapus |
| `components/catetind/ai-capture-bubble.tsx` · `ai-chat-widget.tsx` | Judul fase `parsing` memakai `parsingVoiceTitle` saat yang dirapikan adalah **ucapan** (dulu selalu "tulisanmu") |
| `lib/ai/extract.ts` | `parseAmountValue()` — `"Rp 200.000.000"`, `"200.000.000"`, `"200,000,000"`, `"87.500,00"` dibaca sebagai rupiah utuh; nominal tak masuk akal/negatif tetap 0; `matchCanonical()` untuk kategori & dompet tanpa membedakan huruf besar-kecil |
| `lib/ai/prompts.ts` | Aturan nominal (titik = ribuan, `amount` = **total yang dibayar**, bukan harga item / "Kembali"), aturan nama (nama toko di kepala struk, bukan nama berkas), kategori/dompet persis daftar; `RECEIPT_EXTRACTION_PROMPT` baru untuk foto struk; dua contoh struk ditambahkan |
| `app/api/ai/ocr/route.ts` | Prompt struk memakai `RECEIPT_EXTRACTION_PROMPT` (satu sumber copy prompt di `lib/`) |
| `lib/transaction-ai.ts` | Mesin mock struk dihapus (`MOCK_RECEIPT_AMOUNT`, `MOCK_RECEIPT_READ_MS`, `mockReceiptScan`, `receiptNoteFromFileName`, sampel + hash seed) — tidak ada lagi jalur "baca struk" yang mengarang nilai dari nama berkas |
| `lib/data/history.ts` | Copy hasil AI di form Catat: `aiScanFilled`, `aiVoiceFilled`, `aiScanAmountMissing`, `aiVoiceAmountMissing` |
| `lib/ai-chat.ts` | `voiceExample`, `listeningFinishHint`, `parsingVoiceTitle` — kalimat yang dulu menempel di JSX engine |
| `lib/ai/extract.test.ts` · `lib/ai-capture-client.test.ts` *(baru)* | 3 kasus nominal/format + 5 kasus kontrak jembatan klien |

## 3. Alur baru

1. **📸 Foto struk** → berkas dinormalkan ke JPEG di browser → `POST /api/ai/ocr` → model memilih **total** (Total/Subtotal/Bayar, bukan harga item) → `normalizeExtraction()` → form terisi: nominal, nama toko, kategori, tipe. Dompet **tidak** diubah (struk tidak menyebut dompet mana), jadi tetap dompet konteks yang sedang dipilih.
2. **🎤 Ucapan** → Web Speech API (di perangkat, PRD A3) → transkrip interim tampil → `POST /api/parse-voice` (atau parser aturan lokal bila provider mati) → form terisi; dompet ikut hanya kalau user menyebut dompet yang **benar-benar miliknya**.
3. **AI ragu / total tak terbaca** → field **tidak** diisi angka karangan; banner amber + toast menyebut apa yang harus dicek. Banner hilang begitu user membetulkan nominal/kategori/dompet/catatan.
4. **Selesai / batal** → saat mendengar, tombol 🎤 = **Selesai** (transkrip langsung diproses); saat merapikan, tombolnya = **Batal**; menutup panel membatalkan keduanya (`AbortController`) dan tidak ada state yang ditulis setelahnya.


## 4. Bukti (dijalankan, output apa adanya)

```powershell
npx tsc --noEmit                 # 0 error
npx vitest run                   # 116 file · 1653 test lulus (sebelum: 115/1645)
pnpm theme:audit                 # "palet bersih — 583 file diperiksa"
npx next build                   # sukses, semua route ter-compile
```

**Uji nyata route OCR** (server dev sementara, struk TOKO ABANG dirender ulang dari laporan lalu dipotret browser):

```json
{
  "ok": true,
  "transaction": {
    "source": "receipt",
    "type": "expense",
    "name": "Belanja Toko Abang",
## 6. Susulan: "Model AI belum mengirim jawaban" & scan lambat

Setelah perbaikan di atas, pemilik produk melaporkan dua gejala baru saat memakai struk yang sama:

> "Model AI belum mengirim jawaban, coba lagi ya 🌿 … terus kok lama banget scan-nya"

**Sebabnya bukan jaringan.** Log server menunjukkan `[ai] empty: Model tidak mengembalikan teks.` setelah **25,2 detik**. Uji langsung ke penyedia dengan struk yang sama membuktikan sebabnya:

| Variasi | Hasil |
|---|---|
| `max_tokens: 700` + `reasoning_effort: 'low'` (setelan LAMA) | 570 token terpakai, **520 di antaranya token BERPIKIR**; hanya ~50 tersisa untuk JSON → pada prompt asli jawabannya **kosong** (`finish_reason: length`) setelah ±25 detik |
| `max_tokens: 3000` + `reasoning_effort: 'none'` | **0 token berpikir**, jawaban benar, **1,75 detik** |

Artinya: `deepseek-flash` berpikir dulu, dan token berpikir **ikut dihitung** ke `max_tokens`. Tugas ekstraksi (JSON pendek) tidak butuh berpikir, jadi jatahnya habis sebelum satu karakter jawaban ditulis.

**Yang diubah:**

| File | Perubahan |
|---|---|
| `lib/ai/provider.ts` | `reasoning_effort` jadi setelan per-panggilan: **`none`** untuk ekstraksi (OCR & parse ucapan) dan saran kategori, **`low`** untuk coach. Jatah token dinaikkan (vision 700→**1500**, JSON 700→**1200**). Jawaban kosong kini dicatat dengan **sebabnya** (`finish_reason`, `reasoning_tokens`, `completion_tokens`) di log server, dan dicoba ulang **sekali** (dulu tidak pernah diulang) |
| `app/api/parse-voice/route.ts` | `maxOutputTokens` 400→1200 |
| `app/api/ai/categorize/route.ts` | `maxOutputTokens` 80→300 |
| `app/api/ai/text/route.ts` | Envelope coach 900→1600 (+`reasoningEffort: 'low'`), jalur teks bebas 700→1600 |
| `lib/ai/provider.test.ts` | 5 kasus baru: vision & JSON memakai `none` + jatah cukup, coach tetap `low`, envelope boleh minta `low`, dan jawaban kosong karena kehabisan token **tetap menyebut angkanya** di log + dicoba ulang |

**Bukti sesudah perbaikan** (route OCR sungguhan, prompt asli, struk TOKO ABANG, tiga kali berturut-turut):

```
#1 HTTP 200 · 2020 ms · {"name":"Belanja Toko Abang","amount":200000000,"category":"Belanja",…}
#2 HTTP 200 · 1281 ms · {"name":"Belanja Toko Abang","amount":200000000,"category":"Belanja",…}
#3 HTTP 200 · 1103 ms · {"name":"Belanja Toko Abang","amount":200000000,"category":"Belanja",…}
```

Sebelum perbaikan: 25,2 detik → `503 "Model AI belum mengirim jawaban"`.

Catatan jujur: penyedia kadang tetap membalas `503 Service is too busy` (gangguan di sisi mereka, terlihat di log). Untuk itu app sudah menampilkan kalimat "Model AI belum bisa dihubungi, coba lagi sebentar ya 🌿" dan mencoba ulang satu kali otomatis.

    "amount": 200000000,
    "category": "Belanja",
    "wallet": "Tunai",
    "date": "2023-01-10",
    "confidence": 0.95,
    "lowFields": []
  },
  "model": "minca-engine-v1"
}
```

Sebelum paket ini, struk yang sama di form Catat menghasilkan **Rp 87.500 / "Struk Screenshot …" / kategori kosong**.

## 5. Catatan & batasan yang jujur

- **STT tetap bergantung browser.** Chrome/Edge (Android & desktop) punya Web Speech API; Firefox belum. Perangkat tanpa STT mendapat kalimat yang menyebut jalan keluarnya (ketik manual), bukan tombol yang diam.
- **Foto struk tidak menentukan dompet.** Struk tidak pernah menyebut uangnya keluar dari mana; memindahkan dompet otomatis akan membuat saldo dompet lain bergerak tanpa user memilih. Untuk ucapan, dompet disebut user sendiri — itu yang dipakai (kalau memang miliknya).
- **Tanggal struk belum masuk form tambah** karena form itu memang tidak punya field tanggal (tanggal = hari pencatatan). Nilainya sudah dibaca model dan dipakai kartu konfirmasi di AI Coach.
- **Metering** (`recordAiUsage`) mencatat satu panggilan OCR saat berkas dipilih dan satu panggilan voice saat transkrip diterima — sama seperti jalur AI Coach.
- **Kuota & paket** tetap berlaku: tombol terkunci untuk paket tanpa `ocr`/`voice`, dan mati saat kuota AI habis (tanpa mematikan pencatatan manual).
