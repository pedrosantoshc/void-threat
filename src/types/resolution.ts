import type { Link, NightAction } from './index';

export type DeathCause =
  | 'alien_kill'
  | 'scientist_kill'
  | 'predator_hunt'
  | 'day_vote'
  | 'tragic_hero'
  | 'link_death'
  | 'unknown';

export type TransformType = 'clone' | 'infected' | 'sleep_alien_awaken';

export interface ResolutionDeath {
  playerId: string;
  playerName: string;
  cause: DeathCause;
  sourcePlayerId?: string; // e.g. tragic hero id, predator id, etc.
}

export interface ResolutionTransformation {
  playerId: string;
  playerName: string;
  oldRole: string;
  newRole: string;
  transformType: TransformType;
}

export interface ResolutionLinkDeath {
  playerId: string;
  playerName: string;
  linkedToPlayerId: string;
  linkType: Link['link_type'];
}

export interface NextPhaseModifiers {
  twoKillsAvailable?: boolean; // Alien Pup died (next night)
  noKillsAllowed?: boolean; // Quarantined Crew died (next night)
  soldierDiesAtDay?: string; // Soldier was attacked (not blocked) and must die next day
  predatorKillMode?: boolean; // All aliens dead, predator can kill crew at night
}

export interface NightResolutionResult {
  phase: 'night';
  nightNumber: number;
  deaths: ResolutionDeath[];
  transformations: ResolutionTransformation[];
  linkDeaths: ResolutionLinkDeath[];
  nextPhaseModifiers: NextPhaseModifiers;
  silencedPlayers: string[]; // playerIds
  scanResults: Record<string, { result: string; targetName: string }>;
  protectedPlayers: string[]; // direct protections only
  debug?: {
    actions?: NightAction[];
  };
}

export interface DayResolutionResult {
  phase: 'day';
  dayNumber: number;
  // deaths that are announced at day start (from previous night)
  nightDeaths: ResolutionDeath[];
  tragicHeroNightKill?: {
    heroId: string;
    heroName: string;
    victimId: string;
    victimName: string;
  };
  votedOutPlayer?: {
    playerId: string;
    playerName: string;
    voteCount: number;
    totalVotes: number;
  };
  tragicHeroDayKill?: {
    heroId: string;
    heroName: string;
    victimId: string;
    victimName: string;
  };
  linkDeaths: ResolutionLinkDeath[];
  protectedPlayers: string[];
  silencedPlayers: string[];
  winCondition: 'crew' | 'aliens' | 'rogue_alien' | 'predator' | null;
}


