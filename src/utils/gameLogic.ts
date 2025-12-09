import { GameSession, GamePlayer, NightAction, DayElimination, Link } from '../types';

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
export const processLinkDeaths = (
  deadPlayerId: string,
  links: Link[],
  players: GamePlayer[]
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

// Calculate adjacent players for Detective scan
export const getAdjacentPlayers = (
  targetPosition: number,
  players: GamePlayer[]
): GamePlayer[] => {
  const alivePlayers = players.filter(p => p.is_alive).sort((a, b) => a.position_order - b.position_order);
  const targetIndex = alivePlayers.findIndex(p => p.position_order === targetPosition);
  
  if (targetIndex === -1) return [];

  const adjacent: GamePlayer[] = [];
  
  // Add target
  adjacent.push(alivePlayers[targetIndex]);
  
  // Add left neighbor (wrap around)
  const leftIndex = targetIndex === 0 ? alivePlayers.length - 1 : targetIndex - 1;
  if (leftIndex !== targetIndex) {
    adjacent.push(alivePlayers[leftIndex]);
  }
  
  // Add right neighbor (wrap around)
  const rightIndex = targetIndex === alivePlayers.length - 1 ? 0 : targetIndex + 1;
  if (rightIndex !== targetIndex && rightIndex !== leftIndex) {
    adjacent.push(alivePlayers[rightIndex]);
  }

  return adjacent;
};

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
      if (!action.target_id) {
        return { valid: false, error: 'Detective scan requires a center target' };
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