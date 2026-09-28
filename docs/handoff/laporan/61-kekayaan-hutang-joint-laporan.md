# Laporan 61 — Kekayaan & Hutang + Joint (Uang Bersama)

**Status:** ⏳ BELUM DIKERJAKAN · **Paket:** 61
**Prompt:** `docs/handoff/prompts/61-kekayaan-hutang-joint.md`
**Konteks wajib:** `docs/handoff/CONTEXT-WAJIB.md` + `docs/handoff/AUDIT-UANG-2026-09.md`
**Acuan terkait:** laporan 50 (hutang/aset) & 52 (joint)

> Kerangka ini diisi oleh paket 61. Judul bagian jangan dihapus — isi selnya.

## 1. Ringkas (3–5 baris)

## 2. File yang dibuat/diubah

| # | File | Perubahan | Alasan |
|---|---|---|---|

## 3. Yang dikerjakan (per item prompt)

| # | Item | Hasil | Bukti |
|---|---|---|---|
| 61.1 | Hutang/piutang: bayar terlihat, edit, hapus | | |
| 61.2 | Aset konsisten dengan hutang | | |
| 61.3 | Joint: 3 keadaan + hapus baris | | |

## 4. SEBELUM → SESUDAH (angka)

| Yang diukur | Sebelum | Sesudah | Cara reproduksi |
|---|---|---|---|
| Buat hutang Rp X → saldo & Net Worth | | | |
| Catat bayar Rp Y → saldo & Net Worth | | | |
| Edit nominal → saldo & Net Worth | | | |
| Hapus catatan hutang → saldo & Net Worth (baris kas TETAP) | | | |
| Keadaan /joint 1: belum ada kantong | | | |
| Keadaan /joint 2: partner belum gabung | | | |
| Keadaan /joint 3: partner gabung | | | |
| Hapus 1 baris joint → timbangan/settlement | | | |
| Kantong joint menyentuh kas pribadi? (harus TIDAK) | | | |

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
