# 20 — AI Chat: Voice Input + Scan Struk

**Paket:** melengkapi widget AI Coach (tanpa route baru) · **Fase 7** · **Depends on:** —

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka di `ROADMAP-HALAMAN.md` §0.

## Bukti gap (hasil audit)

`components/catetind/ai-chat-widget.tsx:154-162`:

```ts
function handleVoice() {
  // TODO: Implement Web Speech API for voice-to-text, then parse with DeepSeek V3
  showNotice('Fitur voice input segera hadir...')
}
function handleScan() {
  // TODO: Trigger receipt OCR flow (GPT-4o-mini) from domain4_prd.md
  showNotice('Fitur scan struk segera hadir...')
}
```

Padahal **dua jalur ini sudah punya mesinnya** di repo:
`components/dashboard/transaction-input-engine.tsx` sudah punya mode `'ocr'`
(dengan loading + form konfirmasi mock) dan `lib/ai-chat.ts` sudah punya tipe `ChatAction`
untuk aksi inline di dalam bubble.

## Peta baca

**PRD:**

- **455–521** — 2A.2 **Mode 3: AI Voice/Chat** (alur & batasan)
- **385–455** — 2A.2 **Mode 2: AI OCR Struk** — wajib: file picker native
  (`capture="environment"`), loading **"Lagi baca struknya... ✨"**, **form konfirmasi
  yang semua fieldnya editable** (nama hasil AI, nominal, tanggal, kategori), dan
  micro-copy *"AI udah bantu catat. Cek dulu ya, udah pas belum datanya?"*
- **1732–1735** — **A11: OCR Confidence Threshold** (baca & terapkan; di bawah ambang →
  minta user memeriksa/mengetik manual, jangan mengklaim yakin)
- **1700–1703** — **A3: Voice pakai Web Speech API**, bukan cloud STT berbayar
- **542–568** — micro-copy per state (sukses/gagal/konfirmasi) — pakai nada yang sama
- **2781–2965** — 4B routing & System Prompt AI Coach (konteks, tapi tetap mock di repo ini)

**Kode acuan:**

- `components/catetind/ai-chat-widget.tsx` — bubble, `showNotice()`, quick actions
- `lib/ai-chat.ts` (`ChatAction`, `mockReply`) + `hooks/use-ai-chat.ts` — state & mock balasan
- `components/dashboard/transaction-input-engine.tsx` — mode `'ocr'` + `handlePickPhoto()` mock
  (sumber kebenaran alur OCR — **jangan** bikin logika OCR kedua)
- `components/catetind/budget-sheet.tsx` — `RupiahField` / primitif input
- `lib/data/transactions.ts`, `lib/data/history.ts` — kategori & format nominal

## Kenapa paket ini ada

Fundy memposisikan diri **AI-conversational-first** (satu bar: "ketik, bicara, atau scan
struk") dan itu ditemukan sebagai pola yang **patut ditiru** (PRD 192–193). Di CatetInd,
dua dari tiga pintu itu masih bohong. Untuk audiens yang malas mengetik, voice & struk
adalah jalur masuk utama — membiarkannya "segera hadir" berarti pintu utama terkunci.

Psikologi (CONTEXT-WAJIB §5): **AI mengusulkan, user yang memutuskan.** Karena itu
hasil OCR/voice SELALU lewat konfirmasi yang bisa diedit, dengan micro-copy kolaboratif
(bukan otoriter) persis PRD 550.

## Yang harus dibangun

1. **Scan struk di dalam chat**:
   - Tombol scan membuka **file picker native** (`accept="image/*" capture="environment"`).
   - State loading di bubble: *"Lagi baca struknya... ✨"* (jangan spinner layar penuh).
   - Setelah "selesai" → **bubble konfirmasi** berisi field yang bisa diedit
     (nama hasil AI, nominal, tanggal, kategori) + tombol `Catat ✓` dan `Batal`,
     dengan micro-copy konfirmasi dari PRD 550.
   - Terapkan **A11** (confidence): kalau keyakinan rendah → tandai field mana yang perlu
     dicek + copy jujur (*"Yang ini aku belum yakin — boleh dicek dulu?"*).
   - Setelah dicatat: bubble sukses + aksi inline (`ChatAction`) untuk melihat riwayat.
   - **Ekstrak, jangan duplikasi**: kalau perlu, pindahkan bagian bersama (daftar tipe/kategori,
     helper parse nama file → nama transaksi) ke `lib/` dan **pakai dari kedua tempat**
     (chat & `transaction-input-engine`). Tulis di laporan apa yang kamu ekstrak.
2. **Voice input**:
   - `Web Speech API` (`SpeechRecognition`/`webkitSpeechRecognition`, `lang='id-ID'`),
     sesuai A3 (tanpa layanan berbayar).
   - UI mendengar: indikator jelas + tombol berhenti; transkrip muncul **sebelum** diproses.
   - Hasil transkrip → bubble konfirmasi yang sama (user bisa mengedit sebelum disimpan).
   - **Graceful degradation**: browser tanpa dukungan (mis. iOS Safari tertentu) →
     tombol jadi jelas-jelas tidak tersedia + jalan keluar: *"Di perangkat ini belum bisa
     bicara — ketik aja ya, sama cepatnya 🌿"*. Jangan ada tombol mati tanpa penjelasan.
   - Hormati izin mikrofon: tolak izin → copy netral, tanpa menyalahkan.
3. **Jangan mengubah** perilaku `transaction-input-engine` (mobil input utama) —
   penambahan hanya boleh backward compatible.
4. **Copy** tinggal di `lib/ai-chat.ts` (loading, konfirmasi, fallback, error), bukan di JSX.
5. **Catat batasnya** di komentar: parsing AI masih mock (`mockReply`), arah produksi
   (model & endpoint) ditulis sebagai komentar, bukan dipanggil.

## Acceptance criteria

- [ ] Tombol scan benar-benar membuka file picker dan menghasilkan bubble konfirmasi yang bisa diedit (uji dengan file gambar apa pun).
- [ ] Semua field hasil "AI" bisa diedit sebelum disimpan; simpan → transaksi muncul di `/history` (state lokal) + toast.
- [ ] Tombol voice memakai Web Speech API dan menampilkan transkrip sebelum diproses.
- [ ] Di browser tanpa Speech API / tanpa izin mikrofon: pesan jelas + cara alternatif (ketik) — **bukan** toast "segera hadir".
- [ ] Nol teks "segera hadir" tersisa di `ai-chat-widget.tsx`; nol TODO baru.
- [ ] Logika OCR tidak terduplikasi (jelaskan hasil ekstraksi di laporan).
- [ ] `prefers-reduced-motion` dihormati pada loading/pulse baru.
- [ ] `pnpm theme:audit` bersih · `pnpm exec tsc --noEmit` bersih · `pnpm build` sukses.

## Dilarang

- Menambah layanan STT/OCR berbayar atau dependency berat (A3 & A7).
- Menyimpan transaksi tanpa konfirmasi user (AI otoriter).
- Menampilkan kebingungan teknis ke user ("SpeechRecognition not supported error").
