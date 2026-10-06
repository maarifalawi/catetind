# 64 — PAKET D TUNTAS: DATA REAL (Supabase satu-satunya sumber)

**Status:** SELESAI untuk D1–D7 (kode + test + validasi). Beberapa item **verifikasi
browser** pada §4 prompt TIDAK dijalankan (tidak ada browser/perangkat) — ditulis
apa adanya di bawah.

Sumber kebenaran: `docs/handoff/prompts/64-paket-d-data-real-tuntas.md`,
`docs/STATUS-HALAMAN.md` §9 & §13, `docs/handoff/CONTEXT-WAJIB.md`.

---

## 1. Status sub-paket

| Sub | Isi | Status |
|---|---|---|
| **D1** | Gerbang seed paritas di 4 store + `app/api/wallets/store.ts` | ✅ Selesai |
| **D2** | Remote read/write (mapper + `*-remote.ts` + merge + idempotensi) | ✅ Selesai |
| **D3** | `help.ts` & `export.ts` membaca store hidup (bukan seed) | ✅ Sudah (diverifikasi) |
| **D4** | Empty state = keadaan normal | ✅ Sudah ada (diverifikasi) |
| **D5** | Fail-loud & jujur | ✅ Sudah ada (diverifikasi) |
| **D6** | Satu ledger / semua alur nyambung | ✅ Sudah (bukti: `smoke-money-flow.test.ts`) |
| **D7** | Perbarui/tambah test | ✅ Selesai (777 test hijau) |
| **Paket 63** | A/B/C/E/F + D sebagian | ✅ Diverifikasi ulang (tidak dikerjakan ulang) |

---

## 2. D1 — Gerbang seed (`SHOWS_SAMPLE_DATA`)

Pola `SEED_WALLETS` (`lib/money/store.ts`) diulang di semua store & satu route:

- `lib/money/wealth-store.ts` → `SEED_INVESTMENTS` / `SEED_DEBTS` / `SEED_PAYMENTS`
  (dipakai di `SERVER_SNAPSHOT` **dan** `mergeWealthState`).
- `lib/money/funds-store.ts` → `SEED_FUNDS` / `SEED_CONTRIBUTIONS`.
- `lib/money/bills-store.ts` → `SEED_BILLS`.
- `lib/money/joint-store.ts` → `SEED_JOINT_WALLET` / `SEED_JOINT_TRANSACTIONS` /
  `SEED_JOINT_MEMBERS` (menggantikan `JOINT_MEMBER_SEED`).
- `app/api/wallets/store.ts` → `seedWallets()` mengembalikan `[]` saat
  `!SHOWS_SAMPLE_DATA` (fallback memory demo tidak lagi berisi dompet contoh di
  produksi).

Semua `const` seed dideklarasikan **SEBELUM** `SERVER_SNAPSHOT` (hindari TDZ), dan
setiap referensi seed di jalur **hidrasi** + **filter tombstone** ikut diganti —
jadi tidak ada satu pun jalur yang masih membaca `INITIAL_*` langsung.

---

## 3. D2 — Remote read/write

**Mapper** (`lib/supabase/domain-mappers.ts`, murni + diuji dua arah):
investasi/aset·utang·pembayaran·tagihan·celengan·setoran. `lib/supabase/uuid.ts`
(`randomUuid` / `isUuid`).

**Lapisan remote** (semua TIDAK PERNAH `throw`; tanpa sesi → `null`/`false`):
- `lib/supabase/bills-remote.ts` — `readRemoteBills`, `pushBillToServer`, `deleteRemoteBill`.
- `lib/supabase/wealth-remote.ts` — `readRemoteWealth` (+ `pushInvestmentToServer`,
  `pushPriceToServer`, `pushDebtToServer`, `pushPaymentToServer`, `deleteRemote*`).
- `lib/supabase/funds-remote.ts` — `readRemoteFunds` (+ `pushFundToServer`,
  `pushContributionToServer`, `deleteRemoteFund`).
- `lib/supabase/joint-remote.ts` (**ditambah**) — `pushJointTransactionToServer`,
  `deleteRemoteJointTransaction` (baca sudah ada sejak paket 52).

**Wiring store** — SERVER jadi sumber saat ada sesi; IndexedDB jadi cache/antrean:
- pure `mergeWithRemoteBills` / `mergeWithRemoteFunds` / `mergeWithRemoteWealth`
  (diekspor → diuji tanpa jaringan);
- hidrasi: baca server → merge → tulis balik baris perangkat yang belum terkirim;
- tulis: setiap aksi store memanggil `ensureXOnServer` (fire-and-forget) atau
  `deleteRemoteX`. Idempotensi lewat id baris + `client_tx_id` yang sudah ada.

**Jembatan id:** id domain lokal (`inv-6`, `'7'`, celengan numerik) ≠ uuid kolom
Postgres. Dipakai `remoteId?: string` (opsional, ditambahkan ke `Investment`,
`Debt`, `DebtPayment`, `Bill`, `JointTransaction`, `SinkingFundItem`,
`FundContribution`). Celengan memakai `numericIdFromUuid()` (12 heks pertama —
stabil antar perangkat, tak menabrak id kecil). Saat push pertama, uuid dibuat lalu
**disimpan balik** ke baris lokal → pembacaan berikutnya mengenali baris yang sama.

**Koreksi penting:** tabel domain (`debts`/`investments`/`bills`/`goals`/…)
ber-PK **`id` tunggal** (bukan gabungan `(user_id, id)` seperti `wallets`), jadi
`upsert` memakai `onConflict: 'id'`.

---

## 4. D3/D4/D5/D6 — verifikasi ulang

- **D3:** `lib/money/export.ts` (`collectExportSources`) sudah membaca
  `getBillsSnapshot`/`getFundsSnapshot`/`getWealthSnapshot`; `help-center-screen.tsx`
  sudah mengoper `liveBills/liveFunds/liveDebts/liveInvestments` ke
  `buildHelpExportPayload()`. **Tidak ada** jalur ekspor yang membaca konstanta seed.
- **D4:** empty state ada — `bills-screen.tsx` (`EmptyState`), `history-screen.tsx`,
  `joint-screen.tsx` (tiga keadaan: empty/waiting/active), `insight-cards.tsx`
  (nurturing), dan empty-per-konteks (`CONTEXT_EMPTY_COPY`).
- **D5:** pola fail-loud sudah ada (banner kuota AI, `problem state` scan/voice,
  Midtrans 503, `{items:[],firstHere:true}`). Remote layer baru tidak pernah
  "jatuh ke data contoh": gagal baca → jalur lokal/cache; tanpa sesi → lokal.
- **D6:** `lib/money/smoke-money-flow.test.ts` (11 test) membuktikan catat sekali →
  tampil lintas halaman; pelunasan hutang menulis kas + catatan; setoran celengan
  → Home + /budget.

---

## 5. File dibuat / diubah

**Baru (kode):** `lib/supabase/uuid.ts`, `lib/supabase/domain-mappers.ts`,
`lib/supabase/bills-remote.ts`, `lib/supabase/wealth-remote.ts`,
`lib/supabase/funds-remote.ts`.

**Baru (test):** `lib/supabase/domain-mappers.test.ts` (15),
`lib/money/remote-merge.test.ts` (4).

**Diubah (kode):** `lib/money/wealth-store.ts`, `lib/money/funds-store.ts`,
`lib/money/bills-store.ts`, `lib/money/joint-store.ts`,
`app/api/wallets/store.ts`, `lib/data/budget.ts` (`remoteId?`),
`lib/data/wealth.ts` (`remoteId?` ×3), `lib/data/bills.ts` (`remoteId?`),
`lib/data/joint.ts` (`remoteId?`), `lib/supabase/joint-remote.ts` (tambah tulis).

**Diubah (test/docs):** `lib/demo.test.ts` (+1 test gerbang seed),
`docs/STATUS-HALAMAN.md` (§9.8 & §13), laporan ini.

---

## 6. Keputusan & alasan

1. **`remoteId` (bukan mengubah tipe id domain).** Mengubah id celengan dari
   `number` → uuid akan merusak puluhan test & komponen. Field opsional
   menjembatani tanpa riak.
2. **`numericIdFromUuid`** dipilih agar id domain celengan tetap stabil di semua
   perangkat tanpa tabel pemetaan di server.
3. **Kolom yang tak ada di skema tidak dikarang.** `scope`, `emoji`, `notes`,
   `symbol`, `is_paid_this_month` diambil dari cache perangkat / default jujur —
   bukan ditambah ke server.
4. **`user_net_worth` TIDAK diubah.** Net Worth tetap dihitung di lapis app
   (paket F), sesuai opsi yang prompt izinkan; menghindari `drop/create view`.
5. **Test tetap hijau tanpa diubah** karena di `NODE_ENV=test` seed tampil
   (`SHOWS_SAMPLE_DATA=true`) dan tidak ada sesi Supabase — jalur remote `null`.

---

## 7. Hasil validasi (apa adanya)

```
$ pnpm theme:audit
✔ palet bersih — 425 file diperiksa, tidak ada warna di luar palet.

$ pnpm exec tsc --noEmit
(bersih — 0 error)

$ pnpm build
✓ Compiled successfully
(semua route ter-build: 45 route, termasuk /wealth /budget /bills /joint)

$ pnpm test
Test Files  57 passed (57)
     Tests  777 passed (777)
  Duration  3.32s
```

Catatan: 777 = 757 (paket 63) + 20 test baru (15 mapper + 4 merge + 1 gerbang seed).
Perintah dijalankan dengan `pnpm --config.manage-package-manager-versions=false`
(jebakan `packageManager=pnpm@12.3.4`).

---

## 8. Yang BELUM bisa diverifikasi (jujur)

- **Jalur Supabase sesi nyata belum pernah dijalankan.** Tidak ada browser/sesi di
  lingkungan ini; yang diuji hanyalah fungsi **murni** (mapper + merge) dan jalur
  **tanpa sesi** (lokal). Menulis/membaca sungguhan ke tabel belum dibuktikan
  lewat smoke test jaringan.
- **Verifikasi browser §4 prompt tidak dijalankan** (butuh perangkat): `/checkout`,
  gambar share (`/share/[id]`), tombol "Share Report", widget AI, scan/voice,
  Tab Properti, tautan mati, 375/1440px. Tidak ada Playwright/DOM.
- **Midtrans & waitlist tidak disentuh** (sesuai larangan) — semua titiknya tetap
  fail-closed 503 / daftar kosong jujur.
- **Batas mapping jujur:** `scope`/`emoji`/`notes`/`symbol`/`is_paid_this_month`
  tidak dipersist ke server (kolomnya tidak ada di skema kanon); disimpan di
  cache perangkat.
- **Migrasi data lokal lama (IndexedDB) ke tabel baru belum ada** — hanya baris
  yang lahir/diubah setelah paket ini yang naik ke server. (Pola migrasi sekali
  jalan baru ada untuk dompet/ledger di `lib/supabase/local-migration.ts`.)
- **Penulisan joint memakai identitas sesi** (`viewerId`) sebagai `user_id`/
  `paid_by_user_id`, karena domain joint memakai id demo (`JOINT_ME.id`) —
  sedangkan kolomnya uuid. Batas ini tertulis di komentar `joint-remote.ts`.

---

## 9. Pembaruan dokumentasi

`docs/STATUS-HALAMAN.md` §9.8 & §13 diperbarui: Paket D ditandai **selesai**
(gerbang seed + baca/tulis Supabase) dengan sisa eksplisit yang **menunggu
Midtrans** dan batas jujur mapping.


