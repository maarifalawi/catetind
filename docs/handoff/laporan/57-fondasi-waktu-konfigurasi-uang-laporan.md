# Laporan 57 — Fondasi: satu "hari ini", satu konfigurasi uang user, Jatah Harian turunan

**Status:** ⏳ BELUM DIKERJAKAN · **Paket:** 57
**Prompt:** `docs/handoff/prompts/57-fondasi-waktu-konfigurasi-uang.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Kerangka ini diisi oleh paket 57. Judul bagian jangan dihapus — isi selnya.

## 1. Ringkas (3–5 baris)

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 57.1 | Satu `todayISO()` | | |
| 57.2 | Konfigurasi uang user | | |
| 57.3 | Jatah Harian turunan | | |
| 57.4 | Pintu ubah pemasukan/cicilan | | |
| 57.5 | Perbarui §10.1 | | |

## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Tanggal "hari ini" di Home / /bills / /calendar / /wealth / /joint | | | |
| Income yang dipakai Jatah Harian | | | |
| `spent` yang dipakai Jatah Harian | | | |
| Jatah Harian setelah catat pengeluaran Rp 50.000 | | | |
| Saldo kas likuid (kanon Rp 1.850.000 — TIDAK boleh berubah) | | | |

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

## 7. Perubahan `CONTEXT-WAJIB` §10.1

- Angka `DAILY_HUD` baru: … (dasar hitungan: …)
- Alasan perubahan: …
- Saldo kanon Rp 1.850.000: TIDAK berubah (bukti: …)

## 8. Batas jujur

## 9. Pertanyaan terbuka
