import { supabase } from '../config/supabase';
import { GameSession, GamePlayer, NightAction, DayElimination, Link, Amulet } from '../types';
import { AmuletService } from '../services/amuletService';
import type { DayResolutionResult } from '../types/resolution';
import { GameService } from '../services/gameService';

// Generate unique game codes
export const generateGameCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'VOID';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate shareable game URL
export const generateGameUrl = (gameCode: string): string => {
  return `void.app/join/${gameCode}`;
};

// Check win conditions
export const checkWinConditions = (players: GamePlayer[], links: Link[]): 'crew' | 'aliens' | 'rogue_alien' | 'predator' | null => {
  const alivePlayers = players.filter(p => p.is_alive);
  const aliveCrews = alivePlayers.filter(p => p.team === 'crew');
  const aliveAliens = alivePlayers.filter(p => p.team === 'alien');
  const alivePredator = alivePlayers.find(p => p.role === 'predator');
  const aliveRogueAlien = alivePlayers.find(p => p.role === 'rogue_alien');

  // Crew wins: All aliens eliminated
  if (aliveAliens.length === 0) {
    // Check if Predator wins (all aliens dead + Predator ties crew count)
    if (alivePredator && aliveCrews.length === 1) {
      return 'predator';
    }
    return 'crew';
  }

  // Aliens win: Aliens equal or outnumber crew members
  if (aliveAliens.length >= aliveCrews.length) {
    return 'aliens';
  }

  // Rogue Alien wins: Only Rogue Alien alive (all other aliens dead)
  if (aliveRogueAlien && aliveAliens.length === 1 && aliveRogueAlien.role === 'rogue_alien') {
    return 'rogue_alien';
  }

  // Game continues
  return null;
};

// Process night kill with protections
export const processNightKill = (
  target: GamePlayer,
  nightActions: NightAction[],
  players: GamePlayer[]
): { killed: boolean; reason?: string } => {
  // Check Watchman protection
  const watchmanProtection = nightActions.find(
    action => action.action_type === 'protect' && action.target_id === target.id
  );
  if (watchmanProtection) {
    return { killed: false, reason: 'watchman_protection' };
  }

  // Check Soldier ability
  if (target.role === 'soldier') {
    return { killed: false, reason: 'soldier_survival' };
  }

  // Check Scientist heal
  const scientistHeal = nightActions.find(
    action => action.action_type === 'heal' && action.target_id === target.id
  );
  if (scientistHeal) {
    return { killed: false, reason: 'scientist_heal' };
  }

  return { killed: true };
};

// Process link deaths (Cupid, Parasyte)
// INTEGRATION PATCH 6: PRD EC11 - Shielding Device does NOT block link deaths
export const processLinkDeaths = (
  deadPlayerId: string,
  links: Link[],
  players: GamePlayer[],
  amulets?: Amulet[]  // Optional parameter for consistency (not used in function body)
): string[] => {
  const additionalDeaths: string[] = [];

  // Check active links involving the dead player
  const activeLinks = links.filter(link =>
    link.is_active && (link.player1_id === deadPlayerId || link.player2_id === deadPlayerId)
  );

  activeLinks.forEach(link => {
    if (link.link_type === 'cupid' || link.link_type === 'parasyte') {
      // Find the linked partner
      const partnerId = link.player1_id === deadPlayerId ? link.player2_id : link.player1_id;
      if (partnerId && !additionalDeaths.includes(partnerId)) {
        const partner = players.find(p => p.id === partnerId);
        // INTEGRATION PATCH 6: No amulet protection check here - link deaths bypass all protections
        if (partner && partner.is_alive) {
          additionalDeaths.push(partnerId);
        }
      }
    }
  });

  return additionalDeaths;
};

// Process Clone transformation
export const processCloneTransformation = (
  deadPlayerId: string,
  links: Link[],
  players: GamePlayer[]
): { cloneId?: string; newRole?: string } => {
  // Find active clone link where the target died
  const cloneLink = links.find(link => 
    link.is_active && 
    link.link_type === 'clone' && 
    link.player2_id === deadPlayerId
  );

  if (cloneLink && cloneLink.player1_id) {
    const deadPlayer = players.find(p => p.id === deadPlayerId);
    const clone = players.find(p => p.id === cloneLink.player1_id);
    
    if (deadPlayer && clone && clone.is_alive) {
      return {
        cloneId: clone.id,
        newRole: deadPlayer.role
      };
    }
  }

  return {};
};

// Process Infected Crewmember transformation
export const processInfectedTransformation = (
  attackedPlayerId: string,
  players: GamePlayer[]
): boolean => {
  const attackedPlayer = players.find(p => p.id === attackedPlayerId);
  return attackedPlayer?.role === 'infected_crewmember' && attackedPlayer.is_alive;
};

// REMOVED: getAdjacentPlayers() - Physical seating not tracked by game
// All neighbor-dependent mechanics (Detective, Echo Beacon) are moderator-handled verbally

/**
 * Day vote tallying.
 * - Skips silenced voters
 * - Skips Resonance Tracker holders (cannot vote)
 * - Ship Captain vote counts as 2 if not used yet (once per game)
 * - Returns null eliminatedId on tie or no majority (moderator breaks ties)
 */
export function tallyVotes(
  votes: Record<string, string>,
  players: GamePlayer[],
  silencedPlayers: string[],
  amulets: Amulet[],
  opts?: { shipCaptainVoteUsed?: boolean }
): {
  results: Record<string, number>;
  eliminatedId: string | null;
  totalVotes: number;
  isTie: boolean;
  tieTargets: string[];
  usedShipCaptainVote: boolean;
} {
  const { cannotVotePlayers } = AmuletService.getResonanceTrackerEffects({ amulets, players });
  const allRestrictedVoters = new Set<string>([...silencedPlayers, ...cannotVotePlayers]);

  const voteCounts: Record<string, number> = {};
  let totalVotes = 0;
  let usedShipCaptainVote = false;
  const shipCaptainVoteUsed = !!opts?.shipCaptainVoteUsed;

  for (const [voterId, targetId] of Object.entries(votes || {})) {
    if (!targetId) continue;
    if (allRestrictedVoters.has(voterId)) continue;
    const voter = players.find(p => p.id === voterId);
    if (!voter || !voter.is_alive) continue;

    const target = players.find(p => p.id === targetId);
    if (!target || !target.is_alive) continue;

    let weight = 1;
    if (voter.role === 'ship_captain' && !shipCaptainVoteUsed) {
      // Once per game. We model this as automatically using the first time the captain votes.
      weight = 2;
      usedShipCaptainVote = true;
    }

    voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
    totalVotes += weight;
  }

  const entries = Object.entries(voteCounts);
  if (entries.length === 0) {
    return { results: voteCounts, eliminatedId: null, totalVotes: 0, isTie: false, tieTargets: [], usedShipCaptainVote };
  }

  entries.sort((a, b) => b[1] - a[1]);
  const topVotes = entries[0][1];
  const tieTargets = entries.filter(([, v]) => v === topVotes).map(([k]) => k);
  const isTie = tieTargets.length > 1;
  if (isTie) {
    return { results: voteCounts, eliminatedId: null, totalVotes, isTie: true, tieTargets, usedShipCaptainVote };
  }

  const majorityThreshold = totalVotes / 2;
  if (topVotes > majorityThreshold) {
    return { results: voteCounts, eliminatedId: entries[0][0], totalVotes, isTie: false, tieTargets: [], usedShipCaptainVote };
  }

  // No majority
  return { results: voteCounts, eliminatedId: null, totalVotes, isTie: false, tieTargets: [], usedShipCaptainVote };
}

export function validateDayElimination(
  targetId: string,
  players: GamePlayer[],
  amulets: Amulet[],
  shipDoctorProtectedId?: string
): { canEliminate: boolean; reason?: string } {
  const target = players.find(p => p.id === targetId);
  if (!target || !target.is_alive) return { canEliminate: false, reason: 'Target not alive' };

  // VIP Passenger cannot be voted out (direct day elimination only)
  if (target.role === 'vip_passenger') {
    return { canEliminate: false, reason: 'VIP cannot be voted out' };
  }

  if (shipDoctorProtectedId && shipDoctorProtectedId === targetId) {
    return { canEliminate: false, reason: 'Protected by Ship Doctor' };
  }

  // Shielding Device blocks direct day vote eliminations
  const shieldProtection = AmuletService.applyAmuletProtections({
    targets: [targetId],
    amulets,
    phase: 'day',
  });
  if (shieldProtection.blockedTargetIds.includes(targetId)) {
    return { canEliminate: false, reason: 'Protected by Shielding Device' };
  }

  return { canEliminate: true };
}

export async function processDayElimination(
  gameId: string,
  dayNumber: number,
  nominatedPlayerId: string | null,
  players: GamePlayer[],
  links: Link[],
  amulets: Amulet[],
  silencedPlayers: string[],
  shipDoctorProtectedId?: string,
  tragicHeroFromNight?: { heroId: string; victimId: string },
  tragicHeroDayVictimId?: string
): Promise<DayResolutionResult> {
  const result: DayResolutionResult = {
    phase: 'day',
    dayNumber,
    nightDeaths: [],
    linkDeaths: [],
    protectedPlayers: [],
    silencedPlayers: [],
    winCondition: null,
  };

  // 1) Tragic Hero kill from night (victim selection happened at start of day)
  if (tragicHeroFromNight?.heroId && tragicHeroFromNight?.victimId) {
    const hero = players.find(p => p.id === tragicHeroFromNight.heroId);
    const victim = players.find(p => p.id === tragicHeroFromNight.victimId);
    if (hero && victim) {
      result.tragicHeroNightKill = {
        heroId: hero.id,
        heroName: hero.username,
        victimId: victim.id,
        victimName: victim.username,
      };

      if (victim.is_alive) {
        await GameService.updateGamePlayer(victim.id, {
          is_alive: false,
          eliminated_by: 'day',
          eliminated_at: new Date().toISOString(),
        } as any);
      }

      await supabase.from('tragic_hero_kills').insert({
        game_id: gameId,
        tragic_hero_id: hero.id,
        victim_id: victim.id,
        killed_at_phase: 'night',
      });
    }
  }

  // 2) Moderator picks elimination directly (no in-app voting)
  if (dayNumber >= 2 && !nominatedPlayerId) {
    throw new Error('Elimination is mandatory on Day 2+');
  }

  if (!nominatedPlayerId) {
    // Day 1 skip
    result.silencedPlayers = []; // cleared after day
    result.winCondition = checkWinConditions(players, links);
    await GameService.logGameEvent(gameId, 'day_resolution', result as any);
    return result;
  }

  // 3) Validate elimination (direct protections)
  const validation = validateDayElimination(nominatedPlayerId, players, amulets, shipDoctorProtectedId);
  if (!validation.canEliminate) {
    result.protectedPlayers.push(nominatedPlayerId);
    result.silencedPlayers = [];
    result.winCondition = checkWinConditions(players, links);
    await GameService.logGameEvent(gameId, 'day_resolution', result as any);
    return result;
  }

  const eliminated = players.find(p => p.id === nominatedPlayerId);
  if (eliminated) {
    result.votedOutPlayer = {
      playerId: eliminated.id,
      playerName: eliminated.username,
      voteCount: 0,
      totalVotes: 0,
    };

    await GameService.updateGamePlayer(eliminated.id, {
      is_alive: false,
      eliminated_by: 'day',
      eliminated_at: new Date().toISOString(),
    } as any);
    await GameService.recordDayElimination(gameId, dayNumber, eliminated.id);

    // 4) Tragic Hero day kill (prompt needed in UI). We return a placeholder if not provided.
    if (eliminated.role === 'tragic_hero') {
      if (tragicHeroDayVictimId) {
        const victim = players.find(p => p.id === tragicHeroDayVictimId);
        if (victim) {
          if (victim.is_alive) {
            await GameService.updateGamePlayer(victim.id, {
              is_alive: false,
              eliminated_by: 'day',
              eliminated_at: new Date().toISOString(),
            } as any);
          }
          await supabase.from('tragic_hero_kills').insert({
            game_id: gameId,
            tragic_hero_id: eliminated.id,
            victim_id: victim.id,
            killed_at_phase: 'day',
          });
          result.tragicHeroDayKill = {
            heroId: eliminated.id,
            heroName: eliminated.username,
            victimId: victim.id,
            victimName: victim.username,
          };
        }
      } else {
        result.tragicHeroDayKill = {
          heroId: eliminated.id,
          heroName: eliminated.username,
          victimId: '',
          victimName: '',
        };
      }
    }

    // 5) Link deaths (PRD EC11: shields do NOT block link deaths)
    const cascades = processLinkDeaths(eliminated.id, links, players, amulets);
    for (const pid of cascades) {
      const p = players.find(pp => pp.id === pid);
      if (p && p.is_alive) {
        await GameService.updateGamePlayer(pid, {
          is_alive: false,
          eliminated_by: 'day',
          eliminated_at: new Date().toISOString(),
        } as any);
        result.linkDeaths.push({
          playerId: pid,
          playerName: p.username,
          linkedToPlayerId: eliminated.id,
          linkType: links.find(l => l.is_active && (l.player1_id === pid || l.player2_id === pid))?.link_type || 'cupid',
        });
      }
    }
  }

  // 6) Clear silences after day
  result.silencedPlayers = [];

  // 7) Win condition check (after DB updates, refresh players)
  const refreshedPlayers = await GameService.getGamePlayers(gameId);
  result.winCondition = checkWinConditions(refreshedPlayers, links);

  // 8) Advance amulet triggers after eliminations (Track B hook)
  const eliminationCount = AmuletService.getEliminationCount(refreshedPlayers);
  const triggeredAmulets = await AmuletService.advanceAmuletTriggers({ gameId, eliminationCount });
  if (triggeredAmulets.length > 0) {
    await GameService.logGameEvent(gameId, 'phase_change', {
      phase: 'amulet_triggered',
      amulets: triggeredAmulets.map(a => ({
        id: a.id,
        type: a.amulet_type,
        trigger_count: a.trigger_elimination_count,
      })),
    } as any);
  }

  await GameService.logGameEvent(gameId, 'day_resolution', result as any);
  return result;
}

// Process Tragic Hero kill
export const processTragicHeroKill = (
  tragicHeroId: string,
  victimId: string,
  players: GamePlayer[]
): boolean => {
  const victim = players.find(p => p.id === victimId);
  return victim ? victim.is_alive : false;
};

// Validate night action
export const validateNightAction = (
  action: Omit<NightAction, 'id' | 'created_at'>,
  players: GamePlayer[]
): { valid: boolean; error?: string } => {
  const actor = players.find(p => p.id === action.actor_id);
  
  if (!actor || !actor.is_alive) {
    return { valid: false, error: 'Actor is not alive' };
  }
  
  if (action.target_id) {
    const target = players.find(p => p.id === action.target_id);
    if (!target) {
      return { valid: false, error: 'Target not found' };
    }
  }

  // Role-specific validations
  switch (action.role) {
    case 'bioscanner':
    case 'dna_tracker':
      if (!action.target_id) {
        return { valid: false, error: 'Scan requires a target' };
      }
      break;
    
    case 'detective':
      if (!action.target_ids || action.target_ids.length !== 3) {
        return { valid: false, error: 'Detective scan requires exactly 3 targets' };
      }
      break;
    
    case 'watchman':
      if (!action.target_id) {
        return { valid: false, error: 'Watchman protection requires a target' };
      }
      break;
  }

  return { valid: true };
};