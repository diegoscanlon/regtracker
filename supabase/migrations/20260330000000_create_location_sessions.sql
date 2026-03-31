create table public.location_sessions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.location_sessions enable row level security;

create policy "Users can read own sessions"
  on public.location_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on public.location_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on public.location_sessions for update using (auth.uid() = user_id);

create index location_sessions_user_idx on public.location_sessions (user_id, started_at desc);
