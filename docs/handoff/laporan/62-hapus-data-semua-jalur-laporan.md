# Laporan 62 — Hapus data di semua jalur yang belum punya pintunya

**Status:** ⏳ BELUM DIKERJAKAN · **Paket:** 62
**Prompt:** `docs/handoff/prompts/62-hapus-data-semua-jalur.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`

> Kerangka ini diisi oleh paket 62. Judul bagian jangan dihapus — isi selnya.

## 1. Ringkas (3–5 baris)

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|

## 3. MATRIKS kelola data (WAJIB lengkap)

| Jenis data | Buat | Baca | Ubah | Hapus | Jalur UI | Dampak ke saldo |
|---|---|---|---|---|---|---|
| Dompet | | | | | | |
| Catatan transaksi | | | | | | |
| Budget kategori | | | | | | |
| Celengan | | | | | | |
| Tagihan | | | | | | |
| Aset investasi | | | | | | |
| Hutang / piutang | | | | | | |
| Kategori kustom | | | | | | |
| Kategori bawaan | | | | | | |
| Transaksi /joint | | | | | | |
| Properti & aset fisik | | | | | | |

## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Hapus dompet berisi riwayat → saldo & invariant | | | |
| Hapus dompet → rujukan (tagihan/celengan/hutang) yatim? | | | |
| Setelah hapus akun → apa yang kosong | | | |
| Setelah hapus akun → apa yang (sengaja) masih tampil + alasan | | | |

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
