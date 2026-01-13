-- Add custom_amulets to persist custom amulet selection per session (UI setup phase)
-- Stored as jsonb: { "shielding_device": 1, "echo_beacon": 1, ... }

alter table public.game_sessions
add column if not exists custom_amulets jsonb;


