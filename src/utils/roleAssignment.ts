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
  
  const totalScore = crewScore - alienScore;

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
  
  // Essential roles that appear in every game
  const essentialRoles = [
    'bioscanner',    // Grade 7 - Key crew information
    'alien',         // Grade -6 - Basic alien
    'observer',      // Grade 5 - Knows bioscanner
    'detective',     // Grade 6 - Investigates 3 players
  ];

  // Add essential roles
  essentialRoles.forEach(roleKey => {
    const role = ROLES[roleKey];
    if (role) {
      assignments.push({
        role: roleKey,
        team: role.team,
        grade: role.grade,
        definition: role,
      });
    }
  });

  // Calculate remaining players
  let remainingPlayers = playerCount - essentialRoles.length;
  
  // Add aliens based on player count (roughly 1/3 of total)
  const alienCount = Math.max(1, Math.floor(playerCount * 0.3));
  const additionalAliens = Math.max(0, alienCount - 1); // -1 because we already have basic alien
  
  // Additional alien roles (ordered by preference)
  const alienRoles = ['hunter_alien', 'parasyte_alien', 'dream_alien', 'rogue_alien'];
  
  for (let i = 0; i < additionalAliens && i < alienRoles.length && remainingPlayers > 0; i++) {
    const roleKey = alienRoles[i];
    const role = ROLES[roleKey];
    if (role) {
      assignments.push({
        role: roleKey,
        team: role.team,
        grade: role.grade,
        definition: role,
      });
      remainingPlayers--;
    }
  }

  // Add support crew roles
  const supportRoles = ['dna_tracker', 'alien_scanner', 'cupid', 'medic'];
  
  for (let i = 0; i < supportRoles.length && remainingPlayers > 0; i++) {
    const roleKey = supportRoles[i];
    const role = ROLES[roleKey];
    if (role) {
      assignments.push({
        role: roleKey,
        team: role.team,
        grade: role.grade,
        definition: role,
      });
      remainingPlayers--;
    }
  }

  // Fill remaining slots with crew members
  while (remainingPlayers > 0) {
    const role = ROLES['crew_member'];
    if (role) {
      assignments.push({
        role: 'crew_member',
        team: role.team,
        grade: role.grade,
        definition: role,
      });
      remainingPlayers--;
    }
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
    maximum: 15,
    descriptions: {
      5: 'Minimum viable game',
      8: 'Good balance of roles',
      12: 'Optimal experience', 
      15: 'Maximum supported',
    }
  };
};