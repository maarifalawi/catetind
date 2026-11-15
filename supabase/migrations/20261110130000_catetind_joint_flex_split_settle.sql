-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 15 · DOMPET BERSAMA 3–4 ORANG: PORSI FLEKSIBEL, PELUNASAN PER
--                  PASANGAN, KELOLA ANGGOTA, & REALTIME PENUH
--
-- Tiga hal yang ditutup di sini (semuanya bisa dibuktikan dari aplikasi):
--
--   1. Pembagian "Bagi Rata" DULU selalu ke SEMUA anggota. Padahal pada dompet
--      3–4 orang sering hanya 3 orang yang ikut makan malam. Daftar peserta
--      sekarang disimpan di `split_members` (array id anggota) — bukan hanya di
--      memori perangkat orang yang menginput — sehingga perangkat anggota lain
--      menghitung porsi yang PERSIS sama setelah membaca ulang dari server.
--      Persentase & nominal juga berlaku untuk seluruh anggota (tidak lagi
--      dipaksa "dua sisi").
--
--   2. Pelunasan DULU hanya satu penanda per BULAN (`settlements` lokal). Pada
--      grup 4 orang, daftar transfer bisa berisi B→A dan C→A; melunasi B→A
--      tidak boleh ikut menghapus utang C→A. Sekarang pelunasan per pasangan
--      disimpan sebagai BARIS `joint_transactions` dengan:
--         · `is_settlement = true`,
--         · `paid_by_user_id` = PEMBAYAR (mis. B),
--         · `settle_to_user_id` = PENERIMA MANFAAT 100% (mis. A),
--         · `bearer_id` = penerima manfaat yang sama (kompatibel dengan mesin
--           `single_payer` di `lib/data/joint-ledger.ts`).
--      Karena porsi `single_payer` jatuh 100% ke penerima, net B naik tepat
--      sebesar transfer dan net C/D TIDAK tersentuh.
--
--   3. Hapus dompet / keluar / keluarkan anggota harus sampai ke semua
--      perangkat. Tabel `joint_wallets` belum terdaftar di publication realtime
--      dan policy delete anggota mengizinkan SEMUA anggota mengeluarkan siapa
--      saja. Policy sekarang: diri sendiri ATAU pemilik dompet; pemilik punya
--      RPC `catetind_remove_joint_member()`.
--
-- Idempotent: aman dijalankan berkali-kali (view di-drop dulu karena kolomnya
-- bertambah di tengah, policy di-drop sebelum dibuat ulang).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Kolom baru: peserta bagi rata, penerima pelunasan, jenis catatan ─────
/* `kind` sudah dibuat migrasi 14; `add column if not exists` diulang supaya
   berkas ini bisa diterapkan sendiri tanpa bergantung urutan eksekusi. */
alter table public.joint_transactions
  add column if not exists kind text not null default 'expense';

do $$
begin
  alter table public.joint_transactions
    add constraint joint_transactions_kind_check
    check (kind in ('expense', 'income'));
exception when duplicate_object then null;
end $$;

/* Daftar anggota yang IKUT menanggung satu catatan (khusus mode Bagi Rata).
   NULL = semua anggota (perilaku lama). Disimpan sebagai teks karena id anggota
   adalah uuid dan urutannya tidak penting; validasi keanggotaan dilakukan RLS
   pada `paid_by_user_id` + aplikasi pada `split` sebelum menulis. */
alter table public.joint_transactions
  add column if not exists split_members text[];

/* Penerima manfaat 100% untuk baris pelunasan. NULL untuk catatan biasa. */
alter table public.joint_transactions
  add column if not exists settle_to_user_id uuid;

comment on column public.joint_transactions.split_members is
  'Peserta mode Bagi Rata (id anggota). NULL = semua anggota dompet ikut menanggung.';

comment on column public.joint_transactions.settle_to_user_id is
  'Baris pelunasan: penerima manfaat 100% dari transfer (paid_by_user_id = pembayar).';

-- ── 2. View masker: kolom baru WAJIB ikut, kalau tidak porsi hilang setelah
--      halaman di-refresh (bacaan awal lewat view ini) ────────────────────────
drop view if exists public.joint_transactions_public;

create view public.joint_transactions_public
with (security_invoker = true) as
  select
    t.id,
    t.joint_wallet_id,
    t.user_id,
    t.paid_by_user_id,
    case
      when t.is_private and coalesce(t.private_for_user, t.user_id) <> auth.uid()
        then 'Transaksi privat'
      else t.description
    end as description,
    case
      when t.is_private and coalesce(t.private_for_user, t.user_id) <> auth.uid()
        then 'privat'
      else t.category
    end as category,
    t.amount,
    t.date,
    t.time_label,
    t.split_type,
    t.split_percents,
    t.split_amounts,
    t.split_members,
    t.bearer_id,
    t.is_private,
    t.private_for_user,
    t.is_settlement,
    t.settle_to_user_id,
    t.month_key,
    t.kind,
    t.created_at
  from public.joint_transactions t;

grant select on public.joint_transactions_public to authenticated;
revoke all on public.joint_transactions_public from anon;
/* View ini hanya untuk MEMBACA. Default privilege Supabase memberi
   authenticated hak tulis pada objek baru; pada view masker itu tidak ada
   gunanya dan memperluas permukaan yang tidak perlu. */
revoke insert, update, delete, truncate, references, trigger
  on public.joint_transactions_public from authenticated;

-- ── 3. Policy anggota: keluar sendiri ATAU dikeluarkan PEMILIK ──────────────
/* Versi lama (`... or public.catetind_is_joint_member(joint_wallet_id)`)
   membuat SETIAP anggota bisa menghapus keanggotaan siapa pun. Sekarang:
     · barisnya milik sendiri (keluar mandiri), atau
     · pemanggil adalah PEMILIK dompet (keluarkan anggota). */
drop policy if exists joint_members_owner_delete on public.joint_members;
create policy joint_members_owner_delete on public.joint_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.joint_wallets w
      where w.id = joint_members.joint_wallet_id and w.owner_id = auth.uid()
    )
  );

-- ── 4. Policy transaksi: hapus baris bersama + validasi penerima pelunasan ──
/* Satu anggota salah input / tidak sengaja menekan simpan dua kali. Barisnya
   harus bisa dihapus dari SEMUA perangkat, jadi anggota dompet boleh menghapus
   baris di dompetnya sendiri. (Baris kas pribadi tidak tersentuh: itu tabel
   `ledger_rows` dengan policy `user_id = auth.uid()`.) */
drop policy if exists joint_transactions_member_delete on public.joint_transactions;
create policy joint_transactions_member_delete on public.joint_transactions
  for delete to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id));

drop policy if exists joint_transactions_member_insert on public.joint_transactions;
create policy joint_transactions_member_insert on public.joint_transactions
  for insert to authenticated
  with check (
    public.catetind_is_joint_member(joint_wallet_id)
    -- pencatat = pemanggil; kantong pembayar & penerima pelunasan = anggota
    and user_id = auth.uid()
    and public.catetind_is_joint_member(joint_wallet_id, paid_by_user_id)
    and (
      settle_to_user_id is null
      or public.catetind_is_joint_member(joint_wallet_id, settle_to_user_id)
    )
  );

drop policy if exists joint_transactions_member_update on public.joint_transactions;
create policy joint_transactions_member_update on public.joint_transactions
  for update to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id))
  with check (
    public.catetind_is_joint_member(joint_wallet_id)
    and (
      settle_to_user_id is null
      or public.catetind_is_joint_member(joint_wallet_id, settle_to_user_id)
    )
  );

-- ── 5. RPC: status akses & keluarkan anggota (khusus pemilik) ───────────────
/*
 * `catetind_joint_access()` dipakai klien untuk MEMBEDAKAN tiga keadaan yang
 * dulu tampak sama:
 *   · `owner`  — pemilik dompet;
 *   · `member` — anggota (boleh membuka seluruh fitur tanpa langganan sendiri);
 *   · `none`   — bukan anggota: dompet sudah dihapus / ia sudah dikeluarkan.
 * Tanpa pembeda ini, perangkat anggota hanya tahu "bacaan server kosong" dan
 * tidak bisa membersihkan dompet hantu di penyimpanan lokalnya.
 */
create or replace function public.catetind_joint_access(p_wallet uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.joint_wallets w
      where w.id = p_wallet and w.owner_id = auth.uid()
    ) then 'owner'
    when public.catetind_is_joint_member(p_wallet, auth.uid()) then 'member'
    else 'none'
  end
$$;

revoke all on function public.catetind_joint_access(uuid) from public, anon;
grant execute on function public.catetind_joint_access(uuid) to authenticated;

/* Pemilik mengeluarkan anggota. Pemilik TIDAK bisa mengeluarkan dirinya sendiri
   (itu artinya menghapus dompet — jalurnya `delete joint_wallets`). */
create or replace function public.catetind_remove_joint_member(
  p_wallet uuid,
  p_user uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  removed integer := 0;
begin
  if uid is null then
    raise exception 'Sesi tidak ditemukan. Masuk dulu lewat /login ya.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.joint_wallets w
    where w.id = p_wallet and w.owner_id = uid
  ) then
    return false;
  end if;

  if p_user = uid then
    return false;
  end if;

  delete from public.joint_members m
    where m.joint_wallet_id = p_wallet and m.user_id = p_user;
  get diagnostics removed = row_count;
  return removed > 0;
end $$;

revoke all on function public.catetind_remove_joint_member(uuid, uuid) from public, anon;
grant execute on function public.catetind_remove_joint_member(uuid, uuid) to authenticated;

-- `catetind_is_joint_member` dipanggil klien untuk memeriksa apakah dompet yang
-- tersimpan di perangkat masih ada di server (deteksi hapus dompet).
grant execute on function public.catetind_is_joint_member(uuid, uuid) to authenticated;

-- ── 6. Realtime penuh: dompet, anggota, transaksi ───────────────────────────
/* Tanpa `joint_wallets` di publication, anggota lain tidak pernah menerima
   sinyal bahwa dompetnya DIHAPUS — layarnya tetap menampilkan dompet hantu
   sampai aplikasi ditutup. `replica identity full` supaya payload DELETE
   membawa kolomnya (termasuk `owner_id`, yang dipakai policy RLS realtime). */
do $$
declare
  t text;
  targets text[] := array['joint_wallets', 'joint_members', 'joint_transactions'];
begin
  foreach t in array targets loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;

alter table public.joint_wallets replica identity full;
alter table public.joint_members replica identity full;
alter table public.joint_transactions replica identity full;

notify pgrst, 'reload schema';
