-- Add persistent guest identity to prevent duplicate guest joins.
-- Run in Supabase SQL Editor.

alter table public.game_players
add column if not exists guest_id uuid;

-- Enforce: either an authenticated user_id OR a guest_id must be present.
-- NOT VALID means existing rows won't be checked; new rows WILL be checked.
alter table public.game_players
add constraint if not exists game_players_identity_check
check (
  (user_id is not null and guest_id is null) OR
  (user_id is null and guest_id is not null)
) not valid;

-- Optional: later, once you're sure existing rows are cleaned up:
-- alter table public.game_players validate constraint game_players_identity_check;

-- Prevent duplicate joins:
create unique index if not exists game_players_unique_user
on public.game_players(game_id, user_id)
where user_id is not null;

create unique index if not exists game_players_unique_guest
on public.game_players(game_id, guest_id)
where guest_id is not null;

-- RLS NOTE (important):
-- If you allow anonymous guests to insert into game_players, tighten the INSERT policy to require guest_id.
-- Example (adjust policy names to your project):
--
-- drop policy if exists "Users can join games" on public.game_players;
-- create policy "Users can join games" on public.game_players
--   for insert
--   with check (
--     (user_id = auth.uid()) OR (user_id is null and guest_id is not null)
--   );


