-- Track Ship Captain double-vote power usage (once per game)
alter table public.game_sessions
add column if not exists ship_captain_vote_used boolean not null default false;


