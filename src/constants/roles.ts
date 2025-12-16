import { RoleDefinition } from '../types';

// All roles with their balance grades from PRD.md
export const ROLES: Record<string, RoleDefinition> = {
  // Crew Team (17 roles)
  crew_member: {
    name: 'Crew Member',
    team: 'crew',
    grade: 1,
    description: 'No special ability. Win condition: Find and eliminate all aliens.',
  },
  
  bioscanner: {
    name: 'Bioscanner',
    team: 'crew',
    grade: 7,
    description: 'Each night, scan 1 player. Learn: Alien or Crew (yes/no only). Deceived by Humanoid (appears as Crew).',
    night_action: 'scan',
  },
  
  junior_scanner: {
    name: 'Junior Scanner',
    team: 'crew',
    grade: 4,
    description: 'Called every night for mystery (even if Bioscanner alive). Becomes Bioscanner if original dies.',
    night_action: 'silent_check',
  },
  
  dna_tracker: {
    name: 'DNA Tracker',
    team: 'crew',
    grade: 3,
    description: 'Each night, scan 1 player. Learn: Alien or Crew (yes/no only). Deceived by Humanoid (appears as Crew).',
    night_action: 'scan',
  },
  
  observer: {
    name: 'Observer',
    team: 'crew',
    grade: 2,
    description: 'Night 1 only: Sees who Bioscanner is (silent). Becomes regular Crew Member after Night 1.',
    night_action: 'observe',
  },
  
  tragic_hero: {
    name: 'Tragic Hero',
    team: 'crew',
    grade: 3,
    description: 'If eliminated: Day elimination kills instantly (extra death that day). Night elimination kills first thing next day resolution.',
    special_conditions: ['instant_kill_on_death'],
  },
  
  scientist: {
    name: 'Scientist',
    team: 'crew',
    grade: 4,
    description: 'Once per game: Use kill. Once per game: Use heal. Each night, choose action.',
    night_action: 'choose_action',
  },
  
  watchman: {
    name: 'Watchman',
    team: 'crew',
    grade: 3,
    description: 'Each night, protect 1 player from alien kills. Can protect self. Different player each night.',
    night_action: 'protect',
  },
  
  ship_captain: {
    name: 'Ship Captain',
    team: 'crew',
    grade: 2,
    description: 'Vote counts twice during day elimination. Once per game only.',
    special_conditions: ['double_vote'],
  },
  
  vip_passenger: {
    name: 'VIP Passenger',
    team: 'crew',
    grade: 3,
    description: 'Cannot be killed during day votes. Only protects from day elimination (not night kills).',
    special_conditions: ['day_elimination_immunity'],
  },
  
  ship_doctor: {
    name: 'Ship Doctor',
    team: 'crew',
    grade: 3,
    description: 'Night 1+: Protect 1 player from day elimination. Different player from previous night.',
    night_action: 'protect_day',
  },
  
  detective: {
    name: 'Detective',
    team: 'crew',
    grade: 3,
    description: 'Each night, inspect 3 adjacent players (sitting together). Learn: Any alien among them? (yes/no only).',
    night_action: 'scan_adjacent',
  },
  
  silencer: {
    name: 'Silencer',
    team: 'crew',
    grade: 1,
    description: 'Each night, silence 1 player. Silenced player cannot speak or vote next day.',
    night_action: 'silence',
  },
  
  soldier: {
    name: 'Soldier',
    team: 'crew',
    grade: 3,
    description: 'If alien attacks at night, survives. Dies next day (must be eliminated during vote). Cannot dodge elimination.',
    special_conditions: ['survive_night_attack'],
  },
  
  clone: {
    name: 'Clone',
    team: 'crew',
    grade: -2,
    description: 'Night 1: Chooses 1 target. If target dies AT ANY POINT, Clone silently becomes target.',
    night_action: 'link_target',
    special_conditions: ['transformation'],
  },
  
  false_positive: {
    name: 'False Positive',
    team: 'crew',
    grade: -1,
    description: 'Appears as Alien to Bioscanner and DNA Tracker. Actually Crew (wins with crew).',
    special_conditions: ['false_scan'],
  },
  
  quarantined_crew: {
    name: 'Quarantined Crew',
    team: 'crew',
    grade: 3,
    description: 'If killed by aliens at night, aliens cannot kill next night.',
    special_conditions: ['block_next_kill'],
  },

  // Alien Team (8 roles)
  alien: {
    name: 'Alien (Infiltrator)',
    team: 'alien',
    grade: -6,
    description: 'Each night, collectively choose 1 crew member to kill. Core alien mechanic.',
    night_action: 'collective_kill',
  },
  
  alien_pup: {
    name: 'Alien Pup (Spawn)',
    team: 'alien',
    grade: -8,
    description: 'When killed, aliens get 2 kills next night instead of 1.',
    special_conditions: ['double_kill_on_death'],
  },
  
  sleep_alien: {
    name: 'Sleep Alien',
    team: 'alien',
    grade: -5,
    description: 'Night 1: Does not wake with other aliens. When first Alien dies: Sleep Alien awakens.',
    night_action: 'awakening_check',
    special_conditions: ['delayed_awakening'],
  },
  
  rogue_alien: {
    name: 'Rogue Alien',
    team: 'alien',
    grade: -5,
    description: 'Collective kills with other aliens normally. Solo win condition: If all other aliens dead, Rogue Alien wins alone.',
    special_conditions: ['solo_win'],
  },
  
  alien_scanner: {
    name: 'Alien Scanner',
    team: 'alien',
    grade: -3,
    description: 'Each night, scan 1 player privately. Two separate questions: Are they an alien? Are they the Bioscanner?',
    night_action: 'dual_scan',
  },
  
  parasyte_alien: {
    name: 'Parasyte Alien',
    team: 'alien',
    grade: -4,
    description: 'Night 1: Choose 1 companion (crew or alien). If either dies, other dies automatically.',
    night_action: 'link_companion',
    special_conditions: ['death_link'],
  },
  
  humanoid_alien: {
    name: 'Humanoid Alien',
    team: 'alien',
    grade: -9,
    description: 'Appears as Crew to Bioscanner and DNA Tracker. Actually on Alien team.',
    special_conditions: ['false_scan'],
  },
  
  infected_crewmember: {
    name: 'Infected Crewmember',
    team: 'alien',
    grade: -3,
    description: 'Starts as Crew Member. If attacked by aliens at night: Transforms to Alien. Joins collective kill.',
    special_conditions: ['transformation_on_attack'],
  },

  // Independent (1 role)
  predator: {
    name: 'Predator (Alien Hunter)',
    team: 'independent',
    grade: 4,
    description: 'Each night, hunt 1 target. If target is Alien: They die. If target is Crew: Nothing happens. Win condition: All aliens dead AND Predator ties with crew count.',
    night_action: 'hunt',
    special_conditions: ['alien_hunter', 'solo_win'],
  },
};

// Role categories for game setup
export const CREW_ROLES = Object.entries(ROLES).filter(([_, role]) => role.team === 'crew');
export const ALIEN_ROLES = Object.entries(ROLES).filter(([_, role]) => role.team === 'alien');
export const INDEPENDENT_ROLES = Object.entries(ROLES).filter(([_, role]) => role.team === 'independent');

// Calculate balance score
export const calculateBalanceScore = (roleSelection: Record<string, number>) => {
  let crewScore = 0;
  let alienScore = 0;
  let independentScore = 0;

  Object.entries(roleSelection).forEach(([roleName, count]) => {
    const role = ROLES[roleName];
    if (role) {
      if (role.team === 'crew') {
        crewScore += role.grade * count;
      } else if (role.team === 'independent') {
        // Independent affects overall balance, but should not inflate crew score.
        independentScore += role.grade * count;
      } else if (role.team === 'alien') {
        alienScore += Math.abs(role.grade) * count;
      }
    }
  });

  return {
    crew_score: crewScore,
    alien_score: alienScore,
    total_score: crewScore + independentScore - alienScore,
  };
};

// Standard game mode configuration (all roles included)
export const STANDARD_GAME_ROLES: Record<string, number> = {
  crew_member: 1,
  bioscanner: 1,
  junior_scanner: 1,
  dna_tracker: 1,
  observer: 1,
  tragic_hero: 1,
  scientist: 1,
  watchman: 1,
  ship_captain: 1,
  vip_passenger: 1,
  ship_doctor: 1,
  detective: 1,
  silencer: 1,
  soldier: 1,
  clone: 1,
  false_positive: 1,
  quarantined_crew: 1,
  alien: 2,
  alien_pup: 1,
  sleep_alien: 1,
  rogue_alien: 1,
  alien_scanner: 1,
  parasyte_alien: 1,
  humanoid_alien: 1,
  infected_crewmember: 1,
  predator: 1,
};