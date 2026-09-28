# 42 — Stage 5 · Anti Double-Tap, Input Manusiawi, Offline, Metering AI, Env-Gate Demo

**Paket:** audit fintech lanjutan · **Depends on:** #40 (store & persistensi) untuk poin offline/antrean

> Baca `docs/handoff/CONTEXT-WAJIB.md` + `FIXPLAN-AUDIT.md` Stage 5.

## Bukti gap

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/dashboard/transaction-input-engine.tsx:337-388` | `handleSubmit()` hanya menjaga `inputLocked` (langganan). Tidak ada kunci submit & tidak ada idempotency → tap kedua / Enter lalu tap = **dua catatan identik**; form sengaja tidak dibersihkan (`:383-387`) sehingga nilai lama ikut terkirim lagi |
| 2 | `transaction-input-engine.tsx:257-265` | `value.replace(/\D/g,'')` + `.slice(0,9)` → `"1,5jt"` tersimpan **Rp 15**; nominal > Rp 999.999.999 mentok tanpa pesan |
| 3 | `public/sw.js` | hanya handler `push` + `notificationclick` — **tidak ada `fetch`** ⇒ PWA terpasang tidak bisa dibuka offline |
| 4 | seluruh repo | **nol** pemakaian `navigator.onLine` → tidak ada banner offline, tidak ada antrean, tidak ada state "belum tersimpan" |
| 5 | `lib/ai-quota.ts:107` (`AI_USAGE_CALLS`), `:143` | pemakaian AI = konstanta mati → meter **tidak pernah turun** walau user memakai AI/voice/OCR; tidak ada state kuota habis; `ai-quota-bus.ts` hanya menyimpan pembelian (sesi) |
| 6 | `lib/ai-chat.ts:167` | copy `saveFailed` sudah ada tapi **tidak pernah dipakai** (tidak ada jalur gagal) |
| 7 | `lib/data/joint.ts:38-49` | `DEMO_PARTNER_JOINED` / `DEMO_FORCE_WEEKLY_RECAP` / `DEMO_FORCE_MONTHLY_RECAP` = `true` keras → kalau di-ship, setiap user melihat rekap bulanan setiap hari + selebrasi pasangan palsu |

## Yang harus dibangun

1. **Idempotency.** Kunci `submitting` di `handleSubmit` (sebelum `onSubmitted`), `clientTxId = crypto.randomUUID()` ikut dikirim ke store, dan store menolak `clientTxId` duplikat. Test: dua pemanggilan sinkron → **satu** baris.
2. **Input nominal manusiawi.** Naikkan batas ke 13 digit; parsing `rb`/`jt` (`2,5jt` → 2.500.000, `50rb` → 50.000); chip konfirmasi "Rp 1.500.000?" untuk nilai hasil parsing; pesan jelas saat input tidak valid (bukan diam-diam dibuang).
3. **Offline-first.** `public/sw.js`: handler `fetch` (stale-while-revalidate untuk shell, network-only untuk API) + versi cache. Di app: listener `online`/`offline`, banner "Offline — catatanmu aman di perangkat", dan indikator "N catatan belum tersinkron" dari store. Batas jujur: tanpa backend, "tersinkron" = sudah tersimpan di IndexedDB — tulis itu di komentar & laporan.
4. **Metering AI nyata.** Satu usage-store: setiap panggilan AI/voice/OCR menambah pemakaian; gauge (`ai-fuel-card`, `billing-panel`, `ai-chat-widget`, banner Home) membaca angka itu; state **kuota habis** dengan degradasi (kategorisasi manual tetap jalan, voice/OCR off + penjelasan). Hapus `AI_USAGE_CALLS` statis; `AI_QUOTA_RESET_DAYS` diturunkan dari satu tanggal kanon.
5. **Env-gate saklar demo.** `DEMO_*` dibaca dari `process.env.NEXT_PUBLIC_DEMO === '1'` (produksi → `false`); dokumentasikan di komentar bahwa memaksa banner hanya untuk review desain.

## Acceptance criteria

- [ ] Test: dua submit beruntun → satu catatan; `clientTxId` kembar ditolak.
- [ ] `"1,5jt"` → 1.500.000 (test), 13 digit diterima, input tidak valid dapat pesan.
- [ ] Mode offline: app **tetap terbuka** (SW melayani shell), banner muncul, catatan tersimpan lokal lalu masuk antrean; saat online kembali antrean diproses.
- [ ] Setelah 3 panggilan AI, angka sisa kuota **turun** (tempel angka sebelum/sesudah); state habis punya layar/penjelasan, bukan tombol mati.
- [ ] `DEMO_*` = `false` di build produksi (buktikan dengan `grep` + jalankan build).
- [ ] `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` hijau; test lama tetap hijau.

## Dilarang

- Menambah dependency (service worker & parsing ditulis tangan; kalau perlu pustaka, minta izin dulu).
- Mengklaim data ter-sinkron ke server padahal masih lokal.
- Mengubah rumus uang atau angka test joint yang sudah dikunci.

## Validasi

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: bukti tidak ada catatan ganda, contoh parsing nominal, perilaku offline (apa yang tetap jalan vs tidak), angka kuota sebelum/sesudah pemakaian, dan status env-gate demo.
