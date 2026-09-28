# 39 — Stage 3 · Sesi, Otorisasi API, Push per-User, PIN Gate

**Paket:** audit fintech lanjutan · **Depends on:** #38 (UI sudah jujur) · **Keputusan default:** **tanpa backend** (in-memory + satu adapter), Supabase ditunda

> Baca `docs/handoff/CONTEXT-WAJIB.md` + `FIXPLAN-AUDIT.md` Stage 3. Baca juga `lib/data/auth.ts` (alur magic link yang sudah ada) sebelum menulis apa pun.

## Bukti gap

| # | Lokasi | Temuan |
|---|---|---|
| 1 | `app/api/**` (grep `cookies\|auth\|session\|Authorization`) | **nol hasil** — semua endpoint terbuka. `PUT`/`DELETE /api/wallets/[id]` memutasi array modul bersama: satu request anonim bisa menghapus dompet untuk semua orang |
| 2 | `app/api/push/send/route.ts:21-56` | menyiarkan notifikasi ke **semua** subscription dengan `title`/`body`/`url` dari body request siapa pun = vektor phishing massal |
| 3 | `app/api/push/store.ts:8-10` | `Map` global tanpa identitas user; hilang saat redeploy; tidak ada unsubscribe per user |
| 4 | `lib/data/joint.ts:613-616` | `INVITE_CODE = 'A7K2M9'` konstanta global yang ikut ter-bundle; copy-nya menjanjikan "berlaku 24 jam, cuma bisa dipakai 1x" sementara `lib/data/joint-invite.ts:19` mengakui validasi itu belum ada |
| 5 | `components/catetind/settings-panel-privacy.tsx:43-99` | PIN = `useState` + toast "App minta PIN tiap dibuka"; **tidak ada** gate yang membacanya (grep `pinEnabled` → hanya file ini), tidak dipersist, tidak ada flow lupa PIN |
| 6 | seluruh repo | nol pemakaian `visibilitychange` → nominal tetap terbuka saat app ditinggal/dibuka |

## Yang harus dibangun

1. **`lib/session.ts`** — satu sumber sesi (mock, pola `lib/data/renewal.ts`: baca setelah mount, tulis penanda). Ekspor `requireUser()` untuk route handler → `401 { error }` bila tidak ada. Semua file di `app/api/**` memakainya; **semua mutasi ter-scope `userId`**.
2. **Store per-user di API** — `Map<userId, T>` (bukan array modul bersama) untuk dompet & push. Tulis di komentar: penggantian ke Supabase = mengganti isi file ini saja.
3. **Push per-user** — `subscribe` menyimpan `{ userId, subscription }`; `send` **hanya** boleh ke subscription milik pemanggil (atau butuh `INTERNAL_PUSH_TOKEN`), plus rate limit sederhana (mis. maks N/menit per user) dan pembersihan 404/410 yang sudah ada tetap jalan.
4. **Kode undangan per wallet** — generate `nanoid`-style 6 karakter (tanpa dependency: pakai `crypto.getRandomValues`), simpan `{ code, walletId, createdAt, expiresAt, usedBy }`; `lib/data/joint-invite.ts` memvalidasi **single-use + kedaluwarsa 24 jam** dari state itu. Hapus `INVITE_CODE` konstanta; copy "berlaku 24 jam, 1x pakai" baru boleh tampil kalau benar-benar divalidasi.
5. **PIN = gate nyata** (`components/catetind/*lock*`): lock screen di root layout yang memblokir render app saat `pinEnabled`; hash PIN (PBKDF2 via `crypto.subtle`) disimpan di IndexedDB/localStorage; auto-lock saat `visibilitychange` → hidden atau idle 60 detik; **flow "Lupa PIN"** = logout + verifikasi email ulang; anti brute-force (5 salah → tunggu 5 menit). Kalau memilih **tidak** membangun gate, maka cabut toggle + klaim copy-nya.
6. **Masking ikut `visibilitychange`** (auto-mask saat app ditinggalkan) — pakai `PrivacyProvider` yang sudah ada.
7. **VAPID**: pastikan private key hanya dari `process.env` server (bukan `NEXT_PUBLIC_*`) dan tulis di laporan bahwa pasangan kunci ini perlu dirotasi sebelum produksi.

## Acceptance criteria

- [ ] `curl` (atau `fetch`) tanpa sesi ke setiap endpoint `app/api/**` → **401**; dengan sesi user A tidak bisa menyentuh data user B (buktikan minimal untuk wallets PUT/DELETE & push send).
- [ ] `POST /api/push/send` menolak pengiriman ke subscription milik user lain.
- [ ] Kode undangan: dua wallet mendapat kode berbeda; kode yang sudah dipakai → status `used`; lewat 24 jam → `expired` (jalankan `resolveInvite` lewat **test unit**).
- [ ] PIN: refresh & kembali ke tab → layar kunci muncul; "Lupa PIN" mengantar ke login (bukan layar buntu); 5 percobaan salah → tunggu.
- [ ] Test unit baru untuk `lib/session.ts` (guard) dan invite resolve; **23 test lama tetap hijau**.
- [ ] `pnpm test` · `pnpm exec tsc --noEmit` · `pnpm build` hijau.

## Dilarang

- Mengklaim ada autentikasi nyata/sesi produksi kalau yang dibangun masih mock — nyatakan batasnya di laporan & komentar.
- Menambah dependency baru (nanoid, bcrypt, next-auth, Supabase client) tanpa izin eksplisit.
- Menyentuh angka patokan demo atau rumus di `lib/data/joint-ledger.ts`.

## Validasi

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Laporan wajib memuat: tabel endpoint → status tanpa sesi (401/200), cara isolasi per-user, hasil test invite (used/expired), perilaku PIN saat refresh & kembali ke tab, dan daftar yang masih mock.
