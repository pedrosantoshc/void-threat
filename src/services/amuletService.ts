// Amulet Service - Track B
// Handles amulet CRUD, initialization, and integration with Track A resolution engine
//
// Integration contract for Track A:
// - applyAmuletProtections({ targets, amulets, phase })
// - getEliminationCount(players)
// - advanceAmuletTriggers({ gameId, eliminationCount })
// - getMustPassAmulets({ gameId })
// - passOrDestroyAmulet({ amuletId, newHolderId | null })

import { supabase } from '../config/supabase';
import { Amulet, GamePlayer } from '../types';
import { GameService } from './gameService';

export class AmuletService {
  // ===== CRUD Operations =====

  /**
   * Get all amulets for a game
   */
  static async getGameAmulets(gameId: string): Promise<Amulet[]> {
    const { data, error } = await supabase
      .from('amulets')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching amulets:', error);
      throw error;
    }

    return (data as Amulet[]) || [];
  }

  /**
   * Get single amulet by ID
   */
  static async getAmulet(amuletId: string): Promise<Amulet | null> {
    const { data, error } = await supabase
      .from('amulets')
      .select('*')
      .eq('id', amuletId)
      .single();

    if (error) {
      console.error('Error fetching amulet:', error);
      return null;
    }

    return data as Amulet;
  }

  /**
   * Update amulet fields
   */
  static async updateAmulet(amuletId: string, updates: Partial<Amulet>): Promise<Amulet | null> {
    const { data, error } = await supabase
      .from('amulets')
      .update(updates)
      .eq('id', amuletId)
      .select()
      .single();

    if (error) {
      console.error('Error updating amulet:', error);
      throw error;
    }

    return data as Amulet;
  }

  // ===== Initialization (Setup → Runtime) =====

  /**
   * Initialize amulets from game_sessions.custom_amulets setup config
   * Called after game mode selection, before Night 1
   */
  static async initializeAmulets(
    gameId: string,
    customAmulets: Record<string, number>
  ): Promise<Amulet[]> {
    const amuletsToInsert: Partial<Amulet>[] = [];

    for (const [type, count] of Object.entries(customAmulets)) {
      if (count === 0) continue;

      const amuletType = type as Amulet['amulet_type'];

      // Early game amulets: assigned pre-Night 1 (must have holder from start)
      if (amuletType === 'shielding_device' || amuletType === 'resonance_tracker') {
        for (let i = 0; i < count; i++) {
          amuletsToInsert.push({
            game_id: gameId,
            amulet_type: amuletType,
            is_used: false,
            // Note: current_holder_id will be set by moderator before Night 1
          });
        }
      }

      // Mid-game amulets: triggered by elimination count
      if (amuletType === 'neural_implant') {
        amuletsToInsert.push({
          game_id: gameId,
          amulet_type: 'neural_implant',
          is_used: false,
          trigger_elimination_count: 2,
        });
      }

      if (amuletType === 'bio_scanner') {
        amuletsToInsert.push({
          game_id: gameId,
          amulet_type: 'bio_scanner',
          is_used: false,
          trigger_elimination_count: 3,
        });
      }

      if (amuletType === 'echo_beacon') {
        amuletsToInsert.push({
          game_id: gameId,
          amulet_type: 'echo_beacon',
          is_used: false,
          trigger_elimination_count: 4,
        });
      }
    }

    if (amuletsToInsert.length === 0) {
      return [];
    }

    // Persist to DB
    const { data, error } = await supabase
      .from('amulets')
      .insert(amuletsToInsert)
      .select();

    if (error) {
      console.error('Error initializing amulets:', error);
      throw error;
    }

    return (data as Amulet[]) || [];
  }

  /**
   * Assign initial holder to early-game amulet (Shielding Device, Resonance Tracker)
   * Called by moderator before Night 1
   */
  static async assignInitialHolder(amuletId: string, playerId: string): Promise<Amulet | null> {
    return await this.updateAmulet(amuletId, {
      current_holder_id: playerId,
    });
  }

  // ===== Integration Functions for Track A =====

  /**
   * Integration point: Apply amulet protections before finalizing deaths
   * Track A calls this in resolution engine
   *
   * PRD EC11: Shielding Device blocks direct eliminations (night kills, day votes)
   * but does NOT block link deaths (Cupid/Parasyte cascades)
   */
  static applyAmuletProtections(params: {
    targets: string[];
    amulets: Amulet[];
    phase: 'night' | 'day';
  }): {
    blockedTargetIds: string[];
    protectedPlayerIds: string[];
  } {
    const { targets, amulets } = params;

    const blockedTargetIds: string[] = [];
    const protectedPlayerIds: string[] = [];

    // Find active Shielding Devices
    const activeShields = amulets.filter(
      (a) => a.amulet_type === 'shielding_device' && !a.is_used && a.current_holder_id
    );

    for (const shield of activeShields) {
      if (targets.includes(shield.current_holder_id!)) {
        blockedTargetIds.push(shield.current_holder_id!);
        protectedPlayerIds.push(shield.current_holder_id!);
      }
    }

    return { blockedTargetIds, protectedPlayerIds };
  }

  /**
   * Integration point: Compute current elimination count
   * Used for triggering mid-game amulets
   */
  static getEliminationCount(players: GamePlayer[]): number {
    return players.filter((p) => !p.is_alive).length;
  }

  /**
   * Integration point: Advance amulet triggers after eliminations
   * Track A calls this after night/day resolution
   *
   * Activates mid-game amulets when elimination thresholds are reached
   */
  static async advanceAmuletTriggers(params: {
    gameId: string;
    eliminationCount: number;
  }): Promise<Amulet[]> {
    const { gameId, eliminationCount } = params;

    const amulets = await this.getGameAmulets(gameId);
    const triggeredAmulets: Amulet[] = [];

    for (const amulet of amulets) {
      // Check if amulet should be activated
      if (
        amulet.trigger_elimination_count !== undefined &&
        eliminationCount >= amulet.trigger_elimination_count &&
        !amulet.is_used &&
        !amulet.current_holder_id // Not yet assigned
      ) {
        // Amulet becomes available for assignment
        triggeredAmulets.push(amulet);
      }
    }

    return triggeredAmulets;
  }

  /**
   * Integration point: Get amulets that must be passed today
   * Track A calls this before day-to-night transition
   *
   * Shielding Device and Resonance Tracker must be passed daily or destroyed
   */
  static async getMustPassAmulets(params: { gameId: string }): Promise<Amulet[]> {
    const { gameId } = params;
    const amulets = await this.getGameAmulets(gameId);

    return amulets.filter(
      (a) =>
        !a.is_used &&
        a.current_holder_id &&
        (a.amulet_type === 'shielding_device' || a.amulet_type === 'resonance_tracker')
    );
  }

  /**
   * Integration point: Pass or destroy amulet
   * Track A calls this when moderator enforces daily passing
   */
  static async passOrDestroyAmulet(params: {
    amuletId: string;
    newHolderId: string | null;
  }): Promise<Amulet | null> {
    const { amuletId, newHolderId } = params;

    if (!newHolderId) {
      // Destroy: mark as used
      return await this.updateAmulet(amuletId, {
        is_used: true,
        used_at: new Date().toISOString(),
        current_holder_id: undefined,
      });
    } else {
      // Pass to new holder
      const amulet = await this.getAmulet(amuletId);
      return await this.updateAmulet(amuletId, {
        current_holder_id: newHolderId,
        previous_holder_id: amulet?.current_holder_id,
      });
    }
  }

  // ===== Amulet Assignment & Passing =====

  /**
   * Randomly assign amulet to an alive player
   * Used for: initial assignment (Day 1), mid-game triggers, daily passing
   */
  static async assignAmuletRandomly(amuletId: string, gameId: string): Promise<Amulet | null> {
    const players = await GameService.getGamePlayers(gameId);
    const alivePlayers = players.filter((p) => p.is_alive);

    if (alivePlayers.length === 0) return null;

    const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

    return await this.updateAmulet(amuletId, {
      current_holder_id: randomPlayer.id,
    });
  }

  /**
   * Auto-pass daily amulets (Shielding Device, Resonance Tracker)
   * Called at start of each day phase
   */
  static async autoPassDailyAmulets(gameId: string): Promise<void> {
    const mustPassAmulets = await this.getMustPassAmulets({ gameId });

    for (const amulet of mustPassAmulets) {
      // Only pass if not destroyed by holder choice
      if (amulet.must_pass_today && amulet.current_holder_id) {
        await this.assignAmuletRandomly(amulet.id, gameId);
      }
    }
  }

  // ===== Amulet-Specific Effects =====

  /**
   * Resonance Tracker: Get players who cannot vote (holders)
   * Also returns team reveals for current holders about previous holders
   */
  static getResonanceTrackerEffects(params: {
    amulets: Amulet[];
    players: GamePlayer[];
  }): {
    cannotVotePlayers: string[];
    teamReveals: Record<string, 'crew' | 'alien' | 'independent'>;
  } {
    const { amulets, players } = params;

    const cannotVotePlayers: string[] = [];
    const teamReveals: Record<string, 'crew' | 'alien' | 'independent'> = {};

    const resonanceTrackers = amulets.filter(
      (a) => a.amulet_type === 'resonance_tracker' && !a.is_used && a.current_holder_id
    );

    for (const tracker of resonanceTrackers) {
      // Current holder cannot vote
      cannotVotePlayers.push(tracker.current_holder_id!);

      // Reveal previous holder's team (if exists)
      if (tracker.previous_holder_id) {
        const prevHolder = players.find((p) => p.id === tracker.previous_holder_id);
        if (prevHolder) {
          teamReveals[tracker.current_holder_id!] = prevHolder.team;
        }
      }
    }

    return { cannotVotePlayers, teamReveals };
  }

  /**
   * Neural Implant: Select target for role reveal on death
   * Single use - can only be set once
   */
  static async useNeuralImplant(params: {
    amuletId: string;
    holderId: string;
    targetId: string;
    gameId: string;
  }): Promise<void> {
    const { amuletId, holderId, targetId, gameId } = params;

    // Record selection
    await this.updateAmulet(amuletId, {
      neural_target_id: targetId,
      neural_holder_id: holderId,
      used_at: new Date().toISOString(),
    });

    // Log event for later role reveal
    await supabase.from('game_logs').insert({
      game_id: gameId,
      event_type: 'night_action',
      event_data: {
        amulet_type: 'neural_implant',
        holder_id: holderId,
        target_id: targetId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Neural Implant: Check if holder survived and reveal target's role
   * Returns role if holder is alive, null otherwise
   * CORRECTED: Checks holder survival, not target death
   */
  static checkNeuralImplantReveal(params: {
    amulet: Amulet;
    players: GamePlayer[];
  }): string | null {
    const { amulet, players } = params;

    if (!amulet.neural_target_id || !amulet.neural_holder_id) return null;

    // ✅ Check if HOLDER survived (not target death)
    const holder = players.find((p) => p.id === amulet.neural_holder_id);
    if (!holder || !holder.is_alive) return null;

    // Reveal target's current role (dead or alive)
    const target = players.find((p) => p.id === amulet.neural_target_id);
    if (!target) return null;

    return target.role;
  }

  /**
   * Bio Scanner: Asymmetric scan (crew sees team, alien sees exact role)
   * Single use amulet
   */
  static async useBioScanner(params: {
    amuletId: string;
    scannerId: string;
    targetId: string;
    players: GamePlayer[];
  }): Promise<{ result: string }> {
    const { amuletId, scannerId, targetId, players } = params;

    const scanner = players.find((p) => p.id === scannerId);
    const target = players.find((p) => p.id === targetId);

    if (!scanner || !target) {
      throw new Error('Invalid scanner or target');
    }

    let result: string;

    if (scanner.team === 'crew') {
      // Crew sees team only
      result = target.team === 'alien' ? 'Alien' : 'Crew';
    } else if (scanner.team === 'alien') {
      // Alien sees exact role
      result = target.role;
    } else {
      // Independent sees team
      result = target.team === 'alien' ? 'Alien' : 'Crew';
    }

    // Mark as used
    await this.updateAmulet(amuletId, {
      is_used: true,
      used_at: new Date().toISOString(),
    });

    return { result };
  }

  /**
   * Echo Beacon: Detect which neighbors used night abilities
   * Single use amulet
   */
  static async useEchoBeacon(params: {
    amuletId: string;
    holderId: string;
    players: GamePlayer[];
    nightActions: Array<{ actor_id: string }>;
  }): Promise<{ neighborsWhoActed: Array<{ id: string; username: string }> }> {
    const { amuletId, holderId, players, nightActions } = params;

    // Get holder's neighbors (adjacent alive players)
    const holder = players.find((p) => p.id === holderId);
    if (!holder) {
      throw new Error('Invalid holder');
    }

    const alivePlayersOrdered = players
      .filter((p) => p.is_alive)
      .sort((a, b) => a.position_order - b.position_order);

    const holderIndex = alivePlayersOrdered.findIndex((p) => p.id === holderId);
    if (holderIndex === -1) {
      throw new Error('Holder not found in alive players');
    }

    const leftNeighbor =
      alivePlayersOrdered[
        (holderIndex - 1 + alivePlayersOrdered.length) % alivePlayersOrdered.length
      ];
    const rightNeighbor = alivePlayersOrdered[(holderIndex + 1) % alivePlayersOrdered.length];

    const neighborIds = [leftNeighbor.id, rightNeighbor.id];

    // Check which neighbors performed night actions
    const actedNeighborIds = nightActions
      .filter((a) => neighborIds.includes(a.actor_id))
      .map((a) => a.actor_id);

    const uniqueActedIds = [...new Set(actedNeighborIds)];

    const neighborsWhoActed = uniqueActedIds.map((id) => {
      const player = players.find((p) => p.id === id)!;
      return { id: player.id, username: player.username };
    });

    // Mark as used
    await this.updateAmulet(amuletId, {
      is_used: true,
      used_at: new Date().toISOString(),
    });

    return { neighborsWhoActed };
  }
}
