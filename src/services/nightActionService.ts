import { supabase } from '../config/supabase';
import { NightAction, GamePlayer } from '../types';
import type { NightResolutionResult, ResolutionDeath, ResolutionTransformation, ResolutionLinkDeath } from '../types/resolution';
import { GameService } from './gameService';
import { AmuletService } from './amuletService';
import { processCloneTransformation, processLinkDeaths } from '../utils/gameLogic';

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
        let result = '';
        let targetName = '';

        // Detective uses 3 manually selected players (target_ids).
        // Other scans use target_id.
        if (action.role === 'detective') {
          const ids = action.target_ids || [];
          if (ids.length !== 3) {
            result = 'INVALID TARGETS';
            targetName = '—';
          } else {
            const selected = players.filter(p => ids.includes(p.id) && p.is_alive);
            const hasAlien = selected.some(p => p.team === 'alien');
            result = hasAlien ? 'ALIEN DETECTED' : 'NO ALIENS';
            targetName = selected.map(p => p.username).join(', ') || '—';
          }
        } else {
          if (!action.target_id) continue;
          const target = players.find(p => p.id === action.target_id);
          if (!target) continue;
          targetName = target.username;

        switch (action.role) {
          case 'bioscanner':
            result = target.team === 'alien' ? 'ALIEN' : 'CREW';
            break;
          
          case 'dna_tracker':
            result = target.team === 'alien' ? 'ALIEN' : 'CREW';
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
        }

        // Update the action with the result
        await supabase
          .from('night_actions')
          .update({ result })
          .eq('id', action.id);

        scanResults[action.actor_id] = {
          result,
          targetName
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
  ): Promise<NightResolutionResult> {
    try {
      const alivePlayers = players.filter(p => p.is_alive);

      // Fetch runtime state needed for PRD resolution
      const [links, amulets, lastNightResolution, actions, scanResults] = await Promise.all([
        GameService.getGameLinks(gameId).catch(() => []),
        GameService.getGameAmulets(gameId).catch(() => []),
        GameService.getLatestNightResolution(gameId).catch(() => null),
        this.getNightActions(gameId, nightNumber),
        this.processScanActions(gameId, nightNumber, players),
      ]);

      // Night 1: PRD says no kills/protections; only linking + info + alien meet.
      if (nightNumber === 1) {
        const res: NightResolutionResult = {
          phase: 'night',
          nightNumber,
          deaths: [],
          transformations: [],
          linkDeaths: [],
          nextPhaseModifiers: {},
          silencedPlayers: [],
          scanResults,
          protectedPlayers: [],
          debug: { actions },
        };
        await GameService.logGameEvent(gameId, 'night_resolution', res as any);
        return res;
      }

      // Determine per-night modifiers from previous resolution (Pup/Quarantined)
      const prevMods = lastNightResolution?.nextPhaseModifiers || {};
      const noAlienKills = !!prevMods.noKillsAllowed;
      const maxAlienKills = prevMods.twoKillsAvailable ? 2 : 1;

      // Collect direct protections (Watchman protect). (Amulets handled by Track B later.)
      const watchmanProtected = new Set<string>();
      for (const a of actions) {
        if (a.action_type !== 'protect') continue;
        const actor = alivePlayers.find(p => p.id === a.actor_id);
        if (!actor || actor.role !== 'watchman') continue;
        if (a.target_id) watchmanProtected.add(a.target_id);
      }

      // Silencer: list of players silenced for next day.
      const silencedPlayers = actions
        .filter(a => a.action_type === 'silence')
        .map(a => a.target_id)
        .filter((x): x is string => !!x);

      // Compute kill targets
      const killTargetIds: Array<{ targetId: string; cause: ResolutionDeath['cause'] }> = [];

      // Alien kills: any action_type='kill' by an alien-team actor, limited by maxAlienKills.
      if (!noAlienKills) {
        const alienKillTargets: string[] = [];
        for (const a of actions) {
          if (a.action_type !== 'kill') continue;
          const actor = alivePlayers.find(p => p.id === a.actor_id);
          if (!actor || actor.team !== 'alien') continue;
          if (a.target_ids?.length) alienKillTargets.push(...a.target_ids);
          else if (a.target_id) alienKillTargets.push(a.target_id);
        }
        // enforce kill cap, de-dupe while preserving order
        const deduped = Array.from(new Set(alienKillTargets)).slice(0, maxAlienKills);
        for (const t of deduped) killTargetIds.push({ targetId: t, cause: 'alien_kill' });
      }

      // Scientist kill: at most 1 per night entry (tracking once-per-game comes later).
      for (const a of actions) {
        if (a.action_type !== 'kill') continue;
        const actor = alivePlayers.find(p => p.id === a.actor_id);
        if (!actor || actor.role !== 'scientist') continue;
        if (a.target_id) killTargetIds.push({ targetId: a.target_id, cause: 'scientist_kill' });
        break;
      }

      // Predator hunt: kills alien target; if no aliens alive, can kill crew.
      for (const a of actions) {
        if (a.action_type !== 'hunt') continue;
        const actor = alivePlayers.find(p => p.id === a.actor_id);
        if (!actor || actor.role !== 'predator') continue;
        if (!a.target_id) break;

        const target = alivePlayers.find(p => p.id === a.target_id);
        if (!target) break;

        const aliensAlive = alivePlayers.some(p => p.team === 'alien');
        if (!aliensAlive) {
          killTargetIds.push({ targetId: a.target_id, cause: 'predator_hunt' });
        } else if (target.team === 'alien') {
          killTargetIds.push({ targetId: a.target_id, cause: 'predator_hunt' });
        }
        break;
      }

      // Apply Watchman protection and compute special cases (Soldier/Infected)
      const directDeaths: Array<{ playerId: string; cause: ResolutionDeath['cause'] }> = [];
      let soldierDiesAtDay: string | undefined;
      const transformations: ResolutionTransformation[] = [];

      for (const k of killTargetIds) {
        const target = alivePlayers.find(p => p.id === k.targetId);
        if (!target) continue;

        // Watchman blocks attack (selected PRD EC48 behavior)
        if (watchmanProtected.has(target.id)) continue;

        // Infected: transforms to alien when attacked by aliens (only for alien_kill cause)
        if (k.cause === 'alien_kill' && target.role === 'infected_crewmember') {
          transformations.push({
            playerId: target.id,
            playerName: target.username,
            oldRole: target.role,
            newRole: 'alien',
            transformType: 'infected',
          });
          await supabase.from('game_players').update({ role: 'alien', team: 'alien' }).eq('id', target.id);
          continue;
        }

        // Soldier: survives night, must die next day if actually attacked (and not blocked)
        if (k.cause === 'alien_kill' && target.role === 'soldier') {
          soldierDiesAtDay = target.id;
          continue;
        }

        directDeaths.push({ playerId: target.id, cause: k.cause });
      }

      // INTEGRATION PATCH 1: Apply amulet protections (Shielding Device)
      // PRD EC11: Shield blocks direct eliminations but NOT link deaths
      const amuletProtection = AmuletService.applyAmuletProtections({
        targets: directDeaths.map(d => d.playerId),
        amulets,
        phase: 'night',
      });

      // Remove protected players from direct deaths
      const finalDirectDeaths = directDeaths.filter(
        d => !amuletProtection.blockedTargetIds.includes(d.playerId)
      );

      // Update protectedPlayers tracking
      const allProtected = Array.from(new Set([
        ...Array.from(watchmanProtected),
        ...amuletProtection.protectedPlayerIds
      ]));

      // Link cascades (Cupid/Parasyte). PRD: Shielding Device does NOT block link deaths.
      const linkDeathIds = new Set<string>();
      for (const d of finalDirectDeaths) {
        const cascades = processLinkDeaths(d.playerId, links, players);
        cascades.forEach(id => linkDeathIds.add(id));
      }

      // Clone transformations when target dies (night side)
      for (const d of [...finalDirectDeaths.map(x => x.playerId), ...Array.from(linkDeathIds)]) {
        const t = processCloneTransformation(d, links, players);
        if (t.cloneId && t.newRole) {
          const clone = alivePlayers.find(p => p.id === t.cloneId);
          if (!clone) continue;
          transformations.push({
            playerId: clone.id,
            playerName: clone.username,
            oldRole: clone.role,
            newRole: t.newRole,
            transformType: 'clone',
          });
          const newTeam = (players.find(p => p.id === d)?.team) || clone.team;
          await supabase.from('game_players').update({ role: t.newRole, team: newTeam }).eq('id', clone.id);
          // Deactivate clone link
          await supabase
            .from('links')
            .update({ is_active: false, triggered_at: new Date().toISOString() })
            .eq('game_id', gameId)
            .eq('link_type', 'clone')
            .eq('player1_id', clone.id);
        }
      }

      // Persist deaths to DB
      const allDeathIds = Array.from(new Set([...finalDirectDeaths.map(d => d.playerId), ...Array.from(linkDeathIds)]));
      if (allDeathIds.length) {
        await supabase
          .from('game_players')
          .update({
            is_alive: false,
            eliminated_by: 'night',
            eliminated_at: new Date().toISOString(),
          })
          .in('id', allDeathIds);
      }

      // Build structured outputs
      const deaths: ResolutionDeath[] = finalDirectDeaths.map(d => {
        const p = players.find(pp => pp.id === d.playerId);
        return {
          playerId: d.playerId,
          playerName: p?.username || 'Unknown',
          cause: d.cause,
        };
      });

      const linkDeaths: ResolutionLinkDeath[] = Array.from(linkDeathIds).map(id => {
        const p = players.find(pp => pp.id === id);
        const link = links.find(l => l.is_active && (l.player1_id === id || l.player2_id === id));
        const linkedToPlayerId = link ? (link.player1_id === id ? (link.player2_id || '') : link.player1_id) : '';
      return {
          playerId: id,
          playerName: p?.username || 'Unknown',
          linkedToPlayerId,
          linkType: (link?.link_type || 'cupid') as any,
        };
      });

      const nextPhaseModifiers = {
        twoKillsAvailable: allDeathIds.some(id => players.find(p => p.id === id)?.role === 'alien_pup') || undefined,
        noKillsAllowed: allDeathIds.some(id => players.find(p => p.id === id)?.role === 'quarantined_crew') || undefined,
        soldierDiesAtDay,
        predatorKillMode: !alivePlayers.some(p => p.team === 'alien') || undefined,
      };

      const res: NightResolutionResult = {
        phase: 'night',
        nightNumber,
        deaths,
        transformations,
        linkDeaths,
        nextPhaseModifiers,
        silencedPlayers: Array.from(new Set(silencedPlayers)),
        scanResults,
        protectedPlayers: allProtected,
        debug: { actions },
      };

      await GameService.logGameEvent(gameId, 'night_resolution', res as any);
      for (const t of transformations) {
        await GameService.logGameEvent(gameId, 'transformation', t as any);
      }

      // INTEGRATION PATCH 2: Advance amulet triggers after night eliminations
      const eliminationCount = AmuletService.getEliminationCount(players);
      const triggeredAmulets = await AmuletService.advanceAmuletTriggers({
        gameId,
        eliminationCount,
      });

      // Log triggered amulets for moderator notification
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

      return res;
    } catch (error) {
      console.error('Error resolving night phase:', error);
      return {
        phase: 'night',
        nightNumber,
        deaths: [],
        transformations: [],
        linkDeaths: [],
        nextPhaseModifiers: {},
        silencedPlayers: [],
        scanResults: {},
        protectedPlayers: [],
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