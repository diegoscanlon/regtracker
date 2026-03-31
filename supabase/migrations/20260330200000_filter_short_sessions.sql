-- Recreate leaderboard RPC to exclude sessions under 10 minutes
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
      and extract(epoch from (coalesce(ls.ended_at, now()) - ls.started_at)) >= 600
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
