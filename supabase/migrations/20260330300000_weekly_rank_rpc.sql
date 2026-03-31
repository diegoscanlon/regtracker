-- Returns the calling user's rank among friends and overall position this week.
-- friend_rank: position among accepted friends (+ self), based on this week's total
-- uchicago_rank: position among ALL users this week
-- uchicago_total: total number of users with sessions this week
create or replace function public.get_weekly_ranks()
returns table (
  friend_rank   bigint,
  friend_total  bigint,
  uchicago_rank bigint,
  uchicago_total bigint
)
language sql
security definer
set search_path = public
as $$
  with week_start as (
    select date_trunc('week', now()) as ws
  ),
  -- All users' weekly totals (sessions >= 10 min)
  all_totals as (
    select
      ls.user_id,
      sum(extract(epoch from (coalesce(ls.ended_at, now()) - ls.started_at)))::bigint as total_seconds
    from location_sessions ls, week_start w
    where ls.started_at >= w.ws
      and extract(epoch from (coalesce(ls.ended_at, now()) - ls.started_at)) >= 600
    group by ls.user_id
  ),
  -- Ranked across all UChicago
  uchicago_ranked as (
    select
      user_id,
      total_seconds,
      row_number() over (order by total_seconds desc) as rank
    from all_totals
  ),
  -- Friend user IDs (accepted friendships)
  friend_ids as (
    select f.friend_id as uid from friendships f
    where f.user_id = auth.uid() and f.status = 'accepted'
    union
    select f.user_id as uid from friendships f
    where f.friend_id = auth.uid() and f.status = 'accepted'
    union
    select auth.uid() as uid
  ),
  -- Ranked among friends only
  friend_ranked as (
    select
      at.user_id,
      at.total_seconds,
      row_number() over (order by at.total_seconds desc) as rank
    from all_totals at
    where at.user_id in (select uid from friend_ids)
  )
  select
    coalesce((select fr.rank from friend_ranked fr where fr.user_id = auth.uid()), 0)::bigint as friend_rank,
    (select count(*) from friend_ranked)::bigint as friend_total,
    coalesce((select ur.rank from uchicago_ranked ur where ur.user_id = auth.uid()), 0)::bigint as uchicago_rank,
    (select count(*) from uchicago_ranked)::bigint as uchicago_total;
$$;
