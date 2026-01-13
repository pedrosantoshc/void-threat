## Void Threat — ALL THAT’S LEFT (Consolidated Roadmap)

This document is a **single, consolidated “what’s missing” plan** to complete the game to a shippable state, combining:

- Claude’s “think harder” roadmap and patch notes (verbatim ideas, reorganized for clarity)
- A structured prioritization into **P0 / P1 / P2**
- Explicit **verification checkpoints** (“needs verification” vs “done”)

**Important constraints (product decisions already made):**

- **Voting happens in real life**. The app does **not** tally votes or enforce Ship Captain double-vote.  
- During Day, the moderator only inputs **the elimination outcome**, and the app enforces only **protections + special rules + link cascades**.
- Physical seating is **not tracked** by the app. Any “neighbor” mechanic is **moderator-handled verbally**, except where a moderator modal can record a one-off input.

---

## Alignment Notes (Decisions vs PRD)

- **MVP roles count**: this codebase currently defines **26 roles** (17 crew + 8 alien + 1 independent) in `src/constants/roles.ts`. Any “30+ roles” language is outdated.
- **Voting model (intentional deviation)**: voting is in-person; the app does **not** tally votes and does **not** enforce Ship Captain vote-doubling. The moderator inputs only the elimination outcome.
- **Scan info model**: only the moderator sees detailed information and inputs actions. Player apps do **not** show scan results; scans happen live with moderator confirmation.

### Amulet timing (Intentional deviation: Option B)

PRD contains ambiguity (“Night 1 has no protections” vs “early amulets assigned pre‑Night 1”). We chose:

- **Early-game amulets (Shielding Device, Resonance Tracker)** are auto-assigned at the **start of Day 1** (after Night 1 concludes).
- **Night 1 remains setup-only** (no kills, no protections).

### Resonance Tracker (clarified new flow)

We intentionally deviate from PRD for a simpler player choice:

- On receive, the holder chooses:
  - **Use**: reveal previous holder’s team (Crew/Alien), if a previous holder exists.
  - **Don’t use**: amulet is **destroyed immediately** (no reveal, no passing).
- **First-ever assignment caveat**: there is no previous holder. MVP behavior:
  - show “No previous holder” (no reveal). (Optional future: special first-use effect—adds extra moderator flow/UI.)
- “Cannot vote today” remains a **reminder-only** (not enforced in-app).

### Echo Beacon (clarified)

Echo Beacon is **single-use** and **does not pass**.

## What’s Covered (scope of this roadmap)

- **Amulet system**: player UI (4 screens), moderator UI, flow integration, timing rules
- **Core game flow**: setup → lobby → night → day → end
- **Role-specific implementation**: all roles and special rule checks (verify coverage)
- **Database schema**: tables, columns, RLS, realtime, indexes
- **Backend/services**: GameService, NightActionService, AmuletService, plus missing services
- **UI/UX completeness**: navigation, moderator screens, player screens, components, polish
- **Testing**: unit/integration/e2e/perf/security
- **Edge cases**: PRD Section 10 (EC1–EC54, 54 cases)
- **Security & compliance**: auth, authorization, validation, privacy
- **Mobile/performance**: device support, caching, resiliency
- **Deployment/infra**: environments, CI/CD, monitoring, analytics
- **Docs**: user docs, dev docs, legal
- **Priority buckets**: P0/P1/P2

---

## Key Insights (Claude)

### What’s done (claimed complete)

- Track A/B integration: resolution engine with amulets (night + day)
- Backend amulet helpers exist
- Tragic Hero prompts exist
- Day resolution refactor (moderator-pick flow) exists

### Needs verification

- GameService methods called in UI (existence + correctness)
- Most role implementations (coverage + correctness)
- Database schema completeness (special tables/constraints)

### Critical blockers (must address for MVP)

- **`AmuletReceivedScreen.tsx`**: Without player-side UI, amulet interactions are impossible.
- **`EchoBeaconModeratorModal.tsx`**: Echo Beacon is not functional without moderator UI.
- **Amulet assignment flow**: Day 1 early assignment + trigger timing + daily passing
- Role-specific UIs (e.g., Ship Doctor, Cupid/Parasyte/Clone, Cultist, etc.)
- Testing suite

---

## Claude’s Plan: Track A ↔ Track B Integration Patches (historical / reference)

> Note: Some items below may already be implemented. Keep this as a **reference** until we explicitly verify each patch in code + runtime.

### Status (as written by Claude)

- ✅ COMPLETED:  
  - Track A: core resolution engine (`nightActionService.ts`, `gameLogic.ts`)  
  - Track B: amulet system (`amuletService.ts`, `amuletLogic.ts`, UI components)  
  - DB migration: added `neural_target_id` and `neural_holder_id` columns  
  - Types merged in `types/index.ts`

### Integration Patch 1: Night Resolution — Apply Amulet Protections

- **File**: `nightActionService.ts`  
- **Why**: Shield blocks direct night kills but **not** link deaths (PRD EC11)
- **Concept**:
  - After Watchman protection, apply `AmuletService.applyAmuletProtections({ targets, amulets, phase:'night' })`
  - Filter direct deaths by `blockedTargetIds`
  - Track `protectedPlayers` union of Watchman + amulet protections

### Integration Patch 2: Night Resolution — Advance Amulet Triggers

- **File**: `nightActionService.ts`
- **Why**: Activate mid-game amulets (Neural Implant @2 deaths, Bio Scanner @3, Echo Beacon @4)
- **Concept**:
  - After night eliminations, compute elimination count
  - Call `AmuletService.advanceAmuletTriggers({ gameId, eliminationCount })`
  - Log a `phase_change` event with triggered amulets for moderator notification

### Integration Patch 3: Day Vote Tallying — Block Resonance Tracker Holders

- **File**: `gameLogic.ts`
- **Why**: Resonance Tracker holder “cannot vote” next day
- **IMPORTANT**: This is now a **reminder-only** rule (no in-app voting). Keep as historical reference.

### Integration Patch 4: Day Elimination — Apply Amulet Protections

- **File**: `gameLogic.ts`
- **Why**: Shield blocks direct day elimination
- **Concept**:
  - Use `AmuletService.applyAmuletProtections({ targets:[targetId], amulets, phase:'day' })`

### Integration Patch 5: Day Resolution — Advance Amulet Triggers

- **File**: `gameLogic.ts` (inside day resolution)
- **Why**: Activate mid-game amulets after day eliminations
- **Concept**:
  - `advanceAmuletTriggers()` post-elimination
  - Log triggered amulets to `game_logs` or via `GameService.logGameEvent`

### Integration Patch 6: Link Deaths — Verify Shield Bypass

- **File**: `gameLogic.ts`
- **Why**: PRD EC11 — Shielding Device does **NOT** block link deaths
- **Concept**:
  - Link cascade function should **not** consult amulet protections.

### Verification steps (Claude)

- Shield blocks direct night kill
- Shield does NOT block link death
- Resonance tracker vote block (historical)
- Trigger thresholds log triggered amulets
- Shield blocks day elimination

---

## Critical Corrections (Claude + product clarifications)

### Neural Implant logic (must align with your rule)

- **Wrong assumption**: reveal when **target** dies  
- **Correct**: reveal next day if **holder survives** (and reveals target’s role next day)
- Requires:
  - storing `neural_target_id` and `neural_holder_id`
  - next-day check: holder alive → reveal target role; holder dead → no reveal

### Bio Scanner validation (must align with your rule)

- **Wrong assumption**: only neighbors can be scanned
- **Correct**: scan **any alive player** (not restricted to neighbors/seating)
- Alien scanner can see role; crew scanner sees only team (per existing Track B note)

### Detective “adjacent players” automation (must align with your rule)

- Remove any neighbor/seating logic for Detective.
- Moderator manually selects the 3 players; app can validate “alive players only”.

### Echo Beacon handling (must align with your rule)

- No player UI required.
- Echo Beacon is **moderator-handled** (neighbor identities come from real-life seating).

---

## Player UI requirements (new screens)

All amulet interactions happen on player phones (except Echo Beacon).

### 1) `AmuletReceivedScreen.tsx` (universal amulet prompt)

- **Route**: `AmuletReceived: { amulet_id: string }` (add to `NavigationStackParamList`)
- This is the primary entry point when a player receives an amulet.
- Conditional UI by `amulet_type`:

#### Shielding Device

- “You are protected today and tonight.”
- Choice:
  - **Pass after today** (auto-random assignment tomorrow)
  - **Destroy after tonight** (protected now; amulet marked used after night)

#### Resonance Tracker

- “Use effect? (You will lose your vote today)” — reminder only, not enforced
- Choice:
  - **Yes**: reveal previous holder’s team (if any). If there is no previous holder, show “No previous holder”.
  - **No**: do not reveal; amulet is **destroyed immediately**.
- Display result:
  - Previous holder name + team

#### Neural Implant

- Select a player (alive-only; likely exclude self)
- “Learn their role tomorrow (if you survive).”
- Next day: if holder alive → show target role card (or at least role key + description)

#### Bio Scanner

- Select **any alive player** (exclude self)
- Instant reveal result: team (or role if alien scanner)
- Single use

---

## Moderator UI requirements

### `EchoBeaconModeratorModal.tsx` (NightPhase integration)

Show after night actions collected if an Echo Beacon exists with a current holder.

- Moderator asks holder if they want to use it (verbally).
- If yes:
  - Moderator records **left neighbor** and **right neighbor** via dropdowns
  - App checks whether those neighbors submitted any night action (actor_id present)
  - Moderator then informs the holder verbally
- Actions:
  - “Mark as used”
  - “Not used tonight” (keep with holder; can be used on a later night)

---

## Night 1 vs Night 2+ Action Matrix (MVP)

**Night 1 is setup-only**: linking + information + awaken checks. **No kills, no protections.**

### Night 1 (setup only)

- **Linking**
  - Cupid: link 2 players
  - Clone: select target (transform triggers if target dies at any time later)
  - Parasyte Alien: select companion (death link)
- **Information (moderator-handled; no player-app reveal)**
  - Observer: sees Bioscanner identity (silent)
  - Bioscanner scan (moderator answers live)
  - DNA Tracker scan (moderator answers live)
  - Detective scan (moderator-handled seating; app does not track seating)
  - Alien Scanner scan (2 yes/no questions)
- **Team reveal**
  - Aliens awaken (see each other)
- **Status checks**
  - Sleep Alien awakening check (should be “no” on Night 1)
  - Predator “all aliens dead?” check (no)

### Night 2+ (full cycle)

- Alien kill selection (1 or 2 if Pup rule active)
- Watchman protection (blocks alien kills)
- Ship Doctor protection (blocks day elimination; must differ from previous night’s protected player)
- Bioscanner / DNA Tracker / Detective / Alien Scanner info actions (moderator answered live)
- Scientist (kill/heal/save as per rules)
- Silencer (mark player as silenced next day)
- Transformations + special rules resolution:
  - Infected transforms on attack (if attack not blocked)
  - Clone transforms on target death
  - Sleep Alien awakens when first alien death occurs
  - Quarantined blocks next alien kill night
  - Alien Pup enables double kill next night
  - Soldier delayed-death logic as defined
- Echo Beacon moderator modal if present (single-use; no passing)

## Amulet assignment flow (timing rules you want)

### Early-game amulets (Shielding Device, Resonance Tracker)

- Assigned on **Day 1 after Night 1** (i.e., “Day 1 start” in-app, after the first night finishes).
- Auto-random assignment by system.

### Mid-game amulets (Neural Implant @2 deaths, Bio Scanner @3, Echo Beacon @4)

- “Triggered” when elimination count reaches threshold.
- **Assigned randomly on the following day**, not immediately.
  - Example: 2 deaths happen Night 3 → Neural Implant is assigned during Day 3.

### Daily passing enforcement

- At start of each day, process “must pass today” amulets (e.g., Shielding Device pass option).
- This is a backend + phase-transition hook, plus UI prompts as needed.

---

## Summary display (privacy / player view)

Players should see simplified summaries (no hidden info):

- **Night summary**: only list of eliminated player names (no causes, protections, roles, links).
- **Day summary**: only voted-out player name (no vote counts, protections, tragic hero detail).

Moderator can see full resolution data.

---

## Core game flow gaps (MVP)

### Setup

- Game mode selection: Standard vs Custom
- Custom roles selection UI + validation
- Custom amulets selection UI + validation
- Role assignment algorithm verification
- Lobby waiting + realtime count correctness

### Night phase

- Moderator collects/records actions for roles that require app state (or chooses “moderator-handled” where applicable).
- Resolve night → persist logs → update phase → notify players

### Day phase

- Moderator picks elimination → app validates protections → applies link cascades → checks win → advances phase
- Tragic Hero extra kill prompts

### Game end

- Win detection + persistence
- End screen (winner + summary)
- Return to dashboard + history

---

## Database schema (verify completeness)

Core tables to verify:

- `game_sessions`
- `game_players`
- `night_actions`
- `day_eliminations` (or equivalent)
- `links`
- `amulets`
- `game_logs`

Specialized tables referenced by code (verify they exist):

- `tragic_hero_kills` (referenced by day logic)

RLS: verify policies for host/player/guest for all tables above.

Indexes: ensure common query fields are indexed (game_id, is_alive, created_at, phase fields).

---

## Backend/services completeness (verify)

### GameService

Verify existence + behavior of:

- `getGameSession`
- `getGamePlayers`
- `getGameLinks`
- `getGameAmulets`
- `getLatestNightResolution`
- `getLatestDayResolution`
- `logGameEvent`
- `updateGamePlayer`
- `updateGameSession`
- `endGame`
- `recordDayElimination`
- realtime subscription helpers

### NightActionService

Verify:

- collecting actions
- validation rules per role (alive-only, target rules)
- resolver ordering matches PRD
- scan results routing (who sees what)

### AmuletService

Verify:

- assignment methods (random assignment, daily auto-pass)
- protections + bypass rules (EC11)
- trigger logic and “assign following day” policy

Potential missing services (optional structure, but useful):

- LinkService (create/update links)
- NotificationService (surface pending prompts to players)

---

## Edge cases (PRD Section 10) — track EC1–EC54 (54 cases)

**Note**: Some PRD “edge cases” are really *rule confirmations* or *invalid setup states*. We still track them to ensure the app either:

- **handles** the scenario, or
- **prevents** it via setup validation, or
- marks it as **out of scope** (e.g., physical seating).

### PRD Edge Cases Checklist (EC1–EC54)

#### Tragic Hero
- [ ] **EC1**: Tragic Hero eliminated during Day 1 vote
- [ ] **EC2**: Tragic Hero eliminated during Night 1+ via alien kill
- [ ] **EC3**: Tragic Hero is the last alien (Rogue condition) — likely obsolete/invalid for MVP role set
- [ ] **EC4**: Tragic Hero dies via link (Cupid or Parasyte)
- [ ] **EC5**: Clone becomes Tragic Hero

#### Clone
- [ ] **EC6**: Clone targets player who dies Day 1 (core rule confirmation)
- [ ] **EC7**: Clone targets Tragic Hero who dies by other means (core rule confirmation)
- [ ] **EC8**: Clone targets player who never dies
- [ ] **EC9**: Multiple clones (if custom game allows 2+ Clone) — decide allow vs prevent
- [ ] **EC10**: Clone targets another Clone — decide allow vs prevent

#### Amulets
- [ ] **EC11**: Shielding Device holder dies via link
- [ ] **EC12**: Shielding Device holder not passed, plays next day
- [ ] **EC13**: Resonance Tracker holder can't vote but has Ship Captain vote doubling (reminder-only model)
- [ ] **EC14**: Neural Implant holder eliminated before chosen player dies — update to new mechanic (reveal only if holder alive next day)
- [ ] **EC15**: Echo Beacon with 1 neighbor having no ability (UX-only: show “acted/no” vs show only actors)

#### Infected Crewmember
- [ ] **EC16**: Infected attacked but dies same night by Scientist kill
- [ ] **EC17**: Infected attacked, wakes as Alien Night 3, killed Night 4
- [ ] **EC18**: Infected attacked but Watchman protects (attack blocked => no transform)

#### Link mechanics
- [ ] **EC19**: Cupid lovers: one also linked to Parasyte, both die same night
- [ ] **EC20**: Clone + Parasyte: Clone targets Parasyte companion
- [ ] **EC21**: Parasyte alive, linked player dies day vote

#### Silencer
- [ ] **EC22**: Silencer silences same player two consecutive nights
- [ ] **EC23**: Silenced player is Tragic Hero, chooses victim (rule confirmation)

#### Amulet trigger timing
- [ ] **EC24**: Multiple eliminations same round, mid-game amulet triggers
- [ ] **EC25**: Amulet triggers are 2, 3, 4+ eliminations

#### Custom game balance / invalid setups
- [ ] **EC26**: Custom game: all roles are Crew (no aliens) — should be prevented by setup validation
- [ ] **EC27**: Custom game: only 1 Crew, 9 Aliens — should be prevented or auto-end immediately (aliens win at start)
- [ ] **EC28**: Balance score swing due to role choices

#### Reliability / realtime
- [ ] **EC29**: Moderator's app crashes mid-game
- [ ] **EC30**: Player's app crashes mid-game
- [ ] **EC31**: Internet drops during night action input

#### Win conditions
- [ ] **EC32**: Predator kills Predator (if custom game has 2+ Predators) — prevent (max 1 predator)
- [ ] **EC33**: Rogue Alien last alien standing, Predator also alive — define precedence explicitly
- [ ] **EC34**: All aliens + Predator dead, no crew left — define deterministic fallback (draw/null) even if “impossible”

#### Adjacency / seating (mostly moderator-handled)
- [ ] **EC35**: Detective inspects 3 adjacent when < 3 players alive
- [ ] **EC36**: Player sitting alone (large game, scattered seating) — out of scope (no seating tracking)

#### Scientist
- [ ] **EC37**: Scientist heal used same night as kill (same target)
- [ ] **EC38**: Scientist heal vs Watchman protect (same target)

#### Ship Doctor
- [ ] **EC39**: Ship Doctor protects Player A day vote, then Player B next night (different)
- [ ] **EC40**: Ship Doctor protects same player day and night

#### Vote mechanics (PRD text; our app does not enforce counting)
- [ ] **EC41**: Ship Captain vote doubling + silenced player
- [ ] **EC42**: Ship Captain vote doubling on Day 1 (optional vote)

#### Moderator UX safety
- [ ] **EC43**: Moderator forgets to call a role
- [ ] **EC44**: Moderator calls a role twice
- [ ] **EC45**: Moderator enters wrong player for kill

#### Resolution ordering & special rules
- [ ] **EC46**: Multiple protections on same target
- [ ] **EC47**: Quarantined killed, no alien kills next night
- [ ] **EC48**: Soldier attacked + protected = survives?

#### Transformations / awakenings
- [ ] **EC49**: Infected becomes Alien, immediately killed by Scientist
- [ ] **EC50**: Sleep Alien awakens when first Alien dies

#### Summary generation / “no spoilers”
- [ ] **EC51**: Same player dies multiple ways (should not happen)
- [ ] **EC52**: Link death before vote elimination
- [ ] **EC53**: Display multi-death days without spoiling
- [ ] **EC54**: Display Clone transformation to players

---

## Testing plan (minimum for launch)

- Unit tests: core game logic, amulet logic, win conditions
- Integration tests: NightActionService resolution, AmuletService lifecycle, GameService CRUD
- E2E: Standard + Custom games, with and without amulets, win scenarios, tragic hero, link cascades
- Performance: multi-device realtime stability, large player counts, long sessions
- Security: RLS enforcement, auth boundaries, guest isolation

---

## Security & compliance (launch checklist)

- RLS policies correct for host/player/guest
- Ensure no unauthorized writes to sessions/players/actions/logs
- Input validation (codes, names)
- Logging hygiene (don’t leak roles to players via logs)
- Basic privacy policy + terms (if public release)

---

## Mobile & performance (launch checklist)

- Asset optimization (done, but keep monitoring)
- Loading states + retries on shaky networks
- Realtime reconnection handling
- Screen-size coverage (small phones + tablets)

---

## Deployment & infrastructure (later, but required for release)

- Dev/staging/prod environments
- Migration strategy + versioning
- CI/CD builds
- Monitoring (crash reporting, basic analytics)

---

## Feature completeness by priority

### P0 — Must have (playable MVP)

- Player amulet UI (`AmuletReceivedScreen`) for the 4 amulets
- Echo Beacon moderator modal
- Correct amulet timing: Day1 early assignment + “assign following day” triggers + daily pass
- Moderator flows for any role mechanics that require app-recorded actions (or explicitly mark as moderator-handled)
- Link creation UI (Cupid/Parasyte/Clone) OR a deliberate “moderator records links” flow
- Privacy-safe player summaries
- Win conditions + game end persistence + end screen
- Realtime sync reliability for game_sessions/game_players/night_actions/amulets/game_logs

### P1 — Critical polish

- Loading/error UX, empty states
- Comprehensive edge-case verification (PRD Section 10)
- Security review of RLS policies
- Basic “resume game” and history navigation

### P2 — Nice to have

- Rich analytics, advanced dashboards
- Replay/log viewer
- Accessibility improvements
- Advanced moderator tooling

---

## Immediate next steps (recommended order)

1) **Verify reality**: Confirm DB schema + GameService methods exist and behave correctly.  
2) Implement **AmuletReceivedScreen** + routing + “pending prompt” discovery.  
3) Implement **amulet assignment timing** hooks (Day 1, triggers, daily pass).  
4) Implement **Echo Beacon moderator modal**.  
5) Audit roles for missing UIs/logic; fill P0 gaps first (links, protections, transformations).  
6) Build the **PRD edge-case matrix** (EC1–EC54, 54 cases) and start running them.  


