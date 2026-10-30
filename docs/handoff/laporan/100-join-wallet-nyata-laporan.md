# Laporan paket 100 — Join Wallet akhirnya menulis data

**Halaman:** `/join/[code]` (inventaris #7, KEY FLOW #2) · **Migrasi:** `supabase/migrations/20261030120000_catetind_join_claim.sql`

## 1. Temuan: kenapa "Join Wallet" belum berfungsi sempurna

| # | Bukti di kode (sebelum) | Akibat yang dilihat user |
|---|---|---|
| 1 | `join-invite-screen.tsx` CTA = `<Link href="/login">` tanpa `?next=` | Setelah masuk, user mendarat di `/app`; kode undangan hilang di tengah jalan → tidak pernah join |
| 2 | `handleSimulateJoined()` tidak dipanggil tombol mana pun | RPC `catetind_accept_invite` **tidak pernah** dieksekusi dari UI |
| 3 | `resolveInviteRemote()` hanya dipakai untuk menandai `used`/`expired` | `walletName`/`inviterName`/`expiresAt` dari server dibuang; kode sah dari perangkat lain tampil "Kodenya nggak ketemu" |
| 4 | `createInviteRemote()` tidak pernah dipanggil | Kode undangan tidak pernah masuk tabel `invite_codes` → partner di perangkat lain tidak bisa gabung |
| 5 | `createJointPocket()` hanya menulis store lokal (`wallet.id` = `joint_1`) | RPC pembuatan kode menolak "bukan anggota dompet" karena dompet server-nya belum ada |
| 6 | `handleSimulateJoined()` selalu `setJoined(true)` | Layar "berhasil" padahal tidak ada baris keanggotaan yang ditulis |
| 7 | Pratinjau pengundang memakai URL yang sama dengan tautan undangan | Menekan tombol di pratinjau sendiri akan membakar kode sekali-pakai |

## 2. Yang diubah

| File | Perubahan |
|---|---|
| `lib/data/joint-invite.ts` | `buildJoinClaimHref()`/`isJoinClaimRequest()` (auto-join setelah login), `resolveRemoteInviteView()` (status server → copy `/join`), `inviteExpiryLabelFromTime()`, copy `JOIN_CLAIM_COPY`, catatan `serverSyncedNote`/`offlineNote`, `JOIN_DEMO_COPY` diperbarui |
| `app/join/[code]/page.tsx` | Status undangan dibaca di SERVER (`resolveInviteStatusOnServer`, memoized `cache()`), `?terima=1` diteruskan sebagai prop `autoJoin`; judul metadata memakai nama pengundang asli (tidak lagi `null`) |
| `components/catetind/join-invite-screen.tsx` | Status dari server sebagai sumber awal, deteksi sesi, tombol gabung memanggil RPC nyata, pemisahan hasil `joined`/`member`/`creator`, layar "Menghubungkan…", kegagalan server ditampilkan apa adanya, CTA tanpa sesi membawa kode ke `/login` |
| `components/catetind/joint-invite-flow.tsx` | Modal kode undangan menyinkronkan kode ke server: `ensureJointPocketRemote()` lalu `createInviteRemote()`, plus catatan jujur apakah kode bisa dipakai dari perangkat lain |
| `lib/supabase/invite-remote.ts` | `AcceptInviteResult.outcome`, `readJoinStateRemote()` (dua boolean, tanpa membakar kode) |
| `lib/supabase/invite-server.ts` (baru) | RPC status undangan dari server memakai kunci anon (halaman publik, `security definer`, tanpa data dompet) |
| `lib/supabase/joint-remote.ts` | `ensureJointPocketRemote()` — RPC idempoten "satu pemilik = satu kantong" + baris keanggotaan owner |
| Migrasi `20261030120000_catetind_join_claim.sql` | `catetind_ensure_joint_pocket`, `catetind_join_state`, `catetind_accept_invite` v2 (idempoten: `creator`/`member` tidak membakar kode) |

## 3. Alur baru

1. **A** buka `/joint` → "Buat Dompet & Ajak Pasangan" → modal kode undangan: kode dibuat lokal, lalu **dompet server dipastikan** (`catetind_ensure_joint_pocket`) dan kode yang sama ditulis ke `invite_codes`.
2. **B** membuka `/join/KODE`: status + nama pengundang dibaca dari server (render pertama sudah benar, tanpa flash "kode tidak ditemukan").
3. **B belum punya sesi:** tombol → `/login?next=%2Fjoin%2FKODE%3Fterima%3D1`.
4. Setelah OTP/tautan email, **B** kembali ke `/join/KODE?terima=1` → keanggotaan ditulis otomatis (PRD 917), layar "Menghubungkan…" tampil selama RPC berjalan.
5. **B sudah punya sesi:** tombol "Gabung Dompet Ini" memanggil RPC yang sama. `joint_members` bertambah, kode ditandai terpakai, `/joint` di perangkat B langsung berisi dompet (store membaca id uuid dari server).
6. **Membuka ulang tautan** setelah join: `catetind_join_state` menjawab "sudah anggota" → layar sukses, bukan "tautan sudah dipakai".
7. **A membuka tautan pratinjaunya sendiri:** `join_is_creator` true → mode pratinjau; kode **tidak** dibakar.

## 4. Bukti

```powershell
npx tsc --noEmit                 # 0 error
npx vitest run                   # 115 file · 1645 test lulus
npx next build                   # semua route ter-compile (/join/[code] dynamic, sesuai status per-request)
```

Test baru di `lib/data/joint-invite.test.ts`: tautan auto-join (`buildJoinClaimHref`, `isJoinClaimRequest`) dan pemetaan status server → copy layar (`resolveRemoteInviteView`, label masa berlaku).

## 5. Catatan penerapan

- Jalankan `pnpm supabase:migrate` supaya tiga RPC baru ada. Tanpa migrasi, halaman tetap jalan dengan jalur lokal (status dari `localStorage`) — tidak ada layar kosong, tetapi gabung lintas perangkat baru aktif setelah RPC terpasang.
- Kode undangan lama yang dibuat sebelum paket ini hanya hidup di perangkat pembuatnya; minta pengundang menekan "Buat kode baru" sekali agar tersinkron ke server.
