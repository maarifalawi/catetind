# 43 — Stage 6 · Kepatuhan & Operasional (Export, Hapus Akun, Error Boundary, Observability)

**Paket:** audit fintech lanjutan · **Depends on:** #40 (store) + #42 (metrik & offline)

> Baca `docs/handoff/CONTEXT-WAJIB.md` + `FIXPLAN-AUDIT.md` Stage 6. Untuk aplikasi keuangan, paket ini bukan "nice to have": privasi-first menuntut portabilitas & penghapusan data yang benar-benar bisa dijalankan.

## Bukti gap

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `components/catetind/settings-panel-privacy.tsx:318-380` (`DataExportSettingsPanel`) | `handleExport()` masih TODO + toast "Menyiapkan file…"; halaman bernama "Export Data Saya" tapi tidak ada file yang pernah keluar |
| 2 | seluruh repo | **tidak ada penghapusan akun** & tidak ada kebijakan retensi (hanya `/settings/logout`) |
| 3 | `app/` | tidak ada error boundary per segmen (hanya `app/not-found.tsx`) → satu error render = layar mati total |
| 4 | `package.json` | hanya `@vercel/analytics`; **tidak ada event** untuk aksi kritikal uang (catat, koreksi saldo, settle, hapus) → drift angka tidak bisa dideteksi di produksi |
| 5 | repo | tidak ada test E2E sama sekali (tidak ada config Playwright) |

## Yang harus dibangun

1. **Export JSON nyata.** Ambil dari `lib/money/store.ts` (#40): dompet, baris ledger, utang/piutang, target, pengaturan privasi. Hasilnya file `.json` yang benar-benar terunduh (`Blob` + `URL.createObjectURL`) **plus** jalur email yang tetap jelas berlabel demo kalau belum ada backend. Sertakan `exportedAt`, versi skema, dan jumlah baris supaya bisa diaudit.
2. **Hapus akun + retensi.** Satu alur di Pengaturan: konfirmasi berlapis (tulis kata kunci), hapus seluruh data store + IndexedDB + penanda localStorage, lalu kembali ke `/login`. Tulis kebijakan retensi di komentar + UI (mis. "tidak ada salinan di server karena belum ada server").
3. **Error boundary per segmen.** `app/(segmen)/error.tsx` untuk area uang (`/wallet`, `/wealth`, `/history`, `/joint`) dengan copy tenang + tombol "Muat ulang" & "Export data" supaya user tidak kehilangan akses ke catatannya.
4. **Event analytics kritikal** (pola `@vercel/analytics` yang sudah dipakai): `transaction_created`, `transaction_deleted`, `balance_adjusted`, `settlement_recorded`, `joint_split_changed`, `ai_quota_low` — tanpa nominal (privasi!). Sebutkan di laporan bahwa payload tidak boleh memuat angka uang.
5. **Smoke test alur uang.** Empat skenario wajib, pilih cara yang **tidak menambah dependency baru** kalau bisa: (a) catat pengeluaran → saldo & HUD ikut berubah; (b) split joint 60/40 → nominal transfer benar; (c) koreksi saldo → Net Worth ikut; (d) hapus → bertahan lintas halaman. Bila ingin Playwright, minta izin eksplisit dulu (devDependency) — kalau tidak diizinkan, tulis checklist manual + perkuat test unit.

## Acceptance criteria

- [ ] Tombol Export benar-benar menghasilkan file JSON; isinya memuat seluruh baris ledger & utang/piutang; buka isinya di laporan (potongan 10 baris pertama).
- [ ] Hapus akun: setelah alur selesai, semua data hilang (buktikan: refresh → Home kosong/onboarding, dan IndexedDB sudah bersih).
- [ ] Error boundary: menyuntikkan error di satu area tidak mematikan seluruh app dan tetap menyediakan "Export data".
- [ ] Event analytics terkirim tanpa nominal uang (tunjukkan daftar nama event + payload).
- [ ] Empat skenario smoke test dieksekusi & hasilnya ditempel apa adanya (lulus/gagal, termasuk langkah manual).
- [ ] `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` hijau; test lama tetap hijau.

## Dilarang

- Mengirim nominal uang / nama catatan ke analytics (pelanggaran prinsip privasi repo ini).
- Mengklaim kepatuhan hukum (GDPR/UU PDP) tanpa dasar — tulis apa yang benar-benar diimplementasikan.
- Menambah dependency tanpa izin eksplisit; mengubah rumus uang atau angka test joint yang sudah dikunci.

## Validasi

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: struktur file export (potongan isinya), bukti data terhapus, daftar event + payloadnya, hasil 4 skenario smoke test, dan daftar batas yang masih terbuka untuk produksi.
