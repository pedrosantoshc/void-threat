// Core Game Types for Void Threat
// Based on PRD.md specifications

export interface GameSession {
  id: string;
  moderator_id: string;
  game_code: string; // For joining (e.g., "VOID123")
  game_url: string; // For sharing via link
  player_count: number;
  game_mode: 'standard' | 'custom';
  custom_roles?: Record<string, number>; // { 'bioscanner': 2, 'alien': 3, ... }
  status: 'setup' | 'playing' | 'ended';
  current_phase: 'night1' | 'night2plus' | 'day1' | 'day2plus';
  night_number: number;
  day_number: number;
  started_at: string; // ISO timestamp
  ended_at?: string; // ISO timestamp
  winner: 'crew' | 'aliens' | 'rogue_alien' | 'predator' | null;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id?: string; // NULL if guest
  username: string;
  role: string; // 'crew_member', 'bioscanner', 'alien', etc.
  team: 'crew' | 'alien' | 'independent';
  is_alive: boolean;
  eliminated_by: 'night' | 'day' | null;
  eliminated_at?: string; // ISO timestamp
  position_order: number; // For adjacency (seating)
}

export interface NightAction {
  id: string;
  game_id: string;
  night_number: number;
  role: string;
  action_type: 'scan' | 'protect' | 'link' | 'silence' | 'kill' | 'heal' | 'hunt';
  actor_id: string;
  target_id?: string;
  target_ids?: string[]; // For multiple kills
  result?: string; // 'yes' | 'no' | role | etc.
  created_at: string; // ISO timestamp
}

export interface DayElimination {
  id: string;
  game_id: string;
  day_number: number;
  eliminated_player_id: string;
  reason?: string; // 'vote' | 'tragic_hero' | 'link' | null
  created_at: string; // ISO timestamp
}

export interface Link {
  id: string;
  game_id: string;
  link_type: 'cupid' | 'clone' | 'parasyte';
  player1_id: string;
  player2_id?: string; // Clone has only player1 (target)
  is_active: boolean;
  triggered_at?: string; // When link activated (Clone transform, Cupid death)
  created_at: string; // ISO timestamp
}

export interface Amulet {
  id: string;
  game_id: string;
  amulet_type: 'shielding_device' | 'resonance_tracker' | 'neural_implant' | 'bio_scanner' | 'echo_beacon';
  current_holder_id?: string;
  previous_holder_id?: string;
  is_used: boolean;
  used_at?: string; // ISO timestamp
  trigger_elimination_count?: number; // For mid-game triggers
  created_at: string; // ISO timestamp
}

export interface GameLog {
  id: string;
  game_id: string;
  event_type: 'night_action' | 'day_elimination' | 'phase_change' | 'link_triggered' | 'transformation' | 'tragic_hero_kill';
  event_data: Record<string, any>;
  created_at: string; // ISO timestamp
}

export interface BalanceScore {
  crew_score: number; // Sum of crew role grades
  alien_score: number; // Sum of alien role grades (absolute)
  total_score: number; // crew_score - alien_score (target: ~0)
}

export interface UserProfile {
  id: string;
  username?: string;
  avatar_icon?: string; // Icon name or emoji
  total_minutes_played: number;
  total_games_played: number;
  average_rounds_survived: number;
  most_common_role?: string; // Most frequently assigned role
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Role definitions based on PRD
export interface RoleDefinition {
  name: string;
  team: 'crew' | 'alien' | 'independent';
  grade: number; // Balance score impact
  description: string;
  night_action?: string;
  special_conditions?: string[];
}

// UI State types
export interface AppUser {
  id?: string;
  username: string;
  avatar_icon: string;
  is_guest: boolean;
}

export interface GameState {
  current_game?: GameSession;
  current_player?: GamePlayer;
  players: GamePlayer[];
  night_actions: NightAction[];
  day_eliminations: DayElimination[];
  links: Link[];
  amulets: Amulet[];
  game_logs: GameLog[];
}

export type NavigationStackParamList = {
  Landing: undefined;
  Dashboard: undefined;
  GuestSetup: undefined;
  CreateGame: undefined;
  JoinGame: undefined;
  GameModeSelector: { game_id: string };
  CustomGame: { game_id: string; player_count: number };
  GameSetup: { game_id: string };
  PlayerRole: { game_id: string; player_id: string };
  ModeratorDashboard: { game_id: string };
  NightPhase: { game_id: string; night_number: number };
  DayPhase: { game_id: string; day_number: number };
  GameEnd: { game_id: string };
};