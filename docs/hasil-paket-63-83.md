38. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/38-stage2-ui-uang-benar.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
HASIL:
Semua selesai dan tervalidasi. Berikut laporannya.

## Yang dibaca

`docs/handoff/CONTEXT-WAJIB.md` (penuh), `docs/handoff/FIXPLAN-AUDIT.md` (Stage 1 + angka sah), `docs/handoff/prompts/38-stage2-ui-uang-benar.md`, `docs/handoff/ROADMAP-HALAMAN.md` §0, `vitest.config.mts`, `tsconfig.json`, `package.json`, `hooks/use-monthly-review.ts`, `components/catetind/budget-sheet.tsx` (ChoicePills), plus kode acuan: `lib/data/joint-ledger.ts`, `lib/data/joint.ts`, `joint.test.ts`, `joint-ledger.test.ts`, `joint-balance-scale.tsx`, `joint-settlement-modal.tsx`, `joint-split-sheet.tsx`, `joint-add-sheet.tsx`, `joint-screen.tsx`, `joint-timeline.tsx`, `joint-stats-row.tsx`, `joint-recap-banners.tsx`, `dashboard/transaction-input-engine.tsx`, `lib/ai-quota.ts`, `lib/data/monthly-review.ts`, `lib/wallets.ts`.

## File yang dibuat / diubah

**Diubah (10):** `lib/data/joint.ts` · `lib/ai-quota.ts` · `components/dashboard/transaction-input-engine.tsx` · `components/catetind/joint-balance-scale.tsx` · `joint-settlement-modal.tsx` · `joint-split-sheet.tsx` · `joint-add-sheet.tsx` · `joint-screen.tsx` · `joint-timeline.tsx` · `joint-recap-banners.tsx`
**Baru (2):** `lib/data/joint-settlement.test.ts` · `lib/ai-quota.test.ts`
`lib/data/joint-ledger.ts` **tidak disentuh** (rumus tidak diubah). `joint.test.ts` + `joint-ledger.test.ts` **tidak disentuh**.

## Keputusan desain (dan alasannya)

1. **NET jadi bahasa semua permukaan.** Panci kini memakai `myNet`/`partnerNet` = angka yang sama dengan yang menentukan transfer (dulu panci = kas, palang = net → dua bahasa). Label wajib di **semua varian**: `+Rp X · berhak menerima` / `-Rp X · harus transfer` / `Rp 0 · udah impas`, dan `aria-label` timbangan ikut. Tanda minus ASCII (bukan U+2212) supaya deterministik di semua font. Chip panci dilebarkan 96→112px + frame tinggi +14px supaya net panjang (`+Rp 250.000`) tetap satu baris dan labelnya tidak menabrak copy di bawah.
2. **`split?: SplitSpec` kanonik, `splitType/splits/payerId` jadi field `@deprecated`.** `splitSpecOf()` = satu-satunya jalur migrasi data lama; tidak ada komponen yang membaca `splits` lagi (label form & timeline lewat `splitSpecLabel()` baru). Field lama dikosongkan saat override supaya tidak ada dua sumber kebenaran.
3. **Pemilih "Siapa yang nalangin?"** (2 chip via `ChoicePills`, default Aku) → `paidByUserId`; `joint-screen` tidak lagi memaksa `me.id`.
4. **`extraFields` pindah ke ATAS CTA** + stage diringkas (`min-h` 188→140 di sheet saat ada extra fields) supaya opsi terlihat sebelum "Catat". Dua `Drawer.Root` tidak boleh hidup bersamaan: `openSplitForNew` menutup sheet add dulu, lalu membukanya lagi setelah pembagian disimpan.
5. **Settle = baris ledger** `{from,to,amount,method,month}` dimodelkan lewat baris biasa (`bayar`=pengirim, kewajiban=penerima dengan `single_payer`) sehingga net jadi 0 **tanpa rumus baru**; ditandai `isSettlement` agar `paidBy`/`weighedPaidBy`/`categoryBreakdown` mengabaikannya (Total Pengeluaran Bersama tidak membengkak). Penanda per bulan di localStorage (`catet-ind-joint-settle:<YYYY-MM>`, pola `monthly-review`), dipulihkan setelah mount (server & client identik). Sisa `carryOver` diposting sebagai pembuka bulan berikutnya dengan **arah dibalik** (`buildCarryOverEntry`).
6. **Kuota AI satu turunan:** `AI_QUOTA_RESET_ISO = '2026-10-01'` + `AI_QUOTA_TODAY_ISO = '2026-09-27'`; `AI_QUOTA_RESET_DATE` & `AI_QUOTA_RESET_DAYS` = turunan (nilainya tetap `'1 Oktober 2026'` / `4`, jadi UI billing & kartu bahan bakar tidak berubah).
7. **Privasi TIDAK diubah** (keputusan kebijakan = Stage 4B): saat 🔒, pembagian masih dipaksa `equal` dan nominal tetap ikut ditimbang — yang diperbaiki hanya atribusi kantong (`paidByUserId`). Alasan ditulis di komentar `joint-add-sheet.tsx`.

## Angka timbangan sebelum/sesudah (contoh 60/40 dari Rp 350.000)

| Kasus | Sebelum | Sesudah | Bukti |
|---|---|---|---|
| Satu transaksi Rp 350.000 ditanggung Jon | bagi rata: `myNet +175.000` (Dany `-175.000`) | 60/40: `myNet +140.000` (Dany `-140.000`) | test *"split 60/40 dari UI benar-benar mengubah…"* |
| **Seed nyata**: WiFi IndiHome Rp 350.000 60/40 → diubah 50/50 | `-Rp 25.000 · harus transfer` (Jon→Dany) | `+Rp 10.000 · berhak menerima` — **arah transfer berbalik**: Dany yang transfer | test *"mengubah split di UI mengubah angka & arah timbangan (data seed)"* |
| Settle seed (25.000) masuk ledger | `myTotalSpent 1.135.000` / `totalSpent 1.870.000` | tetap sama, `myNet`/`partnerNet` = 0, level `equal` | test *"melunasi timbangan TANPA menggelembungkan…"* |
| Sisa bulan lalu 30.000 | `myNet −25.000` | `myNet −55.000`, pembuka bukan pengeluaran | test *"menaikkan utangku di bulan baru…"* |

Angka patokan demo tetap: seed = **Jon transfer Rp 25.000 ke Dany**; dengan `REALTIME_ARRIVAL` = **Rp 250.000** (test lama yang mengunci angka ini masih hijau).

## Jumlah tap mengubah pembagian dari FAB

**3 tap**: (`1`) FAB → sheet add (opsi split sudah terlihat di atas "Catat") → (`2`) tap "Atur pembagian →" (sheet add menutup sendiri) → (`3`) tap preset **60/40** → tap **"Simpan Pembagian"**. Artinya: 1 tap membuka sheet split + 1 tap preset + 1 tap simpan = **3 tap**; setelah itu sheet add terbuka lagi dengan `Split: Persentase 60/40` dan nominal/nalangin/privasi tidak hilang.

## Hasil validasi (apa adanya)

```
### 1) pnpm test
 ✓ lib/ai-quota.test.ts (3 tests)
 ✓ lib/data/joint-ledger.test.ts (11 tests)   ← 23 test lama, tidak diubah
 ✓ lib/data/joint.test.ts (12 tests)          ← 23 test lama, tidak diubah
 ✓ lib/data/joint-settlement.test.ts (22 tests)
 Test Files  4 passed (4)
      Tests  48 passed (48)

### 2) pnpm exec tsc --noEmit
tsc exit=0            (tanpa output)

### 3) pnpm build
✓ Compiled successfully in 2.5s   → 35 route ter-generate (termasuk /joint)

### 4) pnpm theme:audit
✓ palet bersih — 246 file diperiksa, tidak ada warna di luar palet.
```

Catatan pelaporan: `pnpm build` **gagal** kalau flag `--config.manage-package-manager-versions=false` ditulis **setelah** nama script (pnpm meneruskannya ke `next build` → `error: unknown option`, bukan kegagalan kode). Bentuk yang berhasil: `pnpm --config.manage-package-manager-versions=false build`. Sekali saya menyambut error `tsc` dari file hasil generator: `.next/types/validator.ts(5,79): Cannot find module './routes.js'` — itu artefak urutan `tsc` tepat setelah `build` mengganti `.next/types`; `tsc` ulang = exit 0 (dan urutan test → tsc → build bersih).

## Batas yang belum bisa diverifikasi (tanpa browser)

- **Visual 375 px / 1440 px**: jumlah scroll nyata di sheet add, lebar chip panci saat net panjang, dan tidak adanya horizontal scroll hanya bisa dipastikan di browser. Secara kode: urutan DOM sudah benar (opsi di atas CTA), stage diringkas 140px, chip 112px + frame 210px.
- **Perilaku Vaul/fokus**: "tutup sheet add sebelum buka sheet split" dijamin alur state (`setShowAddSheet(false)` sebelum `setShowSplitSheet(true)`), tapi transisi animasi bersama-sama (tutup↔buka) belum dilihat mata.
- **localStorage lintas-refresh**: logika murni (`buildSettlementEntry`, `settlementEntriesFor`, `previousMonthKey`) teruji; persistensi nyata di browser (refresh → entri & status settled pulih, tanpa entri dobel) belum diuji end-to-end.
- **A11y runtime**: `aria-label`/`role=radiogroup`/`aria-checked` sudah dipasang, belum diuji dengan screen reader.
- Sisa `-Rp …` pada chip kecil/`sm` kini selalu berlabel (`harus transfer`), tetapi kebenaran pembacaan kontras rasio di varian 8px belum diukur alat.


39. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/39-stTage3-sesi-dan-keamanan-api.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tGsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
HASIL:
All validations are green. Here's the final report.

## Hasil Paket 39 — Stage 3: Sesi, Otorisasi API, Push per-User, PIN Gate

Kode undangan di `lib/data/joint-invite.ts`: `INVITE_CODE = 'A7K2M9'` global **dihapus** → kode 6 karakter per wallet (`crypto.getRandomValues`) dengan state `{ code, walletId, createdAt, expiresAt, usedBy }`; `resolveInviteFrom()` memvalidasi **single-use + kedaluwarsa 24 jam** secara nyata, jadi copy "Kode berlaku 24 jam. Cuma bisa dipakai 1x." sekarang memang divalidasi.

**Sesi & otorisasi** — `lib/session.ts` (mock, dua akun: `user_a` Jon, `user_b` Dany) + `app/api/session/route.ts` (GET/POST/DELETE) + `lib/session-client.ts` (klien). `requireUser(req)` adalah baris pertama setiap handler; identitas **selalu** dari cookie, tidak pernah dari body.

**Store per-user** — `app/api/wallets/store.ts` (`Map<userId, Wallet[]>`) dan `app/api/push/store.ts` (`Map<endpoint, { userId, subscription }>` + rate limit 5/menit/user). Keduanya berkomentar: penggantian ke Supabase = mengganti isi file itu saja.

**PIN gate nyata** — `lib/data/app-lock.ts` (kebijakan+copy), `lib/app-lock-store.ts` (PBKDF2-SHA256 210.000 iterasi, salt acak, compare konstan-waktu), `lib/biometric-unlock.ts` (WebAuthn platform authenticator), `components/catetind/app-lock-provider.tsx` + `app-lock-screen.tsx`, dipasang di `app/layout.tsx` (menggantikan seluruh isi app, termasuk bottom nav/toast/AI chat). Auto-mask `visibilitychange` di `privacy-provider.tsx`; daftar route publik dipindah ke `lib/public-routes.ts` (dipakai gerbang langganan **dan** gerbang kunci).

### Validasi (dijalankan di akhir, hasil apa adanya)

```bash
pnpm test              → Test Files 10 passed (10) · Tests 110 passed (110)
pnpm exec tsc --noEmit → exit 0 (tanpa error)
pnpm build             → ✓ Compiled successfully in 2.0s · 34/34 static pages
pnpm theme:audit       → ✓ palet bersih — 263 file diperiksa
```

48 test lama tetap hijau (prompt menyebut "23 test lama" — repo sebenarnya sudah punya 48 sebelum paket ini: ai-quota 3, joint-ledger 11, joint 12, joint-settlement 22). **62 test baru**: `lib/session.test.ts` (8), `lib/data/joint-invite.test.ts` (18), `lib/invite-store.test.ts` (7), `lib/data/app-lock.test.ts` (9), `app/api/wallets/route.test.ts` (11), `app/api/push/push.test.ts` (9).

### Tabel endpoint → status TANPA sesi (diuji live dengan server produksi)

| Endpoint | Tanpa sesi | Dengan sesi A | Catatan |
|---|---|---|---|
| `GET /api/wallets` | **401** | 200 | A = 4 dompet, B = 3 (seed disalin per user) |
| `POST /api/wallets` | **401** | 201 | `holder` = "Jon" dari sesi walau body mengirim "Dany" |
| `GET/PUT/DELETE /api/wallets/:id` | **401** | 200 | 404 untuk id milik user lain |
| `POST /api/push/subscribe` | **401** | 201 | tersimpan atas nama pemanggil |
| `DELETE /api/push/subscribe` | **401** | 200 | `removed:false` bila endpoint milik user lain |
| `POST /api/push/send` | **401** | 200 | `{ toUserId: "user_b" }` → **403** |
| `GET /api/session` | **401** | 200 | `POST/DELETE /api/session` sengaja publik (pintu masuk/keluar) |

Cuplikan nyata: `POST /api/session` → `set-cookie: catet-ind-session=v1.dXNlcl9h; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=lax`. Isolasi: `GET/PUT/DELETE /api/wallets/cash-…` dengan sesi B (milik A) → **404/404/404**, dan store B tidak berubah.

### Kode undangan (hasil test)

`dua wallet → dua kode berbeda` ✓ · `consumeInvite` pertama → `usedBy` terisi, pemakaian kedua **null** ✓ · `now + 24 jam` → status **`expired`** (`consumeInviteIn` menolak tanpa menandai) ✓ · kode asing → `unknown` ✓ · membuat kode baru mencabut kode lama dompet itu ✓ · seed demo yang dipakai ikut jadi `used` dan bertahan (tak balik `valid`) ✓. Live: `/join/K4M2P9` → valid (+CTA), `/join/B3X9Q1` → kartu kedaluwarsa, `/join/C8P4T7` → kartu sudah dipakai, `/join/ZZZZZZ` → kode asing; metadata ikut status.

### Perilaku PIN

- **Refresh** → `unlocked` hanya state memori, jadi record PIN ada = langsung terkunci lagi.
- **Kembali ke tab** → `visibilitychange` saat `hidden` memanggil `lockNow()`; kembali ke tab = layar kunci.
- **Idle 60 detik** → auto-lock (`AUTO_LOCK_IDLE_MS`).
- **Lupa PIN** → dialog menjelaskan → `router.replace('/login')` → `endSession()` + PIN dibuang → verifikasi email ulang jadi syarat masuk (bukan layar buntu).
- **Anti brute-force** → 5 salah → tunggu 5 menit, state dipersist (refresh tidak mengembalikan jatah); hitung mundur `m:ss`.
- Route publik (`/login`, `/checkout`, `/join`, …) dilewati gerbang — supaya user yang lupa PIN tidak terjebak.

### Masih mock / batas yang harus diumumkan

1. **Sesi bukan autentikasi produksi.** Cookie berisi `v1.<base64url(userId)>` **tanpa tanda tangan** → bisa dipalsukan dari DevTools. Yang dijamin: 401 tanpa cookie + isolasi per-user. Produksi = Supabase (JWT httpOnly + RLS).
2. Store API in-memory — hilang saat restart/redeploy; hanya berubah isi `store.ts` untuk pindah ke Supabase.
3. Kode undangan hidup di `localStorage` perangkat; validasinya murni & teruji, tapi otorisasi lintas perangkat butuh endpoint server.
4. PIN = kunci **perangkat**, bukan akun: hash PBKDF2 di localStorage (bukan Secure Enclave/Keychain); 6 angka = 10⁶ kemungkinan, jadi brute-force offline tetap mungkin (210k iterasi memperlambat, UI mengunci jalur online).
5. Biometrik = WebAuthn platform credential; OS memverifikasi user, tapi **tanda tangan assertion tidak diverifikasi server** (butuh backend) → diposisikan sebagai pembuka layar, bukan otorisasi data.
6. **VAPID: private key hanya dari `process.env.VAPID_PRIVATE_KEY`** (tanpa `NEXT_PUBLIC_`) — terverifikasi. Pasangan kunci di `.env.local` repo ini **kunci demo, wajib dirotasi** sebelum produksi + pindah ke secret manager. `INTERNAL_PUSH_TOKEN` belum di-set → jalur broadcast internal fail-closed.
7. Lapisan klien (keypad PIN, sensor, modal kode, auto-mask) **belum diuji otomatis** — tidak ada browser/E2E di repo ini; yang teruji adalah seluruh kebijakannya (murni) + render server tiap halaman (`/`, `/joint`, `/join/*`, `/settings/security` → 200).

### Keputusan desain

- **401 + `404` (bukan 403) untuk baris milik orang lain** — 403 membocorkan keberadaan data user lain.
- **Tombol "Lanjut masuk (demo)" kini benar-benar membuat sesi** (`POST /api/session`) dan panel Keluar benar-benar mengakhirinya — sebelumnya dua-duanya cuma toast karena tidak ada sesi apa pun. 401 pada push juga ditampilkan jujur di Pengaturan → Notifikasi.
- **Biometrik tidak dicabut, tapi ditolak jalan pintas**: tidak ada lagi toggle palsu — saat PIN belum dibuat barisnya jadi keterangan, saat sensor tak ada barisnya disembunyikan (klaim di `lib/legal/terms.ts` jadi benar).
- **Gerbang kunci melewati route publik** dan "Lupa PIN" mendahulukan navigasi ke `/login` sebelum melepas gerbang, supaya dashboard tidak berkedip.
- **Seed demo /join tetap bisa diperiksa, tapi single-use tetap jujur**: seed yang dipakai dipromosikan jadi record tersimpan (bertahan setelah reload).
- **Satu daftar route publik** untuk dua gerbang; `SUBSCRIPTION_PUBLIC_ROUTES` dipertahankan sebagai re-export agar pemanggil lama tak berubah.

### File

**Baru:** `lib/session.ts`, `lib/session-client.ts`, `lib/public-routes.ts`, `lib/invite-store.ts`, `lib/app-lock-store.ts`, `lib/biometric-unlock.ts`, `lib/data/app-lock.ts`, `app/api/session/route.ts`, `app/api/wallets/store.ts`, `components/catetind/app-lock-provider.tsx`, `components/catetind/app-lock-screen.tsx` + 6 file test.
**Diubah:** `app/api/wallets/route.ts`, `app/api/wallets/[id]/route.ts`, `app/api/push/{store,subscribe,send}`, `app/layout.tsx`, `app/join/[code]/page.tsx`, `lib/data/joint.ts` (buang `INVITE_CODE`/`INVITE_LINK`/`buildInviteShareText`), `lib/data/joint-invite.ts`, `lib/data/auth.ts`, `lib/use-push-notifications.ts`, `vitest.config.mts` (alias `@` untuk test route), `components/catetind/{joint-invite-flow,joint-screen,join-invite-screen,settings-panel-account,settings-panel-privacy,notification-settings,privacy-provider,subscription-gate-provider,verify-email-screen}.tsx`. `lib/data/joint-ledger.ts` dan angka demo tidak disentuh.


40. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/40-stage4a-satu-ledger-kas.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
Kalau ada ambiguitas: ambil keputusan paling konservatif, tulis asumsimu di laporan, lanjutkan — JANGAN berhenti untuk minta izin. Bukti yang wajib kau tunjukkan: (a) daftar file yang dibuat/diubah, (b) angka saldo/Net Worth sebelum & sesudah, (c) output 3 perintah validasi.
HASIL:
Semua validasi hijau. Berikut laporan akhirnya.

---

# Laporan Paket 40 — Stage 4A · Satu Ledger Kas

## 0. Ringkas

Saldo dompet sekarang **diturunkan** (`opening + Σ baris ledger`), bukan angka yang bisa disalin-tempel. Satu store (`lib/money/store.ts`) jadi satu-satunya sumber saldo untuk Home, `/wallet`, `/wallet/[id]`, Kekayaan, dan `app/api/wallets`. Koreksi saldo benar-benar menulis catatan, hapus benar-benar menghapus (lintas halaman), dan `INITIAL_WALLETS` hilang dari kode.

## (a) File yang dibuat / diubah

**Dibuat (5):**
| File | Isi |
|---|---|
| `lib/money/ledger.ts` | `LedgerRow` (`expense\|income\|transfer\|settlement\|balance_adjustment`), `walletDelta`, `netEffect`, `balanceOf`, `assertLedgerInvariant` |
| `lib/money/ledger.test.ts` | 15 test: `balanceOf` (termasuk transfer 2 sisi, settlement, adjustment bertanda, transfer satu sisi, baris tanpa dompet) + seluruh penolakan invariant |
| `lib/money/store.ts` | State dompet + baris ledger + tombstone, API tulis (`postExpense`, `postIncome`, `postTransfer`, `postBalanceAdjustment`, `postTransaction`, `addWalletAccount`, `addPoolWallet`, `removeRow`, `restoreRow`), `subscribeMoneyStore`/`useMoneyStore()` (`useSyncExternalStore` + `getServerSnapshot`), selector (`walletBalance`, `walletAccounts`, `homeWallets`, `cashTotal`, `recordedTransactions`, `transferLogOf`, `isRowRemoved`) |
| `lib/money/store.test.ts` | 23 test: saldo seed, write→saldo, transfer, koreksi saldo (2 arah), hapus bertahan, Undo, jalur input, merge hidrasi, **"satu angka di empat titik"** |
| `lib/money/idb.ts` | Persist IndexedDB tulisan tangan (~95 baris) + fallback memory saat `indexedDB` tidak ada/diblokir/gagal tulis; tidak pernah melempar |

**Diubah (25):** `lib/wallets.ts` (dua daftar → satu `WALLET_SEED` + `toWalletAccount`/`toHomeWallet`/`filterWalletsByContext`; `walletAccountsTotal` wajib argumen) · `lib/transaction-bus.ts` (jadi adapter tipis ke store; `readRecordedTransactions`/`subscribeRecordedTransactions` dihapus) · `lib/data/history.ts` (`defaultWalletFor` pindah ke store) · `lib/data/wallet-detail.ts` (`WALLET_SYNC_ADJUSTMENT_COPY`, mock per `wallet.id` string, copy not-found) · `lib/data/add-wallet.ts` (`WALLET_NEW_CARD_COPY`/`nextTransferId`/`buildTransferRecord` dihapus) · `lib/data/home-money.ts` (komentar + id `session-*` selaras tombstone) · `lib/data/wealth.ts` (`totalAssetValue(list, liquidCash)`, `liquidCashTotal` dihapus) · `lib/data/help.ts` · `app/api/wallets/store.ts` · `app/api/wallets/route.test.ts` · `app/wallet/[id]/page.tsx` (route tipis, id diteruskan ke screen) · `components/catetind/{home-screen,wallet-card-stack,wallet-screen,wallet-detail-screen,recent-transactions-card,history-screen,cash-flow-card,wealth-screen,wealth-net-worth-bar,add-wallet-sheet,transfer-sheet}.tsx` · `components/dashboard/{transaction-bottom-sheet,transaction-web-modal}.tsx` · `hooks/use-transaction-submit.ts`.

## (b) Angka saldo — sebelum & sesudah

| Titik | Sebelum | Sesudah |
|---|---|---|
| Home "Total Saldo" (deck + panel) | **Rp 4.309.573** (`INITIAL_WALLETS`) | **Rp 1.850.000** |
| `/wallet` hero TOTAL SALDO | Rp 1.850.000 | **Rp 1.850.000** (angka kanon yang sama) |
| `/wallet/[id]` BCA / GoPay / Tunai | 1.450.000 / 350.000 / 50.000 (dari konstanta server) | **1.450.000 / 350.000 / 50.000**, dari store (ikut berubah kalau ada catatan/koreksi) |
| Kekayaan — kas likuid | Rp 1.850.000 | **Rp 1.850.000** |
| Kekayaan — aset (kas + investasi 16.149.330) | Rp 17.999.330 | **Rp 17.999.330** (tak berubah) |

Jadi: **satu-satunya angka yang bergerak adalah Home (4.309.573 → 1.850.000)**; angka Kekayaan tidak berubah karena halaman itu memang sudah memakai daftar Rp 1.850.000 — yang hilang adalah *kembarannya*.

**Bukti HTML produksi** (server `next start`, jumlah kemunculan string):
```
/            | 1.850.000=3 | 4.309.573=0 | 1.450.000=1 | 350.000=3 | 2.500.000=0 | 1.309.573=0
/wallet      | 1.850.000=2 | 4.309.573=0 | 1.450.000=1 | 350.000=1 | 2.500.000=0 | 1.309.573=0
/wallet/bca  | 1.850.000=0 | 4.309.573=0 | 1.450.000=2 | 350.000=0
/wallet/gopay| 1.850.000=0 | 4.309.573=0 | 1.450.000=0 | 350.000=1
/wealth      | 1.850.000=1 | 4.309.573=0 | 2.500.000=0 | 1.309.573=0
```
Angka lama (4.309.573 / 2.500.000 / 1.309.573) nol kemunculan; `NaN` nol. Angka sebelum diambil dari `git show HEAD:lib/wallets.ts` (`balance: 1_450_000/350_000/50_000` dan `2500000/1309573/500000`).

## (c) Hasil 3 perintah validasi (apa adanya)

```
=== pnpm test ===
 ✓ lib/data/joint-ledger.test.ts (11)   ✓ lib/money/ledger.test.ts (15)
 ✓ lib/data/joint.test.ts (12)          ✓ lib/ai-quota.test.ts (3)
 ✓ lib/data/app-lock.test.ts (9)        ✓ lib/data/joint-invite.test.ts (18)
 ✓ lib/data/joint-settlement.test.ts (22) ✓ lib/invite-store.test.ts (7)
 ✓ lib/money/store.test.ts (23)         ✓ lib/session.test.ts (8)
 ✓ app/api/wallets/route.test.ts (11)   ✓ app/api/push/push.test.ts (9)
 Test Files  12 passed (12)
      Tests  148 passed (148)      ← 110 test lama tetap hijau + 38 test baru

=== pnpm exec tsc --noEmit ===
(tanpa output)  exit=0

=== pnpm build ===
✓ Compiled successfully · Finished TypeScript · 34/34 halaman
Route: / /wallet /wallet/[id] /wealth /history /api/wallets … exit=0

=== pnpm theme:audit === (bonus)
✔ palet bersih — 268 file diperiksa
```

## Cara invariant dijaga
1. **Rumus, bukan angka tersimpan.** `balanceOf(rows, walletId, opening)` satu-satunya jalan saldo lahir; tidak ada setter saldo.
2. **Dua lapis di `assertLedgerInvariant`** — bentuk baris (id unik, uang integer, nominal > 0 untuk baris berarah, transfer/settlement wajib punya lawan ≠ dirinya, net 0) + kesamaan total (Σ baris = Σ saldo − Σ opening, dan saldo per dompet = opening + Σ barisnya).
3. **Dijalankan di runtime, sebelum state dipasang** (`commit()` → `assertSnapshot(next)` → baru `live = next`): baris rusak tidak pernah sempat dibaca halaman, dan state yang sudah benar tidak ikut rusak. Ditambah validasi input di tiap `post*` (return `null`, tidak menulis apa pun).
4. **Test** menutup 7 skenario penolakan (id ganda, uang pecahan, nominal ≤ 0, koreksi tanpa selisih, transfer ke diri sendiri, expense bernyawa lawan, total melenceng walau per-dompet sama).

## Hapus bertahan — bukti
- `removeRow` menulis **tombstone** (`removedIds`) di store, bukan `setState` halaman; `restoreRow` mencabutnya (Undo tetap hidup karena barisnya tidak dibuang).
- Kunci tombstone diseragamkan (`tombstoneKey`): Home memanggil `session-9001`, Riwayat & `/wallet/[id]` memanggil `9001` → keduanya jadi `session-9001`. Tanpa ini hapus di Home tak akan terlihat di Riwayat (ada test khusus untuk itu).
- Home (`recent-transactions-card`), `/history`, `/wallet/[id]`, dan kartu Arus Uang kini **berlangganan store** (`useMoneyStore`) dan menyaring dengan tombstone yang sama; tidak ada lagi `removedIds`/`groups`/`recordedTxs` per halaman.
- Bukti otomatis: `lib/money/store.test.ts` → *"baris sesi yang dihapus hilang dari daftar dan tetap hilang saat dibaca ulang"*, *"satu baris sesi dikenali sama dari Home vs Riwayat"*, *"tombstone juga berlaku untuk baris mock"*, *"Undo mengembalikan baris tanpa membuat tulisan kedua"*.

## Keputusan & asumsi (ambiguitas → pilihan paling konservatif)
1. **Angka kanon = Rp 1.850.000** (BCA 1.450.000 + GoPay 350.000 + Tunai 50.000). Alasan: daftar inilah yang sudah dipakai Kekayaan/Net Worth dan /wallet, sementara 4.309.573 hanya dipakai Home + API.
2. **Koreksi saldo = SATU baris `balance_adjustment`** bernama "Pengeluaran/Pemasukan Tak Tercatat" (kategori `Koreksi Saldo`). Copy modal **tidak diubah** dan sekarang benar apa adanya. Menulis dua baris (koreksi + pengeluaran) akan memotong saldo dua kali dan merusak invariant — jadi pilihan itu ditolak, alasannya ditulis di komentar.
3. **Setoran tabungan (`saving`)** diwakili transfer **satu sisi** (uang keluar kas ke celengan yang belum jadi dompet di ledger); invariant "Σ transfer bersih 0" ditegakkan untuk transfer yang menyebut `counterWalletId`. Ini batas yang disebut eksplisit di komentar, bukan kelalaian.
4. **Dompet tak dikenal (mis. `OVO` sebelum dompetnya ditambah)** → baris tetap tercatat apa adanya dengan `walletId: ''`: tampil di Riwayat, **tidak** menggerakkan saldo dompet mana pun. Menebak dompet terdekat akan memindahkan uang ke dompet yang salah.
5. **Baris mock lama tidak dipindah jadi baris ledger** — `opening` = saldo yang selama ini tertera. Hanya catatan sesi yang menggerakkan saldo (disebut di header `lib/money/ledger.ts`).
6. **Kartu dompet buatan user kini punya `/wallet/[id]`** (karena store mengetahuinya) → badge "Baru" & pengecualian tautan dihapus, plus `WALLET_NEW_CARD_COPY`/`buildTransferRecord`/`nextTransferId` dibuang agar tidak ada jalur kedua.
7. **Judul tab `/wallet/[id]` jadi generik** (`Dompet bca — CatetInd`) karena nama dompet hidup di store client, bukan di server. Id tak dikenal → panel penjelas di dalam screen (bukan `notFound()`), supaya dompet buatan user yang baru muncul setelah IndexedDB dibaca tidak salah dinyatakan tidak ada.
8. **Persist IndexedDB** (`lib/money/idb.ts`) murni untuk bertahan-refresh di perangkat ini; **bukan** sinkronisasi server (dinyatakan di komentar & laporan).

## Batas yang belum bisa diverifikasi
- **Klik nyata di browser** (swipe-hapus lintas halaman, koreksi saldo lalu pindah tab) tidak bisa dijalankan di lingkungan ini (tanpa Playwright/DOM). Buktinya: 148 test hijau + struktur "satu snapshot untuk semua halaman" + HTML produksi di atas. Hidrasi IndexedDB juga hanya diuji sebagai fungsi murni (`mergeMoneySnapshot`), bukan lewat browser.
- **Mode privat / IndexedDB diblokir**: kode fallback ke memory dan tidak melempar (diuji secara struktural, bukan dengan mematikan IDB di browser).
- Angka `/wealth` di HTML server selalu `1.850.000` (angka pembuka); perubahan setelah koreksi saldo muncul **client-side** setelah store hidup — konsekuensi jujur dari demo tanpa backend.


41. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/41-stage4b-utang-piutang-net-worth.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
Kalau ada ambiguitas: ambil keputusan paling konservatif, tulis asumsimu di laporan, lanjutkan — JANGAN berhenti untuk minta izin. Bukti yang wajib kau tunjukkan: (a) daftar file yang dibuat/diubah, (b) angka saldo/Net Worth sebelum & sesudah, (c) output 3 perintah validasi.
HASIL:
Semua sudah selesai dan tervalidasi. Berikut laporannya.

## (a) File yang dibuat / diubah

**Dibuat (2)**
| File | Isi |
|---|---|
| `lib/data/wealth-cash.ts` | Modul murni perencana kas utang/piutang: `planDebtSettlement()` (owedAmount vs paidAmount → baris kas + kembalian + sisa/status), `applySettlement()`, `changeDebtFrom()`, `settlementNetWorthEffect()`, `cashDirectionOf()`, `defaultCashAmount()`, `settlementNote()`, `DEBT_CASH_CATEGORY`, `DEBT_CASH_COPY` (semua copy sheet/floating string) |
| `lib/data/wealth-cash.test.ts` | 22 test murni (pelunasan penuh/sebagian/lebih, piutang, kembalian, efek Net Worth = 0, penolakan input tak sah) |

**Diubah (12)**
| File | Perubahan |
|---|---|
| `lib/money/ledger.ts` | Jenis baris baru `debt_payment` \| `receivable_payment` \| `change`; `walletDelta` + `isSignedRow` + penjaga invariant untuk baris bertanda |
| `lib/money/store.ts` | `postDebtSettlement()` (satu pintu debit/kredit kas, tolak kalau saldo kurang/dompet tak ada), selector `walletOptionsFor()` + `walletNameOfId()`, `displayTypeOf` memetakan jenis baru |
| `lib/data/wealth.ts` | `DebtPayment` + `walletId`/`kind`/`cashMoved`/`changeAmount`; seed pembayaran mock ikut walletId nyata; `netWorthParts()` (definisi tunggal Net Worth ber-piutang); hapus `WALLET_SOURCE_OPTIONS`/`walletSourceLabel` (daftar mock berisi dompet hantu) |
| `lib/money/ledger.test.ts`, `lib/money/store.test.ts` | +5 & +11 test (baris baru, debit BCA, kredit kas, kembalian, penolakan, invariant Σ baris = Σ saldo − Σ opening) |
| `lib/data/joint-ledger.ts` | `PRIVATE_EXPENSE_POLICY` (+tipe & alasan), `ledgerTotals(..., {privatePolicy})`, `hiddenPrivateBurden()`, `isHiddenFrom()`, `LedgerTx.privateForUser` |
| `lib/data/joint.ts` | `countsForSettlement`/`weighedPaidBy`/`ledgerTotalsOf`/`computeSettlement` sadar-kebijakan; `categoryBreakdown()` menghapus irisan privat milik orang lain; `hiddenPrivateBurdenOf()`, `privateBurdenCopy()` |
| `lib/data/joint-ledger.test.ts`, `lib/data/joint.test.ts` | +5 & +7 test (dua nilai kebijakan, pengungkapan, breakdown tidak bocor) |
| `components/catetind/wealth-net-worth-bar.tsx` | `receivables` masuk sisi Aset + baris kecil `kas + investasi + piutang = aset` |
| `components/catetind/wealth-hutang.tsx` | `PayDebtSheet` → `DebtCashSheet` (dua arah, dompet dari ledger + saldonya, pratinjau kembalian, error inline “saldo kurang”), kartu personal dapat tombol `Catat Bayar`/`Diterima` (bukan `Tandai Lunas` instan), riwayat pembayaran menyebut kembalian |
| `components/catetind/wealth-screen.tsx` | `handlePayDebt` menulis baris kas lebih dulu lalu baru mengubah catatan (gagal = tidak ada yang berubah); catatan kembalian dibuat otomatis; `receivables`/`walletOptions` diteruskan |
| `components/catetind/joint-stats-row.tsx` | Kalimat pengungkapan beban privat di panel rincian bersama |

## (b) Angka saldo & Net Worth sebelum vs sesudah (output nyata dari fungsi produksi)

```
=== SEBELUM PAKET 41 ===
kas 1.850.000 · investasi 16.149.330 · piutang 150.000 (TIDAK dihitung) · hutang 3.450.000
Net Worth lama                    = 14.549.330
setelah "Catat Bayar" Rp 500.000  = 15.049.330   ← naik 500.000 tanpa uang keluar (gap #1)

=== SESUDAH PAKET 41 ===
hero sebelum bayar { cash 1.850.000, investments 16.149.330, receivables 150.000,
                     debts 3.450.000, assets 18.149.330, netWorth 14.699.330 }
BCA sebelum 1.450.000
baris ledger  [ { type: 'debt_payment', amount: 500.000, wallet: 'BCA' } ]
BCA sesudah   950.000
hero sesudah bayar { cash 1.350.000, investments 16.149.330, receivables 150.000,
                     debts 2.950.000, assets 17.649.330, netWorth 14.699.330 }
selisih Net Worth 0                       ← kriteria 1 lulus
piutang sebagian Rp 50.000 (dari catatan Rina Rp 150.000): kas 1.400.000, piutang aktif 100.000, NW 14.699.330
piutang Rina lunas (sisa Rp 100.000):                      kas 1.500.000, piutang aktif 0,       NW 14.699.330
kembalian: baris [ { receivable_payment 50.000 }, { change +50.000 } ] + catatan { direction: 'owed_by_me', amount: 50.000, counterparty: 'Rina' }
joint: rincian dari sudut Jon tidak lagi memuat irisan 🔒; pengungkapan { amount: 75.000, count: 1 }
       → "Kamu menanggung Rp 75.000 dari 1 catatan yang tidak bisa kamu lihat."
```

## (c) Output tiga perintah validasi (dijalankan berurutan, apa adanya)

```
--- pnpm test ---
Test Files  13 passed (13)
     Tests  198 passed (198)          (baseline sebelum paket ini: 148 test / 12 file)

--- pnpm exec tsc --noEmit ---
( tanpa output )  ·  tsc exit: 0

--- pnpm build ---
✓ Compiled successfully in 907ms
✓ Generating static pages using 19 workers (34/34) in 1046ms
Route (app) … seluruh route lama tetap ada (/wealth, /wallet, /joint, /api/wallets, dst.)
build exit: 0

--- pnpm theme:audit (checklist §8) ---
✓ palet bersih — 270 file diperiksa, tidak ada warna di luar palet.
```
`lib/money/store.test.ts` lama tetap 23 test hijau (file itu sekarang 34 test = 23 lama + 11 baru). Catatan jujur: pernah muncul sekali error `TS2307 .next/types/routes.js` karena saya menjalankan `tsc` paralel dengan `build` yang sedang menulis `.next/`; dijalankan berurutan hasilnya bersih (0 error).

## Keputusan desain (dan alasannya)

1. **Skema baris ledger baru**: `debt_payment` (selalu keluar, >0), `receivable_payment` (selalu masuk, >0), `change` (**bertanda**: `+` kas masuk, `−` kas keluar). `change` satu-satunya jenis bertanda selain `balance_adjustment` → `isSignedRow()` dipakai penjaga invariant.
2. **Semantik kembalian yang dipilih**: *baris kas selalu mengikuti uang yang benar-benar berpindah tangan*; lawannya dibuat sebagai **catatan baru** (`owed_by_me` kalau kita menerima kelebihan → harus dikembalikan; `owed_to_me` kalau kita menyerahkan kelebihan → harus ditagih). Alasan: tanpa catatan lawan, kelebihan bayar membuat Net Worth melompat tanpa dasar. Dibuktikan test `settlementNetWorthEffect(...) === 0` untuk 6 bentuk pelunasan (penuh, sebagian, lebih — dua arah).
3. **“Tandai Lunas” pada hutang personal diganti tombol `Catat Bayar`/`Diterima`** yang membuka sheet: kalau dibiarkan instan, lubang yang sama (status lunas tanpa uang keluar) tetap terbuka untuk hutang personal.
4. **`INITIAL_DEBT_PAYMENTS` baris ke-3 diubah `OVO` → `Tunai`** (nominal tetap Rp 230.000) karena OVO tidak ada di ledger; daftar dompet sheet kini datang dari `walletOptionsFor(snapshot)`. Tidak ada angka test joint yang disentuh.
5. **Kategori baris**: `debt_payment` → `Tagihan`, `receivable_payment`/`change` → `Lainnya` — keduanya label kanon `TRANSACTION_CATEGORY_OPTIONS` supaya terjaring filter Riwayat.
6. **`PRIVATE_EXPENSE_POLICY` final = `'shared'`** (default, satu konstanta di `joint-ledger.ts`): nominal privat tetap ikut kewajiban + **pengungkapan** “Kamu menanggung Rp 75.000 dari 1 catatan yang tidak bisa kamu lihat”, dan irisan nominal privat milik orang lain **dihapus** dari breakdown bersama. Nilai `'excluded'` juga diuji penuh (kewajiban Jon 1.160.000 → 1.085.000, arah transfer berbalik, Σ net tetap 0, pengungkapan 0).
7. **Interpretasi AC “bar Aset ikut naik”**: karena piutang sekarang dihitung sebagai aset, pelunasan piutang memindahkan nilai (piutang → kas) sehingga total Aset & Net Worth tidak berubah; yang naik adalah kas (+Rp 50.000). Kenaikan Aset terjadi sekali saat piutang mulai dihitung: 14.549.330 → 14.699.330. Ini saya pilih (bukan menaikkan aset dua kali, yang akan melebih-lebihkan Net Worth).
8. **Nominal transaksi privat di timeline tidak diubah**: sesuai PRD/spec 5B nominal privat memang bagian beban bersama; yang ditutup adalah kebocoran di kartu rincian (diminta prompt) + tagihan diam-diam lewat pengungkapan.

## Yang belum bisa saya verifikasi (jujur)

- **Tampilan 375 px & 1440 px** dan **tanpa hydration mismatch** tidak bisa saya buktikan tanpa browser: yang tersedia hanya build/tsc/test. Yang bisa saya jamin secara kode: tidak ada `Date.now()`/angka dinamis saat render (hanya di handler), tidak ada lebar piksel tetap pada elemen baru (pakai flex-wrap + `tabular-nums`), sidebar desktop tetap dari `ScreenShell`, dan animasi lama (`framer-motion`) tidak ditambah.
- Perilaku klik-nyata (buka sheet → pilih dompet → simpan) diverifikasi lewat test unit store + `tsc` + `build`, bukan melalui interaksi browser.

42. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/42-stage5-offline-idempotency-input.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.
HASIL:
Semua validasi hijau. Berikut laporan akhirnya.

## Ringkasan pekerjaan (paket 42 · Stage 5)

### 1. Anti double-tap & idempotensi
- **Baru:** `lib/client-tx.ts` (kunci `clientTxId`, dengan jaring aman non-secure context).
- **`transaction-input-engine.tsx`:** kunci `ref` sinkron (`submitLock`) + state `submitting` + label "Menyimpan…"; kunci dipasang **sebelum** `onSubmitted`; `clientTxId` dibuat sekali per pembukaan panel dan ikut di `TransactionDraft`.
- **`lib/money/store.ts`:** `appendRow()` menolak `clientTxId` kembar — yang dikembalikan adalah **baris pertama** (semantik idempotency key), jadi saldo tidak bergerak dua kali. **`lib/money/ledger.ts`:** invariant baru `kunci idempotensi dipakai dua kali` supaya jalur mana pun (termasuk state hasil hidrasi) tidak bisa meloloskan baris kembar.
- **Bukti (test):** `DUA submit beruntun dengan kunci yang sama = SATU catatan` — 1 baris, saldo −25.000 sekali; kunci berbeda tetap 2 catatan; baris kembar → invariant melempar.

### 2. Input nominal manusiawi
- **Baru:** `lib/money/amount-input.ts` — `parseAmountInput()` murni: `2,5jt` → **2.500.000** (dulu **Rp 15**), `50rb`/`50k`/`2juta` jalan, ribuan bertitik dibaca bulat, **batas 13 digit** (`Rp 9.999.999.999.999`) dengan `problem: 'tooBig'` (bukan `slice(0,9)` senyap), dan `problem: 'fraction'` untuk `"1,5"` tanpa satuan ("kalau maksudnya 1,5 juta, tulis 1,5jt").
- Engine: chip konfirmasi `Rp 2.500.000?` + hint "Nilai ini yang bakal disimpan.", pesan masalah di `role="alert"`, `aria-invalid`, petunjuk singkatan saat field masih kosong. Copy di `lib/data/history.ts` (`TRANSACTION_INPUT_COPY`) — nol string baru di JSX.
- **Bukti:** 15 test `lib/money/amount-input.test.ts`.

### 3. Offline-first
- **`public/sw.js`:** handler `fetch` + `CACHE_VERSION` (cache lama dihapus di `activate`); `/api/**` **network-only**; dokumen **network-first → cache → shell `/`**; aset ber-hash (`/_next/static`, `/icons`, `/fonts`) **stale-while-revalidate**. Keputusan yang saya ambil & alasannya tertulis di komentar: navigasi sengaja network-first (bukan SWR) supaya dokumen & payload RSC selalu dari build yang sama — SWR di HTML berisiko hydration mismatch.
- **Baru:** `lib/connection.ts` (satu sumber status online, ada `setOnlineOverride` supaya jalur offline bisa **diuji**), `lib/data/offline.ts` (copy), `components/catetind/offline-banner.tsx` (dipasang di `app/layout.tsx`): "Offline — catatanmu aman di perangkat", indikator **"N belum tersinkron"**, tombol "Proses sekarang" (benar-benar `flushPendingSync()`), dan kalimat batas jujur yang selalu tampil.
- **Antrean:** state `syncedIds` di snapshot uang — baris yang lahir offline tidak masuk daftar "tersinkron", jadi `pendingSyncCount()` membaca **sumber yang sama** dengan daftar transaksi (tidak ada penghitung kedua). Toast saat submit offline diganti "Tersimpan di perangkat 📴" alih-alih pujian sukses.
- **Perilaku (batas jujur):** yang **tetap jalan** = app terbuka, catat, saldo, riwayat (semua lokal/IndexedDB); yang **tidak jalan** = tidak ada apa pun yang dikirim ke server — "tersinkron" = sudah tersimpan di perangkat. Test: offline → 2 masuk antrean → `flushPendingSync()` = 2 → 0, catatan tetap 2 (proses ulang tidak menggandakan).

### 4. Metering AI nyata
- **Baru:** `lib/ai-usage-store.ts` (satu usage-store; `recordAiUsage`, `purchaseAiAddon`, langganan) + `hooks/use-ai-quota.ts` (`useSyncExternalStore`, seed sama di server & client).
- **`lib/ai-quota.ts`:** `AI_USAGE_CALLS` statis **dihapus** → `AI_SEED_USAGE_CALLS` + derivasi murni `aiUsageRows()`/`aiQuotaSnapshot()`; `AI_QUOTA_RESET_DAYS` tetap turunan satu tanggal kanon. Pemakaian di atas kuota dasar jadi `addon.overflowTokens` (menggerus tangki add-on, mengikuti urutan PRD 4859–4876).
- Titik catat: `categorize` (setiap catatan baru — replay idempotent **tidak** dihitung dua kali), `chat` (per pesan), `ocr` (per scan), `voice` (hanya transkrip yang jadi draft).
- Gauge yang membaca angka hidup: `ai-fuel-card`, `billing-panel`, `home-banner`, `ai-chat-widget` (+ toast/label exhausted). **Angka sebelum → sesudah 3 panggilan chat (dari test yang saya jalankan):** terpakai **464.020 → 467.020**, sisa **137.480 → 134.480**, **23% → 22% sisa**, chat **156/200 → 159/200**; voice sisa 38 panggilan.
- **State habis:** `exhausted` = kuota dasar **dan** add-on habis → voice & OCR mati (di engine & widget) dengan penjelasan `AI_QUOTA_EXHAUSTED_COPY` (voiceOff/ocrOff/body/badge), sedangkan **Catat manual tetap penuh**; banner Home berganti kalimat; kartu Billing & sidebar menyebut jalan keluar (reset/top up). 10 test `lib/ai-usage-store.test.ts`.

### 5. Env-gate saklar demo
- **Baru:** `lib/demo.ts` (`DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === '1'`) — **satu-satunya** file yang membaca env itu.
- Di-gate: `DEMO_PARTNER_JOINED`, `DEMO_FORCE_WEEKLY_RECAP`, `DEMO_FORCE_MONTHLY_RECAP`, `DEMO_REALTIME_MOCK` (joint.ts), `DEMO_FORCE_SHOW` (weekly-recap-banner, daily-nudge), `DEMO.sinkingFundPending` (home-banner), `DEMO_SHOW_UPGRADE_DIFF` (annual-plan-modal), `DEMO_DAY_OVERRIDE` (monthly-review).
- **Bukti:** (a) `lib/demo.test.ts` dijalankan dua mode — **tanpa env: semua false**, dengan `NEXT_PUBLIC_DEMO=1`: **semua true**; (b) grep: hanya `lib/demo.ts` membaca env; (c) build produksi **tanpa** env → saklar dibaca dari env shim (undefined → `false`); build dengan `NEXT_PUBLIC_DEMO=1` → string `NEXT_PUBLIC_DEMO` **hilang** dari bundel klien karena nilainya ter-inline `true` → membuktikan gate-nya hidup dan build produksi default mati. `.env.local` tidak berisi variabel ini.

## Hasil validasi (apa adanya)

```
pnpm test               → Test Files 16 passed (16) · Tests 231 passed (231)
pnpm exec tsc --noEmit  → exit 0 (tanpa error)
pnpm build              → ✓ Compiled successfully in 3.4s · exit 0
pnpm theme:audit        → ✓ palet bersih — 279 file diperiksa
```

## File
- **Baru:** `lib/demo.ts`(+test), `lib/client-tx.ts`, `lib/connection.ts`, `lib/money/amount-input.ts`(+test), `lib/ai-usage-store.ts`(+test), `hooks/use-ai-quota.ts`, `lib/data/offline.ts`, `components/catetind/offline-banner.tsx`.
- **Dihapus:** `lib/ai-quota-bus.ts`, `hooks/use-ai-addon.ts` (digantikan satu usage-store; sudah tidak ada pemakainya).
- **Diubah:** `transaction-input-engine.tsx`, `lib/money/store.ts`, `lib/money/ledger.ts`, `lib/money/store.test.ts`, `lib/transaction-bus.ts`, `lib/ai-quota.ts`, `lib/data/history.ts`, `lib/data/joint.ts`, `lib/data/monthly-review.ts`, `public/sw.js`, `app/layout.tsx`, `hooks/{use-ai-chat,use-transaction-capture,use-transaction-submit}.ts`, `components/catetind/{ai-fuel-card,billing-panel,ai-chat-widget,home-banner,top-up-modal,weekly-recap-banner,daily-nudge,annual-plan-modal}.tsx`, `lib/ai-chat.ts`, `docs/handoff/FIXPLAN-AUDIT.md` (Stage 5 → ✅).

## Yang belum bisa saya verifikasi (jujur)
- **Uji offline di browser sungguhan** (SW melayani shell saat tanpa jaringan, PWA installed) tidak bisa dijalankan di lingkungan ini tanpa browser/HTTPS — yang terbukti: kode SW ada & build hijau, plus antrean/banner diuji lewat test store. Perlu dicek manual: buka app → DevTools Offline → reload → catat → Online.
- Pemakaian AI hidup di **memory sesi** (refresh = kembali ke titik berangkat demo) dan tidak ada request ke model AI mana pun — dinyatakan di komentar kode & laporan ini.
- Tidak menambah dependency apa pun (parsing & service worker ditulis tangan), dan angka uang/joint yang sudah dikunci tidak diubah.


43. Baca docs/handoff/CONTEXT-WAJIB.md lalu kerjakan docs/handoff/prompts/43-stage6-kepatuhan-export-ops.md sampai tuntas — implementasi penuh, bukan rencana. Jalankan validasi di bagian akhir prompt itu (pnpm test, pnpm exec tsc --noEmit, pnpm build) dan laporkan hasilnya apa adanya.

Semua selesai dan tervalidasi. Berikut ringkasannya.

## Yang dikerjakan (paket 43 · Stage 6)

**1. Export JSON nyata** (`lib/money/export.ts`) — `/settings/data` sekarang benar-benar mengunduh file via `Blob` + `URL.createObjectURL`. Isinya: `schema`, `schemaVersion`, `exportedAt`, `counts` (jumlah baris per bagian untuk audit), dompet + saldo hasil hitung dari ledger, **seluruh** baris ledger (termasuk yang sudah dihapus → `removed: true`), hutang/piutang + riwayat bayar, investasi, celengan, target bulanan, pengaturan privasi, dan `limits` (batas jujur di dalam file). Jalur email tetap ada tapi berlabel **Demo** dengan toast yang mengaku belum ada server pengirim.
Bukti: `docs/handoff/laporan/bukti/43-export-contoh.json` (7.168 byte) + 10 baris pertama ditempel di laporan.

**2. Hapus akun + retensi** (`lib/account.ts`, `lib/data/account.ts`) — dua lapis (ketik `HAPUS AKUN` → konfirmasi terakhir), tombol "Unduh dulu" di dalam dialog, lalu: buang semua penanda `catet*` (localStorage + sessionStorage), hapus **database** IndexedDB, kosongkan store uang + penanda `purged`, reset store undangan/pemakaian AI, `DELETE /api/session`, kembali ke `/login` (navigasi penuh). Kebijakan retensi ditulis di UI.
Bukti: isi penyimpanan setelah hapus = `{ wallets: [], rows: [], removedIds: [], syncedIds: [], purged: true }`; test regresi membuktikan dompet contoh tidak "lahir lagi" (dan test itu menemukan satu celah nyata di versi pertama saya, yang lalu diperbaiki).

**3. Error boundary** — `app/error.tsx` + `/wallet`, `/wealth`, `/history`, `/joint`, satu komponen bersama; sidebar tetap hidup, tombol "Muat ulang" + "Unduh Data Saya (JSON)" yang memakai jalur ekspor yang sama.

**4. Enam event analitik tanpa nominal** — ditembak dari store uang (7 titik tulis), store kuota AI, dan aksi joint; `sanitizeEventPayload()` membuang kunci uang/catatan **dan** nilai string panjang, dan katalognya diuji agar event baru berbahaya gagal di test (kunci `ai_named` saya sendiri tertangkap → diganti `ai_generated`).

**5. Smoke test alur uang** — 4 skenario wajib, semuanya **LULUS**, dijalankan di lapis yang memutuskan angka (`lib/money/*` + `lib/data/joint-ledger.ts`). Playwright **tidak** dipasang (dependency baru butuh izin) → diganti penguatan test unit + checklist manual browser 10 langkah di laporan.

## Hasil validasi (apa adanya)
- `pnpm test` → **20 file, 266 test passed** (sebelumnya 231; test lama tidak ada yang diubah/dihapus)
- `pnpm exec tsc --noEmit` → **exit 0, tanpa error**
- `pnpm build` → **✓ Compiled successfully**, 34/34 halaman digenerate
- `pnpm theme:audit` (wajib per CONTEXT §8) → **palet bersih, 296 file**

## Yang belum bisa diverifikasi di sini (ditulis di laporan, bukan disembunyikan)
Verifikasi visual di browser: unduhan nyata di folder Downloads, refresh → Home kosong + IndexedDB bersih di DevTools, dan penyuntikan error di satu segmen. Langkahnya ada di §6.1 laporan. Batas terbuka lain juga dicatat (tanpa backend, ekspor belum di-stream/di-sign, dan temuan lama: hapus catatan tidak mengembalikan saldo karena tombstone hanya menyembunyikan baris — perubahan rumus uang, jadi sengaja tidak saya sentuh).

Laporan lengkap: `docs/handoff/laporan/43-stage6-kepatuhan-export-ops-laporan.md`.