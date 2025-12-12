-- Adds game_url to game_sessions so sessions can be joined by code OR shared link.
-- Run this in Supabase SQL Editor.

alter table public.game_sessions
add column if not exists game_url text;

-- (Optional) backfill for existing sessions if your URLs follow a predictable pattern:
-- update public.game_sessions
-- set game_url = 'https://void.app/join/' || game_code
-- where game_url is null and game_code is not null;


