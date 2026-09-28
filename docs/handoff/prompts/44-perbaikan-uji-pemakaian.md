# 44 — Perbaikan Hasil Uji Pemakaian (nominal, saldo per konteks, mask default, /install, AI jujur)

**Paket:** lanjutan audit fintech · **Depends on:** Stage 1–6 (selesai) · **Sumber temuan:** uji langsung pemilik produk, 27 Sep 2026

> Baca `docs/handoff/CONTEXT-WAJIB.md` sampai habis (**termasuk §10 Baseline uang pasca-audit**), lalu `FIXPLAN-AUDIT.md`. Jangan mengembalikan angka yang sudah sah di §10.

## Bukti gap — semua dari uji langsung, sudah dilacak ke kode

| # | Gejala yang dilaporkan | Akar masalah di kode | Status |
|---|---|---|---|
| 1 | "Nomor 1 masih cacat" — angka saldo beda antar halaman | `lib/wallets.ts:106-163`: `WALLET_SEED` menandai **Tunai = konteks `keluarga`**, BCA & GoPay = `pribadi`. Home memakai `homeWallets(snapshot, moneyCtx)` (terfilter konteks) → **Rp 1.800.000**; `/wallet` (`walletAccounts`) & Kekayaan (`cashTotal`) memakai SEMUA dompet → **Rp 1.850.000**. Label cuma "Total Saldo" tanpa menyebut konteks → terbaca sebagai salah hitung | 🔴 OPEN |
| 2 | Mengetik `2.5000` → "Nominalnya belum kebaca" (harusnya Rp 25.000) | `lib/money/amount-input.ts`: `GROUPED_INTEGER = /^\d{1,3}(?:\.\d{3})+$/` menuntut kelompok **tepat 3 digit** | ✅ FIXED 27 Sep (verifikasi) |
| 3 | "Ngga baca kalau nominal 2 angka di depan titik" (`25.000`) | idem #2 + `display` dirapikan saat mengetik sehingga field "melawan" ketikan | ✅ FIXED 27 Sep (verifikasi) |
| 4 | Setelah pindah tab, angka tersensor dan tetap tersensor | `components/catetind/privacy-provider.tsx`: `if (document.hidden) setMasked(true)` **dan** efek persist menulisnya ke localStorage → sekali pindah tab user terkurung di mode sensor | ✅ FIXED 27 Sep (verifikasi) |
| 5 | AI Coach menjawab "Fitur AI Coach sedang dalam pengembangan" | `lib/ai-chat.ts` — `MOCK_FALLBACK_REPLY` belum disambungkan ke model; metering kuota sudah nyata, panggilan model belum | 🟡 BUTUH KEPUTUSAN (lihat §AI) |
| 6 | Panduan install jadi halaman terpisah, **sidebar hilang** | `app/install/page.tsx` hanya `PhoneStage` + `InstallGuideScreen`; screen-nya tidak memakai `ScreenShell` seperti halaman app lain | 🔴 OPEN |
| 7 | Belum diuji: PIN, offline, buka di bulan lain | — | 🔵 UJI MANUAL |

## Yang harus dibangun

1. **Satu definisi "Total Saldo" + label jujur.** Aturan: **"Total Saldo" = SALDO SEMUA DOMPET** (tidak tergantung konteks) — konteks uang hanya menyaring daftar/arus, bukan total. Terapkan di Home (hero + panel + ARIA), `/wallet`, dan Kekayaan lewat satu helper (`cashTotal(snapshot)` di `lib/money/store.ts`). Kalau konteks aktif, tampilkan baris kecil `Dompet {konteks}: Rp X` supaya user paham kenapa daftarnya lebih pendek. Test baru: total per konteks + invariant **Σ per-konteks = total semua** (BCA + GoPay + Tunai).
2. **Nominal: jangan marah saat user masih mengetik.** `problem` hanya tampil saat blur/submit (bukan tiap ketikan); `display` TIDAK dirapikan di tengah ketikan; chip konfirmasi ("Rp 1.500.000?") muncul saat `shorthand` atau saat field kehilangan fokus. Verifikasi: `25.000`, `2.5000`, `1,5jt`, `50rb`, `-50000` (ditolak halus), `25.` (bukan error).
3. **Mask default = tampil.** Pastikan perbaikan 27 Sep berlaku: pindah tab → tersensor (app switcher), kembali → **langsung tampil**, dan itu tidak memaksa sensor permanen. Tombol mata tetap menyimpan preferensi user.

4. **`/install` di dalam shell app** — satu halaman, sidebar desktop + bottom nav tetap terlihat seperti halaman lain (`ScreenShell`/pola halaman app yang ada; jangan bikin layout kedua, jangan pecah jadi beberapa route).
5. **AI Coach: jujur atau hidup** — lihat §AI. Apa pun pilihannya: jangan biarkan copy menjanjikan kemampuan yang belum ada.

## §AI — keputusan yang harus diambil SEBELUM menulis kode

- **(a) Sambungkan provider nyata** — butuh API key LLM dari pemilik produk, disimpan **server-side** di `.env.local` (JANGAN `NEXT_PUBLIC_*`): buat `app/api/ai/text/route.ts` (guard `requireUser()`, rate limit, pakai kuota dari `lib/ai-usage-store.ts`), lalu `hooks/use-ai-chat.ts` memanggil route itu dan memakai state gagal yang sudah ada (`AI_CAPTURE_COPY.saveFailed`).
- **(b) Belum ada key** → jujur + tetap berguna: jelaskan AI belum aktif, tombol "Hubungkan AI" ke `/settings/ai`, dan pertahankan jawaban berbasis aturan (tanpa model) hanya untuk pertanyaan yang bisa dijawab dari data lokal — beri label "belum pakai model".
Pilih satu, tulis alasannya di laporan.

## Verifikasi manual yang WAJIB dilaporkan (sisa uji pemilik produk)

- **PIN**: aktifkan → refresh → terkunci; pindah tab & kembali → terkunci; 5× salah → tunggu; "Lupa PIN" → bisa masuk lagi (bukan layar buntu).
- **Offline**: DevTools → Offline → reload → app terbuka + banner "Offline"; catat transaksi → "Tersimpan di perangkat"; Online → "Proses sekarang" → antrean 0.
- **Bulan lain**: majukan jam sistem ke bulan berikutnya → cek `/joint`, Riwayat, dan HUD tidak menampilkan "bulan ini kosong" yang aneh (tanggal demo vs tanggal nyata).

## Acceptance criteria

- [ ] Angka saldo identik di Home, `/wallet`, `/wallet/[id]`, dan Kekayaan **untuk konteks apa pun** — tempel angka 3 konteks di laporan.
- [ ] `25.000`, `2.5000`, `1,5jt`, `50rb` terbaca; error hanya saat blur/submit; `-50000` ditolak halus.
- [ ] Pindah tab → sensor; kembali → tampil. Tombol mata tetap permanen.
- [ ] `/install` menampilkan sidebar desktop + bottom nav; tetap satu halaman.
- [ ] **270 test lama tetap hijau** (+ test baru yang ditambahkan); `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` · `pnpm theme:audit` hijau.
- [ ] Tiga verifikasi manual di atas dijalankan & hasilnya dilaporkan apa adanya (termasuk yang gagal).

## Dilarang

- Mengubah rumus uang (`lib/data/joint-ledger.ts`, `lib/money/ledger.ts`) atau angka sah di `CONTEXT-WAJIB.md` §10.
- Menambah dependency baru tanpa izin; memindahkan data uang ke `localStorage`.
- Menghapus sensor mask sepenuhnya (privasi tetap ada — hanya default-nya yang berubah).
- Menyentuh Supabase di paket ini: **backend dikerjakan di paket #45**, jangan dicampur.

## Validasi

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm theme:audit
```

Laporan wajib memuat: tabel gejala → status (fixed/verified), angka saldo 3 konteks, hasil ketik nominal, bukti mask kembali tampil, deskripsi `/install`, keputusan AI + alasannya, dan hasil 3 verifikasi manual.
