import { supabase } from '../config/supabase';
import { NightAction, GamePlayer } from '../types';

export class NightActionService {
  /**
   * Submit a night action to the database
   */
  static async submitNightAction(action: Omit<NightAction, 'id'>): Promise<NightAction> {
    try {
      const { data, error } = await supabase
        .from('night_actions')
        .insert(action)
        .select()
        .single();

      if (error) {
        console.error('Error submitting night action:', error);
        throw new Error(`Failed to submit action: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Night action submission error:', error);
      throw error;
    }
  }

  /**
   * Get all night actions for a specific night
   */
  static async getNightActions(gameId: string, nightNumber: number): Promise<NightAction[]> {
    try {
      const { data, error } = await supabase
        .from('night_actions')
        .select('*')
        .eq('game_id', gameId)
        .eq('night_number', nightNumber)
        .order('created_at');

      if (error) {
        console.error('Error fetching night actions:', error);
        throw new Error(`Failed to fetch actions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Night actions fetch error:', error);
      return [];
    }
  }

  /**
   * Get night actions by specific role
   */
  static async getNightActionsByRole(
    gameId: string, 
    nightNumber: number, 
    role: string
  ): Promise<NightAction[]> {
    try {
      const { data, error } = await supabase
        .from('night_actions')
        .select('*')
        .eq('game_id', gameId)
        .eq('night_number', nightNumber)
        .eq('role', role)
        .order('created_at');

      if (error) {
        console.error('Error fetching role actions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Role actions fetch error:', error);
      return [];
    }
  }

  /**
   * Process scanning actions and return results
   */
  static async processScanActions(
    gameId: string,
    nightNumber: number,
    players: GamePlayer[]
  ): Promise<Record<string, { result: string; targetName: string }>> {
    try {
      const scanActions = await this.getNightActions(gameId, nightNumber);
      const scanResults: Record<string, { result: string; targetName: string }> = {};

      const scanningActions = scanActions.filter(action => 
        ['scan'].includes(action.action_type)
      );

      for (const action of scanningActions) {
        if (!action.target_id) continue;

        const target = players.find(p => p.id === action.target_id);
        if (!target) continue;

        let result = '';

        switch (action.role) {
          case 'bioscanner':
            result = target.team === 'alien' ? 'ALIEN' : 'CREW';
            break;
          
          case 'dna_tracker':
            result = target.team === 'alien' ? 'ALIEN' : 'CREW';
            break;
          
          case 'detective':
            // Detective scans 3 adjacent players
            const targetPosition = target.position_order;
            const adjacentPositions = [
              targetPosition - 1,
              targetPosition,
              targetPosition + 1
            ].filter(pos => pos > 0 && pos <= players.length);
            
            const adjacentPlayers = players.filter(p => 
              adjacentPositions.includes(p.position_order)
            );
            
            const hasAlien = adjacentPlayers.some(p => p.team === 'alien');
            result = hasAlien ? 'ALIEN DETECTED' : 'NO ALIENS';
            break;
          
          case 'alien_scanner':
            if (target.role === 'bioscanner') {
              result = 'BIOSCANNER';
            } else {
              result = target.team === 'alien' ? 'ALIEN' : 'NOT BIOSCANNER';
            }
            break;
          
          default:
            result = 'UNKNOWN';
            break;
        }

        // Update the action with the result
        await supabase
          .from('night_actions')
          .update({ result })
          .eq('id', action.id);

        scanResults[action.actor_id] = {
          result,
          targetName: target.username
        };
      }

      return scanResults;
    } catch (error) {
      console.error('Error processing scan actions:', error);
      return {};
    }
  }

  /**
   * Process alien kill actions and return targets
   */
  static async processKillActions(
    gameId: string,
    nightNumber: number,
    players: GamePlayer[]
  ): Promise<string[]> {
    try {
      const killActions = await this.getNightActionsByRole(gameId, nightNumber, 'alien');
      const killTargets = new Set<string>();

      for (const action of killActions) {
        if (action.action_type === 'kill' && action.target_id) {
          killTargets.add(action.target_id);
        }
        if (action.action_type === 'kill' && action.target_ids) {
          action.target_ids.forEach(id => killTargets.add(id));
        }
      }

      return Array.from(killTargets);
    } catch (error) {
      console.error('Error processing kill actions:', error);
      return [];
    }
  }

  /**
   * Process protection actions and return protected players
   */
  static async processProtectionActions(
    gameId: string,
    nightNumber: number
  ): Promise<string[]> {
    try {
      const protectionActions = await this.getNightActions(gameId, nightNumber);
      const protectedPlayers = new Set<string>();

      const protectingActions = protectionActions.filter(action => 
        action.action_type === 'protect'
      );

      for (const action of protectingActions) {
        if (action.target_id) {
          protectedPlayers.add(action.target_id);
        }
      }

      return Array.from(protectedPlayers);
    } catch (error) {
      console.error('Error processing protection actions:', error);
      return [];
    }
  }

  /**
   * Resolve a complete night phase
   */
  static async resolveNightPhase(
    gameId: string,
    nightNumber: number,
    players: GamePlayer[]
  ): Promise<{
    scanResults: Record<string, { result: string; targetName: string }>;
    eliminatedPlayers: string[];
    protectedPlayers: string[];
  }> {
    try {
      // Process all actions in parallel
      const [scanResults, killTargets, protectedPlayers] = await Promise.all([
        this.processScanActions(gameId, nightNumber, players),
        this.processKillActions(gameId, nightNumber, players),
        this.processProtectionActions(gameId, nightNumber)
      ]);

      // Filter out protected players from kills
      const eliminatedPlayers = killTargets.filter(playerId => 
        !protectedPlayers.includes(playerId)
      );

      return {
        scanResults,
        eliminatedPlayers,
        protectedPlayers
      };
    } catch (error) {
      console.error('Error resolving night phase:', error);
      return {
        scanResults: {},
        eliminatedPlayers: [],
        protectedPlayers: []
      };
    }
  }

  /**
   * Check if all required night actions are completed
   */
  static async areNightActionsComplete(
    gameId: string,
    nightNumber: number,
    requiredRoles: string[]
  ): Promise<boolean> {
    try {
      const actions = await this.getNightActions(gameId, nightNumber);
      const actingRoles = new Set(actions.map(action => action.role));

      // Check if all required roles have acted
      return requiredRoles.every(role => actingRoles.has(role));
    } catch (error) {
      console.error('Error checking night actions completion:', error);
      return false;
    }
  }

  /**
   * Subscribe to night action updates
   */
  static subscribeToNightActions(
    gameId: string,
    nightNumber: number,
    callback: (actions: NightAction[]) => void
  ) {
    const subscription = supabase
      .channel(`night_actions_${gameId}_${nightNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'night_actions',
          filter: `game_id=eq.${gameId},night_number=eq.${nightNumber}`
        },
        async () => {
          // Refetch actions when there's a change
          const actions = await this.getNightActions(gameId, nightNumber);
          callback(actions);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => subscription.unsubscribe();
  }
}