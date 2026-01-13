// Amulet Logic Utilities - Track B
// Pure helper functions for amulet effects and validation
// Used by AmuletService and can be imported by Track A resolution engine

import { Amulet, GamePlayer, Link } from '../types';

/**
 * Check if player is protected by Shielding Device
 * PRD EC11: Shielding Device blocks direct eliminations but NOT link deaths
 */
export function isProtectedByShield(playerId: string, amulets: Amulet[]): boolean {
  return amulets.some(
    (a) => a.amulet_type === 'shielding_device' && !a.is_used && a.current_holder_id === playerId
  );
}

/**
 * Filter targets, removing those protected by Shielding Device
 * Returns {protected: [...], remaining: [...]}
 */
export function applyShieldProtections(params: {
  targets: string[];
  amulets: Amulet[];
}): {
  protectedPlayers: string[];
  remainingTargets: string[];
} {
  const { targets, amulets } = params;

  const protectedPlayers: string[] = [];
  const remainingTargets: string[] = [];

  for (const targetId of targets) {
    if (isProtectedByShield(targetId, amulets)) {
      protectedPlayers.push(targetId);
    } else {
      remainingTargets.push(targetId);
    }
  }

  return { protectedPlayers, remainingTargets };
}

/**
 * Get list of players who cannot vote (Resonance Tracker holders)
 */
export function getPlayersWhoCantVote(amulets: Amulet[]): string[] {
  return amulets
    .filter((a) => a.amulet_type === 'resonance_tracker' && !a.is_used && a.current_holder_id)
    .map((a) => a.current_holder_id!);
}

/**
 * Check if amulet should be triggered based on elimination count
 */
export function shouldTriggerAmulet(amulet: Amulet, eliminationCount: number): boolean {
  if (amulet.is_used || amulet.current_holder_id) return false;

  if (amulet.trigger_elimination_count === undefined) return false;

  return eliminationCount >= amulet.trigger_elimination_count;
}

/**
 * Get amulets that need to be passed today (Shielding Device, Resonance Tracker)
 */
export function getAmuletsRequiringPassing(amulets: Amulet[]): Amulet[] {
  return amulets.filter(
    (a) =>
      !a.is_used &&
      a.current_holder_id &&
      (a.amulet_type === 'shielding_device' || a.amulet_type === 'resonance_tracker')
  );
}

/**
 * Validate amulet can be used by player
 */
export function canUseAmulet(params: {
  amulet: Amulet;
  playerId: string;
  eliminationCount?: number;
}): {
  canUse: boolean;
  reason?: string;
} {
  const { amulet, playerId, eliminationCount } = params;

  if (amulet.is_used) {
    return { canUse: false, reason: 'Amulet already used' };
  }

  if (amulet.current_holder_id !== playerId) {
    return { canUse: false, reason: 'Player does not hold this amulet' };
  }

  // Check trigger requirements for mid-game amulets
  if (amulet.trigger_elimination_count !== undefined && eliminationCount !== undefined) {
    if (eliminationCount < amulet.trigger_elimination_count) {
      return {
        canUse: false,
        reason: `Requires ${amulet.trigger_elimination_count} eliminations`,
      };
    }
  }

  return { canUse: true };
}

/**
 * Get formatted amulet display name
 */
export function getAmuletDisplayName(amuletType: Amulet['amulet_type']): string {
  const names: Record<Amulet['amulet_type'], string> = {
    shielding_device: 'Shielding Device',
    resonance_tracker: 'Resonance Tracker',
    neural_implant: 'Neural Implant',
    bio_scanner: 'Bio Scanner',
    echo_beacon: 'Echo Beacon',
  };

  return names[amuletType];
}

/**
 * Get amulet description for UI
 */
export function getAmuletDescription(amuletType: Amulet['amulet_type']): string {
  const descriptions: Record<Amulet['amulet_type'], string> = {
    shielding_device:
      'Blocks all eliminations (night + day). Must be passed daily or destroyed. Does not block link deaths.',
    resonance_tracker:
      'Holder cannot vote next day. On receive, learn previous holder team. Must be passed daily.',
    neural_implant:
      'Single use. Select a player. If they die same day or following night, learn their exact role.',
    bio_scanner:
      'Single use. Scan a neighbor. Crew sees team, aliens see exact role. Triggers after 3 eliminations.',
    echo_beacon:
      'Single use. Learn which of your two neighbors used a night ability. Triggers after 4 eliminations.',
  };

  return descriptions[amuletType];
}

/**
 * Get amulet icon/emoji for UI
 */
export function getAmuletIcon(amuletType: Amulet['amulet_type']): string {
  const icons: Record<Amulet['amulet_type'], string> = {
    shielding_device: 'shield',
    resonance_tracker: 'radio',
    neural_implant: 'brain',
    bio_scanner: 'magnify',
    echo_beacon: 'broadcast',
  };

  return icons[amuletType];
}

/**
 * Check if amulet is early game (assigned pre-Night 1)
 */
export function isEarlyGameAmulet(amuletType: Amulet['amulet_type']): boolean {
  return amuletType === 'shielding_device' || amuletType === 'resonance_tracker';
}

/**
 * Check if amulet is triggered amulet (mid-game)
 */
export function isTriggeredAmulet(amuletType: Amulet['amulet_type']): boolean {
  return (
    amuletType === 'neural_implant' ||
    amuletType === 'bio_scanner' ||
    amuletType === 'echo_beacon'
  );
}

/**
 * Get trigger threshold for triggered amulets
 */
export function getTriggerThreshold(amuletType: Amulet['amulet_type']): number | null {
  const thresholds: Record<string, number> = {
    neural_implant: 2,
    bio_scanner: 3,
    echo_beacon: 4,
  };

  return thresholds[amuletType] ?? null;
}

/**
 * Compute team reveal for Resonance Tracker current holder
 * Returns null if no previous holder or player not found
 */
export function getResonanceTrackerReveal(params: {
  amulet: Amulet;
  players: GamePlayer[];
}): { team: 'crew' | 'alien' | 'independent'; playerName: string } | null {
  const { amulet, players } = params;

  if (amulet.amulet_type !== 'resonance_tracker') return null;
  if (!amulet.previous_holder_id) return null;

  const prevHolder = players.find((p) => p.id === amulet.previous_holder_id);
  if (!prevHolder) return null;

  return {
    team: prevHolder.team,
    playerName: prevHolder.username,
  };
}

/**
 * Validate Neural Implant target selection
 */
export function validateNeuralImplantTarget(params: {
  targetId: string;
  holderId: string;
  players: GamePlayer[];
}): {
  valid: boolean;
  error?: string;
} {
  const { targetId, holderId, players } = params;

  if (targetId === holderId) {
    return { valid: false, error: 'Cannot target yourself' };
  }

  const target = players.find((p) => p.id === targetId);
  if (!target) {
    return { valid: false, error: 'Target player not found' };
  }

  if (!target.is_alive) {
    return { valid: false, error: 'Target is already dead' };
  }

  return { valid: true };
}

/**
 * Validate Bio Scanner target (can scan ANY alive player except self)
 * CORRECTED: Removed neighbor restriction per user requirements
 */
export function validateBioScannerTarget(params: {
  targetId: string;
  scannerId: string;
  players: GamePlayer[];
}): {
  valid: boolean;
  error?: string;
} {
  const { targetId, scannerId, players } = params;

  if (targetId === scannerId) {
    return { valid: false, error: 'Cannot scan yourself' };
  }

  const target = players.find((p) => p.id === targetId);
  if (!target) {
    return { valid: false, error: 'Target not found' };
  }

  if (!target.is_alive) {
    return { valid: false, error: 'Target must be alive' };
  }

  return { valid: true };
}
