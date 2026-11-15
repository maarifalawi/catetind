-- ── PENGINGAT OTOMATIS (CRON) — STEMPEL ANTI-SPAM & RIWAYAT EKSEKUSI ────────
-- Paket: notifikasi otomatis (Web Push + Vercel Cron).
--
-- Dua hal yang disimpan di sini:
--
-- 1. `user_settings.push_state` — stempel kirim terakhir per user (jsonb):
--       { "lastSentAt": "2026-11-06T01:00:03.120Z",
--         "lastDay":    "2026-11-06",
--         "lastKind":   "bills" }
--    `lastDay` = tanggal WIB, dipakai aturan "maksimal 1 push per user per
--    hari kalender". Disimpan di SERVER (bukan perangkat) supaya cron yang
--    terulang — retry Vercel, instance berbeda, tombol admin ditekan dua kali —
--    tidak pernah mengirim pesan ganda.
--
-- 2. `push_cron_runs` — satu baris per eksekusi cron, sumber "Ringkasan Hasil
--    Terakhir" di /admin. Tanpa tabel ini laporan hasil hanya hidup di memori
--    fungsi serverless dan hilang begitu eksekusi selesai.
--
-- RLS: tabel ini TIDAK dibuka untuk anon/authenticated. Hanya kunci peran
-- server (cron & dashboard admin) yang membacanya — lihat
-- `lib/push/cron.ts`.

alter table public.user_settings
  add column if not exists push_state jsonb not null default '{}'::jsonb;

comment on column public.user_settings.push_state is
  'Stempel pengingat push terakhir: { lastSentAt (ISO), lastDay (YYYY-MM-DD WIB), lastKind }. Dipakai anti-spam 1 push/user/hari.';

create table if not exists public.push_cron_runs (
  id        uuid primary key default gen_random_uuid(),
  ran_at    timestamptz not null default now(),
  mode      text not null check (mode in ('morning', 'weekly')),
  dry_run   boolean not null default false,
  users     integer not null default 0 check (users >= 0),
  targets   integer not null default 0 check (targets >= 0),
  sent      integer not null default 0 check (sent >= 0),
  failed    integer not null default 0 check (failed >= 0),
  dropped   integer not null default 0 check (dropped >= 0),
  skipped   jsonb not null default '{}'::jsonb,
  by_kind   jsonb not null default '{}'::jsonb,
  actor     text,
  note      text
);

create index if not exists push_cron_runs_ran_at_idx on public.push_cron_runs (ran_at desc);

alter table public.push_cron_runs enable row level security;

-- Tanpa policy = tidak ada akses klien sama sekali (RLS default deny).
-- Grant lama dari default privileges Supabase dicabut eksplisit, lalu akses
-- diberikan hanya ke peran server.
revoke all on public.push_cron_runs from public, anon, authenticated;
grant all on public.push_cron_runs to service_role;
