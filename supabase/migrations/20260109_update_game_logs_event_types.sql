-- Update game_logs event_type constraint to include night_resolution and day_resolution
-- Required for logging resolution results from NightActionService and gameLogic

-- Drop existing constraint if it exists
ALTER TABLE game_logs DROP CONSTRAINT IF EXISTS game_logs_event_type_check;

-- Add updated constraint with new event types
ALTER TABLE game_logs
ADD CONSTRAINT game_logs_event_type_check CHECK (
  event_type IN (
    'night_action',
    'day_elimination',
    'phase_change',
    'link_triggered',
    'transformation',
    'tragic_hero_kill',
    'night_resolution',
    'day_resolution'
  )
);
