-- Adds Custom Game Mode persistence to game_sessions.
-- Run this in Supabase SQL Editor.

alter table public.game_sessions
add column if not exists custom_roles jsonb;

-- Optional: if you want a safe default (recommended):
-- alter table public.game_sessions
-- alter column custom_roles set default '{}'::jsonb;

-- RLS NOTE:
-- Ensure hosts can update their own sessions to store custom_roles / max_players / game_mode.
-- If you don't already have an UPDATE policy on public.game_sessions, add one like this:
--
-- alter table public.game_sessions enable row level security;
--
-- drop policy if exists "Host can update own sessions" on public.game_sessions;
-- create policy "Host can update own sessions" on public.game_sessions
--   for update
--   using (auth.uid() = host_id)
--   with check (auth.uid() = host_id);


