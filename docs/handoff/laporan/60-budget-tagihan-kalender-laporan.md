# Laporan 60 — Budget & Target Nabung, Tagihan Rutin, Kalender Cashflow

**Status:** ⏳ BELUM DIKERJAKAN · **Paket:** 60
**Prompt:** `docs/handoff/prompts/60-budget-tagihan-kalender.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Kerangka ini diisi oleh paket 60. Judul bagian jangan dihapus — isi selnya.

## 1. Ringkas (3–5 baris)

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 60.1 | Budget: buat/edit/hapus | | |
| 60.2 | Celengan: `deleteFund()` | | |
| 60.3 | Pin Dashboard benar / dihapus | | |
| 60.4 | Tagihan: tanggal + aksi bayar terlihat | | |
| 60.5 | Kalender realtime | | |

## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Limit budget setelah hapus + Jatah Harian (harus TIDAK berubah) | | | |
| Jatah Harian setelah hapus celengan (harus NAIK berapa) | | | |
| Perilaku "Pin ke Dashboard" | | | |
| Tanggal awal strip "7 Hari ke Depan" | | | |
| Langkah klik membayar tagihan + saldo sebelum/sesudah | | | |
| Sel "hari ini" di /calendar | | | |

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
