-- RLS hardening aligned to game_sessions (canonical live game table) and guest join support.
--
-- Goals:
-- - Anyone (anon/auth) can SELECT game_sessions + game_players needed for join/lobby flows.
-- - Only authenticated hosts can INSERT/UPDATE game_sessions.
-- - Players can INSERT themselves into game_players (auth user or guest_id).
-- - Only host can UPDATE player rows and write actions (night/day/link/amulets/logs).

-- Enable RLS
alter table public.game_sessions enable row level security;
alter table public.game_players enable row level security;
alter table public.night_actions enable row level security;
alter table public.day_eliminations enable row level security;
alter table public.links enable row level security;
alter table public.amulets enable row level security;
alter table public.game_logs enable row level security;

-- Drop outdated/restrictive policies if they exist
drop policy if exists "Users can view players in their games" on public.game_players;
drop policy if exists "Users can join games" on public.game_players;
drop policy if exists "Moderators can update players in their games" on public.game_players;
drop policy if exists "Moderators can manage night actions" on public.night_actions;
drop policy if exists "Moderators can manage day eliminations" on public.day_eliminations;
drop policy if exists "Players can view links in their games" on public.links;
drop policy if exists "Moderators can manage links" on public.links;
drop policy if exists "Players can view amulets in their games" on public.amulets;
drop policy if exists "Moderators can manage amulets" on public.amulets;
drop policy if exists "Moderators can manage game logs" on public.game_logs;

-- game_sessions policies
drop policy if exists "Anyone can view game sessions" on public.game_sessions;
create policy "Anyone can view game sessions"
  on public.game_sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Hosts can create game sessions" on public.game_sessions;
create policy "Hosts can create game sessions"
  on public.game_sessions
  for insert
  to authenticated
  with check (host_id = auth.uid());

drop policy if exists "Hosts can update own game sessions" on public.game_sessions;
create policy "Hosts can update own game sessions"
  on public.game_sessions
  for update
  to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

-- game_players policies
drop policy if exists "Anyone can view game players" on public.game_players;
create policy "Anyone can view game players"
  on public.game_players
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authed users can join games" on public.game_players;
create policy "Authed users can join games"
  on public.game_players
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Guests can join games" on public.game_players;
create policy "Guests can join games"
  on public.game_players
  for insert
  to anon
  with check (user_id is null and guest_id is not null);

drop policy if exists "Hosts can update players in their games" on public.game_players;
create policy "Hosts can update players in their games"
  on public.game_players
  for update
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = game_players.game_id
        and gs.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = game_players.game_id
        and gs.host_id = auth.uid()
    )
  );

-- night_actions: readable by all, writable by host
drop policy if exists "Anyone can view night actions" on public.night_actions;
create policy "Anyone can view night actions"
  on public.night_actions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Hosts can manage night actions" on public.night_actions;
create policy "Hosts can manage night actions"
  on public.night_actions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = night_actions.game_id
        and gs.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = night_actions.game_id
        and gs.host_id = auth.uid()
    )
  );

-- day_eliminations: readable by all, writable by host
drop policy if exists "Anyone can view day eliminations" on public.day_eliminations;
create policy "Anyone can view day eliminations"
  on public.day_eliminations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Hosts can manage day eliminations" on public.day_eliminations;
create policy "Hosts can manage day eliminations"
  on public.day_eliminations
  for all
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = day_eliminations.game_id
        and gs.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = day_eliminations.game_id
        and gs.host_id = auth.uid()
    )
  );

-- links: readable by all, writable by host
drop policy if exists "Anyone can view links" on public.links;
create policy "Anyone can view links"
  on public.links
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Hosts can manage links" on public.links;
create policy "Hosts can manage links"
  on public.links
  for all
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = links.game_id
        and gs.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = links.game_id
        and gs.host_id = auth.uid()
    )
  );

-- amulets: readable by all, writable by host
drop policy if exists "Anyone can view amulets" on public.amulets;
create policy "Anyone can view amulets"
  on public.amulets
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Hosts can manage amulets" on public.amulets;
create policy "Hosts can manage amulets"
  on public.amulets
  for all
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = amulets.game_id
        and gs.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = amulets.game_id
        and gs.host_id = auth.uid()
    )
  );

-- game_logs: readable by all, writable by host
drop policy if exists "Anyone can view game logs" on public.game_logs;
create policy "Anyone can view game logs"
  on public.game_logs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Hosts can manage game logs" on public.game_logs;
create policy "Hosts can manage game logs"
  on public.game_logs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = game_logs.game_id
        and gs.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = game_logs.game_id
        and gs.host_id = auth.uid()
    )
  );


