# QA Checklist (Void Threat)

## Pre-flight
- Expo build runs without errors (`npx expo start -c`)
- Supabase `.env` loaded and app connects (Login works; Join/Host works)
- Database migrations applied:
  - `game_sessions.game_url`
  - `game_sessions.custom_roles`
  - `game_sessions.custom_amulets`
  - `game_players.guest_id` + uniqueness constraints
  - RLS migration for `game_sessions` + guest join support

## Core flows
### Host (authenticated)
- Create game
- Select mode (standard/custom)
- Custom: pick roles (grid UI), verify balance/selected counts update, confirm enabled only when valid
- Custom: toggle **Add amulets**, pick amulets, confirm persists without crash
- Lobby: share link + code; player count updates live
- Start game: roles assigned, game status becomes `playing`, goes to Night 1

### Guest
- Guest setup works; can join game
- Join game via code
- Join game via QR scan
- After joining setup-phase game, user can wait without crashes

## Gameplay
### Night
- Night 1 completes and transitions to Day 1
- Night 2+ resolves night actions:
  - kills apply to `game_players.is_alive=false` and `eliminated_by='night'`
  - win condition is checked and ends game if met

### Day
- Eliminate player:
  - updates `game_players.is_alive=false`, `eliminated_by='day'`
  - records `day_eliminations` row
  - checks win condition and ends game if met
- Proceed to night transitions correctly

## End game
- When win condition is met:
  - `game_sessions.status='ended'`
  - `winner` and `ended_at` are set
  - navigates to GameEnd screen

## Spectator mode
- Eliminated player can enter Spectator mode
- Spectator sees phase/status + alive count + player list
- Spectator is read-only (no eliminate/complete-night actions)

## Dashboard stats
- User dashboard stats are real (no mock values)
- Recent games list loads without errors

## Security (RLS)
- Guests can insert into `game_players` with `guest_id`
- Auth users can insert into `game_players` with `user_id = auth.uid()`
- Only host can update `game_sessions` / `game_players` / actions

## Performance & UX
- Custom role grid scrolls smoothly (no lag)
- Images render without layout jumps
- No critical console errors in normal play


