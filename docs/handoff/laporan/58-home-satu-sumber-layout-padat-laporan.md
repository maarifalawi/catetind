# Laporan 58 — Home: satu sumber kebenaran, empty state jujur, Jatah Harian dipadatkan

**Status:** ⏳ BELUM DIKERJAKAN · **Paket:** 58
**Prompt:** `docs/handoff/prompts/58-home-satu-sumber-layout-padat.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Kerangka ini diisi oleh paket 58. Judul bagian jangan dihapus — isi selnya.

## 1. Ringkas (3–5 baris)

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 58.1 | Semua kartu Home baca store (AKAR A) | | |
| 58.2 | Distribusi Pengeluaran turunan | | |
| 58.3 | Plant widget tanpa MOCK | | |
| 58.4 | Daily nudge turunan | | |
| 58.5 | Redesign layout (Arus Uang naik) | | |
| 58.6 | Riwayat Home dibatasi 7 hari | | |
| 58.7 | Kartu dompet saat 0 data | | |

## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Kartu yang masih menampilkan angka contoh saat data kosong (daftar kartu) | | | |
| Tinggi kartu Jatah Hari Ini (px) | | | |
| Susunan baris Home (urutan kartu) | | | |
| Jumlah baris Riwayat di Home dengan data > 7 hari | | | |
| Elemen informasi kartu Jatah Hari Ini yang hilang (harus: tidak ada) | | | |

## 5. Test

| File test | Jumlah kasus | Hasil |
|---|---|---|

## 6. Validasi (output apa adanya)

```bash
pnpm test                # … test / … file
pnpm exec tsc --noEmit   # …
pnpm build               # …
pnpm theme:audit         # …
```

## 7. Batas jujur

## 8. Pertanyaan terbuka
