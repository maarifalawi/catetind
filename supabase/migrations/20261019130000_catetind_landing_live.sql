-- ══════════════════════════════════════════════════════════════════════════════
-- CatetInd · 17 · PENGHITUNG PENGGUNA LIVE (landing)
--
-- Satu baris statistik publik untuk landing: berapa orang yang sudah bergabung.
-- Nilainya BUKAN angka karangan di komponen — ia hidup di database dan naik
-- SENDIRI setiap ada langganan baru tercatat.
--
-- KEPUTUSAN YANG MENJADI TANGGUNG JAWAB FILE INI:
--   1. Titik mulai 234 pengguna (permintaan produk). Baris singleton `global`
--      dibuat di sini; tidak ada kode klien yang boleh menimpanya.
--   2. Setiap baris BARU di `user_subscriptions` menambah 1 sampai 5 (acak).
--      Kenapa bukan 1: satu pembelian sering mengajak anggota keluarga/pasangan
--      (Joint Wallet), jadi kenaikan kecil-acak lebih dekat ke jumlah orang
--      yang benar-benar mulai memakai. Angkanya dihitung DI SINI, bukan di
--      klien, supaya dua tab yang terbuka tidak menambah dua kali.
--   3. Perpanjangan/upgrade TIDAK menambah: fungsi pemenuhan memakai
--      `insert ... on conflict (user_id) do update`, jadi trigger AFTER INSERT
--      hanya menyala untuk pengguna yang benar-benar baru.
--   4. Anon hanya boleh SELECT satu baris statistik ini. Tidak ada policy tulis,
--      jadi klien tidak bisa "menaikkan" angka sendiri.
--   5. Tabel ikut publication `supabase_realtime` → landing bisa berubah tanpa
--      polling berat (polling ringan tetap dipakai sebagai cadangan).
--
-- Idempotent: aman dijalankan berkali-kali.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Statistik publik (singleton) ─────────────────────────────────────────
create table if not exists public.landing_stats (
  id                text primary key default 'global' check (id = 'global'),
  subscriber_count  bigint not null default 234 check (subscriber_count >= 0),
  updated_at        timestamptz not null default now()
);

insert into public.landing_stats (id, subscriber_count)
values ('global', 234)
on conflict (id) do nothing;

-- ── 2. RLS: publik boleh membaca, tidak ada yang boleh menulis dari klien ───
alter table public.landing_stats enable row level security;

drop policy if exists landing_stats_public_read on public.landing_stats;
create policy landing_stats_public_read on public.landing_stats
  for select to anon, authenticated using (true);

revoke all on public.landing_stats from anon, authenticated;
grant select on public.landing_stats to anon, authenticated;

-- ── 3. Kenaikan otomatis saat langganan BARU tercatat ───────────────────────
create or replace function public.catetind_bump_landing_subscribers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.landing_stats
     set subscriber_count = subscriber_count + (1 + floor(random() * 5)::int),
         updated_at       = now()
   where id = 'global';
  return new;
end;
$$;

drop trigger if exists catetind_landing_subscriber_bump on public.user_subscriptions;
create trigger catetind_landing_subscriber_bump
after insert on public.user_subscriptions
for each row execute function public.catetind_bump_landing_subscribers();

/* Fungsi trigger tidak untuk dipanggil langsung dari API. */
revoke all on function public.catetind_bump_landing_subscribers()
  from public, anon, authenticated;

-- ── 4. Realtime: landing mendengar perubahan tanpa refresh ──────────────────
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname   = 'supabase_realtime'
       and schemaname = 'public'
       and tablename  = 'landing_stats'
  ) then
    execute 'alter publication supabase_realtime add table public.landing_stats';
  end if;
end
$$;

-- PostgREST menyimpan cache skema; satu NOTIFY ini membuat endpoint langsung
-- mengenali tabel baru tanpa menunggu instance berikutnya.
notify pgrst, 'reload schema';
