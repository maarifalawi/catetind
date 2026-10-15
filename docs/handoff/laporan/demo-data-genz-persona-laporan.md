# Laporan — Isi Data Demo jadi Persona Gen Z Indonesia

> **Sifat pekerjaan:** murni **DATA**, bukan perubahan sistem. Bentuk/rumus app
> tidak disentuh: jatah harian, donut distribusi, ambang tahap tanaman, dan
> konstanta kanon tetap apa adanya. Yang berubah hanya **isi seed akun demo** +
> **mockup hero landing** supaya halaman demo benar-benar "cermin" buat target
> user (anak 20-an first-jobber).

---

## 1. Kenapa "halaman demo" = `/app` + `NEXT_PUBLIC_DEMO=1`

Repo ini tidak punya route `/demo`. Data contoh hidup lewat SATU pintu:
`NEXT_PUBLIC_DEMO=1` → `components/catetind/demo-seed-gate.tsx` (dipasang di
`app/layout.tsx`) → `seedDemoDataOnce()` di `lib/money/demo-bootstrap.ts`.
Data itu ditulis lewat **API tulis store yang sama dengan data user**, jadi ia
baris sungguhan (persisten di IndexedDB, bisa diedit/dihapus), bukan konstanta.

---

## 2. Persona & angka yang ditulis

Skenario: anak 20-an first-jobber di kota besar, gaji **Rp 7.300.000**,
pertengahan bulan fixed cost sudah kepotong.

| Kelompok | Angka | Muncul di |
|---|---|---|
| Pemasukan | Rp 7.300.000 | Arus Uang (Home) |
| Pengeluaran | Rp 5.180.000 | Arus Uang (Home) |
| Sisa / Total Saldo | Rp 2.120.000 | Arus Uang + deck dompet + `/wallet` |
| Dompet | BCA 1.650.000 · GoPay 320.000 · ShopeePay 85.000 · Tunai 65.000 | deck Home + `/wallet` |
| Celengan | "Nabung Liburan ke Bali" 1.250.000 / 5.000.000 = 25% | Tabungan Impian + Tanamanmu |
| Tanaman | Tahap 2 (Tunas) | kartu Tanamanmu |
| Jatah Hari Ini | `(7.300.000 − 5.180.000) ÷ sisa hari` | kartu Jatah Hari Ini |

Kategori pengeluaran (persis 6, jumlah = 5.180.000):
Kos+Listrik & WiFi 2.150.000 · Makan Siang & GoFood 1.350.000 · Transfer Orang
Tua 1.000.000 · Kopi & Nongkrong 420.000 · Transport (Ojol & KRL) 210.000 ·
Self-Reward / Shopee 50.000.

Pengeluaran itu **disebar per hari** (tanggal 1 → hari ini), nominal hariannya
tidak rata, dan tiap baris punya jam sendiri — jadi grafik "Arus Uang" (satu
titik per hari) bergerak wajar dan halaman Riwayat terbaca seperti catatan
orang, bukan tumpukan di dua tanggal. Nominal yang disebut di atas tetap jadi
barisnya sendiri (Mie Gacoan 28.500, Kopi Kenangan 32.000, Gojek ke Stasiun
19.000, kado ultah 50.000, Shopee 50.000).

---

## 3. File yang berubah

| File | Perubahan |
|---|---|
| `lib/money/demo-bootstrap.ts` | Seed ditulis ulang: 4 dompet, `saveUserMoneySettings({ monthlyIncome: 7_300_000, totalInstallments: 0 })`, baris ledger cerita, celengan Bali. **Pengeluaran DISEBAR PER HARI** (`spreadAmounts`) supaya grafik "Arus Uang" (satu titik/hari) bergerak wajar, bukan nol lalu melonjak; barisnya disisipkan **urut kronologis**. `opening` tiap dompet dipilih supaya saldo akhir = angka target. **Plus "fresh start"**: penanda demo menyimpan VERSI (`DEMO_SEED_VERSION = '2'`) — saat versinya belum cocok, state LOKAL dibuang (`clearMoneyState()` + `purgeStorageKeys()`) lalu halaman dimuat ulang sekali. |
| `lib/money/store.ts` | `ExpenseInput` dapat field opsional `time?: string` (diteruskan `postExpense`/`postIncome`) — dipakai HANYA oleh seed demo supaya jam tiap baris riwayat masuk akal. Catatan user biasa tetap memakai jam dinding (`clockLabel()`). |
| `components/catetind/demo-seed-gate.tsx` | Gerbang seed dibatasi ke **route app saja** (`isPublicRoute`) — fresh start yang membuang data tidak boleh jalan gara-gara membuka landing page. |
| `lib/data/landing.ts` | `HERO_HUD` disamakan ke persona (amount `Rp 72.000`, label tahap Tunas). |
| `lib/money/demo-bootstrap.test.ts` | +5 kasus: angka persis (saldo per dompet, Σ pemasukan/pengeluaran, celengan 25% → `sprout`), penanda versi, dan **sebaran harian** (tanggal tersebar + jam bervariasi). |

Tidak disentuh: `computeDailyHud`, `distributionSegments`, `stageFromPercent`,
`INITIAL_*`, `MONTHLY_INCOME`, `HISTORY_TRANSACTIONS`, `HERO_COPY`.

---

## 4. Batas jujur & keputusan (dibaca user)

1. **Jatah Hari Ini tidak dipatok.** Kartunya `(sisa uang) ÷ (sisa hari)` dari
   data + tanggal asli perangkat. Pertengahan bulan ≈ Rp 125–140rb/hari, awal
   bulan ≈ Rp 70rb/hari. Target "Rp 72.000" **tidak** dipaksa.
2. **Donut maksimal 4 kategori + "Lainnya".** `distributionSegments()` default
   `maxSegments = 4`, jadi 6 kategori cerita tampil sebagai Kos 42% · Makan 26% ·
   Ortua 19% · Kopi 8% · Lainnya 5% (Transport + Shopee). Ini perilaku sistem —
   bukan bug.
3. **Tanaman "Tunas" butuh progres ≥ 25%.** 1.200.000/5.000.000 (24%) akan jatuh
   ke "Benih", jadi celengan diisi **1.250.000 (25%)** supaya tahapnya benar-benar
   Tunas.
4. **`opening` dompet bukan saldo yang terlihat.** Saldo selalu `opening + Σ baris
   ledger`; `opening` di seed cuma titik nol supaya angka akhirnya pas.
5. Kartu Jatah Hari Ini butuh `monthlyIncome` terisi — tanpa itu ia menampilkan
   CTA "Atur pemasukanmu dulu". Karena itulah seed sekarang menulis konfigurasi
   uang.

---

## 5. Cara akses (pure demo)

Gerbang demo dinyalakan lewat **file env dev-only**: `.env.development.local`
(sudah dibuat di repo ini, dan di-gitignore oleh `.env*.local`).

```ini
NEXT_PUBLIC_DEMO=1
```

```powershell
# 1) restart dev server (WAJIB — NEXT_PUBLIC_* di-inline saat server MULAI)
pnpm dev

# 2) buka
#    Dashboard demo  → http://localhost:3000/app
#    Landing (hero)  → http://localhost:3000/
```

Kenapa file, bukan `$env:NEXT_PUBLIC_DEMO='1'` di terminal:

- **`middleware.ts` membaca env itu di SISI SERVER.** Kalau variabelnya cuma
  di-set di satu jendela PowerShell, server bisa tidak melihatnya → gerbang login
  tetap aktif → **Incognito malah diminta login**.
- Nilai `NEXT_PUBLIC_*` di-*inline* ke bundel klien saat server mulai, jadi
  mengubahnya setelah `pnpm dev` jalan tidak berpengaruh sampai di-restart.
- **`next build` / `next start` (NODE_ENV=production) TIDAK memuat file ini** —
  dibuktikan dengan `@next/env`:

  ```
  loadEnvConfig(dir, true )  → NEXT_PUBLIC_DEMO = "1"      (dev)
  loadEnvConfig(dir, false ) → NEXT_PUBLIC_DEMO = undefined (produksi)
  ```

  Jadi produksi tetap nol angka contoh. `pnpm test` (mode `test`) juga tidak
  memuatnya.

**Kalau browser sudah pernah memakai app ini:** lakukan **hard reload**
(`Ctrl+Shift+R`) sekali. Dev juga otomatis melepas service worker lama +
membersihkan Cache Storage (`service-worker-registration.tsx`); SW memang cuma
didatangkan kembali di produksi, karena `stale-while-revalidate` chunk Turbopack
di dev pernah menyajikan modul basi.

**Kalau masih menampilkan akun sendiri (bukan persona):** berarti browser itu
sedang **login**. Demo ini tidak butuh akun — **keluarkan sesi** (menu
Pengaturan → Keluar) atau pakai Incognito, supaya `readRemoteMoney()` tidak
menarik data server dan menimpa persona.

**Fresh start otomatis (tidak perlu Clear site data lagi).**

Mulai versi penanda `2`, demo menyiapkan dirinya sendiri: kalau isi persona
berubah (atau perangkat masih menyimpan data lain), `seedDemoDataOnce()`
**membuang state LOKAL dulu** — database IndexedDB (`catetind-money`) + semua
kunci localStorage ber-awalan `catet` — lalu **memuat ulang halaman sekali**,
baru menulis persona. Reload itu wajib: ia satu-satunya cara memastikan state di
memori (modul store yang sudah hidup) benar-benar kosong, karena menghapus
IndexedDB saja masih bisa ditimpa hidrasi yang sedang berjalan.

- **Yang tidak disentuh:** data di server (Supabase). Fresh start murni lokal.
- **Yang kelihatan user:** halaman memuat ulang sendiri **sekali** saat pertama
  kali demo disiapkan di perangkat itu. Setelah itu tidak lagi.
- **Penanda cadangan** di `sessionStorage` (`catet-demo-fresh-start`) mencegah
  reload berulang kalau penanda localStorage gagal tersimpan (mode privat).

Kalau mau memaksa mulai ulang kapan saja: buka DevTools → **Application →
Storage → Clear site data**, lalu refresh (atau buka di Incognito).

**Cara cek berhasil:** Home harus menampilkan **"Semua Dompet" total Rp
2.120.000** dengan dompet BCA / GoPay / ShopeePay / Tunai.


---

## 6. Bukti validasi

- `pnpm exec vitest run lib/money/demo-bootstrap.test.ts` → **9 passed**, termasuk
  5 kasus baru (saldo per dompet BCA 1.650.000 / GoPay 320.000 / ShopeePay 85.000
  / Tunai 65.000 & Σ 2.120.000; pemasukan 7.300.000 & pengeluaran 5.180.000;
  celengan 25% → sprout; penanda versi; sebaran harian + jam bervariasi).
- `pnpm exec vitest run` (seluruh suite) → **89 file, 1217 test, semua lulus**.
- `pnpm exec tsc --noEmit` → bersih.
- `pnpm build` → **Compiled successfully**.

**Catatan:** build tanpa `NEXT_PUBLIC_DEMO=1` tidak terpengaruh sama sekali — di
produksi `seedDemoDataOnce()` tidak pernah dipanggil dan semua halaman tetap
empty-state jujur.
