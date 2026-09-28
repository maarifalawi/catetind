# 38 — Stage 2 · UI Mengikuti Uang yang Benar (Net di Timbangan)

**Paket:** audit fintech lanjutan · **Depends on:** Stage 1 **SELESAI** (`docs/handoff/FIXPLAN-AUDIT.md`)

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis + pembuka `ROADMAP-HALAMAN.md` §0 + **`docs/handoff/FIXPLAN-AUDIT.md` Stage 1** (angka yang sah sekarang).

## Bukti gap

Mesin uangnya sudah benar (`lib/data/joint-ledger.ts`, 23 test hijau), tapi **layarnya belum bicara bahasa mesin itu**.

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/joint-balance-scale.tsx:156,166` | panci menampilkan `myWeighedSpent`/`partnerWeighedSpent` = **uang yang keluar dari kantong**, sedangkan palang (`:96`) memakai `tiltDeg` dari **net**. Dua bahasa berbeda di satu komponen |
| 2 | `joint-settlement-modal.tsx:170-186` | baris "patungan" + "Selisih" tidak pernah menyebut siapa berhak menerima berapa; `settlementAmount` benar tapi tidak dilabeli sebagai *satu transfer* |
| 3 | `joint-split-sheet.tsx:63-99` | `JointSplitDraft.splits` masih `Record<string, number>` → **persen & rupiah di field yang sama** (ambiguitas yang baru ditutup di layer ledger, belum di UI) |
| 4 | `joint-add-sheet.tsx:162` | saat 🔒 privat, split dipaksa `null` → transaksi privat selalu 50/50 tanpa persetujuan |
| 5 | `components/dashboard/transaction-input-engine.tsx:747` vs `:649-740` | `extraFields` (split & privasi) dirender **DI BAWAH** tombol "Catat" → user mencatat sebelum pernah melihat opsinya |
| 6 | `joint-screen.tsx:574-598` | `JointAddSheet` dan `JointSplitSheet` adalah dua `Drawer.Root` z-[70] yang boleh hidup bersamaan (nested Vaul) |
| 7 | `joint-screen.tsx:277` | `handleSettle` cuma `setSettled(true)` → tidak ada entri ledger, dan setelah refresh nagging settle kembali |
| 8 | `lib/ai-quota.ts:254-262` | `AI_QUOTA_RESET_DATE` + `AI_QUOTA_RESET_DAYS` harus disinkron manual |

## Peta baca

- **204–210** — bahasa produk gesture & ≤ 4 tap untuk aksi utama
- **A7 / 2D.3** — ambang settle & aturan "dua pesan tidak boleh bertabrakan"
- **178–191** — kartu ringkasan wajib mencerminkan data, bukan salinan beku

**Kode acuan:** `lib/data/joint-ledger.ts` (kontrak `SplitSpec`, `sharesOf`, `ledgerTotals`) · `lib/data/monthly-review.ts:424-501` (pola penanda localStorage per bulan) · `components/catetind/joint-balance-scale.tsx` · `budget-sheet.tsx` (`RupiahField`, `ChoicePills`).

## Yang harus dibangun

1. **Panci & modal menampilkan NET** (`settlement.myNet`/`partnerNet`) dengan label eksplisit: `+Rp X · berhak menerima` / `−Rp X · harus transfer`. Nol nominal negatif yang tampil tanpa label. `aria-label` timbangan ikut diperbarui.
2. **`JointSplitDraft` menyimpan `SplitSpec`** (bukan `splits`), lalu `splitSpecOf()` di `joint.ts` jadi jalur migrasi data lama saja. Label di kartu timeline memakai `SplitSpec` — jangan ada lagi pembacaan `splits` di komponen.
3. **Pemilih "Siapa yang nalangin?"** di form tambah (2 chips: Aku / pasangan, default Aku) → isi `paidByUserId`. Hari ini `joint-screen.tsx:253` selalu `me.id`.
4. **Urutan form diperbaiki:** `extraFields` pindah ke ATAS CTA "Catat"; sheet split tidak boleh dibuka saat sheet add masih terbuka (tutup dulu, atau jadikan satu sheet bertahap). Target: **mengubah pembagian ≤ 3 tap dari FAB**.
5. **Settle = entri ledger:** `handleSettle` menulis baris `settlement {from, to, amount, method, month}` dan penanda settle **per bulan** disimpan persisten (pola `lib/data/monthly-review.ts`). Sisa bulan lalu dibawa sebagai pembuka bulan berikutnya.
6. **Kuota AI satu turunan:** `AI_QUOTA_RESET_DAYS` dihitung dari satu tanggal kanon (hapus konstanta kedua).
7. Sistem privasi tetap seperti sekarang (keputusan kebijakan = Stage 4B) — jangan ubah math privat di paket ini.

## Acceptance criteria

- [ ] `settlement.myNet > 0` ⇔ layar bilang "berhak menerima"; `< 0` ⇔ "harus transfer"; nol tempat lain menghitung ulang.
- [ ] Split 60/40 yang diubah di UI **mengubah angka** di timbangan & modal (buktikan dengan angka sebelum/sesudah).
- [ ] `paidByUserId` terisi dari pemilih; catatan atas nama pasangan tidak lagi masuk kantong pencatat.
- [ ] Tanpa scroll: opsi split & privasi terlihat **sebelum** tombol Catat.
- [ ] "Tandai Sudah Settle" → muncul entri settlement + setelah refresh status tetap settled (per bulan).
- [ ] **23 test lama tetap hijau tanpa diubah** (`pnpm test`); tambah test baru untuk `SplitSpec` di UI bila ada fungsi murni baru.
- [ ] Angka yang sah sekarang tidak boleh "diperbaiki" balik: seed joint = **Jon transfer Rp 25.000 ke Dany**; dengan `REALTIME_ARRIVAL` = **Rp 250.000**.
- [ ] `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` hijau (di mesin ini tambahkan `--config.manage-package-manager-versions=false`).

## Dilarang

- Mengubah rumus di `lib/data/joint-ledger.ts` kecuali benar-benar salah (kalau diubah, sebut alasannya + ubah test secara sadar).
- Menambah dependency, backend/API nyata, Zustand, atau store kedua.
- Menyentuh `lib/data/pricing.ts`, `/terms`, `/privacy`, Properti (PRD A12), atau angka patokan demo (`DAILY_HUD` dsb.).

## Validasi (jalankan & tempel hasilnya apa adanya)

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: file yang dibaca, daftar file yang diubah, angka timbangan sebelum/sesudah pada satu contoh split (mis. 60/40 dari Rp 350.000), jumlah tap untuk mengubah pembagian, dan batas yang belum bisa diverifikasi (mis. tanpa browser).
