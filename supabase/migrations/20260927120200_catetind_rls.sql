-- ═══════════════════════════════════════════════════════════════════════════
-- CatetInd · 03 · RLS (paket 45)
--
-- Aturan: SETIAP tabel di `public` punya RLS AKTIF dan policy
-- `user_id = auth.uid()` (dengan `with check` untuk tulis). Tabel dompet bersama
-- bukan pengecualian: izinnya lewat KEANGGOTAAN (`joint_members`), bukan lewat
-- `user_id`, karena di dompet bersama `user_id` = siapa yang mengetik catatan —
-- bukan siapa yang boleh melihatnya.
--
-- Sengaja tidak ada policy untuk role `anon`: tanpa policy, `anon` membaca 0 baris
-- (dan tulisan ditolak), jadi kunci publishable yang ada di klien tidak membuka
-- apa pun. Ini yang dibuktikan `curl` tanpa login di laporan paket ini.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabel ber-`user_id` (13 tabel) ──────────────────────────────────────
-- Policy ditulis lewat loop yang MENGHASILKAN EMPAT policy per tabel
-- (select/insert/update/delete) supaya tidak ada tabel yang "lupa satu operasi" —
-- kelas bug paling sering di RLS yang ditulis manual satu per satu.
do $$
declare
  owner_tables text[] := array[
    'profiles', 'wallets', 'ledger_rows', 'debts', 'debt_payments', 'investments',
    'asset_transactions', 'goals', 'goal_contributions', 'bills', 'ai_usage',
    'user_settings', 'push_subscriptions'
  ];
  t text;
begin
  foreach t in array owner_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
      t || '_owner_select', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
      t || '_owner_insert', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_owner_update', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_owner_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
      t || '_owner_delete', t
    );
  end loop;
end $$;

-- ── 2. Keanggotaan dompet bersama ──────────────────────────────────────────
-- Fungsi bantu: dipakai policy & bisa diuji langsung lewat REST
-- (`POST /rest/v1/rpc/catetind_is_joint_member`). `security definer` supaya
-- policy bisa membacanya tanpa terjebak RLS `joint_members` itu sendiri.
create or replace function public.catetind_is_joint_member(
  p_wallet uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.joint_members m
    where m.joint_wallet_id = p_wallet and m.user_id = p_user
  )
$$;

alter table public.joint_wallets enable row level security;
alter table public.joint_members enable row level security;
alter table public.joint_transactions enable row level security;
alter table public.invite_codes enable row level security;

-- joint_wallets: anggota boleh melihat & menulis transaksi, hanya PEMILIK yang
-- boleh mengubah/menghapus dompetnya sendiri.
drop policy if exists joint_wallets_member_select on public.joint_wallets;
create policy joint_wallets_member_select on public.joint_wallets
  for select to authenticated
  using (owner_id = auth.uid() or public.catetind_is_joint_member(id));

drop policy if exists joint_wallets_owner_insert on public.joint_wallets;
create policy joint_wallets_owner_insert on public.joint_wallets
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists joint_wallets_owner_update on public.joint_wallets;
create policy joint_wallets_owner_update on public.joint_wallets
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists joint_wallets_owner_delete on public.joint_wallets;
create policy joint_wallets_owner_delete on public.joint_wallets
  for delete to authenticated using (owner_id = auth.uid());

-- joint_members: yang terlihat hanya baris keanggotaan dompet tempat ia anggota
-- (supaya daftar anggota satu dompet bisa tampil), dan hanya PEMILIK dompet yang
-- boleh menambah/mengeluarkan anggota langsung. Anggota baru masuk lewat RPC
-- `catetind_accept_invite` (migrasi 04) — bukan lewat insert bebas dari klien.
--
-- ⚠️ JANGAN menulis subquery ke `joint_members` di policy tabel ini: Postgres
-- mendeteksinya sebagai rekursi tak berujung (`42P17`) karena policy yang sama
-- berlaku pada pembacaan di dalam subquery itu. Karena itu keanggotaan diperiksa
-- lewat fungsi `security definer` `catetind_is_joint_member()` — jalur yang sama
-- yang dipakai `joint_transactions`.
drop policy if exists joint_members_member_select on public.joint_members;
create policy joint_members_member_select on public.joint_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.catetind_is_joint_member(joint_wallet_id)
  );


drop policy if exists joint_members_owner_insert on public.joint_members;
create policy joint_members_owner_insert on public.joint_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.joint_wallets w
      where w.id = joint_wallet_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists joint_members_owner_delete on public.joint_members;
create policy joint_members_owner_delete on public.joint_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.catetind_is_joint_member(joint_wallet_id)
  );


-- joint_transactions: SEMUA operasi hanya untuk anggota dompet itu. Akun ketiga
-- yang tahu `joint_wallet_id`-nya tetap ditolak (diuji di laporan paket 45).
drop policy if exists joint_transactions_member_select on public.joint_transactions;
create policy joint_transactions_member_select on public.joint_transactions
  for select to authenticated using (public.catetind_is_joint_member(joint_wallet_id));

drop policy if exists joint_transactions_member_insert on public.joint_transactions;
create policy joint_transactions_member_insert on public.joint_transactions
  for insert to authenticated
  with check (
    public.catetind_is_joint_member(joint_wallet_id)
    -- `user_id`/`paid_by_user_id` tidak boleh dikarang: pencatat = pemanggil,
    -- dan kantong yang keluar uang harus salah satu anggota dompet ini.
    and user_id = auth.uid()
    and public.catetind_is_joint_member(joint_wallet_id, paid_by_user_id)
  );

drop policy if exists joint_transactions_member_update on public.joint_transactions;
create policy joint_transactions_member_update on public.joint_transactions
  for update to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id))
  with check (public.catetind_is_joint_member(joint_wallet_id));

drop policy if exists joint_transactions_author_delete on public.joint_transactions;
create policy joint_transactions_author_delete on public.joint_transactions
  for delete to authenticated
  using (public.catetind_is_joint_member(joint_wallet_id) and user_id = auth.uid());

-- invite_codes: yang bisa di-CRUD langsung cuma pembuatnya. Penerima undangan
-- TIDAK boleh membaca tabel ini (itu akan membocorkan kode aktif orang lain) —
-- ia memakai RPC `catetind_resolve_invite` / `catetind_accept_invite`.
drop policy if exists invite_codes_creator_select on public.invite_codes;
create policy invite_codes_creator_select on public.invite_codes
  for select to authenticated using (created_by = auth.uid());

drop policy if exists invite_codes_creator_insert on public.invite_codes;
create policy invite_codes_creator_insert on public.invite_codes
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.catetind_is_joint_member(joint_wallet_id)
  );

drop policy if exists invite_codes_creator_update on public.invite_codes;
create policy invite_codes_creator_update on public.invite_codes
  for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists invite_codes_creator_delete on public.invite_codes;
create policy invite_codes_creator_delete on public.invite_codes
  for delete to authenticated using (created_by = auth.uid());

-- ── 3. View turunan & RPC: hak akses eksplisit ─────────────────────────────
-- View memakai `security_invoker`, jadi RLS tabel dasarnya tetap berlaku; yang
-- perlu dipastikan cuma hak `select`.
grant select on public.wallet_balances to authenticated;
grant select on public.wallet_cash_total to authenticated;
grant select on public.ledger_row_effects to authenticated;
grant select on public.user_net_worth to authenticated;
grant select on public.debt_balances to authenticated;
grant select on public.investment_values to authenticated;
grant select on public.goal_savings to authenticated;
grant select on public.joint_transactions_public to authenticated;

-- `anon` (kunci publishable tanpa login) tidak diberi hak apa pun di atas view
-- agregate — supaya tidak ada jalan "hanya membaca" yang bocor tanpa sesi.
revoke all on public.wallet_balances from anon;
revoke all on public.wallet_cash_total from anon;
revoke all on public.ledger_row_effects from anon;
revoke all on public.user_net_worth from anon;
revoke all on public.debt_balances from anon;
revoke all on public.investment_values from anon;
revoke all on public.goal_savings from anon;
revoke all on public.joint_transactions_public from anon;

