-- Allow all authenticated users to read location_sessions
-- (needed so profile pages can show stats for any user,
--  matching what the leaderboard RPC already exposes)
drop policy if exists "Users can read own sessions" on public.location_sessions;

create policy "Authenticated users can read all sessions"
  on public.location_sessions for select
  using (auth.role() = 'authenticated');
