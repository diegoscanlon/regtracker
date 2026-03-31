-- Friendships: one row per pair, always user_id < friend_id
create table public.friendships (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  friend_id   uuid        not null references public.profiles(id) on delete cascade,
  status      text        not null default 'pending'
                          check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  constraint friendships_ordered check (user_id < friend_id),
  constraint friendships_unique unique (user_id, friend_id)
);

alter table public.friendships enable row level security;

create policy "Users can read own friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can insert friendships"
  on public.friendships for insert
  with check (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can update own friendships"
  on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Users can delete own friendships"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

create index friendships_user_idx on public.friendships (user_id);
create index friendships_friend_idx on public.friendships (friend_id);

-- Allow all authenticated users to read profiles (for leaderboard display)
create policy "Authenticated users can read all profiles"
  on public.profiles for select to authenticated using (true);

-- Leaderboard RPC
create or replace function public.get_leaderboard(
  target_month int default extract(month from now())::int,
  target_year  int default extract(year  from now())::int,
  friends_only boolean default false
)
returns table (
  rank         bigint,
  user_id      uuid,
  display_name text,
  email        text,
  avatar_url   text,
  total_seconds bigint
)
language sql
security definer
set search_path = public
as $$
  with session_totals as (
    select
      ls.user_id,
      coalesce(
        sum(extract(epoch from (coalesce(ls.ended_at, now()) - ls.started_at))),
        0
      )::bigint as total_seconds
    from location_sessions ls
    where extract(month from ls.started_at) = target_month
      and extract(year  from ls.started_at) = target_year
    group by ls.user_id
  ),
  filtered as (
    select st.*
    from session_totals st
    where
      case when friends_only then
        st.user_id in (
          select f.friend_id from friendships f
          where f.user_id = auth.uid() and f.status = 'accepted'
          union
          select f.user_id from friendships f
          where f.friend_id = auth.uid() and f.status = 'accepted'
        )
        or st.user_id = auth.uid()
      else
        true
      end
  )
  select
    row_number() over (order by f.total_seconds desc) as rank,
    f.user_id,
    p.display_name,
    p.email,
    p.avatar_url,
    f.total_seconds
  from filtered f
  join profiles p on p.id = f.user_id
  order by f.total_seconds desc
  limit 100;
$$;
