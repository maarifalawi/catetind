# Laporan 59 — Riwayat & Dompet: kalibrasi nyata, hapus semua, scoping, sensor rapi

**Status:** ⏳ BELUM DIKERJAKAN · **Paket:** 59
**Prompt:** `docs/handoff/prompts/59-riwayat-dompet-jujur-privasi.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Kerangka ini diisi oleh paket 59. Judul bagian jangan dihapus — isi selnya.

## 1. Ringkas (3–5 baris)

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 59.1 | Kalibrasi & insight dari data nyata | | |
| 59.2 | Tombol "Hapus Semua Riwayat" | | |
| 59.3 | Detail dompet hanya dompet itu | | |
| 59.4 | Bug konteks "Bersama" → "Tunai" | | |
| 59.5 | Sensor nominal tanpa geser | | |

## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Kartu kalibrasi saat 0 transaksi | | | |
| Kartu kalibrasi saat 24 transaksi | | | |
| Kartu kalibrasi/skor saat ≥ 30 transaksi | | | |
| Jumlah catatan setelah "Hapus Semua Riwayat" | | | |
| Saldo dompet setelah hapus semua (harus TIDAK berubah) | | | |
| Jumlah catatan di dompet yang BARU dibuat (harus 0) | | | |
| Catatan dompet A bocor ke dompet B (dua nama sama) | | | |
| Dompet yang terpotong saat konteks "Bersama" | | | |
| Posisi elemen saat mata privasi aktif (per tempat) | | | |

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
