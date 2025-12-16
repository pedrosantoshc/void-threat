import { ROLES } from '../constants/roles';
import { RoleDefinition, BalanceScore } from '../types';

export interface RoleAssignment {
  role: string;
  team: 'crew' | 'alien' | 'independent';
  grade: number;
  definition: RoleDefinition;
}

export interface AssignmentResult {
  roles: RoleAssignment[];
  balance: BalanceScore;
  isBalanced: boolean;
  playerCount: number;
}

/**
 * Calculate balance score for a set of roles
 */
export const calculateBalance = (roles: RoleAssignment[]): BalanceScore => {
  const crewScore = roles
    .filter(r => r.team === 'crew')
    .reduce((sum, r) => sum + r.grade, 0);
  
  const alienScore = Math.abs(roles
    .filter(r => r.team === 'alien')
    .reduce((sum, r) => sum + r.grade, 0));

  // Independent roles should influence overall balance, but should not inflate the crew score.
  const independentScore = roles
    .filter(r => r.team === 'independent')
    .reduce((sum, r) => sum + r.grade, 0);
  
  const totalScore = crewScore + independentScore - alienScore;

  return {
    crew_score: crewScore,
    alien_score: alienScore,
    total_score: totalScore,
  };
};

/**
 * Standard role assignment for balanced gameplay
 * Based on player count, assigns roles to achieve ~0 total balance score
 */
export const assignStandardRoles = (playerCount: number): AssignmentResult => {
  if (playerCount < 5) {
    throw new Error('Minimum 5 players required');
  }

  const assignments: RoleAssignment[] = [];

  const pushRole = (roleKey: string) => {
    const def = ROLES[roleKey];
    if (!def) return false;
    assignments.push({
      role: roleKey,
      team: def.team,
      grade: def.grade,
      definition: def,
    });
    return true;
  };

  // Basic constraints
  const targetAliens = Math.max(1, Math.round(playerCount * 0.3));
  const alienRoleOptions = ['alien', 'alien_pup', 'sleep_alien', 'rogue_alien', 'alien_scanner', 'parasyte_alien', 'humanoid_alien', 'infected_crewmember'];

  // 1) Ensure at least one core info role (Bioscanner)
  pushRole('bioscanner');

  // 2) Add alien team slots (allow duplicates of base 'alien' if needed)
  for (let i = 0; i < targetAliens; i++) {
    const pick = alienRoleOptions[i] || 'alien';
    pushRole(pick);
  }

  // 3) Fill remaining with a greedy balance heuristic from unique non-basic roles, then crew_member.
  const used = new Set(assignments.map(a => a.role));
  const candidates = Object.keys(ROLES).filter(k => {
    if (k === 'crew_member') return true; // allow repeats as filler
    if (used.has(k)) return false;
    return ROLES[k]?.team !== 'alien'; // don't add more aliens beyond target in standard
  });

  while (assignments.length < playerCount) {
    const currentBalance = calculateBalance(assignments).total_score;
    let bestRole: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const roleKey of candidates) {
      const def = ROLES[roleKey];
      if (!def) continue;
      if (roleKey !== 'crew_member' && used.has(roleKey)) continue;
      const next = currentBalance + (def.team === 'alien' ? -Math.abs(def.grade) : def.grade);
      const score = Math.abs(next);
      if (score < bestScore) {
        bestScore = score;
        bestRole = roleKey;
      }
    }

    if (!bestRole) {
      // Fallback
      bestRole = 'crew_member';
    }

    pushRole(bestRole);
    if (bestRole !== 'crew_member') used.add(bestRole);
  }

  // Calculate balance
  const balance = calculateBalance(assignments);
  
  // Consider balanced if total score is between -2 and +2
  const isBalanced = Math.abs(balance.total_score) <= 2;

  return {
    roles: assignments,
    balance,
    isBalanced,
    playerCount,
  };
};

/**
 * Custom role assignment with specific role counts
 */
export const assignCustomRoles = (
  roleCounts: Record<string, number>
): AssignmentResult => {
  const assignments: RoleAssignment[] = [];
  let totalPlayers = 0;

  // Build assignments from role counts
  Object.entries(roleCounts).forEach(([roleKey, count]) => {
    const role = ROLES[roleKey];
    if (role && count > 0) {
      for (let i = 0; i < count; i++) {
        assignments.push({
          role: roleKey,
          team: role.team,
          grade: role.grade,
          definition: role,
        });
        totalPlayers++;
      }
    }
  });

  const balance = calculateBalance(assignments);
  const isBalanced = Math.abs(balance.total_score) <= 2;

  return {
    roles: assignments,
    balance,
    isBalanced,
    playerCount: totalPlayers,
  };
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export const shuffleRoles = (roles: RoleAssignment[]): RoleAssignment[] => {
  const shuffled = [...roles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Get recommended player count ranges for different game modes
 */
export const getRecommendedPlayerCounts = () => {
  return {
    minimum: 5,
    optimal_min: 8,
    optimal_max: 12,
    maximum: 25,
    descriptions: {
      5: 'Minimum viable game',
      8: 'Good balance of roles',
      12: 'Optimal experience', 
      25: 'Maximum supported',
    }
  };
};