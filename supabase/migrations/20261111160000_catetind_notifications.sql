create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  href        text not null default '/app',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
alter table public.notifications replica identity full;

drop policy if exists notifications_owner_select on public.notifications;
drop policy if exists notifications_owner_insert on public.notifications;
drop policy if exists notifications_owner_update on public.notifications;
drop policy if exists notifications_owner_delete on public.notifications;

create policy notifications_owner_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_owner_insert on public.notifications
  for insert to authenticated with check (user_id = auth.uid());
create policy notifications_owner_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_owner_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Realtime: lonceng di perangkat lain ikut hidup tanpa refresh.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;
